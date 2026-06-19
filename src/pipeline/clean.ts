import {
  definePipeline,
  type AgentTeam,
  type Pipeline,
  type PipelineOptions,
  type PipelineArgsOptions,
  type RecordCallback,
} from "coding-agent-forge";
import {
  createMemoryAgentFactories,
  type MemoryAgentNames,
  type MemoryAgentVariablesByName,
} from "../agents/index.js";
import { Memory } from "./memory.js";
import { sharedMemoryArgsOptions } from "./config.js";

export const memoryCleanArgsOptions = {
  "domain-hint": sharedMemoryArgsOptions["domain-hint"],
  "memory-path": sharedMemoryArgsOptions["memory-path"],
} as const satisfies PipelineArgsOptions;

/**
 * Expose memory maintenance over the CLI. The returned pipeline scans the
 * memory directory and delegates full-base cleanup to the shared memory base.
 */
export function defineMemoryCleanPipeline<Names extends MemoryAgentNames>(
  name: string,
  agentNames: Names,
): Pipeline<typeof memoryCleanArgsOptions, MemoryAgentVariablesByName<Names>> {
  const memory = new Memory(agentNames);
  return definePipeline({
    name,
    description: "Clean, compress, and deduplicate memory files.",
    argsOptions: memoryCleanArgsOptions,
    agentFactories: createMemoryAgentFactories(agentNames),
    async run(
      team: AgentTeam<MemoryAgentVariablesByName<Names>>,
      options: PipelineOptions<typeof memoryCleanArgsOptions>,
    ): Promise<void> {
      const { "domain-hint": domainHint, "memory-path": memoryPath } = options;
      if (memoryPath === undefined) {
        throw new Error("--memory-path is required");
      }
      const logRecord: RecordCallback = (thread, record) => {
        console.log(thread.recordToPrettyString(record));
      };
      await memory.clean(team, domainHint, memoryPath, logRecord);
    },
  });
}
