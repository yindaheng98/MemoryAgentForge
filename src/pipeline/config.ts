import { type PipelineArgsOptions } from "coding-agent-forge";

export const sharedMemoryArgsOptions = {
  "memory-path": {
    type: "string",
    description: "Memory directory override",
  },
  "max-rounds": {
    type: "string",
    default: "3",
    description: "Refinement round limit for recall and remember",
  },
} as const satisfies PipelineArgsOptions;
