"use client";
import { useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  Gift,
  Sparkles,
  WalletCards,
} from "lucide-react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWatchAsset,
  useWriteContract,
} from "wagmi";
import miningAbi from "@/abis/ETFMining.json";
import erc20Abi from "@/abis/ERC20.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { useMining } from "@/hooks/useMining";
import { formatToken } from "@/utils/format";
import { REWARD_TOKEN } from "@/constants/tokens";
import { useClaimedRewards } from "@/hooks/useClaimedRewards";
import { RewardClaimModal, type RewardClaimStep } from "../ui/RewardClaimModal";
import { BaseError, ContractFunctionRevertedError, parseEventLogs } from "viem";
import { usePreferences } from "../providers/PreferencesProvider";

function describeClaimError(
  cause: unknown,
  t: (path: string, values?: Record<string, string | number>) => string,
) {
  if (cause instanceof BaseError) {
    const reverted = cause.walk(
      (error) => error instanceof ContractFunctionRevertedError,
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      if (reverted.data?.errorName === "NothingToClaim")
        return t("rewards.nothing");
      if (reverted.data?.errorName === "SafeERC20FailedOperation")
        return t("rewards.transferFailed");
    }
    return cause.shortMessage;
  }
  return cause instanceof Error
    ? cause.message.split("\n")[0]
    : t("claim.fallback");
}

export function RewardsPage() {
  const { t } = usePreferences();
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
  const pending =
    mining.pending === undefined ? "--" : formatToken(mining.pending);
  const claimed = claimedRewards.isLoading
    ? t("common.loading")
    : claimedRewards.claimed === undefined
      ? "--"
      : formatToken(claimedRewards.claimed);
  const walletBalance =
    rewardBalance.data === undefined
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
      const hash = await writeContractAsync({
        abi: miningAbi,
        address: contracts.mining,
        functionName: "claimMiningReward",
      });
      setClaimHash(hash);
      setClaimStep("confirming");
      const receipt = await client.waitForTransactionReceipt({ hash });
      const event = parseEventLogs({
        abi: miningAbi,
        logs: receipt.logs,
        eventName: "MiningRewardClaimed",
      })[0] as { args?: { amount?: bigint } } | undefined;
      const actualAmount =
        event?.args?.amount !== undefined ? event.args.amount : pendingSnapshot;
      const formattedAmount = formatToken(actualAmount);
      setClaimAmount(formattedAmount);
      setClaimStep("syncing");
      await Promise.all([
        mining.refetch(),
        claimedRewards.refetch(),
        rewardBalance.refetch(),
      ]);
      setLastClaimedAmount(formattedAmount);
      setClaimStep("success");
    } catch (cause) {
      setClaimError(describeClaimError(cause, t));
      setClaimStep("error");
    }
  }
  return (
    <div className="enter">
      <div className="mb-8">
        <span className="neo-kicker">Continuous Reward Stream</span>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          {t("rewards.title")}
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          {t("rewards.subtitle")}
        </p>
      </div>
      {lastClaimedAmount ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--success-soft)] px-5 py-4 text-[var(--success)]"
        >
          <CheckCircle2 size={20} />
          <p>{t("rewards.claimedNotice", { amount: lastClaimedAmount })}</p>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="relative min-h-[420px] overflow-hidden rounded-[24px] border border-[var(--line-strong)] bg-[radial-gradient(circle_at_80%_20%,rgba(60,242,195,.15),transparent_30%),linear-gradient(145deg,var(--reward-from),var(--reward-to))] p-7 shadow-[0_24px_80px_rgba(0,0,0,.25)] sm:p-9">
          <div className="data-grid absolute inset-y-0 right-0 w-2/5 opacity-25" />
          <div className="absolute right-[-4rem] top-[-4rem] h-72 w-72 rounded-full border border-[rgba(60,242,195,.16)]" />
          <div className="relative flex h-full flex-col">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--primary-soft)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[var(--neo)]">
              <Sparkles size={14} />
              Claimable now
            </span>
            <strong
              className="metric-value mt-12 block min-h-14 text-5xl sm:text-7xl"
              aria-live="polite"
            >
              {pending}{" "}
              <small className="text-xl text-[var(--muted)]">
                {REWARD_TOKEN.symbol}
              </small>
            </strong>
            <p className="mt-5 max-w-md leading-7 text-[var(--muted)]">
              {t("rewards.description")}
            </p>
            <div className="mt-auto pt-10">
              <button
                onClick={claim}
                disabled={
                  !isConnected ||
                  isPending ||
                  mining.pending === undefined ||
                  mining.pending <= 0n
                }
                className="neo-button flex min-h-13 items-center gap-2 rounded-xl px-7 font-extrabold"
              >
                <Gift size={19} />
                {isPending
                  ? t("rewards.waitWallet")
                  : !isConnected
                    ? t("common.connect")
                    : mining.pending !== undefined && mining.pending <= 0n
                      ? t("rewards.none")
                      : t("rewards.claim")}
              </button>
            </div>
          </div>
        </section>
        <div className="space-y-5">
          <section className="panel p-6">
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">
              <WalletCards size={17} className="text-[var(--neo)]" />
              Wallet Balance
            </p>
            <strong className="metric-value mt-5 block text-3xl">
              {walletBalance}{" "}
              <small className="text-base text-[var(--muted)]">
                {REWARD_TOKEN.symbol}
              </small>
            </strong>
            <button
              onClick={() => void addRewardToken()}
              disabled={!isConnected || isAddingToken}
              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--primary-soft)] px-3 text-sm font-bold text-[var(--primary-strong)] hover:bg-[rgba(60,242,195,.16)] disabled:opacity-50"
            >
              <WalletCards size={16} />
              {isAddingToken ? t("rewards.adding") : t("rewards.add")}
            </button>
          </section>
          <section className="panel p-6">
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted)]">
              <CheckCircle2 size={17} className="text-[var(--success)]" />
              Lifetime Claimed
            </p>
            <strong className="metric-value mt-5 block text-3xl">
              {claimed}{" "}
              <small className="text-base text-[var(--muted)]">
                {REWARD_TOKEN.symbol}
              </small>
            </strong>
            {claimedRewards.error ? (
              <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
                {t("rewards.unavailable")}
              </p>
            ) : null}
            <div className="mt-5 flex justify-between border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
              <span>{t("rewards.claimCount")}</span>
              <strong className="font-mono text-[var(--foreground)]">
                {claimedRewards.claimCount}
              </strong>
            </div>
          </section>
          <section className="panel grid grid-cols-2 gap-4 p-6">
            <div>
              <Award className="text-[var(--neo)]" size={19} />
              <p className="mt-3 text-sm font-bold">{REWARD_TOKEN.symbol}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">ERC-20 reward</p>
            </div>
            <div>
              <Clock3 className="text-[var(--electric)]" size={19} />
              <p className="mt-3 text-sm font-bold">{t("rewards.realtime")}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Index per second
              </p>
            </div>
          </section>
        </div>
      </div>
      <RewardClaimModal
        open={claimModalOpen}
        step={claimStep}
        amount={claimAmount}
        hash={claimHash}
        error={claimError}
        onClose={() => setClaimModalOpen(false)}
      />
    </div>
  );
}
