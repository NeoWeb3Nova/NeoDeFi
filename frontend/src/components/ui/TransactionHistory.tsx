"use client";

import { CheckCircle2, Clock3, ExternalLink, Trash2, XCircle } from "lucide-react";
import type { TransactionRecord } from "@/hooks/useTransactionHistory";

const statusLabel = {
  checking: "检查中",
  approving: "授权中",
  executing: "交易中",
  success: "已完成",
  failed: "失败",
} as const;

export function TransactionHistory({ records, onClear }: { records: TransactionRecord[]; onClear: () => void }) {
  if (!records.length) return null;
  return <section className="panel mt-7 overflow-hidden">
    <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
      <div><h2 className="font-display text-lg font-bold">Transaction History</h2><p className="text-xs text-slate-500">保存在当前浏览器，最多 30 条</p></div>
      <button onClick={onClear} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-500"><Trash2 size={14}/>清空</button>
    </div>
    <div className="divide-y divide-[var(--line)]">
      {records.map((record) => {
        const hash = record.transactionHash || record.approvalHash;
        return <article key={record.id} className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm">
          {record.status === "success" ? <CheckCircle2 className="text-emerald-500" size={19}/> : record.status === "failed" ? <XCircle className="text-red-500" size={19}/> : <Clock3 className="text-blue-500" size={19}/>}
          <div className="min-w-[150px]"><p className="font-bold">{record.type === "invest" ? "Invest" : "Redeem"} · {record.token}</p><p className="text-xs text-slate-500">{new Date(record.createdAt).toLocaleString()}</p></div>
          <div><p className="font-semibold">{record.inputAmount} {record.type === "invest" ? record.token : "NETF"}</p><p className="text-xs text-slate-500">预计收到 {record.estimatedOutput} {record.type === "invest" ? "NETF" : record.token}</p></div>
          <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${record.status === "success" ? "bg-emerald-50 text-emerald-600" : record.status === "failed" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{statusLabel[record.status]}</span>
          {hash ? <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="text-blue-600" aria-label="在 Etherscan 查看交易"><ExternalLink size={16}/></a> : null}
          {record.error ? <p className="w-full pl-8 text-xs text-red-600">{record.error}</p> : null}
        </article>;
      })}
    </div>
  </section>;
}
