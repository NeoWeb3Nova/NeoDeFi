"use client";

import { useCallback, useEffect, useState } from "react";
import { parseAbiItem } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { contracts, isConfigured, SEPOLIA_DEPLOYMENT_BLOCKS } from "@/constants/contracts";

const claimedEvent = parseAbiItem(
  "event MiningRewardClaimed(address indexed supplier, uint256 amount)",
);

export function useClaimedRewards() {
  const { address } = useAccount();
  const client = usePublicClient();
  const [claimed, setClaimed] = useState<bigint>();
  const [claimCount, setClaimCount] = useState(0);
  const [lastClaimBlock, setLastClaimBlock] = useState<bigint>();
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!address || !client || !isConfigured(contracts.mining)) {
      setClaimed(undefined);
      setClaimCount(0);
      setLastClaimBlock(undefined);
      return;
    }
    setIsLoading(true);
    try {
      const logs = await client.getLogs({
        address: contracts.mining,
        event: claimedEvent,
        args: { supplier: address },
        fromBlock: SEPOLIA_DEPLOYMENT_BLOCKS.mining,
        toBlock: "latest",
      });
      const total = logs.reduce((sum, log) => sum + (log.args.amount ?? 0n), 0n);
      setClaimed(total);
      setClaimCount(logs.length);
      setLastClaimBlock(logs.at(-1)?.blockNumber);
    } finally {
      setIsLoading(false);
    }
  }, [address, client]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refetch();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refetch]);

  return { claimed, claimCount, lastClaimBlock, isLoading, refetch };
}
