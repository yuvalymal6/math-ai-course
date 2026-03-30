"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { getSubtopicProgress, toggleLevel, type LevelId } from "@/app/lib/progress";

export default function MarkComplete({
  subtopicId,
  level,
  onToggle,
}: {
  subtopicId: string;
  level: LevelId;
  onToggle?: (completed: boolean) => void;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const p = getSubtopicProgress(subtopicId);
    setDone(p[level]);
  }, [subtopicId, level]);

  const handleClick = () => {
    const newState = toggleLevel(subtopicId, level);
    setDone(newState);
    onToggle?.(newState);
    // Dispatch storage event for cross-component sync
    window.dispatchEvent(new Event("math-progress-update"));
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
        done
          ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          : "bg-slate-800/60 text-slate-300 border border-slate-600 hover:border-emerald-500/50 hover:text-emerald-300"
      }`}
    >
      {done && <Check size={16} strokeWidth={3} />}
      {done ? "הושלם! ✓" : "סמן כהושלם"}
    </button>
  );
}
