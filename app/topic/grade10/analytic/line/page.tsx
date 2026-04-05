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

function BasicDiagram() {
  // Two lines: y=2x+1, y=-x+7. Intersection at (2,5).
  // X-intercepts: y=2x+1→x=-0.5; y=-x+7→x=7
  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={toX(-1)} y1={toY(0)} x2={toX(12)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon points={`${toX(12)},${toY(0)} ${toX(12) - 5},${toY(0) - 3} ${toX(12) - 5},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
      <text x={toX(12) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Line 1: y=2x+1, drawn from x=-0.5 to x=4.5 */}
      <line x1={toX(-0.5)} y1={toY(0)} x2={toX(4.5)} y2={toY(10)} stroke="#EA580C" strokeWidth={2} />
      {/* Line 2: y=-x+7, drawn from x=-1 to x=8 */}
      <line x1={toX(-1)} y1={toY(8)} x2={toX(8)} y2={toY(-1)} stroke="#3b82f6" strokeWidth={2} />

      {/* Intersection point (2,5) — highlighted */}
      <circle cx={toX(2)} cy={toY(5)} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(2) + 8} y={toY(5) - 8} fontSize={11} fill="#f59e0b" fontWeight={600} fontFamily="sans-serif">?</text>

      {/* Line labels — silent: no equations */}
      <text x={toX(3.5) + 6} y={toY(8) - 2} fontSize={10} fill="#EA580C" fontWeight={600} fontFamily="sans-serif">ℓ₁</text>
      <text x={toX(5) + 6} y={toY(2) - 6} fontSize={10} fill="#3b82f6" fontWeight={600} fontFamily="sans-serif">ℓ₂</text>
    </svg>
  );
}

function MediumDiagram() {
  // Two parallel lines: y=3x-2 and y=3x+4. Point A(1,7) on the new line.
  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={toX(-1)} y1={toY(0)} x2={toX(12)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-3)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon points={`${toX(12)},${toY(0)} ${toX(12) - 5},${toY(0) - 3} ${toX(12) - 5},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
      <text x={toX(12) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Line 1: y=3x-2, from x=0 to x=4 */}
      <line x1={toX(0)} y1={toY(-2)} x2={toX(4)} y2={toY(10)} stroke="#EA580C" strokeWidth={2} />
      {/* Line 2: y=3x+4 (new road), from x=-1 to x=2 */}
      <line x1={toX(-1)} y1={toY(1)} x2={toX(2)} y2={toY(10)} stroke="#16A34A" strokeWidth={2} strokeDasharray="6,3" />

      {/* Point A(1,7) */}
      <circle cx={toX(1)} cy={toY(7)} r={5} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(1) + 8} y={toY(7) - 6} fontSize={11} fill="#16A34A" fontWeight={600} fontFamily="sans-serif">A</text>

      {/* Perpendicular distance dashed */}
      <line x1={toX(1)} y1={toY(7)} x2={toX(1.9)} y2={toY(3.7)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4,3" />

      {/* Line labels */}
      <text x={toX(3.2) + 6} y={toY(7.5)} fontSize={10} fill="#EA580C" fontWeight={600} fontFamily="sans-serif">ℓ₁</text>
      <text x={toX(0.2)} y={toY(9.5)} fontSize={10} fill="#16A34A" fontWeight={600} fontFamily="sans-serif">?</text>
    </svg>
  );
}

function AdvancedDiagram() {
  // Three lines: L1: y=x+4, L2: y=-2x+10, L3: y=0
  // Intersections: L1∩L2: (2,6), L1∩L3: (-4,0), L2∩L3: (5,0)
  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={toX(-5)} y1={toY(0)} x2={toX(12)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon points={`${toX(12)},${toY(0)} ${toX(12) - 5},${toY(0) - 3} ${toX(12) - 5},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
      <text x={toX(12) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Triangle fill */}
      <polygon
        points={`${toX(2)},${toY(6)} ${toX(-4)},${toY(0)} ${toX(5)},${toY(0)}`}
        fill="rgba(234,88,12,0.06)" stroke="none"
      />

      {/* L1: y=x+4, from x=-5 to x=6 */}
      <line x1={toX(-5)} y1={toY(-1)} x2={toX(5.5)} y2={toY(9.5)} stroke="#EA580C" strokeWidth={2} />
      {/* L2: y=-2x+10, from x=0 to x=5.5 */}
      <line x1={toX(0)} y1={toY(10)} x2={toX(5.5)} y2={toY(-1)} stroke="#3b82f6" strokeWidth={2} />
      {/* L3: y=0 (x-axis) is already drawn */}

      {/* Triangle edges on x-axis highlighted */}
      <line x1={toX(-4)} y1={toY(0)} x2={toX(5)} y2={toY(0)} stroke="#16A34A" strokeWidth={2.5} />

      {/* Vertices */}
      <circle cx={toX(2)} cy={toY(6)} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(2) + 8} y={toY(6) - 6} fontSize={11} fill="#f59e0b" fontWeight={600} fontFamily="sans-serif">?</text>

      <circle cx={toX(-4)} cy={toY(0)} r={4} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(-4) - 4} y={toY(0) + 16} fontSize={10} fill="#16A34A" fontWeight={600} fontFamily="sans-serif">?</text>

      <circle cx={toX(5)} cy={toY(0)} r={4} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(5) + 4} y={toY(0) + 16} fontSize={10} fill="#DC2626" fontWeight={600} fontFamily="sans-serif">?</text>

      {/* Line labels */}
      <text x={toX(4.5) + 6} y={toY(8.5)} fontSize={10} fill="#EA580C" fontWeight={600} fontFamily="sans-serif">L₁</text>
      <text x={toX(4.5) + 6} y={toY(1)} fontSize={10} fill="#3b82f6" fontWeight={600} fontFamily="sans-serif">L₂</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "המפגש הסודי",
    problem: "שני חברים יוצאים לטיול. הראשון הולך לאורך הישר y = 2x + 1.\nהשני הולך לאורך הישר y = -x + 7.\n\nא. מצא את נקודת המפגש של שני החברים.\nב. מהו המרחק של נקודת המפגש מראשית הצירים?\nג. מצא את השטח של המשולש שנוצר בין שני הישרים וציר ה-x.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "חיתוך ≠ ניחוש", text: "תלמידים רבים מנסים לנחש את נקודת החיתוך מהגרף. זה לא מדויק — צריך לפתור מערכת משוואות אלגברית." },
      { title: "שטח משולש — מאיפה הבסיס?", text: "הטעות הנפוצה: לקחת את המרחק בין שני הישרים כבסיס. הבסיס הוא על ציר x, בין שתי נקודות החיתוך של הישרים עם הציר." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה בגאומטריה אנליטית על חיתוך ישרים ושטח משולש.\nאני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת נקודת חיתוך", coaching: "", prompt: "נתונים שני ישרים: y=2x+1 ו-y=-x+7. תנחה אותי למצוא את נקודת החיתוך שלהם. מאיפה מתחילים? איך בונים מערכת משוואות מזה?", keywords: [], keywordHint: "", contextWords: ["חיתוך", "מערכת", "משוואות", "השוואה", "x", "y", "הצבה", "פתרון"] },
      { phase: "סעיף ב׳", label: "מרחק מהראשית", coaching: "", prompt: "מצאתי את נקודת החיתוך של שני הישרים. עכשיו צריך לחשב את המרחק שלה מראשית הצירים (0,0). תנחה אותי — איזו נוסחה מתאימה ולמה?", keywords: [], keywordHint: "", contextWords: ["מרחק", "שורש", "ריבוע", "ראשית", "נוסחה", "פיתגורס", "נקודה"] },
      { phase: "סעיף ג׳", label: "שטח משולש", coaching: "", prompt: "שני הישרים y=2x+1 ו-y=-x+7 חותכים את ציר x ויוצרים משולש. תנחה אותי — מה הצעד הראשון? האם צריך קודם למצוא את נקודות החיתוך עם ציר x?", keywords: [], keywordHint: "", contextWords: ["שטח", "משולש", "בסיס", "גובה", "ציר", "חצי", "חיתוך", "y=0"] },
    ],
  },
  {
    id: "medium",
    title: "הכביש המקביל",
    problem: "הכביש הראשי עובר לאורך הישר y = 3x - 2.\nמתכננים לסלול כביש חדש, מקביל לכביש הראשי, שיעבור דרך הנקודה A(1, 7).\n\nא. מצא את משוואת הכביש החדש.\nב. מהו המרחק בין שני הכבישים המקבילים?\nג. נקודה P נמצאת על הכביש הראשי כך ש-x_P = 3. מצא את המרחק מ-P לכביש החדש.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "מקביל ≠ אותו ישר", text: "תלמידים שוכחים שמקביל = שיפוע זהה אבל חיתוך y שונה. אם גם ה-b זהה, זה אותו ישר ולא ישר מקביל." },
      { title: "מרחק בין ישרים — לא מרחק אופקי!", text: "הטעות הנפוצה: לחשב |b₁-b₂| בלבד. המרחק בין ישרים מקבילים הוא מרחק ניצב, לא הפרש חיתוכי y." },
    ],
    goldenPrompt: `היי, אני תלמיד/ה כיתה י' ומצרף/ת תרגיל בגאומטריה אנליטית על ישרים מקבילים ומרחק בין ישרים.\nאני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. תעצור אחרי כל סעיף ותחכה שאגיד להמשיך.\nבסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "משוואת ישר מקביל", coaching: "", prompt: "נתון הישר y=3x-2. צריך למצוא ישר מקביל לו שעובר דרך A(1,7). תנחה אותי — מה אני יודע על השיפוע של ישר מקביל? ואיך אמצא את ה-b?", keywords: [], keywordHint: "", contextWords: ["מקביל", "שיפוע", "שווה", "הצבה", "נקודה", "b", "משוואה", "3"] },
      { phase: "סעיף ב׳", label: "מרחק בין ישרים מקבילים", coaching: "", prompt: "מצאתי שני ישרים מקבילים עם אותו שיפוע m=3 אבל חיתוכי y שונים. תנחה אותי — איך מחשבים מרחק ניצב בין שני ישרים מקבילים? מה הנוסחה ולמה היא עובדת?", keywords: [], keywordHint: "", contextWords: ["מרחק", "מקביל", "נוסחה", "שורש", "ערך מוחלט", "b1", "b2", "מכנה"] },
      { phase: "סעיף ג׳", label: "מרחק נקודה מישר", coaching: "", prompt: "הנקודה P נמצאת על הישר y=3x-2 בערך x=3. צריך למצוא את המרחק שלה מהישר המקביל שמצאתי בסעיף א. תנחה אותי — מה הצעד הראשון? האם צריך קודם למצוא את הקואורדינטות של P?", keywords: [], keywordHint: "", contextWords: ["מרחק", "נקודה", "ישר", "נוסחה", "הצבה", "P", "שורש", "ערך מוחלט"] },
    ],
  },
  {
    id: "advanced",
    title: "המשולש האנליטי",
    problem: "במערכת צירים נתונים שלושה ישרים:\nL₁: y = x + 4\nL₂: y = -2x + 10\nL₃: y = 0 (ציר ה-x)\n\nא. מצא את שלוש קודקודי המשולש שנוצר מחיתוך הישרים.\nב. הוכח כי אחת הזוויות במשולש היא זווית ישרה (90°).\nג. חשב את שטח המשולש.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "3 ישרים ≠ 3 חיתוכים אוטומטיים", text: "תלמידים פותרים רק חיתוך אחד ושוכחים שיש 3 זוגות. כל זוג ישרים נותן קודקוד אחד — צריך לפתור 3 מערכות." },
      { title: "זווית ישרה — לא מספיק לבדוק זוג אחד", text: "הטעות: לבדוק רק את m₁·m₂ של הזוג הראשון ולהכריז שאין זווית ישרה. צריך לבדוק את כל 3 הזוגות." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מוצאים נקודות חיתוך של ישרים? איך מוכיחים ניצבות באמצעות שיפועים? כיצד מחשבים שטח משולש עם קודקודים ידועים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת קודקודים", coaching: "", prompt: "נתונים שלושה ישרים: L₁: y=x+4, L₂: y=-2x+10, L₃: y=0. תנחה אותי למצוא את שלוש נקודות החיתוך. כמה מערכות משוואות צריך לפתור? מאיזה זוג כדאי להתחיל?", keywords: [], keywordHint: "", contextWords: ["חיתוך", "מערכת", "משוואות", "קודקוד", "הצבה", "L1", "L2", "L3"] },
      { phase: "סעיף ב׳", label: "הוכחת זווית ישרה", coaching: "", prompt: "מצאתי את שלושת קודקודי המשולש. עכשיו צריך להוכיח שיש זווית ישרה. תנחה אותי — מה הקשר בין שיפועים של ישרים מאונכים? איך בודקים את זה לכל זוג צלעות?", keywords: [], keywordHint: "", contextWords: ["שיפוע", "מכפלה", "מאונך", "ניצב", "הוכחה", "זווית", "ישרה", "-1"] },
      { phase: "סעיף ג׳", label: "שטח המשולש", coaching: "", prompt: "הוכחתי שהמשולש ניצב. עכשיו צריך לחשב את שטחו. תנחה אותי — איך העובדה שהמשולש ניצב עוזרת לי לחשב שטח בלי למצוא גובה חיצוני?", keywords: [], keywordHint: "", contextWords: ["שטח", "משולש", "בסיס", "גובה", "חצי", "ניצב", "מכפלה", "קודקוד"] },
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

      {/* Formula bar — line equations (KaTeX) */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.25rem 1.5rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(234,88,12,0.12)" }}>
        <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

        {/* Context: variable definitions */}
        <div style={{ borderRadius: 10, background: "rgba(234,88,12,0.05)", border: "1px solid rgba(234,88,12,0.15)", padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ color: "#2D3436", fontSize: 13, lineHeight: 1.8 }}>
            <Tex>{String.raw`m`}</Tex> — שיפוע &nbsp;&nbsp;·&nbsp;&nbsp;
            <Tex>{String.raw`b`}</Tex> — חיתוך ציר y &nbsp;&nbsp;·&nbsp;&nbsp;
            <Tex>{String.raw`d`}</Tex> — מרחק
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          {/* Line equation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📏 משוואת ישר</div>
            <div style={{ color: "#EA580C" }}><TexBlock>{String.raw`y = mx + b`}</TexBlock></div>
          </div>
          <div style={{ width: "80%", height: 1, background: "rgba(60,54,42,0.08)" }} />
          {/* Slope formula */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📐 שיפוע בין שתי נקודות</div>
            <div style={{ color: "#EA580C" }}><TexBlock>{String.raw`m = \frac{y_2 - y_1}{x_2 - x_1}`}</TexBlock></div>
          </div>
          <div style={{ width: "80%", height: 1, background: "rgba(60,54,42,0.08)" }} />
          {/* Distance from point to line */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", width: "100%" }}>
            <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>📍 מרחק נקודה מישר <Tex>{String.raw`ax+by+c=0`}</Tex></div>
            <div style={{ color: "#EA580C" }}><TexBlock>{String.raw`d = \frac{|ax_0 + by_0 + c|}{\sqrt{a^2 + b^2}}`}</TexBlock></div>
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

// ─── Lab 1: IntersectionLab (Basic) ───────────────────────────────────────────

function IntersectionLab() {
  const [m1, setM1] = useState(2);
  const [m2, setM2] = useState(-1);
  const [b1, setB1] = useState(1);
  const [b2, setB2] = useState(7);

  const isParallel = Math.abs(m1 - m2) < 0.001;
  const ix = isParallel ? NaN : (b2 - b1) / (m1 - m2);
  const iy = isParallel ? NaN : m1 * ix + b1;
  const distOrigin = isParallel ? NaN : Math.sqrt(ix * ix + iy * iy);

  // X-intercepts of each line with y=0
  const x1_xint = m1 === 0 ? NaN : -b1 / m1;
  const x2_xint = m2 === 0 ? NaN : -b2 / m2;
  const triBase = isParallel || isNaN(x1_xint) || isNaN(x2_xint) ? NaN : Math.abs(x1_xint - x2_xint);
  const triHeight = isParallel ? NaN : Math.abs(iy);
  const triArea = isNaN(triBase) || isNaN(triHeight) ? NaN : (triBase * triHeight) / 2;

  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  // Line clipping helper
  function linePoints(m: number, b: number) {
    const pts: { x: number; y: number }[] = [];
    for (let x = -2; x <= 14; x += 0.5) {
      const y = m * x + b;
      if (y >= -2 && y <= 10) pts.push({ x, y });
    }
    return pts;
  }
  const l1pts = linePoints(m1, b1);
  const l2pts = linePoints(m2, b2);

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת חיתוך ישרים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה שיפועים וחיתוכים כדי לראות את נקודת החיתוך, המרחק מהראשית ושטח המשולש.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#EA580C", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(234,88,12,0.3)", paddingBottom: 6 }}>ישר 1</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>שיפוע m₁</span>
              <span style={{ color: "#EA580C", fontWeight: 700 }}>{m1}</span>
            </div>
            <input type="range" min={-5} max={5} step={0.5} value={m1} onChange={e => setM1(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>חיתוך b₁</span>
              <span style={{ color: "#EA580C", fontWeight: 700 }}>{b1}</span>
            </div>
            <input type="range" min={-5} max={10} step={0.5} value={b1} onChange={e => setB1(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(59,130,246,0.3)", paddingBottom: 6 }}>ישר 2</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>שיפוע m₂</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{m2}</span>
            </div>
            <input type="range" min={-5} max={5} step={0.5} value={m2} onChange={e => setM2(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>חיתוך b₂</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{b2}</span>
            </div>
            <input type="range" min={-5} max={10} step={0.5} value={b2} onChange={e => setB2(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
        </div>
      </div>

      {/* Parallel warning */}
      {isParallel && (
        <div style={{ borderRadius: 12, background: "rgba(234,88,12,0.1)", border: "2px solid #EA580C", padding: "12px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#EA580C", fontWeight: 700, fontSize: 14 }}>
          ⚠️ הישרים מקבילים — אין נקודת חיתוך!
        </div>
      )}

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(234,88,12,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-1)} y1={toY(0)} x2={toX(13)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points={`${toX(13)},${toY(0)} ${toX(13) - 5},${toY(0) - 3} ${toX(13) - 5},${toY(0) + 3}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
          <text x={toX(13) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Triangle fill (if not parallel and x-intercepts exist) */}
          {!isParallel && !isNaN(x1_xint) && !isNaN(x2_xint) && (
            <polygon
              points={`${toX(ix)},${toY(iy)} ${toX(x1_xint)},${toY(0)} ${toX(x2_xint)},${toY(0)}`}
              fill="rgba(234,88,12,0.06)" stroke="none"
            />
          )}

          {/* Line 1 */}
          {l1pts.length >= 2 && (
            <line x1={toX(l1pts[0].x)} y1={toY(l1pts[0].y)} x2={toX(l1pts[l1pts.length - 1].x)} y2={toY(l1pts[l1pts.length - 1].y)} stroke="#EA580C" strokeWidth={2} />
          )}
          {/* Line 2 */}
          {l2pts.length >= 2 && (
            <line x1={toX(l2pts[0].x)} y1={toY(l2pts[0].y)} x2={toX(l2pts[l2pts.length - 1].x)} y2={toY(l2pts[l2pts.length - 1].y)} stroke="#3b82f6" strokeWidth={2} />
          )}

          {/* Intersection point */}
          {!isParallel && isFinite(ix) && isFinite(iy) && ix >= -2 && ix <= 14 && iy >= -2 && iy <= 10 && (
            <>
              <circle cx={toX(ix)} cy={toY(iy)} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
              <text x={toX(ix) + 10} y={toY(iy) - 8} fontSize={11} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">({ix.toFixed(1)},{iy.toFixed(1)})</text>
            </>
          )}
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "נקודת חיתוך", val: isParallel ? "—" : `(${ix.toFixed(2)}, ${iy.toFixed(2)})`, color: "#f59e0b" },
          { label: "מרחק מהראשית", val: isParallel ? "—" : distOrigin.toFixed(2), color: "#EA580C" },
          { label: "שטח משולש", val: isNaN(triArea) ? "—" : triArea.toFixed(2), color: "#3b82f6" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 12 }}>
        {isParallel ? "שימו לב: כשהשיפועים שווים, הישרים לא נפגשים — אין נקודת חיתוך!" : "שנו את השיפועים ובדקו: מתי הישרים מאונכים? מתי מקבילים?"}
      </p>
    </section>
  );
}

// ─── Lab 2: ParallelDistanceLab (Medium) ──────────────────────────────────────

function ParallelDistanceLab() {
  const [m, setM] = useState(3);
  const [b1, setB1] = useState(-2);
  const [b2, setB2] = useState(4);

  const dist = Math.abs(b1 - b2) / Math.sqrt(m * m + 1);

  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  // Find a point on line 1 and project perpendicular to line 2 for visual
  const midB = (b1 + b2) / 2;
  // Point on line 1 where we draw perpendicular: pick x so that the midpoint is visible
  const px = 2;
  const py1 = m * px + b1;
  // Foot of perpendicular from (px, py1) to line y=mx+b2 → ax+by+c=0 → mx - y + b2 = 0
  const a = m, b = -1, c = b2;
  const denom = a * a + b * b;
  const footX = (b * (b * px - a * py1) - a * c) / denom;
  const footY = (a * (-b * px + a * py1) - b * c) / denom;

  function linePoints(slope: number, intercept: number) {
    const pts: { x: number; y: number }[] = [];
    for (let x = -3; x <= 12; x += 0.5) {
      const y = slope * x + intercept;
      if (y >= -3 && y <= 10) pts.push({ x, y });
    }
    return pts;
  }
  const l1pts = linePoints(m, b1);
  const l2pts = linePoints(m, b2);

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ישרים מקבילים</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את השיפוע המשותף ואת החיתוכים כדי לראות את המרחק בין הישרים.</p>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>שיפוע משותף m</span>
            <span style={{ color: "#EA580C", fontWeight: 700 }}>{m}</span>
          </div>
          <input type="range" min={-5} max={5} step={0.5} value={m} onChange={e => setM(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>b₁ (ישר 1)</span>
              <span style={{ color: "#EA580C", fontWeight: 700 }}>{b1}</span>
            </div>
            <input type="range" min={-10} max={10} step={0.5} value={b1} onChange={e => setB1(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>b₂ (ישר 2)</span>
              <span style={{ color: "#16A34A", fontWeight: 700 }}>{b2}</span>
            </div>
            <input type="range" min={-10} max={10} step={0.5} value={b2} onChange={e => setB2(+e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
          </div>
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(234,88,12,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-2)} y1={toY(0)} x2={toX(13)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={toX(0)} y1={toY(-2)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points={`${toX(13)},${toY(0)} ${toX(13) - 5},${toY(0) - 3} ${toX(13) - 5},${toY(0) + 3}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
          <text x={toX(13) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Line 1 */}
          {l1pts.length >= 2 && (
            <line x1={toX(l1pts[0].x)} y1={toY(l1pts[0].y)} x2={toX(l1pts[l1pts.length - 1].x)} y2={toY(l1pts[l1pts.length - 1].y)} stroke="#EA580C" strokeWidth={2} />
          )}
          {/* Line 2 */}
          {l2pts.length >= 2 && (
            <line x1={toX(l2pts[0].x)} y1={toY(l2pts[0].y)} x2={toX(l2pts[l2pts.length - 1].x)} y2={toY(l2pts[l2pts.length - 1].y)} stroke="#16A34A" strokeWidth={2} />
          )}

          {/* Perpendicular distance line (dashed) */}
          {py1 >= -2 && py1 <= 10 && footY >= -2 && footY <= 10 && (
            <>
              <line x1={toX(px)} y1={toY(py1)} x2={toX(footX)} y2={toY(footY)} stroke="#a78bfa" strokeWidth={2} strokeDasharray="5,3" />
              <circle cx={toX(px)} cy={toY(py1)} r={4} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
              <circle cx={toX(footX)} cy={toY(footY)} r={4} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
            </>
          )}
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "ישר 1", val: `y = ${m}x ${b1 >= 0 ? "+" : ""}${b1}`, color: "#EA580C" },
          { label: "ישר 2", val: `y = ${m}x ${b2 >= 0 ? "+" : ""}${b2}`, color: "#16A34A" },
          { label: "מרחק", val: dist.toFixed(3), color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 12 }}>
        שנו את ה-b של אחד הישרים — שימו לב שהמרחק הניצב משתנה, גם אם ההפרש |b₁-b₂| נשאר קבוע!
      </p>
    </section>
  );
}

// ─── Lab 3: TriangleLab (Advanced) ────────────────────────────────────────────

function TriangleLab() {
  const [m1, setM1] = useState(1);
  const [b1, setB1] = useState(4);
  const [m2, setM2] = useState(-2);
  const [b2, setB2] = useState(10);
  // L3 is always y=0 (x-axis)

  // Vertices
  // L1 ∩ L2: m1*x + b1 = m2*x + b2 → x = (b2-b1)/(m1-m2)
  const l12parallel = Math.abs(m1 - m2) < 0.001;
  const v12x = l12parallel ? NaN : (b2 - b1) / (m1 - m2);
  const v12y = l12parallel ? NaN : m1 * v12x + b1;

  // L1 ∩ L3 (y=0): m1*x + b1 = 0 → x = -b1/m1
  const v13x = m1 === 0 ? NaN : -b1 / m1;
  const v13y = 0;

  // L2 ∩ L3 (y=0): m2*x + b2 = 0 → x = -b2/m2
  const v23x = m2 === 0 ? NaN : -b2 / m2;
  const v23y = 0;

  const allValid = !isNaN(v12x) && !isNaN(v13x) && !isNaN(v23x) && isFinite(v12x) && isFinite(v13x) && isFinite(v23x);

  // Side slopes
  // L1 slope = m1, L2 slope = m2, L3 slope = 0
  // Check perpendicularity between all pairs
  const perp12 = Math.abs(m1 * m2 + 1) < 0.02;
  const perp13 = Math.abs(m1 * 0 + 1) < 0.02; // m1*0=0, never -1
  const perp23 = Math.abs(m2 * 0 + 1) < 0.02;
  const anyPerp = perp12 || perp13 || perp23;

  // Triangle area (shoelace)
  const area = allValid
    ? Math.abs(v12x * (v13y - v23y) + v13x * (v23y - v12y) + v23x * (v12y - v13y)) / 2
    : NaN;

  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  function linePoints(slope: number, intercept: number) {
    const pts: { x: number; y: number }[] = [];
    for (let x = -6; x <= 14; x += 0.5) {
      const y = slope * x + intercept;
      if (y >= -2 && y <= 10) pts.push({ x, y });
    }
    return pts;
  }
  const l1pts = linePoints(m1, b1);
  const l2pts = linePoints(m2, b2);

  // Right-angle mark at vertex where perpendicularity occurs
  let raMarkJsx: React.ReactNode = null;
  if (allValid && perp12) {
    // Perpendicular at L1∩L2 vertex
    const cx = toX(v12x), cy = toY(v12y);
    const sz = 10;
    // Directions toward v13 and v23
    const d1x = toX(v13x) - cx, d1y = toY(v13y) - cy;
    const d1l = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
    const d2x = toX(v23x) - cx, d2y = toY(v23y) - cy;
    const d2l = Math.sqrt(d2x * d2x + d2y * d2y) || 1;
    const r1 = { x: cx + sz * d1x / d1l, y: cy + sz * d1y / d1l };
    const r2 = { x: cx + sz * (d1x / d1l + d2x / d2l), y: cy + sz * (d1y / d1l + d2y / d2l) };
    const r3 = { x: cx + sz * d2x / d2l, y: cy + sz * d2y / d2l };
    raMarkJsx = <polyline points={`${r1.x},${r1.y} ${r2.x},${r2.y} ${r3.x},${r3.y}`} fill="none" stroke="#16A34A" strokeWidth={2} />;
  }

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המשולש האנליטי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה שיפועים וחיתוכים של L₁ ו-L₂. ציר ה-x הוא תמיד L₃.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#EA580C", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(234,88,12,0.3)", paddingBottom: 6 }}>L₁: y = m₁x + b₁</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>m₁</span>
              <span style={{ color: "#EA580C", fontWeight: 700 }}>{m1}</span>
            </div>
            <input type="range" min={-5} max={5} step={0.5} value={m1} onChange={e => setM1(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>b₁</span>
              <span style={{ color: "#EA580C", fontWeight: 700 }}>{b1}</span>
            </div>
            <input type="range" min={-10} max={10} step={0.5} value={b1} onChange={e => setB1(+e.target.value)} style={{ width: "100%", accentColor: "#EA580C" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(59,130,246,0.3)", paddingBottom: 6 }}>L₂: y = m₂x + b₂</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>m₂</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{m2}</span>
            </div>
            <input type="range" min={-5} max={5} step={0.5} value={m2} onChange={e => setM2(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>b₂</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{b2}</span>
            </div>
            <input type="range" min={-10} max={10} step={0.5} value={b2} onChange={e => setB2(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
        </div>
      </div>

      {/* Perpendicularity alert */}
      {anyPerp && allValid && (
        <div style={{ borderRadius: 12, background: "rgba(22,163,74,0.1)", border: "2px solid #16A34A", padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: "#16A34A", fontWeight: 700, fontSize: 14 }}>
          ✅ זוהתה ניצבות! {perp12 ? "L₁ ⊥ L₂" : perp13 ? "L₁ ⊥ L₃" : "L₂ ⊥ L₃"} — m₁·m₂ = -1
        </div>
      )}

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(234,88,12,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-5)} y1={toY(0)} x2={toX(13)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points={`${toX(13)},${toY(0)} ${toX(13) - 5},${toY(0) - 3} ${toX(13) - 5},${toY(0) + 3}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
          <text x={toX(13) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Triangle fill */}
          {allValid && (
            <polygon
              points={`${toX(v12x)},${toY(v12y)} ${toX(v13x)},${toY(v13y)} ${toX(v23x)},${toY(v23y)}`}
              fill="rgba(234,88,12,0.06)" stroke="#EA580C" strokeWidth={1.5} strokeLinejoin="round"
            />
          )}

          {/* L1 */}
          {l1pts.length >= 2 && (
            <line x1={toX(l1pts[0].x)} y1={toY(l1pts[0].y)} x2={toX(l1pts[l1pts.length - 1].x)} y2={toY(l1pts[l1pts.length - 1].y)} stroke="#EA580C" strokeWidth={2} />
          )}
          {/* L2 */}
          {l2pts.length >= 2 && (
            <line x1={toX(l2pts[0].x)} y1={toY(l2pts[0].y)} x2={toX(l2pts[l2pts.length - 1].x)} y2={toY(l2pts[l2pts.length - 1].y)} stroke="#3b82f6" strokeWidth={2} />
          )}

          {/* Right-angle mark */}
          {raMarkJsx}

          {/* Vertices */}
          {allValid && (
            <>
              <circle cx={toX(v12x)} cy={toY(v12y)} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
              <text x={toX(v12x) + 8} y={toY(v12y) - 8} fontSize={10} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">({v12x.toFixed(1)},{v12y.toFixed(1)})</text>

              <circle cx={toX(v13x)} cy={toY(v13y)} r={5} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
              <text x={toX(v13x) - 4} y={toY(v13y) + 16} fontSize={10} fill="#16A34A" fontWeight={700} fontFamily="sans-serif">({v13x.toFixed(1)},0)</text>

              <circle cx={toX(v23x)} cy={toY(v23y)} r={5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
              <text x={toX(v23x) + 4} y={toY(v23y) + 16} fontSize={10} fill="#DC2626" fontWeight={700} fontFamily="sans-serif">({v23x.toFixed(1)},0)</text>
            </>
          )}
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "m₁", val: `${m1}`, color: "#EA580C" },
          { label: "m₂", val: `${m2}`, color: "#3b82f6" },
          { label: "m₁·m₂", val: (m1 * m2).toFixed(1), color: perp12 ? "#16A34A" : "#6B7280" },
          { label: "שטח", val: isNaN(area) ? "—" : area.toFixed(2), color: "#f59e0b" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(234,88,12,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 12 }}>
        {perp12 ? "m₁·m₂ = -1 — יש זווית ישרה! המשולש ניצב." : "שנו את השיפועים עד שתקבלו m₁·m₂ = -1 — אז תהיה זווית ישרה."}
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LinePage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>📐 הקו הישר</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>חיתוך ישרים, מקבילים, ניצבות ושטחי משולשים — ואיך לשאול AI את השאלות הנכונות</p>
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
        <SubtopicProgress subtopicId="/grade10/analytic/line" />

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
        {selectedLevel === "basic" && <IntersectionLab />}
        {selectedLevel === "medium" && <ParallelDistanceLab />}
        {selectedLevel === "advanced" && <TriangleLab />}

        {/* Mark as complete */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="/grade10/analytic/line" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
