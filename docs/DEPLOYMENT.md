# Sepolia 部署

## 准备环境

在 `contracts/` 下创建本地 `.env`，不要提交私钥：

```text
PRIVATE_KEY=<deployer-private-key>
SEPOLIA_RPC_URL=<sepolia-rpc-url>
ETHERSCAN_API_KEY=<etherscan-api-key>
```

部署账户应准备足够的 Sepolia ETH。

## 部署顺序

部署脚本之间存在地址依赖，建议按以下顺序执行：

1. 测试资产：NBTC、NETH、LINK、USDC
2. ETFTrading / NETF
3. ETFQuoter
4. ETFMining / NRWD
5. ETFFaucet

示例：

```bash
cd contracts

forge script script/DeployETFTokens.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --broadcast --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY" -vv
```

其他部署脚本使用相同参数。执行前检查脚本中的依赖地址与上一阶段输出一致。

## 部署后检查

- 在 Etherscan 确认所有合约已验证
- 核对 ETFTrading 的四种底层资产与数量
- 核对 ETFMining 的 NETF 和 NRWD 地址
- 为 ETFMining 准备奖励代币
- 为 ETFFaucet 准备测试资产并检查冷却参数
- 更新 `frontend/src/constants/contracts.ts`
- 同步 ABI 并执行 `npm run abi:check`
- 执行前端生产构建

## 安全要求

- 永远不要提交 `.env`、私钥或助记词
- 正式部署前使用全新部署账户或多签
- 每次地址变更都应通过独立来源复核
- 当前 Sepolia 部署仅用于测试
