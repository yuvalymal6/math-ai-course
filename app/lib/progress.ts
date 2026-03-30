/**
 * 3-Tier Progress Tracking System
 *
 * Dual-layer: localStorage (fast cache) + Supabase (persistent)
 * localStorage is the source of truth for UI, Supabase syncs in background.
 */

const STORAGE_KEY = "math-ai-progress";

export type LevelId = "basic" | "medium" | "advanced";
export type SubtopicProgress = Record<LevelId, boolean>;
export type AllProgress = Record<string, SubtopicProgress>;

// ─── localStorage layer (fast, synchronous) ─────────────────────────────────

function load(): AllProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: AllProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Supabase sync layer (background, async) ────────────────────────────────

function syncToSupabase(subtopicId: string, level: LevelId, completed: boolean): void {
  fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicId: subtopicId,
      exerciseId: level,
      completed,
    }),
  }).catch(() => {}); // fire-and-forget
}

/** Load progress from Supabase and merge into localStorage */
export async function syncFromSupabase(): Promise<void> {
  try {
    const res = await fetch("/api/progress");
    if (!res.ok) return;
    const { progress } = await res.json();
    if (!Array.isArray(progress)) return;

    const all = load();
    for (const row of progress) {
      const { topic_id, exercise_id, completed } = row as { topic_id: string; exercise_id: string; completed: boolean };
      if (!all[topic_id]) {
        all[topic_id] = { basic: false, medium: false, advanced: false };
      }
      if (exercise_id === "basic" || exercise_id === "medium" || exercise_id === "advanced") {
        all[topic_id][exercise_id as LevelId] = completed;
      }
    }
    save(all);
  } catch {}
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getSubtopicProgress(subtopicId: string): SubtopicProgress {
  const all = load();
  return all[subtopicId] || { basic: false, medium: false, advanced: false };
}

export function toggleLevel(subtopicId: string, level: LevelId): boolean {
  const all = load();
  if (!all[subtopicId]) {
    all[subtopicId] = { basic: false, medium: false, advanced: false };
  }
  all[subtopicId][level] = !all[subtopicId][level];
  save(all);
  // Sync to Supabase in background
  syncToSupabase(subtopicId, level, all[subtopicId][level]);
  return all[subtopicId][level];
}

export function markLevelComplete(subtopicId: string, level: LevelId): void {
  const all = load();
  if (!all[subtopicId]) {
    all[subtopicId] = { basic: false, medium: false, advanced: false };
  }
  all[subtopicId][level] = true;
  save(all);
  syncToSupabase(subtopicId, level, true);
}

export function getCompletedLevels(subtopicId: string): number {
  const p = getSubtopicProgress(subtopicId);
  return [p.basic, p.medium, p.advanced].filter(Boolean).length;
}

export function isSubtopicComplete(subtopicId: string): boolean {
  return getCompletedLevels(subtopicId) === 3;
}

export function getMainTopicProgress(subtopicIds: string[]): { done: number; total: number } {
  const done = subtopicIds.filter(id => isSubtopicComplete(id)).length;
  return { done, total: subtopicIds.length };
}

export function getAllProgress(): AllProgress {
  return load();
}
