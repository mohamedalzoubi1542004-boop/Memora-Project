"use client";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Grid3X3 } from "lucide-react";
import GameInstructions from "@/components/games/GameInstructions";
import GameHeader from "@/components/games/GameHeader";
import GameOverScreen from "@/components/games/GameOverScreen";
import { useGameSession } from "@/hooks/useGameSession";
import type { Difficulty } from "@/services/gameApi";

/* ─── Card content ─── */
const ICONS = ["🧠", "💊", "🩺", "❤️", "🔬", "👁️", "🦴", "🫁", "💉", "🧬", "📋", "⚕️"];

interface Card {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function buildDeck(pairs: number): Card[] {
  const icons = [...ICONS].slice(0, pairs);
  const doubled = [...icons, ...icons];
  // Fisher-Yates shuffle
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((icon, id) => ({ id, icon, isFlipped: false, isMatched: false }));
}

const CONFIGS: Record<Difficulty, { pairs: number; cols: number }> = {
  easy:   { pairs: 3, cols: 3 },
  medium: { pairs: 6, cols: 4 },
  hard:   { pairs: 8, cols: 4 },
};

/* ─── Single card component ─── */
function MemoryCard({ card, onClick, disabled }: { card: Card; onClick: () => void; disabled: boolean }) {
  const show = card.isFlipped || card.isMatched;
  return (
    <button
      onClick={onClick}
      disabled={disabled || card.isMatched}
      className="relative w-full aspect-square focus:outline-none"
      style={{ perspective: 800 }}
    >
      <motion.div
        animate={{ rotateY: show ? 180 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-3xl opacity-40">🧩</span>
        </div>
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-2xl flex items-center justify-center border-2 transition-colors ${
            card.isMatched
              ? "bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-100"
              : "bg-white border-blue-200 shadow-md"
          }`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="text-4xl">{card.icon}</span>
        </div>
      </motion.div>
    </button>
  );
}

/* ─── Main game ─── */
export default function MemoryCardsGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof useGameSession>["result"]>(null);

  const session = useGameSession({
    gameType: "cards",
    difficulty,
    onGameOver: (r) => setResult(r),
  });

  const cfg = CONFIGS[difficulty];

  const initGame = useCallback(() => {
    setCards(buildDeck(cfg.pairs));
    setFlipped([]);
    setLocked(false);
    setMoves(0);
    setMatched(0);
    session.startGame();
  }, [cfg.pairs, session.startGame]);

  const handleCardClick = useCallback((idx: number) => {
    if (locked || cards[idx].isFlipped || cards[idx].isMatched) return;

    const newFlipped = [...flipped, idx];
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, isFlipped: true } : c)));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      const [a, b] = newFlipped;
      if (cards[a].icon === cards[b].icon) {
        // Match!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === a || i === b ? { ...c, isMatched: true, isFlipped: false } : c))
          );
          const newMatched = matched + 1;
          setMatched(newMatched);
          session.addScore(20, true);
          setFlipped([]);
          setLocked(false);
          if (newMatched === cfg.pairs) {
            // All matched — bonus for speed
            const timeBonus = session.time < 30 ? 50 : session.time < 60 ? 25 : 0;
            if (timeBonus) session.addScore(timeBonus);
            session.nextLevel();
            session.endGame();
          }
        }, 400);
      } else {
        // No match
        session.addScore(0, false);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === a || i === b ? { ...c, isFlipped: false } : c))
          );
          setFlipped([]);
          setLocked(false);
        }, 1000);
      }
    }
  }, [cards, flipped, locked, matched, cfg.pairs, session]);

  if (session.phase === "instructions") {
    return (
      <GameInstructions
        gameName="أزواج الصور"
        domain="الذاكرة البصرية"
        icon={Grid3X3}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        instructions={[
          "اقلب بطاقتين في كل مرة بالنقر عليهما.",
          "إذا تطابقتا بقيتا مكشوفتين وربحت نقاطاً.",
          "إذا لم تتطابقا انقلبتا مجدداً — تذكّر مكانهما!",
          "أكمل جميع الأزواج في أسرع وقت للحصول على مكافأة.",
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
        gameName="أزواج الصور"
        domainNote="الذاكرة البصرية تساعدك على تذكّر الوجوه والأماكن والمشاهد اليومية."
        onReplay={() => { setResult(null); initGame(); }}
      />
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      <GameHeader
        gameName="أزواج الصور"
        domain="الذاكرة البصرية"
        score={session.score}
        level={session.level}
        time={session.time}
        streak={session.streak}
        isPaused={session.isPaused}
        onPause={session.pauseGame}
      />

      <div className="max-w-md mx-auto mt-6">
        {/* Moves counter */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <span className="text-slate-400">المحاولات: <span className="text-slate-800 font-bold">{moves}</span></span>
          <span className="text-slate-400">الأزواج: <span className="text-emerald-600 font-bold">{matched}/{cfg.pairs}</span></span>
        </div>

        {/* Grid */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}
        >
          {cards.map((card, i) => (
            <MemoryCard
              key={card.id}
              card={card}
              onClick={() => handleCardClick(i)}
              disabled={locked || session.isPaused}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
