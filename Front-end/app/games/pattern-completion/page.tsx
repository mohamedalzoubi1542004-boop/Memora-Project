"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import GameInstructions from "@/components/games/GameInstructions";
import GameHeader from "@/components/games/GameHeader";
import GameOverScreen from "@/components/games/GameOverScreen";
import ProgressBar from "@/components/games/ProgressBar";
import { useGameSession } from "@/hooks/useGameSession";
import type { Difficulty } from "@/services/gameApi";

/* ─── Shape system ─── */
type Shape = "circle" | "square" | "triangle" | "star" | "diamond";
type Color = "cyan" | "amber" | "rose" | "emerald" | "violet";
type Size = "sm" | "md" | "lg";

interface ShapeItem { shape: Shape; color: Color; size: Size; rotation?: number }

const COLORS: Color[] = ["cyan", "amber", "rose", "emerald", "violet"];
const SHAPES: Shape[] = ["circle", "square", "triangle", "star", "diamond"];
const COLOR_MAP: Record<Color, string> = {
  cyan: "#06B6D4", amber: "#F59E0B", rose: "#F43F5E", emerald: "#10B981", violet: "#8B5CF6",
};
const SIZE_MAP: Record<Size, number> = { sm: 20, md: 38, lg: 58 };

function ShapeSVG({ item, size: overrideSize }: { item: ShapeItem; size?: number }) {
  const s = overrideSize ?? SIZE_MAP[item.size];
  const c = COLOR_MAP[item.color];
  const rot = item.rotation ?? 0;

  const paths: Record<Shape, JSX.Element> = {
    circle:   <circle cx={s / 2} cy={s / 2} r={s * 0.42} fill={c} />,
    square:   <rect x={s * 0.08} y={s * 0.08} width={s * 0.84} height={s * 0.84} rx={s * 0.12} fill={c} />,
    triangle: <polygon points={`${s/2},${s*0.08} ${s*0.92},${s*0.92} ${s*0.08},${s*0.92}`} fill={c} />,
    star:     (
      <polygon
        points={(() => {
          const pts = [];
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? s * 0.46 : s * 0.2;
            const a = (i * 36 - 90) * (Math.PI / 180);
            pts.push(`${s/2 + r * Math.cos(a)},${s/2 + r * Math.sin(a)}`);
          }
          return pts.join(" ");
        })()}
        fill={c}
      />
    ),
    diamond:  <polygon points={`${s/2},${s*0.06} ${s*0.94},${s/2} ${s/2},${s*0.94} ${s*0.06},${s/2}`} fill={c} />,
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ transform: `rotate(${rot}deg)` }}>
      {paths[item.shape]}
    </svg>
  );
}

/* ─── Pattern generator ─── */
interface PatternLevel {
  sequence: ShapeItem[];
  answer: ShapeItem;
  distractors: ShapeItem[];
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTwo<T>(arr: T[]): [T, T] {
  const a = pick(arr);
  let b = pick(arr);
  while (b === a) b = pick(arr);
  return [a, b];
}

function generatePattern(level: number): PatternLevel {
  if (level <= 4) {
    // AB cycle: both shape AND color alternate so all 4 options are visually distinct
    const [s1, s2] = pickTwo(SHAPES);
    const [c1, c2] = pickTwo(COLORS);
    const seq: ShapeItem[] = [
      { shape: s1, color: c1, size: "md" },
      { shape: s2, color: c2, size: "md" },
      { shape: s1, color: c1, size: "md" },
      { shape: s2, color: c2, size: "md" },
    ];
    const answer: ShapeItem = { shape: s1, color: c1, size: "md" };
    const dist: ShapeItem[] = [
      { shape: s2, color: c1, size: "md" },
      { shape: s1, color: c2, size: "md" },
      { shape: s2, color: c2, size: "md" },
    ];
    return { sequence: seq, answer, distractors: dist };
  }
  if (level <= 7) {
    // Size cycle: sm → md → lg → sm → ?
    const sizes: Size[] = ["sm", "md", "lg"];
    const shape = pick(SHAPES);
    const color = pick(COLORS);
    const startIdx = Math.floor(Math.random() * 3);
    const seq: ShapeItem[] = [0, 1, 2, 3].map((i) => ({ shape, color, size: sizes[(startIdx + i) % 3] }));
    const answer: ShapeItem = { shape, color, size: sizes[(startIdx + 4) % 3] };
    const wrongSizes = sizes.filter((s) => s !== answer.size);
    const dist: ShapeItem[] = [
      { shape, color, size: wrongSizes[0] },
      { shape, color, size: wrongSizes[1] },
      { shape: pick(SHAPES.filter((s) => s !== shape)), color, size: answer.size },
    ];
    return { sequence: seq, answer, distractors: dist };
  }
  if (level <= 11) {
    // ABC cycle: 3 distinct shape+color combos cycling — ABCABC?
    const s3 = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, 3) as [Shape, Shape, Shape];
    const c3 = [...COLORS].sort(() => Math.random() - 0.5).slice(0, 3) as [Color, Color, Color];
    const startIdx = Math.floor(Math.random() * 3);
    const seq: ShapeItem[] = [0, 1, 2, 3].map((i) => ({
      shape: s3[(startIdx + i) % 3], color: c3[(startIdx + i) % 3], size: "md" as Size,
    }));
    const ai = (startIdx + 4) % 3;
    const answer: ShapeItem = { shape: s3[ai], color: c3[ai], size: "md" };
    const dist: ShapeItem[] = [
      { shape: s3[(ai + 1) % 3], color: c3[(ai + 1) % 3], size: "md" },
      { shape: s3[(ai + 2) % 3], color: c3[(ai + 2) % 3], size: "md" },
      { shape: s3[ai], color: c3[(ai + 1) % 3], size: "md" },
    ];
    return { sequence: seq, answer, distractors: dist };
  }
  // Level 12+: rotation using TRIANGLE (asymmetric — ▲ ▷ ▽ ◁ all visually distinct)
  const rotations = [0, 90, 180, 270];
  const color = pick(COLORS);
  const startIdx = Math.floor(Math.random() * 4);
  const seq: ShapeItem[] = [0, 1, 2, 3].map((i) => ({
    shape: "triangle", color, size: "md", rotation: rotations[(startIdx + i) % 4],
  }));
  const answerRot = rotations[(startIdx + 4) % 4];
  const answer: ShapeItem = { shape: "triangle", color, size: "md", rotation: answerRot };
  const dist: ShapeItem[] = rotations
    .filter((r) => r !== answerRot)
    .map((rotation) => ({ shape: "triangle" as Shape, color, size: "md" as Size, rotation }));
  return { sequence: seq, answer, distractors: dist };
}

function shuffleOptions(answer: ShapeItem, distractors: ShapeItem[]): ShapeItem[] {
  const all = [answer, ...distractors.slice(0, 3)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

const TOTAL_ROUNDS = 15;
const POINTS_BY_LEVEL = (level: number) => level <= 5 ? 5 : level <= 10 ? 10 : 15;

export default function PatternCompletionGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [pattern, setPattern] = useState<PatternLevel | null>(null);
  const [options, setOptions] = useState<ShapeItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [roundNum, setRoundNum] = useState(1);
  const [result, setResult] = useState<ReturnType<typeof useGameSession>["result"]>(null);

  const session = useGameSession({
    gameType: "pattern",
    difficulty,
    onGameOver: (r) => setResult(r),
  });

  const nextRound = useCallback((round: number) => {
    const lvl = difficulty === "easy" ? round : difficulty === "medium" ? round + 3 : round + 6;
    const p = generatePattern(Math.min(lvl, 15));
    setPattern(p);
    setOptions(shuffleOptions(p.answer, p.distractors));
    setSelected(null);
    setShowFeedback(false);
    setRoundNum(round);
  }, [difficulty]);

  const initGame = useCallback(() => {
    setResult(null);
    session.startGame();
    session.nextLevel();
    setTimeout(() => nextRound(1), 100);
  }, [difficulty, session.startGame, nextRound]);

  const handleSelect = useCallback((idx: number) => {
    if (showFeedback || selected !== null || !pattern) return;
    setSelected(idx);
    setShowFeedback(true);

    const chosen = options[idx];
    const isCorrect =
      chosen.shape === pattern.answer.shape &&
      chosen.color === pattern.answer.color &&
      chosen.size === pattern.answer.size &&
      (chosen.rotation ?? 0) === (pattern.answer.rotation ?? 0);

    const pts = POINTS_BY_LEVEL(roundNum);
    session.addScore(isCorrect ? pts : 0, isCorrect);
    if (isCorrect && roundNum === TOTAL_ROUNDS) session.addScore(50);

    setTimeout(() => {
      if (roundNum >= TOTAL_ROUNDS) {
        session.endGame();
      } else {
        session.nextLevel();
        nextRound(roundNum + 1);
      }
    }, 900);
  }, [showFeedback, selected, pattern, options, roundNum, session, nextRound]);

  if (session.phase === "instructions") {
    return (
      <GameInstructions
        gameName="إكمال الأنماط"
        domain="التفكير المنطقي"
        icon={BrainCircuit}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        instructions={[
          "ستظهر سلسلة من الأشكال بترتيب معين.",
          "المكان الأخير يحمل علامة '؟'.",
          "اختر الشكل الصحيح الذي يكمل النمط.",
          "الأنماط تصبح أكثر تعقيداً مع كل مستوى.",
        ]}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onStart={initGame}
      />
    );
  }

  if (session.isGameOver && result) {
    return (
      <GameOverScreen
        result={result}
        gameName="إكمال الأنماط"
        domainNote="التفكير المنطقي والتخطيط من أوائل الوظائف التي يتأثر بها الزهايمر."
        onReplay={() => { setResult(null); initGame(); }}
      />
    );
  }

  if (!pattern) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 flex flex-col bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <GameHeader
        gameName="إكمال الأنماط"
        domain="التفكير المنطقي"
        score={session.score}
        level={session.level}
        time={session.time}
        streak={session.streak}
        isPaused={session.isPaused}
        onPause={session.pauseGame}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-lg mx-auto w-full">
        <div className="w-full">
          <ProgressBar current={roundNum - 1} total={TOTAL_ROUNDS} label={`السؤال ${roundNum} من ${TOTAL_ROUNDS}`} color="amber" />
        </div>

        {/* Pattern sequence */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {pattern.sequence.map((item, i) => (
            <div key={i} className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ShapeSVG item={item} />
            </div>
          ))}
          {/* Question mark */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-20 h-20 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center"
          >
            <span className="text-3xl font-black text-cyan-400">؟</span>
          </motion.div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {options.map((opt, i) => {
            if (!pattern) return null;
            const isCorrect =
              opt.shape === pattern.answer.shape &&
              opt.color === pattern.answer.color &&
              opt.size === pattern.answer.size &&
              (opt.rotation ?? 0) === (pattern.answer.rotation ?? 0);
            const isSelected = selected === i;

            let cls = "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20";
            if (showFeedback) {
              if (isCorrect) cls = "bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/20";
              else if (isSelected) cls = "bg-red-500/20 border-red-400";
              else cls = "bg-white/3 border-white/5 opacity-40";
            }

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleSelect(i)}
                disabled={showFeedback || session.isPaused}
                className={`w-full aspect-square rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${cls}`}
              >
                <ShapeSVG item={opt} />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
