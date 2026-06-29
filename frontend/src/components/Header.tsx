"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CircleDot, Languages, Moon, Radio, Sun } from "lucide-react";
import type { PageKey } from "./Dashboard";
import { BrandLockup } from "./ui/BrandMark";
import { usePreferences } from "./providers/PreferencesProvider";

const pageMeta: Record<PageKey, { eyebrow: string; titleKey: string }> = {
  portfolio: { eyebrow: "Protocol Overview", titleKey: "header.portfolio" },
  trade: { eyebrow: "Neo ETF Engine", titleKey: "header.trade" },
  stake: { eyebrow: "Yield Layer", titleKey: "header.stake" },
  rewards: { eyebrow: "Reward Stream", titleKey: "header.rewards" },
  faucet: { eyebrow: "Testnet Utilities", titleKey: "header.faucet" },
};

export function Header({ page }: { page: PageKey }) {
  const { locale, setLocale, theme, setTheme, t } = usePreferences();
  const meta = pageMeta[page];
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[var(--line)] bg-[var(--chrome-soft)] px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="lg:hidden">
        <BrandLockup compact />
      </div>
      <div className="hidden items-center gap-4 lg:flex">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[.2em] text-[var(--neo)]">
            {meta.eyebrow}
          </p>
          <p className="mt-1 font-display text-base font-bold text-[var(--text)]">
            {t(meta.titleKey)}
          </p>
        </div>
        <span className="h-8 w-px bg-[var(--line)]" />
        <span className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Radio size={14} className="text-[var(--neo)]" />
          11155111
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
          aria-label={t("header.locale")}
          title={t("header.locale")}
          className="grid h-10 min-w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--hover)] px-2 text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--neo)]"
        >
          <span className="flex items-center gap-1 font-mono text-[10px] font-bold">
            <Languages size={15} />
            {locale === "zh-CN" ? "EN" : "中"}
          </span>
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={
            theme === "dark" ? t("header.themeDark") : t("header.themeLight")
          }
          title={
            theme === "dark" ? t("header.themeDark") : t("header.themeLight")
          }
          className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--hover)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--neo)]"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <span className="hidden items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--hover)] px-3 py-2 text-xs text-[var(--muted)] xl:flex">
          <CircleDot size={13} className="text-[var(--success)]" />
          Sepolia
        </span>
        <ConnectButton.Custom>
          {({
            account,
            chain,
            mounted,
            openAccountModal,
            openChainModal,
            openConnectModal,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;
            if (!connected) {
              return (
                <button
                  onClick={openConnectModal}
                  className="neo-button min-h-10 rounded-xl px-4 text-sm font-extrabold"
                >
                  {t("common.connect")}
                </button>
              );
            }
            if (chain.unsupported) {
              return (
                <button
                  onClick={openChainModal}
                  className="min-h-10 rounded-xl bg-[var(--danger-soft)] px-4 text-sm font-bold text-[var(--danger)]"
                >
                  {t("header.wrongNetwork")}
                </button>
              );
            }
            return (
              <button
                onClick={openAccountModal}
                className="min-h-10 rounded-xl border border-[var(--line-strong)] bg-[var(--primary-soft)] px-4 font-mono text-xs font-bold text-[var(--primary-strong)]"
              >
                {account.displayName}
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
