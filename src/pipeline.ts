import {
  definePipeline,
  type AgentTeam,
  type Pipeline,
  type PipelineOptions,
  type RecordCallback,
  type PipelineArgsOptions,
} from "coding-agent-forge";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  MemoryAggregator,
  MemoryDispatcher,
  memoryAggregateAgentFactories,
  memoryDispatchAgentFactories,
  type MemoryAggregateAgentVariablesByName,
  type MemoryDispatchAgentVariablesByName,
} from "./agents/index.js";

const sharedMemoryArgsOptions = {
  "memory-path": {
    type: "string",
    description: "Memory directory",
  },
  "max-rounds": {
    type: "string",
    default: "3",
    description: "Refinement round limit for recall and remember",
  },
} as const satisfies PipelineArgsOptions;

export const memoryRecallArgsOptions = {
  ...sharedMemoryArgsOptions,
  "query-path": {
    type: "string",
    description: "File with the recall query",
  },
} as const satisfies PipelineArgsOptions;

export const memoryRememberArgsOptions = {
  ...sharedMemoryArgsOptions,
  "content-path": {
    type: "string",
    description: "File with the content to store",
  },
} as const satisfies PipelineArgsOptions;

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

/**
 * Expose memory recall over the CLI. The returned pipeline reads a query file,
 * lists the memory files, then aggregates the relevant memory.
 */
export function defineMemoryRecallPipeline(config: {
  name: string;
  description: string;
  domainHint: string;
}): Pipeline<typeof memoryRecallArgsOptions, MemoryAggregateAgentVariablesByName> {
  return definePipeline({
    name: config.name,
    description: config.description,
    argsOptions: memoryRecallArgsOptions,
    agentFactories: memoryAggregateAgentFactories,
    async run(
      team: AgentTeam<MemoryAggregateAgentVariablesByName>,
      options: PipelineOptions<typeof memoryRecallArgsOptions>,
    ): Promise<void> {
      const {
        "query-path": queryPath,
        "max-rounds": maxRounds,
        "memory-path": memoryPath,
      } = options;
      if (queryPath === undefined || memoryPath === undefined) {
        throw new Error("--query-path and --memory-path are required");
      }
      const query = (await readFile(queryPath, "utf8")).trim();
      const dirPath = memoryPath;
      const filePaths = await listMemoryFiles(dirPath);
      const logRecord: RecordCallback = (thread, record) => {
        console.log(thread.recordToPrettyString(record));
      };

      const findings = await new MemoryAggregator(team).aggregate(
        { domainHint: config.domainHint, filePaths, query, maxRounds: Number(maxRounds) },
        logRecord,
      );
      const recalled = findings.map(({ content }) => content).join("\n\n");
      console.log(`\n# Recalled memory\n${recalled === "" ? "(none)" : recalled}\n`);
    },
  });
}

/**
 * Expose memory remember over the CLI. The returned pipeline reads content,
 * lists the memory files, then plans and applies memory changes.
 */
export function defineMemoryRememberPipeline(config: {
  name: string;
  description: string;
  domainHint: string;
}): Pipeline<typeof memoryRememberArgsOptions, MemoryDispatchAgentVariablesByName> {
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
      const dirPath = memoryPath;
      const filePaths = await listMemoryFiles(dirPath);
      const logRecord: RecordCallback = (thread, record) => {
        console.log(thread.recordToPrettyString(record));
      };

      await new MemoryDispatcher(team).dispatch(
        {
          domainHint: config.domainHint,
          content,
          dirPath,
          filePaths,
          maxRounds: Number(maxRounds),
        },
        logRecord,
      );
    },
  });
}
