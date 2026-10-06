import { expect, it } from "vitest";
import { datasets, domains, qualityFlags } from "../src/core/datasets";
import { models } from "../src/core/models";
import { lessons } from "../src/lessons/lessons";
import { manifest } from "../src/ils/catalog";
import concepts from "../src/ils/concepts.json";
import experiments from "../src/ils/experiments.json";

// AGENTS.md requires Turkish and English controls, lesson text and explanations
// to stay equivalent. `Text` is `{ en: string; tr: string }`, so TypeScript
// proves the key exists but never that it was written: a missing translation,
// an untranslated copy of the English, or a stub ships to the Turkish page with
// no failing type, test or render assertion.
//
// `src/ils/learning-graph.json` is deliberately excluded. It is a generated
// fleet snapshot (ils-aserdargun/tools/integration-graph.mjs) owned by the
// shared integration graph, not authored here, and ADP reads only routes and
// placements from it via buildLearningLink. Editing it here would be overwritten
// by the next `--sync` and would forge translations for concepts ADP does not
// own.

type Pair = { path: string; en: string; tr: string };

// One place for the single record that is deliberately blank. The
// `missing-target` quality flag teaches what an unanswerable training pair
// looks like, so its empty target is the lesson, not a gap in translation.
const intentionalBlank = "missing-target";

function collect(value: unknown, path = "$", found: Pair[] = []): Pair[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, `${path}[${index}]`, found));
    return found;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.en === "string") {
      found.push({
        path,
        en: record.en,
        tr: typeof record.tr === "string" ? record.tr : "",
      });
    }
    for (const [key, child] of Object.entries(record)) {
      collect(child, `${path}.${key}`, found);
    }
  }
  return found;
}

// Acronyms and proper nouns are correctly identical across locales: a fleet
// application code is spelled the same in Turkish prose, exactly as the shell
// already writes it, e.g. "Yöntemi öğren → USL". Anything added here must be a
// term with no Turkish spelling, not a lazy translation, and the assertions
// below keep the list honest. SIMT is deliberately absent: it appears only in
// the generated fleet snapshot this guard excludes, so exempting it here would
// be a stale entry for content ADP does not author.
const untranslatedByDesign = new Set(["USL", "EVL", "DCL", "TFL", "GEX"]);

const authored: Pair[] = [
  ...collect({ models, datasets, domains, qualityFlags, lessons }),
  ...collect(manifest, "$.manifest"),
  ...collect(concepts, "$.concepts"),
  ...collect(experiments, "$.experiments"),
];

it("collects the authored bilingual surface and every locale pair", () => {
  // Guard against a walker that silently stops reaching content: without these
  // anchors a broken walker would pass by finding nothing at all.
  expect(authored.length).toBeGreaterThan(100);
  expect(authored.some(({ path }) => path.includes("lessons"))).toBe(true);
  expect(authored.some(({ path }) => path.includes("$.manifest"))).toBe(true);
  expect(
    authored.every(({ en, tr }) => typeof en === "string" && tr !== undefined),
  ).toBe(true);
});

it("carries authored Turkish for every English string on the surface", () => {
  const missing = authored.filter(
    ({ en, tr, path }) =>
      !tr.trim() && !(en === "" && path.includes(intentionalBlank)),
  );
  expect(missing.map(({ path }) => path)).toEqual([]);
});

it("does not ship the English string as its own Turkish translation", () => {
  const untranslated = authored.filter(
    ({ en, tr }) =>
      en.trim().length > 0 &&
      en.trim() === tr.trim() &&
      !untranslatedByDesign.has(en.trim()),
  );
  expect(untranslated.map(({ path, en }) => `${path}: ${en}`)).toEqual([]);
});

it("keeps Turkish prose comparable to its English source", () => {
  // Turkish is not a transliteration of English: it is usually a little longer.
  // A Turkish string that is dramatically shorter than the English it replaces
  // is a stub or a truncated sentence, not a translation. Only long prose is
  // measured; labels, codes and units are exempt by length.
  const truncated = authored.filter(
    ({ en, tr, path }) =>
      !path.includes(intentionalBlank) &&
      en.length >= 80 &&
      tr.trim().length > 0 &&
      tr.trim().length < en.trim().length * 0.6,
  );
  expect(
    truncated.map(({ path, en, tr }) => `${path}: ${en} -> ${tr}`),
  ).toEqual([]);
});

it("allows only codes and acronyms to stay identical across locales", () => {
  // An allowlist that grows by habit stops being a guard. Every entry must
  // still be a term that cannot be spelled in Turkish, and every entry must
  // still be reachable in the authored surface, so a renamed or deleted term
  // cannot leave a stale exemption behind.
  for (const term of untranslatedByDesign) {
    expect(term.trim()).toBe(term);
    expect(term.length).toBeLessThanOrEqual(12);
    expect(
      authored.some(({ en, tr }) => en.trim() === term && tr.trim() === term),
    ).toBe(true);
  }
  const exempt = authored.filter(
    ({ en, tr }) => en.trim() === tr.trim() && en.trim().length > 0,
  );
  expect(
    exempt
      .map(({ en }) => en.trim())
      .filter((en) => !untranslatedByDesign.has(en)),
  ).toEqual([]);
});

it("resolves every locale pair through the same shell helper", () => {
  // The shell picks with `locale === "tr" ? tr : en`, so a pair whose Turkish
  // is missing renders as undefined rather than falling back to English.
  const unusable = authored.filter(
    ({ tr, path }) => !path.includes(intentionalBlank) && tr === undefined,
  );
  expect(unusable.map(({ path }) => path)).toEqual([]);
});
