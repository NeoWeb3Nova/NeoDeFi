# Neo ETF Frontend

Next.js + Wagmi + Viem + RainbowKit + Tailwind CSS frontend for Neo ETF.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

The current Sepolia deployment addresses are built in as defaults. Copy
`.env.example` to `.env.local` when you want to override them or configure a
WalletConnect project ID.

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` must be a real Reown/WalletConnect
project ID. If it is left empty, the app intentionally uses injected browser
wallets only and does not contact WalletConnect APIs.

ETFTrading is also the ERC20 ETF share token. Its onchain name and symbol are
`Neo ETF` and `NETF`. The reward token symbol is `NRWD`.

NRWD is currently an ERC20 mining reward. The deployed contracts do not yet
provide governance, redemption, fee discounts, or secondary staking utility.
The Rewards page shows both the current wallet balance and historical claimed
amount, and can add NRWD to compatible wallets through `wallet_watchAsset`.

Neo ETF allocation:

- NBTC: 40%
- NETH: 30%
- LINK: 10%
- USDC: 20%

## Sepolia deployment

- ETFTrading / ETF token: `0xA2286C2689d9aCd78dd482da0eb1680A668949B6`
- ETFQuoter: `0x8114Ca0defe9313a74E41F4B1C24a49E00ebb7d5`
- ETFMining: `0x551137eeC0Cdbb7202dB802aAF41Dab36128C20C`
- Reward token: `0x11B04560B4Ea3f442Cf3AD797833C006E4F6E06b`
- ETFFaucet: `0x6D95910Cf46cde305bC5E390C25AFc2117a044E0`
- NBTC: `0xB02956728Ef9B72AdB805a5507024216dD8F0Cba`
- NETH: `0x027f8455B1a6df72a49B8364BABaEbf8F38D20Bf`
- LINK: `0x028268f8fF62edc596f931E17E2Fb21015f5b0A2`
- USDC: `0x45D2b305d3e2C91b0685A3E7c83bF6D201B88aA2`

## Contract flow

- Invest: read ERC20 allowance → approve when needed → quote path/minimum output → `investWithToken`
- Redeem: read ETF allowance → approve when needed → quote path/minimum output → `redeemToToken`
- Mining: query stake/pending reward → `stake`, `unstake`, `claimMiningReward`
- Faucet: `requestAllTokens` or `requestTokens`
