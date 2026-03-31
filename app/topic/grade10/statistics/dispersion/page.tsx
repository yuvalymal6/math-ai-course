"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import {
  Copy, Check, AlertTriangle,
  Target, PenLine, Lock, CheckCircle, Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────

const BG       = "#F3EFE0";
const CARD     = "rgba(255,255,255,0.82)";
const CARD2    = "rgba(255,255,255,0.75)";
const BORDER   = "rgba(60,54,42,0.18)";
const TEXT     = "#1A1A1A";
const TEXT2    = "#2D3436";
const MUTED    = "#6B7280";
const DIV      = "rgba(60,54,42,0.08)";

// difficulty accent helpers
function accentColor(id: Ex["id"]) {
  return id === "basic" ? "#16A34A" : id === "frequency" ? "#EA580C" : "#DC2626";
}
function accentRgb(id: Ex["id"]) {
  return id === "basic" ? "22,163,74" : id === "frequency" ? "234,88,12" : "220,38,38";
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const FORBIDDEN = ["פתור", "תשובה", "תביא לי", "מה התשובה", "תחשב בשבילי", "תן לי"];
const REQUIRED  = ["σ","טווח","פיזור","שונות","ממוצע","הסבר","תסביר","כיצד","שלב","ריבועים","הפרש","הומוגני"];

function checkPrompt(text: string): { ok: boolean; kind: "forbidden"|"weak"|"ok"; msg: string } {
  const t = text.trim();
  if (t.length < 10)                       return { ok:false, kind:"weak",      msg:"הפרומפט קצר מדי." };
  if (FORBIDDEN.some(w => t.includes(w)))  return { ok:false, kind:"forbidden", msg:"זה פרומפט של העתקה — בקש הדרכה, לא פתרון." };
  if (!REQUIRED.some(w => t.includes(w)))  return { ok:false, kind:"weak",      msg:"כלול מילת מפתח: טווח / σ / פיזור / שונות…" };
  return { ok:true, kind:"ok", msg:"פרומפט תקין!" };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT INPUT FIELD
// ─────────────────────────────────────────────────────────────────────────────

function PromptInput({
  label, placeholder="", onApprove, validate, accentRgbStr="22,163,74",
}: {
  label: string; placeholder?: string; onApprove(): void;
  validate?(t: string): { ok: boolean; msg: string } | null;
  accentRgbStr?: string;
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
    <div style={{ background: "rgba(220,252,231,1)", border: "2px solid #16a34a", borderRadius: 12, padding: "10px 14px", display:"flex", alignItems:"center", gap:8 }}>
      <CheckCircle size={14} color="#16a34a" />
      <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>פרומפט מאושר! שלח ל-AI ואז המשך.</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <p style={{ color: TEXT2, fontSize: 12, fontWeight: 700, display:"flex", alignItems:"center", gap:4, margin:0 }}>
        <PenLine size={11}/>{label}
      </p>
      <textarea
        value={text} onChange={e => setText(e.target.value)} placeholder={placeholder}
        rows={3} dir="rtl"
        style={{ width:"100%", background: CARD2, border:`1px solid rgba(${accentRgbStr},0.35)`, borderRadius:10, padding:12, color: TEXT, fontSize:13, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }}
      />
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={submit}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:10, fontSize:12, background:`rgba(${accentRgbStr},0.08)`, border:`1px solid rgba(${accentRgbStr},0.35)`, color:`rgb(${accentRgbStr})`, fontWeight:600, cursor:"pointer" }}>
          <Check size={11}/>בדוק פרומפט
        </button>
        {text.length > 0 && <span style={{ color:MUTED, fontSize:11 }}>{text.length} תווים</span>}
      </div>
      <AnimatePresence>
        {res && !res.ok && (
          <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            style={{ fontSize:12, borderRadius:10, padding:"8px 12px", border: res.kind==="forbidden" ? "1px solid rgba(220,38,38,0.4)" : "1px solid rgba(234,88,12,0.4)", background: res.kind==="forbidden" ? "rgba(220,38,38,0.06)" : "rgba(234,88,12,0.06)", color: res.kind==="forbidden" ? "#DC2626" : "#B45309", margin:0 }}>
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
    <div style={{ marginBottom:"1.5rem" }}>
      <div style={{ color:"#DC2626", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>⚠️ מוקשים נפוצים</div>
      {items.map((p,i) => (
        <div key={i} style={{ borderRadius:12, border:"1px solid rgba(220,38,38,0.2)", background:"rgba(220,38,38,0.05)", padding:"0.8rem 1rem", marginBottom:8 }}>
          <div style={{ color:"#DC2626", fontWeight:600, fontSize:13, marginBottom: p.body ? 4 : 0 }}>{p.title}</div>
          {p.body && <div style={{ color:TEXT2, fontSize:13, lineHeight:1.6 }}>{p.body}</div>}
        </div>
      ))}
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
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 16px", borderRadius:12, fontSize:12, background: copied?"rgba(22,163,74,0.1)":CARD2, border: copied?"1px solid rgba(22,163,74,0.4)":"1px solid rgba(60,54,42,0.25)", color: copied?"#15803d":TEXT, fontWeight:500, cursor:"pointer" }}>
      {copied ? <><Check size={12}/>הועתק!</> : <><Copy size={12}/>העתק פרומפט</>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SILENT SVG DIAGRAMS
// ─────────────────────────────────────────────────────────────────────────────

function DiagramNumberLines() {
  const cx = 150;
  const clustered = [cx-10, cx-3, cx, cx+5, cx+12];
  const scattered  = [cx-80, cx-38, cx, cx+40, cx+82];
  return (
    <svg width={300} height={120} viewBox="0 0 300 120">
      <text x={14} y={36} fill={MUTED} fontSize={10} fontWeight="bold">יא&#x2019;1</text>
      <line x1={36} y1={32} x2={264} y2={32} stroke="#94a3b8" strokeWidth={1.5}/>
      {clustered.map((x,i) => <circle key={i} cx={x} cy={32} r={7} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth={2}/>)}
      <text x={14} y={88} fill={MUTED} fontSize={10} fontWeight="bold">יא&#x2019;2</text>
      <line x1={36} y1={84} x2={264} y2={84} stroke="#94a3b8" strokeWidth={1.5}/>
      {scattered.map((x,i) => <circle key={i} cx={x} cy={84} r={7} fill="rgba(244,63,94,0.2)" stroke="#f43f5e" strokeWidth={2}/>)}
    </svg>
  );
}

function DiagramBellCurves() {
  return (
    <svg width={300} height={110} viewBox="0 0 300 110">
      <line x1={10} y1={95} x2={290} y2={95} stroke="#94a3b8" strokeWidth={1.5}/>
      <path d="M 170 94 C 185 94, 195 20, 210 14 C 225 20, 235 94, 250 94" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round"/>
      <path d="M 30 94 C 55 94, 70 30, 90 14 C 110 30, 125 94, 150 94" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" strokeWidth={2} strokeLinejoin="round"/>
      <text x={60}  y={110} fill={MUTED} fontSize={9} textAnchor="middle">יא&#x2019;2 — רחבה</text>
      <text x={210} y={110} fill={MUTED} fontSize={9} textAnchor="middle">יא&#x2019;1 — צרה</text>
    </svg>
  );
}

function DiagramSigmaCards() {
  return (
    <div style={{ display:"flex", justifyContent:"center", gap:32, padding:"8px 0" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{ width:64, height:64, borderRadius:14, background:"rgba(139,92,246,0.08)", border:"1.5px solid rgba(139,92,246,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:32, fontWeight:700, color:"#7c3aed", fontFamily:"serif" }}>σ</span>
        </div>
        <span style={{ color:MUTED, fontSize:11 }}>סטיית תקן</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{ width:64, height:64, borderRadius:14, background:"rgba(234,88,12,0.08)", border:"1.5px solid rgba(234,88,12,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:26, fontWeight:700, color:"#EA580C", fontFamily:"serif" }}>σ²</span>
        </div>
        <span style={{ color:MUTED, fontSize:11 }}>שונות</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPERSION LAB
// ─────────────────────────────────────────────────────────────────────────────

const LAB_Z      = [-2, -1.3, -0.6, 0, 0.6, 1.3, 2];
const LAB_COLORS = ["#f43f5e","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"];
const LW = 360, LH = 160, LCX = 180, LAY = 110, LSCALE = 52;

function DispersionLab({ active }: { active?: boolean }) {
  const [sigma, setSigma] = useState(1.0);

  const bandL = Math.max(12, LCX - sigma * LSCALE);
  const bandR = Math.min(LW - 12, LCX + sigma * LSCALE);
  const sigmaColor = sigma < 1.2 ? "#16A34A" : sigma < 2.2 ? "#EA580C" : "#DC2626";
  const label = sigma < 1.2
    ? "פיזור נמוך — נקודות קרובות למרכז (הומוגני)"
    : sigma < 2.2
    ? "פיזור בינוני — ציונים מפוזרים סביב הממוצע"
    : "פיזור גבוה — נקודות רחוקות מהמרכז (הטרוגני)";

  return (
    <div style={{ borderRadius:16, border: active?`1.5px solid rgba(22,163,74,0.4)`:`1px solid ${BORDER}`, background: CARD, padding:"1.5rem", boxShadow: active?"0 4px 20px rgba(22,163,74,0.12)":"0 2px 8px rgba(60,54,42,0.08)" }}>
      <h3 style={{ color:TEXT, fontSize:16, fontWeight:700, textAlign:"center", marginBottom:4 }}>סימולטור פיזור סביב הממוצע</h3>
      <p style={{ color:MUTED, fontSize:12, textAlign:"center", marginBottom:"1.25rem" }}>הגדל את σ וראה איך הנקודות מתרחקות מהמרכז</p>

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1rem" }}>
        <span style={{ color:MUTED, fontSize:13, whiteSpace:"nowrap", fontFamily:"serif" }}>σ =</span>
        <input type="range" min={0.3} max={3.0} step={0.1} value={sigma}
          onChange={e => setSigma(parseFloat(e.target.value))}
          style={{ flex:1, accentColor:sigmaColor }}
        />
        <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:16, minWidth:38, color:sigmaColor }}>{sigma.toFixed(1)}</span>
      </div>

      <div style={{ display:"flex", justifyContent:"center", overflowX:"auto", background:"#fff", borderRadius:12, border:`1px solid ${BORDER}`, padding:"0.75rem" }}>
        <svg width={LW} height={LH} viewBox={`0 0 ${LW} ${LH}`} style={{ maxWidth:"100%", touchAction:"none" }}>
          <rect x={bandL} y={LAY-46} width={Math.max(0,bandR-bandL)} height={46}
            fill={sigmaColor+"18"} stroke={sigmaColor+"55"} strokeWidth={1.5} rx={5}/>
          <line x1={14} y1={LAY} x2={LW-14} y2={LAY} stroke="#94a3b8" strokeWidth={2}/>
          <line x1={LCX} y1={LAY-58} x2={LCX} y2={LAY+12} stroke="#EA580C" strokeWidth={2} strokeDasharray="5 3"/>
          <text x={LCX} y={LAY+26} textAnchor="middle" fill="#EA580C" fontSize={12} fontWeight="bold" fontFamily="serif">μ</text>
          <text x={Math.max(20, LCX-sigma*LSCALE)} y={LAY-50} textAnchor="middle" fill={sigmaColor+"aa"} fontSize={9}>−σ</text>
          <text x={Math.min(LW-20, LCX+sigma*LSCALE)} y={LAY-50} textAnchor="middle" fill={sigmaColor+"aa"} fontSize={9}>+σ</text>
          {LAB_Z.map((z,i) => {
            const px = Math.max(16, Math.min(LW-16, LCX+z*sigma*LSCALE));
            return <circle key={i} cx={px} cy={LAY-20} r={10} fill={LAB_COLORS[i]+"99"} stroke={LAB_COLORS[i]} strokeWidth={2}/>;
          })}
        </svg>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
        <div style={{ borderRadius:10, background:CARD2, border:`1px solid rgba(60,54,42,0.15)`, padding:"10px 8px", textAlign:"center" }}>
          <div style={{ color:MUTED, fontSize:10, marginBottom:4 }}>סטיית תקן (σ)</div>
          <div style={{ color:sigmaColor, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{sigma.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius:10, background:CARD2, border:`1px solid rgba(60,54,42,0.15)`, padding:"10px 8px", textAlign:"center" }}>
          <div style={{ color:MUTED, fontSize:10, marginBottom:4 }}>שונות (σ²)</div>
          <div style={{ color:"#7c3aed", fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{(sigma*sigma).toFixed(2)}</div>
        </div>
        <div style={{ borderRadius:10, background: sigma<=1.5?"rgba(220,252,231,1)":CARD2, border: sigma<=1.5?"1px solid rgba(22,163,74,0.4)":`1px solid rgba(60,54,42,0.15)`, padding:"10px 8px", textAlign:"center" }}>
          <div style={{ color: sigma<=1.5?"#15803d":MUTED, fontSize:10, marginBottom:4 }}>הומוגני?</div>
          <div style={{ color: sigma<=1.5?"#15803d":TEXT, fontWeight:700 }}>{sigma<=1.5?"כן":"לא"}</div>
        </div>
      </div>
      <p style={{ color:MUTED, fontSize:11, textAlign:"center", marginTop:10, lineHeight:1.5 }}>{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Step = { label:string; guide:string; prompt:string; answer:string; explain:string };
type Ex   = { id:"basic"|"frequency"|"advanced"; tabLabel:string; difficulty:string; title:string; problem:string; pitfalls:{title:string;body:string}[]; goldenPrompt:string; steps:Step[] };

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISES
// ─────────────────────────────────────────────────────────────────────────────

const EXERCISES: Ex[] = [
  {
    id:"basic", tabLabel:"טווח", difficulty:"בסיסי",
    title:"טווח ועקביות — שתי כיתות",
    problem:
      "שתי כיתות נבחנו באותו מבחן. לשתיהן ממוצע=80, אך הציונים שונים:\n\n" +
      "יא'1 (עקבית):   78, 79, 80, 81, 82\n" +
      "יא'2 (קיצונית): 60, 70, 80, 90, 100\n\n" +
      "(א) חשב את הטווח של כל כיתה.\n" +
      "(ב) איזו כיתה הומוגנית יותר לפי הטווח?\n" +
      "(ג) מה החסרון של הטווח כמדד פיזור?",
    pitfalls: [
      { title:"⚠️ טווח = מקס − מינ",     body:"טווח = הערך הגבוה ביותר פחות הנמוך. לא ממוצע הפרשים!" },
      { title:"הומוגני = טווח קטן",       body:"טווח קטן → ציונים קרובים → כיתה אחידה יותר." },
      { title:"חסרון: רגישות לקיצוניים",  body:"ציון קיצוני אחד משנה את הטווח דרמטית גם אם שאר הנתונים קרובים." },
    ],
    goldenPrompt:
      "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על מדדי פיזור.\n" +
      "שתי כיתות, ממוצע=80:\nיא'1: 78,79,80,81,82\nיא'2: 60,70,80,90,100\n\n" +
      "נחה אותי:\n1. כיצד לחשב טווח לכל כיתה.\n2. מי הומוגנית יותר.\n3. מה חסרון הטווח.\n" +
      "שאל 'מוכן?' בין שלב לשלב. אל תפתור ישירות.",
    steps: [
      { label:"שלב 1 — טווח יא'1", guide:"יא'1: 78,79,80,81,82. זהה מקסימום ומינימום וחשב טווח.",
        prompt:"\n\nיא'1: 78,79,80,81,82. הנחה אותי לזהות מקסימום ומינימום ולחשב טווח.",
        answer:"מקסימום=82, מינימום=78, טווח = 82−78 = 4",
        explain:"ציוני יא'1 קרובים מאוד — טווח קטן מאוד." },
      { label:"שלב 2 — טווח יא'2 והשוואה", guide:"יא'2: 60,70,80,90,100. חשב טווח והשווה ליא'1.",
        prompt:"\n\nיא'2: 60,70,80,90,100. הנחה אותי לחשב טווח ולהשוות ליא'1.",
        answer:"מקסימום=100, מינימום=60, טווח = 100−60 = 40\nיא'1 הומוגנית (טווח=4) | יא'2 הטרוגנית (טווח=40)",
        explain:"טווח של יא'2 גדול פי 10 — ציוניה הרבה יותר מפוזרים." },
      { label:"שלב 3 — חסרון הטווח", guide:"מה יקרה לטווח של יא'1 אם ציון אחד ישתנה ל-20?",
        prompt:"\n\nיא'1 עם ציון חריג: 20,79,80,81,82. הנחה אותי לחשב טווח ולהסביר מדוע הטווח מטעה כאן.",
        answer:"טווח חדש = 82−20 = 62 — גדל פי 15 בגלל ציון אחד קיצוני!",
        explain:"הטווח מושפע מאוד מנתון קיצוני אחד. לכן נעדיף סטיית תקן." },
    ],
  },
  {
    id:"frequency", tabLabel:"סטיית תקן", difficulty:"בינוני",
    title:"סטיית תקן (σ) — חישוב שלב אחר שלב",
    problem:
      "נתונים זהים (ממוצע=80 לשתיהן):\n\n" +
      "יא'1: 78, 79, 80, 81, 82\n" +
      "יא'2: 60, 70, 80, 90, 100\n\n" +
      "(א) חשב σ לכל כיתה: σ = √[Σ(xi−μ)²/n]\n" +
      "(ב) מי רחוקה יותר מהממוצע?\n" +
      "(ג) פרש: מה σ גדול אומר על הכיתה?",
    pitfalls: [
      { title:"⚠️ σ ≠ טווח",       body:"σ לוקחת בחשבון את כל הנתונים, לא רק קצוות." },
      { title:"ריבוע לפני שורש!",  body:"חשב Σ(xi−μ)², חלק ב-n ואז שורש. לא שורש לכל הפרש." },
      { title:"σ גבוה = הטרוגני",  body:"σ גדולה → נתונים מפוזרים → פחות אחיד." },
    ],
    goldenPrompt:
      "\n\nאתה מורה למתמטיקה. אני לומד סטיית תקן.\n" +
      "יא'1: 78,79,80,81,82  יא'2: 60,70,80,90,100. ממוצע=80 לשתיהן.\n\n" +
      "נחה אותי:\n1. כיצד לחשב σ ליא'1 שלב אחרי שלב.\n2. כיצד לחשב σ ליא'2.\n3. כיצד לפרש.\n" +
      "שאל 'מוכן?' בין שלב לשלב. אל תפתור ישירות.",
    steps: [
      { label:"שלב 1 — ממוצע שתי הכיתות", guide:"ממוצע = סכום / n. שתיהן: סכום=400, n=5, ממוצע=80.",
        prompt:"\n\nיא'1: 78,79,80,81,82 ויא'2: 60,70,80,90,100. הנחה אותי לחשב ממוצע לכל כיתה.",
        answer:"ממוצע יא'1 = 400/5 = 80\nממוצע יא'2 = 400/5 = 80",
        explain:"ממוצע זהה! הטווח וσ הם שמספרים את ההבדל האמיתי." },
      { label:"שלב 2 — σ של יא'1", guide:"הפרשים: −2,−1,0,1,2. ריבועים: 4,1,0,1,4. σ=√(10/5)≈1.41.",
        prompt:"\n\nיא'1: 78,79,80,81,82, μ=80. הנחה אותי לחשב הפרשים, לרבע, לחלק ב-5 ולשורש.",
        answer:"הפרשים: −2,−1,0,1,2\nריבועים: 4,1,0,1,4 → סכום=10\nσ(יא'1) = √(10/5) = √2 ≈ 1.41",
        explain:"σ נמוך מאוד — ציוני יא'1 צמודים לממוצע." },
      { label:"שלב 3 — σ של יא'2 ופרשנות", guide:"הפרשים: −20,−10,0,10,20. σ=√(1000/5)≈14.14.",
        prompt:"\n\nיא'2: 60,70,80,90,100, μ=80. הנחה אותי לחשב σ ולהשוות ל-σ(יא'1)=1.41.",
        answer:"הפרשים: −20,−10,0,10,20\nריבועים: 400,100,0,100,400 → סכום=1000\nσ(יא'2) = √(1000/5) ≈ 14.14",
        explain:"σ(יא'2)≈14.14 גדול פי 10 → יא'2 הטרוגנית בהרבה." },
    ],
  },
  {
    id:"advanced", tabLabel:"שונות וטרנספורמציה", difficulty:"מתקדם",
    title:"שונות וחוקי טרנספורמציה — Var(aX+b)",
    problem:
      "נתונים: יא'1: 78,79,80,81,82  |  יא'2: 60,70,80,90,100\n\n" +
      "(א) חשב שונות (Var=σ²) לכל כיתה.\n" +
      "(ב) המורה הוסיפה בונוס 10 לכולם ביא'2. מה יקרה ל-σ ולשונות?\n" +
      "(ג) הסבר: Var(X+b)=Var(X)  ו-Var(aX)=a²·Var(X).",
    pitfalls: [
      { title:"⚠️ X+b לא משנה σ",    body:"הוספת קבוע לכולם מזיזה ממוצע אך לא משנה פיזור." },
      { title:"aX כן משנה — בריבוע", body:"כפל ב-a מכפיל σ ב-a, ואת Var ב-a². לא באותו גורם!" },
      { title:"Var = σ², לא σ",       body:"שונות = ריבוע סטיית תקן. אל תבלבל בין השניים." },
    ],
    goldenPrompt:"",
    steps: [
      { label:"שלב 1 — שונות (Var) לכל כיתה", guide:"Var = σ². יא'1: σ≈1.41 → Var=2. יא'2: σ≈14.14 → Var=200.",
        prompt:"\n\nהנחה אותי לחשב שונות לכל כיתה ולהסביר הקשר בין σ ל-Var.",
        answer:"Var(יא'1) = (1.41)² ≈ 2\nVar(יא'2) = (14.14)² ≈ 200",
        explain:"שונות = σ². יא'2 פזורה פי 100 מיא'1 בשונות." },
      { label:"שלב 2 — בונוס 10: מה קורה?", guide:"Var(X+b)=Var(X), σ(X+b)=σ(X). הממוצע משתנה, הפיזור לא.",
        prompt:"\n\nהמורה הוסיפה 10 לכולם ביא'2: 70,80,90,100,110. הנחה אותי לחשב σ.",
        answer:"σ(יא'2 עם בונוס) = √200 ≈ 14.14 — זהה!\nממוצע חדש = 90",
        explain:"הזזת כל נתון באותה כמות לא משנה מרחקים → פיזור זהה." },
      { label:"שלב 3 — Var(aX) = a²·Var(X)", guide:"כפל ב-2: σ×2, Var×4.",
        prompt:"\n\nיא'1 מוכפלת ב-2: 156,158,160,162,164. הנחה אותי לחשב σ ו-Var.",
        answer:"σ(2·יא'1) = 2·1.41 ≈ 2.83\nVar(2·יא'1) = 4·2 = 8\nכלל: Var(aX) = a²·Var(X)",
        explain:"כפל ב-2 מכפיל הפרשים ב-2, לכן σ×2 ו-Var×4." },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STEP — BASE  (copy prompt)
// ─────────────────────────────────────────────────────────────────────────────

function StepBase({ step, idx, unlocked, onDone, ac }: { step:Step; idx:number; unlocked:boolean; onDone():void; ac:string }) {
  const [open, setOpen]     = useState(false);
  const [done, setDone]     = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() { await navigator.clipboard.writeText(step.prompt); setCopied(true); setTimeout(()=>setCopied(false),2000); }

  const borderColor = !unlocked ? BORDER : done ? "rgba(22,163,74,0.4)" : `rgba(${ac},0.3)`;
  const bg          = !unlocked ? "rgba(255,255,255,0.4)" : done ? "rgba(220,252,231,0.5)" : CARD2;

  return (
    <div style={{ borderRadius:12, border:`1px solid ${borderColor}`, background:bg, padding:"1rem", marginBottom:10, opacity: !unlocked?0.5:1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: unlocked?10:0 }}>
        <span style={{ width:20, height:20, borderRadius:"50%", border:`1.5px solid ${!unlocked?BORDER:done?"rgba(22,163,74,0.6)":`rgba(${ac},0.6)`}`, background: !unlocked?"transparent":done?"rgba(220,252,231,1)":`rgba(${ac},0.08)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color: !unlocked?MUTED:done?"#15803d":`rgb(${ac})`, flexShrink:0 }}>
          {!unlocked?"🔒":done?"✓":idx+1}
        </span>
        <p style={{ fontWeight:600, fontSize:13, color: !unlocked?MUTED:TEXT2, margin:0 }}>{step.label}</p>
      </div>
      {unlocked && (
        <div style={{ marginRight:30, display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ color:MUTED, fontSize:13, margin:0 }}>{step.guide}</p>
          {!done && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <p style={{ color:MUTED, fontSize:11, margin:0 }}>📋 פרומפט מוכן:</p>
              <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"10px 14px", color:TEXT2, fontSize:12, lineHeight:1.6 }}>{step.prompt}</div>
              <button onClick={copy} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:10, fontSize:12, background: copied?"rgba(22,163,74,0.1)":CARD2, border: copied?"1px solid rgba(22,163,74,0.4)":`1px solid ${BORDER}`, color: copied?"#15803d":TEXT2, cursor:"pointer", alignSelf:"flex-start" }}>
                {copied ? <><Check size={11}/>הועתק!</> : <><Copy size={11}/>העתק פרומפט</>}
              </button>
            </div>
          )}
          {!open && !done && (
            <button onClick={()=>setOpen(true)} style={{ padding:"6px 14px", borderRadius:10, fontSize:12, background:`rgba(${ac},0.08)`, border:`1px solid rgba(${ac},0.3)`, color:`rgb(${ac})`, cursor:"pointer", alignSelf:"flex-start" }}>
              הצג פתרון ▼
            </button>
          )}
          {(open||done) && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"10px 14px" }}>
                <code style={{ color:"#15803d", fontSize:13, fontFamily:"monospace", whiteSpace:"pre-wrap" }}>{step.answer}</code>
              </div>
              <p style={{ color:TEXT2, fontSize:13, margin:0 }}>{step.explain}</p>
            </div>
          )}
          {open && !done && (
            <button onClick={()=>{setDone(true);onDone();}} style={{ padding:"6px 16px", borderRadius:10, fontSize:12, background:`rgba(${ac},0.08)`, border:`1px solid rgba(${ac},0.3)`, color:`rgb(${ac})`, cursor:"pointer", alignSelf:"flex-start" }}>
              המשך ←
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP — INPUT  (student writes prompt)
// ─────────────────────────────────────────────────────────────────────────────

function StepInput({ step, idx, unlocked, onDone, ac, advanced=false }: { step:Step; idx:number; unlocked:boolean; onDone():void; ac:string; advanced?:boolean }) {
  const [approved, setApproved] = useState(false);
  const [open,     setOpen]     = useState(false);
  const [done,     setDone]     = useState(false);

  const borderColor = !unlocked ? BORDER : done ? "rgba(22,163,74,0.4)" : `rgba(${ac},0.35)`;
  const bg          = !unlocked ? "rgba(255,255,255,0.4)" : done ? "rgba(220,252,231,0.4)" : `rgba(${ac},0.04)`;

  return (
    <div style={{ borderRadius:12, border:`1px solid ${borderColor}`, background:bg, padding:"1rem", marginBottom:10, opacity: !unlocked?0.5:1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: unlocked?10:0 }}>
        <span style={{ width:20, height:20, borderRadius:"50%", border:`1.5px solid ${!unlocked?BORDER:done?"rgba(22,163,74,0.6)":`rgba(${ac},0.6)`}`, background: !unlocked?"transparent":done?"rgba(220,252,231,1)":`rgba(${ac},0.08)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color: !unlocked?MUTED:done?"#15803d":`rgb(${ac})`, flexShrink:0 }}>
          {!unlocked?"🔒":done?"✓":idx+1}
        </span>
        <p style={{ fontWeight:600, fontSize:13, color: !unlocked?MUTED:TEXT2, margin:0, flex:1 }}>{step.label}</p>
        {unlocked && !done && <span style={{ fontSize:11, color:`rgb(${ac})`, border:`1px solid rgba(${ac},0.3)`, borderRadius:6, padding:"2px 8px", display:"flex", alignItems:"center", gap:3 }}><PenLine size={9}/>כתוב פרומפט</span>}
      </div>
      {unlocked && (
        <div style={{ marginRight:30, display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ color:MUTED, fontSize:13, margin:0 }}>{step.guide}</p>
          {!approved && (
            <PromptInput label="✍️ כתוב פרומפט משלך:" placeholder={advanced?"":"לדוגמה: כיצד מחשבים σ? הנחה אותי שלב אחרי שלב…"} onApprove={()=>setApproved(true)} accentRgbStr={ac}/>
          )}
          {approved && !open && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ background:"rgba(220,252,231,1)", border:"2px solid #16a34a", borderRadius:10, padding:"8px 12px", color:TEXT, fontSize:12, fontWeight:600 }}>✅ שלח ל-AI, קבל עזרה, ואז חזור.</div>
              <button onClick={()=>setOpen(true)} style={{ padding:"6px 14px", borderRadius:10, fontSize:12, background:`rgba(${ac},0.08)`, border:`1px solid rgba(${ac},0.3)`, color:`rgb(${ac})`, cursor:"pointer", alignSelf:"flex-start" }}>הצג פתרון ▼</button>
            </div>
          )}
          {(open||done) && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"10px 14px" }}>
                <code style={{ color:"#15803d", fontSize:13, fontFamily:"monospace", whiteSpace:"pre-wrap" }}>{step.answer}</code>
              </div>
              <p style={{ color:TEXT2, fontSize:13, margin:0 }}>{step.explain}</p>
            </div>
          )}
          {open && !done && (
            <button onClick={()=>{setDone(true);onDone();}} style={{ padding:"6px 16px", borderRadius:10, fontSize:12, background:`rgba(${ac},0.08)`, border:`1px solid rgba(${ac},0.3)`, color:`rgb(${ac})`, cursor:"pointer", alignSelf:"flex-start" }}>המשך ←</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────────────────

function Confetti({ on }: { on:boolean }) {
  if (!on) return null;
  const pts = Array.from({length:28},(_,i)=>{
    const a=(i/28)*360, d=40+Math.random()*60;
    return { x:Math.cos(a*Math.PI/180)*d, y:-(Math.random()*80+15), c:["#16A34A","#EA580C","#DC2626","#3b82f6"][i%4], s:3+Math.random()*4, r:Math.random()*720, dl:Math.random()*.3 };
  });
  return (
    <div style={{ pointerEvents:"none", position:"absolute", inset:0, overflow:"hidden" }} aria-hidden>
      {pts.map((p,i)=>(
        <div key={i} style={{ position:"absolute", left:"50%", top:"40%", width:p.s, height:p.s, background:p.c, borderRadius:2, animation:`confettiBurst .9s ease-out ${p.dl}s both`, ["--tx" as string]:`${p.x}px`, ["--ty" as string]:`${p.y}px`, ["--rot" as string]:`${p.r}deg` }}/>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLUTION WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

function SolutionBase({ steps, onComplete, ac }: { steps:Step[]; onComplete():void; ac:string }) {
  const [open, setOpen]         = useState(false);
  const [count, setCount]       = useState(0);
  const [confetti, setConfetti] = useState(false);
  const allDone = count === steps.length;
  const done = useCallback(()=>{ setCount(c=>{ const n=c+1; if(n===steps.length){setConfetti(true);setTimeout(()=>setConfetti(false),1400);onComplete();} return n; }); },[steps.length,onComplete]);
  return (
    <div style={{ position:"relative", background:CARD, border:`1px solid rgba(${ac},0.25)`, borderRadius:16, padding:"1.5rem", marginBottom:"1.5rem", boxShadow:`0 4px 16px rgba(${ac},0.08)` }}>
      <Confetti on={confetti}/>
      <h3 style={{ color:TEXT, fontSize:16, fontWeight:700, margin:"0 0 4px" }}>פתרון מלא — בסיסי</h3>
      <p style={{ color:MUTED, fontSize:13, margin:"0 0 16px" }}>כל שלב כולל פרומפט מוכן — העתק, שלח ל-AI, ואז הצג פתרון</p>
      {!open
        ? <button onClick={()=>setOpen(true)} style={{ padding:"10px 22px", borderRadius:12, background:`rgba(${ac},0.1)`, border:`1px solid rgba(${ac},0.35)`, color:`rgb(${ac})`, fontWeight:700, fontSize:13, cursor:"pointer" }}>✅ התחל פתרון</button>
        : <div>
            <div style={{ height:6, background:DIV, borderRadius:4, overflow:"hidden", marginBottom:12 }}>
              <div style={{ height:"100%", borderRadius:4, background:`rgb(${ac})`, width:`${(count/steps.length)*100}%`, transition:"width 0.4s" }}/>
            </div>
            {allDone && <div style={{ background:"rgba(220,252,231,1)", border:"1.5px solid rgba(22,163,74,0.5)", borderRadius:12, padding:"12px 16px", textAlign:"center", color:"#15803d", fontWeight:700, marginBottom:12 }}>🏆 מצוין! טווח(יא'1)=4 ← הומוגנית | טווח(יא'2)=40 ← הטרוגנית</div>}
            {steps.map((s,i)=><StepBase key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done} ac={ac}/>)}
          </div>
      }
    </div>
  );
}

function SolutionMedium({ steps, onComplete, ac }: { steps:Step[]; onComplete():void; ac:string }) {
  const [open, setOpen]         = useState(false);
  const [count, setCount]       = useState(0);
  const [confetti, setConfetti] = useState(false);
  const allDone = count === steps.length;
  const done = useCallback(()=>{ setCount(c=>{ const n=c+1; if(n===steps.length){setConfetti(true);setTimeout(()=>setConfetti(false),1400);onComplete();} return n; }); },[steps.length,onComplete]);
  return (
    <div style={{ position:"relative", background:CARD, border:`1px solid rgba(${ac},0.25)`, borderRadius:16, padding:"1.5rem", marginBottom:"1.5rem", boxShadow:`0 4px 16px rgba(${ac},0.08)` }}>
      <Confetti on={confetti}/>
      <h3 style={{ color:TEXT, fontSize:16, fontWeight:700, margin:"0 0 4px" }}>פתרון מלא — בינוני</h3>
      <p style={{ color:MUTED, fontSize:13, margin:"0 0 16px" }}>שלב 1: פרומפט מוכן. שלבים 2-3: <span style={{ color:`rgb(${ac})`, fontWeight:600 }}>עליך לכתוב</span></p>
      {!open
        ? <button onClick={()=>setOpen(true)} style={{ padding:"10px 22px", borderRadius:12, background:`rgba(${ac},0.1)`, border:`1px solid rgba(${ac},0.35)`, color:`rgb(${ac})`, fontWeight:700, fontSize:13, cursor:"pointer" }}>✅ התחל פתרון</button>
        : <div>
            <div style={{ height:6, background:DIV, borderRadius:4, overflow:"hidden", marginBottom:12 }}>
              <div style={{ height:"100%", borderRadius:4, background:`rgb(${ac})`, width:`${(count/steps.length)*100}%`, transition:"width 0.4s" }}/>
            </div>
            {allDone && <div style={{ background:"rgba(220,252,231,1)", border:"1.5px solid rgba(22,163,74,0.5)", borderRadius:12, padding:"12px 16px", textAlign:"center", color:"#15803d", fontWeight:700, marginBottom:12 }}>🏆 מעולה! σ(יא'1)≈1.41 ← הומוגנית | σ(יא'2)≈14.14 ← הטרוגנית</div>}
            {steps.map((s,i)=>i<1?<StepBase key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done} ac={ac}/>:<StepInput key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done} ac={ac}/>)}
          </div>
      }
    </div>
  );
}

function SolutionAdvanced({ steps, onComplete, ac }: { steps:Step[]; onComplete():void; ac:string }) {
  const [gateText,  setGateText]  = useState("");
  const [gateError, setGateError] = useState("");
  const [gateOk,    setGateOk]    = useState(false);
  const [open,      setOpen]      = useState(false);
  const [count,     setCount]     = useState(0);
  const [confetti,  setConfetti]  = useState(false);
  const allDone = count === steps.length;
  const done = useCallback(()=>{ setCount(c=>{ const n=c+1; if(n===steps.length){setConfetti(true);setTimeout(()=>setConfetti(false),1400);onComplete();} return n; }); },[steps.length,onComplete]);

  function submitGate() {
    const t = gateText.trim();
    if (t.length < 30)       { setGateError("הפרומפט קצר מדי — לפחות 30 תווים."); return; }
    if (FORBIDDEN.some(w=>t.includes(w))) { setGateError("🚫 בקש הדרכה, לא פתרון."); return; }
    const ADV = ["σ","שונות","Var","טרנספורמציה","כפל","חיבור","קבוע","הסבר","תסביר","כיצד","שלב","פיזור","ריבוע"];
    if (!ADV.some(w=>t.includes(w))) { setGateError("💡 כלול מילת מפתח (σ / שונות / Var…)."); return; }
    setGateOk(true);
  }

  return (
    <div style={{ position:"relative", background:CARD, border:`1px solid rgba(${ac},0.25)`, borderRadius:16, padding:"1.5rem", marginBottom:"1.5rem", boxShadow:`0 4px 16px rgba(${ac},0.08)` }}>
      <Confetti on={confetti}/>
      <h3 style={{ color:TEXT, fontSize:16, fontWeight:700, margin:"0 0 4px" }}>פתרון מלא — מתקדם</h3>
      <p style={{ color:MUTED, fontSize:13, margin:"0 0 16px" }}>אפס סיוע מובנה. <span style={{ color:`rgb(${ac})`, fontWeight:600 }}>כתוב את כל הפרומפטים בעצמך.</span></p>

      {!gateOk && (
        <div style={{ background:`rgba(${ac},0.05)`, border:`1px solid rgba(${ac},0.25)`, borderRadius:14, padding:"1.25rem", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Lock size={14} color={`rgb(${ac})`}/>
            <p style={{ fontWeight:600, color:TEXT, fontSize:13, margin:0 }}>שלב 0 — נסח את הפרומפט הזהב שלך</p>
          </div>
          <p style={{ color:MUTED, fontSize:13, margin:0, lineHeight:1.6 }}>כתוב פרומפט פתיחה שיכלול: הגדרת הבעיה (שתי הכיתות, σ שחישבת), מה אתה רוצה ללמוד על שונות וטרנספורמציה, ובקשה להדרכה — לא פתרון.</p>
          <textarea value={gateText} onChange={e=>{setGateText(e.target.value);setGateError("");}} dir="rtl"
            style={{ width:"100%", background:CARD, border:`1px solid rgba(${ac},0.3)`, borderRadius:10, padding:12, color:TEXT, fontSize:13, resize:"none", minHeight:90, boxSizing:"border-box", fontFamily:"inherit" }}/>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={submitGate} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:10, fontSize:12, background:`rgba(${ac},0.1)`, border:`1px solid rgba(${ac},0.35)`, color:`rgb(${ac})`, fontWeight:600, cursor:"pointer" }}>
              <Check size={11}/>בדוק פרומפט
            </button>
            {gateText.length > 0 && <span style={{ color:MUTED, fontSize:11 }}>{gateText.length} תווים</span>}
          </div>
          {gateError && <p style={{ fontSize:12, borderRadius:10, padding:"8px 12px", border:`1px solid rgba(${ac},0.3)`, background:`rgba(${ac},0.06)`, color:`rgb(${ac})`, margin:0 }}>{gateError}</p>}
        </div>
      )}

      {gateOk && !open && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ background:"rgba(220,252,231,1)", border:"2px solid #16a34a", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
            <CheckCircle size={13} color="#16a34a"/><span style={{ color:TEXT, fontSize:12, fontWeight:600 }}>פרומפט ראשוני מאושר! שלח ל-AI ואז התחל שלבים.</span>
          </div>
          <button onClick={()=>setOpen(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 22px", borderRadius:12, background:`rgba(${ac},0.1)`, border:`1px solid rgba(${ac},0.35)`, color:`rgb(${ac})`, fontWeight:700, fontSize:13, cursor:"pointer", alignSelf:"flex-start" }}>
            🔓 התחל שלבי פתרון
          </button>
        </div>
      )}

      {open && (
        <div>
          <div style={{ height:6, background:DIV, borderRadius:4, overflow:"hidden", marginBottom:12 }}>
            <div style={{ height:"100%", borderRadius:4, background:`rgb(${ac})`, width:`${(count/steps.length)*100}%`, transition:"width 0.4s" }}/>
          </div>
          {allDone && <div style={{ background:"rgba(220,252,231,1)", border:"1.5px solid rgba(22,163,74,0.5)", borderRadius:12, padding:"12px 16px", textAlign:"center", color:"#15803d", fontWeight:700, marginBottom:12 }}>🏆 כל הכבוד! Var(X+b)=Var(X) | Var(aX)=a²·Var(X)</div>}
          {steps.map((s,i)=><StepInput key={i} step={s} idx={i} unlocked={i===0||count>=i} onDone={done} ac={ac} advanced/>)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL PANEL
// ─────────────────────────────────────────────────────────────────────────────

function LevelPanel({ ex }: { ex:Ex }) {
  const [levelDone, setLevelDone] = useState(false);
  const ac  = accentRgb(ex.id);
  const col = accentColor(ex.id);

  const badgeStyle: React.CSSProperties = {
    fontSize:13, fontWeight:700, padding:"4px 14px", borderRadius:999,
    background:`rgba(${ac},0.12)`, border:`1px solid rgba(${ac},0.4)`, color:col,
  };

  return (
    <div>
      {/* Title row */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1.5rem" }}>
        <span style={badgeStyle}>{ex.difficulty}</span>
        <h2 style={{ color:TEXT, fontSize:20, fontWeight:800, margin:0 }}>{ex.title}</h2>
      </div>
      <div style={{ height:1, background:DIV, marginBottom:"1.5rem" }}/>

      {/* Silent diagram */}
      <div style={{ borderRadius:16, border:`1px solid rgba(${ac},0.3)`, background:CARD2, padding:"1.5rem", display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"1.5rem", boxShadow:`0 4px 16px rgba(${ac},0.1)` }}>
        <p style={{ color:col, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>
          {ex.id==="basic" ? "שתי כיתות — פיזור על ציר" : ex.id==="frequency" ? "צורת ההתפלגות — צרה מול רחבה" : "σ ו-σ² — מדדי הפיזור"}
        </p>
        {ex.id==="basic"     && <DiagramNumberLines/>}
        {ex.id==="frequency" && <DiagramBellCurves/>}
        {ex.id==="advanced"  && <DiagramSigmaCards/>}
        <p style={{ color:MUTED, fontSize:11, marginTop:10, textAlign:"center" }}>
          {ex.id==="basic" ? "נסה לאמוד מה הטווח לפני שממשיכים" : ex.id==="frequency" ? "איזו כיתה 'רחבה' יותר — זו עם σ גדול יותר" : "שונות = σ² — לא אותו דבר!"}
        </p>
      </div>

      {/* Problem */}
      <div style={{ borderRadius:16, border:`1px solid rgba(${ac},0.3)`, background:CARD2, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <div style={{ color:MUTED, fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:10 }}>📝 השאלה</div>
        <pre style={{ color:TEXT, fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:"0 0 10px" }}>{ex.problem}</pre>
        <p style={{ color:MUTED, fontSize:12, margin:0 }}>💡 נסה לפתור לפני שתמשיך</p>
      </div>

      {/* Pitfalls */}
      <Pitfalls items={ex.pitfalls}/>

      {/* Golden prompt */}
      {ex.id !== "advanced" && (
        <div style={{ borderRadius:16, border:`1px solid rgba(${ac},0.35)`, background:CARD2, overflow:"hidden", marginBottom:"1.5rem", boxShadow:`0 4px 16px rgba(${ac},0.1)` }}>
          <div style={{ padding:"1rem 1.25rem", borderBottom:`1px solid rgba(${ac},0.2)`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:`rgba(${ac},0.1)`, border:`1px solid rgba(${ac},0.3)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Target size={15} color={col}/>
              </div>
              <div>
                <p style={{ fontWeight:700, color:TEXT, fontSize:13, margin:0 }}>הפרומפט הזהב</p>
                <p style={{ color:MUTED, fontSize:11, margin:0 }}>העתק ושלח ל-AI שלך</p>
              </div>
            </div>
            <CopyBtn text={ex.goldenPrompt}/>
          </div>
          <div style={{ padding:"1rem 1.25rem" }}>
            <pre style={{ color:TEXT2, fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 }}>{ex.goldenPrompt}</pre>
          </div>
        </div>
      )}

      {/* Solution */}
      {ex.id==="basic"     && <SolutionBase     steps={ex.steps} onComplete={()=>setLevelDone(true)} ac={ac}/>}
      {ex.id==="frequency" && <SolutionMedium   steps={ex.steps} onComplete={()=>setLevelDone(true)} ac={ac}/>}
      {ex.id==="advanced"  && <SolutionAdvanced steps={ex.steps} onComplete={()=>setLevelDone(true)} ac={ac}/>}

      {/* Interactive lab */}
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, borderTop:`1px solid ${DIV}`, paddingTop:16, marginBottom:12 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:levelDone?"#16A34A":col, animation:"pulse 2s infinite" }}/>
          <p style={{ color:col, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>סימולטור אינטראקטיבי</p>
        </div>
        <AnimatePresence>
          {levelDone && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{ background:"rgba(220,252,231,1)", border:"1.5px solid rgba(22,163,74,0.4)", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
              <Sparkles size={18} color="#16A34A" style={{ flexShrink:0 }}/>
              <div>
                <p style={{ color:"#15803d", fontWeight:700, fontSize:13, margin:"0 0 2px" }}>
                  {ex.id==="basic" ? "טווח(יא'1)=4 לעומת טווח(יא'2)=40 — נסה σ=0.3 ו-σ=3!"
                   : ex.id==="frequency" ? "σ(יא'1)≈1.41, σ(יא'2)≈14.14 — הגדל σ וראה את הפיזור!"
                   : "Var(X+b)=Var(X) | Var(aX)=a²·Var(X) — שחק עם הסימולטור!"}
                </p>
                <p style={{ color:MUTED, fontSize:11, margin:0 }}>הזז את הסליידר לראות כיצד σ משפיע על הפיזור</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <DispersionLab active={levelDone}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id:"basic",     label:"בסיסי",  textColor:"#16A34A", border:"rgba(22,163,74,0.5)",   bg:"rgba(22,163,74,0.08)"   },
  { id:"frequency", label:"בינוני", textColor:"#EA580C", border:"rgba(234,88,12,0.5)",   bg:"rgba(234,88,12,0.08)"   },
  { id:"advanced",  label:"מתקדם",  textColor:"#DC2626", border:"rgba(220,38,38,0.5)",   bg:"rgba(220,38,38,0.08)"   },
];

export default function StatisticsDispersionPage() {
  const [activeId, setActiveId] = useState<Ex["id"]>("basic");
  const scrollRef = useRef<HTMLDivElement>(null);

  function switchTab(id: Ex["id"]) {
    setActiveId(id);
    setTimeout(()=>scrollRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }

  const ex = EXERCISES.find(e=>e.id===activeId)!;

  return (
    <main
      style={{ minHeight:"100vh", background:BG, backgroundImage:"radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize:"24px 24px", color:TEXT2 } as React.CSSProperties}
      dir="rtl"
    >
      <style>{`
        @keyframes confettiBurst { to { transform:translate(var(--tx),var(--ty)) rotate(var(--rot)); opacity:0; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        textarea:focus, input[type="text"]:focus { outline:none; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:`1px solid rgba(60,54,42,0.15)`, background:BG }}>
        <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"0.9rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:TEXT, margin:0 }}>📊 מדדי פיזור</h1>
            <p style={{ fontSize:13, color:MUTED, margin:"2px 0 0" }}>טווח, סטיית תקן ושונות — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/grade10/statistics"
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#4A4A4A", border:"1px solid #333", borderRadius:10, fontSize:14, fontWeight:600, color:"#FFFFFF", textDecoration:"none", whiteSpace:"nowrap", transition:"background 0.15s" }}
            onMouseEnter={e=>{ (e.currentTarget as HTMLAnchorElement).style.background="#2D2D2D"; }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLAnchorElement).style.background="#4A4A4A"; }}
          >
            <span style={{fontSize:16}}>←</span>חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth:"56rem", margin:"0 auto", padding:"2rem 1rem 5rem" }}>

        {/* Tab bar */}
        <div ref={scrollRef} style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)", border:`1px solid rgba(60,54,42,0.15)`, borderRadius:14, padding:4, marginBottom:"2rem" }}>
          {TABS.map(t=>{
            const e = EXERCISES.find(x=>x.id===t.id)!;
            const active = activeId===t.id;
            return (
              <button key={t.id} onClick={()=>switchTab(t.id as Ex["id"])}
                style={{ flex:1, padding:"10px 12px", borderRadius:10, fontSize:13, fontWeight:600, transition:"all 0.2s", cursor:"pointer", border: active?`1.5px solid ${t.border}`:"1px solid transparent", background: active?t.bg:"transparent", color: active?t.textColor:MUTED }}>
                <span style={{ display:"block" }}>{t.label}</span>
                <span style={{ display:"block", fontSize:11, fontWeight:400, opacity:0.7, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.tabLabel}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeId} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}>
            <LevelPanel ex={ex}/>
          </motion.div>
        </AnimatePresence>

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade10/statistics/dispersion" level={activeId as "basic" | "medium" | "advanced"} />
        </div>

      </div>
    </main>
  );
}
