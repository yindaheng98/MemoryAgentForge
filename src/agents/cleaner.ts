import type { RecordCallback } from "coding-agent-forge";
import { MemoryAgent } from "./types.js";

export type MemoryCleanerVariables = {
  domainHint: string;
  dirPath: string;
};

export class MemoryCleanerAgent extends MemoryAgent<MemoryCleanerVariables> {
  protected buildPrompt(variables: Readonly<MemoryCleanerVariables>): string {
    const dirPath = this.memoryRelativePath(variables.dirPath);
    return `
Domain:
${variables.domainHint}

Folder:
${dirPath}

Task:
Scan files in Folder. Compress, dedupe, delete obsolete content.
`;
  }
}

export type MemoryCleanOptions = {
  domainHint: string;
  dirPath: string;
};

export type MemoryCleanerFactory = () => Promise<MemoryCleanerAgent>;

/**
 * Maintain the full memory base with one cleaner agent.
 *
 * The cleaner gets the complete memory file list, reads the files itself, and
 * applies compression, deduplication, and deletion of clearly obsolete content.
 */
export async function memoryClean(
  createCleaner: MemoryCleanerFactory,
  options: MemoryCleanOptions,
  onRecord?: RecordCallback,
): Promise<void> {
  const cleaner = await createCleaner();
  await cleaner.runStreamed(
    {
      domainHint: options.domainHint,
      dirPath: options.dirPath,
    },
    onRecord,
  );
}
