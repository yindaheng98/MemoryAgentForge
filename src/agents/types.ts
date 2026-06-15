import type { PromptConstants, PromptVariables, Thread } from "coding-agent-forge";
import { Agent } from "coding-agent-forge/agent";
import { statSync } from "node:fs";
import path from "node:path";

export type MemoryAgentConstants = {
  workingDir: string;
};

/**
 * Base for every memory agent. Holds the memory directory used to render a
 * memory file's absolute path as a prompt path the agent's tools can resolve.
 */
export abstract class MemoryAgent<Variables extends PromptVariables> extends Agent<
  Variables,
  MemoryAgentConstants
> {
  protected readonly workingDir: string;

  constructor(thread: Thread, constants: Readonly<PromptConstants>) {
    if (!constants.workingDir) {
      throw new Error("Memory agent constants.workingDir must be configured.");
    }

    const workingDir = path.resolve(constants.workingDir);
    if (!statSync(workingDir).isDirectory()) {
      throw new Error(`workingDir must be a directory: ${workingDir}`);
    }
    super(thread, { workingDir });
    this.workingDir = workingDir;
  }

  protected memoryRelativePath(filePath: string): string {
    return path.relative(this.workingDir, path.resolve(filePath)) || ".";
  }
}

export type MemoryFraction = {
  path: string;
  content: string;
};
