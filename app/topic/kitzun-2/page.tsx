"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check, AlertTriangle, Brain, Lightbulb, Target } from "lucide-react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const data = {
  topic: "חלון נורמן",
  grade: 'י"א',
  mainInsight:
    "הסוד בבעיות עם שתי צורות הוא למצוא את ה'דבק' שביניהן. כאן, הרוחב של המלבן (x) הוא בדיוק הקוטר של חצי העיגול. ברגע שתבטא את שניהם באמצעות אותו משתנה — ניצחת את השאלה.",
  goldenPrompt:
    `\n\nאני תלמיד בכיתה י"א ואני רוצה שנפתור יחד בעיית קיצון. פעל לפי ההנחיות הבאות:\nמוד מנטור: אל תפתור את כל השאלה בבת אחת. המטרה שלך היא לעזור לי להבין את הלוגיקה, לא לתת לי תשובות מוכנות.\nניתוח מקדים: קרא את השאלה המצורפת ונתח אותה לעומק — מה נתון, מה צריך למצוא, ומה המבנה המתמטי.\nהמתנה: אחרי הניתוח, שאל אותי: "מוכן להתחיל בשלב הראשון?" — ואז המתן לתשובתי לפני שתמשיך.\nתמציתיות: ענה בהרחבה רק כשאני מבקש "להרחיב". אחרת — קצר ומדויק.\nהנה השאלה: [הכנס כאן את הטקסט של השאלה]\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
  traps: [
    {
      title: "⚠️ שכחת את חצי העיגול",
      description:
        "תלמידים כותבים שטח = xy בלבד. השטח הכולל כולל גם את חצי העיגול!",
    },
    {
      title: "⚠️ היקף או שטח?",
      description:
        "פונקציית המטרה היא ההיקף — לא השטח. קרא שוב את השאלה.",
    },
    {
      title: "⚠️ מינימום לא מקסימום",
      description:
        "אחרי הגזירה — וודא שהנגזרת עוברת מ- ל+ ולא להיפך!",
    },
    {
      title: "⚠️ רדיוס הוא x/2 — לא x!",
      description:
        "חצי העיגול יושב על רוחב x, לכן הרדיוס הוא x/2. שגיאה זו מכפילה את שטח חצי העיגול ב-4.",
    },
  ],
  example: {
    problem:
      "מעצב חלונות מתכנן חלון המורכב ממלבן שמעליו חצי עיגול (חלון נורמן). רוחב המלבן הוא x וגובהו y. שטח החלון כולו חייב להיות בדיוק 2 מ\"ר. המשימה: מצא את ממדי החלון (x ו-y) שעבורם היקף החלון יהיה מינימלי.",
  },
};

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
  );
}

// ─── Problem Diagram ──────────────────────────────────────────────────────────

function ProblemDiagram() {
  const W = 320, H = 230;
  const rx = 70, ry = 115;
  const rw = 180, rh = 90;
  const cx = rx + rw / 2; // 160
  const r = rw / 2;       // 90

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5">
      <p className="text-slate-500 text-xs text-center mb-3">סרטוט הבעיה</p>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 250 }}>
          {/* filled window shape */}
          <path
            d={`M ${rx},${ry} A ${r},${r} 0 0,1 ${rx + rw},${ry} L ${rx + rw},${ry + rh} L ${rx},${ry + rh} Z`}
            fill="#00d4ff" fillOpacity={0.06}
          />
          {/* semicircle arc */}
          <path
            d={`M ${rx},${ry} A ${r},${r} 0 0,1 ${rx + rw},${ry}`}
            fill="none" stroke="#00d4ff" strokeWidth={2} strokeDasharray="5 4"
          />
          {/* 3 sides of rectangle (left, bottom, right — no top) */}
          <path
            d={`M ${rx},${ry} L ${rx},${ry + rh} L ${rx + rw},${ry + rh} L ${rx + rw},${ry}`}
            fill="none" stroke="#00d4ff" strokeWidth={2} strokeDasharray="5 4"
          />
          {/* x label — below rectangle */}
          <text
            x={cx} y={ry + rh + 20}
            textAnchor="middle" fontSize={13}
            fill="#00d4ff" fontFamily="Arial" fontWeight="bold"
          >
            x
          </text>
          {/* y label — left side */}
          <text
            x={rx - 18} y={ry + rh / 2}
            textAnchor="middle" dominantBaseline="middle" fontSize={13}
            fill="#00d4ff" fontFamily="Arial" fontWeight="bold"
          >
            y
          </text>
          {/* radius indicator */}
          <line
            x1={cx} y1={ry} x2={cx} y2={ry - r * 0.55}
            stroke="#475569" strokeWidth={1} strokeDasharray="3 2"
          />
          <text
            x={cx + 7} y={ry - r * 0.28}
            fontSize={9} fill="#64748b" fontFamily="Arial" dominantBaseline="middle"
          >
            r = x/2
          </text>
          {/* area label inside rectangle */}
          <text
            x={cx} y={ry + rh / 2}
            textAnchor="middle" dominantBaseline="middle" fontSize={10}
            fill="#64748b" fontFamily="Arial"
          >
            שטח כולל = 2 מ״ר
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── Solution Steps ───────────────────────────────────────────────────────────

type StepDef = {
  label: string;
  guide: string;
  prompt: string;
  revealedLine: string;
  explanation: string;
};

const SOLUTION_STEPS: StepDef[] = [
  {
    label: "שלב 1: מסמנים את המשתנים בשרטוט",
    guide: "מה הגדלים הלא-ידועים בשרטוט? בחר x כגודל שקובע את כל השאר.",
    prompt: "\n\nחלון נורמן: מלבן עם חצי עיגול מעליו. שטח כולל = 2 מ״ר. רוצים מינימום היקף. מהם המשתנים שכדאי לבחור ולמה?",
    revealedLine: "x = רוחב המלבן = קוטר העיגול,  y = גובה המלבן",
    explanation: "x קובע גם את הרדיוס של חצי העיגול (r = x/2). ברגע שיודעים x, ניתן לבטא את כל הגדלים.",
  },
  {
    label: "שלב 2: תחום ההגדרה",
    guide: "מה ברור לגבי הסימן של x? האם יש חסם עליון הגיוני?",
    prompt: "\n\nבחלון נורמן עם שטח כולל = 2 מ״ר. מהו תחום ההגדרה של x?",
    revealedLine: "x > 0 — הרוחב חייב להיות חיובי",
    explanation: "x > 0 ברור. חסם עליון תיאורטי נגזר מהשטח — אם x גדול מאוד, y הופך לשלילי, מה שלא הגיוני.",
  },
  {
    label: "שלב 3: כותבים את משוואת השטח",
    guide: "שטח כולל = שטח מלבן + שטח חצי עיגול = 2. רדיוס חצי העיגול הוא x/2.",
    prompt: "\n\nחצי עיגול עם קוטר x (רדיוס x/2) ומלבן ברוחב x וגובה y. כתוב את המשוואה לשטח הכולל = 2.",
    revealedLine: "xy + πx²/8 = 2",
    explanation: "שטח מלבן = xy. שטח חצי עיגול = πr²/2 = π(x/2)²/2 = πx²/8. סה״כ: xy + πx²/8 = 2.",
  },
  {
    label: "שלב 4: מבודדים את y",
    guide: "מהאילוץ, בטא את y כפונקציה של x בלבד.",
    prompt: "\n\nמהמשוואה xy + πx²/8 = 2, בטא את y — כלומר כתוב y = ...",
    revealedLine: "y = 2/x − πx/8",
    explanation: "xy = 2 − πx²/8. חלקים ב-x: y = 2/x − πx/8.",
  },
  {
    label: "שלב 5: כותבים את ההיקף",
    guide: "ההיקף כולל: 2 צלעות אנכיות (y כל אחת) + תחתית (x) + קשת חצי עיגול (πx/2). הצלע העליונה — בין המלבן לעיגול — אינה מסגרת!",
    prompt: "\n\nחלון נורמן: 2 צלעות אנכיות של המלבן + תחתית + קשת חצי עיגול. כתוב את נוסחת ההיקף f(x,y).",
    revealedLine: "f(x) = 2y + x + πx/2",
    explanation: "היקף = 2 צלעות אנכיות (2y) + תחתית (x) + קשת העיגול (πr = π·x/2). הצלע המשותפת למלבן ולעיגול לא נספרת.",
  },
  {
    label: "שלב 6: מציבים y ומקבלים f(x)",
    guide: "הצב y = 2/x − πx/8 לתוך f = 2y + x + πx/2 ופשט.",
    prompt: "\n\nf = 2y + x + πx/2, כאשר y = 2/x − πx/8. הצב ופשט כדי לקבל f(x) עם x בלבד.",
    revealedLine: "f(x) = 4/x + x + πx/4",
    explanation: "2y = 2(2/x − πx/8) = 4/x − πx/4. נוסיף x + πx/2: f = 4/x − πx/4 + x + πx/2 = 4/x + x + πx/4.",
  },
  {
    label: "שלב 7א: גוזרים את f(x)",
    guide: "גזור כל איבר: d/dx[4/x] = −4/x², d/dx[x] = 1, d/dx[πx/4] = π/4.",
    prompt: "\n\nf(x) = 4/x + x + πx/4. גזור את הפונקציה.",
    revealedLine: "f′(x) = −4/x² + 1 + π/4",
    explanation: "d/dx[4x⁻¹] = −4x⁻² = −4/x². שאר האיברים לינאריים. f′(x) = −4/x² + 1 + π/4.",
  },
  {
    label: "שלב 7ב: מוצאים נקודת מינימום",
    guide: "שווה f′(x) = 0 ופתור את x². זכור: (1 + π/4) הוא קבוע.",
    prompt: "\n\nf′(x) = −4/x² + 1 + π/4 = 0. מצא x² ואז x.",
    revealedLine: "x² = 4/(1+π/4)",
    explanation: "−4/x² = −(1+π/4) → 4/x² = 1+π/4 → x² = 4/(1+π/4).",
  },
  {
    label: "שלב 7ג: מחשבים x המדויק",
    guide: "הוצא שורש ועגל לשתי ספרות אחרי הנקודה.",
    prompt: "\n\nx² = 4/(1 + π/4). חשב את x המדויק (עגל ל-2 ספרות אחרי הנקודה).",
    revealedLine: "x = √(4/(1+π/4)) ≈ 1.68",
    explanation: "1 + π/4 ≈ 1 + 0.785 = 1.785. x² ≈ 4/1.785 ≈ 2.24. x ≈ √2.24 ≈ 1.68.",
  },
];

// ─── Confetti ─────────────────────────────────────────────────────────────────

function Confetti({ active }: { active: boolean }) {
  const particles = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * 360;
    const dist = 60 + Math.random() * 80;
    const tx = Math.cos((angle * Math.PI) / 180) * dist;
    const ty = -(Math.random() * 120 + 40);
    const color = i % 3 === 0 ? "#00d4ff" : i % 3 === 1 ? "#3b82f6" : "#818cf8";
    const delay = Math.random() * 0.3;
    const size = 4 + Math.random() * 5;
    return { tx, ty, color, delay, size, rotate: Math.random() * 720 };
  });

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `confettiBurst 0.9s ease-out ${p.delay}s both`,
            ["--tx" as string]: `${p.tx}px`,
            ["--ty" as string]: `${p.ty}px`,
            ["--rot" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Step 7: Classification Table (Minimum) ───────────────────────────────────

function Step7Table({ onComplete }: { onComplete: () => void }) {
  const [x1, setX1] = useState(""); const [t1, setT1] = useState(""); const [s1, setS1] = useState("");
  const [x2, setX2] = useState(""); const [t2, setT2] = useState(""); const [s2, setS2] = useState("");
  const [x3, setX3] = useState(""); const [t3, setT3] = useState(""); const [s3, setS3] = useState("");
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const ok = (v: string) => v.trim().toLowerCase();
  const num = (v: string) => parseFloat(v);
  const isNum = (v: string) => !isNaN(parseFloat(v));
  const EXT = 1.68;

  const r1xOk = isNum(x1) && num(x1) > 0 && num(x1) < EXT;
  const r1tOk = /יורד|↘/.test(t1);
  const r1sOk = ok(s1) === "-";

  const r2xOk = isNum(x2) && Math.abs(num(x2) - EXT) < 0.05;
  const r2tOk = /מינימום|קיצון/.test(t2);
  const r2sOk = ok(s2) === "0";

  const r3xOk = isNum(x3) && num(x3) > EXT;
  const r3tOk = /עולה|↗/.test(t3);
  const r3sOk = ok(s3) === "+";

  const allCorrect = r1xOk && r1tOk && r1sOk && r2xOk && r2tOk && r2sOk && r3xOk && r3tOk && r3sOk;

  useEffect(() => {
    if (allCorrect && !done) {
      setDone(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1400);
      onComplete();
    }
  }, [allCorrect, done, onComplete]);

  const Cell = ({
    value, onChange, isOk, placeholder, wide = false,
  }: { value: string; onChange: (v: string) => void; isOk: boolean; placeholder: string; wide?: boolean }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="ltr"
      className={`${wide ? "w-24" : "w-14"} text-center bg-slate-900 border rounded-lg px-2 py-1 text-sm font-mono focus:outline-none transition-colors ${
        isOk
          ? "border-green-500/50 text-green-400"
          : "border-slate-600 text-white focus:border-[#00d4ff]"
      }`}
    />
  );

  return (
    <div className="relative mt-2 bg-slate-900/60 border border-[#00d4ff]/20 rounded-xl p-5 space-y-4 animate-[fadeSlideIn_0.4s_ease_both]">
      <Confetti active={showConfetti} />
      <div>
        <p className="text-white font-semibold text-sm">שלב 8: הוכח שזה מינימום 📊</p>
        <p className="text-slate-500 text-xs mt-1">מלא את כל התאים — x, מגמת f(x), וסימן f′(x)</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-right py-2 px-3 text-slate-400 font-medium">x</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">f(x)</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">f′(x)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-3"><Cell value={x1} onChange={setX1} isOk={r1xOk} placeholder="1.5" /></td>
              <td className="py-3 px-3"><Cell value={t1} onChange={setT1} isOk={r1tOk} placeholder="↘ יורד" wide /></td>
              <td className="py-3 px-3"><Cell value={s1} onChange={setS1} isOk={r1sOk} placeholder="-" /></td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-3"><Cell value={x2} onChange={setX2} isOk={r2xOk} placeholder="≈1.68" /></td>
              <td className="py-3 px-3"><Cell value={t2} onChange={setT2} isOk={r2tOk} placeholder="מינימום" wide /></td>
              <td className="py-3 px-3"><Cell value={s2} onChange={setS2} isOk={r2sOk} placeholder="0" /></td>
            </tr>
            <tr>
              <td className="py-3 px-3"><Cell value={x3} onChange={setX3} isOk={r3xOk} placeholder="2" /></td>
              <td className="py-3 px-3"><Cell value={t3} onChange={setT3} isOk={r3tOk} placeholder="↗ עולה" wide /></td>
              <td className="py-3 px-3"><Cell value={s3} onChange={setS3} isOk={r3sOk} placeholder="+" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {done && (
        <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-xl px-4 py-3 text-center animate-[fadeSlideIn_0.3s_ease_both]">
          <p className="text-[#00d4ff] font-bold text-sm">
            ✓ הנגזרת עוברת מ− ל+ → נקודת מינימום!
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Solution Step (Reveal-based) ─────────────────────────────────────────────

function SolutionStep({
  step, index, unlocked, onComplete, resetKey,
}: {
  step: StepDef;
  index: number;
  unlocked: boolean;
  onComplete: () => void;
  resetKey: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setCompleted(false);
    setPromptCopied(false);
  }, [resetKey]);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(step.prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleReveal = () => setRevealed(true);

  const handleComplete = () => {
    setCompleted(true);
    onComplete();
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${
        !unlocked
          ? "border-slate-800 bg-slate-900/30 opacity-50"
          : completed
            ? "border-green-500/40 bg-green-500/5"
            : "border-slate-700 bg-slate-800/30"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`w-5 h-5 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 transition-all duration-300 ${
            !unlocked
              ? "border-slate-700 text-slate-600 bg-transparent"
              : completed
                ? "bg-green-500/20 border-green-500/50 text-green-400"
                : "bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]"
          }`}
        >
          {!unlocked ? "🔒" : completed ? "✓" : index + 1}
        </span>
        <p className={`font-semibold text-sm ${!unlocked ? "text-slate-600" : "text-slate-200"}`}>
          {step.label}
        </p>
      </div>

      {unlocked && (
        <div className="mr-8 space-y-3">
          <p className="text-slate-400 text-sm leading-relaxed">{step.guide}</p>

          {!completed && (
            <button
              onClick={handleCopyPrompt}
              className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                promptCopied
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-slate-800 border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
              }`}
            >
              {promptCopied
                ? <><Check size={12} /><span>הועתק!</span></>
                : <><Copy size={12} /><span>העתק פרומפט לשלב זה</span></>}
            </button>
          )}

          {!revealed && !completed && (
            <button
              onClick={handleReveal}
              className="flex items-center gap-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              הצג פתרון והסבר ▼
            </button>
          )}

          {(revealed || completed) && (
            <div className="space-y-2 animate-[fadeSlideIn_0.35s_ease_both]">
              <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                <code className="text-green-300 text-sm font-mono" dir="rtl">{step.revealedLine}</code>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{step.explanation}</p>
            </div>
          )}

          {revealed && !completed && (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] font-medium text-xs px-4 py-2 rounded-lg transition-all duration-200 animate-[fadeSlideIn_0.25s_ease_both]"
            >
              המשך לשלב הבא ←
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Full Solution ─────────────────────────────────────────────────────────────

function FullSolution() {
  const [showSolution, setShowSolution] = useState(false);
  const [fading, setFading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [step7Done, setStep7Done] = useState(false);
  const [showConfettiFinal, setShowConfettiFinal] = useState(false);

  const TOTAL = 10; // 9 steps + step 8 table
  const scored = completedCount + (step7Done ? 1 : 0);
  const allDone = scored === TOTAL;
  const pct = (scored / TOTAL) * 100;
  const steps7Done = completedCount === SOLUTION_STEPS.length;

  const handleReset = () => {
    setFading(true);
    setTimeout(() => {
      setShowSolution(false);
      setResetKey((k) => k + 1);
      setCompletedCount(0);
      setStep7Done(false);
      setShowConfettiFinal(false);
      setFading(false);
    }, 300);
  };

  const handleStep7Complete = () => {
    setStep7Done(true);
    setShowConfettiFinal(true);
    setTimeout(() => setShowConfettiFinal(false), 1400);
  };

  return (
    <div
      className={`relative bg-[#0f172a] border rounded-2xl p-6 space-y-5 transition-all duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      } ${allDone ? "border-[#00d4ff]/60 animate-[glowPulse_0.8s_ease_3]" : "border-slate-700"}`}
    >
      <Confetti active={showConfettiFinal} />

      <div>
        <h2 className="text-lg font-bold text-white">פתרון מלא</h2>
        <p className="text-slate-500 text-sm mt-1">עבור כל שלב: קרא את ההכוונה, קבל עזרה מה-AI, ואז הצג את הפתרון</p>
      </div>

      {!showSolution ? (
        <button
          onClick={() => setShowSolution(true)}
          className="flex items-center gap-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] font-bold px-5 py-2.5 rounded-xl transition-all duration-200 text-sm"
        >
          ✅ התחל פתרון
        </button>
      ) : (
        <div className="space-y-4 animate-[fadeSlideIn_0.3s_ease_both]">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold transition-colors duration-300 ${allDone ? "text-[#00d4ff]" : "text-slate-400"}`}>
                {scored} / {TOTAL} שלבים הושלמו
              </span>
              {allDone && (
                <span className="text-[#00d4ff] font-semibold animate-[fadeSlideIn_0.3s_ease_both]">100% ✓</span>
              )}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  allDone
                    ? "bg-[#00d4ff] animate-[glowPulse_0.8s_ease_3]"
                    : "bg-gradient-to-r from-[#3b82f6] to-[#00d4ff]"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Final success banner */}
          {allDone && (
            <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-xl px-5 py-4 text-center animate-[fadeSlideIn_0.4s_ease_both]">
              <p className="text-[#00d4ff] font-bold text-lg">🏆 כל הכבוד! סיימת את תרגיל הביניים!</p>
            </div>
          )}

          {/* Steps 1–9 */}
          {SOLUTION_STEPS.map((step, i) => (
            <SolutionStep
              key={`${resetKey}-${i}`}
              step={step}
              index={i}
              unlocked={i === 0 || completedCount >= i}
              resetKey={resetKey}
              onComplete={() => setCompletedCount((c) => c + 1)}
            />
          ))}

          {/* Step 8 table — only after all 9 completed */}
          {steps7Done && !step7Done && (
            <Step7Table onComplete={handleStep7Complete} />
          )}
          {steps7Done && step7Done && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-4 animate-[fadeSlideIn_0.3s_ease_both]">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border bg-green-500/20 border-green-500/50 text-green-400 text-xs font-bold flex items-center justify-center shrink-0">✓</span>
                <p className="text-green-300 text-sm font-semibold">שלב 8: הוכח שזה מינימום 📊</p>
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors pt-1 block"
          >
            ↺ אפס פתרון
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Norman Window Visualization ─────────────────────────────────────────────

const GW2 = 320, GH2 = 120;
const GPAD2 = { top: 12, right: 12, bottom: 28, left: 40 };

function yNorm(x: number) { return Math.max(0, 2 / x - Math.PI * x / 8); }
function perimNorm(x: number) { return 4 / x + x + (Math.PI / 4) * x; }

function NormanViz() {
  const [x, setX] = useState(1.0);
  const prevX = useRef(x);
  const [celebrated, setCelebrated] = useState(false);

  const EXT = 1.68;
  const isMin = Math.abs(x - EXT) < 0.07;
  const minPerim = perimNorm(EXT);

  useEffect(() => {
    if (isMin && prevX.current !== x) {
      setCelebrated(true);
      const t = setTimeout(() => setCelebrated(false), 2800);
      prevX.current = x;
      return () => clearTimeout(t);
    }
    prevX.current = x;
  }, [x, isMin]);

  const y = yNorm(x);
  const perim = perimNorm(x);

  // SVG window drawing
  const RW = 260, RH = 190;
  const winW = Math.max(10, x * 60);
  const winH = Math.max(2, y * 50);
  const winX = (RW - winW) / 2;
  const winY = RH - 22 - winH;
  const cx = winX + winW / 2;
  const r = winW / 2;
  const fenceColor = isMin ? "#00d4ff" : "#3b82f6";

  // Graph
  const gIW = GW2 - GPAD2.left - GPAD2.right;
  const gIH = GH2 - GPAD2.top - GPAD2.bottom;
  const xMin = 0.3, xMax = 2.2;
  const pMinG = minPerim - 0.3;
  const pMaxG = pMinG + 6.5;
  const xToGx = (v: number) => GPAD2.left + ((v - xMin) / (xMax - xMin)) * gIW;
  const pToGy = (p: number) =>
    GPAD2.top + (1 - Math.min(1, Math.max(0, (p - pMinG) / (pMaxG - pMinG)))) * gIH;

  const curvePts = Array.from({ length: 55 }, (_, i) => {
    const xv = xMin + i * (xMax - xMin) / 54;
    return `${xToGx(xv).toFixed(1)},${pToGy(perimNorm(xv)).toFixed(1)}`;
  }).join(" ");

  const dotGx = xToGx(Math.min(xMax, Math.max(xMin, x)));
  const dotGy = pToGy(perim);
  const minGx = xToGx(EXT);
  const minGy = pToGy(minPerim);

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">ויזואליזציה אינטראקטיבית</h2>
        <p className="text-slate-500 text-sm">גרור את הסליידר וראה איך ההיקף משתנה</p>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "רוחב x", value: `${x.toFixed(2)} מ׳`, highlight: false },
          { label: "גובה y", value: `${y.toFixed(2)} מ׳`, highlight: false },
          { label: "היקף P(x)", value: `${perim.toFixed(2)} מ׳`, highlight: isMin },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className={`rounded-xl p-3 text-center border transition-all duration-300 ${
              highlight
                ? "bg-[#00d4ff]/10 border-[#00d4ff]/50 shadow-[0_0_20px_#00d4ff33]"
                : "bg-slate-800/60 border-slate-700"
            }`}
          >
            <p className="text-slate-400 text-xs mb-1">{label}</p>
            <p className={`font-bold text-lg leading-none ${highlight ? "text-[#00d4ff]" : "text-white"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* celebration banner */}
      <div className={`overflow-hidden transition-all duration-500 ${isMin ? "max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-xl px-4 py-3 text-center">
          <span className="text-[#00d4ff] font-bold text-sm">
            {celebrated ? "🎉 " : "✓ "}
            מצאת את המינימום! x ≈ 1.68 נותן היקף מינימלי ≈ {minPerim.toFixed(2)} מ׳
            {celebrated ? " 🎉" : ""}
          </span>
        </div>
      </div>

      {/* window SVG */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 overflow-hidden">
        <svg viewBox={`0 0 ${RW} ${RH}`} className="w-full" style={{ maxHeight: 210 }}>
          {/* window fill */}
          <path
            d={`M ${winX},${winY} A ${r},${r} 0 0,1 ${winX + winW},${winY} L ${winX + winW},${winY + winH} L ${winX},${winY + winH} Z`}
            fill={fenceColor} fillOpacity={isMin ? 0.18 : 0.07}
            style={{ transition: "all 0.08s" }}
          />
          {/* semicircle */}
          <path
            d={`M ${winX},${winY} A ${r},${r} 0 0,1 ${winX + winW},${winY}`}
            fill="none" stroke={fenceColor} strokeWidth={2} strokeDasharray="5 4"
            style={{ transition: "all 0.08s" }}
          />
          {/* 3 rect sides */}
          <path
            d={`M ${winX},${winY} L ${winX},${winY + winH} L ${winX + winW},${winY + winH} L ${winX + winW},${winY}`}
            fill="none" stroke={fenceColor} strokeWidth={2} strokeDasharray="5 4"
            style={{ transition: "all 0.08s" }}
          />
          {/* dimension labels */}
          <text x={cx} y={winY + winH + 16} textAnchor="middle" fontSize={10} fill="#94a3b8" fontFamily="Arial" style={{ transition: "all 0.08s" }}>
            x = {x.toFixed(2)}
          </text>
          {winH > 18 && (
            <text x={winX - 8} y={winY + winH / 2} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#94a3b8" fontFamily="Arial" style={{ transition: "all 0.08s" }}>
              y = {y.toFixed(2)}
            </text>
          )}
          {isMin && (
            <>
              <circle cx={winX} cy={winY} r={4} fill="#00d4ff" opacity={0.8} />
              <circle cx={winX + winW} cy={winY} r={4} fill="#00d4ff" opacity={0.8} />
            </>
          )}
        </svg>
      </div>

      {/* slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>x = 0.3</span>
          <span className="text-[#00d4ff] font-semibold">x ≈ 1.68 (מינימום)</span>
          <span>x = 2.2</span>
        </div>
        <input
          type="range" min={30} max={220} value={Math.round(x * 100)}
          onChange={(e) => setX(Number(e.target.value) / 100)}
          className="w-full accent-[#00d4ff] cursor-pointer"
          style={{ direction: "ltr" }}
        />
        <p className="text-center text-slate-400 text-sm">
          x = <span className="text-white font-bold">{x.toFixed(2)}</span>
        </p>
      </div>

      {/* perimeter graph */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-2">
        <p className="text-slate-500 text-xs text-center mb-1">גרף P(x) = 4/x + x + πx/4</p>
        <svg viewBox={`0 0 ${GW2} ${GH2}`} className="w-full" style={{ maxHeight: 130 }}>
          <line x1={GPAD2.left} y1={GPAD2.top} x2={GPAD2.left} y2={GPAD2.top + gIH} stroke="#334155" strokeWidth={1} />
          <line x1={GPAD2.left} y1={GPAD2.top + gIH} x2={GPAD2.left + gIW} y2={GPAD2.top + gIH} stroke="#334155" strokeWidth={1} />
          <text x={GPAD2.left - 4} y={GPAD2.top + 4} textAnchor="end" fontSize={8} fill="#475569">{pMaxG.toFixed(1)}</text>
          <text x={GPAD2.left - 4} y={GPAD2.top + gIH} textAnchor="end" fontSize={8} fill="#475569">{pMinG.toFixed(1)}</text>
          <text x={GPAD2.left} y={GPAD2.top + gIH + 16} fontSize={8} fill="#475569">{xMin}</text>
          <text x={GPAD2.left + gIW} y={GPAD2.top + gIH + 16} textAnchor="end" fontSize={8} fill="#475569">{xMax}</text>
          <polyline points={curvePts} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
          {/* min marker */}
          <line x1={minGx} y1={GPAD2.top + gIH} x2={minGx} y2={minGy} stroke="#00d4ff" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
          <circle cx={minGx} cy={minGy} r={4} fill="#00d4ff" opacity={0.3} />
          <circle cx={minGx} cy={minGy} r={2.5} fill="#00d4ff" />
          {/* current dot */}
          {!isMin && (
            <circle cx={dotGx} cy={dotGy} r={4} fill="#f59e0b" style={{ transition: "all 0.08s" }} />
          )}
          {isMin && (
            <circle cx={dotGx} cy={dotGy} r={6} fill="#00d4ff" style={{ filter: "drop-shadow(0 0 6px #00d4ff)" }} />
          )}
          <text x={dotGx} y={GPAD2.top + gIH + 16} textAnchor="middle" fontSize={8} fill="#f59e0b" style={{ transition: "all 0.08s" }}>
            {x.toFixed(2)}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Kitzun2Page() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Brain className="text-[#00d4ff]" size={20} />
            <span className="font-bold text-sm">מתמטיקה + AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/topic/kitzun"
              className="text-slate-400 hover:text-white text-xs transition-colors border border-slate-700 hover:border-slate-500 px-2.5 py-1 rounded-lg"
            >
              ← תרגיל קודם
            </Link>
            <Link
              href="/topic/kitzun-3"
              className="text-[#00d4ff] hover:text-white text-xs transition-colors border border-[#00d4ff]/40 hover:border-[#00d4ff] px-2.5 py-1 rounded-lg"
            >
              תרגיל הבא →
            </Link>
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-full">
              🟡 בינוני
            </span>
            <span className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs px-2.5 py-1 rounded-full">
              כיתה {data.grade}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        {/* Title */}
        <div>
          <p className="text-slate-500 text-sm mb-2">נושא לימוד</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">{data.topic}</h1>
        </div>

        {/* Main Insight */}
        <div className="relative overflow-hidden rounded-2xl border border-[#00d4ff]/30 bg-gradient-to-l from-[#00d4ff]/5 to-[#3b82f6]/5 p-6">
          <div
            className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 10% 50%, #00d4ff 0%, transparent 60%)" }}
          />
          <div className="relative flex items-start gap-4" dir="rtl">
            <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/20 border border-[#00d4ff]/30 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb size={20} className="text-[#00d4ff]" style={{ filter: "drop-shadow(0 0 8px #06b6d4)" }} />
            </div>
            <div className="text-right">
              <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-wide mb-2">התובנה המרכזית</p>
              <p className="text-white text-base leading-relaxed font-medium">{data.mainInsight}</p>
            </div>
          </div>
        </div>

        {/* Problem Card */}
        <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-wide">הבעיה</p>
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">🟡 בינוני</span>
          </div>
          <p className="text-white text-lg leading-relaxed whitespace-pre-line">{data.example.problem}</p>
          <p className="text-slate-500 text-sm">💡 נסה לפתור לבד לפני שתמשיך</p>
        </div>

        {/* Static Diagram */}
        <ProblemDiagram />

        {/* Traps */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">מוקשים נפוצים</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {data.traps.map((trap, i) => (
              <div
                key={i}
                className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <h3 className="font-bold text-amber-300 text-sm">{trap.title}</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{trap.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Golden Prompt */}
        <div className="rounded-2xl border border-[#00d4ff]/30 bg-[#0f172a] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00d4ff]/15 border border-[#00d4ff]/30 flex items-center justify-center">
                <Target size={18} className="text-[#00d4ff]" />
              </div>
              <div>
                <h2 className="font-bold text-white">הפרומפט הזהב</h2>
                <p className="text-slate-500 text-xs">העתק ושלח ל-AI שלך</p>
              </div>
            </div>
            <CopyButton text={data.goldenPrompt} />
          </div>
          <div className="px-6 py-5">
            <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {data.goldenPrompt}
            </pre>
          </div>
        </div>

        {/* Full Solution */}
        <FullSolution />

        {/* Interactive Visualization */}
        <NormanViz />

        {/* Navigation */}
        <div className="border-t border-slate-800 pt-8 flex justify-start">
          <Link
            href="/topic/kitzun-3"
            className="flex items-center gap-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 text-sm"
          >
            תרגיל הבא: פרבולה ומלבן ←
          </Link>
        </div>

      </div>
    </div>
  );
}
