import { describe, it, expect } from "vitest";
import { validateSemanticLearningContext } from "@aserdargun/lab-core";
import { learningGraph } from "../src/ils/graph";
import { deploymentContext, deploymentLink } from "../src/ils/handoff";
import { defaultConfig } from "../src/core/models";
import { memory } from "../src/core/memory";
describe("ADP semantic projection", () => {
  it("projects only the educational workload and preserves training memory units", () => {
    const config = {
      ...defaultConfig,
      model: "14b",
      method: "qlora" as const,
      sequence: 8192,
    };
    const c = deploymentContext(config, "custom")!;
    expect(c.payload).toEqual({
      modelClass: "dense-decoder",
      parameterClass: "14b",
      precision: "q4",
      adaptation: "qlora",
      sequenceLength: 8192,
      estimatedMemoryGiB: Math.round(memory(config).giB * 100) / 100,
      workloadType: "training",
    });
    expect(validateSemanticLearningContext(c, learningGraph).ok).toBe(true);
    expect(
      new URL(deploymentLink(config, "custom", "tr")).searchParams.get("lang"),
    ).toBe("tr");
  });
  it("does not silently round unsupported model sizes", () => {
    expect(
      deploymentContext({ ...defaultConfig, model: "70b" }, "memory"),
    ).toBeNull();
    expect(
      new URL(
        deploymentLink({ ...defaultConfig, model: "70b" }, "memory", "en"),
      ).searchParams.has("ils"),
    ).toBe(false);
  });
});
