"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { API_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace("/projects");
    }
  }, [router]);

  return (
    <div className="landing min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-copper">cloud agent</p>
        <h1 className="mt-4 font-display text-6xl leading-none tracking-tight">CodeLoom</h1>
        <p className="mt-5 max-w-md text-[15px] leading-6 text-mute">
          Sign in with GitHub, pick a repository, and talk to the engine running in an isolated
          sandbox.
        </p>
        <a
          href={`${API_URL}/auth/github/login`}
          className="mt-10 inline-flex w-fit border border-copper px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-copper hover:bg-copper hover:text-ink"
        >
          Continue with GitHub
        </a>
      </div>
    </div>
  );
}
