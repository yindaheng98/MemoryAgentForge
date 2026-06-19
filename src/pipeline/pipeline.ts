import type { Pipeline } from "coding-agent-forge";

import type { MemoryAgentNames, MemoryAgentVariablesByName } from "../agents/index.js";
import { defineMemoryRecallPipeline, memoryRecallArgsOptions } from "./recall.js";
import { defineMemoryRememberPipeline, memoryRememberArgsOptions } from "./remember.js";
import { defineMemoryCleanPipeline, memoryCleanArgsOptions } from "./clean.js";

export function defineMemoryPipelines<Names extends MemoryAgentNames>(
  recallName: string,
  rememberName: string,
  cleanName: string,
  agentNames: Names,
): readonly [
  Pipeline<typeof memoryRecallArgsOptions, MemoryAgentVariablesByName<Names>>,
  Pipeline<typeof memoryRememberArgsOptions, MemoryAgentVariablesByName<Names>>,
  Pipeline<typeof memoryCleanArgsOptions, MemoryAgentVariablesByName<Names>>,
] {
  return [
    defineMemoryRecallPipeline(recallName, agentNames),
    defineMemoryRememberPipeline(rememberName, agentNames),
    defineMemoryCleanPipeline(cleanName, agentNames),
  ];
}
