"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  darkTheme,
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { usePreferences } from "./PreferencesProvider";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

// WalletConnect rejects placeholder project IDs. Keep the app fully functional
// with injected wallets (MetaMask, Rabby, etc.) when no real ID is configured.
const config = walletConnectProjectId
  ? getDefaultConfig({
      appName: "Neo ETF",
      projectId: walletConnectProjectId,
      chains: [sepolia],
      ssr: true,
    })
  : createConfig({
      chains: [sepolia],
      connectors: [injected({ unstable_shimAsyncInject: 2_000 })],
      transports: { [sepolia.id]: http() },
      multiInjectedProviderDiscovery: true,
      ssr: true,
    });

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { theme, locale, t } = usePreferences();
  const walletTheme =
    theme === "dark"
      ? darkTheme({
          accentColor: "#3cf2c3",
          accentColorForeground: "#06110e",
          borderRadius: "medium",
          overlayBlur: "small",
        })
      : lightTheme({
          accentColor: "#087f67",
          accentColorForeground: "#ffffff",
          borderRadius: "medium",
          overlayBlur: "small",
        });
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          key={`${locale}-${theme}`}
          locale={locale === "zh-CN" ? "zh-CN" : "en-US"}
          theme={walletTheme}
        >
          <a className="skip-link" href="#main-content">
            {t("skip")}
          </a>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
