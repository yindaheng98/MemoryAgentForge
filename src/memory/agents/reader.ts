import { MemoryAgent } from "./types.js";

export type MemoryReaderVariables = {
  domainHint: string;
  query: string;
  filePath: string;
  irrelevantMark: string;
};

export class MemoryReaderAgent extends MemoryAgent<MemoryReaderVariables> {
  protected buildPrompt(variables: Readonly<MemoryReaderVariables>): string {
    const filePath = this.memoryRelativePath(variables.filePath);
    return `
Memory domain:
${variables.domainHint}

Query:
${variables.query}

Read only the memory file ${filePath}; if it contains anything related to the query, extract and summarize the related points concisely.
Otherwise output exactly:
${variables.irrelevantMark}
`;
  }
}
