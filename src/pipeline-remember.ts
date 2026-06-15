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
  MemoryDispatcher,
  memoryDispatchAgentFactories,
  type MemoryDispatchAgentVariablesByName,
} from "./agents/index.js";
import {
  listMemoryFiles,
  sharedMemoryArgsOptions,
  type MemoryPipelineConfig,
} from "./pipeline.js";

export const memoryRememberArgsOptions = {
  ...sharedMemoryArgsOptions,
  "content-path": {
    type: "string",
    description: "File with the content to store",
  },
} as const satisfies PipelineArgsOptions;

/**
 * Expose memory remember over the CLI. The returned pipeline reads content,
 * lists the memory files, then plans and applies memory changes.
 */
export function defineMemoryRememberPipeline(
  config: MemoryPipelineConfig,
): Pipeline<typeof memoryRememberArgsOptions, MemoryDispatchAgentVariablesByName> {
  return definePipeline({
    name: config.name,
    description: config.description,
    argsOptions: memoryRememberArgsOptions,
    agentFactories: memoryDispatchAgentFactories,
    async run(
      team: AgentTeam<MemoryDispatchAgentVariablesByName>,
      options: PipelineOptions<typeof memoryRememberArgsOptions>,
    ): Promise<void> {
      const {
        "content-path": contentPath,
        "max-rounds": maxRounds,
        "memory-path": memoryPath,
      } = options;
      if (contentPath === undefined || memoryPath === undefined) {
        throw new Error("--content-path and --memory-path are required");
      }
      const content = (await readFile(contentPath, "utf8")).trim();
      const filePaths = await listMemoryFiles(memoryPath);
      const logRecord: RecordCallback = (thread, record) => {
        console.log(thread.recordToPrettyString(record));
      };

      await new MemoryDispatcher(team).dispatch(
        {
          domainHint: config.domainHint,
          content,
          dirPath: memoryPath,
          filePaths,
          maxRounds: Number(maxRounds),
        },
        logRecord,
      );
    },
  });
}
