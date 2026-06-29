"use client";

import { useEffect } from "react";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesProvider";
export type TxStep =
  | "checking"
  | "approving"
  | "executing"
  | "success"
  | "error";

export function TransactionModal({
  open,
  title,
  step,
  error,
  onClose,
}: {
  open: boolean;
  title: string;
  step: TxStep;
  error?: string;
  onClose: () => void;
}) {
  const { t } = usePreferences();
  const canClose = step === "success" || step === "error";
  useEffect(() => {
    if (!open || !canClose) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [canClose, onClose, open]);
  if (!open) return null;
  const rows = [
    { key: "checking", label: t("tx.checking") },
    { key: "approving", label: t("tx.approving") },
    { key: "executing", label: title },
  ] as const;
  const index =
    step === "success"
      ? 3
      : Math.max(
          0,
          rows.findIndex((row) => row.key === step),
        );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-title"
        aria-describedby="transaction-status"
        className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-dialog)] sm:p-8"
      >
        <div
          className={`absolute inset-x-0 top-0 h-1 ${step === "error" ? "bg-[var(--danger)]" : step === "success" ? "bg-[var(--success)]" : "bg-[var(--primary)]"}`}
        />
        <button
          onClick={onClose}
          disabled={!canClose}
          aria-label={t("common.close")}
          className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <X size={20} />
        </button>
        <h2
          id="transaction-title"
          className="mb-8 pr-10 text-center font-display text-xl font-bold"
        >
          {step === "success"
            ? t("tx.success")
            : step === "error"
              ? t("tx.error")
              : t("tx.progress", { title })}
        </h2>
        <p id="transaction-status" className="sr-only" aria-live="polite">
          {t("tx.current", { step })}
        </p>
        <div className="space-y-7">
          {rows.map((row, rowIndex) => {
            const done = rowIndex < index || step === "success";
            const active = rowIndex === index && step !== "error";
            return (
              <div key={row.key} className="flex gap-4">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-[var(--success-soft)] text-[var(--success)]" : active ? "bg-[var(--primary-soft)] text-[var(--primary)] shadow-[0_0_18px_rgba(60,242,195,.1)]" : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]"}`}
                >
                  {done ? (
                    <Check size={19} />
                  ) : active ? (
                    <LoaderCircle className="animate-spin" size={19} />
                  ) : (
                    rowIndex + 1
                  )}
                </span>
                <div>
                  <p
                    className={`font-bold ${done ? "text-[var(--success)]" : active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}
                  >
                    {row.label}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {done
                      ? t("tx.completed")
                      : active
                        ? t("tx.confirmWallet")
                        : t("tx.waiting")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {step === "error" ? (
          <div
            role="alert"
            className="mt-6 flex gap-3 rounded-xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
          >
            <AlertCircle className="shrink-0" size={19} />
            <p>{error || t("tx.fallback")}</p>
          </div>
        ) : null}
        {canClose ? (
          <button
            onClick={onClose}
            className="neo-button mt-6 min-h-12 w-full rounded-xl font-extrabold"
          >
            {t("common.done")}
          </button>
        ) : null}
      </section>
    </div>
  );
}
