"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "../chat-context";
import {
  X, Send, Bot, Loader2, Camera, ChevronDown,
  FileText, Copy, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  imageUrl?: string;
  isSummary?: boolean;
};

// ─── Content maps ─────────────────────────────────────────────────────────────

const TOPIC_LABELS: Record<string, string> = {
  calculus:    'חדו"א',
  analytic:    "גיאומטריה אנליטית",
  kitzun:      "בעיות קיצון",
  probability: "הסתברות",
  statistics:  "סטטיסטיקה",
  grade10:     "כיתה י׳",
  "":          "מתמטיקה כללי",
};

const WELCOME: Record<string, string> = {
  calculus:    'שלום! אני מורה ה-AI שלך לחדו"א 📈\n\nעובד על חקירה, נגזרת או פונקציה? ספר לי איפה אתה עומד ונתקדם יחד.',
  analytic:    "שלום! כאן לעזור עם גיאומטריה אנליטית 📐\n\nקו ישר, מעגל או משיק? נגדיר את הסביבה ונתחיל לבנות.",
  kitzun:      "שלום! קיצון הוא תרגום מסיפור לפונקציה 🎯\n\nמה הבעיה? ספר לי ונזהה את פונקציית המטרה ואת האילוץ יחד.",
  probability: "שלום! הסתברות מתחילה בשרטוט עץ 🎲\n\nמה הניסוי? כמה שלבים? עם החזרה או בלי?",
  statistics:  "שלום! סטטיסטיקה היא אמנות קריאת נתונים 📊\n\nמה הנתונים שיש לך? נסדר אותם ונחשב ממוצע וחציון יחד.",
  grade10:     "שלום! אני מורה ה-AI שלך לכיתה י׳ 📐\n\nעובד על פרבולות, טריגונומטריה או גיאומטריה? ספר לי על התרגיל ונתחיל לפתור יחד.",
  "":          "שלום! אני מורה ה-AI שלך למתמטיקה 🤖\n\nעל מה אתה עובד היום? תוכל גם לצלם שאלה מהמחברת שלך!",
};

const HINTS: Record<string, string[]> = {
  calculus: [
    "חשוב על הנגזרת כמדד לשיפוע הפונקציה. בנקודת קיצון — מה קורה לנגזרת? נסה לשוות אותה לאפס ופתור.",
    "לפני שגוזרים — האם פרסת את כל הסוגריים? זכור כלל השרשרת: d/dx[f(g(x))] = f′(g(x))·g′(x).",
    "בעיית חקירה: f′(x)→קיצוניים, f′′(x)→קעורות. ודא שהוכחת שכל נקודה חשודה היא אכן קיצון.",
  ],
  analytic: [
    "ניצב ל-קו עם שיפוע m — השיפוע הניצב הוא −1/m. שלילי ✓ והופכי ✓. אם m=0 הניצב הוא קו אנכי!",
    "להוכיח שנקודה על מעגל: הצב את קואורדינטותיה במשוואה. אם שני הצדדים שווים — הנקודה על המעגל.",
    "הניצב מהמרכז למיתר תמיד מחצה את המיתר. שרטט משולש ישר-זווית ← פיתגורס → רדיוס.",
  ],
  kitzun: [
    "שלב ראשון: מה פונקציית המטרה (מה למקסם/למזער)? מה האילוץ? כתוב שניהם בנפרד.",
    "הצב את האילוץ בפונקציית המטרה כדי לקבל פונקציה במשתנה אחד. רק אחרי כן תגזור.",
    "אל תשכח תחום הגדרה! x ו-y חייבים להיות חיוביים. תחום ההגדרה מגדיר את גבולות החיפוש.",
  ],
  probability: [
    "שרטט עץ הסתברות. ודא שסכום כל הענפים מכל צומת = 1. הסתברות נתיב = מכפלת הענפים לאורכו.",
    "הסתברות מותנית: P(A|B) = P(A∩B) / P(B). זיהית מה A ומה B? מה 'מרחב המדגם המצומצם'?",
    "עם החזרה: מכנה קבוע בכל שלב. בלי החזרה: המכנה יורד — מ-5 כדורים נשארים 4.",
  ],
  statistics: [
    "יש outlier? ממוצע מושפע מאוד מקיצוניים — חציון הרבה פחות. איזה מדד מתאים כאן?",
    "סטיית תקן = ריחוק ממוצע מהממוצע. ערך גבוה = נתונים פזורים. ערך נמוך = מרוכזים.",
    "שינוי לינארי +c: ממוצע עולה ב-c, σ לא משתנה! ×k: שניהם מוכפלים ב-k.",
  ],
  grade10: [
    "פרבולה: קודקוד ב- x = −b/(2a). ה-a קובע אם פתוחה למעלה (a>0) או למטה (a<0).",
    "טריגונומטריה: SOH-CAH-TOA. תמיד ודא שאתה יודע איזה צלע היא ה׳יתר׳ — היא מול זווית ישרה.",
    "הוכחה גיאומטרית: שרטט, סמן ידוע ולא ידוע, ובחר משפט (מרובע, מעגל, דמיון) שמקשר אותם.",
  ],
};

const GEOMETRIC_EXPLANATIONS: Record<string, string> = {
  calculus:    "הנגזרת היא הגיאומטריה של הפונקציה 📐\n• f′(x) > 0 → פונקציה עולה\n• f′(x) < 0 → פונקציה יורדת\n• f′(x) = 0 → קיצון אפשרי\n• f′′(x) → קעורות/קמורות\n\nאיזה מהמשפטים האלה רלוונטי לשאלה שלך?",
  analytic:    "בגיאומטריה אנליטית כל נוסחה אלגברית מייצגת תכונה גיאומטרית ויזואלית 📐\n• m₁·m₂=−1 → שני קווים ניצבים\n• מרחק נקודה-קו = גובה מהנקודה לקו\n• הניצב מהמרכז מחצה כל מיתר\n• מרחק מרכז-משיק = r בדיוק\n\nעל איזה משפט אתה רוצה להרחיב?",
  kitzun:      "בבעיות קיצון הגיאומטריה עוזרת לזהות את האילוץ 🎯\n• גידור: סך הגדרות = אורך קבוע\n• חלון: היקף = צלעות + קשת\n• עיגול + מלבן: אזורים חולקים צלע משותפת\n\nשרטוט תמיד עוזר!",
  probability: "בהסתברות הגיאומטריה היא עץ ההסתברות 🌳\n• כל ענף = תוצאה אפשרית\n• הסתברות נתיב = מכפלת הענפים\n• אירועים מתאימים = סכום הנתיבים\n• הסתברות מותנית = 'קיצוץ' ענפים שלא קרו",
  statistics:  "בסטטיסטיקה הגיאומטריה היא הגרף 📊\n• גרף נקודות: כל נקודה = ערך\n• ממוצע = 'מרכז כובד'\n• חציון = מחלק לשניים שווים\n• σ = ריחוק ממוצע מהמרכז",
  grade10:     "בכיתה י׳ הגיאומטריה מחברת אלגברה ועולם ויזואלי 📐\n• פרבולה: ציר סימטריה חוצה את הקודקוד. שורשים = נקודות חיתוך עם ציר x\n• טריגונומטריה: sin/cos/tan הם יחסי צלעות — לא מספרים סתמיים!\n• מרובעים: כל תכונה (אלכסונות, זוויות) ניתנת להוכחה מהגדרה\n\nעל איזה נושא רוצה להעמיק?",
  "":          "כל שלב אלגברי מייצג תכונה גיאומטרית! ספר לי על הנוסחה שבלבלה אותך ואסביר את הרעיון שמאחוריה.",
};

// ── "Analyze image" responses (generic: new question) ─────────────────────────
const IMAGE_ANALYZE: Record<string, string> = {
  calculus:    "אני רואה תרגיל חדו\"א 📈 נראה יש פונקציה לחקור.\n\nלפני שנתחיל — זיהית מה הפונקציה? מה מבקשים: קיצון, תחום, אסימפטוטה? שתף אותי ונבנה את הפתרון שלב אחר שלב.",
  analytic:    "אני רואה תרגיל גיאומטריה אנליטית 📐 יש כאן נקודות ומשוואות.\n\nזיהית את סוג הבעיה — קו ישר, מעגל, או שניהם? ספר לי ונתקדם.",
  kitzun:      "אני רואה בעיית קיצון 🎯 יש כאן סיפור עם אילוץ ופונקציית מטרה.\n\nלפני שגוזרים — מה אנחנו רוצים למקסם/למזער? מה האילוץ?",
  probability: "אני רואה שאלת הסתברות 🎲 נראה יש ניסוי עם כמה שלבים.\n\nכמה שלבים יש? מה האפשרויות בכל שלב? נשרטט עץ יחד.",
  statistics:  "אני רואה תרגיל סטטיסטיקה 📊 בוא נסדר את הנתונים קודם בטבלה.\n\nמה סדרת הנתונים? נחשב ממוצע וחציון יחד.",
  grade10:     "אני רואה שאלת כיתה י׳ 📐 נראה מעניין!\n\nזיהית את הנושא — פרבולה, טריגונומטריה, או גיאומטריה? ספר לי מה הנתונים ומה מבקשים ונתחיל לפתור.",
  "":          "אני רואה שאלת מתמטיקה מעניינת 🤔 בוא נעבוד עליה יחד!\n\nספר לי — באיזה נושא? (חדו\"א, הסתברות, סטטיסטיקה...) ונתחיל.",
};

// ── "Check my work" invitation ────────────────────────────────────────────────
const CHECK_WORK_INVITE =
  "בשמחה! שלח לי צילום של מה שכתבת במחברת, ואני אעבור על השלבים שלך 📸\n\n(לחץ על סמל המצלמה למטה)";

// ── "Check my work" feedback after image ─────────────────────────────────────
const CHECK_WORK_FEEDBACK: Record<string, string> = {
  calculus:
    "עברתי על הפתרון שלך 🔍\n\n✅ הגישה הכללית נכונה — זיהית קיצוניים\n⚠️ שכחת את הנגזרת הפנימית — כלל השרשרת חובה: (f∘g)′ = f′(g)·g′\n⚠️ תחום ההגדרה לא צוין — בכל חקירה חובה לפתוח איתו!\n\n💡 תיקון: הוסף g′(x) לכל נגזרת מורכבת. נסה שוב!",
  analytic:
    "עברתי על הפתרון שלך 🔍\n\n✅ חישבת נכון את המרחק בין הנקודות\n⚠️ שיפוע ניצב: כתבת m⊥ = 1/m — שכחת להפוך את הסימן! הנכון: m⊥ = −1/m\n⚠️ בדוק: האם הגדרת למה כל משתנה שווה לפני שהתחלת?\n\n💡 זכור: ניצב = שלילי ✓ + הופכי ✓. אם m=3 אז m⊥ = −⅓",
  kitzun:
    "עברתי על הפתרון שלך 🔍\n\n✅ זיהית נכון את פונקציית המטרה\n⚠️ לא הוכחת שהקיצון שמצאת הוא מקסימום — זה חלק חובה בפתרון!\n⚠️ תחום ההגדרה לא צוין — x ו-y חייבים להיות חיוביים\n\n💡 אחרי f′(x)=0: הוכח עם f′′(x) < 0 (מקסימום) או טבלת מונוטוניות.",
  probability:
    "עברתי על הפתרון שלך 🔍\n\n✅ שרטטת עץ הסתברות — מצוין!\n⚠️ שליפה בלי החזרה: בשלב השני לא הורדת 1 מהמכנה. היו 5 כדורים ← נשארו 4\n⚠️ ודא שסכום ענפי כל שלב שווה בדיוק ל-1\n\n💡 בכל שלב שאל: האם הפריט חוזר? אם לא — המכנה יורד ב-1.",
  statistics:
    "עברתי על הפתרון שלך 🔍\n\n✅ חישבת ממוצע נכון\n⚠️ חציון: לא סידרת את הסדרה בסדר עולה לפני חישוב — זהו שלב חובה!\n⚠️ לא בדקת האם יש outlier שמשפיע על הממוצע\n\n💡 תמיד: מיין הסדרה → חציון; בדוק outlier → החלט מה מייצג יותר טוב.",
  grade10:
    "עברתי על הפתרון שלך 🔍\n\n✅ הגדרת נכון את הפרבולה/פונקציה\n⚠️ קודקוד: ודא שחישבת x = −b/(2a) ואז הצבת חזרה לפונקציה כדי לקבל את y\n⚠️ שורשים: אם השתמשת בנוסחת השורשים, בדוק את הדיסקרימיננטה Δ = b²−4ac\n\n💡 אחרי הפתרון — שרטט ובדוק: הקודקוד בין השורשים? סימן a מסביר לאיזה כיוון הפרבולה?",
  "":
    "עברתי על הפתרון שלך 🔍\n\nכמה דברים לשים לב אליהם:\n⚠️ ודא שכתבת את תחום ההגדרה\n⚠️ בדוק כל צעד — האם שמרת שוויון בשני הצדדים?\n⚠️ אמת את התשובה הסופית בהצבה חזרה\n\n💡 קרא את הפתרון בקול — לפעמים זה עוזר לזהות טעויות!",
};

// ── Session summary ───────────────────────────────────────────────────────────
const TOPIC_SUMMARIES: Record<string, string[]> = {
  calculus: [
    "נגזרת = שיפוע הפונקציה — f′(x)=0 בנקודת קיצון",
    "כלל שרשרת: (f∘g)′ = f′(g)·g′ — אל תשכח את הנגזרת הפנימית!",
    "חקירה: f′→קיצוניים, f′′→קעורות. תחום הגדרה תמיד ראשון.",
  ],
  analytic: [
    "שיפוע ניצב: m⊥ = −1/m (שלילי + הופכי)",
    "מרחק מרכז-משיק = r בדיוק. הניצב מהמרכז מחצה כל מיתר.",
    "השלמה לריבוע: x²+bx = (x+b/2)² − (b/2)²",
  ],
  kitzun: [
    "פונקציית מטרה + אילוץ → פונקציה במשתנה אחד, ואז גוזרים",
    "תמיד הוכח קיצון: f′′(x) < 0 = מקסימום, f′′(x) > 0 = מינימום",
    "תחום הגדרה חובה: x,y חיוביים, ובדוק גבולות הגיוניים",
  ],
  probability: [
    "עץ הסתברות: סכום ענפי כל צומת = 1. נתיב = מכפלה לאורכו.",
    "עם החזרה: מכנה קבוע. בלי החזרה: מכנה יורד ב-1 בכל שלב.",
    "P(A|B) = P(A∩B)/P(B) — הסתברות מותנית מצמצמת את מרחב המדגם",
  ],
  statistics: [
    "ממוצע מושפע מ-outliers; חציון יציב יותר. בחר את המדד הנכון!",
    "מיין הסדרה לפני חישוב חציון — זה שלב חובה",
    "שינוי +c: ממוצע עולה ב-c, σ לא משתנה. ×k: שניהם מוכפלים ב-k",
  ],
  grade10: [
    "קודקוד פרבולה: x = −b/(2a), ואז הצב חזרה לפונקציה לחישוב y",
    "טריגונומטריה: sin = נגדי/יתר, cos = צמוד/יתר, tan = נגדי/צמוד",
    "הוכחה גיאומטרית: שרטט → סמן נתון ומבוקש → בחר משפט → הסק",
  ],
  "": [
    "פרק כל שאלה: מה נתון? מה מבקשים? איזה כלי מתמטי?",
    "תמיד כתוב תחום הגדרה ואמת תשובה בהצבה חזרה",
    "שאלות טובות הן חצי מהפתרון — המשך לשאול!",
  ],
};

function generateSummary(topic: string, exchangeCount: number): string {
  const rules = TOPIC_SUMMARIES[topic] || TOPIC_SUMMARIES[""];
  const topicName = TOPIC_LABELS[topic] || "מתמטיקה";
  const lines = rules.map((r, i) => `${["1️⃣", "2️⃣", "3️⃣"][i]} ${r}`).join("\n");
  return `📋 סיכום השיחה — ${topicName}\n\n${lines}\n\n✅ עבדנו על ${exchangeCount} שאלות יחד. כל הכבוד — המשך כך!`;
}

// ─── AI response engine ───────────────────────────────────────────────────────

// Fallback used when no API key is configured or the API call fails
function getFallbackResponse(msg: string, topic: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("רמז") || lower.includes("עזרה") || lower.includes("hint")) {
    const pool = HINTS[topic] || HINTS["calculus"];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (lower.includes("תבדוק") || lower.includes("פתרון")) {
    return CHECK_WORK_INVITE;
  }
  if (lower.includes("משפט גיאומטרי") || lower.includes("הסבר") || lower.includes("למה")) {
    return GEOMETRIC_EXPLANATIONS[topic] || GEOMETRIC_EXPLANATIONS[""];
  }
  if (lower.includes("לא הבנתי") || lower.includes("שוב") || lower.includes("מה זה")) {
    return "בכיף! בוא נפרק לחלקים קטנים יותר.\n\nאיזה חלק ספציפית לא ברור — הנוסחה, הצעד הראשון, או הרעיון הכללי?";
  }
  if (lower.includes("תודה") || lower.includes("הבנתי")) {
    return "מעולה! שמח שעזרתי 🎉\n\nאם יש עוד שאלות — אני כאן. בהצלחה בתרגול!";
  }
  const topicLabel = TOPIC_LABELS[topic] || "מתמטיקה";
  const fallbacks = [
    `שאלה מעניינת ב${topicLabel}! בוא נחשוב יחד.\n\nמה כבר ניסית? ספר לי את הגישה שלך ונבנה משם.`,
    "אני כאן לעזור! ספר לי יותר — מה נתון ומה מבקשים?",
    "שאלות טובות הן חצי מהפתרון.\n\nנסה לפרק: מה ידוע? מה לא ידוע? מה הקשר ביניהם?",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Calls the Socratic tutor API with streaming; returns the full response text.
// Falls back to the local mock if the request fails.
async function getSocraticResponse(
  history: { role: "user" | "assistant"; content: string }[],
  topic: string,
): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, topic }),
    });
    if (!res.ok || !res.body) throw new Error("API error");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    return text.trim() || getFallbackResponse(history[history.length - 1]?.content ?? "", topic);
  } catch {
    return getFallbackResponse(history[history.length - 1]?.content ?? "", topic);
  }
}

// ─── Quick chips ──────────────────────────────────────────────────────────────

const CHIPS = [
  { id: "hint",       label: "💡 צריך רמז",        msg: "תן לי רמז לשאלה" },
  { id: "checkwork",  label: "✍️ תבדוק פתרון",     msg: "תבדוק לי את הפתרון" },
  { id: "geometric",  label: "📐 הסבר גיאומטרי",   msg: "תסביר לי את המשפט הגיאומטרי" },
  { id: "again",      label: "🔁 לא הבנתי, שוב",   msg: "לא הבנתי, תסביר שוב אחרת" },
];

// ─── Summary copy button ──────────────────────────────────────────────────────

function CopySummaryBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#00d4ff] transition-colors mt-2"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "הועתק!" : "העתק סיכום"}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatDrawer() {
  const { isOpen, topic, closeChat } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // API history: only user/assistant turns (no image-only messages)
  const apiHistoryRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  // Ref that stays in sync with state — safe to use inside async closures
  const waitingForCheckWorkRef = useRef(false);
  const [waitingForCheckWork, setWaitingForCheckWorkState] = useState(false);
  const setWaitingForCheckWork = (v: boolean) => {
    waitingForCheckWorkRef.current = v;
    setWaitingForCheckWorkState(v);
  };

  // Reset & welcome message each time drawer opens
  useEffect(() => {
    if (isOpen) {
      setInput("");
      setIsTyping(false);
      setWaitingForCheckWork(false);
      apiHistoryRef.current = [];
      setMessages([{ id: "welcome", role: "ai", text: WELCOME[topic] || WELCOME[""] }]);
    }
  }, [isOpen, topic]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
  };

  const sendMessage = async (text: string, imageUrl?: string) => {
    if ((!text.trim() && !imageUrl) || isTyping) return;
    const capturedTopic = topic;
    const isCheckWorkImage = imageUrl && waitingForCheckWorkRef.current;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim(), imageUrl };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsTyping(true);

    // Clear the "waiting for check-work image" flag once image arrives
    if (imageUrl) setWaitingForCheckWork(false);

    let aiText: string;

    if (isCheckWorkImage) {
      // Image in check-work flow → canned feedback (no API call for images)
      await new Promise(r => setTimeout(r, 2600));
      aiText = CHECK_WORK_FEEDBACK[capturedTopic] || CHECK_WORK_FEEDBACK[""];
    } else if (imageUrl) {
      // Generic image analysis → canned response
      await new Promise(r => setTimeout(r, 2600));
      aiText = IMAGE_ANALYZE[capturedTopic] || IMAGE_ANALYZE[""];
    } else {
      // Text message → real Socratic API call
      apiHistoryRef.current.push({ role: "user", content: text.trim() });
      aiText = await getSocraticResponse([...apiHistoryRef.current], capturedTopic);
      apiHistoryRef.current.push({ role: "assistant", content: aiText });
      // Arm check-work flag if the AI invited an image upload
      if (aiText === CHECK_WORK_INVITE) setWaitingForCheckWork(true);
    }

    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "ai", text: aiText }]);
    setIsTyping(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = waitingForCheckWorkRef.current
      ? "הנה הפתרון שלי — תעבור עליו בבקשה"
      : "צילמתי שאלה מהמחברת — תנתח בבקשה";
    const reader = new FileReader();
    reader.onload = () => sendMessage(label, reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSummary = () => {
    const exchangeCount = Math.floor((messages.length - 1) / 2);
    const summaryText = generateSummary(topic, exchangeCount);
    setMessages(prev => [...prev, {
      id: "summary-" + Date.now(),
      role: "ai",
      text: summaryText,
      isSummary: true,
    }]);
  };

  const lastMsgHasImage =
    messages.length > 0 &&
    messages[messages.length - 1].role === "user" &&
    !!messages[messages.length - 1].imageUrl;

  const topicLabel = TOPIC_LABELS[topic];
  // Show summary button after at least 2 full exchanges (5+ messages)
  const canSummarize = messages.length >= 5;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeChat}
      />

      {/* ── Drawer panel ── */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col bg-[#0a0f1e] border-l border-slate-800 shadow-[-8px_0_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-[#0f172a] shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/15 border border-[#00d4ff]/30 flex items-center justify-center shrink-0">
            <Bot size={20} className="text-[#00d4ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">מורה AI</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                מחובר
              </span>
              {topicLabel && (
                <span className="bg-[#00d4ff]/10 border border-[#00d4ff]/25 text-[#00d4ff] text-xs px-2 py-0.5 rounded-full">
                  {topicLabel}
                </span>
              )}
            </div>
          </div>

          {/* Summary button */}
          {canSummarize && (
            <button
              onClick={handleSummary}
              title="סיכום שיחה"
              className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-[#00d4ff] transition-colors shrink-0"
            >
              <FileText size={15} />
            </button>
          )}

          <button
            onClick={closeChat}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-white transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── "Waiting for image" banner ── */}
        {waitingForCheckWork && (
          <div className="mx-4 mt-3 shrink-0 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 animate-[fadeSlideIn_0.3s_ease-out]">
            <Camera size={14} className="text-amber-400 shrink-0 animate-pulse" />
            <p className="text-amber-300 text-xs font-medium">ממתין לצילום הפתרון שלך — לחץ על סמל המצלמה למטה</p>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5" dir="rtl">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* AI avatar */}
              {msg.role === "ai" && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5 border ${
                  msg.isSummary
                    ? "bg-emerald-900/40 border-emerald-600/40"
                    : "bg-[#00d4ff]/15 border-[#00d4ff]/30"
                }`}>
                  {msg.isSummary
                    ? <FileText size={12} className="text-emerald-400" />
                    : <Bot size={13} className="text-[#00d4ff]" />
                  }
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line break-words ${
                  msg.role === "user"
                    ? "bg-[#00d4ff]/15 border border-[#00d4ff]/30 text-white rounded-tr-sm"
                    : msg.isSummary
                      ? "bg-emerald-950/50 border border-emerald-700/40 text-emerald-100 rounded-tl-sm"
                      : "bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-tl-sm"
                }`}
              >
                {msg.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.imageUrl}
                    alt="שאלה שצולמה"
                    className="w-full rounded-xl mb-3 max-h-48 object-contain bg-black/30"
                  />
                )}
                {msg.text}
                {msg.isSummary && <CopySummaryBtn text={msg.text} />}
              </div>
            </div>
          ))}

          {/* ── Typing / Analyzing / Checking indicator ── */}
          {isTyping && (
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-[#00d4ff]/15 border border-[#00d4ff]/30 flex items-center justify-center shrink-0 mb-0.5">
                <Bot size={13} className="text-[#00d4ff]" />
              </div>
              <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3">
                {lastMsgHasImage && waitingForCheckWorkRef.current === false ? (
                  // Image uploaded in check-work flow (flag already cleared)
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Loader2 size={13} className="animate-spin" />
                    <span>בודק עבודה... 🔍</span>
                  </div>
                ) : lastMsgHasImage ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 size={13} className="animate-spin text-[#00d4ff]" />
                    <span>מנתח תמונה...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 h-4">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-slate-500 animate-bounce"
                        style={{ animationDelay: `${i * 160}ms`, animationDuration: "1s" }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Quick chips ── */}
        <div className="px-4 pt-2 pb-3 shrink-0 border-t border-slate-800/60" dir="rtl">
          <div
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {CHIPS.map(chip => (
              <button
                key={chip.id}
                onClick={() => sendMessage(chip.msg)}
                disabled={isTyping}
                className={`shrink-0 border text-xs px-3 py-1.5 rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${
                  chip.id === "checkwork" && waitingForCheckWork
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Input bar ── */}
        <div className="px-4 pb-5 pt-1 shrink-0" dir="rtl">
          <div className={`flex items-end gap-2 bg-slate-900 border rounded-2xl px-4 py-3 transition-all duration-200 ${
            waitingForCheckWork
              ? "border-amber-500/50 shadow-[0_0_0_3px_rgba(245,158,11,0.08)]"
              : "border-slate-700 focus-within:border-[#00d4ff]/60 focus-within:shadow-[0_0_0_3px_rgba(0,212,255,0.08)]"
          }`}>
            {/* Camera / image upload */}
            <button
              onClick={() => fileRef.current?.click()}
              className={`transition-colors shrink-0 pb-0.5 ${
                waitingForCheckWork
                  ? "text-amber-400 animate-pulse"
                  : "text-slate-600 hover:text-[#00d4ff]"
              }`}
              title={waitingForCheckWork ? "צלם את הפתרון שלך" : "צלם שאלה מהמחברת"}
            >
              <Camera size={19} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={waitingForCheckWork ? "או כתוב שאלה..." : "כתוב שאלה..."}
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm resize-none focus:outline-none leading-relaxed overflow-hidden"
              style={{ direction: "rtl", maxHeight: "112px" }}
            />

            {/* Send */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-xl bg-[#00d4ff] hover:bg-[#00b8d9] flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
            >
              <Send size={15} className="text-[#0f172a]" style={{ transform: "scaleX(-1)" }} />
            </button>
          </div>

          <p className="text-slate-700 text-xs text-center mt-2.5">
            Enter לשליחה &nbsp;•&nbsp; Shift+Enter לשורה חדשה &nbsp;•&nbsp;
            <button
              onClick={() => {
                apiHistoryRef.current = [];
                setMessages([{ id: "welcome-reset", role: "ai", text: WELCOME[topic] || WELCOME[""] }]);
                setIsTyping(false);
                setWaitingForCheckWork(false);
              }}
              className="text-slate-700 hover:text-slate-500 underline transition-colors"
            >
              נקה שיחה
            </button>
            {canSummarize && (
              <>
                &nbsp;•&nbsp;
                <button onClick={handleSummary} className="text-slate-700 hover:text-emerald-500 underline transition-colors">
                  סיכום
                </button>
              </>
            )}
          </p>
        </div>

        {/* Collapse handle (mobile) */}
        <button
          onClick={closeChat}
          className="sm:hidden flex items-center justify-center gap-1 py-3 border-t border-slate-800 text-slate-600 hover:text-slate-400 transition-colors text-xs shrink-0"
        >
          <ChevronDown size={14} />
          <span>סגור</span>
        </button>
      </div>
    </>
  );
}
