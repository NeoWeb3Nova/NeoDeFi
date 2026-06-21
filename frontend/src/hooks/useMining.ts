"use client";
import miningAbi from "@/abis/ETFMining.json";
import { contracts, isConfigured } from "@/constants/contracts";
import { useAccount, useReadContracts } from "wagmi";

export function useMining() {
  const { address } = useAccount();
  const enabled = Boolean(address) && isConfigured(contracts.mining);
  const result = useReadContracts({
    contracts: [
      { abi: miningAbi, address: contracts.mining, functionName: "supplierStackedBalance", args: address ? [address] : undefined },
      { abi: miningAbi, address: contracts.mining, functionName: "getPendingMiningReward", args: address ? [address] : undefined },
      { abi: miningAbi, address: contracts.mining, functionName: "totalStackedBalance" },
      { abi: miningAbi, address: contracts.mining, functionName: "miningSpeedPerSecond" },
    ],
    query: { enabled },
  });
  return {
    staked: result.data?.[0]?.result as bigint | undefined,
    pending: result.data?.[1]?.result as bigint | undefined,
    totalStaked: result.data?.[2]?.result as bigint | undefined,
    speed: result.data?.[3]?.result as bigint | undefined,
    refetch: result.refetch,
  };
}
