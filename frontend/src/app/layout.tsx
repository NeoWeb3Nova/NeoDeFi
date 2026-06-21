import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Web3Provider } from "@/components/providers/Web3Provider";
import "./globals.css";

const manrope = Manrope({ variable: "--font-body", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neo ETF — Onchain Index",
  description: "Invest, redeem, stake and earn with Neo ETF on Sepolia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body><Web3Provider>{children}</Web3Provider></body>
    </html>
  );
}
