import type { RecordCallback } from "coding-agent-forge";
import { MemoryAgent, type MemoryFraction } from "./types.js";

export type MemoryReaderVariables = {
  domainHint: string;
  query: string;
  filePath: string;
  findings: string;
};

export type MemoryReaderDecision = "ACCEPT" | "IRRELEVANT" | "# Finding";
const READER_DECISION_PATTERN = /^(ACCEPT|IRRELEVANT|# Finding)\b/;
const MAX_FORMAT_CORRECTION_ATTEMPTS = 3;

export class MemoryReaderAgent extends MemoryAgent<MemoryReaderVariables> {
  override async runStreamed(
    variables: MemoryReaderVariables,
    onRecord?: RecordCallback,
  ): Promise<string> {
    let readerOutput = await super.runStreamed(variables, onRecord);
    const allowAccept = variables.findings.trim() !== "";
    try {
      const decision = this.parseDecision(readerOutput);
      if (decision === "ACCEPT" && !allowAccept) {
        throw new Error("Initial reader output cannot be ACCEPT.");
      }
      return readerOutput;
    } catch {
      for (let attempt = 1; attempt <= MAX_FORMAT_CORRECTION_ATTEMPTS; attempt++) {
        readerOutput = (
          await this.thread.runStreamed(
            `
Bad format.

Valid output:${allowAccept ? "\n- exactly ACCEPT" : ""}
- exactly IRRELEVANT
- Markdown starting with "# Finding"

Previous output:
${readerOutput}

Task:
Fix format only. Keep the same content.

Return only corrected output.
`,
            onRecord,
          )
        ).trim();
        try {
          const decision = this.parseDecision(readerOutput);
          if (decision === "ACCEPT" && !allowAccept) {
            throw new Error("Initial reader output cannot be ACCEPT.");
          }
          return readerOutput;
        } catch {
          if (attempt === MAX_FORMAT_CORRECTION_ATTEMPTS) {
            throw new Error(
              `reader did not output a valid decision after ${String(MAX_FORMAT_CORRECTION_ATTEMPTS)} correction attempts.`,
            );
          }
        }
      }
    }
    throw new Error("Unreachable reader format correction state.");
  }

  parseDecision(readerOutput: string): MemoryReaderDecision {
    const match = READER_DECISION_PATTERN.exec(readerOutput.trimStart());
    if (match === null) {
      throw new Error(
        "Reader output must be ACCEPT, IRRELEVANT, or Markdown starting with # Finding.",
      );
    }
    return match[1] as MemoryReaderDecision;
  }

  /** Render findings into a prompt path format consistent with this agent. */
  renderFindings(findings: readonly MemoryFraction[]): string {
    return findings
      .map((finding) => `From ${this.memoryRelativePath(finding.path)}:\n${finding.content}`)
      .join("\n\n");
  }

  protected buildPrompt(variables: Readonly<MemoryReaderVariables>): string {
    const filePath = this.memoryRelativePath(variables.filePath);
    const findings = variables.findings.trim();
    if (findings !== "") {
      return `
Domain:
${variables.domainHint}

Query:
${variables.query}

File:
${filePath}

Current relevant findings:
${findings}

Task:
Read File again.
Return ACCEPT if Current relevant findings already include relevant content for this File.
Return IRRELEVANT if File has no relevant content.
Otherwise, return revised relevant content for this file only in the following format:

# Finding
- <small relevant Query fact from this File>

Return only: ACCEPT | IRRELEVANT | Markdown starting with "# Finding".
`;
    }

    return `
Domain:
${variables.domainHint}

Query:
${variables.query}

File:
${filePath}

Task:
Read File. Find the relevant content for the Query in this File.
Return IRRELEVANT if File has no relevant content.
Otherwise return relevant content for this file only in the following format:

# Finding
- <relevant fact for the Query from this File>

Return only: IRRELEVANT | Markdown starting with "# Finding".
`;
  }
}
