# CORE verification — 2026-09-09

## Automated checks

`npm run validate` passed: TypeScript strict checking, **36 unit tests across two files**, and Vite production build. `npm run format:check` passed. Static artifact is `dist/`; entry JS is approximately 283 kB (92 kB gzip), CSS 37 kB (8 kB gzip), with self-hosted Latin/Latin-ext fonts.

The tests independently verify rectangular LoRA arithmetic, target aggregation, frozen/trainable scope, trainable percentage, weight/adapter/gradient/Adam/master-copy memory, QLoRA metadata, checkpointing, sequence and micro-batch scaling, accumulation, partial batches, token exposure, disjoint split IDs/groups/prompt contexts, cleaning, deliberate leakage, deterministic curves, rank-invariant quality, overfitting, weak low-rate convergence, baseline invariance, each contract clause and rejection of nonfinite/out-of-range scores.

## Browser QA

Used the **Codex in-app browser through CUA**, including its supported Playwright locator/read-only DOM APIs. No standalone Chromium fallback was required. Both the Vite dev server on 5301 and the final production artifact on 4301 were opened. Console checks returned no warnings or errors.

Verified these paths:

| Flow                        | Observed result                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7B Full FT → LoRA → QLoRA   | Approximately 125.5 → 16.1 → 5.9 GiB; full base updates versus frozen base plus trainable adapters.                                                              |
| Rank keyboard interaction   | End selects r=128; trainable counts update, with correct `aria-valuetext`.                                                                                       |
| Target preset               | Q+V → attention+MLP increases the aggregated adapter count.                                                                                                      |
| 14B / 24 GiB                | LoRA exceeds the estimate; QLoRA fits.                                                                                                                           |
| Sequence 2K → 8K            | QLoRA 14B activation estimate rises to 7.5 GiB under checkpointing.                                                                                              |
| Checkpointing off           | Default 7B activation estimate rises from 1.2 to 4.0 GiB.                                                                                                        |
| Data filters                | Deduplication and quality/contradiction filters remove defined train categories; displayed noise, contradiction, irrelevance and missing targets reach zero.     |
| Sample filter               | A removed category shows a real empty state, not an unrelated sample.                                                                                            |
| Play / Pause / Step / Reset | Recorded mobile cursor t2 → paused t2 → step t3 → reset t0.                                                                                                      |
| Clean 3-epoch evaluation    | Baseline domain 48; synthetic adapted domain about 73.8; educational contract passes.                                                                            |
| 10-epoch scenario           | Training curve falls; validation rises; OVERFITTING appears; contract returns NOT READY.                                                                         |
| Deliberate test leakage     | 100 shared test IDs; inflated held-out score 86.7 versus honest synthetic counterfactual 74.7; integrity gate fails.                                             |
| Save / compare / reload     | Two independent 3-epoch and 10-epoch snapshots persist after reload with IDs ADP-RUN-001 and ADP-RUN-002.                                                        |
| Reproducible export         | Visible export JSON parses, preserving IDs, seed 42, version, assumptions, curves, events and baseline/evaluation. Production build also exports a complete run. |
| Adaptation 101              | All ten chapters reached in order; final chapter explains evidence and the gate.                                                                                 |
| CSS 3D                      | Rotate changes stack orientation; frozen and trainable regions retain their distinct labels.                                                                     |
| EN / TR                     | Language updates document lang, controls and content while preserving saved experiments.                                                                         |
| Mobile                      | All seven modes checked at 390×844; document width 375 px (remaining 15 px is the browser scrollbar), no horizontal page overflow. Tables scroll internally.     |
| Integrations                | Locale-aware USL/DCL/TFL/GEX/EVL links and new-tab attributes inspected. Live host caveat for DCL is documented separately.                                      |
| Final artifact              | Full clean train → evaluate → save → export flow passed on port 4301; no console warnings/errors.                                                                |

The in-app browser did not report a download event for the Blob export. The application now also reveals the complete read-only JSON immediately, so the export remains accessible for selection/copy even in an embedded browser without download support. JSON content and reproducibility fields were verified directly from this visible export. A desktop browser's actual file download was not claimed verified.

Full-page screenshot stitching in IAB repeated some regions, so visual inspection used individual viewport captures instead. This was a capture limitation, not duplicated DOM content. The browser viewport override was reset after QA.

## Visual comparison

Reference: [generated concept](design/concept.png), 1536×1024, created with the built-in Image Gen tool. No raster UI is shipped. Final [desktop viewport](qa/desktop.png) was captured from a 1536×1024 browser viewport; [Turkish mobile viewport](qa/mobile-tr.png) from 390×844. All were opened with `view_image` for visual comparison. The final reference/render comparison retains the intended visual system, with deliberate correctness and functional deviations listed below.

| Comparison point       | Reference → implementation / resolution                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and copy      | ADP title, exact English tagline, supporting sentence and seven mode labels retained. Turkish equivalents implemented.                                                                                                |
| Layout                 | Three-column configure / structural world / memory workbench, then metrics, toolbar and comparison. Added a compact scenario/guide row for the required five scenarios and ten chapters.                              |
| Typography             | Geist UI/content and IBM Plex Mono quantities; deliberate control and caption sizes. Desktop and mobile line wrapping inspected.                                                                                      |
| Palette                | Pale neutral background, white panels, dark ink, teal trainable adapters and gray locked base. Memory colors remain consistent across views.                                                                          |
| Structural visual      | Replaced raster conceptual slabs with actual bounded CSS 3D, keyboard-accessible block buttons, rotation and method-dependent state. Mobile stack reduced to prevent overlap.                                         |
| Quantitative fidelity  | Replaced all generated sample memory numbers with tested engine values. Added quantization metadata and FP32 master copy; no fabricated reference numbers or “similar quality” assertion retained.                    |
| Formula                | Correct W + B×A formula and matrix dimensions. Scaling held at 1 and disclosed. Added the compact formula to the main world after inspection.                                                                         |
| Spacing / hierarchy    | Reduced initial header and control spacing, retained panel rhythm, kept precise metrics separate from the model abstraction. Additional honest memory notes place the comparison lower than in the generated concept. |
| Responsive             | Mobile config-first flow, internal table scrolling, reachable controls, readable legends and textual alternatives.                                                                                                    |
| Motion / accessibility | Frozen vs trainable differs by labels and icons, not color alone. Reduced-motion CSS disables transitions; playback has a non-animated completion path. No OS motion setting was changed during QA.                   |

Above-the-fold copy review: exact tagline/subtitle and primary tab vocabulary match. Intentional additions: scenario selection, Adaptation 101, explicit evidence badges, master-copy/quantization accounting, Complete training shortcut, memory caveat and abstraction notice. Some explanatory sentences are more precise than the image reference. Scientific correctness and required interaction take precedence over copying generated placeholder numbers. No unexplained UI feature, decorative raster asset, clipped primary control or page overflow remains.

Image-generation brief: a 1536×1024 white/pale-neutral educational workbench with ADP identity, seven tabs, configuration rail, frozen-base/adapters structural model, calculated metrics, transparent memory plan and training toolbar. The full prompt is present in the task conversation. The saved concept is a design reference only.

## One combined senior review

Reviewed from adaptation, PEFT, systems, evaluation, education and interaction perspectives in one pass. High-impact fixes:

1. Preserved B×A orientation and frozen quantized base semantics; no QLoRA base gradients or optimizer state.
2. Explicitly accounted for FP32 master copies and quantization metadata, avoided double-counting full weights, and exposed estimated activation/workspace factors.
3. Kept baseline/evaluation separate from playback; a configuration change invalidates the current run. Training pauses at the checkpoint before evaluation.
4. Added case context to sample prompts so train/test integrity is not merely different row IDs; deliberate leakage is the only shared test-identity path.
5. Made the release contract reject nonfinite and out-of-range scores.
6. Kept synthetic quality invariant to rank rather than manufacturing a quality curve.
7. Cleared obsolete status notices when starting a new run and added an accessible JSON export fallback.
8. Reduced mobile structural geometry to preserve label legibility.

## Boundaries remaining

- No Azure/DNS/GitHub publication was part of this local build; `adp.aserdargun.com` is the intended domain.
- DCL's intended host did not resolve locally; other listed ecosystem links returned HTTP 200.
- No real training, tokenizer, model artifact, benchmark, actual GPU memory or throughput measurement exists.
- Generic architecture and memory-efficient attention assumptions are intentionally limited and are documented in the model specification.
- QA used IAB desktop/mobile viewports; it is not a claim of exhaustive testing on physical mobile devices or every browser engine.
