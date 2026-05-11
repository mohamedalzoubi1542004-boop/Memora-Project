"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Stethoscope, CheckCircle, Clock, UserCheck, ChevronLeft, Activity, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { adminApi, patientApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export default function AdminDashboard() {
  const { user, loading } = useRequireAuth(["admin"]);
  const [stats, setStats]               = useState<any>(null);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [allDoctors, setAllDoctors]     = useState<any[]>([]);
  const [tab, setTab]                   = useState<"pending" | "all" | "users" | "patients" | "activity">("pending");
  const [users, setUsers]               = useState<any[]>([]);
  const [patients, setPatients]         = useState<any[]>([]);
  const [activityLog, setActivityLog]   = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([adminApi.stats(), adminApi.pendingDoctors(), adminApi.allDoctors(), adminApi.allUsers(), patientApi.list(), adminApi.activity()])
      .then(([s, pending, all, u, pts, acts]) => {
        setStats(s); setPendingDoctors(pending as any[]); setAllDoctors(all as any[]); setUsers(u as any[]); setPatients(pts as any[]); setActivityLog(acts as any[]);
      }).catch(() => {});
  }, [user]);

  async function approveDoctor(id: number) {
    setActionLoading(id);
    await adminApi.approve(id).catch(() => {});
    setPendingDoctors((prev) => prev.filter((d) => d.id !== id));
    setAllDoctors((prev) => prev.map((d) => d.id === id ? { ...d, is_approved: true } : d));
    setStats((s: any) => s ? { ...s, approved_doctors: s.approved_doctors + 1, pending_doctors: s.pending_doctors - 1 } : s);
    setActionLoading(null);
  }

  async function rejectDoctor(id: number) {
    setActionLoading(id);
    await adminApi.reject(id).catch(() => {});
    setPendingDoctors((prev) => prev.filter((d) => d.id !== id));
    setStats((s: any) => s ? { ...s, pending_doctors: Math.max(0, s.pending_doctors - 1) } : s);
    setActionLoading(null);
  }

  async function suspendDoctor(id: number, suspended: boolean) {
    setActionLoading(id);
    await (suspended ? adminApi.unsuspend(id) : adminApi.suspend(id)).catch(() => {});
    setAllDoctors((prev) => prev.map((d) => d.id === id ? { ...d, is_suspended: !suspended } : d));
    setActionLoading(null);
  }

  async function toggleUser(id: number, active: boolean) {
    setActionLoading(id);
    await (active ? adminApi.deactivate(id) : adminApi.activate(id)).catch(() => {});
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: !active } : u));
    setActionLoading(null);
  }

  async function deleteUser(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟")) return;
    setActionLoading(id);
    await adminApi.deleteUser(id).catch(() => {});
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setActionLoading(null);
  }

  async function assignDoctor(patientId: number, doctorId: number | null) {
    await adminApi.assignDoctor(patientId, doctorId).catch(() => {});
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, assigned_doctor_id: doctorId } : p));
  }

  if (loading || !user) return null;

  const TABS: [typeof tab, string][] = [
    ["pending",   `طلبات الأطباء (${pendingDoctors.length})`],
    ["all",       "جميع الأطباء"],
    ["users",     "المستخدمون"],
    ["patients",  "المرضى"],
    ["activity",  "سجل الأنشطة"],
  ];

  const thClass = "px-5 py-3 text-right text-xs text-slate-400 font-bold uppercase tracking-wide";
  const tdClass = "px-5 py-3.5";

  const STATS_CFG = [
    { key: "total_users",      label: "إجمالي المستخدمين",     Icon: Users,       iconBg: "from-blue-600 to-cyan-500",    shadow: "shadow-blue-500/30",   vc: "text-blue-600" },
    { key: "total_doctors",    label: "إجمالي الأطباء",         Icon: Stethoscope, iconBg: "from-violet-600 to-purple-500",shadow: "shadow-violet-500/30", vc: "text-violet-600" },
    { key: "approved_doctors", label: "أطباء معتمدون",          Icon: CheckCircle, iconBg: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/30",vc: "text-emerald-600" },
    { key: "pending_doctors",  label: "بانتظار الموافقة",       Icon: Clock,       iconBg: "from-amber-400 to-orange-400", shadow: "shadow-amber-400/30",  vc: "text-amber-600" },
    { key: "total_patients",   label: "إجمالي المرضى",          Icon: UserCheck,   iconBg: "from-cyan-500 to-blue-500",    shadow: "shadow-cyan-500/30",   vc: "text-cyan-600" },
  ];

  return (
    <DashboardLayout title="لوحة تحكم المدير">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[500px] h-[500px] rounded-full bg-amber-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[380px] h-[380px] rounded-full bg-orange-200/15 blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto space-y-6 py-2">

          {/* ── Greeting banner ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-amber-500 to-orange-500 shadow-xl shadow-amber-500/25 p-7">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-amber-100 text-sm font-medium mb-1">مرحباً بك في Memora</p>
                <h2 className="text-3xl font-black text-white tracking-tight">{user.full_name}</h2>
                <p className="text-amber-100 mt-2 text-sm">إدارة المنصة والمستخدمين من هنا.</p>
              </div>
              {pendingDoctors.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-xs font-semibold">{pendingDoctors.length} طلب معلق</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Stats ── */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {STATS_CFG.map((s, i) => (
                <motion.div key={s.key} {...fadeUp(0.1 + i * 0.06)} className="group relative bg-white rounded-[1.75rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-1 transition-all duration-300 p-5 overflow-hidden">
                  <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${s.iconBg} shadow-md ${s.shadow} mb-3`}>
                    <s.Icon size={16} className="text-white" strokeWidth={2} />
                  </div>
                  <div className={`text-2xl font-black ${s.vc}`}>{stats[s.key]}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">{s.label}</div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Tabs ── */}
          <motion.div {...fadeUp(0.45)} className="flex gap-2 bg-slate-50 border border-gray-100 rounded-2xl p-1.5 overflow-x-auto">
            {TABS.map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === t
                    ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                    : "text-slate-400 hover:text-slate-700"
                }`}>
                {label}
              </button>
            ))}
          </motion.div>

          {/* ── Pending Doctors ── */}
          {tab === "pending" && (
            <motion.div {...fadeUp(0.55)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
              {pendingDoctors.length === 0 ? (
                <div className="p-10 text-center">
                  <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-slate-400 text-sm">لا توجد طلبات معلقة</p>
                </div>
              ) : (
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className={thClass}>الاسم</th>
                      <th className={thClass}>البريد</th>
                      <th className={thClass}>التخصص</th>
                      <th className={thClass}>السيرة الذاتية</th>
                      <th className={thClass}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingDoctors.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className={`${tdClass} text-slate-900 font-bold`}>{d.full_name}</td>
                        <td className={`${tdClass} text-slate-500`}>{d.email}</td>
                        <td className={`${tdClass} text-slate-600`}>{d.specialization ?? "—"}</td>
                        <td className={tdClass}>
                          {d.cv_file ? (
                            <a href={`/api/uploads/${d.cv_file}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all">
                              <ChevronLeft size={12} />
                              عرض CV
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">لا يوجد</span>
                          )}
                        </td>
                        <td className={`${tdClass} flex items-center gap-2`}>
                          <button onClick={() => approveDoctor(d.id)} disabled={actionLoading === d.id}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-all">
                            {actionLoading === d.id ? "..." : "اعتماد"}
                          </button>
                          <button onClick={() => rejectDoctor(d.id)} disabled={actionLoading === d.id}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20 disabled:opacity-50 transition-all">
                            رفض
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}

          {/* ── All Doctors ── */}
          {tab === "all" && (
            <motion.div {...fadeUp(0.55)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className={thClass}>الاسم</th>
                    <th className={thClass}>البريد</th>
                    <th className={thClass}>الحالة</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allDoctors.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className={`${tdClass} text-slate-900 font-bold`}>{d.full_name}</td>
                      <td className={`${tdClass} text-slate-500`}>{d.email}</td>
                      <td className={tdClass}>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          d.is_suspended ? "bg-red-50 border-red-200 text-red-700" :
                          d.is_approved  ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                           "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${d.is_suspended ? "bg-red-500" : d.is_approved ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {d.is_suspended ? "موقوف" : d.is_approved ? "معتمد" : "معلق"}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <button onClick={() => suspendDoctor(d.id, d.is_suspended)} disabled={actionLoading === d.id}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all ${
                            d.is_suspended ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" : "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                          }`}>
                          {actionLoading === d.id ? "..." : d.is_suspended ? "رفع الإيقاف" : "إيقاف"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {/* ── Users ── */}
          {tab === "users" && (
            <motion.div {...fadeUp(0.55)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className={thClass}>الاسم</th>
                    <th className={thClass}>البريد</th>
                    <th className={thClass}>الدور</th>
                    <th className={thClass}>الحالة</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => {
                    const isSelf = u.id === user.user_id;
                    return (
                      <tr key={u.id} className={`hover:bg-slate-50/60 transition-colors ${isSelf ? "bg-amber-50/40" : ""}`}>
                        <td className={`${tdClass} text-slate-900 font-bold`}>
                          <span className="flex items-center gap-2">
                            {u.full_name}
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                                أنت
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`${tdClass} text-slate-500`}>{u.email}</td>
                        <td className={`${tdClass} text-slate-600 capitalize`}>{u.role}</td>
                        <td className={tdClass}>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            u.is_active ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                            {u.is_active ? "نشط" : "موقوف"}
                          </span>
                        </td>
                        <td className={`${tdClass} flex items-center gap-2`}>
                          {isSelf ? (
                            <span className="text-xs text-slate-400 italic">محمي</span>
                          ) : (
                            <>
                              <button onClick={() => toggleUser(u.id, u.is_active)} disabled={actionLoading === u.id}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-all ${
                                  u.is_active ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                }`}>
                                {actionLoading === u.id ? "..." : u.is_active ? "إيقاف" : "تفعيل"}
                              </button>
                              <button onClick={() => deleteUser(u.id)} disabled={actionLoading === u.id}
                                className="p-1.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 disabled:opacity-50 transition-all">
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}

          {/* ── Patients ── */}
          {tab === "patients" && (
            <motion.div {...fadeUp(0.55)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
              {patients.length === 0 ? (
                <div className="p-10 text-center">
                  <UserCheck size={36} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-slate-400 text-sm">لا يوجد مرضى مسجلون</p>
                </div>
              ) : (
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className={thClass}>الاسم</th>
                      <th className={thClass}>البريد</th>
                      <th className={thClass}>الجنس</th>
                      <th className={thClass}>الطبيب المعالج</th>
                      <th className={thClass}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {patients.map((p) => {
                      const assignedDoc = allDoctors.find((d) => d.id === p.assigned_doctor_id);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className={`${tdClass} text-slate-900 font-bold`}>{p.full_name}</td>
                          <td className={`${tdClass} text-slate-500`}>{p.email}</td>
                          <td className={`${tdClass} text-slate-600`}>{p.gender ?? "—"}</td>
                          <td className={tdClass}>
                            <select
                              value={p.assigned_doctor_id ?? ""}
                              onChange={(e) => assignDoctor(p.id, e.target.value ? Number(e.target.value) : null)}
                              className="text-xs rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-slate-700 outline-none focus:border-blue-400 transition-all cursor-pointer"
                            >
                              <option value="">غير محدد</option>
                              {allDoctors.filter((d) => d.is_approved).map((d) => (
                                <option key={d.id} value={d.id}>{d.full_name}</option>
                              ))}
                            </select>
                            {!p.assigned_doctor_id && (
                              <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                بدون طبيب
                              </span>
                            )}
                          </td>
                          <td className={tdClass}>
                            <button
                              onClick={() => toggleUser(p.user_id, true)}
                              disabled={actionLoading === p.user_id}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20 disabled:opacity-50 transition-all"
                            >
                              {actionLoading === p.user_id ? "..." : "إيقاف"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}

          {/* ── Activity Log ── */}
          {tab === "activity" && (
            <motion.div {...fadeUp(0.55)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
              {activityLog.length === 0 ? (
                <div className="p-10 text-center">
                  <Activity size={36} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-slate-400 text-sm">لا توجد أنشطة مسجلة</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute right-[7px] top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {activityLog.map((ev: any, i: number) => {
                      const dotColor =
                        ev.type === "register"    ? "bg-blue-500"    :
                        ev.type === "appointment" ? "bg-amber-500"   :
                        ev.type === "diagnosis"   ? "bg-cyan-500"    : "bg-slate-400";
                      return (
                        <div key={i} className="flex items-start gap-3 relative">
                          <div className={`w-3.5 h-3.5 rounded-full ${dotColor} shrink-0 mt-1 z-10 ring-2 ring-white`} />
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <div>
                              <div className="text-sm font-bold text-slate-800">{ev.label}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{ev.sub}</div>
                            </div>
                            {ev.date && (
                              <div className="text-[11px] text-slate-400 shrink-0 mr-2">
                                {new Date(ev.date).toLocaleDateString("ar-SA")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
