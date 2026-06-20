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
Domain:
${variables.domainHint}

Input:
${variables.content}

File:
${filePath}

Modification plan:
${variables.modificationPlan}

Task:
Apply the modification plan to this file only.

Rules:
- Do not create a new plan or change ownership.
- Edit only the specified file.
- Merge duplicates; prefer current input for conflicts.
`;
  }
}
