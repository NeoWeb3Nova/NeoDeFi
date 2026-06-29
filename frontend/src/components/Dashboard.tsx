"use client";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { PortfolioPage } from "./pages/PortfolioPage";
import { TradePage } from "./pages/TradePage";
import { StakePage } from "./pages/StakePage";
import { RewardsPage } from "./pages/RewardsPage";
import { FaucetPage } from "./pages/FaucetPage";

export type PageKey = "portfolio" | "trade" | "stake" | "rewards" | "faucet";

export function Dashboard() {
  const [page, setPage] = useState<PageKey>("portfolio");
  const pages = { portfolio: <PortfolioPage onTrade={() => setPage("trade")}/>, trade: <TradePage/>, stake: <StakePage/>, rewards: <RewardsPage/>, faucet: <FaucetPage/> };
  return <div className="min-h-dvh"><Sidebar page={page} onChange={setPage}/><div className="lg:pl-[272px]"><Header page={page}/><main id="main-content" tabIndex={-1} className="safe-bottom mx-auto min-h-[calc(100dvh-80px)] max-w-[1480px] px-4 py-6 outline-none sm:px-6 md:py-8 lg:px-8 lg:py-9 xl:px-10">{pages[page]}</main></div><MobileNav page={page} onChange={setPage}/></div>;
}
