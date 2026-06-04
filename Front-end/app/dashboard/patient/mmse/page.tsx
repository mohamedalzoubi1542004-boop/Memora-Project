"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { mmseApi, patientApi } from "@/lib/api";
import { DOMAINS, severityInfo } from "./mmse-shared";

// recharts is heavy — the charts load only when the result/history view needs them.
const MmseHistory = dynamic(() => import("./MmseCharts").then((m) => m.MmseHistory), {
  ssr: false,
  loading: () => <div className="py-10 text-center text-slate-400 text-sm">جاري التحميل...</div>,
});
const MmseRadar = dynamic(() => import("./MmseCharts").then((m) => m.MmseRadar), {
  ssr: false,
  loading: () => <div className="py-10 text-center text-slate-400 text-sm">جاري التحميل...</div>,
});

const REG_WORDS = ["تفاحة", "مفتاح", "كتاب"];
const SERIAL7   = [93, 86, 79, 72, 65];

type Scores = Record<string, number>;

function shuffled<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

function getDateInfo() {
  const n = new Date();
  const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const DAYS   = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const m = n.getMonth();
  const season = m <= 1 || m === 11 ? "الشتاء" : m <= 4 ? "الربيع" : m <= 7 ? "الصيف" : "الخريف";
  return { year: n.getFullYear(), month: MONTHS[m], day: DAYS[n.getDay()], date: n.getDate(), season, MONTHS, DAYS };
}

/* ── Step 1: Temporal Orientation ── */
function TemporalStep({ onDone }: { onDone: (n: number) => void }) {
  const info = useMemo(getDateInfo, []);
  const questions = useMemo(() => {
    const otherMonths = shuffled(info.MONTHS.filter(m => m !== info.month)).slice(0, 3);
    const otherDays   = shuffled(info.DAYS.filter(d => d !== info.day)).slice(0, 3);
    const otherDates  = shuffled(Array.from({ length: 28 }, (_, i) => i + 1).filter(d => d !== info.date)).slice(0, 3);
    return [
      { q: "ما هي السنة الحالية؟", ans: String(info.year),   opts: shuffled([info.year - 2, info.year - 1, info.year, info.year + 1].map(String)) },
      { q: "ما هو الموسم الحالي؟",  ans: info.season,         opts: shuffled(["الربيع","الصيف","الخريف","الشتاء"]) },
      { q: "ما هو الشهر الحالي؟",   ans: info.month,          opts: shuffled([...otherMonths, info.month]) },
      { q: "ما هو اليوم؟",           ans: info.day,            opts: shuffled([...otherDays, info.day]) },
      { q: "ما هو تاريخ اليوم؟",     ans: String(info.date),   opts: shuffled([...otherDates.map(String), String(info.date)]) },
    ];
  }, []);

  const [answers, setAnswers] = useState<(string | null)[]>(Array(5).fill(null));
  const [checked, setChecked] = useState(false);
  const score = questions.filter((q, i) => answers[i] === q.ans).length;

  return (
    <div className="space-y-5">
      <p className="text-slate-500 text-sm">اختر الإجابة الصحيحة لكل سؤال:</p>
      {questions.map((q, i) => (
        <div key={i}>
          <div className="text-sm font-semibold text-slate-700 mb-2">{i + 1}. {q.q}</div>
          <div className="grid grid-cols-2 gap-2">
            {q.opts.map(opt => {
              const sel     = answers[i] === opt;
              const correct = checked && opt === q.ans;
              const wrong   = checked && sel && opt !== q.ans;
              return (
                <button key={opt} disabled={checked}
                  onClick={() => { const a = [...answers]; a[i] = opt; setAnswers(a); }}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all
                    ${correct ? "bg-green-100 border-green-400 text-green-700"
                    : wrong   ? "bg-red-100 border-red-300 text-red-600"
                    : sel     ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-gray-200 hover:border-blue-300"}`}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {checked ? (
        <>
          <div className="text-center py-3 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-2xl font-bold text-blue-600">{score}</span>
            <span className="text-slate-400 text-sm"> / 5 إجابة صحيحة</span>
          </div>
          <button onClick={() => onDone(score)} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">التالي →</button>
        </>
      ) : (
        <button onClick={() => setChecked(true)} disabled={answers.some(a => a === null)}
          className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
          تحقق من الإجابات
        </button>
      )}
    </div>
  );
}

/* ── Step 2: Spatial Orientation ── */
function SpatialStep({ onDone }: { onDone: (n: number) => void }) {
  const QUESTIONS = [
    "هل تعرف في أي دولة أنت الآن؟",
    "هل تعرف في أي مدينة أنت الآن؟",
    "هل تعرف في أي حي أو منطقة أنت الآن؟",
    "هل تعرف اسم المبنى أو المرفق الذي أنت فيه؟",
    "هل تعرف في أي طابق أو غرفة أنت الآن؟",
  ];
  const [answers, setAnswers] = useState<(boolean | null)[]>(Array(5).fill(null));
  const score = answers.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm">أجب بصدق عن كل سؤال:</p>
      {QUESTIONS.map((q, i) => (
        <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
          <div className="text-sm font-medium text-slate-700 mb-3">{i + 1}. {q}</div>
          <div className="flex gap-3">
            {([true, false] as const).map(val => (
              <button key={String(val)} onClick={() => { const a = [...answers]; a[i] = val; setAnswers(a); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all
                  ${answers[i] === val
                    ? val ? "bg-green-500 text-white border-green-500" : "bg-red-400 text-white border-red-400"
                    : "bg-white text-slate-500 border-gray-200 hover:border-blue-300"}`}>
                {val ? "نعم ✓" : "لا ✗"}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => onDone(score)} disabled={answers.some(a => a === null)}
        className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
        التالي ({score}/5) →
      </button>
    </div>
  );
}

/* ── Step 3: Registration ── */
function RegistrationStep({ onDone }: { onDone: (n: number) => void }) {
  const [phase, setPhase] = useState<"show" | "recall">("show");
  const [checked, setChecked] = useState<boolean[]>(Array(3).fill(false));
  const score = checked.filter(Boolean).length;

  if (phase === "show") return (
    <div className="text-center">
      <p className="text-slate-500 text-sm mb-6">اقرأ هذه الكلمات الثلاث بعناية — ستُطلب منك لاحقاً:</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {REG_WORDS.map(w => (
          <div key={w} className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 text-center">
            <div className="text-2xl font-bold text-blue-700">{w}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setPhase("recall")} className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
        جاهز — اختبر نفسي
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm">اضغط على الكلمات التي تتذكرها:</p>
      {REG_WORDS.map((w, i) => (
        <button key={w} onClick={() => { const c = [...checked]; c[i] = !c[i]; setChecked(c); }}
          className={`w-full p-4 rounded-xl border font-semibold transition-all text-right
            ${checked[i] ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-gray-200 hover:border-blue-300"}`}>
          {checked[i] ? `✓ ${w}` : w}
        </button>
      ))}
      <p className="text-xs text-slate-400 text-center">ملاحظة: ستُسأل عن هذه الكلمات مرة أخرى لاحقاً</p>
      <button onClick={() => onDone(score)}
        className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
        التالي ({score}/3) →
      </button>
    </div>
  );
}

/* ── Step 4: Attention & Calculation ── */
function AttentionStep({ onDone }: { onDone: (n: number) => void }) {
  const [inputs, setInputs]   = useState<string[]>(Array(5).fill(""));
  const [checked, setChecked] = useState(false);
  const results = inputs.map((v, i) => parseInt(v) === SERIAL7[i]);
  const score   = results.filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
        <p className="text-slate-700 font-medium">ابدأ من <span className="text-2xl font-bold text-amber-600">100</span> واطرح 7 بشكل متكرر</p>
        <p className="text-slate-400 text-xs mt-1">أدخل كل نتيجة في الخانة المقابلة</p>
      </div>
      {SERIAL7.map((ans, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-slate-400 text-sm w-4">{i + 1}.</span>
          <span className="text-sm text-slate-500 w-20">{i === 0 ? "100 − 7 =" : "... − 7 ="}</span>
          <input type="number" value={inputs[i]} disabled={checked} placeholder="؟"
            onChange={e => { const v = [...inputs]; v[i] = e.target.value; setInputs(v); }}
            className={`w-24 py-2 px-3 rounded-xl border text-center font-bold text-lg outline-none transition-all
              ${checked
                ? results[i] ? "border-green-400 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-600"
                : "border-gray-200 focus:border-blue-400"}`} />
          {checked && (
            <span className={`text-sm font-medium ${results[i] ? "text-green-600" : "text-red-500"}`}>
              {results[i] ? "✓" : `الصحيح: ${ans}`}
            </span>
          )}
        </div>
      ))}
      {checked ? (
        <>
          <div className="text-center py-3 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-2xl font-bold text-blue-600">{score}</span>
            <span className="text-slate-400 text-sm"> / 5 إجابة صحيحة</span>
          </div>
          <button onClick={() => onDone(score)} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">التالي →</button>
        </>
      ) : (
        <button onClick={() => setChecked(true)} disabled={inputs.some(v => v === "")}
          className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
          تحقق من الإجابات
        </button>
      )}
    </div>
  );
}

/* ── Step 5: Recall ── */
function RecallStep({ onDone }: { onDone: (n: number) => void }) {
  const [inputs, setInputs]   = useState<string[]>(Array(3).fill(""));
  const [checked, setChecked] = useState(false);
  const results = inputs.map((v, i) => v.trim() === REG_WORDS[i]);
  const score   = results.filter(Boolean).length;

  return (
    <div className="space-y-5">
      <p className="text-slate-500 text-sm">اكتب الكلمات الثلاث التي حفظتها في البداية:</p>
      {REG_WORDS.map((word, i) => (
        <div key={i}>
          <div className="text-xs text-slate-400 mb-1">الكلمة {i + 1}:</div>
          <input value={inputs[i]} disabled={checked} placeholder={`الكلمة ${i + 1}...`}
            onChange={e => { const v = [...inputs]; v[i] = e.target.value; setInputs(v); }}
            className={`w-full py-3 px-4 rounded-xl border text-right font-medium outline-none transition-all
              ${checked
                ? results[i] ? "border-green-400 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-600"
                : "border-gray-200 focus:border-blue-400"}`} />
          {checked && !results[i] && <div className="text-xs text-green-600 mt-1">الإجابة الصحيحة: {word}</div>}
        </div>
      ))}
      {checked ? (
        <>
          <div className="text-center py-3 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-2xl font-bold text-blue-600">{score}</span>
            <span className="text-slate-400 text-sm"> / 3 كلمات صحيحة</span>
          </div>
          <button onClick={() => onDone(score)} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">التالي →</button>
        </>
      ) : (
        <button onClick={() => setChecked(true)} disabled={inputs.some(v => v.trim() === "")}
          className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
          تحقق من الإجابات
        </button>
      )}
    </div>
  );
}

/* ── Step 6: Naming ── */
function NamingStep({ onDone }: { onDone: (n: number) => void }) {
  const items = [
    { label: "قلم", node: <PenSvg /> },
    { label: "ساعة", node: <WatchSvg /> },
  ];
  const [answers, setAnswers] = useState<string[]>(["", ""]);
  const [checked, setChecked] = useState(false);
  const results = answers.map((a, i) => a.trim() === items[i].label);
  const score   = results.filter(Boolean).length;

  return (
    <div className="space-y-5">
      <p className="text-slate-500 text-sm">ما اسم كل شيء من هذين؟</p>
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
          <div className="flex justify-center mb-3">{item.node}</div>
          <input value={answers[i]} disabled={checked} placeholder="اكتب الاسم..."
            onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }}
            className={`w-full py-2 px-3 rounded-xl border text-center font-medium outline-none transition-all
              ${checked
                ? results[i] ? "border-green-400 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-600"
                : "border-gray-200 focus:border-blue-400"}`} />
          {checked && !results[i] && <div className="text-xs text-green-600 mt-1 text-center">الإجابة: {item.label}</div>}
        </div>
      ))}
      {checked ? (
        <>
          <div className="text-center py-3 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-2xl font-bold text-blue-600">{score}</span><span className="text-slate-400 text-sm"> / 2</span>
          </div>
          <button onClick={() => onDone(score)} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">التالي →</button>
        </>
      ) : (
        <button onClick={() => setChecked(true)} disabled={answers.some(a => a.trim() === "")}
          className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">تحقق</button>
      )}
    </div>
  );
}

function PenSvg() {
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20">
      <rect x="35" y="10" width="10" height="52" rx="3" fill="#6366f1" />
      <polygon points="35,62 45,62 40,74" fill="#4f46e5" />
      <rect x="33" y="8" width="14" height="8" rx="2" fill="#a5b4fc" />
    </svg>
  );
}

function WatchSvg() {
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-20">
      <circle cx="40" cy="40" r="22" fill="white" stroke="#6366f1" strokeWidth="3" />
      <circle cx="40" cy="40" r="18" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <line x1="40" y1="40" x2="40" y2="26" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="40" x2="50" y2="40" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <rect x="34" y="12" width="12" height="8" rx="2" fill="#6366f1" />
      <rect x="34" y="60" width="12" height="8" rx="2" fill="#6366f1" />
    </svg>
  );
}

/* ── Step 7: Repetition ── */
function RepetitionStep({ onDone }: { onDone: (n: number) => void }) {
  const [selected, setSelected] = useState<boolean | null>(null);
  return (
    <div className="space-y-6 text-center">
      <div className="p-6 rounded-2xl bg-purple-50 border border-purple-100">
        <p className="text-slate-500 text-sm mb-3">كرر هذه العبارة بصوت عالٍ:</p>
        <p className="text-2xl font-bold text-purple-700">"لا إذا ولا لكن"</p>
      </div>
      <p className="text-slate-600 font-medium">هل استطعت تكرارها بشكل صحيح؟</p>
      <div className="flex gap-4">
        {([true, false] as const).map(val => (
          <button key={String(val)} onClick={() => setSelected(val)}
            className={`flex-1 py-3 rounded-xl font-bold border transition-all
              ${selected === val
                ? val ? "bg-green-500 text-white border-green-500" : "bg-red-400 text-white border-red-400"
                : "bg-white text-slate-500 border-gray-200 hover:border-blue-300"}`}>
            {val ? "نعم ✓" : "لا ✗"}
          </button>
        ))}
      </div>
      <button onClick={() => onDone(selected ? 1 : 0)} disabled={selected === null}
        className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
        التالي →
      </button>
    </div>
  );
}

/* ── Step 8: Three-Stage Command ── */
function ThreeStageStep({ onDone }: { onDone: (n: number) => void }) {
  const steps = ["خذ قطعة الورق بيدك", "اطوها من المنتصف", "ضعها على الطاولة أو الأرض"];
  const [done, setDone]       = useState<boolean[]>(Array(3).fill(false));
  const [confirmed, setConfirmed] = useState(false);
  const score = done.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
        <p className="text-slate-700 font-medium">اتبع هذه التعليمات الثلاث بالترتيب:</p>
        <p className="text-slate-400 text-sm mt-1">خذ قطعة ورق وافعل ما يلي خطوة بخطوة</p>
      </div>
      {steps.map((s, i) => (
        <div key={i} className={`p-4 rounded-xl border transition-all ${done[i] ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
              ${done[i] ? "bg-green-500 text-white" : "bg-gray-100 text-slate-500"}`}>{i + 1}</div>
            <div className="flex-1 text-sm text-slate-700 font-medium">{s}</div>
            {!confirmed && (
              <button onClick={() => { const d = [...done]; d[i] = !d[i]; setDone(d); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all
                  ${done[i] ? "bg-green-500 text-white" : "bg-gray-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600"}`}>
                {done[i] ? "✓ تم" : "تم؟"}
              </button>
            )}
          </div>
        </div>
      ))}
      {!confirmed ? (
        <button onClick={() => setConfirmed(true)}
          className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
          تأكيد ({score}/3)
        </button>
      ) : (
        <button onClick={() => onDone(score)} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
          التالي →
        </button>
      )}
    </div>
  );
}

/* ── Step 9: Reading ── */
function ReadingStep({ onDone }: { onDone: (n: number) => void }) {
  const [acted, setActed] = useState<boolean | null>(null);
  return (
    <div className="space-y-6 text-center">
      <p className="text-slate-500 text-sm">اقرأ الجملة التالية وافعل ما تقوله:</p>
      <div className="p-10 rounded-2xl bg-slate-50 border-2 border-slate-200">
        <p className="text-4xl font-bold text-slate-900">أغمض عينيك</p>
      </div>
      <p className="text-slate-600 font-medium">هل أغمضت عينيك بعد قراءة الجملة؟</p>
      <div className="flex gap-4">
        {([true, false] as const).map(val => (
          <button key={String(val)} onClick={() => setActed(val)}
            className={`flex-1 py-3 rounded-xl font-bold border transition-all
              ${acted === val
                ? val ? "bg-green-500 text-white border-green-500" : "bg-red-400 text-white border-red-400"
                : "bg-white text-slate-500 border-gray-200 hover:border-blue-300"}`}>
            {val ? "نعم ✓" : "لا ✗"}
          </button>
        ))}
      </div>
      <button onClick={() => onDone(acted ? 1 : 0)} disabled={acted === null}
        className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
        التالي →
      </button>
    </div>
  );
}

/* ── Step 10: Writing ── */
function WritingStep({ onDone }: { onDone: (n: number) => void }) {
  const [text, setText]       = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore]     = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <p className="text-slate-500 text-sm">اكتب جملة مفيدة من تلقاء نفسك (موضوع + خبر):</p>
      <textarea value={text} disabled={confirmed} rows={4} placeholder="اكتب جملتك هنا..."
        onChange={e => setText(e.target.value)}
        className="w-full p-4 rounded-xl border border-gray-200 focus:border-blue-400 outline-none text-right text-slate-900 font-medium resize-none" />
      {!confirmed ? (
        <button onClick={() => setConfirmed(true)} disabled={!text.trim()}
          className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all">
          تأكيد الجملة
        </button>
      ) : score === null ? (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
            <p className="text-xs text-slate-400 mb-1">جملتك:</p>
            <p className="font-medium text-slate-900">{text}</p>
          </div>
          <p className="text-sm text-slate-600 font-medium text-center">هل تحتوي جملتك على موضوع وفعل ومعنى واضح؟</p>
          <div className="flex gap-3">
            <button onClick={() => setScore(1)} className="flex-1 py-2 rounded-xl font-bold bg-green-500 text-white">نعم ✓</button>
            <button onClick={() => setScore(0)} className="flex-1 py-2 rounded-xl font-bold bg-red-400 text-white">لا ✗</button>
          </div>
        </div>
      ) : (
        <button onClick={() => onDone(score)} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
          التالي →
        </button>
      )}
    </div>
  );
}

/* ── Step 11: Copying (Canvas) ── */
function CopyingStep({ onDone }: { onDone: (n: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  }

  function startDraw(e: any) {
    e.preventDefault();
    setDrawing(true); setHasDrawn(true);
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: any) {
    e.preventDefault();
    if (!drawing) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round";
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  }

  function clearCanvas() {
    canvasRef.current!.getContext("2d")!.clearRect(0, 0, 400, 200);
    setHasDrawn(false); setScore(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-500 text-sm text-center">انسخ الشكل التالي بدقة في المساحة أدناه:</p>
      <div className="flex justify-center">
        <svg viewBox="0 0 130 90" className="w-44 h-32 border border-gray-200 rounded-xl bg-gray-50 p-3">
          <polygon points="20,15 55,15 65,38 45,58 10,55" fill="none" stroke="#6366f1" strokeWidth="2.5" />
          <polygon points="55,15 90,12 105,35 85,58 45,58" fill="none" stroke="#6366f1" strokeWidth="2.5" />
        </svg>
      </div>
      <canvas ref={canvasRef} width={400} height={200}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-white cursor-crosshair touch-none"
        style={{ touchAction: "none" }} />
      <button onClick={clearCanvas} className="w-full py-2 rounded-xl text-sm font-medium border border-gray-200 text-slate-500 hover:border-red-200 hover:text-red-500 transition-all">
        مسح اللوح
      </button>
      {score === null ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 text-center font-medium">هل نسخت مضلعَين متداخلَين ومغلقَين بشكل صحيح؟</p>
          <div className="flex gap-3">
            <button onClick={() => setScore(1)} disabled={!hasDrawn} className="flex-1 py-2 rounded-xl font-bold bg-green-500 text-white disabled:opacity-40">نعم ✓</button>
            <button onClick={() => setScore(0)} disabled={!hasDrawn} className="flex-1 py-2 rounded-xl font-bold bg-red-400 text-white disabled:opacity-40">لا ✗</button>
          </div>
        </div>
      ) : (
        <button onClick={() => onDone(score)} className="w-full py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-all">
          إرسال الاختبار ✓
        </button>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function MmsePage() {
  const { user, loading } = useRequireAuth(["patient"]);
  const [tab, setTab]               = useState<"test" | "history">("test");
  const [patientId, setPatientId]   = useState<number | null>(null);
  const [step, setStep]             = useState(0);
  const [scores, setScores]         = useState<Scores>({});
  const [result, setResult]         = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    patientApi.me().then((p: any) => setPatientId(p.id)).catch(() => {});
  }, []);

  if (loading || !user) return null;

  const totalSteps = DOMAINS.length;
  const totalScore = DOMAINS.reduce((sum, d) => sum + (scores[d.key] ?? 0), 0);

  function handleDomainDone(score: number) {
    const domain    = DOMAINS[step - 1];
    const newScores = { ...scores, [domain.key]: score };
    setScores(newScores);
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      doSubmit(newScores);
    }
  }

  async function doSubmit(finalScores: Scores) {
    setSubmitting(true); setError("");
    try {
      const patient: any = await patientApi.me();
      const payload: any = { patient_id: patient.id };
      DOMAINS.forEach(d => { payload[d.key] = finalScores[d.key] ?? 0; });
      const res = await mmseApi.submit(payload);
      setResult(res); setStep(totalSteps + 1);
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitting(false);
    }
  }

  /* Intro / History hub */
  if (step === 0) return (
    <DashboardLayout title="اختبار MMSE المعرفي">
      <div className="relative min-h-full" dir="rtl">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>
      <div className="max-w-xl mx-auto py-2">
        {/* Tabs */}
        <div className="flex gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-1.5 mb-6">
          {([["test", "إجراء الاختبار"], ["history", "السجل والتحليل"]] as const).map(([t, lbl]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t
                  ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {lbl}
            </button>
          ))}
        </div>

        {tab === "history" ? (
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6">
            {patientId ? <MmseHistory patientId={patientId} /> : (
              <div className="py-8 text-center text-slate-400 text-sm">جاري التحميل...</div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-600/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-10 h-10">
                <path d="M9.5 2A2.5 2.5 0 017 4.5v1A2.5 2.5 0 014.5 8H4a2 2 0 000 4h.5A2.5 2.5 0 017 14.5v1A2.5 2.5 0 009.5 18h5a2.5 2.5 0 002.5-2.5v-1A2.5 2.5 0 0019.5 12H20a2 2 0 000-4h-.5A2.5 2.5 0 0017 5.5v-1A2.5 2.5 0 0014.5 2h-5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">اختبار الحالة العقلية المصغّر</h2>
            <p className="text-slate-400 mb-2">Mini-Mental State Examination (MMSE)</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
              11 مجالاً تفاعلياً للقياس المعرفي. درجة 24+ طبيعية — 18–23 ضعف خفيف — أقل من 18 ضعف شديد.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[["11", "مجال تفاعلي"], ["30", "درجة كلية"], ["~15", "دقيقة"]].map(([v, l]) => (
                <div key={l} className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-blue-600">{v}</div>
                  <div className="text-xs text-slate-500 mt-1">{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)}
              className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all hover:scale-105">
              ابدأ الاختبار
            </button>
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );

  /* Result */
  if (step === totalSteps + 1 && result) {
    const sev = severityInfo(result.total_score);
    return (
      <DashboardLayout title="نتيجة MMSE">
        <div className="relative min-h-full" dir="rtl">
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
            <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
          </div>
          <div className="max-w-lg mx-auto text-center py-8">
            <div className={`w-32 h-32 rounded-full mx-auto mb-6 flex flex-col items-center justify-center border-4 ${sev.ringClass} ${sev.bgClass} shadow-xl`}>
              <div className={`text-4xl font-black ${sev.textClass}`}>{result.total_score}</div>
              <div className="text-xs text-slate-400">/ 30</div>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              نتيجة الاختبار: <span className={sev.textClass}>{sev.text}</span>
            </h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {sev.text === "طبيعي" ? "درجاتك ضمن النطاق الطبيعي. استمر في المتابعة الدورية."
              : sev.text === "خفيف" ? "يُنصح بمراجعة الطبيب لمتابعة دقيقة ومراقبة منتظمة."
              :                       "يرجى التواصل مع الطبيب المعالج في أقرب وقت ممكن."}
            </p>
            {/* Radar chart */}
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-5 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100 text-right">مخطط المجالات</h3>
              <MmseRadar result={result} scores={scores} />
            </div>

            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-5 mb-8 text-right space-y-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">تفصيل الدرجات</h3>
              {DOMAINS.map(d => (
                <div key={d.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-slate-600">{d.label}</span>
                  <span className="text-sm font-bold text-slate-900">
                    {result[d.key] ?? scores[d.key] ?? 0}/{d.max}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setStep(0); setScores({}); setResult(null); setTab("history"); }}
                className="px-6 py-3 rounded-2xl font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all text-sm">
                عرض السجل
              </button>
              <button onClick={() => { setStep(0); setScores({}); setResult(null); setTab("test"); }}
                className="px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all text-sm">
                إعادة الاختبار
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const domain = DOMAINS[step - 1];

  const STEP_MAP: Record<string, JSX.Element> = {
    temporal_orientation:  <TemporalStep    key={step} onDone={handleDomainDone} />,
    spatial_orientation:   <SpatialStep     key={step} onDone={handleDomainDone} />,
    registration:          <RegistrationStep key={step} onDone={handleDomainDone} />,
    attention_calculation: <AttentionStep   key={step} onDone={handleDomainDone} />,
    recall:                <RecallStep      key={step} onDone={handleDomainDone} />,
    naming:                <NamingStep      key={step} onDone={handleDomainDone} />,
    repetition:            <RepetitionStep  key={step} onDone={handleDomainDone} />,
    three_stage_command:   <ThreeStageStep  key={step} onDone={handleDomainDone} />,
    reading:               <ReadingStep     key={step} onDone={handleDomainDone} />,
    writing:               <WritingStep     key={step} onDone={handleDomainDone} />,
    copying:               <CopyingStep     key={step} onDone={handleDomainDone} />,
  };

  const DOMAIN_TITLES: Record<string, string> = {
    temporal_orientation:  "التوجه في الزمان",
    spatial_orientation:   "التوجه في المكان",
    registration:          "تسجيل المعلومات",
    attention_calculation: "الانتباه والحساب الذهني",
    recall:                "استرجاع المعلومات",
    naming:                "تسمية الأشياء",
    repetition:            "تكرار العبارات",
    three_stage_command:   "تنفيذ الأوامر",
    reading:               "فهم القراءة",
    writing:               "الكتابة التلقائية",
    copying:               "نسخ الأشكال",
  };

  return (
    <DashboardLayout title={`MMSE — ${domain?.label ?? ""}`}>
      <div className="relative min-h-full" dir="rtl">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
      </div>
      <div className="max-w-xl mx-auto py-4">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>المجال {step} من {totalSteps}</span>
            <span>المجموع: {totalScore} / 30</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-gradient-to-l from-blue-600 to-cyan-500 transition-all duration-500"
              style={{ width: `${((step - 1) / totalSteps) * 100}%` }} />
          </div>
          <div className="flex gap-1 mt-3 justify-center">
            {DOMAINS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300
                ${i + 1 < step ? "bg-blue-500 w-6" : i + 1 === step ? "bg-cyan-400 w-8" : "bg-gray-200 w-4"}`} />
            ))}
          </div>
        </div>

        {/* Domain header */}
        <div className="mb-5">
          <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">{domain?.label}</div>
          <h3 className="text-xl font-bold text-slate-900">{DOMAIN_TITLES[domain?.key ?? ""]}</h3>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 mb-4">
          {submitting ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">جاري حفظ النتائج...</p>
            </div>
          ) : STEP_MAP[domain?.key ?? ""] ?? null}
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
