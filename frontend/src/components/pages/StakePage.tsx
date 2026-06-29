"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  parseUnits,
} from "viem";
import { Activity, AlertCircle, Layers3, TrendingUp } from "lucide-react";
import miningAbi from "@/abis/ETFMining.json";
import erc20Abi from "@/abis/ERC20.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { REWARD_TOKEN } from "@/constants/tokens";
import { useMining } from "@/hooks/useMining";
import { formatToken, safeNumber } from "@/utils/format";
import { TransactionModal, type TxStep } from "../ui/TransactionModal";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { usePreferences } from "../providers/PreferencesProvider";

function describeStakeError(
  cause: unknown,
  t: (path: string, values?: Record<string, string | number>) => string,
) {
  if (cause instanceof BaseError) {
    const reverted = cause.walk(
      (item) => item instanceof ContractFunctionRevertedError,
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      if (reverted.data?.errorName === "ERC20InsufficientBalance")
        return t("stake.insufficient");
      if (reverted.data?.errorName === "ERC20InsufficientAllowance")
        return t("stake.allowance");
      return reverted.reason || reverted.shortMessage;
    }
    return cause.shortMessage;
  }
  return cause instanceof Error
    ? cause.message.split("\n")[0]
    : t("common.failedRetry");
}

export function StakePage() {
  const { t } = usePreferences();
  const [tab, setTab] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState<TxStep>("checking");
  const [error, setError] = useState("");
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const mining = useMining();
  const {
    balances,
    rawBalances,
    refetch: refetchBalances,
  } = usePortfolioBalances();
  const configured =
    isConfigured(contracts.mining) && isConfigured(contracts.etf);
  const staked =
    mining.staked === undefined ? "--" : formatToken(mining.staked);
  const total =
    mining.totalStaked === undefined ? "--" : formatToken(mining.totalStaked);
  const stakeShare =
    mining.staked !== undefined && mining.totalStaked && mining.totalStaked > 0n
      ? Number((mining.staked * 10_000n) / mining.totalStaked) / 100
      : 0;
  const dailyEmission =
    mining.speed === undefined
      ? undefined
      : Number(formatUnits(mining.speed, REWARD_TOKEN.decimals)) * 86_400;
  const estimatedDailyReward =
    dailyEmission === undefined
      ? undefined
      : mining.totalStaked && mining.totalStaked > 0n
        ? (dailyEmission * safeNumber(amount)) /
          (Number(formatUnits(mining.totalStaked, 18)) + safeNumber(amount))
        : safeNumber(amount) > 0
          ? dailyEmission
          : 0;
  const availableRaw = tab === "stake" ? rawBalances.NETF : mining.staked;
  let rawAmount: bigint | undefined;
  try {
    rawAmount = amount ? parseUnits(amount, 18) : undefined;
  } catch {
    rawAmount = undefined;
  }
  const amountExceedsBalance =
    rawAmount !== undefined &&
    availableRaw !== undefined &&
    rawAmount > availableRaw;

  async function submit() {
    setError("");
    if (!address || !isConnected) return setError(t("common.connect"));
    if (!rawAmount || rawAmount <= 0n) return setError(t("stake.invalid"));
    if (amountExceedsBalance)
      return setError(
        tab === "stake" ? t("stake.insufficient") : t("stake.unstakeExceeded"),
      );
    setModal(true);
    setStep("checking");
    if (!configured || !client) {
      await new Promise((r) => setTimeout(r, 450));
      setStep("approving");
      await new Promise((r) => setTimeout(r, 500));
      setStep("executing");
      await new Promise((r) => setTimeout(r, 650));
      setStep("success");
      return;
    }
    try {
      const raw = rawAmount;
      if (tab === "stake") {
        const allowance = (await client.readContract({
          abi: erc20Abi,
          address: contracts.etf,
          functionName: "allowance",
          args: [address, contracts.mining],
        })) as bigint;
        if (allowance < raw) {
          setStep("approving");
          const hash = await writeContractAsync({
            abi: erc20Abi,
            address: contracts.etf,
            functionName: "approve",
            args: [contracts.mining, raw],
          });
          await client.waitForTransactionReceipt({ hash });
        }
      }
      setStep("executing");
      await client.simulateContract({
        abi: miningAbi,
        address: contracts.mining,
        functionName: tab,
        args: [raw],
        account: address,
      });
      const hash = await writeContractAsync({
        abi: miningAbi,
        address: contracts.mining,
        functionName: tab,
        args: [raw],
      });
      await client.waitForTransactionReceipt({ hash });
      await Promise.all([mining.refetch(), refetchBalances()]);
      setStep("success");
    } catch (cause) {
      const message = describeStakeError(cause, t);
      setError(message);
      setStep("error");
    }
  }

  const available = tab === "stake" ? balances.NETF : staked;
  return (
    <div className="enter">
      <div className="mb-7">
        <span className="neo-kicker">Programmable Yield Layer</span>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          {t("stake.title")}
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          {t("stake.subtitle")}
        </p>
      </div>
      <div className="grid gap-7 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-5">
          <section className="panel relative overflow-hidden p-7">
            <div className="absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full border border-[var(--line-strong)]" />
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[var(--neo)]">
                Your Staked Position
              </p>
              <span className="rounded-full border border-[var(--line-strong)] bg-[var(--primary-soft)] px-3 py-1 font-mono text-[10px] font-bold text-[var(--primary-strong)]">
                {stakeShare.toFixed(2)}% SHARE
              </span>
            </div>
            <strong className="metric-value mt-9 block text-5xl">
              {staked}
            </strong>
            <p className="mt-2 text-sm text-[var(--muted)]">
              NETF committed to the mining contract
            </p>
            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-[#172130]">
              <div
                className="h-full bg-[var(--primary)] shadow-[0_0_12px_var(--primary)]"
                style={{ width: `${Math.min(stakeShare, 100)}%` }}
              />
            </div>
            <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-[.1em] text-[var(--muted)]">
              <span>Your position</span>
              <span>Total {total} NETF</span>
            </div>
          </section>
          <section className="panel p-7">
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">
              <TrendingUp size={17} className="text-[var(--neo)]" />
              Network Emission
            </p>
            <strong className="metric-value mt-6 block text-4xl">
              {dailyEmission === undefined ? "--" : dailyEmission.toFixed(4)}{" "}
              <small className="text-lg text-[var(--muted)]">
                {REWARD_TOKEN.symbol}/DAY
              </small>
            </strong>
            <div className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]">
              <Activity size={14} className="text-[var(--success)]" />
              Mining index updates onchain
            </div>
          </section>
        </div>
        <section className="panel p-5 sm:p-8">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--field)] p-1"
            role="tablist"
            aria-label={t("stake.type")}
          >
            {(["stake", "unstake"] as const).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => {
                  setTab(value);
                  setAmount("");
                  setError("");
                }}
                className={`min-h-12 rounded-lg font-bold ${tab === value ? "bg-[var(--primary-soft)] text-[var(--primary-strong)] shadow-[inset_0_0_0_1px_var(--line-strong)]" : "text-[var(--muted)] hover:bg-[rgba(255,255,255,.025)] hover:text-[var(--foreground)]"}`}
              >
                {value === "stake" ? t("stake.stake") : t("stake.unstake")}
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-between font-mono text-[10px] uppercase tracking-[.13em] text-[var(--muted)]">
            <span>{tab === "stake" ? "Available NETF" : "Staked NETF"}</span>
            <strong className="text-[var(--foreground)]">{available}</strong>
          </div>
          <label
            htmlFor="stake-amount"
            className="mt-6 block text-sm font-bold"
          >
            {tab === "stake"
              ? t("stake.amountStake")
              : t("stake.amountUnstake")}{" "}
            <span className="float-right font-mono text-[10px] text-[var(--muted)]">
              NETF
            </span>
          </label>
          <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--field)] p-5 focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_var(--focus)]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#163d91] text-[8px] font-extrabold">
                NETF
              </span>
              <input
                id="stake-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                placeholder="0.00"
                className="min-w-0 flex-1 border-0 bg-transparent text-right font-display text-4xl font-bold outline-none"
              />
              <button
                type="button"
                disabled={availableRaw === undefined}
                onClick={() => {
                  if (availableRaw !== undefined)
                    setAmount(formatUnits(availableRaw, 18));
                  setError("");
                }}
                className="min-h-11 rounded-lg border border-[var(--line-strong)] bg-[var(--primary-soft)] px-3 text-sm font-bold text-[var(--primary-strong)] hover:bg-[rgba(60,242,195,.16)] disabled:opacity-40"
              >
                {t("common.max")}
              </button>
            </div>
          </div>
          <div className="mt-5 flex justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm">
            <span className="text-[var(--muted)]">{t("stake.daily")}</span>
            <strong className="text-[var(--neo)]">
              {estimatedDailyReward === undefined
                ? "--"
                : estimatedDailyReward.toFixed(4)}{" "}
              {REWARD_TOKEN.symbol}
            </strong>
          </div>
          {amountExceedsBalance ? (
            <p
              role="alert"
              className="mt-4 flex gap-2 rounded-xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
            >
              <AlertCircle className="shrink-0" size={18} />
              {tab === "stake" ? t("stake.overStake") : t("stake.overUnstake")}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-4 flex gap-2 rounded-xl bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
            >
              <AlertCircle className="shrink-0" size={18} />
              {error}
            </p>
          ) : null}
          <button
            onClick={submit}
            disabled={!rawAmount || rawAmount <= 0n || amountExceedsBalance}
            className="neo-button mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl font-extrabold"
          >
            <Layers3 size={19} />
            {!isConnected
              ? t("common.connect")
              : tab === "stake"
                ? t("stake.confirmStake")
                : t("stake.confirmUnstake")}
          </button>
          {!configured ? (
            <p className="mt-3 text-center font-mono text-[10px] text-[var(--warning)]">
              DEMO MODE
            </p>
          ) : null}
        </section>
      </div>
      <TransactionModal
        open={modal}
        title={tab === "stake" ? t("stake.executeStake") : t("stake.unstake")}
        step={step}
        error={error}
        onClose={() => setModal(false)}
      />
    </div>
  );
}
