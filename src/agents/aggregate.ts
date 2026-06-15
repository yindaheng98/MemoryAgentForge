import type { RecordCallback } from "coding-agent-forge";
import { MemoryReaderAgent } from "./reader.js";
import type { MemoryFraction } from "./types.js";

const IRRELEVANT_MARK = "IRRELEVANT";
const ACCEPT_MARK = "ACCEPT";

function isRelevant(finding: MemoryFraction): boolean {
  return finding.content !== "" && finding.content !== IRRELEVANT_MARK;
}

export type MemoryAggregateOptions = {
  domainHint: string;
  filePaths: readonly string[];
  maxRounds: number;
  query: string;
};

export type MemoryReaderFactory = () => Promise<MemoryReaderAgent>;

type State = {
  accepted: boolean;
  finding: MemoryFraction;
  reader: MemoryReaderAgent;
};

/**
 * One reader pass: every unaccepted file's reader re-reads its file against the
 * given global findings ("" on the first pass) and accepts or revises its own
 * finding. Accepted findings are kept without re-running their readers.
 */
async function readerPass(
  current: readonly State[],
  findings: string,
  options: MemoryAggregateOptions,
  onRecord?: RecordCallback,
): Promise<State[]> {
  return Promise.all(
    current.map(async (entry): Promise<State> => {
      if (entry.accepted) {
        return entry;
      }
      const content = (
        await entry.reader.runStreamed(
          {
            domainHint: options.domainHint,
            findings,
            query: options.query,
            filePath: entry.finding.path,
            irrelevantMark: IRRELEVANT_MARK,
            acceptMark: ACCEPT_MARK,
          },
          onRecord,
        )
      ).trim();
      if (content === ACCEPT_MARK) {
        return { accepted: true, finding: entry.finding, reader: entry.reader };
      }
      return {
        accepted: false,
        finding: { path: entry.finding.path, content: content === "" ? IRRELEVANT_MARK : content },
        reader: entry.reader,
      };
    }),
  );
}

/**
 * Recall relevant findings with iterative reader passes.
 *
 * First pass: each file's reader independently extracts a finding (empty global
 * findings). Every file keeps a finding slot, including IRRELEVANT.
 * Refinement passes: unaccepted files get the global findings, including
 * irrelevant ones, and may accept or revise their own findings. Accepted
 * findings are kept without re-running their readers. Stop when every reader
 * accepts or when the configured round limit is reached.
 */
export async function memoryAggregate(
  createReader: MemoryReaderFactory,
  options: MemoryAggregateOptions,
  onRecord?: RecordCallback,
): Promise<MemoryFraction[]> {
  if (options.filePaths.length === 0) {
    throw new Error("memoryAggregate requires at least one memory file");
  }

  const renderer = await createReader();

  const seed: State[] = await Promise.all(
    options.filePaths.map(async (filePath) => ({
      accepted: false,
      finding: { path: filePath, content: IRRELEVANT_MARK },
      reader: await createReader(),
    })),
  );

  let current = await readerPass(seed, "", options, onRecord);
  if (!current.some(({ finding }) => isRelevant(finding))) {
    return [];
  }

  for (let round = 1; round <= options.maxRounds; round++) {
    const globalFindings = renderer.renderFindings(
      current.map(({ finding }) => finding).filter(isRelevant),
    );
    const refined = await readerPass(current, globalFindings, options, onRecord);
    if (!refined.some(({ finding }) => isRelevant(finding))) {
      return [];
    }

    current = refined;
    if (current.every(({ accepted }) => accepted)) {
      break;
    }
  }

  return current.map(({ finding }) => finding).filter(isRelevant);
}
