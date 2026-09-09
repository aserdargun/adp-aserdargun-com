import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");
const sha =
  process.env.GITHUB_SHA ||
  (() => {
    try {
      return execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      return "uncommitted";
    }
  })();
const html = readFileSync(join(dist, "index.html"), "utf8");
const paths = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(
  (m) => m[1],
);
if (
  !paths.some((p) => p.endsWith(".js")) ||
  !paths.some((p) => p.endsWith(".css"))
)
  throw new Error("Missing production entry assets");
const assets = Object.fromEntries(
  paths.map((path) => {
    const bytes = readFileSync(join(dist, path));
    return [path, createHash("sha256").update(bytes).digest("hex")];
  }),
);
for (const file of [
  "staticwebapp.config.json",
  "educational-model.md",
  "favicon.svg",
])
  if (!existsSync(join(dist, file))) throw new Error(`Missing ${file}`);
const config = JSON.parse(
  readFileSync(join(dist, "staticwebapp.config.json"), "utf8"),
);
if (config.navigationFallback?.rewrite !== "/index.html")
  throw new Error("Invalid SPA fallback");
if (!config.globalHeaders?.["Content-Security-Policy"])
  throw new Error("Missing CSP");
if (process.argv.includes("--verify")) {
  const release = JSON.parse(readFileSync(join(dist, "release.json"), "utf8"));
  if (
    release.commit !== sha ||
    JSON.stringify(release.assets) !== JSON.stringify(assets)
  )
    throw new Error("Release identity or asset digest mismatch");
  console.log(`Verified ADP release ${sha} and ${paths.length} entry assets`);
} else {
  writeFileSync(
    join(dist, "release.json"),
    JSON.stringify(
      {
        application: "adp-aserdargun-com",
        commit: sha,
        builtAt: new Date().toISOString(),
        assets,
      },
      null,
      2,
    ) + "\n",
  );
}
