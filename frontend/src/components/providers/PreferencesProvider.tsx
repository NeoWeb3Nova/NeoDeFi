"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "zh-CN" | "en-US";
export type Theme = "dark" | "light";

const messages = {
  "zh-CN": {
    skip: "跳到主要内容",
    nav: {
      portfolio: "资产",
      trade: "交易",
      stake: "质押",
      rewards: "奖励",
      faucet: "水龙头",
      main: "主导航",
      mobile: "移动端主导航",
    },
    header: {
      portfolio: "资产总览",
      trade: "投资与赎回",
      stake: "质押中心",
      rewards: "奖励中心",
      faucet: "测试水龙头",
      locale: "切换为英文",
      themeDark: "切换为浅色主题",
      themeLight: "切换为深色主题",
      wrongNetwork: "网络错误",
    },
    common: {
      connect: "请先连接钱包",
      max: "最大",
      done: "完成",
      close: "关闭",
      loading: "读取中…",
      available: "可用",
      balance: "余额",
      cooldown: "冷却时间",
      ready: "可领取",
      demo: "当前为演示模式",
      viewEtherscan: "在 Etherscan 查看交易",
      failedRetry: "交易失败，请稍后重试",
    },
    portfolio: {
      hero1: "一组资产。",
      hero2: "一条链上指数。",
      heroText:
        "Neo ETF 将 BTC、ETH、LINK 与稳定币敞口组合为可投资、赎回与质押的链上指数资产。",
      connect: "连接钱包",
      connectValue: "读取真实余额",
      contracts: "智能合约",
      contractsValue: "Sepolia 已部署",
      custody: "自托管",
      custodyValue: "资产由你控制",
      console: "链上资产控制台",
      subtitle: "Sepolia 实时余额与 Neo ETF 指数敞口",
      trade: "进入交易引擎",
      gas: "网络 Gas",
      gasHelp: "ETH · Sepolia 执行余额",
      position: "指数仓位",
      positionHelp: "NETF · 可赎回或进入收益层",
      allocation: "指数配置",
      inventory: "可用资产",
      loading: "正在加载余额",
    },
    trade: {
      title: "Neo ETF 交易引擎",
      subtitle: "链上报价、授权与执行，每一步都可验证",
      invest: "投资指数",
      redeem: "赎回资产",
      pay: "支付资产",
      receive: "接收资产",
      investAmount: "投资数量",
      redeemAmount: "赎回数量",
      estimatedNetf: "预计收到 NETF",
      estimatedToken: "预计收到 {symbol}",
      quoting: "报价中…",
      quoteUnavailable: "报价暂不可用：{reason}",
      exceeds: "输入金额超过当前可用余额 {balance} {symbol}",
      min: "Trading 合约每次至少铸造 1 NETF，当前至少需要约 {amount} {symbol}。",
      noQuote: "当前输入金额无法获得有效 NETF 报价，请检查网络后重试。",
      fetching: "正在获取链上报价…",
      confirmInvest: "确认投资 NETF",
      confirmRedeem: "确认赎回资产",
      invalid: "请输入有效数量",
      overBalance: "输入金额不能超过当前代币余额",
      invalidQuote: "无法获得有效报价，请稍后重试",
      executeInvest: "执行投资",
      executeRedeem: "执行赎回",
      type: "交易类型",
      minMint: "投资数量低于最小铸造量 1 NETF",
      slippage: "执行价格变化超过允许范围，请刷新报价后重试",
      allowance: "代币授权额度不足",
      balance: "代币余额不足",
      rejected: "合约拒绝交易：{reason}",
    },
    stake: {
      title: "NETF 质押控制台",
      subtitle: "锁定指数份额，按全网占比实时累积 NRWD",
      stake: "增加质押",
      unstake: "解除质押",
      amountStake: "质押数量",
      amountUnstake: "解除质押数量",
      daily: "预计每日奖励",
      confirmStake: "确认质押 NETF",
      confirmUnstake: "确认解除质押",
      executeStake: "执行质押",
      invalid: "请输入有效的 NETF 数量",
      insufficient: "NETF 余额不足",
      allowance: "NETF 授权额度不足",
      overStake: "输入数量超过 NETF 可用余额",
      overUnstake: "输入数量超过已质押余额",
      unstakeExceeded: "解除质押数量超过已质押余额",
      type: "质押操作",
    },
    rewards: {
      title: "NRWD 奖励网络",
      subtitle: "追踪待领取、钱包持有与历史累计奖励",
      claimedNotice: "{amount} NRWD 已领取并转入当前钱包。",
      description:
        "奖励随质押份额按秒写入链上指数。领取不会解除 NETF 质押，也不会重置当前仓位。",
      waitWallet: "等待钱包确认…",
      none: "暂无可领取奖励",
      claim: "领取 NRWD 奖励",
      add: "添加 NRWD 到钱包",
      adding: "添加中…",
      claimCount: "领取次数",
      realtime: "实时累计",
      unavailable: "历史奖励暂时无法读取，请稍后重试",
      nothing: "当前没有可领取的 NRWD 奖励",
      transferFailed: "奖励代币转账失败，请检查 Mining 合约奖励余额",
    },
    faucet: {
      title: "测试流动性水龙头",
      intro1: "获取 Neo ETF 协议所需的 Sepolia 测试资产。",
      intro2: "NBTC、NETH、LINK 与 USDC 均设有独立冷却周期。",
      protocol: "领取协议",
      steps: [
        "连接 Sepolia 钱包",
        "选择单个资产或批量领取",
        "等待冷却计时归零",
      ],
      all: "批量领取",
      single: "单个资产",
      batchTitle: "批量注入测试资产",
      batchText: "一次请求 NBTC、NETH、LINK 和 USDC",
      readability: "可先添加代币到钱包以增强签名可读性。",
      add: "添加",
      adding: "添加中",
      select: "选择代币",
      addWallet: "添加到钱包",
      cooling: "部分代币仍在冷却中，请等待全部倒计时结束后再批量领取。",
      requesting: "链上领取中…",
      wait: "等待冷却结束",
      claimAll: "领取全部测试资产",
      claimToken: "领取 {symbol}",
      after: "{time} 后可领取",
      footer: "领取后代币将进入冷却期",
      success: "测试代币领取成功",
      failed: "领取失败，请检查冷却时间后重试",
      added: "{symbol} 已添加到钱包，后续交易更容易识别该代币。",
      notAdded: "钱包未添加 {symbol}。",
      unsupported: "当前钱包不支持自动添加 {symbol}，可使用合约地址手动导入。",
      config: "演示模式：请配置水龙头合约地址",
      cooldownLoading: "正在读取链上冷却状态…",
      cooldownUnavailable: "暂时无法读取冷却状态，请稍后重试",
    },
    tx: {
      checking: "检查代币授权",
      approving: "授权代币",
      success: "交易已完成",
      error: "交易未完成",
      progress: "{title}进度",
      completed: "已完成",
      confirmWallet: "请在钱包中确认操作…",
      waiting: "等待上一步完成",
      current: "当前状态：{step}",
      fallback: "交易失败，请检查钱包提示后重试。",
      history: "交易记录",
      stored: "保存在当前浏览器，最多 30 条",
      clear: "清空",
      expected: "预计收到",
      statuses: {
        checking: "检查中",
        approving: "授权中",
        executing: "交易中",
        success: "已完成",
        failed: "失败",
      },
    },
    claim: {
      signing: "确认领取",
      signingDetail: "请在钱包中确认领取交易",
      confirming: "等待链上确认",
      confirmingDetail: "交易已提交至 Sepolia",
      syncing: "同步奖励余额",
      syncingDetail: "正在更新钱包和历史领取数据",
      success: "奖励领取成功",
      error: "奖励领取失败",
      title: "领取 NRWD",
      received: "实际到账",
      amount: "本次领取",
      fallback: "领取失败，请稍后重试",
    },
  },
  "en-US": {
    skip: "Skip to main content",
    nav: {
      portfolio: "Portfolio",
      trade: "Trade",
      stake: "Stake",
      rewards: "Rewards",
      faucet: "Faucet",
      main: "Primary navigation",
      mobile: "Mobile navigation",
    },
    header: {
      portfolio: "Portfolio",
      trade: "Invest & Redeem",
      stake: "Staking",
      rewards: "Rewards",
      faucet: "Testnet Faucet",
      locale: "切换为中文",
      themeDark: "Switch to light theme",
      themeLight: "Switch to dark theme",
      wrongNetwork: "Wrong network",
    },
    common: {
      connect: "Connect wallet",
      max: "Max",
      done: "Done",
      close: "Close",
      loading: "Loading…",
      available: "Available",
      balance: "Balance",
      cooldown: "Cooldown",
      ready: "Ready",
      demo: "Demo mode",
      viewEtherscan: "View on Etherscan",
      failedRetry: "Transaction failed. Please try again.",
    },
    portfolio: {
      hero1: "One basket.",
      hero2: "One onchain index.",
      heroText:
        "Neo ETF combines BTC, ETH, LINK and stablecoin exposure into an index asset you can invest, redeem and stake.",
      connect: "Connect wallet",
      connectValue: "Read live balances",
      contracts: "Smart contracts",
      contractsValue: "Deployed on Sepolia",
      custody: "Self-custody",
      custodyValue: "You control the assets",
      console: "Onchain Portfolio Console",
      subtitle: "Live Sepolia balances and Neo ETF index exposure",
      trade: "Open trading engine",
      gas: "Network Gas",
      gasHelp: "ETH · Sepolia execution balance",
      position: "Index Position",
      positionHelp: "NETF · Redeemable or stakeable",
      allocation: "Index Allocation",
      inventory: "Available Assets",
      loading: "Loading balances",
    },
    trade: {
      title: "Neo ETF Trading Engine",
      subtitle:
        "Onchain quote, approval and execution — verifiable at every step",
      invest: "Invest",
      redeem: "Redeem",
      pay: "Pay Asset",
      receive: "Receive Asset",
      investAmount: "Investment Amount",
      redeemAmount: "Redemption Amount",
      estimatedNetf: "Estimated NETF",
      estimatedToken: "Estimated {symbol}",
      quoting: "Quoting…",
      quoteUnavailable: "Quote unavailable: {reason}",
      exceeds: "Amount exceeds available balance of {balance} {symbol}",
      min: "The Trading contract mints at least 1 NETF. You need approximately {amount} {symbol}.",
      noQuote:
        "No valid NETF quote is available for this amount. Check the network and retry.",
      fetching: "Fetching onchain quote…",
      confirmInvest: "Confirm NETF Investment",
      confirmRedeem: "Confirm Redemption",
      invalid: "Enter a valid amount",
      overBalance: "Amount cannot exceed your token balance",
      invalidQuote: "Unable to obtain a valid quote. Please retry.",
      executeInvest: "Execute Investment",
      executeRedeem: "Execute Redemption",
      type: "Transaction type",
      minMint: "The investment is below the 1 NETF minimum mint amount",
      slippage: "Price movement exceeded the allowed range. Refresh the quote.",
      allowance: "Insufficient token allowance",
      balance: "Insufficient token balance",
      rejected: "Contract rejected the transaction: {reason}",
    },
    stake: {
      title: "NETF Staking Console",
      subtitle:
        "Lock index shares and accrue NRWD in real time by network share",
      stake: "Stake",
      unstake: "Unstake",
      amountStake: "Stake Amount",
      amountUnstake: "Unstake Amount",
      daily: "Estimated Daily Reward",
      confirmStake: "Confirm NETF Stake",
      confirmUnstake: "Confirm Unstake",
      executeStake: "Execute Stake",
      invalid: "Enter a valid NETF amount",
      insufficient: "Insufficient NETF balance",
      allowance: "Insufficient NETF allowance",
      overStake: "Amount exceeds available NETF",
      overUnstake: "Amount exceeds staked balance",
      unstakeExceeded: "Unstake amount exceeds your staked balance",
      type: "Staking action",
    },
    rewards: {
      title: "NRWD Reward Network",
      subtitle: "Track claimable rewards, wallet holdings and lifetime claims",
      claimedNotice: "{amount} NRWD was claimed to your wallet.",
      description:
        "Rewards accrue by staked share through an onchain index. Claiming does not unstake NETF or reset your position.",
      waitWallet: "Confirm in wallet…",
      none: "No rewards available",
      claim: "Claim NRWD Rewards",
      add: "Add NRWD to Wallet",
      adding: "Adding…",
      claimCount: "Claim count",
      realtime: "Real-time accrual",
      unavailable: "Reward history is temporarily unavailable. Please retry.",
      nothing: "There are no NRWD rewards to claim",
      transferFailed:
        "Reward transfer failed. Check the Mining contract balance.",
    },
    faucet: {
      title: "Test Liquidity Faucet",
      intro1: "Get the Sepolia test assets required by Neo ETF.",
      intro2: "NBTC, NETH, LINK and USDC each have an independent cooldown.",
      protocol: "Claim Protocol",
      steps: [
        "Connect a Sepolia wallet",
        "Choose one asset or claim the batch",
        "Wait for the cooldown to reach zero",
      ],
      all: "Batch Claim",
      single: "Single Asset",
      batchTitle: "Inject Test Assets",
      batchText: "Request NBTC, NETH, LINK and USDC together",
      readability:
        "Add tokens to your wallet first for clearer transaction previews.",
      add: "Add",
      adding: "Adding",
      select: "Select Asset",
      addWallet: "Add to Wallet",
      cooling:
        "Some assets are cooling down. Wait for every timer before claiming the batch.",
      requesting: "Claiming onchain…",
      wait: "Waiting for cooldown",
      claimAll: "Claim All Test Assets",
      claimToken: "Claim {symbol}",
      after: "Available in {time}",
      footer: "Assets enter cooldown after each claim",
      success: "Test assets claimed successfully",
      failed: "Claim failed. Check the cooldown and retry.",
      added: "{symbol} was added to your wallet.",
      notAdded: "Your wallet did not add {symbol}.",
      unsupported:
        "This wallet cannot add {symbol} automatically. Import it with the contract address.",
      config: "Demo mode: configure the faucet contract address",
      cooldownLoading: "Reading onchain cooldown status…",
      cooldownUnavailable:
        "Cooldown status is temporarily unavailable. Please retry.",
    },
    tx: {
      checking: "Check Token Allowance",
      approving: "Approve Token",
      success: "Transaction Complete",
      error: "Transaction Incomplete",
      progress: "{title} Progress",
      completed: "Complete",
      confirmWallet: "Confirm the action in your wallet…",
      waiting: "Waiting for the previous step",
      current: "Current status: {step}",
      fallback: "Transaction failed. Review your wallet message and retry.",
      history: "Transaction History",
      stored: "Stored in this browser, up to 30 records",
      clear: "Clear",
      expected: "Estimated received",
      statuses: {
        checking: "Checking",
        approving: "Approving",
        executing: "Executing",
        success: "Complete",
        failed: "Failed",
      },
    },
    claim: {
      signing: "Confirm Claim",
      signingDetail: "Confirm the reward transaction in your wallet",
      confirming: "Onchain Confirmation",
      confirmingDetail: "Transaction submitted to Sepolia",
      syncing: "Sync Reward Balance",
      syncingDetail: "Updating wallet and claim history",
      success: "Rewards Claimed",
      error: "Claim Failed",
      title: "Claim NRWD",
      received: "Received",
      amount: "Claim Amount",
      fallback: "Claim failed. Please retry.",
    },
  },
} as const;

type MessageTree = (typeof messages)["zh-CN"];

function resolve(tree: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[key]
          : undefined,
      tree,
    );
}

type PreferencesContextValue = {
  locale: Locale;
  theme: Theme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  t: (path: string, values?: Record<string, string | number>) => string;
  list: (path: string) => readonly string[];
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("zh-CN");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const savedLocale = localStorage.getItem("neo-locale") as Locale | null;
    const savedTheme = localStorage.getItem("neo-theme") as Theme | null;
    const initialLocale = savedLocale === "en-US" ? "en-US" : "zh-CN";
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark" ? savedTheme : "light";
    queueMicrotask(() => {
      setLocaleState(initialLocale);
      setThemeState(initialTheme);
    });
  }, []);

  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value);
    localStorage.setItem("neo-locale", value);
  }, []);

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
    localStorage.setItem("neo-theme", value);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [locale, theme]);

  const t = useCallback(
    (path: string, values: Record<string, string | number> = {}) => {
      const value =
        resolve(messages[locale], path) ??
        resolve(messages["zh-CN"], path) ??
        path;
      return String(value).replace(/\{(\w+)\}/g, (_, key: string) =>
        String(values[key] ?? `{${key}}`),
      );
    },
    [locale],
  );

  const list = useCallback(
    (path: string) => {
      const value = resolve(messages[locale], path);
      return Array.isArray(value) ? value : [];
    },
    [locale],
  );

  const context = useMemo(
    () => ({ locale, theme, setLocale, setTheme, t, list }),
    [locale, theme, setLocale, setTheme, t, list],
  );
  return (
    <PreferencesContext.Provider value={context}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context)
    throw new Error("usePreferences must be used within PreferencesProvider");
  return context;
}

export type { MessageTree };
