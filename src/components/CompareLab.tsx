import { Download, Trash2 } from "lucide-react";
import type { ExperimentRun, Scores } from "../core/types";
import { parameters } from "../core/parameters";
import { memory } from "../core/memory";
import { datasets } from "../core/datasets";
import { useContext, useState } from "react";
import { SectionTitle, LocaleContext, Note, fmt, bytes, useT } from "./ui";
import { scoreNames } from "./EvaluationLab";
import { methodName } from "./Controls";
export function exportRuns(runs: ExperimentRun[]) {
  const json = JSON.stringify(
    {
      kind: "ADP synthetic educational experiments",
      version: "adp-core-1",
      runs,
    },
    null,
    2,
  );
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "adp-experiments.json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return json;
}
export function CompareLab({
  runs,
  remove,
}: {
  runs: ExperimentRun[];
  remove: (id: string) => void;
}) {
  const t = useT(),
    lang = useContext(LocaleContext);
  const [exported, setExported] = useState<{
    runs: ExperimentRun[];
    json: string;
  } | null>(null);
  const exportJson = exported?.runs === runs ? exported.json : "";
  return (
    <section className="panel">
      <SectionTitle
        title={t(
          "Compare decisions, not just scores",
          "Yalnız skorları değil, kararları karşılaştır",
        )}
        detail={t(
          "Up to three immutable snapshots, stored only in this browser tab session.",
          "Bu tarayıcı sekmesi oturumunda en fazla üç değişmez kayıt.",
        )}
        kind="synthetic"
      />
      {!runs.length ? (
        <div className="empty-state">
          <h3>
            {t("Your experiment notebook is empty", "Deney defteriniz boş")}
          </h3>
          <p>
            {t(
              "Complete a simulation, evaluate it, and save the run. Try LoRA r=8, LoRA r=64 and QLoRA r=16.",
              "Simülasyonu tamamlayın, değerlendirin ve kaydedin. LoRA r=8, LoRA r=64 ve QLoRA r=16 deneyin.",
            )}
          </p>
        </div>
      ) : (
        <>
          <button onClick={() => setExported({ runs, json: exportRuns(runs) })}>
            <Download size={16} />
            {t("Export reproducible JSON", "Tekrarlanabilir JSON dışa aktar")}
          </button>
          {exportJson && (
            <div className="export-result">
              <p role="status">
                {t(
                  "JSON prepared. Download requested; you can also select and copy the complete export below.",
                  "JSON hazırlandı. İndirme istendi; aşağıdaki tam çıktıyı seçip kopyalayabilirsiniz.",
                )}
              </p>
              <label>
                {t(
                  "Reproducible experiment JSON",
                  "Tekrarlanabilir deney JSON çıktısı",
                )}
                <textarea readOnly value={exportJson} rows={6} />
              </label>
            </div>
          )}
          <div className="table-scroll">
            <table>
              <caption>
                {t(
                  "Calculated resources + synthetic evaluation",
                  "Hesaplanan kaynaklar + sentetik değerlendirme",
                )}
              </caption>
              <thead>
                <tr>
                  <th>{t("Dimension", "Boyut")}</th>
                  {runs.map((r) => (
                    <th key={r.id}>
                      {r.id}
                      <button
                        className="icon-button"
                        aria-label={`${t("Remove", "Kaldır")} ${r.id}`}
                        onClick={() => {
                          setExported(null);
                          remove(r.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    t("Configuration", "Yapılandırma"),
                    ...runs.map(
                      (r) =>
                        `${r.config.model.toUpperCase()} / ${methodName(r.config.method)}${r.config.method === "full" ? "" : ` / r=${r.config.rank} / ${r.config.targets.join("+")}`}`,
                    ),
                  ],
                  [
                    t("Dataset", "Veri kümesi"),
                    ...runs.map(
                      (r) =>
                        datasets.find((d) => d.id === r.config.dataset)!.name[
                          lang
                        ],
                    ),
                  ],
                  [
                    t("Training settings", "Eğitim ayarları"),
                    ...runs.map(
                      (r) =>
                        `${r.config.epochs} ep · μB ${r.config.microBatch} × ${r.config.accumulation} · S=${r.config.sequence} · ${r.config.precision}`,
                    ),
                  ],
                  [
                    t("Learning rate", "Öğrenme oranı"),
                    ...runs.map((r) =>
                      r.config.learningRate === "low"
                        ? t("Too low", "Çok düşük")
                        : r.config.learningRate === "high"
                          ? t("Too high", "Çok yüksek")
                          : t("Reasonable (synthetic)", "Makul (sentetik)"),
                    ),
                  ],
                  [
                    t("Data preparation", "Veri hazırlama"),
                    ...runs.map(
                      (r) =>
                        `${r.config.duplicates}% ${t("duplicates", "tekrar")} · ${
                          [
                            r.config.deduplicate &&
                              t("deduplicated", "tekrarlar kaldırıldı"),
                            r.config.qualityFilter &&
                              t("quality filter", "kalite filtresi"),
                            r.config.contradictionFilter &&
                              t("contradiction filter", "çelişki filtresi"),
                          ]
                            .filter(Boolean)
                            .join(" + ") || t("no filters", "filtre yok")
                        }`,
                    ),
                  ],
                  [
                    t("Train / test integrity", "Eğitim / test bütünlüğü"),
                    ...runs.map((r) =>
                      r.config.leakage
                        ? t(
                            "LEAKAGE · invalid evaluation",
                            "SIZINTI · geçersiz değerlendirme",
                          )
                        : t("Disjoint identities", "Ayrı kimlikler"),
                    ),
                  ],
                  [
                    t("Prepared train rows", "Hazırlanan eğitim satırı"),
                    ...runs.map((r) => fmt(r.trainExamples)),
                  ],
                  [
                    t("Device / memory fit", "Cihaz / belleğe sığma"),
                    ...runs.map(
                      (r) =>
                        `${r.config.deviceGiB} GiB · ${memory(r.config).fits ? t("fits estimate", "tahmine sığıyor") : t("EXCEEDS CAPACITY", "KAPASİTE AŞIMI")}`,
                    ),
                  ],
                  [
                    t("Gradient checkpointing", "Gradyan kontrol noktaları"),
                    ...runs.map((r) =>
                      r.config.checkpointing
                        ? t("On", "Açık")
                        : t("Off", "Kapalı"),
                    ),
                  ],
                  [
                    t("Seed / version", "Tohum / sürüm"),
                    ...runs.map((r) => `${r.config.seed} / ${r.version}`),
                  ],
                  [
                    t("Trainable parameters", "Eğitilebilir parametreler"),
                    ...runs.map((r) => fmt(parameters(r.config).trainable)),
                  ],
                  [
                    t("Estimated memory", "Tahmini bellek"),
                    ...runs.map((r) => bytes(memory(r.config).total)),
                  ],
                  [
                    t("Artifact payload", "Çıktı yükü"),
                    ...runs.map((r) => bytes(memory(r.config).artifactBytes)),
                  ],
                  [
                    t("Token exposure", "Token maruziyeti"),
                    ...runs.map((r) => fmt(r.tokenExposure)),
                  ],
                  [
                    t("Authored compute units", "Kurgusal hesap birimleri"),
                    ...runs.map((r) => r.computeUnits.toFixed(1)),
                  ],
                  ...(Object.keys(scoreNames) as (keyof Scores)[]).map(
                    (key) => [
                      t(...scoreNames[key]),
                      ...runs.map(
                        (r) =>
                          `${r.evaluation.baseline[key].toFixed(1)} → ${r.evaluation.adapted[key].toFixed(1)}`,
                      ),
                    ],
                  ),
                  [
                    t("Contract", "Sözleşme"),
                    ...runs.map((r) =>
                      r.evaluation.pass
                        ? t("PASS (synthetic)", "GEÇTİ (sentetik)")
                        : t("NOT READY", "HAZIR DEĞİL"),
                    ),
                  ],
                ].map(([name, ...values]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    {values.map((v, i) => (
                      <td key={runs[i].id}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>
            {t(
              "Resource settings are not throughput measurements. Rank does not change synthetic quality in CORE. JSON includes every setting, assumptions, curve, event and evaluation result.",
              "Kaynak ayarları işlem hızı ölçümü değildir. Rank CORE’da sentetik kaliteyi değiştirmez. JSON tüm ayarları, varsayımları, eğriyi, olayları ve değerlendirmeyi içerir.",
            )}
          </Note>
        </>
      )}
    </section>
  );
}
