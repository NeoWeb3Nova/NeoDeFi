"use client";

import { Check, ExternalLink, LoaderCircle, X, XCircle } from "lucide-react";

export type RewardClaimStep = "signing" | "confirming" | "syncing" | "success" | "error";

const steps = [
  { key: "signing", label: "确认领取", detail: "请在钱包中确认领取交易" },
  { key: "confirming", label: "等待链上确认", detail: "交易已提交至 Sepolia" },
  { key: "syncing", label: "同步奖励余额", detail: "正在更新钱包和历史领取数据" },
] as const;

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
  if (!open) return null;
  const activeIndex = step === "success" ? steps.length : steps.findIndex((item) => item.key === step);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#18305b]/20 p-5 backdrop-blur-sm">
    <section className="relative w-full max-w-[500px] overflow-hidden rounded-2xl bg-white p-6 shadow-[var(--shadow-dialog)] sm:p-8">
      <div className={`absolute inset-x-0 top-0 h-1 ${step === "error" ? "bg-red-500" : "bg-emerald-500"}`}/>
      <button onClick={onClose} disabled={!["success", "error"].includes(step)} aria-label="关闭" className="absolute right-5 top-5 rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"><X size={20}/></button>
      <h2 className="text-center font-display text-xl font-bold">{step === "success" ? "奖励领取成功" : step === "error" ? "奖励领取失败" : "领取 NRWD"}</h2>
      <div className="my-7 rounded-xl bg-emerald-50 p-5 text-center">
        <p className="text-sm text-emerald-700">{step === "success" ? "实际到账" : "本次领取"}</p>
        <strong className="mt-1 block font-display text-3xl text-emerald-700">{amount} NRWD</strong>
      </div>
      {step === "error" ? <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-red-700"><XCircle className="shrink-0" size={20}/><p className="text-sm">{error || "领取失败，请稍后重试"}</p></div> : <div className="space-y-6">{steps.map((item, index) => {
        const done = index < activeIndex || step === "success";
        const active = index === activeIndex;
        return <div key={item.key} className="flex gap-4">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-blue-100 text-blue-700" : "border border-[var(--line)] bg-white text-[var(--muted)]"}`}>{done ? <Check size={18}/> : active ? <LoaderCircle className="animate-spin" size={18}/> : index + 1}</span>
          <div><p className={`font-bold ${done ? "text-emerald-600" : active ? "text-blue-600" : "text-slate-400"}`}>{item.label}</p><p className="mt-1 text-sm text-slate-500">{done ? "已完成" : item.detail}</p></div>
        </div>;
      })}</div>}
      {hash ? <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="mt-7 flex items-center justify-center gap-2 text-sm font-bold text-blue-600">在 Etherscan 查看交易 <ExternalLink size={15}/></a> : null}
      {["success", "error"].includes(step) ? <button onClick={onClose} className="mt-6 h-12 w-full rounded-xl bg-slate-900 font-bold text-white">完成</button> : null}
    </section>
  </div>;
}
