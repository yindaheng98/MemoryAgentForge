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
Apply Modification plan to File only. Merge, dedupe. Input wins conflicts.
Keep File focused and bounded.
`;
  }
}
