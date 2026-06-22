import type { RecordCallback } from "coding-agent-forge";
import { quoteBlock } from "./prompt.js";
import { MemoryAgent } from "./types.js";

export type MemoryCreatePlannerVariables = {
  domainHint: string;
  content: string;
  dirPath: string;
  modificationPlans: string;
  creationPlan: string;
};

export type MemoryCreatePlannerDecision = "ACCEPT" | "NOCHANGE" | "# Creation Plan";
const CREATEPLANNER_DECISION_PATTERN = /^(ACCEPT|NOCHANGE|# Creation Plan)\b/;
const MAX_FORMAT_CORRECTION_ATTEMPTS = 3;

export class MemoryCreatePlannerAgent extends MemoryAgent<MemoryCreatePlannerVariables> {
  override async runStreamed(
    variables: MemoryCreatePlannerVariables,
    onRecord?: RecordCallback,
  ): Promise<string> {
    let plannerOutput = await super.runStreamed(variables, onRecord);
    const allowAccept = variables.creationPlan.trim() !== "";
    try {
      const decision = this.parseDecision(plannerOutput);
      if (decision === "ACCEPT" && !allowAccept) {
        throw new Error("Initial create planner output cannot be ACCEPT.");
      }
      return plannerOutput;
    } catch {
      for (let attempt = 1; attempt <= MAX_FORMAT_CORRECTION_ATTEMPTS; attempt++) {
        plannerOutput = (
          await this.thread.runStreamed(
            `
Bad format.

Valid output:${allowAccept ? "\n- exactly ACCEPT" : ""}
- exactly NOCHANGE
- Markdown starting with "# Creation Plan"

Previous output:
${quoteBlock(plannerOutput)}

Task:
Fix format only. Keep the same content.

Return only corrected output.
`,
            onRecord,
          )
        ).trim();
        try {
          const decision = this.parseDecision(plannerOutput);
          if (decision === "ACCEPT" && !allowAccept) {
            throw new Error("Initial create planner output cannot be ACCEPT.");
          }
          return plannerOutput;
        } catch {
          if (attempt === MAX_FORMAT_CORRECTION_ATTEMPTS) {
            throw new Error(
              `create-planner did not output a valid decision after ${String(MAX_FORMAT_CORRECTION_ATTEMPTS)} correction attempts.`,
            );
          }
        }
      }
    }
    throw new Error("Unreachable create-planner format correction state.");
  }

  parseDecision(plannerOutput: string): MemoryCreatePlannerDecision {
    const match = CREATEPLANNER_DECISION_PATTERN.exec(plannerOutput.trimStart());
    if (match === null) {
      throw new Error(
        "Create planner output must be ACCEPT, NOCHANGE, or Markdown starting with # Creation Plan.",
      );
    }
    return match[1] as MemoryCreatePlannerDecision;
  }

  protected buildPrompt(variables: Readonly<MemoryCreatePlannerVariables>): string {
    const dirPath = this.memoryRelativePath(variables.dirPath);
    const creationPlan = variables.creationPlan.trim();
    if (creationPlan !== "") {
      return `
Domain:
${variables.domainHint}

Input:
${quoteBlock(variables.content)}

Directory:
${dirPath}

Modification plans for existing files:
${quoteBlock(variables.modificationPlans)}

Previous creation plan:
${quoteBlock(creationPlan)}

Task:
Find the parts of Input not included in the existing-file modification plans.
Return ACCEPT if Previous creation plan is already right.
Return NOCHANGE if nothing is left.
Otherwise return a corrected creation plan.

Format:
# Creation Plan
Directory: ${dirPath}
Files:
- Path: <relative path under Directory>
  Input:
  - <small remaining Input fact>

Rules:
- Remove file plans that are no longer needed.
- Do not duplicate existing-file modification plans.
- Use only relative paths under Directory.
- Keep files focused.

Return only: ACCEPT | NOCHANGE | Markdown starting with "# Creation Plan".
`;
    }

    return `
Domain:
${variables.domainHint}

Input:
${quoteBlock(variables.content)}

Directory:
${dirPath}

Modification plans for existing files:
${quoteBlock(variables.modificationPlans)}

Task:
Find the parts of Input not included in the existing-file modification plans.
Return NOCHANGE if nothing is left.
Otherwise plan new files only for the remaining Input.

Format:
# Creation Plan
Directory: ${dirPath}
Files:
- Path: <relative path under Directory>
  Input:
  - <small remaining Input fact>

Rules:
- Do not create files for Input already included in existing-file modification plans.
- Use only relative paths under Directory.
- Keep files focused.

Return only: NOCHANGE | Markdown starting with "# Creation Plan".
`;
  }
}
