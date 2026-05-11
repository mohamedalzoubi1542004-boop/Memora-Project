"use client";

import { motion } from "framer-motion";
import { Lightbulb, Brain, Heart, Moon, Apple, Dumbbell, Users, BookOpen } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const TIPS = [
  {
    Icon: Brain,
    title: "تمارين الذاكرة",
    color: "from-blue-600 to-cyan-500",
    shadow: "shadow-blue-500/30",
    items: [
      "مارس ألعاب الذاكرة والكلمات المتقاطعة يومياً",
      "تعلم مهارة أو هواية جديدة بانتظام",
      "اقرأ كتاباً يومياً ولو لـ 15 دقيقة",
      "جرّب حفظ أرقام الهاتف وقوائم التسوق",
    ],
  },
  {
    Icon: Apple,
    title: "التغذية الصحية",
    color: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/30",
    items: [
      "تناول الأسماك الدهنية (سلمون، تونة) مرتين أسبوعياً",
      "أكثر من الخضروات الورقية الداكنة كالسبانخ",
      "تناول التوت الأزرق والمكسرات كوجبة خفيفة",
      "قلّل من السكريات والأطعمة المصنّعة",
    ],
  },
  {
    Icon: Dumbbell,
    title: "النشاط البدني",
    color: "from-violet-600 to-purple-500",
    shadow: "shadow-violet-500/30",
    items: [
      "امشِ 30 دقيقة يومياً على الأقل",
      "مارس رياضة السباحة أو اليوغا لتقليل الضغط",
      "تجنب الجلوس لفترات طويلة دون حركة",
      "استخدم الدرج بدلاً من المصعد",
    ],
  },
  {
    Icon: Moon,
    title: "النوم الجيد",
    color: "from-indigo-600 to-blue-500",
    shadow: "shadow-indigo-500/30",
    items: [
      "احرص على 7-8 ساعات نوم كل ليلة",
      "حافظ على وقت ثابت للنوم والاستيقاظ",
      "تجنب الشاشات قبل النوم بساعة",
      "اجعل غرفة نومك هادئة ومظلمة",
    ],
  },
  {
    Icon: Heart,
    title: "الصحة النفسية",
    color: "from-rose-500 to-pink-500",
    shadow: "shadow-rose-500/30",
    items: [
      "مارس التأمل أو التنفس العميق 10 دقائق يومياً",
      "تحدث مع أصدقائك وعائلتك بانتظام",
      "اكتب مذكراتك اليومية لتنظيم أفكارك",
      "تجنب الضغط النفسي المستمر وخذ استراحات",
    ],
  },
  {
    Icon: Users,
    title: "التواصل الاجتماعي",
    color: "from-amber-500 to-orange-400",
    shadow: "shadow-amber-500/30",
    items: [
      "التقِ بأصدقائك ومعارفك مرة أسبوعياً على الأقل",
      "انضم إلى نادٍ أو مجموعة اهتمام مشترك",
      "تطوع في أعمال خيرية ومجتمعية",
      "حافظ على التواصل مع أفراد العائلة",
    ],
  },
];

export default function TipsPage() {
  const { user, loading } = useRequireAuth(["patient"]);

  if (loading || !user) return null;

  return (
    <DashboardLayout title="نصائح الذاكرة">
      <div className="relative min-h-full" dir="rtl">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-amber-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-yellow-200/15 blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-6 py-2">
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-amber-500 to-yellow-400 shadow-xl shadow-amber-500/25 p-6">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Lightbulb size={28} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">نصائح الذاكرة</h2>
                <p className="text-amber-100 mt-1 text-sm">عادات يومية تحمي ذاكرتك وتعزز صحتك الإدراكية</p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
            {TIPS.map((tip, i) => (
              <motion.div key={tip.title} {...fadeUp(0.1 + i * 0.07)} className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${tip.color} shadow-md ${tip.shadow}`}>
                    <tip.Icon size={18} className="text-white" strokeWidth={2} />
                  </div>
                  <h3 className="font-extrabold text-slate-900">{tip.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {tip.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
