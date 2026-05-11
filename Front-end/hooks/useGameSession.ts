"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { submitGameResult, saveLocalScore } from "@/services/gameApi";
import type { GameType, Difficulty } from "@/services/gameApi";

export type { GameType, Difficulty };
export type GamePhase = "instructions" | "playing" | "paused" | "gameover";

export interface GameSessionResult {
  score: number;
  level: number;
  timeSeconds: number;
  accuracy: number;
  streak: number;
  difficulty: Difficulty;
}

interface Options {
  gameType: GameType;
  difficulty: Difficulty;
  onGameOver?: (result: GameSessionResult) => void;
}

export function useGameSession({ gameType, difficulty, onGameOver }: Options) {
  const [phase, setPhase] = useState<GamePhase>("instructions");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [time, setTime] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const resultRef = useRef<GameSessionResult | null>(null);

  useEffect(() => {
    if (phase === "playing") {
      startRef.current = Date.now() - time * 1000;
      timerRef.current = setInterval(() => {
        setTime(Math.floor((Date.now() - startRef.current) / 1000));
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const startGame = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setLevel(1);
    setStreak(0);
    setMaxStreak(0);
    setTime(0);
    setCorrectCount(0);
    setTotalCount(0);
    startRef.current = Date.now();
  }, []);

  const addScore = useCallback((points: number, isCorrect?: boolean) => {
    setScore((p) => p + Math.max(0, points));
    if (isCorrect !== undefined) {
      setTotalCount((p) => p + 1);
      if (isCorrect) {
        setCorrectCount((p) => p + 1);
        setStreak((p) => {
          const n = p + 1;
          setMaxStreak((m) => Math.max(m, n));
          return n;
        });
      } else {
        setStreak(0);
      }
    }
  }, []);

  const nextLevel = useCallback(() => setLevel((p) => p + 1), []);

  const resetStreak = useCallback(() => setStreak(0), []);

  const endGame = useCallback(
    async (finalScore?: number, finalLevel?: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);

      setPhase("gameover");

      const sc = finalScore ?? score;
      const lv = finalLevel ?? level;
      const acc = totalCount > 0 ? correctCount / totalCount : 1;

      const result: GameSessionResult = {
        score: sc,
        level: lv,
        timeSeconds: elapsed,
        accuracy: acc,
        streak: maxStreak,
        difficulty,
      };

      resultRef.current = result;
      saveLocalScore(gameType, sc);

      try {
        await submitGameResult({
          game_type: gameType,
          score: sc,
          level_reached: lv,
          time_seconds: elapsed,
          accuracy: acc,
          difficulty,
        });
      } catch (_) {
        // Silently fail — offline or API not ready
      }

      onGameOver?.(result);
      return result;
    },
    [score, level, correctCount, totalCount, maxStreak, difficulty, gameType, onGameOver]
  );

  const pauseGame = useCallback(() => {
    setPhase((p) => (p === "playing" ? "paused" : "playing"));
  }, []);

  return {
    phase,
    score,
    level,
    streak,
    maxStreak,
    time,
    accuracy: totalCount > 0 ? correctCount / totalCount : 1,
    isPlaying: phase === "playing",
    isPaused: phase === "paused",
    isGameOver: phase === "gameover",
    result: resultRef.current,
    startGame,
    addScore,
    nextLevel,
    resetStreak,
    endGame,
    pauseGame,
    setPhase,
  };
}
