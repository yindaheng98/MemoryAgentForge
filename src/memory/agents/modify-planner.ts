import { MemoryAgent, type MemoryFraction } from "./types.js";

export type MemoryModifyPlannerVariables = {
  domainHint: string;
  content: string;
  filePath: string;
  modificationPlans: string;
  noChangeMark: string;
  acceptMark: string;
};

export class MemoryModifyPlannerAgent extends MemoryAgent<MemoryModifyPlannerVariables> {
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
${variables.acceptMark}
If this file need not change, output exactly:
${variables.noChangeMark}
If a change helps, output the revised modification plan for this memory file.
`;
    }

    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Read the memory file ${filePath} and decide its modification plan for the parts of the content that belong to it.
If this file need not change, output exactly:
${variables.noChangeMark}
`;
  }
}
