import type { Text } from "./types";

/**
 * ADP's own verification record.
 *
 * The dates below are claims about work that was actually performed, not
 * build stamps. Each one moves only when that specific act is repeated:
 *
 * - `sourcesCheckedAt` — the primary literature was opened again and confirmed
 *   to support the concept ADP attributes to it.
 * - `specReviewedAt` — the educational model specification was re-read against
 *   the code in `src/core` and `src/simulation`.
 * - `linksReviewedAt` — the outbound routes were re-checked against the
 *   applications they point at, including the locale parameter each one reads.
 *
 * These three values are published in the interface, in the model
 * specification and in the integration record. The same fact used to be
 * written out by hand in five places, and only one of them could be right.
 * `tests/verification.test.ts` binds every published copy to this file, so a
 * date can no longer be corrected here and left stale somewhere else.
 */
export const sourcesCheckedAt = "2026-10-27";
export const specReviewedAt = "2026-10-27";
export const linksReviewedAt = "2026-10-27";

export type PrimarySource = {
  id: string;
  url: string;
  /** How the source is named in the interface. */
  label: Text;
  /** What the source genuinely supports, in the reader's own terms. */
  supports: Text;
};

/**
 * The literature ADP cites.
 *
 * Each entry states only what the source supports. None of them validates
 * ADP's generic profiles, its synthetic scores or its activation
 * coefficients, and the specification says so next to the list.
 */
export const primarySources: PrimarySource[] = [
  {
    id: "lora",
    url: "https://arxiv.org/abs/2106.09685",
    label: { en: "LoRA · Hu et al.", tr: "LoRA · Hu ve diğerleri" },
    supports: {
      en: "low-rank trainable updates to frozen pretrained weights",
      tr: "donmuş temel ağırlıklara düşük ranklı eğitilebilir güncellemeler",
    },
  },
  {
    id: "qlora",
    url: "https://arxiv.org/abs/2305.14314",
    label: {
      en: "QLoRA · Dettmers et al.",
      tr: "QLoRA · Dettmers ve diğerleri",
    },
    supports: {
      en: "backpropagation through a frozen quantized base into higher-precision adapters",
      tr: "donmuş kuantize temel üzerinden adaptörlere geri yayılım",
    },
  },
  {
    id: "hf-memory",
    url: "https://huggingface.co/docs/transformers/model_memory_anatomy",
    label: {
      en: "Hugging Face · GPU memory",
      tr: "Hugging Face · GPU belleği",
    },
    supports: {
      en: "weight copies, gradients, optimizer moments, activations and temporary allocations",
      tr: "ağırlıklar, gradyanlar, optimizer durumları, aktivasyonlar ve geçici tahsisler",
    },
  },
];
