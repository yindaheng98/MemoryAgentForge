import type { RecordCallback } from "coding-agent-forge";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function createRecordLogger(logRecordPath: string): Promise<RecordCallback> {
  await mkdir(path.dirname(path.resolve(logRecordPath)), { recursive: true });

  return async (thread, record) => {
    console.log(thread.recordToPrettyString(record));
    await appendFile(logRecordPath, `${JSON.stringify(record)}\n`, "utf8");
  };
}
