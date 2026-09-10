# ADP — Model Adaptation Laboratory

**See how a base model becomes adapted to a task.**

A bilingual EN/TR, browser-only educational laboratory for Full FT, LoRA and QLoRA. The conceptual companion to [USL](https://usl.aserdargun.com): USL teaches the adaptation landscape; ADP makes the trade-offs inspectable.

Public repository: [aserdargun/adp-aserdargun-com](https://github.com/aserdargun/adp-aserdargun-com).

Azure production endpoint: [Model Adaptation Laboratory](https://polite-water-0a760bd03.3.azurestaticapps.net). Pushes to `main` run validation and publish the verified static artifact through GitHub Actions. See [deployment contract](docs/deployment.md).

Custom domain: [adp.aserdargun.com](https://adp.aserdargun.com), bound to the same Azure app. This workflow publishes content; it does not manage DNS.

## Run

Node 22.12+ and npm 10+:

```sh
npm ci --legacy-peer-deps
npm run dev
```

Open http://127.0.0.1:5301. Strict project-specific port; no foreign listener is terminated. Production preview uses http://127.0.0.1:4301 via `npm run preview` after building. If the default npm cache is not writable, pass `--cache /private/tmp/adp-npm-cache`. `--legacy-peer-deps` avoids the observed npm 10 optional peer resolution error.

```sh
npm run lint
npm test
npm run build
npm run format:check
```

`npm run validate` runs type checking, 53 unit tests and the production build. `dist/` contains the static app, bundled fonts, model specification and Azure routing/security headers. No runtime API, credentials, external fonts, GPU or backend is required.

## Experience

- **Adapt:** compare Full FT / LoRA / QLoRA for a 7B model, 5K fictional domain-QA examples and a 24 GiB educational device. CSS 3D parameter blocks distinguish frozen weights and adapter updates; every visual has textual labels.
- **Parameters:** exact `r(d_in+d_out)` calculation, target selection and rank 4–128. Rounded generic 1/3/7/14/32/70B profiles. Rank increases capacity and bytes, never an invented quality guarantee.
- **Memory:** base representation, quantization metadata, adapter weights, FP32 gradients, Adam moments, master copies, activations and workspace. Sequence, batch, precision, accumulation and checkpointing controls expose their assumptions.
- **Data:** clean small, noisy large, narrow and mixed-domain profiles; independent quality dimensions; training-only filters, representative sample inspector, split integrity and deliberate leakage.
- **Train:** deterministic seeded events, pause/step/reset, full-workload completion shortcut, synthetic loss curves and explicit overfitting. Playback pauses at the checkpoint so evaluation is a separate action.
- **Evaluate:** a fixed stored baseline and six dimensions; a fail-closed scenario contract for domain gain, format, held-out behavior, retention and leakage. A synthetic pass is not a real model release.
- **Compare:** up to three immutable session snapshots, preserved on reload; full reproducible JSON export. A setting change invalidates the active run, never a saved snapshot. Selecting the same setting preserves the active run. Corrupt session entries are isolated so valid experiments can still be recovered.

**Adaptation 101** provides ten chapters. Five experiment presets cover domain QA, data quality, overfitting, memory constraint and rank. USL, DCL, TFL, GEX and EVL links appear at the relevant decision stages. No configuration or telemetry is silently sent to those applications.

The simulation toolbar precedes the learning panels, with progress and a separate device-capacity notice. Browser back/forward restores laboratory modes. Comparison includes learning rate, data filters, leakage, device fit and checkpointing. Versioned configurations are stored compactly and reconstruct the same deterministic snapshots on reload; JSON export still includes full events, curves and results.

Keyboard: native controls, visible focus, Space for play/pause and Right Arrow for step outside editable/interactive elements. Stepping stops at the training checkpoint until explicit evaluation; modified browser shortcuts remain available. A hidden tab pauses playback. Reduced-motion users start paused and can step or complete the simulation directly. On mobile, controls precede the result; tables scroll within their containers.

## Scientific boundary

**No foundation model is trained.** Calculated parameter counts use documented generic profiles. Memory is an estimate; curves, scores, events and compute units are authored synthetic behavior. Model sizes and rank do not predict real quality. There is no real tokenizer, measured benchmark, trained checkpoint or dollar-cost model. The JSON export contains simulation data, not model weights.

See [educational model and formulas](docs/educational-model.md), [integration contracts](docs/integrations.md), [QA and combined review](docs/qa.md), and [design reference](docs/design/concept.png).

## Architecture

- `src/core/`: types, model profiles, LoRA calculations, memory, dataset preparation and evaluation contract.
- `src/simulation/`: deterministic event generation and cursor replay, independent of React and the clock.
- `src/visualization/`: bounded CSS 3D structural model; no billions-of-parameters geometry or WebGL dependency.
- `src/components/`: bilingual controls, quantitative inspectors, 2D loss chart, dataset and evaluation views.
- `src/lessons/`: ten guided chapters and five deterministic experiment presets.
- `src/integrations/`: explicit links with language context only.
- `tests/`: independent numeric checks and scientific/state invariants.

The run format is versioned `adp-core-1`. Real training traces, framework adapters, imported datasets, DPO, routing and distributed training are deliberately outside CORE. A future adapter must preserve provenance and distinguish measured metrics from these synthetic events; it must not silently reuse the synthetic scores.

## Türkçe

ADP, model uyarlama kararlarını görünür kılan bir eğitim laboratuvarıdır. Full FT, LoRA ve QLoRA arasındaki parametre ve bellek farklarını hesaplar; veri temizleme, eğitim döngüsü, aşırı uyum, başlangıç karşılaştırması ve değerlendirme kapısını birleştirir. Tüm arayüz EN/TR destekler. Simülasyon sonuçları gerçek benchmark değildir. `npm run dev` ile yerelde çalışır; `main` dalı GitHub Actions üzerinden Azure Free ortamına yayımlanır. Uygulama `adp.aserdargun.com` adresinden de erişilebilir; yayın iş akışı DNS yönetmez.

## ILS v0.1

Canonical content-addressed packages in `vendor/` supply the shared evidence shell and existing playback controls. The manifest maps five authored scenarios plus the real custom-configuration state; the lesson adapter reuses all ten current chapters. `?scenario=…` applies an allowlisted preset, `?lesson=adaptation-101` opens the guide. The custom route starts from defaults, not a transferred configuration. Unsupported `ils` payloads are ignored. Related links are semantic navigation only. Parameter calculations, memory estimates, user inputs and synthetic learning outputs remain distinct; simulation and scientific content stay application-owned.
