import {
  definePipeline,
  type AgentTeam,
  type Pipeline,
  type PipelineOptions,
  type PipelineArgsOptions,
  type RecordCallback,
} from "coding-agent-forge";
import { readFile } from "node:fs/promises";
import {
  MemoryAggregator,
  memoryAggregateAgentFactories,
  type MemoryFraction,
  type MemoryAggregateAgentVariablesByName,
} from "../agents/index.js";
import {
  listMemoryFiles,
  sharedMemoryArgsOptions,
  type MemoryPipelineConfig,
} from "./common.js";

export type MemoryRecallCallback = (findings: readonly MemoryFraction[]) => Promise<void> | void;

export const memoryRecallArgsOptions = {
  ...sharedMemoryArgsOptions,
  "query-path": {
    type: "string",
    description: "File with the recall query",
  },
} as const satisfies PipelineArgsOptions;

/**
 * Expose memory recall over the CLI. The returned pipeline reads a query file,
 * lists the memory files, then aggregates the relevant memory.
 */
export function defineMemoryRecallPipeline(
  config: MemoryPipelineConfig,
): Pipeline<typeof memoryRecallArgsOptions, MemoryAggregateAgentVariablesByName> {
  return definePipeline({
    name: config.name,
    description: config.description,
    argsOptions: memoryRecallArgsOptions,
    agentFactories: memoryAggregateAgentFactories,
    async run(
      team: AgentTeam<MemoryAggregateAgentVariablesByName>,
      options: PipelineOptions<typeof memoryRecallArgsOptions> & {
        callback?: MemoryRecallCallback;
      },
    ): Promise<void> {
      const {
        callback,
        "query-path": queryPath,
        "max-rounds": maxRounds,
        "memory-path": memoryPath,
      } = options;
      if (queryPath === undefined || memoryPath === undefined) {
        throw new Error("--query-path and --memory-path are required");
      }
      const query = (await readFile(queryPath, "utf8")).trim();
      const filePaths = await listMemoryFiles(memoryPath);
      const logRecord: RecordCallback = (thread, record) => {
        console.log(thread.recordToPrettyString(record));
      };

      const findings = await new MemoryAggregator(team).aggregate(
        { domainHint: config.domainHint, filePaths, query, maxRounds: Number(maxRounds) },
        logRecord,
      );
      await callback?.(findings);
    },
  });
}
