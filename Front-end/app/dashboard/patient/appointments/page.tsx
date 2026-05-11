"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, X, Clock, CheckCircle, XCircle } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { appointmentApi, doctorApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string; Icon: any }> = {
  pending:   { bg: "bg-amber-50 border-amber-200",   text: "text-amber-700",   dot: "bg-amber-500",   label: "معلق",   Icon: Clock },
  approved:  { bg: "bg-emerald-50 border-emerald-200",text: "text-emerald-700", dot: "bg-emerald-500", label: "مؤكد",   Icon: CheckCircle },
  cancelled: { bg: "bg-red-50 border-red-200",        text: "text-red-700",     dot: "bg-red-500",     label: "ملغي",   Icon: XCircle },
  completed: { bg: "bg-slate-50 border-slate-200",    text: "text-slate-600",   dot: "bg-slate-400",   label: "مكتمل", Icon: CheckCircle },
};

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-sm";

export default function PatientAppointmentsPage() {
  const { user, loading } = useRequireAuth(["patient"]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors]           = useState<any[]>([]);
  const [doctorId, setDoctorId]         = useState("");
  const [scheduledAt, setScheduledAt]   = useState("");
  const [notes, setNotes]               = useState("");
  const [booking, setBooking]           = useState(false);
  const [error, setError]               = useState("");
  const [showForm, setShowForm]         = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([appointmentApi.my(), doctorApi.list()])
      .then(([appts, docs]) => { setAppointments(appts as any[]); setDoctors(docs as any[]); })
      .catch(() => {});
  }, [user]);

  async function book() {
    if (!doctorId || !scheduledAt) return;
    setBooking(true); setError("");
    try {
      const res: any = await appointmentApi.request({ doctor_id: parseInt(doctorId), scheduled_at: scheduledAt, notes });
      setAppointments((prev) => [res, ...prev]);
      setShowForm(false); setDoctorId(""); setScheduledAt(""); setNotes("");
    } catch (e: any) { setError(e.message ?? "فشل الحجز"); }
    finally { setBooking(false); }
  }

  async function cancelAppt(id: number) {
    await appointmentApi.cancel(id).catch(() => {});
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
  }

  if (loading || !user) return null;

  return (
    <DashboardLayout title="مواعيدي">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>

        <div className="max-w-2xl mx-auto space-y-5 py-2">

          {/* ── Header row ── */}
          <motion.div {...fadeUp(0)} className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">مواعيدي</h2>
              <p className="text-slate-400 text-sm mt-0.5">{appointments.length} موعد مسجل</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                showForm
                  ? "border border-gray-200 text-slate-600 bg-white hover:border-red-200 hover:text-red-500"
                  : "bg-gradient-to-l from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30 hover:opacity-90"
              }`}
            >
              {showForm ? <><X size={16} /> إلغاء</> : <><Plus size={16} /> حجز موعد</>}
            </button>
          </motion.div>

          {/* ── Booking form ── */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-4">
                  <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" strokeWidth={2} />
                    حجز موعد جديد
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">الطبيب</label>
                    <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputClass}>
                      <option value="">-- اختر طبيباً --</option>
                      {doctors.map((d: any) => (
                        <option key={d.id} value={d.id}>د. {d.full_name} — {d.specialization ?? "عام"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">التاريخ والوقت</label>
                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ملاحظات (اختياري)</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="سبب الزيارة..." className={`${inputClass} resize-none`} />
                  </div>
                  {error && <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}
                  <button onClick={book} disabled={booking || !doctorId || !scheduledAt}
                    className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50">
                    {booking ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        جاري الحجز...
                      </span>
                    ) : "تأكيد الحجز"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Appointments list ── */}
          {appointments.length === 0 ? (
            <motion.div {...fadeUp(0.15)} className="text-center py-16 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-blue-400" strokeWidth={1.5} />
              </div>
              <div className="text-slate-500 font-semibold">لا توجد مواعيد بعد</div>
              <div className="text-slate-400 text-sm mt-1">اضغط "حجز موعد" للبدء</div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a: any, i) => {
                const st = STATUS_STYLE[a.status] ?? { bg: "bg-gray-50 border-gray-200", text: "text-gray-600", dot: "bg-slate-400", label: a.status, Icon: Clock };
                return (
                  <motion.div key={a.id} {...fadeUp(0.1 + i * 0.05)} className="group relative bg-white border border-gray-100 rounded-[1.75rem] shadow-sm hover:shadow-xl hover:shadow-cyan-100/40 hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden">
                    <span aria-hidden className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[1.75rem]" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md shadow-blue-500/30 shrink-0">
                          <Calendar size={16} className="text-white" strokeWidth={2} />
                        </div>
                        <div>
                          <div className="text-slate-900 font-bold">د. {a.doctor_name}</div>
                          <div className="text-slate-400 text-sm mt-0.5">{new Date(a.scheduled_at).toLocaleString("ar-SA")}</div>
                          {a.notes && <div className="text-slate-400 text-xs mt-1 italic">{a.notes}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        {a.status === "pending" && (
                          <button onClick={() => cancelAppt(a.id)} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">إلغاء</button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
