"use client";
import { BrainCircuit, Layers, BookOpen, Grid3X3, ListOrdered, Users, ArrowRight, Gamepad2, Brain } from "lucide-react";
import GameCard from "@/components/games/GameCard";
import { motion } from "framer-motion";
import Link from "next/link";

const games = [
  {
    gameType: "sequence" as const,
    href: "/games/sequence-recall",
    name: "تذكّر التسلسل",
    domain: "الذاكرة العاملة",
    description: "تذكّر سلسلة أرقام تظهر واحداً تلو الآخر ثم أعد ترتيبها بالتسلسل الصحيح.",
    icon: Layers,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    btnColor: "bg-cyan-600 shadow-cyan-500/30",
  },
  {
    gameType: "cards" as const,
    href: "/games/memory-cards",
    name: "أزواج الصور",
    domain: "الذاكرة البصرية",
    description: "اقلب البطاقات واعثر على الأزواج المتطابقة باستخدام ذاكرتك البصرية.",
    icon: Grid3X3,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    btnColor: "bg-purple-600 shadow-purple-500/30",
  },
  {
    gameType: "words" as const,
    href: "/games/word-association",
    name: "كلمات مترابطة",
    domain: "الذاكرة الدلالية",
    description: "اختر الكلمة الأقرب معنىً للكلمة المعروضة في أقل وقت ممكن.",
    icon: BookOpen,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    btnColor: "bg-emerald-600 shadow-emerald-500/30",
  },
  {
    gameType: "pattern" as const,
    href: "/games/pattern-completion",
    name: "إكمال الأنماط",
    domain: "التفكير المنطقي",
    description: "اكتشف القاعدة في تسلسل الأشكال واختر الشكل الصحيح التالي.",
    icon: BrainCircuit,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    btnColor: "bg-amber-600 shadow-amber-500/30",
  },
  {
    gameType: "tasks" as const,
    href: "/games/task-ordering",
    name: "ترتيب الخطوات",
    domain: "الوظائف التنفيذية",
    description: "رتّب خطوات المهام اليومية بالترتيب الصحيح من البداية إلى النهاية.",
    icon: ListOrdered,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    btnColor: "bg-rose-600 shadow-rose-500/30",
  },
  {
    gameType: "faces" as const,
    href: "/games/face-name",
    name: "وجوه وأسماء",
    domain: "الذاكرة الترابطية",
    description: "احفظ أسماء الوجوه ثم طابق كل وجه مع اسمه الصحيح — أول ما يُفقد في الزهايمر.",
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    btnColor: "bg-blue-600 shadow-blue-500/30",
  },
];

export default function GamesHub() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-[70px] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium"
          >
            <ArrowRight size={16} /> الرئيسية
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Gamepad2 size={18} className="text-white" />
            </div>
            <span className="font-black text-slate-900 text-lg">تمارين الذاكرة</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          {/* Section icon */}
          <div className="flex justify-center mb-5">
            <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100">
              <Brain size={36} className="text-blue-600" strokeWidth={1.75} />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 leading-tight">
            تمارين تقوية الذاكرة
          </h1>
          <div className="h-[3px] w-20 bg-cyan-500 rounded-full mx-auto mb-4" />
          <p className="text-slate-500 max-w-xl mx-auto text-base leading-relaxed">
            ألعاب تفاعلية تُنشّط 6 مناطق مختلفة من القدرات الذهنية. نتائجك تُحفظ ويتابعها طبيبك.
          </p>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm mt-5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
            </span>
            <span className="text-sm font-bold text-slate-700">6 ألعاب معتمدة سريرياً</span>
          </div>
        </motion.div>

        {/* Games grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {games.map((game, i) => (
            <GameCard key={game.gameType} {...game} index={i} />
          ))}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-gray-100 rounded-[2rem] p-6 text-center shadow-sm"
        >
          <p className="text-slate-500 text-sm leading-relaxed">
            🧠 كل لعبة مصممة لاستهداف نطاق إدراكي مختلف يتأثر بمرض الزهايمر.
            العب يومياً لمدة{" "}
            <span className="text-slate-900 font-bold">10-15 دقيقة</span>{" "}
            للحصول على أفضل النتائج.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
