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
  createMemoryAgentFactories,
  type MemoryAgentNames,
  type MemoryAgentVariablesByName,
} from "../agents/index.js";
import { Memory } from "./memory.js";
import { sharedMemoryArgsOptions } from "./config.js";

export const memoryRememberArgsOptions = {
  ...sharedMemoryArgsOptions,
  "content-path": {
    type: "string",
    description: "File with the content to store",
  },
} as const satisfies PipelineArgsOptions;

/**
 * Expose memory remember over the CLI. The returned pipeline reads content and
 * delegates storage to the shared memory base.
 */
export function defineMemoryRememberPipeline<Names extends MemoryAgentNames>(
  name: string,
  agentNames: Names,
): Pipeline<typeof memoryRememberArgsOptions, MemoryAgentVariablesByName<Names>> {
  const memory = new Memory(agentNames);
  return definePipeline({
    name,
    description: "Remember content into memory.",
    argsOptions: memoryRememberArgsOptions,
    agentFactories: createMemoryAgentFactories(agentNames),
    async run(
      team: AgentTeam<MemoryAgentVariablesByName<Names>>,
      options: PipelineOptions<typeof memoryRememberArgsOptions>,
    ): Promise<void> {
      const {
        "domain-hint": domainHint,
        "content-path": contentPath,
        "memory-path": memoryPath,
        "max-rounds": maxRounds,
      } = options;
      if (contentPath === undefined || memoryPath === undefined) {
        throw new Error(["--content-path", "--memory-path"].join(", ") + " are required");
      }
      const content = (await readFile(contentPath, "utf8")).trim();
      const logRecord: RecordCallback = (thread, record) => {
        console.log(thread.recordToPrettyString(record));
      };
      await memory.remember(team, domainHint, memoryPath, Number(maxRounds), content, logRecord);
    },
  });
}
