"use client";
import erc20 from "@/abis/ERC20.json";
import { isConfigured } from "@/constants/contracts";
import { useAccount, useBalance, useReadContract } from "wagmi";
import type { Address } from "viem";

export function useTokenBalance(token: Address, decimals = 18) {
  const { address } = useAccount();
  const native = useBalance({ address });
  const erc20Balance = useReadContract({
    abi: erc20,
    address: token,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && isConfigured(token) },
  });
  return { value: erc20Balance.data as bigint | undefined, decimals, native };
}
