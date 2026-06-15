#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { runPipelinesCli } from "coding-agent-forge";
import { defaultMemoryAgentNames } from "./agents/index.js";
import { defineMemoryPipelines } from "./pipeline/index.js";


function isDirectCli(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectCli()) {
  await runPipelinesCli(defineMemoryPipelines(
    "recall",
    "remember",
    defaultMemoryAgentNames,
  ), process.argv.slice(2));
}
