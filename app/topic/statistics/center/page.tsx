"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import {
  Brain, ChevronRight, Copy, Check, AlertTriangle,
  Target, PenLine, Lock, CheckCircle, Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const FORBIDDEN = ["פתור", "תשובה", "תביא לי", "מה התשובה", "תחשב בשבילי", "תן לי"];
const REQUIRED  = ["ממוצע","חציון","שכיח","הסבר","תסביר","כיצד","שלב","למה","נוסחה","מצטברת","משוקלל"];

function checkPrompt(text: string): { ok: boolean; kind: "forbidden"|"weak"|"ok"; msg: string } {
  const t = text.trim();
  if (t.length < 10)                         return { ok:false, kind:"weak",      msg:"הפרומפט קצר מדי." };
  if (FORBIDDEN.some(w => t.includes(w)))    return { ok:false, kind:"forbidden", msg:"זה פרומפט של העתקה — בקש הדרכה, לא פתרון." };
  if (!REQUIRED.some(w => t.includes(w)))    return { ok:false, kind:"weak",      msg:"כלול מילת מפתח: ממוצע / חציון / שכיח / הסבר…" };
  return { ok:true, kind:"ok", msg:"פרומפט תקין!" };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT INPUT FIELD
// ─────────────────────────────────────────────────────────────────────────────

function PromptInput({
  label, placeholder="", onApprove, validate,
}: {
  label: string; placeholder?: string; onApprove(): void;
  validate?(t: string): { ok: boolean; msg: string } | null;
}) {
  const [text, setText] = useState("");
  const [res,  setRes]  = useState<{ ok:boolean; kind:string; msg:string }|null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    if (validate) {
      const r = validate(text);
      if (r) {
        setRes({ ok:r.ok, kind: r.ok?"ok":"weak", msg:r.msg });
        if (r.ok) { setDone(true); onApprove(); }
        return;
      }
    }
    const r = checkPrompt(text);
    setRes(r);
    if (r.ok) { setDone(true); onApprove(); }
  }

  if (done) return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
      <p className="text-emerald-400 text-sm font-semibold">פרומפט מאושר! שלח ל-AI ואז המשך.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-[#00d4ff] text-xs font-semibold flex items-center gap-1"><PenLine size={11}/>{label}</p>
      <textarea
        value={text} onChange={e => setText(e.target.value)} placeholder={placeholder}
        className="w-full bg-slate-900/80 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none h-20 focus:border-[#00d4ff]/60 focus:outline-none placeholder:text-slate-600"
        dir="rtl"
      />
      <div className="flex items-center gap-3">
        <button onClick={submit}
          className="flex items-center gap-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] text-xs font-semibold px-4 py-1.5 rounded-lg transition-all">
          <Check size={11}/>בדוק פרומפט
        </button>
        {text.length > 0 && <span className="text-slate-600 text-xs">{text.length} תווים</span>}
      </div>
      <AnimatePresence>
        {res && !res.ok && (
          <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className={`text-xs rounded-lg px-3 py-2 border ${res.kind==="forbidden"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
            {res.kind==="forbidden" ? "🚫 " : "💡 "}{res.msg}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PITFALLS
// ─────────────────────────────────────────────────────────────────────────────

function Pitfalls({ items }: { items: {title:string; body:string}[] }) {
  return (
    <div className="rounded-xl border border-amber-500/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/5 border-b border-amber-500/10">
        <AlertTriangle size={14} className="text-amber-400"/>
        <span className="font-bold text-white text-sm">מוקשים נפוצים</span>
      </div>
      <div className="p-3 grid md:grid-cols-3 gap-3">
        {items.map((p,i) => (
          <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
            <p className="font-bold text-amber-300 text-xs mb-1">{p.title}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all ${
        copied ? "bg-green-500/20 text-green-400 border-green-500/30"
               : "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30 hover:bg-[#00d4ff]/20"}`}>
      {copied ? <><Check size={13}/>הועתק!</> : <><Copy size={13}/>העתק פרומפט</>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SILENT SVG DIAGRAMS  (zero text about numbers, mean, median, average)
// ─────────────────────────────────────────────────────────────────────────────

/** 7 coloured boxes labelled x₁…x₇. No values. No lines. */
function DiagramBoxes() {
  const COLORS = ["#3b82f6","#06b6d4","#8b5cf6","#ec4899","#f59e0b","#10b981","#f97316"];
  const W=300, H=56, BOX=32, GAP=8;
  const total = 7*(BOX+GAP)-GAP;
  const x0 = (W-total)/2;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {COLORS.map((c,i) => {
        const x = x0 + i*(BOX+GAP);
        return (
          <g key={i}>
            <rect x={x} y={4} width={BOX} height={BOX} rx={5}
              fill={c+"30"} stroke={c} strokeWidth={1.5}/>
            <text x={x+BOX/2} y={25} textAnchor="middle"
              fill={c} fontSize={9} fontWeight="600">x{i+1}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Frequency table skeleton — headers only, cells show "—". No calculations. */
function DiagramFreqTable() {
  const COLS = ["ציון","שכיחות","ציון×שכ'"];
  const W=240, ROW=24, ROWS=5, CW=W/3;
  const H = ROW*(ROWS+1)+4;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* header row */}
      <rect x={0} y={0} width={W} height={ROW} fill="#1e293b"/>
      {COLS.map((h,i) => (
        <text key={i} x={CW*i+CW/2} y={16} textAnchor="middle"
          fill="#94a3b8" fontSize={10} fontWeight="700">{h}</text>
      ))}
      {/* data rows */}
      {Array.from({length:ROWS},(_,r) => (
        <rect key={r} x={0} y={ROW*(r+1)} width={W} height={ROW}
          fill={r%2===0?"#0f172a":"#141e30"}/>
      ))}
      {/* cell dashes */}
      {Array.from({length:ROWS},(_,r) => COLS.map((_,c) => (
        <text key={`${r}${c}`} x={CW*c+CW/2} y={ROW*(r+1)+16}
          textAnchor="middle" fill="#1e3a5f" fontSize={12}>—</text>
      )))}
      {/* grid lines */}
      {[0,CW,CW*2,W].map((x,i) => (
        <line key={i} x1={x} y1={0} x2={x} y2={H} stroke="#334155" strokeWidth={1}/>
      ))}
      {Array.from({length:ROWS+2},(_,i) => (
        <line key={i} x1={0} y1={ROW*i} x2={W} y2={ROW*i} stroke="#334155" strokeWidth={1}/>
      ))}
    </svg>
  );
}

/** Balance scale — base, triangle, beam, two pans, coloured dots. NOTHING ELSE. */
function DiagramScale() {
  const W=300, H=128, CX=W/2;
  const baseY=H-12, triY=H-38, beamY=triY-14, beamL=100, panRx=20, panRy=6;
  const dots = [-76,-48,-20,14,42,70];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={CX-20} y={baseY} width={40} height={10} rx={4} fill="#334155"/>
      <polygon points={`${CX},${triY} ${CX-12},${baseY} ${CX+12},${baseY}`} fill="#475569"/>
      <line x1={CX-beamL} y1={beamY} x2={CX+beamL} y2={beamY}
        stroke="#64748b" strokeWidth={3} strokeLinecap="round"/>
      {/* left pan */}
      <line x1={CX-beamL} y1={beamY} x2={CX-beamL} y2={beamY+22} stroke="#64748b" strokeWidth={1.5}/>
      <ellipse cx={CX-beamL} cy={beamY+28} rx={panRx} ry={panRy}
        fill="#1e293b" stroke="#475569" strokeWidth={1.5}/>
      {/* right pan */}
      <line x1={CX+beamL} y1={beamY} x2={CX+beamL} y2={beamY+22} stroke="#64748b" strokeWidth={1.5}/>
      <ellipse cx={CX+beamL} cy={beamY+28} rx={panRx} ry={panRy}
        fill="#1e293b" stroke="#475569" strokeWidth={1.5}/>
      {/* data dots — colour only, no labels */}
      {dots.map((off,i) => (
        <circle key={i} cx={CX+off} cy={beamY-7} r={5}
          fill={`hsl(${195+i*34},68%,55%)`} opacity={0.78}/>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEAN BALANCER  (interactive lab)
// ─────────────────────────────────────────────────────────────────────────────

// All chart geometry lives OUTSIDE the component so useEffect([dragging]) is stable.
const BAR_COUNT  = 5;
const MAX_VAL    = 15;
const SVG_W      = 320;
const SVG_H      = 200;
const PAD_L      = 36;   // left padding (for y-axis labels)
const PAD_R      = 52;   // right padding (for mean/median labels)
const PAD_T      = 20;
const PAD_B      = 28;
const INNER_W    = SVG_W - PAD_L - PAD_R;
const INNER_H    = SVG_H - PAD_T - PAD_B;
const BAR_W      = Math.floor(INNER_W / BAR_COUNT) - 8;
const BAR_COLORS = ["#3b82f6","#06b6d4","#8b5cf6","#ec4899","#f59e0b"];

function valToY(v: number)  { return PAD_T + INNER_H * (1 - v / MAX_VAL); }
function barLeft(i: number) { return PAD_L + i * (INNER_W / BAR_COUNT) + 4; }

function MeanBalancer({ glow }: { glow?: boolean }) {
  const [vals, setVals] = useState([3, 6, 8, 5, 9]);
  const [drag, setDrag] = useState<number|null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sorted = [...vals].sort((a,b)=>a-b);
  const mean   = vals.reduce((s,v)=>s+v,0) / BAR_COUNT;
  const median = BAR_COUNT % 2 === 1
    ? sorted[Math.floor(BAR_COUNT/2)]
    : (sorted[BAR_COUNT/2-1] + sorted[BAR_COUNT/2]) / 2;
  const aligned = Math.abs(mean - median) < 0.31;

  // Register/unregister document pointer listeners only while dragging.
  useEffect(() => {
    if (drag === null) return;
    function onMove(e: PointerEvent) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgY = (e.clientY - rect.top) * (SVG_H / rect.height);
      const raw  = (1 - (svgY - PAD_T) / INNER_H) * MAX_VAL;
      const v    = Math.max(1, Math.min(MAX_VAL, Math.round(raw)));
      setVals(prev => { const a=[...prev]; a[drag!]=v; return a; });
    }
    function onUp() { setDrag(null); }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup",   onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup",   onUp);
    };
  }, [drag]);

  const meanY   = valToY(mean);
  const medianY = valToY(median);

  return (
    <div className={`rounded-2xl border p-5 space-y-4 transition-all duration-500 ${
      glow && aligned
        ? "border-green-400/70 bg-green-500/6 shadow-[0_0_28px_rgba(34,197,94,.14)]"
        : aligned
        ? "border-green-400/40 bg-green-500/4"
        : "border-purple-500/30 bg-[#0f172a]"
    }`}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">סימולטור מדדי מרכז</h3>
        {aligned && (
          <span className="text-green-400 text-sm font-bold flex items-center gap-1">
            <Sparkles size={13}/>{glow ? "סימטריה מושלמת!" : "μ = M"}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center select-none">
        גרור עמודה למעלה/למטה — נסה להשיג μ = M
      </p>

      {/* THE SVG — bars + mean line + median line all in one coordinate space */}
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          width={SVG_W} height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ display:"block", userSelect:"none",
                   cursor: drag!==null ? "grabbing" : "default" }}
        >
          {/* Y-axis grid */}
          {[3,6,9,12,15].map(v => {
            const y = valToY(v);
            return (
              <g key={v}>
                <line x1={PAD_L-4} y1={y} x2={SVG_W-PAD_R} y2={y}
                  stroke="#1e293b" strokeWidth={1}/>
                <text x={PAD_L-7} y={y+4} textAnchor="end"
                  fill="#475569" fontSize={8}>{v}</text>
              </g>
            );
          })}

          {/* Bars */}
          {vals.map((v, i) => {
            const x = barLeft(i);
            const y = valToY(v);
            const h = (v / MAX_VAL) * INNER_H;
            const active = drag === i;
            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={BAR_W} height={h} rx={4}
                  fill={BAR_COLORS[i]} opacity={active ? 1 : 0.75}
                  onPointerDown={e => { e.preventDefault(); setDrag(i); }}
                  style={{ cursor: active ? "grabbing" : "grab", touchAction:"none" }}
                />
                {/* grip lines */}
                {h > 16 && <>
                  <line x1={x+6} y1={y+7}  x2={x+BAR_W-6} y2={y+7}
                    stroke="rgba(255,255,255,.35)" strokeWidth={1.5} strokeLinecap="round"
                    style={{pointerEvents:"none"}}/>
                  <line x1={x+6} y1={y+12} x2={x+BAR_W-6} y2={y+12}
                    stroke="rgba(255,255,255,.2)" strokeWidth={1.5} strokeLinecap="round"
                    style={{pointerEvents:"none"}}/>
                </>}
                {/* value label */}
                <text x={x+BAR_W/2} y={Math.max(y-5, PAD_T-6)}
                  textAnchor="middle" fill={active?"#fff":"#e2e8f0"}
                  fontSize={11} fontWeight="700" style={{pointerEvents:"none"}}>{v}</text>
                {/* x-axis label */}
                <text x={x+BAR_W/2} y={SVG_H-8}
                  textAnchor="middle" fill="#64748b" fontSize={9}
                  style={{pointerEvents:"none"}}>x{i+1}</text>
              </g>
            );
          })}

          {/* Mean line — amber dashed */}
          <line x1={PAD_L} y1={meanY} x2={SVG_W-PAD_R+2} y2={meanY}
            stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"
            style={{pointerEvents:"none"}}/>
          <text x={SVG_W-PAD_R+6} y={meanY+4}
            fill="#f59e0b" fontSize={9} fontWeight="700"
            style={{pointerEvents:"none"}}>μ={mean.toFixed(1)}</text>

          {/* Median line — solid purple / green when aligned */}
          <line x1={PAD_L} y1={medianY} x2={SVG_W-PAD_R+2} y2={medianY}
            stroke={aligned?"#22c55e":"#a78bfa"} strokeWidth={2.5}
            style={{pointerEvents:"none"}}/>
          <text x={SVG_W-PAD_R+6} y={medianY+4}
            fill={aligned?"#22c55e":"#a78bfa"} fontSize={9} fontWeight="700"
            style={{pointerEvents:"none"}}>M={median.toFixed(1)}</text>
        </svg>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <p className="text-slate-500 mb-1">ממוצע (- -)</p>
          <p className="font-mono font-bold text-amber-400">{mean.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <p className="text-slate-500 mb-1">חציון (—)</p>
          <p className={`font-mono font-bold ${aligned?"text-green-400":"text-purple-400"}`}>{median.toFixed(2)}</p>
        </div>
        <div className={`border rounded-xl p-3 transition-all ${aligned?"bg-green-500/10 border-green-500/40":"border-slate-800"}`}>
          <p className={`mb-1 ${aligned?"text-green-400":"text-slate-500"}`}>|μ−M|</p>
          <p className={`font-mono font-bold ${aligned?"text-green-300":"text-white"}`}>{Math.abs(mean-median).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Step = {
  label: string;
  guide: string;
  prompt: string;
  answer: string;
  explain: string;
};

type Ex = {
  id: "basic"|"frequency"|"advanced";
  tabLabel: string;
  difficulty: "בסיסי"|"בינוני"|"מתקדם";
  title: string;
  problem: string;
  pitfalls: { title:string; body:string }[];
  goldenPrompt: string;
  steps: Step[];
};

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISES
// ─────────────────────────────────────────────────────────────────────────────

const EXERCISES: Ex[] = [
  {
    id: "basic",
    tabLabel: "סדרה פשוטה",
    difficulty: "בסיסי",
    title: "ממוצע, חציון ושכיח — סדרה פשוטה",
    problem: "נתונה סדרת ציונים: 7, 3, 8, 5, 9, 3, 6.\n(א) סדר את הנתונים בסדר עולה ומנה כפילויות.\n(ב) חשב ממוצע ומצא שכיח.\n(ג) מצא חציון והסבר את משמעותו.",
    pitfalls: [
      { title:"⚠️ חציון ≠ ממוצע", body:"החציון הוא האיבר האמצעי בסדרה הממוינת. כאן: חציון=6, ממוצע≈5.86." },
      { title:"סדר קודם!", body:"חייבים לסדר לפני חיפוש חציון. N=7 → האיבר ה-4." },
      { title:"שכיח = הנפוץ ביותר", body:"3 חוזר פעמיים → שכיח=3 (לא הממוצע!)." },
    ],
    goldenPrompt: "\n\nאני תלמיד/ית ולומד/ת מדדי מרכז.\nסדרה: 7,3,8,5,9,3,6.\nנחה אותי:\n1. כיצד לסדר נתונים ולמה זה חשוב.\n2. כיצד לחשב ממוצע ולמצוא שכיח.\n3. כיצד למצוא חציון ומה ההבדל מממוצע.\nשאל \"מוכן?\" בין שלב לשלב.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      {
        label: "שלב 1 — סדר הנתונים",
        guide: "סדר: 7,3,8,5,9,3,6 מהקטן לגדול. זהה נתונים שחוזרים.",
        prompt: "\n\nיש לי 7 ציונים: 7,3,8,5,9,3,6. הנחה אותי לסדר אותם בסדר עולה ולמנות כפילויות. שאל אם יודע מה הצעד הראשון.",
        answer: "סדר עולה: 3, 3, 5, 6, 7, 8, 9",
        explain: "מסדרים מהקטן לגדול. 3 מופיע פעמיים — יהיה השכיח.",
      },
      {
        label: "שלב 2 — ממוצע ושכיח",
        guide: "ממוצע = סכום ÷ מספר איברים. שכיח = האיבר שחוזר הכי הרבה.",
        prompt: "\n\nנתונים ממוינים: 3,3,5,6,7,8,9. הנחה אותי לחשב ממוצע ולמצוא שכיח. שאל מה ההבדל בין שניהם.",
        answer: "ממוצע = (3+3+5+6+7+8+9)÷7 = 41÷7 ≈ 5.86. שכיח = 3",
        explain: "סכום=41, חלקי 7 ≈ 5.86. שכיח=3 כי חוזר פעמיים.",
      },
      {
        label: "שלב 3 — חציון ופרשנות",
        guide: "N=7 → מיקום חציון = (7+1)/2 = 4. האיבר הרביעי בסדרה הממוינת.",
        prompt: "\n\n7 נתונים ממוינים: 3,3,5,6,7,8,9. הנחה אותי למצוא חציון ולהסביר משמעותו. שאל כיצד מאתרים את האיבר האמצעי.",
        answer: "חציון = 6 (האיבר ה-4). 50% מהנתונים ≤ 6.",
        explain: "N=7 → מיקום=(7+1)/2=4. האיבר הרביעי: 3,3,5,**6**,7,8,9 → חציון=6.",
      },
    ],
  },
  {
    id: "frequency",
    tabLabel: "טבלת שכיחויות",
    difficulty: "בינוני",
    title: "ממוצע משוקלל — טבלת שכיחויות",
    problem: "טבלת שכיחויות (N=30):\nציון:     60  70  80  90  100\nשכיחות:   3   7  12   6    2\n(א) מלא עמודת ציון×שכיחות ואמת N.\n(ב) חשב ממוצע משוקלל ומצא שכיח.\n(ג) מצא חציון בעזרת שכיחות מצטברת.\n(ד) פרש — האם ההתפלגות סימטרית?",
    pitfalls: [
      { title:"⚠️ לא ממוצע פשוט", body:"חייבים לשקלל! ממוצע = Σ(ציון×שכ')÷N = 2370÷30 = 79." },
      { title:"שכיח = שכיחות גבוהה", body:"שכיח=80 (שכיחות 12) — לא 100! הנפוץ, לא הגבוה." },
      { title:"חציון דורש שכ' מצטברת", body:"N=30 → מיקומים 15,16. אחרי 70: 10, אחרי 80: 22 → חציון=80." },
    ],
    goldenPrompt: "\n\nאני תלמיד/ית ולומד/ת ממוצע משוקלל.\nציונים 60-100, שכיחויות 3,7,12,6,2. N=30.\nנחה אותי:\n1. כיצד לחשב עמודת ציון×שכיחות.\n2. כיצד לחשב ממוצע משוקלל ולמצוא שכיח.\n3. כיצד להשתמש בשכיחות מצטברת למציאת חציון.\nשאל \"מוכן?\" בין שלב לשלב.\nסרוק את התמונה/נתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״",
    steps: [
      {
        label: "שלב 1 — עמודת ציון×שכיחות",
        guide: "כפול כל ציון בשכיחותו: 60×3=180, 70×7=490, 80×12=960…",
        prompt: "\n\nטבלה: ציונים 60,70,80,90,100 עם שכיחויות 3,7,12,6,2. הנחה אותי לחשב עמודת ציון×שכיחות ולאמת N. שאל מדוע צריך עמודה זו.",
        answer: "60×3=180, 70×7=490, 80×12=960, 90×6=540, 100×2=200. N=30, Σ=2370",
        explain: "עמודת ציון×שכ' מייצגת את 'תרומת' כל ציון לממוצע. N=30 ✓.",
      },
      {
        label: "שלב 2 — ממוצע ושכיח",
        guide: "ממוצע = Σ(ציון×שכ') ÷ N = 2370 ÷ 30. שכיח = ציון עם שכיחות מרבית.",
        prompt: "\n\nΣ(ציון×שכ')=2370, N=30. הנחה אותי לחשב ממוצע משוקלל ולמצוא שכיח. שאל מדוע לא מחשבים ממוצע של 5 ציונים.",
        answer: "ממוצע = 2370÷30 = 79. שכיח = 80 (שכיחות 12)",
        explain: "ממוצע=79. שכיח=80 — לא הציון הגבוה אלא הנפוץ ביותר.",
      },
      {
        label: "שלב 3 — חציון",
        guide: "N=30 → מיקומים 15,16. שכ' מצטברת: 60→3, 70→10, 80→22.",
        prompt: "\n\nN=30, שכיחויות: 3 קיבלו 60, 7 קיבלו 70, 12 קיבלו 80… הנחה אותי לחשב שכיחות מצטברת ולמצוא חציון.",
        answer: "שכ' מצטברת: 60→3, 70→10, 80→22. מיקומים 15,16 → חציון=80",
        explain: "אחרי 70: 10 תלמידים. אחרי 80: 22. מיקומים 15,16 שניהם ב-80.",
      },
      {
        label: "שלב 4 — פרשנות",
        guide: "ממוצע=79, חציון=80, שכיח=80. ממוצע קצת מתחת לחציון — מה זה מרמז?",
        prompt: "\n\nקיבלנו: ממוצע=79, חציון=80, שכיח=80. הנחה אותי להסביר מה הסדר הזה אומר על ההתפלגות.",
        answer: "ממוצע (79) < חציון=שכיח (80) → עקב שמאלי קל (כמעט סימטרי)",
        explain: "ציונים נמוכים מושכים ממוצע מטה. ההפרש קטן → ההתפלגות כמעט סימטרית.",
      },
    ],
  },
  {
    id: "advanced",
    tabLabel: "התפלגות מוטה",
    difficulty: "מתקדם",
    title: "מדדי מרכז — התפלגות לא סימטרית",
    problem: "טבלת שכיחויות (N=30):\nציון:     40  60  80  100\nשכיחות:  10   8   6    6\n(א) מלא טבלה כולל שכיחות מצטברת וציון×שכיחות.\n(ב) חשב ממוצע ומצא שכיח.\n(ג) מצא חציון מהשכיחות המצטברת.\n(ד) הסבר מדוע שכיח < חציון < ממוצע.",
    pitfalls: [
      { title:"⚠️ אמת N תחילה", body:"N=10+8+6+6=30. שגיאה כאן תשפיע על הכל." },
      { title:"שכיח ≠ ציון גבוה", body:"שכיח=40 (שכיחות 10, הגבוהה ביותר) — לא 100!" },
      { title:"ממוצע > חציון → מוטה ימינה", body:"ציונים גבוהים מושכים ממוצע מעלה אך לא משנים חציון." },
    ],
    goldenPrompt: "\n\n", // student writes their own
    steps: [
      {
        label: "שלב 1 — מלא את הטבלה",
        guide: "שכ' מצטברת: 40→10, 60→18, 80→24, 100→30. ציון×שכ': 400, 480, 480, 600.",
        prompt: "\n\nהנחה אותי למלא עמודת שכיחות מצטברת וציון×שכיחות עבור הטבלה. שאל מהי שכיחות מצטברת.",
        answer: "שכ' מצטברת: 10,18,24,30. ציון×שכ': 400,480,480,600. Σ=1960",
        explain: "שכ' מצטברת = סכום עד ציון זה. Σ(ציון×שכ')=1960.",
      },
      {
        label: "שלב 2 — ממוצע ושכיח",
        guide: "ממוצע = 1960÷30. שכיח = ציון עם שכיחות 10.",
        prompt: "\n\nΣ=1960, N=30. הנחה אותי לחשב ממוצע ולמצוא שכיח. שאל מדוע לא בוחרים ב-100.",
        answer: "ממוצע = 1960÷30 ≈ 65.3. שכיח = 40",
        explain: "שכיח=40 כי יש לו שכיחות 10, הגבוהה ביותר.",
      },
      {
        label: "שלב 3 — חציון",
        guide: "N=30 → מיקומים 15,16. אחרי 40: 10, אחרי 60: 18 → שניהם ב-60.",
        prompt: "\n\nשכ' מצטברת: אחרי 40 יש 10, אחרי 60 יש 18. הנחה אותי למצוא מיקומי החציון ולקבוע את ערכו.",
        answer: "מיקומים 15,16: 10 < 15,16 ≤ 18 → חציון = 60",
        explain: "שניהם נופלים בקבוצת ציון 60. חציון=60.",
      },
      {
        label: "שלב 4 — פרשנות",
        guide: "שכיח=40, חציון=60, ממוצע≈65.3. מה הסדר הזה אומר?",
        prompt: "\n\nקיבלנו שכיח=40, חציון=60, ממוצע≈65.3. הנחה אותי להסביר מה הסדר שכיח < חציון < ממוצע מרמז על ההתפלגות.",
        answer: "שכיח(40) < חציון(60) < ממוצע(65.3) → התפלגות מוטה ימינה",
        explain: "ציונים גבוהים מושכים ממוצע מעלה אך לא משפיעים על החציון.",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SOLUTION STEP — BASE (copy prompt provided)
// ─────────────────────────────────────────────────────────────────────────────

function StepBase({
  step, idx, unlocked, onDone,
}: { step:Step; idx:number; unlocked:boolean; onDone():void }) {
  const [open,    setOpen]    = useState(false);
  const [done,    setDone]    = useState(false);
  const [copied,  setCopied]  = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(step.prompt);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  }

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      !unlocked ? "border-slate-800 bg-slate-900/30 opacity-50"
      : done     ? "border-green-500/40 bg-green-500/5"
                 : "border-slate-700 bg-slate-800/30"
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`w-5 h-5 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
          !unlocked ? "border-slate-700 text-slate-600"
          : done     ? "bg-green-500/20 border-green-500/50 text-green-400"
                     : "bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]"
        }`}>{!unlocked?"🔒":done?"✓":idx+1}</span>
        <p className={`font-semibold text-sm ${!unlocked?"text-slate-600":"text-slate-200"}`}>{step.label}</p>
      </div>
      {unlocked && (
        <div className="mr-7 space-y-3">
          <p className="text-slate-400 text-sm">{step.guide}</p>
          {!done && (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs">📋 פרומפט מוכן:</p>
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-xs leading-relaxed">{step.prompt}</div>
              <button onClick={copy}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                  copied ? "bg-green-500/20 text-green-400 border-green-500/30"
                         : "bg-slate-800 border-slate-600 text-slate-400 hover:text-white"}`}>
                {copied ? <><Check size={11}/>הועתק!</> : <><Copy size={11}/>העתק פרומפט</>}
              </button>
            </div>
          )}
          {!open && !done && (
            <button onClick={()=>setOpen(true)}
              className="text-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-xs px-3 py-1.5 rounded-lg transition-all">
              הצג פתרון ▼
            </button>
          )}
          {(open || done) && (
            <div className="space-y-2">
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3">
                <code className="text-green-300 text-sm font-mono">{step.answer}</code>
              </div>
              <p className="text-slate-400 text-sm">{step.explain}</p>
            </div>
          )}
          {open && !done && (
            <button onClick={()=>{setDone(true);onDone();}}
              className="text-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-xs px-4 py-2 rounded-lg transition-all">
              המשך ←
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLUTION STEP — INPUT (student writes prompt)
// ─────────────────────────────────────────────────────────────────────────────

function StepInput({
  step, idx, unlocked, onDone, advanced=false,
}: { step:Step; idx:number; unlocked:boolean; onDone():void; advanced?:boolean }) {
  const [approved, setApproved] = useState(false);
  const [open,     setOpen]     = useState(false);
  const [done,     setDone]     = useState(false);

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      !unlocked ? "border-slate-800 bg-slate-900/30 opacity-50"
      : done     ? "border-green-500/40 bg-green-500/5"
                 : "border-amber-500/20 bg-amber-500/5"
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`w-5 h-5 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
          !unlocked ? "border-slate-700 text-slate-600"
          : done     ? "bg-green-500/20 border-green-500/50 text-green-400"
                     : "bg-amber-500/20 border-amber-500/40 text-amber-400"
        }`}>{!unlocked?"🔒":done?"✓":idx+1}</span>
        <p className={`font-semibold text-sm ${!unlocked?"text-slate-600":"text-slate-200"}`}>{step.label}</p>
        {unlocked && !done && <span className="mr-auto text-amber-400 text-xs border border-amber-500/30 rounded px-1.5 py-0.5 flex items-center gap-1"><PenLine size={9}/>כתוב פרומפט</span>}
      </div>
      {unlocked && (
        <div className="mr-7 space-y-3">
          <p className="text-slate-400 text-sm">{step.guide}</p>
          {!approved && (
            <PromptInput
              label="✍️ כתוב פרומפט משלך:"
              placeholder={advanced?"":"לדוגמה: כיצד מחשבים ממוצע משוקלל? הנחה אותי…"}
              onApprove={()=>setApproved(true)}
            />
          )}
          {approved && !open && (
            <div className="space-y-2">
              <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">✅ שלח ל-AI, קבל עזרה, ואז חזור.</p>
              <button onClick={()=>setOpen(true)}
                className="text-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-xs px-3 py-1.5 rounded-lg transition-all">
                הצג פתרון ▼
              </button>
            </div>
          )}
          {(open || done) && (
            <div className="space-y-2">
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-3">
                <code className="text-green-300 text-sm font-mono">{step.answer}</code>
              </div>
              <p className="text-slate-400 text-sm">{step.explain}</p>
            </div>
          )}
          {open && !done && (
            <button onClick={()=>{setDone(true);onDone();}}
              className="text-[#00d4ff] bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-xs px-4 py-2 rounded-lg transition-all">
              המשך ←
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────────────────

function Confetti({ on }: { on: boolean }) {
  if (!on) return null;
  const pts = Array.from({length:32},(_,i)=>{
    const a=(i/32)*360, d=45+Math.random()*65;
    return { x:Math.cos(a*Math.PI/180)*d, y:-(Math.random()*90+20),
      c:["#00d4ff","#a78bfa","#f59e0b"][i%3], s:3+Math.random()*4, r:Math.random()*720, dl:Math.random()*.3 };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pts.map((p,i)=>(
        <div key={i} className="absolute rounded-sm"
          style={{left:"50%",top:"40%",width:p.s,height:p.s,background:p.c,
            animation:`confettiBurst .9s ease-out ${p.dl}s both`,
            ["--tx" as string]:`${p.x}px`,["--ty" as string]:`${p.y}px`,["--rot" as string]:`${p.r}deg`}}/>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SOLUTION — BASIC  (all steps have copy prompts)
// ─────────────────────────────────────────────────────────────────────────────

function SolutionBase({ steps, onComplete }: { steps:Step[]; onComplete():void }) {
  const [open,    setOpen]    = useState(false);
  const [count,   setCount]   = useState(0);
  const [confetti,setConfetti]= useState(false);
  const allDone = count === steps.length;

  const done = useCallback(()=>{
    setCount(c=>{
      const n=c+1;
      if(n===steps.length){ setConfetti(true); setTimeout(()=>setConfetti(false),1400); onComplete(); }
      return n;
    });
  },[steps.length, onComplete]);

  return (
    <div className={`relative bg-[#0f172a] border rounded-2xl p-6 space-y-5 transition-all ${allDone?"border-[#00d4ff]/60":"border-slate-700"}`}>
      <Confetti on={confetti}/>
      <div>
        <h3 className="text-lg font-bold text-white">פתרון מלא — בסיסי</h3>
        <p className="text-slate-500 text-sm mt-1">כל שלב כולל פרומפט מוכן — העתק, שלח ל-AI, ואז הצג פתרון</p>
      </div>
      {!open
        ? <button onClick={()=>setOpen(true)}
            className="bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff] font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
            ✅ התחל פתרון
          </button>
        : <div className="space-y-4">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${allDone?"bg-[#00d4ff]":"bg-gradient-to-r from-blue-600 to-[#00d4ff]"}`}
                style={{width:`${(count/steps.length)*100}%`}}/>
            </div>
            {allDone && (
              <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-xl px-5 py-4 text-center">
                <p className="text-[#00d4ff] font-bold">🏆 מצוין! ממוצע≈5.86, חציון=6, שכיח=3</p>
              </div>
            )}
            {steps.map((s,i)=>(
              <StepBase key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done}/>
            ))}
          </div>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SOLUTION — MEDIUM  (steps 1-2 copy, 3-4 student input)
// ─────────────────────────────────────────────────────────────────────────────

function SolutionMedium({ steps, onComplete }: { steps:Step[]; onComplete():void }) {
  const [open,    setOpen]    = useState(false);
  const [count,   setCount]   = useState(0);
  const [confetti,setConfetti]= useState(false);
  const allDone = count === steps.length;

  const done = useCallback(()=>{
    setCount(c=>{
      const n=c+1;
      if(n===steps.length){ setConfetti(true); setTimeout(()=>setConfetti(false),1400); onComplete(); }
      return n;
    });
  },[steps.length, onComplete]);

  return (
    <div className={`relative bg-[#0f172a] border rounded-2xl p-6 space-y-5 transition-all ${allDone?"border-amber-400/60":"border-slate-700"}`}>
      <Confetti on={confetti}/>
      <div>
        <h3 className="text-lg font-bold text-white">פתרון מלא — בינוני</h3>
        <p className="text-slate-500 text-sm mt-1">שלבים 1-2: פרומפטים מוכנים. שלבים 3-4: <span className="text-amber-400 font-semibold">עליך לכתוב</span></p>
      </div>
      {!open
        ? <button onClick={()=>setOpen(true)}
            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
            ✅ התחל פתרון
          </button>
        : <div className="space-y-4">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${allDone?"bg-amber-400":"bg-gradient-to-r from-amber-600 to-amber-400"}`}
                style={{width:`${(count/steps.length)*100}%`}}/>
            </div>
            {allDone && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-5 py-4 text-center">
                <p className="text-amber-400 font-bold">🏆 מעולה! ממוצע=79, חציון=80, שכיח=80</p>
              </div>
            )}
            {steps.map((s,i)=>
              i < 2
                ? <StepBase  key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done}/>
                : <StepInput key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done}/>
            )}
          </div>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SOLUTION — ADVANCED  (empty golden prompt gate + all student input)
// ─────────────────────────────────────────────────────────────────────────────

function SolutionAdvanced({ steps, onComplete }: { steps:Step[]; onComplete():void }) {
  const [gateText,  setGateText]  = useState("");   // student's own golden prompt
  const [gateError, setGateError] = useState("");
  const [gateOk,    setGateOk]    = useState(false);
  const [open,      setOpen]      = useState(false);
  const [count,     setCount]     = useState(0);
  const [confetti,  setConfetti]  = useState(false);
  const allDone = count === steps.length;

  const done = useCallback(()=>{
    setCount(c=>{
      const n=c+1;
      if(n===steps.length){ setConfetti(true); setTimeout(()=>setConfetti(false),1400); onComplete(); }
      return n;
    });
  },[steps.length, onComplete]);

  function submitGate() {
    const t = gateText.trim();
    if (t.length < 30)        { setGateError("הפרומפט קצר מדי — לפחות 30 תווים."); return; }
    if (FORBIDDEN.some(w=>t.includes(w))) { setGateError("🚫 בקש הדרכה, לא פתרון."); return; }
    const ADV = ["ממוצע","חציון","שכיח","מצטברת","התפלגות","הסבר","תסביר","כיצד","שלב","למה","מוטה","סימטרי","משוקלל","טבלה"];
    if (!ADV.some(w=>t.includes(w))) { setGateError("💡 תאר את הבעיה — כלול מילת מפתח."); return; }
    setGateOk(true);
  }

  return (
    <div className={`relative bg-[#0f172a] border rounded-2xl p-6 space-y-5 transition-all ${allDone?"border-rose-400/60":"border-slate-700"}`}>
      <Confetti on={confetti}/>
      <div>
        <h3 className="text-lg font-bold text-white">פתרון מלא — מתקדם</h3>
        <p className="text-slate-500 text-sm mt-1">אפס סיוע מובנה. <span className="text-rose-400 font-semibold">כתוב את כל הפרומפטים בעצמך.</span></p>
      </div>

      {/* Golden prompt gate — EMPTY textarea, student writes from scratch */}
      {!gateOk && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-rose-400"/>
            <p className="font-semibold text-white text-sm">שלב 0 — נסח את הפרומפט הזהב שלך</p>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            כתוב פרומפט פתיחה שיכלול: הגדרת הבעיה (ציונים 40-100, N=30, שכיחויות),
            מה אתה רוצה ללמוד, ובקשה לקבלת הדרכה — לא פתרון.
          </p>
          {/* EMPTY textarea — student writes from scratch */}
          <textarea
            value={gateText}
            onChange={e=>{ setGateText(e.target.value); setGateError(""); }}
            placeholder=""
            className="w-full bg-slate-900/80 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none h-24 focus:border-rose-400/60 focus:outline-none transition-colors"
            dir="rtl"
          />
          <div className="flex items-center gap-3">
            <button onClick={submitGate}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all">
              <Check size={11}/>בדוק פרומפט
            </button>
            {gateText.length > 0 && <span className="text-slate-600 text-xs">{gateText.length} תווים</span>}
          </div>
          {gateError && (
            <p className="text-xs rounded-lg px-3 py-2 border bg-rose-500/10 border-rose-500/30 text-rose-400">{gateError}</p>
          )}
        </div>
      )}

      {gateOk && !open && (
        <div className="space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle size={13}/>פרומפט ראשוני מאושר! שלח ל-AI ואז התחל שלבים.
          </div>
          <button onClick={()=>setOpen(true)}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold px-5 py-2.5 rounded-xl text-sm transition-all">
            🔓 התחל שלבי פתרון
          </button>
        </div>
      )}

      {open && (
        <div className="space-y-4">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${allDone?"bg-rose-400":"bg-gradient-to-r from-rose-700 to-rose-400"}`}
              style={{width:`${(count/steps.length)*100}%`}}/>
          </div>
          {allDone && (
            <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl px-5 py-4 text-center">
              <p className="text-rose-400 font-bold">🏆 כל הכבוד! שכיח(40) &lt; חציון(60) &lt; ממוצע(65.3) → מוטה ימינה</p>
            </div>
          )}
          {steps.map((s,i)=>(
            <StepInput key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done} advanced/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL PANEL  — mounts fresh on every tab switch via key={activeId}
// ─────────────────────────────────────────────────────────────────────────────

function LevelPanel({ ex }: { ex: Ex }) {
  const [levelDone, setLevelDone] = useState(false);

  const badgeCls =
    ex.difficulty === "בסיסי"
      ? "bg-green-500/10 border-green-500/30 text-green-400"
      : ex.difficulty === "בינוני"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
      : "bg-rose-500/10 border-rose-500/30 text-rose-400";

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${badgeCls}`}>{ex.difficulty}</span>
        <h2 className="font-bold text-white text-xl">{ex.title}</h2>
      </div>

      {/* Silent diagram */}
      <div className="rounded-2xl border border-slate-700 bg-[#0f172a] p-5 space-y-3">
        <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-wider">
          {ex.id==="basic" ? "סדרת נתונים — 7 ערכים"
           : ex.id==="frequency" ? "טבלת שכיחויות — ריקה"
           : "מאזניים — ממוצע כנקודת שיווי משקל"}
        </p>
        <div className="flex justify-center">
          {ex.id==="basic"     && <DiagramBoxes/>}
          {ex.id==="frequency" && <DiagramFreqTable/>}
          {ex.id==="advanced"  && <DiagramScale/>}
        </div>
        <p className="text-slate-500 text-xs text-center">
          {ex.id==="basic"     ? "נסה לסדר את הנתונים לפני שממשיכים"
           : ex.id==="frequency" ? "נסה למלא את הטבלה לפני שממשיכים"
           : "הממוצע הוא נקודת האיזון — לא בהכרח האמצעי!"}
        </p>
      </div>

      {/* Problem */}
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 space-y-3">
        <p className="text-white leading-relaxed text-base whitespace-pre-line">{ex.problem}</p>
        <p className="text-slate-500 text-sm">💡 נסה לפתור לפני שתמשיך</p>
      </div>

      {/* Pitfalls */}
      <Pitfalls items={ex.pitfalls}/>

      {/* Golden prompt — basic & frequency show the pre-written one; advanced has none */}
      {ex.id !== "advanced" && (
        <div className="rounded-2xl border border-[#00d4ff]/30 bg-[#0f172a] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/15 border border-[#00d4ff]/30 flex items-center justify-center">
                <Target size={15} className="text-[#00d4ff]"/>
              </div>
              <div>
                <p className="font-bold text-white text-sm">הפרומפט הזהב</p>
                <p className="text-slate-500 text-xs">העתק ושלח ל-AI שלך</p>
              </div>
            </div>
            <CopyBtn text={ex.goldenPrompt}/>
          </div>
          <div className="px-6 py-4">
            <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{ex.goldenPrompt}</pre>
          </div>
        </div>
      )}

      {/* Full solution — level-specific */}
      {ex.id==="basic"     && <SolutionBase     steps={ex.steps} onComplete={()=>setLevelDone(true)}/>}
      {ex.id==="frequency" && <SolutionMedium   steps={ex.steps} onComplete={()=>setLevelDone(true)}/>}
      {ex.id==="advanced"  && <SolutionAdvanced steps={ex.steps} onComplete={()=>setLevelDone(true)}/>}

      {/* Interactive lab */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-t border-slate-800 pt-4">
          <div className={`w-2 h-2 rounded-full animate-pulse ${levelDone?"bg-green-400":"bg-[#00d4ff]"}`}/>
          <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-wider">סימולטור אינטראקטיבי</p>
        </div>
        <AnimatePresence>
          {levelDone && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <Sparkles size={18} className="text-emerald-400 shrink-0"/>
              <div>
                <p className="text-emerald-400 font-bold text-sm">
                  {ex.id==="basic"
                    ? "ממוצע≈5.86, חציון=6, שכיח=3 — נסה לגרור ל-μ=M!"
                    : ex.id==="frequency"
                    ? "ממוצע=79, חציון=80 — כמעט סימטרי! גרור לאיזון."
                    : "שכיח(40) < חציון(60) < ממוצע(65.3) — נסה לאזן!"}
                </p>
                <p className="text-slate-400 text-xs">גרור את העמודות לראות כיצד מדדי המרכז משתנים</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <MeanBalancer glow={levelDone}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id:"basic",     label:"בסיסי",  cls:"text-green-400 border-green-500 bg-green-500/10"  },
  { id:"frequency", label:"בינוני", cls:"text-amber-400 border-amber-500 bg-amber-500/10"  },
  { id:"advanced",  label:"מתקדם",  cls:"text-rose-400  border-rose-500  bg-rose-500/10"   },
];

export default function StatsCenterPage() {
  const [activeId, setActiveId] = useState<Ex["id"]>("basic");
  const scrollRef = useRef<HTMLDivElement>(null);

  function switchTab(id: Ex["id"]) {
    setActiveId(id);
    setTimeout(()=>scrollRef.current?.scrollIntoView({behavior:"smooth",block:"start"}), 50);
  }

  const ex = EXERCISES.find(e=>e.id===activeId)!;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes confettiBurst { to{transform:translate(var(--tx),var(--ty)) rotate(var(--rot));opacity:0} }
      `}</style>

      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]"/>
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link
            href="/topic/statistics"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Page heading */}
        <div className="space-y-1">
          <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">סטטיסטיקה • מדדי מרכז</p>
          <h1 className="text-3xl font-extrabold">מדדי מרכז</h1>
          <p className="text-slate-400">ממוצע, חציון ושכיח — מה כל אחד אומר על הנתונים?</p>
        </div>

        {/* Tab bar */}
        <div ref={scrollRef} className="flex gap-1 bg-slate-900/60 border border-slate-700 rounded-xl p-1">
          {TABS.map(t=>{
            const e = EXERCISES.find(x=>x.id===t.id)!;
            const active = activeId===t.id;
            return (
              <button key={t.id} onClick={()=>switchTab(t.id as Ex["id"])}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `border ${t.cls}` : "text-slate-500 hover:text-slate-300"}`}>
                <span className="block">{t.label}</span>
                <span className="block text-xs font-normal opacity-70 truncate">{e.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/*
          ┌─────────────────────────────────────────────────────────────────┐
          │  SINGLE AnimatePresence — mode="wait" — key={activeId}          │
          │  Forces full unmount of the old level before mounting the new.  │
          │  ALL child state (step progress, prompts, levelDone) resets.    │
          └─────────────────────────────────────────────────────────────────┘
        */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeId}
            initial={{ opacity:0, y:14 }}
            animate={{ opacity:1, y:0  }}
            exit={{    opacity:0, y:-8 }}
            transition={{ duration:0.2 }}
          >
            <LevelPanel ex={ex}/>
          </motion.div>
        </AnimatePresence>

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/statistics/center" level={activeId as "basic" | "medium" | "advanced"} />
        </div>


      </main>
    </div>
  );
}
