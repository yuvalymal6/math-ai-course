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
  // Rectangle A(0,0), B(6,0), C(6,4), D(0,4) with diagonals
  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={toX(-1)} y1={toY(0)} x2={toX(9)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(7)} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon points={`${toX(9)},${toY(0)} ${toX(9) - 5},${toY(0) - 3} ${toX(9) - 5},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${toY(7)} ${toX(0) - 3},${toY(7) + 5} ${toX(0) + 3},${toY(7) + 5}`} fill="#94a3b8" />
      <text x={toX(9) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={toY(7) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Rectangle fill */}
      <polygon points={`${toX(0)},${toY(0)} ${toX(6)},${toY(0)} ${toX(6)},${toY(4)} ${toX(0)},${toY(4)}`} fill="rgba(22,163,74,0.06)" stroke="#16A34A" strokeWidth={2} strokeLinejoin="round" />

      {/* Diagonals */}
      <line x1={toX(0)} y1={toY(0)} x2={toX(6)} y2={toY(4)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={toX(6)} y1={toY(0)} x2={toX(0)} y2={toY(4)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />

      {/* Center point */}
      <circle cx={toX(3)} cy={toY(2)} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(3) + 6} y={toY(2) - 6} fontSize={10} fill="#f59e0b" fontWeight={600} fontFamily="sans-serif">?</text>

      {/* Vertices */}
      <circle cx={toX(0)} cy={toY(0)} r={4} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(0) - 4} y={toY(0) + 16} fontSize={11} fill="#16A34A" fontWeight={600} fontFamily="sans-serif">A</text>

      <circle cx={toX(6)} cy={toY(0)} r={4} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(6) + 6} y={toY(0) + 16} fontSize={11} fill="#16A34A" fontWeight={600} fontFamily="sans-serif">B</text>

      <circle cx={toX(6)} cy={toY(4)} r={4} fill="#16A34A" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(6) + 6} y={toY(4) - 6} fontSize={11} fill="#16A34A" fontWeight={600} fontFamily="sans-serif">C</text>

      <circle cx={toX(0)} cy={toY(4)} r={4} fill="#64748b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(0) - 14} y={toY(4) - 6} fontSize={11} fill="#64748b" fontWeight={600} fontFamily="sans-serif">D?</text>
    </svg>
  );
}

function MediumDiagram() {
  // Parallelogram A(1,1), B(5,3), C(7,7), D(3,5)
  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={toX(-1)} y1={toY(0)} x2={toX(10)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(9)} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon points={`${toX(10)},${toY(0)} ${toX(10) - 5},${toY(0) - 3} ${toX(10) - 5},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${toY(9)} ${toX(0) - 3},${toY(9) + 5} ${toX(0) + 3},${toY(9) + 5}`} fill="#94a3b8" />
      <text x={toX(10) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={toY(9) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Parallelogram fill */}
      <polygon points={`${toX(1)},${toY(1)} ${toX(5)},${toY(3)} ${toX(7)},${toY(7)} ${toX(3)},${toY(5)}`} fill="rgba(234,88,12,0.06)" stroke="#EA580C" strokeWidth={2} strokeLinejoin="round" />

      {/* Diagonals */}
      <line x1={toX(1)} y1={toY(1)} x2={toX(7)} y2={toY(7)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={toX(5)} y1={toY(3)} x2={toX(3)} y2={toY(5)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />

      {/* Vertices */}
      <circle cx={toX(1)} cy={toY(1)} r={4} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(1) - 4} y={toY(1) + 16} fontSize={11} fill="#EA580C" fontWeight={600} fontFamily="sans-serif">A</text>

      <circle cx={toX(5)} cy={toY(3)} r={4} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(5) + 6} y={toY(3) + 14} fontSize={11} fill="#EA580C" fontWeight={600} fontFamily="sans-serif">B</text>

      <circle cx={toX(7)} cy={toY(7)} r={4} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(7) + 6} y={toY(7) - 6} fontSize={11} fill="#EA580C" fontWeight={600} fontFamily="sans-serif">C</text>

      <circle cx={toX(3)} cy={toY(5)} r={4} fill="#64748b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(3) - 16} y={toY(5) - 6} fontSize={11} fill="#64748b" fontWeight={600} fontFamily="sans-serif">D?</text>
    </svg>
  );
}

function AdvancedDiagram() {
  // Square with A(1,2), B(5,4), one possible C and D shown
  // Rotation +90: C(3,8), D(-1,6)
  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Axes */}
      <line x1={toX(-3)} y1={toY(0)} x2={toX(9)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
      <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
      <polygon points={`${toX(9)},${toY(0)} ${toX(9) - 5},${toY(0) - 3} ${toX(9) - 5},${toY(0) + 3}`} fill="#94a3b8" />
      <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
      <text x={toX(9) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
      <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

      {/* Square (option 1) fill */}
      <polygon points={`${toX(1)},${toY(2)} ${toX(5)},${toY(4)} ${toX(3)},${toY(8)} ${toX(-1)},${toY(6)}`} fill="rgba(220,38,38,0.06)" stroke="#DC2626" strokeWidth={2} strokeLinejoin="round" strokeDasharray="6,3" />

      {/* Right-angle mark at B */}
      <polyline points={`${toX(5) - 8},${toY(4) - 6} ${toX(5) - 14},${toY(4) - 2} ${toX(5) - 6},${toY(4) + 4}`} fill="none" stroke="#34d399" strokeWidth={2} />

      {/* Side AB (solid) */}
      <line x1={toX(1)} y1={toY(2)} x2={toX(5)} y2={toY(4)} stroke="#DC2626" strokeWidth={2.5} />

      {/* Vertices */}
      <circle cx={toX(1)} cy={toY(2)} r={4} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(1) - 4} y={toY(2) + 16} fontSize={11} fill="#DC2626" fontWeight={600} fontFamily="sans-serif">A</text>

      <circle cx={toX(5)} cy={toY(4)} r={4} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(5) + 6} y={toY(4) + 14} fontSize={11} fill="#DC2626" fontWeight={600} fontFamily="sans-serif">B</text>

      <circle cx={toX(3)} cy={toY(8)} r={4} fill="#64748b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(3) + 6} y={toY(8) - 6} fontSize={11} fill="#64748b" fontWeight={600} fontFamily="sans-serif">C?</text>

      <circle cx={toX(-1)} cy={toY(6)} r={4} fill="#64748b" stroke="#fff" strokeWidth={1.5} />
      <text x={toX(-1) - 16} y={toY(6) - 6} fontSize={11} fill="#64748b" fontWeight={600} fontFamily="sans-serif">D?</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "המלבן החבוי",
    problem: "במערכת צירים נתונות שלוש נקודות:\nA(0,0), B(6,0), C(6,4)\n\nא. מצא את הנקודה D כך ש-ABCD יהיה מלבן.\nב. חשב את אורכי שני האלכסונים של המלבן והראה שהם שווים.\nג. מצא את מרכז המלבן (נקודת חיתוך האלכסונים).",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "⚠️ תכונות המלבן", text: "במלבן הצלעות הנגדיות שוות ומקבילות. D חייבת להיות באותו x כמו A ובאותו y כמו C." },
      { title: "🔦 אלכסוני מלבן", text: "במלבן האלכסונים שווים באורכם וחוצים זה את זה. מרכז המלבן = אמצע כל אלכסון." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד/ה כיתה י' ומצרף/ת שאלה בגאומטריה אנליטית על מלבן במערכת צירים.\nאני רוצה שתהיה המורה הפרטי שלי — תעזור לי להבין ולא לתת תשובות ישירות.\n\nאל תפתור עבורי — שאל אותי שאלות מכווינות.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת D", coaching: "", prompt: "תעזור לי למצוא את הנקודה D כך ש-ABCD יהיה מלבן. מה צריך להתקיים כדי שצורה תהיה מלבן?", keywords: [], keywordHint: "", contextWords: ["מלבן", "קודקוד", "צלע", "מקביל", "שווה", "נקודה", "D", "קואורדינטות"] },
      { phase: "סעיף ב׳", label: "אלכסונים שווים", coaching: "", prompt: "מצאתי את D. כיצד אוכיח שהאלכסונים AC ו-BD שווים באורכם?", keywords: [], keywordHint: "", contextWords: ["אלכסון", "מרחק", "שורש", "נוסחה", "אורך", "שווה", "הוכחה", "AC", "BD"] },
      { phase: "סעיף ג׳", label: "מרכז המלבן", coaching: "", prompt: "כיצד אמצא את מרכז המלבן? מה הקשר בין מרכז המלבן לאלכסונים?", keywords: [], keywordHint: "", contextWords: ["מרכז", "אמצע", "אלכסון", "חיתוך", "נקודה", "חצי", "ממוצע", "קואורדינטות"] },
    ],
  },
  {
    id: "medium",
    title: "המקבילית המסתורית",
    problem: "במערכת צירים נתונות שלוש נקודות:\nA(1,1), B(5,3), C(7,7)\nABCD הוא מקבילית.\n\nא. מצא את הנקודה D.\nב. בדוק: האם ABCD הוא מעוין (4 צלעות שוות)?\nג. בדוק: האם ABCD הוא מלבן (אלכסונים שווים)?",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "⚠️ טריק האמצע למציאת D", text: "במקבילית האלכסונים חוצים זה את זה. אמצע AC = אמצע BD. מכאן אפשר למצוא את D." },
      { title: "🔦 סיווג מרובע", text: "מעוין = 4 צלעות שוות. מלבן = אלכסונים שווים. ריבוע = גם וגם. חשבו כל אורך בנפרד!" },
    ],
    goldenPrompt: `אני בכיתה י', מצרף לך תרגיל בגאומטריה אנליטית על מקבילית וסיווג מרובעים.\n\nאל תיתן לי את הפתרון — שאל אותי שאלות מנחות על תכונות מקביליות, מעוינים ומלבנים.\nסרוק את הנתונים בלבד.\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה של הנתונים שהדבקתי, תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת D במקבילית", coaching: "", prompt: "ABCD מקבילית עם A(1,1), B(5,3), C(7,7). תעזור לי למצוא את D באמצעות תכונות המקבילית.", keywords: [], keywordHint: "", contextWords: ["מקבילית", "אמצע", "אלכסון", "חוצה", "D", "וקטור", "נגדי", "שווה"] },
      { phase: "סעיף ב׳", label: "בדיקת מעוין", coaching: "", prompt: "מצאתי את D. כיצד אבדוק אם המקבילית היא מעוין? מה צריך לחשב?", keywords: [], keywordHint: "", contextWords: ["מעוין", "צלע", "אורך", "שווה", "ארבע", "מרחק", "נוסחה", "AB", "BC"] },
      { phase: "סעיף ג׳", label: "בדיקת מלבן", coaching: "", prompt: "כיצד אבדוק אם המקבילית היא מלבן? מה הקשר לאלכסונים?", keywords: [], keywordHint: "", contextWords: ["מלבן", "אלכסון", "שווה", "אורך", "AC", "BD", "מרחק", "נוסחה"] },
    ],
  },
  {
    id: "advanced",
    title: "הריבוע המושלם",
    problem: "במערכת צירים נתונות שתי נקודות:\nA(1,2), B(5,4)\nAB הוא צלע של ריבוע ABCD.\n\nא. מצא את C ו-D (שתי אפשרויות באמצעות סיבוב 90°).\nב. הוכח שהצורה אכן ריבוע.\nג. חשב את שטח הריבוע.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "⚠️ וקטור סיבוב 90°", text: "אם הוקטור מ-A ל-B הוא (dx,dy), סיבוב 90° נגד כיוון השעון נותן (-dy,dx) ועם כיוון השעון (dy,-dx)." },
      { title: "💡 שטח ריבוע", text: "שטח = צלע². אורך הצלע = מרחק AB. אפשר גם: שטח = אלכסון²/2." },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: כיצד מבצעים סיבוב 90° של וקטור? איך מוכיחים שמרובע הוא ריבוע? כיצד מחשבים שטח ריבוע? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "מציאת C ו-D בסיבוב", coaching: "", prompt: "הוקטור AB=(4,2). תעזור לי למצוא את C ו-D על ידי סיבוב 90° של הוקטור.", keywords: [], keywordHint: "", contextWords: ["סיבוב", "וקטור", "90", "מעלות", "ניצב", "dx", "dy", "אפשרויות"] },
      { phase: "סעיף ב׳", label: "הוכחת ריבוע", coaching: "", prompt: "מצאתי 4 קודקודים. כיצד אוכיח שזה אכן ריבוע? מה צריך לבדוק?", keywords: [], keywordHint: "", contextWords: ["ריבוע", "צלע", "שווה", "ניצב", "אלכסון", "שיפוע", "מכפלה", "הוכחה"] },
      { phase: "סעיף ג׳", label: "שטח הריבוע", coaching: "", prompt: "כיצד אחשב את שטח הריבוע אם ידוע אורך הצלע?", keywords: [], keywordHint: "", contextWords: ["שטח", "ריבוע", "צלע", "ריבוע", "מרחק", "AB", "חישוב", "נוסחה"] },
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
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(4);

  const diagonal = Math.sqrt(width * width + height * height);
  const centerX = width / 2;
  const centerY = height / 2;
  const area = width * height;
  const perimeter = 2 * (width + height);

  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <section style={{ border: "1px solid rgba(225,29,72,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המלבן</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה רוחב וגובה כדי לראות אלכסונים, מרכז, שטח והיקף.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>רוחב</span>
            <span style={{ color: "#e11d48", fontWeight: 700 }}>{width}</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={width} onChange={e => setWidth(+e.target.value)} style={{ width: "100%", accentColor: "#e11d48" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>גובה</span>
            <span style={{ color: "#e11d48", fontWeight: 700 }}>{height}</span>
          </div>
          <input type="range" min={1} max={8} step={1} value={height} onChange={e => setHeight(+e.target.value)} style={{ width: "100%", accentColor: "#e11d48" }} />
        </div>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(225,29,72,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(225,29,72,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-1)} y1={toY(0)} x2={toX(12)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(9)} stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points={`${toX(12)},${toY(0)} ${toX(12) - 5},${toY(0) - 3} ${toX(12) - 5},${toY(0) + 3}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(9)} ${toX(0) - 3},${toY(9) + 5} ${toX(0) + 3},${toY(9) + 5}`} fill="#94a3b8" />
          <text x={toX(12) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 6} y={toY(9) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Rectangle */}
          <polygon points={`${toX(0)},${toY(0)} ${toX(width)},${toY(0)} ${toX(width)},${toY(height)} ${toX(0)},${toY(height)}`} fill="rgba(225,29,72,0.06)" stroke="#e11d48" strokeWidth={2} strokeLinejoin="round" />

          {/* Diagonals */}
          <line x1={toX(0)} y1={toY(0)} x2={toX(width)} y2={toY(height)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
          <line x1={toX(width)} y1={toY(0)} x2={toX(0)} y2={toY(height)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />

          {/* Center */}
          <circle cx={toX(centerX)} cy={toY(centerY)} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />

          {/* Vertex labels */}
          <text x={toX(0) - 8} y={toY(0) + 14} fontSize={10} fill="#e11d48" fontWeight={700} fontFamily="sans-serif">A</text>
          <text x={toX(width) + 4} y={toY(0) + 14} fontSize={10} fill="#e11d48" fontWeight={700} fontFamily="sans-serif">B</text>
          <text x={toX(width) + 4} y={toY(height) - 6} fontSize={10} fill="#e11d48" fontWeight={700} fontFamily="sans-serif">C</text>
          <text x={toX(0) - 8} y={toY(height) - 6} fontSize={10} fill="#e11d48" fontWeight={700} fontFamily="sans-serif">D</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "אלכסון", val: diagonal.toFixed(2), color: "#f59e0b" },
          { label: "מרכז", val: `(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`, color: "#e11d48" },
          { label: "שטח", val: area.toFixed(1), color: "#16A34A" },
          { label: "היקף", val: perimeter.toFixed(1), color: "#3b82f6" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(225,29,72,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 2: ParallelogramLab (Medium) ─────────────────────────────────────────

function ParallelogramLab() {
  const [abDx, setAbDx] = useState(4);
  const [abDy, setAbDy] = useState(2);
  const [adDx, setAdDx] = useState(2);
  const [adDy, setAdDy] = useState(4);

  // A fixed at (1,1)
  const ax = 1, ay = 1;
  const bx = ax + abDx, by = ay + abDy;
  const dx = ax + adDx, dy = ay + adDy;
  const cx = bx + adDx, cy = by + adDy;

  // Side lengths
  const sideAB = Math.sqrt(abDx * abDx + abDy * abDy);
  const sideBC = Math.sqrt(adDx * adDx + adDy * adDy);
  const sideCD = sideAB; // opposite
  const sideDA = sideBC; // opposite

  // Diagonals
  const diagAC = Math.sqrt((cx - ax) ** 2 + (cy - ay) ** 2);
  const diagBD = Math.sqrt((dx - bx) ** 2 + (dy - by) ** 2);

  // Classification
  const isRhombus = Math.abs(sideAB - sideBC) < 0.01;
  const isRectangle = Math.abs(diagAC - diagBD) < 0.01;
  const isSquare = isRhombus && isRectangle;
  const classify = isSquare ? "ריבוע!" : isRhombus ? "מעוין" : isRectangle ? "מלבן" : "מקבילית";

  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  return (
    <section style={{ border: "1px solid rgba(225,29,72,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המקבילית</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את וקטורי AB ו-AD כדי לראות את המקבילית, האלכסונים והסיווג.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#e11d48", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(225,29,72,0.3)", paddingBottom: 6 }}>וקטור AB</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>dx</span>
              <span style={{ color: "#e11d48", fontWeight: 700 }}>{abDx}</span>
            </div>
            <input type="range" min={1} max={8} step={1} value={abDx} onChange={e => setAbDx(+e.target.value)} style={{ width: "100%", accentColor: "#e11d48" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>dy</span>
              <span style={{ color: "#e11d48", fontWeight: 700 }}>{abDy}</span>
            </div>
            <input type="range" min={-4} max={4} step={1} value={abDy} onChange={e => setAbDy(+e.target.value)} style={{ width: "100%", accentColor: "#e11d48" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(59,130,246,0.3)", paddingBottom: 6 }}>וקטור AD</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>dx</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{adDx}</span>
            </div>
            <input type="range" min={-4} max={8} step={1} value={adDx} onChange={e => setAdDx(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>dy</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{adDy}</span>
            </div>
            <input type="range" min={0} max={8} step={1} value={adDy} onChange={e => setAdDy(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
        </div>
      </div>

      {/* Classification badge */}
      <div style={{ borderRadius: 12, background: isSquare ? "rgba(22,163,74,0.1)" : isRhombus || isRectangle ? "rgba(245,158,11,0.1)" : "rgba(225,29,72,0.08)", border: `2px solid ${isSquare ? "#16A34A" : isRhombus || isRectangle ? "#f59e0b" : "#e11d48"}`, padding: "10px 16px", marginBottom: "1.5rem", textAlign: "center", color: isSquare ? "#16A34A" : isRhombus || isRectangle ? "#d97706" : "#e11d48", fontWeight: 700, fontSize: 14 }}>
        סיווג: {classify}
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(225,29,72,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(225,29,72,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-2)} y1={toY(0)} x2={toX(13)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={toX(0)} y1={toY(-1)} x2={toX(0)} y2={toY(9)} stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points={`${toX(13)},${toY(0)} ${toX(13) - 5},${toY(0) - 3} ${toX(13) - 5},${toY(0) + 3}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(9)} ${toX(0) - 3},${toY(9) + 5} ${toX(0) + 3},${toY(9) + 5}`} fill="#94a3b8" />
          <text x={toX(13) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 6} y={toY(9) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Parallelogram */}
          <polygon points={`${toX(ax)},${toY(ay)} ${toX(bx)},${toY(by)} ${toX(cx)},${toY(cy)} ${toX(dx)},${toY(dy)}`} fill="rgba(225,29,72,0.06)" stroke="#e11d48" strokeWidth={2} strokeLinejoin="round" />

          {/* Diagonals */}
          <line x1={toX(ax)} y1={toY(ay)} x2={toX(cx)} y2={toY(cy)} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
          <line x1={toX(bx)} y1={toY(by)} x2={toX(dx)} y2={toY(dy)} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5,3" />

          {/* Vertices */}
          <circle cx={toX(ax)} cy={toY(ay)} r={4} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(ax) - 8} y={toY(ay) + 14} fontSize={10} fill="#e11d48" fontWeight={700}>A</text>

          <circle cx={toX(bx)} cy={toY(by)} r={4} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(bx) + 4} y={toY(by) + 14} fontSize={10} fill="#e11d48" fontWeight={700}>B</text>

          <circle cx={toX(cx)} cy={toY(cy)} r={4} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(cx) + 4} y={toY(cy) - 6} fontSize={10} fill="#e11d48" fontWeight={700}>C</text>

          <circle cx={toX(dx)} cy={toY(dy)} r={4} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(dx) - 12} y={toY(dy) - 6} fontSize={10} fill="#e11d48" fontWeight={700}>D</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center", marginBottom: 10 }}>
        {[
          { label: "AB", val: sideAB.toFixed(2), color: "#e11d48" },
          { label: "BC", val: sideBC.toFixed(2), color: "#3b82f6" },
          { label: "CD", val: sideCD.toFixed(2), color: "#e11d48" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(225,29,72,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
        {[
          { label: "DA", val: sideDA.toFixed(2), color: "#3b82f6" },
          { label: "אלכסון AC", val: diagAC.toFixed(2), color: "#f59e0b" },
          { label: "אלכסון BD", val: diagBD.toFixed(2), color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(225,29,72,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 3: SquareBuilderLab (Advanced) ───────────────────────────────────────

function SquareBuilderLab() {
  const [aX, setAX] = useState(1);
  const [aY, setAY] = useState(2);
  const [bX, setBX] = useState(5);
  const [bY, setBY] = useState(4);
  const [rotDir, setRotDir] = useState<"+90" | "-90">("+90");

  const dxAB = bX - aX;
  const dyAB = bY - aY;

  // Rotation: +90 (CCW) => perpendicular = (-dy, dx); -90 (CW) => (dy, -dx)
  const perpX = rotDir === "+90" ? -dyAB : dyAB;
  const perpY = rotDir === "+90" ? dxAB : -dxAB;

  const cX = bX + perpX;
  const cY = bY + perpY;
  const dX = aX + perpX;
  const dY = aY + perpY;

  const side = Math.sqrt(dxAB * dxAB + dyAB * dyAB);
  const diag = side * Math.SQRT2;
  const area = side * side;

  const originX = 50, originY = 250, scale = 25;
  const toX = (v: number) => originX + v * scale;
  const toY = (v: number) => originY - v * scale;

  // Right-angle mark at B
  const sz = 10;
  const lenAB = side || 1;
  // Direction from B toward A (in screen coords)
  const uBAsx = (-dxAB * scale) / (lenAB * scale);
  const uBAsy = (dyAB * scale) / (lenAB * scale);
  // Direction from B toward C (in screen coords)
  const lenPerp = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
  const uBCsx = (perpX * scale) / (lenPerp * scale);
  const uBCsy = (-perpY * scale) / (lenPerp * scale);

  const raBx = toX(bX);
  const raBy = toY(bY);
  const ra1x = raBx + sz * uBAsx;
  const ra1y = raBy + sz * uBAsy;
  const ra2x = raBx + sz * (uBAsx + uBCsx);
  const ra2y = raBy + sz * (uBAsy + uBCsy);
  const ra3x = raBx + sz * uBCsx;
  const ra3y = raBy + sz * uBCsy;

  return (
    <section style={{ border: "1px solid rgba(225,29,72,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת בניית ריבוע</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>בחר נקודות A ו-B, בחר כיוון סיבוב, ובנה ריבוע!</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#e11d48", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(225,29,72,0.3)", paddingBottom: 6 }}>נקודה A</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>Ax</span>
              <span style={{ color: "#e11d48", fontWeight: 700 }}>{aX}</span>
            </div>
            <input type="range" min={-2} max={6} step={1} value={aX} onChange={e => setAX(+e.target.value)} style={{ width: "100%", accentColor: "#e11d48" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>Ay</span>
              <span style={{ color: "#e11d48", fontWeight: 700 }}>{aY}</span>
            </div>
            <input type="range" min={-2} max={6} step={1} value={aY} onChange={e => setAY(+e.target.value)} style={{ width: "100%", accentColor: "#e11d48" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(59,130,246,0.3)", paddingBottom: 6 }}>נקודה B</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>Bx</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{bX}</span>
            </div>
            <input type="range" min={-2} max={8} step={1} value={bX} onChange={e => setBX(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              <span>By</span>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>{bY}</span>
            </div>
            <input type="range" min={-2} max={8} step={1} value={bY} onChange={e => setBY(+e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
          </div>
        </div>
      </div>

      {/* Rotation toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: "2rem" }}>
        <button
          onClick={() => setRotDir("+90")}
          style={{ padding: "8px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `2px solid ${rotDir === "+90" ? "#e11d48" : "rgba(107,114,128,0.3)"}`, background: rotDir === "+90" ? "rgba(225,29,72,0.1)" : "rgba(255,255,255,0.75)", color: rotDir === "+90" ? "#e11d48" : "#6B7280", transition: "all 0.2s" }}
        >
          +90° (נגד השעון)
        </button>
        <button
          onClick={() => setRotDir("-90")}
          style={{ padding: "8px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `2px solid ${rotDir === "-90" ? "#3b82f6" : "rgba(107,114,128,0.3)"}`, background: rotDir === "-90" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.75)", color: rotDir === "-90" ? "#3b82f6" : "#6B7280", transition: "all 0.2s" }}
        >
          -90° (עם השעון)
        </button>
      </div>

      {/* SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(225,29,72,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(225,29,72,0.08)" }}>
        <svg viewBox="0 0 400 300" style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={toX(-3)} y1={toY(0)} x2={toX(12)} y2={toY(0)} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={toX(0)} y1={toY(-2)} x2={toX(0)} y2={toY(10)} stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points={`${toX(12)},${toY(0)} ${toX(12) - 5},${toY(0) - 3} ${toX(12) - 5},${toY(0) + 3}`} fill="#94a3b8" />
          <polygon points={`${toX(0)},${toY(10)} ${toX(0) - 3},${toY(10) + 5} ${toX(0) + 3},${toY(10) + 5}`} fill="#94a3b8" />
          <text x={toX(12) + 6} y={toY(0) + 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">x</text>
          <text x={toX(0) + 6} y={toY(10) - 4} fontSize={11} fill="#94a3b8" fontStyle="italic" fontFamily="serif">y</text>

          {/* Square */}
          <polygon points={`${toX(aX)},${toY(aY)} ${toX(bX)},${toY(bY)} ${toX(cX)},${toY(cY)} ${toX(dX)},${toY(dY)}`} fill="rgba(225,29,72,0.06)" stroke="#e11d48" strokeWidth={2} strokeLinejoin="round" />

          {/* Right-angle mark at B */}
          {side > 0.1 && (
            <polyline points={`${ra1x},${ra1y} ${ra2x},${ra2y} ${ra3x},${ra3y}`} fill="none" stroke="#34d399" strokeWidth={2} />
          )}

          {/* Vertices */}
          <circle cx={toX(aX)} cy={toY(aY)} r={4} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(aX) - 8} y={toY(aY) + 14} fontSize={10} fill="#e11d48" fontWeight={700}>A({aX},{aY})</text>

          <circle cx={toX(bX)} cy={toY(bY)} r={4} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(bX) + 4} y={toY(bY) + 14} fontSize={10} fill="#3b82f6" fontWeight={700}>B({bX},{bY})</text>

          <circle cx={toX(cX)} cy={toY(cY)} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(cX) + 4} y={toY(cY) - 6} fontSize={10} fill="#f59e0b" fontWeight={700}>C({cX},{cY})</text>

          <circle cx={toX(dX)} cy={toY(dY)} r={4} fill="#a78bfa" stroke="#fff" strokeWidth={1.5} />
          <text x={toX(dX) - 12} y={toY(dY) - 6} fontSize={10} fill="#a78bfa" fontWeight={700}>D({dX},{dY})</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "צלע", val: side.toFixed(2), color: "#e11d48" },
          { label: "אלכסון", val: diag.toFixed(2), color: "#f59e0b" },
          { label: "שטח", val: area.toFixed(2), color: "#16A34A" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(225,29,72,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
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
