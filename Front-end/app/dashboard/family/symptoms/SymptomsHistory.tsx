"use client";

import { useState, useEffect } from "react";
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
  RadarChart as ReRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { symptomApi } from "@/lib/api";

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

/* ─── History tab (lazy-loaded — keeps recharts out of the page's initial bundle) ─── */
export default function SymptomsHistory({ patientId }: { patientId: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
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
