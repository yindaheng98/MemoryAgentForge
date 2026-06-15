import { type PipelineArgsOptions } from "coding-agent-forge";
export const memoryArgsOptions = {
  mode: { type: "string", description: "recall or remember" },
  "memory-path": {
    type: "string",
    description: "Memory directory",
  },
  "input-path": {
    type: "string",
    description: "File with the recall query (recall) or the content to store (remember)",
  },
  "max-rounds": {
    type: "string",
    default: "3",
    description: "Refinement round limit for recall and remember",
  },
} as const satisfies PipelineArgsOptions;
