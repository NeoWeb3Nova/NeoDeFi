"use client";
import {
  Activity,
  Award,
  Droplets,
  Layers3,
  Repeat2,
  WalletCards,
} from "lucide-react";
import type { PageKey } from "./Dashboard";
import { BrandLockup } from "./ui/BrandMark";
import { usePreferences } from "./providers/PreferencesProvider";

export const navigationItems = [
  { key: "portfolio", labelKey: "nav.portfolio", icon: WalletCards },
  { key: "trade", labelKey: "nav.trade", icon: Repeat2 },
  { key: "stake", labelKey: "nav.stake", icon: Layers3 },
  { key: "rewards", labelKey: "nav.rewards", icon: Award },
  { key: "faucet", labelKey: "nav.faucet", icon: Droplets },
] as const;

export function Sidebar({
  page,
  onChange,
}: {
  page: PageKey;
  onChange: (page: PageKey) => void;
}) {
  const { t } = usePreferences();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-[var(--line)] bg-[var(--chrome)] px-5 py-6 shadow-[12px_0_50px_rgba(0,0,0,.18)] backdrop-blur-xl lg:flex">
      <button
        onClick={() => onChange("portfolio")}
        className="min-h-14 rounded-xl px-2 text-left"
      >
        <BrandLockup />
      </button>
      <div className="mt-8 px-3 font-mono text-[9px] uppercase tracking-[.22em] text-[#526076]">
        Protocol Console
      </div>
      <nav className="mt-3 space-y-1.5" aria-label={t("nav.main")}>
        {navigationItems.map(({ key, labelKey, icon: Icon }, index) => (
          <button
            key={key}
            aria-current={page === key ? "page" : undefined}
            onClick={() => onChange(key)}
            className={`group flex min-h-13 w-full items-center gap-3 rounded-xl border px-3.5 text-left text-[14px] font-semibold ${page === key ? "border-[var(--line-strong)] bg-[var(--primary-soft)] text-[var(--primary-strong)] shadow-[0_0_28px_rgba(60,242,195,.06)]" : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--hover)] hover:text-[var(--text)]"}`}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-lg ${page === key ? "bg-[var(--primary-soft)]" : "bg-[var(--hover)]"}`}
            >
              <Icon size={17} strokeWidth={page === key ? 2.25 : 1.8} />
            </span>
            <span>{t(labelKey)}</span>
            <span className="ml-auto font-mono text-[9px] text-[var(--muted)]">
              0{index + 1}
            </span>
          </button>
        ))}
      </nav>
      <div className="mt-auto overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
        <div className="data-grid p-4">
          <div className="flex items-center gap-2 text-[var(--neo)]">
            <Activity size={16} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[.16em]">
              Network Live
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text)]">Sepolia</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Chain ID 11155111
              </p>
            </div>
            <span className="mb-1 h-2 w-2 rounded-full bg-[var(--success)] shadow-[0_0_12px_var(--success)]" />
          </div>
        </div>
      </div>
    </aside>
  );
}
