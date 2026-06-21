"use client";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { BaseError, ContractFunctionRevertedError, formatUnits, parseUnits } from "viem";
import { ArrowDownUp, BarChart3, Sparkles } from "lucide-react";
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

type Mode = "invest" | "redeem";
const outputTokens: TokenSymbol[] = ["USDC", "NETH", "NBTC", "LINK"];
const MIN_NETF_MINT_AMOUNT = 10n ** 18n;
const INVEST_QUOTE_BUDGET_PERCENT = 95n;

function describeContractError(cause: unknown) {
  if (cause instanceof BaseError) {
    const reverted = cause.walk((error) => error instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name === "LessThanMinMintAmount") return "投资数量低于最小铸造量 1 NETF";
      if (name === "OverSlippage") return "执行价格变化超过允许范围，请刷新报价后重试";
      if (name === "ERC20InsufficientAllowance") return "代币授权额度不足";
      if (name === "ERC20InsufficientBalance") return "代币余额不足";
      return name ? `合约拒绝交易：${name}` : reverted.shortMessage;
    }
    return cause.shortMessage;
  }
  return cause instanceof Error ? cause.message.split("\n")[0] : "交易失败，请重试";
}

export function TradePage() {
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
  const { balances, refetch: refetchBalances } = usePortfolioBalances();
  const history = useTransactionHistory();
  const numeric = safeNumber(amount);
  const availableBalance = safeNumber(mode === "invest" ? balances[symbol] : balances.NETF);
  const amountExceedsBalance = numeric > 0 && balances[mode === "invest" ? symbol : "NETF"] !== "--" && numeric > availableBalance;
  const configured = isConfigured(contracts.trading) && isConfigured(contracts.quoter) && isConfigured(TOKENS[symbol].address);
  const investQuoteKey = `${symbol}:${amount}`;
  const investQuote = investQuoteResult?.key === investQuoteKey ? investQuoteResult : undefined;
  const minimumInvest = minimumInvestResult?.key === investQuoteKey ? minimumInvestResult : undefined;
  const isInvestQuoteLoading = investQuoteLoadingKey === investQuoteKey;
  let quoteInput: bigint | undefined;
  try {
    quoteInput = numeric && mode === "redeem" ? parseUnits(amount, TOKENS.NETF.decimals) : undefined;
  } catch {
    quoteInput = undefined;
  }
  const liveQuote = useReadContract({
    abi: quoterAbi,
    address: contracts.quoter,
    functionName: "quoteRedeemToToken",
    args: quoteInput ? [contracts.trading, TOKENS[symbol].address, quoteInput] : undefined,
    query: { enabled: configured && mode === "redeem" && Boolean(quoteInput) },
  });

  useEffect(() => {
    if (mode !== "invest" || !configured || !client || !numeric || amountExceedsBalance) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setInvestQuoteLoadingKey(investQuoteKey);
      try {
        const budget = parseUnits(amount, TOKENS[symbol].decimals);
        // Size the mint against 95% of the user's exact-input budget. The full
        // entered amount remains the hard max, leaving execution headroom.
        const quoteBudget = budget * INVEST_QUOTE_BUDGET_PERCENT / 100n;
        const quoteMintAmount = async (mintAmount: bigint) => {
          const result = await client.readContract({
            abi: quoterAbi,
            address: contracts.quoter,
            functionName: "quoteInvestWithToken",
            args: [contracts.trading, TOKENS[symbol].address, mintAmount],
          }) as readonly [bigint, readonly `0x${string}`[]];
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
        for (let index = 0; index < 32 && highQuote.requiredAmount <= quoteBudget; index += 1) {
          low = high;
          high *= 2n;
          highQuote = await quoteMintAmount(high);
        }

        let best: { mintAmount: bigint; requiredAmount: bigint; paths: readonly `0x${string}`[] } | undefined;
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
        if (!cancelled) setInvestQuoteResult(best ? { key: investQuoteKey, ...best } : undefined);
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
  }, [amount, amountExceedsBalance, client, configured, investQuoteKey, mode, numeric, symbol]);

  const quotedTokenAmount = (liveQuote.data as readonly [bigint, readonly `0x${string}`[]] | undefined)?.[0];
  const tokenEstimate = quotedTokenAmount === undefined
    ? numeric ? "--" : "0.000000"
    : formatToken(quotedTokenAmount, TOKENS[symbol].decimals, 6);
  const netfEstimate = investQuote
    ? Number(formatUnits(investQuote.mintAmount, TOKENS.NETF.decimals)).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })
    : numeric ? "--" : "0.000000";

  async function submit() {
    setError("");
    if (!isConnected || !address) return setError("请先连接钱包");
    if (!numeric) return setError("请输入有效数量");
    if (amountExceedsBalance) return setError("输入金额不能超过当前代币余额");
    const recordId = history.createRecord({
      type: mode,
      token: symbol,
      inputAmount: amount,
      estimatedOutput: mode === "invest" ? netfEstimate : tokenEstimate,
      status: "checking",
    });
    setModal(true); setStep("checking");
    if (!configured || !client) {
      await new Promise(r => setTimeout(r, 500)); setStep("approving");
      await new Promise(r => setTimeout(r, 650)); setStep("executing");
      await new Promise(r => setTimeout(r, 700)); setStep("success");
      return;
    }
    try {
      const rawNetfAmount = mode === "invest"
        ? investQuote?.mintAmount
        : parseUnits(amount, TOKENS.NETF.decimals);
      if (!rawNetfAmount) throw new Error("无法获得有效报价，请稍后重试");
      const quote = await client.readContract({
        abi: quoterAbi, address: contracts.quoter,
        functionName: mode === "invest" ? "quoteInvestWithToken" : "quoteRedeemToToken",
        args: [contracts.trading, TOKENS[symbol].address, rawNetfAmount],
      }) as readonly [bigint, readonly `0x${string}`[]];
      const approvalToken = mode === "invest" ? TOKENS[symbol] : TOKENS.NETF;
      const rawInvestBudget = mode === "invest" ? parseUnits(amount, TOKENS[symbol].decimals) : 0n;
      // Exact-input invest approves and caps spending at the user's entered amount.
      const approvalAmount = mode === "invest" ? rawInvestBudget : rawNetfAmount;
      const allowance = await client.readContract({ abi: erc20Abi, address: approvalToken.address, functionName: "allowance", args: [address, contracts.trading] }) as bigint;
      if (allowance < approvalAmount) {
        setStep("approving");
        history.updateRecord(recordId, { status: "approving" });
        const approveHash = await writeContractAsync({ abi: erc20Abi, address: approvalToken.address, functionName: "approve", args: [contracts.trading, approvalAmount] });
        history.updateRecord(recordId, { approvalHash: approveHash });
        await client.waitForTransactionReceipt({ hash: approveHash });
      }
      setStep("executing");
      history.updateRecord(recordId, { status: "executing" });
      const protectedAmount = mode === "invest" ? rawInvestBudget : quote[0] * 995n / 1000n;
      const transaction = {
        abi: tradingAbi, address: contracts.trading,
        functionName: mode === "invest" ? "investWithToken" : "redeemToToken",
        args: [TOKENS[symbol].address, address, rawNetfAmount, protectedAmount, quote[1]],
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
      const message = describeContractError(cause);
      history.updateRecord(recordId, { status: "failed", error: message });
      setModal(false);
      setError(message);
    }
  }

  return <div className="enter mx-auto max-w-[820px]">
    <div className="mb-7"><h1 className="font-display text-3xl font-bold">Invest & Redeem</h1><p className="mt-2 text-sm text-[var(--muted)]">用支持的代币投资 Neo ETF，或将 NETF 赎回为指定资产</p></div>
    <section className="panel p-5 md:p-7">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-soft)] p-1">{(["invest","redeem"] as Mode[]).map(value => <button key={value} onClick={() => { setMode(value); setAmount(""); }} className={`min-h-11 rounded-lg font-bold ${mode === value ? "bg-white text-[var(--primary-strong)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{value === "invest" ? "Invest" : "Redeem"}</button>)}</div>
      <div className="mt-7 flex items-center justify-between"><label className="flex items-center gap-2 font-bold"><BarChart3 size={18} className="text-blue-500"/>{mode === "invest" ? "Select Token" : "Receive Token"}</label><span className="text-sm text-slate-500">Balance: {mode === "invest" ? balances[symbol] : balances.NETF}</span></div>
      <select value={symbol} onChange={e => setSymbol(e.target.value as TokenSymbol)} className="mt-3 h-13 w-full rounded-xl border border-[var(--line)] bg-white px-4 font-bold focus:border-[var(--primary)]">{outputTokens.map(token => <option key={token}>{token}</option>)}</select>
      <div className="mt-5 rounded-2xl border border-[var(--line)] p-5">
        <p className="mb-4 font-bold">{mode === "invest" ? "Amount to Invest" : "Amount to Redeem"}</p>
        <div className="flex items-center gap-3"><TokenIcon symbol={mode === "invest" ? symbol : "NETF"}/><div><p className="font-bold">{mode === "invest" ? symbol : "NETF"}</p><p className="text-sm text-slate-500">{TOKENS[mode === "invest" ? symbol : "NETF"].name}</p></div><button disabled={(mode === "invest" ? balances[symbol] : balances.NETF) === "--"} onClick={() => setAmount(mode === "invest" ? balances[symbol] : balances.NETF)} className="ml-auto rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold disabled:text-slate-300">Max</button></div>
        <input aria-label="交易数量" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" className="mt-5 w-full border-0 border-t border-[var(--line)] pt-4 text-right font-display text-3xl font-bold outline-none"/>
      </div>
      <div className="soft-panel mt-5 p-5"><p className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-blue-600"/>{mode === "invest" ? "Estimated NETF Received" : `Estimated ${symbol} Received`}</p><div className="mt-4 flex items-center gap-3"><TokenIcon symbol={mode === "invest" ? "NETF" : symbol}/><strong>{mode === "invest" ? "NETF" : symbol}</strong><span className="ml-auto font-display text-2xl font-bold">{mode === "invest" && isInvestQuoteLoading ? "Quoting…" : mode === "invest" ? netfEstimate : tokenEstimate}</span></div><div className="mt-4 border-t border-blue-100 pt-3 text-right text-xs text-slate-500">ETFQuoter · exact input estimate</div></div>
      {mode === "redeem" && liveQuote.error && numeric ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">报价暂不可用：{liveQuote.error.shortMessage || "请检查输入数量和网络连接"}</p> : null}
      {amountExceedsBalance ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">输入金额超过当前可用余额 {mode === "invest" ? balances[symbol] : balances.NETF} {mode === "invest" ? symbol : "NETF"}</p> : null}
      {mode === "invest" && minimumInvest ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">Trading 合约每次至少铸造 1 NETF，当前至少需要约 {formatToken(minimumInvest.requiredAmount, TOKENS[symbol].decimals, 6)} {symbol}。</p> : null}
      {mode === "invest" && numeric && !amountExceedsBalance && !isInvestQuoteLoading && !investQuote && !minimumInvest ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">当前输入金额无法获得有效 NETF 报价，请检查网络后重试。</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
      <button onClick={submit} disabled={!numeric || amountExceedsBalance || (mode === "invest" ? isInvestQuoteLoading || !investQuote : liveQuote.isLoading || !quotedTokenAmount)} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] font-bold text-white shadow-[0_8px_18px_rgba(37,89,214,.18)] hover:bg-[var(--primary-strong)] disabled:bg-[#cbd6eb] disabled:text-[#62708a] disabled:shadow-none"><ArrowDownUp size={19}/>{mode === "invest" && isInvestQuoteLoading || mode === "redeem" && liveQuote.isLoading ? "Getting Quote…" : mode === "invest" ? "Invest Now" : "Redeem Now"}</button>
      {!configured ? <p className="mt-3 text-center text-xs text-amber-600">演示模式：配置 .env.local 合约地址后将执行真实链上交易</p> : null}
    </section>
    <TransactionHistory records={history.records} onClear={history.clearRecords}/>
    <TransactionModal open={modal} title={mode === "invest" ? "执行投资" : "执行赎回"} step={step} onClose={() => setModal(false)}/>
  </div>;
}
