"use client";

import { useState, useEffect, useCallback } from "react";
import { getCompletedLevels } from "@/app/lib/progress";

export default function SubtopicProgress({ subtopicId }: { subtopicId: string }) {
  const [completed, setCompleted] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const refresh = useCallback(() => {
    const prev = completed;
    const next = getCompletedLevels(subtopicId);
    setCompleted(next);
    // Trigger confetti when reaching 3/3
    if (next === 3 && prev < 3) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [subtopicId, completed]);

  useEffect(() => {
    setCompleted(getCompletedLevels(subtopicId));
    window.addEventListener("math-progress-update", refresh);
    return () => window.removeEventListener("math-progress-update", refresh);
  }, [subtopicId, refresh]);

  const pct = (completed / 3) * 100;
  const isComplete = completed === 3;

  return (
    <div className="relative mb-4 sm:mb-6">
      {/* Mobile: slim 2px line at top */}
      <div className="sm:hidden">
        <div className="h-[2px] bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isComplete ? "bg-emerald-400" : "bg-[#00d4ff]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-slate-500">
            {isComplete ? "הושלם!" : `${completed}/3 רמות`}
          </span>
          {isComplete && <span className="text-[10px] text-emerald-400">✓</span>}
        </div>
      </div>

      {/* Desktop: full progress bar */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">
            הושלמו {completed} מתוך 3 רמות קושי
          </span>
          {isComplete && (
            <span className="text-xs text-emerald-400 font-semibold">הושלם! ✓</span>
          )}
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isComplete ? "bg-emerald-400" : "bg-[#00d4ff]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Confetti celebration */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: "50%",
                top: "50%",
                background: ["#00d4ff", "#34d399", "#f59e0b", "#f43f5e", "#a78bfa", "#3b82f6"][i % 6],
                animation: `confettiBurst 1.2s ease-out ${i * 0.04}s forwards`,
                ["--tx" as string]: `${(Math.random() - 0.5) * 200}px`,
                ["--ty" as string]: `${-Math.random() * 120 - 30}px`,
                ["--rot" as string]: `${Math.random() * 720}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
