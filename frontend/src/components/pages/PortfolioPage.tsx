"use client";
import { BASKET, TOKENS, type TokenSymbol } from "@/constants/tokens";
import { useAccount } from "wagmi";
import { ArrowUpRight, PieChart, Wallet } from "lucide-react";
import { TokenIcon } from "../ui/TokenIcon";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";

export function PortfolioPage({ onTrade }: { onTrade: () => void }) {
  const { isConnected } = useAccount();
  const { balances, nativeBalance } = usePortfolioBalances();
  if (!isConnected) return <div className="enter grid min-h-[68vh] place-items-center"><section className="panel max-w-xl p-7 text-center sm:p-9"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]"><Wallet/></div><h1 className="font-display text-3xl font-bold">连接钱包以开始</h1><p className="mx-auto mt-3 max-w-[50ch] leading-7 text-[var(--muted)]">查看真实链上资产、投资或赎回 NETF，并管理质押奖励。</p><p className="mt-6 rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium text-[#44516b]">网络：Sepolia Testnet</p></section></div>;
  const assets: TokenSymbol[] = ["NETF", "NETH", "NBTC", "LINK", "USDC"];
  return <div className="enter space-y-8">
    <div><h1 className="font-display text-3xl font-bold">Portfolio</h1><p className="mt-2 text-sm text-[var(--muted)]">当前钱包在 Sepolia 上的 Neo ETF 资产概览</p></div>
    <section className="grid gap-5 md:grid-cols-3">
      <article className="panel p-6"><p className="text-sm font-bold text-[var(--primary)]">Ethereum Balance</p><strong className="mt-4 block font-display text-3xl">{nativeBalance}</strong><span className="text-sm text-[var(--muted)]">ETH</span></article>
      <article className="panel p-6"><p className="text-sm font-bold text-[var(--primary-strong)]">Neo ETF Balance</p><strong className="mt-4 block font-display text-3xl">{balances.NETF}</strong><span className="text-sm text-[var(--muted)]">NETF</span></article>
      <article className="panel p-6"><p className="flex items-center gap-2 text-sm font-bold text-emerald-600"><PieChart size={16}/> Neo ETF Allocation</p><div className="mt-5 grid grid-cols-2 gap-3">{BASKET.map(item => <span className="flex items-center gap-2 text-sm font-semibold" key={item.symbol}><i className="h-2.5 w-2.5 rounded-full" style={{background:TOKENS[item.symbol].color}}/>{item.symbol} ({item.weight}%)</span>)}</div></article>
    </section>
    <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5"><h2 className="font-display text-xl font-bold">Your Assets</h2><button onClick={onTrade} className="flex items-center gap-1 text-sm font-bold text-blue-600">Trade <ArrowUpRight size={16}/></button></div>
      {assets.map(symbol => <div key={symbol} className="flex items-center gap-4 border-b border-[var(--line)] px-6 py-4 last:border-0"><TokenIcon symbol={symbol}/><div><p className="font-bold">{symbol}</p><p className="text-sm text-slate-500">{TOKENS[symbol].name}</p></div><strong className="ml-auto font-display">{balances[symbol]}</strong></div>)}
    </section>
  </div>;
}
