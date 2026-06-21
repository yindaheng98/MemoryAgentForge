import { type PipelineArgsOptions } from "coding-agent-forge";

export const sharedMemoryArgsOptions = {
  "domain-hint": {
    type: "string",
    default:
      "A long-lived knowledge base of durable facts, decisions, and preferences worth keeping across sessions.",
    description: "Memory domain description",
  },
  "memory-path": {
    type: "string",
    description: "Memory directory override",
  },
  "max-rounds": {
    type: "string",
    default: "3",
    description: "Refinement round limit for recall and remember",
  },
  "log-record-path": {
    type: "string",
    default: "records.jsonl",
    description: "JSONL file to append agent runtime records to",
  },
} as const satisfies PipelineArgsOptions;
