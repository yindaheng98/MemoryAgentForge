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

Current relevant findings:
${findings}

Task:
Read File again.
Return ${variables.acceptMark} if Current relevant findings already include relevant content for this File.
Return ${variables.irrelevantMark} if File has no relevant content.
Otherwise, return revised relevant content for this File.

Return only: ${variables.acceptMark} | ${variables.irrelevantMark} | revised relevant content for this File.
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
Read File. Return only relevant content for the Query.
If File has no relevant content, return exactly ${variables.irrelevantMark}

Return only: ${variables.irrelevantMark} | Relevant content for the Query from this File.
`;
  }
}
