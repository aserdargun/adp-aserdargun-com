import { useState } from "react";
import { LockKeyhole, Pencil, RotateCcw } from "lucide-react";
import type { AdaptationConfig } from "../core/types";
import { parameters } from "../core/parameters";
import { getModel } from "../core/models";
import { fmt, SectionTitle, useT } from "../components/ui";
export function ParameterWorld({
  config: c,
  updating = false,
}: {
  config: AdaptationConfig;
  updating?: boolean;
}) {
  const p = parameters(c),
    m = getModel(c.model),
    t = useT(),
    [angle, setAngle] = useState(0),
    [layer, setLayer] = useState(1);
  return (
    <section className="world panel">
      <SectionTitle
        number="02"
        title={t("What changes?", "Ne değişir?")}
        detail={t(
          "Inspect what is frozen and what learns.",
          "Donmuş ve öğrenen bölümleri inceleyin.",
        )}
        kind="calculated"
      />
      <div className={`model-world ${c.method} ${updating ? "updating" : ""}`}>
        <div className="world-label base-label">
          {c.method === "full" ? (
            <Pencil size={16} />
          ) : (
            <LockKeyhole size={16} />
          )}
          <span>
            <strong>
              {c.method === "full"
                ? t("Trainable base W", "Eğitilebilir temel W")
                : t("Frozen base W", "Donmuş temel W")}
            </strong>
            <small>
              {c.method === "qlora"
                ? t("4-bit representation", "4-bit gösterim")
                : `${c.precision.toUpperCase()} · ${m.name}`}
            </small>
          </span>
        </div>
        <div className="stack-space">
          <div
            className="model-stack"
            style={{ transform: `rotateX(57deg) rotateZ(${-31 + angle}deg)` }}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <button
                key={i}
                className={`slab ${layer === i + 1 ? "inspected" : ""}`}
                style={{
                  transform: `translateZ(${i * (c.method === "qlora" ? 19 : 28)}px)`,
                }}
                onClick={() => setLayer(i + 1)}
                aria-label={t(
                  `Inspect representative block ${i + 1}`,
                  `Temsili blok ${i + 1} incele`,
                )}
              >
                <span className="slab-top">
                  {c.method === "full" ? (
                    <Pencil size={14} />
                  ) : (
                    <LockKeyhole size={14} />
                  )}
                  <span>W · {i + 1}</span>
                </span>
                {c.method !== "full" &&
                  c.targets.map((target, j) => (
                    <span
                      key={target}
                      className="adapter-tab"
                      style={{
                        left: `${12 + j * 13}%`,
                        height: `${14 + Math.log2(c.rank) * 3}px`,
                      }}
                    >
                      {target.toUpperCase()}
                    </span>
                  ))}
              </button>
            ))}
          </div>
        </div>
        <div className="world-label adapter-label">
          <span className="trainable-symbol">A B</span>
          <span>
            <strong>
              {c.method === "full"
                ? t(
                    "All base parameters update",
                    "Tüm temel parametreler güncellenir",
                  )
                : t("Trainable A + B", "Eğitilebilir A + B")}
            </strong>
            <small>
              {c.method === "full"
                ? t("No adapter added", "Adaptör eklenmez")
                : `${c.targets.map((v) => v.toUpperCase()).join(" · ")} / r=${c.rank} / ${c.precision.toUpperCase()}`}
            </small>
          </span>
        </div>
        {c.method !== "full" && (
          <div className="world-formula">
            <span>W</span>
            <b>+</b>
            <i>B</i>
            <b>×</b>
            <i>A</i>
            <b>=</b>
            <span>W + ΔW</span>
            <small>
              {t(
                "Effective weight · scaling held at 1",
                "Etkin ağırlık · ölçek 1 tutulur",
              )}
            </small>
          </div>
        )}
        <div className="world-tools">
          <button
            aria-label={t("Rotate model", "Modeli döndür")}
            onClick={() => setAngle((a) => (a === 0 ? 35 : 0))}
          >
            <RotateCcw size={14} />
            {t("Rotate", "Döndür")}
          </button>
          <span>
            {t("Block", "Blok")} {layer} · {t("representative", "temsili")}
          </span>
        </div>
      </div>
      <p className="world-total">
        {fmt(p.frozen)} {t("frozen", "donmuş")} <span>+</span>{" "}
        {fmt(p.trainable)} {t("trainable", "eğitilebilir")}
      </p>
      <div className="world-legend">
        <span>
          <LockKeyhole size={13} />
          {t("Frozen · no update", "Donmuş · güncellenmez")}
        </span>
        <span>
          <Pencil size={13} />
          {t("Trainable · updated", "Eğitilebilir · güncellenir")}
        </span>
      </div>
      <p className="caption">
        {t(
          `Structural abstraction: 6 representative blocks for ${m.layerCount} layers. Geometry is not proportional to parameters.`,
          `${m.layerCount} katman için 6 temsili blok. Geometri parametre sayısıyla orantılı değildir.`,
        )}
      </p>
    </section>
  );
}
