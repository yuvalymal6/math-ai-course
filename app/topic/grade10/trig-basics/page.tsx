"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Copy, CheckCircle } from "lucide-react";
import Link from "next/link";
import { calculatePromptScore, type ScoreResult } from "@/app/lib/prompt-scorer";
import MasterPromptGate from "@/app/components/MasterPromptGate";
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
  return <div><GoldenPromptCard prompt={goldenPrompt} title="פרומפט ראשי" glowRgb={glowRgb} borderRgb={borderRgb} />{steps.map((s, i) => <TutorStepBasic key={i} step={s} glowRgb={glowRgb} borderRgb={borderRgb} />)}</div>;
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
  const [stepsPassed, setStepsPassed] = useState<boolean[]>(Array(steps.length).fill(false));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MasterPromptGate
        onPass={() => setMasterPassed(true)}
        accentColor="#059669"
        accentRgb="5,150,105"
        requiredPhrase="סרוק נתונים ועצור"
        subjectWords={["סינוס", "קוסינוס", "טנגנס", "sin", "cos", "tan", "זווית", "יתר", "ניצב", "משולש", "גובה", "שטח", "טריגונומטריה"]}
        subjectHint="סינוס / קוסינוס / טנגנס / זווית / משולש / גובה / שטח"
      />

      {masterPassed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {steps.map((s, i) => (
            <TutorStepAdvanced
              key={i} step={s}
              locked={i > 0 && !stepsPassed[i - 1]}
              onPass={() => setStepsPassed(prev => { const next = [...prev]; next[i] = true; return next; })}
            />
          ))}
          <button onClick={() => { setMasterPassed(false); setStepsPassed(Array(steps.length).fill(false)); }} style={{ fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: 8 }}>
            התחל מחדש
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── SVG Diagrams ─────────────────────────────────────────────────────────────

function BasicDiagram() {
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-[260px] mx-auto" aria-hidden>
      {/* A(30,190) B(230,190) C(230,50) */}
      <polygon points="30,190 230,190 230,50" fill="rgba(99,102,241,0.04)" stroke="#334155" strokeWidth="2" />
      {/* Right angle at B */}
      <polyline points="215,190 215,175 230,175" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Angle arc at A — larger radius so 40° fits inside */}
      <path d="M 70,190 A 40,40 0 0,0 58,164" fill="none" stroke="#6366f1" strokeWidth="2.5" />
      {/* 40° label — NO α symbol, just the number, inside the arc */}
      <text x="78" y="176" fontSize="13" fill="#6366f1" fontWeight="700">40°</text>
      {/* BC = x */}
      <text x="242" y="125" fontSize="16" fill="#6366f1" fontWeight="700">x</text>
      {/* AB */}
      <text x="125" y="210" fontSize="13" fill="#10b981" fontWeight="700" textAnchor="middle">AB</text>
      {/* AC */}
      <text x="110" y="108" fontSize="13" fill="#f59e0b" fontWeight="700" textAnchor="middle">AC</text>
      {/* Vertices */}
      <text x="16" y="198" fontSize="13" fill="#475569" fontWeight="700">A</text>
      <text x="232" y="206" fontSize="13" fill="#475569" fontWeight="700">B</text>
      <text x="232" y="44" fontSize="13" fill="#475569" fontWeight="700">C</text>
    </svg>
  );
}

function MediumDiagram() {
  // Right triangle: ∠B=90°, AC=20 (hypotenuse), one leg = x
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-[260px] mx-auto" aria-hidden>
      {/* A(30,190) B(230,190) C(230,50) */}
      <polygon points="30,190 230,190 230,50" fill="rgba(16,185,129,0.04)" stroke="#334155" strokeWidth="2" />
      {/* Right angle at B */}
      <polyline points="215,190 215,175 230,175" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Hypotenuse AC label */}
      <text x="110" y="108" fontSize="15" fill="#f59e0b" fontWeight="700" textAnchor="middle">20</text>
      {/* BC = x (vertical) */}
      <text x="242" y="125" fontSize="16" fill="#6366f1" fontWeight="700">x</text>
      {/* AB = ? (bottom, no number) */}
      <text x="130" y="210" fontSize="13" fill="#10b981" fontWeight="600" textAnchor="middle">?</text>
      {/* S = 80 indicator */}
      <text x="170" y="165" fontSize="11" fill="#94a3b8" fontWeight="600">S = 80</text>
      {/* Vertices */}
      <text x="16" y="198" fontSize="13" fill="#475569" fontWeight="700">A</text>
      <text x="232" y="206" fontSize="13" fill="#475569" fontWeight="700">B</text>
      <text x="232" y="44" fontSize="13" fill="#475569" fontWeight="700">C</text>
    </svg>
  );
}

function AdvancedDiagram() {
  // 30-60-90 triangle: AC=k (hypotenuse), BC=0.5k (shorter leg)
  return (
    <svg viewBox="0 0 280 220" className="w-full max-w-[260px] mx-auto" aria-hidden>
      {/* A(30,190) B(230,190) C(230,70) — right angle at B */}
      <polygon points="30,190 230,190 230,70" fill="rgba(220,38,38,0.04)" stroke="#334155" strokeWidth="2" />
      {/* Right angle at B */}
      <polyline points="215,190 215,175 230,175" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Angle α at A */}
      <path d="M 62,190 A 32,32 0 0,0 55,170" fill="none" stroke="#DC2626" strokeWidth="2.5" />
      <text x="68" y="178" fontSize="13" fill="#DC2626" fontWeight="700" fontStyle="italic">α</text>
      {/* Angle β at C */}
      <path d="M 230,88 A 18,18 0 0,0 218,72" fill="none" stroke="#a78bfa" strokeWidth="2" />
      <text x="208" y="82" fontSize="12" fill="#a78bfa" fontWeight="700" fontStyle="italic">β</text>
      {/* AC = k (hypotenuse) */}
      <text x="110" y="118" fontSize="15" fill="#f59e0b" fontWeight="700" textAnchor="middle" fontStyle="italic">k</text>
      {/* BC = 0.5k (vertical) */}
      <text x="244" y="135" fontSize="13" fill="#6366f1" fontWeight="700">0.5k</text>
      {/* AB = ? (bottom) */}
      <text x="130" y="210" fontSize="13" fill="#10b981" fontWeight="600" textAnchor="middle">?</text>
      {/* Vertices */}
      <text x="16" y="198" fontSize="13" fill="#475569" fontWeight="700">A</text>
      <text x="232" y="206" fontSize="13" fill="#475569" fontWeight="700">B</text>
      <text x="232" y="64" fontSize="13" fill="#475569" fontWeight="700">C</text>
    </svg>
  );
}

// ─── Exercise Data ────────────────────────────────────────────────────────────

const exercises: ExerciseDef[] = [
  {
    id: "basic",
    title: "משולש אלגברי עם טריגונומטריה",
    problem: "במשולש ישר זווית ABC (∠B = 90°), נתון כי הזווית α (∠BAC) היא בת 40°.\nאורך הניצב BC (הניצב מול הזווית) מסומן ב-x.\n\nא. הבע באמצעות x את אורך היתר AC ואת אורך הניצב השני AB.\nב. נתון כי שטח המשולש הוא 50 סמ\"ר. בנה משוואה מתאימה, מצא את ערכו של x וחשב את כל צלעות המשולש (דייק עד 2 ספרות).\nג. מצא את גודל הזווית החדה השנייה ∠C.",
    diagram: <BasicDiagram />,
    pitfalls: [
      { title: "⚠️ הפונקציה הנכונה", text: "רגע לפני שבוחרים sin או cos — בדקו: האם הניצב שאנחנו מחפשים נמצא מול הזווית או לידה? בחירה נכונה של היחס (כמו tan במקרה שלנו) היא חצי מהפתרון." },
      { title: "💡 מ-x² חזרה ל-x", text: "כשמציבים x בנוסחת השטח, זכרו ש-x · x הופך ל-x². כדי \"לחזור\" ל-x בסוף התהליך, נצטרך להשתמש בפעולת השורש הריבועי." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד כיתה י׳, צירפתי לך תרגיל טריגונומטריה אלגברי על משולש ישר-זווית.\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n1️⃣ סריקה:\nתסרוק את הנתונים ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה להוראות לשלב א'."\n(אל תפתור כלום בשלב הזה!)\n2️⃣ תפקיד:\nאתה מנטור מתמטי תומך. המשימה שלך היא להנחות את האינטואיציה של התלמיד דרך שאלות, לא לפתור עבורו. במקום לתת תשובה, שאל את התלמיד לזהות את הקשר בין הזווית הנתונה לצלעות, וודא שהוא מבין את ה"למה" מאחורי הביטוי האלגברי.\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ביטוי אלגברי לצלעות המשולש", coaching: "", prompt: "תדריך אותי לבטא את צלעות המשולש האחרות באמצעות x.", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "tan", "יתר", "ניצב", "זווית", "40", "x", "ביטוי"] },
      { phase: "סעיף ב׳", label: "מציאת הצלעות", coaching: "", prompt: "נתון כי השטח הוא 50. כיצד נמצא את x ונחשב את אורכי צלעות המשולש?", keywords: [], keywordHint: "", contextWords: ["שטח", "משוואה", "x²", "שורש", "50", "tan", "הצבה"] },
      { phase: "סעיף ג׳", label: "הזווית השנייה ∠C", coaching: "", prompt: "תסביר לי איך נחשב את זווית C.", keywords: [], keywordHint: "", contextWords: ["180", "90", "40", "50", "סכום", "זוויות", "משלימה"] },
    ],
  },
  {
    id: "medium",
    title: "שטח ופיתגורס",
    problem: "במשולש ישר זווית ABC (∠B = 90°), אורך היתר AC הוא 20 ס\"מ ושטח המשולש הוא 80 סמ\"ר.\n\nא. סמנו את אחד הניצבים ב-x. הביעו באמצעות x ושטח המשולש את הניצב השני.\nב. באמצעות משפט פיתגורס, בנו משוואה ומצאו את אורכי שני הניצבים (הציגו את שלבי פתרון המשוואה הריבועית).\nג. חשבו את גודלן של שתי הזוויות החדות במשולש באמצעות פונקציות טריגונומטריות.",
    diagram: <MediumDiagram />,
    pitfalls: [
      { title: "⚠️ שכחת הריבוע", text: "תלמידים מרבים לשכוח להעלות בריבוע את הביטוי של הניצב השני בתוך משפט פיתגורס. אם y = 160/x, אז y² = (160/x)² = 25600/x²." },
      { title: "💡 בידוד הניצב השני", text: "וודאו שבודדתם את הניצב השני נכון מנוסחת השטח: 80 = (x · y) / 2, כלומר y = 160/x." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד כיתה י׳, צירפתי לך תרגיל על משולש ישר-זווית עם שטח ופיתגורס.\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n1️⃣ סריקה:\nתסרוק את הנתונים ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה להוראות לשלב א'."\n(אל תפתור כלום בשלב הזה!)\n2️⃣ תפקיד:\nאתה המורה שלי. עודד אותי לקשר את נוסחת השטח למשפט פיתגורס: x² + (160/x)² = 20².\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה תגיב אך ורק: ״אני מוכן להמשיך.״`,
    steps: [
      { phase: "סעיף א׳", label: "ביטוי הניצב השני", coaching: "", prompt: "זכרו ששטח משולש ישר זווית הוא מכפלת הניצבים חלקי 2. אם ניצב אחד הוא x, מה הניצב השני?", keywords: [], keywordHint: "", contextWords: ["שטח", "ניצב", "80", "160", "x", "חלקי", "מכפלה"] },
      { phase: "סעיף ב׳", label: "משוואת פיתגורס", coaching: "", prompt: "אחרי שתציבו את הביטויים במשפט פיתגורס, תקבלו משוואה דו-ריבועית. סמנו t = x² כדי להקל על הפתרון.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "משוואה", "t", "x²", "20", "400", "ריבועית", "שורש"] },
      { phase: "סעיף ג׳", label: "הזוויות החדות", coaching: "", prompt: "השתמשו ב-sin או tan כדי למצוא את הזוויות. אם ידועים שני ניצבים ויתר, איזו פונקציה הכי נוחה?", keywords: [], keywordHint: "", contextWords: ["sin", "cos", "tan", "arctan", "זווית", "חדה", "ניצב", "יתר"] },
    ],
  },
  {
    id: "advanced",
    title: "פרמטרים ויחסים — המשולש המיוחד",
    problem: "נתון משולש ישר זווית ABC (∠B = 90°) שבו אורך היתר AC הוא k ס\"מ, ואחד הניצבים (BC) שווה למחצית היתר, כלומר BC = 0.5k.\n\nא. הוכחה: ללא שימוש במחשבון, הוכח מהן זוויות המשולש (רמז: איזה יחס טריגונומטרי נותן חצי?).\nב. הבע את שטח המשולש באמצעות הפרמטר k בלבד.\nג. חשב את היחס בין הניצב הקצר לניצב הארוך. השאר את תשובתך עם שורש.",
    diagram: <AdvancedDiagram />,
    pitfalls: [
      { title: "⚠️ פחד מפרמטרים", text: "תלמידים נבהלים מ-k. הוא מתנהג בדיוק כמו מספר — אם מצמצמים k/k, מקבלים 1. אם מעלים בריבוע (0.5k)², מקבלים 0.25k²." },
      { title: "💡 דיוק בשורשים", text: "נטייה להפוך √3/2 למספר עשרוני. בבגרות ב-5 יחידות שומרים על הערך המדויק. AB = (√3/2)k — זה התשובה הסופית." },
    ],
    goldenPrompt: `\nהיי, אני תלמיד כיתה י׳, צירפתי לך תרגיל על משולש ישר-זווית מיוחד עם פרמטר k.\nהנה הפרוטוקול שלנו, תעבוד לפיו ב-100%:\n1️⃣ סריקה:\nתסרוק את הנתונים ותכתוב לי רק:\n"זיהיתי את הנתונים. מחכה להוראות לשלב א'."\n2️⃣ תפקיד:\nאתה המורה שלי. עודד אותי לזהות שזה משולש 30-60-90.\n3️⃣ שיטת עבודה:\nאל תמהר, תסביר לי על כל שלב. בסיום הסריקה תגיב אך ורק: ״אני מוכן להמשיך.״`,
    advancedGateQuestion: "לפני שמתחילים — כתוב פרומפט שמסביר: מהו משולש 30-60-90? מהם היחסים בין צלעותיו? כיצד מזהים אותו מתוך נתונים? (לפחות 80 תווים)",
    steps: [
      { phase: "סעיף א׳", label: "הוכחת הזוויות", coaching: "", prompt: "אם sin(α) = 0.5k/k = 0.5, מה זה אומר על הזווית α? איזו זווית מוכרת יש לה סינוס שווה ל-0.5?", keywords: [], keywordHint: "", contextWords: ["sin", "30", "0.5", "חצי", "מיוחד", "זווית", "הוכחה"] },
      { phase: "סעיף ב׳", label: "שטח עם פרמטר k", coaching: "", prompt: "השתמשו בפיתגורס כדי למצוא את הניצב השני: √(k² - (0.5k)²). אחר כך הציבו בנוסחת שטח.", keywords: [], keywordHint: "", contextWords: ["פיתגורס", "שורש", "k", "שטח", "0.25", "0.75", "√3"] },
      { phase: "סעיף ג׳", label: "יחס הניצבים", coaching: "", prompt: "חשבו: מהו (0.5k) חלקי ((√3/2)k)? מה קורה כש-k מצטמצם?", keywords: [], keywordHint: "", contextWords: ["יחס", "צמצום", "k", "שורש", "√3", "1/√3"] },
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

      {/* Formula bar — trig (modern card layout) */}
      <div className="formula-bar font-sans" style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "rgba(255,255,255,0.78)", padding: "1.5rem 1.25rem", marginBottom: "2.5rem", boxShadow: "0 4px 20px rgba(0,212,255,0.08)" }}>
        <h3 style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 20, marginTop: 0, textAlign: "center", lineHeight: 1.4 }}>נוסחאות טריגונומטריה</h3>

        {/* Triangle + Legend side-by-side, legend vertically centered */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 mb-6">
          {/* Clean SVG — labels tight to their sides */}
          <svg viewBox="0 0 185 155" className="w-full max-w-[170px] sm:max-w-[195px] shrink-0" aria-label="Right triangle">
            {/* A(20,130) B(160,130) C(160,20) */}
            <polygon points="20,130 160,130 160,20" fill="rgba(99,102,241,0.03)" stroke="#334155" strokeWidth="2" />
            {/* Right angle marker at B */}
            <polyline points="145,130 145,115 160,115" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Angle arc α at A */}
            <path d="M 48,130 A 28,28 0 0,0 37,115" fill="none" stroke="#6366f1" strokeWidth="2.5" />
            <text x="52" y="120" fontSize="14" fill="#6366f1" fontWeight="700" fontStyle="italic">α</text>
            {/* a: tight to BC vertical, centered at midpoint y=75 */}
            <text x="170" y="79" fontSize="14" fill="#6366f1" fontWeight="700" textAnchor="start">a</text>
            {/* b: centered under AB, midpoint x=90 */}
            <text x="90" y="147" fontSize="14" fill="#10b981" fontWeight="700" textAnchor="middle">b</text>
            {/* c: above midpoint of AC diagonal, offset up-left */}
            <text x="80" y="68" fontSize="14" fill="#f59e0b" fontWeight="700" textAnchor="middle">c</text>
            {/* Vertices — outside triangle corners */}
            <text x="10" y="142" fontSize="11" fill="#475569" fontWeight="600">A</text>
            <text x="163" y="142" fontSize="11" fill="#475569" fontWeight="600">B</text>
            <text x="163" y="16" fontSize="11" fill="#475569" fontWeight="600">C</text>
          </svg>

          {/* Hebrew legend — vertically centered with triangle */}
          <div className="flex flex-row sm:flex-col gap-3 sm:gap-3" style={{ direction: "rtl" }}>
            {[
              { letter: "a", label: "ניצב מול", bg: "#6366f1", text: "white" },
              { letter: "b", label: "ניצב ליד", bg: "#10b981", text: "white" },
              { letter: "c", label: "יתר", bg: "#f59e0b", text: "white" },
              { letter: "α", label: "זווית", bg: "rgba(99,102,241,0.12)", text: "#6366f1" },
            ].map(item => (
              <div key={item.letter} className="flex items-center gap-2.5">
                <span
                  className="shrink-0 rounded-md text-[11px] font-bold"
                  style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: item.bg, color: item.text, fontStyle: item.letter === "α" ? "italic" : "normal" }}
                >
                  {item.letter}
                </span>
                <span className="text-slate-600 text-[13px] font-medium leading-normal">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trig function cards — 3-col grid on desktop, stacked on mobile */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* Sin card */}
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#6366f1", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Sin — סינוס</div>
            <div style={{ color: "#6366f1", margin: "4px 0" }}><TexBlock>{String.raw`\sin \alpha = \frac{a}{c}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב מול / יתר</div>
          </div>
          {/* Cos card */}
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#10b981", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Cos — קוסינוס</div>
            <div style={{ color: "#10b981", margin: "4px 0" }}><TexBlock>{String.raw`\cos \alpha = \frac{b}{c}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב ליד / יתר</div>
          </div>
          {/* Tan card */}
          <div style={{ borderRadius: 14, border: "1.5px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)", padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>Tan — טנגנס</div>
            <div style={{ color: "#f59e0b", margin: "4px 0" }}><TexBlock>{String.raw`\tan \alpha = \frac{a}{b}`}</TexBlock></div>
            <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginTop: 2 }}>ניצב מול / ניצב ליד</div>
          </div>
        </div>

        {/* Area formula — full width */}
        <div style={{ borderRadius: 12, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.04)", padding: "14px 12px", textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>שטח משולש (שתי צלעות וזווית)</div>
          <div style={{ color: "#00d4ff" }}><TexBlock>{String.raw`S = \tfrac{1}{2} \cdot a \cdot b \cdot \sin C`}</TexBlock></div>
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
        {ex.id === "advanced" && <LadderAdvanced steps={ex.steps} />}
      </div>

    </section>
  );
}

// ─── Lab 1: AlgebraicTrigLab (Basic) ──────────────────────────────────────────

function LadderLab() {
  const [x, setX] = useState(10);
  const [angleA, setAngleA] = useState(40);
  const alphaRad = (angleA * Math.PI) / 180;

  const AB = x / Math.tan(alphaRad);
  const AC = x / Math.sin(alphaRad);
  const area = (AB * x) / 2;
  const angleC = 90 - angleA;

  // Clean SVG — no numerical labels on diagram
  const maxW = 280, maxH = 220;
  const sc = Math.min((maxW - 80) / Math.max(AB, 1), (maxH - 50) / Math.max(x, 1), 8);
  const ptA = { x: 40, y: maxH - 20 };
  const ptB = { x: 40 + AB * sc, y: maxH - 20 };
  const ptC = { x: ptB.x, y: maxH - 20 - x * sc };

  return (
    <section style={{ border: "1px solid rgba(0,212,255,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המשולש האלגברי</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את x ואת הזווית — צפו כיצד הצלעות משתנות בזמן אמת.</p>

      {/* Dual sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "2rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>ניצב x (BC)</span>
            <span style={{ color: "#6366f1", fontWeight: 700 }}>{x}</span>
          </div>
          <input type="range" min={5} max={20} step={0.5} value={x} onChange={e => setX(+e.target.value)} style={{ width: "100%", accentColor: "#6366f1" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
            <span>זווית A</span>
            <span style={{ color: "#DC2626", fontWeight: 700 }}>{angleA}°</span>
          </div>
          <input type="range" min={10} max={80} step={1} value={angleA} onChange={e => setAngleA(+e.target.value)} style={{ width: "100%", accentColor: "#DC2626" }} />
        </div>
      </div>

      {/* Clean SVG — no labels on sides, just shape + vertices */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(0,212,255,0.08)" }}>
        <svg viewBox={`0 0 ${maxW} ${maxH}`} style={{ width: "100%", display: "block" }} aria-hidden>
          <polygon points={`${ptA.x},${ptA.y} ${ptB.x},${ptB.y} ${ptC.x},${ptC.y}`} fill="rgba(99,102,241,0.04)" stroke="#334155" strokeWidth="2" />
          <polyline points={`${ptB.x - 10},${ptB.y} ${ptB.x - 10},${ptB.y - 10} ${ptB.x},${ptB.y - 10}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Vertices only */}
          <text x={ptA.x - 14} y={ptA.y + 4} fontSize="12" fill="#475569" fontWeight="600">A</text>
          <text x={ptB.x + 4} y={ptB.y + 16} fontSize="12" fill="#475569" fontWeight="600">B</text>
          <text x={ptC.x + 4} y={ptC.y - 6} fontSize="12" fill="#475569" fontWeight="600">C</text>
        </svg>
      </div>

      {/* Data display below */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, textAlign: "center" }}>
        {[
          { label: "BC (x)", val: x.toFixed(1), color: "#6366f1" },
          { label: "AB", val: AB.toFixed(2), color: "#10b981" },
          { label: "AC (יתר)", val: AC.toFixed(2), color: "#f59e0b" },
          { label: "שטח S", val: area.toFixed(1), color: "#00d4ff" },
          { label: "∠A", val: `${angleA}°`, color: "#DC2626" },
          { label: "∠C", val: `${angleC}°`, color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 14, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.25)", padding: "12px 8px", boxShadow: "0 2px 8px rgba(60,54,42,0.04)" }}>
            <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 5 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Lab 2: AreaPythagorasLab (Medium) ────────────────────────────────────────

function TowerLab() {
  const hyp = 20;
  const [area, setArea] = useState(80);
  const maxArea = (hyp * hyp) / 4; // 100 — isosceles maximum

  // Solve: a*b = 2*S, a² + b² = hyp²
  const sum2 = hyp * hyp + 4 * area;
  const diff2 = hyp * hyp - 4 * area;
  const canSolve = diff2 >= 0;
  const aPlusB = Math.sqrt(sum2);
  const aMinusB = canSolve ? Math.sqrt(diff2) : 0;
  const legA = (aPlusB + aMinusB) / 2;
  const legB = (aPlusB - aMinusB) / 2;
  const angleA = canSolve ? Math.atan2(legA, legB) * (180 / Math.PI) : 45;
  const angleC = 90 - angleA;

  const maxW = 280, maxH = 220;
  const scale = canSolve ? Math.min((maxW - 80) / Math.max(legB, 1), (maxH - 50) / Math.max(legA, 1), 10) : 5;
  const ptA = { x: 40, y: maxH - 20 };
  const ptB = { x: 40 + (canSolve ? legB : 10) * scale, y: maxH - 20 };
  const ptC = { x: ptB.x, y: maxH - 20 - (canSolve ? legA : 10) * scale };

  return (
    <section style={{ border: "1px solid rgba(0,212,255,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת שטח ופיתגורס</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את השטח (יתר קבוע = 20) וצפו כיצד צורת המשולש משתנה.</p>

      {/* Slider */}
      <div style={{ marginBottom: "2rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
          <span>שטח המשולש S</span>
          <span style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>{area} סמ&quot;ר</span>
        </div>
        <input type="range" min={40} max={maxArea} step={1} value={area} onChange={e => setArea(+e.target.value)} style={{ width: "100%", accentColor: "#10b981" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
          <span>משולש צר</span>
          <span>שווה שוקיים (מקסימום)</span>
        </div>
      </div>

      {/* Dynamic SVG */}
      {canSolve && (
        <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(0,212,255,0.08)" }}>
          <svg viewBox={`0 0 ${maxW} ${maxH}`} style={{ width: "100%", display: "block" }} aria-hidden>
            <polygon points={`${ptA.x},${ptA.y} ${ptB.x},${ptB.y} ${ptC.x},${ptC.y}`} fill="rgba(16,185,129,0.04)" stroke="#334155" strokeWidth="2" />
            <polyline points={`${ptB.x - 10},${ptB.y} ${ptB.x - 10},${ptB.y - 10} ${ptB.x},${ptB.y - 10}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            <text x={ptB.x + 8} y={(ptB.y + ptC.y) / 2 + 4} fontSize="13" fill="#6366f1" fontWeight="700">{legA.toFixed(1)}</text>
            <text x={(ptA.x + ptB.x) / 2} y={ptA.y + 16} fontSize="13" fill="#10b981" fontWeight="700" textAnchor="middle">{legB.toFixed(1)}</text>
            <text x={(ptA.x + ptC.x) / 2 - 12} y={(ptA.y + ptC.y) / 2 - 6} fontSize="13" fill="#f59e0b" fontWeight="700">20</text>
            <text x={ptA.x - 12} y={ptA.y + 4} fontSize="11" fill="#475569" fontWeight="600">A</text>
            <text x={ptB.x + 4} y={ptB.y + 16} fontSize="11" fill="#475569" fontWeight="600">B</text>
            <text x={ptC.x + 4} y={ptC.y - 6} fontSize="11" fill="#475569" fontWeight="600">C</text>
          </svg>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, textAlign: "center" }}>
        {[
          { label: "ניצב 1", val: canSolve ? legA.toFixed(2) : "—", color: "#6366f1" },
          { label: "ניצב 2", val: canSolve ? legB.toFixed(2) : "—", color: "#10b981" },
          { label: "יתר", val: "20", color: "#f59e0b" },
          { label: "∠A", val: canSolve ? angleA.toFixed(1) + "°" : "—", color: "#00d4ff" },
          { label: "∠C", val: canSolve ? angleC.toFixed(1) + "°" : "—", color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 14, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.25)", padding: "14px 8px", boxShadow: "0 2px 8px rgba(60,54,42,0.04)" }}>
            <div style={{ color: "#6B7280", fontSize: 10, fontWeight: 600, marginBottom: 6 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
      {area >= maxArea - 1 && (
        <p style={{ textAlign: "center", color: "#10b981", fontSize: 12, fontWeight: 600, marginTop: 12 }}>משולש שווה שוקיים — השטח המקסימלי!</p>
      )}
    </section>
  );
}

// ─── Lab 3: SpecialTriangleLab (Advanced) ─────────────────────────────────────

function TriangleLab() {
  const [k, setK] = useState(20);

  // 30-60-90 triangle: hyp = k, short leg = 0.5k, long leg = (√3/2)k
  const shortLeg = 0.5 * k;
  const longLeg = (Math.sqrt(3) / 2) * k;
  const area = (shortLeg * longLeg) / 2; // = (√3/8)k²
  const ratio = 1 / Math.sqrt(3); // short/long = 1/√3

  // SVG scaling
  const maxW = 280, maxH = 220;
  const sc = Math.min((maxW - 80) / longLeg, (maxH - 50) / shortLeg, 8);
  const ptA = { x: 40, y: maxH - 20 };
  const ptB = { x: 40 + longLeg * sc, y: maxH - 20 };
  const ptC = { x: ptB.x, y: maxH - 20 - shortLeg * sc };

  return (
    <section style={{ border: "1px solid rgba(0,212,255,0.35)", borderRadius: 24, padding: "2.5rem", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", marginLeft: "auto", marginRight: "auto", boxShadow: "0 10px 15px -3px rgba(60,54,42,0.1)", marginTop: "2rem" }}>
      <h3 style={{ color: "#2D3436", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>מעבדת המשולש המיוחד (30°-60°-90°)</h3>
      <p style={{ color: "#6B7280", fontSize: 14, textAlign: "center", marginBottom: "2rem" }}>שנו את k וצפו: הזוויות תמיד נשארות 30° ו-60°!</p>

      {/* Slider */}
      <div style={{ marginBottom: "2rem", background: "rgba(255,255,255,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.4)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(60,54,42,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
          <span>ערך k (אורך היתר)</span>
          <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 16 }}>{k}</span>
        </div>
        <input type="range" min={10} max={100} step={1} value={k} onChange={e => setK(+e.target.value)} style={{ width: "100%", accentColor: "#f59e0b" }} />
      </div>

      {/* Dynamic SVG */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(0,212,255,0.25)", background: "#fff", padding: "1rem", marginBottom: "2rem", boxShadow: "0 4px 16px rgba(0,212,255,0.08)" }}>
        <svg viewBox={`0 0 ${maxW} ${maxH}`} style={{ width: "100%", display: "block" }} aria-hidden>
          <polygon points={`${ptA.x},${ptA.y} ${ptB.x},${ptB.y} ${ptC.x},${ptC.y}`} fill="rgba(220,38,38,0.04)" stroke="#334155" strokeWidth="2" />
          <polyline points={`${ptB.x - 10},${ptB.y} ${ptB.x - 10},${ptB.y - 10} ${ptB.x},${ptB.y - 10}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Labels */}
          <text x={ptB.x + 8} y={(ptB.y + ptC.y) / 2 + 4} fontSize="12" fill="#6366f1" fontWeight="700">0.5k = {shortLeg.toFixed(1)}</text>
          <text x={(ptA.x + ptB.x) / 2} y={ptA.y + 16} fontSize="12" fill="#10b981" fontWeight="700" textAnchor="middle">(√3/2)k = {longLeg.toFixed(1)}</text>
          <text x={(ptA.x + ptC.x) / 2 - 8} y={(ptA.y + ptC.y) / 2 - 6} fontSize="13" fill="#f59e0b" fontWeight="700">k = {k}</text>
          {/* Angle labels (always 30° and 60°) */}
          <text x={ptA.x + 32} y={ptA.y - 8} fontSize="12" fill="#DC2626" fontWeight="700">30°</text>
          <text x={ptC.x - 26} y={ptC.y + 18} fontSize="12" fill="#a78bfa" fontWeight="700">60°</text>
          {/* Vertices */}
          <text x={ptA.x - 12} y={ptA.y + 4} fontSize="11" fill="#475569" fontWeight="600">A</text>
          <text x={ptB.x + 4} y={ptB.y + 16} fontSize="11" fill="#475569" fontWeight="600">B</text>
          <text x={ptC.x + 4} y={ptC.y - 6} fontSize="11" fill="#475569" fontWeight="600">C</text>
        </svg>
      </div>

      {/* Key insight banner */}
      <div style={{ borderRadius: 12, border: "1.5px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.04)", padding: "12px 14px", marginBottom: "1.5rem", textAlign: "center" }}>
        <p style={{ color: "#DC2626", fontSize: 13, fontWeight: 600, margin: 0 }}>
          לא משנה מה k — הזוויות תמיד 30° ו-60°!
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, textAlign: "center" }}>
        {[
          { label: "BC = 0.5k", val: shortLeg.toFixed(1), color: "#6366f1" },
          { label: "AB = (√3/2)k", val: longLeg.toFixed(2), color: "#10b981" },
          { label: "AC = k", val: k.toString(), color: "#f59e0b" },
          { label: "S = (√3/8)k²", val: area.toFixed(1), color: "#00d4ff" },
          { label: "BC/AB", val: `1/√3 ≈ ${ratio.toFixed(3)}`, color: "#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 14, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,212,255,0.25)", padding: "14px 8px", boxShadow: "0 2px 8px rgba(60,54,42,0.04)" }}>
            <div style={{ color: "#6B7280", fontSize: 9, fontWeight: 600, marginBottom: 6 }}>{r.label}</div>
            <div style={{ color: r.color, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{r.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrigBasicsPage() {
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
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2D3436", margin: 0 }}>📐 טריגונומטריה — יסודות</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>סינוס, קוסינוס, טנגנס ויישומים במשולשים — ואיך לשאול AI את השאלות הנכונות</p>
          </div>
          <Link
            href="/topic/grade10/trig"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px",
              background: "#4A4A4A",
              border: "1px solid #333",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A";
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem 5rem" }}>

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
        {selectedLevel === "basic" && <LadderLab />}
        {selectedLevel === "medium" && <TowerLab />}
        {selectedLevel === "advanced" && <TriangleLab />}

      </div>
    </main>
  );
}
