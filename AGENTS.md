# ADP working contract

- Build the bilingual model-adaptation laboratory for Full FT, LoRA, and QLoRA: a browser-only educational surface that makes the trade-offs inspectable. It is the conceptual companion to USL and does not train, load, or serve a real model.
- Keep adaptation truth in `src/core` and `src/simulation`; `src/ils`, `src/lessons`, `src/visualization` and `src/integrations` present it. The cost and memory model behind every comparison is explicit data.
- Every reported figure derives from the declared model in the run. Do not present a simulated training curve as an observed one, and do not compare methods without naming the budget each was given.
- Keep Turkish and English controls, lesson text and explanations equivalent. Label the educational model; do not invent hardware, dataset, or accuracy claims the app does not model.
- Verify `npm run validate` and review `git diff --check` before handoff.
- Local work only unless the user authorizes external publication. Preserve unrelated work and processes.
