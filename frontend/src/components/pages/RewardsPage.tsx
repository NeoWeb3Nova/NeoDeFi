"use client";
import { useState } from "react";
import { Award, CheckCircle2, Clock3, Gift, Sparkles, WalletCards } from "lucide-react";
import { useAccount, usePublicClient, useReadContract, useWatchAsset, useWriteContract } from "wagmi";
import miningAbi from "@/abis/ETFMining.json";
import erc20Abi from "@/abis/ERC20.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { useMining } from "@/hooks/useMining";
import { formatToken } from "@/utils/format";
import { REWARD_TOKEN } from "@/constants/tokens";
import { useClaimedRewards } from "@/hooks/useClaimedRewards";
import { RewardClaimModal, type RewardClaimStep } from "../ui/RewardClaimModal";
import { BaseError, ContractFunctionRevertedError, parseEventLogs } from "viem";

function describeClaimError(cause: unknown) {
  if (cause instanceof BaseError) {
    const reverted = cause.walk((error) => error instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      if (reverted.data?.errorName === "NothingToClaim") return "当前没有可领取的 NRWD 奖励";
      if (reverted.data?.errorName === "SafeERC20FailedOperation") return "奖励代币转账失败，请检查 Mining 合约奖励余额";
    }
    return cause.shortMessage;
  }
  return cause instanceof Error ? cause.message.split("\n")[0] : "领取失败，请稍后重试";
}

export function RewardsPage() {
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimStep, setClaimStep] = useState<RewardClaimStep>("signing");
  const [claimAmount, setClaimAmount] = useState("0.0000");
  const [claimHash, setClaimHash] = useState<`0x${string}`>();
  const [claimError, setClaimError] = useState("");
  const [lastClaimedAmount, setLastClaimedAmount] = useState<string>();
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { watchAssetAsync, isPending: isAddingToken } = useWatchAsset();
  const rewardBalance = useReadContract({
    abi: erc20Abi,
    address: REWARD_TOKEN.address,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && isConfigured(REWARD_TOKEN.address) },
  });
  const mining = useMining();
  const claimedRewards = useClaimedRewards();
  const pending = mining.pending === undefined ? "--" : formatToken(mining.pending);
  const claimed = claimedRewards.isLoading
    ? "读取中…"
    : claimedRewards.claimed === undefined
      ? "--"
      : formatToken(claimedRewards.claimed);
  const walletBalance = rewardBalance.data === undefined
    ? "--"
    : formatToken(rewardBalance.data as bigint, REWARD_TOKEN.decimals);

  async function addRewardToken() {
    if (!isConnected) return;
    await watchAssetAsync({
      type: "ERC20",
      options: {
        address: REWARD_TOKEN.address,
        symbol: REWARD_TOKEN.symbol,
        decimals: REWARD_TOKEN.decimals,
      },
    });
  }

  async function claim() {
    if (!isConnected) return;
    if (!isConfigured(contracts.mining) || !client) return;
    const pendingSnapshot = mining.pending ?? 0n;
    if (pendingSnapshot <= 0n) return;
    setClaimAmount(formatToken(pendingSnapshot));
    setClaimHash(undefined);
    setClaimError("");
    setClaimStep("signing");
    setClaimModalOpen(true);
    try {
      const hash = await writeContractAsync({ abi: miningAbi, address: contracts.mining, functionName: "claimMiningReward" });
      setClaimHash(hash);
      setClaimStep("confirming");
      const receipt = await client.waitForTransactionReceipt({ hash });
      const event = parseEventLogs({
        abi: miningAbi,
        logs: receipt.logs,
        eventName: "MiningRewardClaimed",
      })[0] as { args?: { amount?: bigint } } | undefined;
      const actualAmount = event?.args?.amount !== undefined
        ? event.args.amount
        : pendingSnapshot;
      const formattedAmount = formatToken(actualAmount);
      setClaimAmount(formattedAmount);
      setClaimStep("syncing");
      await Promise.all([mining.refetch(), claimedRewards.refetch(), rewardBalance.refetch()]);
      setLastClaimedAmount(formattedAmount);
      setClaimStep("success");
    } catch (cause) {
      setClaimError(describeClaimError(cause));
      setClaimStep("error");
    }
  }
  return <div className="enter"><div className="mb-8"><h1 className="font-display text-3xl font-bold">奖励中心</h1><p className="mt-2 text-sm text-[var(--muted)]">查看待领取、钱包余额和历史累计 NRWD</p></div>
    {lastClaimedAmount ? <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700"><CheckCircle2 size={20}/><p><strong>{lastClaimedAmount} NRWD</strong> 已领取并转入当前钱包。</p></div> : null}
    <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="relative overflow-hidden rounded-2xl bg-[#193b82] p-7 text-white shadow-[0_16px_38px_rgba(25,59,130,.2)] sm:p-8"><div className="relative"><span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold"><Sparkles size={15}/> Pending rewards</span><strong className="mt-8 block font-display text-4xl sm:text-5xl">{pending} <small className="text-xl text-[#d5e0ff]">{REWARD_TOKEN.symbol}</small></strong><p className="mt-3 max-w-md leading-7 text-[#e3eaff]">质押 NETF 后，奖励按秒累计。领取不会影响当前质押仓位。</p><button onClick={claim} disabled={!isConnected || isPending || mining.pending === undefined || mining.pending <= 0n} className="mt-8 flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 font-bold text-[#193b82] shadow-sm hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-50"><Gift size={19}/>{isPending?"等待钱包确认…":mining.pending !== undefined && mining.pending <= 0n?"暂无可领取奖励":"领取奖励"}</button></div></section>
      <div className="space-y-6"><section className="panel p-7"><p className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]"><WalletCards size={18}/> 钱包 NRWD 余额</p><strong className="mt-5 block font-display text-3xl">{walletBalance} <small className="text-lg text-[var(--muted)]">{REWARD_TOKEN.symbol}</small></strong><button onClick={()=>void addRewardToken()} disabled={!isConnected || isAddingToken} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#b9c9ed] py-3 text-sm font-bold text-[var(--primary-strong)] hover:bg-[var(--primary-soft)] disabled:opacity-50"><WalletCards size={17}/>{isAddingToken?"添加中…":"添加 NRWD 到钱包"}</button><p className="mt-3 text-xs leading-5 text-[var(--muted)]">当前地址实际持有量，转账后会随链上余额变化。</p></section><section className="panel p-7"><p className="flex items-center gap-2 text-sm font-bold text-[var(--success)]"><CheckCircle2 size={18}/> 历史累计领取</p><strong className="mt-5 block font-display text-3xl">{claimed} <small className="text-lg text-[var(--muted)]">{REWARD_TOKEN.symbol}</small></strong><div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]"><span>领取次数</span><strong className="text-[var(--foreground)]">{claimedRewards.claimCount}</strong></div></section><section className="panel p-7"><h2 className="font-display text-xl font-bold">奖励参数</h2><div className="mt-7 space-y-6"><div className="flex gap-3"><Award className="text-[var(--primary)]"/><div><p className="font-bold">{REWARD_TOKEN.symbol}</p><p className="text-sm text-[var(--muted)]">{REWARD_TOKEN.name}</p></div></div><div className="flex gap-3"><Clock3 className="text-[var(--primary)]"/><div><p className="font-bold">实时累计</p><p className="text-sm text-[var(--muted)]">链上指数按秒更新</p></div></div></div></section></div></div>
    <RewardClaimModal open={claimModalOpen} step={claimStep} amount={claimAmount} hash={claimHash} error={claimError} onClose={()=>setClaimModalOpen(false)}/>
  </div>;
}
