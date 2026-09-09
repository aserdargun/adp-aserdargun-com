import type {
  AdaptationConfig,
  DatasetProfile,
  PreparedDataset,
  QualityFlag,
  Sample,
  Text,
} from "./types";
export const datasets: DatasetProfile[] = [
  {
    id: "clean",
    name: { en: "Clean small", tr: "Küçük ve temiz" },
    examples: 5000,
    averageTokens: 2048,
    duplication: 2,
    noise: 1,
    contradiction: 1,
    irrelevant: 1,
    missing: 1,
    coverage: [0.8, 0.9, 1, 0.8, 0.7],
    difficulty: 0.45,
    description: {
      en: "5K relevant examples across five support tasks.",
      tr: "Beş destek görevinde 5 bin ilgili örnek.",
    },
  },
  {
    id: "noisy",
    name: { en: "Large noisy", tr: "Büyük ve gürültülü" },
    examples: 50000,
    averageTokens: 2048,
    duplication: 35,
    noise: 16,
    contradiction: 8,
    irrelevant: 8,
    missing: 4,
    coverage: [0.7, 0.8, 0.8, 0.5, 0.4],
    difficulty: 0.65,
    description: {
      en: "50K rows; repeated patterns and conflicting targets.",
      tr: "50 bin satır; tekrarlar ve çelişen hedefler.",
    },
  },
  {
    id: "narrow",
    name: { en: "Narrow coverage", tr: "Dar kapsam" },
    examples: 5000,
    averageTokens: 2048,
    duplication: 5,
    noise: 1,
    contradiction: 1,
    irrelevant: 0,
    missing: 1,
    coverage: [0.05, 0.1, 1, 0.02, 0.03],
    difficulty: 0.45,
    description: {
      en: "Mostly technical answers; policy is barely represented.",
      tr: "Çoğunlukla teknik yanıtlar; politika neredeyse yok.",
    },
  },
  {
    id: "mixed",
    name: { en: "Mixed domain", tr: "Karma alan" },
    examples: 12000,
    averageTokens: 2048,
    duplication: 10,
    noise: 5,
    contradiction: 3,
    irrelevant: 35,
    missing: 2,
    coverage: [0.5, 0.5, 0.8, 0.25, 0.25],
    difficulty: 0.6,
    description: {
      en: "Relevant support data mixed with unrelated examples.",
      tr: "İlgili destek verileriyle alakasız örnekler bir arada.",
    },
  },
];
export const getDataset = (id: string) => datasets.find((d) => d.id === id)!;
export const domains: Text[] = [
  { en: "Billing", tr: "Faturalama" },
  { en: "Support", tr: "Destek" },
  { en: "Technical", tr: "Teknik" },
  { en: "Policy", tr: "Politika" },
  { en: "Sales", tr: "Satış" },
];
const inputs: Text[] = [
  {
    en: "When is an unused subscription refunded?",
    tr: "Kullanılmayan abonelik ne zaman iade edilir?",
  },
  {
    en: "How do I escalate an unresolved ticket?",
    tr: "Çözülmeyen bir kaydı nasıl üst desteğe iletirim?",
  },
  {
    en: "How do I rotate a service token?",
    tr: "Bir servis tokenını nasıl yenilerim?",
  },
  {
    en: "How long can a support export be retained?",
    tr: "Destek dışa aktarımı ne kadar saklanabilir?",
  },
  {
    en: "Can I change the plan during a trial?",
    tr: "Deneme sırasında planı değiştirebilir miyim?",
  },
];
const outputs: Text[] = [
  {
    en: "Under this fictional policy, request review within 14 days.",
    tr: "Bu kurgusal politikada 14 gün içinde inceleme isteyin.",
  },
  {
    en: "Attach the ticket ID and request a support review.",
    tr: "Kayıt kimliğini ekleyin ve destek incelemesi isteyin.",
  },
  {
    en: "Create a replacement, update the client, then revoke the old token.",
    tr: "Yenisini oluşturun, istemciyi güncelleyin, eskisini iptal edin.",
  },
  {
    en: "This fictional support policy specifies 30 days.",
    tr: "Bu kurgusal destek politikası 30 gün belirler.",
  },
  {
    en: "This fictional service allows a plan change during the trial.",
    tr: "Bu kurgusal hizmet deneme sırasında plan değişimine izin verir.",
  },
];
export const qualityFlags: QualityFlag[] = [
  "good",
  "duplicate",
  "noisy",
  "contradictory",
  "out-of-domain",
  "missing-target",
];
/** Duplicate groups stay in TRAIN. Validation and test are fixed independent banks.
 * Cleaning touches TRAIN only; a leakage control deliberately reuses test identities. */
export function prepareData(c: AdaptationConfig): PreparedDataset {
  const d = getDataset(c.dataset),
    n = d.examples,
    trainN = Math.floor(n * 0.8),
    valN = Math.floor(n * 0.1);
  const counts = {
    duplicate: Math.floor((trainN * c.duplicates) / 100),
    noisy: Math.floor((trainN * d.noise) / 100),
    contradictory: Math.floor((trainN * d.contradiction) / 100),
    "out-of-domain": Math.floor((trainN * d.irrelevant) / 100),
    "missing-target": Math.floor((trainN * d.missing) / 100),
  };
  // Categories are mutually exclusive, and a good source row is always reserved.
  let remaining = trainN - 1;
  for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
    counts[key] = Math.min(counts[key], remaining);
    remaining -= counts[key];
  }
  const train: Sample[] = [],
    validation: Sample[] = [],
    test: Sample[] = [];
  let boundary = 1;
  const boundaries = Object.entries(counts).map(([flag, count]) => {
    const start = boundary;
    boundary += count;
    return { flag: flag as QualityFlag, start, end: boundary };
  });
  const sumCoverage = d.coverage.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) {
    const split =
      i < trainN ? "train" : i < trainN + valN ? "validation" : "test";
    const flag: QualityFlag =
      split === "train"
        ? (boundaries.find((b) => i >= b.start && i < b.end)?.flag ?? "good")
        : "good";
    // Weighted deterministic task distribution in train; held-out tasks cover all five domains.
    let domain = i % 5;
    if (split === "train") {
      let threshold = (((i * 7919) % 10000) / 10000) * sumCoverage;
      domain = 4;
      for (let k = 0; k < 5; k++) {
        threshold -= d.coverage[k];
        if (threshold < 0) {
          domain = k;
          break;
        }
      }
    }
    if (flag === "duplicate") domain = 0;
    const group =
      flag === "duplicate" || i === 0
        ? `${d.id}-train-source`
        : `${d.id}-${split}-${i}`;
    let input = inputs[domain],
      output = outputs[domain];
    if (flag === "contradictory") {
      input = inputs[3];
      output = {
        en: "Keep support exports forever; there is no retention limit.",
        tr: "Destek dışa aktarımlarını sonsuza dek saklayın; süre sınırı yok.",
      };
    }
    if (flag === "missing-target") output = { en: "", tr: "" };
    if (flag === "noisy")
      output = {
        en: "??? maybe check the thing [broken target]",
        tr: "??? belki şeye bakın [bozuk hedef]",
      };
    if (flag === "out-of-domain") {
      input = {
        en: "Describe the orbit of a fictional moon.",
        tr: "Kurgusal bir ayın yörüngesini anlatın.",
      };
      output = {
        en: "An elliptical orbit around an imaginary planet.",
        tr: "Hayali bir gezegen çevresinde eliptik bir yörünge.",
      };
    }
    // Case context is part of the prompt, so independent banks do not share identical inputs.
    input = {
      en: `Case ${group}. ${input.en}`,
      tr: `Vaka ${group}. ${input.tr}`,
    };
    const row: Sample = {
      id: `${d.id}-${i}`,
      input,
      output,
      split,
      flag,
      tokens: d.averageTokens,
      duplicateGroup: group,
      source: {
        en: "ADP fictional support corpus",
        tr: "ADP kurgusal destek derlemi",
      },
      domain,
    };
    if (split === "train") {
      if (
        (c.deduplicate && flag === "duplicate") ||
        (c.qualityFilter &&
          ["noisy", "out-of-domain", "missing-target"].includes(flag)) ||
        (c.contradictionFilter && flag === "contradictory")
      )
        continue;
      train.push(row);
    } else if (split === "validation") validation.push(row);
    else test.push(row);
  }
  const cleanTrainSize = train.length;
  const leak = c.leakage
    ? test.slice(0, Math.max(1, Math.floor(test.length * 0.2)))
    : [];
  train.push(...leak.map((r) => ({ ...r, split: "train" as const })));
  const fraction = (flag: QualityFlag) =>
    train.filter((r) => r.flag === flag).length / train.length;
  const unique = new Set(train.map((r) => r.duplicateGroup)).size;
  const coverage = domains.map((_, i) => {
    const count = new Set(
      train
        .filter((r) => r.domain === i && r.flag !== "out-of-domain")
        .map((r) => r.duplicateGroup),
    ).size;
    return Math.min(1, count / (train.length * 0.2));
  });
  return {
    rows: [...train, ...validation, ...test],
    train,
    validation,
    test,
    rawCount: n,
    removed: trainN - cleanTrainSize,
    duplicates: train.length - unique,
    unique,
    coverage,
    noise: fraction("noisy"),
    contradiction: fraction("contradictory"),
    irrelevant: fraction("out-of-domain"),
    missing: fraction("missing-target"),
    diversity: unique / train.length,
    difficulty: d.difficulty,
    averageTokens: Math.min(c.sequence, d.averageTokens),
    leakageCount: leak.length,
  };
}
export function workload(c: AdaptationConfig, d: PreparedDataset) {
  const microBatchesPerEpoch = Math.ceil(d.train.length / c.microBatch);
  const updatesPerEpoch = Math.ceil(microBatchesPerEpoch / c.accumulation);
  return {
    effectiveBatch: c.microBatch * c.accumulation,
    microBatchesPerEpoch,
    updatesPerEpoch,
    optimizerSteps: updatesPerEpoch * c.epochs,
    tokenExposure: d.train.length * d.averageTokens * c.epochs,
  };
}
