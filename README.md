# memory-agent-forge

`memory-agent-forge` turns a folder of plain-text/Markdown files into an
agent-managed memory. A memory base can be embedded in another pipeline or
exposed as manual recall/remember/clean pipelines built on
[`coding-agent-forge`](https://github.com/yindaheng98/CodingAgentForge):

- **recall** — read a query, scan the memory files with reader agents, and print
  the relevant findings.
- **remember** — read new content, plan changes across existing files (and new
  files when needed), then apply them with writer agents.
- **clean** — scan all memory files, compress repeated facts, deduplicate, and
  delete clearly stale or contradicted content.

Recall and remember run their agents in iterative rounds: every file gets its
own agent, each round shares the global findings/plans so far, and the loop
stops once every agent accepts or `--max-rounds` is reached.

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
The default CLI memory requires these agents:

| Agent                   | Used by    | Role                                        |
| ----------------------- | ---------- | ------------------------------------------- |
| `memory-reader`         | `recall`   | Extract query-relevant findings from a file |
| `memory-modify-planner` | `remember` | Plan edits to an existing file              |
| `memory-modifier`       | `remember` | Apply an edit plan to a file                |
| `memory-create-planner` | `remember` | Plan new file(s) for uncovered content      |
| `memory-creator`        | `remember` | Create the planned new file(s)              |
| `memory-cleaner`        | `clean`    | Compress, deduplicate, and prune memory     |

> Keep three paths consistent so the agents can resolve memory files: the CLI's
> `--memory-path`, each agent's `constants.workingDir`, and the thread's
> `options.workingDirectory`. The `memory-modifier`, `memory-creator`, and
> `memory-cleaner` agents write files, so give their thread/runtime write permission (e.g. an
> `acceptEdits`-style permission mode for the runtime you choose).

Additional memory bases provide their own agent names directly, so their YAML
agent keys must match the names passed to `Memory` or `defineMemoryPipelines`.

Put private credentials in `secret.yaml` (git-ignored) and pass it after the
base config so it overrides sensitive fields locally:

```bash
--config memory-forge.yaml --config secret.yaml
```

## CLI

The CLI is itself a set of pipelines: `src/cli.ts` defines the `recall`,
`remember`, and `clean` pipelines with the factories and dispatches them via
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

# Clean and compact the memory files
npm run dev -- clean \
  --config memory-forge.yaml \
  --memory-path ./memory
```

After `npm run build`, the same commands are available through the `bin`:

```bash
memory-agent-forge recall --config memory-forge.yaml --memory-path ./memory --query-path ./query.txt
```

Shared options:

| Option              | Pipelines            | Notes                                                     |
| ------------------- | -------------------- | --------------------------------------------------------- |
| `--config`          | all (repeatable)     | YAML config files, merged in order (required)             |
| `--domain-hint`     | all                  | Memory domain description (has default)                   |
| `--memory-path`     | all                  | Memory directory override (created if missing)            |
| `--log-record-path` | all                  | JSONL file for runtime records (default: `records.jsonl`) |
| `--max-rounds`      | `recall`, `remember` | Refinement round limit (default: `3`)                     |
| `--query-path`      | `recall`             | File holding the recall query (required)                  |
| `--content-path`    | `remember`           | File holding the content to store (required)              |

Running with an unknown or missing pipeline name prints the available pipelines.
Agent runtime records are streamed to the console and appended to the configured
JSONL file; recalled memory is printed at the end of a `recall` run.

## Library usage

Everything is also importable. The package entry re-exports the memory base,
pipelines, agents, and types; subpaths `memory-agent-forge/agents` and
`memory-agent-forge/pipeline` expose the lower layers.

```ts
import { defineMemoryPipelines } from "memory-agent-forge";
import { runPipelinesCli } from "coding-agent-forge";

await runPipelinesCli(
  defineMemoryPipelines("project-recall", "project-remember", {
    reader: "project-memory-reader",
    modifyPlanner: "project-memory-modify-planner",
    modifier: "project-memory-modifier",
    createPlanner: "project-memory-create-planner",
    creator: "project-memory-creator",
    cleaner: "project-memory-cleaner",
  }),
  process.argv.slice(2),
);
```

For embedded use, define a memory base and include its factories in the host
pipeline:

```ts
import { definePipeline } from "coding-agent-forge";
import { Memory } from "memory-agent-forge";

const projectMemory = new Memory({
  reader: "project-memory-reader",
  modifyPlanner: "project-memory-modify-planner",
  modifier: "project-memory-modifier",
  createPlanner: "project-memory-create-planner",
  creator: "project-memory-creator",
  cleaner: "project-memory-cleaner",
});

const hostPipeline = definePipeline({
  name: "work-with-memory",
  description: "Run a task with project memory.",
  argsOptions: {},
  agentFactories: {
    ...projectMemory.agentFactories,
    // host pipeline agent factories...
  },
  async run(team) {
    const context = await projectMemory.recall(
      team,
      "Durable project decisions and conventions.",
      "./memory/project",
      3,
      "How should this project handle releases?",
    );

    // Run host logic with the recalled context, then save durable facts.
    await projectMemory.remember(
      team,
      "Durable project decisions and conventions.",
      "./memory/project",
      3,
      `Release guidance used:\n${context.map(({ content }) => content).join("\n\n")}`,
    );
  },
});
```

Multiple memory bases can coexist by giving each one distinct agent names and
directory:

```ts
const projectMemory = new Memory({
  reader: "project-memory-reader",
  modifyPlanner: "project-memory-modify-planner",
  modifier: "project-memory-modifier",
  createPlanner: "project-memory-create-planner",
  creator: "project-memory-creator",
  cleaner: "project-memory-cleaner",
});

const userMemory = new Memory({
  reader: "user-memory-reader",
  modifyPlanner: "user-memory-modify-planner",
  modifier: "user-memory-modifier",
  createPlanner: "user-memory-create-planner",
  creator: "user-memory-creator",
  cleaner: "user-memory-cleaner",
});

const agentFactories = {
  ...projectMemory.agentFactories,
  ...userMemory.agentFactories,
};
```

For finer-grained control, drive the lower-level `MemoryAggregator`,
`MemoryDispatcher`, and `MemoryCleaner` from `memory-agent-forge/agents`.

## License

[MIT](./LICENSE)
