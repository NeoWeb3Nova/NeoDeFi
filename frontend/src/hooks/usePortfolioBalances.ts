"use client";

import erc20Abi from "@/abis/ERC20.json";
import { TOKENS, type TokenSymbol } from "@/constants/tokens";
import { formatToken } from "@/utils/format";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import type { Abi } from "viem";

const symbols: TokenSymbol[] = ["NETF", "NBTC", "NETH", "LINK", "USDC"];

export function usePortfolioBalances() {
  const { address } = useAccount();
  const native = useBalance({ address });
  const reads = useReadContracts({
    contracts: symbols.map((symbol) => ({
      abi: erc20Abi as Abi,
      address: TOKENS[symbol].address,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
    })),
    query: { enabled: Boolean(address) },
  });

  const balances = Object.fromEntries(
    symbols.map((symbol, index) => {
      const value = reads.data?.[index]?.result as bigint | undefined;
      return [symbol, value === undefined ? "--" : formatToken(value, TOKENS[symbol].decimals)];
    }),
  ) as Record<TokenSymbol, string>;

  return {
    balances,
    nativeBalance: native.data ? formatToken(native.data.value, native.data.decimals) : "--",
    refetch: async () => {
      await Promise.all([native.refetch(), reads.refetch()]);
    },
  };
}
