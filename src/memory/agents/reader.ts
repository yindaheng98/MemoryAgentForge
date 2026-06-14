import { MemoryAgent, type MemoryFraction } from "./types.js";

export type MemoryReaderVariables = {
  domainHint: string;
  query: string;
  filePath: string;
  findings: string;
  irrelevantMark: string;
  acceptMark: string;
};

export class MemoryReaderAgent extends MemoryAgent<MemoryReaderVariables> {
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
Memory domain:
${variables.domainHint}

Query:
${variables.query}

Global findings from all memory files (may include an earlier finding for ${filePath}):
${findings}

According to the global findings, decide the finding of ${filePath} for the query.
If the earlier finding for this file is already good, output exactly:
${variables.acceptMark}
If a change helps, output the revised finding for this memory file.
If this file no longer contributes anything useful, output exactly:
${variables.irrelevantMark}
`;
    }

    return `
Memory domain:
${variables.domainHint}

Query:
${variables.query}

Read the memory file ${filePath} and extract anything related to the query. Summarize the related points concisely.
If nothing is related to the query, output exactly:
${variables.irrelevantMark}
`;
  }
}
