import { copyFileSync } from 'node:fs';
copyFileSync(new URL('../docs/educational-model.md',import.meta.url),new URL('../public/educational-model.md',import.meta.url));
