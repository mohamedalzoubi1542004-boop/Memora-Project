"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Delete } from "lucide-react";
import GameInstructions from "@/components/games/GameInstructions";
import GameHeader from "@/components/games/GameHeader";
import GameOverScreen from "@/components/games/GameOverScreen";
import { useGameSession } from "@/hooks/useGameSession";
import type { Difficulty } from "@/services/gameApi";

type Phase = "showing" | "input" | "correct" | "wrong";

const CONFIGS: Record<Difficulty, { startLen: number; showMs: number; maxRange: number }> = {
  easy:   { startLen: 3, showMs: 1000, maxRange: 9 },
  medium: { startLen: 4, showMs: 800,  maxRange: 9 },
  hard:   { startLen: 5, showMs: 600,  maxRange: 99 },
};

function generateSequence(len: number, maxRange: number): number[] {
  return Array.from({ length: len }, () => Math.floor(Math.random() * maxRange) + 1);
}

export default function SequenceRecallGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [showingIdx, setShowingIdx] = useState(-1);
  const [phase, setPhase] = useState<Phase>("showing");
  const [lives, setLives] = useState(3);
  const [seqLen, setSeqLen] = useState(3);
  const [inputLength, setInputLength] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof useGameSession>["result"]>(null);

  const session = useGameSession({
    gameType: "sequence",
    difficulty,
    onGameOver: (r) => setResult(r),
  });

  const cfg = CONFIGS[difficulty];

  const startRound = useCallback((len: number) => {
    const seq = generateSequence(len, cfg.maxRange);
    setSequence(seq);
    setUserInput([]);
    setShowingIdx(-1);
    setInputLength(0);
    setPhase("showing");

    let i = 0;
    const show = () => {
      if (i < seq.length) {
        setShowingIdx(i);
        i++;
        setTimeout(() => {
          setShowingIdx(-1);
          setTimeout(show, 200);
        }, cfg.showMs);
      } else {
        setInputLength(seq.length);
        setPhase("input");
      }
    };
    setTimeout(show, 600);
  }, [cfg]);

  const initGame = useCallback(() => {
    setLives(3);
    setSeqLen(CONFIGS[difficulty].startLen);
    session.startGame();
    setTimeout(() => startRound(CONFIGS[difficulty].startLen), 200);
  }, [difficulty, session.startGame, startRound]);

  const handleInput = useCallback((val: string) => {
    if (phase !== "input") return;
    const next = [...userInput, val];
    setUserInput(next);

    if (next.length === sequence.length) {
      const correct = next.join(",") === sequence.map(String).join(",");
      if (correct) {
        setPhase("correct");
        const bonus = Math.max(0, seqLen - 5) * 5;
        const streakMult = session.streak >= 5 ? 2.5 : session.streak >= 3 ? 2 : session.streak >= 1 ? 1.5 : 1;
        session.addScore(Math.round((10 + bonus) * streakMult), true);
        session.nextLevel();
        setTimeout(() => {
          const next = seqLen + 1;
          setSeqLen(next);
          startRound(next);
        }, 1000);
      } else {
        setPhase("wrong");
        session.addScore(0, false);
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          setTimeout(() => session.endGame(), 1000);
        } else {
          setTimeout(() => {
            setUserInput([]);
            startRound(seqLen);
          }, 1200);
        }
      }
    }
  }, [phase, userInput, sequence, seqLen, lives, session, startRound]);

  const handleDelete = useCallback(() => {
    if (phase === "input" && userInput.length > 0) {
      setUserInput((p) => p.slice(0, -1));
    }
  }, [phase, userInput]);

  if (session.phase === "instructions") {
    return (
      <GameInstructions
        gameName="تذكّر التسلسل"
        domain="الذاكرة العاملة"
        icon={Layers}
        iconBg="bg-cyan-50"
        iconColor="text-cyan-600"
        instructions={[
          "ستظهر أرقام على الشاشة واحداً تلو الآخر.",
          "بعد انتهاء العرض، أدخل الأرقام بنفس الترتيب.",
          "كل إجابة صحيحة تزيد الطول برقم جديد.",
          "لديك 3 محاولات — استخدمها بحكمة!",
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
        gameName="تذكّر التسلسل"
        domainNote="الذاكرة العاملة تمكّنك من الاحتفاظ بالمعلومات ومعالجتها في آنٍ واحد."
        onReplay={() => { setResult(null); initGame(); }}
      />
    );
  }

  const inputBoxes = Array.from({ length: inputLength }, (_, i) => userInput[i] ?? null);

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <GameHeader
        gameName="تذكّر التسلسل"
        domain="الذاكرة العاملة"
        score={session.score}
        level={session.level}
        time={session.time}
        streak={session.streak}
        isPaused={session.isPaused}
        onPause={session.pauseGame}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-md mx-auto w-full">
        {/* Lives */}
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="text-2xl" style={{ filter: i < lives ? "none" : "grayscale(1) opacity(0.3)" }}>
              ❤️
            </span>
          ))}
        </div>

        {/* Display area */}
        <div className="w-40 h-40 rounded-3xl bg-white border-2 border-gray-100 flex items-center justify-center shadow-xl shadow-gray-200/50">
          <AnimatePresence mode="wait">
            {showingIdx >= 0 ? (
              <motion.span
                key={showingIdx}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-6xl font-black text-blue-600"
              >
                {sequence[showingIdx]}
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-300 text-2xl font-bold text-center leading-tight"
              >
                {phase === "showing"
                  ? (inputLength === 0
                      ? <span className="flex flex-col items-center gap-1"><span className="text-base text-slate-400 font-bold">{sequence.length} أرقام</span><span className="text-sm text-slate-300">انتبه!</span></span>
                      : "•••")
                  : phase === "input" ? "أدخل"
                  : phase === "correct" ? "✅"
                  : "❌"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Input boxes */}
        <div className="flex gap-2 flex-wrap justify-center">
          {inputBoxes.map((val, i) => (
            <motion.div
              key={i}
              animate={
                phase === "correct" ? { borderColor: "#10b981", backgroundColor: "#f0fdf4" }
                : phase === "wrong" ? { borderColor: "#ef4444", backgroundColor: "#fef2f2", x: [0, -6, 6, -4, 4, 0] }
                : {}
              }
              transition={{ duration: 0.4 }}
              className="w-12 h-12 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center text-xl font-black text-slate-800 shadow-sm"
            >
              {val ?? ""}
            </motion.div>
          ))}
        </div>

        {/* Numpad */}
        {phase === "input" && (
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {cfg.maxRange <= 9
              ? [1,2,3,4,5,6,7,8,9].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleInput(String(n))}
                    className="h-14 rounded-2xl bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-slate-800 text-2xl font-black active:scale-95 transition-all shadow-sm"
                  >
                    {n}
                  </button>
                ))
              : null
            }
            {cfg.maxRange > 9 && (
              <div className="col-span-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="w-full h-14 rounded-2xl bg-white border-2 border-gray-200 text-slate-800 text-2xl font-black text-center focus:border-blue-500 outline-none shadow-sm"
                  placeholder="أدخل الرقم"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value;
                      if (v) { handleInput(v); (e.target as HTMLInputElement).value = ""; }
                    }
                  }}
                />
              </div>
            )}
            {cfg.maxRange <= 9 && (
              <>
                <button
                  onClick={handleDelete}
                  className="h-14 rounded-2xl bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-slate-500 flex items-center justify-center active:scale-95 transition-all shadow-sm"
                >
                  <Delete size={22} />
                </button>
                <button
                  onClick={() => handleInput("0")}
                  className="h-14 rounded-2xl bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-slate-800 text-2xl font-black active:scale-95 transition-all shadow-sm"
                >
                  0
                </button>
                <div />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
