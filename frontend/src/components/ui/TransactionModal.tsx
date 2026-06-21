"use client";

import { Check, LoaderCircle, X } from "lucide-react";
export type TxStep = "checking" | "approving" | "executing" | "success" | "error";

export function TransactionModal({ open, title, step, onClose }: { open: boolean; title: string; step: TxStep; onClose: () => void }) {
  if (!open) return null;
  const rows = [{ key: "checking", label: "检查代币授权" }, { key: "approving", label: "授权代币" }, { key: "executing", label: title }] as const;
  const index = step === "success" ? 3 : Math.max(0, rows.findIndex((row) => row.key === step));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#18305b]/20 p-5 backdrop-blur-sm">
    <section className="relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-white p-6 shadow-[var(--shadow-dialog)] sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#2d63e2]"/><button onClick={onClose} aria-label="关闭" className="absolute right-5 top-5 rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
      <h2 className="mb-8 text-center font-display text-xl font-bold">{step === "success" ? "交易已完成" : `${title}进度`}</h2>
      <div className="space-y-7">{rows.map((row, rowIndex) => { const done = rowIndex < index || step === "success"; const active = rowIndex === index && step !== "error"; return <div key={row.key} className="flex gap-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-blue-100 text-blue-700" : "border border-[var(--line)] bg-white text-[var(--muted)]"}`}>{done ? <Check size={19}/> : active ? <LoaderCircle className="animate-spin" size={19}/> : rowIndex + 1}</span>
        <div><p className={`font-bold ${done ? "text-emerald-600" : active ? "text-blue-600" : "text-slate-400"}`}>{row.label}</p><p className="mt-1 text-sm text-slate-500">{done ? "已完成" : active ? "请在钱包中确认操作…" : "等待上一步完成"}</p></div>
      </div>; })}</div>
    </section>
  </div>;
}
