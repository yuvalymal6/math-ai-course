"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";

// ─── Shared style ──────────────────────────────────────────────────────────────

const SECTION: React.CSSProperties = {
  border: "1px solid rgba(60,54,42,0.15)",
  borderRadius: 24,
  padding: "2.5rem",
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(8px)",
  marginBottom: "2.5rem",
  width: "100%",
  boxSizing: "border-box",
  boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)",
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [cp, setCp] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCp(true); setTimeout(() => setCp(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 10, fontSize: 13, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.35)", color: "#16A34A", cursor: "pointer" }}
    >
      {cp ? <Check size={13} /> : <Copy size={13} />}{cp ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי" }: { prompt: string; title?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: "2px solid rgba(45,90,39,0.45)", boxShadow: "0 0 12px rgba(45,90,39,0.15)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-wrap" }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ title, prompt }: { title: string; prompt: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(60,54,42,0.15)", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "rgba(22,163,74,0.06)", borderBottom: "1px solid rgba(60,54,42,0.1)" }}>
        <span style={{ color: "#16A34A", fontSize: 12, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.5)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ borderRadius: 8, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(60,54,42,0.1)", padding: 12, fontSize: 12, color: "#2D3436", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{prompt}</div>
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
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(60,54,42,0.15)", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "rgba(234,88,12,0.06)", borderBottom: "1px solid rgba(60,54,42,0.1)" }}>
        {passed ? <CheckCircle size={14} color="#16A34A" /> : null}
        <span style={{ color: passed ? "#6B7280" : "#EA580C", fontSize: 12, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.5)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          value={val} rows={3} dir="rtl"
          onChange={e => { setVal(e.target.value); setResult(null); }}
          placeholder={placeholder}
          disabled={passed}
          style={{ width: "100%", minHeight: 80, borderRadius: 10, background: "rgba(255,255,255,0.7)", border: `1px solid ${passed ? "rgba(22,163,74,0.4)" : "rgba(60,54,42,0.2)"}`, color: "#1A1A1A", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit", opacity: passed ? 0.6 : 1 }}
        />
        {!passed && <button onClick={validate} style={{ padding: "7px 18px", borderRadius: 10, fontSize: 12, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.3)", color: "#EA580C", cursor: "pointer" }}>בדוק ניסוח 🤖</button>}
        {result && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2D3436", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(60,54,42,0.12)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        {result && result.hint && (
          <div style={{
            borderRadius: 12,
            background: result.blocked ? "rgba(254,226,226,0.3)" : result.score >= 75 ? "rgba(220,252,231,0.3)" : "rgba(255,251,235,0.3)",
            border: `2px solid ${result.blocked ? "#dc2626" : result.score >= 75 ? "#16a34a" : "#d97706"}`,
            padding: 12, color: "#2D3436", fontSize: 12, lineHeight: 1.6,
            ...(result.score >= 75 ? { fontWeight: 600 } : {})
          }}>
            {result.hint}
          </div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(val); setCp(true); setTimeout(() => setCp(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, fontSize: 12, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.3)", color: "#16A34A", cursor: "pointer" }}>
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
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.5)", padding: "10px 14px", marginBottom: 16 }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>מיל��ת מפתח נדרשות</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {keywords.map(kw => {
          const found = text.includes(kw);
          return (
            <span key={kw} style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, transition: "all 0.25s", background: found ? "rgba(22,163,74,0.12)" : "rgba(60,54,42,0.06)", border: `1px solid ${found ? "rgba(22,163,74,0.4)" : "rgba(60,54,42,0.15)"}`, color: found ? "#16A34A" : "#6B7280" }}>
              {kw}{found ? " ✓" : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Silent spoiler-free SVGs ──────────────────────────────────────────────────

// Level 1 — two number lines showing clustered vs scattered points
function DispersionSVG_L1() {
  const cx = 150;
  const clustered = [cx - 10, cx - 3, cx, cx + 5, cx + 12];
  const scattered  = [cx - 85, cx - 40, cx, cx + 42, cx + 88];
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 300 120" style={{ width: "100%", maxWidth: 300, display: "block" }} aria-hidden>
        <text x={14} y={36} fill="#64748b" fontSize={10} fontWeight="bold">יא&#x2019;1</text>
        <line x1={36} y1={32} x2={264} y2={32} stroke="#334155" strokeWidth={1.5} />
        {clustered.map((x, i) => (
          <circle key={i} cx={x} cy={32} r={7} fill="#3b82f633" stroke="#3b82f6" strokeWidth={2} />
        ))}
        <text x={14} y={88} fill="#64748b" fontSize={10} fontWeight="bold">יא&#x2019;2</text>
        <line x1={36} y1={84} x2={264} y2={84} stroke="#334155" strokeWidth={1.5} />
        {scattered.map((x, i) => (
          <circle key={i} cx={x} cy={84} r={7} fill="#f43f5e33" stroke="#f43f5e" strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}

// Level 2 — two bell curves (narrow vs wide)
function DispersionSVG_L2() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
      <svg viewBox="0 0 300 110" style={{ width: "100%", maxWidth: 300, display: "block" }} aria-hidden>
        <line x1={10} y1={95} x2={290} y2={95} stroke="#334155" strokeWidth={1.5} />
        <path d="M 170 94 C 185 94, 195 20, 210 14 C 225 20, 235 94, 250 94"
          fill="#3b82f622" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
        <path d="M 30 94 C 55 94, 70 30, 90 14 C 110 30, 125 94, 150 94"
          fill="#f43f5e22" stroke="#f43f5e" strokeWidth={2} strokeLinejoin="round" />
        <text x={60} y={110} fill="#64748b" fontSize={9} textAnchor="middle">יא&#x2019;2 — רחבה</text>
        <text x={210} y={110} fill="#64748b" fontSize={9} textAnchor="middle">יא&#x2019;1 — צרה</text>
      </svg>
    </div>
  );
}

// Level 3 — σ and Var icons
function DispersionSVG_L3() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 32, paddingBottom: "1.75rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#a78bfa", fontFamily: "serif" }}>σ</span>
        </div>
        <span style={{ color: "#475569", fontSize: 11 }}>סטיית תקן</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b", fontFamily: "serif" }}>σ²</span>
        </div>
        <span style={{ color: "#475569", fontSize: 11 }}>שונות</span>
      </div>
    </div>
  );
}

// ─── DispersionLab ─────────────────────────────────────────────────────────────

const DB_N = 5, DB_MAX = 15;
const DB_SVG_W = 340, DB_SVG_H = 220;
const DB_PAD_L = 34, DB_PAD_R = 60, DB_PAD_T = 18, DB_PAD_B = 52;
const DB_IW = DB_SVG_W - DB_PAD_L - DB_PAD_R;
const DB_IH = DB_SVG_H - DB_PAD_T - DB_PAD_B;
const DB_SLOT = DB_IW / DB_N;
const DB_BAR_W = Math.round(DB_SLOT * 0.62);
const DB_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a78bfa", "#f43f5e"];
const DB_TICKS  = [0, 3, 6, 9, 12, 15];
const DB_NAMES  = ["א", "ב", "ג", "ד", "ה"];
const DB_INIT   = [5, 10, 7, 9, 4];
const DB_TARGET_SD = 1.2;

const dbToY  = (v: number) => DB_PAD_T + DB_IH * (1 - v / DB_MAX);
const dbBarX = (i: number) => DB_PAD_L + i * DB_SLOT + (DB_SLOT - DB_BAR_W) / 2;

function calcMean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function calcSD(arr: number[]) {
  const m = calcMean(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);
}

function DispersionLab() {
  const [vals, setVals] = useState<number[]>(DB_INIT);
  const [challenge, setChallenge] = useState(false);
  const drag = useRef<{ idx: number; startY: number; startV: number } | null>(null);

  const mean = calcMean(vals);
  const sd   = calcSD(vals);
  const auraTop   = dbToY(Math.min(DB_MAX, mean + sd));
  const auraBot   = dbToY(Math.max(0, mean - sd));
  const auraH     = auraBot - auraTop;
  const auraColor = sd < 1 ? "#22c55e" : sd < 3.5 ? "#f59e0b" : "#ef4444";
  const baseline  = dbToY(0);
  const challengeDone = challenge && sd <= DB_TARGET_SD;

  useEffect(() => {
    if (!drag.current) return;
    const { idx, startY, startV } = drag.current;
    const pxPerUnit = DB_IH / DB_MAX;
    function onMove(e: PointerEvent) {
      const dv = -(e.clientY - startY) / pxPerUnit;
      const newV = Math.min(DB_MAX, Math.max(0, Math.round((startV + dv) * 2) / 2));
      setVals(prev => { const next = [...prev]; next[idx] = newV; return next; });
    }
    function onUp() { drag.current = null; }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [drag.current?.idx]);

  return (
    <section style={{ ...SECTION, borderColor: "rgba(34,211,238,0.2)", overflow: "hidden", boxSizing: "border-box" }}>
      <h3 style={{ color: "#1A1A1A", fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>מעבדת פיזור — גרור את העמודות</h3>
      <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: "1rem" }}>הערכים מתעדכנים בזמן אמת</p>
      <div style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}>
        <svg width={DB_SVG_W} height={DB_SVG_H} viewBox={`0 0 ${DB_SVG_W} ${DB_SVG_H}`}
          style={{ maxWidth: "100%", touchAction: "none", userSelect: "none" }}>
          {DB_TICKS.map(t => (
            <g key={t}>
              <line x1={DB_PAD_L - 4} y1={dbToY(t)} x2={DB_PAD_L} y2={dbToY(t)} stroke="#475569" strokeWidth={1} />
              <text x={DB_PAD_L - 7} y={dbToY(t) + 4} textAnchor="end" fill="#64748b" fontSize={9}>{t}</text>
              <line x1={DB_PAD_L} y1={dbToY(t)} x2={DB_PAD_L + DB_IW} y2={dbToY(t)} stroke="#1e293b" strokeWidth={0.5} />
            </g>
          ))}
          {auraH > 1 && (
            <rect x={DB_PAD_L} y={auraTop} width={DB_IW} height={auraH}
              fill={auraColor + "28"} stroke={auraColor + "66"} strokeWidth={1.5} rx={4} />
          )}
          <line x1={DB_PAD_L} y1={dbToY(mean)} x2={DB_PAD_L + DB_IW} y2={dbToY(mean)}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={DB_PAD_L + DB_IW + 5} y={dbToY(mean) + 4} fill="#f59e0b" fontSize={9}>μ</text>
          <line x1={DB_PAD_L} y1={baseline} x2={DB_PAD_L + DB_IW} y2={baseline} stroke="#334155" strokeWidth={1.5} />
          {vals.map((v, i) => {
            const bx = dbBarX(i);
            const by = dbToY(v);
            const bh = Math.max(0, baseline - by);
            return (
              <g key={i} style={{ cursor: "ns-resize" }}
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = { idx: i, startY: e.clientY, startV: v };
                }}
              >
                <rect x={bx} y={by} width={DB_BAR_W} height={bh} rx={3}
                  fill={DB_COLORS[i] + "cc"} stroke={DB_COLORS[i]} strokeWidth={1.5} />
                <text x={bx + DB_BAR_W / 2} y={baseline + 16} textAnchor="middle"
                  fill={DB_COLORS[i]} fontSize={10} fontWeight="bold">{v}</text>
                <text x={bx + DB_BAR_W / 2} y={baseline + 30} textAnchor="middle"
                  fill="#64748b" fontSize={9}>{DB_NAMES[i]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div style={{ borderRadius: 10, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(60,54,42,0.12)", padding: "10px 8px", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 4 }}>ממוצע (μ)</div>
          <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{mean.toFixed(2)}</div>
        </div>
        <div style={{ borderRadius: 10, background: "rgba(255,255,255,0.7)", border: `1px solid ${auraColor}33`, padding: "10px 8px", textAlign: "center", transition: "border-color 0.5s" }}>
          <div style={{ color: auraColor, fontSize: 10, marginBottom: 4, transition: "color 0.5s" }}>סטיית תקן (σ)</div>
          <div style={{ color: auraColor, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{sd.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, borderRadius: 10, border: "1px solid rgba(60,54,42,0.12)", padding: "10px 12px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280", cursor: "pointer" }}>
          <input type="checkbox" checked={challenge} onChange={e => setChallenge(e.target.checked)}
            style={{ accentColor: "#16A34A" }} />
          אתגר: הגע לσ ≤ {DB_TARGET_SD}
          {challenge && (
            <span style={{ marginRight: "auto", fontSize: 11, fontWeight: 700, color: auraColor }}>
              {sd.toFixed(2)} / {DB_TARGET_SD}
            </span>
          )}
        </label>
        {challenge && (
          <div style={{ height: 5, borderRadius: 4, background: "rgba(60,54,42,0.12)", overflow: "hidden", marginTop: 8 }}>
            <div style={{ height: "100%", borderRadius: 4, transition: "width 0.3s, background 0.5s", width: `${Math.min(100, (DB_TARGET_SD / Math.max(sd, 0.01)) * 100)}%`, background: auraColor }} />
          </div>
        )}
        {challengeDone && (
          <div style={{ color: "#34d399", fontSize: 12, fontWeight: 700, marginTop: 8 }}>
            🏆 כל הכבוד! הגעת לσ ≤ {DB_TARGET_SD} — הפיזור כמעט אפסי!
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Content constants ─────────────────────────────────────────────────────────

const STORY_INTRO =
  "שתי כיתות, יא'1 ויא'2, נבחנו באותו מבחן.\n" +
  "בשתיהן הממוצע היה 80, אך הציונים התפלגו אחרת:\n\n" +
  "יא'1 (עקבית):   78, 80, 82, 79, 81\n" +
  "יא'2 (קיצונית): 60, 100, 70, 90, 80";

// Level 1
const L1_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על מדדי פיזור.\n" +
  STORY_INTRO + "\n\n" +
  "עזור לי:\n" +
  "1. לחשב את הטווח (Range) של כל כיתה.\n" +
  "2. לקבוע איזו כיתה הומוגנית יותר לפי הטווח.\n" +
  "3. להסביר מה חסרון הטווח כמדד פיזור.\n" +
  "אל תפתור — שאל אותי שאלות מנחות בכל שלב.";

const L1_STEPS = [
  {
    title: "שלב א׳ — טווח יא'1",
    prompt: "\n\nיא'1: 78, 80, 82, 79, 81. מה המקסימום? מה המינימום? חשב טווח.",
  },
  {
    title: "שלב ב׳ — טווח יא'2",
    prompt: "\n\nיא'2: 60, 100, 70, 90, 80. מה המקסימום? מה המינימום? חשב טווח.",
  },
  {
    title: "שלב ג׳ — הומוגני / הטרוגני",
    prompt: "\n\nלאור הטווחים — איזו כיתה הומוגנית ואיזו הטרוגנית? נמק.",
  },
  {
    title: "שלב ד׳ — חסרון הטווח",
    prompt: "\n\nמה יקרה לטווח אם נחליף את 60 ב-61 ביא'2? מה אם יש 4 תלמידים עם 79 ואחד עם 20?",
  },
];

// Level 2
const L2_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על סטיית תקן.\n" +
  STORY_INTRO + "\n\n" +
  "1. עזור לי לחשב σ ליא'1 שלב אחרי שלב.\n" +
  "2. עזור לי לחשב σ ליא'2 שלב אחרי שלב.\n" +
  "3. פרש — מי רחוקה יותר מהמרכז?\n" +
  "הנחה אותי — אל תפתור ישירות.";

const L2_CONTEXT_WORDS = ["σ", "ממוצע", "80", "ריבועים", "1.41", "14.14", "הומוגני", "הטרוגני", "פיזור", "עקביות"];

const L2_STEPS: { title: string; placeholder: string; contextWords: string[] }[] = [
  {
    title: "שלב א׳ — ממוצע שתי הכיתות",
    placeholder: "כתוב: ממוצע יא'1 = (78+80+82+79+81)/5 = ... ולכן ממוצע שתיהן = ...",
    contextWords: ["ממוצע", "80", "400", "5", "שתי", "כיתות"],
  },
  {
    title: "שלב ב׳ — σ של יא'1",
    placeholder: "כתוב: σ(יא'1) = √[Σ(xi-80)²/5]. הפרשים הם -2,-2,0,2,1,... ולכן σ ≈ ...",
    contextWords: ["σ", "1.41", "ריבועים", "4", "10", "חישוב"],
  },
  {
    title: "שלב ג׳ — σ של יא'2",
    placeholder: "כתוב: σ(יא'2) = √[Σ(xi-80)²/5]. הפרשים גדולים הרבה יותר, לכן σ ≈ ...",
    contextWords: ["σ", "14.14", "ריבועים", "400", "1000", "חישוב"],
  },
  {
    title: "שלב ד׳ — פרשנות: מי הומוגנית?",
    placeholder: "כתוב: יא'1 הומוגנית יותר כי σ=1.41 קטן בהרבה מ-σ=14.14 של יא'2. פירושו...",
    contextWords: ["הומוגני", "הטרוגני", "פיזור", "עקביות", "1.41", "14.14"],
  },
];

// Level 3
const L3_GATE_TEXT =
  "שתי כיתות, יא'1 ויא'2 — ממוצע=80 לשתיהן.\n" +
  "יא'1: 78,80,82,79,81  |  יא'2: 60,100,70,90,80\n\n" +
  "נסח פרומפט זהב שיבקש מה-AI לעזור לך:\n" +
  "1. לחשב שונות (Var) וסטיית תקן (σ) לכל כיתה בנפרד.\n" +
  "2. להסביר מה קורה ל-Var(יא'2) כשמוסיפים 5 לכולם (X+b).\n" +
  "3. להדגים את הכלל Var(aX) = a²·Var(X) עם דוגמה מספרית.\n\n" +
  "כתוב לפחות 80 תווים — ניסוח מדויק בלבד:";

// ─── Level picker meta ─────────────────────────────────────────────────────────

type Level = 1 | 2 | 3;
const LEVEL_META: Record<Level, { label: string; sub: string; color: string; glowColor: string }> = {
  1: { label: "בסיסי",  sub: "טווח ועקביות — ראשית הפיזור",      color: "#34d399", glowColor: "rgba(52,211,153,0.35)"  },
  2: { label: "בינוני", sub: "סטיית תקן — חישוב והשוואה",         color: "#f59e0b", glowColor: "rgba(245,158,11,0.35)"  },
  3: { label: "מתקדם",  sub: "שונות וטרנספורמציה — Var(aX+b)",   color: "#a78bfa", glowColor: "rgba(167,139,250,0.35)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatisticsDispersionPage() {
  const [level, setLevel] = useState<Level>(1);

  // Level 2 pass state
  const [l2p0, setL2p0] = useState(false);
  const [l2p1, setL2p1] = useState(false);
  const [l2p2, setL2p2] = useState(false);
  const [l2p3, setL2p3] = useState(false);

  // Level 3
  const [l3Text, setL3Text]           = useState("");
  const [l3Submitted, setL3Submitted] = useState(false);
  const l3Count = l3Text.trim().length;
  const GATE    = 80;

  return (
    <div style={{ background: "#F3EFE0", minHeight: "100vh", width: "100%", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem", color: "#1A1A1A" }} dir="rtl">

        {/* Nav */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/topic/statistics"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(60,54,42,0.15)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#2D3436", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.7)"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "bold", marginTop: "0.5rem" }}>מדדי פיזור — עם AI</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>טווח, סטיית תקן ושונות — ואיך לשאול AI את השאלות הנכונות</p>
        </div>

        {/* Level picker */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: "2.5rem" }}>
          {([1, 2, 3] as Level[]).map(lv => {
            const m = LEVEL_META[lv];
            const active = level === lv;
            return (
              <button key={lv} onClick={() => setLevel(lv)} style={{
                borderRadius: 20, padding: "1.25rem 1rem",
                background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.5)",
                border: `3px solid ${active ? m.color : "rgba(60,54,42,0.15)"}`,
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
            <section style={{ ...SECTION, borderColor: "rgba(52,211,153,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(52,211,153,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#34d399", flexShrink: 0 }} />
                <h2 style={{ color: "#34d399", fontSize: 17, fontWeight: 800, margin: 0 }}>🟢 רמה בסיסית — טווח ועקביות</h2>
              </div>
              <DispersionSVG_L1 />
              <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(60,54,42,0.1)", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#6B7280", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#2D3436", fontSize: 14, marginBottom: 6, whiteSpace: "pre-line" }}>{STORY_INTRO}</p>
                <ol style={{ color: "#2D3436", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
                  <li>חשב את הטווח (Range) של כל כיתה.</li>
                  <li>לפי הטווח — איזו כיתה הומוגנית יותר ואיזו הטרוגנית?</li>
                  <li>מה חסרון הטווח כמדד פיזור?</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L1_PROMPT} title="פרומפט זהב — רענן מורה AI" />
              {L1_STEPS.map(s => <TutorStepBasic key={s.title} title={s.title} prompt={s.prompt} />)}
            </section>
            <DispersionLab />
          </>
        )}

        {/* ══════════════ LEVEL 2 ══════════════ */}
        {level === 2 && (
          <>
            <section style={{ ...SECTION, borderColor: "rgba(245,158,11,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#f59e0b", flexShrink: 0 }} />
                <h2 style={{ color: "#f59e0b", fontSize: 17, fontWeight: 800, margin: 0 }}>🟡 רמה בינונית — סטיית תקן</h2>
              </div>
              <DispersionSVG_L2 />
              <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(60,54,42,0.1)", padding: "1rem", marginBottom: "1.25rem" }}>
                <p style={{ color: "#6B7280", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#2D3436", fontSize: 14, marginBottom: 6, whiteSpace: "pre-line" }}>{STORY_INTRO}</p>
                <ol style={{ color: "#2D3436", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
                  <li>חשב את סטיית התקן (σ) של כל כיתה.</li>
                  <li>היכן הציונים &#x27;רחוקים&#x27; יותר מהמרכז?</li>
                  <li>איזו כיתה הומוגנית יותר לפי σ?</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L2_PROMPT} title="פרומפט זהב — שלב האימון" />
              <KeywordPills text={""} keywords={L2_CONTEXT_WORDS} />
              {L2_STEPS.map((s, i) => (
                <TutorStepMedium
                  key={i}
                  title={s.title}
                  placeholder={s.placeholder}
                  contextWords={s.contextWords}
                  onPass={() => [setL2p0, setL2p1, setL2p2, setL2p3][i](true)}
                />
              ))}
              {l2p0 && l2p1 && l2p2 && l2p3 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ borderRadius: 12, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.3)", padding: "1rem", color: "#16A34A", fontSize: 14, marginTop: "1rem" }}>
                  ✅ כל הכבוד! σ(יא&#x2019;1) ≈ 1.41 ← הומוגנית | σ(יא&#x2019;2) ≈ 14.14 ← הטרוגנית
                </motion.div>
              )}
            </section>
            <DispersionLab />
          </>
        )}

        {/* ══════════════ LEVEL 3 ══════════════ */}
        {level === 3 && (
          <>
            <section style={{ ...SECTION, borderColor: "rgba(167,139,250,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "#a78bfa", flexShrink: 0 }} />
                <h2 style={{ color: "#a78bfa", fontSize: 17, fontWeight: 800, margin: 0 }}>🟣 רמה מתקדמת — שונות וטרנספורמציה</h2>
              </div>
              <DispersionSVG_L3 />
              <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(60,54,42,0.1)", padding: "1rem", marginBottom: "1.5rem" }}>
                <p style={{ color: "#6B7280", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נתוני הבעיה</p>
                <p style={{ color: "#2D3436", fontSize: 14, marginBottom: 6, whiteSpace: "pre-line" }}>{STORY_INTRO}</p>
                <ol style={{ color: "#2D3436", fontSize: 14, paddingRight: "1.25rem", display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
                  <li>חשב שונות (Var) וסטיית תקן (σ) לכל כיתה.</li>
                  <li>המורה הוסיפה 5 בונוס לכולם ביא&#x2019;2. מה יקרה ל-σ ולשונות?</li>
                  <li>הסבר: <strong style={{ color: "#a78bfa" }}>Var(X+b) = Var(X)</strong> ו-<strong style={{ color: "#a78bfa" }}>Var(aX) = a²·Var(X)</strong>.</li>
                </ol>
              </div>

              {!l3Submitted ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ borderRadius: 12, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.06)", padding: "1.25rem" }}>
                    <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>🔐 נסח בעצמך פרומפט זהב מלא</div>
                    <pre style={{ color: "#2D3436", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{L3_GATE_TEXT}</pre>
                  </div>
                  <textarea
                    value={l3Text} rows={5} dir="rtl"
                    onChange={e => setL3Text(e.target.value)}
                    placeholder="כתוב כאן פרומפט מדויק — לפחות 80 תווים..."
                    style={{ width: "100%", minHeight: 130, borderRadius: 12, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(60,54,42,0.2)", color: "#1A1A1A", fontSize: 14, padding: 14, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                  <div>
                    <div style={{ height: 5, borderRadius: 4, background: "rgba(60,54,42,0.12)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: l3Count >= GATE ? "#34d399" : "#a78bfa", width: `${Math.min(100, (l3Count / GATE) * 100)}%`, transition: "width 0.2s" }} />
                    </div>
                    <div style={{ fontSize: 11, color: l3Count >= GATE ? "#34d399" : "#475569", marginTop: 4, textAlign: "left" }}>{l3Count} / {GATE} תווים</div>
                  </div>
                  <button
                    onClick={() => { if (l3Count >= GATE) setL3Submitted(true); }}
                    disabled={l3Count < GATE}
                    style={{ padding: "12px 24px", borderRadius: 12, background: l3Count >= GATE ? "rgba(167,139,250,0.12)" : "transparent", border: `1px solid ${l3Count >= GATE ? "rgba(167,139,250,0.5)" : "rgba(60,54,42,0.15)"}`, color: l3Count >= GATE ? "#a78bfa" : "rgba(60,54,42,0.3)", fontSize: 14, fontWeight: 600, cursor: l3Count >= GATE ? "pointer" : "not-allowed", transition: "all 0.3s" }}>
                    שלח לחונך →
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ borderRadius: 12, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.3)", padding: "1.25rem", color: "#16A34A", fontSize: 15 }}>
                  ✅ כל הכבוד! הפרומפט שלך נשלח לחונך.
                </motion.div>
              )}
            </section>
            <DispersionLab />
          </>
        )}

      </main>
    </div>
  );
}
