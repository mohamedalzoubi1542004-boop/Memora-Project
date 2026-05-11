"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Meh, Frown, CheckCircle, RotateCcw, CalendarDays } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { checkinApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const MOODS = [
  {
    value: "great",
    label: "ممتاز",
    sub: "أشعر بحيوية ونشاط",
    Icon: Smile,
    gradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/30",
    active: "bg-gradient-to-br from-emerald-500 to-teal-500 border-transparent text-white shadow-xl shadow-emerald-500/30",
    idle: "bg-white border-gray-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
    dot: "bg-emerald-500",
  },
  {
    value: "ok",
    label: "بخير",
    sub: "حالتي مقبولة اليوم",
    Icon: Meh,
    gradient: "from-amber-400 to-orange-400",
    shadow: "shadow-amber-500/30",
    active: "bg-gradient-to-br from-amber-400 to-orange-400 border-transparent text-white shadow-xl shadow-amber-500/30",
    idle: "bg-white border-gray-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50",
    dot: "bg-amber-400",
  },
  {
    value: "not_good",
    label: "ليس جيداً",
    sub: "أشعر ببعض التعب",
    Icon: Frown,
    gradient: "from-red-500 to-rose-500",
    shadow: "shadow-red-500/30",
    active: "bg-gradient-to-br from-red-500 to-rose-500 border-transparent text-white shadow-xl shadow-red-500/30",
    idle: "bg-white border-gray-200 text-slate-700 hover:border-red-300 hover:bg-red-50",
    dot: "bg-red-500",
  },
] as const;

const MOOD_MAP: Record<string, typeof MOODS[number]> = Object.fromEntries(MOODS.map(m => [m.value, m]));

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });
}

export default function CheckinPage() {
  const { user, loading } = useRequireAuth(["patient"]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [history, setHistory]     = useState<any[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([checkinApi.today(), checkinApi.history()])
      .then(([today, hist]) => {
        setTodayEntry(today);
        setHistory(hist as any[]);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true); setError("");
    try {
      const entry = await checkinApi.submit(selected) as any;
      setTodayEntry(entry);
      const entryDay = new Date(entry.created_at).toDateString();
      setHistory((prev) => [
        entry,
        ...prev.filter((h: any) => new Date(h.created_at).toDateString() !== entryDay),
      ]);
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  const alreadyDone = !!todayEntry;
  const todayMood = todayEntry ? MOOD_MAP[todayEntry.mood] : null;

  return (
    <DashboardLayout title="التسجيل اليومي">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>

        <div className="max-w-xl mx-auto space-y-6 py-2">

          {/* ── Header banner ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-blue-700 to-cyan-500 shadow-xl shadow-blue-600/25 p-6">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10">
              <p className="text-blue-100 text-sm font-medium mb-1">كيف حالك اليوم؟</p>
              <h2 className="text-2xl font-black text-white tracking-tight">التسجيل اليومي</h2>
              <p className="text-blue-100 mt-2 text-sm">سجّل حالتك المزاجية يومياً لمساعدة طبيبك في متابعة تطورك.</p>
            </div>
          </motion.div>

          {/* ── Check-in card ── */}
          {fetching ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-12 flex justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
          ) : (
            <motion.div {...fadeUp(0.12)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
              <AnimatePresence mode="wait">
                {alreadyDone && todayMood ? (
                  /* Already checked in */
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-6 space-y-4"
                  >
                    <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br ${todayMood.gradient} shadow-xl ${todayMood.shadow}`}>
                      <todayMood.Icon size={36} className="text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-emerald-500" strokeWidth={2.5} />
                        <span className="text-sm font-bold text-emerald-600">تم التسجيل اليوم</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">{todayMood.label}</h3>
                      <p className="text-slate-400 text-sm mt-1">{todayMood.sub}</p>
                    </div>
                    <button
                      onClick={() => { setTodayEntry(null); setSelected(null); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-gray-200 hover:bg-slate-50 transition-all"
                    >
                      <RotateCcw size={14} strokeWidth={2.5} />
                      تغيير الاختيار
                    </button>
                  </motion.div>
                ) : (
                  /* Pick mood */
                  <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    <h3 className="text-slate-900 font-extrabold text-base border-b border-gray-100 pb-4">كيف تصف حالتك الآن؟</h3>

                    <div className="space-y-3">
                      {MOODS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setSelected(m.value)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-right ${
                            selected === m.value ? m.active : m.idle
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            selected === m.value ? "bg-white/20" : `bg-gradient-to-br ${m.gradient} shadow-lg ${m.shadow}`
                          }`}>
                            <m.Icon size={24} className={selected === m.value ? "text-white" : "text-white"} strokeWidth={2} />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm">{m.label}</div>
                            <div className={`text-xs mt-0.5 ${selected === m.value ? "text-white/80" : "text-slate-400"}`}>{m.sub}</div>
                          </div>
                          {selected === m.value && (
                            <CheckCircle size={18} className="text-white mr-auto shrink-0" strokeWidth={2.5} />
                          )}
                        </button>
                      ))}
                    </div>

                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">{error}</div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={!selected || submitting}
                      className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                      ) : !selected ? "اختر حالتك أولاً" : (
                        <><CheckCircle size={16} strokeWidth={2.5} /> تسجيل الحالة</>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── History ── */}
          {history.length > 0 && (
            <motion.div {...fadeUp(0.22)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-slate-900 font-extrabold flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-500" strokeWidth={2} />
                  السجل السابق
                </h3>
                <span className="text-xs text-slate-400 font-medium">{history.length} يوم</span>
              </div>
              <div className="divide-y divide-gray-50">
                {history.map((entry: any, i: number) => {
                  const m = MOOD_MAP[entry.mood];
                  if (!m) return null;
                  return (
                    <motion.div
                      key={entry.id}
                      {...fadeUp(0.05 * i)}
                      className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${m.gradient} shadow-sm ${m.shadow} shrink-0`}>
                        <m.Icon size={16} className="text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900">{m.label}</div>
                        <div className="text-xs text-slate-400">{m.sub}</div>
                      </div>
                      <div className="text-xs text-slate-400 font-medium shrink-0">{fmt(entry.created_at)}</div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
