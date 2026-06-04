"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Plus, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { reportApi, patientApi } from "@/lib/api";
import { getToken } from "@/lib/auth";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function DoctorReportsPage() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const [reports, setReports]       = useState<any[]>([]);
  const [patients, setPatients]     = useState<any[]>([]);
  const [patientId, setPatientId]   = useState("");
  const [notes, setNotes]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState("");
  const [fetching, setFetching]     = useState(true);

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-sm";

  useEffect(() => {
    if (!user) return;
    Promise.all([reportApi.list(), patientApi.list()])
      .then(([r, p]) => {
        // /reports/list returns a paginated object { total, skip, limit, items }
        setReports((r as any)?.items ?? []);
        setPatients(p as any[]);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  async function generate() {
    if (!patientId) return;
    setGenerating(true); setError("");
    try {
      const res: any = await reportApi.generate(parseInt(patientId), notes);
      setReports((prev) => [{ filename: res.filename, url: res.url, size_kb: 0 }, ...prev]);
      setPatientId(""); setNotes("");
    } catch (e: any) {
      setError(e.message ?? "فشل توليد التقرير");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadReport(filename: string) {
    try {
      const token = getToken();
      const res = await fetch(reportApi.download(filename), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("تعذّر تحميل التقرير");
    }
  }

  if (loading || !user) return null;

  return (
    <DashboardLayout title="التقارير الطبية">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-violet-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-blue-200/15 blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-6 py-2">

          {/* ── Generate new report ── */}
          <motion.div {...fadeUp(0)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-4">
            <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
              <Plus size={18} className="text-blue-600" strokeWidth={2.5} />
              توليد تقرير جديد
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">اختر المريض</label>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputClass}>
                <option value="">-- اختر مريضاً --</option>
                {patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">ملاحظات الطبيب (اختياري)</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظاتك الطبية..." className={`${inputClass} resize-none`} />
            </div>
            {error && <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}
            <button onClick={generate} disabled={generating || !patientId}
              className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {generating ? (
                <><Loader2 size={16} className="animate-spin" strokeWidth={2.5} /> جاري توليد التقرير...</>
              ) : (
                <><FileText size={16} strokeWidth={2} /> توليد تقرير PDF</>
              )}
            </button>
          </motion.div>

          {/* ── Reports list ── */}
          <motion.div {...fadeUp(0.12)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-slate-900 font-extrabold">التقارير المحفوظة</h3>
              <span className="text-xs text-slate-400 font-medium">{reports.length} تقرير</span>
            </div>

            {fetching ? (
              <div className="p-12 flex justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText size={24} className="text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="text-slate-400 text-sm font-medium">لا توجد تقارير بعد</div>
                <div className="text-slate-300 text-xs mt-1">قم بتوليد أول تقرير لمريض</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {reports.map((r: any, i) => (
                  <motion.div key={r.filename} {...fadeUp(0.05 * i)} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center shadow-sm shadow-red-500/30 shrink-0">
                        <FileText size={16} className="text-white" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-slate-900 text-sm font-bold">{r.filename}</div>
                        {r.size_kb > 0 && <div className="text-slate-400 text-xs mt-0.5">{r.size_kb} KB</div>}
                      </div>
                    </div>
                    <button onClick={() => downloadReport(r.filename)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all">
                      <Download size={13} strokeWidth={2.5} />
                      تحميل
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </DashboardLayout>
  );
}
