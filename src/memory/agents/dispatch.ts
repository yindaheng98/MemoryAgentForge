import type { RecordCallback } from "coding-agent-forge";
import { MemoryModifyPlannerAgent } from "./modify-planner.js";
import { MemoryModifierAgent } from "./modifier.js";
import { MemoryCreatePlannerAgent } from "./create-planner.js";
import { MemoryCreatorAgent } from "./creator.js";
import type { MemoryFraction } from "./types.js";

const NOCHANGE_MARK = "NOCHANGE";
const ACCEPT_MARK = "ACCEPT";

function isMeaningful(fraction: MemoryFraction): boolean {
  return fraction.content !== "" && fraction.content !== NOCHANGE_MARK;
}

export type MemoryDispatchOptions = {
  domainHint: string;
  content: string;
  dirPath: string;
  filePaths: readonly string[];
  maxRounds: number;
};

export type MemoryModifyPlannerFactory = () => Promise<MemoryModifyPlannerAgent>;

type ModificationState = {
  accepted: boolean;
  modificationPlan: MemoryFraction;
  modifyPlanner: MemoryModifyPlannerAgent;
};

/**
 * One write pass: every unaccepted file's modify-planner refines its
 * modification plan against the given global plans ("" on the first pass) and
 * accepts or revises its own. Accepted planners are kept without re-running.
 */
async function modifyPlannerPass(
  current: readonly ModificationState[],
  modificationPlans: string,
  options: MemoryDispatchOptions,
  onRecord?: RecordCallback,
): Promise<ModificationState[]> {
  return Promise.all(
    current.map(async (entry): Promise<ModificationState> => {
      if (entry.accepted) {
        return entry;
      }
      const content = (
        await entry.modifyPlanner.runStreamed(
          {
            domainHint: options.domainHint,
            content: options.content,
            filePath: entry.modificationPlan.path,
            modificationPlans,
            noChangeMark: NOCHANGE_MARK,
            acceptMark: ACCEPT_MARK,
          },
          onRecord,
        )
      ).trim();
      if (content === ACCEPT_MARK) {
        return {
          accepted: true,
          modificationPlan: entry.modificationPlan,
          modifyPlanner: entry.modifyPlanner,
        };
      }
      return {
        accepted: false,
        modificationPlan: {
          path: entry.modificationPlan.path,
          content: content === "" ? NOCHANGE_MARK : content,
        },
        modifyPlanner: entry.modifyPlanner,
      };
    }),
  );
}

export type MemoryCreatePlannerFactory = () => Promise<MemoryCreatePlannerAgent>;

type CreationState = {
  accepted: boolean;
  creationPlan: MemoryFraction;
  createPlanner: MemoryCreatePlannerAgent;
};

/**
 * One write pass: the create-planner re-plans new file(s) against the given
 * modification plans, refining its previous creation plan (empty on the first
 * pass). It may accept that creation plan, drop it as unneeded, or revise it.
 */
async function createPlannerPass(
  current: CreationState,
  modificationPlans: string,
  options: MemoryDispatchOptions,
  onRecord?: RecordCallback,
): Promise<CreationState> {
  if (current.accepted) {
    return current;
  }
  const content = (
    await current.createPlanner.runStreamed(
      {
        domainHint: options.domainHint,
        content: options.content,
        dirPath: options.dirPath,
        modificationPlans:
          modificationPlans === "" ? "(no existing-file plans)" : modificationPlans,
        creationPlan: isMeaningful(current.creationPlan) ? current.creationPlan.content : "",
        noChangeMark: NOCHANGE_MARK,
        acceptMark: ACCEPT_MARK,
      },
      onRecord,
    )
  ).trim();
  if (content === ACCEPT_MARK) {
    return {
      accepted: true,
      creationPlan: current.creationPlan,
      createPlanner: current.createPlanner,
    };
  }
  return {
    accepted: false,
    creationPlan: {
      path: current.creationPlan.path,
      content: content === "" ? NOCHANGE_MARK : content,
    },
    createPlanner: current.createPlanner,
  };
}

export type MemoryPlan = {
  modificationPlans: MemoryFraction[];
  creationPlans: MemoryFraction | undefined;
};

/**
 * Plan how new content should be written across the memory files, the
 * write-side mirror of `memoryAggregation`.
 *
 * One modify-planner owns each existing file. The first pass mirrors recall:
 * modify-planners plan their own files with empty global plans, then the
 * create-planner plans new file(s) for whatever they leave uncovered.
 * Refinement passes feed modify-planners the modification plans plus the latest
 * creation plan, then re-run the create-planner over the result. The loop stops
 * only when the create-planner and every modify-planner all accept (or rounds
 * run out).
 *
 * Returns the planned changes: per-file modification plans plus the creation
 * plans for new file(s), or undefined when none are needed.
 */
export async function memoryPlanning(
  createModifyPlanner: MemoryModifyPlannerFactory,
  createCreatePlanner: MemoryCreatePlannerFactory,
  options: MemoryDispatchOptions,
  onRecord?: RecordCallback,
): Promise<MemoryPlan> {
  const renderer = await createModifyPlanner();
  const renderModificationPlans = (states: readonly ModificationState[]): string =>
    renderer.renderPlans(
      states.map(({ modificationPlan }) => modificationPlan).filter(isMeaningful),
    );

  const modifySeed: ModificationState[] = await Promise.all(
    options.filePaths.map(async (filePath) => ({
      accepted: false,
      modificationPlan: { path: filePath, content: NOCHANGE_MARK },
      modifyPlanner: await createModifyPlanner(),
    })),
  );
  const createSeed: CreationState = {
    accepted: false,
    creationPlan: { path: options.dirPath, content: NOCHANGE_MARK },
    createPlanner: await createCreatePlanner(),
  };

  let modifyStates = await modifyPlannerPass(modifySeed, "", options, onRecord);
  let createState = await createPlannerPass(
    createSeed,
    renderModificationPlans(modifyStates),
    options,
    onRecord,
  );
  if (
    !modifyStates.some(({ modificationPlan }) => isMeaningful(modificationPlan)) &&
    !isMeaningful(createState.creationPlan)
  ) {
    return { modificationPlans: [], creationPlans: undefined };
  }

  for (let round = 1; round <= options.maxRounds; round++) {
    const globalPlans = [
      renderModificationPlans(modifyStates),
      isMeaningful(createState.creationPlan)
        ? `For new file(s):\n${createState.creationPlan.content}`
        : "",
    ]
      .filter((section) => section !== "")
      .join("\n\n");
    const refinedModifyStates = await modifyPlannerPass(
      modifyStates,
      globalPlans,
      options,
      onRecord,
    );
    const refinedCreateState = await createPlannerPass(
      createState,
      renderModificationPlans(refinedModifyStates),
      options,
      onRecord,
    );
    if (
      !refinedModifyStates.some(({ modificationPlan }) => isMeaningful(modificationPlan)) &&
      !isMeaningful(refinedCreateState.creationPlan)
    ) {
      return { modificationPlans: [], creationPlans: undefined };
    }

    modifyStates = refinedModifyStates;
    createState = refinedCreateState;
    if (createState.accepted && modifyStates.every(({ accepted }) => accepted)) {
      break;
    }
  }

  const modificationPlans = modifyStates
    .map(({ modificationPlan }) => modificationPlan)
    .filter(isMeaningful);
  const creationPlans = isMeaningful(createState.creationPlan)
    ? createState.creationPlan
    : undefined;
  return { modificationPlans, creationPlans };
}

export type MemoryModifierFactory = () => Promise<MemoryModifierAgent>;
export type MemoryCreatorFactory = () => Promise<MemoryCreatorAgent>;

/**
 * Execute a plan from `memoryPlanning` with the apply agents.
 *
 * Each modification plan is applied in parallel by its own modifier; the
 * creation plans, if present, are handed to the creator to create the new
 * file(s).
 */
export async function memoryApply(
  createModifier: MemoryModifierFactory,
  createCreator: MemoryCreatorFactory,
  plan: MemoryPlan,
  options: MemoryDispatchOptions,
  onRecord?: RecordCallback,
): Promise<void> {
  const { modificationPlans, creationPlans } = plan;

  if (modificationPlans.length === 0 && creationPlans === undefined) {
    console.log("\n# Nothing to remember\n");
    return;
  }

  await Promise.all(
    modificationPlans.map(async (modificationPlan) => {
      const modifier = await createModifier();
      await modifier.runStreamed(
        {
          domainHint: options.domainHint,
          content: options.content,
          filePath: modificationPlan.path,
          modificationPlan: modificationPlan.content,
        },
        onRecord,
      );
    }),
  );

  if (creationPlans !== undefined) {
    const creator = await createCreator();
    await creator.runStreamed(
      {
        domainHint: options.domainHint,
        content: options.content,
        dirPath: options.dirPath,
        creationPlan: creationPlans.content,
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
  createModifyPlanner: MemoryModifyPlannerFactory,
  createCreatePlanner: MemoryCreatePlannerFactory,
  createModifier: MemoryModifierFactory,
  createCreator: MemoryCreatorFactory,
  options: MemoryDispatchOptions,
  onRecord?: RecordCallback,
): Promise<void> {
  const plan = await memoryPlanning(createModifyPlanner, createCreatePlanner, options, onRecord);
  await memoryApply(createModifier, createCreator, plan, options, onRecord);
}
