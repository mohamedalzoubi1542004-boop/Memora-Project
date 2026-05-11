"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import GameInstructions from "@/components/games/GameInstructions";
import GameHeader from "@/components/games/GameHeader";
import GameOverScreen from "@/components/games/GameOverScreen";
import ProgressBar from "@/components/games/ProgressBar";
import Timer from "@/components/games/Timer";
import { useGameSession } from "@/hooks/useGameSession";
import type { Difficulty } from "@/services/gameApi";
import allWords from "@/lib/game-data/words-ar.json";

interface WordPair {
  word: string;
  correct: string;
  options: string[];
}

const TOTAL_QUESTIONS = 20;
const TIME_PER_Q: Record<Difficulty, number> = { easy: 10, medium: 7, hard: 5 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(difficulty: Difficulty): WordPair[] {
  const pool = shuffle(allWords as WordPair[]).slice(0, TOTAL_QUESTIONS);
  if (difficulty === "easy") return pool;
  // For medium/hard: shuffle options order (already varied in JSON)
  return pool.map((q) => ({ ...q, options: shuffle(q.options) }));
}

export default function WordAssociationGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [questions, setQuestions] = useState<WordPair[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [result, setResult] = useState<ReturnType<typeof useGameSession>["result"]>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const session = useGameSession({
    gameType: "words",
    difficulty,
    onGameOver: (r) => setResult(r),
  });

  const maxTime = TIME_PER_Q[difficulty];

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const nextQuestion = useCallback((qs: WordPair[], idx: number) => {
    if (idx >= qs.length) {
      session.endGame();
      return;
    }
    setSelected(null);
    setShowFeedback(false);
    setQIndex(idx);
    setTimeLeft(maxTime);
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          // Time's up — count as wrong
          setShowFeedback(true);
          setSelected("__timeout__");
          session.addScore(0, false);
          setTimeout(() => nextQuestion(qs, idx + 1), 1200);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [maxTime, session, stopTimer]);

  const initGame = useCallback(() => {
    const qs = buildQuestions(difficulty);
    setQuestions(qs);
    setResult(null);
    session.startGame();
    setTimeout(() => nextQuestion(qs, 0), 100);
  }, [difficulty, session.startGame, nextQuestion]);

  const handleAnswer = useCallback((opt: string) => {
    if (showFeedback || selected) return;
    stopTimer();
    setSelected(opt);
    setShowFeedback(true);

    const isCorrect = opt === questions[qIndex]?.correct;
    const speedBonus = timeLeft >= maxTime - 3 ? 5 : 0;
    const points = isCorrect ? 10 + speedBonus + (session.streak >= 4 ? 20 : 0) : 0;
    session.addScore(points, isCorrect);

    setTimeout(() => nextQuestion(questions, qIndex + 1), 1000);
  }, [showFeedback, selected, questions, qIndex, timeLeft, maxTime, session, stopTimer, nextQuestion]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  if (session.phase === "instructions") {
    return (
      <GameInstructions
        gameName="كلمات مترابطة"
        domain="الذاكرة الدلالية واللغوية"
        icon={BookOpen}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        instructions={[
          "تظهر كلمة كبيرة في المنتصف.",
          "اختر الكلمة الأقرب معنىً أو ارتباطاً لها.",
          "الإجابة السريعة تمنحك نقاطاً إضافية.",
          "5 إجابات صحيحة متتالية = مكافأة ضعف!",
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
        gameName="كلمات مترابطة"
        domainNote="الذاكرة الدلالية هي مخزن المعنى واللغة — أساس الفهم والتواصل اليومي."
        onReplay={() => { setResult(null); initGame(); }}
      />
    );
  }

  const currentQ = questions[qIndex];
  if (!currentQ) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 flex flex-col bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900">
      <GameHeader
        gameName="كلمات مترابطة"
        domain="الذاكرة الدلالية"
        score={session.score}
        level={session.level}
        time={session.time}
        streak={session.streak}
        isPaused={session.isPaused}
        onPause={session.pauseGame}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-sm mx-auto w-full">
        {/* Progress + timer row */}
        <div className="w-full flex items-center gap-4">
          <ProgressBar current={qIndex} total={TOTAL_QUESTIONS} color="green" />
          <Timer seconds={timeLeft} isCountdown total={maxTime} />
        </div>

        {/* Target word */}
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-xs text-white/30 mb-3 uppercase tracking-widest">ما الأقرب لـ</p>
          <h2 className="text-5xl font-black text-white drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            {currentQ.word}
          </h2>
        </motion.div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {currentQ.options.map((opt) => {
            const isCorrect = opt === currentQ.correct;
            const isSelected = opt === selected;
            let style = "bg-white/8 border-white/10 text-white hover:bg-white/15";
            if (showFeedback) {
              if (isCorrect) style = "bg-emerald-500/25 border-emerald-400 text-emerald-300";
              else if (isSelected && !isCorrect) style = "bg-red-500/25 border-red-400 text-red-300";
              else style = "bg-white/5 border-white/5 text-white/30";
            }
            return (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleAnswer(opt)}
                disabled={showFeedback || session.isPaused}
                className={`py-4 px-3 rounded-2xl border-2 font-bold text-lg transition-all duration-200 ${style}`}
              >
                {opt}
              </motion.button>
            );
          })}
        </div>

        <p className="text-white/20 text-sm">
          السؤال {qIndex + 1} من {TOTAL_QUESTIONS}
        </p>
      </div>
    </div>
  );
}
