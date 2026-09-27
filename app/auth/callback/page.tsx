"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { setToken } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("token");
    if (!token) {
      setError("GitHub login did not return a token.");
      return;
    }
    setToken(token);
    router.replace("/projects");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-muted">{error ?? "Signing in…"}</p>
    </div>
  );
}
