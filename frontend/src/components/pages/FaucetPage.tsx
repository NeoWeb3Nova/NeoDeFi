"use client";
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWatchAsset, useWriteContract } from "wagmi";
import { AlertCircle, Clock3, Droplets, Info, WalletCards } from "lucide-react";
import faucetAbi from "@/abis/ETFFaucet.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { TOKENS, type TokenSymbol } from "@/constants/tokens";
import { TokenIcon } from "../ui/TokenIcon";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import type { Abi } from "viem";

const faucetTokens: TokenSymbol[] = ["NBTC", "NETH", "LINK", "USDC"];

function formatCooldown(seconds?: number) {
  if (seconds === undefined) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

export function FaucetPage() {
  const [tab, setTab] = useState<"all"|"single">("all");
  const [symbol, setSymbol] = useState<TokenSymbol>("NBTC");
  const [message, setMessage] = useState("");
  const [importingToken, setImportingToken] = useState<TokenSymbol>();
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { watchAssetAsync } = useWatchAsset();
  const { balances, refetch: refetchBalances } = usePortfolioBalances();
  const cooldowns = useReadContracts({
    contracts: faucetTokens.map((token) => ({
      abi: faucetAbi as Abi,
      address: contracts.faucet,
      functionName: "getCooldownTimeRemaining",
      args: address ? [address, TOKENS[token].address] : undefined,
    })),
    query: {
      enabled: Boolean(address) && isConfigured(contracts.faucet),
      refetchInterval: 15_000,
    },
  });
  const cooldownPeriod = useReadContract({
    abi: faucetAbi,
    address: contracts.faucet,
    functionName: "cooldownTimePeriod",
    query: { enabled: isConfigured(contracts.faucet) },
  });
  const configured = isConfigured(contracts.faucet);
  const chainCooldowns = useMemo(
    () => Object.fromEntries(
      faucetTokens.map((token, index) => {
        const value = cooldowns.data?.[index]?.result as bigint | undefined;
        return [token, value === undefined ? undefined : Number(value)];
      }),
    ) as Record<TokenSymbol, number | undefined>,
    [cooldowns.data],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedSeconds = cooldowns.dataUpdatedAt
    ? Math.max(0, Math.floor((now - cooldowns.dataUpdatedAt) / 1_000))
    : 0;
  const remaining = Object.fromEntries(
    faucetTokens.map((token) => [
      token,
      chainCooldowns[token] === undefined
        ? undefined
        : Math.max(0, chainCooldowns[token] - elapsedSeconds),
    ]),
  ) as Record<TokenSymbol, number | undefined>;

  const selectedCooldown = remaining[symbol];
  const anyCoolingDown = faucetTokens.some((token) => (remaining[token] ?? 0) > 0);
  const period = Number(cooldownPeriod.data ?? 0n);
  const selectedProgress = period > 0 && selectedCooldown !== undefined
    ? Math.min(100, Math.max(0, ((period - selectedCooldown) / period) * 100))
    : 0;
  const requestDisabled = isPending
    || !isConnected
    || (tab === "all" ? anyCoolingDown : (selectedCooldown ?? 0) > 0);

  async function addTokenToWallet(token: TokenSymbol) {
    if (!isConnected) return setMessage("请先连接钱包");
    setImportingToken(token);
    setMessage("");
    try {
      const added = await watchAssetAsync({
        type: "ERC20",
        options: {
          address: TOKENS[token].address,
          symbol: TOKENS[token].symbol,
          decimals: TOKENS[token].decimals,
        },
      });
      setMessage(added ? `${token} 已添加到钱包，后续交易更容易识别该代币。` : `钱包未添加 ${token}。`);
    } catch {
      setMessage(`当前钱包不支持自动添加 ${token}，可使用合约地址手动导入。`);
    } finally {
      setImportingToken(undefined);
    }
  }

  async function request() {
    if (!isConnected) return setMessage("请先连接钱包");
    if (!configured || !client) return setMessage("演示模式：请配置水龙头合约地址");
    try {
      const hash = await writeContractAsync({ abi: faucetAbi, address: contracts.faucet, functionName: tab === "all" ? "requestAllTokens" : "requestTokens", args: tab === "single" ? [TOKENS[symbol].address] : undefined });
      await client.waitForTransactionReceipt({hash}); await Promise.all([refetchBalances(), cooldowns.refetch()]); setMessage("测试代币领取成功");
    } catch { setMessage("领取失败，请检查冷却时间后重试"); }
  }
  return <div className="enter grid gap-8 xl:grid-cols-[.9fr_1.1fr]">
    <div className="space-y-6"><section className="panel p-7"><h1 className="flex items-center gap-3 font-display text-2xl font-bold"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><Droplets/></span>测试代币水龙头</h1><div className="mt-6 max-w-[68ch] space-y-4 leading-7 text-[var(--muted)]"><p>获取 Sepolia 测试代币，用于体验 Neo ETF 的投资、赎回和质押功能。</p><p>可领取 NBTC、NETH、LINK 和 USDC。每种代币设有独立冷却时间。</p><p>这些代币仅用于测试，没有实际价值。</p></div></section>
    <section className="panel p-7"><h2 className="flex items-center gap-3 font-display text-xl font-bold"><Clock3 className="text-[var(--warning)]"/>使用说明</h2><ul className="mt-6 space-y-4 text-[var(--muted)]"><li><strong className="text-[var(--foreground)]">单个领取：</strong>选择一种代币并领取。</li><li><strong className="text-[var(--foreground)]">一键领取：</strong>同时获取所有可用代币。</li><li><strong className="text-[var(--foreground)]">冷却时间：</strong>倒计时结束后可再次领取。</li></ul></section></div>
    <section className="panel p-5 sm:p-7"><div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-soft)] p-1">{(["all","single"] as const).map(value=><button key={value} onClick={()=>setTab(value)} className={`min-h-11 rounded-lg font-bold ${tab===value?"bg-white text-[var(--primary-strong)] shadow-sm":"text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{value==="all"?"一键领取":"代币列表"}</button>)}</div>
      {tab==="all"?<><div className="py-9 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_12px_24px_rgba(37,89,214,.2)]"><Droplets size={36}/></span><h2 className="mt-5 font-display text-xl font-bold">一键领取所有代币</h2><p className="mt-2 text-[var(--muted)]">同时获取 NBTC、NETH、LINK 和 USDC</p><p className="mt-3 text-xs text-[#53617b]">领取前可先将代币添加到钱包，让钱包用符号识别资产。</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{faucetTokens.map(token=><div key={token} className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4"><div className="flex items-center gap-3"><TokenIcon symbol={token}/><div><p className="font-bold">{token}</p><p className="text-sm text-[#44516b]">余额 {balances[token]}</p></div><button onClick={()=>void addTokenToWallet(token)} disabled={importingToken===token} className="ml-auto min-h-9 rounded-lg border border-[#c4d0e6] bg-white px-2.5 text-xs font-bold text-[var(--primary-strong)] hover:bg-[var(--primary-soft)] disabled:opacity-50">{importingToken===token?"添加中":"添加"}</button></div><div className="mt-3 flex items-center justify-between border-t border-[#d4dce9] pt-3 text-xs"><span className="text-[#53617b]">冷却时间</span><span className={(remaining[token] ?? 0) > 0 ? "font-bold text-[var(--warning)]" : "font-bold text-[var(--success)]"}>{remaining[token] === undefined ? "--:--" : (remaining[token] ?? 0) > 0 ? formatCooldown(remaining[token]) : "可领取"}</span></div></div>)}</div>{anyCoolingDown?<p className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--warning-soft)] p-4 text-sm font-medium text-[#784006]"><Clock3 size={18}/>部分代币仍在冷却中，请等待全部倒计时结束后再一键领取。</p>:null}</>:<><label className="mt-8 block font-bold">选择代币</label><select value={symbol} onChange={e=>setSymbol(e.target.value as TokenSymbol)} className="mt-3 h-13 w-full rounded-xl border border-[var(--line)] bg-white px-4 font-bold focus:border-[var(--primary)]">{faucetTokens.map(token=><option key={token}>{token}</option>)}</select><div className="mt-7 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-5"><TokenIcon symbol={symbol}/><div><p className="font-bold">{symbol}</p><p className="text-sm text-[#44516b]">{TOKENS[symbol].name}</p></div><strong className="ml-auto">{balances[symbol]}</strong><button onClick={()=>void addTokenToWallet(symbol)} disabled={importingToken===symbol} className="min-h-10 rounded-lg border border-[#c4d0e6] bg-white px-3 text-xs font-bold text-[var(--primary-strong)] hover:bg-[var(--primary-soft)] disabled:opacity-50"><WalletCards size={15} className="mr-1 inline"/>{importingToken===symbol?"添加中":"添加到钱包"}</button></div><div className="mt-6"><p className="flex justify-between text-sm text-[var(--muted)]"><span>冷却时间</span><span className={(selectedCooldown ?? 0) > 0 ? "font-bold text-[var(--warning)]" : "font-bold text-[var(--success)]"}>{selectedCooldown === undefined ? "--:--" : selectedCooldown > 0 ? formatCooldown(selectedCooldown) : "可领取"}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce3ef]"><div className="h-full bg-[var(--primary)] transition-[width] duration-300" style={{width:`${selectedProgress}%`}}/></div></div></>}
      {message?<p className="mt-6 flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-700"><AlertCircle size={18}/>{message}</p>:null}
      <button onClick={request} disabled={requestDisabled} className="mt-6 h-14 w-full rounded-xl bg-[var(--primary)] font-bold text-white shadow-[0_8px_18px_rgba(37,89,214,.18)] hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:bg-[#d5ddea] disabled:text-[#596780] disabled:shadow-none">{isPending?"领取中…":!isConnected?"请先连接钱包":tab==="all"?(anyCoolingDown?"等待冷却结束":"一键领取所有代币"):(selectedCooldown ?? 0)>0?`${formatCooldown(selectedCooldown)} 后可领取`:`领取 ${symbol}`}</button>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"><Info size={14}/>领取后代币将进入冷却期</p>
    </section>
  </div>;
}
