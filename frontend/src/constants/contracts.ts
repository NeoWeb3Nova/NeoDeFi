import type { Address } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export const SEPOLIA_CONTRACTS = {
  deployer: "0x650cd30a58e6893169F41CaC9379D02e7E34653F",
  trading: "0xA2286C2689d9aCd78dd482da0eb1680A668949B6",
  quoter: "0x8114Ca0defe9313a74E41F4B1C24a49E00ebb7d5",
  mining: "0x551137eeC0Cdbb7202dB802aAF41Dab36128C20C",
  faucet: "0x6D95910Cf46cde305bC5E390C25AFc2117a044E0",
  rewardToken: "0x11B04560B4Ea3f442Cf3AD797833C006E4F6E06b",
  tokens: {
    NBTC: "0xB02956728Ef9B72AdB805a5507024216dD8F0Cba",
    NETH: "0x027f8455B1a6df72a49B8364BABaEbf8F38D20Bf",
    LINK: "0x028268f8fF62edc596f931E17E2Fb21015f5b0A2",
    USDC: "0x45D2b305d3e2C91b0685A3E7c83bF6D201B88aA2",
  },
} as const satisfies Record<string, unknown>;

export const SEPOLIA_DEPLOYMENT_BLOCKS = {
  mining: 11_099_114n,
} as const;

const address = (value: string | undefined, fallback: string) =>
  (value?.startsWith("0x") ? value : fallback) as Address;

export const contracts = {
  trading: address(process.env.NEXT_PUBLIC_ETF_TRADING_ADDRESS, SEPOLIA_CONTRACTS.trading),
  quoter: address(process.env.NEXT_PUBLIC_ETF_QUOTER_ADDRESS, SEPOLIA_CONTRACTS.quoter),
  mining: address(process.env.NEXT_PUBLIC_ETF_MINING_ADDRESS, SEPOLIA_CONTRACTS.mining),
  faucet: address(process.env.NEXT_PUBLIC_ETF_FAUCET_ADDRESS, SEPOLIA_CONTRACTS.faucet),
  // ETFTrading itself implements ERC20 and is the ETF share token.
  etf: address(process.env.NEXT_PUBLIC_ETF_TOKEN_ADDRESS, SEPOLIA_CONTRACTS.trading),
  rewardToken: address(process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS, SEPOLIA_CONTRACTS.rewardToken),
  tokens: {
    NBTC: address(process.env.NEXT_PUBLIC_NBTC_ADDRESS, SEPOLIA_CONTRACTS.tokens.NBTC),
    NETH: address(process.env.NEXT_PUBLIC_NETH_ADDRESS, SEPOLIA_CONTRACTS.tokens.NETH),
    LINK: address(process.env.NEXT_PUBLIC_LINK_ADDRESS, SEPOLIA_CONTRACTS.tokens.LINK),
    USDC: address(process.env.NEXT_PUBLIC_USDC_ADDRESS, SEPOLIA_CONTRACTS.tokens.USDC),
  },
} as const;

export const isConfigured = (value: Address) => value !== ZERO_ADDRESS;
