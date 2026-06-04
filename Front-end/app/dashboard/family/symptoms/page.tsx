"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { BarChart2, ClipboardList, ChevronDown, Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { symptomApi, familyApi } from "@/lib/api";

// recharts is heavy — the chart-rich history view loads only when its tab opens,
// keeping it out of the page's initial bundle.
const SymptomsHistory = dynamic(() => import("./SymptomsHistory"), {
  ssr: false,
  loading: () => <div className="text-center text-slate-400 py-12">جاري التحميل...</div>,
});

const QUESTIONS = [
  "هل نسي أشياءً حدثت مؤخراً؟",
  "هل واجه صعوبة في تذكر أسماء الأشخاص المعروفين؟",
  "هل أصبح يعيد نفس الأسئلة أو الكلام مرات عدة؟",
  "هل واجه صعوبة في إيجاد الكلمات المناسبة؟",
  "هل أصبح يتوه في أماكن مألوفة؟",
  "هل لاحظت تغيراً في مزاجه أو شخصيته؟",
  "هل أصبح أكثر سلبية أو قلة اهتمام؟",
  "هل أصبح أكثر قلقاً أو توتراً دون سبب واضح؟",
  "هل واجه صعوبة في إدارة شؤونه اليومية (المال، الدواء)؟",
  "هل واجه صعوبة في التخطيط أو اتخاذ القرار؟",
  "هل لاحظت تراجعاً في حكمه أو تصرفاته؟",
  "هل يحتاج مساعدة في أنشطة كان يؤديها بمفرده سابقاً؟",
];

const ANSWERS = [
  { value: 0, label: "لا",         cls: "border-emerald-400 bg-emerald-500 text-white shadow-md shadow-emerald-500/30", idle: "border-gray-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50" },
  { value: 1, label: "أحياناً",    cls: "border-amber-400 bg-amber-500 text-white shadow-md shadow-amber-500/30",       idle: "border-gray-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50" },
  { value: 2, label: "نعم دائماً", cls: "border-red-400 bg-red-500 text-white shadow-md shadow-red-500/30",             idle: "border-gray-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50" },
];

const RELATION_LABELS: Record<string, string> = {
  son: "ابن", daughter: "ابنة", father: "أب", mother: "أم",
  brother: "أخ", sister: "أخت", spouse: "زوج/زوجة", other: "أخرى",
};

type LinkedPatient = { patient_id: number; full_name: string; relation_type: string };

function severityInfo(score: number) {
  if (score <= 6)  return { text: "أدنى",  textClass: "text-green-600", ringClass: "border-green-400", bgClass: "bg-green-50" };
  if (score <= 14) return { text: "متوسط", textClass: "text-amber-600", ringClass: "border-amber-400", bgClass: "bg-amber-50" };
  return              { text: "مرتفع", textClass: "text-red-600",   ringClass: "border-red-400",   bgClass: "bg-red-50" };
}

/* ─── Main Page ─── */
export default function FamilySymptomsPage() {
  const { user, loading } = useRequireAuth(["family"]);
  const [patients, setPatients]   = useState<LinkedPatient[]>([]);
  const [loadingPts, setLoadingPts] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab]         = useState<"survey" | "history">("survey");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!user) return;
    familyApi.myPatients()
      .then((list) => {
        setPatients(list);
        if (list.length === 1) setSelectedId(list[0].patient_id);
      })
      .catch(() => setPatients([]))
      .finally(() => setLoadingPts(false));
  }, [user]);

  if (loading || !user) return null;

  const allAnswered = QUESTIONS.every((_, i) => answers[`q${i + 1}`] !== undefined);
  const total       = Object.values(answers).reduce((s, v) => s + v, 0);
  const answered    = Object.keys(answers).length;

  async function handleSubmit() {
    if (!allAnswered || !selectedId) return;
    setSubmitting(true); setError("");
    try {
      const scores: Record<string, number> = {};
      QUESTIONS.forEach((_, i) => { scores[`q${i + 1}`] = answers[`q${i + 1}`] ?? 0; });
      const res = await symptomApi.submit({ patient_id: selectedId, scores });
      setResult(res); setSubmitted(true);
    } catch (e: any) { setError(e.message ?? "حدث خطأ"); }
    finally { setSubmitting(false); }
  }

  /* Result screen */
  if (submitted && result) {
    const sev = severityInfo(result.total_score);
    return (
      <DashboardLayout title="نتيجة الاستبيان">
        <div className="relative min-h-full" dir="rtl">
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-emerald-200/20 blur-[120px]" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-teal-200/15 blur-[100px]" />
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="max-w-lg mx-auto text-center py-12 space-y-6">
            <div className={`w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center border-4 ${sev.ringClass} ${sev.bgClass} shadow-xl`}>
              <div className={`text-4xl font-black ${sev.textClass}`}>{result.total_score}</div>
              <div className="text-xs text-slate-400 font-medium">/ 24</div>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                مستوى الأعراض: <span className={sev.textClass}>{sev.text}</span>
              </h2>
              <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                {sev.text === "أدنى"  ? "لا تشير الأعراض إلى مشكلة صحية بارزة." :
                 sev.text === "متوسط" ? "يُنصح بمتابعة دورية مع الطبيب." :
                                        "يرجى التواصل مع الطبيب المعالج في أقرب وقت."}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setSubmitted(false); setAnswers({}); setResult(null); }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-emerald-600 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-600/30 transition-all">
                <ClipboardList size={16} strokeWidth={2} />
                إعادة الاستبيان
              </button>
              <button onClick={() => { setSubmitted(false); setAnswers({}); setResult(null); setTab("history"); }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-slate-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all">
                <BarChart2 size={16} strokeWidth={2} />
                عرض السجل
              </button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="متابعة أعراض المريض">
      <div className="relative min-h-full" dir="rtl">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-emerald-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-teal-200/15 blur-[100px]" />
        </div>
      <div className="max-w-2xl mx-auto py-2">

        {/* Patient selector */}
        {loadingPts ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6 text-center text-slate-400 text-sm">
            جاري تحميل بيانات المرضى...
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-8 text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-100 mx-auto mb-4">
              <Users size={24} className="text-slate-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-slate-700 font-bold text-base mb-1">لا يوجد مرضى مرتبطون بحسابك</h3>
            <p className="text-slate-400 text-sm">اطلب من الطبيب أو المريض إضافتك كجهة تواصل عائلية.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">المريض الذي تتابع أعراضه</label>
            {patients.length === 1 ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-black text-sm shrink-0">
                  {patients[0].full_name.charAt(0)}
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-sm">{patients[0].full_name}</div>
                  <div className="text-xs text-emerald-600">{RELATION_LABELS[patients[0].relation_type] ?? patients[0].relation_type}</div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  className="w-full appearance-none pr-4 pl-10 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all text-sm"
                >
                  <option value="" disabled>اختر مريضاً...</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.full_name} — {RELATION_LABELS[p.relation_type] ?? p.relation_type}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        )}

        {selectedId && (
          <>
            {/* Tab switcher */}
            <div className="flex gap-2 bg-slate-50 border border-gray-100 rounded-2xl p-1.5 mb-6">
              {([["survey", "استبيان جديد", ClipboardList], ["history", "السجل والتحليل", BarChart2]] as const).map(([t, label, Icon]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    tab === t
                      ? "bg-white text-emerald-600 shadow-sm border border-gray-100"
                      : "text-slate-400 hover:text-slate-700"
                  }`}>
                  <Icon size={14} strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>

            {/* History tab — lazy-loaded */}
            {tab === "history" && <SymptomsHistory patientId={selectedId} />}

            {/* Survey tab */}
            {tab === "survey" && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">استبيان متابعة الأعراض</h2>
                  <p className="text-slate-500 text-sm">أجب بصدق عن كل سؤال بناءً على ما لاحظته على المريض خلال الشهر الماضي.</p>
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>{answered} / {QUESTIONS.length} سؤال</span>
                    <span>المجموع: {total} / 24</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-gradient-to-l from-emerald-600 to-teal-500 transition-all"
                      style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {QUESTIONS.map((q, i) => {
                    const key = `q${i + 1}`;
                    const val = answers[key];
                    return (
                      <div key={key} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md hover:shadow-emerald-100/30 transition-all">
                        <p className="text-slate-900 text-sm font-medium mb-4">
                          <span className="text-emerald-600 ml-2 font-bold">{i + 1}.</span>
                          {q}
                        </p>
                        <div className="flex gap-2">
                          {ANSWERS.map((a) => (
                            <button
                              key={a.value}
                              onClick={() => setAnswers((prev) => ({ ...prev, [key]: a.value }))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                                val === a.value ? a.cls : a.idle
                              }`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <div className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-l from-emerald-600 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "جاري الحفظ..."
                    : allAnswered
                    ? "إرسال الاستبيان"
                    : `أكمل الإجابة على ${QUESTIONS.length - answered} سؤال متبقٍ`}
                </button>
              </>
            )}
          </>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
