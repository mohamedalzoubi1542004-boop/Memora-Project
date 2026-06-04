"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Brain, Activity, ClipboardList, FileText, Loader2, AlertTriangle, Gamepad2, Trophy, TrendingUp, BarChart2, Users, Plus, Trash2, Heart } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doctorDashboardApi, reportApi, familyApi, diagnosisApi, caregiverApi } from "@/lib/api";
import { getToken } from "@/lib/auth";

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

const BURNOUT_STYLE: Record<string, { label: string; bg: string; text: string; chip: string; note: string }> = {
  low:      { label: "منخفض", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", chip: "from-emerald-500 to-teal-500", note: "مقدّم الرعاية في حالة جيدة." },
  moderate: { label: "متوسط", bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   chip: "from-amber-400 to-orange-400", note: "مقدّم الرعاية يحتاج إلى متابعة ودعم." },
  high:     { label: "مرتفع", bg: "bg-red-50 border-red-200",         text: "text-red-700",     chip: "from-red-500 to-rose-500",     note: "إجهاد مرتفع — قد يؤثر على جودة رعاية المريض." },
};

export default function PatientDetailPage() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const params = useParams();
  const patientId = parseInt(params.id as string);

  const [summary, setSummary]           = useState<any>(null);
  const [fetching, setFetching]         = useState(true);
  const [fetchError, setFetchError]     = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError]   = useState("");
  const [doctorNotes, setDoctorNotes]   = useState("");

  const [contacts, setContacts]           = useState<any[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm]     = useState({ name: "", email: "", phone: "", relation_type: "son" });
  const [addingContact, setAddingContact] = useState(false);
  const [contactError, setContactError]   = useState("");

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [caregiver, setCaregiver]     = useState<any>(null);

  const RELATION_LABELS: Record<string, string> = {
    son: "ابن", daughter: "ابنة", father: "أب", mother: "أم",
    brother: "أخ", sister: "أخت", spouse: "زوج/زوجة", other: "أخرى",
  };

  async function approveDiag(diagnosisId: number) {
    setApprovingId(diagnosisId);
    try {
      await diagnosisApi.approve(diagnosisId);
      // Flip the approved diagnosis to 'completed' in the loaded summary
      setSummary((prev: any) => {
        if (!prev) return prev;
        const mark = (d: any) => (d && d.id === diagnosisId ? { ...d, status: "completed" } : d);
        return {
          ...prev,
          latest_mri: mark(prev.latest_mri),
          mri_history: (prev.mri_history ?? []).map(mark),
        };
      });
    } catch {
      alert("تعذّر اعتماد التشخيص");
    } finally {
      setApprovingId(null);
    }
  }

  useEffect(() => {
    if (!user || !patientId) return;
    (async () => {
      try {
        const data = await doctorDashboardApi.patientSummary(patientId);
        setSummary(data as any);
      } catch (e: any) {
        setFetchError(e?.message ?? "فشل تحميل بيانات المريض");
      }
      familyApi.contacts(patientId).then((c) => setContacts(c as any[])).catch(() => {});
      caregiverApi.latest(patientId).then((cg) => setCaregiver(cg)).catch(() => setCaregiver(null));
      setFetching(false);
    })();
  }, [user, patientId]);

  async function addContact() {
    if (!contactForm.name.trim()) return;
    setAddingContact(true); setContactError("");
    try {
      const res = await familyApi.addContact({ ...contactForm, patient_id: patientId });
      setContacts((prev) => [...prev, res as any]);
      setContactForm({ name: "", email: "", phone: "", relation_type: "son" });
      setShowAddContact(false);
    } catch (e: any) { setContactError(e.message ?? "حدث خطأ"); }
    finally { setAddingContact(false); }
  }

  async function deleteContact(id: number) {
    try {
      await familyApi.deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  }

  async function generateReport() {
    setGeneratingReport(true);
    setReportError("");
    try {
      const res: any = await reportApi.generate(patientId, doctorNotes);
      // Authenticated blob download so the token is included
      const token = getToken();
      const blobRes = await fetch(`/api/reports/download/${res.filename}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!blobRes.ok) throw new Error("فشل تحميل ملف التقرير");
      const blob = await blobRes.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setReportError(e?.message ?? "فشل توليد التقرير");
    }
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
              {fetchError && (
                <div className="mt-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2 inline-block">{fetchError}</div>
              )}
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
                        <div key={d.id ?? i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-700 text-sm font-semibold">{d.classification}</span>
                              {d.status === "pending" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                                  معلّق
                                </span>
                              )}
                            </div>
                            <div className="text-left">
                              <div className="text-xs text-slate-400">{new Date(d.date).toLocaleDateString("ar-SA")}</div>
                              <div className="text-xs text-blue-600 font-bold">{Math.round((d.confidence ?? 0) * 100)}%</div>
                            </div>
                          </div>
                          {d.status === "pending" && (
                            <button onClick={() => approveDiag(d.id)} disabled={approvingId === d.id}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-l from-emerald-600 to-teal-500 hover:opacity-90 disabled:opacity-50 transition-all">
                              {approvingId === d.id ? "جاري الاعتماد..." : "اعتماد وإظهاره للمريض"}
                            </button>
                          )}
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
                <div className="flex flex-col gap-2">
                  <button onClick={generateReport} disabled={generatingReport}
                    className="self-start px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-violet-600 to-blue-600 hover:opacity-90 shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50 flex items-center gap-2 text-sm">
                    {generatingReport ? (
                      <><Loader2 size={15} className="animate-spin" strokeWidth={2.5} /> جاري التوليد...</>
                    ) : (
                      <><FileText size={15} strokeWidth={2} /> توليد تقرير PDF</>
                    )}
                  </button>
                  {reportError && (
                    <p className="text-red-600 text-xs font-medium">{reportError}</p>
                  )}
                </div>
              </motion.div>

              {/* ── Caregiver burnout ── */}
              <motion.div {...fadeUp(0.55)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
                <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2 mb-4">
                  <Heart size={18} className="text-rose-500" strokeWidth={2.5} />
                  إجهاد مقدّم الرعاية
                </h3>
                {caregiver ? (() => {
                  const s = BURNOUT_STYLE[caregiver.burnout_level] ?? BURNOUT_STYLE.low;
                  return (
                    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${s.bg}`}>
                      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br ${s.chip} shadow-lg shrink-0`}>
                        <span className="text-lg font-black text-white leading-none">{caregiver.total_score}</span>
                        <span className="text-[10px] text-white/80">/ 20</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-extrabold text-sm ${s.text}`}>مستوى الإجهاد: {s.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.note}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          آخر تقييم: {new Date(caregiver.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <p className="text-slate-400 text-sm">لم يُجرِ مقدّم الرعاية أي تقييم إجهاد بعد</p>
                )}
              </motion.div>

              {/* ── Family contacts ── */}
              <motion.div {...fadeUp(0.6)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
                    <Users size={18} className="text-emerald-600" strokeWidth={2.5} />
                    جهات التواصل العائلية
                  </h3>
                  <button onClick={() => setShowAddContact((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                    <Plus size={14} strokeWidth={2.5} />
                    إضافة جهة تواصل
                  </button>
                </div>

                {/* Add form */}
                {showAddContact && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="الاسم *"
                        className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10" />
                      <select value={contactForm.relation_type} onChange={(e) => setContactForm((f) => ({ ...f, relation_type: e.target.value }))}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm outline-none focus:border-emerald-400">
                        {Object.entries(RELATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <input value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="البريد الإلكتروني" type="email"
                        className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10" />
                      <input value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="رقم الهاتف"
                        className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10" />
                    </div>
                    {contactError && <p className="text-red-600 text-xs font-medium">{contactError}</p>}
                    <div className="flex gap-2">
                      <button onClick={addContact} disabled={addingContact || !contactForm.name.trim()}
                        className="px-5 py-2 rounded-xl font-bold text-white text-sm bg-gradient-to-l from-emerald-600 to-teal-500 hover:opacity-90 shadow-md shadow-emerald-500/25 disabled:opacity-50 transition-all">
                        {addingContact ? "جاري الإضافة..." : "إضافة"}
                      </button>
                      <button onClick={() => { setShowAddContact(false); setContactError(""); }}
                        className="px-5 py-2 rounded-xl font-bold text-slate-600 text-sm bg-white border border-gray-200 hover:bg-gray-50 transition-all">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* Contacts list */}
                {contacts.length === 0 && !showAddContact ? (
                  <div className="text-center py-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-50 mx-auto mb-3">
                      <Users size={18} className="text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">لم تُضَف جهات تواصل عائلية بعد</p>
                    <p className="text-slate-400 text-xs mt-1">أضف أفراد عائلة المريض لربطهم بحسابه</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-black text-sm shrink-0">
                            {c.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="text-slate-900 font-bold text-sm">{c.name}</div>
                            <div className="text-xs text-slate-400">
                              {RELATION_LABELS[c.relation_type] ?? c.relation_type ?? "—"}
                              {c.email ? ` · ${c.email}` : ""}
                              {c.phone ? ` · ${c.phone}` : ""}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => deleteContact(c.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
