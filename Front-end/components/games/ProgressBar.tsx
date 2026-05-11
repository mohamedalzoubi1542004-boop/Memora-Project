"use client";
import { motion } from "framer-motion";

interface Props {
  current: number;
  total: number;
  label?: string;
  color?: "cyan" | "amber" | "green" | "purple" | "blue";
}

const colors = {
  cyan:   "from-cyan-500 to-teal-400",
  amber:  "from-amber-500 to-yellow-400",
  green:  "from-emerald-500 to-green-400",
  purple: "from-purple-500 to-violet-400",
  blue:   "from-blue-600 to-blue-400",
};

export default function ProgressBar({ current, total, label, color = "blue" }: Props) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{label}</span>
          <span>{current} / {total}</span>
        </div>
      )}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${colors[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
