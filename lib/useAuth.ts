"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "./api";
import { clearToken, getToken } from "./auth";
import type { User } from "./types";

export function useAuth(redirect = true) {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      if (redirect) router.replace("/");
      setReady(true);
      return;
    }
    setTokenState(stored);
    api
      .me(stored)
      .then((profile) => {
        setUser(profile);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
          if (redirect) router.replace("/");
        }
        setReady(true);
      });
  }, [redirect, router]);

  return { token, user, ready };
}
