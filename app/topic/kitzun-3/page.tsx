"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check, AlertTriangle, Brain, Lightbulb, Target } from "lucide-react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const data = {
  topic: "מלבן מתחת לפרבולה",
  grade: 'י"א',
  mainInsight:
    "הסוד כאן הוא לזהות שהגובה של המלבן הוא בדיוק ה-y של הנקודה על הפרבולה — כלומר 12−x². ברגע שמבינים את זה, פונקציית השטח כותבת את עצמה: f(x) = x·(12−x²). מכאן זה קיצון קלאסי.",
  goldenPrompt:
    `\n\nאני תלמיד בכיתה י"א ואני רוצה שנפתור יחד בעיית קיצון. פעל לפי ההנחיות הבאות:\nמוד מנטור: אל תפתור את כל השאלה בבת אחת. המטרה שלך היא לעזור לי להבין את הלוגיקה, לא לתת לי תשובות מוכנות.\nניתוח מקדים: קרא את השאלה המצורפת ונתח אותה לעומק — מה נתון, מה צריך למצוא, ומה המבנה המתמטי.\nהמתנה: אחרי הניתוח, שאל אותי: "מוכן להתחיל בשלב הראשון?" — ואז המתן לתשובתי לפני שתמשיך.\nתמציתיות: ענה בהרחבה רק כשאני מבקש "להרחיב". אחרת — קצר ומדויק.\nהנה השאלה: [הכנס כאן את הטקסט של השאלה]\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
  traps: [
    {
      title: "⚠️ גובה המלבן הוא ה-y של הפרבולה",
      description:
        "תלמידים רבים שוכחים: הגובה הוא לא x — הוא הערך f(x) = 12−x² של הנקודה על הגרף. רוחב = x, גובה = 12−x².",
    },
    {
      title: "⚠️ לפרוס לפני גזירה",
      description:
        "חייבים לפתוח את הסוגריים: x·(12−x²) = 12x−x³. לא ניתן לגזור ישירות את הצורה הלא-פרוסה בלי כלל המכפלה.",
    },
    {
      title: "⚠️ x=0 ו-x=√12 הם גבולות, לא קיצון",
      description:
        "בנקודות הגבול השטח הוא 0. הקיצון נמצא בתוך התחום. אם קיבלת x=0 — טעית.",
    },
    {
      title: "⚠️ x²=4 נותן x=2, לא x=±2",
      description:
        "אמנם x²=4 → x=±2, אבל x חייב להיות חיובי (ברביע הראשון). לכן x=2 בלבד.",
    },
  ],
  example: {
    problem:
      "במערכת צירים נתונה הפרבולה f(x) = 12 − x² ברביע הראשון. בתוך השטח שכלוא בין הפרבולה לצירים, מסרטטים מלבן כך ששתיים מצלעותיו נמצאות על הצירים וקודקוד אחד שלו נמצא על גרף הפרבולה. המשימה: מצא מהו ה-x של הנקודה על הפרבולה עבורו שטח המלבן יהיה מקסימלי.",
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
      {copied ? <><Check size={14} /><span>הועתק!</span></> : <><Copy size={14} /><span>העתק פרומפט</span></>}
    </button>
  );
}

// ─── Problem Diagram ──────────────────────────────────────────────────────────

function ProblemDiagram() {
  const W = 320, H = 230;
  const marginL = 42, marginR = 18, marginT = 22, marginB = 32;
  const plotW = W - marginL - marginR;
  const plotH = H - marginT - marginB;

  // Origin in SVG coords
  const ox = marginL;
  const oy = H - marginB;

  // Scales: x ∈ [0, 4], y ∈ [0, 14]
  const scaleX = plotW / 4;
  const scaleY = plotH / 14;

  const toSvg = (x: number, y: number) => ({
    x: ox + x * scaleX,
    y: oy - y * scaleY,
  });

  // Parabola polyline
  const curvePoints: string[] = [];
  for (let xi = 0; xi <= 3.48; xi += 0.05) {
    const yi = 12 - xi * xi;
    if (yi < 0) break;
    const p = toSvg(xi, yi);
    curvePoints.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }

  // Rectangle at x=2 (optimal) for illustration
  const rx = 2, ry = 8; // 12 - 4
  const p00 = toSvg(0, 0);
  const pX0 = toSvg(rx, 0);
  const pXY = toSvg(rx, ry);
  const p0Y = toSvg(0, ry);

  // Key coordinate values
  const xAxisEnd = toSvg(3.9, 0);
  const yAxisEnd = toSvg(0, 13.5);
  const p12 = toSvg(0, 12);

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5">
      <p className="text-slate-500 text-xs text-center mb-3">סרטוט הבעיה — המלבן מוצג בממדים האופטימליים</p>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 250 }}>

          {/* Rectangle fill */}
          <rect
            x={p00.x} y={pXY.y}
            width={pX0.x - p00.x} height={oy - pXY.y}
            fill="#00d4ff" fillOpacity={0.07}
          />
          {/* Rectangle border (3 sides — left, bottom, right dashed cyan) */}
          <path
            d={`M ${p0Y.x},${p0Y.y} L ${p00.x},${p00.y} L ${pX0.x},${pX0.y} L ${pXY.x},${pXY.y}`}
            fill="none" stroke="#00d4ff" strokeWidth={1.8} strokeDasharray="5 3"
          />
          {/* Top side of rectangle (horizontal, connects to parabola) */}
          <line
            x1={p0Y.x} y1={p0Y.y} x2={pXY.x} y2={pXY.y}
            stroke="#00d4ff" strokeWidth={1.8} strokeDasharray="5 3"
          />

          {/* Parabola curve */}
          <polyline
            points={curvePoints.join(" ")}
            fill="none" stroke="#00d4ff" strokeWidth={2.2}
          />

          {/* Axes */}
          <line x1={ox} y1={oy} x2={xAxisEnd.x} y2={oy} stroke="#475569" strokeWidth={1.5} />
          <line x1={ox} y1={oy} x2={ox} y2={yAxisEnd.y} stroke="#475569" strokeWidth={1.5} />
          {/* Arrow heads */}
          <polygon points={`${xAxisEnd.x + 8},${oy} ${xAxisEnd.x},${oy - 4} ${xAxisEnd.x},${oy + 4}`} fill="#475569" />
          <polygon points={`${ox},${yAxisEnd.y - 8} ${ox - 4},${yAxisEnd.y} ${ox + 4},${yAxisEnd.y}`} fill="#475569" />

          {/* Axis labels */}
          <text x={xAxisEnd.x + 12} y={oy + 4} fontSize={12} fill="#64748b" fontFamily="Arial" dominantBaseline="middle">x</text>
          <text x={ox} y={yAxisEnd.y - 12} fontSize={12} fill="#64748b" fontFamily="Arial" textAnchor="middle">y</text>

          {/* Vertex on parabola */}
          <circle cx={pXY.x} cy={pXY.y} r={4.5} fill="#00d4ff" />

          {/* Label (x, 12−x²) */}
          <text x={pXY.x + 7} y={pXY.y - 7} fontSize={10} fill="#00d4ff" fontFamily="Arial">
            (x, 12−x²)
          </text>

          {/* x label on x-axis */}
          <line x1={pX0.x} y1={oy - 3} x2={pX0.x} y2={oy + 3} stroke="#475569" strokeWidth={1} />
          <text x={pX0.x} y={oy + 14} textAnchor="middle" fontSize={11} fill="#00d4ff" fontFamily="Arial" fontWeight="bold">x</text>

          {/* y=12 label on y-axis */}
          <line x1={ox - 3} y1={p12.y} x2={ox + 3} y2={p12.y} stroke="#475569" strokeWidth={1} />
          <text x={ox - 7} y={p12.y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#64748b" fontFamily="Arial">12</text>

          {/* origin */}
          <text x={ox - 7} y={oy + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="Arial">0</text>

          {/* height bracket: dashed line from (x,0) to (x,f(x)) */}
          <line
            x1={pX0.x} y1={pX0.y} x2={pXY.x} y2={pXY.y}
            stroke="#334155" strokeWidth={1} strokeDasharray="3 2"
          />

          {/* f(x) label near curve top */}
          <text x={ox + 6} y={p12.y - 10} fontSize={9} fill="#475569" fontFamily="Arial">
            f(x) = 12−x²
          </text>

          {/* √12 label on x-axis */}
          <text x={toSvg(Math.sqrt(12), 0).x} y={oy + 14} textAnchor="middle" fontSize={9} fill="#475569" fontFamily="Arial">
            √12
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
    label: "שלב 1: מסמנים משתנה",
    guide: "מה הגודל על הגרף שקובע את המלבן? זהה את נקודת הקשר בין המלבן לפרבולה.",
    prompt: "\n\nפרבולה f(x) = 12−x². מלבן עם 2 צלעות על הצירים וקודקוד על הפרבולה. מהו המשתנה המתאים לבחור ולמה?",
    revealedLine: "x = הקואורדינטה האופקית של הקודקוד על הפרבולה",
    explanation: "הקודקוד על הפרבולה הוא (x, 12−x²). x קובע הכל: רוחב המלבן = x, גובה המלבן = 12−x².",
  },
  {
    label: "שלב 2: תחום ההגדרה",
    guide: "מה הגבולות של x? הגובה חייב להיות חיובי, ואנחנו ברביע הראשון.",
    prompt: "\n\nf(x) = 12−x², ברביע הראשון. מהו תחום ההגדרה של x עבור המלבן?",
    revealedLine: "0 < x < √12 ≈ 3.46",
    explanation: "x > 0 (ברביע הראשון). גובה המלבן = 12−x² > 0 → x² < 12 → x < √12.",
  },
  {
    label: "שלב 3: פונקציית השטח",
    guide: "שטח = רוחב × גובה. הרוחב הוא x והגובה הוא ה-y של הנקודה על הפרבולה.",
    prompt: "\n\nהקודקוד על הפרבולה הוא (x, 12−x²). רוחב המלבן = x, גובה = 12−x². כתוב פונקציית שטח f(x).",
    revealedLine: "f(x) = x · (12 − x²)",
    explanation: "שטח = x × (12−x²). הגובה הוא הערך y של הפרבולה בנקודה x.",
  },
  {
    label: "שלב 4: פורסים סוגריים",
    guide: "כפול: x · 12 ו-x · (−x²). הצורה הפרוסה נחוצה לגזירה.",
    prompt: "\n\nפרוס: x · (12 − x²) = ?",
    revealedLine: "f(x) = 12x − x³",
    explanation: "x·12 = 12x. x·(−x²) = −x³. לכן f(x) = 12x − x³.",
  },
  {
    label: "שלב 5: גוזרים",
    guide: "d/dx[12x] = 12, d/dx[x³] = 3x².",
    prompt: "\n\nf(x) = 12x − x³. גזור.",
    revealedLine: "f′(x) = 12 − 3x²",
    explanation: "d/dx[12x] = 12, d/dx[x³] = 3x². f′(x) = 12 − 3x².",
  },
  {
    label: "שלב 6: מוצאים קיצון",
    guide: "שווה f′(x) = 0 ופתור. רק ערך חיובי בתחום!",
    prompt: "\n\nf′(x) = 12 − 3x² = 0. פתור ומצא את x הרלוונטי.",
    revealedLine: "12 − 3x² = 0  →  x² = 4  →  x = 2",
    explanation: "3x² = 12 → x² = 4 → x = ±2. כיוון שx > 0 (ברביע הראשון), x = 2.",
  },
  {
    label: "שלב 7: שטח מקסימלי",
    guide: "הצב x=2 לתוך f(x) וחשב. אפשר גם לבדוק עם הנגזרת השנייה.",
    prompt: "\n\nx=2 הוא הקיצון. חשב f(2) = שטח המקסימלי. ואיך מוכיחים שזה מקסימום?",
    revealedLine: "f(2) = 2 · (12 − 4) = 2 · 8 = 16 יחידות רבועות",
    explanation: "f(2) = 2 × (12 − 2²) = 2 × 8 = 16. בדיקה: f′′(x) = −6x → f′′(2) = −12 < 0 → מקסימום.",
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
            left: "50%", top: "50%",
            width: p.size, height: p.size,
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

// ─── Step 8: Classification Table ─────────────────────────────────────────────

function Step8Table({ onComplete }: { onComplete: () => void }) {
  const [x1, setX1] = useState(""); const [t1, setT1] = useState(""); const [s1, setS1] = useState("");
  const [x2, setX2] = useState(""); const [t2, setT2] = useState(""); const [s2, setS2] = useState("");
  const [x3, setX3] = useState(""); const [t3, setT3] = useState(""); const [s3, setS3] = useState("");
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const ok = (v: string) => v.trim().toLowerCase();
  const num = (v: string) => parseFloat(v);
  const isNum = (v: string) => !isNaN(parseFloat(v));
  const EXT = 2;
  const MAX_X = Math.sqrt(12); // ≈ 3.46

  const r1xOk = isNum(x1) && num(x1) > 0 && num(x1) < EXT;
  const r1tOk = /עולה|↗/.test(t1);
  const r1sOk = ok(s1) === "+";

  const r2xOk = ok(x2) === "2";
  const r2tOk = /מקסימום|קיצון/.test(t2);
  const r2sOk = ok(s2) === "0";

  const r3xOk = isNum(x3) && num(x3) > EXT && num(x3) < MAX_X + 0.1;
  const r3tOk = /יורד|↘/.test(t3);
  const r3sOk = ok(s3) === "-";

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
        isOk ? "border-green-500/50 text-green-400" : "border-slate-600 text-white focus:border-[#00d4ff]"
      }`}
    />
  );

  return (
    <div className="relative mt-2 bg-slate-900/60 border border-[#00d4ff]/20 rounded-xl p-5 space-y-4 animate-[fadeSlideIn_0.4s_ease_both]">
      <Confetti active={showConfetti} />
      <div>
        <p className="text-white font-semibold text-sm">שלב 8: הוכח שזה מקסימום 📊</p>
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
              <td className="py-3 px-3"><Cell value={x1} onChange={setX1} isOk={r1xOk} placeholder="1" /></td>
              <td className="py-3 px-3"><Cell value={t1} onChange={setT1} isOk={r1tOk} placeholder="↗ עולה" wide /></td>
              <td className="py-3 px-3"><Cell value={s1} onChange={setS1} isOk={r1sOk} placeholder="+" /></td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className="py-3 px-3"><Cell value={x2} onChange={setX2} isOk={r2xOk} placeholder="2" /></td>
              <td className="py-3 px-3"><Cell value={t2} onChange={setT2} isOk={r2tOk} placeholder="מקסימום" wide /></td>
              <td className="py-3 px-3"><Cell value={s2} onChange={setS2} isOk={r2sOk} placeholder="0" /></td>
            </tr>
            <tr>
              <td className="py-3 px-3"><Cell value={x3} onChange={setX3} isOk={r3xOk} placeholder="3" /></td>
              <td className="py-3 px-3"><Cell value={t3} onChange={setT3} isOk={r3tOk} placeholder="↘ יורד" wide /></td>
              <td className="py-3 px-3"><Cell value={s3} onChange={setS3} isOk={r3sOk} placeholder="-" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      {done && (
        <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-xl px-4 py-3 text-center animate-[fadeSlideIn_0.3s_ease_both]">
          <p className="text-[#00d4ff] font-bold text-sm">
            ✓ הנגזרת עוברת מ+ ל− → נקודת מקסימום! x=2, שטח מקסימלי = 16 יחידות רבועות 🏆
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
  step: StepDef; index: number; unlocked: boolean;
  onComplete: () => void; resetKey: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    setRevealed(false); setCompleted(false); setPromptCopied(false);
  }, [resetKey]);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(step.prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleReveal = () => setRevealed(true);

  const handleComplete = () => { setCompleted(true); onComplete(); };

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
  const [step8Done, setStep8Done] = useState(false);
  const [showConfettiFinal, setShowConfettiFinal] = useState(false);

  const TOTAL = 8; // 7 steps + step 8 table
  const scored = completedCount + (step8Done ? 1 : 0);
  const allDone = scored === TOTAL;
  const pct = (scored / TOTAL) * 100;
  const steps7Done = completedCount === SOLUTION_STEPS.length;

  const handleReset = () => {
    setFading(true);
    setTimeout(() => {
      setShowSolution(false);
      setResetKey((k) => k + 1);
      setCompletedCount(0);
      setStep8Done(false);
      setShowConfettiFinal(false);
      setFading(false);
    }, 300);
  };

  const handleStep8Complete = () => {
    setStep8Done(true);
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
              {allDone && <span className="text-[#00d4ff] font-semibold animate-[fadeSlideIn_0.3s_ease_both]">100% ✓</span>}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  allDone ? "bg-[#00d4ff] animate-[glowPulse_0.8s_ease_3]" : "bg-gradient-to-r from-[#3b82f6] to-[#00d4ff]"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {allDone && (
            <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-xl px-5 py-4 text-center animate-[fadeSlideIn_0.4s_ease_both]">
              <p className="text-[#00d4ff] font-bold text-lg">🏆 כל הכבוד! פיצחת את תרגיל הפרבולה!</p>
            </div>
          )}

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

          {steps7Done && !step8Done && <Step8Table onComplete={handleStep8Complete} />}
          {steps7Done && step8Done && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-4 animate-[fadeSlideIn_0.3s_ease_both]">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border bg-green-500/20 border-green-500/50 text-green-400 text-xs font-bold flex items-center justify-center shrink-0">✓</span>
                <p className="text-green-300 text-sm font-semibold">שלב 8: הוכח שזה מקסימום 📊</p>
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

// ─── Parabola Rectangle Visualization ────────────────────────────────────────

const GW3 = 320, GH3 = 120;
const GPAD3 = { top: 12, right: 12, bottom: 28, left: 36 };
const SQRT12 = Math.sqrt(12);

function areaParab(x: number) { return x * (12 - x * x); }

function ParabolaViz() {
  const [xRaw, setXRaw] = useState(100); // slider value 1–346, x = xRaw/100
  const prevXRaw = useRef(xRaw);
  const [celebrated, setCelebrated] = useState(false);

  const x = xRaw / 100;
  const isMax = xRaw === 200;
  const maxArea = areaParab(2);

  useEffect(() => {
    if (xRaw === 200 && prevXRaw.current !== 200) {
      setCelebrated(true);
      const t = setTimeout(() => setCelebrated(false), 2800);
      prevXRaw.current = xRaw;
      return () => clearTimeout(t);
    }
    prevXRaw.current = xRaw;
  }, [xRaw]);

  const height = Math.max(0, 12 - x * x);
  const area = areaParab(x);
  const fenceColor = isMax ? "#00d4ff" : "#3b82f6";

  // SVG — replicate ProblemDiagram but dynamic
  const W = 260, H = 190;
  const mL = 38, mR = 16, mT = 20, mB = 28;
  const plotW = W - mL - mR;
  const plotH = H - mT - mB;
  const ox = mL, oy = H - mB;
  const scaleX = plotW / 4;
  const scaleY = plotH / 14;
  const toSvg = (xi: number, yi: number) => ({ x: ox + xi * scaleX, y: oy - yi * scaleY });

  const curvePoints: string[] = [];
  for (let xi = 0; xi <= SQRT12; xi += 0.05) {
    const yi = 12 - xi * xi;
    if (yi < 0) break;
    const p = toSvg(xi, yi);
    curvePoints.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }

  const p00 = toSvg(0, 0);
  const pX0 = toSvg(x, 0);
  const pXY = toSvg(x, height);
  const p0Y = toSvg(0, height);
  const xAxisEnd = toSvg(3.9, 0);
  const yAxisEnd = toSvg(0, 13.5);

  // Graph
  const gIW = GW3 - GPAD3.left - GPAD3.right;
  const gIH = GH3 - GPAD3.top - GPAD3.bottom;
  const xToGx = (v: number) => GPAD3.left + (v / SQRT12) * gIW;
  const aToGy = (a: number) => GPAD3.top + (1 - Math.max(0, a) / maxArea) * gIH;

  const curvePtsGraph = Array.from({ length: 60 }, (_, i) => {
    const xv = i * SQRT12 / 59;
    return `${xToGx(xv).toFixed(1)},${aToGy(Math.max(0, areaParab(xv))).toFixed(1)}`;
  }).join(" ");

  const dotGx = xToGx(x);
  const dotGy = aToGy(area);
  const maxGx = xToGx(2);
  const maxGy = aToGy(maxArea);

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">ויזואליזציה אינטראקטיבית</h2>
        <p className="text-slate-500 text-sm">גרור את הסליידר וראה איך השטח משתנה</p>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "x (על הפרבולה)", value: x.toFixed(2), highlight: false },
          { label: "גובה = 12−x²", value: height.toFixed(2), highlight: false },
          { label: "שטח S(x)", value: area.toFixed(2), highlight: isMax },
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
      <div className={`overflow-hidden transition-all duration-500 ${isMax ? "max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-xl px-4 py-3 text-center">
          <span className="text-[#00d4ff] font-bold text-sm">
            {celebrated ? "🎉 " : "✓ "}
            מצאת את המקסימום! x = 2 נותן שטח מקסימלי = 16 יח׳ רבועות
            {celebrated ? " 🎉" : ""}
          </span>
        </div>
      </div>

      {/* parabola + rectangle SVG */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 210 }}>
          {/* rectangle fill */}
          <rect
            x={p00.x} y={pXY.y} width={pX0.x - p00.x} height={oy - pXY.y}
            fill={fenceColor} fillOpacity={isMax ? 0.18 : 0.07}
            style={{ transition: "all 0.08s" }}
          />
          {/* rectangle border */}
          <path
            d={`M ${p0Y.x},${p0Y.y} L ${p00.x},${p00.y} L ${pX0.x},${pX0.y} L ${pXY.x},${pXY.y}`}
            fill="none" stroke={fenceColor} strokeWidth={1.8} strokeDasharray="5 3"
            style={{ transition: "all 0.08s" }}
          />
          <line
            x1={p0Y.x} y1={p0Y.y} x2={pXY.x} y2={pXY.y}
            stroke={fenceColor} strokeWidth={1.8} strokeDasharray="5 3"
            style={{ transition: "all 0.08s" }}
          />
          {/* parabola curve */}
          <polyline points={curvePoints.join(" ")} fill="none" stroke="#00d4ff" strokeWidth={2.2} />
          {/* axes */}
          <line x1={ox} y1={oy} x2={xAxisEnd.x} y2={oy} stroke="#475569" strokeWidth={1.5} />
          <line x1={ox} y1={oy} x2={ox} y2={yAxisEnd.y} stroke="#475569" strokeWidth={1.5} />
          <polygon points={`${xAxisEnd.x + 8},${oy} ${xAxisEnd.x},${oy - 4} ${xAxisEnd.x},${oy + 4}`} fill="#475569" />
          <polygon points={`${ox},${yAxisEnd.y - 8} ${ox - 4},${yAxisEnd.y} ${ox + 4},${yAxisEnd.y}`} fill="#475569" />
          <text x={xAxisEnd.x + 12} y={oy + 4} fontSize={11} fill="#64748b" fontFamily="Arial" dominantBaseline="middle">x</text>
          <text x={ox} y={yAxisEnd.y - 12} fontSize={11} fill="#64748b" fontFamily="Arial" textAnchor="middle">y</text>
          {/* vertex dot on parabola */}
          <circle cx={pXY.x} cy={pXY.y} r={4} fill={fenceColor} style={{ transition: "all 0.08s" }} />
          {/* x tick + label */}
          <line x1={pX0.x} y1={oy - 3} x2={pX0.x} y2={oy + 3} stroke="#475569" strokeWidth={1} style={{ transition: "all 0.08s" }} />
          <text x={pX0.x} y={oy + 14} textAnchor="middle" fontSize={10} fill={fenceColor} fontFamily="Arial" style={{ transition: "all 0.08s" }}>
            x={x.toFixed(2)}
          </text>
          {/* origin */}
          <text x={ox - 7} y={oy + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="Arial">0</text>
        </svg>
      </div>

      {/* slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>x = 0.01</span>
          <span className="text-[#00d4ff] font-semibold">x = 2 (מקסימום)</span>
          <span>x = √12 ≈ 3.46</span>
        </div>
        <input
          type="range" min={1} max={346} value={xRaw}
          onChange={(e) => setXRaw(Number(e.target.value))}
          className="w-full accent-[#00d4ff] cursor-pointer"
          style={{ direction: "ltr" }}
        />
        <p className="text-center text-slate-400 text-sm">
          x = <span className="text-white font-bold">{x.toFixed(2)}</span>
        </p>
      </div>

      {/* area graph */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-2">
        <p className="text-slate-500 text-xs text-center mb-1">גרף S(x) = x·(12−x²)</p>
        <svg viewBox={`0 0 ${GW3} ${GH3}`} className="w-full" style={{ maxHeight: 130 }}>
          <line x1={GPAD3.left} y1={GPAD3.top} x2={GPAD3.left} y2={GPAD3.top + gIH} stroke="#334155" strokeWidth={1} />
          <line x1={GPAD3.left} y1={GPAD3.top + gIH} x2={GPAD3.left + gIW} y2={GPAD3.top + gIH} stroke="#334155" strokeWidth={1} />
          <text x={GPAD3.left - 4} y={GPAD3.top + 4} textAnchor="end" fontSize={8} fill="#475569">{maxArea}</text>
          <text x={GPAD3.left - 4} y={GPAD3.top + gIH} textAnchor="end" fontSize={8} fill="#475569">0</text>
          <text x={GPAD3.left} y={GPAD3.top + gIH + 16} fontSize={8} fill="#475569">0</text>
          <text x={GPAD3.left + gIW} y={GPAD3.top + gIH + 16} textAnchor="end" fontSize={8} fill="#475569">√12</text>
          <polyline points={curvePtsGraph} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
          {/* max marker */}
          <line x1={maxGx} y1={GPAD3.top + gIH} x2={maxGx} y2={maxGy} stroke="#00d4ff" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
          <circle cx={maxGx} cy={maxGy} r={4} fill="#00d4ff" opacity={0.3} />
          <circle cx={maxGx} cy={maxGy} r={2.5} fill="#00d4ff" />
          {/* current dot */}
          {!isMax && (
            <circle cx={dotGx} cy={dotGy} r={4} fill="#f59e0b" style={{ transition: "all 0.08s" }} />
          )}
          {isMax && (
            <circle cx={dotGx} cy={dotGy} r={6} fill="#00d4ff" style={{ filter: "drop-shadow(0 0 6px #00d4ff)" }} />
          )}
          <text x={dotGx} y={GPAD3.top + gIH + 16} textAnchor="middle" fontSize={8} fill="#f59e0b" style={{ transition: "all 0.08s" }}>
            {x.toFixed(2)}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Kitzun3Page() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <header className="bg-[#0f172a] border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Brain className="text-[#00d4ff]" size={20} />
            <span className="font-bold text-sm">מתמטיקה + AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/topic/kitzun-2"
              className="text-slate-400 hover:text-white text-xs transition-colors border border-slate-700 hover:border-slate-500 px-2.5 py-1 rounded-lg"
            >
              ← תרגיל קודם
            </Link>
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-2.5 py-1 rounded-full">
              🔴 מתקדם
            </span>
            <span className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs px-2.5 py-1 rounded-full">
              כיתה {data.grade}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        <div>
          <p className="text-slate-500 text-sm mb-2">נושא לימוד</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">{data.topic}</h1>
        </div>

        {/* Main Insight */}
        <div className="relative overflow-hidden rounded-2xl border border-[#00d4ff]/30 bg-gradient-to-l from-[#00d4ff]/5 to-[#3b82f6]/5 p-6">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 10% 50%, #00d4ff 0%, transparent 60%)" }} />
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

        {/* Problem */}
        <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-wide">הבעיה</p>
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">🔴 מתקדם</span>
          </div>
          <p className="text-white text-lg leading-relaxed whitespace-pre-line">{data.example.problem}</p>
          <p className="text-slate-500 text-sm">💡 נסה לפתור לבד לפני שתמשיך</p>
        </div>

        {/* Diagram */}
        <ProblemDiagram />

        {/* Traps */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">מוקשים נפוצים</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {data.traps.map((trap, i) => (
              <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 hover:border-amber-500/40 transition-colors">
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
            <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{data.goldenPrompt}</pre>
          </div>
        </div>

        {/* Full Solution */}
        <FullSolution />

        {/* Interactive Visualization */}
        <ParabolaViz />

      </div>
    </div>
  );
}
