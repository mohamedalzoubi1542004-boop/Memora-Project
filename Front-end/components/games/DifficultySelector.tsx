"use client";
import type { Difficulty } from "@/services/gameApi";

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}

const options: { value: Difficulty; label: string; desc: string; active: string; inactive: string }[] = [
  {
    value: "easy",
    label: "سهل",
    desc: "للمبتدئين",
    active: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
    inactive: "bg-white border border-gray-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600",
  },
  {
    value: "medium",
    label: "متوسط",
    desc: "تحدٍّ معتدل",
    active: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
    inactive: "bg-white border border-gray-200 text-slate-600 hover:border-amber-300 hover:text-amber-600",
  },
  {
    value: "hard",
    label: "صعب",
    desc: "للمحترفين",
    active: "bg-rose-500 text-white shadow-lg shadow-rose-500/30",
    inactive: "bg-white border border-gray-200 text-slate-600 hover:border-rose-300 hover:text-rose-600",
  },
];

export default function DifficultySelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-3 justify-center">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex flex-col items-center gap-0.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 ${
            value === opt.value ? opt.active : opt.inactive
          }`}
        >
          <span>{opt.label}</span>
          <span className="text-xs font-normal opacity-75">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}
