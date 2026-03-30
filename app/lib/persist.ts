/**
 * Simple localStorage persistence for exercise state.
 * Each exercise page gets a unique key based on its route.
 */

export function saveState<T>(key: string, state: T): void {
  try {
    localStorage.setItem(`math-progress:${key}`, JSON.stringify(state));
  } catch {}
}

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`math-progress:${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

export function clearState(key: string): void {
  try {
    localStorage.removeItem(`math-progress:${key}`);
  } catch {}
}
