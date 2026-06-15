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
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Creation plan for new file(s) in ${dirPath}:
${variables.creationPlan}

Apply the creation plan by creating the new memory file(s) in ${dirPath}. Keep each file focused and bounded.
`;
  }
}
