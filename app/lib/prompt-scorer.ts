/**
 * prompt-scorer.ts — Learning Shield Protocol (shared)
 *
 * Dual-layer prompt scoring engine:
 *   Layer A (55 pts max): no block words (30) + pedagogical intent (25)
 *   Layer B (45 pts max): context-word matching (35 for 1 hit, 45 for 2+)
 *
 * Pass threshold: 75 pts
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreResult = { score: number; blocked: boolean; hint: string };

// ─── flexMatch ────────────────────────────────────────────────────────────────

/**
 * Substring match, case-insensitive.
 * Multi-word keywords require all parts to appear (anywhere in text).
 * Handles Hebrew word families naturally: "חיובי" matches "חיוביים".
 */
export function flexMatch(text: string, keyword: string): boolean {
  const t = text.toLowerCase();
  return keyword.toLowerCase().split(/\s+/).every(part => t.includes(part));
}

// ─── Layer A — Block words (abort) ───────────────────────────────────────────
//
// Any phrase that asks the AI to perform the calculation / reveal the answer
// directly. Score → 0, blocked = true.
// Hint: "⚠️ עליך לבצע את החישוב בעצמך. בקש מהמורה להדריך אותך בדרך לפתרון, לא לתת לך את התוצאה."

export const BLOCK_WORDS = [
  // original set
  "תפתור", "תביא תוצאה", "כמה זה", "חשב לי",
  // direct calculation imperatives
  "תחשב", "תחשב את", "תחשב סכום",
  "קבע", "תקבע",
  "תן פתרון", "תרשום את הפתרון",
  "בצע חישוב",
  "סכם לי",
  // answer-reveal phrases
  "מה הערך", "מה התוצאה", "מה יוצא",
  "תגיד לי כמה",
  "תמצא את", "תגלה לי",
  "תביא את התשובה",
];

// ─── Layer A — Pedagogical intent (~120 words) ────────────────────────────────
//
// Every word/phrase that signals the student is asking FOR GUIDANCE rather than
// asking for a direct answer. Groups: explain · guide · help · show · how/why ·
// steps · strategy · start · analyze · hint · understand · learn · misc.

export const PEDAGOGY_WORDS = [
  // הסבר — explain
  "תסביר", "הסבר", "תפרט", "פרט", "הבהר", "תבהיר", "הבהירה", "תבאר", "באר",
  "מה הכוונה", "מה פירוש", "מה אומר", "מה זה אומר", "תגלה",

  // הנחה — guide / direct
  "תכווין", "תכוון", "כווין", "כוון", "הכוון", "הנחה", "תנחה", "נחה",
  "מנחה", "תדריך", "הדרך", "הדרך אותי", "להכווין", "להנחות", "ליווי",
  "תלווה", "תנהל", "ינהל", "מנהל",

  // עזרה — help
  "עזור", "תעזור", "עזרה", "לעזור", "תסייע", "סייע", "סיוע", "תמוך",
  "לא מצליח", "קשה לי", "צריך עזרה", "תוכל לעזור", "תוכלי",
  "תסייע לי", "נסה לעזור", "בעיה", "תקוע", "תקועה",

  // הדגם — show / demonstrate
  "תראה", "הראה", "הדגם", "תדגים", "דוגמה", "דוגמא", "להדגים",
  "הדגמה", "תמחיש", "המחשה", "דוגמאות",

  // איך / כיצד — how
  "איך", "כיצד", "באיזה דרך", "מה הדרך", "מה עושים", "מה הצעד",
  "לגשת", "ניגשים", "כיצד ניגשים", "איפה מתחילים", "מה הכלי",
  "כיצד פותרים", "ביצוע", "מה צריך",

  // למה / מדוע — why
  "למה", "מדוע", "מה הסיבה", "בגלל מה", "מה הקשר", "ההגיון",
  "מה ההגיון", "מה הרציונל", "מה הנימוק", "מה הבסיס",

  // שלבים — steps / process
  "שלבים", "צעדים", "תהליך", "שלב", "צעד", "בשלבים", "לאט",
  "שלב אחר שלב", "ברצף", "סדר הפעולות", "תכנית", "מפת דרך",

  // שיטה — strategy / method
  "שיטה", "אסטרטגיה", "גישה", "מתודה", "מסלול", "דרך פתרון",
  "כלי", "כלים", "טכניקה", "פתרון", "אופן", "דרך",

  // התחלה — where to start
  "להתחיל", "מאיפה", "מהיכן", "ראשית", "קודם", "בהתחלה",
  "נקודת פתיחה", "נקודת התחלה", "מנקודה", "מה קודם", "מה ראשון",
  "מאין מתחילים", "מה הצעד הראשון",

  // ניתוח — analyze / break down
  "לנתח", "ניתוח", "לפרק", "לחלק", "לפשט", "לחקור", "חקירה",

  // רמז — hint
  "רמז", "תרמוז", "כיוון", "רמזים",

  // הבנה — understand
  "להבין", "הבנה", "לא מבין", "הסבר לי", "לוודא", "תוודא",
  "מה למדתי", "האם הבנתי",

  // לימוד — learn
  "ללמוד", "לדעת", "ללמד", "לגלות", "להכיר",

  // שונות — misc guidance signals
  "מה עלי", "מה אני צריך", "האם אפשר", "מה כדאי", "המלצה",
  "הצעה", "תציע", "הצע", "כדאי", "עלי לעשות",
  "בקשה", "אנא", "בבקשה", "נסה", "ינסה", "תוכל",
  "תסייע", "הנחות", "מה מומלץ", "מה הבא",
  "תוכן", "איזה", "מה הנוסחה", "איזו נוסחה",
];

// ─── Layer A — promptQualityCheck ─────────────────────────────────────────────

export function promptQualityCheck(text: string): {
  score: number;
  blocked: boolean;
  hint: string;
} {
  if (BLOCK_WORDS.some(w => text.includes(w))) {
    return {
      score: 0,
      blocked: true,
      hint: "⚠️ עליך לבצע את החישוב בעצמך. בקש מהמורה להדריך אותך בדרך לפתרון, לא לתת לך את התוצאה.",
    };
  }
  let score = 30;
  const hasPedagogy = PEDAGOGY_WORDS.some(w => flexMatch(text, w));
  if (hasPedagogy) score += 25;
  const hint = hasPedagogy
    ? ""
    : "הפרומפט שלך כללי מדי. נסה להוסיף ביטוי כמו \"תכווין אותי\" או \"תסביר לי\".";
  return { score, blocked: false, hint };
}

// ─── Layer B — exerciseValidator ──────────────────────────────────────────────

/**
 * @param contextWords  Per-step bank of topic-specific words.
 *
 * Scoring:
 *   0 hits → 0 pts
 *   1 hit  → 35 pts  (→ 90 total with pedagogy, passes 75 threshold)
 *   2+ hits → 45 pts  (→ 100 total)
 */
export function exerciseValidator(
  text: string,
  contextWords: string[],
): { score: number; hint: string } {
  const matched = contextWords.filter(w => flexMatch(text, w));
  const missing = contextWords.filter(w => !flexMatch(text, w));
  const score   = matched.length === 0 ? 0 : matched.length >= 2 ? 45 : 35;
  const hint    =
    matched.length === 0
      ? `נסה להזכיר מונח כמו "${missing[0]}" כדי שהשאלה תתייחס לנתוני הסעיף.`
      : `הפרומפט מעולה! הוסף מונח מתמטי אחד נוסף (למשל: "${missing[0]}") כדי שנוכל לצאת לדרך.`;
  return { score, hint };
}

// ─── Combined scorer ──────────────────────────────────────────────────────────

export function calculatePromptScore(
  text: string,
  contextWords: string[],
): ScoreResult {
  const quality = promptQualityCheck(text);
  if (quality.blocked) return { score: 0, blocked: true, hint: quality.hint };
  const exercise = exerciseValidator(text, contextWords);
  const total    = quality.score + exercise.score;
  const hint     = quality.hint || exercise.hint;
  return { score: total, blocked: false, hint };
}

// ─── Master Prompt Validator (Red / Advanced level) ───────────────────────────
//
// Five required clusters:
//   Role        — student defines AI as teacher/guide/mentor
//   Restriction — student forbids direct answers/solutions
//   Guidance    — student asks for guiding questions / hints
//   Subject     — student names the math topic (series)
//   Wait        — student asks AI to pause between sub-questions
//
// Scoring:
//   5 clusters → 90 (pass)  |  4 → 85 (pass)  |  3 → 70  |  2 → 50  |  1 → 30  |  0 → 10
//   Length bonus: +2 pts ≥100 words, +5 pts total ≥140 words (capped 100)
//   Anti-copy: Jaccard > 0.30 vs knownPrompts → score 0, blocked=true
//
// Pass threshold: score ≥ 85

export type MasterCluster = "role" | "restriction" | "guidance" | "subject" | "wait";

export type MasterPromptResult = {
  score: number;
  passed: boolean;
  isBlocked: boolean;
  clustersPassed: MasterCluster[];
  clustersMissing: MasterCluster[];
  hint: string;
};

const MASTER_ROLE_WORDS = [
  "מורה", "מדריך", "חונך", "מנטור", "עוזר", "תחנך", "תלמד אותי", "tutor", "חניכה",
  "guide", "mentor", "מלווה", "מלמד", "מרצה", "מאמן",
  "סיוע", "הדרכה", "יועץ", "מנחה",
];

const MASTER_RESTRICTION_WORDS = [
  "אל תפתור", "בלי פתרון", "בלי תשובה", "אל תגלה", "אל תחשב",
  "בלי ספוילר", "רק רמז", "בלי תוצאה", "אל תענה", "לא לפתור", "מניעת פתרון",
];

const MASTER_GUIDANCE_WORDS = [
  "תסביר", "הסבר", "תסבירי", "תלמד", "ללמד", "לימוד", "הדרכה",
  "תדריך", "תנחה", "הנחיה", "איך", "כיצד", "דרך", "שיטה",
  "צעדים", "שלבים", "לוגיקה", "עקרון", "להבין", "הבנה",
  "עזרה", "תכוון", "להכווין", "ביאור", "פרשנות",
];

// Default subject words — fallback for topics that don't pass subjectWords prop.
// Each topic page passes its own subjectWords for precise matching.
const MASTER_SUBJECT_WORDS = [
  // series
  "סדרה", "סדרות", "חשבונית", "הנדסית", "כלל נסיגה",
  "סדרה חשבונית", "סדרה הנדסית", "arithmetic", "geometric",
  // geometry / rectangle
  "מקבילית", "מלבן", "מרובע", "זוויות ישרות", "אלכסונים שווים",
  "90 מעלות", "חפיפה", "הוכחה",
];

const MASTER_WAIT_WORDS = [
  "חכה", "תחכה", "תעצור", "עצור", "המתנה", "שלב אחר שלב",
  "סעיף סעיף", "אחד אחד", "חתימה", "נוהל סיום", "אל תמשיך", "תמתין",
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function validateMasterPrompt(
  text: string,
  knownPrompts: string[] = [],
  subjectWords?: string[],
  guidanceWords?: string[],
  waitWords?: string[],
): MasterPromptResult {
  const effectiveSubjectWords  = subjectWords  ?? MASTER_SUBJECT_WORDS;
  const effectiveGuidanceWords = guidanceWords ?? MASTER_GUIDANCE_WORDS;
  const effectiveWaitWords     = waitWords     ?? MASTER_WAIT_WORDS;
  const t = text.toLowerCase();

  // Anti-copy check
  for (const known of knownPrompts) {
    if (jaccardSimilarity(text, known) > 0.30) {
      return {
        score: 0, passed: false, isBlocked: true,
        clustersPassed: [],
        clustersMissing: ["role", "restriction", "guidance", "subject", "wait"],
        hint: "⚠️ זוהתה העתקה מרמות קודמות. האתגר האדום דורש הנחיה חדשה ומפורטת יותר.",
      };
    }
  }

  const hasRole        = MASTER_ROLE_WORDS.some(w => t.includes(w.toLowerCase()));
  const hasRestriction = MASTER_RESTRICTION_WORDS.some(w => t.includes(w.toLowerCase()));
  const hasGuidance    = effectiveGuidanceWords.some(w => t.includes(w.toLowerCase()));
  const hasSubject     = effectiveSubjectWords.some(w => t.includes(w.toLowerCase()));
  const hasWait        = effectiveWaitWords.some(w => t.includes(w.toLowerCase()));

  const clustersPassed: MasterCluster[] = [];
  const clustersMissing: MasterCluster[] = [];
  if (hasRole)        clustersPassed.push("role");        else clustersMissing.push("role");
  if (hasRestriction) clustersPassed.push("restriction"); else clustersMissing.push("restriction");
  if (hasGuidance)    clustersPassed.push("guidance");    else clustersMissing.push("guidance");
  if (hasSubject)     clustersPassed.push("subject");     else clustersMissing.push("subject");
  if (hasWait)        clustersPassed.push("wait");        else clustersMissing.push("wait");

  const n = clustersPassed.length;
  let base = n === 5 ? 90 : n === 4 ? 85 : n === 3 ? 70 : n === 2 ? 50 : n === 1 ? 30 : 10;

  // Length bonus (only when base ≥ 50)
  if (base >= 50) {
    const wc = wordCount(text);
    if (wc >= 140) base = Math.min(100, base + 5);
    else if (wc >= 100) base = Math.min(100, base + 2);
  }

  const score  = base;
  const passed = score >= 85;

  const CLUSTER_LABELS: Record<MasterCluster, string> = {
    role:        "להגדיר לו תפקיד (מורה / מדריך)",
    restriction: "לא לגלות את התשובה",
    guidance:    "לבקש הדרכה מתודולוגית",
    subject:     "להזכיר את הנושא המתמטי",
    wait:        "לעצור בין סעיף לסעיף",
  };

  let hint = "";
  if (!passed) {
    if (n === 0) {
      hint = "⚠️ רגע! לפני שמתחילים את האתגר המתקדם, עליך להנחות את ה-AI ב-5 נושאים: תפקיד מורה, איסור פתרון, בקשת הדרכה, ציון הנושא המתמטי, ודרישת המתנה בין סעיפים.";
    } else {
      const missing = clustersMissing.map(k => CLUSTER_LABELS[k]).join(", ");
      hint = `💡 כמעט (${n}/5)! שכחת: ${missing}. הוסף זאת כדי להתחיל.`;
    }
  }

  return { score, passed, isBlocked: false, clustersPassed, clustersMissing, hint };
}
