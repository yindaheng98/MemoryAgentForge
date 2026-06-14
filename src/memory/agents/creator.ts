import { MemoryAgent } from "./types.js";

export type MemoryCreatorVariables = {
  domainHint: string;
  content: string;
  dirPath: string;
  plan: string;
};

export class MemoryCreatorAgent extends MemoryAgent<MemoryCreatorVariables> {
  protected buildPrompt(variables: Readonly<MemoryCreatorVariables>): string {
    const dirPath = this.memoryRelativePath(variables.dirPath);
    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Write plan for new file(s) in ${dirPath}:
${variables.plan}

Apply the write plan by creating the new memory file(s) in ${dirPath}. Keep each file focused and bounded.
`;
  }
}
