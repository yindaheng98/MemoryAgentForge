import type { RecordCallback } from "coding-agent-forge";
import { MemoryAgent, type MemoryFraction } from "./types.js";

export type MemoryModifyPlannerVariables = {
  domainHint: string;
  content: string;
  filePath: string;
  modificationPlans: string;
};

export type MemoryModifyPlannerDecision = "ACCEPT" | "NOCHANGE" | "# Modification Plan";
const MODIFYPLANNER_DECISION_PATTERN = /^(ACCEPT|NOCHANGE|# Modification Plan)\b/;
const MAX_FORMAT_CORRECTION_ATTEMPTS = 3;

export class MemoryModifyPlannerAgent extends MemoryAgent<MemoryModifyPlannerVariables> {
  override async runStreamed(
    variables: MemoryModifyPlannerVariables,
    onRecord?: RecordCallback,
  ): Promise<string> {
    let plannerOutput = await super.runStreamed(variables, onRecord);
    try {
      this.parseDecision(plannerOutput);
      return plannerOutput;
    } catch {
      for (let attempt = 1; attempt <= MAX_FORMAT_CORRECTION_ATTEMPTS; attempt++) {
        plannerOutput = (
          await this.thread.runStreamed(
            `
Previous modify-planner output did not follow the required format.
The output must start with exactly one of:
ACCEPT
NOCHANGE
# Modification Plan

Previous output:
${plannerOutput}

Please correct it.
`,
            onRecord,
          )
        ).trim();
        try {
          this.parseDecision(plannerOutput);
          return plannerOutput;
        } catch {
          if (attempt === MAX_FORMAT_CORRECTION_ATTEMPTS) {
            throw new Error(
              `modify-planner did not output a valid decision after ${String(MAX_FORMAT_CORRECTION_ATTEMPTS)} correction attempts.`,
            );
          }
        }
      }
    }
    throw new Error("Unreachable modify-planner format correction state.");
  }

  parseDecision(plannerOutput: string): MemoryModifyPlannerDecision {
    const output = plannerOutput.trimStart();
    const match = MODIFYPLANNER_DECISION_PATTERN.exec(output);
    if (match !== null) {
      return match[1] as MemoryModifyPlannerDecision;
    }
    throw new Error(
      "Modify planner output must be ACCEPT, NOCHANGE, or Markdown starting with # Modification Plan.",
    );
  }

  /** Render modification plans into a prompt path format consistent with this agent. */
  renderPlans(modificationPlans: readonly MemoryFraction[]): string {
    return modificationPlans
      .map((plan) => `For ${this.memoryRelativePath(plan.path)}:\n${plan.content}`)
      .join("\n\n");
  }

  protected buildPrompt(variables: Readonly<MemoryModifyPlannerVariables>): string {
    const filePath = this.memoryRelativePath(variables.filePath);
    const modificationPlans = variables.modificationPlans.trim();
    if (modificationPlans !== "") {
      return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Global modification plans from all memory files (may include an earlier modification plan for ${filePath}):
${modificationPlans}

According to the global plans, decide the modification plan of ${filePath}.
If the earlier modification plan for this file is already good, output exactly:
ACCEPT
If this file need not change, output exactly:
NOCHANGE
If a change helps, output the revised modification plan for this memory file as Markdown starting with exactly:
# Modification Plan
`;
    }

    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Read the memory file ${filePath} and decide its modification plan for the parts of the content that belong to it.
If this file need not change, output exactly:
NOCHANGE
If a change helps, output the modification plan for this memory file as Markdown starting with exactly:
# Modification Plan
`;
  }
}
