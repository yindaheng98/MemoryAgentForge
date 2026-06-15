import type { AgentFactoryMap, AgentTeam, RecordCallback } from "coding-agent-forge";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import {
  MemoryAggregator,
  MemoryDispatcher,
  createMemoryAgentFactories,
  type MemoryAgentNames,
  type MemoryAgentVariablesByName,
  type MemoryFraction,
} from "../agents/index.js";

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

export type MemoryConfig = {
  domainHint: string;
  dirPath: string;
  maxRounds: number;
};

export class Memory<Names extends MemoryAgentNames = MemoryAgentNames> {
  readonly agentFactories: AgentFactoryMap;

  constructor(
    readonly config: MemoryConfig,
    readonly agentNames: Names,
  ) {
    this.agentFactories = createMemoryAgentFactories(agentNames);
  }

  async recall(
    team: AgentTeam<MemoryAgentVariablesByName<Names>>,
    query: string,
    onRecord?: RecordCallback,
  ): Promise<MemoryFraction[]> {
    const filePaths = await listMemoryFiles(this.config.dirPath);
    if (filePaths.length === 0) {
      return [];
    }

    return new MemoryAggregator(team, this.agentNames).aggregate(
      {
        domainHint: this.config.domainHint,
        filePaths,
        query,
        maxRounds: this.config.maxRounds,
      },
      onRecord,
    );
  }

  async remember(
    team: AgentTeam<MemoryAgentVariablesByName<Names>>,
    content: string,
    onRecord?: RecordCallback,
  ): Promise<void> {
    const filePaths = await listMemoryFiles(this.config.dirPath);

    await new MemoryDispatcher(team, this.agentNames).dispatch(
      {
        domainHint: this.config.domainHint,
        content,
        dirPath: this.config.dirPath,
        filePaths,
        maxRounds: this.config.maxRounds,
      },
      onRecord,
    );
  }
}
