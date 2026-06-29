import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import "./globals.css";

const manrope = Manrope({ variable: "--font-body", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neo DeFi — Onchain Index Protocol",
  description:
    "Invest, redeem, stake and earn with Neo ETF, powered by Neo DeFi.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const preferenceScript = `try{var t=localStorage.getItem('neo-theme');if(t!=='light'&&t!=='dark')t='light';var l=localStorage.getItem('neo-locale')==='en-US'?'en-US':'zh-CN';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;document.documentElement.lang=l}catch(e){}`;
  return (
    <html
      lang="zh-CN"
      data-theme="light"
      suppressHydrationWarning
      className={`${manrope.variable} ${spaceGrotesk.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
      </head>
      <body>
        <PreferencesProvider>
          <Web3Provider>{children}</Web3Provider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
