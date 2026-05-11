"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, ClipboardList } from "lucide-react";
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
  RadarChart as ReRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { symptomApi, patientApi } from "@/lib/api";

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

const RADAR_AXES = [
  { label: "الذاكرة",      qs: [0, 1, 2] },
  { label: "التوجه",       qs: [3, 4] },
  { label: "اللغة",        qs: [5, 6] },
  { label: "السلوك",       qs: [7, 8] },
  { label: "الوظائف اليومية", qs: [9, 10] },
  { label: "التعرف",       qs: [11] },
];

function severityInfo(score: number) {
  if (score <= 6)  return { text: "أدنى",  textClass: "text-green-600", ringClass: "border-green-400", bgClass: "bg-green-50",  color: "#10B981" };
  if (score <= 14) return { text: "متوسط", textClass: "text-amber-600", ringClass: "border-amber-400", bgClass: "bg-amber-50",  color: "#F59E0B" };
  return              { text: "مرتفع", textClass: "text-red-600",   ringClass: "border-red-400",   bgClass: "bg-red-50",    color: "#EF4444" };
}

/* ─── Recharts: Line Chart ─── */
function SymptomsLineChart({ data }: { data: { date: string; score: number }[] }) {
  if (data.length < 2) return (
    <p className="text-center text-slate-400 text-sm py-6">تحتاج إلى استبيانين على الأقل لعرض الرسم البياني.</p>
  );
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReLineChart data={formatted} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <ReferenceArea y1={0}  y2={6}  fill="#dcfce7" fillOpacity={0.4} />
        <ReferenceArea y1={7}  y2={14} fill="#fef3c7" fillOpacity={0.4} />
        <ReferenceArea y1={15} y2={24} fill="#fee2e2" fillOpacity={0.4} />
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <YAxis domain={[0, 24]} ticks={[0, 7, 15, 24]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <ReferenceLine y={7}  stroke="#fbbf24" strokeDasharray="4 3" strokeWidth={1} />
        <ReferenceLine y={15} stroke="#f87171" strokeDasharray="4 3" strokeWidth={1} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          formatter={(v: any) => [v, "الدرجة"]}
          labelFormatter={(l) => `التاريخ: ${l}`}
        />
        <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5}
          dot={{ r: 5, fill: "#2563eb", stroke: "white", strokeWidth: 2 }}
          activeDot={{ r: 7 }} />
      </ReLineChart>
    </ResponsiveContainer>
  );
}

/* ─── Recharts: Radar Chart ─── */
function SymptomsRadarChart({ scores }: { scores: Record<string, number> }) {
  const radarData = RADAR_AXES.map((ax) => {
    const max  = ax.qs.length * 2;
    const raw  = ax.qs.reduce((s, qi) => s + (scores[`q${qi + 1}`] ?? 0), 0);
    return { axis: ax.label, value: raw, fullMark: max };
  });
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ReRadarChart data={radarData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} />
        <PolarRadiusAxis angle={90} domain={[0, "auto"]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
        <Radar name="الأعراض" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
      </ReRadarChart>
    </ResponsiveContainer>
  );
}

/* ─── History Tab ─── */
function HistoryTab({ patientId }: { patientId: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    symptomApi.history(patientId)
      .then((h) => setHistory((h as any[]).slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="text-center text-slate-400 py-12">جاري التحميل...</div>;
  if (history.length === 0) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">📊</div>
      <p className="text-slate-400">لا توجد استبيانات سابقة بعد.</p>
    </div>
  );

  const chartData = [...history].reverse().map((h) => ({
    date: h.created_at,
    score: h.total_score,
  }));

  const latestScores = history[0]?.scores ?? {};

  return (
    <div className="space-y-6">
      {/* Line chart */}
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          تطور الدرجة عبر الزمن
        </h3>
        <div className="flex gap-3 mb-4 text-xs">
          {[["أدنى (0-6)", "#dcfce7", "text-green-700"], ["متوسط (7-14)", "#fef3c7", "text-amber-700"], ["مرتفع (15-24)", "#fee2e2", "text-red-700"]].map(([l, bg, tc]) => (
            <div key={l} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${tc}`} style={{ backgroundColor: bg }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: bg === "#dcfce7" ? "#10B981" : bg === "#fef3c7" ? "#F59E0B" : "#EF4444" }} />
              {l}
            </div>
          ))}
        </div>
        <SymptomsLineChart data={chartData} />
      </div>

      {/* Radar chart */}
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
          مخطط الأبعاد المعرفية (آخر استبيان)
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <SymptomsRadarChart scores={latestScores} />
          <div className="flex-1 space-y-2 w-full">
            {RADAR_AXES.map((ax) => {
              const raw = ax.qs.reduce((s, qi) => s + (latestScores[`q${qi + 1}`] ?? 0), 0);
              const max = ax.qs.length * 2;
              const pct = Math.round((raw / max) * 100);
              return (
                <div key={ax.label}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{ax.label}</span>
                    <span className="font-semibold">{raw}/{max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-slate-900 font-semibold">سجل الاستبيانات</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {history.map((h, i) => {
            const sev = severityInfo(h.total_score);
            return (
              <div key={h.id ?? i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border ${sev.ringClass} ${sev.bgClass} ${sev.textClass}`}>
                    {h.total_score}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${sev.textClass}`}>{sev.text}</div>
                    <div className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                </div>
                <div className="h-2 w-24 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(h.total_score / 24) * 100}%`, backgroundColor: sev.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SymptomsPage() {
  const { user, loading } = useRequireAuth(["patient"]);
  const [tab, setTab]         = useState<"survey" | "history">("survey");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");
  const [patientId, setPatientId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    patientApi.me().then((p: any) => setPatientId(p.id)).catch(() => {});
  }, [user]);

  if (loading || !user) return null;

  const allAnswered = QUESTIONS.every((_, i) => answers[`q${i + 1}`] !== undefined);
  const total       = Object.values(answers).reduce((s, v) => s + v, 0);
  const answered    = Object.keys(answers).length;

  async function handleSubmit() {
    if (!allAnswered || !patientId) return;
    setSubmitting(true); setError("");
    try {
      const scores: Record<string, number> = {};
      QUESTIONS.forEach((_, i) => { scores[`q${i + 1}`] = answers[`q${i + 1}`] ?? 0; });
      const res = await symptomApi.submit({ patient_id: patientId, scores });
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
            <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
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
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all">
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
    <DashboardLayout title="متابعة الأعراض">
      <div className="relative min-h-full" dir="rtl">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>
      <div className="max-w-2xl mx-auto py-2">
        {/* Tab switcher */}
        <div className="flex gap-2 bg-slate-50 border border-gray-100 rounded-2xl p-1.5 mb-6">
          {([["survey", "استبيان جديد", ClipboardList], ["history", "السجل والتحليل", BarChart2]] as const).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t
                  ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                  : "text-slate-400 hover:text-slate-700"
              }`}>
              <Icon size={14} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {/* History tab */}
        {tab === "history" && patientId && <HistoryTab patientId={patientId} />}

        {/* Survey tab */}
        {tab === "survey" && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">استبيان متابعة الأعراض</h2>
              <p className="text-slate-500 text-sm">يرجى الإجابة بصدق على كل سؤال بناءً على ما لاحظته خلال الشهر الماضي.</p>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{answered} / {QUESTIONS.length} سؤال</span>
                <span>المجموع: {total} / 24</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-gradient-to-l from-blue-600 to-cyan-500 transition-all"
                  style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {QUESTIONS.map((q, i) => {
                const key = `q${i + 1}`;
                const val = answers[key];
                return (
                  <div key={key} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md hover:shadow-cyan-100/30 transition-all">
                    <p className="text-slate-900 text-sm font-medium mb-4">
                      <span className="text-blue-600 ml-2 font-bold">{i + 1}.</span>
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
              className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting
                ? "جاري الحفظ..."
                : allAnswered
                ? "إرسال الاستبيان"
                : `أكمل الإجابة على ${QUESTIONS.length - answered} سؤال متبقٍ`}
            </button>
          </>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
