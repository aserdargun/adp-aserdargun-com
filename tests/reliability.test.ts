import { describe, expect, it } from "vitest";
import { defaultConfig, validateConfig } from "../src/core/models";
import {
  baselineScores,
  checkContract,
  scoreKeys,
} from "../src/core/evaluation";
import type { AdaptationConfig, Scores } from "../src/core/types";
import { restoreRuns, serializeRuns } from "../src/core/session";
import { createRun, replay } from "../src/simulation/engine";

const valid = createRun(defaultConfig);
const second = createRun(
  { ...defaultConfig, method: "qlora", seed: 7 },
  "ADP-RUN-002",
);

describe("fail-closed evaluation", () => {
  it.each(scoreKeys)("requires the %s score in both score sets", (key) => {
    for (const side of ["baseline", "adapted"] as const) {
      const scores = { ...valid.evaluation[side] } as Partial<Scores>;
      delete scores[key];
      const result = checkContract(
        side === "baseline" ? (scores as Scores) : valid.evaluation.baseline,
        side === "adapted" ? (scores as Scores) : valid.evaluation.adapted,
        false,
      );
      expect(result.pass).toBe(false);
      expect(result.reasons).toContain("invalidScores");
    }
  });
  it("requires an explicit clean integrity result", () => {
    for (const value of [undefined, null, 0, "false"])
      expect(
        checkContract(
          baselineScores,
          valid.evaluation.adapted,
          value as unknown as boolean,
        ).pass,
      ).toBe(false);
  });
  it("rejects missing score objects without crashing", () => {
    expect(
      checkContract(null as unknown as Scores, valid.evaluation.adapted, false)
        .pass,
    ).toBe(false);
    expect(
      checkContract(baselineScores, undefined as unknown as Scores, false).pass,
    ).toBe(false);
  });
});

describe("saved experiments survive partial corruption", () => {
  it("restores compact records with identical events, curves, and evaluation", () => {
    const encoded = serializeRuns([valid, second]);
    expect(encoded.length).toBeLessThan(
      JSON.stringify([valid, second]).length / 10,
    );
    expect(restoreRuns(encoded)).toEqual({
      runs: [valid, second],
      rejected: 0,
    });
  });
  it("isolates an invalid configuration between valid snapshots", () => {
    const broken = {
      ...valid,
      id: "ADP-RUN-003",
      config: { ...defaultConfig, model: "unknown" },
    };
    expect(restoreRuns(JSON.stringify([valid, broken, second]))).toEqual({
      runs: [valid, second],
      rejected: 1,
    });
  });
  it("rejects duplicate IDs and unsupported versions without losing neighbours", () => {
    const result = restoreRuns(
      JSON.stringify([valid, valid, { ...second, version: "future" }, second]),
    );
    expect(result.runs).toEqual([valid, second]);
    expect(result.rejected).toBe(2);
  });
  it("recovers up to three valid records after malformed entries", () => {
    const third = { ...valid, id: "ADP-RUN-003" };
    const fourth = { ...valid, id: "ADP-RUN-004" };
    const result = restoreRuns(
      JSON.stringify([null, {}, valid, second, third, fourth]),
    );
    expect(result.runs.map((r) => r.id)).toEqual([
      valid.id,
      second.id,
      third.id,
    ]);
    expect(result.rejected).toBe(3);
  });
  it("handles malformed JSON and invalid containers", () => {
    for (const raw of ["{", "null", "{}", '"hello"'])
      expect(restoreRuns(raw)).toEqual({ runs: [], rejected: 1 });
    expect(restoreRuns(null)).toEqual({ runs: [], rejected: 0 });
  });
  it("rejects IDs that could overflow the next run number", () => {
    expect(
      restoreRuns(
        JSON.stringify([{ ...valid, id: "ADP-RUN-99999999999999999999999" }]),
      ).runs,
    ).toEqual([]);
  });
  it("validates runtime configuration shapes", () => {
    for (const c of [
      null,
      [],
      {},
      { ...defaultConfig, targets: "qv" },
      { ...defaultConfig, targets: null },
    ])
      expect(() => validateConfig(c as unknown as AdaptationConfig)).toThrow();
  });
});

describe("simulation cursor bounds", () => {
  it("treats NaN as the beginning and clamps infinity to the end", () => {
    expect(replay(valid, NaN).current.type).toBe("RUN_STARTED");
    expect(replay(valid, -Infinity).current.type).toBe("RUN_STARTED");
    expect(replay(valid, Infinity).complete).toBe(true);
  });
  it("does not mutate a saved configuration when source settings change", () => {
    const settings = structuredClone(defaultConfig);
    const run = createRun(settings);
    settings.targets.push("k");
    settings.seed = 99;
    expect(run.config).toEqual(defaultConfig);
  });
});
