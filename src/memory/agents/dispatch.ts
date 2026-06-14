import type { RecordCallback } from "coding-agent-forge";
import { MemoryPlannerAgent } from "./planner.js";
import { MemoryApplyAgent, MemoryGrowAgent } from "./apply.js";
import { MemoryGrowerAgent } from "./grower.js";
import type { MemoryFraction } from "./types.js";

const NOCHANGE_MARK = "NOCHANGE";
const ACCEPT_MARK = "ACCEPT";

function isMeaningful(plan: MemoryFraction): boolean {
  return plan.content !== "" && plan.content !== NOCHANGE_MARK;
}

export type MemoryPlanningOptions = {
  domainHint: string;
  content: string;
  dirPath: string;
  filePaths: readonly string[];
  maxRounds: number;
};

export type MemoryPlannerFactory = () => Promise<MemoryPlannerAgent>;

type State = {
  accepted: boolean;
  plan: MemoryFraction;
  planner: MemoryPlannerAgent;
};

/**
 * One write pass: every unaccepted file's planner refines its plan against the
 * given global plans ("" on the first pass) and accepts or revises its own
 * plan. Accepted planners are kept without re-running.
 */
async function plannerPass(
  current: readonly State[],
  plans: string,
  options: MemoryPlanningOptions,
  onRecord?: RecordCallback,
): Promise<State[]> {
  return Promise.all(
    current.map(async (entry): Promise<State> => {
      if (entry.accepted) {
        return entry;
      }
      const content = (
        await entry.planner.runStreamed(
          {
            domainHint: options.domainHint,
            content: options.content,
            filePath: entry.plan.path,
            plans,
            noChangeMark: NOCHANGE_MARK,
            acceptMark: ACCEPT_MARK,
          },
          onRecord,
        )
      ).trim();
      if (content === ACCEPT_MARK) {
        return { accepted: true, plan: entry.plan, planner: entry.planner };
      }
      return {
        accepted: false,
        plan: { path: entry.plan.path, content: content === "" ? NOCHANGE_MARK : content },
        planner: entry.planner,
      };
    }),
  );
}

export type MemoryGrowerFactory = () => Promise<MemoryGrowerAgent>;

type GrowthState = {
  accepted: boolean;
  growth: MemoryFraction;
  grower: MemoryGrowerAgent;
};

/**
 * One grower pass: the grower re-plans new file(s) against the given existing
 * plans, refining its previous new-file plan (undefined on the first pass). It
 * may accept that plan, drop it as unneeded, or propose a revised one.
 */
async function growerPass(
  current: GrowthState,
  plans: string,
  options: MemoryPlanningOptions,
  onRecord?: RecordCallback,
): Promise<GrowthState> {
  if (current.accepted) {
    return current;
  }
  const content = (
    await current.grower.runStreamed(
      {
        domainHint: options.domainHint,
        content: options.content,
        dirPath: options.dirPath,
        plans: plans === "" ? "(no existing-file plans)" : plans,
        growth: isMeaningful(current.growth) ? current.growth.content : "",
        noChangeMark: NOCHANGE_MARK,
        acceptMark: ACCEPT_MARK,
      },
      onRecord,
    )
  ).trim();
  if (content === ACCEPT_MARK) {
    return { accepted: true, growth: current.growth, grower: current.grower };
  }
  return {
    accepted: false,
    growth: { path: current.growth.path, content: content === "" ? NOCHANGE_MARK : content },
    grower: current.grower,
  };
}

export type MemoryPlanningResult = [...MemoryFraction[], MemoryFraction | undefined];

/**
 * Plan how new content should be written across the memory files, the
 * write-side mirror of `memoryAggregation`.
 *
 * One planner owns each existing file. The first pass mirrors recall: planners
 * plan their own files with empty global plans, then the grower plans new
 * file(s) for whatever they leave uncovered. Refinement passes feed planners
 * the existing plans plus the latest new-file plan, then re-run the grower over
 * the result. The loop stops only when the grower and every planner all accept
 * (or rounds run out).
 *
 * Returns the planned changes with the final slot reserved for growth:
 * existing-file plans first, then the growth plan or undefined.
 */
export async function memoryPlanning(
  createPlanner: MemoryPlannerFactory,
  createGrower: MemoryGrowerFactory,
  options: MemoryPlanningOptions,
  onRecord?: RecordCallback,
): Promise<MemoryPlanningResult> {
  const renderer = await createPlanner();

  const seed: State[] = await Promise.all(
    options.filePaths.map(async (filePath) => ({
      accepted: false,
      plan: { path: filePath, content: NOCHANGE_MARK },
      planner: await createPlanner(),
    })),
  );
  const growthSeed: GrowthState = {
    accepted: false,
    growth: { path: options.dirPath, content: NOCHANGE_MARK },
    grower: await createGrower(),
  };

  let current = await plannerPass(seed, "", options, onRecord);
  let growth = await growerPass(
    growthSeed,
    renderer.renderPlans(current.map(({ plan }) => plan).filter(isMeaningful)),
    options,
    onRecord,
  );
  if (!current.some(({ plan }) => isMeaningful(plan)) && !isMeaningful(growth.growth)) {
    return [undefined];
  }

  for (let round = 1; round <= options.maxRounds; round++) {
    const globalPlans = [
      renderer.renderPlans(current.map(({ plan }) => plan).filter(isMeaningful)),
      isMeaningful(growth.growth) ? `For new file(s):\n${growth.growth.content}` : "",
    ]
      .filter((section) => section !== "")
      .join("\n\n");
    const refined = await plannerPass(current, globalPlans, options, onRecord);
    const refinedGrowth = await growerPass(
      growth,
      renderer.renderPlans(refined.map(({ plan }) => plan).filter(isMeaningful)),
      options,
      onRecord,
    );
    if (!refined.some(({ plan }) => isMeaningful(plan)) && !isMeaningful(refinedGrowth.growth)) {
      return [undefined];
    }

    current = refined;
    growth = refinedGrowth;
    if (growth.accepted && current.every(({ accepted }) => accepted)) {
      break;
    }
  }

  const plans = current.map(({ plan }) => plan).filter(isMeaningful);
  const growthPlan = isMeaningful(growth.growth) ? growth.growth : undefined;
  return [...plans, growthPlan];
}

export type MemoryApplyOptions = {
  domainHint: string;
  content: string;
  dirPath: string;
};

export type MemoryApplyFactory = () => Promise<MemoryApplyAgent>;
export type MemoryGrowFactory = () => Promise<MemoryGrowAgent>;

/**
 * Execute a plan from `memoryPlanning` with the apply agents.
 *
 * Each existing-file plan is applied in parallel by its own apply agent; the
 * final growth slot, if present, is handed to the grow agent to create the new
 * file(s).
 */
export async function memoryApply(
  createApplier: MemoryApplyFactory,
  createGrow: MemoryGrowFactory,
  plans: MemoryPlanningResult,
  options: MemoryApplyOptions,
  onRecord?: RecordCallback,
): Promise<void> {
  const filePlans = plans.slice(0, -1).filter((plan): plan is MemoryFraction => plan !== undefined);
  const growthPlan = plans.at(-1);

  if (filePlans.length === 0 && growthPlan === undefined) {
    console.log("\n# Nothing to remember\n");
    return;
  }

  await Promise.all(
    filePlans.map(async (plan) => {
      const applier = await createApplier();
      await applier.runStreamed(
        {
          domainHint: options.domainHint,
          content: options.content,
          filePath: plan.path,
          plan: plan.content,
        },
        onRecord,
      );
    }),
  );

  if (growthPlan !== undefined) {
    const grow = await createGrow();
    await grow.runStreamed(
      {
        domainHint: options.domainHint,
        content: options.content,
        dirPath: options.dirPath,
        plan: growthPlan.content,
      },
      onRecord,
    );
  }
}

/**
 * Dispatch new content into the memory files: plan the changes with
 * `memoryPlanning`, then write them with `memoryApply`. The write-side
 * counterpart to recall's `memoryAggregation`.
 */
export async function memoryDispatch(
  createPlanner: MemoryPlannerFactory,
  createGrower: MemoryGrowerFactory,
  createApplier: MemoryApplyFactory,
  createGrow: MemoryGrowFactory,
  options: MemoryPlanningOptions,
  onRecord?: RecordCallback,
): Promise<void> {
  const plans = await memoryPlanning(createPlanner, createGrower, options, onRecord);
  await memoryApply(createApplier, createGrow, plans, options, onRecord);
}
