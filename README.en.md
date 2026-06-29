<p align="center">
  <img src="frontend/src/app/icon.svg" alt="NeoDeFi" width="88" height="88" />
</p>

<h1 align="center">NeoDeFi</h1>

<p align="center">
  An onchain asset management DeFi platform. Its first product, <strong>Neo ETF</strong>, packages several assets into one index token that users can mint, redeem, stake, and track from a web interface.
</p>

<p align="center">
  <a href="README.md">中文</a>
  ·
  <a href="README.en.md"><strong>English</strong></a>
</p>

<p align="center">
  <a href="https://github.com/NeoWeb3Nova/NeoDeFi/actions/workflows/ci.yml">
    <img src="https://github.com/NeoWeb3Nova/NeoDeFi/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <img src="https://img.shields.io/badge/network-Sepolia-3cf2c3" alt="Sepolia" />
  <img src="https://img.shields.io/badge/contracts-Solidity-363636" alt="Solidity" />
  <img src="https://img.shields.io/badge/frontend-Next.js-000000" alt="Next.js" />
  <img src="https://img.shields.io/badge/web3-Wagmi%20%2B%20Viem-6b8cff" alt="Wagmi and Viem" />
</p>

---

This repository is the main NeoDeFi monorepo. It contains the Solidity contracts, deployment scripts, ABI artifacts, frontend app, and CI checks.

## Core Pages

The Neo ETF frontend has five core pages that cover the full product flow, from test assets to staking rewards.

### Portfolio

View wallet balances, NETF holdings, and basket allocation in one dashboard.

![Portfolio](frontend/assets/images/portfolio.png)

### Trade

Mint NETF with a single token or redeem NETF back into a selected basket asset.

![Trade](frontend/assets/images/trade.png)

### Stake

Stake NETF to earn NRWD mining rewards.

![Stake](frontend/assets/images/stake.png)

### Rewards

Review pending and claimed NRWD rewards, then claim available rewards from the wallet.

![Rewards](frontend/assets/images/rewards.png)

### Faucet

Claim Sepolia test assets, including ETH, NBTC, NETH, LINK, and USDC.

![Faucet](frontend/assets/images/faucet.png)

## Repository Layout

```text
NeoDeFi/
├── contracts/               # Solidity + Foundry contracts
│   ├── src/                 # ETF trading, quoter, mining, and faucet contracts
│   ├── test/                # Foundry tests
│   ├── script/              # Sepolia deployment scripts
│   ├── abi/                 # Contract ABI source files
│   └── lib/                 # Git submodules
├── frontend/                # Next.js + Wagmi + Viem frontend
│   ├── src/
│   ├── public/
│   └── abi_json/            # Published ABI copies
├── scripts/                 # Repository consistency checks
└── .github/workflows/       # Frontend, contract, and consistency CI
```

## Neo ETF

Neo ETF currently uses four Sepolia test assets:

| Asset | Weight |
| --- | ---: |
| NBTC | 40% |
| NETH | 30% |
| LINK | 10% |
| USDC | 20% |

Main user flows:

- Mint NETF with a single input token
- Redeem NETF into a selected output token
- Stake NETF to earn NRWD rewards
- Claim Sepolia test assets
- Track balances, transaction progress, and history

## Quick Start

### Requirements

- Git
- Node.js 20.9 or newer
- npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Clone and Initialize

```bash
git clone --recurse-submodules https://github.com/NeoWeb3Nova/NeoDeFi.git
cd NeoDeFi
npm run setup
```

If you cloned the repository without submodules:

```bash
git submodule update --init --recursive
```

### Run the Frontend

```bash
npm run dev
```

Open `http://localhost:3000`.

### Run Checks

```bash
npm run frontend:lint
npm run frontend:build
npm run contracts:fmt
npm run contracts:build
npm run contracts:test
npm run abi:check
```

After all tools are installed, you can run the full check suite:

```bash
npm run check
```

Contract tests can use a deterministic local test private key:

```bash
PRIVATE_KEY=1 npm run contracts:test
```

PowerShell:

```powershell
$env:PRIVATE_KEY = "1"
npm run contracts:test
```

Three ETFTrading integration tests read already deployed Sepolia assets and require an RPC URL:

```bash
SEPOLIA_RPC_URL=<rpc-url> PRIVATE_KEY=1 npm run contracts:test:integration
```

PowerShell:

```powershell
$env:SEPOLIA_RPC_URL = "<rpc-url>"
$env:PRIVATE_KEY = "1"
npm run contracts:test:integration
```

## Sepolia Deployment

| Contract / Token | Address |
| --- | --- |
| ETFTrading / NETF | `0xA2286C2689d9aCd78dd482da0eb1680A668949B6` |
| ETFQuoter | `0x8114Ca0defe9313a74E41F4B1C24a49E00ebb7d5` |
| ETFMining | `0x551137eeC0Cdbb7202dB802aAF41Dab36128C20C` |
| ETFFaucet | `0x6D95910Cf46cde305bC5E390C25AFc2117a044E0` |
| NRWD | `0x11B04560B4Ea3f442Cf3AD797833C006E4F6E06b` |
| NBTC | `0xB02956728Ef9B72AdB805a5507024216dD8F0Cba` |
| NETH | `0x027f8455B1a6df72a49B8364BABaEbf8F38D20Bf` |
| LINK | `0x028268f8fF62edc596f931E17E2Fb21015f5b0A2` |
| USDC | `0x45D2b305d3e2C91b0685A3E7c83bF6D201B88aA2` |

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the deployment process.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Repository migration](docs/REPOSITORY_MIGRATION.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Repository Migration

The previous frontend repository, [`NeoWeb3Nova/NeoETF`](https://github.com/NeoWeb3Nova/NeoETF), has been merged into `frontend/` in this repository. New features, issues, and releases are now maintained in `NeoDeFi`.

## Disclaimer

The current deployment runs on the Sepolia testnet for development and demo purposes. It is not investment advice.
