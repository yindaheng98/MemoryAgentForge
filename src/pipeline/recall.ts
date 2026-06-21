import {
  definePipeline,
  type AgentTeam,
  type Pipeline,
  type PipelineOptions,
  type PipelineArgsOptions,
} from "coding-agent-forge";
import { readFile } from "node:fs/promises";
import {
  createMemoryAgentFactories,
  type MemoryAgentNames,
  type MemoryAgentVariablesByName,
  type MemoryFraction,
} from "../agents/index.js";
import { Memory } from "./memory.js";
import { sharedMemoryArgsOptions } from "./config.js";
import { createRecordLogger } from "./log.js";

export type MemoryRecallCallback = (findings: readonly MemoryFraction[]) => Promise<void> | void;

export const memoryRecallArgsOptions = {
  ...sharedMemoryArgsOptions,
  "query-path": {
    type: "string",
    description: "File with the recall query",
  },
} as const satisfies PipelineArgsOptions;

/**
 * Expose memory recall over the CLI. The returned pipeline reads a query file
 * and delegates recall to the shared memory base.
 */
export function defineMemoryRecallPipeline<Names extends MemoryAgentNames>(
  name: string,
  agentNames: Names,
): Pipeline<typeof memoryRecallArgsOptions, MemoryAgentVariablesByName<Names>> {
  const memory = new Memory(agentNames);
  return definePipeline({
    name,
    description: "Recall memory relevant to a query.",
    argsOptions: memoryRecallArgsOptions,
    agentFactories: createMemoryAgentFactories(agentNames),
    async run(
      team: AgentTeam<MemoryAgentVariablesByName<Names>>,
      options: PipelineOptions<typeof memoryRecallArgsOptions> & {
        callback?: MemoryRecallCallback;
      },
    ): Promise<void> {
      const {
        callback,
        "domain-hint": domainHint,
        "query-path": queryPath,
        "memory-path": memoryPath,
        "max-rounds": maxRounds,
        "log-record-path": logRecordPath,
      } = options;
      if (queryPath === undefined || memoryPath === undefined) {
        throw new Error(["--query-path", "--memory-path"].join(", ") + " are required");
      }
      const query = (await readFile(queryPath, "utf8")).trim();
      const logRecord = await createRecordLogger(logRecordPath);
      const findings = await memory.recall(
        team,
        domainHint,
        memoryPath,
        Number(maxRounds),
        query,
        logRecord,
      );
      await callback?.(findings);
      const recalled = findings.map(({ content }) => content).join("\n\n");
      console.log(`\n# Recalled memory\n${recalled === "" ? "(none)" : recalled}\n`);
    },
  });
}
