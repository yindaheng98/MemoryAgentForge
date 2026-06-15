import { type PipelineArgsOptions } from "coding-agent-forge";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

export type MemoryPipelineConfig = {
  name: string;
  description: string;
  domainHint: string;
};

export const sharedMemoryArgsOptions = {
  "memory-path": {
    type: "string",
    description: "Memory directory",
  },
  "max-rounds": {
    type: "string",
    default: "3",
    description: "Refinement round limit for recall and remember",
  },
} as const satisfies PipelineArgsOptions;

export async function listMemoryFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  await mkdir(dirPath, { recursive: true });
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      files.push(path.join(dirPath, entry.name));
    }
  }
  return files;
}
