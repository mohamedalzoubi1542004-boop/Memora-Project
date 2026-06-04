"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthUser, saveAuth, clearAuth, AuthUser } from "./auth";
import { authApi } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login:  (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Listen for 401 events dispatched by api.ts
  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
      router.replace("/login");
    }
    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      const stored = getAuthUser();
      if (stored) {
        const updated: AuthUser = { ...stored, full_name: me.full_name };
        saveAuth(updated);
        setUser(updated);
      }
    } catch {
      clearAuth();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = getAuthUser();
    setUser(stored);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const result = await authApi.login(email, password, rememberMe);
    const authUser: AuthUser = {
      user_id: result.user_id,
      full_name: result.full_name,
      role: result.role.toLowerCase(),
      access_token: result.access_token,
      is_approved: result.is_approved,
    };
    saveAuth(authUser);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    // replace() — not href= — so the now-inaccessible dashboard is removed from
    // history; the browser Back button from /login then reaches the home page.
    if (typeof window !== "undefined") window.location.replace("/login");
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Returns the dashboard path for a given role. */
export function roleDashboard(role: string): string {
  switch (role) {
    case "doctor":  return "/dashboard/doctor";
    case "admin":   return "/dashboard/admin";
    case "family":  return "/dashboard/family";
    default:        return "/dashboard/patient";
  }
}
