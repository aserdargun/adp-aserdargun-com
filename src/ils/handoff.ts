import {
  buildLearningLink,
  type Locale,
  type SemanticContext,
} from "@aserdargun/lab-core";
import type { AdaptationConfig } from "../core/types";
import { memory } from "../core/memory";
import { learningGraph } from "./graph";
export function deploymentContext(
  config: AdaptationConfig,
  experimentId: string,
): SemanticContext<"model-workload"> | null {
  if (config.model !== "7b" && config.model !== "14b") return null;
  return {
    version: "0.1",
    id: "adp-deployment",
    sourceLab: "adp",
    sourceExperiment: experimentId,
    sourceConcept: "concept:training-memory",
    targetLab: "dcl",
    targetConcept: "concept:capacity-planning",
    intent: "continue-workload",
    profile: "model-workload",
    payload: {
      modelClass: "dense-decoder",
      parameterClass: config.model,
      precision: config.method === "qlora" ? "q4" : config.precision,
      adaptation: config.method === "full" ? "full-finetune" : config.method,
      sequenceLength: config.sequence,
      estimatedMemoryGiB: Math.round(memory(config).giB * 100) / 100,
      workloadType: "training",
    },
    returnTo: {
      appId: "adp",
      experimentId,
      conceptId: "concept:training-memory",
    },
  };
}
export function deploymentLink(
  config: AdaptationConfig,
  experimentId: string,
  locale: Locale,
) {
  const context = deploymentContext(config, experimentId);
  return buildLearningLink(learningGraph, {
    targetApp: "dcl",
    experimentId: "personal",
    concept: "concept:capacity-planning",
    locale,
    ...(context ? { context } : {}),
  });
}
