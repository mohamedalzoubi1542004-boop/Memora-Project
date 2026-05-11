"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  streak: number;
}

export default function StreakIndicator({ streak }: Props) {
  if (streak === 0) return null;

  const size = streak >= 10 ? "text-2xl" : streak >= 5 ? "text-xl" : "text-lg";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={streak}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200"
      >
        <motion.span
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
          className={size}
        >
          🔥
        </motion.span>
        <span className="font-black text-amber-600 tabular-nums">{streak}</span>
      </motion.div>
    </AnimatePresence>
  );
}
