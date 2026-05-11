

"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Eye, Brain } from "lucide-react";
import GameInstructions from "@/components/games/GameInstructions";
import GameHeader from "@/components/games/GameHeader";
import GameOverScreen from "@/components/games/GameOverScreen";
import Timer from "@/components/games/Timer";
import { useGameSession } from "@/hooks/useGameSession";
import type { Difficulty } from "@/services/gameApi";
import facesData from "@/lib/game-data/faces.json";

/* ─── Types ─── */
interface FaceEntry { seed: string; name: string }
interface FacePair extends FaceEntry { gender: "male" | "female" }

const CONFIGS: Record<Difficulty, { count: number; memorizeTime: number }> = {
  easy:   { count: 4, memorizeTime: 45 },
  medium: { count: 5, memorizeTime: 35 },
  hard:   { count: 6, memorizeTime: 25 },
};

type GamePhase = "memorize" | "recall" | "done";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildFaces(count: number): FacePair[] {
  const males: FacePair[] = (facesData.male as FaceEntry[]).map((f) => ({ ...f, gender: "male" }));
  const females: FacePair[] = (facesData.female as FaceEntry[]).map((f) => ({ ...f, gender: "female" }));
  const all = shuffle([...males, ...females]);
  return all.slice(0, count);
}

function avatarUrl(seed: string, gender: "male" | "female"): string {
  const bg = gender === "male" ? "b6e3f4" : "ffdfbf";
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${bg}&radius=50`;
}

function fallbackAvatar(name: string, gender: "male" | "female"): string {
  const initial = name.charAt(0);
  const bg = gender === "male" ? "#b6e3f4" : "#ffdfbf";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="${bg}"/><text x="40" y="52" font-size="32" text-anchor="middle" font-family="sans-serif" fill="#334155">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ─── Face card (memorize phase) ─── */
function MemorizeCard({ face }: { face: FacePair }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl(face.seed, face.gender)}
        alt={face.name}
        className="w-20 h-20 rounded-full bg-white/10"
        loading="eager"
        onError={(e) => { (e.target as HTMLImageElement).src = fallbackAvatar(face.name, face.gender); }}
      />
      <p className="text-white font-bold text-lg">{face.name}</p>
    </motion.div>
  );
}

/* ─── Face card (recall phase) ─── */
function RecallCard({
  face, isSelected, isMatched, matchedName, wrongFlash, onClick,
}: {
  face: FacePair;
  isSelected: boolean;
  isMatched: boolean;
  matchedName?: string;
  wrongFlash: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={isMatched}
      whileTap={{ scale: 0.95 }}
      animate={wrongFlash ? { x: [-6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-all duration-200 ${
        isMatched
          ? "bg-emerald-500/20 border-emerald-500/60"
          : isSelected
          ? "bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20"
          : "bg-white/5 border-white/10 hover:border-white/25"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl(face.seed, face.gender)}
        alt="وجه"
        className="w-20 h-20 rounded-full"
        onError={(e) => { (e.target as HTMLImageElement).src = fallbackAvatar(face.seed, face.gender); }}
      />
      {isMatched ? (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-emerald-300 font-bold text-base"
        >
          {matchedName} ✅
        </motion.p>
      ) : (
        <p className="text-white/30 font-bold text-base tracking-widest">• • •</p>
      )}
    </motion.button>
  );
}

/* ─── Main game ─── */
export default function FaceNameGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [faces, setFaces] = useState<FacePair[]>([]);
  const [nameButtons, setNameButtons] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>("memorize");
  const [memorizeLeft, setMemorizeLeft] = useState(45);
  const [selectedFace, setSelectedFace] = useState<number | null>(null);
  const [matched, setMatched] = useState<Record<number, string>>({});
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState<Record<number, number>>({});
  const [errorMsg, setErrorMsg] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof useGameSession>["result"]>(null);
  const memTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recallStartRef = useRef<number>(0);
  const wrongAttemptsRef = useRef<Record<number, number>>({});

  const session = useGameSession({
    gameType: "faces",
    difficulty,
    onGameOver: (r) => setResult(r),
  });

  const cfg = CONFIGS[difficulty];

  const startRecall = useCallback(() => {
    if (memTimerRef.current) clearInterval(memTimerRef.current);
    recallStartRef.current = Date.now();
    setGamePhase("recall");
  }, []);

  const initGame = useCallback(() => {
    if (memTimerRef.current) clearInterval(memTimerRef.current);
    const fl = buildFaces(cfg.count);
    setFaces(fl);
    setNameButtons(shuffle(fl.map((f) => f.name)));
    setGamePhase("memorize");
    setMemorizeLeft(cfg.memorizeTime);
    setSelectedFace(null);
    setMatched({});
    setWrongFlash(null);
    setWrongAttempts({});
    wrongAttemptsRef.current = {};
    setErrorMsg(false);
    setResult(null);
    session.startGame();

    let t = cfg.memorizeTime;
    memTimerRef.current = setInterval(() => {
      t--;
      setMemorizeLeft(t);
      if (t <= 0) startRecall();
    }, 1000);
  }, [cfg, session.startGame, startRecall]);

  useEffect(() => () => { if (memTimerRef.current) clearInterval(memTimerRef.current); }, []);

  const handleFaceClick = useCallback((idx: number) => {
    if (matched[idx] !== undefined) return;
    setSelectedFace((p) => (p === idx ? null : idx));
  }, [matched]);

  const handleNameClick = useCallback((name: string) => {
    if (selectedFace === null || wrongFlash !== null) return;
    const correctName = faces[selectedFace]?.name;

    if (name === correctName) {
      // Correct match!
      const newMatched = { ...matched, [selectedFace]: name };
      setMatched(newMatched);
      setSelectedFace(null);
      session.addScore(15, true);

      // Check if all matched
      if (Object.keys(newMatched).length === faces.length) {
        const recallElapsed = (Date.now() - recallStartRef.current) / 1000;
        const speedBonus = recallElapsed < 15 ? 30 : recallElapsed < 30 ? 10 : 0;
        const perfectBonus = Object.values(wrongAttempts).every((v) => v === 0) ? 20 : 0;
        if (speedBonus) session.addScore(speedBonus);
        if (perfectBonus) session.addScore(perfectBonus);
        setTimeout(() => session.endGame(), 600);
      }
    } else {
      // Wrong — show shake + error banner, no auto-reveal
      const attempts = (wrongAttemptsRef.current[selectedFace] ?? 0) + 1;
      wrongAttemptsRef.current = { ...wrongAttemptsRef.current, [selectedFace]: attempts };
      setWrongFlash(selectedFace);
      setWrongAttempts({ ...wrongAttemptsRef.current });
      setErrorMsg(true);
      session.addScore(0, false);
      setTimeout(() => { setWrongFlash(null); setErrorMsg(false); }, 800);
    }
  }, [selectedFace, faces, matched, wrongFlash, session]);

  /* ─── Instructions ─── */
  if (session.phase === "instructions") {
    return (
      <GameInstructions
        gameName="وجوه وأسماء"
        domain="الذاكرة الترابطية"
        icon={Users}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        instructions={[
          "ادرس وجوه وأسماء الأشخاص جيداً خلال الوقت المحدد.",
          "بعد انتهاء الوقت، ستختفي الأسماء.",
          "انقر على وجه ثم انقر على اسمه الصحيح.",
          "إجابة خاطئة تظهر تنبيهاً — استمر في المحاولة حتى تتذكر الاسم الصحيح.",
        ]}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onStart={initGame}
      />
    );
  }

  /* ─── Game over ─── */
  if (session.isGameOver && result) {
    return (
      <GameOverScreen
        result={result}
        gameName="وجوه وأسماء"
        domainNote="ربط الوجوه بالأسماء هو من أول الوظائف التي تتأثر بمرض الزهايمر."
        onReplay={() => { setResult(null); initGame(); }}
      />
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 flex flex-col bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      <GameHeader
        gameName="وجوه وأسماء"
        domain="الذاكرة الترابطية"
        score={session.score}
        level={session.level}
        time={session.time}
        streak={session.streak}
        isPaused={session.isPaused}
        onPause={session.pauseGame}
      />

      <div className="flex-1 flex flex-col items-center gap-6 max-w-lg mx-auto w-full pt-4">
        {/* Phase header */}
        <div className="flex items-center justify-between w-full">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            gamePhase === "memorize"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
          }`}>
            {gamePhase === "memorize" ? <Eye size={16} /> : <Brain size={16} />}
            {gamePhase === "memorize" ? "مرحلة الحفظ" : "مرحلة الاختبار"}
          </div>
          {gamePhase === "memorize" && (
            <div className="flex items-center gap-3">
              <Timer seconds={memorizeLeft} isCountdown total={cfg.memorizeTime} />
              <button
                onClick={startRecall}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all"
              >
                جاهز!
              </button>
            </div>
          )}
        </div>

        {/* Faces grid */}
        <div
          className="grid gap-3 w-full"
          style={{ gridTemplateColumns: `repeat(${Math.min(cfg.count, 3)}, 1fr)` }}
        >
          {faces.map((face, i) =>
            gamePhase === "memorize" ? (
              <MemorizeCard key={face.seed} face={face} />
            ) : (
              <RecallCard
                key={face.seed}
                face={face}
                isSelected={selectedFace === i}
                isMatched={matched[i] !== undefined}
                matchedName={matched[i]}
                wrongFlash={wrongFlash === i}
                onClick={() => handleFaceClick(i)}
              />
            )
          )}
        </div>

        {/* Name buttons (recall phase) */}
        {gamePhase === "recall" && (
          <div className="w-full">
            {/* Error / prompt banner */}
            <div className="h-8 flex items-center justify-center mb-2">
              {errorMsg ? (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 font-bold text-sm flex items-center gap-1"
                >
                  ❌ إجابة خاطئة — حاول مرة أخرى
                </motion.p>
              ) : selectedFace !== null ? (
                <p className="text-white/40 text-sm">اختر اسم الشخص المحدد</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {nameButtons.map((name) => {
                const isUsed = Object.values(matched).includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => handleNameClick(name)}
                    disabled={isUsed || selectedFace === null || session.isPaused}
                    className={`px-5 py-3 rounded-2xl font-bold text-base transition-all duration-200 ${
                      isUsed
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/40 line-through cursor-not-allowed"
                        : selectedFace !== null
                        ? "bg-white/10 border border-white/20 text-white hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-300 active:scale-95"
                        : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {selectedFace === null && (
              <p className="text-center text-white/25 text-xs mt-3">انقر على وجه أولاً ثم اختر اسمه</p>
            )}
          </div>
        )}

        {/* Progress */}
        {gamePhase === "recall" && (
          <p className="text-white/30 text-sm">
            تم مطابقة: <span className="text-emerald-400 font-bold">{Object.keys(matched).length}</span> من {faces.length}
          </p>
        )}
      </div>
    </div>
  );
}
