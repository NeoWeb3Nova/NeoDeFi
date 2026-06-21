"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu } from "lucide-react";
export function Header({ onMenu }: { onMenu: () => void }) {
  return <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-[var(--line)] bg-[rgba(245,247,251,.92)] px-4 backdrop-blur-md md:px-7">
    <button className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[#b9c7df] hover:shadow-sm lg:hidden" aria-label="打开导航" onClick={onMenu}><Menu size={20}/></button>
    <div className="hidden items-center gap-2 text-sm lg:flex"><span className="font-semibold text-[var(--foreground)]">Neo ETF</span><span className="text-[#8a96ac]">/</span><span className="text-[var(--muted)]">Sepolia</span></div><ConnectButton chainStatus="icon" showBalance={false} accountStatus="address"/>
  </header>;
}
