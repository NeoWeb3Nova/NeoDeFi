"use client";

import { useCallback, useEffect, useState } from "react";
import type { TokenSymbol } from "@/constants/tokens";

export type TransactionStatus = "checking" | "approving" | "executing" | "success" | "failed";

export type TransactionRecord = {
  id: string;
  type: "invest" | "redeem";
  token: TokenSymbol;
  inputAmount: string;
  estimatedOutput: string;
  status: TransactionStatus;
  approvalHash?: `0x${string}`;
  transactionHash?: `0x${string}`;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "neo-etf:transaction-history:v1";
const MAX_RECORDS = 30;

export function useTransactionHistory() {
  const [records, setRecords] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TransactionRecord[];
        queueMicrotask(() => setRecords(parsed));
      }
    } catch {
      // Invalid browser storage must not block trading.
    }
  }, []);

  const persist = useCallback((next: TransactionRecord[]) => {
    setRecords(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const createRecord = useCallback((record: Omit<TransactionRecord, "id" | "createdAt" | "updatedAt">) => {
    const now = Date.now();
    const id = crypto.randomUUID();
    setRecords((current) => {
      const next = [{ ...record, id, createdAt: now, updatedAt: now }, ...current].slice(0, MAX_RECORDS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return id;
  }, []);

  const updateRecord = useCallback((id: string, patch: Partial<TransactionRecord>) => {
    setRecords((current) => {
      const next = current.map((record) => record.id === id ? { ...record, ...patch, updatedAt: Date.now() } : record);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecords = useCallback(() => persist([]), [persist]);

  return { records, createRecord, updateRecord, clearRecords };
}
