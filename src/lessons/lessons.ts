import type { AdaptationConfig, Text } from "../core/types";
export type Tab =
  | "adapt"
  | "parameters"
  | "memory"
  | "data"
  | "train"
  | "evaluate"
  | "compare";
export interface Lesson {
  title: Text;
  body: Text;
  action: Text;
  tab: Tab;
  patch?: Partial<AdaptationConfig>;
}
export const lessons: Lesson[] = [
  {
    title: {
      en: "Start with inherited capability",
      tr: "Miras alınan yetenekle başla",
    },
    body: {
      en: "A base model already contains learned patterns. Using it runs a forward pass; adapting it changes selected parameters. Inspect the locked base blocks.",
      tr: "Temel model öğrenilmiş örüntüler içerir. Kullanmak ileri geçiş çalıştırır; uyarlamak seçili parametreleri değiştirir. Kilitli temel blokları inceleyin.",
    },
    action: { en: "Inspect the base", tr: "Temeli incele" },
    tab: "adapt",
  },
  {
    title: {
      en: "Define the behavior target",
      tr: "Davranış hedefini tanımla",
    },
    body: {
      en: "Our fictional support task is domain-specific QA. SFT pairs a question with a desired response. The goal is useful held-out behavior, not simply lower training loss.",
      tr: "Kurgusal destek görevi alana özel soru-cevaptır. SFT soruyu hedef yanıtla eşler. Amaç yalnız düşük eğitim kaybı değil, ayrılmış veride yararlı davranıştır.",
    },
    action: { en: "Inspect a sample", tr: "Bir örneği incele" },
    tab: "data",
  },
  {
    title: {
      en: "Choose what the model sees",
      tr: "Modelin ne göreceğini seç",
    },
    body: {
      en: "Compare 5K clean rows with 50K noisy rows. Inspect duplicates, contradictory targets and five-task coverage. Keep validation and test separate.",
      tr: "5 bin temiz satırı 50 bin gürültülü satırla karşılaştırın. Tekrarları, çelişkili hedefleri ve beş görev kapsamını inceleyin. Doğrulama ve testi ayrı tutun.",
    },
    action: { en: "Try noisy data", tr: "Gürültülü veriyi dene" },
    tab: "data",
    patch: { dataset: "noisy", duplicates: 35 },
  },
  {
    title: { en: "Choose the adaptation method", tr: "Uyarlama yöntemini seç" },
    body: {
      en: "Full FT updates the base. LoRA freezes it and learns A and B. QLoRA stores the frozen base in quantized form; the adapters remain at higher precision.",
      tr: "Full FT temeli günceller. LoRA onu dondurup A ve B’yi öğrenir. QLoRA donmuş temeli kuantize saklar; adaptörler daha yüksek hassasiyette kalır.",
    },
    action: { en: "Try Full FT", tr: "Full FT dene" },
    tab: "adapt",
    patch: { dataset: "clean", duplicates: 2, method: "full" },
  },
  {
    title: { en: "Count what actually learns", tr: "Gerçekte öğreneni say" },
    body: {
      en: "For each targeted projection, count r × (input + output) parameters. Increase rank and observe capacity grow without a promise of better quality.",
      tr: "Her hedef izdüşüm için r × (girdi + çıktı) parametre sayın. Rank artırıldığında kapasitenin büyüdüğünü, kalitenin garanti edilmediğini gözlemleyin.",
    },
    action: { en: "Open rank lab", tr: "Rank laboratuvarını aç" },
    tab: "parameters",
    patch: { method: "lora", rank: 16 },
  },
  {
    title: { en: "Plan training memory", tr: "Eğitim belleğini planla" },
    body: {
      en: "Weights are only one component. Gradients, optimizer states, master copies, activations and workspace all matter. Try 14B on a 24 GiB educational device.",
      tr: "Ağırlıklar yalnızca bir bileşendir. Gradyan, optimizer, ana kopya, aktivasyon ve çalışma alanı önemlidir. 24 GiB eğitim cihazında 14B deneyin.",
    },
    action: { en: "Try the memory constraint", tr: "Bellek sınırını dene" },
    tab: "memory",
    patch: { model: "14b", method: "qlora", deviceGiB: 24 },
  },
  {
    title: {
      en: "Follow an optimizer update",
      tr: "Optimizer güncellemesini izle",
    },
    body: {
      en: "Play or step from batch to forward, loss, backward and update. Gradients accumulate over micro-batches; only trainable parameters receive updates.",
      tr: "Yığından ileri geçişe, kayba, geri yayılıma ve güncellemeye oynatın ya da adımlayın. Gradyanlar mikro yığınlarda birikir; yalnız eğitilebilir parametreler güncellenir.",
    },
    action: { en: "Prepare a training run", tr: "Eğitim deneyini hazırla" },
    tab: "train",
    patch: { model: "7b", method: "lora", epochs: 3 },
  },
  {
    title: {
      en: "Low loss can hide overfitting",
      tr: "Düşük kayıp aşırı uyumu gizleyebilir",
    },
    body: {
      en: "Set 10 epochs and replay the experiment. The synthetic training curve falls while validation eventually rises. Longer training is not proof of generalization.",
      tr: "10 epoch ayarlayıp deneyi oynatın. Sentetik eğitim eğrisi düşerken doğrulama sonunda yükselir. Uzun eğitim genelleme kanıtı değildir.",
    },
    action: { en: "Try 10 epochs", tr: "10 epoch dene" },
    tab: "train",
    patch: { epochs: 10 },
  },
  {
    title: {
      en: "Compare against the baseline",
      tr: "Başlangıç değeriyle karşılaştır",
    },
    body: {
      en: "Complete training, then evaluate. Domain QA can improve while out-of-domain retention regresses. Six dimensions expose trade-offs that one score would hide.",
      tr: "Eğitimi tamamlayıp değerlendirin. Alan soru-cevap iyileşirken alan dışı yetenek gerileyebilir. Altı boyut, tek skorun gizleyeceği ödünleşimleri gösterir.",
    },
    action: { en: "Inspect evaluation", tr: "Değerlendirmeyi incele" },
    tab: "evaluate",
  },
  {
    title: {
      en: "Require evidence before release",
      tr: "Yayından önce kanıt iste",
    },
    body: {
      en: "Check every contract clause. Leakage, poor generalization or excessive regression block readiness. Adaptation means choosing what to change, what to learn from, and how to prove it helped.",
      tr: "Sözleşmenin her maddesini kontrol edin. Sızıntı, zayıf genelleme veya aşırı gerileme hazır olmayı engeller. Uyarlama neyin değişeceğini, hangi veriden öğrenileceğini ve yararın nasıl kanıtlanacağını seçmektir.",
    },
    action: { en: "Review the release gate", tr: "Yayın kapısını incele" },
    tab: "evaluate",
  },
];
export const scenarios: {
  id: string;
  name: Text;
  tab: Tab;
  patch: Partial<AdaptationConfig>;
}[] = [
  {
    id: "domain",
    name: { en: "01 Domain QA", tr: "01 Alan soru-cevap" },
    tab: "adapt",
    patch: {},
  },
  {
    id: "quality",
    name: { en: "02 Data quality", tr: "02 Veri kalitesi" },
    tab: "data",
    patch: { dataset: "noisy", duplicates: 35 },
  },
  {
    id: "overfit",
    name: { en: "03 Overfitting", tr: "03 Aşırı uyum" },
    tab: "train",
    patch: { epochs: 10 },
  },
  {
    id: "memory",
    name: { en: "04 Memory constraint", tr: "04 Bellek sınırı" },
    tab: "memory",
    patch: { model: "14b", method: "lora" },
  },
  {
    id: "rank",
    name: { en: "05 Rank explorer", tr: "05 Rank keşfi" },
    tab: "parameters",
    patch: { rank: 8 },
  },
];
