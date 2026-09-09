import type { Locale } from "../core/types";
export const links = (lang: Locale) => ({
  usl: `https://usl.aserdargun.com/${lang}/learn/lora/`,
  dcl: `https://dcl.aserdargun.com/?lang=${lang}`,
  tfl: `https://tfl.aserdargun.com/?lang=${lang}`,
  gex: `https://gex.aserdargun.com/gex/tensor?lang=${lang}`,
  evl: `https://evl.aserdargun.com/${lang}/`,
});
