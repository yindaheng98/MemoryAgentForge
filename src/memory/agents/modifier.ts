import { MemoryAgent } from "./types.js";

export type MemoryModifierVariables = {
  domainHint: string;
  content: string;
  filePath: string;
  plan: string;
};

export class MemoryModifierAgent extends MemoryAgent<MemoryModifierVariables> {
  protected buildPrompt(variables: Readonly<MemoryModifierVariables>): string {
    const filePath = this.memoryRelativePath(variables.filePath);
    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Write plan for ${filePath}:
${variables.plan}

Apply the write plan to ${filePath}. Edit only this file.
Merge instead of blindly appending: remove duplication, prefer newer content on conflict, and keep the file focused and bounded.
`;
  }
}
