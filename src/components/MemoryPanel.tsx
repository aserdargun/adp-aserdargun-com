import { useContext } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { AdaptationConfig } from "../core/types";
import { memory } from "../core/memory";
import { getModel } from "../core/models";
import { LocaleContext, SectionTitle, bytes, External, Note, useT } from "./ui";
import { links } from "../integrations/links";
export const memoryNames = {
  weights: ["Base weights", "Temel ağırlıklar"],
  quantization: ["Quantization metadata", "Kuantizasyon meta verisi"],
  adapter: ["Adapter weights", "Adaptör ağırlıkları"],
  gradients: ["Gradients · trainable only", "Gradyanlar · yalnız eğitilebilir"],
  optimizer: [
    "Adam moments · trainable only",
    "Adam durumu · yalnız eğitilebilir",
  ],
  master: ["FP32 master copy", "FP32 ana kopya"],
  activations: ["Activations · estimate", "Aktivasyonlar · tahmin"],
  workspace: ["Workspace · estimate", "Çalışma alanı · tahmin"],
} as const;
export function MemoryPanel({
  config: c,
  expanded = false,
}: {
  config: AdaptationConfig;
  expanded?: boolean;
}) {
  const m = memory(c),
    t = useT(),
    lang = useContext(LocaleContext);
  return (
    <section className={`panel memory-panel ${expanded ? "expanded" : ""}`}>
      <SectionTitle
        number={expanded ? undefined : "03"}
        title={t("Memory plan", "Bellek planı")}
        detail={t(
          "Training needs more than model weights.",
          "Eğitim, model ağırlıklarından fazlasını gerektirir.",
        )}
        kind="estimated"
      />
      <div className="memory-number">
        <strong data-testid="memory-total">
          {m.giB.toFixed(1)} <small>GiB</small>
        </strong>
        <span>/ {c.deviceGiB} GiB</span>
      </div>
      <div className={`fit ${m.fits ? "fits" : "overflow"}`} role="status">
        {m.fits ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
        <b>
          {m.fits
            ? t("Fits this estimate", "Bu tahmine göre sığıyor")
            : t("Does not fit", "Sığmıyor")}
        </b>
        <span>
          {Math.abs(m.headroom).toFixed(1)} GiB{" "}
          {m.fits ? t("free", "boş") : t("over", "fazla")}
        </span>
      </div>
      <div
        className="memory-bar"
        aria-label={t("Memory breakdown", "Bellek dağılımı")}
      >
        {Object.entries(m.parts)
          .filter(([, v]) => v > 0)
          .map(([key, v]) => (
            <span
              key={key}
              className={`mem-${key}`}
              style={{ width: `${(v / m.total) * 100}%` }}
              title={`${t(memoryNames[key as keyof typeof memoryNames][0], memoryNames[key as keyof typeof memoryNames][1])}: ${bytes(v)}`}
            />
          ))}
      </div>
      <dl className="memory-list">
        {Object.entries(m.parts)
          .filter(([, v]) => v > 0)
          .map(([key, v]) => (
            <div key={key}>
              <dt>
                <i className={`mem-${key}`} />
                {t(
                  memoryNames[key as keyof typeof memoryNames][0],
                  memoryNames[key as keyof typeof memoryNames][1],
                )}
              </dt>
              <dd>{bytes(v)}</dd>
            </div>
          ))}
      </dl>
      {expanded && (
        <>
          <div className="formula">
            {t("Base", "Temel")}:{" "}
            {getModel(c.model).parameterCount.toLocaleString("en-US")} ×{" "}
            {m.baseBits} / 8 {t("bytes", "bayt")}
            <br />A = Bμ × S × H × L × {m.computeBits / 8} × 8 ×{" "}
            {c.checkpointing ? "0.3" : "1"}
            <br />
            {t(
              "Workspace = 1 GiB + 5% of subtotal",
              "Çalışma alanı = 1 GiB + ara toplamın %5’i",
            )}
          </div>
          <Note>
            {t(
              "Adam: 8 bytes per trainable parameter. Gradients: 4 bytes. Master copy: 4 bytes for 16-bit training, zero extra for FP32. Frozen base has none of these allocations.",
              "Adam: eğitilebilir parametre başına 8 bayt. Gradyan: 4 bayt. Ana kopya: 16-bit eğitimde 4 bayt; FP32’de ek kopya yok. Donmuş temelde bu bileşenler bulunmaz.",
            )}
          </Note>
          <p>
            {t(
              "Activation coefficients (8 and checkpoint factor 0.3) are educational assumptions. Memory-efficient attention is assumed; an S² attention matrix is not stored. Actual frameworks, kernels and optimizers change the peak.",
              "Aktivasyon katsayıları (8 ve kontrol noktası çarpanı 0,3) eğitim varsayımlarıdır. Bellek verimli dikkat varsayılır; S² dikkat matrisi saklanmaz. Gerçek çatı, çekirdek ve optimizer tepe kullanımını değiştirir.",
            )}
          </p>
          <Note>
            {t(
              "Memory fit does not establish throughput. Checkpointing trades memory for recomputation; quantization can introduce dequantization overhead.",
              "Belleğe sığmak işlem hızını belirlemez. Kontrol noktaları bellek tasarrufu için yeniden hesaplar; kuantizasyon geri açma yükü getirebilir.",
            )}
          </Note>
        </>
      )}
      <p className="caption">
        {t(
          "Educational guidance: the comparison excludes methods that exceed this memory budget. A fitting adapter method may be worth exploring; data and evaluation still determine usefulness. Simulation can run even when the hypothetical device cannot.",
          "Eğitim rehberi: karşılaştırma bu bellek bütçesini aşan yöntemleri eler. Sığan bir adaptör yöntemi incelenebilir; yararı yine veri ve değerlendirme belirler. Varsayımsal cihaz yetmese de simülasyon çalışabilir.",
        )}
      </p>
      <div className="context-link">
        <small>
          {t("Where can this workload run?", "Bu iş yükü nerede çalışabilir?")}
        </small>
        <External href={links(lang).dcl}>
          {t("Explore deployment → DCL", "Dağıtımı keşfet → DCL")}
        </External>
      </div>
    </section>
  );
}
