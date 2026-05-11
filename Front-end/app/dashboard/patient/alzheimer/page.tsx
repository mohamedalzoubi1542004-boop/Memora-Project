"use client";

import { motion } from "framer-motion";
import { BookOpen, AlertCircle, CheckCircle2, HelpCircle, Stethoscope, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const SECTIONS = [
  {
    Icon: HelpCircle,
    title: "ما هو مرض الزهايمر؟",
    color: "from-blue-600 to-cyan-500",
    shadow: "shadow-blue-500/30",
    content: "مرض الزهايمر هو أكثر أشكال الخرف شيوعاً، يُؤثر على الذاكرة والتفكير والسلوك. يحدث عندما تتراكم بروتينات غير طبيعية في الدماغ (اللويحات والتشابكات) مما يُتلف خلايا الدماغ ويقطع الاتصالات بينها. يتقدم المرض ببطء ويزداد سوءاً مع الوقت.",
  },
  {
    Icon: AlertCircle,
    title: "الأعراض المبكرة",
    color: "from-amber-500 to-orange-400",
    shadow: "shadow-amber-500/30",
    items: [
      "نسيان المعلومات الحديثة بشكل متكرر",
      "صعوبة في التخطيط وحل المشكلات",
      "الارتباك بشأن التواريخ والأماكن",
      "صعوبة إيجاد الكلمات المناسبة",
      "تغيرات في المزاج والشخصية",
      "الانسحاب من الأنشطة الاجتماعية",
    ],
  },
  {
    Icon: TrendingUp,
    title: "مراحل المرض",
    color: "from-violet-600 to-purple-500",
    shadow: "shadow-violet-500/30",
    stages: [
      { name: "المرحلة المبكرة", desc: "نسيان بسيط، صعوبة في التذكر الفوري، لكن المريض مستقل في حياته اليومية" },
      { name: "المرحلة المتوسطة", desc: "صعوبة متزايدة في التعرف على الأشخاص، الارتباك بالوقت والمكان، يحتاج مساعدة" },
      { name: "المرحلة المتقدمة", desc: "فقدان كبير في القدرات، يعتمد اعتماداً كاملاً على مقدمي الرعاية" },
    ],
  },
  {
    Icon: CheckCircle2,
    title: "عوامل الوقاية",
    color: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/30",
    items: [
      "ممارسة النشاط البدني بانتظام",
      "الحفاظ على صحة القلب والأوعية الدموية",
      "تناول غذاء صحي متوازن (نظام البحر المتوسط)",
      "النوم الكافي وإدارة التوتر",
      "التعلم المستمر وتحفيز العقل",
      "الحفاظ على العلاقات الاجتماعية",
    ],
  },
  {
    Icon: Stethoscope,
    title: "التشخيص والعلاج",
    color: "from-rose-500 to-pink-500",
    shadow: "shadow-rose-500/30",
    content: "لا يوجد حالياً علاج شافٍ للزهايمر، لكن الكشف المبكر يُساعد على إبطاء تقدم المرض وتحسين جودة الحياة. يشمل التشخيص اختبارات الذاكرة (كـ MMSE)، صور الدماغ، وتحاليل الدم. العلاجات المتاحة تُساعد في إدارة الأعراض وتحسين الوظائف اليومية.",
  },
];

export default function AlzheimerPage() {
  const { user, loading } = useRequireAuth(["patient"]);

  if (loading || !user) return null;

  return (
    <DashboardLayout title="اقرأ عن الزهايمر">
      <div className="relative min-h-full" dir="rtl">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-6 py-2">
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-blue-700 to-cyan-500 shadow-xl shadow-blue-600/25 p-6">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen size={28} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">اقرأ عن الزهايمر</h2>
                <p className="text-blue-100 mt-1 text-sm">معلومات شاملة عن المرض وكيفية التعامل معه</p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
            {SECTIONS.map((sec, i) => (
              <motion.div key={sec.title} {...fadeUp(0.1 + i * 0.07)} className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${sec.color} shadow-md ${sec.shadow}`}>
                    <sec.Icon size={18} className="text-white" strokeWidth={2} />
                  </div>
                  <h3 className="font-extrabold text-slate-900">{sec.title}</h3>
                </div>

                {"content" in sec && (
                  <p className="text-sm text-slate-600 leading-relaxed">{sec.content}</p>
                )}

                {"items" in sec && (
                  <ul className="space-y-2.5">
                    {(sec.items as string[]).map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {"stages" in sec && (
                  <div className="space-y-3">
                    {(sec.stages as { name: string; desc: string }[]).map((stage, j) => (
                      <div key={j} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          {j + 1}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{stage.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{stage.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
