"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Layers3, TrendingUp } from "lucide-react";
import miningAbi from "@/abis/ETFMining.json";
import erc20Abi from "@/abis/ERC20.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { REWARD_TOKEN } from "@/constants/tokens";
import { useMining } from "@/hooks/useMining";
import { formatToken, safeNumber } from "@/utils/format";
import { TransactionModal, type TxStep } from "../ui/TransactionModal";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";

export function StakePage() {
  const [tab, setTab] = useState<"stake"|"unstake">("stake");
  const [amount, setAmount] = useState("");
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState<TxStep>("checking");
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const mining = useMining();
  const { balances, refetch: refetchBalances } = usePortfolioBalances();
  const configured = isConfigured(contracts.mining) && isConfigured(contracts.etf);
  const staked = mining.staked === undefined ? "--" : formatToken(mining.staked);
  const total = mining.totalStaked === undefined ? "--" : formatToken(mining.totalStaked);
  const stakeShare = mining.staked !== undefined && mining.totalStaked && mining.totalStaked > 0n
    ? Number(mining.staked * 10_000n / mining.totalStaked) / 100
    : 0;
  const dailyEmission = mining.speed === undefined ? undefined : Number(formatUnits(mining.speed, REWARD_TOKEN.decimals)) * 86_400;
  const estimatedDailyReward = dailyEmission === undefined
    ? undefined
    : mining.totalStaked && mining.totalStaked > 0n
      ? dailyEmission * safeNumber(amount) / (Number(formatUnits(mining.totalStaked, 18)) + safeNumber(amount))
      : safeNumber(amount) > 0 ? dailyEmission : 0;

  async function submit() {
    if (!address || !isConnected || !safeNumber(amount)) return;
    setModal(true); setStep("checking");
    if (!configured || !client) { await new Promise(r=>setTimeout(r,450)); setStep("approving"); await new Promise(r=>setTimeout(r,500)); setStep("executing"); await new Promise(r=>setTimeout(r,650)); setStep("success"); return; }
    try {
      const raw = parseUnits(amount, 18);
      if (tab === "stake") {
        const allowance = await client.readContract({ abi: erc20Abi, address: contracts.etf, functionName: "allowance", args: [address, contracts.mining] }) as bigint;
        if (allowance < raw) { setStep("approving"); const hash = await writeContractAsync({ abi: erc20Abi, address: contracts.etf, functionName: "approve", args: [contracts.mining, raw] }); await client.waitForTransactionReceipt({hash}); }
      }
      setStep("executing");
      const hash = await writeContractAsync({ abi: miningAbi, address: contracts.mining, functionName: tab, args: [raw] });
      await client.waitForTransactionReceipt({hash}); await Promise.all([mining.refetch(), refetchBalances()]); setStep("success");
    } catch { setModal(false); }
  }

  return <div className="enter"><div className="mb-7 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><Layers3/></span><div><h1 className="font-display text-3xl font-bold">质押概览</h1><p className="mt-1 text-sm text-[var(--muted)]">质押 NETF 并按份额获取 NRWD 奖励</p></div></div>
    <div className="grid gap-7 xl:grid-cols-[1fr_1.05fr]">
      <div className="space-y-6"><section className="panel p-7"><div className="flex items-center justify-between"><h2 className="font-bold">已质押 NETF</h2><span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-sm font-bold text-[var(--primary-strong)]">{stakeShare.toFixed(2)}% 占比</span></div><strong className="mt-6 block font-display text-4xl">{staked}</strong><p className="text-sm text-[var(--muted)]">占总质押量比例</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]"><div className="h-full bg-[var(--primary)]" style={{width:`${Math.min(stakeShare, 100)}%`}}/></div><div className="mt-3 flex justify-between text-sm text-[var(--muted)]"><span>您的质押</span><span>总质押量: {total} NETF</span></div></section>
      <section className="panel p-7"><p className="flex items-center gap-2 font-bold"><TrendingUp size={19} className="text-[var(--primary)]"/>全网挖矿速率</p><strong className="mt-6 block font-display text-4xl">{dailyEmission === undefined ? "--" : dailyEmission.toFixed(4)} <small className="text-xl text-[var(--muted)]">{REWARD_TOKEN.symbol}</small></strong><p className="text-sm text-[var(--muted)]">Mining 合约每日释放量</p></section></div>
      <section className="panel p-7"><div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-soft)] p-1">{(["stake","unstake"] as const).map(value=><button key={value} onClick={()=>setTab(value)} className={`min-h-11 rounded-lg font-bold ${tab===value?"bg-white text-[var(--primary-strong)] shadow-sm":"text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{value==="stake"?"质押":"解除质押"}</button>)}</div><div className="mt-7 flex justify-between text-sm text-[var(--muted)]"><span>{tab==="stake"?"NETF 余额":"已质押 NETF"}</span><strong className="text-[var(--foreground)]">{tab==="stake"?balances.NETF:staked}</strong></div><label className="mt-7 block font-bold">{tab==="stake"?"质押数量":"解除质押数量"} <span className="float-right text-sm text-[var(--muted)]">NETF</span></label><input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="mt-4 w-full border-0 border-b border-[var(--line)] py-5 font-display text-4xl outline-none focus:border-[var(--primary)]"/><p className="mt-7 text-sm font-bold">预计每日奖励 <span className="float-right text-[var(--muted)]">{estimatedDailyReward === undefined ? "--" : estimatedDailyReward.toFixed(4)} {REWARD_TOKEN.symbol}</span></p><button onClick={submit} disabled={!safeNumber(amount)} className="mt-8 h-14 w-full rounded-xl bg-[var(--primary)] font-bold text-white shadow-[0_10px_22px_rgba(37,89,214,.18)] hover:bg-[var(--primary-strong)] disabled:bg-[var(--primary-soft)] disabled:text-[var(--muted)] disabled:shadow-none">{tab==="stake"?"质押 NETF":"解除质押"}</button>{!configured?<p className="mt-3 text-center text-xs text-[var(--warning)]">当前为演示模式</p>:null}</section>
    </div><TransactionModal open={modal} title={tab==="stake"?"执行质押":"解除质押"} step={step} onClose={()=>setModal(false)}/></div>;
}
