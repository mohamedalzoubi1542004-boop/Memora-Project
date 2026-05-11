"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, CheckCircle, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { caregiverApi } from "@/lib/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const QUESTIONS = [
  "هل تشعر بالإرهاق بسبب مهام الرعاية؟",
  "هل تجد صعوبة في الحصول على وقت كافٍ لنفسك؟",
  "هل تشعر بالعجز أو انعدام السيطرة؟",
  "هل تعاني من صعوبات في النوم بسبب القلق؟",
  "هل تشعر بالعزلة الاجتماعية؟",
  "هل تجد نفسك تنسى أشياءً مهمة أو تصعب عليك التركيز؟",
  "هل تشعر بالتوتر أو القلق أكثر من المعتاد؟",
  "هل تشعر بالحزن أو الاكتئاب؟",
  "هل يؤثر دورك كمقدم رعاية على صحتك الجسدية؟",
  "هل تشعر أن طاقتك الانفعالية قد نضبت؟",
];

const ANSWERS = [
  { value: 0, label: "لا",       active: "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30",   idle: "border-gray-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50" },
  { value: 1, label: "أحياناً",  active: "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30",         idle: "border-gray-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50" },
  { value: 2, label: "دائماً",   active: "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/30",               idle: "border-gray-200 text-slate-600 hover:border-red-300 hover:bg-red-50" },
];

function burnoutInfo(score: number) {
  if (score <= 6)  return { text: "منخفض", textClass: "text-emerald-600", ringGradient: "from-emerald-500 to-teal-500",  bgClass: "bg-emerald-50 border-emerald-200", desc: "أنت في حالة جيدة. استمر في الاعتناء بصحتك." };
  if (score <= 13) return { text: "متوسط", textClass: "text-amber-600",   ringGradient: "from-amber-400 to-orange-400",  bgClass: "bg-amber-50 border-amber-200",   desc: "يُنصح بأخذ قسط من الراحة والتحدث مع متخصص." };
  return               { text: "مرتفع", textClass: "text-red-600",     ringGradient: "from-red-500 to-rose-500",       bgClass: "bg-red-50 border-red-200",       desc: "مستوى الإجهاد مرتفع. يُرجى التواصل مع مختص نفسي." };
}

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all text-sm";

export default function BurnoutPage() {
  const { user, loading } = useRequireAuth(["family"]);
  const [patientId, setPatientId] = useState("");
  const [answers, setAnswers]     = useState<Record<string, number>>({});
  const [result, setResult]       = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");

  if (loading || !user) return null;

  const allAnswered = QUESTIONS.every((_, i) => answers[`q${i + 1}`] !== undefined);
  const answered    = Object.keys(answers).length;
  const progress    = (answered / QUESTIONS.length) * 100;

  async function handleSubmit() {
    if (!allAnswered || !patientId) return;
    setSubmitting(true); setError("");
    try {
      const scores: Record<string, number> = {};
      QUESTIONS.forEach((_, i) => { scores[`q${i + 1}`] = answers[`q${i + 1}`] ?? 0; });
      const res = await caregiverApi.submit({ patient_id: parseInt(patientId), scores });
      setResult(res);
    } catch (e: any) { setError(e.message ?? "حدث خطأ"); }
    finally { setSubmitting(false); }
  }

  return (
    <DashboardLayout title="تقييم إجهاد مقدم الرعاية">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-emerald-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-teal-200/15 blur-[100px]" />
        </div>

        <div className="max-w-2xl mx-auto py-2">

          <AnimatePresence mode="wait">
            {result ? (
              /* ── Result screen ── */
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 space-y-6"
              >
                {(() => {
                  const bl = burnoutInfo(result.total_score);
                  return (
                    <>
                      <div className={`w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center border-4 ${bl.bgClass} shadow-xl`} style={{ borderImage: "unset" }}>
                        <div className={`text-4xl font-black ${bl.textClass}`}>{result.total_score}</div>
                        <div className="text-xs text-slate-400 font-medium">/ 20</div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                          مستوى الإجهاد: <span className={bl.textClass}>{bl.text}</span>
                        </h2>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">{bl.desc}</p>
                      </div>
                      <button onClick={() => { setResult(null); setAnswers({}); }}
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-emerald-600 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-600/30 transition-all">
                        <RefreshCw size={16} strokeWidth={2.5} />
                        إعادة التقييم
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              /* ── Assessment form ── */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                <motion.div {...fadeUp(0)}>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                    <Heart size={20} className="text-emerald-500" strokeWidth={2} />
                    تقييم الإجهاد النفسي
                  </h2>
                  <p className="text-slate-400 text-sm">استبيان من 10 أسئلة لقياس مستوى الإجهاد النفسي لمقدم الرعاية.</p>
                </motion.div>

                {/* Patient ID */}
                <motion.div {...fadeUp(0.08)} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">رقم المريض الذي تقدم له الرعاية</label>
                  <input type="number" value={patientId} onChange={(e) => setPatientId(e.target.value)}
                    placeholder="مثال: 1" className={inputClass} />
                </motion.div>

                {/* Progress bar */}
                <motion.div {...fadeUp(0.12)}>
                  <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                    <span>{answered} / {QUESTIONS.length} سؤال</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${progress}%` }} />
                  </div>
                </motion.div>

                {/* Questions */}
                <div className="space-y-3">
                  {QUESTIONS.map((q, i) => {
                    const key = `q${i + 1}`;
                    const val = answers[key];
                    return (
                      <motion.div key={key} {...fadeUp(0.15 + i * 0.04)} className="group relative bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-cyan-100/40 hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden">
                        <span aria-hidden className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <p className="text-slate-900 text-sm font-semibold mb-4 flex gap-2">
                          <span className="text-emerald-600 font-black shrink-0">{i + 1}.</span>
                          {q}
                          {val !== undefined && <CheckCircle size={14} className="text-emerald-500 mr-auto shrink-0 mt-0.5" strokeWidth={2.5} />}
                        </p>
                        <div className="flex gap-2">
                          {ANSWERS.map((a) => (
                            <button key={a.value}
                              onClick={() => setAnswers((prev) => ({ ...prev, [key]: a.value }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all duration-200 ${
                                val === a.value ? a.active : a.idle
                              }`}>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {error && <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

                <motion.div {...fadeUp(0.6)}>
                  <button onClick={handleSubmit} disabled={!allAnswered || !patientId || submitting}
                    className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-l from-emerald-600 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {submitting ? (
                      <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                    ) : !patientId ? "أدخل رقم المريض أولاً"
                    : !allAnswered ? `أكمل ${QUESTIONS.length - answered} سؤال متبقٍ`
                    : <><CheckCircle size={18} strokeWidth={2.5} /> إرسال التقييم</>}
                  </button>
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </DashboardLayout>
  );
}
