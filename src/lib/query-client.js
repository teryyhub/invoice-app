// src/lib/query-client.js
import { QueryClient } from "@tanstack/react-query";

export const queryClientInstance = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: 1, 
      staleTime: 30_000,
      refetchOnWindowFocus: false, // Prevents sudden query bursts and connection spikes when switching between browser tabs
    } 
  },
});