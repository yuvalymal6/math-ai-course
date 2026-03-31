"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { getSubtopicProgress, toggleLevel, syncFromSupabase, type LevelId } from "@/app/lib/progress";

const LEVEL_COLORS: Record<LevelId, {
  border: string; hoverBorder: string; text: string; hoverText: string;
  hoverBg: string; dashBorder: string; dashHover: string; bg: string;
}> = {
  basic: {
    border: "border-green-300", hoverBorder: "hover:border-green-500",
    text: "text-green-700", hoverText: "hover:text-green-800",
    hoverBg: "hover:bg-green-50", dashBorder: "border-green-300",
    dashHover: "group-hover:border-green-500", bg: "bg-green-50/60",
  },
  medium: {
    border: "border-orange-300", hoverBorder: "hover:border-orange-500",
    text: "text-orange-700", hoverText: "hover:text-orange-800",
    hoverBg: "hover:bg-orange-50", dashBorder: "border-orange-300",
    dashHover: "group-hover:border-orange-500", bg: "bg-orange-50/60",
  },
  advanced: {
    border: "border-red-300", hoverBorder: "hover:border-red-500",
    text: "text-red-700", hoverText: "hover:text-red-800",
    hoverBg: "hover:bg-red-50", dashBorder: "border-red-300",
    dashHover: "group-hover:border-red-500", bg: "bg-red-50/60",
  },
};

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

  // Completed state — always green regardless of level
  if (done) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 rounded-xl font-bold text-sm transition-all duration-300 bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600"
      >
        <Check size={18} strokeWidth={3} />
        הושלם! ✓
      </button>
    );
  }

  // Idle state — color based on current level
  const c = LEVEL_COLORS[level] || LEVEL_COLORS.basic;
  return (
    <button
      onClick={handleClick}
      className={`group flex items-center justify-center gap-2.5 w-full py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${c.bg} border ${c.border} ${c.hoverBorder} ${c.text} ${c.hoverText} ${c.hoverBg}`}
    >
      <span className={`w-4.5 h-4.5 rounded-full border-2 border-dashed ${c.dashBorder} ${c.dashHover} transition-colors shrink-0`} style={{ width: 18, height: 18 }} />
      <span>סמן כהושלם</span>
    </button>
  );
}
