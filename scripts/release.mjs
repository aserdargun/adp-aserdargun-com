import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
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
// Verify the complete deliverable, including fonts, HTML, policy and model docs.
const files = Object.fromEntries(
  readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== "release.json")
    .map((entry) => join(entry.parentPath, entry.name).slice(dist.length + 1))
    .sort()
    .map((path) => [
      path,
      createHash("sha256")
        .update(readFileSync(join(dist, path)))
        .digest("hex"),
    ]),
);
if (process.argv.includes("--verify")) {
  const release = JSON.parse(readFileSync(join(dist, "release.json"), "utf8"));
  if (
    release.commit !== sha ||
    JSON.stringify(release.assets) !== JSON.stringify(assets) ||
    JSON.stringify(release.files) !== JSON.stringify(files)
  )
    throw new Error("Release identity or asset digest mismatch");
  console.log(
    `Verified ADP release ${sha} and ${Object.keys(files).length} artifact files`,
  );
} else {
  writeFileSync(
    join(dist, "release.json"),
    JSON.stringify(
      {
        application: "adp-aserdargun-com",
        commit: sha,
        builtAt: new Date().toISOString(),
        assets,
        files,
        workingTreeDirty: (() => {
          try {
            return Boolean(
              execFileSync("git", ["status", "--porcelain"], {
                cwd: root,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
              }).trim(),
            );
          } catch {
            return null;
          }
        })(),
      },
      null,
      2,
    ) + "\n",
  );
}
