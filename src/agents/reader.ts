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

Current findings:
${findings}

Task:
Return ${variables.acceptMark} if current findings fully cover relevant facts from this file.
Return ${variables.irrelevantMark} if the file contains no relevant facts.
Otherwise, return only new or corrected facts from the file.

Return only: ${variables.acceptMark} | ${variables.irrelevantMark} | Revised facts from the file.
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
Return facts from the file relevant to the query.
If none, return exactly: ${variables.irrelevantMark}

Return only: ${variables.irrelevantMark} | Relevant facts from the file.
`;
  }
}
