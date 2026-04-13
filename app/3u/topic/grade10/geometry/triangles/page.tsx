"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import LabMessage from "@/app/components/LabMessage";
import { useDefaultToast } from "@/app/lib/useDefaultToast";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── KaTeX helpers ───────────────────────────────────────────────────────────

function InlineMath({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]);
  return <span ref={ref} />;
}

function DisplayMath({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]);
  return <span ref={ref} style={{ display: "block", textAlign: "center" }} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptStep = {
  phase: string;
  label: string;
  coaching: string;
  prompt: string;
  keywords: string[];
  keywordHint: string;
  contextWords?: string[];
  stationWords?: string[];
};

type ExerciseDef = {
  id: "basic" | "medium" | "advanced";
  title: string;
  problem: string;
  diagram: React.ReactNode;
  pitfalls: { title: string; text: string }[];
  goldenPrompt: string;
  advancedGateQuestion?: string;
  steps: PromptStep[];
};

// ─── Station config ───────────────────────────────────────────────────────────

const STATION = {
  basic:    { stationName: "תחנה ראשונה", badge: "מתחיל",  badgeCls: "bg-green-600 text-white",  accentCls: "text-green-700",  ladderBorder: "#16A34A", glowBorder: "rgba(22,163,74,0.35)",  glowShadow: "0 4px 16px rgba(22,163,74,0.12)",  glowRgb: "22,163,74",  accentColor: "#16A34A", borderHex: "#2D5A27", borderRgb: "45,90,39"   },
  medium:   { stationName: "תחנה שנייה",  badge: "בינוני",  badgeCls: "bg-orange-600 text-white", accentCls: "text-orange-700", ladderBorder: "#EA580C", glowBorder: "rgba(234,88,12,0.35)",  glowShadow: "0 4px 16px rgba(234,88,12,0.12)",  glowRgb: "234,88,12", accentColor: "#EA580C", borderHex: "#A34F26", borderRgb: "163,79,38"  },
  advanced: { stationName: "תחנה שלישית", badge: "מתקדם",  badgeCls: "bg-red-700 text-white",    accentCls: "text-red-700",    ladderBorder: "#DC2626", glowBorder: "rgba(220,38,38,0.35)",  glowShadow: "0 4px 16px rgba(220,38,38,0.12)",  glowRgb: "220,38,38", accentColor: "#DC2626", borderHex: "#8B2635", borderRgb: "139,38,53" },
} as const;

// ─── SVG diagrams (silent — no numbers, no answers) ──────────────────────────

function BasicSVG() {
  return (
    <svg viewBox="0 0 240 180" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Scalene triangle */}
      <polygon points="120,20 30,160 210,160" fill="none" stroke="#16A34A" strokeWidth={2} opacity={0.7} />
      {/* Vertex labels */}
      <text x={120} y={14} fontSize={14} fill="#16A34A" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={20} y={170} fontSize={14} fill="#16A34A" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={220} y={170} fontSize={14} fill="#16A34A" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">C</text>
      {/* Angle arcs */}
      <path d="M120,40 A20,20 0 0,1 108,45" fill="none" stroke="#f59e0b" strokeWidth={1.5} />
      <path d="M50,160 A20,20 0 0,0 42,145" fill="none" stroke="#a78bfa" strokeWidth={1.5} />
      <path d="M190,160 A20,20 0 0,1 200,147" fill="none" stroke="#64748b" strokeWidth={1.5} />
      {/* Question marks on angles */}
      <text x={120} y={52} fontSize={10} fill="#f59e0b" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={44} y={140} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={198} y={142} fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

function MediumSVG() {
  return (
    <svg viewBox="0 0 260 190" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Isosceles triangle with height */}
      <polygon points="130,20 40,170 220,170" fill="none" stroke="#EA580C" strokeWidth={2} opacity={0.7} />
      {/* Height (dashed) */}
      <line x1={130} y1={20} x2={130} y2={170} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
      {/* Right angle at base */}
      <polyline points="118,170 118,158 130,158" fill="none" stroke="#64748b" strokeWidth={1} />
      {/* Equal side marks */}
      <line x1={82} y1={88} x2={88} y2={92} stroke="#EA580C" strokeWidth={1.5} />
      <line x1={80} y1={92} x2={86} y2={96} stroke="#EA580C" strokeWidth={1.5} />
      <line x1={172} y1={88} x2={178} y2={92} stroke="#EA580C" strokeWidth={1.5} />
      <line x1={170} y1={92} x2={176} y2={96} stroke="#EA580C" strokeWidth={1.5} />
      {/* Vertex labels */}
      <text x={130} y={14} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      <text x={28} y={178} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={232} y={178} fontSize={14} fill="#EA580C" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">C</text>
      <text x={136} y={185} fontSize={11} fill="#64748b" textAnchor="start" fontFamily="sans-serif">D</text>
    </svg>
  );
}

function AdvancedSVG() {
  return (
    <svg viewBox="0 0 280 200" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Right triangle with inscribed rectangle */}
      <polygon points="40,170 240,170 40,30" fill="none" stroke="#DC2626" strokeWidth={2} opacity={0.6} />
      {/* Right angle mark */}
      <polyline points="55,170 55,155 40,155" fill="none" stroke="#64748b" strokeWidth={1} />
      {/* Inscribed rectangle (dashed) */}
      <rect x={40} y={100} width={120} height={70} fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6} />
      {/* Vertex labels */}
      <text x={30} y={178} fontSize={14} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">B</text>
      <text x={250} y={178} fontSize={14} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">C</text>
      <text x={30} y={26} fontSize={14} fill="#DC2626" fontWeight={700} textAnchor="middle" fontFamily="sans-serif">A</text>
      {/* Rectangle labels */}
      <text x={100} y={96} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">?</text>
      <text x={165} y={140} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="sans-serif">?</text>
    </svg>
  );
}

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}>
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "16,185,129", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 16, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line", fontWeight: 500 }}>{prompt}</p>
      <CopyBtn text={prompt} label="העתק פרומפט מלא" />
    </div>
  );
}

function TutorStepBasic({ step, glowRgb = "16,185,129", borderRgb = "45,90,39" }: { step: PromptStep; glowRgb?: string; borderRgb?: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(${glowRgb},0.45)`, marginBottom: 8, boxShadow: `0 0 14px rgba(${glowRgb},0.18)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid rgba(${glowRgb},0.25)` }}>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: 12, fontSize: 11, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word" }}>{step.prompt}</div>
        </div>
        <CopyBtn text={step.prompt} label="העתק פרומפט ממוקד" />
      </div>
    </div>
  );
}

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);
  const passed = !!(result && !result.blocked && result.score >= 75);
  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res); if (!res.blocked && res.score >= 75) onPass?.();
  };
  if (locked) return (<div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 16 }}>🔒</span><div><span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span><span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span></div></div>);
  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea value={text} rows={3} dir="rtl" disabled={passed} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..." style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        {result && (<div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}><span>ציון הפרומפט</span><span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span></div><div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}><div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} /></div></div>)}
        {!result && <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>בדיקת AI מדומה 🤖</button>}
        {result && result.blocked && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>⚠️ {result.hint}</motion.div>}
        {result && !result.blocked && result.score < 75 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>💡 {result.hint}</motion.div>}
        {passed && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong></div><button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}</button></motion.div>)}
        {result && !passed && <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>}
      </div>
    </div>
  );
}

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => { setCompleted(prev => { const next = [...prev]; next[i] = true; return next; }); const el = document.getElementById(`basic-step-${i + 1}`); if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200); };
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (<><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />{!completed[i] ? (<button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה ✓</button>) : (<div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ הושלם</div>)}</>) : (<div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}><div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>🔒</div><TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} /></div>)}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (<div><GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => (<TutorStepMedium key={i} step={s} locked={i > 0 && !passed[i - 1]} onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })} borderRgb={borderRgb} />))}</div>);
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;
  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" subjectWords={["משולש", "זווית", "שטח", "היקף", "גובה", "צלע", "פיתגורס"]} />
      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{s.phase} — {s.label}</span><span style={{ fontSize: 16 }}>🔒</span></div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}><div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.phase} — {s.label}</div><div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{s.prompt}</div></div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>סיימתי סעיף זה ✓</button>
            </div>
          )}
        </div>
      ))}
      {allPassed && (<div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}><div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div><div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div><div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div></div>)}
    </div>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "סכום זוויות ושטח משולש",
    problem: "במשולש ABC ידוע כי זווית A שווה ל-50° וזווית B שווה ל-65°.\n\nא. מצאו את זווית C.\nב. סווגו את המשולש לפי זוויותיו — האם הוא חד, ישר או קהה?\nג. אם הבסיס BC שווה ל-a והגובה לצלע BC שווה ל-h, כתבו ביטוי לשטח המשולש.",
    diagram: <BasicSVG />,
    pitfalls: [
      { title: "⚠️ שכחת שסכום הזוויות 180°", text: "סכום הזוויות במשולש תמיד 180°. תלמידים שמחשבים זווית שלישית שוכחים לחסר את שתי הזוויות הידועות מ-180°. אם התוצאה שלילית — יש טעות בנתונים." },
      { title: "⚠️ בלבול בסיווג המשולש", text: "משולש חד = כל הזוויות קטנות מ-90°. משולש ישר = יש זווית של בדיוק 90°. משולש קהה = יש זווית גדולה מ-90°. בדקו כל זווית בנפרד." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה על משולשים — סכום זוויות, סיווג ושטח. אני רוצה שתהיה המורה הפרטי שלי — תסביר לי את הלוגיקה ולא תיתן תשובות ישירות.

אל תפתור עבורי — שאל אותי שאלות מכווינות.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת זווית C", coaching: "", prompt: "במשולש ABC, זווית A = 50° וזווית B = 65°. תנחה אותי למצוא את זווית C — מה סכום הזוויות במשולש.", keywords: [], keywordHint: "", contextWords: ["זווית", "סכום", "180", "משולש", "חיסור", "מעלות"] },
      { phase: "סעיף ב׳", label: "סיווג המשולש", coaching: "", prompt: "מצאנו את שלוש הזוויות במשולש ABC. תכווין אותי — איך מסווגים משולש לפי זוויותיו (חד, ישר, קהה).", keywords: [], keywordHint: "", contextWords: ["סיווג", "חד", "ישר", "קהה", "זווית", "90"] },
      { phase: "סעיף ג׳", label: "נוסחת שטח", coaching: "", prompt: "הבסיס BC = a והגובה לצלע BC = h. תדריך אותי לכתוב ביטוי לשטח המשולש — מהי הנוסחה.", keywords: [], keywordHint: "", contextWords: ["שטח", "בסיס", "גובה", "נוסחה", "חצי", "כפול"] },
    ],
  },
  {
    id: "medium",
    title: "משולש שווה-שוקיים — גובה ושטח",
    problem: "במשולש שווה-שוקיים ABC, השוקיים AB = AC. הבסיס BC ידוע, והגובה מ-A לצלע BC נפגש בנקודה D.\n\nא. הוכיחו כי D חוצה את BC (כלומר BD = DC).\nב. אם ידועים אורכי השוק והבסיס, הסבירו כיצד מוצאים את הגובה AD בעזרת פיתגורס.\nג. חשבו את שטח המשולש בעזרת הגובה שמצאתם.",
    diagram: <MediumSVG />,
    pitfalls: [
      { title: "⚠️ שכחת שהגובה חוצה את הבסיס", text: "במשולש שווה-שוקיים, הגובה לבסיס הוא גם חוצה בסיס וגם חוצה זווית ראש. תלמידים שוכחים את התכונה הזו ומסבכים את החישוב." },
      { title: "⚠️ שימוש בפיתגורס על המשולש הלא-נכון", text: "הגובה יוצר שני משולשים ישרי-זווית. חייבים להשתמש בפיתגורס על אחד מהם (שוק = יתר, חצי בסיס = ניצב, גובה = ניצב) — לא על המשולש המקורי." },
    ],
    goldenPrompt: `אני בכיתה י', ומצרף/ת תרגיל על משולש שווה-שוקיים — גובה לבסיס, פיתגורס ושטח.

אל תיתן לי את החישוב — שאל אותי שאלות מנחות על תכונות המשולש ושימוש בפיתגורס.
סרוק את הנתונים בלבד.
אל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "D חוצה את BC", coaching: "", prompt: "במשולש שווה-שוקיים ABC (AB=AC), הגובה מ-A פוגש את BC ב-D. תנחה אותי להוכיח ש-BD = DC — למה הגובה לבסיס חוצה אותו.", keywords: [], keywordHint: "", contextWords: ["שווה שוקיים", "גובה", "חוצה", "בסיס", "חפיפה", "סימטריה"] },
      { phase: "סעיף ב׳", label: "גובה בעזרת פיתגורס", coaching: "", prompt: "ידועים אורך השוק והבסיס. תכווין אותי — במשולש ישר-זווית ABD, מה היתר ומה הניצבים, ואיך מוצאים את הגובה AD.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "יתר", "ניצב", "גובה", "שוק", "חצי בסיס"] },
      { phase: "סעיף ג׳", label: "שטח המשולש", coaching: "", prompt: "מצאנו את הגובה AD ואת הבסיס BC. תדריך אותי לחשב את שטח המשולש ABC — מהי הנוסחה ואיך מציבים.", keywords: [], keywordHint: "", contextWords: ["שטח", "בסיס", "גובה", "חצי", "נוסחה", "הצבה"] },
    ],
  },
  {
    id: "advanced",
    title: "משולש ישר-זווית — שילוב פיתגורס ושטח",
    problem: "במשולש ישר-זווית ABC, הזווית הישרה ב-B. ידוע ש-AB ⊥ BC.\n\nא. אם AB ו-BC ידועים, מצאו את AC בעזרת משפט פיתגורס.\nב. חשבו את שטח המשולש.\nג. חשבו את היקף המשולש.\nד. אם מורידים גובה מ-B לצלע AC, הסבירו למה הגובה קטן מכל אחד מהניצבים.",
    diagram: <AdvancedSVG />,
    pitfalls: [
      { title: "⚠️ בלבול מי היתר ומי הניצב", text: "במשולש ישר-זווית, היתר הוא הצלע שמול הזווית הישרה (תמיד הכי ארוכה). הניצבים הם שתי הצלעות שיוצרות את הזווית הישרה. אם מציבים לא נכון בפיתגורס — הכל שגוי." },
      { title: "⚠️ שכחה שהשטח = חצי מכפלת הניצבים", text: "במשולש ישר-זווית, הניצבים הם גם בסיס וגם גובה. לכן שטח = ½ · AB · BC. תלמידים מנסים למצוא גובה אחר — מיותר." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: למה במשולש ישר-זווית השטח הוא חצי מכפלת הניצבים, ואיך מחשבים את היתר? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת היתר בפיתגורס", coaching: "", prompt: "במשולש ישר-זווית ABC, זווית ישרה ב-B. AB ו-BC ידועים. תנחה אותי להשתמש בפיתגורס כדי למצוא את AC — מי היתר.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "יתר", "ניצב", "ריבוע", "שורש", "AC"] },
      { phase: "סעיף ב׳", label: "שטח המשולש", coaching: "", prompt: "במשולש ישר-זווית ABC, הניצבים AB ו-BC ידועים. תכווין אותי — למה השטח הוא חצי מכפלת הניצבים ואיך מחשבים.", keywords: [], keywordHint: "", contextWords: ["שטח", "ניצב", "חצי", "כפולה", "בסיס", "גובה"] },
      { phase: "סעיף ג׳", label: "היקף המשולש", coaching: "", prompt: "מצאנו AB, BC ו-AC. תדריך אותי לחשב את ההיקף — סכום שלוש הצלעות.", keywords: [], keywordHint: "", contextWords: ["היקף", "סכום", "צלעות", "חיבור", "שלוש", "משולש"] },
      { phase: "סעיף ד׳", label: "גובה ליתר", coaching: "", prompt: "מורידים גובה מ-B לצלע AC. תנחה אותי להסביר למה הגובה הזה קטן מ-AB ומ-BC — מה הקשר לשטח.", keywords: [], keywordHint: "", contextWords: ["גובה", "יתר", "שטח", "קטן", "ניצב", "שוויון שטחים"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() { navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim()); setCopiedProblem(true); setTimeout(() => setCopiedProblem(false), 2000); }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Properties box */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: s.glowShadow }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: s.accentColor, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>△ משולשים — זוויות, שטח והיקף</div>
          <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.55 }}>
            {ex.id === "basic" && "סכום זוויות, סיווג משולשים ונוסחת שטח בסיסית."}
            {ex.id === "medium" && "משולש שווה-שוקיים — תכונות, פיתגורס ושטח."}
            {ex.id === "advanced" && "משולש ישר-זווית — פיתגורס, שטח, היקף וגובה ליתר."}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: 14 }} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎯 תכונות יסוד</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>סכום זוויות</span>
              <span>= 180° (תמיד)</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>שטח</span>
              <span>= ½ · בסיס · גובה</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}>
              <span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>היקף</span>
              <span>= סכום שלוש הצלעות</span>
            </div>
          </div>
        </div>

        {ex.id !== "basic" && (
          <>
            <div style={{ height: 1, background: "rgba(60,54,42,0.08)", marginBottom: 12 }} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✨ {ex.id === "medium" ? "שווה-שוקיים" : "משפט פיתגורס"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {ex.id === "medium" && <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>AB = AC</span><span>שתי שוקיים שוות</span></div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>גובה לבסיס</span><span>חוצה בסיס + חוצה זווית ראש</span></div>
                </>}
                {ex.id === "advanced" && <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>a² + b² = c²</span><span>ניצבים² = יתר² (פיתגורס)</span></div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, color: "#2D3436", lineHeight: 1.55 }}><span style={{ color: s.accentColor, fontFamily: "monospace", fontWeight: 700, minWidth: 110 }}>שטח = ½·a·b</span><span>חצי מכפלת הניצבים</span></div>
                </>}
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>

      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>{copiedProblem ? <Check size={11} /> : <Copy size={11} />}{copiedProblem ? "הועתק!" : "העתק"}</button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (<div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}><div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>{p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}</div>))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"  && <LadderBase   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium" && <LadderMedium steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
      </div>
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
    </section>
  );
}

// ─── TriangleAngleLab (basic) ────────────────────────────────────────────────

function TriangleAngleLab() {
  const [angleA, setAngleA] = useState(60);
  const [angleB, setAngleB] = useState(60);
  const st = STATION.basic;
  const angleC = 180 - angleA - angleB;
  const valid = angleC > 0 && angleC < 180;
  const classification = !valid ? "לא תקין" : (angleA === 90 || angleB === 90 || angleC === 90) ? "ישר-זווית" : (angleA > 90 || angleB > 90 || angleC > 90) ? "קהה-זווית" : "חד-זווית";

  // Draw triangle from angles
  const rad = (d: number) => (d * Math.PI) / 180;
  const bx = 40, by = 155, cx = 220, cy = 155;
  const baseLen = cx - bx;
  const ax = bx + baseLen * Math.cos(rad(angleB));
  const ay = by - baseLen * Math.sin(rad(angleB));

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת זוויות במשולש</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו שתי זוויות וצפו כיצד הזווית השלישית משתנה.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "זווית A", val: angleA, set: setAngleA },
          { label: "זווית B", val: angleB, set: setAngleB },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}><span>{s.label}</span><span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}°</span></div>
            <input type="range" min={10} max={160} step={1} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 180" className="w-full max-w-md mx-auto" aria-hidden>
          {valid ? (
            <>
              <polygon points={`${ax},${ay} ${bx},${by} ${cx},${cy}`} fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2} />
              <text x={ax} y={ay - 8} fontSize={12} fill="#f59e0b" textAnchor="middle" fontFamily="monospace">{angleA}°</text>
              <text x={bx - 8} y={by + 14} fontSize={12} fill="#a78bfa" textAnchor="middle" fontFamily="monospace">{angleB}°</text>
              <text x={cx + 8} y={cy + 14} fontSize={12} fill="#64748b" textAnchor="middle" fontFamily="monospace">{angleC}°</text>
            </>
          ) : (
            <text x={130} y={90} fontSize={14} fill="#dc2626" textAnchor="middle" fontFamily="sans-serif">סכום הזוויות חורג מ-180°</text>
          )}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "∠A", val: `${angleA}°` },
          { label: "∠B", val: `${angleB}°` },
          { label: "∠C", val: valid ? `${angleC}°` : "—" },
          { label: "סיווג", val: classification },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>נסו להגיע ל-90° בזווית אחת — מה קורה למשולש?</p>
    </section>
  );
}

// ─── IsoscelesLab (medium) ───────────────────────────────────────────────────

function IsoscelesLab() {
  const [leg, setLeg] = useState(10);
  const [base, setBase] = useState(8);
  const st = STATION.medium;

  const halfBase = base / 2;
  const heightSq = leg * leg - halfBase * halfBase;
  const height = heightSq > 0 ? Math.sqrt(heightSq) : 0;
  const area = 0.5 * base * height;
  const perimeter = 2 * leg + base;
  const valid = heightSq > 0;

  const scale = 8;
  const ox = 130 - (base * scale) / 2, oy = 160;
  const apexX = 130, apexY = oy - height * scale;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת משולש שווה-שוקיים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו שוק ובסיס — צפו בגובה, שטח והיקף.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "שוק (AB=AC)", val: leg, set: setLeg, min: 3, max: 15 },
          { label: "בסיס (BC)", val: base, set: setBase, min: 2, max: 20 },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}><span>{s.label}</span><span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span></div>
            <input type="range" min={s.min} max={s.max} step={0.5} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 190" className="w-full max-w-md mx-auto" aria-hidden>
          {valid ? (
            <>
              <polygon points={`${apexX},${Math.max(10, apexY)} ${ox},${oy} ${ox + base * scale},${oy}`} fill={`${st.accentColor}08`} stroke={st.accentColor} strokeWidth={2} />
              <line x1={apexX} y1={Math.max(10, apexY)} x2={apexX} y2={oy} stroke="#64748b" strokeWidth={1.2} strokeDasharray="4,3" />
              <text x={apexX + 6} y={(Math.max(10, apexY) + oy) / 2} fontSize={10} fill="#64748b" fontFamily="monospace">h={height.toFixed(1)}</text>
            </>
          ) : (
            <text x={130} y={90} fontSize={13} fill="#dc2626" textAnchor="middle" fontFamily="sans-serif">השוק חייבת להיות גדולה מחצי הבסיס</text>
          )}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "גובה", val: valid ? height.toFixed(2) : "—" },
          { label: "שטח", val: valid ? area.toFixed(2) : "—" },
          { label: "היקף", val: perimeter.toFixed(1) },
          { label: "½ בסיס", val: halfBase.toFixed(1) },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>כשהבסיס = 0, מה קורה? ומתי הגובה הכי גדול?</p>
    </section>
  );
}

// ─── PythagorasLab (advanced) ────────────────────────────────────────────────

function PythagorasLab() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const st = STATION.advanced;

  const c = Math.sqrt(a * a + b * b);
  const area = 0.5 * a * b;
  const perimeter = a + b + c;
  const heightToC = (2 * area) / c;

  const scale = 18;
  const ox = 40, oy = 160;
  const bx = ox, by = oy - a * scale;
  const cx = ox + b * scale, cy = oy;

  return (
    <section style={{ border: `1px solid ${st.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת פיתגורס</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את הניצבים וצפו ביתר, שטח, היקף וגובה ליתר.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "0 auto 2rem" }}>
        {[
          { label: "ניצב a", val: a, set: setA },
          { label: "ניצב b", val: b, set: setB },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}><span>{s.label}</span><span style={{ color: st.accentColor, fontFamily: "monospace", fontWeight: 700 }}>{s.val}</span></div>
            <input type="range" min={1} max={10} step={0.5} value={s.val} onChange={(e) => s.set(+e.target.value)} style={{ width: "100%", accentColor: st.accentColor }} />
          </div>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${st.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: st.glowShadow }}>
        <svg viewBox="0 0 260 200" className="w-full max-w-md mx-auto" aria-hidden>
          <polygon points={`${ox},${oy} ${bx},${by} ${cx},${cy}`} fill="rgba(220,38,38,0.05)" stroke="#DC2626" strokeWidth={2} />
          <polyline points={`${ox + 12},${oy} ${ox + 12},${oy - 12} ${ox},${oy - 12}`} fill="none" stroke="#64748b" strokeWidth={1} />
          {/* Labels */}
          <text x={(ox + cx) / 2} y={oy + 16} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="monospace">b={b}</text>
          <text x={ox - 14} y={(oy + by) / 2} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="monospace">a={a}</text>
          <text x={(bx + cx) / 2 + 10} y={(by + cy) / 2 - 5} fontSize={11} fill="#a78bfa" textAnchor="middle" fontFamily="monospace">c={c.toFixed(2)}</text>
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "יתר c", val: c.toFixed(2) },
          { label: "שטח", val: area.toFixed(2) },
          { label: "היקף", val: perimeter.toFixed(2) },
          { label: "גובה ליתר", val: heightToC.toFixed(2) },
        ].map(row => (
          <div key={row.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${st.glowRgb},0.4)`, padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: st.accentColor, fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>{row.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 16 }}>שימו לב: הגובה ליתר תמיד קטן מכל ניצב. נסו a=3, b=4 — מקבלים שלשה פיתגורית!</p>
    </section>
  );
}

// ─── Tabs + FormulaBar ───────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",  border: "border-green-600",  bg: "bg-green-600/10",  glowColor: "rgba(22,163,74,0.3)"  },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700", border: "border-orange-600", bg: "bg-orange-600/10", glowColor: "rgba(234,88,12,0.3)"  },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",    border: "border-red-700",    bg: "bg-red-700/10",    glowColor: "rgba(220,38,38,0.3)"  },
];

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"angles" | "area" | "pythagoras" | null>(null);
  const tabs = [
    { id: "angles" as const, label: "📐 זוויות", tex: "\\alpha+\\beta+\\gamma=180°", color: "#16A34A", borderColor: "rgba(22,163,74,0.35)" },
    { id: "area" as const, label: "📏 שטח והיקף", tex: "S=\\tfrac{1}{2}ah", color: "#EA580C", borderColor: "rgba(234,88,12,0.35)" },
    { id: "pythagoras" as const, label: "📊 פיתגורס", tex: "a^2+b^2=c^2", color: "#DC2626", borderColor: "rgba(220,38,38,0.35)" },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(60,54,42,0.15)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
      <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => { const isActive = activeTab === t.id; return (
          <button key={t.id} onClick={() => setActiveTab(isActive ? null : t.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: `1.5px solid ${isActive ? t.borderColor : "rgba(60,54,42,0.1)"}`, background: isActive ? `${t.color}0D` : "rgba(60,54,42,0.03)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
            <span style={{ color: isActive ? t.color : "#6B7280" }}><InlineMath>{t.tex}</InlineMath></span>
          </button>
        ); })}
      </div>

      {activeTab === "angles" && (
        <motion.div key="angles" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(22,163,74,0.25)", background: "rgba(220,252,231,0.4)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"\\alpha + \\beta + \\gamma = 180°"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>סכום זוויות וסיווג</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סכום שלוש הזוויות במשולש = 180° תמיד.</li>
                  <li><strong>חד:</strong> כל הזוויות &lt; 90°. <strong>ישר:</strong> יש 90°. <strong>קהה:</strong> יש &gt; 90°.</li>
                  <li>זווית חיצונית = סכום שתי הזוויות הפנימיות שלא סמוכות לה.</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "area" && (
        <motion.div key="area" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(234,88,12,0.25)", background: "rgba(255,247,237,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"S = \\frac{1}{2} \\cdot a \\cdot h_a"}</DisplayMath><DisplayMath>{"P = a + b + c"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>שטח = חצי בסיס כפול גובה</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>הגובה חייב להיות אנכי לבסיס.</li>
                  <li>אפשר לבחור כל צלע כבסיס — הגובה ישתנה בהתאם.</li>
                  <li>במשולש ישר-זווית: הניצבים הם בסיס וגובה.</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#B45309", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>💡 דוגמה: בסיס 8, גובה 5 → שטח = ½·8·5 = 20</div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "pythagoras" && (
        <motion.div key="pythagoras" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}><DisplayMath>{"a^2 + b^2 = c^2"}</DisplayMath></div>
            <div style={{ borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>משפט פיתגורס (רק במשולש ישר-זווית!)</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>a, b = ניצבים (יוצרים את הזווית הישרה).</li>
                  <li>c = יתר (מול הזווית הישרה, הכי ארוך).</li>
                  <li>שלשות מפורסמות: (3,4,5), (5,12,13), (8,15,17).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#DC2626", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>💡 דוגמה: a=3, b=4 → c² = 9+16 = 25 → c = 5</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrianglesPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties} dir="rtl">
      <style>{`
        textarea, input[type="text"], input[type="password"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus { outline: none !important; border-color: rgba(var(--lvl-rgb), 0.65) !important; box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important; }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important; }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>משולשים עם AI — כיתה י׳ (3 יח׳)</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>זוויות, שטח, היקף, פיתגורס — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link href="/3u/topic/grade10/geometry" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}>
            <span style={{ fontSize: 16 }}>←</span>חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>
        <SubtopicProgress subtopicId="3u/grade10/geometry/triangles" />

        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => { const active = selectedLevel === tab.id; return (
            <button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
              style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>{tab.label}</button>
          ); })}
        </div>

        <FormulaBar />

        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {selectedLevel === "basic" && <TriangleAngleLab />}
        {selectedLevel === "medium" && <IsoscelesLab />}
        {selectedLevel === "advanced" && <PythagorasLab />}

        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="3u/grade10/geometry/triangles" level={selectedLevel} />
        </div>
      </div>
    </main>
  );
}
