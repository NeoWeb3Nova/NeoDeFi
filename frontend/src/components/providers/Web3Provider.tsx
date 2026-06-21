"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

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
      connectors: [injected()],
      transports: { [sepolia.id]: http() },
      multiInjectedProviderDiscovery: false,
      ssr: true,
    });

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <WagmiProvider config={config}><QueryClientProvider client={queryClient}><RainbowKitProvider>{children}</RainbowKitProvider></QueryClientProvider></WagmiProvider>;
}
