"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function GamesAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth(["patient"]);
  if (loading || !user) return null;
  return <>{children}</>;
}
