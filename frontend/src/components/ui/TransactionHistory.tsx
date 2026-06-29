"use client";

import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Trash2,
  XCircle,
} from "lucide-react";
import type { TransactionRecord } from "@/hooks/useTransactionHistory";
import { usePreferences } from "@/components/providers/PreferencesProvider";

export function TransactionHistory({
  records,
  onClear,
}: {
  records: TransactionRecord[];
  onClear: () => void;
}) {
  const { locale, t } = usePreferences();
  if (!records.length) return null;
  return (
    <section className="panel mt-7 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold">{t("tx.history")}</h2>
          <p className="text-sm text-[var(--muted)]">{t("tx.stored")}</p>
        </div>
        <button
          onClick={onClear}
          className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
        >
          <Trash2 size={15} />
          {t("tx.clear")}
        </button>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {records.map((record) => {
          const hash = record.transactionHash || record.approvalHash;
          return (
            <article
              key={record.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 text-sm sm:grid-cols-[auto_minmax(150px,1fr)_minmax(180px,1fr)_auto_auto]"
            >
              {record.status === "success" ? (
                <CheckCircle2 className="text-[var(--success)]" size={19} />
              ) : record.status === "failed" ? (
                <XCircle className="text-[var(--danger)]" size={19} />
              ) : (
                <Clock3 className="text-[var(--electric)]" size={19} />
              )}
              <div className="min-w-[150px]">
                <p className="font-bold">
                  {record.type === "invest" ? "Invest" : "Redeem"} ·{" "}
                  {record.token}
                </p>
                <p className="font-mono text-[9px] text-[var(--muted)]">
                  {new Date(record.createdAt).toLocaleString(locale)}
                </p>
              </div>
              <div className="col-span-2 pl-8 sm:col-span-1 sm:pl-0">
                <p className="font-semibold">
                  {record.inputAmount}{" "}
                  {record.type === "invest" ? record.token : "NETF"}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {t("tx.expected")} {record.estimatedOutput}{" "}
                  {record.type === "invest" ? "NETF" : record.token}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.status === "success" ? "bg-[var(--success-soft)] text-[var(--success)]" : record.status === "failed" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[rgba(107,140,255,.1)] text-[var(--electric)]"}`}
              >
                {t(`tx.statuses.${record.status}`)}
              </span>
              {hash ? (
                <a
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-11 w-11 place-items-center rounded-lg text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                  aria-label={t("common.viewEtherscan")}
                >
                  <ExternalLink size={17} />
                </a>
              ) : (
                <span />
              )}
              {record.error ? (
                <p
                  role="alert"
                  className="col-span-full rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
                >
                  {record.error}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
