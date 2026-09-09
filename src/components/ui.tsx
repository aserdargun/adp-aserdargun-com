import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Locale } from "../core/types";
import { ArrowUpRight, Info } from "lucide-react";
export const LocaleContext = createContext<Locale>("en");
export const useT = () => {
  const locale = useContext(LocaleContext);
  return (en: string, tr: string) => (locale === "tr" ? tr : en);
};
export const fmt = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(n % 1e9 ? 2 : 0)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}K`
        : `${n}`;
export const bytes = (n: number) =>
  n >= 2 ** 30
    ? `${(n / 2 ** 30).toFixed(1)} GiB`
    : `${(n / 2 ** 20).toFixed(1)} MiB`;
export function Badge({
  kind = "calculated",
}: {
  kind?: "calculated" | "estimated" | "synthetic" | "input" | "verified";
}) {
  const t = useT();
  const labels = {
    calculated: t("Calculated", "Hesaplandı"),
    estimated: t("Estimated", "Tahmini"),
    synthetic: t("Synthetic", "Sentetik"),
    input: t("User input", "Kullanıcı girdisi"),
    verified: t("Verified source", "Doğrulanmış kaynak"),
  };
  return <span className={`badge ${kind}`}>{labels[kind]}</span>;
}
export function SectionTitle({
  number,
  title,
  detail,
  kind,
}: {
  number?: string;
  title: string;
  detail?: string;
  kind?: "calculated" | "estimated" | "synthetic";
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>
          {number && <span>{number}</span>}
          {title}
        </h2>
        {detail && <p>{detail}</p>}
      </div>
      {kind && <Badge kind={kind} />}
    </div>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Info size={16} />
      <div>{children}</div>
    </div>
  );
}
export function External({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <a
      className="external"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={15} />
      <span className="sr-only">
        {t("(opens a new tab)", "(yeni sekmede açılır)")}
      </span>
    </a>
  );
}
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
