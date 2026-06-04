"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { mmseApi } from "@/lib/api";
import { DOMAINS, severityInfo } from "./mmse-shared";

/* ── MMSE History Chart (lazy-loaded — keeps recharts out of the page bundle) ── */
export function MmseHistory({ patientId }: { patientId: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    mmseApi.history(patientId)
      .then((h: any) => setHistory((h as any[]).slice().reverse()))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [patientId]);

  if (fetching) return (
    <div className="py-10 text-center text-slate-400 text-sm">جاري التحميل...</div>
  );

  if (history.length === 0) return (
    <div className="py-10 text-center" dir="rtl">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" className="w-7 h-7">
          <path d="M9.5 2A2.5 2.5 0 017 4.5v1A2.5 2.5 0 014.5 8H4a2 2 0 000 4h.5A2.5 2.5 0 017 14.5v1A2.5 2.5 0 009.5 18h5a2.5 2.5 0 002.5-2.5v-1A2.5 2.5 0 0019.5 12H20a2 2 0 000-4h-.5A2.5 2.5 0 0017 5.5v-1A2.5 2.5 0 0014.5 2h-5z"/>
        </svg>
      </div>
      <p className="text-slate-500 text-sm font-medium">لا توجد نتائج سابقة بعد</p>
      <p className="text-slate-400 text-xs mt-1">أجرِ الاختبار أولاً لعرض التحليلات</p>
    </div>
  );

  const chartData = history.map((r: any) => ({
    date: new Date(r.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    score: r.total_score,
  }));

  const latest = history[history.length - 1];
  const sev = severityInfo(latest.total_score);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Latest score card */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`col-span-1 p-4 rounded-2xl border text-center ${sev.bgClass} border-opacity-50`}>
          <div className={`text-3xl font-bold ${sev.textClass}`}>{latest.total_score}</div>
          <div className="text-xs text-slate-400 mt-1">/ 30</div>
          <div className={`text-xs font-semibold mt-1 ${sev.textClass}`}>{sev.text}</div>
        </div>
        <div className="col-span-2 p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
          {DOMAINS.slice(0, 4).map(d => (
            <div key={d.key} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{d.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${((latest[d.key] ?? 0) / d.max) * 100}%` }} />
                </div>
                <span className="text-slate-700 font-semibold w-8 text-left">{latest[d.key] ?? 0}/{d.max}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend chart */}
      {history.length > 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">تطور النتيجة عبر الزمن</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis domain={[0, 30]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v: any) => [`${v}/30`, "النتيجة"]}
              />
              <ReferenceArea y1={24} y2={30} fill="#dcfce7" fillOpacity={0.4} />
              <ReferenceArea y1={18} y2={24} fill="#fef9c3" fillOpacity={0.4} />
              <ReferenceArea y1={0}  y2={18} fill="#fee2e2" fillOpacity={0.4} />
              <ReferenceLine y={24} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} />
              <ReferenceLine y={18} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
              <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2.5}
                dot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#06b6d4" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[["bg-green-100", "طبيعي (24+)"], ["bg-yellow-100", "خفيف (18-23)"], ["bg-red-100", "شديد (<18)"]].map(([cls, lbl]) => (
              <div key={lbl} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className={`w-3 h-3 rounded-sm ${cls}`} />
                {lbl}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-slate-500">سجل الاختبارات ({history.length})</span>
        </div>
        <div className="divide-y divide-gray-50">
          {history.slice().reverse().map((r: any, i: number) => {
            const s = severityInfo(r.total_score);
            return (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${s.textClass}`}>{r.total_score}/30</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.bgClass} ${s.textClass}`}>{s.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Result-screen domain radar (lazy-loaded with the rest of recharts) ── */
export function MmseRadar({ result, scores }: { result: any; scores: Record<string, number> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={DOMAINS.map(d => ({
        subject: d.label,
        pct: Math.round((((result?.[d.key]) ?? scores[d.key] ?? 0) / d.max) * 100),
      }))}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#94a3b8" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="pct" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
