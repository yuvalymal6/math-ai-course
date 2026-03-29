"use client";

import { useState } from "react";
import { Lock, Copy, Check, Play, Brain, ChevronDown, ChevronUp, LogOut } from "lucide-react";

const CORRECT_PASSWORD = "math2026";

const modules = [
  {
    number: "01",
    title: "מבוא לבינה מלאכותית בלמידת מתמטיקה",
    videoId: "dQw4w9WgXcQ", // placeholder YouTube ID
    lessons: [
      {
        title: "שיעור 1: מה זה AI ואיך זה עוזר ללמוד?",
        prompt:
          "אני תלמיד תיכון שרוצה להבין מה זה בינה מלאכותית. תסביר לי בצורה פשוטה ונגישה כאילו אני בן 16, עם דוגמאות מהחיים היומיומיים שלי.",
      },
      {
        title: "שיעור 2: איך לשאול שאלות נכון",
        prompt:
          "אני לומד [נושא ספציפי, למשל: משוואות ריבועיות] ולא מצליח להבין [חלק ספציפי, למשל: מתי יש שתי פתרונות]. תסביר לי צעד אחר צעד, ובסוף תתן לי דוגמה לתרגל.",
      },
      {
        title: "שיעור 3: שימוש ב-AI לבדיקת פתרונות",
        prompt:
          "פתרתי את המשוואה הבאה: [הכנס כאן את הפתרון שלך]. האם הפתרון נכון? אם לא, הסבר לי איפה טעיתי ולמה, ותן לי רמז לפתרון הנכון בלי לתת את התשובה ישירות.",
      },
    ],
  },
  {
    number: "02",
    title: "אלגברה ופונקציות עם עוזר AI",
    videoId: "dQw4w9WgXcQ",
    lessons: [
      {
        title: "שיעור 1: משוואות ריבועיות",
        prompt:
          "תלמד אותי לפתור את המשוואה הריבועית: x² + 5x + 6 = 0. תסביר לי שלוש שיטות שונות (פירוק לגורמים, נוסחת השורשים, השלמה לריבוע) ותסביר מתי כדאי להשתמש בכל שיטה.",
      },
      {
        title: "שיעור 2: גרפים ופונקציות",
        prompt:
          "אני לומד על הפונקציה f(x) = x² - 4x + 3. תעזור לי להבין: מה הגרף של הפונקציה הזו נראה? איפה הפרבולה חוצה את ציר ה-x? מה הנקודה הנמוכה ביותר? תסביר צעד אחר צעד.",
      },
      {
        title: "שיעור 3: אי-שוויונות",
        prompt:
          "אני מתקשה עם אי-שוויונות ריבועיות. תסביר לי איך לפתור את אי-השוויון: x² - 5x + 6 > 0. תראה לי גם פתרון אלגברי וגם איך אפשר להסתכל על זה גרפית.",
      },
    ],
  },
  {
    number: "03",
    title: "טריגונומטריה וגיאומטריה אנליטית",
    videoId: "dQw4w9WgXcQ",
    lessons: [
      {
        title: "שיעור 1: מעגל היחידה",
        prompt:
          "תסביר לי מהו מעגל היחידה ולמה הוא חשוב כל כך בטריגונומטריה. אחרי שתסביר, תשאל אותי שאלה קלה כדי לבדוק שהבנתי, ואז שאלה קצת יותר קשה.",
      },
      {
        title: "שיעור 2: פונקציות טריגונומטריות",
        prompt:
          "אני מבלבל בין sin, cos ו-tan. תסביר לי מה ההבדל בין שלושת הפונקציות הטריגונומטריות הבסיסיות עם דוגמאות חזותיות ואינטואיציה, לא רק הגדרות יבשות.",
      },
      {
        title: "שיעור 3: זהויות טריגונומטריות",
        prompt:
          "תעזור לי להוכיח את הזהות: sin²x + cos²x = 1. תסביר לי את ההיגיון מאחורי ההוכחה ולמה הזהות הזו נכונה תמיד. אחר כך תתן לי עוד זהות להוכיח בעצמי.",
      },
    ],
  },
  {
    number: "04",
    title: "חשבון אינפיניטסימלי - נגזרות ואינטגרלים",
    videoId: "dQw4w9WgXcQ",
    lessons: [
      {
        title: "שיעור 1: מהי נגזרת?",
        prompt:
          "הסבר לי מהי נגזרת בלי נוסחאות בהתחלה — רק עם אינטואיציה ודוגמאות מהחיים. למשל, מה הקשר בין נגזרת ומהירות? אחרי שהבנתי את הרעיון, תראה לי את הנוסחה.",
      },
      {
        title: "שיעור 2: כללי גזירה",
        prompt:
          "תלמד אותי את כללי הגזירה הבסיסיים: כלל הכוח, כלל המכפלה, כלל המנה. לכל כלל, תסביר מתי משתמשים בו ותתן דוגמה פתורה ואחת לתרגול.",
      },
      {
        title: "שיעור 3: אינטגרלים ושטחים",
        prompt:
          "אני צריך להבין אינטגרלים. תסביר לי מהו אינטגרל כהפך של נגזרת, ואיך מחשבים שטח מתחת לגרף. תן דוגמה ספציפית עם f(x) = x² בין x=0 ל-x=3.",
      },
    ],
  },
];

function PromptCard({ title, prompt }: { title: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-5 space-y-3">
      <h4 className="font-semibold text-white text-sm">{title}</h4>
      <p className="text-slate-400 text-sm leading-relaxed bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        {prompt}
      </p>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
          copied
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : "bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/20"
        }`}
      >
        {copied ? (
          <>
            <Check size={14} />
            <span>הועתק!</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>העתק פרומפט</span>
          </>
        )}
      </button>
    </div>
  );
}

function ModuleCard({ mod }: { mod: typeof modules[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-6 text-right hover:bg-slate-700/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-2xl font-extrabold text-[#00d4ff] opacity-60 font-mono shrink-0">
          {mod.number}
        </span>
        <div className="flex-1 text-right">
          <h3 className="text-lg font-bold text-white">{mod.title}</h3>
          <p className="text-slate-400 text-sm mt-1">{mod.lessons.length} שיעורים</p>
        </div>
        <div className="shrink-0 text-slate-400">
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-slate-700 space-y-6">
          {/* Video Placeholder */}
          <div className="mt-6">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-600">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] to-[#1e3a5f]" />
              <div className="relative flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-[#00d4ff]/20 border border-[#00d4ff]/40 flex items-center justify-center">
                  <Play size={28} className="text-[#00d4ff] mr-[-4px]" />
                </div>
                <p className="text-slate-300 text-sm">וידאו מודול {mod.number}</p>
                <p className="text-slate-500 text-xs">YouTube placeholder</p>
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div>
            <h4 className="text-[#00d4ff] font-semibold text-sm mb-4 uppercase tracking-wide">
              פרומפטים לשימוש עם AI
            </h4>
            <div className="space-y-4">
              {mod.lessons.map((lesson, i) => (
                <PromptCard key={i} title={lesson.title} prompt={lesson.prompt} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentsBeta() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-[#00d4ff]" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="text-[#00d4ff]" size={20} />
              <span className="text-white font-bold text-lg">מתמטיקה + AI</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">
              אזור הסטודנטים
            </h1>
            <p className="text-slate-400 text-sm">
              הכנס את הסיסמה שקיבלת כדי להיכנס
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="סיסמה"
                className={`w-full px-5 py-3 rounded-xl bg-slate-800 border text-white placeholder-slate-500 focus:outline-none text-right transition-colors ${
                  error
                    ? "border-red-500 focus:border-red-400"
                    : "border-slate-600 focus:border-[#00d4ff]"
                }`}
                dir="rtl"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm mt-2 text-right">
                  סיסמה שגויה. נסה שוב.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-[#00d4ff] text-[#0f172a] font-bold py-3 rounded-xl hover:bg-[#00b8d9] transition-colors"
            >
              כניסה
            </button>
          </form>

          <p className="text-center text-slate-600 text-sm mt-6">
            <a href="/" className="hover:text-slate-400 transition-colors">
              ← חזרה לדף הבית
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="text-[#00d4ff]" size={22} />
            <span className="font-bold">מתמטיקה + AI</span>
            <span className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-xs px-2 py-0.5 rounded-full mr-2">
              Beta
            </span>
          </div>
          <button
            onClick={() => setAuthenticated(false)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>יציאה</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-white mb-3">
            ברוך הבא לקורס! 👋
          </h1>
          <p className="text-slate-400 text-lg">
            כאן תמצא את כל החומרים, הסרטונים והפרומפטים לשימוש עם AI.
            <br />
            לחץ על מודול כדי לפתוח את התכנים שלו.
          </p>
        </div>

        {/* Progress bar placeholder */}
        <div className="bg-slate-800 rounded-xl p-5 mb-10 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold">התקדמות כללית</span>
            <span className="text-[#00d4ff] text-sm font-medium">0 / 4 מודולים</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full">
            <div className="h-2 bg-gradient-to-r from-[#00d4ff] to-[#3b82f6] rounded-full w-0" />
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {modules.map((mod, i) => (
            <ModuleCard key={i} mod={mod} />
          ))}
        </div>

        {/* Support */}
        <div className="mt-12 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">צריך עזרה?</h3>
          <p className="text-slate-400 text-sm mb-4">
            הצטרף לקבוצת הווטסאפ הייעודית לסטודנטים הבטא
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-[#25d366]/10 border border-[#25d366]/30 text-[#25d366] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#25d366]/20 transition-colors"
          >
            הצטרף לקבוצת WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
