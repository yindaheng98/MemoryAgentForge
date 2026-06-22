import type { RecordCallback } from "coding-agent-forge";
import { quoteBlock } from "./prompt.js";
import { MemoryAgent, type MemoryFraction } from "./types.js";

export type MemoryModifyPlannerVariables = {
  domainHint: string;
  content: string;
  filePath: string;
  modificationPlans: string;
};

export type MemoryModifyPlannerDecision = "ACCEPT" | "NOCHANGE" | "# Modification Plan";
const MODIFYPLANNER_DECISION_PATTERN = /^(ACCEPT|NOCHANGE|# Modification Plan)\b/;
const MAX_FORMAT_CORRECTION_ATTEMPTS = 3;

export class MemoryModifyPlannerAgent extends MemoryAgent<MemoryModifyPlannerVariables> {
  override async runStreamed(
    variables: MemoryModifyPlannerVariables,
    onRecord?: RecordCallback,
  ): Promise<string> {
    let plannerOutput = await super.runStreamed(variables, onRecord);
    const allowAccept = variables.modificationPlans.trim() !== "";
    try {
      const decision = this.parseDecision(plannerOutput);
      if (decision === "ACCEPT" && !allowAccept) {
        throw new Error("Initial modify planner output cannot be ACCEPT.");
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
- Markdown starting with "# Modification Plan"

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
            throw new Error("Initial modify planner output cannot be ACCEPT.");
          }
          return plannerOutput;
        } catch {
          if (attempt === MAX_FORMAT_CORRECTION_ATTEMPTS) {
            throw new Error(
              `modify-planner did not output a valid decision after ${String(MAX_FORMAT_CORRECTION_ATTEMPTS)} correction attempts.`,
            );
          }
        }
      }
    }
    throw new Error("Unreachable modify-planner format correction state.");
  }

  parseDecision(plannerOutput: string): MemoryModifyPlannerDecision {
    const match = MODIFYPLANNER_DECISION_PATTERN.exec(plannerOutput.trimStart());
    if (match === null) {
      throw new Error(
        "Modify planner output must be ACCEPT, NOCHANGE, or Markdown starting with # Modification Plan.",
      );
    }
    return match[1] as MemoryModifyPlannerDecision;
  }

  /** Render modification plans into a prompt path format consistent with this agent. */
  renderPlans(modificationPlans: readonly MemoryFraction[]): string {
    return modificationPlans
      .map((plan) => `For ${this.memoryRelativePath(plan.path)}:\n${plan.content}`)
      .join("\n\n");
  }

  protected buildPrompt(variables: Readonly<MemoryModifyPlannerVariables>): string {
    const filePath = this.memoryRelativePath(variables.filePath);
    const modificationPlans = variables.modificationPlans.trim();
    if (modificationPlans !== "") {
      return `
Domain:
${variables.domainHint}

Input:
${quoteBlock(variables.content)}

File:
${filePath}

All current plans:
${quoteBlock(modificationPlans)}

Task:
Read File. Check whether this File's current plan is right.
Return ACCEPT if it is right.
Return NOCHANGE if no Input should go in this File.
Otherwise return a corrected plan for this File only.

Format:
# Modification Plan
File: ${filePath}
Items:
- Input: <small Input fact>
  Change: <add | merge | update | delete | no change>: <what to do>

Rules:
- Use All current plans only to avoid duplicate work.
- Do not edit other plans.
- Do not plan new files.

Return only: ACCEPT | NOCHANGE | Markdown starting with "# Modification Plan".
`;
    }

    return `
Domain:
${variables.domainHint}

Input:
${quoteBlock(variables.content)}

File:
${filePath}

Task:
Read File. Find the parts of Input that should go in this File.
Return NOCHANGE if none should go here.
Otherwise return a change plan for this File only.

Format:
# Modification Plan
File: ${filePath}
Items:
- Input: <small Input fact>
  Change: <add | merge | update | delete | no change>: <what to do>

Rules:
- Use \`no change\` if File already has the Input fact.
- Do not include Input for other files.
- Do not plan new files.

Return only: NOCHANGE | Markdown starting with "# Modification Plan".
`;
  }
}
