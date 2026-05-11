"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function ScoreDisplay({ score, label = "النقاط", size = "md" }: Props) {
  const [display, setDisplay] = useState(score);
  const [delta, setDelta] = useState<number | null>(null);
  const prevRef = useRef(score);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (score === prevRef.current) return;
    const diff = score - prevRef.current;
    setDelta(diff);
    setTimeout(() => setDelta(null), 800);

    const start = prevRef.current;
    const end = score;
    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.round(start + (end - start) * t));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    prevRef.current = score;
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [score]);

  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" };

  return (
    <div className="relative flex flex-col items-center">
      <span className="text-xs text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className={`${sizes[size]} font-black text-blue-600 tabular-nums`}>{display.toLocaleString("ar-EG")}</span>
      <AnimatePresence>
        {delta !== null && (
          <motion.span
            key={delta}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className={`absolute -top-4 text-lg font-bold ${delta > 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
