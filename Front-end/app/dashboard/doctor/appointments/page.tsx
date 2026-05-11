"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, XCircle, User } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { appointmentApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:   { bg: "bg-amber-50 border-amber-200",    text: "text-amber-700",   dot: "bg-amber-500",   label: "معلق"  },
  approved:  { bg: "bg-emerald-50 border-emerald-200",text: "text-emerald-700", dot: "bg-emerald-500", label: "مؤكد"  },
  cancelled: { bg: "bg-red-50 border-red-200",        text: "text-red-700",     dot: "bg-red-500",     label: "ملغي"  },
  completed: { bg: "bg-slate-50 border-slate-200",    text: "text-slate-600",   dot: "bg-slate-400",   label: "مكتمل" },
};

export default function DoctorAppointmentsPage() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const [appointments, setAppointments]   = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    appointmentApi.my().then((a: any) => setAppointments(a)).catch(() => {});
  }, [user]);

  async function approve(id: number) {
    setActionLoading(id);
    await appointmentApi.approve(id).catch(() => {});
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" } : a));
    setActionLoading(null);
  }

  async function complete(id: number) {
    setActionLoading(id);
    await appointmentApi.complete(id).catch(() => {});
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "completed" } : a));
    setActionLoading(null);
  }

  async function cancel(id: number) {
    setActionLoading(id);
    await appointmentApi.cancel(id).catch(() => {});
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
    setActionLoading(null);
  }

  if (loading || !user) return null;

  const pending  = appointments.filter((a) => a.status === "pending");
  const approved = appointments.filter((a) => a.status === "approved");
  const rest     = appointments.filter((a) => !["pending", "approved"].includes(a.status));

  function ApptCard({ a, i }: { a: any; i: number }) {
    const st = STATUS_STYLE[a.status] ?? { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", dot: "bg-slate-400", label: a.status };
    return (
      <motion.div {...fadeUp(0.05 * i)} className="group relative bg-white border border-gray-100 rounded-[1.75rem] shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden">
        <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-blue-500 shadow-md shadow-violet-500/30 shrink-0">
              <User size={16} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="text-slate-900 font-bold">{a.patient_name}</div>
              <div className="text-slate-400 text-sm mt-0.5">{new Date(a.scheduled_at).toLocaleString("ar-SA")}</div>
              {a.notes && <div className="text-slate-400 text-xs mt-1 italic">{a.notes}</div>}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${st.bg} ${st.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        </div>
        {(a.status === "pending" || a.status === "approved") && (
          <div className="flex gap-2 mt-4">
            {a.status === "pending" && (
              <>
                <button onClick={() => approve(a.id)} disabled={actionLoading === a.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-all">
                  <CheckCircle size={13} strokeWidth={2.5} />
                  {actionLoading === a.id ? "..." : "قبول"}
                </button>
                <button onClick={() => cancel(a.id)} disabled={actionLoading === a.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20 disabled:opacity-50 transition-all">
                  <XCircle size={13} strokeWidth={2.5} />
                  رفض
                </button>
              </>
            )}
            {a.status === "approved" && (
              <button onClick={() => complete(a.id)} disabled={actionLoading === a.id}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 disabled:opacity-50 transition-all">
                <CheckCircle size={13} strokeWidth={2.5} />
                {actionLoading === a.id ? "..." : "إنهاء الموعد"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <DashboardLayout title="إدارة المواعيد">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[440px] h-[440px] rounded-full bg-violet-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[340px] h-[340px] rounded-full bg-blue-200/15 blur-[100px]" />
        </div>

        <div className="max-w-2xl mx-auto space-y-6 py-2">

          {appointments.length === 0 ? (
            <motion.div {...fadeUp(0)} className="text-center py-20 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-violet-400" strokeWidth={1.5} />
              </div>
              <div className="text-slate-500 font-semibold">لا توجد مواعيد بعد</div>
            </motion.div>
          ) : (
            <>
              {pending.length > 0 && (
                <section>
                  <h3 className="text-slate-900 font-extrabold mb-3 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" strokeWidth={2} />
                    بانتظار الموافقة
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold">{pending.length}</span>
                  </h3>
                  <div className="space-y-3">{pending.map((a, i) => <ApptCard key={a.id} a={a} i={i} />)}</div>
                </section>
              )}
              {approved.length > 0 && (
                <section>
                  <h3 className="text-slate-900 font-extrabold mb-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-500" strokeWidth={2} />
                    مؤكدة
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">{approved.length}</span>
                  </h3>
                  <div className="space-y-3">{approved.map((a, i) => <ApptCard key={a.id} a={a} i={i} />)}</div>
                </section>
              )}
              {rest.length > 0 && (
                <section>
                  <h3 className="text-slate-500 font-bold mb-3 text-sm">السجل</h3>
                  <div className="space-y-3">{rest.map((a, i) => <ApptCard key={a.id} a={a} i={i} />)}</div>
                </section>
              )}
            </>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
