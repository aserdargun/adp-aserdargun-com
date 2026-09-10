import type { AdaptationConfig, ModelProfile, Target } from "./types";
const sizes = [
  [1, 2048, 16, 5632],
  [3, 3072, 28, 8192],
  [7, 4096, 32, 11008],
  [14, 5120, 40, 13824],
  [32, 6656, 60, 17920],
  [70, 8192, 80, 22016],
];
export const models: ModelProfile[] = sizes.map(([b, h, l, m]) => ({
  id: `${b}b`,
  name: `${b}B`,
  parameterCount: b * 1e9,
  hiddenSize: h,
  layerCount: l,
  architectureFamily: "Generic decoder transformer (educational)",
  attentionProjectionInfo: { input: h, output: h },
  mlpProjectionInfo: { intermediate: m },
  defaultPrecision: "bf16",
  source: "ADP educational profile v1",
  verifiedAt: null,
  assumptions: [
    "Rounded base parameter budget; not a named pretrained model.",
    "Uniform square Q/K/V/O; no GQA or separate MLP gate modeled.",
    "Dimensions define adapter estimates, not a reconstruction of the base parameter count.",
  ],
}));
export const getModel = (id: string) => {
  const model = models.find((m) => m.id === id);
  if (!model) throw new Error("Unknown model");
  return model;
};
export const targets: Target[] = ["q", "k", "v", "o", "up", "down"];
export const ranks = [4, 8, 16, 32, 64, 128];
export const defaultConfig: AdaptationConfig = {
  model: "7b",
  method: "lora",
  rank: 16,
  targets: ["q", "v"],
  precision: "bf16",
  sequence: 2048,
  microBatch: 1,
  accumulation: 8,
  checkpointing: true,
  deviceGiB: 24,
  dataset: "clean",
  duplicates: 2,
  deduplicate: false,
  qualityFilter: false,
  contradictionFilter: false,
  leakage: false,
  epochs: 3,
  learningRate: "reasonable",
  seed: 42,
};
export function validateConfig(c: AdaptationConfig) {
  if (!c || typeof c !== "object" || Array.isArray(c))
    throw new Error("Invalid configuration");
  getModel(c.model);
  for (const key of [
    "checkpointing",
    "deduplicate",
    "qualityFilter",
    "contradictionFilter",
    "leakage",
  ] as const)
    if (typeof c[key] !== "boolean")
      throw new Error("Invalid boolean configuration");
  if (
    !["full", "lora", "qlora"].includes(c.method) ||
    !["bf16", "fp16", "fp32"].includes(c.precision) ||
    !["clean", "noisy", "narrow", "mixed"].includes(c.dataset) ||
    !["low", "reasonable", "high"].includes(c.learningRate)
  )
    throw new Error("Invalid selection");
  if (
    !Array.isArray(c.targets) ||
    !ranks.includes(c.rank) ||
    !c.targets.length ||
    new Set(c.targets).size !== c.targets.length ||
    c.targets.some((t) => !targets.includes(t))
  )
    throw new Error("Invalid adapter configuration");
  for (const [value, min, max] of [
    [c.sequence, 128, 8192],
    [c.microBatch, 1, 16],
    [c.accumulation, 1, 64],
    [c.epochs, 1, 10],
    [c.deviceGiB, 1, 1024],
    [c.duplicates, 0, 60],
    [c.seed, 0, 999999],
  ])
    if (!Number.isInteger(value) || value < min || value > max)
      throw new Error("Invalid numeric configuration");
}
