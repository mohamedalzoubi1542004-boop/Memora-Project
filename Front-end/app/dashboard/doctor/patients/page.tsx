"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Users, AlertTriangle, ChevronLeft } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doctorDashboardApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const RISK_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  low:      { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "منخفض" },
  medium:   { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-500",   label: "متوسط" },
  high:     { bg: "bg-orange-50 border-orange-200",   text: "text-orange-700",  dot: "bg-orange-500",  label: "مرتفع" },
  critical: { bg: "bg-red-50 border-red-200",         text: "text-red-700",     dot: "bg-red-500",     label: "حرج"   },
};

export default function DoctorPatientsPage() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const [patients, setPatients] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const pts = await doctorDashboardApi.myPatients();
        setPatients(pts as any[]);
      } catch {}
      setFetching(false);
    })();
  }, [user]);

  if (loading || !user) return null;

  const filtered = patients.filter((p) =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const criticalCount = patients.filter((p) => p.risk?.level === "critical").length;

  return (
    <DashboardLayout title="مرضاي">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-violet-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-blue-200/15 blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto space-y-5 py-2">

          {/* ── Header + search ── */}
          <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم المريض أو البريد..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-sm"
              />
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-100 text-slate-600 text-sm font-semibold shadow-sm">
                <Users size={14} className="text-blue-500" strokeWidth={2} />
                {patients.length} مريض
              </span>
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold shadow-sm">
                  <AlertTriangle size={14} strokeWidth={2} />
                  {criticalCount} حرج
                </span>
              )}
            </div>
          </motion.div>

          {/* ── Table card ── */}
          <motion.div {...fadeUp(0.1)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
            {fetching ? (
              <div className="p-16 flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-violet-400" strokeWidth={1.5} />
                </div>
                <div className="text-slate-500 font-semibold">{search ? "لا توجد نتائج مطابقة" : "لا يوجد مرضى مسجلون بعد"}</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-slate-50/60">
                    <tr>
                      {["المريض", "الجنس", "MMSE", "آخر تشخيص MRI", "مستوى الخطر", ""].map((h) => (
                        <th key={h} className="px-5 py-3 text-right text-xs text-slate-400 font-bold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p) => {
                      const riskLevel = p.risk?.level ?? "low";
                      const rs = RISK_STYLE[riskLevel] ?? { bg: "bg-gray-50 border-gray-200", text: "text-slate-500", dot: "bg-slate-400", label: "—" };
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group/row">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm shadow-violet-500/30">
                                {p.full_name?.charAt(0)}
                              </div>
                              <div>
                                <div className="text-slate-900 font-bold">{p.full_name}</div>
                                <div className="text-slate-400 text-xs">{p.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500">{p.gender ?? "—"}</td>
                          <td className="px-5 py-4">
                            {p.latest_mmse ? (
                              <div>
                                <span className="font-bold text-slate-900">{p.latest_mmse.score}/30</span>
                                <span className="text-slate-400 text-xs mr-1">({p.latest_mmse.severity})</span>
                              </div>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {p.latest_mri?.classification ?? <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${rs.bg} ${rs.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />
                              {rs.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <Link
                              href={`/dashboard/doctor/patients/${p.id}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-cyan-600 text-xs font-bold transition-colors"
                            >
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
