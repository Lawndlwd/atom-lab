import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { TabBar } from "./TabBar";
import { MobileSettingsButton } from "./MobileSettingsButton";

type Props = { children: ReactNode; userName?: string };

export function AppShell({ children, userName }: Props) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ overflowX: "clip", maxWidth: "100vw" }}>
      <TopNav userName={userName} />
      <main className="app-main flex-1 min-w-0">{children}</main>
      <MobileSettingsButton />
      <TabBar />
    </div>
  );
}
