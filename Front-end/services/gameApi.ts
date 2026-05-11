import { getToken } from "@/lib/auth";

export type GameType = "sequence" | "cards" | "words" | "pattern" | "tasks" | "faces";
export type Difficulty = "easy" | "medium" | "hard";

export interface GameResult {
  game_type: GameType;
  score: number;
  level_reached: number;
  time_seconds: number;
  accuracy: number;
  difficulty: Difficulty;
}

export async function submitGameResult(result: GameResult): Promise<void> {
  const token = getToken();
  if (!token) return; // Not logged in — skip server submission

  const res = await fetch("/api/games/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      game_type: result.game_type,
      score: result.score,
      level_reached: result.level_reached,
      time_seconds: result.time_seconds,
      difficulty: result.difficulty,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn("Game submit failed:", err.detail ?? res.statusText);
  }
}

export function saveLocalScore(gameType: GameType, score: number): void {
  if (typeof window === "undefined") return;
  const key = `memora_best_${gameType}`;
  const prev = parseInt(localStorage.getItem(key) ?? "0");
  if (score > prev) localStorage.setItem(key, String(score));
  localStorage.setItem(`memora_last_${gameType}`, new Date().toISOString());
}

export function getLocalStats(gameType: GameType): { best: number; lastPlayed: string | null } {
  if (typeof window === "undefined") return { best: 0, lastPlayed: null };
  return {
    best: parseInt(localStorage.getItem(`memora_best_${gameType}`) ?? "0"),
    lastPlayed: localStorage.getItem(`memora_last_${gameType}`),
  };
}
