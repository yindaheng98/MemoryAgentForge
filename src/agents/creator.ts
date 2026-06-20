import { MemoryAgent } from "./types.js";

export type MemoryCreatorVariables = {
  domainHint: string;
  content: string;
  dirPath: string;
  creationPlan: string;
};

export class MemoryCreatorAgent extends MemoryAgent<MemoryCreatorVariables> {
  protected buildPrompt(variables: Readonly<MemoryCreatorVariables>): string {
    const dirPath = this.memoryRelativePath(variables.dirPath);
    return `
Domain:
${variables.domainHint}

Input:
${variables.content}

Directory:
${dirPath}

Creation plan:
${variables.creationPlan}

Task:
Create files as specified in the creation plan only.

Rules:
- Do not alter the plan.
- Use relative paths within the directory only.
- Do not create extra files.
- Merge facts assigned to the same path into a single file.
`;
  }
}
