"use client";
import { motion } from "framer-motion";
import { Play, ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import DifficultySelector from "./DifficultySelector";
import type { Difficulty } from "@/services/gameApi";
import { useRouter } from "next/navigation";

interface Props {
  gameName: string;
  domain: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  instructions: string[];
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onStart: () => void;
}

export default function GameInstructions({
  gameName, domain, icon: Icon, iconBg, iconColor,
  instructions, difficulty, onDifficultyChange, onStart,
}: Props) {
  const router = useRouter();

  return (
    /* Full-page background matches landing page #F8FAFC */
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-8" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-8 w-full max-w-md"
      >
        {/* Back */}
        <button
          onClick={() => router.push("/games")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-600 mb-7 transition-colors"
        >
          <ArrowLeft size={15} /> العودة للألعاب
        </button>

        {/* Icon — same style as landing page section icons */}
        <div className={`w-20 h-20 rounded-3xl ${iconBg} flex items-center justify-center mx-auto mb-5 shadow-md`}>
          <Icon size={40} className={iconColor} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-slate-900 text-center mb-2">{gameName}</h1>
        <div className="h-[3px] w-16 bg-cyan-500 rounded-full mx-auto mb-2" />
        <p className="text-cyan-600 text-center text-sm font-bold mb-7">{domain}</p>

        {/* Instructions */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3 text-right">كيف تلعب</p>
          <ul className="space-y-3">
            {instructions.map((inst, i) => (
              <li key={i} className="flex items-start gap-3 flex-row-reverse">
                <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-slate-600 text-sm leading-relaxed text-right">{inst}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Difficulty */}
        <div className="mb-7">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3 text-center">مستوى الصعوبة</p>
          <DifficultySelector value={difficulty} onChange={onDifficultyChange} />
        </div>

        {/* Start — same blue button style as landing page */}
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-full shadow-lg shadow-blue-500/30 transition-all duration-200 active:scale-95"
        >
          <Play size={22} fill="white" /> ابدأ اللعبة
        </button>
      </motion.div>
    </div>
  );
}
