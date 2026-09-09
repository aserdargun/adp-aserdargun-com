import type {
  AdaptationConfig,
  ExperimentRun,
  SimulationEvent,
  EventType,
} from "../core/types";
import { validateConfig, getModel } from "../core/models";
import { prepareData, workload } from "../core/datasets";
import {
  curvePoint,
  evaluate,
  evaluationAssumptions,
} from "../core/evaluation";
import { memoryAssumptions } from "../core/memory";
/** At most 12 representative update groups per epoch. Counts cover every batch.
 * One event tick is a synthetic teaching unit, never elapsed training time. */
export function createRun(
  config: AdaptationConfig,
  id = "ADP-RUN-001",
): ExperimentRun {
  validateConfig(config);
  const c = structuredClone(config),
    d = prepareData(c),
    w = workload(c, d);
  const events: SimulationEvent[] = [];
  const push = (
    type: EventType,
    epoch: number,
    microBatches = 0,
    optimizerSteps = 0,
    examples = 0,
  ) =>
    events.push({
      type,
      tick: events.length,
      epoch,
      microBatches,
      optimizerSteps,
      examples,
    });
  push("RUN_STARTED", 0);
  push("DATA_LOADED", 0);
  const curve = [curvePoint(c, d, 0)];
  for (let ep = 0; ep < c.epochs; ep++) {
    const groups = Math.min(12, w.updatesPerEpoch);
    let priorUpdates = 0,
      priorMicro = 0,
      priorExamples = 0;
    for (let g = 1; g <= groups; g++) {
      const cumulativeUpdates = Math.ceil((g * w.updatesPerEpoch) / groups);
      const cumulativeMicro = Math.min(
        w.microBatchesPerEpoch,
        cumulativeUpdates * c.accumulation,
      );
      const cumulativeExamples = Math.min(
        d.train.length,
        cumulativeMicro * c.microBatch,
      );
      const micro = cumulativeMicro - priorMicro,
        updates = cumulativeUpdates - priorUpdates,
        examples = cumulativeExamples - priorExamples;
      const epoch = ep + cumulativeExamples / d.train.length;
      push("BATCH_STARTED", epoch, micro, 0, examples);
      push("FORWARD_COMPLETED", epoch);
      push("LOSS_COMPUTED", epoch);
      push("BACKWARD_COMPLETED", epoch);
      push("OPTIMIZER_STEP", epoch, 0, updates);
      curve.push(curvePoint(c, d, epoch));
      priorUpdates = cumulativeUpdates;
      priorMicro = cumulativeMicro;
      priorExamples = cumulativeExamples;
    }
    push("EPOCH_COMPLETED", ep + 1);
  }
  push("CHECKPOINT_SAVED", c.epochs);
  push("EVALUATION_STARTED", c.epochs);
  push("EVALUATION_COMPLETED", c.epochs);
  push("RUN_COMPLETED", c.epochs);
  const modelScale = getModel(c.model).parameterCount / 7e9;
  // Explicitly arbitrary teaching index; includes backward through the frozen base.
  const computeUnits =
    (w.tokenExposure / 1e6) *
    modelScale *
    (c.method === "full" ? 3 : c.method === "qlora" ? 2.3 : 2) *
    (c.checkpointing ? 1.3 : 1);
  return {
    id,
    version: "adp-core-1",
    config: c,
    events,
    curve,
    evaluation: evaluate(c, d),
    assumptions: [
      ...memoryAssumptions,
      ...evaluationAssumptions,
      "Playback groups up to 12 aggregate updates per epoch; exact workload counts are preserved.",
      "Compute index: million training tokens × model/7B × method factor (FT 3, LoRA 2, QLoRA 2.3) × checkpoint factor (1.3 or 1). Authored units, not FLOPs, time or money.",
    ],
    trainExamples: d.train.length,
    tokenExposure: w.tokenExposure,
    optimizerSteps: w.optimizerSteps,
    computeUnits,
  };
}
export function replay(run: ExperimentRun, cursor: number) {
  const end = Math.max(0, Math.min(run.events.length - 1, Math.floor(cursor)));
  const events = run.events.slice(0, end + 1),
    current = events.at(-1)!;
  const updates = events
    .filter((e) => e.type === "OPTIMIZER_STEP")
    .reduce((a, e) => a + e.optimizerSteps, 0);
  const examples = events
    .filter((e) => e.type === "BATCH_STARTED")
    .reduce((a, e) => a + e.examples, 0);
  const lastUpdate = events.findLast((e) => e.type === "OPTIMIZER_STEP");
  return {
    current,
    updates,
    examples,
    curve: run.curve.filter((p) => p.epoch <= (lastUpdate?.epoch ?? 0)),
    evaluated: events.some((e) => e.type === "EVALUATION_COMPLETED"),
    complete: current.type === "RUN_COMPLETED",
    trainingComplete: events.some((e) => e.type === "CHECKPOINT_SAVED"),
  };
}
