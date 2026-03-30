/**
 * 3-Tier Progress Tracking System
 *
 * Structure in localStorage (key: "math-ai-progress"):
 * {
 *   "grade10-statistics/central": { basic: true, medium: false, advanced: false },
 *   "grade10-algebra/parabola":   { basic: true, medium: true, advanced: true },
 *   ...
 * }
 *
 * Tier 1: Exercise level (basic/medium/advanced) — toggled by "סמן כהושלם" button
 * Tier 2: Sub-topic complete when all 3 levels are done (triggers confetti)
 * Tier 3: Main topic complete when all sub-topics are done
 */

const STORAGE_KEY = "math-ai-progress";

export type LevelId = "basic" | "medium" | "advanced";
export type SubtopicProgress = Record<LevelId, boolean>;
export type AllProgress = Record<string, SubtopicProgress>;

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

/** Get progress for a specific sub-topic */
export function getSubtopicProgress(subtopicId: string): SubtopicProgress {
  const all = load();
  return all[subtopicId] || { basic: false, medium: false, advanced: false };
}

/** Toggle a level's completion state */
export function toggleLevel(subtopicId: string, level: LevelId): boolean {
  const all = load();
  if (!all[subtopicId]) {
    all[subtopicId] = { basic: false, medium: false, advanced: false };
  }
  all[subtopicId][level] = !all[subtopicId][level];
  save(all);
  return all[subtopicId][level];
}

/** Mark a level as complete (no toggle) */
export function markLevelComplete(subtopicId: string, level: LevelId): void {
  const all = load();
  if (!all[subtopicId]) {
    all[subtopicId] = { basic: false, medium: false, advanced: false };
  }
  all[subtopicId][level] = true;
  save(all);
}

/** Count completed levels for a sub-topic (0-3) */
export function getCompletedLevels(subtopicId: string): number {
  const p = getSubtopicProgress(subtopicId);
  return [p.basic, p.medium, p.advanced].filter(Boolean).length;
}

/** Check if a sub-topic is fully complete (3/3) */
export function isSubtopicComplete(subtopicId: string): boolean {
  return getCompletedLevels(subtopicId) === 3;
}

/**
 * Count completed sub-topics for a main topic.
 * @param subtopicIds - array of sub-topic IDs belonging to this main topic
 */
export function getMainTopicProgress(subtopicIds: string[]): { done: number; total: number } {
  const done = subtopicIds.filter(id => isSubtopicComplete(id)).length;
  return { done, total: subtopicIds.length };
}

/** Get all progress data (for dashboard) */
export function getAllProgress(): AllProgress {
  return load();
}
