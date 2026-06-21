import { formatUnits } from "viem";

export function formatToken(value?: bigint, decimals = 18, digits = 4) {
  if (value === undefined) return "0.0000";
  const amount = Number(formatUnits(value, decimals));
  return amount.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function shortAddress(value?: string) { return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : ""; }
export function safeNumber(value: string) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
