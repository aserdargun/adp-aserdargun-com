import { useContext } from "react";
import { CheckCircle2, XCircle, LockKeyhole } from "lucide-react";
import type { ExperimentRun, Scores } from "../core/types";
import { replay } from "../simulation/engine";
import { contract } from "../core/evaluation";
import { SectionTitle, LocaleContext, External, Note, Badge, useT } from "./ui";
import { links } from "../integrations/links";
export const scoreNames: Record<keyof Scores, [string, string]> = {
  task: ["Task accuracy", "Görev doğruluğu"],
  domain: ["Domain QA", "Alan soru-cevap"],
  instruction: ["Instruction following", "Talimat takibi"],
  format: ["Format compliance", "Biçim uyumu"],
  heldOut: ["Held-out generalization", "Ayrılmış veride genelleme"],
  retention: ["Out-of-domain retention", "Alan dışı yetenek koruma"],
};
export function EvaluationLab({
  run,
  cursor,
  onEvaluate,
  onSave,
}: {
  run: ExperimentRun | null;
  cursor: number;
  onEvaluate: () => void;
  onSave: () => void;
}) {
  const t = useT(),
    lang = useContext(LocaleContext),
    state = run ? replay(run, cursor) : null,
    e = run?.evaluation;
  const baseline = e?.baseline ?? {
    task: 54,
    domain: 48,
    instruction: 70,
    format: 72,
    heldOut: 55,
    retention: 82,
  };
  const evaluated = Boolean(state?.evaluated);
  const reasons: Record<string, string> = {
    invalidScores: t(
      "Finite scores within 0–100",
      "0–100 aralığında sonlu skorlar",
    ),
    leakage: t("No train/test leakage", "Eğitim/test sızıntısı yok"),
    domain: t(
      `Domain QA gain ≥ ${contract.minimumDomainGain} points`,
      `Alan soru-cevap kazancı ≥ ${contract.minimumDomainGain} puan`,
    ),
    format: t(
      `Format compliance ≥ ${contract.minimumFormat}`,
      `Biçim uyumu ≥ ${contract.minimumFormat}`,
    ),
    heldOut: t(
      `Held-out generalization ≥ ${contract.minimumHeldOut}`,
      `Ayrılmış veride genelleme ≥ ${contract.minimumHeldOut}`,
    ),
    retention: t(
      `General retention decline ≤ ${contract.maximumRetentionDrop} points`,
      `Genel yetenek kaybı ≤ ${contract.maximumRetentionDrop} puan`,
    ),
  };
  return (
    <div className="lab-content">
      <section className="panel">
        <SectionTitle
          title={t(
            "Did adaptation actually help?",
            "Uyarlama gerçekten yardımcı oldu mu?",
          )}
          detail={t(
            "Compare the same dimensions against a stored baseline.",
            "Aynı boyutları kaydedilmiş başlangıç değeriyle karşılaştırın.",
          )}
          kind="synthetic"
        />
        <Note>
          {t(
            "Authored 0–100 teaching rubric. These are simulated scores, not benchmark results or a prediction of a real model. No measured results exist in CORE.",
            "Kurgusal 0–100 eğitim ölçeği. Bunlar simüle skorlardır; benchmark sonucu veya gerçek model tahmini değildir. CORE’da ölçülmüş sonuç yoktur.",
          )}
        </Note>
        <div className="table-scroll">
          <table className="evaluation-table">
            <caption>
              {t(
                "BASE vs ADAPTED · six independent dimensions",
                "TEMEL ve UYARLANMIŞ · altı bağımsız boyut",
              )}
            </caption>
            <thead>
              <tr>
                <th>{t("Dimension", "Boyut")}</th>
                <th>{t("Base", "Temel")}</th>
                <th>{t("Adapted", "Uyarlanmış")}</th>
                <th>{t("Change", "Değişim")}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(baseline) as (keyof Scores)[]).map((key) => {
                const delta = e ? e.adapted[key] - baseline[key] : 0;
                return (
                  <tr key={key}>
                    <th scope="row">{t(...scoreNames[key])}</th>
                    <td>
                      <span className="score">{baseline[key].toFixed(1)}</span>
                    </td>
                    <td>
                      {evaluated && e ? (
                        <>
                          <span className="score">
                            {e.adapted[key].toFixed(1)}
                          </span>
                          <div className="score-bar">
                            <i style={{ width: `${e.adapted[key]}%` }} />
                          </div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td
                      className={
                        evaluated ? (delta >= 0 ? "positive" : "negative") : ""
                      }
                    >
                      {evaluated
                        ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} · ${delta > 0.05 ? t("improved", "iyileşti") : delta < -0.05 ? t("regressed", "geriledi") : t("unchanged", "değişmedi")}`
                        : t("Not evaluated", "Değerlendirilmedi")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!evaluated && (
          <div className="empty-state compact">
            <LockKeyhole size={22} />
            <p>
              {state?.trainingComplete
                ? t(
                    "Training is complete. Run held-out evaluation.",
                    "Eğitim tamamlandı. Ayrılmış veride değerlendirin.",
                  )
                : t(
                    "Complete the training simulation before evaluating the adapted model.",
                    "Uyarlanmış modeli değerlendirmeden önce eğitim simülasyonunu tamamlayın.",
                  )}
            </p>
            <button
              disabled={!state?.trainingComplete}
              className="primary"
              onClick={onEvaluate}
            >
              {t("Run evaluation", "Değerlendirmeyi çalıştır")}
            </button>
          </div>
        )}
        {evaluated && e?.leakage && (
          <div className="alert">
            <b>
              {t(
                "DATA LEAKAGE · evaluation invalid",
                "VERİ SIZINTISI · değerlendirme geçersiz",
              )}
            </b>
            <p>
              {t(
                `Reported held-out: ${e.adapted.heldOut.toFixed(1)}. Honest counterfactual in this simulator: ${e.honestHeldOut.toFixed(1)}. Leakage adds 12 points before clamping.`,
                `Raporlanan ayrılmış veri skoru: ${e.adapted.heldOut.toFixed(1)}. Simülatörde sızıntısız karşılığı: ${e.honestHeldOut.toFixed(1)}. Sızıntı üst sınır uygulanmadan önce 12 puan ekler.`,
              )}
            </p>
          </div>
        )}
      </section>
      <section className="panel">
        <SectionTitle
          title={t("Evidence before release", "Yayından önce kanıt")}
          detail={t(
            "Scenario-specific acceptance criteria, not universal thresholds.",
            "Senaryoya özel kabul ölçütleri; evrensel eşikler değil.",
          )}
        />
        <div
          className={`gate ${evaluated ? (e?.pass ? "pass" : "fail") : ""}`}
          role="status"
        >
          {evaluated ? (
            e?.pass ? (
              <CheckCircle2 />
            ) : (
              <XCircle />
            )
          ) : (
            <LockKeyhole />
          )}
          <div>
            <h3>
              {evaluated
                ? e?.pass
                  ? t("EDUCATIONAL CONTRACT PASSED", "EĞİTİM SÖZLEŞMESİ GEÇTİ")
                  : t("NOT READY", "HAZIR DEĞİL")
                : t("AWAITING EVALUATION", "DEĞERLENDİRME BEKLENİYOR")}
            </h3>
            <p>
              {t(
                "A completed run is not automatically a useful model.",
                "Tamamlanmış bir deney otomatik olarak kullanışlı model demek değildir.",
              )}
            </p>
          </div>
        </div>
        <ul className="contract-list">
          {Object.entries(reasons).map(([key, label]) => (
            <li key={key}>
              {evaluated ? (
                e?.reasons.includes(key) ? (
                  <XCircle className="negative" size={18} />
                ) : (
                  <CheckCircle2 className="positive" size={18} />
                )
              ) : (
                <span className="pending-dot" />
              )}
              {label}
            </li>
          ))}
        </ul>
        {evaluated && (
          <button className="primary" onClick={onSave}>
            {t("Save run for comparison", "Karşılaştırma için deneyi kaydet")}
          </button>
        )}
        <Note>
          {t(
            "Passing means only that this synthetic scenario met its contract. A real release needs independent measurements. After repeated test inspection, use a fresh final hold-out.",
            "Geçmek yalnızca sentetik senaryonun sözleşmesini sağladığını gösterir. Gerçek yayın bağımsız ölçüm gerektirir. Testi tekrar tekrar inceledikten sonra yeni bir son test kümesi kullanın.",
          )}
        </Note>
        <External href={links(lang).evl}>
          {t(
            "Build an evaluation contract → EVL",
            "Değerlendirme sözleşmesi kur → EVL",
          )}
        </External>
      </section>
      <section className="panel">
        <SectionTitle title={t("What is the artifact?", "Çıktı nedir?")} />
        <Badge kind="synthetic" />
        <div className="artifact-equation">
          {run?.config.method === "full"
            ? t(
                "Updated full weights → adapted model",
                "Güncellenmiş tam ağırlıklar → uyarlanmış model",
              )
            : t(
                "Frozen base + adapter → adapted behavior",
                "Donmuş temel + adaptör → uyarlanmış davranış",
              )}
        </div>
        <p>
          {t(
            "An adapter needs its compatible base. Loading an adapter separately preserves switching; merging is optional where supported. A merged copy may require higher precision than a quantized training base. This laboratory exports experiment metadata, not model weights.",
            "Adaptör uyumlu temel modeli gerektirir. Ayrı yüklemek adaptör değiştirmeyi korur; desteklenen yerde birleştirme isteğe bağlıdır. Birleştirilmiş kopya kuantize eğitim temelinden daha yüksek hassasiyet gerektirebilir. Laboratuvar model ağırlığı değil deney meta verisi dışa aktarır.",
          )}
        </p>
        <External href={links(lang).tfl}>
          {t(
            "Explore serving the adapted model → TFL",
            "Uyarlanmış modeli sunmayı keşfet → TFL",
          )}
        </External>
      </section>
    </div>
  );
}
