"use client";

import { API_URL } from "@/lib/config";
import { useAuth } from "@/lib/useAuth";

export function GitHubAuthPrompt({
  fill = false,
  embedded = false,
}: {
  fill?: boolean;
  embedded?: boolean;
}) {
  const { user } = useAuth(false);
  const renewable = user?.github_refreshable !== false;
  const card = (
    <div className="border border-copper/50 bg-surface">
      <div className="px-3 pt-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">GitHub</div>
        <p className="mt-1 text-[13px] leading-5 text-fg">GitHub authorization expired</p>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          {renewable
            ? "The saved refresh token could not be renewed. Sign in again to list repositories and start agents."
            : "GitHub did not issue a refresh token for this sign-in. Sign in again to store one. Existing projects stay here."}
        </p>
      </div>
      <div className="border-t border-line px-3 py-2">
        <a
          href={`${API_URL}/auth/github/login`}
          className="inline-flex border border-copper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-copper hover:bg-copper hover:text-ink"
        >
          Sign in again
        </a>
      </div>
    </div>
  );

  if (embedded) return card;

  if (!fill) {
    return <div className="border-b border-line px-4 py-3">{card}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">{card}</div>
    </div>
  );
}
