"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { getSubtopicProgress, toggleLevel, syncFromSupabase, type LevelId } from "@/app/lib/progress";

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
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // On first mount, sync from Supabase then read localStorage
    if (!synced) {
      syncFromSupabase().then(() => {
        const p = getSubtopicProgress(subtopicId);
        setDone(p[level]);
        setSynced(true);
        window.dispatchEvent(new Event("math-progress-update"));
      });
    } else {
      const p = getSubtopicProgress(subtopicId);
      setDone(p[level]);
    }
  }, [subtopicId, level, synced]);

  const handleClick = () => {
    const newState = toggleLevel(subtopicId, level);
    setDone(newState);
    onToggle?.(newState);
    window.dispatchEvent(new Event("math-progress-update"));
  };

  if (done) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
      >
        <Check size={16} strokeWidth={3} />
        הושלם! ✓
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="group flex items-center justify-center gap-2.5 w-full py-2 sm:py-3 rounded-xl text-sm transition-all duration-200 bg-transparent border border-emerald-200/60 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/40"
    >
      <span className="w-4 h-4 rounded-full border-[1.5px] border-dashed border-emerald-300 group-hover:border-emerald-400 transition-colors shrink-0" />
      <span className="font-medium">סמן כהושלם</span>
    </button>
  );
}
