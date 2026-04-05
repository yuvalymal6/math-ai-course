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
import GradesBarChart from "@/app/components/GradesBarChart";

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
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 12, fontSize: 13, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(60,54,42,0.25)", color: "#1A1A1A", fontWeight: 500, cursor: "pointer", width: "100%" }}
    >
      {c ? <Check size={13} /> : <Copy size={13} />}{c ? "הועתק!" : label}
    </button>
  );
}

function GoldenPromptCard({ prompt, title = "פרומפט ראשי", glowRgb = "16,185,129", borderRgb = "45,90,39" }: { prompt: string; title?: string; glowRgb?: string; borderRgb?: string }) {
  return (
    <div className="golden-prompt-card" style={{ borderRadius: 14, background: "rgba(255,255,255,0.82)", padding: "1.25rem", marginBottom: 14, border: `2px solid rgba(${borderRgb},0.45)`, boxShadow: `0 0 12px rgba(${borderRgb},0.15), 0 2px 8px rgba(${borderRgb},0.08)`, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span>✨</span>
        <span style={{ color: "#1A1A1A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      </div>
      <p style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px 0", whiteSpace: "pre-line", fontWeight: 500, wordBreak: "break-word", overflowWrap: "break-word" }}>{prompt}</p>
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
      <div style={{ background: "rgba(255,255,255,0.4)", padding: "10px", display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
        <div style={{ width: "100%" }}>
          <div style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>הפרומפט המוכן ✍️</div>
          <div style={{ borderRadius: 10, background: "rgba(255,255,255,0.75)", border: `1px solid rgba(${borderRgb},0.35)`, padding: "10px", fontSize: 12, color: "#2D3436", lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "break-word", width: "100%", boxSizing: "border-box" }}>{step.prompt}</div>
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
      <div style={{ background: "rgba(255,255,255,0.4)", padding: "10px", display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
        <textarea
          value={text} rows={3} dir="rtl" disabled={passed}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          placeholder="נסח כאן את השאלה שלך ל-AI (בקש הכוונה, לא פתרון)..."
          style={{ minHeight: 80, maxHeight: 160, width: "100%", borderRadius: 10, background: "rgba(255,255,255,0.75)", border: `1px solid ${passed ? "rgba(245,158,11,0.4)" : `rgba(${borderRgb},0.25)`}`, color: "#2D3436", fontSize: 14, padding: 10, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
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
  // Balance scale — 9 known scores on right, x=? on right, target 75 on left
  return (
    <svg viewBox="0 0 320 160" className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Base triangle */}
      <polygon points="160,140 145,155 175,155" fill="#64748b" />
      {/* Fulcrum line */}
      <line x1={160} y1={140} x2={160} y2={90} stroke="#64748b" strokeWidth="3" />
      {/* Beam */}
      <line x1={40} y1={90} x2={280} y2={90} stroke="#334155" strokeWidth="3" />
      {/* Left pan (target: 75) */}
      <rect x={30} y={95} width={80} height={30} rx={6} fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1.5" />
      <text x={70} y={115} fontSize="16" fill="#6366f1" fontWeight="700" textAnchor="middle">75</text>
      <text x={70} y={85} fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="middle">ממוצע מבוקש</text>
      {/* Right pan (scores + x) */}
      <rect x={190} y={95} width={100} height={30} rx={6} fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="1.5" />
      <text x={240} y={112} fontSize="10" fill="#10b981" fontWeight="600" textAnchor="middle">9 ציונים + x</text>
      <text x={240} y={85} fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="middle">סה&quot;כ ÷ 10</text>
      {/* Question mark */}
      <text x={240} y={148} fontSize="20" fill="#f59e0b" fontWeight="700" textAnchor="middle">x = ?</text>
    </svg>
  );
}

function MediumDiagram() {
  const data = [
    { kids: 0, families: 5, label: "5" },
    { kids: 1, families: 4, label: "x" },
    { kids: 2, families: 8, label: "8" },
    { kids: 3, families: 10, label: "10" },
    { kids: 4, families: 2, label: "2" },
  ];

  const svgW = 380, svgH = 220;
  const padL = 55, padR = 15, padT = 20, padB = 50;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const maxVal = 12;
  const barW = 42;
  const barGap = (chartW - data.length * barW) / (data.length + 1);
  const gridLines = [0, 2, 4, 6, 8, 10];

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md mx-auto" aria-hidden>
      {/* Y-axis grid lines */}
      {gridLines.map(v => {
        const y = padT + chartH - (v / maxVal) * chartH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} fontSize="9" fill="#374151" fontWeight="600" textAnchor="end">{v}</text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#9ca3af" strokeWidth="1.5" />
      <line x1={padL} y1={padT + chartH} x2={svgW - padR} y2={padT + chartH} stroke="#9ca3af" strokeWidth="1.5" />

      {/* Bars */}
      {data.map((d, i) => {
        const isX = d.label === "x";
        const x = padL + barGap + i * (barW + barGap);
        const h = isX ? chartH * 0.5 : (d.families / maxVal) * chartH;
        const y = padT + chartH - h;
        return (
          <g key={i}>
            {isX ? (
              <rect x={x} y={y} width={barW} height={h} rx={3} fill="rgba(148,163,184,0.08)" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,4" />
            ) : (
              <rect x={x} y={y} width={barW} height={h} rx={3} fill="#6366f1" opacity={0.75} />
            )}
            <text x={x + barW / 2} y={isX ? y + h / 2 + 5 : y - 5} fontSize={isX ? "14" : "11"} fill="#1A1A1A" fontWeight="800" textAnchor="middle">{d.label}</text>
            <text x={x + barW / 2} y={padT + chartH + 16} fontSize="10" fill="#1A1A1A" fontWeight="700" textAnchor="middle">{d.kids}</text>
          </g>
        );
      })}

      {/* X-axis label */}
      <text x={padL + chartW / 2} y={svgH - 4} fontSize="11" fill="#374151" fontWeight="700" textAnchor="middle">מספר ילדים במשפחה</text>

      {/* Y-axis label (rotated) */}
      <text x={14} y={padT + chartH / 2} fontSize="10" fill="#374151" fontWeight="700" textAnchor="middle" transform={`rotate(-90, 14, ${padT + chartH / 2})`}>מספר משפחות (שכיחות)</text>
    </svg>
  );
}

function AdvancedDiagram() {
  // Two side-by-side distribution silhouettes
  const w = 380, h = 160, mid = w / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm mx-auto" aria-hidden>
      {/* Class A — right-skewed bars */}
      <text x={mid / 2} y={16} fontSize={11} fill="#16A34A" fontWeight={700} textAnchor="middle">{"כיתה א'"}</text>
      {[20, 35, 55, 75, 90].map((barH, i) => (
        <rect key={`a${i}`} x={20 + i * 32} y={h - 20 - barH} width={26} height={barH} rx={3} fill="#16A34A" opacity={0.5} />
      ))}
      <line x1={20} y1={h - 20} x2={mid - 10} y2={h - 20} stroke="#94a3b8" strokeWidth={1} />

      {/* Class B — left-skewed bars */}
      <text x={mid + mid / 2} y={16} fontSize={11} fill="#3b82f6" fontWeight={700} textAnchor="middle">{"כיתה ב'"}</text>
      {[90, 75, 55, 35, 20].map((barH, i) => (
        <rect key={`b${i}`} x={mid + 20 + i * 32} y={h - 20 - barH} width={26} height={barH} rx={3} fill="#3b82f6" opacity={0.5} />
      ))}
      <line x1={mid + 20} y1={h - 20} x2={w - 10} y2={h - 20} stroke="#94a3b8" strokeWidth={1} />

      {/* Question marks */}
      <text x={mid / 2} y={h / 2} fontSize={20} fill="#f59e0b" fontWeight={700} textAnchor="middle">?</text>
      <text x={mid + mid / 2} y={h / 2} fontSize={20} fill="#f59e0b" fontWeight={700} textAnchor="middle">?</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "איזון המאזניים",
    problem: "לפניך רשימת ציונים של 10 תלמידים:\n60, 65, 70, 72, 75, 80, 82, 85, 90 וציון נוסף x.\nידוע כי הממוצע הכיתתי הוא 75.\n\nא. מצא את הציון x.\nב. מצא את השכיח ואת החציון של כל עשרת הציונים.\nג. אם נחליף את הציון הנמוך ביותר (60) בציון 0, האם הממוצע ישתנה? האם החציון ישתנה? נמקו.",
    diagram: <GradesBarChart />,
    pitfalls: [
      { title: "⚠️ בניית המשוואה", text: "שימו לב: הממוצע הוא 75. כשאתם בונים את המשוואה, אל תשכחו שסכום הציונים צריך להיות שווה ל-75 × 10 = 750." },
      { title: "💡 חציון תלוי ב-x", text: "טעות נפוצה: לחשב חציון לפני שמוצאים את x. החציון תלוי במיקום של x ברצף המספרים!" },
    ],
    goldenPrompt: `\nהיי, אני המורה הפרטי שלך לסטטיסטיקה. בתרגיל הזה אנחנו נלמד איך "לאזן" ממוצע באמצעות נעלם.\nהתפקיד שלי הוא להוביל אותך לבניית המשוואה הנכונה. דבר ראשון, תסתכל על המאזניים ועל הנתונים שחסרים.\nתאשר לי שהבנת מה הממוצע שאליו אנחנו צריכים להגיע. אני לא אתן לך את התשובה, אלא אשאל אותך מה הסכום של כל הציונים הידועים לנו כרגע.`,
    steps: [
      { phase: "שלב א׳", label: "בניית משוואת הממוצע", coaching: "", prompt: "תדריך אותי איך להשתמש בממוצע 75 כדי למצוא את הסכום הכולל של הציונים ואז את x.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "סכום", "75", "750", "10", "x", "משוואה", "חיסור"] },
      { phase: "שלב ב׳", label: "מציאת חציון ושכיח", coaching: "", prompt: "עכשיו כשיש לי את x, תסביר לי איך למצוא את השכיח ואת החציון.", keywords: [], keywordHint: "", contextWords: ["חציון", "שכיח", "סדר", "אמצע", "תדירות", "x", "81", "מיון"] },
      { phase: "שלב ג׳", label: "השפעת שינוי נתון", coaching: "", prompt: "תסביר לי מה קורה לממוצע ולחציון כשמחליפים את הציון 60 בציון 0.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "חציון", "שינוי", "השפעה", "60", "0", "סכום", "מיקום"] },
    ],
  },
  {
    id: "medium",
    title: "טבלת שכיחויות — השכונה",
    problem: "ביישוב קטן נערך סקר לגבי מספר הילדים בכל משפחה. הנתונים מוצגים בטבלה:\n\n0 ילדים: 5 משפחות\n1 ילד: x משפחות\n2 ילדים: 8 משפחות\n3 ילדים: 10 משפחות\n4 ילדים: 2 משפחות\n\nידוע כי הממוצע הוא 2.0 ילדים למשפחה.\n\nא. מצא את x.\nב. מצא את השכיח ואת החציון.\nג. אם מוסיפים עוד 10 משפחות ללא ילדים, מה קורה לממוצע?",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "⚠️ x במונה ובמכנה!", text: "זהירות! הנעלם x מופיע גם במונה (כמות הילדים: 2·x) וגם במכנה (סך כל המשפחות: 25+x). אל תשכחו להוסיף אותו לשניהם!" },
      { title: "💡 השכיח ≠ x", text: "שימו לב: השכיח הוא מספר הילדים עם כמות המשפחות הגבוהה ביותר, לא ה-x עצמו!" },
    ],
    goldenPrompt: `\nהיי, אני המורה שלך לסטטיסטיקה מתקדמת. הפעם האתגר הוא טבלת שכיחויות.\nתאשר לי שהבנת שהממוצע 2.0 מתייחס לממוצע ילדים למשפחה, ושהבנת שהנעלם x הוא מספר המשפחות עם ילד אחד.\nאני מחכה שתבנה את המשוואה שתעזור לנו למצוא את x. אל תפתור — תוביל אותי שלב אחר שלב.`,
    steps: [
      { phase: "סעיף א׳", label: "מציאת הנעלם x", coaching: "", prompt: "תדריך אותי איך לבנות משוואה מהממוצע 1.8 כדי למצוא את x.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "משוקלל", "מכנה", "מונה", "משוואה", "נעלם", "x", "1.8", "שכיחות"] },
      { phase: "סעיף ב׳", label: "זיהוי השכיח והחציון", coaching: "", prompt: "עכשיו כשיש לי את x, תסביר לי איך למצוא את השכיח ואת החציון מטבלת שכיחויות.", keywords: [], keywordHint: "", contextWords: ["שכיחות", "גבוהה", "מיקום", "אמצעי", "רשימה", "מסודרת", "שכיח", "חציון"] },
      { phase: "סעיף ג׳", label: "הוספת משפחות ללא ילדים", coaching: "", prompt: "תסביר לי מה קורה לממוצע כשמוסיפים 10 משפחות ללא ילדים.", keywords: [], keywordHint: "", contextWords: ["מכנה", "מונה", "הגדלה", "ממוצע", "ירידה", "השפעה", "0", "10"] },
    ],
  },
  {
    id: "advanced",
    title: "השוואת כיתות",
    problem: "בשתי כיתות נערך אותו מבחן:\nכיתה א': ממוצע 75, חציון 78, שכיח 80\nכיתה ב': ממוצע 75, חציון 70, שכיח 65\n\nא. בשתי הכיתות הממוצע זהה. הסבר מדוע התפלגות הציונים שונה בתכלית.\nב. שרטט (תאר) גרף עמודות אפשרי לכל כיתה שמתאים למדדים הנתונים.\nג. בכיתה א' מוסיפים 5 נקודות בונוס לכל תלמיד. מה קורה לממוצע, לחציון ולשכיח?",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "💡 הוספת קבוע: ממוצע, חציון ושכיח כולם עולים באותו ערך", text: "" },
    ],
    goldenPrompt: "",
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מה ההבדל בין ממוצע, חציון ושכיח? כיצד הוספת קבוע משפיעה על מדדי מרכז? מה אפשר ללמוד מהשוואת ההתפלגויות? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הסבר הבדלי התפלגות", coaching: "", prompt: "תעזור לי להבין למה שתי כיתות עם אותו ממוצע יכולות להיות שונות לגמרי.", keywords: [], keywordHint: "", contextWords: ["ממוצע", "חציון", "שכיח", "התפלגות", "סימטרי", "אסימטרי", "ימין", "שמאל"] },
      { phase: "סעיף ב׳", label: "תיאור גרפי", coaching: "", prompt: "כיצד אתאר גרף עמודות שמתאים למדדי המרכז שנתנו לכל כיתה?", keywords: [], keywordHint: "", contextWords: ["גרף", "עמודות", "פיזור", "שכיח", "שיא", "צורה", "התפלגות", "ציונים"] },
      { phase: "סעיף ג׳", label: "השפעת בונוס", coaching: "", prompt: "כשמוסיפים 5 נקודות לכל תלמיד, מה קורה לכל אחד ממדדי המרכז?", keywords: [], keywordHint: "", contextWords: ["בונוס", "הוספה", "קבוע", "ממוצע", "חציון", "שכיח", "הזזה", "5"] },
    ],
  },
];


// ─── FormulaBar (inline interactive formula section) ─────────────────────────

function FormulaBar() {
  const [activeTab, setActiveTab] = useState<"mean" | "median" | "mode" | null>(null);

  const tabs = [
    { id: "mean" as const, label: "📊 ממוצע", tex: String.raw`\bar{x}`, color: "#6366f1", borderColor: "rgba(99,102,241,0.35)" },
    { id: "median" as const, label: "📏 חציון", tex: String.raw`Me`, color: "#f59e0b", borderColor: "rgba(245,158,11,0.35)" },
    { id: "mode" as const, label: "🔁 שכיח", tex: String.raw`Mo`, color: "#a78bfa", borderColor: "rgba(167,139,250,0.35)" },
  ];

  return (
    <div className="formula-bar" style={{ borderRadius: 12, border: "1px solid rgba(244,63,94,0.35)", background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 4px 16px rgba(244,63,94,0.12)" }}>
      <div className="formula-title" style={{ color: "#6B7280", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>נוסחאות</div>

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: activeTab ? 14 : 0 }}>
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(isActive ? null : t.id)}
              style={{
                flex: 1, padding: "10px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                border: `1.5px solid ${isActive ? t.borderColor : "rgba(244,63,94,0.15)"}`,
                background: isActive ? `${t.color}0D` : "rgba(244,63,94,0.03)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? t.color : "#6B7280" }}>{t.label}</span>
              <span style={{ color: isActive ? t.color : "#f43f5e" }}><Tex>{t.tex}</Tex></span>
            </button>
          );
        })}
      </div>

      {/* Expanded content */}
      {activeTab === "mean" && (
        <motion.div key="mean" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(99,102,241,0.25)", background: "rgba(238,242,255,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <TexBlock>{String.raw`\bar{x} = \frac{\sum x_i}{n} = \frac{x_1 + x_2 + \cdots + x_n}{n}`}</TexBlock>
            </div>
            <div style={{ borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", padding: "12px 14px" }}>
              <div style={{ color: "#1A1A1A", fontSize: 12, lineHeight: 2, fontWeight: 500 }}>
                <strong>איך מחשבים?</strong>
                <ol dir="rtl" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  <li>סכמו את כל הערכים.</li>
                  <li>חלקו בכמות הערכים (<Tex>n</Tex>).</li>
                </ol>
              </div>
              <div style={{ marginTop: 10, color: "#4338ca", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
                💡 אם ידוע הממוצע ויש נעלם — בנו משוואה:<br/>
                <span dir="ltr" style={{ fontFamily: "monospace" }}>סכום ידוע + x = ממוצע × n</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "median" && (
        <motion.div key="median" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(245,158,11,0.3)", background: "rgba(255,251,235,0.95)", padding: "16px" }}>
            <div dir="ltr" style={{ textAlign: "center", marginBottom: 14 }}>
              <TexBlock>{String.raw`\text{Position} = \frac{N+1}{2}`}</TexBlock>
            </div>
            <ol dir="rtl" style={{ margin: "0 0 12px", paddingInlineStart: 20, color: "#1A1A1A", fontSize: 12, lineHeight: 2.2, fontWeight: 500 }}>
              <li><strong>סדרו</strong> את כל הערכים מהקטן לגדול.</li>
              <li><strong>חשבו</strong> את המיקום: <span dir="ltr" style={{ fontFamily: "monospace", fontWeight: 700 }}>(N+1) ÷ 2</span></li>
              <li><strong>מצאו</strong> את הערך במיקום הזה — זהו החציון.</li>
            </ol>
            <div style={{ borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", padding: "10px 14px", color: "#92400e", fontSize: 11, fontWeight: 600, lineHeight: 1.7 }}>
              💡 אם המיקום בין שני ערכים — קחו את הממוצע שלהם.<br/>
              💡 בטבלת שכיחויות — ספרו שכיחות מצטברת עד שעוברים את המיקום.
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "mode" && (
        <motion.div key="mode" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
          <div style={{ borderRadius: 12, border: "2px solid rgba(167,139,250,0.3)", background: "rgba(245,243,255,0.95)", padding: "16px" }}>
            <svg viewBox="0 0 240 90" style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto 12px" }} aria-hidden>
              {[
                { h: 30, label: "2" },
                { h: 45, label: "5" },
                { h: 72, label: "8" },
                { h: 45, label: "5" },
                { h: 22, label: "3" },
              ].map((bar, i) => {
                const isMax = i === 2;
                const x = 12 + i * 46;
                return (
                  <g key={i}>
                    <rect x={x} y={82 - bar.h} width={36} height={bar.h} rx={3} fill={isMax ? "#a78bfa" : "#e2e8f0"} stroke={isMax ? "#7c3aed" : "none"} strokeWidth={isMax ? 2.5 : 0} />
                    <text x={x + 18} y={82 - bar.h - 4} fontSize="10" fill={isMax ? "#5b21b6" : "#6B7280"} fontWeight="800" textAnchor="middle">{bar.label}</text>
                    {isMax && <text x={x + 18} y={82 - bar.h - 16} fontSize="11" fill="#7c3aed" fontWeight="800" textAnchor="middle">★</text>}
                    <text x={x + 18} y={82} fontSize="9" fill="#374151" fontWeight="600" textAnchor="middle" dy="10">{i}</text>
                  </g>
                );
              })}
            </svg>
            <p style={{ color: "#1A1A1A", fontSize: 13, lineHeight: 1.8, textAlign: "center", margin: "0 0 10px", fontWeight: 600 }}>
              השכיח = ערך ציר ה-X של העמודה הגבוהה ביותר.
            </p>
            <div style={{ borderRadius: 10, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", padding: "10px 14px", color: "#5b21b6", fontSize: 11, fontWeight: 600, lineHeight: 1.7, textAlign: "center" }}>
              💡 ייתכנו שני שכיחים (דו-שכיחי) או אף אחד אם כל הערכים שווי-תדירות.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

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
    <section className="exercise-section" style={{ border: `1px solid ${s.glowBorder}`, borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)" }}>

      {/* Formula bar — interactive central tendency guides */}
      <FormulaBar />

      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem" }}>
        <span className={`text-sm font-black px-4 py-1.5 rounded-full shrink-0 ${s.badgeCls}`}>{s.badge}</span>
        <h2 className={`text-xl font-extrabold uppercase tracking-widest ${s.accentCls}`} style={{ margin: 0 }}>{s.stationName}</h2>
      </div>
      <div style={{ height: 1, background: "rgba(60,54,42,0.1)", marginBottom: "2rem" }} />

      {/* Diagram */}
      {ex.diagram && (
        <div style={{ borderRadius: 16, border: `1px solid ${s.glowBorder}`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", boxShadow: s.glowShadow }}>{ex.diagram}</div>
      )}

      {/* Problem */}
      <div style={{ borderRadius: 16, border: `1px solid rgba(${s.borderRgb},0.35)`, background: "rgba(255,255,255,0.75)", padding: "1.25rem", marginBottom: "1.25rem" }}>
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

// ─── Lab 1: Full Slider Histogram (Basic) ────────────────────────────────────

function BarChartLab() {
  const initialScores = [60, 65, 70, 72, 75, 80, 82, 85, 90, 71];
  const [scores, setScores] = useState(initialScores);
  const targetAvg = 75;
  const xIndex = 9; // last score is x

  const setScore = (i: number, v: number) => setScores(prev => { const next = [...prev]; next[i] = v; return next; });

  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = sum / 10;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = (sorted[4] + sorted[5]) / 2;

  // Mode
  const freq: Record<number, number> = {};
  for (const v of scores) freq[v] = (freq[v] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => +v);
  const modeStr = modes.length === scores.length ? "אין" : modes.join(", ");

  const onTarget = Math.abs(mean - targetAvg) < 0.05;

  // SVG params
  const svgW = 380, svgH = 180, padL = 30, padT = 20, padB = 25;
  const chartH = svgH - padT - padB;
  const barW = 30, gap = 6;
  const maxVal = 100;

  return (
    <section style={{ border: "1px solid rgba(0,212,255,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>מעבדת ההיסטוגרמה</h3>
      <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", marginBottom: 4 }}>הזיזו סליידרים — צפו בממוצע, חציון ושכיח בזמן אמת.</p>
      <p style={{ color: onTarget ? "#16a34a" : "#f59e0b", fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" }}>🎯 ממוצע יעד: {targetAvg}</p>

      {/* SVG Histogram with mean line */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Y-axis */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#cbd5e1" strokeWidth="1" />
          <line x1={padL} y1={padT + chartH} x2={svgW - 5} y2={padT + chartH} stroke="#cbd5e1" strokeWidth="1" />

          {/* Target line */}
          {(() => { const y = padT + chartH - (targetAvg / maxVal) * chartH; return (
            <><line x1={padL} y1={y} x2={svgW - 5} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4" />
            <text x={padL - 4} y={y + 3} fontSize="7" fill="#94a3b8" textAnchor="end">{targetAvg}</text></>
          ); })()}

          {/* Mean line (dynamic) */}
          {(() => { const y = padT + chartH - (mean / maxVal) * chartH; return (
            <><line x1={padL} y1={y} x2={svgW - 5} y2={y} stroke={onTarget ? "#16a34a" : "#f59e0b"} strokeWidth="2" strokeDasharray="8,4" />
            <text x={svgW - 3} y={y + 4} fontSize="9" fill={onTarget ? "#16a34a" : "#f59e0b"} fontWeight="700" textAnchor="end">{mean.toFixed(1)}</text></>
          ); })()}

          {/* Bars */}
          {scores.map((v, i) => {
            const isX = i === xIndex;
            const h = (v / maxVal) * chartH;
            const x = padL + 8 + i * (barW + gap);
            const y = padT + chartH - h;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={h} rx={3} fill={isX ? (onTarget ? "#16a34a" : "#f59e0b") : "#6366f1"} opacity={isX ? 1 : 0.6} />
                <text x={x + barW / 2} y={y - 3} fontSize="8" fill="#1A1A1A" fontWeight="700" textAnchor="middle">{v}</text>
                <text x={x + barW / 2} y={padT + chartH + 12} fontSize="7" fill="#374151" fontWeight="600" textAnchor="middle">{isX ? "x" : `#${i + 1}`}</text>
              </g>
            );
          })}

          {onTarget && <text x={svgW / 2} y={padT + 10} fontSize="11" fill="#16a34a" fontWeight="800" textAnchor="middle">ממוצע = {targetAvg}! ✓</text>}
        </svg>
      </div>

      {/* Sliders grid — 2 columns on mobile, 5 on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: "1.5rem" }}>
        {scores.map((v, i) => {
          const isX = i === xIndex;
          return (
            <div key={i} style={{ borderRadius: 10, border: `1.5px solid ${isX ? (onTarget ? "#16a34a" : "#f59e0b") : "#e2e8f0"}`, background: isX ? (onTarget ? "rgba(22,163,74,0.04)" : "rgba(245,158,11,0.04)") : "#fff", padding: "8px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 3 }}>
                <span style={{ fontWeight: isX ? 700 : 500 }}>{isX ? "x" : `תלמיד ${i + 1}`}</span>
                <span style={{ color: isX ? (onTarget ? "#16a34a" : "#f59e0b") : "#1A1A1A", fontWeight: 700, fontFamily: "monospace" }}>{v}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={v} onChange={e => setScore(i, +e.target.value)} style={{ width: "100%", accentColor: isX ? (onTarget ? "#16a34a" : "#f59e0b") : "#6366f1" }} />
            </div>
          );
        })}
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <div style={{ borderRadius: 14, background: onTarget ? "rgba(22,163,74,0.08)" : "#fff", border: `2px solid ${onTarget ? "#16a34a" : "#e2e8f0"}`, padding: "12px 8px", textAlign: "center", boxShadow: onTarget ? "0 0 16px rgba(22,163,74,0.2)" : "none", transition: "all 0.3s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
            <span style={{ color: "#374151", fontSize: 10, fontWeight: 600 }}>ממוצע</span>
            <button onClick={() => document.querySelector(".formula-bar")?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label="עזרה — ממוצע" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 13, color: "#9ca3af" }}>ⓘ</button>
          </div>
          <div style={{ color: onTarget ? "#16a34a" : "#6366f1", fontWeight: 800, fontSize: 20, fontFamily: "monospace" }}>{mean.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius: 14, background: "#fff", border: "2px solid #e2e8f0", padding: "12px 8px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
            <span style={{ color: "#374151", fontSize: 10, fontWeight: 600 }}>חציון</span>
            <button onClick={() => document.querySelector(".formula-bar")?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label="עזרה — חציון" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 13, color: "#9ca3af" }}>ⓘ</button>
          </div>
          <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 20, fontFamily: "monospace" }}>{median.toFixed(1)}</div>
        </div>
        <div style={{ borderRadius: 14, background: "#fff", border: "2px solid #e2e8f0", padding: "12px 8px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
            <span style={{ color: "#374151", fontSize: 10, fontWeight: 600 }}>שכיח</span>
            <button onClick={() => document.querySelector(".formula-bar")?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label="עזרה — שכיח" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 13, color: "#9ca3af" }}>ⓘ</button>
          </div>
          <div style={{ color: "#a78bfa", fontWeight: 800, fontSize: 20, fontFamily: "monospace" }}>{modeStr}</div>
        </div>
      </div>
    </section>
  );
}

function _OldBarChartLab() {
  const [values, setValues] = useState([72, 85, 91, 68, 85, 77, 95, 85, 60, 82]);

  const setVal = (i: number, v: number) => setValues(prev => { const next = [...prev]; next[i] = v; return next; });

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const median = values.length % 2 === 0
    ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
    : sorted[Math.floor(values.length / 2)];

  // Mode calculation
  const freq: Record<number, number> = {};
  for (const v of values) freq[v] = (freq[v] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => +v);
  const modeStr = modes.length === values.length ? "אין" : modes.join(", ");
  const modeSet = new Set(modes.length === values.length ? [] : modes);

  const maxVal = 100;
  const barW = 28, gap = 6, padL = 50, padT = 20, chartH = 180;
  const chartW = padL + values.length * (barW + gap) + 20;

  return (
    <section className="lab-section">
      <style>{`
        .lab-section {
          border-radius: 24px; background: #f8fafc; margin: 2rem auto 0; max-width: 64rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0; padding: 2rem;
        }
        @media (max-width: 767px) {
          .lab-section { border-radius: 14px; padding: 0.75rem; margin-top: 1rem; }
        }
        .lab-two-col { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        .lab-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .lab-stat-value { font-size: 22px; }
        .lab-slider-label { font-size: 14px; }
        .lab-slider-val { font-size: 15px; }
        .lab-slider-track { height: 36px; }
        /* Mobile: sliders(1) → chart(2) → stats(3) */
        .lab-col-chart { order: 2; display: flex; flex-direction: column; gap: 1.5rem; }
        .lab-col-sliders { order: 1; }
        .lab-col-stats { order: 3; }
        @media (min-width: 640px) {
          .lab-section { padding: 2.5rem 2rem; }
          .lab-stats-grid { gap: 14px; }
          .lab-stat-value { font-size: 26px; }
          .lab-slider-label { font-size: 13px; }
          .lab-slider-val { font-size: 14px; }
        }
        @media (min-width: 768px) {
          /* Desktop: chart+stats on LEFT (start), sliders on RIGHT (end) */
          .lab-two-col { grid-template-columns: 1fr 320px; grid-template-rows: auto auto; gap: 1.5rem 2rem; }
          .lab-col-chart { order: unset; grid-column: 1; grid-row: 1; }
          .lab-col-stats { order: unset; grid-column: 1; grid-row: 2; }
          .lab-col-sliders { order: unset; grid-column: 2; grid-row: 1 / 3; }
        }
      `}</style>

      {/* Header with gradient */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", borderRadius: 16, padding: "0.75rem", marginBottom: "1.5rem", textAlign: "center" }}>
        <h3 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>מעבדת מדדי מרכז</h3>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 0" }}>שנה ציונים כדי לראות כיצד ממוצע, חציון ושכיח משתנים בזמן אמת.</p>
      </div>

      {/* Desktop: chart+stats LEFT | sliders RIGHT */}
      {/* Mobile stacked: sliders → chart → stats */}
      <div className="lab-two-col">

        {/* Chart panel */}
        <div className="lab-col-chart" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: "1rem", paddingBottom: 8, borderBottom: "2px solid #e2e8f0" }}>תרשים עמודות</div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH + 50}`} style={{ width: "100%", minWidth: 340, display: "block" }} aria-hidden>
              {/* Y-axis */}
              <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#cbd5e1" strokeWidth={1} />
              {/* X-axis */}
              <line x1={padL} y1={padT + chartH} x2={chartW - 10} y2={padT + chartH} stroke="#cbd5e1" strokeWidth={1} />

              {/* Y-axis ticks */}
              {[0, 25, 50, 75, 100].map(tick => {
                const y = padT + chartH - (tick / maxVal) * chartH;
                return (
                  <g key={tick}>
                    <line x1={padL - 4} y1={y} x2={padL} y2={y} stroke="#cbd5e1" strokeWidth={1} />
                    <text x={padL - 8} y={y + 3} fontSize={8} fill="#94a3b8" textAnchor="end">{tick}</text>
                  </g>
                );
              })}

              {/* Mean line (blue dashed — line only, no label card) */}
              <line x1={padL} y1={padT + chartH - (mean / maxVal) * chartH} x2={chartW - 10} y2={padT + chartH - (mean / maxVal) * chartH} stroke="#2563eb" strokeWidth={2} strokeDasharray="8,4" />

              {/* Median line (orange dashed — line only, no label card) */}
              <line x1={padL} y1={padT + chartH - (median / maxVal) * chartH} x2={chartW - 10} y2={padT + chartH - (median / maxVal) * chartH} stroke="#ea580c" strokeWidth={2} strokeDasharray="8,4" />

              {/* Bars with mode highlight */}
              {values.map((v, i) => {
                const h = (v / maxVal) * chartH;
                const x = padL + i * (barW + gap) + gap;
                const y = padT + chartH - h;
                const isMode = modeSet.has(v);
                return (
                  <g key={i}>
                    {isMode && (
                      <rect x={x - 3} y={y - 3} width={barW + 6} height={h + 3} rx={6} fill="none" stroke="#7c3aed" strokeWidth={2.5} opacity={0.6} />
                    )}
                    <rect x={x} y={y} width={barW} height={h} rx={5} fill={isMode ? "#7c3aed" : "#2563eb"} opacity={isMode ? 0.9 : 0.65} />
                    {isMode && (
                      <text x={x + barW / 2} y={y - 6} fontSize={8} fill="#7c3aed" fontWeight={700} textAnchor="middle">Mo</text>
                    )}
                    <text x={x + barW / 2} y={padT + chartH + 14} fontSize={9} fill="#64748b" fontWeight={500} textAnchor="middle">{i + 1}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "ממוצע", color: "#2563eb" },
              { label: "חציון", color: "#ea580c" },
              { label: "שכיח", color: "#7c3aed" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: item.color }} />
                <span style={{ fontWeight: 600 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats cards — 2x2 grid below chart (left column on desktop) */}
        <div className="lab-col-stats">
          <div className="lab-stats-grid">
            {[
              { label: "ממוצע", val: mean.toFixed(2), color: "#2563eb", bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "#93c5fd", icon: "x̄" },
              { label: "חציון", val: median.toFixed(2), color: "#ea580c", bg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)", border: "#fdba74", icon: "Me" },
              { label: "שכיח", val: modeStr, color: "#7c3aed", bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "#c4b5fd", icon: "Mo" },
              { label: "כמות", val: `${values.length}`, color: "#475569", bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", border: "#cbd5e1", icon: "n" },
            ].map(r => (
              <div key={r.label} style={{ borderRadius: 16, background: r.bg, border: `2px solid ${r.border}`, padding: "1.25rem 1rem", textAlign: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}>
                <div style={{ color: r.color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, opacity: 0.8 }}>{r.label}</div>
                <div className="lab-stat-value" style={{ color: r.color, fontWeight: 800, fontFamily: "monospace", lineHeight: 1.1 }}>{r.val}</div>
                <div style={{ color: r.color, fontSize: 10, fontWeight: 600, marginTop: 4, opacity: 0.5 }}>{r.icon}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sliders — RIGHT column on desktop, TOP on mobile */}
        <div className="lab-col-sliders" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: "1rem", paddingBottom: 8, borderBottom: "2px solid #e2e8f0" }}>נתוני התלמידים</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {values.map((v, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: 4 }}>
                  <span className="lab-slider-label" style={{ fontWeight: 500 }}>תלמיד {i + 1}</span>
                  <span className="lab-slider-val" style={{ color: "#1e293b", fontWeight: 700, fontFamily: "monospace" }}>{v}</span>
                </div>
                <input type="range" min={0} max={100} step={1} value={v} onChange={e => setVal(i, +e.target.value)} className="lab-slider-track" style={{ width: "100%", accentColor: "#2563eb" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Lab 2: Frequency Histogram with Mean Tracker (Medium) ───────────────────

function MissingScoreLab() {
  // Freq table: 0→5, 1→x, 2→8, 3→10, 4→2. Target avg=2.0. Correct x=4.
  const freqData = [
    { kids: 0, fixed: 5 },
    { kids: 1, fixed: null }, // x — slider controlled
    { kids: 2, fixed: 8 },
    { kids: 3, fixed: 10 },
    { kids: 4, fixed: 2 },
  ];
  const [xVal, setXVal] = useState(4);
  const targetAvg = 2.0;

  const frequencies = freqData.map(d => d.fixed !== null ? d.fixed : xVal);
  const totalFamilies = frequencies.reduce((a, b) => a + b, 0);
  const totalKids = frequencies.reduce((sum, f, i) => sum + f * i, 0);
  const currentAvg = totalFamilies > 0 ? totalKids / totalFamilies : 0;
  const solved = Math.abs(currentAvg - targetAvg) < 0.01;

  // Find mode
  const maxFreq = Math.max(...frequencies);
  const modeKids = frequencies.indexOf(maxFreq);

  // SVG histogram params
  const svgW = 340, svgH = 200, padL = 40, padB = 40, padT = 25;
  const chartH = svgH - padT - padB;
  const barW = 44, gap = 16;
  const maxF = Math.max(...frequencies, 12);
  const barX = (i: number) => padL + i * (barW + gap) + gap;
  const barH = (f: number) => (f / maxF) * chartH;

  // Mean line position on x-axis
  const meanX = padL + gap + currentAvg * (barW + gap) + barW / 2;

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת ההיסטוגרמה — טבלת שכיחויות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "1.5rem" }}>הזז את הסליידר של &quot;1 ילד&quot; עד שקו הממוצע יגיע ל-2.0.</p>

      {/* Slider for x */}
      <div style={{ marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
          <span>x = מספר משפחות עם 1 ילד</span>
          <span style={{ color: solved ? "#16a34a" : "#f59e0b", fontWeight: 700, fontSize: 16 }}>{xVal}</span>
        </div>
        <input type="range" min={0} max={20} step={1} value={xVal} onChange={e => setXVal(+e.target.value)} style={{ width: "100%", accentColor: solved ? "#16a34a" : "#f59e0b" }} />
      </div>

      {/* Feedback */}
      {solved && <LabMessage text={`מצוין! x = ${xVal}. הממוצע בדיוק 2.0 ילדים למשפחה! 🎯`} type="success" visible={true} />}
      {!solved && <LabMessage text={currentAvg > targetAvg ? "הממוצע גבוה מדי — הגדל את x (הוסף משפחות עם 1 ילד)" : "הממוצע נמוך מדי — הקטן את x"} type="warning" visible={true} />}

      {/* SVG Histogram */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(234,88,12,0.25)", background: "#fff", padding: "1rem", marginBottom: "1.5rem" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Axes */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#cbd5e1" strokeWidth="1" />
          <line x1={padL} y1={padT + chartH} x2={svgW - 10} y2={padT + chartH} stroke="#cbd5e1" strokeWidth="1" />

          {/* Y-axis label */}
          <text x={12} y={padT + chartH / 2} fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="middle" transform={`rotate(-90, 12, ${padT + chartH / 2})`}>משפחות</text>

          {/* Y-axis ticks */}
          {[0, 5, 10, 15].map(v => {
            const y = padT + chartH - (v / maxF) * chartH;
            return <text key={v} x={padL - 6} y={y + 3} fontSize="8" fill="#94a3b8" textAnchor="end">{v}</text>;
          })}

          {/* Bars */}
          {frequencies.map((f, i) => {
            const isX = i === 1;
            const h = barH(f);
            const x = barX(i);
            const y = padT + chartH - h;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={h} rx={4} fill={isX ? (solved ? "#16a34a" : "#f59e0b") : "#6366f1"} opacity={isX ? 1 : 0.6} />
                {/* Count above bar */}
                <text x={x + barW / 2} y={y - 4} fontSize="11" fill={isX ? (solved ? "#16a34a" : "#f59e0b") : "#6366f1"} fontWeight="700" textAnchor="middle">{f}</text>
                {/* X-axis label */}
                <text x={x + barW / 2} y={padT + chartH + 14} fontSize="10" fill="#475569" fontWeight="600" textAnchor="middle">{i}</text>
              </g>
            );
          })}

          {/* X-axis title */}
          <text x={svgW / 2} y={svgH - 4} fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="middle">מספר ילדים</text>

          {/* Mean line (vertical) */}
          <line x1={meanX} y1={padT} x2={meanX} y2={padT + chartH} stroke={solved ? "#16a34a" : "#DC2626"} strokeWidth="2.5" strokeDasharray="8,4" />
          <text x={meanX} y={padT - 4} fontSize="10" fill={solved ? "#16a34a" : "#DC2626"} fontWeight="700" textAnchor="middle">ממוצע: {currentAvg.toFixed(2)}</text>

          {/* Target marker */}
          {!solved && (
            <>
              <line x1={padL + gap + targetAvg * (barW + gap) + barW / 2} y1={padT + chartH - 5} x2={padL + gap + targetAvg * (barW + gap) + barW / 2} y2={padT + chartH + 5} stroke="#94a3b8" strokeWidth="2" />
              <text x={padL + gap + targetAvg * (barW + gap) + barW / 2} y={padT + chartH + 26} fontSize="8" fill="#94a3b8" fontWeight="600" textAnchor="middle">יעד: 2.0</text>
            </>
          )}
        </svg>
      </div>

      {/* Live calculation */}
      <div style={{ borderRadius: 12, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(255,255,255,0.9)", padding: "12px", marginBottom: "1rem", textAlign: "center", fontFamily: "monospace", fontSize: 11, color: "#334155", direction: "ltr" }}>
        (0×{frequencies[0]} + 1×{frequencies[1]} + 2×{frequencies[2]} + 3×{frequencies[3]} + 4×{frequencies[4]}) ÷ {totalFamilies} = <span style={{ fontWeight: 700, color: solved ? "#16a34a" : "#f59e0b" }}>{currentAvg.toFixed(3)}</span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8, textAlign: "center" }}>
        {[
          { label: "x", val: xVal.toString(), color: solved ? "#16a34a" : "#f59e0b" },
          { label: "ממוצע", val: currentAvg.toFixed(2), color: "#6366f1" },
          { label: "סה\"כ משפחות", val: totalFamilies.toString(), color: "#334155" },
          { label: "סה\"כ ילדים", val: totalKids.toString(), color: "#a78bfa" },
          { label: "שכיח", val: `${modeKids} ילדים`, color: "#DC2626" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.2)", padding: "10px 4px" }}>
            <div style={{ color: "#6B7280", fontSize: 8, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function _NewOldMissingScoreLab() {
  // Frequency table: 0→5, 1→8, 2→x, 3→10, 4→2. Target avg = 1.8
  // Correct x: (0*5 + 1*8 + 2*x + 3*10 + 4*2) / (5+8+x+10+2) = 1.8
  // (8 + 2x + 30 + 8) / (25+x) = 1.8 → (46 + 2x) / (25+x) = 1.8
  // 46 + 2x = 1.8*(25+x) = 45 + 1.8x → 46 - 45 = 1.8x - 2x → 1 = -0.2x → x = -5?
  // Let me recalculate: 0*5=0, 1*8=8, 2*x=2x, 3*10=30, 4*2=8. Sum = 46+2x
  // Total families = 25+x. Avg = (46+2x)/(25+x) = 1.8
  // 46+2x = 45+1.8x → 1 = -0.2x → x = -5. That's wrong.
  // Fix: the problem data must be adjusted. Let me recalculate for x=5:
  // (0*5+1*8+2*5+3*10+4*2)/(5+8+5+10+2) = (0+8+10+30+8)/30 = 56/30 ≈ 1.867
  // For avg=1.8: (46+2x)/(25+x)=1.8 → 46+2x=45+1.8x → 0.2x=-1 → x=-5. Impossible!
  // Need to adjust frequencies. Let me use: 0→3, 1→8, 2→x, 3→10, 4→4
  // Sum = 0*3+1*8+2x+3*10+4*4 = 8+2x+30+16 = 54+2x
  // Total = 3+8+x+10+4 = 25+x. Avg = (54+2x)/(25+x) = 1.8
  // 54+2x = 45+1.8x → 9 = -0.2x → x = -45. Still wrong direction.
  // The issue: 2x grows faster in numerator than x in denominator.
  // For avg<2, we need fewer families with 2 kids, making x smaller, not bigger.
  // Try target avg=2: (54+2x)/(25+x)=2 → 54+2x=50+2x → 4=0. Contradiction.
  // This is because the avg of "2 kids" families is exactly 2 kids per family.
  // Any x doesn't change the avg... actually it does because they contribute to both.
  //
  // Let me use different data: 0→2, 1→5, 2→x, 3→8, 4→5
  // Sum = 0+5+2x+24+20 = 49+2x. Total = 2+5+x+8+5 = 20+x
  // Avg = (49+2x)/(20+x) = 1.8 → 49+2x = 36+1.8x → 13 = -0.2x → x = -65. Still negative!
  //
  // The problem: whenever kids-count for x-group (2) > target-avg (1.8),
  // adding more families INCREASES the average, so we need FEWER, not more.
  // To get a solvable positive x, the x-group's kid count must be < avg.
  // Let me put x on the "1 kid" group instead:
  // 0→5, 1→x, 2→8, 3→10, 4→2. Sum = x+16+30+8 = 54+x. Total = 5+x+8+10+2 = 25+x
  // Avg = (54+x)/(25+x) = 1.8 → 54+x = 45+1.8x → 9 = 0.8x → x = 11.25. Not integer.
  // Try avg=2: 54+x = 50+2x → 4=x. Nice! x=4, avg=2.
  //
  // Use this: 0→5, 1→x, 2→8, 3→10, 4→2. Target avg = 2. Correct x = 4.
  const freqData = [
    { kids: 0, families: 5 },
    { kids: 1, families: null }, // x
    { kids: 2, families: 8 },
    { kids: 3, families: 10 },
    { kids: 4, families: 2 },
  ];
  const knownSum = 0*5 + 2*8 + 3*10 + 4*2; // = 54
  const knownFamilies = 5 + 8 + 10 + 2; // = 25
  const targetAvg = 2.0;
  const correctX = 4; // (54 + 1*x) / (25+x) = 2 → 54+x = 50+2x → x=4

  const [xInput, setXInput] = useState("");
  const [solved, setSolved] = useState(false);

  const xVal = parseFloat(xInput) || 0;
  const totalKids = knownSum + 1 * xVal;
  const totalFamilies = knownFamilies + xVal;
  const currentAvg = totalFamilies > 0 ? totalKids / totalFamilies : 0;
  const isCorrect = Math.abs(xVal - correctX) < 0.5 && xInput !== "";

  if (isCorrect && !solved) setSolved(true);

  // Find mode: max frequency
  const allFreqs = [5, xVal, 8, 10, 2];
  const maxFreq = Math.max(...allFreqs);
  const modeKids = allFreqs.indexOf(maxFreq);

  return (
    <section style={{ border: "1px solid rgba(234,88,12,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת השכונה — טבלת שכיחויות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>הקלד את x (מספר המשפחות עם ילד אחד) כדי שהממוצע יהיה 2.0.</p>

      {/* Frequency table visual */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: "1.5rem" }}>
        {freqData.map((d, i) => {
          const isX = d.families === null;
          const count = isX ? (xInput ? xVal : "?") : d.families;
          return (
            <div key={i} style={{ borderRadius: 12, border: `1.5px solid ${isX ? (solved ? "#16a34a" : "#f59e0b") : "#e2e8f0"}`, background: isX ? (solved ? "rgba(22,163,74,0.06)" : "rgba(245,158,11,0.06)") : "#fff", padding: "12px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{d.kids} ילדים</div>
              {isX ? (
                <input
                  type="number"
                  value={xInput}
                  onChange={e => { setXInput(e.target.value); setSolved(false); }}
                  placeholder="x"
                  style={{ width: 40, fontSize: 18, fontWeight: 700, textAlign: "center", border: "none", outline: "none", background: "transparent", color: solved ? "#16a34a" : "#f59e0b", fontFamily: "monospace" }}
                />
              ) : (
                <div style={{ fontSize: 18, fontWeight: 700, color: "#6366f1" }}>{count}</div>
              )}
              <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>משפחות</div>
            </div>
          );
        })}
      </div>

      {/* Live calculation */}
      <div style={{ borderRadius: 12, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(255,255,255,0.9)", padding: "12px", marginBottom: "1rem", textAlign: "center", fontFamily: "monospace", fontSize: 12, color: "#334155", direction: "ltr" }}>
        (0×5 + 1×{xInput || "?"} + 2×8 + 3×10 + 4×2) ÷ (5+{xInput || "?"}+8+10+2) = <span style={{ fontWeight: 700, color: solved ? "#16a34a" : "#f59e0b" }}>{xInput ? currentAvg.toFixed(3) : "?"}</span>
      </div>

      {/* Feedback */}
      {solved && (
        <LabMessage text={`מצוין! x = ${correctX}. הממוצע מאוזן על ${targetAvg}! 🎯`} type="success" visible={true} />
      )}
      {!solved && xInput && (
        <LabMessage text={currentAvg > targetAvg ? "הממוצע גבוה מדי — צמצם את x" : "הממוצע נמוך מדי — הגדל את x"} type="warning" visible={Math.abs(currentAvg - targetAvg) > 0.05} />
      )}

      {/* Stats after solving */}
      {solved && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8, textAlign: "center", marginTop: 12 }}>
          {[
            { label: "x", val: correctX.toString(), color: "#16a34a" },
            { label: "ממוצע", val: targetAvg.toFixed(1), color: "#6366f1" },
            { label: "סה\"כ משפחות", val: (knownFamilies + correctX).toString(), color: "#f59e0b" },
            { label: "שכיח", val: `${modeKids} ילדים`, color: "#DC2626" },
          ].map(r => (
            <div key={r.label} style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.2)", padding: "10px 6px" }}>
              <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
              <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function _OldMissingScoreLab() {
  const fixedScores = [78, 92, 85, 71];
  const [fifthScore, setFifthScore] = useState(84);
  const [targetAvg, setTargetAvg] = useState(84);

  const existingSum = fixedScores.reduce((a, b) => a + b, 0);
  const requiredScore = targetAvg * 5 - existingSum;
  const actualAvg = (existingSum + fifthScore) / 5;

  const lineMin = 50, lineMax = 110;
  const padL = 30, padR = 30, lineY = 70, w = 380, h = 130;
  const toX = (v: number) => padL + ((v - lineMin) / (lineMax - lineMin)) * (w - padL - padR);

  return (
    <section style={{ border: "1px solid rgba(244,63,94,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת הציון החסר</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה את הציון החמישי והממוצע הרצוי כדי לראות את ההשפעה.</p>

      {/* Fixed scores display */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {fixedScores.map((s, i) => (
          <div key={i} style={{ borderRadius: 12, background: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.3)", padding: "8px 16px", textAlign: "center" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600 }}>מבחן {i + 1}</div>
            <div style={{ color: "#EA580C", fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{s}</div>
          </div>
        ))}
        <div style={{ borderRadius: 12, background: "rgba(244,63,94,0.1)", border: "2px solid rgba(244,63,94,0.4)", padding: "8px 16px", textAlign: "center" }}>
          <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600 }}>מבחן 5</div>
          <div style={{ color: "#f43f5e", fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{fifthScore}</div>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>ציון במבחן 5</span>
            <span style={{ color: "#f43f5e", fontWeight: 700 }}>{fifthScore}</span>
          </div>
          <input type="range" min={0} max={100} step={1} value={fifthScore} onChange={e => setFifthScore(+e.target.value)} style={{ width: "100%", accentColor: "#f43f5e" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>ממוצע יעד</span>
            <span style={{ color: "#a78bfa", fontWeight: 700 }}>{targetAvg}</span>
          </div>
          <input type="range" min={60} max={100} step={1} value={targetAvg} onChange={e => setTargetAvg(+e.target.value)} style={{ width: "100%", accentColor: "#a78bfa" }} />
        </div>
      </div>

      {/* SVG: Number line */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(244,63,94,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(244,63,94,0.08)" }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Number line */}
          <line x1={padL} y1={lineY} x2={w - padR} y2={lineY} stroke="#94a3b8" strokeWidth={1.5} />
          <polygon points={`${w - padR},${lineY} ${w - padR - 6},${lineY - 4} ${w - padR - 6},${lineY + 4}`} fill="#94a3b8" />

          {/* Tick marks */}
          {[60, 70, 80, 90, 100].map(v => (
            <g key={v}>
              <line x1={toX(v)} y1={lineY - 4} x2={toX(v)} y2={lineY + 4} stroke="#94a3b8" strokeWidth={1} />
              <text x={toX(v)} y={lineY + 16} fontSize={9} fill="#94a3b8" textAnchor="middle">{v}</text>
            </g>
          ))}

          {/* Fixed score dots */}
          {fixedScores.map((s, i) => (
            <circle key={i} cx={toX(s)} cy={lineY} r={6} fill="#EA580C" stroke="#fff" strokeWidth={1.5} />
          ))}

          {/* 5th score dot */}
          <circle cx={toX(Math.min(fifthScore, 105))} cy={lineY} r={7} fill="#f43f5e" stroke="#fff" strokeWidth={2} />

          {/* Target average vertical line */}
          <line x1={toX(Math.min(targetAvg, 105))} y1={lineY - 25} x2={toX(Math.min(targetAvg, 105))} y2={lineY + 25} stroke="#a78bfa" strokeWidth={2} strokeDasharray="4,3" />
          <text x={toX(Math.min(targetAvg, 105))} y={lineY - 30} fontSize={9} fill="#a78bfa" fontWeight={700} textAnchor="middle">יעד: {targetAvg}</text>
        </svg>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
        {[
          { label: "סכום קיים", val: `${existingSum}`, color: "#EA580C" },
          { label: "ציון נדרש ליעד", val: requiredScore > 100 ? `${requiredScore} (!)` : requiredScore < 0 ? `${requiredScore} (!)` : `${requiredScore}`, color: requiredScore > 100 || requiredScore < 0 ? "#dc2626" : "#a78bfa" },
          { label: "ממוצע בפועל", val: actualAvg.toFixed(1), color: "#f43f5e" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(244,63,94,0.35)", padding: 12, boxShadow: "0 4px 16px rgba(60,54,42,0.06)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 3: DistributionLab (Advanced) ────────────────────────────────────────

function DistributionLab() {
  const [classA, setClassA] = useState([65, 72, 78, 80, 80]);
  const [classB, setClassB] = useState([90, 85, 65, 65, 60]);
  const [bonus, setBonus] = useState(0);

  const setA = (i: number, v: number) => setClassA(prev => { const next = [...prev]; next[i] = v; return next; });
  const setB = (i: number, v: number) => setClassB(prev => { const next = [...prev]; next[i] = v; return next; });

  function calcStats(arr: number[]) {
    const sorted = [...arr].sort((a, b) => a - b);
    const sum = arr.reduce((a, b) => a + b, 0);
    const mean = sum / arr.length;
    const median = arr.length % 2 === 0
      ? (sorted[arr.length / 2 - 1] + sorted[arr.length / 2]) / 2
      : sorted[Math.floor(arr.length / 2)];
    const freq: Record<number, number> = {};
    for (const v of arr) freq[v] = (freq[v] || 0) + 1;
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.entries(freq).filter(([, f]) => f === maxFreq).map(([v]) => +v);
    const modeStr = modes.length === arr.length ? "אין" : modes.join(", ");
    return { mean, median, modeStr };
  }

  const classABonused = classA.map(v => v + bonus);
  const statsA = calcStats(classABonused);
  const statsB = calcStats(classB);

  const maxVal = 100 + bonus;
  const barW = 22, gap = 6, padL = 10, padT = 30, chartH = 140;
  const groupW = 5 * (barW + gap) + gap;
  const totalW = padL + groupW + 40 + groupW + padL;

  return (
    <section style={{ border: "1px solid rgba(244,63,94,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת השוואת התפלגויות</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנה ציונים בשתי הכיתות וראה את ההבדלים במדדי המרכז.</p>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem 2rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#16A34A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(22,163,74,0.3)", paddingBottom: 6 }}>{"כיתה א'"}</div>
          {classA.map((v, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                <span>תלמיד {i + 1}</span>
                <span style={{ color: "#16A34A", fontWeight: 700 }}>{v}{bonus > 0 ? ` (+${bonus})` : ""}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={v} onChange={e => setA(i, +e.target.value)} style={{ width: "100%", accentColor: "#16A34A" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid rgba(59,130,246,0.3)", paddingBottom: 6 }}>{"כיתה ב'"}</div>
          {classB.map((v, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                <span>תלמיד {i + 1}</span>
                <span style={{ color: "#3b82f6", fontWeight: 700 }}>{v}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={v} onChange={e => setB(i, +e.target.value)} style={{ width: "100%", accentColor: "#3b82f6" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Bonus slider */}
      <div style={{ marginBottom: "2rem", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", borderRadius: 16, border: "1px solid rgba(244,63,94,0.2)", padding: "1rem 1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          <span>{"בונוס לכיתה א'"}</span>
          <span style={{ color: "#f43f5e", fontWeight: 700 }}>+{bonus}</span>
        </div>
        <input type="range" min={0} max={10} step={1} value={bonus} onChange={e => setBonus(+e.target.value)} style={{ width: "100%", accentColor: "#f43f5e" }} />
      </div>

      {/* SVG: Side-by-side bar charts */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(244,63,94,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(244,63,94,0.08)" }}>
        <svg viewBox={`0 0 ${totalW} ${chartH + padT + 30}`} style={{ width: "100%", display: "block" }} aria-hidden>
          {/* Class A label */}
          <text x={padL + groupW / 2} y={18} fontSize={11} fill="#16A34A" fontWeight={700} textAnchor="middle">{"כיתה א'"}{bonus > 0 ? ` (+${bonus})` : ""}</text>
          {/* Class A bars */}
          {classABonused.map((v, i) => {
            const h = Math.min((v / maxVal) * chartH, chartH);
            const x = padL + i * (barW + gap) + gap;
            const y = padT + chartH - h;
            return <rect key={i} x={x} y={y} width={barW} height={h} rx={3} fill="#16A34A" opacity={0.6} />;
          })}
          <line x1={padL} y1={padT + chartH} x2={padL + groupW} y2={padT + chartH} stroke="#94a3b8" strokeWidth={1} />

          {/* Class B label */}
          <text x={padL + groupW + 40 + groupW / 2} y={18} fontSize={11} fill="#3b82f6" fontWeight={700} textAnchor="middle">{"כיתה ב'"}</text>
          {/* Class B bars */}
          {classB.map((v, i) => {
            const h = (v / maxVal) * chartH;
            const x = padL + groupW + 40 + i * (barW + gap) + gap;
            const y = padT + chartH - h;
            return <rect key={i} x={x} y={y} width={barW} height={h} rx={3} fill="#3b82f6" opacity={0.6} />;
          })}
          <line x1={padL + groupW + 40} y1={padT + chartH} x2={padL + groupW + 40 + groupW} y2={padT + chartH} stroke="#94a3b8" strokeWidth={1} />
        </svg>
      </div>

      {/* Stats comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Class A stats */}
        <div style={{ borderRadius: 16, border: "1px solid rgba(22,163,74,0.35)", background: "rgba(22,163,74,0.04)", padding: "1rem" }}>
          <div style={{ color: "#16A34A", fontSize: 11, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>{"כיתה א'"}{bonus > 0 ? ` (+${bonus})` : ""}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "ממוצע", val: statsA.mean.toFixed(1) },
              { label: "חציון", val: statsA.median.toFixed(1) },
              { label: "שכיח", val: statsA.modeStr },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>{r.label}</span>
                <span style={{ color: "#16A34A", fontWeight: 700, fontFamily: "monospace" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Class B stats */}
        <div style={{ borderRadius: 16, border: "1px solid rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.04)", padding: "1rem" }}>
          <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>{"כיתה ב'"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "ממוצע", val: statsB.mean.toFixed(1) },
              { label: "חציון", val: statsB.median.toFixed(1) },
              { label: "שכיח", val: statsB.modeStr },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>{r.label}</span>
                <span style={{ color: "#3b82f6", fontWeight: 700, fontFamily: "monospace" }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Grade label map for dynamic prompt injection
const GRADE_MAP: Record<string, string> = { "10": "י׳", "11": 'י"א', "12": 'י"ב' };

function injectGrade(text: string, grade: string): string {
  const label = GRADE_MAP[grade] || "י׳";
  return text.replace(/כיתה י['׳]/g, `כיתה ${label}`);
}

export default function CentralTendencyPage() {
  const [selectedLevel, setSelectedLevel] = useState<"basic" | "medium" | "advanced">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("math-progress:central-level");
      if (saved === "basic" || saved === "medium" || saved === "advanced") return saved;
    }
    return "basic";
  });

  // Read saved grade for dynamic prompts
  const [userGrade, setUserGrade] = useState("10");
  useEffect(() => {
    const g = localStorage.getItem("math-grade");
    if (g) setUserGrade(g);
  }, []);

  const handleLevelChange = (level: "basic" | "medium" | "advanced") => {
    setSelectedLevel(level);
    try { localStorage.setItem("math-progress:central-level", level); } catch {}
  };

  const ex = exercises.find(e => e.id === selectedLevel)!;
  // Inject saved grade into golden prompt
  const dynamicEx = { ...ex, goldenPrompt: injectGrade(ex.goldenPrompt, userGrade) };
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
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>📊 מדדי מרכז</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>ממוצע, חציון ושכיח — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/"
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

        {/* Sub-topic progress bar */}
        <SubtopicProgress subtopicId="grade10/statistics/central" />

        {/* Level Selector */}
        <div className="flex gap-1 rounded-xl p-1 mb-8" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(60,54,42,0.15)" }}>
          {TABS.map(tab => {
            const active = selectedLevel === tab.id;
            return (
              <button key={tab.id} onClick={() => handleLevelChange(tab.id as typeof selectedLevel)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${active ? `${tab.bg} border ${tab.border} ${tab.textColor}` : "text-stone-500 hover:text-stone-800"}`}
                style={active ? { boxShadow: `0 0 14px ${tab.glowColor}` } : undefined}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active card */}
        <motion.div key={selectedLevel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <ExerciseCard ex={dynamicEx} />
        </motion.div>

        {/* Lab — each level gets its own lab */}
        {selectedLevel === "basic" && <BarChartLab />}
        {selectedLevel === "medium" && <MissingScoreLab />}
        {selectedLevel === "advanced" && <DistributionLab />}

        {/* Mark as complete button */}
        <div style={{ marginTop: "1.5rem" }}>
          <MarkComplete subtopicId="grade10/statistics/central" level={selectedLevel} />
        </div>

      </div>
    </main>
  );
}
