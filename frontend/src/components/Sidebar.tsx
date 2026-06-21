"use client";
import { Award, Coins, Droplets, Layers3, PanelLeft, Repeat2, WalletCards, X } from "lucide-react";
import type { PageKey } from "./Dashboard";

const items = [
  { key: "portfolio", label: "Portfolio", icon: WalletCards },
  { key: "trade", label: "Trade", icon: Repeat2 },
  { key: "stake", label: "Stake", icon: Layers3 },
  { key: "rewards", label: "Rewards", icon: Award },
  { key: "faucet", label: "Faucet", icon: Droplets },
] as const;

export function Sidebar({ page, onChange, open, onClose }: { page: PageKey; onChange: (page: PageKey) => void; open: boolean; onClose: () => void }) {
  return <>
    {open ? <button className="fixed inset-0 z-30 bg-[#17233d]/30 lg:hidden" aria-label="关闭菜单" onClick={onClose}/> : null}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-[var(--line)] bg-[#f9fbff] px-4 py-6 shadow-[8px_0_30px_rgba(23,35,61,.03)] transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-12 items-center justify-between px-3"><button onClick={() => onChange("portfolio")} className="rounded-lg font-display text-[22px] font-bold tracking-[-.04em] text-[var(--primary)]">NEO <span className="font-medium">ETF</span></button><button className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-white lg:hidden" onClick={onClose} aria-label="关闭导航"><X size={20}/></button></div>
      <nav className="mt-10 space-y-1.5" aria-label="主导航">{items.map(({ key, label, icon: Icon }) => <button key={key} aria-current={page === key ? "page" : undefined} onClick={() => { onChange(key); onClose(); }} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-semibold ${page === key ? "bg-[var(--primary-soft)] text-[var(--primary-strong)] shadow-[inset_0_0_0_1px_rgba(37,89,214,.08)]" : "text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]"}`}><Icon size={20} strokeWidth={page === key ? 2.25 : 1.8}/>{label}</button>)}</nav>
      <div className="mt-auto flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-[var(--muted)]"><Coins size={17}/><span className="text-xs font-semibold">Sepolia Testnet</span><PanelLeft className="ml-auto" size={16}/></div>
    </aside>
  </>;
}
