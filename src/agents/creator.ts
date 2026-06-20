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
Create only files listed in Creation plan.

Rules:
- Use only relative paths under Directory.
- Do not create extra files.
- Do not duplicate facts.
- Keep each file focused.
`;
  }
}
