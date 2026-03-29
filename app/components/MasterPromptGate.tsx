"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Check, Lock, Unlock } from "lucide-react";
import {
  validateMasterPrompt,
  type MasterPromptResult,
  type MasterCluster,
} from "@/app/lib/prompt-scorer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onPass: () => void;
  knownPrompts?: string[];
  accentColor?: string;   // e.g. "#991b1b"
  accentRgb?: string;     // e.g. "153,27,27"
  subjectWords?: string[];       // override default series subject words
  subjectHint?: string;          // hint shown in the checklist
  guidanceWords?: string[];      // override default guidance words
  guidanceHint?: string;         // hint shown in the checklist
  waitWords?: string[];          // override default wait words
  waitHint?: string;             // hint shown in the checklist
  requiredPhrase?: string;       // exact string that MUST appear — blocks passing if absent
}

// ─── Cluster metadata ─────────────────────────────────────────────────────────

const CLUSTER_META: Record<MasterCluster, { icon: string; label: string; hint: string }> = {
  role:        { icon: "🎭", label: "הגדרת תפקיד",  hint: "מורה / מדריך / חונך / מנטור" },
  restriction: { icon: "🚫", label: "איסור פתרון",  hint: "אל תפתור / אל תגלה / בלי תשובה" },
  guidance:    { icon: "🧭", label: "בקשת הדרכה",   hint: "תסביר לי / תלמד אותי / בצע הדרכה מלאה" },
  subject:     { icon: "📚", label: "הגדרת נושא",   hint: "פרבולות / חקירה / פרמטרים" },
  wait:        { icon: "⏳", label: "דרישת המתנה",  hint: "תעצור בסיום כל סעיף / הסבר שלב אחר שלב" },
};

const ALL_CLUSTERS: MasterCluster[] = ["role", "restriction", "guidance", "subject", "wait"];

// ─── MasterPromptGate component ───────────────────────────────────────────────

export default function MasterPromptGate({
  onPass,
  knownPrompts = [],
  accentColor = "#7c3aed",
  accentRgb = "124,58,237",
  subjectWords,
  subjectHint,
  guidanceWords,
  guidanceHint,
  waitWords,
  waitHint,
  requiredPhrase,
}: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<MasterPromptResult | null>(null);
  const [passed, setPassed] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText("\n" + text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Override cluster hints if provided
  const clusterMeta = {
    ...CLUSTER_META,
    ...(subjectHint  ? { subject:  { ...CLUSTER_META.subject,  hint: subjectHint  } } : {}),
    ...(guidanceHint ? { guidance: { ...CLUSTER_META.guidance, hint: guidanceHint } } : {}),
    ...(waitHint     ? { wait:     { ...CLUSTER_META.wait,     hint: waitHint     } } : {}),
  };

  // ── All known keywords from the 5 clusters (for cheat detection) ──
  const ALL_KEYWORDS = [
    "מורה", "מדריך", "חונך", "מנטור", "עוזר", "תחנך", "מלווה", "מלמד", "מרצה", "מאמן", "יועץ", "מנחה",
    "אל תפתור", "בלי פתרון", "בלי תשובה", "אל תגלה", "אל תחשב", "בלי ספוילר", "רק רמז", "אל תענה",
    "תסביר", "הסבר", "תדריך", "תנחה", "הנחיה", "צעדים", "שלבים", "לוגיקה", "עקרון", "תכוון",
    "חכה", "תחכה", "תעצור", "עצור", "המתנה", "אל תמשיך", "תמתין",
    "סדרה", "מקבילית", "מלבן", "מרובע", "חפיפה", "הוכחה", "אלכסון", "גאומטריה",
  ];

  // Hebrew connector/function words that prove sentence structure
  const CONNECTOR_WORDS = [
    "את", "של", "בבקשה", "תבצע", "לי", "שלי", "כדי", "עבור", "על", "עם",
    "אני", "שאני", "כי", "כך", "ש", "הוא", "היא", "הם", "זה", "זו", "אם",
    "גם", "או", "אבל", "אלא", "לכן", "כאשר", "כש", "מ", "ב", "ל", "שלך",
    "רוצה", "צריך", "יכול", "מבקש", "מבקשת", "אנא", "נא",
  ];

  // ── Coherence check: detect mashed keywords / cheating attempts ──
  function checkCoherence(input: string): { valid: boolean; reason: string; score: number } {
    const trimmed = input.trim();
    if (trimmed.length < 20) return { valid: true, reason: "", score: 100 };

    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const lowerText = trimmed.toLowerCase();
    const totalChars = trimmed.replace(/\s+/g, "").length;

    // 1. Detect extremely long "words" (mashed keywords without spaces)
    //    Exception: "סרוק נתונים ועצור" is fine as a phrase
    const textWithoutAllowedPhrases = trimmed.replace(/סרוק נתונים ועצור/g, "");
    const cleanWords = textWithoutAllowedPhrases.split(/\s+/).filter(w => w.length > 0);
    const longWords = cleanWords.filter(w => w.length > 16);
    if (longWords.length > 0) {
      return { valid: false, reason: "הניסוח אינו תקין. עליך לכתוב הנחיה ברורה לסריקת נתונים.", score: 20 };
    }

    // 2. Detect very low word count relative to char count (mashed text)
    if (cleanWords.length > 0 && totalChars / cleanWords.length > 14) {
      return { valid: false, reason: "הניסוח אינו תקין. עליך לכתוב הנחיה ברורה לסריקת נתונים.", score: 20 };
    }

    // 3. Keyword density check: if >50% of words are keywords, it's keyword stuffing
    const keywordHits = words.filter(w => ALL_KEYWORDS.some(kw => w.includes(kw) || kw.includes(w))).length;
    const keywordRatio = keywordHits / words.length;
    if (words.length >= 5 && keywordRatio > 0.5) {
      return { valid: false, reason: "הניסוח אינו תקין. הפרומפט מורכב בעיקר ממילות מפתח ללא הקשר. כתוב משפטים שלמים.", score: 20 };
    }

    // 4. Connector words check: must contain at least one Hebrew connector word
    const hasConnector = CONNECTOR_WORDS.some(c => {
      const re = new RegExp(`(^|\\s)${c}(\\s|$)`, "i");
      return re.test(trimmed);
    });
    if (words.length >= 5 && !hasConnector) {
      return { valid: false, reason: "הניסוח אינו תקין. עליך לכתוב הנחיה ברורה הכוללת משפטים בעברית תקינה.", score: 20 };
    }

    // 5. No punctuation in long text (stream of keywords)
    if (words.length > 8 && !/[.!?,;:\-—–׳״]/.test(trimmed)) {
      return { valid: false, reason: "הניסוח אינו תקין. הוסף סימני פיסוק ומבנה של משפטים.", score: 20 };
    }

    return { valid: true, reason: "", score: 100 };
  }

  // Live checks while typing
  const liveResult = text.trim().length > 0
    ? validateMasterPrompt(text, knownPrompts, subjectWords, guidanceWords, waitWords)
    : null;

  const phraseFound = requiredPhrase ? text.includes(requiredPhrase) : true;
  const coherence = checkCoherence(text);
  const missingClusters = liveResult?.clustersMissing ?? ALL_CLUSTERS;
  const showChecklist = missingClusters.length > 0 || !phraseFound;

  function handleCheck() {
    // Coherence check — block incoherent / cheating text with score 20
    if (!coherence.valid) {
      setResult({
        passed: false,
        isBlocked: false,
        score: coherence.score,
        clustersPassed: liveResult?.clustersPassed ?? [],
        clustersMissing: liveResult?.clustersMissing ?? ALL_CLUSTERS,
        hint: coherence.reason,
      });
      return;
    }

    const r = validateMasterPrompt(text, knownPrompts, subjectWords, guidanceWords, waitWords);
    // Soft cap: if required phrase is missing, cap score at 75 (below 85 pass threshold)
    if (requiredPhrase && !text.includes(requiredPhrase)) {
      const cappedScore = Math.min(r.score, 75);
      setResult({
        ...r,
        passed: false,
        score: cappedScore,
        hint: `הציון המקסימלי ללא סריקת נתונים הוא 75. הוסף את המשפט: "${requiredPhrase}"`,
      });
      return;
    }
    setResult(r);
    if (r.passed) {
      setPassed(true);
      onPass();
    }
  }

  // ── Collapsed success state ──
  if (passed) {
    return (
      <div
        style={{
          borderRadius: 16, marginBottom: 18,
          background: "rgba(220,252,231,1)",
          border: "2px solid #16a34a",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px" }}>
          <CheckCircle2 size={18} color="#16a34a" />
          <span style={{ color: "#14532d", fontWeight: 700, fontSize: 13, flex: 1 }}>
            ✅ פרומפט המאסטר אושר (5/5 אשכולות) — הרמה המתקדמת פתוחה!
          </span>
          <button
            onClick={handleCopy}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 10, cursor: "pointer",
              background: copied ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.7)",
              border: "1.5px solid rgba(22,163,74,0.5)",
              color: "#14532d", fontSize: 12, fontWeight: 600,
              whiteSpace: "nowrap", transition: "all 0.2s",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "הועתק!" : "העתק פרומפט"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 20,
        border: `2px solid rgba(${accentRgb},0.45)`,
        background: "rgba(255,255,255,0.9)",
        padding: "1.5rem",
        marginBottom: 20,
        boxShadow: `0 0 20px rgba(${accentRgb},0.08)`,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Lock size={18} color={accentColor} />
        <div>
          <p style={{ color: accentColor, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
            🛡️ שלב 0 — פרומפט המאסטר
          </p>
          <p style={{ color: "#6B7280", fontSize: 12, margin: "3px 0 0", lineHeight: 1.5 }}>
            לפני שמתחילים, כתוב הנחיה לבינה מלאכותית שתגדיר אותה כמורה שלך.
          </p>
        </div>
      </div>

      {/* ── Checklist (live) ── */}
      {showChecklist && (
        <div
          style={{
            borderRadius: 12,
            background: "rgba(255,255,255,0.75)",
            border: `1px solid rgba(${accentRgb},0.2)`,
            padding: "10px 14px",
            marginBottom: 14,
          }}
        >
          <p style={{ color: "#6B7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
            הפרומפט צריך לכלול:
          </p>

          {/* Cluster bullets */}
          {missingClusters.map((cluster) => {
            const m = clusterMeta[cluster];
            const done = liveResult?.clustersPassed.includes(cluster) ?? false;
            return (
              <p key={cluster} style={{ color: done ? "#15803d" : "#1A1A1A", fontSize: 13, lineHeight: 1.6, margin: "2px 0", fontWeight: done ? 600 : 400 }}>
                {done ? "✅" : "○"} {m.icon} {m.label} — <span style={{ color: "#6B7280" }}>{m.hint}</span>
              </p>
            );
          })}

          {/* Required phrase bullet — shown last, after all clusters */}
          {requiredPhrase && (
            <p style={{ color: phraseFound ? "#15803d" : "#1A1A1A", fontSize: 13, lineHeight: 1.6, margin: "2px 0", fontWeight: phraseFound ? 600 : 400 }}>
              {phraseFound ? "✅" : "○"} 📋 סריקת נתונים (חובה!) —{" "}
              <span style={{ color: "#6B7280" }}>&quot;סרוק נתונים ועצור&quot;</span>
            </p>
          )}

          {/* Passed clusters summary line */}
          {liveResult && liveResult.clustersPassed.length > 0 && liveResult.clustersMissing.length > 0 && (
            <p style={{ color: "#15803d", fontSize: 13, lineHeight: 1.6, margin: "4px 0 0", fontWeight: 600 }}>
              {liveResult.clustersPassed.map(c => `✅ ${clusterMeta[c].icon} ${clusterMeta[c].label}`).join("  ")}
            </p>
          )}
        </div>
      )}

      {/* ── All requirements met indicator ── */}
      {liveResult && liveResult.clustersMissing.length === 0 && phraseFound && (
        <div
          style={{
            borderRadius: 12,
            background: "rgba(220,252,231,1)",
            border: "1px solid #16a34a",
            padding: "8px 14px",
            marginBottom: 14,
          }}
        >
          <p style={{ color: "#14532d", fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
            ✅ כל הרכיבים נמצאו! לחץ &quot;בדוק&quot; כדי לאמת את הפרומפט.
          </p>
        </div>
      )}

      {/* ── Textarea ── */}
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        rows={5}
        placeholder="לדוגמה: אתה מורה מנוסה. אל תיתן לי תשובות — שאל אותי שאלות מנחות שיעזרו לי להגיע לפתרון בעצמי. סרוק נתונים ועצור..."
        style={{
          width: "100%", borderRadius: 12, resize: "none", boxSizing: "border-box",
          background: "rgba(255,255,255,0.88)",
          border: `2px solid rgba(${accentRgb},0.3)`,
          color: "#1A1A1A", fontSize: 13, lineHeight: 1.65, padding: 12,
          fontFamily: "inherit",
        }}
        dir="rtl"
      />

      {/* ── Score bar (after check) ── */}
      {result && !result.passed && !result.isBlocked && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1A1A1A", marginBottom: 4, fontWeight: 600 }}>
            <span>ניקוד: {result.score}/100 ({result.clustersPassed.length}/5 אשכולות)</span>
            <span>נדרש: 85+</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#E5E7EB", overflow: "hidden" }}>
            <div
              style={{
                height: "100%", borderRadius: 3, transition: "width 0.4s ease",
                width: `${result.score}%`,
                background: result.score >= 90 ? "#16a34a" : result.score >= 70 ? "#d97706" : "#dc2626",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Feedback message ── */}
      {result && (
        <div
          style={{
            borderRadius: 12,
            padding: "10px 14px",
            marginTop: 10,
            fontSize: 13,
            lineHeight: 1.65,
            fontWeight: 500,
            color: "#1A1A1A",
            ...(result.isBlocked
              ? { background: "rgba(254,226,226,1)", border: "2px solid #dc2626" }
              : result.passed
              ? { background: "rgba(220,252,231,1)", border: "2px solid #16a34a" }
              : { background: "rgba(255,251,235,1)", border: "2px solid #d97706" }),
          }}
          dir="rtl"
        >
          {result.hint || (result.passed ? "✅ מצוין! הפרומפט עובר את כל הדרישות." : "")}
        </div>
      )}

      {/* ── Check button ── */}
      <button
        onClick={handleCheck}
        disabled={text.trim().length < 20}
        style={{
          width: "100%", marginTop: 12, padding: "9px 0", borderRadius: 12,
          fontWeight: 700, fontSize: 13, cursor: "pointer",
          background: `rgba(${accentRgb},0.08)`,
          border: `2px solid rgba(${accentRgb},0.5)`,
          color: accentColor,
          opacity: text.trim().length < 20 ? 0.4 : 1,
          transition: "opacity 0.2s",
        }}
        aria-disabled={text.trim().length < 20}
      >
        <Unlock size={13} style={{ display: "inline", marginLeft: 6, verticalAlign: "middle" }} />
        בדוק פרומפט מאסטר
      </button>

      {/* ── Word count ── */}
      <p style={{ color: "#9CA3AF", fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>
        {text.trim().split(/\s+/).filter(w => w.length > 0).length} מילים
        {" · "}טיפ: 100+ מילים מעניקות בונוס ניקוד
      </p>
    </div>
  );
}
