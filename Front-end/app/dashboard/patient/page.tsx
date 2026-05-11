"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Activity, Calendar, Smile, Meh, Frown, ChevronLeft, Gamepad2, BookOpen, Stethoscope, Lightbulb } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { checkinApi, mmseApi, symptomApi, appointmentApi, patientApi, diagnosisApi, gameApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const MOOD_OPTIONS = [
  { value: "great",    label: "ممتاز",  Icon: Smile, active: "bg-gradient-to-br from-green-500 to-emerald-400 text-white shadow-lg shadow-green-500/30", idle: "bg-white border border-gray-100 text-slate-500 hover:border-green-200 hover:bg-green-50/60" },
  { value: "ok",       label: "عادي",   Icon: Meh,   active: "bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-400/30",  idle: "bg-white border border-gray-100 text-slate-500 hover:border-amber-200 hover:bg-amber-50/60" },
  { value: "not_good", label: "سيء",    Icon: Frown,  active: "bg-gradient-to-br from-red-500 to-rose-400 text-white shadow-lg shadow-red-500/30",       idle: "bg-white border border-gray-100 text-slate-500 hover:border-red-200 hover:bg-red-50/60" },
];

const QUICK_ACTIONS = [
  { href: "/dashboard/patient/mmse",         label: "اختبار MMSE",      desc: "اختبر ذاكرتك الإدراكية",    Icon: Brain,      gradient: "from-blue-600 to-cyan-500",    shadow: "shadow-blue-500/30" },
  { href: "/dashboard/patient/symptoms",     label: "تسجيل الأعراض",   desc: "استبيان الأعراض الدورية",   Icon: Activity,   gradient: "from-violet-600 to-purple-500", shadow: "shadow-violet-500/30" },
  { href: "/dashboard/patient/games",        label: "الألعاب المعرفية", desc: "تحديات ذهنية تفاعلية",      Icon: Gamepad2,   gradient: "from-emerald-500 to-teal-500",  shadow: "shadow-emerald-500/30" },
  { href: "/dashboard/patient/appointments", label: "حجز موعد",         desc: "تواصل مع طبيبك",             Icon: Calendar,   gradient: "from-amber-500 to-orange-400",  shadow: "shadow-amber-500/30" },
];

const TIPS = [
  { label: "نصائح الذاكرة",      href: "/dashboard/patient/tips",        Icon: Lightbulb,   color: "text-amber-500",  bg: "bg-amber-50 border-amber-100" },
  { label: "اقرأ عن الزهايمر",   href: "/dashboard/patient/alzheimer",   Icon: BookOpen,    color: "text-blue-500",   bg: "bg-blue-50 border-blue-100" },
  { label: "استشر طبيبك",        href: "/dashboard/patient/appointments", Icon: Stethoscope, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100" },
];

export default function PatientDashboard() {
  const { user, loading } = useRequireAuth(["patient"]);
  const [todayCheckin, setTodayCheckin] = useState<{ mood: string } | null>(null);
  const [submittingMood, setSubmittingMood] = useState(false);
  const [moodDone, setMoodDone] = useState(false);
  const [mmse, setMmse] = useState<any>(null);
  const [symptoms, setSymptoms] = useState<any>(null);
  const [latestDiag, setLatestDiag] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<{ type: string; label: string; sub: string; date: Date; color: string }[]>([]);
  const [gameStat, setGameStat] = useState<{ avg: number | null; thisWeek: number }>({ avg: null, thisWeek: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [p, today] = await Promise.all([patientApi.me(), checkinApi.today()]);
        if (today) { setTodayCheckin(today as any); setMoodDone(true); }
        const pat = p as any;
        const [m, s, appts, mmseHist, sympHist, diagHist, gameHist] = await Promise.all([
          mmseApi.latest(pat.id).catch(() => null),
          symptomApi.latest(pat.id).catch(() => null),
          appointmentApi.my(),
          mmseApi.history(pat.id).catch(() => []),
          symptomApi.history(pat.id).catch(() => []),
          diagnosisApi.history(pat.id).catch(() => []),
          gameApi.history().catch(() => []),
        ]);
        setMmse(m);
        setSymptoms(s);
        setAppointments((appts as any[]).filter((a: any) => a.status === "approved").slice(0, 3));
        setLatestDiag((diagHist as any[])[0] ?? null);

        const gh = gameHist as any[];
        if (gh.length > 0) {
          const avg = Math.round(gh.reduce((s: number, r: any) => s + r.score, 0) / gh.length);
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const thisWeek = gh.filter((r: any) => new Date(r.created_at).getTime() >= weekAgo).length;
          setGameStat({ avg, thisWeek });
        }

        const events: { type: string; label: string; sub: string; date: Date; color: string }[] = [
          ...(mmseHist as any[]).map((r: any) => ({ type: "mmse",     label: "اختبار MMSE",      sub: `${r.total_score}/30`,                              date: new Date(r.created_at), color: "bg-blue-500" })),
          ...(sympHist as any[]).map((r: any) => ({ type: "symptom",  label: "تسجيل الأعراض",   sub: `${r.total_score}/24`,                              date: new Date(r.created_at), color: "bg-violet-500" })),
          ...(diagHist as any[]).map((r: any) => ({ type: "mri",      label: "تشخيص MRI",        sub: r.classification,                                   date: new Date(r.created_at), color: "bg-cyan-500" })),
          ...(gameHist as any[]).map((r: any) => ({ type: "game",     label: "لعبة معرفية",      sub: `${r.score} نقطة`,                                  date: new Date(r.created_at), color: "bg-emerald-500" })),
        ];
        events.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTimeline(events.slice(0, 10));
      } catch {}
    })();
  }, [user]);

  async function submitMood(mood: string) {
    setSubmittingMood(true);
    try { await checkinApi.submit(mood); setTodayCheckin({ mood }); setMoodDone(true); } catch {}
    setSubmittingMood(false);
  }

  if (loading || !user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );

  const moodInfo    = MOOD_OPTIONS.find((m) => m.value === todayCheckin?.mood);
  const mmseScore   = mmse?.total_score ?? null;
  const sympScore   = symptoms?.total_score ?? null;
  const mmseColor   = mmseScore === null ? "text-slate-400" : mmseScore >= 24 ? "text-emerald-600" : mmseScore >= 18 ? "text-amber-600" : "text-red-600";
  const sympColor   = sympScore === null ? "text-slate-400" : sympScore <= 6 ? "text-emerald-600" : sympScore <= 14 ? "text-amber-600" : "text-red-600";

  const STATS = [
    {
      label: "درجة MMSE",
      value: mmseScore !== null ? `${mmseScore}/30` : "—",
      sub: mmse?.severity_level === "normal" ? "طبيعي" : mmse?.severity_level === "mild" ? "خفيف" : mmse ? "شديد" : "لم يُجرَ بعد",
      Icon: Brain,
      valueClass: mmseColor,
      iconBg: "from-blue-600 to-cyan-500",
      iconShadow: "shadow-blue-500/30",
    },
    {
      label: "درجة الأعراض",
      value: sympScore !== null ? `${sympScore}/24` : "—",
      sub: symptoms?.severity_level === "minimal" ? "أدنى" : symptoms?.severity_level === "moderate" ? "متوسط" : symptoms ? "مرتفع" : "لم تُسجَّل بعد",
      Icon: Activity,
      valueClass: sympColor,
      iconBg: "from-violet-600 to-purple-500",
      iconShadow: "shadow-violet-500/30",
    },
    {
      label: "آخر تشخيص MRI",
      value: latestDiag?.classification ?? "—",
      sub: latestDiag ? `ثقة: ${Math.round((latestDiag.confidence ?? 0) * 100)}%` : "لم يُجرَ بعد",
      Icon: Stethoscope,
      valueClass: latestDiag?.classification === "NonDemented" ? "text-emerald-600"
               : latestDiag?.classification === "MildDemented" ? "text-amber-600"
               : latestDiag ? "text-red-600"
               : "text-slate-400",
      iconBg: "from-cyan-500 to-blue-500",
      iconShadow: "shadow-cyan-500/30",
    },
    {
      label: "الألعاب المعرفية",
      value: gameStat.avg !== null ? `${gameStat.avg} نقطة` : "—",
      sub: gameStat.avg !== null ? `${gameStat.thisWeek} جلسة هذا الأسبوع` : "لم تُلعب بعد",
      Icon: Gamepad2,
      valueClass: "text-emerald-600",
      iconBg: "from-emerald-500 to-teal-500",
      iconShadow: "shadow-emerald-500/30",
    },
  ];

  return (
    <DashboardLayout title="لوحة تحكم المريض">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-120px] right-[-80px] w-[520px] h-[520px] rounded-full bg-blue-200/25 blur-[120px]" />
          <div className="absolute bottom-[-80px] left-[-60px] w-[400px] h-[400px] rounded-full bg-cyan-200/20 blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto space-y-6 py-2">

          {/* ── Greeting banner ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-blue-700 to-cyan-500 shadow-xl shadow-blue-600/25 p-7">
            {/* dot grid overlay */}
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">مرحباً بك في Memora</p>
                <h2 className="text-3xl font-black text-white tracking-tight">{user.full_name}</h2>
                <p className="text-blue-100 mt-2 text-sm max-w-xs">تابع حالتك الصحية وسجّل يومك من هنا.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs font-semibold">نشط</span>
              </div>
            </div>
          </motion.div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label} {...fadeUp(0.1 + i * 0.07)} className="group relative bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 overflow-hidden">
                {/* hover top accent */}
                <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${s.iconBg} shadow-md ${s.iconShadow} mb-3`}>
                  <s.Icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <div className={`text-2xl font-black ${s.valueClass}`}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{s.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Mood check-in ── */}
          <motion.div {...fadeUp(0.35)}>
            {!moodDone ? (
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                <h3 className="text-slate-900 font-extrabold text-lg mb-1">كيف مزاجك اليوم؟</h3>
                <p className="text-slate-400 text-sm mb-5">سجّل حالتك المزاجية لمتابعة صحتك اليومية</p>
                <div className="grid grid-cols-3 gap-3">
                  {MOOD_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      disabled={submittingMood}
                      onClick={() => submitMood(m.value)}
                      className={`group py-5 rounded-2xl flex flex-col items-center gap-2.5 transition-all duration-200 hover:-translate-y-1 disabled:opacity-50 ${m.idle}`}
                    >
                      <m.Icon size={30} strokeWidth={1.5} className="transition-transform duration-200 group-hover:scale-110" />
                      <span className="text-sm font-bold">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                {moodInfo && (
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                    moodInfo.value === "great" ? "from-green-500 to-emerald-400" :
                    moodInfo.value === "ok"    ? "from-amber-400 to-orange-400" :
                                                  "from-red-500 to-rose-400"
                  } shadow-md`}>
                    <moodInfo.Icon size={22} className="text-white" strokeWidth={2} />
                  </div>
                )}
                <div>
                  <div className="text-slate-800 font-bold text-sm">تم تسجيل مزاجك اليوم ✓</div>
                  <div className="text-slate-400 text-xs mt-0.5">مزاجك: {moodInfo?.label}</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Quick actions ── */}
          <motion.div {...fadeUp(0.45)}>
            <h3 className="text-slate-800 font-extrabold text-base mb-3 px-1">الإجراءات السريعة</h3>
            <div className="grid grid-cols-2 gap-4">
              {QUICK_ACTIONS.map((action, i) => (
                <motion.div key={action.href} {...fadeUp(0.5 + i * 0.06)}>
                  <Link
                    href={action.href}
                    className="group flex items-center gap-4 bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 relative overflow-hidden"
                  >
                    <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient} shadow-lg ${action.shadow} shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <action.Icon size={20} className="text-white" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{action.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{action.desc}</div>
                    </div>
                    <ChevronLeft size={16} className="text-slate-300 mr-auto shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Upcoming appointments ── */}
          {appointments.length > 0 && (
            <motion.div {...fadeUp(0.65)}>
              <h3 className="text-slate-800 font-extrabold text-base mb-3 px-1">المواعيد القادمة</h3>
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 space-y-3">
                {appointments.map((appt: any) => (
                  <div key={appt.id} className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                    <div>
                      <div className="text-sm text-slate-900 font-bold">د. {appt.doctor_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{new Date(appt.scheduled_at).toLocaleString("ar-SA")}</div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30">مؤكد</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Activity timeline ── */}
          {timeline.length > 0 && (
            <motion.div {...fadeUp(0.68)}>
              <h3 className="text-slate-800 font-extrabold text-base mb-3 px-1">آخر الأنشطة</h3>
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5">
                <div className="relative">
                  <div className="absolute right-[7px] top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {timeline.map((ev, i) => (
                      <div key={i} className="flex items-start gap-3 relative">
                        <div className={`w-3.5 h-3.5 rounded-full ${ev.color} shrink-0 mt-1 z-10 ring-2 ring-white`} />
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div>
                            <div className="text-sm font-bold text-slate-800">{ev.label}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{ev.sub}</div>
                          </div>
                          <div className="text-[11px] text-slate-400 shrink-0 mr-2">
                            {ev.date.toLocaleDateString("ar-SA")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Tips row ── */}
          <motion.div {...fadeUp(0.72)}>
            <h3 className="text-slate-800 font-extrabold text-base mb-3 px-1">مفيد لك</h3>
            <div className="grid grid-cols-3 gap-4">
              {TIPS.map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border ${t.bg} hover:-translate-y-1 hover:shadow-lg transition-all duration-300 text-center`}
                >
                  <t.Icon size={22} className={`${t.color} transition-transform duration-200 group-hover:scale-110`} strokeWidth={1.75} />
                  <span className="text-xs font-bold text-slate-700">{t.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </DashboardLayout>
  );
}
