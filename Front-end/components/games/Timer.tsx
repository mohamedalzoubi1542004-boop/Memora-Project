"use client";
import { Clock } from "lucide-react";

interface Props {
  seconds: number;
  isCountdown?: boolean;
  total?: number;
  warningThreshold?: number;
}

function fmt(s: number) {
  const m = Math.floor(Math.abs(s) / 60);
  const sec = Math.abs(s) % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Timer({ seconds, isCountdown, total, warningThreshold = 10 }: Props) {
  const pct = isCountdown && total ? Math.max(0, seconds / total) : null;
  const isWarning = isCountdown && seconds <= warningThreshold && seconds > 0;
  const isDanger = isCountdown && seconds <= 5 && seconds > 0;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-base transition-colors duration-300 ${
        isDanger
          ? "bg-red-50 text-red-500 animate-pulse border border-red-200"
          : isWarning
          ? "bg-amber-50 text-amber-600 border border-amber-200"
          : "bg-gray-100 text-slate-600"
      }`}
    >
      {pct !== null && (
        <div className="relative w-6 h-6">
          <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
            <circle
              cx="12" cy="12" r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 10}`}
              strokeDashoffset={`${2 * Math.PI * 10 * (1 - pct)}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
        </div>
      )}
      {!pct && <Clock size={16} />}
      <span>{fmt(seconds)}</span>
    </div>
  );
}
