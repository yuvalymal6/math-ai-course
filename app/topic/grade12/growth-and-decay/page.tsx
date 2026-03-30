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

// ─── Silent Exponential SVGs ──────────────────────────────────────────────────

// Shared axis helpers
function Axes({ w = 280, h = 160, ox = 30, oy = 140 }: { w?: number; h?: number; ox?: number; oy?: number }) {
  return (
    <>
      {/* x-axis */}
      <line x1={ox} y1={oy} x2={w} y2={oy} stroke="#334155" strokeWidth={1.5} />
      <text x={w + 6} y={oy + 4} fill="#475569" fontSize={10}>t</text>
      {/* y-axis */}
      <line x1={ox} y1={oy} x2={ox} y2={10} stroke="#334155" strokeWidth={1.5} />
      <text x={ox - 4} y={8} fill="#475569" fontSize={10} textAnchor="end">M</text>
      {/* origin */}
      <text x={ox - 6} y={oy + 12} fill="#475569" fontSize={9} textAnchor="middle">0</text>
    </>
  );
}

// Level 1 — growth curve (emerald)
function ExponentialSVG_L1() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 300 175" style={{ width: "100%", maxWidth: 320, display: "block" }} aria-hidden>
        <Axes />
        {/* Growth curve */}
        <path d="M 30 135 C 80 130, 150 100, 220 55 S 265 25, 285 15"
          fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" />
        {/* M₀ dot */}
        <circle cx={30} cy={135} r={4} fill="#34d399" />
        <text x={38} y={132} fill="#34d399" fontSize={10} fontWeight={600}>M₀</text>
        {/* t=5 dashed marker */}
        <line x1={160} y1={140} x2={160} y2={82} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={30}  y1={82} x2={160} y2={82} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
        <text x={157} y={153} fill="#f59e0b" fontSize={9} textAnchor="middle">t</text>
        <text x={18}  y={85}  fill="#f59e0b" fontSize={9} textAnchor="middle">M(t)</text>
      </svg>
    </div>
  );
}

// Level 2 — decay curve (rose) with half-life marker
function ExponentialSVG_L2() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 300 175" style={{ width: "100%", maxWidth: 320, display: "block" }} aria-hidden>
        <Axes />
        {/* Decay curve */}
        <path d="M 30 20 C 80 35, 140 80, 190 112 S 255 132, 285 138"
          fill="none" stroke="#fb7185" strokeWidth={2.5} strokeLinecap="round" />
        {/* M₀ dot */}
        <circle cx={30} cy={20} r={4} fill="#fb7185" />
        <text x={38} y={24} fill="#fb7185" fontSize={10} fontWeight={600}>M₀</text>
        {/* Half-life marker at t½ */}
        <line x1={155} y1={140} x2={155} y2={80} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={30}  y1={80} x2={155} y2={80} stroke="#a78bfa" strokeWidth={1} strokeDasharray="3 3" />
        <text x={152} y={153} fill="#a78bfa" fontSize={9} textAnchor="middle">t½</text>
        <text x={18}  y={83}  fill="#a78bfa" fontSize={9} textAnchor="end">M₀/2</text>
      </svg>
    </div>
  );
}

// Level 3 — two growth curves (A slower, B steeper) crossing M_A line
function ExponentialSVG_L3() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 300 175" style={{ width: "100%", maxWidth: 320, display: "block" }} aria-hidden>
        <Axes />
        {/* Plan A — shallower (emerald) */}
        <path d="M 30 120 C 90 115, 160 95, 240 65 S 275 50, 285 44"
          fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" />
        <text x={287} y={46} fill="#34d399" fontSize={10} fontWeight={600}>A</text>
        {/* Plan B — steeper (violet) */}
        <path d="M 30 130 C 90 120, 150 90, 200 55 S 255 25, 285 15"
          fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
        <text x={287} y={17} fill="#a78bfa" fontSize={10} fontWeight={600}>B</text>
        {/* 2×A line (dashed amber) */}
        <path d="M 30 90 C 90 84, 160 62, 240 28"
          fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" />
        <text x={200} y={22} fill="#f59e0b" fontSize={9}>2·A</text>
      </svg>
    </div>
  );
}

// ─── ExponentialGrowthLab ─────────────────────────────────────────────────────

function ExponentialGrowthLab({ initM0, initQ, mode }: { initM0: number; initQ: number; mode: "growth" | "decay" }) {
  const [M0, setM0] = useState(initM0);
  const [Q,  setQ]  = useState(initQ);   // stored as ×10 integer for slider, e.g. 12 = 1.2

  const q = Q / 10;                       // actual base

  // Compute M(t) for t = 0..10
  const points: [number, number][] = Array.from({ length: 11 }, (_, t) => [t, M0 * Math.pow(q, t)]);

  // Canvas area: x 40..280, y 20..160  (SVG 320×180)
  const maxM  = Math.max(...points.map(p => p[1]), 1);
  const toX   = (t: number) => 40 + (t / 10) * 240;
  const toY   = (m: number) => 160 - Math.min((m / maxM) * 140, 140);

  const polyline = points.map(([t, m]) => `${toX(t)},${toY(m)}`).join(" ");

  // Dynamic viewBox — same fixed canvas
  const curveColor = q >= 1 ? "#34d399" : "#fb7185";

  // Half-life / doubling time
  const infoLabel = q >= 1 ? "זמן כפלה (t₂)" : "חצי חיים (t½)";
  const infoVal   = q === 1 ? "∞" : (Math.log(q >= 1 ? 2 : 0.5) / Math.log(q)).toFixed(2) + " יח׳";

  return (
    <section style={{ ...ISLAND, borderColor: "rgba(34,211,238,0.2)", overflow: "hidden", boxSizing: "border-box" }}>
      <h3 style={{ color: "white", fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>מעבדת גדילה ודעיכה — שנה פרמטרים</h3>
      <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: "1rem" }}>M(t) = M₀ · qᵗ — הגרף מתעדכן בזמן אמת</p>

      {/* Sliders */}
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 2 }}>
            <span>כמות התחלתית M₀</span>
            <span style={{ color: "white", fontWeight: 700, fontFamily: "monospace" }}>{M0}</span>
          </div>
          <input type="range" min={100} max={2000} step={100} value={M0}
            onChange={e => setM0(+e.target.value)}
            style={{ display: "block", width: "100%", accentColor: "#22d3ee" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 2 }}>
            <span>מכפיל בסיסי q</span>
            <span style={{ color: curveColor, fontWeight: 700, fontFamily: "monospace" }}>
              {q.toFixed(1)} {q > 1 ? "⬆ גדילה" : q < 1 ? "⬇ דעיכה" : "= יציב"}
            </span>
          </div>
          <input type="range" min={5} max={20} step={1} value={Q}
            onChange={e => setQ(+e.target.value)}
            style={{ display: "block", width: "100%", accentColor: curveColor }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 2 }}>
            <span>q = 0.5</span><span>q = 1.0</span><span>q = 2.0</span>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div style={{ borderRadius: 12, border: "1px solid #1e293b", background: "rgba(0,0,0,0.5)", height: 200, display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "1rem", overflow: "hidden", padding: "0.5rem" }}>
        <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "100%" }} aria-hidden>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={40} y1={160 - f * 140} x2={280} y2={160 - f * 140}
              stroke="#1e293b" strokeWidth={1} strokeDasharray="3 3" />
          ))}
          {[2, 4, 6, 8, 10].map(t => (
            <line key={t} x1={toX(t)} y1={20} x2={toX(t)} y2={160}
              stroke="#1e293b" strokeWidth={1} strokeDasharray="3 3" />
          ))}
          {/* Axes */}
          <line x1={40} y1={160} x2={284} y2={160} stroke="#334155" strokeWidth={1.5} />
          <line x1={40} y1={160} x2={40}  y2={16}  stroke="#334155" strokeWidth={1.5} />
          <text x={288} y={163} fill="#475569" fontSize={9}>t</text>
          <text x={40}  y={12}  fill="#475569" fontSize={9} textAnchor="middle">M</text>
          {/* Tick labels */}
          {[2, 4, 6, 8, 10].map(t => (
            <text key={t} x={toX(t)} y={172} fill="#475569" fontSize={8} textAnchor="middle">{t}</text>
          ))}
          {/* Curve */}
          <polyline points={polyline} fill="none" stroke={curveColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* M0 dot */}
          <circle cx={40} cy={toY(M0)} r={4} fill={curveColor} />
        </svg>
      </div>

      {/* Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { label: "כמות בt=5",    val: (M0 * Math.pow(q, 5)).toFixed(1),  sub: "M₀ · q⁵",        color: curveColor },
          { label: "כמות בt=10",   val: (M0 * Math.pow(q, 10)).toFixed(1), sub: "M₀ · q¹⁰",       color: curveColor },
          { label: infoLabel,       val: infoVal,                            sub: "log(2)/log(q)",   color: "#f59e0b"  },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid #1e293b", padding: "10px 6px", textAlign: "center", minWidth: 0 }}>
            <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace", wordBreak: "break-all" }}>{r.val}</div>
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
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על חיידקים.\n" +
  "מושבת חיידקים מתחילה ב-1,000 חיידקים ומתרבה ב-20% בכל שעה.\n" +
  "עזור לי:\n" +
  "1. לכתוב נוסחה כללית M(t) לכמות החיידקים אחרי t שעות.\n" +
  "2. לחשב כמה חיידקים יהיו אחרי 5 שעות.\n" +
  "אל תפתור — שאל אותי שאלות מנחות בכל שלב.";

const L1_STEPS = [
  {
    title: "שלב א׳ — הנוסחה הכללית M(t)",
    prompt:
      "\n\nאני רוצה לבנות נוסחה לגדילה מעריכית.\n" +
      "מה קורה לכמות אחרי שעה אחת? (רמז: גידול של 20%)\n" +
      "מה הבסיס q של הנוסחה M(t) = M₀ · qᵗ?",
  },
  {
    title: "שלב ב׳ — חישוב M(5)",
    prompt:
      "\n\nמצאתי: M(t) = 1000 · 1.2ᵗ.\n" +
      "עכשיו אני מציב t = 5.\n" +
      "כיצד מחשבים 1.2⁵? האם אפשר להשתמש במחשבון? מה התוצאה?",
  },
];

// ── Level 2 ──────────────────────────────────────────────────────────────────
const L2_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על דעיכה רדיואקטיבית.\n" +
  "חומר רדיואקטיבי דועך לפי: M(t) = M₀ · (0.5)^(t/T)\n" +
  "כאשר T הוא חצי החיים ו-t בשנים.\n" +
  "1. עזור לי להבין מה המשמעות של חצי חיים.\n" +
  "2. עזור לי למצוא T אם ידוע שאחרי 300 שנה נשאר 12.5% מהחומר.\n" +
  "הנחה אותי — אל תפתור ישירות.";

const L2_CONTEXT_WORDS = ["גדילה", "דעיכה", "אחוז", "eˣ", "זמן", "מקדם", "נוסחה", "צמיחה"];

// ── Level 3 ──────────────────────────────────────────────────────────────────
const L3_GATE_TEXT =
  "שתי תוכניות חיסכון:\n" +
  "   תוכנית A: השקעה של 10,000 ₪ בריבית 6% לשנה\n" +
  "   תוכנית B: השקעה של 6,000 ₪ בריבית 10% לשנה\n\n" +
  "נסח פרומפט זהב שיבקש מה-AI לעזור לך:\n" +
  "1. לכתוב את הנוסחה לכל תוכנית: A(t), B(t).\n" +
  "2. למצוא את t שבו B(t) = 2 · A(t).\n" +
  "3. להסביר כיצד מפשטים את המשוואה עם לוגריתמים.\n\n" +
  "כתוב לפחות 80 תווים — ניסוח מדויק בלבד:";

// ─── Level picker meta ────────────────────────────────────────────────────────

type Level = 1 | 2 | 3;
const LEVEL_META: Record<Level, { label: string; sub: string; color: string; glowColor: string }> = {
  1: { label: "בסיסי",  sub: "חיידקים — גדילה מעריכית",       color: "#34d399", glowColor: "rgba(52,211,153,0.35)"  },
  2: { label: "בינוני", sub: "דעיכה רדיואקטיבית — חצי חיים",  color: "#f59e0b", glowColor: "rgba(245,158,11,0.35)"  },
  3: { label: "מתקדם", sub: "השוואת תוכניות חיסכון",           color: "#a78bfa", glowColor: "rgba(167,139,250,0.35)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GrowthAndDecayPage() {
  const [level, setLevel] = useState<Level>(1);

  // Level 2
  const [l2p0, setL2p0] = useState(false);
  const [l2p1, setL2p1] = useState(false);

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
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "bold", marginTop: "0.5rem" }}>גדילה ודעיכה — עם AI</h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>מודלים מעריכיים, חצי חיים וריבית דריבית — ואיך לשאול AI את השאלות הנכונות</p>
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
                <h2 style={{ color: "#34d399", fontSize: 17, fontWeight: 800, margin: 0 }}>🟢 רמה בסיסית — גדילה מעריכית</h2>
              </div>
              <ExponentialSVG_L1 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>
                  מושבת חיידקים מתחילה ב-<strong style={{ color: "#34d399" }}>1,000 חיידקים</strong> ומתרבה ב-<strong style={{ color: "#34d399" }}>20% בכל שעה</strong>.
                </p>
                <ol style={{ color: "#cbd5e1", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>כתוב נוסחה כללית M(t) לכמות החיידקים אחרי t שעות.</li>
                  <li>חשב כמה חיידקים יהיו אחרי 5 שעות.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L1_PROMPT} title="פרומפט זהב — רענן מורה AI" />
              {L1_STEPS.map(s => <TutorStepBasic key={s.title} title={s.title} prompt={s.prompt} />)}
            </section>
            <ExponentialGrowthLab initM0={1000} initQ={12} mode="growth" />
          </>
        )}

        {/* ══════════════ LEVEL 2 ══════════════ */}
        {level === 2 && (
          <>
            <section style={{ ...ISLAND, borderColor: "rgba(245,158,11,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#f59e0b", flexShrink: 0 }} />
                <h2 style={{ color: "#f59e0b", fontSize: 17, fontWeight: 800, margin: 0 }}>🟡 רמה בינונית — חצי חיים רדיואקטיבי</h2>
              </div>
              <ExponentialSVG_L2 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>
                  חומר רדיואקטיבי דועך לפי: <strong style={{ color: "#fb7185", fontFamily: "monospace" }}>M(t) = M₀ · (0.5)^(t/T)</strong>
                </p>
                <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>
                  ידוע: אחרי <strong style={{ color: "#f59e0b" }}>300 שנה</strong> נשאר <strong style={{ color: "#f59e0b" }}>12.5%</strong> מהחומר המקורי.
                </p>
                <ol style={{ color: "#cbd5e1", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>הסבר מה המשמעות של חצי חיים T.</li>
                  <li>מצא את T — חצי החיים של החומר.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L2_PROMPT} title="פרומפט זהב — שלב האימון" />
              <TutorStepMedium
                title="שלב א׳ — מה זה חצי חיים?"
                placeholder="כתוב: חצי חיים הוא הזמן שבו... כלומר M(T) = M₀/2 כי הקבוע הוא..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p0(true)}
              />
              <TutorStepMedium
                title="שלב ב׳ — מציאת T עם לוגריתם"
                placeholder="כתוב: (0.5)^(300/T) = 0.125, לכן (300/T)·לוג(0.5) = לוג(0.125). פותרים: T = ..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p1(true)}
              />
              {l2p0 && l2p1 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ borderRadius: 12, background: "rgba(6,78,59,0.15)", border: "1px solid rgba(52,211,153,0.3)", padding: "1rem", color: "#6ee7b7", fontSize: 14, marginTop: "1rem" }}>
                  ✅ כל הכבוד! סיימת את רמת האימון.
                </motion.div>
              )}
            </section>
            <ExponentialGrowthLab initM0={1000} initQ={7} mode="decay" />
          </>
        )}

        {/* ══════════════ LEVEL 3 ══════════════ */}
        {level === 3 && (
          <>
            <section style={{ ...ISLAND, borderColor: "rgba(167,139,250,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#a78bfa", flexShrink: 0 }} />
                <h2 style={{ color: "#a78bfa", fontSize: 17, fontWeight: 800, margin: 0 }}>🟣 רמה מתקדמת — מתי ב׳ = 2·א׳?</h2>
              </div>
              <ExponentialSVG_L3 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.5rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div style={{ borderRadius: 10, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", padding: "10px 12px" }}>
                    <div style={{ color: "#34d399", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>תוכנית A</div>
                    <div style={{ color: "#cbd5e1", fontSize: 13 }}>10,000 ₪</div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>ריבית 6% לשנה</div>
                  </div>
                  <div style={{ borderRadius: 10, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", padding: "10px 12px" }}>
                    <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>תוכנית B</div>
                    <div style={{ color: "#cbd5e1", fontSize: 13 }}>6,000 ₪</div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>ריבית 10% לשנה</div>
                  </div>
                </div>
                <p style={{ color: "#cbd5e1", fontSize: 14 }}>מתי יהיה בתוכנית B פי 2 כסף מאשר בתוכנית A?</p>
              </div>

              {!l3Submitted ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ borderRadius: 12, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(0,0,0,0.4)", padding: "1.25rem" }}>
                    <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>🔐 נסח בעצמך פרומפט זהב מלא</div>
                    <pre style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{L3_GATE_TEXT}</pre>
                  </div>
                  <textarea
                    value={l3Text} rows={5} dir="rtl"
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
                  <button
                    onClick={() => { if (l3Count >= GATE) setL3Submitted(true); }}
                    disabled={l3Count < GATE}
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
            <ExponentialGrowthLab initM0={1000} initQ={11} mode="growth" />
          </>
        )}

      </main>
    </div>
  );
}
