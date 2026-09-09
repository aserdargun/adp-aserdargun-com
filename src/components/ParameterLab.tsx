import { useContext } from "react";
import type { AdaptationConfig, Method, Target } from "../core/types";
import { parameters } from "../core/parameters";
import { getModel, ranks, targets } from "../core/models";
import { memory } from "../core/memory";
import { ParameterWorld } from "../visualization/ParameterWorld";
import {
  SectionTitle,
  LocaleContext,
  External,
  Note,
  fmt,
  bytes,
  useT,
} from "./ui";
import { links } from "../integrations/links";
import { methodName } from "./Controls";
export function MethodComparison({ config: c }: { config: AdaptationConfig }) {
  const t = useT();
  return (
    <section className="panel comparison">
      <SectionTitle
        title={t(
          "One model. Three ways to adapt.",
          "Tek model. Üç uyarlama yöntemi.",
        )}
        detail={t(
          "Same model and dataset. Different parameter scope.",
          "Aynı model ve veri. Farklı parametre kapsamı.",
        )}
      />
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            {t(
              "Calculated method comparison under current settings",
              "Mevcut ayarlarda hesaplanan yöntem karşılaştırması",
            )}
          </caption>
          <thead>
            <tr>
              {[
                t("Method", "Yöntem"),
                t("What learns?", "Ne öğrenir?"),
                t("Trainable", "Eğitilebilir"),
                t("Base bits", "Temel bit"),
                t("Memory estimate", "Bellek tahmini"),
                t("Artifact", "Çıktı"),
                t("Compute / flexibility", "Hesaplama / esneklik"),
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["full", "lora", "qlora"] as Method[]).map((method) => {
              const config = { ...c, method },
                p = parameters(config),
                m = memory(config);
              return (
                <tr
                  key={method}
                  className={c.method === method ? "selected" : ""}
                >
                  <th scope="row">{methodName(method)}</th>
                  <td>
                    {method === "full"
                      ? t("All base weights", "Tüm temel ağırlıklar")
                      : t("A + B adapters only", "Yalnız A + B adaptörleri")}
                  </td>
                  <td>
                    {fmt(p.trainable)} <small>({p.percent.toFixed(2)}%)</small>
                  </td>
                  <td>{m.baseBits}</td>
                  <td>
                    {m.giB.toFixed(1)} GiB
                    <br />
                    <small>
                      {m.fits
                        ? t("Fits estimate", "Tahmine göre sığar")
                        : t("Does not fit", "Sığmaz")}
                    </small>
                  </td>
                  <td>
                    {bytes(m.artifactBytes)}
                    <br />
                    <small>
                      {method === "full"
                        ? t("Full weights", "Tam ağırlıklar")
                        : t(
                            "Adapter + base required",
                            "Adaptör + temel gerekli",
                          )}
                    </small>
                  </td>
                  <td>
                    {method === "full"
                      ? t("High / all parameters", "Yüksek / tüm parametreler")
                      : method === "qlora"
                        ? t(
                            "Backward + dequantization / low-rank",
                            "Geri yayılım + geri açma / düşük rank",
                          )
                        : t(
                            "Backward through base / low-rank",
                            "Temelden geri yayılım / düşük rank",
                          )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="caption">
        {t(
          "Gradient and optimizer scopes match the trainable column. None of these methods guarantees better quality. Artifact sizes exclude serialization metadata.",
          "Gradyan ve optimizer kapsamı eğitilebilir sütunuyla aynıdır. Hiçbir yöntem daha iyi kaliteyi garanti etmez. Çıktı boyutu serileştirme meta verisini içermez.",
        )}
      </p>
    </section>
  );
}
export function ParameterLab({
  config: c,
  change,
}: {
  config: AdaptationConfig;
  change: (patch: Partial<AdaptationConfig>) => void;
}) {
  const p = parameters(c),
    m = getModel(c.model),
    t = useT(),
    lang = useContext(LocaleContext);
  const toggle = (target: Target) => {
    const next = c.targets.includes(target)
      ? c.targets.filter((t) => t !== target)
      : targets.filter((t) => t === target || c.targets.includes(t));
    if (next.length) change({ targets: next });
  };
  return (
    <div className="lab-content">
      <ParameterWorld config={c} />
      <section className="panel">
        <SectionTitle
          title={t("LoRA learns an update", "LoRA bir güncelleme öğrenir")}
          kind="calculated"
        />
        <div className="matrix-equation">
          <div className="matrix-w">
            W<small>{t("frozen", "donmuş")}</small>
          </div>
          <b>+</b>
          <div className="matrix-b">
            B<small>d_out × r</small>
          </div>
          <b>×</b>
          <div className="matrix-a">
            A<small>r × d_in</small>
          </div>
          <b>=</b>
          <div>
            W + ΔW<small>{t("effective weight", "etkin ağırlık")}</small>
          </div>
        </div>
        <p>
          {t(
            "W has shape [d_out, d_in]. ΔW = B × A has the same shape. CORE holds α/r at 1; standard LoRA scales the update by α/r. Scaling is not a universal quality knob.",
            "W boyutu [d_out, d_in]. ΔW = B × A aynı boyuttadır. CORE, α/r oranını 1 tutar; standart LoRA güncellemeyi α/r ile ölçekler. Ölçekleme evrensel bir kalite düğmesi değildir.",
          )}
        </p>
        {c.method === "full" && (
          <Note>
            {t(
              "Full FT is selected: the base is updated directly. This matrix equation explains the alternative LoRA method; no adapters are added to this run.",
              "Full FT seçili: temel doğrudan güncellenir. Bu denklem alternatif LoRA yöntemini açıklar; bu deneye adaptör eklenmez.",
            )}
          </Note>
        )}
        <div className="parameter-totals">
          <span>
            {t("Total parameters", "Toplam parametre")}{" "}
            <b>{p.total.toLocaleString("en-US")}</b>
          </span>
          <span>
            {t("Frozen base", "Donmuş temel")}{" "}
            <b>{p.frozen.toLocaleString("en-US")}</b>
          </span>
          <span>
            {t("Trainable", "Eğitilebilir")}{" "}
            <b>{p.trainable.toLocaleString("en-US")}</b>
          </span>
        </div>
        <fieldset disabled={c.method === "full"}>
          <legend>
            {t(
              "Select projections · at least one",
              "İzdüşümleri seçin · en az bir tane",
            )}
          </legend>
          <div className="target-checks">
            {targets.map((target) => (
              <label key={target} className="check">
                <input
                  type="checkbox"
                  disabled={
                    c.targets.length === 1 && c.targets.includes(target)
                  }
                  checked={c.targets.includes(target)}
                  onChange={() => toggle(target)}
                />
                {target.toUpperCase()}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="table-scroll">
          <table>
            <caption>
              {t(
                "r × (input + output) × layer count",
                "r × (girdi + çıktı) × katman sayısı",
              )}
            </caption>
            <thead>
              <tr>
                <th>{t("Module", "Modül")}</th>
                <th>d_in</th>
                <th>d_out</th>
                <th>{t("Per layer", "Katman başına")}</th>
                <th>× {m.layerCount}</th>
              </tr>
            </thead>
            <tbody>
              {p.modules.map((row) => (
                <tr key={row.target}>
                  <th>{row.target.toUpperCase()}</th>
                  <td>{row.input}</td>
                  <td>{row.output}</td>
                  <td>{row.perLayer.toLocaleString("en-US")}</td>
                  <td>{row.total.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>
          {t(
            "Generic square attention projections; GQA and MLP gates are omitted. These educational dimensions do not reconstruct an actual model.",
            "Genel kare dikkat izdüşümleri; GQA ve MLP kapıları dahil değildir. Bu eğitim boyutları gerçek bir modeli yeniden oluşturmaz.",
          )}
        </Note>
        <h3>
          {t(
            "Rank lab · capacity, not a quality forecast",
            "Rank laboratuvarı · kapasite, kalite tahmini değil",
          )}
        </h3>
        <div className="rank-chart">
          {ranks.map((rank) => {
            const n = parameters({ ...c, method: "lora", rank });
            return (
              <button
                className={c.rank === rank ? "active" : ""}
                key={rank}
                onClick={() =>
                  change({
                    rank,
                    method: c.method === "full" ? "lora" : c.method,
                  })
                }
              >
                <span>r={rank}</span>
                <i style={{ width: `${(rank / 128) * 100}%` }} />
                <strong>{fmt(n.adapter)}</strong>
                <small>
                  {bytes(n.adapter * (c.precision === "fp32" ? 4 : 2))}
                </small>
              </button>
            );
          })}
        </div>
        <p>
          {t(
            "Higher rank increases trainable capacity and resource use, not guaranteed task quality. Synthetic quality stays unchanged with rank in this CORE model. Target coverage is not a universal best-practice ranking.",
            "Yüksek rank eğitilebilir kapasiteyi ve kaynak kullanımını artırır; görev kalitesini garanti etmez. CORE modelinde sentetik kalite rank ile değişmez. Hedef kapsamı evrensel bir yöntem sıralaması değildir.",
          )}
        </p>
        <External href={links(lang).usl}>
          {t("Learn the method → USL", "Yöntemi öğren → USL")}
        </External>
      </section>
    </div>
  );
}
