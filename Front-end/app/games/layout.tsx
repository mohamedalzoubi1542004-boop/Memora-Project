import type { Metadata } from "next";
import GamesAuthGuard from "@/components/games/GamesAuthGuard";

export const metadata: Metadata = {
  title: "تمارين تقوية الذاكرة | Memora",
  description: "ألعاب تفاعلية لتنشيط 6 مناطق مختلفة من القدرات الذهنية",
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <GamesAuthGuard>
      <div
        className="min-h-screen bg-[#F8FAFC]"
        style={{ fontFamily: "var(--font-tajawal), sans-serif" }}
        dir="rtl"
      >
        {children}
      </div>
    </GamesAuthGuard>
  );
}
