import type { PromptConstants, PromptVariables, Thread } from "coding-agent-forge";
import { Agent } from "coding-agent-forge/agent";
import { statSync } from "node:fs";
import path from "node:path";

export type MemoryAgentConstants = {
  memoryDir: string;
};

/**
 * Base for every memory agent. Holds the memory directory used to render a
 * Finding's absolute path as a prompt path the agent's tools can resolve.
 */
export abstract class MemoryAgent<Variables extends PromptVariables> extends Agent<
  Variables,
  MemoryAgentConstants
> {
  protected readonly memoryDir: string;

  constructor(thread: Thread, constants: Readonly<PromptConstants>) {
    if (!constants.memoryDir) {
      throw new Error("Memory agent constants.memoryDir must be configured.");
    }

    const memoryDir = path.resolve(constants.memoryDir);
    if (!statSync(memoryDir).isDirectory()) {
      throw new Error(`memoryDir must be a directory: ${memoryDir}`);
    }
    super(thread, { memoryDir });
    this.memoryDir = memoryDir;
  }

  protected memoryRelativePath(filePath: string): string {
    return path.relative(this.memoryDir, path.resolve(filePath)) || ".";
  }
}

export type Finding = {
  path: string;
  content: string;
};
