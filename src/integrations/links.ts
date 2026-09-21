import type { Locale } from "../core/types";
export const links = (lang: Locale) => ({
  home: `https://aserdargun.com/${lang === "tr" ? "tr/" : ""}`,
  journey: `https://aserdargun.com/${lang === "tr" ? "tr/" : ""}journey/`,
  applications: `https://aserdargun.com/${lang === "tr" ? "tr/" : ""}applications/`,
  usl: `https://usl.aserdargun.com/${lang}/learn/lora/`,
  dcl: `https://dcl.aserdargun.com/?lang=${lang}`,
  tfl: `https://tfl.aserdargun.com/?lang=${lang}`,
  gex: `https://gex.aserdargun.com/gex/tensor?lang=${lang}`,
  evl: `https://evl.aserdargun.com/${lang}/`,
});
