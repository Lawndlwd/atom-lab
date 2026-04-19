import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { trpc, makeTrpcClient } from "./trpc";
import { AuthProvider } from "./providers/auth";
import { ThemeProvider } from "./providers/theme";
import { router } from "./router";

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 },
        },
      }),
  );
  const [trpcClient] = useState(() => makeTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
