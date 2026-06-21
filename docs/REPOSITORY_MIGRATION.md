# 仓库迁移说明

## 当前状态

`NeoWeb3Nova/NeoDeFi` 是唯一主仓库：

- `contracts/` 来自原 NeoDeFi 合约项目
- `frontend/` 来自原 NeoETF 前端项目

原 `NeoWeb3Nova/NeoETF` 仓库不再接受功能开发。

## 开发规则

- 新功能、修复、Issue 和 Pull Request 统一提交到 NeoDeFi
- 前端修改必须发生在 `frontend/`
- 合约修改必须发生在 `contracts/`
- 同时影响 ABI 时，前端和合约必须在同一个 Pull Request 中更新
- 发布标签在 NeoDeFi 仓库创建

## 本地迁移

旧前端目录不能继续作为主要工作副本。请重新克隆：

```bash
git clone --recurse-submodules https://github.com/NeoWeb3Nova/NeoDeFi.git
cd NeoDeFi
npm run setup
```

确认未提交修改已经迁移后，可以保留旧目录作为只读备份或删除。

## 旧仓库建议

旧 NeoETF 仓库应：

1. README 顶部显示迁移通知
2. 描述指向 NeoDeFi 的 `frontend/`
3. 禁止继续提交功能变更
4. 确认迁移稳定后在 GitHub 设置中归档
