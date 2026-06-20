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
Read File again. Check whether Current findings already cover this File's useful memory.

Return:
- ${variables.acceptMark} if covered.
- ${variables.irrelevantMark} if File adds nothing.
- Otherwise return only this File's missing or corrected finding.

Rules:
- Fix only this File's contribution.
- Do not rewrite global findings.
- Do not explain.

Return only: ${variables.acceptMark} | ${variables.irrelevantMark} | revised File finding.
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
Read File. Return only File memory useful for Query.
Return exactly ${variables.irrelevantMark} if File adds nothing.

Rules:
- Use File only.
- Do not summarize unrelated content.
- Do not explain.

Return only: ${variables.irrelevantMark} | File finding.
`;
  }
}
