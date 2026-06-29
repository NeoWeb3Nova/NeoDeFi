"use client";
import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  parseUnits,
} from "viem";
import {
  ArrowDownUp,
  BarChart3,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import erc20Abi from "@/abis/ERC20.json";
import quoterAbi from "@/abis/ETFQuoter.json";
import tradingAbi from "@/abis/ETFTrading.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { TOKENS, type TokenSymbol } from "@/constants/tokens";
import { formatToken, safeNumber } from "@/utils/format";
import { TokenIcon } from "../ui/TokenIcon";
import { TransactionModal, type TxStep } from "../ui/TransactionModal";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { TransactionHistory } from "../ui/TransactionHistory";
import { usePreferences } from "../providers/PreferencesProvider";

type Mode = "invest" | "redeem";
const outputTokens: TokenSymbol[] = ["USDC", "NETH", "NBTC", "LINK"];
const MIN_NETF_MINT_AMOUNT = 10n ** 18n;
const INVEST_QUOTE_BUDGET_PERCENT = 95n;

function describeContractError(
  cause: unknown,
  t: (path: string, values?: Record<string, string | number>) => string,
) {
  if (cause instanceof BaseError) {
    const reverted = cause.walk(
      (error) => error instanceof ContractFunctionRevertedError,
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name === "LessThanMinMintAmount") return t("trade.minMint");
      if (name === "OverSlippage") return t("trade.slippage");
      if (name === "ERC20InsufficientAllowance") return t("trade.allowance");
      if (name === "ERC20InsufficientBalance") return t("trade.balance");
      return name
        ? t("trade.rejected", { reason: name })
        : reverted.shortMessage;
    }
    return cause.shortMessage;
  }
  return cause instanceof Error
    ? cause.message.split("\n")[0]
    : t("common.failedRetry");
}

export function TradePage() {
  const { t } = usePreferences();
  const [mode, setMode] = useState<Mode>("invest");
  const [symbol, setSymbol] = useState<TokenSymbol>("USDC");
  const [amount, setAmount] = useState("");
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState<TxStep>("checking");
  const [error, setError] = useState("");
  const [investQuoteResult, setInvestQuoteResult] = useState<{
    key: string;
    mintAmount: bigint;
    requiredAmount: bigint;
    paths: readonly `0x${string}`[];
  }>();
  const [investQuoteLoadingKey, setInvestQuoteLoadingKey] = useState("");
  const [minimumInvestResult, setMinimumInvestResult] = useState<{
    key: string;
    requiredAmount: bigint;
  }>();
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const {
    balances,
    rawBalances,
    refetch: refetchBalances,
  } = usePortfolioBalances();
  const history = useTransactionHistory();
  const numeric = safeNumber(amount);
  const balanceSymbol = mode === "invest" ? symbol : "NETF";
  const balanceDecimals = TOKENS[balanceSymbol].decimals;
  let rawInputAmount: bigint | undefined;
  try {
    rawInputAmount = amount ? parseUnits(amount, balanceDecimals) : undefined;
  } catch {
    rawInputAmount = undefined;
  }
  const amountExceedsBalance =
    rawInputAmount !== undefined &&
    rawBalances[balanceSymbol] !== undefined &&
    rawInputAmount > rawBalances[balanceSymbol];
  const configured =
    isConfigured(contracts.trading) &&
    isConfigured(contracts.quoter) &&
    isConfigured(TOKENS[symbol].address);
  const investQuoteKey = `${symbol}:${amount}`;
  const investQuote =
    investQuoteResult?.key === investQuoteKey ? investQuoteResult : undefined;
  const minimumInvest =
    minimumInvestResult?.key === investQuoteKey
      ? minimumInvestResult
      : undefined;
  const isInvestQuoteLoading = investQuoteLoadingKey === investQuoteKey;
  let quoteInput: bigint | undefined;
  try {
    quoteInput =
      numeric && mode === "redeem"
        ? parseUnits(amount, TOKENS.NETF.decimals)
        : undefined;
  } catch {
    quoteInput = undefined;
  }
  const liveQuote = useReadContract({
    abi: quoterAbi,
    address: contracts.quoter,
    functionName: "quoteRedeemToToken",
    args: quoteInput
      ? [contracts.trading, TOKENS[symbol].address, quoteInput]
      : undefined,
    query: { enabled: configured && mode === "redeem" && Boolean(quoteInput) },
  });

  useEffect(() => {
    if (
      mode !== "invest" ||
      !configured ||
      !client ||
      !numeric ||
      amountExceedsBalance
    )
      return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setInvestQuoteLoadingKey(investQuoteKey);
      try {
        const budget = parseUnits(amount, TOKENS[symbol].decimals);
        // Size the mint against 95% of the user's exact-input budget. The full
        // entered amount remains the hard max, leaving execution headroom.
        const quoteBudget = (budget * INVEST_QUOTE_BUDGET_PERCENT) / 100n;
        const quoteMintAmount = async (mintAmount: bigint) => {
          const result = (await client.readContract({
            abi: quoterAbi,
            address: contracts.quoter,
            functionName: "quoteInvestWithToken",
            args: [contracts.trading, TOKENS[symbol].address, mintAmount],
          })) as readonly [bigint, readonly `0x${string}`[]];
          return { requiredAmount: result[0], paths: result[1] };
        };

        // The deployed Trading contract rejects mint amounts below 1 NETF.
        const minimumQuote = await quoteMintAmount(MIN_NETF_MINT_AMOUNT);
        if (minimumQuote.requiredAmount > quoteBudget) {
          if (!cancelled) {
            setMinimumInvestResult({
              key: investQuoteKey,
              requiredAmount: minimumQuote.requiredAmount,
            });
            setInvestQuoteResult(undefined);
          }
          return;
        }
        if (!cancelled) setMinimumInvestResult(undefined);

        // Find an upper bound, then solve the inverse quote with binary search.
        let low = MIN_NETF_MINT_AMOUNT;
        let high = MIN_NETF_MINT_AMOUNT;
        let highQuote = minimumQuote;
        for (
          let index = 0;
          index < 32 && highQuote.requiredAmount <= quoteBudget;
          index += 1
        ) {
          low = high;
          high *= 2n;
          highQuote = await quoteMintAmount(high);
        }

        let best:
          | {
              mintAmount: bigint;
              requiredAmount: bigint;
              paths: readonly `0x${string}`[];
            }
          | undefined;
        for (let index = 0; index < 28 && low <= high; index += 1) {
          const mid = (low + high) / 2n;
          if (mid === 0n) break;
          const quote = await quoteMintAmount(mid);
          if (quote.requiredAmount <= quoteBudget) {
            best = { mintAmount: mid, ...quote };
            low = mid + 1n;
          } else {
            high = mid - 1n;
          }
        }
        if (!cancelled)
          setInvestQuoteResult(
            best ? { key: investQuoteKey, ...best } : undefined,
          );
      } catch {
        if (!cancelled) {
          setInvestQuoteResult(undefined);
          setMinimumInvestResult(undefined);
        }
      } finally {
        if (!cancelled) setInvestQuoteLoadingKey("");
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    amount,
    amountExceedsBalance,
    client,
    configured,
    investQuoteKey,
    mode,
    numeric,
    symbol,
  ]);

  const quotedTokenAmount = (
    liveQuote.data as readonly [bigint, readonly `0x${string}`[]] | undefined
  )?.[0];
  const tokenEstimate =
    quotedTokenAmount === undefined
      ? numeric
        ? "--"
        : "0.000000"
      : formatToken(quotedTokenAmount, TOKENS[symbol].decimals, 6);
  const netfEstimate = investQuote
    ? Number(
        formatUnits(investQuote.mintAmount, TOKENS.NETF.decimals),
      ).toLocaleString(undefined, {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
      })
    : numeric
      ? "--"
      : "0.000000";

  async function submit() {
    setError("");
    if (!isConnected || !address) return setError(t("common.connect"));
    if (!numeric) return setError(t("trade.invalid"));
    if (amountExceedsBalance) return setError(t("trade.overBalance"));
    const recordId = history.createRecord({
      type: mode,
      token: symbol,
      inputAmount: amount,
      estimatedOutput: mode === "invest" ? netfEstimate : tokenEstimate,
      status: "checking",
    });
    setModal(true);
    setStep("checking");
    if (!configured || !client) {
      await new Promise((r) => setTimeout(r, 500));
      setStep("approving");
      await new Promise((r) => setTimeout(r, 650));
      setStep("executing");
      await new Promise((r) => setTimeout(r, 700));
      setStep("success");
      return;
    }
    try {
      const rawNetfAmount =
        mode === "invest"
          ? investQuote?.mintAmount
          : parseUnits(amount, TOKENS.NETF.decimals);
      if (!rawNetfAmount) throw new Error(t("trade.invalidQuote"));
      const quote = (await client.readContract({
        abi: quoterAbi,
        address: contracts.quoter,
        functionName:
          mode === "invest" ? "quoteInvestWithToken" : "quoteRedeemToToken",
        args: [contracts.trading, TOKENS[symbol].address, rawNetfAmount],
      })) as readonly [bigint, readonly `0x${string}`[]];
      const approvalToken = mode === "invest" ? TOKENS[symbol] : TOKENS.NETF;
      const rawInvestBudget =
        mode === "invest" ? parseUnits(amount, TOKENS[symbol].decimals) : 0n;
      // Exact-input invest approves and caps spending at the user's entered amount.
      const approvalAmount =
        mode === "invest" ? rawInvestBudget : rawNetfAmount;
      const allowance = (await client.readContract({
        abi: erc20Abi,
        address: approvalToken.address,
        functionName: "allowance",
        args: [address, contracts.trading],
      })) as bigint;
      if (allowance < approvalAmount) {
        setStep("approving");
        history.updateRecord(recordId, { status: "approving" });
        const approveHash = await writeContractAsync({
          abi: erc20Abi,
          address: approvalToken.address,
          functionName: "approve",
          args: [contracts.trading, approvalAmount],
        });
        history.updateRecord(recordId, { approvalHash: approveHash });
        await client.waitForTransactionReceipt({ hash: approveHash });
      }
      setStep("executing");
      history.updateRecord(recordId, { status: "executing" });
      const protectedAmount =
        mode === "invest" ? rawInvestBudget : (quote[0] * 995n) / 1000n;
      const transaction = {
        abi: tradingAbi,
        address: contracts.trading,
        functionName: mode === "invest" ? "investWithToken" : "redeemToToken",
        args: [
          TOKENS[symbol].address,
          address,
          rawNetfAmount,
          protectedAmount,
          quote[1],
        ],
      } as const;
      // Catch contract custom errors before asking the wallet for the second signature.
      await client.simulateContract({ ...transaction, account: address });
      const hash = await writeContractAsync(transaction);
      history.updateRecord(recordId, { transactionHash: hash });
      await client.waitForTransactionReceipt({ hash });
      await refetchBalances();
      history.updateRecord(recordId, { status: "success" });
      setStep("success");
    } catch (cause) {
      const message = describeContractError(cause, t);
      history.updateRecord(recordId, { status: "failed", error: message });
      setStep("error");
      setError(message);
    }
  }

  return (
    <div className="enter mx-auto max-w-[980px]">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="neo-kicker">Atomic Execution Engine</span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            {t("trade.title")}
          </h1>
          <p className="mt-2 text-base text-[var(--muted)]">
            {t("trade.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">
          <ShieldCheck size={16} className="text-[var(--neo)]" />
          Self-custodial
        </div>
      </div>
      <section className="panel relative overflow-hidden p-5 md:p-8">
        <div className="data-grid pointer-events-none absolute right-0 top-0 h-40 w-56 opacity-25" />
        <div
          className="relative grid grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--field)] p-1"
          role="tablist"
          aria-label={t("trade.type")}
        >
          {(["invest", "redeem"] as Mode[]).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setAmount("");
                setError("");
              }}
              className={`min-h-12 rounded-lg font-bold ${mode === value ? "bg-[var(--primary-soft)] text-[var(--primary-strong)] shadow-[inset_0_0_0_1px_var(--line-strong)]" : "text-[var(--muted)] hover:bg-[rgba(255,255,255,.025)] hover:text-[var(--foreground)]"}`}
            >
              {value === "invest" ? t("trade.invest") : t("trade.redeem")}
            </button>
          ))}
        </div>
        <div className="relative mt-8 grid gap-5 md:grid-cols-[.92fr_1.08fr]">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="trade-token"
                  className="flex items-center gap-2 text-sm font-bold"
                >
                  <BarChart3 size={17} className="text-[var(--neo)]" />
                  {mode === "invest" ? t("trade.pay") : t("trade.receive")}
                </label>
                <span className="text-right font-mono text-[10px] text-[var(--muted)]">
                  BAL {mode === "invest" ? balances[symbol] : balances.NETF}
                </span>
              </div>
              <select
                id="trade-token"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value as TokenSymbol);
                  setError("");
                }}
                className="mt-3 h-14 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 font-bold focus:border-[var(--primary)]"
              >
                {outputTokens.map((token) => (
                  <option key={token}>{token}</option>
                ))}
              </select>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--field)] p-5">
              <label
                htmlFor="trade-amount"
                className="mb-5 block font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted)]"
              >
                {mode === "invest"
                  ? t("trade.investAmount")
                  : t("trade.redeemAmount")}
              </label>
              <div className="flex items-center gap-3">
                <TokenIcon symbol={balanceSymbol} size={42} />
                <div>
                  <p className="font-bold">{balanceSymbol}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {TOKENS[balanceSymbol].name}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={rawBalances[balanceSymbol] === undefined}
                  onClick={() => {
                    const balance = rawBalances[balanceSymbol];
                    if (balance !== undefined)
                      setAmount(formatUnits(balance, balanceDecimals));
                    setError("");
                  }}
                  className="ml-auto min-h-11 rounded-lg border border-[var(--line-strong)] bg-[var(--primary-soft)] px-4 text-sm font-bold text-[var(--primary-strong)] hover:bg-[rgba(60,242,195,.16)] disabled:text-[#566174]"
                >
                  {t("common.max")}
                </button>
              </div>
              <input
                id="trade-amount"
                aria-describedby="trade-helper"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                placeholder="0.0"
                className="mt-5 w-full border-0 border-t border-[var(--line)] bg-transparent pt-5 text-right font-display text-4xl font-bold text-[var(--text)] outline-none"
              />
              <p
                id="trade-helper"
                className="mt-2 text-right font-mono text-[10px] uppercase tracking-[.12em] text-[var(--muted)]"
              >
                Exact input · wallet balance capped
              </p>
            </div>
          </div>
          <div
            className="soft-panel relative flex min-h-[268px] flex-col overflow-hidden p-6"
            aria-live="polite"
          >
            <div className="absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full border border-[var(--line-strong)]" />
            <p className="relative flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[var(--neo)]">
              <Sparkles size={16} />
              {mode === "invest"
                ? t("trade.estimatedNetf")
                : t("trade.estimatedToken", { symbol })}
            </p>
            <div className="relative my-auto py-8">
              <div className="flex items-center gap-3">
                <TokenIcon
                  symbol={mode === "invest" ? "NETF" : symbol}
                  size={48}
                />
                <div>
                  <strong className="block text-lg">
                    {mode === "invest" ? "NETF" : symbol}
                  </strong>
                  <span className="text-xs text-[var(--muted)]">
                    Neo DeFi quoted output
                  </span>
                </div>
              </div>
              <span className="metric-value mt-8 block break-all text-right text-4xl font-bold sm:text-5xl">
                {mode === "invest" && isInvestQuoteLoading
                  ? t("trade.quoting")
                  : mode === "invest"
                    ? netfEstimate
                    : tokenEstimate}
              </span>
            </div>
            <div className="relative flex items-center justify-between border-t border-[var(--line-strong)] pt-4 font-mono text-[9px] uppercase tracking-[.12em] text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <Route size={13} />
                ETFQuoter
              </span>
              <span>Exact input path</span>
            </div>
          </div>
        </div>
        {mode === "redeem" && liveQuote.error && numeric ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[rgba(255,186,105,.2)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]"
          >
            {t("trade.quoteUnavailable", {
              reason: liveQuote.error.shortMessage || t("common.failedRetry"),
            })}
          </p>
        ) : null}
        {amountExceedsBalance ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
          >
            {t("trade.exceeds", {
              balance: mode === "invest" ? balances[symbol] : balances.NETF,
              symbol: mode === "invest" ? symbol : "NETF",
            })}
          </p>
        ) : null}
        {mode === "invest" && minimumInvest ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[rgba(255,186,105,.2)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]"
          >
            {t("trade.min", {
              amount: formatToken(
                minimumInvest.requiredAmount,
                TOKENS[symbol].decimals,
                6,
              ),
              symbol,
            })}
          </p>
        ) : null}
        {mode === "invest" &&
        numeric &&
        !amountExceedsBalance &&
        !isInvestQuoteLoading &&
        !investQuote &&
        !minimumInvest ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[rgba(255,186,105,.2)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]"
          >
            {t("trade.noQuote")}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}
        <button
          onClick={submit}
          disabled={
            !numeric ||
            amountExceedsBalance ||
            (mode === "invest"
              ? isInvestQuoteLoading || !investQuote
              : liveQuote.isLoading || !quotedTokenAmount)
          }
          className="neo-button mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl font-extrabold"
        >
          <ArrowDownUp size={19} />
          {(mode === "invest" && isInvestQuoteLoading) ||
          (mode === "redeem" && liveQuote.isLoading)
            ? t("trade.fetching")
            : !isConnected
              ? t("common.connect")
              : mode === "invest"
                ? t("trade.confirmInvest")
                : t("trade.confirmRedeem")}
        </button>
        {!configured ? (
          <p className="mt-3 text-center font-mono text-[10px] text-[var(--warning)]">
            DEMO MODE · CONTRACT ADDRESSES REQUIRED
          </p>
        ) : null}
      </section>
      <TransactionHistory
        records={history.records}
        onClear={history.clearRecords}
      />
      <TransactionModal
        open={modal}
        title={
          mode === "invest"
            ? t("trade.executeInvest")
            : t("trade.executeRedeem")
        }
        step={step}
        error={error}
        onClose={() => setModal(false)}
      />
    </div>
  );
}
