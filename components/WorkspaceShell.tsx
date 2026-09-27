"use client";

import { WorkspaceProvider } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/useAuth";

import { Sidebar } from "./Sidebar";

export function WorkspaceShell({ children }: { children: import("react").ReactNode }) {
  const { token, user, ready } = useAuth();

  if (!ready || !token || !user) {
    return (
      <div className="flex h-screen items-center px-6">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <WorkspaceProvider token={token}>
      <div className="flex h-screen overflow-hidden bg-canvas text-[13px] leading-5 text-fg">
        <Sidebar user={user} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
