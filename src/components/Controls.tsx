import { useContext, useState } from "react";
import type { AdaptationConfig, Method, Target } from "../core/types";
import { models, ranks } from "../core/models";
import { datasets } from "../core/datasets";
import { LocaleContext, useT } from "./ui";
export const methodName = (method: Method) =>
  ({ full: "Full FT", lora: "LoRA", qlora: "QLoRA" })[method];
export function Methods({
  value,
  onChange,
}: {
  value: Method;
  onChange: (method: Method) => void;
}) {
  return (
    <div className="segmented">
      {(["full", "lora", "qlora"] as Method[]).map((method) => (
        <button
          key={method}
          aria-pressed={method === value}
          onClick={() => onChange(method)}
        >
          {methodName(method)}
        </button>
      ))}
    </div>
  );
}
export function Controls({
  config: c,
  change,
}: {
  config: AdaptationConfig;
  change: (patch: Partial<AdaptationConfig>) => void;
}) {
  const t = useT(),
    lang = useContext(LocaleContext),
    [advanced, setAdvanced] = useState(false);
  const presets: [string, Target[]][] = [
    [t("Q + V (attention)", "Q + V (dikkat)"), ["q", "v"]],
    [
      t("All attention projections", "Tüm dikkat izdüşümleri"),
      ["q", "k", "v", "o"],
    ],
    [t("Attention + MLP", "Dikkat + MLP"), ["q", "k", "v", "o", "up", "down"]],
  ];
  const preset = presets.findIndex(
    ([, targets]) => targets.join() === c.targets.join(),
  );
  return (
    <aside className="config-panel panel">
      <div className="section-heading">
        <div>
          <h2>
            <span>01</span>
            {t("Configure", "Yapılandır")}
          </h2>
          <p>{t("Choose what learns.", "Neyin öğreneceğini seçin.")}</p>
        </div>
      </div>
      <label>
        {t("Base model", "Temel model")}
        <select
          value={c.model}
          onChange={(e) => change({ model: e.target.value })}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {t("Educational profile", "Eğitim profili")}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Dataset", "Veri kümesi")}
        <select
          value={c.dataset}
          onChange={(e) => {
            const d = datasets.find((d) => d.id === e.target.value)!;
            change({ dataset: d.id, duplicates: d.duplication });
          }}
        >
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name[lang]} · {d.examples / 1000}K
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>{t("Adaptation method", "Uyarlama yöntemi")}</span>
        <Methods value={c.method} onChange={(method) => change({ method })} />
      </div>
      <label className={c.method === "full" ? "muted" : ""}>
        <span className="label-row">
          {t("Rank (r)", "Rank (r)")}
          <b>{c.method === "full" ? "—" : c.rank}</b>
        </span>
        <input
          aria-label={t("LoRA rank", "LoRA rank")}
          aria-valuetext={`r = ${c.rank}`}
          type="range"
          min="0"
          max="5"
          step="1"
          value={ranks.indexOf(c.rank)}
          disabled={c.method === "full"}
          onChange={(e) => change({ rank: ranks[+e.target.value] })}
        />
        <span className="range-ticks">
          <span>4</span>
          <span>8</span>
          <span>16</span>
          <span>32</span>
          <span>64</span>
          <span>128</span>
        </span>
      </label>
      <label>
        {t("Target modules", "Hedef modüller")}
        <select
          disabled={c.method === "full"}
          value={preset}
          onChange={(e) => change({ targets: presets[+e.target.value][1] })}
        >
          {preset === -1 && (
            <option value="-1">{t("Custom selection", "Özel seçim")}</option>
          )}
          {presets.map(([name], i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className="two-fields">
        <label>
          {t("Sequence cap", "Dizi sınırı")}
          <select
            value={c.sequence}
            onChange={(e) => change({ sequence: +e.target.value })}
          >
            {[512, 2048, 4096, 8192].map((n) => (
              <option key={n} value={n}>
                {n === 512 ? "512" : `${n / 1024}K`}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Micro batch", "Mikro yığın")}
          <select
            value={c.microBatch}
            onChange={(e) => change({ microBatch: +e.target.value })}
          >
            {[1, 2, 4, 8, 16].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        className="text-button advanced"
        aria-expanded={advanced}
        onClick={() => setAdvanced(!advanced)}
      >
        {advanced ? "−" : "+"}{" "}
        {t("Training & memory settings", "Eğitim ve bellek ayarları")}
      </button>
      {advanced && (
        <div className="advanced-fields">
          <div className="two-fields">
            <label>
              {t("Precision", "Hassasiyet")}
              <select
                value={c.precision}
                onChange={(e) =>
                  change({
                    precision: e.target.value as AdaptationConfig["precision"],
                  })
                }
              >
                <option value="bf16">BF16</option>
                <option value="fp16">FP16</option>
                <option value="fp32">FP32</option>
              </select>
            </label>
            <label>
              {t("Device (GiB)", "Cihaz (GiB)")}
              <select
                value={c.deviceGiB}
                onChange={(e) => change({ deviceGiB: +e.target.value })}
              >
                {[8, 16, 24, 48, 80, 192].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t("Accumulation steps", "Birikim adımları")}
            <select
              value={c.accumulation}
              onChange={(e) => change({ accumulation: +e.target.value })}
            >
              {[1, 2, 4, 8, 16, 32, 64].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={c.checkpointing}
              onChange={(e) => change({ checkpointing: e.target.checked })}
            />
            {t("Gradient checkpointing", "Gradyan kontrol noktaları")}
          </label>
          <small>
            {t(
              "Less activation memory, more recomputation.",
              "Daha az aktivasyon belleği, daha fazla yeniden hesaplama.",
            )}
          </small>
          <label>
            {t("Learning rate scenario", "Öğrenme oranı senaryosu")}
            <select
              value={c.learningRate}
              onChange={(e) =>
                change({
                  learningRate: e.target
                    .value as AdaptationConfig["learningRate"],
                })
              }
            >
              <option value="low">{t("Too low", "Çok düşük")}</option>
              <option value="reasonable">
                {t("Reasonable (synthetic)", "Makul (sentetik)")}
              </option>
              <option value="high">{t("Too high", "Çok yüksek")}</option>
            </select>
          </label>
          <label>
            {t("Seed", "Tohum")}
            <input
              type="number"
              min="0"
              max="999999"
              value={c.seed}
              onChange={(e) => {
                const n = +e.target.value;
                if (Number.isInteger(n) && n >= 0 && n <= 999999)
                  change({ seed: n });
              }}
            />
          </label>
        </div>
      )}
    </aside>
  );
}
