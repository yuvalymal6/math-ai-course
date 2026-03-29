"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";

// ─── Shared style ──────────────────────────────────────────────────────────────

const ISLAND: React.CSSProperties = {
  border: "8px solid #334155",
  borderRadius: "24px",
  padding: "2rem",
  backgroundColor: "#0f172a",
  marginBottom: "2.5rem",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [cp, setCp] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCp(true); setTimeout(() => setCp(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 10, fontSize: 13, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(34,211,238,0.35)", color: "#22d3ee", cursor: "pointer" }}
    >
      {cp ? <Check size={13} /> : <Copy size={13} />}{cp ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי" }: { prompt: string; title?: string }) {
  return (
    <div style={{ borderRadius: 14, padding: 1, background: "linear-gradient(135deg,rgba(34,211,238,0.55),rgba(34,211,238,0.2),rgba(167,139,250,0.4))", marginBottom: 20 }}>
      <div style={{ borderRadius: 13, background: "rgba(0,0,0,0.78)", padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span>✨</span>
          <span style={{ color: "#22d3ee", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
        </div>
        <p style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-wrap" }}>{prompt}</p>
        <CopyBtn text={prompt} label="העתק פרומפט מלא" />
      </div>
    </div>
  );
}

function TutorStepBasic({ title, prompt }: { title: string; prompt: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b", marginBottom: 10 }}>
      <div style={{ padding: "9px 16px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid #1e293b" }}>
        <span style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ background: "rgba(0,0,0,0.3)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ borderRadius: 8, background: "rgba(0,0,0,0.5)", border: "1px solid #1e293b", padding: 12, fontSize: 12, color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{prompt}</div>
        <CopyBtn text={prompt} />
      </div>
    </div>
  );
}

function TutorStepMedium({ title, placeholder, contextWords, onPass }: {
  title: string; placeholder: string; contextWords: string[]; onPass: () => void;
}) {
  const [val, setVal] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [cp, setCp] = useState(false);
  const passed = result !== null && !result.blocked && result.score >= 75;
  const scoreBarColor = !result ? "#9CA3AF"
    : result.score >= 75 ? "#16a34a"
    : result.score >= 50 ? "#d97706"
    : "#dc2626";
  const validate = () => {
    const r = calculatePromptScore(val, contextWords);
    setResult(r);
    if (!r.blocked && r.score >= 75) onPass();
  };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid #1e293b" }}>
        {passed && <CheckCircle size={14} color="#34d399" />}
        <span style={{ color: passed ? "#cbd5e1" : "#f59e0b", fontSize: 12, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ background: "rgba(0,0,0,0.3)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea value={val} rows={3} dir="rtl"
          onChange={e => { setVal(e.target.value); setResult(null); }}
          placeholder={placeholder} disabled={passed}
          style={{ width: "100%", minHeight: 80, borderRadius: 10, background: "rgba(0,0,0,0.5)", border: `1px solid ${passed ? "rgba(52,211,153,0.4)" : "#334155"}`, color: "#e2e8f0", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit", opacity: passed ? 0.6 : 1 }}
        />
        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        {result && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
            borderRadius: 12,
            background: result.blocked ? "rgba(254,226,226,1)" : result.score >= 75 ? "rgba(220,252,231,1)" : "rgba(255,251,235,1)",
            border: `2px solid ${result.blocked ? "#dc2626" : result.score >= 75 ? "#16a34a" : "#d97706"}`,
            padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6,
            ...(result.score >= 75 ? { fontWeight: 600 } : {})
          }}>
            {result.hint}
          </motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(val); setCp(true); setTimeout(() => setCp(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, fontSize: 12, background: "transparent", border: "1px solid rgba(52,211,153,0.3)", color: "#6ee7b7", cursor: "pointer" }}>
              {cp ? <Check size={12} /> : <Copy size={12} />}{cp ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}
        {!passed && <button onClick={validate} style={{ padding: "7px 18px", borderRadius: 10, fontSize: 12, background: "rgba(0,0,0,0.4)", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer" }}>בדוק ניסוח 🤖</button>}
      </div>
    </div>
  );
}

function KeywordPills({ text, keywords }: { text: string; keywords: string[] }) {
  return (
    <div style={{ borderRadius: 12, border: "1px solid #1e293b", background: "rgba(0,0,0,0.4)", padding: "10px 14px", marginBottom: 16 }}>
      <div style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>מילות מפתח נדרשות</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {keywords.map(kw => {
          const found = text.includes(kw);
          return (
            <span key={kw} style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, transition: "all 0.25s", background: found ? "rgba(6,78,59,0.4)" : "rgba(30,41,59,0.6)", border: `1px solid ${found ? "rgba(52,211,153,0.5)" : "#334155"}`, color: found ? "#34d399" : "#475569" }}>
              {kw}{found ? " ✓" : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Silent Calculus SVGs ─────────────────────────────────────────────────────

// Shared axes
function Axes() {
  return (
    <>
      <line x1={30} y1={165} x2={290} y2={165} stroke="#334155" strokeWidth={1.5} />
      <line x1={30} y1={165} x2={30}  y2={10}  stroke="#334155" strokeWidth={1.5} />
      <text x={293} y={168} fill="#475569" fontSize={9}>x</text>
      <text x={30}  y={7}   fill="#475569" fontSize={9} textAnchor="middle">y</text>
    </>
  );
}

// Level 1 — e^(2x-4): curve + tangent at x=2
function CalculusSVG_L1() {
  // f(x)=e^(2x-4). At x=2: f=1, f'=2. Tangent: y = 2(x-2)+1 = 2x-3
  // Map domain [0,3] → x∈[30,270], range [0,6] → y∈[165,15]
  const toX = (x: number) => 30 + (x / 3) * 240;
  const toY = (y: number) => 165 - Math.min((y / 6) * 150, 150);
  const pts = Array.from({ length: 61 }, (_, i) => {
    const x = i * 3 / 60;
    return `${toX(x)},${toY(Math.exp(2 * x - 4))}`;
  }).join(" ");
  // tangent line x∈[1,3]: y=2x-3
  const tx1 = toX(1.5), ty1 = toY(2 * 1.5 - 3);
  const tx2 = toX(2.8), ty2 = toY(2 * 2.8 - 3);
  const px  = toX(2),   py  = toY(1);
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 310 180" style={{ width: "100%", maxWidth: 320, display: "block" }} aria-hidden>
        <Axes />
        {/* Curve */}
        <polyline points={pts} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Tangent line (amber) */}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
        {/* Contact point */}
        <circle cx={px} cy={py} r={4} fill="#f59e0b" />
        <line x1={px} y1={165} x2={px} y2={py} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
        {/* Labels */}
        <text x={px}   y={174}  fill="#f59e0b"  fontSize={9}  textAnchor="middle">x=2</text>
        <text x={tx2+8} y={ty2} fill="#f59e0b"  fontSize={9}>משיק</text>
        <text x={255}  y={toY(Math.exp(2*2.9-4))-6} fill="#34d399" fontSize={9}>eˣ</text>
      </svg>
    </div>
  );
}

// Level 2 — (x-3)eˣ: curve + extremum marker
function CalculusSVG_L2() {
  // f(x)=(x-3)eˣ, f'=eˣ(x-2)=0 → x=2 is minimum
  const toX = (x: number) => 30 + ((x + 1) / 6) * 240; // domain [-1,5]
  const toY = (y: number) => 165 - Math.min(Math.max((y + 20) / 30 * 140, 0), 150);
  const pts = Array.from({ length: 121 }, (_, i) => {
    const x = -1 + i * 6 / 120;
    return `${toX(x)},${toY((x - 3) * Math.exp(x))}`;
  }).join(" ");
  const ex = toX(2), ey = toY((2 - 3) * Math.exp(2)); // minimum at x=2
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 310 180" style={{ width: "100%", maxWidth: 320, display: "block" }} aria-hidden>
        <Axes />
        <polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Minimum marker */}
        <circle cx={ex} cy={ey} r={4} fill="#fb7185" />
        <line x1={ex} y1={165} x2={ex} y2={ey} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
        <text x={ex}   y={174} fill="#fb7185" fontSize={9} textAnchor="middle">x=2</text>
        <text x={ex+8} y={ey-6} fill="#fb7185" fontSize={9}>מינימום</text>
        <text x={252}  y={toY((4.5-3)*Math.exp(4.5))-6} fill="#f59e0b" fontSize={9}>(x-3)eˣ</text>
      </svg>
    </div>
  );
}

// Level 3 — eˣ - ax: two curves for different a, show tangency
function CalculusSVG_L3() {
  const toX = (x: number) => 30 + ((x + 1) / 5) * 240; // domain [-1,4]
  const toY = (y: number) => 165 - Math.min(Math.max((y) / 8 * 140, 0), 155);
  const ptsF = Array.from({ length: 101 }, (_, i) => {
    const x = -1 + i * 5 / 100;
    return `${toX(x)},${toY(Math.exp(x) - 2 * x)}`;
  }).join(" ");
  const ptsG = Array.from({ length: 101 }, (_, i) => {
    const x = -1 + i * 5 / 100;
    return `${toX(x)},${toY(Math.exp(x) - 3.5 * x)}`;
  }).join(" ");
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 310 180" style={{ width: "100%", maxWidth: 320, display: "block" }} aria-hidden>
        <Axes />
        <polyline points={ptsF} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={ptsG} fill="none" stroke="#475569" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
        {/* Label */}
        <text x={220} y={30}  fill="#a78bfa" fontSize={9}>eˣ − ax</text>
        <text x={220} y={58}  fill="#64748b" fontSize={9}>a שונה</text>
        {/* Parameter label */}
        <text x={58}  y={20}  fill="#f59e0b" fontSize={10} fontWeight={600}>a = ?</text>
      </svg>
    </div>
  );
}

// ─── FunctionLab ──────────────────────────────────────────────────────────────
// Shows f(x) = e^(ax+b) with a sliding tangent point

function FunctionLab() {
  const [a, setA]   = useState(10);  // ×10 → actual = 1.0
  const [b, setBVal] = useState(0);  // integer, actual = b
  const [tx, setTx] = useState(5);   // tangent x ×10 → actual = 0.5

  const A  = a / 10;
  const B  = b;
  const TX = tx / 10;

  // f(x) = e^(Ax+B),  f'(x) = A·e^(Ax+B)
  const fAt  = (x: number) => Math.exp(A * x + B);
  const fVal = fAt(TX);
  const fDer = A * fVal;                              // slope at TX
  // tangent: y = fDer*(x - TX) + fVal

  // Map domain [-2, 3] → SVG x∈[40,280], y range capped [0.001, 20]
  const domL = -2, domR = 3;
  const rangeH = 20;
  const toX = (x: number) => 40 + ((x - domL) / (domR - domL)) * 240;
  const toY = (y: number) => 165 - Math.min(Math.max((y / rangeH) * 140, 0), 150);

  const curvePts = Array.from({ length: 101 }, (_, i) => {
    const x = domL + i * (domR - domL) / 100;
    const y = fAt(x);
    return `${toX(x)},${toY(y)}`;
  }).join(" ");

  // tangent segment: draw ±0.8 units around TX
  const tLen = 0.8;
  const tx1 = TX - tLen, ty1 = fDer * (tx1 - TX) + fVal;
  const tx2 = TX + tLen, ty2 = fDer * (tx2 - TX) + fVal;

  const px = toX(TX), py = toY(fVal);

  return (
    <section style={{ ...ISLAND, borderColor: "rgba(34,211,238,0.2)", overflow: "hidden", boxSizing: "border-box" }}>
      <h3 style={{ color: "white", fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>מעבדת חשבון דיפרנציאלי</h3>
      <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: "1rem" }}>
        f(x) = e^(ax+b) — שנה פרמטרים וראה את המשיק זז
      </p>

      {/* Sliders */}
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
        {[
          { label: "מקדם a", val: a, set: setA, min: -20, max: 20, disp: (A).toFixed(1), color: "#34d399" },
          { label: "קבוע b",  val: b, set: setBVal, min: -5,  max: 5,  disp: String(B), color: "#22d3ee" },
          { label: "נקודת המשיק x₀", val: tx, set: setTx, min: -20, max: 30, disp: TX.toFixed(1), color: "#f59e0b" },
        ].map(r => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 2 }}>
              <span>{r.label}</span>
              <span style={{ color: r.color, fontWeight: 700, fontFamily: "monospace" }}>{r.disp}</span>
            </div>
            <input type="range" min={r.min} max={r.max} step={1} value={r.val}
              onChange={e => r.set(+e.target.value)}
              style={{ display: "block", width: "100%", accentColor: r.color }} />
          </div>
        ))}
      </div>

      {/* Graph */}
      <div style={{ borderRadius: 12, border: "1px solid #1e293b", background: "rgba(0,0,0,0.5)", height: 240, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1rem", overflow: "hidden", padding: "0.5rem" }}>
        <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "100%" }} aria-hidden>
          {/* Grid */}
          {[-1, 0, 1, 2].map(gx => (
            <line key={gx} x1={toX(gx)} y1={20} x2={toX(gx)} y2={165} stroke="#1e293b" strokeWidth={1} strokeDasharray="3 3" />
          ))}
          {[5, 10, 15].map(gy => (
            <line key={gy} x1={40} y1={toY(gy)} x2={280} y2={toY(gy)} stroke="#1e293b" strokeWidth={1} strokeDasharray="3 3" />
          ))}
          {/* Axes */}
          <line x1={40} y1={165} x2={284} y2={165} stroke="#334155" strokeWidth={1.5} />
          <line x1={40} y1={165} x2={40}  y2={14}  stroke="#334155" strokeWidth={1.5} />
          <text x={287} y={168} fill="#475569" fontSize={8}>x</text>
          <text x={40}  y={10}  fill="#475569" fontSize={8} textAnchor="middle">y</text>
          {/* Tick labels */}
          {[-1, 0, 1, 2, 3].map(gx => (
            <text key={gx} x={toX(gx)} y={174} fill="#475569" fontSize={7} textAnchor="middle">{gx}</text>
          ))}
          {/* Curve */}
          <polyline points={curvePts} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Tangent line */}
          <line x1={toX(tx1)} y1={toY(ty1)} x2={toX(tx2)} y2={toY(ty2)}
            stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
          {/* Contact point */}
          <circle cx={px} cy={py} r={4.5} fill="#f59e0b" />
          {/* Vertical dashed drop */}
          <line x1={px} y1={165} x2={px} y2={py} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        </svg>
      </div>

      {/* Result tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { label: "f(x₀)",      val: fVal > 1000 ? ">1000" : fVal.toFixed(3), sub: "e^(ax₀+b)",      color: "#34d399" },
          { label: "שיפוע המשיק", val: fDer > 1000 ? ">1000" : fDer.toFixed(3), sub: "a·e^(ax₀+b)",  color: "#f59e0b" },
          { label: "משוואת משיק", val: `y = ${fDer.toFixed(1)}·(x−${TX.toFixed(1)})+${fVal.toFixed(1)}`, sub: "y − y₀ = m(x − x₀)", color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid #1e293b", padding: "10px 6px", textAlign: "center", minWidth: 0 }}>
            <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>{r.val}</div>
            <div style={{ color: "#475569", fontSize: 9, marginTop: 3 }}>{r.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Level content ────────────────────────────────────────────────────────────

// ── Level 1 ──────────────────────────────────────────────────────────────────
const L1_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על נגזרת ומשיק.\n" +
  "נתון: f(x) = e^(2x−4).\n" +
  "עזור לי:\n" +
  "1. לגזור את f(x) באמצעות כלל השרשרת.\n" +
  "2. למצוא את שיפוע המשיק בנקודה x=2.\n" +
  "3. לכתוב את משוואת המשיק בנקודה (2, f(2)).\n" +
  "אל תפתור — שאל אותי שאלות מנחות בכל שלב.";

const L1_STEPS = [
  {
    title: "שלב א׳ — גזירת f(x) = e^(2x−4) בכלל השרשרת",
    prompt:
      "\n\nאני צריך לגזור f(x) = e^(2x−4).\n" +
      "הנוסחה היא: [e^(u(x))]′ = u′(x)·e^(u(x)).\n" +
      "כאשר u(x) = 2x−4, מהי u′(x)?\n" +
      "ולכן f′(x) = ?",
  },
  {
    title: "שלב ב׳ — שיפוע המשיק ב-x=2",
    prompt:
      "\n\nמצאתי f′(x) = 2e^(2x−4).\n" +
      "כעת אני מציב x=2: מה הערך של 2x−4 כאשר x=2?\n" +
      "ולכן שיפוע המשיק הוא m = f′(2) = ?",
  },
  {
    title: "שלב ג׳ — משוואת המשיק",
    prompt:
      "\n\nשיפוע המשיק: m = 2, נקודת המגע: (2, 1).\n" +
      "נוסחת המשיק: y − y₀ = m(x − x₀).\n" +
      "הצב וכתב את המשוואה הסופית.",
  },
];

// ── Level 2 ──────────────────────────────────────────────────────────────────
const L2_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל חקירה.\n" +
  "נתון: f(x) = (x−3)·eˣ.\n" +
  "1. עזור לי לגזור בכלל נגזרת המכפלה: (u·v)′.\n" +
  "2. עזור לי למצוא נקודות קיצון על ידי השוואה לאפס.\n" +
  "3. עזור לי לקבוע את סוג הקיצון ותחומי עלייה/ירידה.\n" +
  "הנחה אותי — אל תפתור ישירות.";

const L2_CONTEXT_WORDS = ["מעריכי", "eˣ", "נגזרת", "e", "חקירה", "קיצון", "גדילה", "דעיכה"];

// ── Level 3 ──────────────────────────────────────────────────────────────────
const L3_GATE_TEXT =
  "נתון: f(x) = eˣ − ax\n" +
  "ידוע שלפונקציה יש קיצון בנקודה x = ln(2).\n\n" +
  "נסח פרומפט זהב שיבקש מה-AI לעזור לך:\n" +
  "1. לגזור את f(x) ולהציב x = ln(2) בנגזרת.\n" +
  "2. להשוות לאפס ולפתור עבור a.\n" +
  "3. לקבוע אם זהו מינימום או מקסימום.\n\n" +
  "כתוב לפחות 80 תווים — ניסוח מדויק בלבד:";

// ─── Level picker meta ────────────────────────────────────────────────────────

type Level = 1 | 2 | 3;
const LEVEL_META: Record<Level, { label: string; sub: string; color: string; glowColor: string }> = {
  1: { label: "בסיסי",  sub: "נגזרת ומשיק — e^(2x−4)",      color: "#34d399", glowColor: "rgba(52,211,153,0.35)"  },
  2: { label: "בינוני", sub: "קיצון וחקירה — (x−3)eˣ",       color: "#f59e0b", glowColor: "rgba(245,158,11,0.35)"  },
  3: { label: "מתקדם", sub: "פרמטר נסתר — eˣ − ax",          color: "#a78bfa", glowColor: "rgba(167,139,250,0.35)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExponentialCalculusPage() {
  const [level, setLevel] = useState<Level>(1);

  // Level 2
  const [l2p0, setL2p0] = useState(false);
  const [l2p1, setL2p1] = useState(false);
  const [l2p2, setL2p2] = useState(false);

  // Level 3
  const [l3Text, setL3Text]           = useState("");
  const [l3Submitted, setL3Submitted] = useState(false);
  const l3Count = l3Text.trim().length;
  const GATE = 80;

  return (
    <div style={{ background: "#020617", minHeight: "100vh", width: "100%" }}>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem", color: "white" }} dir="rtl">

        {/* Nav */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/topic/grade12/calculus"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "bold", marginTop: "0.5rem" }}>פונקציות מעריכיות eˣ — עם AI</h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>נגזרת, משיק, קיצון וחקירה — ואיך לשאול AI את השאלות הנכונות</p>
        </div>

        {/* ── Level picker ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: "2.5rem" }}>
          {([1, 2, 3] as Level[]).map(lv => {
            const m = LEVEL_META[lv];
            const active = level === lv;
            return (
              <button key={lv} onClick={() => setLevel(lv)} style={{
                borderRadius: 20, padding: "1.25rem 1rem",
                background: active ? "#0f172a" : "rgba(15,23,42,0.5)",
                border: `3px solid ${active ? m.color : "#1e293b"}`,
                cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                boxShadow: active ? `0 0 20px 4px ${m.glowColor}` : "none",
              }}>
                <div style={{ color: m.color, fontWeight: 800, fontSize: 17, marginBottom: 5 }}>{m.label}</div>
                <div style={{ color: "#64748b", fontSize: 11, lineHeight: 1.4 }}>{m.sub}</div>
              </button>
            );
          })}
        </div>

        {/* ══════════════ LEVEL 1 ══════════════ */}
        {level === 1 && (
          <>
            <section style={{ ...ISLAND, borderColor: "rgba(52,211,153,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(52,211,153,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#34d399", flexShrink: 0 }} />
                <h2 style={{ color: "#34d399", fontSize: 17, fontWeight: 800, margin: 0 }}>🟢 רמה בסיסית — משיק לפונקציה מעריכית</h2>
              </div>
              <CalculusSVG_L1 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 6, fontFamily: "monospace" }}>
                  f(x) = e<sup style={{ fontSize: 10 }}>2x−4</sup>
                </p>
                <ol style={{ color: "#cbd5e1", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>גזור את f(x) בכלל השרשרת.</li>
                  <li>חשב את שיפוע המשיק בנקודה x = 2.</li>
                  <li>כתוב את משוואת המשיק.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L1_PROMPT} title="פרומפט זהב — רענן מורה AI" />
              {L1_STEPS.map(s => <TutorStepBasic key={s.title} title={s.title} prompt={s.prompt} />)}
            </section>
            <FunctionLab />
          </>
        )}

        {/* ══════════════ LEVEL 2 ══════════════ */}
        {level === 2 && (
          <>
            <section style={{ ...ISLAND, borderColor: "rgba(245,158,11,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#f59e0b", flexShrink: 0 }} />
                <h2 style={{ color: "#f59e0b", fontSize: 17, fontWeight: 800, margin: 0 }}>🟡 רמה בינונית — חקירת (x−3)eˣ</h2>
              </div>
              <CalculusSVG_L2 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 6, fontFamily: "monospace" }}>
                  f(x) = (x − 3) · e<sup style={{ fontSize: 10 }}>x</sup>
                </p>
                <ol style={{ color: "#cbd5e1", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>גזור את f(x) בכלל נגזרת המכפלה.</li>
                  <li>מצא נקודות קיצון על ידי השוואה לאפס.</li>
                  <li>קבע תחומי עלייה וירידה וסוג הקיצון.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L2_PROMPT} title="פרומפט זהב — שלב האימון" />
              <TutorStepMedium
                title="שלב א׳ — גזירה בכלל נגזרת המכפלה"
                placeholder="כתוב: f′(x) = (x−3)′·eˣ + (x−3)·(eˣ)′ = 1·eˣ + (x−3)·eˣ = eˣ(x−2) כי..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p0(true)}
              />
              <TutorStepMedium
                title="שלב ב׳ — מציאת קיצון בהשוואה לאפס"
                placeholder="כתוב: f′(x)=0 → eˣ(x−2)=0. מכיוון ש-eˣ>0 תמיד, אז השוואה לאפס נותנת x=..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p1(true)}
              />
              <TutorStepMedium
                title="שלב ג׳ — תחומי עלייה וסוג קיצון"
                placeholder="כתוב: תחום עלייה הוא x>2 כי f′>0 שם. תחום ירידה הוא x<2. לכן x=2 הוא..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p2(true)}
              />
              {l2p0 && l2p1 && l2p2 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ borderRadius: 12, background: "rgba(6,78,59,0.15)", border: "1px solid rgba(52,211,153,0.3)", padding: "1rem", color: "#6ee7b7", fontSize: 14, marginTop: "1rem" }}>
                  ✅ כל הכבוד! סיימת את רמת האימון.
                </motion.div>
              )}
            </section>
            <FunctionLab />
          </>
        )}

        {/* ══════════════ LEVEL 3 ══════════════ */}
        {level === 3 && (
          <>
            <section style={{ ...ISLAND, borderColor: "rgba(167,139,250,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#a78bfa", flexShrink: 0 }} />
                <h2 style={{ color: "#a78bfa", fontSize: 17, fontWeight: 800, margin: 0 }}>🟣 רמה מתקדמת — פרמטר נסתר a</h2>
              </div>
              <CalculusSVG_L3 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.5rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 6, fontFamily: "monospace" }}>
                  f(x) = e<sup style={{ fontSize: 10 }}>x</sup> − ax
                </p>
                <p style={{ color: "#cbd5e1", fontSize: 14 }}>
                  ידוע שלפונקציה יש <strong style={{ color: "#a78bfa" }}>קיצון בנקודה x = ln(2)</strong>. מצא את a.
                </p>
              </div>

              {!l3Submitted ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ borderRadius: 12, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(0,0,0,0.4)", padding: "1.25rem" }}>
                    <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>🔐 נסח בעצמך פרומפט זהב מלא</div>
                    <pre style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{L3_GATE_TEXT}</pre>
                  </div>
                  <textarea value={l3Text} rows={5} dir="rtl"
                    onChange={e => setL3Text(e.target.value)}
                    placeholder="כתוב כאן פרומפט מדויק — לפחות 80 תווים..."
                    style={{ width: "100%", minHeight: 130, borderRadius: 12, background: "rgba(0,0,0,0.5)", border: "1px solid #334155", color: "white", fontSize: 14, padding: 14, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                  <div>
                    <div style={{ height: 5, borderRadius: 4, background: "#1e293b", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: l3Count >= GATE ? "#34d399" : "#a78bfa", width: `${Math.min(100, (l3Count / GATE) * 100)}%`, transition: "width 0.2s" }} />
                    </div>
                    <div style={{ fontSize: 11, color: l3Count >= GATE ? "#34d399" : "#475569", marginTop: 4, textAlign: "left" }}>{l3Count} / {GATE} תווים</div>
                  </div>
                  <button onClick={() => { if (l3Count >= GATE) setL3Submitted(true); }} disabled={l3Count < GATE}
                    style={{ padding: "12px 24px", borderRadius: 12, background: l3Count >= GATE ? "rgba(167,139,250,0.12)" : "transparent", border: `1px solid ${l3Count >= GATE ? "rgba(167,139,250,0.5)" : "#1e293b"}`, color: l3Count >= GATE ? "#a78bfa" : "#334155", fontSize: 14, fontWeight: 600, cursor: l3Count >= GATE ? "pointer" : "not-allowed", transition: "all 0.3s" }}>
                    שלח לחונך →
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ borderRadius: 12, background: "rgba(6,78,59,0.15)", border: "1px solid rgba(52,211,153,0.3)", padding: "1.25rem", color: "#6ee7b7", fontSize: 15 }}>
                  ✅ כל הכבוד! הפרומפט שלך נשלח לחונך.
                </motion.div>
              )}
            </section>
            <FunctionLab />
          </>
        )}

      </main>
    </div>
  );
}
