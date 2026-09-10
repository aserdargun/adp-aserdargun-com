import { useEffect, useMemo, useRef, useState } from "react";
import {
  SlidersHorizontal,
  Layers3,
  Database,
  Files,
  Play,
  Pause,
  StepForward,
  RotateCcw,
  ChartNoAxesCombined,
  Scale,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
} from "lucide-react";
import type {
  AdaptationConfig,
  ExperimentRun,
  Locale,
  Text,
} from "./core/types";
import { defaultConfig, getModel } from "./core/models";
import { parameters } from "./core/parameters";
import { memory } from "./core/memory";
import { restoreRuns, serializeRuns, runsStorageKey } from "./core/session";
import { createRun, replay } from "./simulation/engine";
import { lessons, scenarios } from "./lessons/lessons";
import type { Tab } from "./lessons/lessons";
import { links } from "./integrations/links";
import {
  LocaleContext,
  SectionTitle,
  External,
  Note,
  Stat,
  Badge,
  fmt,
  bytes,
  useT,
} from "./components/ui";
import { Controls } from "./components/Controls";
import { MemoryPanel } from "./components/MemoryPanel";
import { ParameterWorld } from "./visualization/ParameterWorld";
import { MethodComparison, ParameterLab } from "./components/ParameterLab";
import { DataLab } from "./components/DataLab";
import { TrainingLab } from "./components/TrainingLab";
import { EvaluationLab } from "./components/EvaluationLab";
import { CompareLab } from "./components/CompareLab";
const tabs: Tab[] = [
  "adapt",
  "parameters",
  "memory",
  "data",
  "train",
  "evaluate",
  "compare",
];
function readRuns() {
  try {
    return {
      ...restoreRuns(sessionStorage.getItem(runsStorageKey)),
      unavailable: false,
    };
  } catch {
    return { runs: [], rejected: 0, unavailable: true };
  }
}
function AppContent({
  lang,
  setLang,
}: {
  lang: Locale;
  setLang: (lang: Locale) => void;
}) {
  const t = useT();
  const [config, setConfig] = useState<AdaptationConfig>(() =>
    structuredClone(defaultConfig),
  );
  const [tab, setTab] = useState<Tab>(() =>
    tabs.includes(location.hash.slice(1) as Tab)
      ? (location.hash.slice(1) as Tab)
      : "adapt",
  );
  const [restored] = useState(readRuns);
  const [run, setRun] = useState<ExperimentRun | null>(null),
    [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [runs, setRuns] = useState<ExperimentRun[]>(restored.runs);
  const nextId = useRef(
    Math.max(0, ...runs.map((r) => +r.id.split("-").at(-1)!)) + 1,
  );
  const [lesson, setLesson] = useState<number | null>(null),
    [scenario, setScenario] = useState("domain"),
    [notice, setNotice] = useState<Text | null>(null);
  const message = (en: string, tr: string): Text => ({ en, tr });
  const state = useMemo(
      () => (run ? replay(run, cursor) : null),
      [run, cursor],
    ),
    p = useMemo(() => parameters(config), [config]),
    m = useMemo(() => memory(config), [config]),
    model = getModel(config.model);
  const destination = links(lang);
  const labels = [
    t("Adapt", "Uyarla"),
    t("Parameters", "Parametreler"),
    t("Memory", "Bellek"),
    t("Data", "Veri"),
    t("Train", "Eğit"),
    t("Evaluate", "Değerlendir"),
    t("Compare", "Karşılaştır"),
  ];
  const icons = [
    SlidersHorizontal,
    Layers3,
    Database,
    Files,
    Play,
    ChartNoAxesCombined,
    Scale,
  ];
  function navigate(next: Tab) {
    if (next === tab) return;
    setTab(next);
    history.pushState(
      null,
      "",
      `${location.pathname}${location.search}#${next}`,
    );
  }
  function change(patch: Partial<AdaptationConfig>) {
    const next = { ...config, ...patch };
    const signature = (c: AdaptationConfig) =>
      JSON.stringify({ ...c, targets: [...c.targets].sort() });
    if (signature(next) === signature(config)) return;
    setConfig(next);
    setScenario("custom");
    setPlaying(false);
    setRun(null);
    setCursor(0);
    setNotice(
      message(
        "Configuration changed · start a new simulation.",
        "Yapılandırma değişti · yeni simülasyon başlatın.",
      ),
    );
  }
  function makeRun() {
    const r = createRun(
      config,
      `ADP-RUN-${String(nextId.current++).padStart(3, "0")}`,
    );
    setRun(r);
    setCursor(0);
    setNotice(null);
    return r;
  }
  function start() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (!run || state?.complete) {
      makeRun();
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNotice(
        message(
          "Reduced motion: use Step or Complete training.",
          "Azaltılmış hareket: Adım veya Eğitimi tamamla kullanın.",
        ),
      );
      setPlaying(false);
    } else setPlaying(true);
  }
  function step() {
    setPlaying(false);
    if (!run) {
      makeRun();
      return;
    }
    if (state?.trainingComplete) return;
    setCursor((i) => Math.min(i + 1, run.events.length - 1));
  }
  function finishTraining() {
    const r = run ?? makeRun();
    setPlaying(false);
    setCursor(r.events.findIndex((e) => e.type === "CHECKPOINT_SAVED"));
    navigate("train");
  }
  function doEvaluate() {
    if (!run || !state?.trainingComplete) {
      navigate("evaluate");
      return;
    }
    setPlaying(false);
    setCursor(run.events.length - 1);
    navigate("evaluate");
  }
  function save() {
    if (!run || !state?.evaluated) return;
    if (runs.some((r) => r.id === run.id)) {
      setNotice(
        message("This run is already saved.", "Bu deney zaten kayıtlı."),
      );
      navigate("compare");
      return;
    }
    if (runs.length === 3) {
      setNotice(
        message(
          "Three runs saved. Remove one to save another.",
          "Üç deney kayıtlı. Yenisini kaydetmek için birini kaldırın.",
        ),
      );
      navigate("compare");
      return;
    }
    setRuns((rs) => [...rs, structuredClone(run)]);
    setNotice(message(`${run.id} saved`, `${run.id} kaydedildi`));
    navigate("compare");
  }
  function reset() {
    setPlaying(false);
    setCursor(0);
    if (run) setRun(createRun(run.config, run.id));
    setNotice(
      message(
        "Reset to the start of this configuration.",
        "Bu yapılandırmanın başlangıcına dönüldü.",
      ),
    );
  }
  function applyLesson(i: number) {
    const l = lessons[i];
    setLesson(i);
    if (i === 0) change(structuredClone(defaultConfig));
    else if (l.patch) change(l.patch);
    navigate(l.tab);
  }
  useEffect(() => {
    try {
      sessionStorage.setItem(runsStorageKey, serializeRuns(runs));
    } catch {
      setNotice(
        message(
          "Storage unavailable; runs remain available until reload.",
          "Depolama kullanılamıyor; deneyler sayfa yenilenene kadar tutulur.",
        ),
      );
    }
  }, [runs]);
  useEffect(() => {
    if (!playing || !run) return;
    const id = setInterval(
      () =>
        setCursor((i) => {
          const next = Math.min(
            i + 1,
            run.events.findIndex((event) => event.type === "CHECKPOINT_SAVED"),
          );
          return next;
        }),
      110,
    );
    return () => clearInterval(id);
  }, [playing, run]);
  useEffect(() => {
    if (state?.trainingComplete) setPlaying(false);
  }, [state?.trainingComplete]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
      const el = e.target as HTMLElement;
      if (
        el.closest("input,select,textarea,button,a,summary,[contenteditable]")
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        start();
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        step();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    const onHash = () => {
      const value = location.hash.slice(1) as Tab;
      if (tabs.includes(value)) setTab(value);
      else if (!value) setTab("adapt");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const assumptions = useMemo(
    () => [
      t(
        "CALCULATED values use educational inputs. ESTIMATED memory is conditional. SYNTHETIC curves and scores are authored, never benchmarks. VERIFIED labels apply only to cited sources. No MEASURED result exists in CORE.",
        "HESAPLANAN değerler eğitim girdilerini kullanır. TAHMİNİ bellek koşulludur. SENTETİK eğri ve skorlar kurgusaldır; benchmark değildir. DOĞRULANMIŞ etiketi yalnız atıf yapılan kaynaklar içindir. CORE’da ÖLÇÜLMÜŞ sonuç yoktur.",
      ),
      t(
        "Profiles are generic, with rounded parameter budgets and illustrative dimensions. No actual model architecture, training or checkpoint is claimed.",
        "Profiller yuvarlatılmış parametre bütçeleri ve temsili boyutlarla geneldir. Gerçek model mimarisi, eğitim veya kontrol noktası iddiası yoktur.",
      ),
      t(
        "BF16/FP16 compute and trainable storage use 2 bytes; FP32 uses 4. QLoRA base uses 4 bits + 0.127 bits/parameter illustrative metadata. Adapters remain at the selected precision.",
        "BF16/FP16 hesap ve eğitilebilir depolama 2 bayt, FP32 4 bayt kullanır. QLoRA temeli 4 bit + parametre başına temsili 0,127 bit meta veri kullanır. Adaptörler seçili hassasiyette kalır.",
      ),
      t(
        "Adam moments = 8 bytes/trainable parameter; gradients = 4; FP32 master = 4 extra only for 16-bit training. Activations = μB × S × H × L × bytes × 8 × (checkpointing ? 0.3 : 1). Workspace = 1 GiB + 5% subtotal.",
        "Adam durumu = eğitilebilir parametre başına 8 bayt; gradyan = 4; FP32 ana kopya = yalnız 16-bit eğitimde ek 4. Aktivasyon = μB × S × H × L × bayt × 8 × (kontrol noktası ? 0,3 : 1). Çalışma alanı = 1 GiB + ara toplamın %5’i.",
      ),
      t(
        "No GQA, gated MLP, offload, sharding, fragmentation or explicit S² attention allocation. Checkpointing and workspace coefficients are assumptions, not measured fits. All capacities use GiB, not GB.",
        "GQA, kapılı MLP, dış belleğe taşıma, parçalama, bellek parçalanması veya açık S² dikkat tahsisi yoktur. Kontrol noktası ve çalışma alanı katsayıları varsayımdır; ölçümden türetilmez. Kapasiteler GB değil GiB kullanır.",
      ),
      t(
        "Synthetic quality uses exposure, separate noise/contradiction/irrelevance/difficulty/coverage terms and an explicit overfit penalty. Rank and model size do not predict quality. Seed changes bounded jitter, not the rules.",
        "Sentetik kalite; maruziyeti, ayrı gürültü/çelişki/ilgisizlik/zorluk/kapsam terimlerini ve açık aşırı uyum cezasını kullanır. Rank ve model boyutu kaliteyi tahmin etmez. Tohum kuralları değil sınırlı sapmayı değiştirir.",
      ),
      t(
        "Compute index = million training tokens × model/7B × method factor (FT 3, LoRA 2, QLoRA 2.3) × checkpoint factor (1.3 or 1). Arbitrary teaching units, not time, FLOPs or dollars.",
        "Hesap indeksi = milyon eğitim tokenı × model/7B × yöntem çarpanı (FT 3, LoRA 2, QLoRA 2,3) × kontrol noktası çarpanı (1,3 veya 1). Kurgusal eğitim birimleri; zaman, FLOP veya para değil.",
      ),
    ],
    [lang],
  );
  return (
    <>
      <a className="skip-link" href="#main">
        {t("Skip to laboratory", "Laboratuvara geç")}
      </a>
      <header className="site-header">
        <a
          className="brand"
          href="#adapt"
          onClick={(event) => {
            event.preventDefault();
            navigate("adapt");
          }}
        >
          <span className="brand-mark">ADP</span>
          <span>
            <b>ADP</b>
            <i>/</i>
            {t("Model Adaptation Laboratory", "Model Uyarlama Laboratuvarı")}
          </span>
        </a>
        <div className="header-right">
          <a
            href="https://aserdargun.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            aserdargun.com
          </a>
          <div className="languages" aria-label={t("Language", "Dil")}>
            {(["en", "tr"] as Locale[]).map((l) => (
              <button
                key={l}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="intro">
          <h1>
            {t(
              "See how a base model becomes adapted to a task.",
              "Bir temel modelin göreve nasıl uyarlandığını görün.",
            )}
          </h1>
          <p>
            {t(
              "Change what learns. See what it costs. Evaluate what changed.",
              "Öğreneni değiştirin. Kaynak ihtiyacını görün. Değişimi değerlendirin.",
            )}
          </p>
        </div>
        <div className="experiment-bar">
          <label>
            {t("Experiment", "Deney")}
            <select
              aria-label={t("Experiment scenario", "Deney senaryosu")}
              value={scenario}
              onChange={(e) => {
                const s = scenarios.find((s) => s.id === e.target.value)!;
                change({ ...structuredClone(defaultConfig), ...s.patch });
                setScenario(s.id);
                setLesson(null);
                navigate(s.tab);
              }}
            >
              {scenario === "custom" && (
                <option value="custom" disabled>
                  {t("Custom experiment", "Özel deney")}
                </option>
              )}
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name[lang]}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => (lesson === null ? applyLesson(0) : setLesson(null))}
            aria-expanded={lesson !== null}
          >
            <BookOpen size={15} />
            Adaptation 101
            <span className="guide-label">
              {t("Guided lesson", "Rehberli ders")}
            </span>
          </button>
        </div>
        {lesson !== null && (
          <section className="lesson panel" aria-label="Adaptation 101">
            <div>
              <span className="lesson-index">{lesson + 1} / 10</span>
              <h2>{lessons[lesson].title[lang]}</h2>
              <p>{lessons[lesson].body[lang]}</p>
            </div>
            <div className="lesson-actions">
              <button
                disabled={lesson === 0}
                aria-label={t("Previous chapter", "Önceki bölüm")}
                onClick={() => applyLesson(lesson - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button onClick={() => applyLesson(lesson)}>
                {lessons[lesson].action[lang]}
              </button>
              <button
                disabled={lesson === 9}
                aria-label={t("Next chapter", "Sonraki bölüm")}
                onClick={() => applyLesson(lesson + 1)}
              >
                <ChevronRight size={17} />
              </button>
              <button
                aria-label={t("Close lesson", "Dersi kapat")}
                onClick={() => setLesson(null)}
              >
                <X size={17} />
              </button>
            </div>
          </section>
        )}
        <nav
          className="tabs"
          aria-label={t("Laboratory modes", "Laboratuvar modları")}
        >
          {tabs.map((value, i) => {
            const Icon = icons[i];
            return (
              <button
                key={value}
                aria-current={tab === value ? "page" : undefined}
                onClick={() => navigate(value)}
              >
                <Icon size={17} />
                {labels[i]}
                {value === "compare" && runs.length > 0 && (
                  <small>{runs.length}</small>
                )}
              </button>
            );
          })}
        </nav>
        <div className="toolbar">
          <div>
            <button
              className="primary"
              onClick={start}
              disabled={Boolean(state?.trainingComplete && !state?.complete)}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
              {playing
                ? t("Pause", "Duraklat")
                : run && !state?.complete
                  ? t("Play", "Oynat")
                  : t("Start simulation", "Simülasyonu başlat")}
            </button>
            <button onClick={step} disabled={state?.trainingComplete}>
              <StepForward size={16} />
              {t("Step", "Adım")}
            </button>
            <button onClick={reset}>
              <RotateCcw size={15} />
              {t("Reset", "Sıfırla")}
            </button>
            {!state?.trainingComplete && (
              <button onClick={finishTraining}>
                {t("Complete training", "Eğitimi tamamla")}
              </button>
            )}
            {state?.trainingComplete && !state?.evaluated && (
              <button className="primary" onClick={doEvaluate}>
                {t("Evaluate checkpoint", "Kontrol noktasını değerlendir")}
              </button>
            )}
            {state?.evaluated && (
              <button onClick={save}>
                <Save size={16} />
                {t("Save run", "Deneyi kaydet")}
              </button>
            )}
          </div>
          <span className="run-status">
            {run?.id ?? t("No active run", "Etkin deney yok")} ·{" "}
            {t("Synthetic", "Sentetik")} · {t("seed", "tohum")} {config.seed}
            {state && ` · t${cursor}`}
          </span>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice[lang]}
          </p>
        )}
        {(restored.rejected > 0 || restored.unavailable) && (
          <p className="notice" role="status">
            {restored.unavailable
              ? t(
                  "Session storage is unavailable. Export your saved experiments before reloading.",
                  "Oturum depolaması kullanılamıyor. Yenilemeden önce kayıtlı deneylerinizi dışa aktarın.",
                )
              : t(
                  `${restored.rejected} damaged or unsupported saved record(s) skipped. Valid experiments were recovered.`,
                  `${restored.rejected} bozuk veya desteklenmeyen kayıt atlandı. Geçerli deneyler kurtarıldı.`,
                )}
          </p>
        )}
        {run && (
          <div
            className="run-progress"
            aria-label={t("Simulation progress", "Simülasyon ilerlemesi")}
          >
            <progress
              max={run.optimizerSteps}
              value={state?.updates ?? 0}
              aria-label={t(
                "Completed optimizer steps",
                "Tamamlanan optimizer adımları",
              )}
            />
            <span>
              {state?.evaluated
                ? t(
                    "Evaluated · ready to save",
                    "Değerlendirildi · kaydedilebilir",
                  )
                : state?.trainingComplete
                  ? t(
                      "Training complete · evaluation required",
                      "Eğitim tamamlandı · değerlendirme gerekli",
                    )
                  : t("Training simulation", "Eğitim simülasyonu")}{" "}
              · {state?.updates ?? 0} / {run.optimizerSteps}
            </span>
          </div>
        )}
        {!m.fits && (
          <p className="capacity-notice">
            <b>
              {t("Exceeds device memory", "Cihaz belleğini aşıyor")}:{" "}
              {m.giB.toFixed(1)} / {config.deviceGiB} GiB.
            </b>{" "}
            {t(
              "You can explore the synthetic simulation; this workload does not fit the selected device estimate.",
              "Sentetik simülasyonu inceleyebilirsiniz; bu iş yükü seçilen cihazın bellek tahminine sığmıyor.",
            )}
          </p>
        )}
        <div
          className={`workbench ${tab === "adapt" ? "overview" : ""} ${tab === "compare" ? "compare-mode" : ""}`}
        >
          {tab !== "compare" && <Controls config={config} change={change} />}
          {tab === "adapt" ? (
            <>
              <ParameterWorld
                config={config}
                updating={state?.current.type === "OPTIMIZER_STEP"}
              />
              <MemoryPanel config={config} />
            </>
          ) : (
            <div className="main-panel">
              {tab === "parameters" && (
                <ParameterLab config={config} change={change} />
              )}
              {tab === "memory" && (
                <>
                  <MemoryPanel config={config} expanded />
                  <MethodComparison config={config} />
                </>
              )}
              {tab === "data" && <DataLab config={config} change={change} />}
              {tab === "train" && (
                <TrainingLab
                  config={config}
                  run={run}
                  cursor={cursor}
                  change={change}
                  onEvaluate={doEvaluate}
                />
              )}
              {tab === "evaluate" && (
                <EvaluationLab
                  config={config}
                  run={run}
                  cursor={cursor}
                  onEvaluate={doEvaluate}
                  onSave={save}
                />
              )}
              {tab === "compare" && (
                <CompareLab
                  runs={runs}
                  remove={(id) =>
                    setRuns((rs) => rs.filter((r) => r.id !== id))
                  }
                />
              )}
            </div>
          )}
        </div>
        <div className="stats">
          <Stat
            value={fmt(p.trainable)}
            label={t("trainable parameters", "eğitilebilir parametre")}
          />
          <Stat
            value={`${p.percent.toFixed(2)}%`}
            label={t("of total parameters", "toplam parametre payı")}
          />
          <Stat
            value={bytes(m.artifactBytes)}
            label={
              config.method === "full"
                ? t("full weight payload", "tam ağırlık yükü")
                : t("adapter payload · A + B", "adaptör yükü · A + B")
            }
          />
        </div>
        {tab === "adapt" && (
          <>
            <MethodComparison config={config} />
            <section className="panel lifecycle">
              <SectionTitle
                title={t(
                  "Follow the adaptation lifecycle",
                  "Uyarlama yaşam döngüsünü izle",
                )}
                detail={t(
                  "Inspect every stage. Training is only part of the story.",
                  "Her aşamayı inceleyin. Eğitim sürecin yalnızca bir bölümüdür.",
                )}
              />
              <div className="stage-links">
                {[
                  [t("Base model", "Temel model"), "adapt"],
                  [t("Dataset", "Veri kümesi"), "data"],
                  [t("Preparation", "Hazırlık"), "data"],
                  [t("SFT objective", "SFT hedefi"), "train"],
                  [t("Method", "Yöntem"), "adapt"],
                  [t("Parameters", "Parametreler"), "parameters"],
                  [t("Memory", "Bellek"), "memory"],
                  [t("Training loop", "Eğitim döngüsü"), "train"],
                  [t("Checkpoint", "Kontrol noktası"), "evaluate"],
                  [t("Evaluation", "Değerlendirme"), "evaluate"],
                  [t("Adapted model", "Uyarlanmış model"), "evaluate"],
                ].map(([label, value], i) => (
                  <button key={label} onClick={() => navigate(value as Tab)}>
                    <small>{String(i + 1).padStart(2, "0")}</small>
                    {label}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
              <div className="method-story">
                <Note>
                  {config.method === "qlora"
                    ? t(
                        "QLoRA compresses the frozen base representation. Backpropagation passes through it to update higher-precision adapters. It does not update 4-bit base weights.",
                        "QLoRA donmuş temel gösterimini sıkıştırır. Geri yayılım, daha yüksek hassasiyetteki adaptörleri güncellemek için temelden geçer. 4-bit temel ağırlıkları güncellemez.",
                      )
                    : config.method === "full"
                      ? t(
                          "Full FT opens all base parameters to updates, with gradients and optimizer state across the whole model. More freedom does not guarantee a better task result.",
                          "Full FT tüm temel parametreleri güncellemeye açar; gradyan ve optimizer tüm modeli kapsar. Daha fazla serbestlik daha iyi görev sonucunu garanti etmez.",
                        )
                      : t(
                          "LoRA preserves the base weights and learns small A and B matrices. Backward computation still traverses the base; parameter-efficient does not mean free training.",
                          "LoRA temel ağırlıkları korur ve küçük A ile B matrislerini öğrenir. Geri hesaplama hâlâ temelden geçer; parametre verimliliği ücretsiz eğitim demek değildir.",
                        )}
                </Note>
                <External href={destination.usl}>
                  {t("Learn the method → USL", "Yöntemi öğren → USL")}
                </External>
              </div>
            </section>
          </>
        )}
        <details className="panel assumptions">
          <summary>
            {t(
              "Assumptions, evidence & sources",
              "Varsayımlar, kanıt ve kaynaklar",
            )}
            <Badge kind="estimated" />
          </summary>
          <p>
            <b>{model.name}</b> · H={model.hiddenSize} · L={model.layerCount} ·
            MLP={model.mlpProjectionInfo.intermediate} ·{" "}
            {t(
              "Source: ADP educational profile v1 · architecture verification: not applicable",
              "Kaynak: ADP eğitim profili v1 · mimari doğrulama: uygulanmaz",
            )}
          </p>
          <ul>
            {assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p>
            <Badge kind="verified" />{" "}
            {t(
              "Primary sources checked 2026-09-10. Sources support concepts, not the simulator’s numbers.",
              "Birincil kaynaklar 2026-09-10 tarihinde kontrol edildi. Kaynaklar kavramları destekler; simülatör sayılarını değil.",
            )}
          </p>
          <div className="source-links">
            <External href="https://arxiv.org/abs/2106.09685">
              LoRA · Hu et al.
            </External>
            <External href="https://arxiv.org/abs/2305.14314">
              QLoRA · Dettmers et al.
            </External>
            <External href="https://huggingface.co/docs/transformers/model_memory_anatomy">
              {t("Hugging Face · GPU memory", "Hugging Face · GPU belleği")}
            </External>
            <External href="/educational-model.md">
              {t("Full model specification", "Tam model tanımı")}
            </External>
          </div>
        </details>
        <section className="ecosystem">
          <div>
            <h2>
              {t(
                "Part of a connected learning system",
                "Bağlantılı bir öğrenme sisteminin parçası",
              )}
            </h2>
            <p>
              {t(
                "USL explains the landscape. ADP turns adaptation choices into inspectable experiments.",
                "USL yöntemleri ve araştırma alanını açıklar. ADP uyarlama seçimlerini incelenebilir deneylere dönüştürür.",
              )}
            </p>
            <small>GPU → GEX · LLM → TFL · USL → ADP</small>
          </div>
          <div className="ecosystem-links">
            <External href={destination.usl}>
              {t("Learn adaptation → USL", "Uyarlamayı öğren → USL")}
            </External>
            <External href={destination.dcl}>
              {t("Plan the workload → DCL", "İş yükünü planla → DCL")}
            </External>
            <External href={destination.evl}>
              {t("Evaluate behavior → EVL", "Davranışı değerlendir → EVL")}
            </External>
            <External href={destination.tfl}>
              {t("Explore serving → TFL", "Sunumu keşfet → TFL")}
            </External>
            <External href={destination.gex}>
              {t("Understand execution → GEX", "Yürütmeyi anla → GEX")}
            </External>
          </div>
        </section>
      </main>
      <footer>
        <span>
          ADP ·{" "}
          {t("Model Adaptation Laboratory", "Model Uyarlama Laboratuvarı")}
        </span>
        <span>
          {t(
            "Educational simulation. No models are trained.",
            "Eğitim simülasyonu. Gerçek model eğitilmez.",
          )}
        </span>
      </footer>
    </>
  );
}
export default function App() {
  const [lang, setLang] = useState<Locale>(() => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "tr") return q;
    try {
      return localStorage.getItem("adp-lang") === "tr" ? "tr" : "en";
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    const syncLocale = () => {
      const value = new URLSearchParams(location.search).get("lang");
      if (value === "en" || value === "tr") setLang(value);
    };
    window.addEventListener("popstate", syncLocale);
    return () => window.removeEventListener("popstate", syncLocale);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === "tr"
        ? "ADP — Model Uyarlama Laboratuvarı"
        : "ADP — Model Adaptation Laboratory";
    try {
      localStorage.setItem("adp-lang", lang);
    } catch {
      /* private mode */
    }
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
  }, [lang]);
  return (
    <LocaleContext.Provider value={lang}>
      <AppContent lang={lang} setLang={setLang} />
    </LocaleContext.Provider>
  );
}
