import { MemoryAgent, type MemoryFraction } from "./types.js";

export type MemoryModifyPlannerVariables = {
  domainHint: string;
  content: string;
  filePath: string;
  plans: string;
  noChangeMark: string;
  acceptMark: string;
};

export class MemoryModifyPlannerAgent extends MemoryAgent<MemoryModifyPlannerVariables> {
  /** Render write plans into a prompt path format consistent with this agent. */
  renderPlans(plans: readonly MemoryFraction[]): string {
    return plans
      .map((plan) => `For ${this.memoryRelativePath(plan.path)}:\n${plan.content}`)
      .join("\n\n");
  }

  protected buildPrompt(variables: Readonly<MemoryModifyPlannerVariables>): string {
    const filePath = this.memoryRelativePath(variables.filePath);
    const plans = variables.plans.trim();
    if (plans !== "") {
      return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Global write plans from all memory files (may include an earlier plan for ${filePath}):
${plans}

According to the global plans, decide the write plan of ${filePath}.
If the earlier plan for this file is already good, output exactly:
${variables.acceptMark}
If this file need not change, output exactly:
${variables.noChangeMark}
If a change helps, output the revised plan for this memory file.
`;
    }

    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Read the memory file ${filePath} and decide its write plan for the parts of the content that belong to it.
If this file need not change, output exactly:
${variables.noChangeMark}
`;
  }
}
