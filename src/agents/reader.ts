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
Otherwise, return the complete set of relevant facts from the file after adding and correcting facts.

Return only: ${variables.acceptMark} | ${variables.irrelevantMark} | Complete updated facts from the file.
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
Read File. Return only content relevant to the Query.
If File has no relevant content, return exactly ${variables.irrelevantMark}

Return only: ${variables.irrelevantMark} | Relevant content from the file.
`;
  }
}
