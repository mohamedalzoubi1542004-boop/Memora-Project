"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthUser, AuthUser } from "@/lib/auth";

/**
 * Auth guard hook that reads user directly from localStorage.
 * Independent of React Context - no race conditions during navigation.
 */
export function useRequireAuth(allowedRoles?: string[]) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const rolesRef = useRef(allowedRoles);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = getAuthUser();

    if (!stored) {
      router.replace("/login");
      return;
    }

    const allowed = rolesRef.current;
    if (allowed && allowed.length > 0) {
      const role = (stored.role ?? "").toLowerCase();
      const allowedLower = allowed.map((r) => r.toLowerCase());
      if (!allowedLower.includes(role)) {
        router.replace("/login");
        return;
      }
    }

    setUser(stored);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
