"use client";

import { useEffect } from "react";
import { Check, ExternalLink, LoaderCircle, X, XCircle } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export type RewardClaimStep =
  | "signing"
  | "confirming"
  | "syncing"
  | "success"
  | "error";

export function RewardClaimModal({
  open,
  step,
  amount,
  hash,
  error,
  onClose,
}: {
  open: boolean;
  step: RewardClaimStep;
  amount: string;
  hash?: `0x${string}`;
  error?: string;
  onClose: () => void;
}) {
  const { t } = usePreferences();
  const steps = [
    {
      key: "signing",
      label: t("claim.signing"),
      detail: t("claim.signingDetail"),
    },
    {
      key: "confirming",
      label: t("claim.confirming"),
      detail: t("claim.confirmingDetail"),
    },
    {
      key: "syncing",
      label: t("claim.syncing"),
      detail: t("claim.syncingDetail"),
    },
  ] as const;
  const canClose = ["success", "error"].includes(step);
  useEffect(() => {
    if (!open || !canClose) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [canClose, onClose, open]);
  if (!open) return null;
  const activeIndex =
    step === "success"
      ? steps.length
      : steps.findIndex((item) => item.key === step);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-dialog-title"
        className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-dialog)] sm:p-8"
      >
        <div
          className={`absolute inset-x-0 top-0 h-1 ${step === "error" ? "bg-[var(--danger)]" : "bg-[var(--success)]"}`}
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
          id="reward-dialog-title"
          className="pr-10 text-center font-display text-xl font-bold"
        >
          {step === "success"
            ? t("claim.success")
            : step === "error"
              ? t("claim.error")
              : t("claim.title")}
        </h2>
        <div className="my-7 rounded-xl border border-[var(--line-strong)] bg-[var(--success-soft)] p-5 text-center">
          <p className="text-sm text-[var(--success)]">
            {t(step === "success" ? "claim.received" : "claim.amount")}
          </p>
          <strong className="metric-value mt-1 block text-3xl text-[var(--success)]">
            {amount} NRWD
          </strong>
        </div>
        {step === "error" ? (
          <div className="flex gap-3 rounded-xl bg-[var(--danger-soft)] p-4 text-[var(--danger)]">
            <XCircle className="shrink-0" size={20} />
            <p className="text-sm">{error || t("claim.fallback")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {steps.map((item, index) => {
              const done = index < activeIndex || step === "success";
              const active = index === activeIndex;
              return (
                <div key={item.key} className="flex gap-4">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-[var(--success-soft)] text-[var(--success)]" : active ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]"}`}
                  >
                    {done ? (
                      <Check size={18} />
                    ) : active ? (
                      <LoaderCircle className="animate-spin" size={18} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <p
                      className={`font-bold ${done ? "text-[var(--success)]" : active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {done ? t("tx.completed") : item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {hash ? (
          <a
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-7 flex items-center justify-center gap-2 text-sm font-bold text-[var(--primary)]"
          >
            {t("common.viewEtherscan")} <ExternalLink size={15} />
          </a>
        ) : null}
        {canClose ? (
          <button
            onClick={onClose}
            className="neo-button mt-6 h-12 w-full rounded-xl font-extrabold"
          >
            {t("common.done")}
          </button>
        ) : null}
      </section>
    </div>
  );
}
