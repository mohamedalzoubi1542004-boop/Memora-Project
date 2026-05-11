"use client";
import { Pause, Play, X, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import StreakIndicator from "./StreakIndicator";
import Timer from "./Timer";

interface Props {
  gameName: string;
  domain: string;
  score: number;
  level: number;
  time: number;
  streak: number;
  isPaused: boolean;
  onPause: () => void;
}

export default function GameHeader({ gameName, domain, score, level, time, streak, isPaused, onPause }: Props) {
  const router = useRouter();
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16 gap-3">
        {/* Left: game info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/games")}
            className="p-2 rounded-xl bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-all shrink-0"
            title="العودة للألعاب"
          >
            <X size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-none truncate">{gameName}</p>
            <p className="text-xs text-cyan-600 mt-0.5 truncate font-medium">{domain}</p>
          </div>
        </div>

        {/* Center: score + level + streak */}
        <div className="flex items-center gap-4 flex-1 justify-center">
          <div className="text-center">
            <p className="text-xs text-slate-400 leading-none">المستوى</p>
            <p className="text-lg font-black text-slate-800">{level}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 leading-none">النقاط</p>
            <p className="text-lg font-black text-blue-600 tabular-nums">{score.toLocaleString("ar-EG")}</p>
          </div>
          <StreakIndicator streak={streak} />
        </div>

        {/* Right: timer + pause */}
        <div className="flex items-center gap-2 shrink-0">
          <Timer seconds={time} />
          <button
            onClick={onPause}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-all"
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </div>
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <Pause size={40} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">متوقف مؤقتاً</h2>
            <p className="text-slate-400 mb-8">اللعبة متوقفة مؤقتاً</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onPause}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 transition-all"
              >
                <Play size={20} /> استمر
              </button>
              <button
                onClick={() => router.push("/games")}
                className="flex items-center gap-2 px-8 py-3 bg-white border border-gray-200 hover:border-blue-600 hover:text-blue-600 text-slate-600 font-bold rounded-full transition-all"
              >
                <Trophy size={20} /> الألعاب
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
