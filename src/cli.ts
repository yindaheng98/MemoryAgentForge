#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { runPipelinesCli, type Pipeline } from "coding-agent-forge";
import { defineMemoryRecallPipeline } from "./pipeline-recall.js";
import { defineMemoryRememberPipeline } from "./pipeline-remember.js";

/**
 * Domain description shared by every memory agent. It frames what kind of
 * knowledge the memory directory holds so the agents judge relevance and
 * placement consistently. Edit this string (or call the pipeline factories from
 * your own entry point) to specialize the memory for a narrower domain.
 */
export const domainHint =
  "A long-lived knowledge base of durable facts, decisions, and preferences worth keeping across sessions.";

export const recallPipeline = defineMemoryRecallPipeline({
  name: "recall",
  description: "Recall memory relevant to a query from the memory directory.",
  domainHint,
});

export const rememberPipeline = defineMemoryRememberPipeline({
  name: "remember",
  description: "Remember new content by planning and applying memory file changes.",
  domainHint,
});

export const memoryPipelines: readonly Pipeline[] = [recallPipeline, rememberPipeline];

function isDirectCli(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectCli()) {
  await runPipelinesCli(memoryPipelines, process.argv.slice(2));
}
