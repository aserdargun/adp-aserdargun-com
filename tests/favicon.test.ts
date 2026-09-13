import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const PUBLIC = resolve(ROOT, "public");

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
function pngSig(buf: Buffer): boolean {
  for (let i = 0; i < PNG_SIG.length; i++)
    if (buf[i] !== PNG_SIG[i]) return false;
  return true;
}
function pngDims(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function validateSvg(s: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!/viewBox="0 0 320 320"/.test(s)) reasons.push("viewBox");
  if (
    !/<rect[^>]*width="320"[^>]*height="320"[^>]*rx="64"[^>]*fill="#121310"/.test(
      s,
    )
  )
    reasons.push("bg-rect");
  if (
    !/<circle[^>]*cx="160"[^>]*cy="142"[^>]*r="108"[^>]*fill="#c8ff36"/.test(s)
  )
    reasons.push("green-circle");
  if (!/fill="#0c0d0a"/.test(s)) reasons.push("glyph-fill");
  if (!/font-family="[^"]*sans-serif/.test(s)) reasons.push("sans-serif-font");
  if (!/>ADP<\/text>/.test(s)) reasons.push("ADP-code");
  return { ok: reasons.length === 0, reasons };
}

describe("ADP green-family favicon set", () => {
  let svg = "";
  let html = "";
  let png32: Buffer;
  let apple180: Buffer;

  beforeAll(() => {
    svg = readFileSync(resolve(PUBLIC, "favicon.svg"), "utf8");
    html = readFileSync(resolve(ROOT, "index.html"), "utf8");
    png32 = readFileSync(resolve(PUBLIC, "favicon-32.png"));
    apple180 = readFileSync(resolve(PUBLIC, "apple-touch-icon.png"));
  });

  it("SVG family viewBox, colors, font, and ADP code", () => {
    const r = validateSvg(svg);
    expect(r.ok, r.reasons.join(",")).toBe(true);
  });

  it("central glyph transform translate(96 78) scale(0.8) keeps all four matrix corners inside circle r=108", () => {
    expect(svg).toMatch(/transform="translate\(96 78\) scale\(0\.8\)"/);
    const tx = 96;
    const ty = 78;
    const sc = 0.8;
    const cx = 160;
    const cy = 142;
    const r = 108;
    const innerCorners: Array<[number, number]> = [
      [0, 0],
      [160, 0],
      [0, 160],
      [160, 160],
    ];
    for (const [x, y] of innerCorners) {
      const ax = tx + x * sc;
      const ay = ty + y * sc;
      expect(Math.hypot(ax - cx, ay - cy)).toBeLessThan(r);
    }
  });

  it("HTML links 3 favicon assets with family-green cache version", () => {
    expect(html).toMatch(
      /<link[^>]*rel="icon"[^>]*sizes="32x32"[^>]*type="image\/png"[^>]*href="\/favicon-32\.png\?v=family-green-1"[^>]*\/>/,
    );
    expect(html).toMatch(
      /<link[^>]*rel="icon"[^>]*type="image\/svg\+xml"[^>]*href="\/favicon\.svg\?v=family-green-1"[^>]*\/>/,
    );
    expect(html).toMatch(
      /<link[^>]*rel="apple-touch-icon"[^>]*sizes="180x180"[^>]*href="\/apple-touch-icon\.png\?v=family-green-1"[^>]*\/>/,
    );
  });

  it("PNG raster signatures and dimensions (32 and 180)", () => {
    expect(pngSig(png32)).toBe(true);
    expect(pngDims(png32)).toEqual({ w: 32, h: 32 });
    expect(pngSig(apple180)).toBe(true);
    expect(pngDims(apple180)).toEqual({ w: 180, h: 180 });
  });

  describe("SVG validator rejects bad fixtures", () => {
    const old64 =
      '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#18252b"/></svg>';
    const wrongLabel =
      '<svg viewBox="0 0 320 320"><rect width="320" height="320" rx="64" fill="#121310"/><circle cx="160" cy="142" r="108" fill="#c8ff36"/><text font-family="sans-serif">AIA</text></svg>';
    const blueSvg =
      '<svg viewBox="0 0 320 320"><rect width="320" height="320" rx="64" fill="#087f6b"/></svg>';

    it("rejects old 64x64 blue fixture", () => {
      expect(validateSvg(old64).ok).toBe(false);
    });
    it("rejects wrong-code fixture (e.g. AIA)", () => {
      expect(validateSvg(wrongLabel).ok).toBe(false);
    });
    it("rejects blue fill fixture", () => {
      expect(validateSvg(blueSvg).ok).toBe(false);
    });
  });
});
