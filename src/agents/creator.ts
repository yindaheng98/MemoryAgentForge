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
Create only files in Creation plan. Keep files focused, bounded, no duplicates.
`;
  }
}
