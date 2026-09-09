import { describe, it, expect } from "vitest";
import { defaultConfig as c, models } from "../src/core/models";
import { linearLoRA, parameters } from "../src/core/parameters";
import { memory, GiB } from "../src/core/memory";
describe("parameter scope and transparent linear algebra", () => {
  it("calculates rectangular A and B", () =>
    expect(linearLoRA(4096, 11008, 16)).toBe(241664));
  it("aggregates Q + V across 32 layers", () =>
    expect(parameters(c).adapter).toBe(8388608));
  it("doubles with rank and expands with coverage", () => {
    expect(parameters({ ...c, rank: 32 }).adapter).toBe(
      parameters(c).adapter * 2,
    );
    expect(
      parameters({ ...c, targets: ["q", "k", "v", "o", "up", "down"] }).adapter,
    ).toBe(32243712);
  });
  it("keeps all base parameters frozen for both adapter methods", () => {
    for (const method of ["lora", "qlora"] as const) {
      const p = parameters({ ...c, method });
      expect(p.frozen).toBe(7e9);
      expect(p.total).toBe(p.frozen + p.trainable);
      expect(p.percent).toBeCloseTo((p.adapter / p.total) * 100);
    }
  });
  it("trains base exactly once in full FT", () => {
    const p = parameters({ ...c, method: "full" });
    expect(p.adapter).toBe(0);
    expect(p.trainable).toBe(7e9);
    expect(p.frozen).toBe(0);
    expect(p.percent).toBe(100);
  });
  it("rejects invalid inputs and duplicate modules", () => {
    expect(() => linearLoRA(0, 3, 2)).toThrow();
    expect(() => parameters({ ...c, targets: ["q", "q"] })).toThrow();
    expect(() => parameters({ ...c, sequence: NaN })).toThrow();
  });
});
describe("training memory accounting", () => {
  it("accounts for full trainable base and no double counting", () => {
    const m = memory({ ...c, method: "full" });
    expect(m.parts.weights).toBe(14e9);
    expect(m.parts.gradients).toBe(28e9);
    expect(m.parts.optimizer).toBe(56e9);
    expect(m.parts.master).toBe(28e9);
    expect(m.parts.adapter).toBe(0);
    expect(m.total).toBe(Object.values(m.parts).reduce((a, b) => a + b, 0));
  });
  it("allocates optimizer and gradients only to adapters", () => {
    const m = memory(c),
      p = parameters(c);
    expect(m.parts.optimizer).toBe(p.adapter * 8);
    expect(m.parts.gradients).toBe(p.adapter * 4);
    expect(m.artifactBytes).toBe(p.adapter * 2);
  });
  it("quantizes frozen base with explicit metadata, preserving adapter precision", () => {
    const m = memory({ ...c, method: "qlora" });
    expect(m.parts.weights).toBe(3.5e9);
    expect(m.parts.quantization).toBe((7e9 * 0.127) / 8);
    expect(m.parts.adapter).toBe(memory(c).parts.adapter);
    expect(m.parts.optimizer).toBe(memory(c).parts.optimizer);
  });
  it("avoids redundant FP32 master copy", () =>
    expect(memory({ ...c, precision: "fp32" }).parts.master).toBe(0));
  it("documents sequence, batch and checkpoint activation scaling", () => {
    const a = memory({ ...c, checkpointing: false }).parts.activations;
    expect(memory(c).parts.activations).toBeCloseTo(a * 0.3);
    expect(memory({ ...c, sequence: 8192 }).parts.activations).toBe(
      memory(c).parts.activations * 4,
    );
    expect(memory({ ...c, microBatch: 4 }).parts.activations).toBe(
      memory(c).parts.activations * 4,
    );
  });
  it("accumulation does not multiply activation allocation", () =>
    expect(memory({ ...c, accumulation: 32 }).parts.activations).toBe(
      memory(c).parts.activations,
    ));
  it("derives signature fit outcomes from bytes", () => {
    expect(memory({ ...c, method: "full" }).fits).toBe(false);
    expect(memory(c).fits).toBe(true);
    expect(memory({ ...c, model: "14b" }).fits).toBe(false);
    expect(memory({ ...c, model: "14b", method: "qlora" }).fits).toBe(true);
  });
  it("is finite across educational profiles", () => {
    for (const m of models)
      expect(memory({ ...c, model: m.id }).total / GiB).toBeGreaterThan(0);
  });
});
