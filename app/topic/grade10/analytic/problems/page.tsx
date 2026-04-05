"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
import MarkComplete from "@/app/components/MarkComplete";
import SubtopicProgress from "@/app/components/SubtopicProgress";
import katex from "katex";
import "katex/dist/katex.min.css";
import AnalyticParallelogramDiagram from "@/app/components/AnalyticParallelogramDiagram";

// ─── KaTeX renderers ─────────────────────────────────────────────────────────

function Tex({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: false }); }, [children]);
  return <span ref={ref} dir="ltr" style={{ unicodeBidi: "embed" }} />;
}

function TexBlock({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) katex.render(children, ref.current, { throwOnError: false, displayMode: true }); }, [children]);
  return <span ref={ref} dir="ltr" style={{ display: "block", textAlign: "center", unicodeBidi: "embed" }} />;
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

const TABS = [
  { id: "basic",    label: "מתחיל",  textColor: "text-green-700",   border: "border-green-600",   bg: "bg-green-600/10",   glowColor: "rgba(22,163,74,0.3)"   },
  { id: "medium",   label: "בינוני", textColor: "text-orange-700",  border: "border-orange-600",  bg: "bg-orange-600/10",  glowColor: "rgba(234,88,12,0.3)"   },
  { id: "advanced", label: "מתקדם",  textColor: "text-red-700",     border: "border-red-700",     bg: "bg-red-700/10",     glowColor: "rgba(220,38,38,0.3)"   },
];

// ─── Prompt Coach Atoms ───────────────────────────────────────────────────────

function CopyBtn({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer" }}
    >
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

function TutorStepMedium({ step, locked = false, onPass, borderRgb = "45,90,39", problemText = "" }: { step: PromptStep; locked?: boolean; onPass?: () => void; borderRgb?: string; problemText?: string }) {
  const [text, setText]     = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [copied, setCopied] = useState(false);

  const passed = !!(result && !result.blocked && result.score >= 75);

  function checkCopy(input: string): { isCopy: boolean } {
    const WHITELIST = new Set([
      "תסביר", "איך", "כיצד", "שלבים", "עזור", "תעזור", "תכווין", "הסבר",
      "תדריך", "תנחה", "למה", "מדוע", "מתי", "האם", "בבקשה", "תראה",
      "תלמד", "אותי", "נמצא", "נחשב", "נמצא", "שלי", "רוצה", "צריך",
    ]);
    const inputWords = input.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (inputWords.length < 5) return { isCopy: false };
    const sources = [problemText, step.prompt, step.label].filter(Boolean).join(" ");
    const sourceWords = sources.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (sourceWords.length === 0) return { isCopy: false };
    const sourceSet = new Set(sourceWords);
    const significantInputWords = inputWords.filter(w => !WHITELIST.has(w));
    if (significantInputWords.length < 3) return { isCopy: false };
    let consecutiveMatches = 0, maxConsecutive = 0, matchCount = 0;
    for (const w of significantInputWords) {
      if (sourceSet.has(w)) { matchCount++; consecutiveMatches++; maxConsecutive = Math.max(maxConsecutive, consecutiveMatches); } else { consecutiveMatches = 0; }
    }
    const startsWithRequest = WHITELIST.has(inputWords[0]) || WHITELIST.has(inputWords[1] ?? "");
    const ratio = matchCount / significantInputWords.length;
    const effectiveRatio = startsWithRequest ? ratio * 0.6 : ratio;
    return { isCopy: effectiveRatio > 0.7 || maxConsecutive >= 5 };
  }

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const copyCheck = checkCopy(text);
    if (copyCheck.isCopy) { setResult({ score: 0, blocked: true, hint: "נראה שהעתקת את לשון השאלה. נסה לנסח במילים שלך מה בדיוק לא הבנת." }); return; }
    const res = calculatePromptScore(text, step.contextWords ?? []);
    setResult(res);
    if (!res.blocked && res.score >= 75) onPass?.();
  };

  if (locked) return (
    <div style={{ borderRadius: 12, border: `1px solid rgba(${borderRgb},0.3)`, background: "rgba(255,255,255,0.3)", padding: "14px 16px", marginBottom: 8, opacity: 0.4, userSelect: "none", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div>
        <span style={{ color: "#6B7280", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>
        <span style={{ color: "#6B7280", fontSize: 11, marginRight: 8 }}>{step.label}</span>
      </div>
    </div>
  );

  const scoreBarColor = !result ? "#9CA3AF" : result.score >= 75 ? "#16a34a" : result.score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(245,158,11,0.55)" : `rgba(${borderRgb},0.35)`}`, marginBottom: 8, boxShadow: passed ? "0 0 16px rgba(245,158,11,0.25)" : "none", transition: "border-color 0.3s, box-shadow 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(245,158,11,0.3)" : `rgba(${borderRgb},0.2)`}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        {result && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
              <span>ציון הפרומפט</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, borderRadius: 3, background: scoreBarColor, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        {!result && (
          <button onClick={validate} style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.4)`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה 🤖
          </button>
        )}
        {result && result.blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(254,226,226,1)", border: "2px solid #dc2626", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            ⚠️ {result.hint}
          </motion.div>
        )}
        {result && !result.blocked && result.score < 75 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderRadius: 12, background: "rgba(255,251,235,1)", border: "2px solid #d97706", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6 }}>
            💡 {result.hint}
          </motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>
              ✅ פרומפט מצוין! ציון: <strong style={{ color: "#14532d" }}>{result.score}/100</strong>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ל-AI"}
            </button>
          </motion.div>
        )}
        {result && !passed && (
          <button onClick={() => setResult(null)} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>נסה שוב</button>
        )}
      </div>
    </div>
  );
}

function TutorStepAdvanced({ step, locked = false, onPass }: { step: PromptStep; locked?: boolean; onPass?: () => void }) {
  const [text, setText]       = useState("");
  const [result, setResult]   = useState<ScoreResult | null>(null);
  const [copied, setCopied]   = useState(false);
  const passed = result?.score !== undefined && result.score >= 90 && !result.blocked;

  const ROSE = { border: "rgba(244,63,94,0.35)", dim: "rgba(244,63,94,0.2)", text: "#fda4af" };

  if (locked) return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(139,38,53,0.3)", background: "rgba(255,255,255,0.3)", padding: "12px 16px", opacity: 0.45, userSelect: "none", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span>🔒</span><span style={{ color: "#6B7280", fontSize: 12 }}>{step.phase} — {step.label}</span>
    </div>
  );

  const validate = () => {
    if (text.trim().length < 20) { setResult({ score: 0, blocked: false, hint: "הניסוח קצר מדי — כתוב לפחות 20 תווים." }); return; }
    const r = calculatePromptScore(text, step.contextWords ?? []);
    setResult(r);
    if (!r.blocked && r.score >= 90 && onPass) onPass();
  };

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${passed ? "rgba(52,211,153,0.35)" : ROSE.border}`, marginBottom: 8, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.75)", borderBottom: `1px solid ${passed ? "rgba(52,211,153,0.2)" : "rgba(244,63,94,0.2)"}` }}>
        {passed ? <CheckCircle size={14} color="#34d399" /> : <span style={{ color: ROSE.text, fontSize: 11, fontWeight: 700 }}>{step.phase}</span>}
        <span style={{ color: "#2D3436", fontSize: 11, fontWeight: 600 }}>{step.label}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.4)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={text} rows={3} dir="rtl" readOnly={passed}
          onChange={(e) => { if (!passed) { setText(e.target.value); setResult(null); } }}
          placeholder="כתוב את הפרומפט שלך לסעיף זה..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 12, background: passed ? "rgba(6,78,59,0.1)" : "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(139,38,53,0.25)"}`, color: passed ? "#6ee7b7" : "#2D3436", fontSize: 14, padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>
              <span>ציון</span>
              <span style={{ color: "#1A1A1A", fontWeight: 800 }}>{result.score}/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#E5E7EB", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${result.score}%`, background: result.score >= 90 ? "#16a34a" : result.score >= 55 ? "#d97706" : "#dc2626", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
        {result && !passed && result.hint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.6, color: "#1A1A1A", background: result.blocked ? "rgba(254,226,226,1)" : "rgba(255,251,235,1)", border: `2px solid ${result.blocked ? "#dc2626" : "#d97706"}` }}>
            {result.blocked ? "⚠️" : "💡"} {result.hint}
          </motion.div>
        )}
        {passed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ borderRadius: 12, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: 12, color: "#1A1A1A", fontSize: 12, lineHeight: 1.6, fontWeight: 600 }}>✅ ניסוח מעולה! הסעיף הבא נפתח.</div>
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "transparent", border: "2px solid #16a34a", color: "#14532d", cursor: "pointer", fontWeight: 500 }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "הועתק!" : "העתק ניסוח"}
            </button>
          </motion.div>
        )}
        {!passed && (
          <button onClick={validate}
            style={{ padding: "6px 16px", borderRadius: 12, fontSize: 12, background: "rgba(255,255,255,0.75)", border: `1px solid ${ROSE.border}`, color: "#1A1A1A", cursor: "pointer", fontWeight: 500 }}>
            בדיקת AI מדומה 🤖
          </button>
        )}
      </div>
    </div>
  );
}

function LadderBase({ steps, goldenPrompt, glowRgb, borderRgb }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string }) {
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const unlocked = completed.filter(Boolean).length + 1;
  const markDone = (i: number) => {
    setCompleted(prev => { const next = [...prev]; next[i] = true; return next; });
    const el = document.getElementById(`basic-step-${i + 1}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <div key={i} id={`basic-step-${i}`}>
          {i < unlocked ? (
            <>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
              {!completed[i] ? (
                <button onClick={() => markDone(i)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                  סיימתי סעיף זה ✓
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 10, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ הושלם</div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.35, pointerEvents: "none", position: "relative" }}>
              <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16, zIndex: 2 }}>🔒</div>
              <TutorStepBasic step={s} glowRgb={glowRgb} borderRgb={borderRgb} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LadderMedium({ steps, goldenPrompt, glowRgb, borderRgb, problemText = "" }: { steps: PromptStep[]; goldenPrompt: string; glowRgb: string; borderRgb: string; problemText?: string }) {
  const [passed, setPassed] = useState<boolean[]>(Array(steps.length).fill(false));
  return (
    <div>
      <GoldenPromptCard prompt={goldenPrompt} glowRgb={glowRgb} borderRgb={borderRgb} />
      {steps.map((s, i) => (
        <TutorStepMedium
          key={i} step={s}
          locked={i > 0 && !passed[i - 1]}
          onPass={() => setPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
          borderRgb={borderRgb}
          problemText={problemText}
        />
      ))}
    </div>
  );
}

function LadderAdvanced({ steps }: { steps: PromptStep[] }) {
  const [masterPassed, setMasterPassed] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const allPassed = masterPassed && unlockedCount > steps.length;

  return (
    <div>
      <MasterPromptGate onPass={() => setMasterPassed(true)} accentColor="#991b1b" accentRgb="153,27,27" requiredPhrase="סרוק נתונים ועצור" />

      {steps.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {(!masterPassed || i >= unlockedCount) ? (
            <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.7)", padding: "14px 16px", opacity: 0.5, pointerEvents: "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280", fontSize: 13, fontWeight: 600 }}>{ s.phase } — { s.label }</span>
              <span style={{ fontSize: 16 }}>🔒</span>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(255,255,255,0.9)", padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ s.phase } — { s.label }</div>
                <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{ s.prompt }</div>
              </div>
              <button onClick={() => setUnlockedCount(v => Math.max(v, i + 2))} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "8px 0", marginBottom: 10, borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.3)", color: "#15803d", cursor: "pointer" }}>
                סיימתי סעיף זה ✓
              </button>
            </div>
          )}
        </div>
      ))}

      {allPassed && (
        <div style={{ borderRadius: 16, background: "rgba(220,252,231,1)", border: "2px solid #16a34a", padding: "1.25rem 1.5rem", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ color: "#14532d", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>כל הכבוד — השלמת את הרמה המתקדמת!</div>
          <div style={{ color: "#166534", fontSize: 13 }}>עברת בהצלחה את כל הסעיפים.</div>
        </div>
      )}
    </div>
  );
}

// ─── SVG Diagrams ─────────────────────────────────────────────────────────────


function MediumDiagram() {
  // A(2,2), B(10,6), C(14,14), D=? → D(6,10) for parallelogram
  // M = midpoint AC = (8,8)
  const sc = 16, ox = 20, oy = 280;
  const toX = (v: number) => ox + v * sc;
  const toY = (v: number) => oy - v * sc;

  const A = { x: 2, y: 2 }, B = { x: 10, y: 6 }, C = { x: 14, y: 14 };
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }; // (8,8)

  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-xs mx-auto" aria-hidden>
      {/* Grid lines */}
      {[0, 2, 4, 6, 8, 10, 12, 14, 16].map(v => (
        <g key={v}>
          <line x1={toX(v)} y1={toY(0)} x2={toX(v)} y2={toY(16)} stroke="#f1f5f9" strokeWidth={0.6} />
          <line x1={toX(0)} y1={toY(v)} x2={toX(16)} y2={toY(v)} stroke="#f1f5f9" strokeWidth={0.6} />
        </g>
      ))}

      {/* Axes */}
      <line x1={toX(-0.5)} y1={toY(0)} x2={toX(16.5)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-0.5)} x2={toX(0)} y2={toY(16.5)} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={toX(16.5) + 4} y={toY(0) + 4} fontSize={10} fill="#94a3b8" fontStyle="italic">x</text>
      <text x={toX(0) + 4} y={toY(16.5) - 2} fontSize={10} fill="#94a3b8" fontStyle="italic">y</text>

      {/* Partial shape: A-B and B-C (known sides) */}
      <line x1={toX(A.x)} y1={toY(A.y)} x2={toX(B.x)} y2={toY(B.y)} stroke="#EA580C" strokeWidth={2} />
      <line x1={toX(B.x)} y1={toY(B.y)} x2={toX(C.x)} y2={toY(C.y)} stroke="#EA580C" strokeWidth={2} />

      {/* Dashed sides to D? area */}
      <line x1={toX(C.x)} y1={toY(C.y)} x2={toX(6)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={toX(A.x)} y1={toY(A.y)} x2={toX(6)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" />

      {/* Diagonals (dashed) */}
      <line x1={toX(A.x)} y1={toY(A.y)} x2={toX(C.x)} y2={toY(C.y)} stroke="#f59e0b" strokeWidth={1.3} strokeDasharray="4,3" />
      <line x1={toX(B.x)} y1={toY(B.y)} x2={toX(6)} y2={toY(10)} stroke="#a78bfa" strokeWidth={1.3} strokeDasharray="4,3" />

      {/* Midpoint M */}
      <circle cx={toX(M.x)} cy={toY(M.y)} r={3.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(M.x) + 6} y={toY(M.y) - 4} fontSize={9} fill="#f59e0b" fontWeight={700}>M</text>

      {/* Vertices A, B, C */}
      {[
        { p: A, label: "A", dx: -6, dy: 14, color: "#EA580C" },
        { p: B, label: "B", dx: 6, dy: 14, color: "#EA580C" },
        { p: C, label: "C", dx: 6, dy: -4, color: "#EA580C" },
      ].map(v => (
        <g key={v.label}>
          <circle cx={toX(v.p.x)} cy={toY(v.p.y)} r={3.5} fill={v.color} stroke="#fff" strokeWidth={1.5} />
          <text x={toX(v.p.x) + v.dx} y={toY(v.p.y) + v.dy} fontSize={11} fill={v.color} fontWeight={700}>{v.label}</text>
        </g>
      ))}

      {/* D? */}
      <circle cx={toX(6)} cy={toY(10)} r={3.5} fill="#64748b" stroke="#fff" strokeWidth={1.5} strokeDasharray="3,2" />
      <text x={toX(6) - 16} y={toY(10) - 4} fontSize={11} fill="#64748b" fontWeight={700}>D?</text>
    </svg>
  );
}

function AdvancedDiagram() {
  // L1: y=mx through O. P(t, mt). M(t, 0). Q = foot of altitude from M to OP.
  const m = 1.5, t = 4;
  const P = { x: t, y: m * t };
  const M = { x: t, y: 0 };
  const Q = { x: t / (1 + m * m), y: m * t / (1 + m * m) };

  const sc = 22, ox = 40, oy = 200;
  const toX = (v: number) => ox + v * sc;
  const toY = (v: number) => oy - v * sc;

  return (
    <svg viewBox="0 0 280 230" className="w-full max-w-xs mx-auto" aria-hidden>
      {/* Grid */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(v => (
        <g key={v}>
          <line x1={toX(v)} y1={toY(0)} x2={toX(v)} y2={toY(8)} stroke="#f1f5f9" strokeWidth={0.5} />
          <line x1={toX(0)} y1={toY(v)} x2={toX(8)} y2={toY(v)} stroke="#f1f5f9" strokeWidth={0.5} />
        </g>
      ))}

      {/* Axes */}
      <line x1={toX(-0.5)} y1={toY(0)} x2={toX(7.5)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-0.5)} x2={toX(0)} y2={toY(8.5)} stroke="#94a3b8" strokeWidth={1.2} />
      <text x={toX(7.5) + 4} y={toY(0) + 4} fontSize={10} fill="#94a3b8" fontStyle="italic">x</text>
      <text x={toX(0) + 4} y={toY(8.5) - 2} fontSize={10} fill="#94a3b8" fontStyle="italic">y</text>

      {/* L1: y=mx (blue line through O and past P) */}
      <line x1={toX(0)} y1={toY(0)} x2={toX(P.x + 1)} y2={toY((P.x + 1) * m)} stroke="#3b82f6" strokeWidth={1.5} />
      <text x={toX(P.x + 0.8)} y={toY((P.x + 0.8) * m) - 6} fontSize={9} fill="#3b82f6" fontWeight={600} fontStyle="italic">ℓ₁</text>

      {/* △OQM fill (blue) */}
      <polygon points={`${toX(0)},${toY(0)} ${toX(Q.x)},${toY(Q.y)} ${toX(M.x)},${toY(M.y)}`}
        fill="rgba(59,130,246,0.10)" stroke="none" />

      {/* △MQP fill (purple) */}
      <polygon points={`${toX(M.x)},${toY(M.y)} ${toX(Q.x)},${toY(Q.y)} ${toX(P.x)},${toY(P.y)}`}
        fill="rgba(167,139,250,0.10)" stroke="none" />

      {/* PM vertical (height from P to x-axis) */}
      <line x1={toX(P.x)} y1={toY(P.y)} x2={toX(M.x)} y2={toY(M.y)} stroke="#1a1a2e" strokeWidth={1.5} />

      {/* OP hypotenuse */}
      <line x1={toX(0)} y1={toY(0)} x2={toX(P.x)} y2={toY(P.y)} stroke="#1a1a2e" strokeWidth={1.5} />

      {/* MQ altitude (from M to OP) */}
      <line x1={toX(M.x)} y1={toY(M.y)} x2={toX(Q.x)} y2={toY(Q.y)} stroke="#DC2626" strokeWidth={1.8} strokeDasharray="4,3" />

      {/* Right angle at M */}
      <polyline points={`${toX(M.x) - 7},${toY(0)} ${toX(M.x) - 7},${toY(0) - 7} ${toX(M.x)},${toY(0) - 7}`} fill="none" stroke="#1a1a2e" strokeWidth={1} />

      {/* Right angle at Q (MQ ⊥ OP) */}
      {(() => {
        // perpendicular mark at Q between QM direction and QO direction
        const sz = 6;
        const qmU = { x: (M.x - Q.x), y: (M.y - Q.y) };
        const qmL = Math.sqrt(qmU.x ** 2 + qmU.y ** 2) || 1;
        const u1 = { x: qmU.x / qmL * sz, y: -qmU.y / qmL * sz }; // screen coords (flip y)
        const qoU = { x: -Q.x, y: -Q.y };
        const qoL = Math.sqrt(qoU.x ** 2 + qoU.y ** 2) || 1;
        const u2 = { x: qoU.x / qoL * sz, y: qoU.y / qoL * sz }; // toward O on L1 (already in math coords)
        // In SVG: we need to convert
        const qSx = toX(Q.x), qSy = toY(Q.y);
        return <polyline points={`${qSx + u1.x},${qSy + u1.y} ${qSx + u1.x - u2.x * sc / Math.abs(sc)},${qSy + u1.y + u2.y * sc / Math.abs(sc)} ${qSx - u2.x * sc / Math.abs(sc)},${qSy + u2.y * sc / Math.abs(sc)}`} fill="none" stroke="#DC2626" strokeWidth={1} />;
      })()}

      {/* Points */}
      <circle cx={toX(0)} cy={toY(0)} r={3} fill="#1a1a2e" stroke="#fff" strokeWidth={1} />
      <text x={toX(0) - 10} y={toY(0) + 12} fontSize={10} fill="#1a1a2e" fontWeight={700}>O</text>

      <circle cx={toX(P.x)} cy={toY(P.y)} r={3.5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(P.x) + 6} y={toY(P.y) - 4} fontSize={10} fill="#DC2626" fontWeight={700}>P</text>

      <circle cx={toX(M.x)} cy={toY(M.y)} r={3} fill="#1a1a2e" stroke="#fff" strokeWidth={1} />
      <text x={toX(M.x) + 4} y={toY(M.y) + 14} fontSize={10} fill="#1a1a2e" fontWeight={700}>M</text>

      <circle cx={toX(Q.x)} cy={toY(Q.y)} r={3.5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(Q.x) - 8} y={toY(Q.y) - 8} fontSize={10} fill="#DC2626" fontWeight={700}>Q</text>

      {/* Labels for triangles */}
      <text x={(toX(0) + toX(Q.x) + toX(M.x)) / 3} y={(toY(0) + toY(Q.y) + toY(M.y)) / 3 + 4} fontSize={8} fill="#3b82f6" fontWeight={700} textAnchor="middle">△OQM</text>
      <text x={(toX(M.x) + toX(Q.x) + toX(P.x)) / 3} y={(toY(M.y) + toY(Q.y) + toY(P.y)) / 3 + 4} fontSize={8} fill="#a78bfa" fontWeight={700} textAnchor="middle">△MQP</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "המעוין החבוי",
    problem: "נתונה מקבילית ABCD שאלכסוניה נפגשים בראשית הצירים O(0,0).\nנתון: A(-4, -2). הצלע BC מקבילה לציר ה-x. משוואת האלכסון BD היא y = -2x.\n\nא. מצאו את שיעורי הקודקוד C (השתמשו בתכונה שראשית הצירים היא אמצע האלכסון AC).\nב. מצאו את שיעורי הקודקוד B (רמז: לכל הנקודות על ישר המקביל לציר ה-x יש אותו שיעור y).\nג. מצאו את שיעורי הקודקוד D.\nד. הוכיחו כי המקבילית ABCD היא מעוין (רמז: בדקו האם האלכסונים מאונכים זה לזה).\nה. חשבו את שטח המעוין (שטח מעוין שווה למחצית מכפלת האלכסונים).",
    diagram: <AnalyticParallelogramDiagram />,
    pitfalls: [
      { title: "⚠️ טעות בשיקוף", text: "כשמשקפים דרך הראשית, שני הסימנים מתהפכים. C = (4, 2) ולא (4, -2) או (-4, 2)." },
      { title: "💡 ישר אופקי", text: "\"מקביל לציר ה-x\" פירושו y = קבוע. כלומר B נמצאת על הישר y = 2 (כמו C), ולא צריך לחשב שיפוע." },
      { title: "🔦 ניצבות אלכסונים", text: "תנאי לניצבות: m₁ · m₂ = -1. שיפוע AC = 0.5, שיפוע BD = -2. מכפלה: 0.5 · (-2) = -1 → האלכסונים מאונכים → מעוין." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה בגאומטריה אנליטית על מקבילית ומעוין במערכת צירים.\nאני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "אמצע קטע — מציאת C", coaching: "", prompt: "הסבר לי שבגלל ש-O(0,0) היא אמצע AC, סכום האיקסים וסכום הוואיים חייב להיות 0. לכן C היא פשוט הנגדי של A.", keywords: [], keywordHint: "", contextWords: ["אמצע", "קטע", "ראשית", "סכום", "נגדי", "שיקוף", "C", "קואורדינטות"] },
      { phase: "סעיף ב׳", label: "חיתוך — מציאת B", coaching: "", prompt: "הנקודה B נמצאת על המפגש בין הישר האופקי y=2 לבין הישר y=-2x. הסבר לי: איך מציבים y=2 במשוואת האלכסון כדי למצוא את x?", keywords: [], keywordHint: "", contextWords: ["חיתוך", "הצבה", "אופקי", "y=2", "y=-2x", "B", "משוואה"] },
      { phase: "סעיף ג׳", label: "מציאת D", coaching: "", prompt: "הסבר לי: אם O(0,0) הוא אמצע BD, ואני יודע את B, איך אמצא את D?", keywords: [], keywordHint: "", contextWords: ["אמצע", "D", "שיקוף", "סימטריה", "BD", "ראשית"] },
      { phase: "סעיף ד׳", label: "הוכחת מעוין", coaching: "", prompt: "הסבר לי: שיפוע AC הוא 0.5 ושיפוע BD הוא -2. מכיוון ש-0.5 · (-2) = -1, האלכסונים מאונכים, מה שהופך כל מקבילית למעוין.", keywords: [], keywordHint: "", contextWords: ["שיפוע", "ניצב", "מאונך", "מכפלה", "-1", "מעוין", "הוכחה"] },
      { phase: "סעיף ה׳", label: "שטח המעוין", coaching: "", prompt: "שטח מעוין = מחצית מכפלת האלכסונים. הסבר לי איך לחשב את אורכי AC ו-BD ואז למצוא את השטח.", keywords: [], keywordHint: "", contextWords: ["שטח", "מעוין", "אלכסון", "מרחק", "מחצית", "מכפלה", "נוסחה"] },
    ],
  },
  {
    id: "medium",
    title: "המקבילית והדמיון",
    problem: "לפניכם מערכת צירים ובה שלוש נקודות: A(2, 2), B(10, 6) ו-C(14, 14). עליכם למצוא את הנקודה D כך שהמרובע ABCD יהיה מקבילית.\n\nא. מצאו את משוואת האלכסון AC.\nב. מצאו את נקודת אמצע הקטע AC (נסמנה ב-M).\nג. הסבירו מדוע נקודה M חייבת להיות גם אמצע הקטע BD.\nד. מצאו את שיעורי הנקודה D והוכיחו כי △ABM ~ △CDM. מהו יחס הדמיון?\nה. חשבו את שטח המקבילית ABCD (רמז: חשבו שטח משולש אחד והכפילו).",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "⚠️ חישוב אמצע קטע", text: "טעות בסימני ה-x וה-y מובילה לנקודה M שגויה. בדקו: M = ((2+14)/2, (2+14)/2) = (8, 8)." },
      { title: "💡 סדר קודקודים", text: "ב-ABCD הקודקודים הולכים ברצף! אם מערבבים את הסדר (למשל ACBD) לא תתקבל מקבילית." },
      { title: "🔦 הוכחת דמיון", text: "∠AMB = ∠CMD (קודקודיות). צריך להראות גם יחסי צלעות שווים: AM/CM = BM/DM = 1." },
    ],
    goldenPrompt: `אני תלמיד כיתה י' ברמה בינונית. אני עובד על תרגיל אנליטית ב-localhost (מקבילית ודמיון).\n\nהחוקים שלנו: אל תיתן פתרונות! אם אני שואל שאלה, ענה לי ברמז בלבד. אם אני טועה בניסוח הגיאומטרי (למשל: "הצדדים שווים" במקום "הצלעות הנגדיות שוות"), תקן אותי מיד. המטרה שלי היא לבנות את הפתרון בעצמי דרך הדרכה שלך.`,
    steps: [
      { phase: "סעיף א׳", label: "משוואת AC", coaching: "", prompt: "מצא את משוואת הישר העובר דרך A(2,2) ו-C(14,14). מהו השיפוע? מהו ערך ה-b?", keywords: [], keywordHint: "", contextWords: ["שיפוע", "משוואה", "ישר", "y=mx+b", "AC", "עולה", "קואורדינטה"] },
      { phase: "סעיף ב׳", label: "אמצע AC", coaching: "", prompt: "חשב את נקודת האמצע M של הקטע AC. השתמש בנוסחת אמצע קטע.", keywords: [], keywordHint: "", contextWords: ["אמצע", "קטע", "נוסחה", "ממוצע", "M", "חצי", "סכום"] },
      { phase: "סעיף ג׳", label: "למה M = אמצע BD", coaching: "", prompt: "הסבר מדוע במקבילית, אמצע אלכסון אחד הוא גם אמצע האלכסון השני.", keywords: [], keywordHint: "", contextWords: ["מקבילית", "אלכסון", "חוצה", "אמצע", "תכונה", "BD", "M"] },
      { phase: "סעיף ד׳", label: "מציאת D + דמיון", coaching: "", prompt: "מצא את D כך ש-M=(8,8) הוא אמצע BD. לאחר מכן, הוכח ש-△ABM דומה ל-△CDM.", keywords: [], keywordHint: "", contextWords: ["D", "שיקוף", "דמיון", "משולש", "ABM", "CDM", "יחס", "קודקודית", "צלע"] },
      { phase: "סעיף ה׳", label: "שטח המקבילית", coaching: "", prompt: "חשב את שטח המקבילית ABCD. רמז: חשב שטח משולש אחד (למשל △ABC) והכפל ב-2.", keywords: [], keywordHint: "", contextWords: ["שטח", "מקבילית", "משולש", "בסיס", "גובה", "נוסחה", "חצי", "כפול"] },
    ],
  },
  {
    id: "advanced",
    title: "דמיון פרמטרי — גובה ליתר",
    problem: "נתון הישר L₁ שמשוואתו y = mx (m > 0). הנקודה P נמצאת על הישר ברביע הראשון.\nמהנקודה P מורידים אנך לציר ה-x שפוגש אותו בנקודה M.\nבמשולש ישר-הזווית OMP (כאשר O הוא ראשית הצירים), מורידים את הגובה מ-M ליתר OP. רגל הגובה היא הנקודה Q.\n\nא. בטאו את שיעורי הנקודות P ו-M בעזרת הפרמטר t (כאשר x_P = t).\nב. מצאו את שיעורי הנקודה Q (השתמשו בפרמטרים m, t).\nג. הוכיחו כי △OQM ~ △MQP. מהו יחס הדמיון?\nד. הוכיחו כי היחס בין שטח △OQM לשטח △MQP תלוי אך ורק בשיפוע m, ולא במיקום P.\nה. מצאו עבור איזה שיפוע m המשולשים △OQM ו-△MQP חופפים.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "⚠️ פחד מפרמטרים", text: "אל תציבו מספרים במקום m ו-t! עבדו עם המשתנים — ההכללה בסעיף ד' דורשת ביטויים כלליים." },
      { title: "💡 אלגברה של Q", text: "Q היא רגל הגובה מ-M ל-OP. השתמשו בנוסחת היטל: Q = (OM·cos²α, OM·sinα·cosα) כאשר α = arctan(m)." },
      { title: "🔦 היתר המשותפת", text: "שני המשולשים △OQM ו-△MQP חולקים את הצלע MQ ויש להם זוויות ישרות ב-Q. זה מספיק לדמיון!" },
    ],
    goldenPrompt: `אני תלמיד ברמה מתקדמת. אני פותר תרגיל אנליטי-פרמטרי.\n\nהנחיות למנטור:\n1. אל תפתור לי אלגברית! אם אני מסתבך עם Q, שאל אותי: "איך מוצאים רגל גובה ליתר במשולש ישר-זווית?"\n2. אם אני מנסה להציב מספרים במקום m, עצור אותי והסבר למה הוכחה פרמטרית חזקה יותר.\n3. דרוש ממני ניסוח מתמטי פורמלי של יחסי שטחים ותלות בפרמטרים.`,
    advancedGateQuestion: "לפני שמתחילים — נסח פרומפט שמבקש מה-AI לבדוק: מהו הקשר בין השיפוע m לבין יחס השטחים של שני המשולשים שנוצרים מהגובה ליתר? ולמה היחס לא תלוי במיקום P? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "ביטוי P ו-M בעזרת t", coaching: "", prompt: "אם P נמצאת על y=mx וערך ה-x שלה הוא t, מהן הקואורדינטות של P ושל M (רגל האנך לציר x)?", keywords: [], keywordHint: "", contextWords: ["P", "M", "t", "mt", "ציר", "אנך", "קואורדינטות", "הצבה"] },
      { phase: "סעיף ב׳", label: "מציאת Q — רגל הגובה", coaching: "", prompt: "Q היא רגל הגובה מ-M ליתר OP. כיצד אמצא את שיעורי Q בעזרת m ו-t? (רמז: השתמשו בהיטל וקטורי)", keywords: [], keywordHint: "", contextWords: ["גובה", "יתר", "היטל", "Q", "ניצב", "OP", "פרמטר", "1+m²"] },
      { phase: "סעיף ג׳", label: "הוכחת דמיון △OQM ~ △MQP", coaching: "", prompt: "נסח פרומפט שמבקש מה-AI לבדוק אם הביטוי האלגברי שקיבלת לשיעורי Q הגיוני גיאומטרית, ואז הוכח את הדמיון.", keywords: [], keywordHint: "", contextWords: ["דמיון", "זווית", "ישרה", "Q", "ניצב", "משותף", "OQM", "MQP", "יחס"] },
      { phase: "סעיף ד׳", label: "יחס שטחים תלוי ב-m בלבד", coaching: "", prompt: "נסח פרומפט שמבקש מה-AI להסביר: מדוע יחס השטחים △OQM / △MQP שווה ל-1/m² ולמה הוא לא תלוי ב-t?", keywords: [], keywordHint: "", contextWords: ["שטח", "יחס", "m", "t", "פרמטר", "קבוע", "שיפוע", "תלוי", "בלתי"] },
      { phase: "סעיף ה׳", label: "שיפוע החפיפה", coaching: "", prompt: "עבור איזה m המשולשים חופפים? מה המשמעות הגיאומטרית של m=1?", keywords: [], keywordHint: "", contextWords: ["חפיפה", "m=1", "45", "שווה", "שווה-שוקיים", "ישר-זווית", "שיפוע"] },
    ],
  },
];

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex }: { ex: ExerciseDef }) {
  const s = STATION[ex.id];
  const [copiedProblem, setCopiedProblem] = useState(false);
  function handleCopyProblem() {
    navigator.clipboard.writeText(ex.problem.split(/\n+[אבגדהוזחט]\./)[0].trim());
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  }
  return (
    <section style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar — rose accent #e11d48 */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(225,29,72,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(225,29,72,0.12)" }}>
        <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

        {/* Context: variable definitions */}
        <div style={{ borderRadius: 10, background: "rgba(225,29,72,0.05)", border: "1px solid rgba(225,29,72,0.15)", padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ color: "#2D3436", fontSize: 13, lineHeight: 1.8 }}>
            <Tex>{String.raw`d`}</Tex> — מרחק &nbsp;&nbsp;·&nbsp;&nbsp;
            <Tex>{String.raw`m`}</Tex> — שיפוע &nbsp;&nbsp;·&nbsp;&nbsp;
            <Tex>{String.raw`M`}</Tex> — נקודת אמצע
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          {/* Distance formula */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📏 מרחק בין שתי נקודות</div>
            <div style={{ color: "#e11d48" }}><TexBlock>{String.raw`d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}`}</TexBlock></div>
          </div>
          <div style={{ width: "80%", height: 1, background: "rgba(60,54,42,0.08)" }} />
          {/* Perpendicularity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📐 תנאי ניצבות</div>
            <div style={{ color: "#e11d48" }}><TexBlock>{String.raw`m_1 \cdot m_2 = -1`}</TexBlock></div>
          </div>
          <div style={{ width: "80%", height: 1, background: "rgba(60,54,42,0.08)" }} />
          {/* Midpoint */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📍 נקודת אמצע</div>
            <div style={{ color: "#e11d48" }}><TexBlock>{String.raw`M = \left(\frac{x_1+x_2}{2},\;\frac{y_1+y_2}{2}\right)`}</TexBlock></div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      {ex.diagram && (
        <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      )}

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>📝 השאלה</div>
          <button onClick={handleCopyProblem} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, cursor: "pointer", background: copiedProblem ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.08)", border: "1px solid rgba(107,114,128,0.2)", color: copiedProblem ? "#15803d" : "#6B7280", fontSize: 11, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copiedProblem ? <Check size={11} /> : <Copy size={11} />}
            {copiedProblem ? "הועתק!" : "העתק"}
          </button>
        </div>
        <pre style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{ex.problem}</pre>
      </div>

      {/* Pitfalls */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ color: "#DC2626", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠️ שגיאות נפוצות</div>
        {ex.pitfalls.map((p, i) => (
          <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", padding: "0.85rem 1rem", marginBottom: 8 }}>
            <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14, marginBottom: p.text ? 4 : 0 }}>{p.title}</div>
            {p.text && <div style={{ color: "#2D3436", fontSize: 13.5, lineHeight: 1.65 }}>{p.text}</div>}
          </div>
        ))}
      </div>

      {/* Prompt Ladder */}
      <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", boxShadow: s.glowShadow }}>
        <div style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>🧠 מדריך הפרומפטים</div>
        {ex.id === "basic"    && <LadderBase     steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} />}
        {ex.id === "medium"   && <LadderMedium   steps={ex.steps} goldenPrompt={ex.goldenPrompt} glowRgb={s.glowRgb} borderRgb={s.borderRgb} problemText={ex.problem} />}
      </div>

      {/* Advanced — outside bordered container */}
      {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}

    </section>
  );
}

// ─── Lab 1: RectangleLab (Basic) ──────────────────────────────────────────────

function RectangleLab() {
  const [ax, setAx] = useState(-4);

  // Geometry: A = (ax, ax/2), C = (-ax, -ax/2), B on y=-2x at y=-ax/2, D symmetric to B
  const ay = ax / 2;
  const bx = ax / 4, by = -ay;
  const cx = -ax, cy = -ay;
  const dx = -bx, dy = -by;

  const slopeAC = 0.5;  // always: (cy-ay)/(cx-ax) = (-ay-ay)/(-ax-ax) = -2ay/(-2ax) = ay/ax = 0.5
  const slopeBD = -2;    // always: on y=-2x
  const product = slopeAC * slopeBD; // always -1

  const AC = Math.sqrt((cx - ax) ** 2 + (cy - ay) ** 2);
  const BD = Math.sqrt((dx - bx) ** 2 + (dy - by) ** 2);
  const area = 0.5 * AC * BD;

  return (
    <section style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginTop: "2rem", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>מעבדת המעוין</h3>
      <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginBottom: "1.5rem" }}>הזיזו את x של נקודה A — צפו כיצד המעוין משתנה תוך שמירה על ניצבות.</p>

      {/* Interactive diagram */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.25)", background: "#fff", padding: "0.5rem", marginBottom: "1.5rem" }}>
        <AnalyticParallelogramDiagram ax={ax} />
      </div>

      {/* Slider: x of A */}
      <div style={{ marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(22,163,74,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1A1A1A", marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>A.x (קואורדינטת x של A)</span>
          <span style={{ color: "#16A34A", fontWeight: 700, fontFamily: "monospace" }}>{ax}</span>
        </div>
        <input type="range" min={-8} max={-1} step={0.5} value={ax}
          onChange={e => setAx(+e.target.value)}
          style={{ width: "100%", accentColor: "#16A34A" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B7280", marginTop: 4 }}>
          <span>A = ({ax}, {ay})</span>
          <span>C = ({cx}, {cy})</span>
          <span>B = ({bx}, {by})</span>
          <span>D = ({dx}, {dy})</span>
        </div>
      </div>

      {/* Slope meter — the key insight */}
      <div style={{ borderRadius: 14, background: "rgba(22,163,74,0.04)", border: "2px solid rgba(22,163,74,0.3)", padding: "14px 16px", marginBottom: "1rem", textAlign: "center" }}>
        <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>מד שיפועים — הוכחת ניצבות</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <div style={{ fontSize: 9, color: "#6B7280", fontWeight: 600 }}>שיפוע AC</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#3b82f6", fontFamily: "monospace" }}>{slopeAC}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>×</div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)" }}>
            <div style={{ fontSize: 9, color: "#6B7280", fontWeight: 600 }}>שיפוע BD</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa", fontFamily: "monospace" }}>{slopeBD}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>=</div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(22,163,74,0.1)", border: "2px solid #16A34A" }}>
            <div style={{ fontSize: 9, color: "#6B7280", fontWeight: 600 }}>מכפלה</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#16A34A", fontFamily: "monospace" }}>{product}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>→ מעוין!</div>
        </div>
      </div>

      {/* Data row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, textAlign: "center" }}>
        {[
          { label: "אלכסון AC", val: AC.toFixed(2), color: "#3b82f6" },
          { label: "אלכסון BD", val: BD.toFixed(2), color: "#a78bfa" },
          { label: "שטח = ½·AC·BD", val: area.toFixed(1), color: "#16A34A" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0", padding: "10px 6px" }}>
            <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 2: ParallelogramLab (Medium) ─────────────────────────────────────────

function ParallelogramLab() {
  // A and C fixed, B moves → D follows to keep parallelogram
  const A = { x: 2, y: 2 }, C = { x: 14, y: 14 };
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }; // (8,8)
  const [bx, setBx] = useState(10);
  const [by, setBy] = useState(6);
  const [guess, setGuess] = useState("");
  const [verified, setVerified] = useState(false);

  // D = 2M - B (so M is midpoint of BD)
  const D = { x: 2 * M.x - bx, y: 2 * M.y - by };

  // Distances from M
  const AM = Math.sqrt((M.x - A.x) ** 2 + (M.y - A.y) ** 2);
  const CM = Math.sqrt((M.x - C.x) ** 2 + (M.y - C.y) ** 2);
  const BM = Math.sqrt((M.x - bx) ** 2 + (M.y - by) ** 2);
  const DM = Math.sqrt((M.x - D.x) ** 2 + (M.y - D.y) ** 2);
  const ratio = AM > 0 && BM > 0 ? (AM / CM).toFixed(3) + " : " + (BM / DM).toFixed(3) : "—";

  // Area = |cross product of AB and AD|
  const areaVal = Math.abs((bx - A.x) * (D.y - A.y) - (by - A.y) * (D.x - A.x));

  // SVG mapping
  const sc = 14, ox = 16, oy = 260;
  const toX = (v: number) => ox + v * sc;
  const toY = (v: number) => oy - v * sc;

  // Verify guess
  const checkGuess = () => {
    const match = guess.replace(/\s/g, "").match(/\(?([-\d.]+),([-\d.]+)\)?/);
    if (match) {
      const gx = parseFloat(match[1]), gy = parseFloat(match[2]);
      setVerified(Math.abs(gx - D.x) < 0.5 && Math.abs(gy - D.y) < 0.5);
    }
  };

  return (
    <section style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginTop: "2rem", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>מעבדת המקבילית והדמיון</h3>
      <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginBottom: "1.5rem" }}>הזיזו את B — צפו כיצד D עוקבת כדי לשמור על מקבילית.</p>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${verified ? "rgba(22,163,74,0.5)" : "rgba(234,88,12,0.25)"}`, background: verified ? "rgba(22,163,74,0.03)" : "#fff", padding: "0.5rem", marginBottom: "1.5rem", transition: "all 0.3s" }}>
        <svg viewBox="0 0 260 260" className="w-full max-w-xs mx-auto" style={{ display: "block" }} aria-hidden>
          {/* Grid */}
          {[0, 2, 4, 6, 8, 10, 12, 14, 16].map(v => (
            <g key={v}>
              <line x1={toX(v)} y1={toY(0)} x2={toX(v)} y2={toY(16)} stroke="#f1f5f9" strokeWidth={0.5} />
              <line x1={toX(0)} y1={toY(v)} x2={toX(16)} y2={toY(v)} stroke="#f1f5f9" strokeWidth={0.5} />
            </g>
          ))}
          {/* Axes */}
          <line x1={toX(-0.5)} y1={toY(0)} x2={toX(16.5)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1} />
          <line x1={toX(0)} y1={toY(-0.5)} x2={toX(0)} y2={toY(16.5)} stroke="#94a3b8" strokeWidth={1} />
          <text x={toX(16.5) + 3} y={toY(0) + 3} fontSize={9} fill="#94a3b8" fontStyle="italic">x</text>
          <text x={toX(0) + 3} y={toY(16.5) - 1} fontSize={9} fill="#94a3b8" fontStyle="italic">y</text>

          {/* Parallelogram */}
          <polygon
            points={`${toX(A.x)},${toY(A.y)} ${toX(bx)},${toY(by)} ${toX(C.x)},${toY(C.y)} ${toX(D.x)},${toY(D.y)}`}
            fill={verified ? "rgba(22,163,74,0.08)" : "rgba(234,88,12,0.06)"}
            stroke={verified ? "#16A34A" : "#EA580C"} strokeWidth={1.8} strokeLinejoin="round" />

          {/* Diagonal AC (amber) */}
          <line x1={toX(A.x)} y1={toY(A.y)} x2={toX(C.x)} y2={toY(C.y)} stroke="#f59e0b" strokeWidth={1.3} strokeDasharray="4,3" />
          {/* Diagonal BD (purple) */}
          <line x1={toX(bx)} y1={toY(by)} x2={toX(D.x)} y2={toY(D.y)} stroke="#a78bfa" strokeWidth={1.3} strokeDasharray="4,3" />

          {/* M */}
          <circle cx={toX(M.x)} cy={toY(M.y)} r={3} fill="#f59e0b" stroke="#fff" strokeWidth={1} />
          <text x={toX(M.x) + 5} y={toY(M.y) - 3} fontSize={8} fill="#f59e0b" fontWeight={700}>M</text>

          {/* Vertices */}
          {[
            { p: A, label: "A", color: "#EA580C", dx: -6, dy: 12 },
            { p: { x: bx, y: by }, label: "B", color: "#EA580C", dx: 5, dy: 12 },
            { p: C, label: "C", color: "#EA580C", dx: 5, dy: -4 },
            { p: D, label: "D", color: verified ? "#16A34A" : "#64748b", dx: -6, dy: -4 },
          ].map(v => (
            <g key={v.label}>
              <circle cx={toX(v.p.x)} cy={toY(v.p.y)} r={3} fill={v.color} stroke="#fff" strokeWidth={1} />
              <text x={toX(v.p.x) + v.dx} y={toY(v.p.y) + v.dy} fontSize={10} fill={v.color} fontWeight={700}>{v.label}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* B slider */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(234,88,12,0.15)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1A1A1A", marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>B.x</span>
            <span style={{ color: "#EA580C", fontWeight: 700, fontFamily: "monospace" }}>{bx}</span>
          </div>
          <input type="range" min={3} max={15} step={1} value={bx} onChange={e => { setBx(+e.target.value); setVerified(false); }} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1A1A1A", marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>B.y</span>
            <span style={{ color: "#EA580C", fontWeight: 700, fontFamily: "monospace" }}>{by}</span>
          </div>
          <input type="range" min={0} max={15} step={1} value={by} onChange={e => { setBy(+e.target.value); setVerified(false); }} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
      </div>

      {/* Coordinate meter */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, textAlign: "center", marginBottom: "1rem" }}>
        {[
          { label: "AM", val: AM.toFixed(1), color: "#f59e0b" },
          { label: "MC", val: CM.toFixed(1), color: "#f59e0b" },
          { label: "BM", val: BM.toFixed(1), color: "#a78bfa" },
          { label: "MD", val: DM.toFixed(1), color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0", padding: "8px 4px" }}>
            <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>

      {/* Similarity ratio + area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0", padding: "10px 6px" }}>
          <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 4 }}>יחס דמיון △ABM ~ △CDM</div>
          <div style={{ color: "#EA580C", fontWeight: 800, fontSize: 16, fontFamily: "monospace" }}>{ratio}</div>
        </div>
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0", padding: "10px 6px" }}>
          <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 4 }}>שטח ABCD</div>
          <div style={{ color: "#16A34A", fontWeight: 800, fontSize: 16, fontFamily: "monospace" }}>{areaVal}</div>
        </div>
      </div>

      {/* Guess D */}
      <div style={{ borderRadius: 14, background: "rgba(234,88,12,0.04)", border: `2px solid ${verified ? "#16A34A" : "rgba(234,88,12,0.25)"}`, padding: "14px 16px", textAlign: "center", transition: "all 0.3s" }}>
        <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>הזינו את הקואורדינטות של D:</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
          <input
            type="text" value={guess} dir="ltr"
            onChange={e => { setGuess(e.target.value); setVerified(false); }}
            onKeyDown={e => { if (e.key === "Enter") checkGuess(); }}
            placeholder="(x, y)"
            style={{ width: 100, padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "monospace", textAlign: "center" }}
          />
          <button onClick={checkGuess} style={{ padding: "6px 14px", borderRadius: 8, background: "#EA580C", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            בדיקה
          </button>
        </div>
        {verified && (
          <div style={{ color: "#16A34A", fontWeight: 700, fontSize: 13, marginTop: 8 }}>
            נכון! D = ({D.x}, {D.y}) — המקבילית שלמה!
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Lab 3: SquareBuilderLab (Advanced) ───────────────────────────────────────

function SquareBuilderLab() {
  const [m, setM] = useState(1.5);
  const [t, setT] = useState(4);

  // P on L1: y=mx
  const P = { x: t, y: m * t };
  const M = { x: t, y: 0 };
  // Q = foot of altitude from M to OP (hypotenuse)
  const denom = 1 + m * m;
  const Q = { x: t / denom, y: m * t / denom };

  // Distances
  const OQ = Math.sqrt(Q.x ** 2 + Q.y ** 2);
  const QM = Math.sqrt((Q.x - M.x) ** 2 + Q.y ** 2);
  const QP = Math.sqrt((P.x - Q.x) ** 2 + (P.y - Q.y) ** 2);
  const OM = t;
  const MP = m * t;
  const OP = t * Math.sqrt(denom);

  // Areas
  const areaOQM = OQ * QM / 2;
  const areaMQP = QM * QP / 2;
  const areaRatio = areaMQP > 0.001 ? areaOQM / areaMQP : 0;
  const isCongruent = Math.abs(m - 1) < 0.05;

  // SVG mapping
  const maxCoord = Math.max(t + 1, m * t + 1, 5);
  const sc = 200 / maxCoord;
  const ox = 36, oy = 36 + maxCoord * sc;
  const toX = (v: number) => ox + v * sc;
  const toY = (v: number) => oy - v * sc;

  return (
    <section style={{ border: `1px solid rgba(0,0,0,0.1)`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginTop: "2rem", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", transition: "border-color 0.3s" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>מעבדת הגובה ליתר — דמיון פרמטרי</h3>
      <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginBottom: "1.5rem" }}>הזיזו את m ו-t — ראו שיחס השטחים תלוי רק ב-m!</p>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: `1px solid ${isCongruent ? "rgba(22,163,74,0.35)" : "rgba(139,38,53,0.25)"}`, background: isCongruent ? "rgba(22,163,74,0.02)" : "#fff", padding: "0.5rem", marginBottom: "1.5rem", transition: "all 0.3s" }}>
        <svg viewBox={`0 0 ${Math.ceil(toX(maxCoord) + 30)} ${Math.ceil(oy + 30)}`} className="w-full max-w-sm mx-auto" style={{ display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-0.5)} y1={toY(0)} x2={toX(maxCoord + 0.5)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1} />
          <line x1={toX(0)} y1={toY(-0.5)} x2={toX(0)} y2={toY(maxCoord + 0.5)} stroke="#94a3b8" strokeWidth={1} />
          <text x={toX(maxCoord + 0.5) + 3} y={toY(0) + 3} fontSize={9} fill="#94a3b8" fontStyle="italic">x</text>
          <text x={toX(0) + 3} y={toY(maxCoord + 0.5) - 1} fontSize={9} fill="#94a3b8" fontStyle="italic">y</text>

          {/* L1: y=mx */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(t + 0.5)} y2={toY((t + 0.5) * m)} stroke="#3b82f6" strokeWidth={1.3} />

          {/* △OQM fill (blue) */}
          <polygon points={`${toX(0)},${toY(0)} ${toX(Q.x)},${toY(Q.y)} ${toX(M.x)},${toY(M.y)}`}
            fill="rgba(59,130,246,0.12)" stroke="none" />

          {/* △MQP fill (purple) */}
          <polygon points={`${toX(M.x)},${toY(M.y)} ${toX(Q.x)},${toY(Q.y)} ${toX(P.x)},${toY(P.y)}`}
            fill="rgba(167,139,250,0.12)" stroke="none" />

          {/* Triangle edges */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(P.x)} y2={toY(P.y)} stroke="#1a1a2e" strokeWidth={1.5} />
          <line x1={toX(P.x)} y1={toY(P.y)} x2={toX(M.x)} y2={toY(M.y)} stroke="#1a1a2e" strokeWidth={1.5} />
          <line x1={toX(0)} y1={toY(0)} x2={toX(M.x)} y2={toY(M.y)} stroke="#1a1a2e" strokeWidth={1.5} />

          {/* Altitude MQ (red dashed) */}
          <line x1={toX(M.x)} y1={toY(M.y)} x2={toX(Q.x)} y2={toY(Q.y)} stroke="#DC2626" strokeWidth={1.8} strokeDasharray="4,3" />

          {/* Right-angle at M */}
          <polyline points={`${toX(M.x) - 6},${toY(0)} ${toX(M.x) - 6},${toY(0) - 6} ${toX(M.x)},${toY(0) - 6}`} fill="none" stroke="#1a1a2e" strokeWidth={1} />

          {/* Points */}
          <circle cx={toX(0)} cy={toY(0)} r={3} fill="#1a1a2e" stroke="#fff" strokeWidth={1} />
          <text x={toX(0) - 10} y={toY(0) + 12} fontSize={9} fill="#1a1a2e" fontWeight={700}>O</text>

          <circle cx={toX(P.x)} cy={toY(P.y)} r={3.5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(P.x) + 5} y={toY(P.y) - 4} fontSize={9} fill="#DC2626" fontWeight={700}>P</text>

          <circle cx={toX(M.x)} cy={toY(M.y)} r={3} fill="#1a1a2e" stroke="#fff" strokeWidth={1} />
          <text x={toX(M.x) + 4} y={toY(M.y) + 12} fontSize={9} fill="#1a1a2e" fontWeight={700}>M</text>

          <circle cx={toX(Q.x)} cy={toY(Q.y)} r={3.5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(Q.x) - 6} y={toY(Q.y) - 6} fontSize={9} fill="#DC2626" fontWeight={700}>Q</text>

          {/* Triangle labels */}
          <text x={(toX(0) + toX(Q.x) + toX(M.x)) / 3 - 4} y={(toY(0) + toY(Q.y) + toY(M.y)) / 3 + 3} fontSize={7} fill="#3b82f6" fontWeight={700}>OQM</text>
          <text x={(toX(M.x) + toX(Q.x) + toX(P.x)) / 3 - 4} y={(toY(M.y) + toY(Q.y) + toY(P.y)) / 3 + 3} fontSize={7} fill="#a78bfa" fontWeight={700}>MQP</text>
        </svg>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, padding: "1.25rem", border: "1px solid rgba(139,38,53,0.15)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1A1A1A", marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>שיפוע m</span>
            <span style={{ color: "#DC2626", fontWeight: 700, fontFamily: "monospace" }}>{m.toFixed(1)}</span>
          </div>
          <input type="range" min={0.3} max={3} step={0.1} value={m}
            onChange={e => setM(+e.target.value)}
            style={{ width: "100%", accentColor: "#DC2626" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1A1A1A", marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>מיקום P (t)</span>
            <span style={{ color: "#3b82f6", fontWeight: 700, fontFamily: "monospace" }}>{t}</span>
          </div>
          <input type="range" min={1} max={8} step={0.5} value={t}
            onChange={e => setT(+e.target.value)}
            style={{ width: "100%", accentColor: "#3b82f6" }} />
        </div>
      </div>

      {/* Live proof: area ratio */}
      <div style={{ borderRadius: 14, background: isCongruent ? "rgba(22,163,74,0.06)" : "rgba(139,38,53,0.04)", border: `2px solid ${isCongruent ? "#16A34A" : "rgba(139,38,53,0.3)"}`, padding: "14px 16px", marginBottom: "1rem", textAlign: "center", transition: "all 0.3s" }}>
        <div style={{ color: "#1A1A1A", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
          {isCongruent ? "חפיפה! m = 1 → המשולשים זהים" : "יחס שטחים — תלוי רק ב-m"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <div style={{ fontSize: 8, color: "#6B7280", fontWeight: 600 }}>S(△OQM)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#3b82f6", fontFamily: "monospace" }}>{areaOQM.toFixed(2)}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>/</div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)" }}>
            <div style={{ fontSize: 8, color: "#6B7280", fontWeight: 600 }}>S(△MQP)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa", fontFamily: "monospace" }}>{areaMQP.toFixed(2)}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>=</div>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: isCongruent ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)", border: `2px solid ${isCongruent ? "#16A34A" : "#DC2626"}` }}>
            <div style={{ fontSize: 8, color: "#6B7280", fontWeight: 600 }}>1/m²</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: isCongruent ? "#16A34A" : "#DC2626", fontFamily: "monospace" }}>{areaRatio.toFixed(3)}</div>
          </div>
        </div>
        <div style={{ color: "#6B7280", fontSize: 10, marginTop: 8 }}>
          הזיזו את t — היחס {areaRatio.toFixed(3)} נשאר קבוע! (= 1/m² = 1/{(m * m).toFixed(2)})
        </div>
      </div>

      {/* Data row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, textAlign: "center" }}>
        {[
          { label: "OQ", val: OQ.toFixed(2), color: "#3b82f6" },
          { label: "QM", val: QM.toFixed(2), color: "#DC2626" },
          { label: "QP", val: QP.toFixed(2), color: "#a78bfa" },
          { label: "דמיון OQ/QP", val: (OQ / (QP || 1)).toFixed(3), color: "#1A1A1A" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 12, background: "#fff", border: "1px solid #e2e8f0", padding: "8px 4px" }}>
            <div style={{ color: "#6B7280", fontSize: 8, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProblemsPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">("basic");
  const ex = exercises.find(e => e.id === selectedLevel)!;
  const lvlRgb = selectedLevel === "basic" ? "45,90,39" : selectedLevel === "medium" ? "163,79,38" : "139,38,53";

  return (
    <main
      style={{ minHeight: "100vh", background: "#F3EFE0", backgroundImage: "radial-gradient(rgba(60,54,42,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", color: "#2D3436", ["--lvl-rgb" as string]: lvlRgb } as React.CSSProperties}
      dir="rtl"
    >
      {/* ── Global focus/hover border overrides ── */}
      <style>{`
        textarea, input[type="text"], input[type="password"], input[type="number"] { outline: none !important; }
        textarea:focus, input[type="text"]:focus, input[type="number"]:focus {
          outline: none !important;
          border-color: rgba(var(--lvl-rgb), 0.65) !important;
          box-shadow: 0 0 0 3px rgba(var(--lvl-rgb), 0.12) !important;
        }
        input[type="range"] { outline: none !important; }
        input[type="range"]:focus { outline: none !important; }
        button:focus, button:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(var(--lvl-rgb), 0.35) !important;
        }
        button:focus:not(:focus-visible) { box-shadow: none !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(60,54,42,0.15)", background: "#F3EFE0" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>🧩 בעיות גאומטריות</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>מלבנים, מקביליות וריבועים — מציאת קודקודים, סיווג וחישוב שטחים</p>
          </div>
          <Link
            href="/topic/grade10/analytic"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

        {/* Sub-topic progress */}
        <SubtopicProgress subtopicId="/grade10/analytic/problems" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => setSelectedLevel(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={ex} />
        </motion.div>

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <RectangleLab />}
        {selectedLevel === "medium" && <ParallelogramLab />}
        {selectedLevel === "advanced" && <SquareBuilderLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade10/analytic/problems" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
