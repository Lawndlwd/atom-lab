import type { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { TabBar } from "./TabBar";

type Props = { children: ReactNode; userName?: string };

export function AppShell({ children, userName }: Props) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--canvas)" }}>
      <SideNav userName={userName} />
      <main className="app-main flex-1 min-w-0">{children}</main>
      <TabBar />
    </div>
  );
}
