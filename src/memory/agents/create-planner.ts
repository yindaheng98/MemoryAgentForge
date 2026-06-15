import { MemoryAgent } from "./types.js";

export type MemoryCreatePlannerVariables = {
  domainHint: string;
  content: string;
  dirPath: string;
  modificationPlans: string;
  creationPlan: string;
  noChangeMark: string;
  acceptMark: string;
};

export class MemoryCreatePlannerAgent extends MemoryAgent<MemoryCreatePlannerVariables> {
  protected buildPrompt(variables: Readonly<MemoryCreatePlannerVariables>): string {
    const dirPath = this.memoryRelativePath(variables.dirPath);
    const creationPlan = variables.creationPlan.trim();
    if (creationPlan !== "") {
      return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Modification plans for existing files in ${dirPath}:
${variables.modificationPlans}

Earlier creation plan for new file(s):
${creationPlan}

According to the modification plans, decide whether the content to remember is fully covered, and write a creation plan for new file(s) in ${dirPath} for whatever is not covered.
If the earlier creation plan is already good, output exactly:
${variables.acceptMark}
If the content is already fully covered, output exactly:
${variables.noChangeMark}
If a change helps, output the revised creation plan.
`;
    }

    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Modification plans for existing files in ${dirPath}:
${variables.modificationPlans}

According to the modification plans, decide whether the content to remember is fully covered, and write a creation plan for new file(s) in ${dirPath} for whatever is not covered.
If the content is already fully covered, output exactly:
${variables.noChangeMark}
`;
  }
}
