import { copyFileSync } from "node:fs";
for (const name of ["educational-model.md", "educational-model.tr.md"]) {
  copyFileSync(
    new URL(`../docs/${name}`, import.meta.url),
    new URL(`../public/${name}`, import.meta.url),
  );
}
