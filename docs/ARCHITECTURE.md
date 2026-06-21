# 系统架构

## 产品边界

NeoDeFi 是项目与仓库名称，Neo ETF 是当前落地的链上指数产品。

```text
用户钱包
   │
   ▼
frontend/ (Next.js, Wagmi, Viem, RainbowKit)
   │
   ├── 读取余额、报价、质押和奖励状态
   ├── 管理授权、签名、确认和错误状态
   └── 提交 Sepolia 交易
   │
   ▼
contracts/
   ├── ETFTrading   投资、赎回、NETF ERC20
   ├── ETFQuoter    Uniswap V3 路径与报价
   ├── ETFMining    NETF 质押和 NRWD 奖励
   └── ETFFaucet    测试代币领取与冷却
```

## 前端

前端位于 `frontend/`：

- Next.js：应用框架与页面运行时
- Wagmi：钱包状态和 React 合约交互
- Viem：类型安全的读取、模拟、写入与交易回执
- RainbowKit：钱包连接体验
- Tailwind CSS：响应式界面样式

合约读取优先封装在 `frontend/src/hooks/`，写操作由页面组件维护完整交易状态。所有不可逆操作至少包含检查、授权、执行和确认阶段。

## 合约

合约位于 `contracts/`，使用 Foundry 开发和测试。第三方依赖以固定提交的 Git submodule 管理，避免将依赖源码复制进主仓库。

`ETFTrading` 同时是 NETF ERC20 份额代币。前端不应配置独立的 ETF Token 地址，而应使用 `ETFTrading` 地址。

## ABI 同步

ABI 有三个位置：

- `contracts/abi/`：合约侧源文件
- `frontend/abi_json/`：前端发布副本
- `frontend/src/abis/`：前端编译导入

修改合约接口后必须同步三个目录，并运行：

```bash
npm run abi:check
```

CI 会阻止 ABI 副本不一致的变更。

## 网络与配置

当前默认网络为 Sepolia。部署地址在 `frontend/src/constants/contracts.ts` 中提供默认值，也可以通过 `NEXT_PUBLIC_*` 环境变量覆盖。

WalletConnect/Reown Project ID 必须是真实项目 ID。未配置时，前端只启用浏览器注入钱包，不请求 WalletConnect API。
