"use client";

import { useCallback, useEffect, useState } from "react";
import { parseAbiItem } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { contracts, isConfigured, SEPOLIA_DEPLOYMENT_BLOCKS } from "@/constants/contracts";

const claimedEvent = parseAbiItem(
  "event MiningRewardClaimed(address indexed supplier, uint256 amount)",
);
// Public RPC providers commonly cap eth_getLogs to 1,000 blocks per request.
// The range is inclusive, so a difference of 999 covers exactly 1,000 blocks.
const LOG_BLOCK_RANGE = 999n;

export function useClaimedRewards() {
  const { address } = useAccount();
  const client = usePublicClient();
  const [claimed, setClaimed] = useState<bigint>();
  const [claimCount, setClaimCount] = useState(0);
  const [lastClaimBlock, setLastClaimBlock] = useState<bigint>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refetch = useCallback(async () => {
    if (!address || !client || !isConfigured(contracts.mining)) {
      setClaimed(undefined);
      setClaimCount(0);
      setLastClaimBlock(undefined);
      setError(undefined);
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const latestBlock = await client.getBlockNumber();
      const logs = [];
      for (
        let fromBlock = SEPOLIA_DEPLOYMENT_BLOCKS.mining;
        fromBlock <= latestBlock;
        fromBlock += LOG_BLOCK_RANGE + 1n
      ) {
        const toBlock = fromBlock + LOG_BLOCK_RANGE > latestBlock
          ? latestBlock
          : fromBlock + LOG_BLOCK_RANGE;
        const chunk = await client.getLogs({
          address: contracts.mining,
          event: claimedEvent,
          args: { supplier: address },
          fromBlock,
          toBlock,
        });
        logs.push(...chunk);
      }
      const total = logs.reduce((sum, log) => sum + (log.args.amount ?? 0n), 0n);
      setClaimed(total);
      setClaimCount(logs.length);
      setLastClaimBlock(logs.at(-1)?.blockNumber);
    } catch {
      setClaimed(undefined);
      setClaimCount(0);
      setLastClaimBlock(undefined);
      setError("历史奖励暂时无法读取，请稍后重试");
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

  return { claimed, claimCount, lastClaimBlock, isLoading, error, refetch };
}
