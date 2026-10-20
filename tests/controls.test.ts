import { expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { scoreNames } from "../src/components/EvaluationLab";
import { flags, splitNames } from "../src/components/DataLab";
import { memoryNames } from "../src/components/MemoryPanel";

/* AGENTS.md requires Turkish and English controls, lesson text and
   explanations to stay equivalent. The existing guard in bilingual.test.ts
   walks the lesson, model and dataset data, but the control and explanation
   surface was outside it: the strings a reader actually reads on the screen.

   useT() returns (en, tr) => locale === "tr" ? tr : en, so an empty Turkish
   half renders an empty label on the Turkish page and a Turkish half that
   repeats the English string ships untranslated copy. Neither was checked
   anywhere.

   The control copy is written two ways. Most of it is a literal t("english",
   "turkish") pair inside a component, and there is no runtime object to walk
   there, so the source is read. Four of the labels are held in dictionaries
   and reached through a dynamic index, which the source read cannot follow,
   so those are imported and walked directly. */

const locales = ["en", "tr"] as const;

/** Terms that read the same in both languages, so the Turkish half is the
 * English string. Each one must still be present in the surface, so an
 * exemption cannot outlive the label it was written for. */
const sameInBothLocales = new Set([
  "Rank (r)",
  "LoRA rank",
  "Test",
  "test",
  "epoch",
]);

type Pair = { en: string; tr: string };

const assertBilingual = (value: Pair, label: string) => {
  for (const locale of locales)
    expect(value[locale].trim(), `${label} ${locale}`).not.toBe("");
  // A pair that ships the English string as its own Turkish translation is
  // untranslated copy, whatever its length.
  if (!sameInBothLocales.has(value.en.trim()))
    expect(value.tr.trim(), `${label} shipped as its own translation`).not.toBe(
      value.en.trim(),
    );
};

/** Reads a quoted literal at `index`, returning its value and the position
 * after the closing quote. */
const readLiteral = (source: string, index: number) => {
  const quote = source[index];
  let value = "";
  for (let i = index + 1; i < source.length; i++) {
    if (source[i] === "\\") {
      value += source[i + 1];
      i++;
      continue;
    }
    if (source[i] === quote) return { value, end: i + 1 };
    value += source[i];
  }
  return null;
};

const sourcePairs = (): (Pair & { file: string; line: number })[] => {
  const root = join(import.meta.dirname, "..", "src");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(path)) files.push(path);
    }
  };
  walk(root);

  const pairs: (Pair & { file: string; line: number })[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const relative = file.slice(root.length + 1);
    const lineAt = (index: number) => source.slice(0, index).split("\n").length;

    // t("english", "turkish")
    const call = /\bt\(\s*(["'`])/g;
    let match: RegExpExecArray | null;
    while ((match = call.exec(source))) {
      const first = readLiteral(source, match.index + match[0].length - 1);
      if (!first) continue;
      const after = source.slice(first.end).match(/^\s*,\s*(["'`])/);
      if (!after) continue;
      const second = readLiteral(source, first.end + after[0].length - 1);
      if (!second) continue;
      pairs.push({
        file: relative,
        line: lineAt(match.index),
        en: first.value,
        tr: second.value,
      });
    }
  }
  return pairs;
};

it("keeps every control label bilingual", () => {
  const pairs = sourcePairs();
  // A reader that stopped reaching content would pass by finding nothing.
  expect(pairs.length).toBeGreaterThanOrEqual(240);
  for (const pair of pairs) assertBilingual(pair, `${pair.file}:${pair.line}`);
});

it("keeps every dictionary label bilingual", () => {
  // These four are reached through a dynamic index, so the source read above
  // cannot follow them and they have to be walked directly.
  const check = (
    name: string,
    entries: readonly (readonly [string, string])[],
  ) => {
    expect(entries.length, `${name} is empty`).toBeGreaterThan(0);
    const labels: string[] = [];
    for (const [en, tr] of entries) {
      assertBilingual({ en, tr }, `${name}.${en}`);
      labels.push(en.trim());
    }
    return labels;
  };
  const found = [
    ...check("scoreNames", Object.values(scoreNames)),
    ...check("flags", Object.values(flags)),
    ...check("splitNames", Object.values(splitNames)),
    ...check("memoryNames", Object.values(memoryNames)),
  ];
  // Floors measured from the current dictionaries, so a label cannot be
  // dropped out of one of them without the count changing.
  expect(found.length).toBeGreaterThanOrEqual(23);
});

it("keeps every exemption attached to a label that still exists", () => {
  const present = new Set([
    ...sourcePairs().map((pair) => pair.en.trim()),
    ...Object.values(scoreNames).map(([en]) => en.trim()),
    ...Object.values(flags).map(([en]) => en.trim()),
    ...Object.values(splitNames).map(([en]) => en.trim()),
    ...Object.values(memoryNames).map(([en]) => en.trim()),
  ]);
  for (const term of sameInBothLocales)
    expect(present.has(term), `${term} is exempted but no longer present`).toBe(
      true,
    );
});
