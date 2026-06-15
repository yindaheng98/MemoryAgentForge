import type { Pipeline } from "coding-agent-forge";

import type { MemoryAgentNames, MemoryAgentVariablesByName } from "../agents/index.js";
import type { MemoryConfig } from "../memory/index.js";
import { defineMemoryRecallPipeline, memoryRecallArgsOptions } from "./recall.js";
import { defineMemoryRememberPipeline, memoryRememberArgsOptions } from "./remember.js";

export function defineMemoryPipelines<Names extends MemoryAgentNames>(
  recallName: string,
  rememberName: string,
  memoryConfig: MemoryConfig,
  agentNames: Names,
): readonly [
  Pipeline<typeof memoryRecallArgsOptions, MemoryAgentVariablesByName<Names>>,
  Pipeline<typeof memoryRememberArgsOptions, MemoryAgentVariablesByName<Names>>,
] {
  return [
    defineMemoryRecallPipeline(recallName, memoryConfig, agentNames),
    defineMemoryRememberPipeline(rememberName, memoryConfig, agentNames),
  ];
}
