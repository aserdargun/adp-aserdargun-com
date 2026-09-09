# ADP educational model v1

ADP is a client-side laboratory, not a trainer. No weights, GPU jobs, real model responses or measured benchmarks are produced. A run export is simulation metadata, never a usable model checkpoint.

## Evidence vocabulary

- **Calculated**: deterministic arithmetic given an educational profile and user inputs.
- **Estimated**: memory and resource model with explicit assumptions.
- **Simulated / synthetic**: authored curves, scores, events and behavior.
- **User input**: configuration values and seed.
- **Verified source**: cited primary literature, not endorsement of ADP's numeric assumptions.
- **Measured**: reserved for a future real-run adapter; CORE has no measured results.

## Parameter scope

For W of shape [d_out, d_in], A is [r, d_in], B is [d_out, r]. The update is ΔW = B A; W_eff = W + (α/r) B A in standard LoRA. CORE holds α/r at 1 and does not model its quality effect. Each chosen projection adds r(d_in+d_out) trainable parameters, once per transformer layer. There is no trained bias or output head in the adapter modes. Full FT trains every base parameter; it does not add adapters. Trainable percentage uses (base + adapter) as denominator.

Six generic 1/3/7/14/32/70B profiles are rounded parameter budgets with illustrative dimensions. They do not claim to reconstruct a named model. Q/K/V/O are square; MLP up/down are rectangular. GQA and gated MLP expansion are outside this simplified profile. Profile source is ADP, with verifiedAt=null.

## Memory

All numbers use GiB = 2^30 bytes. Base bytes = parameters × representation bits / 8. BF16 and FP16 have the same storage here; FP32 doubles it. QLoRA uses a 4-bit frozen payload plus an illustrative 0.127 bits/parameter metadata budget. Compute and adapters remain at the selected 16/32-bit precision. This is not 4-bit optimizer training.

Gradients: 4 bytes per trainable parameter. Adam moments: 8 bytes per trainable parameter. A separate FP32 master copy adds 4 bytes per trainable parameter in the 16-bit setup, zero extra in the FP32 setup. Frozen parameters have neither gradients, optimizer states nor master copies. Full weights are counted once; adapter weights are a separate component only for adapter methods.

Activation bytes = microBatch × sequence × hidden × layers × computeBytes × 8 × checkpointFactor. The factor is 0.3 with checkpointing and 1 otherwise. These are deliberately explicit educational coefficients, not a framework fit. Assume memory-efficient attention without a materialized S² matrix. Workspace = 1 GiB + 5% of other allocations. No sharding, offload, allocator fragmentation or communication. A fit is conditional, not a throughput or hardware-compatibility promise.

## Data, splits and token exposure

Datasets contain deterministic fictional examples with mutually exclusive quality categories. 80% train, 10% validation and 10% test. The display is a representative sample bank: prompt templates repeat with distinct case contexts and synthetic record identities; it is not real evaluation data. Duplicate groups are confined to train. Filters operate only on training rows, leaving validation/test banks fixed. Deliberate leakage copies 20% of test identities into train and must fail the gate. Contradiction filtering removes authored contradictory rows; it cannot promise to find all real contradictions.

Weighted task coverage, noise, contradiction, irrelevant examples, missing targets, unique diversity and difficulty remain separate dimensions. Duplicates are repeated exposures to one source group. Cleaning can change size, diversity and coverage. Every sample length is an illustrative 2048 tokens. Actual training token exposure = prepared train count × min(average tokens, sequence cap) × epochs. Increasing cap above average does not magically add information; activation estimate still reserves the configured sequence. No pretrained tokenizer is used. The UI's word chips are conceptual units, not token IDs.

One epoch traverses the prepared train split. Effective batch = micro batch × accumulation (single device). Remainders produce a partial final batch/update. Accumulation changes update counts without multiplying resident activations.

## Deterministic teaching model

Seed hashing is independent of rank. Curves and six evaluation dimensions are pure functions. Model class and rank affect resources but do not claim a quality law. Baseline is fixed at task 54, domain 48, instruction 70, format 72, held-out 55 and retention 82 in an authored 0–100 rubric.

Let e=epochs, c=mean task coverage, n=noise, k=contradiction, i=irrelevance, m=missing, v=unique diversity, d=difficulty. Exposure x=1−exp(−e×rate), rate=.08 for low LR and .8 otherwise. Overfit o=max(0,e−(3−3k)). Gain g=32x(1−n)(1−k)(1−i)(.6+.4c)(1−.15d). Seed jitter j is bounded ±.75. High-LR instability penalty u=16, otherwise 0. Scores are clamped to [0,100]:

- task = 54 + .8g − 1.5o − u + j
- domain = 48 + g − 1.7o − u + j
- instruction = 70 + .35g − 20k − u
- format = 72 + 18x − 28n − 60m − 15k − u
- honest held-out = 55 + .8g − 3.1o − 15(1−c) − u + j
- retention = 82 − [9(1−c)+1.1o+(3.5 for FT, 1.5 for adapters)+10k]

Leakage adds 12 points to the reported held-out score (capped at 100), with the honest counterfactual visible and the gate invalidated. These numbers encode possible educational outcomes; they are not predictions. The exact curve model is in `src/core/evaluation.ts`: exponential decay, explicit late overfit term, and bounded seeded jitter. LoRA quality is intentionally flat with rank in CORE.

## Events and compute

Playback compresses an epoch into at most 12 representative groups, each batch → forward → loss → backward → optimizer step. The displayed counts account for every real configured microbatch and update, including partial final accumulation. One synthetic tick is one teaching event, never elapsed GPU time. Loss chart points appear only after an optimizer event; evaluation is hidden until its own event. A configuration change invalidates the active run; saved snapshots retain their original settings, seed, assumptions and version.

Compute index = million training tokens × model/7B × method factor (Full FT 3, LoRA 2, QLoRA 2.3) × checkpoint factor (1.3 or 1). These authored units simply illustrate backward and recomputation burdens. No FLOPs, latency, dollars or measured speed is inferred.

## Release contract

The scenario requires domain gain ≥8 points, format ≥80, held-out ≥65, retention drop ≤5 and no test leakage. Each clause is evaluated independently. A finished training checkpoint does not imply readiness. The result says only that a synthetic educational contract passed. Repeated inspection of these simulated test scores is a lesson; a real project needs a fresh final hold-out after development.

## Primary sources checked 2026-09-09

- Hu et al., [LoRA](https://arxiv.org/abs/2106.09685): low-rank trainable updates to frozen pretrained weights.
- Dettmers et al., [QLoRA](https://arxiv.org/abs/2305.14314): backpropagation through a frozen quantized base into higher-precision adapters.
- Hugging Face, [GPU memory usage](https://huggingface.co/docs/transformers/model_memory_anatomy): weight copies, gradients, optimizer moments, activations and temporary allocations.

Literature supports the concepts. It does not validate ADP's generic profiles, synthetic scores or activation coefficients.
