import { MemoryAgent } from "./types.js";

export type MemoryModifierVariables = {
  domainHint: string;
  content: string;
  filePath: string;
  modificationPlan: string;
};

export class MemoryModifierAgent extends MemoryAgent<MemoryModifierVariables> {
  protected buildPrompt(variables: Readonly<MemoryModifierVariables>): string {
    const filePath = this.memoryRelativePath(variables.filePath);
    return `
Memory domain:
${variables.domainHint}

Content being remembered:
${variables.content}

Modification plan for ${filePath}:
${variables.modificationPlan}

Apply the modification plan to ${filePath}. Edit only this file.
Merge instead of blindly appending: remove duplication, prefer newer content on conflict, and keep the file focused and bounded.
`;
  }
}
