# 贡献指南

## 开发流程

1. 从 `master` 创建功能分支
2. 仅修改当前任务相关文件
3. 同步受影响的 ABI
4. 在提交前运行对应检查
5. 通过 Pull Request 合并

## 前端检查

```bash
npm run frontend:lint
npm run frontend:build
```

## 合约检查

```bash
forge fmt --root contracts --check
forge build --root contracts --sizes
PRIVATE_KEY=1 npm run contracts:test
```

默认 CI 执行不需要 RPC 的 19 个测试。以下测试访问 Sepolia 已部署代币，必须使用 fork：

```bash
SEPOLIA_RPC_URL=<rpc-url> PRIVATE_KEY=1 npm run contracts:test:integration
```

## 提交约定

使用简洁的 Conventional Commit 风格：

- `feat:` 新功能
- `fix:` 修复
- `refactor:` 不改变行为的结构调整
- `docs:` 文档
- `chore:` 工具或依赖

不要在提交中包含私钥、RPC 密钥、构建产物、日志或 `node_modules`。
