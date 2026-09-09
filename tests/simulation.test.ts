import { describe, it, expect } from "vitest";
import { defaultConfig as c } from "../src/core/models";
import { prepareData, workload } from "../src/core/datasets";
import { curvePoint, evaluate, checkContract } from "../src/core/evaluation";
import { createRun, replay } from "../src/simulation/engine";
describe("data preparation and split integrity", () => {
  it("creates 80/10/10 splits with disjoint identities and duplicate groups", () => {
    const d = prepareData(c);
    expect([d.train.length, d.validation.length, d.test.length]).toEqual([
      4000, 500, 500,
    ]);
    const train = new Set(d.train.map((s) => s.duplicateGroup));
    expect(
      d.validation.concat(d.test).some((s) => train.has(s.duplicateGroup)),
    ).toBe(false);
    expect(new Set(d.rows.map((s) => s.id)).size).toBe(5000);
  });
  it("deduplicates train while preserving independent evaluation banks", () => {
    const raw = prepareData(c),
      clean = prepareData({ ...c, deduplicate: true });
    expect(raw.duplicates).toBe(80);
    expect(clean.duplicates).toBe(0);
    expect(clean.train.length).toBe(3920);
    expect(clean.validation).toEqual(raw.validation);
    expect(clean.test).toEqual(raw.test);
  });
  it("filters the specified dimensions, not test data", () => {
    const d = prepareData({
      ...c,
      dataset: "noisy",
      duplicates: 35,
      qualityFilter: true,
      contradictionFilter: true,
    });
    expect(d.noise + d.contradiction + d.irrelevant + d.missing).toBe(0);
    expect(d.duplicates).toBeGreaterThan(0);
  });
  it("leaks exact test identities only when deliberately enabled", () => {
    const d = prepareData({ ...c, leakage: true });
    const test = new Set(d.test.map((s) => s.id));
    expect(d.train.filter((s) => test.has(s.id)).length).toBe(100);
    expect(d.leakageCount).toBe(100);
  });
  it("calculates unique diversity independently of raw count", () => {
    const a = prepareData(c),
      b = prepareData({ ...c, duplicates: 50 });
    expect(b.unique).toBeLessThan(a.unique);
    expect(b.diversity).toBeLessThan(a.diversity);
  });
  it("resets deterministically", () =>
    expect(prepareData(c)).toEqual(prepareData({ ...c })));
  it("counts effective batches and partial accumulation correctly", () => {
    const w = workload(
      { ...c, microBatch: 3, accumulation: 7 },
      prepareData(c),
    );
    expect(w.effectiveBatch).toBe(21);
    expect(w.microBatchesPerEpoch).toBe(1334);
    expect(w.updatesPerEpoch).toBe(191);
    expect(w.tokenExposure).toBe(4000 * 2048 * 3);
  });
  it("caps average tokens at sequence truncation, not artificial padding", () =>
    expect(prepareData({ ...c, sequence: 8192 }).averageTokens).toBe(2048));
});
describe("deterministic state-driven simulation", () => {
  it("reproduces events, curve and evaluation", () =>
    expect(createRun(c)).toEqual(createRun(c)));
  it("does not randomize quality when only rank changes", () => {
    expect(createRun({ ...c, rank: 64 }).curve).toEqual(createRun(c).curve);
    expect(createRun({ ...c, rank: 64 }).evaluation).toEqual(
      createRun(c).evaluation,
    );
  });
  it("accounts for every example and update including partial batches", () => {
    const config = { ...c, microBatch: 3, accumulation: 7 };
    const run = createRun(config),
      state = replay(run, run.events.length - 1);
    expect(state.examples).toBe(run.trainExamples * c.epochs);
    expect(state.updates).toBe(run.optimizerSteps);
    expect(
      run.events
        .filter((e) => e.type === "BATCH_STARTED")
        .reduce((a, e) => a + e.microBatches, 0),
    ).toBe(1334 * 3);
  });
  it("does not update frozen base or reveal evaluation early", () => {
    const run = createRun(c);
    expect(replay(run, 4).updates).toBe(0);
    expect(replay(run, 4).evaluated).toBe(false);
    const saved = run.events.findIndex((e) => e.type === "CHECKPOINT_SAVED");
    expect(replay(run, saved).trainingComplete).toBe(true);
    expect(replay(run, saved).evaluated).toBe(false);
    expect(replay(run, 1e9).evaluated).toBe(true);
  });
  it("models overfitting with falling train and rising validation loss", () => {
    const d = prepareData(c),
      a = curvePoint(c, d, 3),
      b = curvePoint(c, d, 10);
    expect(b.training).toBeLessThan(a.training);
    expect(b.validation).toBeGreaterThan(a.validation);
  });
  it("has a weak low-rate underfit scenario", () => {
    const low = { ...c, learningRate: "low" as const };
    expect(curvePoint(low, prepareData(low), 3).training).toBeGreaterThan(
      curvePoint(c, prepareData(c), 3).training,
    );
  });
});
describe("evaluation contract is independent of training completion", () => {
  it("retains an identical baseline before and after", () => {
    const run = createRun(c);
    expect(run.evaluation.baseline.domain).toBe(48);
    expect(run.evaluation.adapted.domain).toBeGreaterThan(48);
    expect(run.evaluation.pass).toBe(true);
  });
  it("fails leakage even with inflated scores", () => {
    const config = { ...c, leakage: true },
      e = evaluate(config, prepareData(config));
    expect(e.adapted.heldOut).toBeGreaterThan(e.honestHeldOut);
    expect(e.pass).toBe(false);
    expect(e.reasons).toContain("leakage");
  });
  it("fails each required dimension independently", () => {
    const e = evaluate(c, prepareData(c));
    for (const [key, value] of [
      ["domain", 48],
      ["format", 70],
      ["heldOut", 50],
      ["retention", 70],
    ] as const)
      expect(
        checkContract(e.baseline, { ...e.adapted, [key]: value }, false).pass,
      ).toBe(false);
  });
  it("does not reward noisy volume automatically", () => {
    const n = { ...c, dataset: "noisy" as const, duplicates: 35 };
    expect(evaluate(n, prepareData(n)).adapted.domain).toBeLessThan(
      evaluate(c, prepareData(c)).adapted.domain,
    );
  });
  it("rejects completed overfit run and exposes retention regression", () => {
    const run = createRun({ ...c, epochs: 10 });
    expect(replay(run, run.events.length - 1).complete).toBe(true);
    expect(run.evaluation.pass).toBe(false);
    expect(run.evaluation.reasons).toContain("retention");
  });
});

describe("final integrity review", () => {
  it("has distinct evaluation prompt contexts, not only distinct row IDs", () => {
    const d = prepareData(c),
      prompts = new Set(d.train.map((s) => s.input.en));
    expect(
      d.test.concat(d.validation).some((s) => prompts.has(s.input.en)),
    ).toBe(false);
  });
  it("fails closed for nonfinite or out-of-range evaluation values", () => {
    const e = evaluate(c, prepareData(c));
    for (const score of [NaN, Infinity, -1, 101])
      expect(
        checkContract(e.baseline, { ...e.adapted, domain: score }, false).pass,
      ).toBe(false);
  });
  it("keeps baseline invariant across data, method and seed", () => {
    const a = createRun(c),
      b = createRun({ ...c, method: "full", dataset: "mixed", seed: 19 });
    expect(a.evaluation.baseline).toEqual(b.evaluation.baseline);
    expect(a.evaluation.adapted).not.toEqual(b.evaluation.adapted);
  });
});
