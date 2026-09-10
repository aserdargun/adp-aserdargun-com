import {
  parseManifest,
  type ExperimentDefinition,
  type LessonDefinition,
} from "@aserdargun/lab-core";
import raw from "../../lab.manifest.json";
import rawExperiments from "./experiments.json";
import { lessons, scenarios } from "../lessons/lessons";
import { defaultConfig } from "../core/models";
export const manifest = parseManifest(raw);
export const experiments = rawExperiments as ExperimentDefinition<{
  scenarioId: string;
}>[];
export const guidedLesson: LessonDefinition = {
  schemaVersion: "0.1",
  id: "adaptation-101",
  title: manifest.lessons![0].title,
  concepts: manifest.concepts,
  steps: lessons.map((c, i) => ({
    id: `chapter-${i + 1}`,
    title: c.title,
    explanation: c.body,
    mode: c.tab,
    completion: { kind: "manual" },
  })),
};
export function initialRoute(search: string) {
  const p = new URLSearchParams(search),
    lesson = p.get("lesson") === guidedLesson.id,
    scenario = lesson
      ? "domain"
      : (experiments.find((e) => e.id === p.get("scenario"))?.id ?? "domain"),
    preset = scenarios.find((s) => s.id === scenario);
  return {
    scenario,
    lesson,
    config: { ...structuredClone(defaultConfig), ...preset?.patch },
    tab: preset?.tab ?? ("adapt" as const),
  };
}
