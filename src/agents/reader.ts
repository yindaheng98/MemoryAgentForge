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
Domain:
${variables.domainHint}

Query:
${variables.query}

File:
${filePath}

Global findings:
${findings}

According to the global findings, decide the finding of ${filePath} for the query.
If the earlier finding for this file is already good, output exactly:
${variables.acceptMark}
If this file no longer contributes anything useful, output exactly:
${variables.irrelevantMark}
If a change helps, output the revised finding for this memory file.
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
Read File. Return only concise query-related memory; else exactly ${variables.irrelevantMark}.
`;
  }
}
