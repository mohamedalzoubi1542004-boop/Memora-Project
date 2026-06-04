"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Hash, Layers, BookOpen, Grid, ListOrdered, UserCircle, Gamepad2, ChevronLeft, Trophy, TrendingUp, BarChart2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { gameApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const GAMES = [
  { href: "/games/sequence-recall",    name: "تذكّر التسلسل",   domain: "الذاكرة العاملة",     Icon: Hash,        gradient: "from-cyan-500 to-blue-500",     shadow: "shadow-cyan-500/30",   type: "sequence" },
  { href: "/games/memory-cards",       name: "أزواج الصور",     domain: "الذاكرة البصرية",     Icon: Layers,      gradient: "from-violet-500 to-purple-500",  shadow: "shadow-violet-500/30", type: "cards" },
  { href: "/games/word-association",   name: "كلمات مترابطة",   domain: "الذاكرة الدلالية",    Icon: BookOpen,    gradient: "from-emerald-500 to-teal-500",   shadow: "shadow-emerald-500/30",type: "words" },
  { href: "/games/pattern-completion", name: "إكمال الأنماط",   domain: "التفكير المنطقي",     Icon: Grid,        gradient: "from-amber-500 to-orange-400",   shadow: "shadow-amber-500/30",  type: "pattern" },
  { href: "/games/task-ordering",      name: "ترتيب الخطوات",   domain: "الوظائف التنفيذية",   Icon: ListOrdered, gradient: "from-rose-500 to-pink-500",      shadow: "shadow-rose-500/30",   type: "tasks" },
  { href: "/games/face-name",          name: "وجوه وأسماء",     domain: "الذاكرة الترابطية",   Icon: UserCircle,  gradient: "from-blue-600 to-cyan-500",     shadow: "shadow-blue-500/30",   type: "faces" },
];

const GAME_NAME: Record<string, string> = {
  sequence: "تذكّر التسلسل", cards: "أزواج الصور", words: "كلمات مترابطة",
  pattern: "إكمال الأنماط",  tasks: "ترتيب الخطوات", faces: "وجوه وأسماء",
};

export default function PatientGamesPage() {
  const { user, loading } = useRequireAuth(["patient"]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    gameApi.stats().then((s) => setStats(s)).catch(() => {});
  }, [user]);

  if (loading || !user) return null;

  // GET /games/stats returns { total_sessions, average_score, best_scores, by_game }
  // where by_game = { gameType: { count, best, average } }
  const byGame: Record<string, any> = (stats?.by_game as Record<string, any>) ?? {};
  const totalSessions = stats ? (stats.total_sessions ?? 0) : null;
  const avgScore = stats && (stats.total_sessions ?? 0) > 0 ? Math.round(stats.average_score ?? 0) : null;
  const bestGameType = Object.entries(byGame)
    .sort(([, a], [, b]) => ((b as any).average ?? 0) - ((a as any).average ?? 0))[0]?.[0] ?? null;

  return (
    <DashboardLayout title="الألعاب المعرفية">
      <div className="relative min-h-full" dir="rtl">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-6 py-2">

          {/* ── Hero banner ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-blue-700 to-cyan-500 shadow-xl shadow-blue-600/25 p-7">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">تمارين معرفية يومية</p>
                <h2 className="text-2xl font-black text-white tracking-tight">الألعاب المعرفية</h2>
                <p className="text-blue-100 mt-2 text-sm max-w-xs">ألعاب تفاعلية تُنشّط 6 مناطق مختلفة من القدرات الذهنية. نتائجك تُحفظ ويتابعها طبيبك.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 shrink-0">
                <Gamepad2 size={14} className="text-white" strokeWidth={2} />
                <span className="text-white text-xs font-semibold">6 ألعاب معتمدة</span>
              </div>
            </div>
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div {...fadeUp(0.1)} className="grid grid-cols-3 gap-4">
            {[
              { Icon: BarChart2, label: "إجمالي الجلسات", value: totalSessions !== null ? String(totalSessions) : "—", color: "from-blue-600 to-cyan-500", shadow: "shadow-blue-500/30" },
              { Icon: TrendingUp, label: "متوسط الأداء",  value: avgScore !== null ? `${avgScore} نقطة` : "—",         color: "from-violet-600 to-purple-500", shadow: "shadow-violet-500/30" },
              { Icon: Trophy,     label: "أفضل لعبة",     value: bestGameType ? (GAME_NAME[bestGameType] ?? bestGameType) : "—", color: "from-amber-500 to-orange-400", shadow: "shadow-amber-500/30" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${s.color} shadow-md ${s.shadow}`}>
                  <s.Icon size={16} className="text-white" strokeWidth={2} />
                </div>
                <div className="text-lg font-black text-slate-900 truncate">{s.value}</div>
                <div className="text-xs text-slate-400 font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* ── Games grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAMES.map((g, i) => {
              const gStat = byGame[g.type];
              return (
                <motion.div key={g.href} {...fadeUp(0.18 + i * 0.06)}>
                  <Link
                    href={g.href}
                    className="group flex flex-col gap-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 relative overflow-hidden"
                  >
                    <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[2rem]" />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${g.gradient} shadow-lg ${g.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <g.Icon size={20} className="text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="font-extrabold text-slate-900">{g.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-medium">{g.domain}</div>
                      {gStat && gStat.count > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-bold">{gStat.count} جلسة</span>
                          <span>·</span>
                          <span>أفضل: <span className="font-bold text-slate-700">{gStat.best ?? 0}</span></span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-cyan-600 transition-colors">
                      العب الآن <ChevronLeft size={12} className="transition-transform duration-200 group-hover:-translate-x-1" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* ── Tip ── */}
          <motion.div {...fadeUp(0.65)} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 text-center">
            <p className="text-slate-500 text-sm leading-relaxed">
              العب يومياً لمدة <span className="text-slate-900 font-extrabold">10–15 دقيقة</span> للحصول على أفضل النتائج وتحسين القدرات المعرفية.
            </p>
          </motion.div>

        </div>
      </div>
    </DashboardLayout>
  );
}
