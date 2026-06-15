import { type PipelineArgsOptions } from "coding-agent-forge";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

export const memoryArgsOptions = {
  mode: { type: "string", description: "recall or remember" },
  "memory-path": {
    type: "string",
    description: "Memory directory",
  },
  "input-path": {
    type: "string",
    description: "File with the recall query (recall) or the content to store (remember)",
  },
  "max-rounds": {
    type: "string",
    default: "3",
    description: "Refinement round limit for recall and remember",
  },
} as const satisfies PipelineArgsOptions;

async function listMemoryFiles(dirPath: string): Promise<string[]> {
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
