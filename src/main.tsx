import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LangProvider } from "@/contexts/LangContext";
import "./index.css";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s default — realtime subscriptions handle urgent invalidations;
      // this prevents needless refetches on tab/nav switches.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <App />
      </LangProvider>
    </QueryClientProvider>
  </StrictMode>
);
