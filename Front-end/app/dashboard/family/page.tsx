"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Brain, Activity, Stethoscope, ChevronLeft, Calendar, Gamepad2, Smile, Meh, Frown, Users, ChevronDown } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { familyApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const RISK_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  low:      { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "منخفض" },
  medium:   { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-500",   label: "متوسط" },
  high:     { bg: "bg-orange-50 border-orange-200",   text: "text-orange-700",  dot: "bg-orange-500",  label: "مرتفع" },
  critical: { bg: "bg-red-50 border-red-200",         text: "text-red-700",     dot: "bg-red-500",     label: "حرج"   },
};

const RELATION_LABELS: Record<string, string> = {
  son: "ابن", daughter: "ابنة", father: "أب", mother: "أم",
  brother: "أخ", sister: "أخت", spouse: "زوج/زوجة", other: "أخرى",
};

type LinkedPatient = { patient_id: number; full_name: string; relation_type: string };

export default function FamilyDashboard() {
  const { user, loading } = useRequireAuth(["family"]);

  const [patients, setPatients]     = useState<LinkedPatient[]>([]);
  const [loadingPts, setLoadingPts] = useState(true);
  const [selected, setSelected]     = useState<LinkedPatient | null>(null);
  const [summary, setSummary]       = useState<any>(null);
  const [fetching, setFetching]     = useState(false);
  const [error, setError]           = useState("");

  /* Load linked patients on mount */
  useEffect(() => {
    if (!user) return;
    familyApi.myPatients()
      .then((list) => {
        setPatients(list);
        if (list.length === 1) autoSelect(list[0]);
      })
      .catch(() => setPatients([]))
      .finally(() => setLoadingPts(false));
  }, [user]);

  async function autoSelect(pt: LinkedPatient) {
    setSelected(pt);
    setSummary(null);
    setError("");
    setFetching(true);
    try {
      const res = await familyApi.patientSummary(pt.patient_id);
      setSummary(res);
    } catch (e: any) {
      setError(e.message ?? "تعذّر تحميل بيانات المريض");
    } finally {
      setFetching(false);
    }
  }

  if (loading || !user) return null;

  const risk = summary?.risk?.level;
  const rs   = risk ? RISK_STYLE[risk] : null;

  const METRICS = summary ? [
    { label: "تشخيص MRI",    value: summary.latest_diagnosis?.classification ?? "—",                             sub: summary.latest_diagnosis?.date ? new Date(summary.latest_diagnosis.date).toLocaleDateString("ar-SA") : "", Icon: Stethoscope, iconBg: "from-blue-600 to-cyan-500",      shadow: "shadow-blue-500/30",    vc: "text-blue-600" },
    { label: "درجة MMSE",    value: summary.mmse?.score != null ? `${summary.mmse.score}/30` : "—",              sub: summary.mmse?.severity ?? "",              Icon: Brain,       iconBg: "from-violet-600 to-purple-500",  shadow: "shadow-violet-500/30",  vc: "text-violet-600" },
    { label: "الأعراض",      value: summary.symptoms?.score != null ? `${summary.symptoms.score}/24` : "—",      sub: summary.symptoms?.severity ?? "",          Icon: Activity,    iconBg: "from-amber-400 to-orange-400",   shadow: "shadow-amber-400/30",   vc: "text-amber-600" },
    { label: "متوسط الألعاب", value: summary.game_stats?.avg_score != null ? `${summary.game_stats.avg_score}` : "—", sub: `${summary.game_stats?.total_sessions ?? 0} جلسة`, Icon: Gamepad2, iconBg: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/30", vc: "text-emerald-600" },
  ] : [];

  return (
    <DashboardLayout title="لوحة تحكم العائلة">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[500px] h-[500px] rounded-full bg-emerald-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[380px] h-[380px] rounded-full bg-teal-200/20 blur-[100px]" />
        </div>

        <div className="max-w-2xl mx-auto space-y-6 py-2">

          {/* ── Greeting banner ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-emerald-600 to-teal-500 shadow-xl shadow-emerald-600/25 p-7">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">مرحباً بك في Memora</p>
                <h2 className="text-3xl font-black text-white tracking-tight">{user.full_name}</h2>
                <p className="text-emerald-100 mt-2 text-sm">يمكنك متابعة حالة ذويك من هنا.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5">
                <Heart size={14} className="text-white" strokeWidth={2} fill="white" />
                <span className="text-white text-xs font-semibold">مقدم الرعاية</span>
              </div>
            </div>
          </motion.div>

          {/* ── Patient selector ── */}
          {loadingPts ? (
            <motion.div {...fadeUp(0.1)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 text-sm">جاري تحميل بيانات المرضى...</span>
            </motion.div>
          ) : patients.length === 0 ? (
            <motion.div {...fadeUp(0.1)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 mx-auto mb-4">
                <Users size={24} className="text-slate-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-slate-700 font-bold text-base mb-1">لا يوجد مرضى مرتبطون بحسابك</h3>
              <p className="text-slate-400 text-sm">اطلب من الطبيب أو المريض إضافتك كجهة تواصل عائلية.</p>
            </motion.div>
          ) : patients.length > 1 ? (
            /* Multiple patients — show selector dropdown */
            <motion.div {...fadeUp(0.1)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
              <h3 className="text-slate-900 font-extrabold text-base mb-1">اختر المريض</h3>
              <p className="text-slate-400 text-sm mb-4">لديك {patients.length} مرضى مرتبطون بحسابك</p>
              <div className="relative">
                <select
                  onChange={(e) => {
                    const pt = patients.find((p) => p.patient_id === Number(e.target.value));
                    if (pt) autoSelect(pt);
                  }}
                  defaultValue=""
                  className="w-full appearance-none pr-4 pl-10 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all text-sm"
                >
                  <option value="" disabled>اختر مريضاً...</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.full_name} — {RELATION_LABELS[p.relation_type] ?? p.relation_type}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </motion.div>
          ) : null /* single patient: auto-selected silently */ }

          {/* Loading summary spinner */}
          {fetching && (
            <motion.div {...fadeUp(0.15)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 text-sm">جاري تحميل بيانات المريض...</span>
            </motion.div>
          )}

          {error && (
            <motion.div {...fadeUp(0.15)} className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</motion.div>
          )}

          {/* ── Summary ── */}
          {summary && (
            <>
              {/* Patient info card */}
              <motion.div {...fadeUp(0.2)} className="group relative bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 transition-all duration-300 p-6 overflow-hidden">
                <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[2rem]" />
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl bg-gradient-to-br from-emerald-600 to-teal-500 shadow-lg shadow-emerald-600/20 shrink-0">
                    {summary.patient.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900 font-extrabold text-lg truncate">{summary.patient.full_name}</div>
                    <div className="text-slate-400 text-sm">
                      {summary.patient.gender ?? "—"}
                      {selected && <span className="mr-2 text-emerald-600 font-semibold">· {RELATION_LABELS[selected.relation_type] ?? selected.relation_type}</span>}
                    </div>
                  </div>
                  {rs && (
                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border ${rs.bg} ${rs.text} shrink-0`}>
                      <span className={`w-2 h-2 rounded-full ${rs.dot}`} />
                      الخطر: {rs.label}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {METRICS.map((m, i) => (
                  <motion.div key={m.label} {...fadeUp(0.28 + i * 0.07)} className="group relative bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 text-center overflow-hidden">
                    <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${m.iconBg} shadow-md ${m.shadow} mx-auto mb-3`}>
                      <m.Icon size={16} className="text-white" strokeWidth={2} />
                    </div>
                    <div className={`text-xl font-black ${m.vc}`}>{m.value}</div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">{m.label}</div>
                    {m.sub && <div className="text-[11px] text-slate-400 mt-0.5">{m.sub}</div>}
                  </motion.div>
                ))}
              </div>

              {/* Daily check-ins last 7 days */}
              {summary.daily_checkins?.length > 0 && (
                <motion.div {...fadeUp(0.5)} className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-400 shadow-sm">
                      <Smile size={14} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">المزاج — آخر 7 أيام</h3>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {summary.daily_checkins.map((c: any, i: number) => {
                      const moodIcon = c.mood === "great" ? <Smile size={14} strokeWidth={2} /> : c.mood === "ok" ? <Meh size={14} strokeWidth={2} /> : <Frown size={14} strokeWidth={2} />;
                      const moodColor = c.mood === "great" ? "bg-emerald-100 text-emerald-600" : c.mood === "ok" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-500";
                      const moodLabel = c.mood === "great" ? "ممتاز" : c.mood === "ok" ? "بخير" : "ليس جيداً";
                      return (
                        <div key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${moodColor}`}>
                          {moodIcon}
                          <span>{moodLabel}</span>
                          <span className="opacity-60 font-normal">{new Date(c.date).toLocaleDateString("ar-SA", { weekday: "short" })}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Upcoming appointments */}
              {summary.upcoming_appointments?.length > 0 && (
                <motion.div {...fadeUp(0.55)} className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm">
                      <Calendar size={14} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">المواعيد القادمة</h3>
                  </div>
                  <div className="space-y-2">
                    {summary.upcoming_appointments.map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <span className="text-sm font-bold text-slate-800">{new Date(a.scheduled_at).toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {a.notes && <span className="text-xs text-slate-400 truncate max-w-[120px]">{a.notes}</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Game stats */}
              {summary.game_stats?.total_sessions > 0 && (
                <motion.div {...fadeUp(0.6)} className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-600 to-purple-500 shadow-sm">
                      <Gamepad2 size={14} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">الألعاب المعرفية</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 text-center">
                      <div className="text-xl font-black text-violet-700">{summary.game_stats.total_sessions}</div>
                      <div className="text-xs text-slate-500 mt-0.5">إجمالي الجلسات</div>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 text-center">
                      <div className="text-xl font-black text-violet-700">{summary.game_stats.avg_score ?? "—"}</div>
                      <div className="text-xs text-slate-500 mt-0.5">متوسط النقاط</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Burnout link */}
              <motion.div {...fadeUp(0.65)}>
                <Link href="/dashboard/family/burnout" className="group flex items-center gap-4 bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 relative overflow-hidden">
                  <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Heart size={20} className="text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-slate-900 font-bold text-sm">تقييم إجهاد مقدم الرعاية</div>
                    <div className="text-xs text-slate-400 mt-0.5">كيف صحتك النفسية في رعاية ذويك؟</div>
                  </div>
                  <ChevronLeft size={16} className="text-slate-300 mr-auto shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
                </Link>
              </motion.div>
            </>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
