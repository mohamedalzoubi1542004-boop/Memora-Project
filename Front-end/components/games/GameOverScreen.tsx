"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, LayoutGrid, Star, TrendingUp, Target, Zap, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { GameSessionResult } from "@/hooks/useGameSession";

interface Props {
  result: GameSessionResult;
  gameName: string;
  domainNote: string;
  onReplay: () => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}د ${sec}ث` : `${sec} ثانية`;
}

function calcStars(level: number, accuracy: number): number {
  if (accuracy >= 0.9 && level >= 5) return 5;
  if (accuracy >= 0.75 && level >= 3) return 4;
  if (accuracy >= 0.6) return 3;
  if (accuracy >= 0.4) return 2;
  return 1;
}

export default function GameOverScreen({ result, gameName, domainNote, onReplay }: Props) {
  const router = useRouter();
  const [displayScore, setDisplayScore] = useState(0);
  const stars = calcStars(result.level, result.accuracy);
  const pct = Math.round(result.accuracy * 100);

  useEffect(() => {
    const end = result.score;
    const duration = 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplayScore(Math.round(end * t * t * (3 - 2 * t))); // ease
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [result.score]);

  return (
    /* Light overlay matching landing page feel */
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="bg-white border border-gray-100 rounded-[2rem] shadow-2xl p-8 w-full max-w-md text-center"
      >
        {/* Stars */}
        <div className="flex justify-center gap-1.5 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.25 + i * 0.09, type: "spring", stiffness: 320 }}
            >
              <Star
                size={30}
                className={i < stars ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-100"}
              />
            </motion.div>
          ))}
        </div>

        {/* Score */}
        <p className="text-slate-400 text-sm mb-1">النتيجة النهائية</p>
        <motion.p
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-6xl font-black text-blue-600 tabular-nums mb-1"
        >
          {displayScore.toLocaleString("ar-EG")}
        </motion.p>
        <p className="text-slate-500 font-bold mb-6">{gameName}</p>

        {/* Stats grid — same card style as landing page */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { icon: TrendingUp, label: "المستوى",  value: String(result.level),      color: "text-blue-600",    bg: "bg-blue-50"    },
            { icon: Target,     label: "الدقة",    value: `${pct}%`,                 color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: Zap,        label: "سلسلة",    value: `${result.streak}🔥`,       color: "text-amber-600",   bg: "bg-amber-50"   },
            { icon: Clock,      label: "الوقت",    value: formatTime(result.timeSeconds), color: "text-slate-600", bg: "bg-slate-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-3`}>
              <Icon size={16} className={`${color} mx-auto mb-1`} />
              <p className={`text-sm font-black ${color} leading-none mb-0.5`}>{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Domain note */}
        <div className="bg-cyan-50 border border-cyan-100 rounded-2xl px-4 py-3 mb-6 text-right">
          <p className="text-xs text-cyan-700 font-bold mb-0.5">هذه اللعبة تنمّي</p>
          <p className="text-slate-600 text-sm">{domainNote}</p>
        </div>

        {/* Actions — same button style as landing page */}
        <div className="flex gap-3">
          <button
            onClick={onReplay}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 transition-all duration-200 active:scale-95 text-base"
          >
            <RotateCcw size={18} /> العب مجدداً
          </button>
          <button
            onClick={() => router.push("/games")}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-gray-200 hover:border-blue-600 hover:text-blue-600 text-slate-600 font-bold rounded-full transition-all duration-200"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
