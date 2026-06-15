# memory-agent-forge

`memory-agent-forge` turns a folder of plain-text/Markdown files into an
agent-managed memory. It ships two pipelines built on
[`coding-agent-forge`](https://github.com/yindaheng98/CodingAgentForge):

- **recall** — read a query, scan the memory files with reader agents, and print
  the relevant findings.
- **remember** — read new content, plan changes across existing files (and new
  files when needed), then apply them with writer agents.

Both pipelines run their agents in iterative rounds: every file gets its own
agent, each round shares the global findings/plans so far, and the loop stops
once every agent accepts or `--max-rounds` is reached.

## Install

```bash
npm install
```

## Build and checks

```bash
npm run check        # type-check only (tsc --noEmit)
npm run lint         # eslint
npm run format:check # prettier --check
npm run build        # clean + tsc -> dist/
```

## Configuration

Memory agents are configured with a YAML file (see [`memory-forge.yaml`](./memory-forge.yaml)).
The CLI requires these agents:

| Agent                   | Used by    | Role                                        |
| ----------------------- | ---------- | ------------------------------------------- |
| `memory-reader`         | `recall`   | Extract query-relevant findings from a file |
| `memory-modify-planner` | `remember` | Plan edits to an existing file              |
| `memory-modifier`       | `remember` | Apply an edit plan to a file                |
| `memory-create-planner` | `remember` | Plan new file(s) for uncovered content      |
| `memory-creator`        | `remember` | Create the planned new file(s)              |

> Keep three paths consistent so the agents can resolve memory files: the CLI's
> `--memory-path`, each agent's `constants.memoryDir`, and the thread's
> `options.workingDirectory`. The `memory-modifier` and `memory-creator` agents
> write files, so give their thread/runtime write permission (e.g. an
> `acceptEdits`-style permission mode for the runtime you choose).

Put private credentials in `secret.yaml` (git-ignored) and pass it after the
base config so it overrides sensitive fields locally:

```bash
--config memory-forge.yaml --config secret.yaml
```

## CLI

The CLI is itself a set of pipelines: `src/cli.ts` defines the `recall` and
`remember` pipelines with the factories and dispatches them via
`runPipelinesCli`. Run it in development with `tsx`:

```bash
# Recall memory relevant to a query
npm run dev -- recall \
  --config memory-forge.yaml \
  --memory-path ./memory \
  --query-path ./query.txt \
  --max-rounds 3

# Remember new content into the memory files
npm run dev -- remember \
  --config memory-forge.yaml \
  --memory-path ./memory \
  --content-path ./content.txt \
  --max-rounds 3
```

After `npm run build`, the same commands are available through the `bin`:

```bash
memory-agent-forge recall --config memory-forge.yaml --memory-path ./memory --query-path ./query.txt
```

Shared options:

| Option           | Pipelines         | Notes                                            |
| ---------------- | ----------------- | ------------------------------------------------ |
| `--config`       | both (repeatable) | YAML config files, merged in order (required)    |
| `--memory-path`  | both              | Memory directory (created if missing) (required) |
| `--max-rounds`   | both              | Refinement round limit (default: `3`)            |
| `--query-path`   | `recall`          | File holding the recall query (required)         |
| `--content-path` | `remember`        | File holding the content to store (required)     |

Running with an unknown or missing pipeline name prints the available pipelines.
Agent runtime records are streamed to the console; recalled memory is printed at
the end of a `recall` run.

## Library usage

Everything is also importable. The package entry re-exports the pipelines,
agents, and types; subpaths `memory-agent-forge/agents` and
`memory-agent-forge/pipeline` expose the lower layers.

```ts
import { defineMemoryRecallPipeline, defineMemoryRememberPipeline } from "memory-agent-forge";
import { runPipelinesCli } from "coding-agent-forge";

// Specialize the shared domain hint for your own memory.
const domainHint = "Engineering decisions and conventions for project X.";

await runPipelinesCli(
  [
    defineMemoryRecallPipeline({
      name: "recall",
      description: "Recall project memory.",
      domainHint,
    }),
    defineMemoryRememberPipeline({
      name: "remember",
      description: "Remember project memory.",
      domainHint,
    }),
  ],
  process.argv.slice(2),
);
```

For finer-grained control, drive the agent teams directly with `MemoryAggregator`
and `MemoryDispatcher` from `memory-agent-forge/agents`.

## License

[MIT](./LICENSE)
