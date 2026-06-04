"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Clock, AlertTriangle, TrendingUp, Upload, Calendar, ChevronLeft } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { appointmentApi, doctorDashboardApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const RISK_STYLE: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  low:      { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "منخفض", dot: "bg-emerald-500" },
  medium:   { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   label: "متوسط", dot: "bg-amber-500" },
  high:     { bg: "bg-orange-50 border-orange-200",   text: "text-orange-700",  label: "مرتفع", dot: "bg-orange-500" },
  critical: { bg: "bg-red-50 border-red-200",         text: "text-red-700",     label: "حرج",   dot: "bg-red-500" },
};

export default function DoctorDashboard() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const [stats, setStats]               = useState<any>(null);
  const [myPatients, setMyPatients]     = useState<any[]>([]);
  const [pendingAppts, setPendingAppts] = useState<any[]>([]);
  const [fetching, setFetching]         = useState(true);

  useEffect(() => {
    if (!user || user.is_approved === false) return;
    (async () => {
      // allSettled: a single failing endpoint must not blank the whole dashboard
      const [s, pts, appts] = await Promise.allSettled([
        doctorDashboardApi.stats(),
        doctorDashboardApi.myPatients(),
        appointmentApi.my(),
      ]);
      if (s.status === "fulfilled") setStats(s.value as any);
      if (pts.status === "fulfilled") setMyPatients(pts.value as any[]);
      if (appts.status === "fulfilled") {
        setPendingAppts((appts.value as any[]).filter((a: any) => a.status === "pending"));
      }
      setFetching(false);
    })();
  }, [user]);

  if (loading || !user) return null;

  if (user.is_approved === false) return (
    <DashboardLayout title="في انتظار الموافقة">
      <div className="max-w-md mx-auto text-center py-20" dir="rtl">
        <div className="w-20 h-20 mx-auto mb-6 rounded-[1.5rem] bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Clock size={36} className="text-amber-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-3">حسابك قيد المراجعة</h2>
        <p className="text-slate-500 leading-relaxed mb-6">
          تم استلام طلبك بنجاح. سيقوم المدير بمراجعة بياناتك والموافقة على حسابك قريباً.
          ستتمكن من الوصول إلى لوحة التحكم فور الموافقة.
        </p>
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-sm text-blue-700 text-right">
          إذا مرّ وقت طويل بدون رد، تواصل مع الإدارة عبر صفحة الرسائل.
        </div>
      </div>
    </DashboardLayout>
  );

  const pendingCount  = pendingAppts.length;
  const criticalCount = myPatients.filter((p) => p.risk?.level === "critical").length;
  const highCount     = myPatients.filter((p) => p.risk?.level === "high").length;

  const STATS = [
    { label: "إجمالي المرضى", value: stats?.total_patients ?? myPatients.length, Icon: Users,         iconBg: "from-blue-600 to-cyan-500",    shadow: "shadow-blue-500/30",   valueClass: "text-blue-600" },
    { label: "مواعيد معلقة",  value: pendingCount,                               Icon: Clock,         iconBg: "from-amber-400 to-orange-400", shadow: "shadow-amber-400/30",  valueClass: "text-amber-600" },
    { label: "حالات حرجة",   value: criticalCount,                              Icon: AlertTriangle,  iconBg: "from-red-500 to-rose-400",     shadow: "shadow-red-500/30",    valueClass: "text-red-600" },
    { label: "عالية الخطر",   value: highCount,                                  Icon: TrendingUp,    iconBg: "from-orange-500 to-amber-500", shadow: "shadow-orange-500/30", valueClass: "text-orange-600" },
  ];

  return (
    <DashboardLayout title="لوحة تحكم الطبيب">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[500px] h-[500px] rounded-full bg-violet-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[380px] h-[380px] rounded-full bg-blue-200/20 blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto space-y-6 py-2">

          {/* ── Greeting banner ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-violet-700 to-blue-600 shadow-xl shadow-violet-600/25 p-7">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-violet-200 text-sm font-medium mb-1">مرحباً بك في Memora</p>
                <h2 className="text-3xl font-black text-white tracking-tight">د. {user.full_name}</h2>
                <p className="text-violet-200 mt-2 text-sm">تابع مرضاك وحالاتهم الصحية من هنا.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs font-semibold">نشط</span>
              </div>
            </div>
          </motion.div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label} {...fadeUp(0.1 + i * 0.07)} className="group relative bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 overflow-hidden">
                <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${s.iconBg} shadow-md ${s.shadow} mb-3`}>
                  <s.Icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <div className={`text-3xl font-black ${s.valueClass}`}>{fetching ? "—" : s.value}</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Quick actions ── */}
          <motion.div {...fadeUp(0.4)} className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/doctor/upload-mri" className="group flex items-center gap-4 bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 relative overflow-hidden">
              <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/30 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Upload size={20} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <div className="text-slate-900 font-bold text-sm">رفع صورة MRI</div>
                <div className="text-xs text-slate-400 mt-0.5">تحليل فوري بالذكاء الاصطناعي</div>
              </div>
              <ChevronLeft size={16} className="text-slate-300 mr-auto shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
            </Link>
            <Link href="/dashboard/doctor/appointments" className="group flex items-center gap-4 bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 relative overflow-hidden">
              <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-400 shadow-lg shadow-amber-400/30 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Calendar size={20} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <div className="text-slate-900 font-bold text-sm">المواعيد المعلقة</div>
                <div className="text-xs text-slate-400 mt-0.5">{fetching ? "..." : `${pendingCount} بانتظار الموافقة`}</div>
              </div>
              <ChevronLeft size={16} className="text-slate-300 mr-auto shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
            </Link>
          </motion.div>

          {/* ── Patients table ── */}
          <motion.div {...fadeUp(0.5)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-slate-900 font-extrabold">قائمة المرضى</h3>
              <Link href="/dashboard/doctor/patients" className="text-sm text-blue-600 hover:text-cyan-600 font-semibold transition-colors flex items-center gap-1">
                عرض الكل <ChevronLeft size={14} />
              </Link>
            </div>
            {fetching ? (
              <div className="p-10 flex justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              </div>
            ) : myPatients.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">لا يوجد مرضى مسجلون بعد</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-slate-50/60">
                    <tr>
                      {["الاسم", "الجنس", "MMSE", "آخر MRI", "مستوى الخطر", ""].map((h) => (
                        <th key={h} className="px-5 py-3 text-right text-xs text-slate-400 font-bold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {myPatients.map((p) => {
                      const riskLevel = p.risk?.level ?? "low";
                      const rs = RISK_STYLE[riskLevel] ?? { bg: "bg-gray-50 border-gray-200", text: "text-slate-500", label: "—", dot: "bg-slate-400" };
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 text-slate-900 font-bold">{p.full_name}</td>
                          <td className="px-5 py-3.5 text-slate-500">{p.gender ?? "—"}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">
                            {p.latest_mmse ? `${p.latest_mmse.score}/30` : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700">
                            {p.latest_mri?.classification ?? "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${rs.bg} ${rs.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />
                              {rs.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Link href={`/dashboard/doctor/patients/${p.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-cyan-600 text-xs font-bold transition-colors">
                              عرض <ChevronLeft size={12} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </DashboardLayout>
  );
}
