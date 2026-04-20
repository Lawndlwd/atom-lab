import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

function prettyUrl(u: string): string {
  let out: string;
  try {
    out = decodeURIComponent(u);
  } catch {
    out = u;
  }
  return out.replace(/([?&])(\w+)=(\{[\s\S]*?\}|\[[\s\S]*?\])(?=&|$)/g, (_m, sep, key, val) => {
    try {
      return `${sep}${key}=\n${JSON.stringify(JSON.parse(val), null, 2)}`;
    } catch {
      return `${sep}${key}=${val}`;
    }
  });
}

export function makeTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/trpc",
        transformer: superjson,
        fetch(url, options) {
          if (import.meta.env.DEV) {
            console.log(`%c${options?.method ?? "GET"} ${prettyUrl(String(url))}`, "color:#888");
          }
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
