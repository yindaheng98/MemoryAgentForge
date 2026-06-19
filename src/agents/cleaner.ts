import { MemoryAgent } from "./types.js";

export type MemoryCleanerVariables = {
  domainHint: string;
  dirPath: string;
};

export class MemoryCleanerAgent extends MemoryAgent<MemoryCleanerVariables> {
  protected buildPrompt(variables: Readonly<MemoryCleanerVariables>): string {
    const dirPath = this.memoryRelativePath(variables.dirPath);
    return `
Memory domain:
${variables.domainHint}

Scan the complete memory folder ${dirPath}, compress its contents, and remove all duplicate and outdated content.
`;
  }
}
