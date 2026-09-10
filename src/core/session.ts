import type { ExperimentRun } from "./types";
import { createRun } from "../simulation/engine";

export const runsStorageKey = "adp-runs-v1";

/** Rebuild deterministic, versioned snapshots from validated configurations.
 * Each entry is isolated: one damaged record must never erase its neighbours. */
export function restoreRuns(raw: string | null): {
  runs: ExperimentRun[];
  rejected: number;
} {
  if (!raw) return { runs: [], rejected: 0 };
  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch {
    return { runs: [], rejected: 1 };
  }
  if (!Array.isArray(entries)) return { runs: [], rejected: 1 };
  const runs: ExperimentRun[] = [];
  const ids = new Set<string>();
  let rejected = 0;
  for (const entry of entries) {
    try {
      if (
        !entry ||
        entry.version !== "adp-core-1" ||
        typeof entry.id !== "string" ||
        !/^ADP-RUN-\d{3,9}$/.test(entry.id) ||
        ids.has(entry.id) ||
        runs.length >= 3
      )
        throw new Error("Invalid saved experiment");
      const run = createRun(entry.config, entry.id);
      ids.add(run.id);
      runs.push(run);
    } catch {
      rejected++;
    }
  }
  return { runs, rejected };
}

/** Curves/events are deterministic; compact storage avoids quota pressure. */
export function serializeRuns(runs: ExperimentRun[]): string {
  return JSON.stringify(
    runs.map(({ id, version, config }) => ({ id, version, config })),
  );
}
