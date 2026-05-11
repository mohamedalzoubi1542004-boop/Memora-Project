"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListOrdered, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import GameInstructions from "@/components/games/GameInstructions";
import GameHeader from "@/components/games/GameHeader";
import GameOverScreen from "@/components/games/GameOverScreen";
import ProgressBar from "@/components/games/ProgressBar";
import { useGameSession } from "@/hooks/useGameSession";
import type { Difficulty } from "@/services/gameApi";
import tasksData from "@/lib/game-data/tasks-ar.json";

interface Task { title: string; emoji: string; steps: string[] }

const TASKS_PER_ROUND = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTaskList(difficulty: Difficulty): Task[] {
  const pool = shuffle(tasksData as Task[]).slice(0, TASKS_PER_ROUND);
  return pool.map((t) => ({
    ...t,
    steps: difficulty === "easy" ? t.steps.slice(0, 5) : t.steps,
  }));
}

type FeedbackState = { correct: boolean[] } | null;

export default function TaskOrderingGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskIdx, setTaskIdx] = useState(0);
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [result, setResult] = useState<ReturnType<typeof useGameSession>["result"]>(null);
  const session = useGameSession({
    gameType: "tasks",
    difficulty,
    onGameOver: (r) => setResult(r),
  });

  const loadTask = useCallback((taskList: Task[], idx: number) => {
    if (idx >= taskList.length) { session.endGame(); return; }
    setTaskIdx(idx);
    setShuffled(shuffle(taskList[idx].steps));
    setSelected(null);
    setFeedback(null);
  }, [session]);

  const initGame = useCallback(() => {
    const tl = buildTaskList(difficulty);
    setTasks(tl);
    setResult(null);
    session.startGame();
    setTimeout(() => loadTask(tl, 0), 100);
  }, [difficulty, session.startGame, loadTask]);

  /* Move step up */
  const moveUp = useCallback((i: number) => {
    if (i === 0 || feedback) return;
    setShuffled((prev) => {
      const a = [...prev];
      [a[i - 1], a[i]] = [a[i], a[i - 1]];
      return a;
    });
    setSelected(i - 1);
  }, [feedback]);

  /* Move step down */
  const moveDown = useCallback((i: number) => {
    if (feedback) return;
    setShuffled((prev) => {
      if (i >= prev.length - 1) return prev;
      const a = [...prev];
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
      return a;
    });
    setSelected(i + 1);
  }, [feedback]);

  /* Submit answer */
  const handleSubmit = useCallback(() => {
    if (!tasks[taskIdx] || feedback) return;
    const correct = tasks[taskIdx].steps;
    const correctArr = shuffled.map((step, i) => step === correct[i]);
    const allCorrect = correctArr.every(Boolean);
    const numCorrect = correctArr.filter(Boolean).length;

    setFeedback({ correct: correctArr });

    const pts = allCorrect ? 20 : numCorrect * 3;
    session.addScore(pts, allCorrect);
    session.nextLevel();

    setTimeout(() => loadTask(tasks, taskIdx + 1), 1600);
  }, [tasks, taskIdx, shuffled, feedback, session, loadTask]);

  if (session.phase === "instructions") {
    return (
      <GameInstructions
        gameName="ترتيب الخطوات"
        domain="الوظائف التنفيذية والتخطيط"
        icon={ListOrdered}
        iconBg="bg-rose-50"
        iconColor="text-rose-600"
        instructions={[
          "تظهر خطوات مهمة يومية بترتيب عشوائي.",
          "استخدم الأسهم ↑↓ لتحريك كل خطوة.",
          "رتّبها من الأولى إلى الأخيرة.",
          "اضغط 'تأكيد' للتحقق من إجابتك.",
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
        gameName="ترتيب الخطوات"
        domainNote="الوظائف التنفيذية تشمل التخطيط وترتيب الأولويات — وهي من أوائل ما يتأثر بالزهايمر."
        onReplay={() => { setResult(null); initGame(); }}
      />
    );
  }

  const currentTask = tasks[taskIdx];
  if (!currentTask) return null;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 flex flex-col bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900">
      <GameHeader
        gameName="ترتيب الخطوات"
        domain="الوظائف التنفيذية"
        score={session.score}
        level={session.level}
        time={session.time}
        streak={session.streak}
        isPaused={session.isPaused}
        onPause={session.pauseGame}
      />

      <div className="flex-1 flex flex-col items-center gap-6 max-w-md mx-auto w-full pt-6">
        <div className="w-full">
          <ProgressBar current={taskIdx} total={TASKS_PER_ROUND} label={`المهمة ${taskIdx + 1} من ${TASKS_PER_ROUND}`} color="purple" />
        </div>

        {/* Task title */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-4xl">{currentTask.emoji}</span>
          <div>
            <p className="text-xs text-white/40 mb-0.5">رتّب خطوات</p>
            <h2 className="text-xl font-black text-white">{currentTask.title}</h2>
          </div>
        </div>

        {/* Steps list */}
        <div className="w-full flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {shuffled.map((step, i) => {
              const fb = feedback?.correct[i];
              return (
                <motion.div
                  key={step}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-colors duration-300 ${
                    feedback
                      ? fb
                        ? "bg-emerald-500/15 border-emerald-500/50"
                        : "bg-red-500/15 border-red-500/50"
                      : selected === i
                      ? "bg-cyan-500/15 border-cyan-500/50"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {/* Step number */}
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    feedback ? (fb ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-white/10 text-white/60"
                  }`}>
                    {i + 1}
                  </span>

                  {/* Step text */}
                  <span className="flex-1 text-white text-base leading-snug text-right">{step}</span>

                  {/* Move buttons */}
                  {!feedback && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-all"
                      >
                        <ChevronUp size={16} className="text-white" />
                      </button>
                      <button
                        onClick={() => moveDown(i)}
                        disabled={i === shuffled.length - 1}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-all"
                      >
                        <ChevronDown size={16} className="text-white" />
                      </button>
                    </div>
                  )}

                  {/* Feedback icon */}
                  {feedback && (
                    <span className="text-xl shrink-0">{fb ? "✅" : "❌"}</span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Submit button */}
        {!feedback && (
          <button
            onClick={handleSubmit}
            disabled={session.isPaused}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-rose-500 to-pink-400 hover:opacity-90 text-white font-black text-xl rounded-2xl shadow-lg transition-all active:scale-95"
          >
            <CheckCircle2 size={24} /> تأكيد الترتيب
          </button>
        )}
      </div>
    </div>
  );
}
