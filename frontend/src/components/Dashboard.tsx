"use client";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { PortfolioPage } from "./pages/PortfolioPage";
import { TradePage } from "./pages/TradePage";
import { StakePage } from "./pages/StakePage";
import { RewardsPage } from "./pages/RewardsPage";
import { FaucetPage } from "./pages/FaucetPage";

export type PageKey = "portfolio" | "trade" | "stake" | "rewards" | "faucet";

export function Dashboard() {
  const [page, setPage] = useState<PageKey>("portfolio");
  const [menu, setMenu] = useState(false);
  const pages = { portfolio: <PortfolioPage onTrade={() => setPage("trade")}/>, trade: <TradePage/>, stake: <StakePage/>, rewards: <RewardsPage/>, faucet: <FaucetPage/> };
  return <div className="min-h-screen"><Sidebar page={page} onChange={setPage} open={menu} onClose={() => setMenu(false)}/><div className="lg:pl-[252px]"><Header onMenu={() => setMenu(true)}/><main className="mx-auto min-h-[calc(100vh-72px)] max-w-[1440px] px-4 py-6 sm:px-6 md:py-8 lg:px-10 lg:py-10">{pages[page]}</main></div></div>;
}
