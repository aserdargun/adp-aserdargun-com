import { useContext, useMemo, useState } from "react";
import type { AdaptationConfig, QualityFlag, Sample } from "../core/types";
import { prepareData, domains, qualityFlags, workload } from "../core/datasets";
import {
  Badge,
  LocaleContext,
  SectionTitle,
  Note,
  Stat,
  fmt,
  useT,
} from "./ui";
const flags: Record<QualityFlag, [string, string]> = {
  good: ["Good", "İyi"],
  duplicate: ["Duplicate", "Tekrar"],
  noisy: ["Noisy", "Gürültülü"],
  contradictory: ["Contradictory", "Çelişkili"],
  "out-of-domain": ["Out of domain", "Alan dışı"],
  "missing-target": ["Missing target", "Hedef eksik"],
};
export function DataLab({
  config: c,
  change,
}: {
  config: AdaptationConfig;
  change: (patch: Partial<AdaptationConfig>) => void;
}) {
  const splitName = (split: Sample["split"]) => {
    const names = {
      train: ["train", "eğitim"],
      validation: ["validation", "doğrulama"],
      test: ["test", "test"],
    } as const;
    return t(names[split][0], names[split][1]);
  };
  const t = useT(),
    lang = useContext(LocaleContext),
    d = useMemo(() => prepareData(c), [c]),
    w = workload(c, d),
    [filter, setFilter] = useState<QualityFlag | "all">("all"),
    [selected, setSelected] = useState<string>("");
  const samples = useMemo(() => {
    const result: Sample[] = [];
    for (const split of [d.train, d.validation, d.test])
      for (const flag of qualityFlags) {
        const rows = split.filter((r) => r.flag === flag);
        result.push(...rows.slice(0, 2));
      }
    return result;
  }, [d]);
  const visible = samples.filter((s) => filter === "all" || s.flag === filter),
    sample =
      visible.find((s) => `${s.split}-${s.id}` === selected) ?? visible[0];
  return (
    <div className="lab-content">
      <section className="panel">
        <SectionTitle
          title={t(
            "Dataset size ≠ usable information",
            "Veri boyutu ≠ kullanılabilir bilgi",
          )}
          detail={t(
            "Inspect explicit data dimensions before training.",
            "Eğitimden önce veri özelliklerini inceleyin.",
          )}
          kind="synthetic"
        />
        <div className="pipeline">
          {[
            t("Raw", "Ham"),
            t("Split", "Ayır"),
            t("Filter train", "Eğitimi filtrele"),
            t("Deduplicate", "Tekrarları sil"),
            t("Validate", "Doğrula"),
            t("Format", "Biçimle"),
            t("Tokenize", "Tokenize et"),
          ].map((s, i) => (
            <span key={s}>
              {i > 0 && <b>→ </b>}
              {s}
            </span>
          ))}
        </div>
        <div className="data-controls">
          <label>
            <span className="label-row">
              {t("Duplicate training rows", "Tekrarlanan eğitim satırları")}
              <b>{c.duplicates}%</b>
            </span>
            <input
              type="range"
              min="0"
              max="60"
              value={c.duplicates}
              onChange={(e) => change({ duplicates: +e.target.value })}
            />
          </label>
          <div className="filter-toggles">
            {(
              ["deduplicate", "qualityFilter", "contradictionFilter"] as const
            ).map((key, i) => (
              <label key={key} className="check">
                <input
                  type="checkbox"
                  checked={c[key]}
                  onChange={(e) => change({ [key]: e.target.checked })}
                />
                {
                  [
                    t("Deduplicate", "Tekrarları kaldır"),
                    t("Quality filter", "Kalite filtresi"),
                    t("Contradiction filter", "Çelişki filtresi"),
                  ][i]
                }
              </label>
            ))}
          </div>
        </div>
        <div className="stats inline">
          <Stat value={fmt(d.rawCount)} label={t("raw rows", "ham satır")} />
          <Stat
            value={fmt(d.train.length)}
            label={t("prepared train rows", "hazırlanan eğitim satırı")}
          />
          <Stat
            value={fmt(d.unique)}
            label={t("unique train groups", "benzersiz eğitim grubu")}
          />
          <Stat
            value={`${(d.diversity * 100).toFixed(1)}%`}
            label={t("unique / exposure", "benzersiz / maruziyet")}
          />
        </div>
        <div className="data-dimensions">
          {[
            [t("Noise", "Gürültü"), d.noise],
            [t("Contradiction", "Çelişki"), d.contradiction],
            [t("Irrelevance", "İlgisizlik"), d.irrelevant],
            [t("Missing target", "Eksik hedef"), d.missing],
            [t("Difficulty (authored)", "Zorluk (kurgusal)"), d.difficulty],
          ].map(([name, value]) => (
            <div key={name as string}>
              <span>{name}</span>
              <b>{((value as number) * 100).toFixed(1)}%</b>
            </div>
          ))}
        </div>
        <h3>{t("Task-space coverage", "Görev kapsamı")}</h3>
        <div className="coverage">
          {domains.map((name, i) => (
            <div key={i}>
              <span>{name[lang]}</span>
              <div>
                <i style={{ width: `${d.coverage[i] * 100}%` }} />
              </div>
              <b>{Math.round(d.coverage[i] * 100)}%</b>
            </div>
          ))}
        </div>
        <p className="caption">
          {t(
            "Relative unique support per task; 100% means the authored target quota is met. Evaluation covers all five tasks. Narrow technical data leaves a policy mismatch.",
            "Görev başına göreli benzersiz destek; %100 kurgusal hedef kotasının karşılandığını gösterir. Değerlendirme beş görevi kapsar. Dar teknik veri, politika alanında uyuşmazlık bırakır.",
          )}
        </p>
        <div className="split-grid">
          {[
            [
              t("Train", "Eğitim"),
              d.train.length,
              t("Used for optimization", "Optimizasyon için"),
            ],
            [
              t("Validation", "Doğrulama"),
              d.validation.length,
              t("Used for development / tuning", "Geliştirme / ayarlama için"),
            ],
            [
              t("Test", "Test"),
              d.test.length,
              t("Reserved for final assessment", "Son değerlendirmeye ayrılır"),
            ],
          ].map(([name, count, desc]) => (
            <div key={name}>
              <Badge kind="calculated" />
              <h3>
                {name} <b>{fmt(count as number)}</b>
              </h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
        <label className="check leakage-control">
          <input
            type="checkbox"
            checked={c.leakage}
            onChange={(e) => change({ leakage: e.target.checked })}
          />
          {t(
            "Deliberately leak 20% of test examples into train",
            "Test örneklerinin %20’sini kasıtlı olarak eğitime sızdır",
          )}
        </label>
        {c.leakage && (
          <div className="alert" role="alert">
            <b>{t("DATA LEAKAGE", "VERİ SIZINTISI")}</b> · {d.leakageCount}{" "}
            {t(
              "shared test identities. The score is inflated and the release gate must fail.",
              "ortak test kimliği. Skor şişer ve yayın kapısı başarısız olur.",
            )}
          </div>
        )}
        <Note>
          {t(
            "Filters remove defined training categories only. Validation/test banks stay fixed. Removing rows can alter task coverage; fewer rows do not automatically mean better data.",
            "Filtreler yalnızca tanımlı eğitim kategorilerini kaldırır. Doğrulama/test sabit kalır. Satır silmek görev kapsamını değiştirebilir; daha az satır her zaman daha iyi veri değildir.",
          )}
        </Note>
      </section>
      <section className="panel">
        <SectionTitle
          title={t("Sample inspector", "Örnek inceleyici")}
          detail={t(
            "Representative fictional records. Distinct case IDs do not establish semantic independence; these examples reuse authored question templates.",
            "Temsili kurgusal kayıtlar. Ayrı vaka kimlikleri anlamsal bağımsızlık kanıtlamaz; bu örnekler kurgusal soru şablonlarını tekrar kullanır.",
          )}
        />
        <div className="chips">
          {(["all", ...qualityFlags] as const).map((flag) => (
            <button
              key={flag}
              aria-pressed={filter === flag}
              onClick={() => setFilter(flag)}
            >
              {flag === "all" ? t("All", "Tümü") : t(...flags[flag])}
            </button>
          ))}
        </div>
        <div className="sample-layout">
          <div className="sample-grid">
            {visible.map((s) => (
              <button
                key={`${s.split}-${s.id}`}
                aria-pressed={sample?.id === s.id && sample?.split === s.split}
                onClick={() => setSelected(`${s.split}-${s.id}`)}
              >
                <small>
                  {splitName(s.split)} · {s.id}
                </small>
                <b>{t(...flags[s.flag])}</b>
                <span>{s.input[lang]}</span>
              </button>
            ))}
            {!visible.length && (
              <p>
                {t(
                  "No examples in this category after filtering.",
                  "Filtreleme sonrası bu kategoride örnek yok.",
                )}
              </p>
            )}
          </div>
          {sample && (
            <article className="sample-detail">
              <Badge kind="synthetic" />
              <h3>{t("Input", "Girdi")}</h3>
              <p>{sample.input[lang]}</p>
              <h3>{t("Expected output", "Beklenen çıktı")}</h3>
              <p>
                {sample.output[lang] || t("(missing target)", "(hedef eksik)")}
              </p>
              {sample.flag === "contradictory" && (
                <Note>
                  {t(
                    "Conflicting target elsewhere: “Support exports may be retained for 30 days.” Same policy question, incompatible supervision.",
                    "Diğer kayıttaki çelişen hedef: “Destek dışa aktarımı 30 gün saklanır.” Aynı politika sorusu, uyuşmayan gözetim.",
                  )}
                </Note>
              )}
              <dl>
                <dt>{t("Split", "Bölüm")}</dt>
                <dd>{splitName(sample.split)}</dd>
                <dt>{t("Quality flags", "Kalite işaretleri")}</dt>
                <dd>{t(...flags[sample.flag])}</dd>
                <dt>
                  {t("Token length (illustrative)", "Token uzunluğu (temsili)")}
                </dt>
                <dd>{sample.tokens}</dd>
                <dt>{t("Duplicate group", "Tekrar grubu")}</dt>
                <dd>{sample.duplicateGroup}</dd>
                <dt>{t("Source", "Kaynak")}</dt>
                <dd>{sample.source[lang]}</dd>
              </dl>
              <h3>{t("Conceptual tokenization", "Kavramsal tokenizasyon")}</h3>
              <div className="tokens">
                {sample.input[lang].split(" ").map((word, i) => (
                  <span key={i}>{word}</span>
                ))}
              </div>
              <small>
                {t(
                  "Word chips are illustrative, not a pretrained tokenizer or real token IDs.",
                  "Sözcük kutuları temsilidir; gerçek tokenizer ya da token kimlikleri değildir.",
                )}
              </small>
            </article>
          )}
        </div>
        <div className="formula">
          {d.train.length.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} ×{" "}
          {d.averageTokens} × {c.epochs} = {fmt(w.tokenExposure)}{" "}
          {t("training-token exposures", "eğitim tokenı maruziyeti")}
        </div>
        <p>
          {t(
            "Only prepared TRAIN rows count. Average tokens are capped by sequence length. Increasing a cap above 2K does not add tokens to these 2K samples.",
            "Yalnız hazırlanmış EĞİTİM satırları sayılır. Ortalama token dizi sınırında kesilir. Sınırı 2K üstüne çıkarmak bu 2K örneklere token eklemez.",
          )}
        </p>
      </section>
    </div>
  );
}
