"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Brain, FileImage, RotateCcw, Save } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { diagnosisApi, patientApi, ApiError } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const CLASS_STYLE: Record<string, { bg: string; text: string; iconBg: string; label: string }> = {
  NonDemented:      { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", iconBg: "from-emerald-500 to-teal-500",  label: "طبيعي"  },
  MildDemented:     { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   iconBg: "from-amber-400 to-orange-400", label: "خفيف"   },
  ModerateDemented: { bg: "bg-red-50 border-red-200",         text: "text-red-700",     iconBg: "from-red-500 to-rose-500",     label: "متوسط"  },
};
const PROB_COLOR: Record<string, string> = {
  NonDemented: "#10B981", MildDemented: "#F59E0B", ModerateDemented: "#EF4444",
};

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-sm";

export default function UploadMRIPage() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const [patients, setPatients]               = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [file, setFile]                       = useState<File | null>(null);
  const [preview, setPreview]                 = useState<string | null>(null);
  const [dragging, setDragging]               = useState(false);
  const [result, setResult]                   = useState<any>(null);
  const [uploading, setUploading]             = useState(false);
  const [error, setError]                     = useState("");
  const [notes, setNotes]                     = useState("");
  const [savingNotes, setSavingNotes]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    patientApi.list().then((pts: any) => setPatients(pts)).catch(() => {});
  }, [user]);

  function handleFile(f: File) {
    setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setError("");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function upload() {
    if (!file || !selectedPatient) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("patient_id", selectedPatient);
      form.append("file", file);
      const res: any = await diagnosisApi.upload(form);
      setResult(res);
    } catch (e) { setError(e instanceof ApiError ? (e as any).message : "فشل رفع الصورة"); }
    finally { setUploading(false); }
  }

  async function saveNotes() {
    if (!result || !notes.trim()) return;
    setSavingNotes(true);
    try { await diagnosisApi.updateNotes(result.id, notes); setResult({ ...result, doctor_notes: notes }); }
    catch {}
    setSavingNotes(false);
  }

  if (loading || !user) return null;

  return (
    <DashboardLayout title="رفع صورة MRI">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-6 py-2">

          {/* ── Patient selector ── */}
          <motion.div {...fadeUp(0)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">اختر المريض</label>
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className={inputClass}>
              <option value="">-- اختر مريضاً --</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </motion.div>

          {/* ── Drop zone ── */}
          <motion.div {...fadeUp(0.1)}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative rounded-[2rem] cursor-pointer border-2 border-dashed transition-all duration-300 min-h-[220px] flex items-center justify-center overflow-hidden ${
                dragging
                  ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
                  : "border-gray-200 bg-white hover:border-cyan-400 hover:bg-cyan-50/30"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {preview ? (
                <div className="flex flex-col items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="MRI preview" className="max-h-48 object-contain rounded-2xl mb-3 shadow-md" />
                  <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-gray-100 rounded-xl px-3 py-1.5">
                    <FileImage size={14} className="text-blue-500" strokeWidth={1.75} />
                    {file?.name}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-600/25">
                    <Upload size={26} className="text-white" strokeWidth={2} />
                  </div>
                  <p className="text-slate-900 font-extrabold text-base">اسحب صورة MRI وأفلتها هنا</p>
                  <p className="text-slate-400 text-sm">أو انقر للاختيار — PNG / JPG / DICOM</p>
                </div>
              )}
            </div>
          </motion.div>

          {error && (
            <motion.div {...fadeUp(0)} className="p-4 rounded-2xl text-sm text-red-600 bg-red-50 border border-red-100">{error}</motion.div>
          )}

          {/* ── Upload button ── */}
          <AnimatePresence>
            {file && !result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                <button onClick={upload} disabled={uploading || !selectedPatient}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {uploading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التحليل بالذكاء الاصطناعي...
                    </>
                  ) : (
                    <>
                      <Brain size={18} strokeWidth={2} />
                      رفع وتحليل الصورة
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── AI Result ── */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-6">
                <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
                  <Brain size={18} className="text-blue-600" strokeWidth={2} />
                  نتيجة التحليل بالذكاء الاصطناعي
                </h3>

                {(() => {
                  const cs = CLASS_STYLE[result.classification] ?? { bg: "bg-gray-50 border-gray-200", text: "text-gray-700", iconBg: "from-slate-400 to-slate-500", label: result.classification };
                  return (
                    <div className={`flex items-center gap-5 p-5 rounded-2xl border ${cs.bg}`}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${cs.iconBg} shadow-lg shrink-0`}>
                        <Brain size={24} className="text-white" strokeWidth={2} />
                      </div>
                      <div>
                        <div className={`text-2xl font-black ${cs.text}`}>{cs.label}</div>
                        <div className="text-slate-400 text-sm mt-0.5">{result.classification} — ثقة {Math.round(result.confidence * 100)}%</div>
                      </div>
                    </div>
                  );
                })()}

                {result.probabilities && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">توزيع الاحتمالات</div>
                    {Object.entries(result.probabilities as Record<string, number>).map(([cls, prob]) => (
                      <div key={cls}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-700">{CLASS_STYLE[cls]?.label ?? cls}</span>
                          <span className="font-bold text-slate-900">{(prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-gray-100">
                          <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${prob * 100}%`, backgroundColor: PROB_COLOR[cls] ?? "#6B7280" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">ملاحظات الطبيب</label>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف ملاحظاتك الطبية هنا..." className={`${inputClass} resize-none`} />
                  <button onClick={saveNotes} disabled={savingNotes || !notes.trim()}
                    className="mt-2 flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 disabled:opacity-40 transition-all">
                    <Save size={14} strokeWidth={2.5} />
                    {savingNotes ? "جاري الحفظ..." : "حفظ الملاحظات"}
                  </button>
                </div>

                <button
                  onClick={() => { setFile(null); setPreview(null); setResult(null); setNotes(""); }}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition-colors font-medium"
                >
                  <RotateCcw size={14} strokeWidth={2} />
                  رفع صورة جديدة
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </DashboardLayout>
  );
}
