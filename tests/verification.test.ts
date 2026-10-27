import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  linksReviewedAt,
  primarySources,
  sourcesCheckedAt,
  specReviewedAt,
} from "../src/core/verification";

/* ADP publishes three dates: when the literature was checked, when the model
   specification was reviewed against the code, and when the outbound routes
   were re-checked. All three used to be written out by hand - the same date
   appeared in five files, and only one of them could ever be right. A reader
   who trusted the interface was told the sources had been checked on a date
   the repository could no longer justify.

   These tests bind every published copy to `src/core/verification.ts`, so the
   record has exactly one home and a correction cannot be made in one place
   and left stale in another. */

const read = (relative: string) =>
  readFileSync(join(import.meta.dirname, "..", relative), "utf8");

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

describe("ADP's published verification record", () => {
  it("publishes each date as a real day that has already happened", () => {
    for (const value of [sourcesCheckedAt, specReviewedAt, linksReviewedAt]) {
      expect(value, "not an ISO day").toMatch(isoDay);
      const parsed = new Date(`${value}T00:00:00Z`);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      // A day such as 2026-02-31 parses but does not exist.
      expect(parsed.toISOString().slice(0, 10)).toBe(value);
      expect(parsed.getTime(), "a date in the future").toBeLessThanOrEqual(
        Date.now(),
      );
    }
  });

  it("takes the dates the interface shows from the record, not from a literal", () => {
    const source = read("src/App.tsx");
    // A hand-written date in the component is the exact failure this replaces.
    expect(source.match(/\d{4}-\d{2}-\d{2}/g)).toBeNull();
    // ...and the record it is taken from must actually be wired in.
    expect(source).toContain("sourcesCheckedAt");
    expect(source).toContain("specReviewedAt");
  });

  it("keeps the shipped specification in step with the record", () => {
    const en = read("docs/educational-model.md");
    const tr = read("docs/educational-model.tr.md");
    expect(en).toContain(`## Primary sources checked ${sourcesCheckedAt}`);
    expect(tr).toContain(
      `## Birincil kaynaklar — kontrol: ${sourcesCheckedAt}`,
    );
    for (const source of primarySources) {
      expect(en, `missing ${source.id} address`).toContain(source.url);
      expect(tr, `missing ${source.id} address`).toContain(source.url);
      expect(en, `missing ${source.id} claim`).toContain(source.supports.en);
      expect(tr, `missing ${source.id} claim`).toContain(source.supports.tr);
    }
  });

  it("keeps the integration record in step with the record", () => {
    expect(read("docs/integrations.md")).toContain(`on ${linksReviewedAt}`);
  });

  it("names every primary source once, with its own address and both locales", () => {
    expect(primarySources.length).toBeGreaterThanOrEqual(3);
    const ids = primarySources.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    const urls = primarySources.map((source) => source.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const source of primarySources) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.label.en.trim()).not.toBe("");
      expect(source.label.tr.trim()).not.toBe("");
      expect(source.supports.en.trim()).not.toBe("");
      expect(source.supports.tr.trim()).not.toBe("");
    }
  });
});
