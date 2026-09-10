import type {
  AdaptationConfig,
  CurvePoint,
  Evaluation,
  PreparedDataset,
  Scores,
} from "./types";
export const scoreKeys = [
  "task",
  "domain",
  "instruction",
  "format",
  "heldOut",
  "retention",
] as const satisfies readonly (keyof Scores)[];
export const baselineScores: Readonly<Scores> = Object.freeze({
  task: 54,
  domain: 48,
  instruction: 70,
  format: 72,
  heldOut: 55,
  retention: 82,
});
const clamp = (x: number) => Math.max(0, Math.min(100, x));
export function seededNoise(seed: number, index: number) {
  let a = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x21f0aaad);
  a = Math.imul(a ^ (a >>> 15), 0x735a2d97);
  return ((a ^ (a >>> 15)) >>> 0) / 4294967296 - 0.5;
}
export function curvePoint(
  c: AdaptationConfig,
  d: PreparedDataset,
  epoch: number,
): CurvePoint {
  const rate =
    c.learningRate === "low" ? 0.12 : c.learningRate === "high" ? 1.8 : 0.8;
  const noise =
    seededNoise(c.seed, Math.round(epoch * 100)) * 0.035 * Math.min(epoch, 1);
  const training =
    0.18 +
    2.2 * Math.exp(-epoch * rate) +
    d.noise * 0.6 +
    noise +
    (c.learningRate === "high" ? Math.abs(Math.sin(epoch * 7)) * 0.65 : 0);
  const overfit = Math.max(0, epoch - (3 - d.contradiction * 3));
  const validation =
    0.42 +
    2 * Math.exp(-epoch * rate * 0.8) +
    d.noise +
    d.contradiction * 1.6 +
    overfit ** 1.5 * (0.085 + (1 - d.diversity) * 0.06) +
    (c.learningRate === "high" ? Math.abs(Math.sin(epoch * 6)) * 0.9 : 0) +
    noise;
  return { epoch, training, validation };
}
export const evaluationAssumptions = [
  "Synthetic teaching model, not a benchmark, learned predictor, or hardware measurement.",
  "Baseline is fixed by the fictional task rubric; adaptation gains depend on exposure, relevance, coverage, noise, contradiction and difficulty.",
  "Rank intentionally does not predict quality. More capacity is not evidence of improvement. Model class affects workload, not synthetic capability.",
  "Higher epochs can add an explicit overfit penalty; narrow coverage and full FT can increase the scenario retention penalty. These are authored possibilities, not universal laws.",
  "Test leakage inflates the displayed held-out result by 12 points (capped at 100) and unconditionally fails the integrity gate.",
];
export const contract = {
  minimumDomainGain: 8,
  minimumFormat: 80,
  minimumHeldOut: 65,
  maximumRetentionDrop: 5,
};
export function checkContract(
  baseline: Scores,
  adapted: Scores,
  leakage: boolean,
) {
  const reasons: string[] = [];
  if (
    [baseline, adapted].some((scores) =>
      scoreKeys.some((key) => {
        const value = scores?.[key];
        return (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 100
        );
      }),
    )
  )
    reasons.push("invalidScores");
  if (leakage !== false) reasons.push("leakage");
  if (reasons.includes("invalidScores")) return { pass: false, reasons };
  if (adapted.domain - baseline.domain < contract.minimumDomainGain)
    reasons.push("domain");
  if (adapted.format < contract.minimumFormat) reasons.push("format");
  if (adapted.heldOut < contract.minimumHeldOut) reasons.push("heldOut");
  if (baseline.retention - adapted.retention > contract.maximumRetentionDrop)
    reasons.push("retention");
  return { pass: reasons.length === 0, reasons };
}
export function evaluate(c: AdaptationConfig, d: PreparedDataset): Evaluation {
  const baseline: Scores = { ...baselineScores };
  const coverage = d.coverage.reduce((a, b) => a + b, 0) / 5;
  const exposure =
    1 - Math.exp(-c.epochs * (c.learningRate === "low" ? 0.08 : 0.8));
  const overfit = Math.max(0, c.epochs - (3 - d.contradiction * 3));
  const gain =
    32 *
    exposure *
    (1 - d.noise) *
    (1 - d.contradiction) *
    (1 - d.irrelevant) *
    (0.6 + 0.4 * coverage) *
    (1 - d.difficulty * 0.15);
  const jitter = seededNoise(c.seed, 777) * 1.5;
  const unstable = c.learningRate === "high" ? 16 : 0;
  const retentionPenalty =
    (1 - coverage) * 9 +
    overfit * 1.1 +
    (c.method === "full" ? 3.5 : 1.5) +
    d.contradiction * 10;
  const honestHeldOut = clamp(
    baseline.heldOut +
      gain * 0.8 -
      overfit * 3.1 -
      (1 - coverage) * 15 -
      unstable +
      jitter,
  );
  const adapted: Scores = {
    task: clamp(54 + gain * 0.8 - overfit * 1.5 - unstable + jitter),
    domain: clamp(48 + gain - overfit * 1.7 - unstable + jitter),
    instruction: clamp(70 + gain * 0.35 - d.contradiction * 20 - unstable),
    format: clamp(
      72 +
        18 * exposure -
        d.noise * 28 -
        d.missing * 60 -
        d.contradiction * 15 -
        unstable,
    ),
    heldOut: clamp(honestHeldOut + (c.leakage ? 12 : 0)),
    retention: clamp(82 - retentionPenalty),
  };
  return {
    baseline,
    adapted,
    honestHeldOut,
    leakage: c.leakage,
    ...checkContract(baseline, adapted, c.leakage),
  };
}
