import { useContext } from "react";
import type {
  AdaptationConfig,
  CurvePoint,
  ExperimentRun,
} from "../core/types";
import { replay } from "../simulation/engine";
import {
  SectionTitle,
  LocaleContext,
  External,
  Note,
  Stat,
  fmt,
  useT,
} from "./ui";
import { links } from "../integrations/links";
export function LossChart({
  points,
  epochs,
}: {
  points: CurvePoint[];
  epochs: number;
}) {
  const t = useT(),
    width = 720,
    height = 240,
    pad = 38,
    maxY = Math.max(3, ...points.flatMap((p) => [p.training, p.validation]));
  const xy = (epoch: number, value: number) =>
    `${pad + (epoch / epochs) * (width - pad * 2)},${height - pad - (value / maxY) * (height - pad * 2)}`;
  const last = points.at(-1),
    overfit =
      points.length > 3 &&
      last!.validation > Math.min(...points.map((p) => p.validation)) + 0.08;
  return (
    <div className="loss-chart">
      <div className="chart-legend">
        <span>
          <i />
          {t("Training loss", "Eğitim kaybı")}
        </span>
        <span>
          <i />
          {t("Validation loss", "Doğrulama kaybı")}
        </span>
        {overfit && <b className="warning">{t("OVERFITTING", "AŞIRI UYUM")}</b>}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t(
          `Simulated learning curve. Training ${last?.training.toFixed(2)}, validation ${last?.validation.toFixed(2)}. ${overfit ? "Training loss is falling while validation worsens." : ""}`,
          `Simüle öğrenme eğrisi. Eğitim ${last?.training.toFixed(2)}, doğrulama ${last?.validation.toFixed(2)}. ${overfit ? "Eğitim kaybı düşerken doğrulama kötüleşiyor." : ""}`,
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1={pad}
              y1={height - pad - (i / 3) * (height - pad * 2)}
              x2={width - pad}
              y2={height - pad - (i / 3) * (height - pad * 2)}
              stroke="#dfe5e8"
              strokeDasharray="3 5"
            />
            <text x="6" y={height - pad - (i / 3) * (height - pad * 2) + 4}>
              {((maxY * i) / 3).toFixed(1)}
            </text>
          </g>
        ))}
        {Array.from({ length: epochs + 1 }, (_, i) => (
          <text
            key={i}
            x={pad + (i / epochs) * (width - pad * 2)}
            y={height - 12}
            textAnchor="middle"
          >
            {i}
          </text>
        ))}
        <polyline
          fill="none"
          stroke="#087f6b"
          strokeWidth="3"
          points={points.map((p) => xy(p.epoch, p.training)).join(" ")}
        />
        <polyline
          fill="none"
          stroke="#b87832"
          strokeWidth="3"
          strokeDasharray="7 4"
          points={points.map((p) => xy(p.epoch, p.validation)).join(" ")}
        />
        {last && (
          <circle
            cx={xy(last.epoch, last.training).split(",")[0]}
            cy={xy(last.epoch, last.training).split(",")[1]}
            r="4"
            fill="#087f6b"
          />
        )}
      </svg>
      <p className="caption">
        {t(
          "X: epochs · Y: unitless synthetic loss. Fitting training data does not establish generalization.",
          "X: epoch · Y: birimsiz sentetik kayıp. Eğitim verisine uyum genellemeyi kanıtlamaz.",
        )}
      </p>
    </div>
  );
}
export function TrainingLab({
  config: c,
  run,
  cursor,
  change,
  onEvaluate,
}: {
  config: AdaptationConfig;
  run: ExperimentRun | null;
  cursor: number;
  change: (patch: Partial<AdaptationConfig>) => void;
  onEvaluate: () => void;
}) {
  const t = useT(),
    lang = useContext(LocaleContext),
    state = run ? replay(run, cursor) : null;
  const phases = [
    "BATCH_STARTED",
    "FORWARD_COMPLETED",
    "LOSS_COMPUTED",
    "BACKWARD_COMPLETED",
    "OPTIMIZER_STEP",
  ];
  const names = [
    t("Batch", "Yığın"),
    t("Forward", "İleri"),
    t("Loss", "Kayıp"),
    t("Backward", "Geri"),
    t("Update", "Güncelle"),
  ];
  return (
    <div className="lab-content">
      <section className="panel">
        <SectionTitle
          title={t(
            "Training is a loop. Learning is a hypothesis.",
            "Eğitim bir döngüdür. Öğrenme bir hipotezdir.",
          )}
          kind="synthetic"
        />
        <div className="training-options">
          <label>
            {t("Epochs", "Epoch")}
            <select
              value={c.epochs}
              onChange={(e) => change({ epochs: +e.target.value })}
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <p>
            {t(
              "One epoch traverses the prepared train split once. Change epochs, then start a new simulation.",
              "Bir epoch, hazırlanmış eğitim bölümünü bir kez dolaşır. Epoch değiştirip yeni simülasyon başlatın.",
            )}
          </p>
        </div>
        <div className="loop">
          {phases.map((phase, i) => (
            <div
              key={phase}
              className={state?.current.type === phase ? "active" : ""}
            >
              <span>0{i + 1}</span>
              <b>{names[i]}</b>
              <small>
                {i === 4
                  ? c.method === "full"
                    ? "W"
                    : "A + B"
                  : ["x → tokens", "ŷ = model(x)", "ŷ ↔ target", "∂L / ∂θ"][i]}
              </small>
            </div>
          ))}
        </div>
        <Note>
          {t(
            "SFT: input tokens → predicted tokens → desired output → loss → backpropagation → selected parameter updates. Prompt positions are conceptually masked; the target response provides supervision.",
            "SFT: girdi tokenları → tahmin edilen tokenlar → hedef çıktı → kayıp → geri yayılım → seçili parametreleri güncelleme. İstem konumları kavramsal olarak maskelenir; gözetimi hedef yanıt sağlar.",
          )}
        </Note>
        <div className="formula">
          {c.microBatch} × {c.accumulation} = {c.microBatch * c.accumulation}{" "}
          {t("effective batch · single device", "etkin yığın · tek cihaz")}
        </div>
        <p>
          {t(
            "Accumulate gradients over micro-batches, then take an optimizer step. A partial final group is flushed at each epoch boundary.",
            "Mikro yığınlarda gradyanları biriktirin, sonra optimizer adımı atın. Son kısmi grup her epoch sonunda uygulanır.",
          )}
        </p>
        {run && state ? (
          <>
            <div className="stats inline">
              <Stat
                value={fmt(state.updates)}
                label={`${t("optimizer steps", "optimizer adımı")} / ${fmt(run.optimizerSteps)}`}
              />
              <Stat
                value={state.current.epoch.toFixed(2)}
                label={`${t("epoch", "epoch")} / ${c.epochs}`}
              />
              <Stat
                value={fmt(run.tokenExposure)}
                label={t(
                  "planned token exposure",
                  "planlanan token maruziyeti",
                )}
              />
              <Stat
                value={run.computeUnits.toFixed(1)}
                label={t("authored compute units", "kurgusal hesap birimi")}
              />
            </div>
            <LossChart points={state.curve} epochs={c.epochs} />
            {state.trainingComplete && !state.evaluated && (
              <div className="training-done">
                <b>
                  {t(
                    "Checkpoint simulated. Evaluation is still required.",
                    "Kontrol noktası simüle edildi. Değerlendirme hâlâ gerekli.",
                  )}
                </b>
                <button className="primary" onClick={onEvaluate}>
                  {t("Evaluate", "Değerlendir")}
                </button>
              </div>
            )}
            <details className="events">
              <summary>
                {t("Inspect the event timeline", "Olay çizelgesini incele")} ·{" "}
                {cursor + 1}/{run.events.length}
              </summary>
              <ol>
                {run.events
                  .slice(Math.max(0, cursor - 19), cursor + 1)
                  .map((e) => (
                    <li key={e.tick}>
                      <code>t{e.tick}</code>
                      <b>{e.type}</b>
                      <span>
                        e{e.epoch.toFixed(2)}
                        {e.microBatches ? ` · ${e.microBatches} μB` : ""}
                        {e.optimizerSteps
                          ? ` · ${e.optimizerSteps} ${t("updates", "güncelleme")}`
                          : ""}
                      </span>
                    </li>
                  ))}
              </ol>
            </details>
          </>
        ) : (
          <div className="empty-state">
            <h3>
              {t(
                "Ready for a controlled experiment",
                "Kontrollü bir deneye hazır",
              )}
            </h3>
            <p>
              {t(
                "Start or step the simulation using the toolbar above. Curves emerge from optimizer events.",
                "Yukarıdaki araç çubuğuyla simülasyonu başlatın ya da adımlayın. Eğriler optimizer olaylarından oluşur.",
              )}
            </p>
          </div>
        )}
        <Note>
          {t(
            "Playback uses up to 12 representative update groups per epoch. Each group summarizes the displayed micro-batches; it is not one GPU batch. Synthetic ticks are not seconds.",
            "Oynatım her epoch için en fazla 12 temsili güncelleme grubu kullanır. Her grup gösterilen mikro yığınları özetler; tek GPU yığını değildir. Sentetik adımlar saniye değildir.",
          )}
        </Note>
        <External href={links(lang).gex}>
          {t(
            "Follow matrix computation → GEX",
            "Matris hesaplamasını izle → GEX",
          )}
        </External>
      </section>
    </div>
  );
}
