"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWatchAsset,
  useWriteContract,
} from "wagmi";
import { AlertCircle, Clock3, Droplets, Info, WalletCards } from "lucide-react";
import faucetAbi from "@/abis/ETFFaucet.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { TOKENS, type TokenSymbol } from "@/constants/tokens";
import { TokenIcon } from "../ui/TokenIcon";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import type { Abi } from "viem";

const faucetTokens: TokenSymbol[] = ["NBTC", "NETH", "LINK", "USDC"];

function formatCooldown(seconds?: number) {
  if (seconds === undefined) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

export function FaucetPage() {
  const { t, list } = usePreferences();
  const [tab, setTab] = useState<"all" | "single">("all");
  const [symbol, setSymbol] = useState<TokenSymbol>("NBTC");
  const [message, setMessage] = useState("");
  const [importingToken, setImportingToken] = useState<TokenSymbol>();
  const [requesting, setRequesting] = useState(false);
  const [optimisticUntil, setOptimisticUntil] = useState<
    Partial<Record<TokenSymbol, number>>
  >({});
  const requestLock = useRef(false);
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
    () =>
      Object.fromEntries(
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

  useEffect(() => {
    if (!address) {
      queueMicrotask(() => setOptimisticUntil({}));
      return;
    }
    const key = `neo-faucet-cooldown-${address.toLowerCase()}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<
        Record<TokenSymbol, number>
      >;
      queueMicrotask(() => setOptimisticUntil(saved));
    } catch {
      queueMicrotask(() => setOptimisticUntil({}));
    }
  }, [address]);

  const elapsedSeconds = cooldowns.dataUpdatedAt
    ? Math.max(0, Math.floor((now - cooldowns.dataUpdatedAt) / 1_000))
    : 0;
  const remaining = Object.fromEntries(
    faucetTokens.map((token) => {
      const chainRemaining =
        chainCooldowns[token] === undefined
          ? undefined
          : Math.max(0, chainCooldowns[token] - elapsedSeconds);
      const optimisticRemaining = optimisticUntil[token]
        ? Math.max(0, Math.ceil((optimisticUntil[token]! - now) / 1_000))
        : 0;
      return [
        token,
        chainRemaining === undefined
          ? optimisticRemaining || undefined
          : Math.max(chainRemaining, optimisticRemaining),
      ];
    }),
  ) as Record<TokenSymbol, number | undefined>;

  const selectedCooldown = remaining[symbol];
  const period = Number(cooldownPeriod.data ?? 0n);
  const periodReady = period > 0 && !cooldownPeriod.isError;
  const allCooldownsKnown = faucetTokens.every(
    (token) => remaining[token] !== undefined,
  );
  const cooldownDataReady =
    configured &&
    isConnected &&
    periodReady &&
    !cooldowns.isError &&
    (tab === "all" ? allCooldownsKnown : selectedCooldown !== undefined);
  const cooldownDataUnavailable =
    cooldowns.isError ||
    cooldownPeriod.isError ||
    (!cooldowns.isPending &&
      !cooldownPeriod.isPending &&
      cooldowns.data !== undefined &&
      !cooldownDataReady);
  const anyCoolingDown = faucetTokens.some(
    (token) => (remaining[token] ?? 0) > 0,
  );
  const selectedProgress =
    period > 0 && selectedCooldown !== undefined
      ? Math.min(100, Math.max(0, ((period - selectedCooldown) / period) * 100))
      : 0;
  const requestDisabled =
    requesting ||
    isPending ||
    !isConnected ||
    !cooldownDataReady ||
    (tab === "all" ? anyCoolingDown : (selectedCooldown ?? 0) > 0);

  async function addTokenToWallet(token: TokenSymbol) {
    if (!isConnected) return setMessage(t("common.connect"));
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
      setMessage(
        added
          ? t("faucet.added", { symbol: token })
          : t("faucet.notAdded", { symbol: token }),
      );
    } catch {
      setMessage(t("faucet.unsupported", { symbol: token }));
    } finally {
      setImportingToken(undefined);
    }
  }

  async function request() {
    if (requestLock.current) return;
    if (!isConnected) return setMessage(t("common.connect"));
    if (!configured || !client) return setMessage(t("faucet.config"));
    if (!cooldownDataReady)
      return setMessage(
        cooldownDataUnavailable
          ? t("faucet.cooldownUnavailable")
          : t("faucet.cooldownLoading"),
      );
    requestLock.current = true;
    setRequesting(true);
    setMessage("");
    try {
      const hash = await writeContractAsync({
        abi: faucetAbi,
        address: contracts.faucet,
        functionName: tab === "all" ? "requestAllTokens" : "requestTokens",
        args: tab === "single" ? [TOKENS[symbol].address] : undefined,
      });
      await client.waitForTransactionReceipt({ hash });
      const claimedTokens = tab === "all" ? faucetTokens : [symbol];
      const expiresAt = Date.now() + period * 1_000;
      const nextOptimistic = {
        ...optimisticUntil,
        ...Object.fromEntries(claimedTokens.map((token) => [token, expiresAt])),
      };
      setOptimisticUntil(nextOptimistic);
      if (address) {
        localStorage.setItem(
          `neo-faucet-cooldown-${address.toLowerCase()}`,
          JSON.stringify(nextOptimistic),
        );
      }
      await Promise.allSettled([refetchBalances(), cooldowns.refetch()]);
      setMessage(t("faucet.success"));
    } catch {
      setMessage(t("faucet.failed"));
    } finally {
      requestLock.current = false;
      setRequesting(false);
    }
  }
  return (
    <div className="enter grid gap-7 xl:grid-cols-[.72fr_1.28fr]">
      <div className="space-y-5">
        <section className="panel relative overflow-hidden p-7">
          <div className="data-grid absolute inset-y-0 right-0 w-1/2 opacity-20" />
          <div className="relative">
            <span className="neo-kicker">Sepolia Asset Terminal</span>
            <h1 className="mt-5 font-display text-3xl font-bold">
              {t("faucet.title")}
            </h1>
            <div className="mt-6 max-w-[56ch] space-y-4 leading-7 text-[var(--muted)]">
              <p>{t("faucet.intro1")}</p>
              <p>{t("faucet.intro2")}</p>
              <p className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--warning)]">
                Test assets · No real-world value
              </p>
            </div>
          </div>
        </section>
        <section className="panel p-7">
          <h2 className="flex items-center gap-3 font-display text-xl font-bold">
            <Clock3 className="text-[var(--warning)]" />
            {t("faucet.protocol")}
          </h2>
          <ol className="mt-6 space-y-5 text-sm text-[var(--muted)]">
            {list("faucet.steps").map((item, index) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--line)] font-mono text-[10px] text-[var(--neo)]">
                  0{index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="panel p-5 sm:p-8">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--field)] p-1">
          {(["all", "single"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`min-h-12 rounded-lg font-bold ${tab === value ? "bg-[var(--primary-soft)] text-[var(--primary-strong)] shadow-[inset_0_0_0_1px_var(--line-strong)]" : "text-[var(--muted)] hover:bg-[rgba(255,255,255,.025)] hover:text-[var(--foreground)]"}`}
            >
              {t(value === "all" ? "faucet.all" : "faucet.single")}
            </button>
          ))}
        </div>
        {tab === "all" ? (
          <>
            <div className="py-9 text-center">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-[var(--line-strong)] bg-[var(--primary-soft)] text-[var(--neo)] shadow-[0_0_40px_rgba(60,242,195,.08)]">
                <Droplets size={36} />
              </span>
              <h2 className="mt-5 font-display text-xl font-bold">
                {t("faucet.batchTitle")}
              </h2>
              <p className="mt-2 text-[var(--muted)]">
                {t("faucet.batchText")}
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {t("faucet.readability")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {faucetTokens.map((token) => (
                <div
                  key={token}
                  className="rounded-xl border border-[var(--line)] bg-[var(--field)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={token} />
                    <div>
                      <p className="font-bold">{token}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {t("common.balance")} {balances[token]}
                      </p>
                    </div>
                    <button
                      onClick={() => void addTokenToWallet(token)}
                      disabled={importingToken === token}
                      className="ml-auto min-h-11 rounded-lg border border-[var(--line-strong)] bg-[var(--primary-soft)] px-3 text-sm font-bold text-[var(--primary-strong)] hover:bg-[rgba(60,242,195,.16)] disabled:opacity-50"
                    >
                      {t(
                        importingToken === token
                          ? "faucet.adding"
                          : "faucet.add",
                      )}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3 font-mono text-[10px] uppercase tracking-[.1em]">
                    <span className="text-[var(--muted)]">
                      {t("common.cooldown")}
                    </span>
                    <span
                      className={
                        (remaining[token] ?? 0) > 0
                          ? "font-bold text-[var(--warning)]"
                          : "font-bold text-[var(--success)]"
                      }
                    >
                      {remaining[token] === undefined
                        ? "--:--"
                        : (remaining[token] ?? 0) > 0
                          ? formatCooldown(remaining[token])
                          : t("common.ready").toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {anyCoolingDown ? (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--warning-soft)] p-4 text-sm font-medium text-[var(--warning)]">
                <Clock3 size={18} />
                {t("faucet.cooling")}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <label className="mt-8 block font-bold">{t("faucet.select")}</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value as TokenSymbol)}
              className="mt-3 h-14 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 font-bold focus:border-[var(--primary)]"
            >
              {faucetTokens.map((token) => (
                <option key={token}>{token}</option>
              ))}
            </select>
            <div className="mt-7 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--field)] p-5">
              <TokenIcon symbol={symbol} />
              <div>
                <p className="font-bold">{symbol}</p>
                <p className="text-sm text-[var(--muted)]">
                  {TOKENS[symbol].name}
                </p>
              </div>
              <strong className="metric-value ml-auto">
                {balances[symbol]}
              </strong>
              <button
                onClick={() => void addTokenToWallet(symbol)}
                disabled={importingToken === symbol}
                className="min-h-11 rounded-lg border border-[var(--line-strong)] bg-[var(--primary-soft)] px-3 text-sm font-bold text-[var(--primary-strong)] hover:bg-[rgba(60,242,195,.16)] disabled:opacity-50"
              >
                <WalletCards size={15} className="mr-1 inline" />
                {t(
                  importingToken === symbol
                    ? "faucet.adding"
                    : "faucet.addWallet",
                )}
              </button>
            </div>
            <div className="mt-6">
              <p className="flex justify-between text-sm text-[var(--muted)]">
                <span>{t("common.cooldown")}</span>
                <span
                  className={
                    (selectedCooldown ?? 0) > 0
                      ? "font-bold text-[var(--warning)]"
                      : "font-bold text-[var(--success)]"
                  }
                >
                  {selectedCooldown === undefined
                    ? "--:--"
                    : selectedCooldown > 0
                      ? formatCooldown(selectedCooldown)
                      : t("common.ready")}
                </span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#172130]">
                <div
                  className="h-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)] transition-[width] duration-300"
                  style={{ width: `${selectedProgress}%` }}
                />
              </div>
            </div>
          </>
        )}
        {message ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]"
          >
            <AlertCircle size={18} />
            {message}
          </p>
        ) : null}
        {!message && isConnected && configured && !cooldownDataReady ? (
          <p
            role="status"
            aria-live="polite"
            className={`mt-6 flex items-center gap-2 rounded-xl p-4 text-sm ${
              cooldownDataUnavailable
                ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                : "bg-[var(--primary-soft)] text-[var(--primary-strong)]"
            }`}
          >
            {cooldownDataUnavailable ? (
              <AlertCircle size={18} />
            ) : (
              <Clock3 className="animate-pulse" size={18} />
            )}
            {cooldownDataUnavailable
              ? t("faucet.cooldownUnavailable")
              : t("faucet.cooldownLoading")}
          </p>
        ) : null}
        <button
          onClick={request}
          disabled={requestDisabled}
          className="neo-button mt-6 h-14 w-full rounded-xl font-extrabold"
        >
          {requesting || isPending
            ? t("faucet.requesting")
            : !isConnected
              ? t("common.connect")
              : !configured
                ? t("faucet.config")
                : !cooldownDataReady
                  ? cooldownDataUnavailable
                    ? t("faucet.cooldownUnavailable")
                    : t("faucet.cooldownLoading")
                  : tab === "all"
                    ? anyCoolingDown
                      ? t("faucet.wait")
                      : t("faucet.claimAll")
                    : (selectedCooldown ?? 0) > 0
                      ? t("faucet.after", {
                          time: formatCooldown(selectedCooldown),
                        })
                      : t("faucet.claimToken", { symbol })}
        </button>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
          <Info size={15} />
          {t("faucet.footer")}
        </p>
      </section>
    </div>
  );
}
