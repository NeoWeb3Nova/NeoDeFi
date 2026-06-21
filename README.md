# NeoDeFi

NeoDeFi 是 Neo ETF 的一站式实现项目，包含智能合约与前端应用两部分。

## 项目结构

```
NeoDeFi/
├── contracts/          # 智能合约实现 (Solidity + Foundry)
│   ├── src/           # 合约源码
│   ├── test/          # 测试文件
│   ├── script/        # 部署脚本
│   ├── abi/           # 合约 ABI
│   ├── lib/           # 依赖库 (OpenZeppelin, Uniswap v3, Forge-std)
│   └── ...
│
└── frontend/          # 前端应用 (Next.js + React)
    ├── src/           # 前端源码
    ├── public/        # 静态资源
    ├── abi_json/      # 合约 ABI 副本
    └── ...
```

## 子项目来源

- **contracts/**: 原 [NeoDeFi](https://github.com/NeoWeb3Nova/NeoDeFi) 仓库的合约实现
- **frontend/**: 原 [NeoETF](https://github.com/NeoWeb3Nova/NeoETF) 仓库的前端实现

## 快速开始

### 合约开发

```bash
cd contracts
foundry build
foundry test
```

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

---

Built by NeoWeb3Nova.
