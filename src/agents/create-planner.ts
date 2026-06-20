import type { RecordCallback } from "coding-agent-forge";
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
    try {
      this.parseDecision(plannerOutput);
      return plannerOutput;
    } catch {
      for (let attempt = 1; attempt <= MAX_FORMAT_CORRECTION_ATTEMPTS; attempt++) {
        plannerOutput = (
          await this.thread.runStreamed(
            `
Bad format. First line must be exactly one of:
ACCEPT
NOCHANGE
# Creation Plan

Previous output:
${plannerOutput}

Return only corrected output.
`,
            onRecord,
          )
        ).trim();
        try {
          this.parseDecision(plannerOutput);
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
${variables.content}

Directory:
${dirPath}

Existing-file modification plans:
${variables.modificationPlans}

Previous creation plan:
${creationPlan}

According to the modification plans, decide whether the content to remember is fully covered, and write a creation plan for new file(s) in ${dirPath} for whatever is not covered.
If the earlier creation plan is already good, output exactly:
ACCEPT
If the content is already fully covered, output exactly:
NOCHANGE
If a change helps, output the revised creation plan as Markdown starting with exactly:
# Creation Plan
`;
    }

    return `
Domain:
${variables.domainHint}

Input:
${variables.content}

Directory:
${dirPath}

Existing-file modification plans:
${variables.modificationPlans}

According to the modification plans, decide whether the content to remember is fully covered, and write a creation plan for new file(s) in ${dirPath} for whatever is not covered.
If the content is already fully covered, output exactly:
NOCHANGE
If a change helps, output the creation plan as Markdown starting with exactly:
# Creation Plan
`;
  }
}
