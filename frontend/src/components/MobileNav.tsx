"use client";

import type { PageKey } from "./Dashboard";
import { navigationItems } from "./Sidebar";
import { usePreferences } from "./providers/PreferencesProvider";

export function MobileNav({
  page,
  onChange,
}: {
  page: PageKey;
  onChange: (page: PageKey) => void;
}) {
  const { t } = usePreferences();
  return (
    <nav
      aria-label={t("nav.mobile")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--chrome)] px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_40px_rgba(0,0,0,.18)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {navigationItems.map(({ key, labelKey, icon: Icon }) => {
          const selected = page === key;
          return (
            <button
              key={key}
              aria-current={selected ? "page" : undefined}
              onClick={() => onChange(key)}
              className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${selected ? "text-[var(--primary-strong)]" : "text-[var(--muted)]"}`}
            >
              {selected ? (
                <span className="absolute inset-x-4 top-0 h-px bg-[var(--neo)] shadow-[0_0_10px_var(--neo)]" />
              ) : null}
              <span
                className={`grid h-8 w-10 place-items-center rounded-xl ${selected ? "bg-[var(--primary-soft)]" : ""}`}
              >
                <Icon size={19} strokeWidth={selected ? 2.4 : 1.9} />
              </span>
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
