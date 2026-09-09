import type { AdaptationConfig, ModelProfile, Target } from "./types";
import { getModel, validateConfig } from "./models";
export function linearLoRA(input: number, output: number, rank: number) {
  if (
    ![input, output, rank].every((n) => Number.isInteger(n) && n > 0) ||
    rank > Math.min(input, output)
  )
    throw new Error("Invalid matrix dimensions");
  return rank * (input + output);
}
export function dimensions(m: ModelProfile, target: Target): [number, number] {
  return target === "up"
    ? [m.hiddenSize, m.mlpProjectionInfo.intermediate]
    : target === "down"
      ? [m.mlpProjectionInfo.intermediate, m.hiddenSize]
      : [m.attentionProjectionInfo.input, m.attentionProjectionInfo.output];
}
export function parameters(c: AdaptationConfig) {
  validateConfig(c);
  const m = getModel(c.model);
  const modules = c.targets.map((target) => {
    const [input, output] = dimensions(m, target);
    return {
      target,
      input,
      output,
      perLayer: linearLoRA(input, output, c.rank),
      total: linearLoRA(input, output, c.rank) * m.layerCount,
    };
  });
  const adapter =
    c.method === "full" ? 0 : modules.reduce((n, row) => n + row.total, 0);
  const trainable = c.method === "full" ? m.parameterCount : adapter;
  const total = m.parameterCount + adapter;
  return {
    base: m.parameterCount,
    total,
    adapter,
    trainable,
    frozen: c.method === "full" ? 0 : m.parameterCount,
    percent: (trainable / total) * 100,
    modules,
  };
}
