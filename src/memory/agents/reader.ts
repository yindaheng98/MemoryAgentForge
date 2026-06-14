import { MemoryAgent, type Finding } from "./types.js";

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
  renderFindings(findings: readonly Finding[]): string {
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

Read only the memory file ${filePath}; in light of the global findings, decide this file's finding for the query.
If your earlier finding for this file is already good as is, output exactly:
${variables.acceptMark}
If a change helps, output the revised finding for this file only.
If this file no longer contributes anything useful, output exactly:
${variables.irrelevantMark}
`;
    }

    return `
Memory domain:
${variables.domainHint}

Query:
${variables.query}

Read only the memory file ${filePath}; if it contains anything related to the query, extract and summarize the related points concisely.
Otherwise output exactly:
${variables.irrelevantMark}
`;
  }
}
