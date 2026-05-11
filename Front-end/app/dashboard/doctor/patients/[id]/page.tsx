"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Brain, Activity, ClipboardList, FileText, Download, Loader2, AlertTriangle, Gamepad2, Trophy, TrendingUp, BarChart2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doctorDashboardApi, reportApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const RISK_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  low:      { dot: "bg-emerald-500", badge: "bg-emerald-50 border-emerald-200 text-emerald-700",  label: "منخفض" },
  medium:   { dot: "bg-amber-500",   badge: "bg-amber-50 border-amber-200 text-amber-700",        label: "متوسط" },
  high:     { dot: "bg-orange-500",  badge: "bg-orange-50 border-orange-200 text-orange-700",     label: "مرتفع" },
  critical: { dot: "bg-red-500",     badge: "bg-red-50 border-red-200 text-red-700",              label: "حرج"   },
};

const GAME_NAMES: Record<string, string> = {
  sequence: "تذكّر التسلسل",
  cards:    "أزواج الصور",
  words:    "كلمات مترابطة",
  pattern:  "إكمال الأنماط",
  tasks:    "ترتيب الخطوات",
  faces:    "وجوه وأسماء",
};

const MOOD_STYLE: Record<string, { label: string; color: string }> = {
  great:    { label: "ممتاز", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  ok:       { label: "عادي",  color: "bg-amber-50 border-amber-200 text-amber-700" },
  not_good: { label: "سيء",   color: "bg-red-50 border-red-200 text-red-700" },
};

export default function PatientDetailPage() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const params = useParams();
  const patientId = parseInt(params.id as string);

  const [summary, setSummary]           = useState<any>(null);
  const [fetching, setFetching]         = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportUrl, setReportUrl]       = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes]   = useState("");

  useEffect(() => {
    if (!user || !patientId) return;
    (async () => {
      try {
        const data = await doctorDashboardApi.patientSummary(patientId);
        setSummary(data as any);
      } catch {}
      setFetching(false);
    })();
  }, [user, patientId]);

  async function generateReport() {
    setGeneratingReport(true);
    try {
      const res: any = await reportApi.generate(patientId, doctorNotes);
      setReportUrl(reportApi.download(res.filename));
    } catch {}
    setGeneratingReport(false);
  }

  if (loading || !user) return null;

  const patient     = summary?.patient;
  const latestDiag  = summary?.latest_mri;
  const latestMmse  = summary?.latest_mmse;
  const latestSymp  = summary?.latest_symptoms;
  const diagHistory = summary?.mri_history ?? [];
  const mmseHistory = summary?.mmse_history ?? [];
  const sympHistory = summary?.symptom_history ?? [];
  const gameStats   = summary?.game_stats ?? {};
  const checkins    = summary?.daily_checkins ?? [];
  const risk        = summary?.risk;
  const rs          = RISK_STYLE[risk?.level ?? "low"] ?? { dot: "bg-gray-300", badge: "bg-gray-50 border-gray-200 text-gray-500", label: "—" };

  // Compute aggregate game stats from the dict
  const gameEntries  = Object.entries(gameStats as Record<string, any>);
  const totalSessions = gameEntries.reduce((s, [, g]) => s + g.sessions, 0);
  const avgScore      = totalSessions > 0
    ? Math.round(gameEntries.reduce((s, [, g]) => s + g.total_score, 0) / totalSessions)
    : 0;
  const bestScore     = gameEntries.length > 0
    ? Math.max(...gameEntries.map(([, g]) => g.best))
    : 0;

  return (
    <DashboardLayout title="ملف المريض">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-violet-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-blue-200/15 blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto space-y-6 py-2">

          {/* Back link */}
          <Link href="/dashboard/doctor/patients"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors font-medium">
            <ChevronRight size={15} strokeWidth={2.5} />
            العودة إلى قائمة المرضى
          </Link>

          {fetching ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-12 flex justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
            </div>
          ) : !patient ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-12 text-center">
              <AlertTriangle size={32} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
              <div className="text-slate-400 text-sm font-medium">لم يُعثر على المريض</div>
            </div>
          ) : (
            <>
              {/* ── Patient header banner ── */}
              <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-violet-700 to-blue-600 shadow-xl shadow-violet-600/25 p-6">
                <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                  <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
                  <rect width="100%" height="100%" fill="url(#dots)" />
                </svg>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white bg-white/20 border border-white/30 shadow-inner shrink-0">
                    {patient.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-extrabold text-white">{patient.full_name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-violet-100">
                      {patient.gender && <span>{patient.gender}</span>}
                      {patient.date_of_birth && <span>تاريخ الميلاد: {patient.date_of_birth}</span>}
                      <span>#{patient.id}</span>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-2xl text-xs font-extrabold border flex items-center gap-1.5 shrink-0 ${rs.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${rs.dot}`} />
                    خطر {rs.label}
                  </span>
                </div>
              </motion.div>

              {/* ── Key metrics ── */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    Icon: Brain, label: "آخر تشخيص MRI",
                    value: latestDiag?.classification ?? "—",
                    sub: latestDiag ? `ثقة: ${Math.round((latestDiag.confidence ?? 0) * 100)}%` : "لم يُجرَ",
                    gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/25",
                  },
                  {
                    Icon: Activity, label: "درجة MMSE",
                    value: latestMmse ? `${latestMmse.total_score}/30` : "—",
                    sub: latestMmse?.severity_level ?? "لم يُجرَ",
                    gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/25",
                  },
                  {
                    Icon: ClipboardList, label: "درجة الأعراض",
                    value: latestSymp ? `${latestSymp.total_score}/24` : "—",
                    sub: latestSymp?.severity_level ?? "لم تُسجَّل",
                    gradient: "from-amber-500 to-orange-400", shadow: "shadow-amber-500/25",
                  },
                ].map((m, i) => (
                  <motion.div key={m.label} {...fadeUp(0.1 + i * 0.06)}
                    className="group bg-white border border-gray-100 rounded-[1.75rem] shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 relative overflow-hidden">
                    <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.gradient} shadow-lg ${m.shadow} flex items-center justify-center mb-3`}>
                      <m.Icon size={18} className="text-white" strokeWidth={2} />
                    </div>
                    <div className="text-xs text-slate-400 font-medium mb-1">{m.label}</div>
                    <div className="text-lg font-extrabold text-slate-900">{m.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.sub}</div>
                  </motion.div>
                ))}
              </div>

              {/* ── History grid ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* MRI history */}
                <motion.div {...fadeUp(0.28)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-5">
                  <h3 className="text-slate-900 font-extrabold text-sm mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    سجل تشخيصات MRI
                  </h3>
                  {diagHistory.length === 0 ? (
                    <p className="text-slate-400 text-sm">لا توجد تشخيصات بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {diagHistory.slice(0, 5).map((d: any, i: number) => (
                        <div key={d.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-slate-700 text-sm font-semibold">{d.classification}</span>
                          <div className="text-left">
                            <div className="text-xs text-slate-400">{new Date(d.date).toLocaleDateString("ar-SA")}</div>
                            <div className="text-xs text-blue-600 font-bold">{Math.round((d.confidence ?? 0) * 100)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* MMSE history */}
                <motion.div {...fadeUp(0.34)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-5">
                  <h3 className="text-slate-900 font-extrabold text-sm mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                    سجل اختبارات MMSE
                  </h3>
                  {mmseHistory.length === 0 ? (
                    <p className="text-slate-400 text-sm">لم يُجرَ أي اختبار بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {mmseHistory.slice(0, 5).map((m: any, i: number) => (
                        <div key={m.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div>
                            <span className="text-slate-900 font-bold text-sm">{m.total_score}/30</span>
                            <span className="text-slate-400 text-xs mr-2">{m.severity_level}</span>
                          </div>
                          <span className="text-xs text-slate-400">{new Date(m.date).toLocaleDateString("ar-SA")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* ── Symptoms history ── */}
              <motion.div {...fadeUp(0.4)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-5">
                <h3 className="text-slate-900 font-extrabold text-sm mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  سجل الأعراض
                </h3>
                {sympHistory.length === 0 ? (
                  <p className="text-slate-400 text-sm">لم تُسجَّل أي أعراض بعد</p>
                ) : (
                  <div className="space-y-2">
                    {sympHistory.slice(0, 5).map((s: any, i: number) => (
                      <div key={s.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div>
                          <span className="text-slate-900 font-bold text-sm">{s.total_score}/24</span>
                          <span className="text-slate-400 text-xs mr-2">{s.severity_level}</span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(s.date).toLocaleDateString("ar-SA")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* ── Daily check-ins ── */}
              <motion.div {...fadeUp(0.43)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-5">
                <h3 className="text-slate-900 font-extrabold text-sm mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  المزاج اليومي (آخر 7 أيام)
                </h3>
                {checkins.length === 0 ? (
                  <p className="text-slate-400 text-sm">لا توجد بيانات للمزاج</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {checkins.map((c: any, i: number) => {
                      const m = MOOD_STYLE[c.mood] ?? { label: c.mood, color: "bg-gray-50 border-gray-200 text-gray-600" };
                      return (
                        <div key={i} className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-bold ${m.color}`}>
                          <span>{m.label}</span>
                          <span className="font-normal text-[10px] opacity-70 mt-0.5">
                            {new Date(c.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* ── Game stats ── */}
              <motion.div {...fadeUp(0.46)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-5">
                <h3 className="text-slate-900 font-extrabold text-sm mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                  أداء الألعاب المعرفية
                </h3>
                {totalSessions === 0 ? (
                  <p className="text-slate-400 text-sm">لم تُسجَّل أي جلسة ألعاب بعد</p>
                ) : (
                  <div className="space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { Icon: BarChart2,  label: "إجمالي الجلسات", value: String(totalSessions), gradient: "from-blue-500 to-cyan-500",    shadow: "shadow-blue-500/25" },
                        { Icon: TrendingUp, label: "متوسط الأداء",   value: `${avgScore} نقطة`,    gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/25" },
                        { Icon: Trophy,     label: "أفضل نقطة",      value: `${bestScore} نقطة`,   gradient: "from-amber-500 to-orange-400", shadow: "shadow-amber-500/25" },
                      ].map((s) => (
                        <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${s.gradient} shadow-md ${s.shadow}`}>
                            <s.Icon size={14} className="text-white" strokeWidth={2} />
                          </div>
                          <div className="text-base font-black text-slate-900">{s.value}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Per-game breakdown */}
                    <div className="space-y-2">
                      {gameEntries.map(([type, g]) => (
                        <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-2">
                            <Gamepad2 size={14} className="text-cyan-500" strokeWidth={2} />
                            <span className="text-slate-700 text-sm font-semibold">{GAME_NAMES[type] ?? type}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{g.sessions} جلسة</span>
                            <span>·</span>
                            <span>متوسط: <span className="font-bold text-slate-700">{g.avg_score}</span></span>
                            <span>·</span>
                            <span>أفضل: <span className="font-bold text-slate-700">{g.best}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── Generate report ── */}
              <motion.div {...fadeUp(0.52)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-4">
                <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
                  <FileText size={18} className="text-violet-600" strokeWidth={2.5} />
                  توليد تقرير PDF
                </h3>
                <textarea rows={3} value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="ملاحظات الطبيب (اختياري)..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 transition-all resize-none text-sm" />
                <div className="flex gap-3">
                  <button onClick={generateReport} disabled={generatingReport}
                    className="px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-violet-600 to-blue-600 hover:opacity-90 shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50 flex items-center gap-2 text-sm">
                    {generatingReport ? (
                      <><Loader2 size={15} className="animate-spin" strokeWidth={2.5} /> جاري التوليد...</>
                    ) : (
                      <><FileText size={15} strokeWidth={2} /> توليد تقرير PDF</>
                    )}
                  </button>
                  {reportUrl && (
                    <a href={reportUrl} target="_blank" rel="noopener noreferrer"
                      className="px-6 py-3 rounded-2xl font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-2 text-sm">
                      <Download size={15} strokeWidth={2.5} />
                      تحميل التقرير
                    </a>
                  )}
                </div>
              </motion.div>
            </>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
