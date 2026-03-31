"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";

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
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid #1e293b" }}>
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
        {passed ? <CheckCircle size={14} color="#34d399" /> : null}
        <span style={{ color: passed ? "#cbd5e1" : "#f59e0b", fontSize: 12, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ background: "rgba(0,0,0,0.3)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          value={val} rows={3} dir="rtl"
          onChange={e => { setVal(e.target.value); setResult(null); }}
          placeholder={placeholder}
          disabled={passed}
          style={{ width: "100%", minHeight: 80, borderRadius: 10, background: "rgba(0,0,0,0.5)", border: `1px solid ${passed ? "rgba(52,211,153,0.4)" : "#334155"}`, color: "#e2e8f0", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit", opacity: passed ? 0.6 : 1 }}
        />
        {!passed && <button onClick={validate} style={{ padding: "7px 18px", borderRadius: 10, fontSize: 12, background: "rgba(0,0,0,0.4)", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer" }}>בדוק ניסוח 🤖</button>}
        {result && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        {result && result.hint && (
          <div style={{
            borderRadius: 12,
            background: result.blocked ? "rgba(254,226,226,1)" : result.score >= 75 ? "rgba(220,252,231,1)" : "rgba(255,251,235,1)",
            border: `2px solid ${result.blocked ? "#dc2626" : result.score >= 75 ? "#16a34a" : "#d97706"}`,
            padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6,
            ...(result.score >= 75 ? { fontWeight: 600 } : {})
          }}>
            {result.hint}
          </div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(val); setCp(true); setTimeout(() => setCp(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, fontSize: 12, background: "transparent", border: "1px solid rgba(52,211,153,0.3)", color: "#6ee7b7", cursor: "pointer" }}>
              {cp ? <Check size={12} /> : <Copy size={12} />}{cp ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}
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

// ─── SVG components ───────────────────────────────────────────────────────────

// Vertices for a fixed oblique-projection box
const V = {
  A:  [55, 190] as [number, number], B:  [215, 190] as [number, number],
  C:  [260, 158] as [number, number], D:  [100, 158] as [number, number],
  A1: [55,  82] as [number, number], B1: [215,  82] as [number, number],
  C1: [260,  50] as [number, number], D1: [100,  50] as [number, number],
} as const;
type VK = keyof typeof V;

function Seg({ a, b, color = "#475569", w = 1.5, dash }: { a: VK; b: VK; color?: string; w?: number; dash?: string }) {
  const [x1, y1] = V[a], [x2, y2] = V[b];
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeDasharray={dash} />;
}
function Lbl({ v, t, dx = 0, dy = 0, color = "#64748b" }: { v: VK; t: string; dx?: number; dy?: number; color?: string }) {
  const [x, y] = V[v];
  return <text x={x + dx} y={y + dy} fill={color} fontSize={11} textAnchor="middle">{t}</text>;
}

// Level 1 SVG — highlights face diagonal AB→C (amber) and space diagonal A→C1 (violet)
function BoxSVG_L1() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 340 230" style={{ width: "100%", maxWidth: 280, display: "block" }} aria-hidden>
        <Seg a="A" b="B" /><Seg a="B" b="C" /><Seg a="C" b="D" dash="4 3" /><Seg a="D" b="A" dash="4 3" />
        <Seg a="A1" b="B1" /><Seg a="B1" b="C1" /><Seg a="C1" b="D1" /><Seg a="D1" b="A1" />
        <Seg a="A" b="A1" /><Seg a="B" b="B1" /><Seg a="C" b="C1" /><Seg a="D" b="D1" dash="4 3" />
        {/* Face diagonal B→D (amber) */}
        <Seg a="B" b="D" color="#f59e0b" w={2} dash="5 3" />
        {/* Space diagonal B→D1 (violet) */}
        <Seg a="B" b="D1" color="#a78bfa" w={2.5} />
        <Lbl v="A" t="A" dy={14} /><Lbl v="B" t="B" dy={14} />
        <Lbl v="C" t="C" dx={14} dy={4} /><Lbl v="D" t="D" dx={-14} dy={4} />
        <Lbl v="A1" t="A′" dy={-8} /><Lbl v="B1" t="B′" dy={-8} />
        <Lbl v="C1" t="C′" dx={16} dy={-4} /><Lbl v="D1" t="D′" dx={-16} dy={-4} />
      </svg>
    </div>
  );
}

// Level 2 SVG — highlights square base (emerald) and vertical height (rose)
function BoxSVG_L2() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 340 230" style={{ width: "100%", maxWidth: 280, display: "block" }} aria-hidden>
        {/* Base square — emerald */}
        <Seg a="A" b="B" color="#34d399" w={2.5} />
        <Seg a="B" b="C" color="#34d399" w={2.5} />
        <Seg a="C" b="D" color="#34d399" w={2.5} dash="4 3" />
        <Seg a="D" b="A" color="#34d399" w={2.5} dash="4 3" />
        {/* Top face */}
        <Seg a="A1" b="B1" /><Seg a="B1" b="C1" /><Seg a="C1" b="D1" /><Seg a="D1" b="A1" />
        {/* Verticals */}
        <Seg a="A" b="A1" /><Seg a="B" b="B1" /><Seg a="C" b="C1" /><Seg a="D" b="D1" dash="4 3" />
        {/* Height arrow A→A1 (rose) */}
        <Seg a="A" b="A1" color="#fb7185" w={2.5} />
        <Lbl v="A" t="A" dy={14} /><Lbl v="B" t="B" dy={14} />
        <Lbl v="C" t="C" dx={14} dy={4} /><Lbl v="D" t="D" dx={-14} dy={4} />
        <Lbl v="A1" t="A′" dy={-8} /><Lbl v="B1" t="B′" dy={-8} />
        <Lbl v="C1" t="C′" dx={16} dy={-4} /><Lbl v="D1" t="D′" dx={-16} dy={-4} />
        {/* h label */}
        <text x={30} y={138} fill="#fb7185" fontSize={12} fontWeight={700} textAnchor="middle">h</text>
      </svg>
    </div>
  );
}

// Level 3 SVG — labels sides as a, 2a, 3a; highlights space diagonal (violet)
function BoxSVG_L3() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 340 230" style={{ width: "100%", maxWidth: 280, display: "block" }} aria-hidden>
        <Seg a="A" b="B" /><Seg a="B" b="C" /><Seg a="C" b="D" dash="4 3" /><Seg a="D" b="A" dash="4 3" />
        <Seg a="A1" b="B1" /><Seg a="B1" b="C1" /><Seg a="C1" b="D1" /><Seg a="D1" b="A1" />
        <Seg a="A" b="A1" /><Seg a="B" b="B1" /><Seg a="C" b="C1" /><Seg a="D" b="D1" dash="4 3" />
        {/* Space diagonal A→C1 (violet) */}
        <Seg a="A" b="C1" color="#a78bfa" w={2.5} />
        <Lbl v="A" t="A" dy={14} /><Lbl v="B" t="B" dy={14} />
        <Lbl v="C" t="C" dx={14} dy={4} /><Lbl v="D" t="D" dx={-14} dy={4} />
        <Lbl v="A1" t="A′" dy={-8} /><Lbl v="B1" t="B′" dy={-8} />
        <Lbl v="C1" t="C′" dx={16} dy={-4} /><Lbl v="D1" t="D′" dx={-16} dy={-4} />
        {/* side labels */}
        <text x={135} y={210} fill="#f59e0b" fontSize={11} fontWeight={600} textAnchor="middle">a</text>
        <text x={270} y={178} fill="#f59e0b" fontSize={11} fontWeight={600} textAnchor="middle">2a</text>
        <text x={30} y={138} fill="#f59e0b" fontSize={11} fontWeight={600} textAnchor="middle">3a</text>
      </svg>
    </div>
  );
}

// ─── SpaceGeometryLab ─────────────────────────────────────────────────────────

function SpaceGeometryLab({ initL, initW, initH }: { initL: number; initW: number; initH: number }) {
  const [L, setL] = useState(initL);
  const [W, setW] = useState(initW);
  const [H, setH] = useState(initH);

  const fd  = Math.sqrt(L * L + W * W);
  const sd  = Math.sqrt(L * L + W * W + H * H);
  const ang = (Math.atan(H / fd) * 180) / Math.PI;

  // Scale so the tallest dimension spans ~200 px inside a 400×300 viewBox
  const sc = 200 / Math.max(L, W, H, 1);
  const SL = L * sc, SH = H * sc, dX = W * sc * 0.5, dY = W * sc * 0.35;

  // Anchor bottom-left of front face
  const ox = 30, oy = 260;
  const P = {
    A:  [ox,       oy      ], B:  [ox + SL,       oy      ],
    C:  [ox+SL+dX, oy - dY ], D:  [ox + dX,       oy - dY ],
    A1: [ox,       oy - SH ], B1: [ox + SL,       oy - SH ],
    C1: [ox+SL+dX, oy-dY-SH], D1: [ox + dX,       oy-dY-SH],
  };

  // Dynamic viewBox: add 20px padding around the drawn shape
  const PAD = 20;
  const xs = Object.values(P).map(p => p[0]);
  const ys = Object.values(P).map(p => p[1]);
  const vx = Math.min(...xs) - PAD;
  const vy = Math.min(...ys) - PAD;
  const vw = Math.max(...xs) - Math.min(...xs) + PAD * 2;
  const vh = Math.max(...ys) - Math.min(...ys) + PAD * 2;

  const ln = (a: number[], b: number[], clr = "#475569", w = 1.5, dash = "") =>
    <line key={`${a[0]}-${a[1]}-${b[0]}-${b[1]}-${clr}`}
      x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
      stroke={clr} strokeWidth={w} strokeDasharray={dash} />;

  return (
    <section style={{ ...ISLAND, borderColor: "rgba(34,211,238,0.2)", overflow: "hidden", boxSizing: "border-box" }}>
      <h3 style={{ color: "white", fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>מעבדה — שנה ממדים</h3>
      <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: "1rem" }}>הערכים מתעדכנים בזמן אמת</p>

      {/* Sliders — constrained width so they don't stretch across 1000px */}
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
        {[{ label: "אורך (L)", val: L, set: setL }, { label: "רוחב (W)", val: W, set: setW }, { label: "גובה (H)", val: H, set: setH }].map(r => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 2 }}>
              <span>{r.label}</span>
              <span style={{ color: "white", fontWeight: 700, fontFamily: "monospace" }}>{r.val}</span>
            </div>
            <input type="range" min={1} max={12} step={1} value={r.val}
              onChange={e => r.set(+e.target.value)}
              style={{ display: "block", width: "100%", accentColor: "#22d3ee" }} />
          </div>
        ))}
      </div>

      {/* SVG — fixed 320px tall container, shape fills it */}
      <div style={{
        borderRadius: 12, border: "1px solid #1e293b", background: "rgba(0,0,0,0.5)",
        height: 320, display: "flex", justifyContent: "center", alignItems: "center",
        marginBottom: "1rem", overflow: "hidden", padding: "1rem",
      }}>
        <svg
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "100%" }}
          aria-hidden
        >
          {ln(P.A,  P.B )}{ln(P.B,  P.C )}{ln(P.C,  P.D, "#475569",1.5,"4 3")}{ln(P.D,  P.A, "#475569",1.5,"4 3")}
          {ln(P.A1, P.B1)}{ln(P.B1, P.C1)}{ln(P.C1, P.D1)}{ln(P.D1, P.A1)}
          {ln(P.A,  P.A1)}{ln(P.B,  P.B1)}{ln(P.C,  P.C1)}{ln(P.D,  P.D1,"#475569",1.5,"4 3")}
          {/* Face diagonal (amber dashed) and space diagonal (violet) */}
          {ln(P.A,  P.C, "#f59e0b", 2, "5 3")}
          {ln(P.A,  P.C1,"#a78bfa", 2.5)}
        </svg>
      </div>

      {/* Result tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { label: "אלכסון בסיס",   val: fd.toFixed(2),      sub: "√(L²+W²)",       color: "#f59e0b" },
          { label: "אלכסון מרחבי",  val: sd.toFixed(2),      sub: "√(L²+W²+H²)",    color: "#a78bfa" },
          { label: "זווית עם בסיס", val: ang.toFixed(1) + "°", sub: "arctan(H / d₀)", color: "#34d399" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid #1e293b", padding: "10px 6px", textAlign: "center", minWidth: 0 }}>
            <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
            <div style={{ color: "#475569", fontSize: 9, marginTop: 3 }}>{r.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Level picker meta ────────────────────────────────────────────────────────

type Level = 1 | 2 | 3;
const LEVEL_META: Record<Level, { label: string; sub: string; color: string; glowColor: string }> = {
  1: { label: "בסיסי",   sub: "אלכסונים וזווית — צלעות נתונות",    color: "#34d399", glowColor: "rgba(52,211,153,0.35)"  },
  2: { label: "בינוני",  sub: "גובה התיבה — בסיס ריבועי ונפח",      color: "#f59e0b", glowColor: "rgba(245,158,11,0.35)"  },
  3: { label: "מתקדם",  sub: "ביטוי סמלי — יחס צלעות a:2a:3a",     color: "#a78bfa", glowColor: "rgba(167,139,250,0.35)" },
};

// ─── Level content ────────────────────────────────────────────────────────────

// ── Level 1 ──────────────────────────────────────────────────────────────────
const L1_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על תיבה ABCD-A′B′C′D′ שבה AB=6, BC=8, AA′=10.\n" +
  "עזור לי לפתור שלושה שלבים:\n" +
  "1. מצא את אורך האלכסון הפנים BD בבסיס.\n" +
  "2. מצא את אורך האלכסון המרחבי BD′.\n" +
  "3. מצא את הזווית שבין BD′ לבין בסיס התיבה.\n" +
  "אל תפתור בשבילי — שאל אותי שאלות מנחות בכל שלב.";

const L1_STEPS = [
  {
    title: "שלב א׳ — אלכסון הבסיס BD",
    prompt:
      "\n\nאני רוצה למצוא את BD בבסיס המלבני ABCD שבו AB=6 ו-BC=8.\n" +
      "באיזה משולש ישר-זווית אשתמש? מה הם הניצבים ומה ההיפותנוסה?",
  },
  {
    title: "שלב ב׳ — האלכסון המרחבי BD′",
    prompt:
      "\n\nמצאתי BD=10. עכשיו אני צריך BD′.\n" +
      "אני יודע ש-DD′ הוא הגובה, AA′=10.\n" +
      "איזה משולש ישר-זווית מכיל את BD′? מה הניצבים?",
  },
  {
    title: "שלב ג׳ — הזווית בין BD′ לבסיס",
    prompt:
      "\n\nמצאתי BD′=10√2. ההיטל של BD′ על הבסיס הוא BD=10.\n" +
      "איך אמצא את הזווית α בין BD′ לבסיס? איזה יחס טריגונומטרי אשתמש?",
  },
];

// ── Level 2 ──────────────────────────────────────────────────────────────────
const L2_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על תיבה עם בסיס ריבועי.\n" +
  "נתון: אורך צלע הבסיס a=4, נפח V=96 סמ״ק.\n" +
  "1. עזור לי להוציא את גובה התיבה h מנוסחת הנפח.\n" +
  "2. עזור לי לחשב את האלכסון המרחבי אחרי שמצאתי h.\n" +
  "הנחה אותי — אל תפתור ישירות.";

const L2_CONTEXT_WORDS = ["אלכסון", "מרחק", "גוף", "פיתגורס", "פנים", "גובה", "שטח", "נפח", "שורש"];

// ── Level 3 ──────────────────────────────────────────────────────────────────
const L3_GATE_TEXT =
  "לתיבה ABCD-A′B′C′D′ נתון יחס הצלעות:\n" +
  "   AB : BC : AA′ = a : 2a : 3a\n\n" +
  "נסח פרומפט זהב שיבקש מה-AI לעזור לך:\n" +
  "1. לרשום ביטוי לאורך האלכסון המרחבי d(a).\n" +
  "2. להפשיט את a ולקבל ביטוי פשוט.\n" +
  "3. לבדוק: לאיזה ערך a מתקבל d=7√2?\n\n" +
  "כתוב לפחות 80 תווים — ניסוח מדויק בלבד:";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoxPage() {
  const [level, setLevel] = useState<Level>(1);

  // Level 2
  const [l2t0, setL2t0] = useState("");
  const [l2t1, setL2t1] = useState("");
  const [l2p0, setL2p0] = useState(false);
  const [l2p1, setL2p1] = useState(false);
  const l2Combined = l2t0 + " " + l2t1;

  // Level 3
  const [l3Text, setL3Text] = useState("");
  const [l3Submitted, setL3Submitted] = useState(false);
  const l3Count = l3Text.trim().length;
  const GATE = 80;

  return (
    <div style={{ background: "#020617", minHeight: "100vh", width: "100%" }}>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem", color: "white" }} dir="rtl">

        {/* Nav */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/topic/grade12/space-geometry"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "bold", marginTop: "0.5rem" }}>התיבה והמנסרה — עם AI</h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>אלכסונים, זוויות ומשוואות — ואיך לשאול AI את השאלות הנכונות</p>
        </div>

        {/* ── Level picker ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: "2.5rem" }}>
          {([1, 2, 3] as Level[]).map(lv => {
            const m = LEVEL_META[lv];
            const active = level === lv;
            return (
              <button key={lv} onClick={() => setLevel(lv)} style={{
                borderRadius: 20, padding: "1.25rem 1rem", background: active ? "#0f172a" : "rgba(15,23,42,0.5)",
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
            {/* Problem statement */}
            <section style={{ ...ISLAND, borderColor: "rgba(52,211,153,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(52,211,153,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#34d399", flexShrink: 0 }} />
                <h2 style={{ color: "#34d399", fontSize: 17, fontWeight: 800, margin: 0 }}>🟢 רמה בסיסית — אלכסונים וזווית</h2>
              </div>
              <BoxSVG_L1 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>תיבה ABCD-A′B′C′D′ שבה: AB = 6,  BC = 8,  AA′ = 10</p>
                <ol style={{ color: "#cbd5e1", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>מצא את אורך האלכסון הפנים BD בבסיס.</li>
                  <li>מצא את אורך האלכסון המרחבי BD′.</li>
                  <li>מצא את הזווית שבין BD′ לבסיס התיבה.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L1_PROMPT} title="פרומפט זהב — רענן מורה AI" />
              {L1_STEPS.map(s => <TutorStepBasic key={s.title} title={s.title} prompt={s.prompt} />)}
            </section>
            <SpaceGeometryLab initL={6} initW={8} initH={10} />
          </>
        )}

        {/* ══════════════ LEVEL 2 ══════════════ */}
        {level === 2 && (
          <>
            <section style={{ ...ISLAND, borderColor: "rgba(245,158,11,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#f59e0b", flexShrink: 0 }} />
                <h2 style={{ color: "#f59e0b", fontSize: 17, fontWeight: 800, margin: 0 }}>🟡 רמה בינונית — גובה תיבה מנפח</h2>
              </div>
              <BoxSVG_L2 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>תיבה עם <strong style={{ color: "#34d399" }}>בסיס ריבועי</strong> של צלע a = 4 סמ. נפח התיבה V = 96 סמ״ק.</p>
                <ol style={{ color: "#cbd5e1", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>הוצא את גובה התיבה h מנוסחת הנפח.</li>
                  <li>חשב את האלכסון המרחבי של התיבה.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L2_PROMPT} title="פרומפט זהב — שלב האימון" />
              <KeywordPills text={l2Combined} keywords={L2_CONTEXT_WORDS} />
              <TutorStepMedium
                title="שלב א׳ — חישוב גובה מנוסחת נפח"
                placeholder="כתוב: V = a² · h, לכן h = נפח חלקי... ולכן h = ..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p0(true)}
              />
              <TutorStepMedium
                title="שלב ב׳ — האלכסון המרחבי"
                placeholder="כתוב: האלכסון המרחבי d = √(a²+a²+h²) = ... כי הבסיס ריבועי ו..."
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
            <SpaceGeometryLab initL={4} initW={4} initH={6} />
          </>
        )}

        {/* ══════════════ LEVEL 3 ══════════════ */}
        {level === 3 && (
          <>
            <section style={{ ...ISLAND, borderColor: "rgba(167,139,250,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#a78bfa", flexShrink: 0 }} />
                <h2 style={{ color: "#a78bfa", fontSize: 17, fontWeight: 800, margin: 0 }}>🟣 רמה מתקדמת — ביטוי סמלי לאלכסון</h2>
              </div>
              <BoxSVG_L3 />
              <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #1e293b", padding: "1rem", marginBottom: "1.5rem" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 6 }}>תיבה שבה יחס הצלעות: <strong style={{ color: "#f59e0b" }}>AB : BC : AA′ = a : 2a : 3a</strong></p>
                <ol style={{ color: "#cbd5e1", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>רשום ביטוי לאורך האלכסון המרחבי d כפונקציה של a.</li>
                  <li>פשט את הביטוי.</li>
                  <li>מצא את a כך ש-d = 7√2.</li>
                </ol>
              </div>

              {/* Locked gate — no copy button */}
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
            <SpaceGeometryLab initL={1} initW={2} initH={3} />
          </>
        )}

      </main>
    </div>
  );
}
