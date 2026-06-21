import { contracts } from "./contracts";

export type TokenSymbol = "NETF" | "NBTC" | "NETH" | "LINK" | "USDC";
export const TOKENS = {
  NETF: { symbol: "NETF", name: "Neo ETF", decimals: 18, color: "#163d91", address: contracts.etf },
  NBTC: { symbol: "NBTC", name: "Neo Bitcoin", decimals: 8, color: "#f59e0b", address: contracts.tokens.NBTC },
  NETH: { symbol: "NETH", name: "Neo Ether", decimals: 18, color: "#6478ef", address: contracts.tokens.NETH },
  LINK: { symbol: "LINK", name: "Chainlink", decimals: 18, color: "#2855d9", address: contracts.tokens.LINK },
  USDC: { symbol: "USDC", name: "USD Coin", decimals: 6, color: "#2775ca", address: contracts.tokens.USDC },
} as const;
export const BASKET = [
  { symbol: "NBTC", weight: 40 },
  { symbol: "NETH", weight: 30 },
  { symbol: "LINK", weight: 10 },
  { symbol: "USDC", weight: 20 },
] as const;
export const REWARD_TOKEN = { symbol: "NRWD", name: "NeoETF Reward Token", decimals: 18, address: contracts.rewardToken } as const;
