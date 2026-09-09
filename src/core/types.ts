export type Method = "full" | "lora" | "qlora";
export type Target = "q" | "k" | "v" | "o" | "up" | "down";
export type Precision = "bf16" | "fp16" | "fp32";
export type DatasetId = "clean" | "noisy" | "narrow" | "mixed";
export type QualityFlag =
  | "good"
  | "duplicate"
  | "noisy"
  | "contradictory"
  | "out-of-domain"
  | "missing-target";
export type Split = "train" | "validation" | "test";
export type Locale = "en" | "tr";
export type Text = { en: string; tr: string };
export interface ModelProfile {
  id: string;
  name: string;
  parameterCount: number;
  architectureFamily: string;
  hiddenSize: number;
  layerCount: number;
  attentionProjectionInfo: { input: number; output: number };
  mlpProjectionInfo: { intermediate: number };
  defaultPrecision: Precision;
  source: string;
  verifiedAt: string | null;
  assumptions: string[];
}
export interface AdaptationConfig {
  model: string;
  method: Method;
  rank: number;
  targets: Target[];
  precision: Precision;
  sequence: number;
  microBatch: number;
  accumulation: number;
  checkpointing: boolean;
  deviceGiB: number;
  dataset: DatasetId;
  duplicates: number;
  deduplicate: boolean;
  qualityFilter: boolean;
  contradictionFilter: boolean;
  leakage: boolean;
  epochs: number;
  learningRate: "low" | "reasonable" | "high";
  seed: number;
}
export interface DatasetProfile {
  id: DatasetId;
  name: Text;
  examples: number;
  averageTokens: number;
  duplication: number;
  noise: number;
  contradiction: number;
  irrelevant: number;
  missing: number;
  coverage: number[];
  difficulty: number;
  description: Text;
}
export interface Sample {
  id: string;
  input: Text;
  output: Text;
  split: Split;
  flag: QualityFlag;
  tokens: number;
  duplicateGroup: string;
  source: Text;
  domain: number;
}
export interface PreparedDataset {
  rows: Sample[];
  train: Sample[];
  validation: Sample[];
  test: Sample[];
  rawCount: number;
  removed: number;
  duplicates: number;
  unique: number;
  coverage: number[];
  noise: number;
  contradiction: number;
  irrelevant: number;
  missing: number;
  diversity: number;
  difficulty: number;
  averageTokens: number;
  leakageCount: number;
}
export interface Scores {
  task: number;
  domain: number;
  instruction: number;
  format: number;
  heldOut: number;
  retention: number;
}
export interface CurvePoint {
  epoch: number;
  training: number;
  validation: number;
}
export interface Evaluation {
  baseline: Scores;
  adapted: Scores;
  honestHeldOut: number;
  leakage: boolean;
  reasons: string[];
  pass: boolean;
}
export type EventType =
  | "RUN_STARTED"
  | "DATA_LOADED"
  | "BATCH_STARTED"
  | "FORWARD_COMPLETED"
  | "LOSS_COMPUTED"
  | "BACKWARD_COMPLETED"
  | "OPTIMIZER_STEP"
  | "EPOCH_COMPLETED"
  | "CHECKPOINT_SAVED"
  | "EVALUATION_STARTED"
  | "EVALUATION_COMPLETED"
  | "RUN_COMPLETED";
export interface SimulationEvent {
  type: EventType;
  tick: number;
  epoch: number;
  microBatches: number;
  optimizerSteps: number;
  examples: number;
}
export interface ExperimentRun {
  id: string;
  version: "adp-core-1";
  config: AdaptationConfig;
  events: SimulationEvent[];
  curve: CurvePoint[];
  evaluation: Evaluation;
  assumptions: string[];
  trainExamples: number;
  tokenExposure: number;
  optimizerSteps: number;
  computeUnits: number;
}
