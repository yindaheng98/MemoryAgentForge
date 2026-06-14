import { MemoryAgent } from "./types.js";

export type MemoryCreatePlannerVariables = {
  domainHint: string;
  content: string;
  dirPath: string;
  plans: string;
  growth: string;
  noChangeMark: string;
  acceptMark: string;
};

export class MemoryCreatePlannerAgent extends MemoryAgent<MemoryCreatePlannerVariables> {
  protected buildPrompt(variables: Readonly<MemoryCreatePlannerVariables>): string {
    const dirPath = this.memoryRelativePath(variables.dirPath);
    const growth = variables.growth.trim();
    if (growth !== "") {
      return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Write plans for existing files in ${dirPath}:
${variables.plans}

Earlier plan for new file(s):
${growth}

According to the write plans, decide whether the content to remember is fully covered, and plan new file(s) in ${dirPath} for whatever is not covered.
If the earlier plan for new file(s) is already good, output exactly:
${variables.acceptMark}
If the content is already fully covered, output exactly:
${variables.noChangeMark}
If a change helps, output the revised plan for the new file(s).
`;
    }

    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Write plans for existing files in ${dirPath}:
${variables.plans}

Decide whether the write plans fully cover the content to remember, and plan new file(s) in ${dirPath} for whatever is not covered.
If the content is already fully covered, output exactly:
${variables.noChangeMark}
`;
  }
}
