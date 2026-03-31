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

// ─── Silent Pyramid SVGs ──────────────────────────────────────────────────────

// Shared oblique base for a square-base pyramid
// Base: A(60,195) B(200,195) C(238,162) D(98,162)  Apex P(149,52)
const PV = {
  A: [60,  195] as [number,number],
  B: [200, 195] as [number,number],
  C: [238, 162] as [number,number],
  D: [98,  162] as [number,number],
  P: [149,  52] as [number,number],
} as const;
type PVK = keyof typeof PV;

function PSeg({ a, b, color="#475569", w=1.5, dash }: { a:PVK; b:PVK; color?:string; w?:number; dash?:string }) {
  const [x1,y1]=PV[a],[x2,y2]=PV[b];
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeDasharray={dash}/>;
}
function PLbl({ v, t, dx=0, dy=0, color="#64748b" }: { v:PVK; t:string; dx?:number; dy?:number; color?:string }) {
  const [x,y]=PV[v];
  return <text x={x+dx} y={y+dy} fill={color} fontSize={11} textAnchor="middle">{t}</text>;
}

// Level 1 — highlight slant edge P→A (violet) and apothem midpoint→P (amber)
function PyramidSVG_L1() {
  const [mx, my] = [(PV.A[0]+PV.B[0])/2, (PV.A[1]+PV.B[1])/2]; // mid AB
  return (
    <div style={{ display:"flex", justifyContent:"center", marginBottom:"1.75rem" }}>
      <svg viewBox="30 30 230 185" style={{ width:"100%", maxWidth:280, display:"block" }} aria-hidden>
        {/* Base */}
        <PSeg a="A" b="B"/><PSeg a="B" b="C"/><PSeg a="C" b="D" dash="4 3"/><PSeg a="D" b="A" dash="4 3"/>
        {/* Lateral edges */}
        <PSeg a="P" b="A" color="#a78bfa" w={2.5}/>
        <PSeg a="P" b="B"/>
        <PSeg a="P" b="C" dash="4 3"/>
        <PSeg a="P" b="D" dash="4 3"/>
        {/* Apothem mid-AB → P (amber dashed) */}
        <line x1={mx} y1={my} x2={PV.P[0]} y2={PV.P[1]} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"/>
        <PLbl v="A" t="A" dy={13}/><PLbl v="B" t="B" dy={13}/>
        <PLbl v="C" t="C" dx={14} dy={4}/><PLbl v="D" t="D" dx={-14} dy={4}/>
        <PLbl v="P" t="P" dy={-8}/>
      </svg>
    </div>
  );
}

// Level 2 — highlight rectangular base (emerald) and height line (rose)
function PyramidSVG_L2() {
  const cx = (PV.A[0]+PV.C[0])/2, cy = (PV.A[1]+PV.C[1])/2; // base center
  return (
    <div style={{ display:"flex", justifyContent:"center", marginBottom:"1.75rem" }}>
      <svg viewBox="30 30 230 185" style={{ width:"100%", maxWidth:280, display:"block" }} aria-hidden>
        {/* Base — emerald */}
        <PSeg a="A" b="B" color="#34d399" w={2.5}/>
        <PSeg a="B" b="C" color="#34d399" w={2.5}/>
        <PSeg a="C" b="D" color="#34d399" w={2.5} dash="4 3"/>
        <PSeg a="D" b="A" color="#34d399" w={2.5} dash="4 3"/>
        {/* Lateral edges */}
        <PSeg a="P" b="A"/><PSeg a="P" b="B"/>
        <PSeg a="P" b="C" dash="4 3"/><PSeg a="P" b="D" dash="4 3"/>
        {/* Height — rose dashed */}
        <line x1={cx} y1={cy} x2={PV.P[0]} y2={PV.P[1]} stroke="#fb7185" strokeWidth={2} strokeDasharray="5 3"/>
        <circle cx={cx} cy={cy} r={3} fill="#fb7185"/>
        <text x={cx-14} y={cy+4} fill="#fb7185" fontSize={11} textAnchor="middle">O</text>
        <text x={(cx+PV.P[0])/2 - 12} y={(cy+PV.P[1])/2} fill="#fb7185" fontSize={11}>h</text>
        <PLbl v="A" t="A" dy={13}/><PLbl v="B" t="B" dy={13}/>
        <PLbl v="C" t="C" dx={14} dy={4}/><PLbl v="D" t="D" dx={-14} dy={4}/>
        <PLbl v="P" t="P" dy={-8}/>
      </svg>
    </div>
  );
}

// Level 3 — highlight space diagonal and angle α
function PyramidSVG_L3() {
  const [mx, my] = [(PV.A[0]+PV.B[0])/2, (PV.A[1]+PV.B[1])/2];
  return (
    <div style={{ display:"flex", justifyContent:"center", marginBottom:"1.75rem" }}>
      <svg viewBox="30 30 230 185" style={{ width:"100%", maxWidth:280, display:"block" }} aria-hidden>
        <PSeg a="A" b="B"/><PSeg a="B" b="C"/><PSeg a="C" b="D" dash="4 3"/><PSeg a="D" b="A" dash="4 3"/>
        <PSeg a="P" b="A"/><PSeg a="P" b="B" color="#a78bfa" w={2.5}/>
        <PSeg a="P" b="C" dash="4 3"/><PSeg a="P" b="D" dash="4 3"/>
        {/* Apothem (amber) */}
        <line x1={mx} y1={my} x2={PV.P[0]} y2={PV.P[1]} stroke="#f59e0b" strokeWidth={2}/>
        {/* α label */}
        <text x={mx+10} y={my-14} fill="#f59e0b" fontSize={12} fontWeight={700}>α</text>
        {/* L label on PB */}
        <text x={(PV.P[0]+PV.B[0])/2+12} y={(PV.P[1]+PV.B[1])/2} fill="#a78bfa" fontSize={12} fontWeight={700}>L</text>
        <PLbl v="A" t="A" dy={13}/><PLbl v="B" t="B" dy={13}/>
        <PLbl v="C" t="C" dx={14} dy={4}/><PLbl v="D" t="D" dx={-14} dy={4}/>
        <PLbl v="P" t="P" dy={-8}/>
      </svg>
    </div>
  );
}

// ─── PyramidLab ───────────────────────────────────────────────────────────────

function PyramidLab({ initA, initH }: { initA: number; initH: number }) {
  const [A, setA] = useState(initA);
  const [H, setH] = useState(initH);

  const vol        = (1/3) * A * A * H;
  const apothem    = Math.sqrt((A/2)**2 + H**2);           // height of triangular face
  const slantEdge  = Math.sqrt((A*Math.SQRT2/2)**2 + H**2); // corner → apex
  const baseAngle  = (Math.atan(H / (A/2)) * 180) / Math.PI; // angle of face with base

  // Dynamic oblique-projection SVG
  const sc  = 200 / Math.max(A, H, 1);
  const SA  = A * sc;
  const SH  = H * sc;
  const dX  = SA * 0.4, dY = SA * 0.28;
  const ox  = 30, oy = 260;

  // Base square
  const bA  = [ox,       oy      ];
  const bB  = [ox + SA,  oy      ];
  const bC  = [ox+SA+dX, oy - dY ];
  const bD  = [ox + dX,  oy - dY ];
  // Base center
  const cx  = (bA[0]+bC[0])/2, cy = (bA[1]+bC[1])/2;
  // Apex
  const Px  = cx, Py = cy - SH;

  // Dynamic viewBox
  const PAD = 24;
  const allX = [bA,bB,bC,bD,[Px,Py]].map(p=>p[0]);
  const allY = [bA,bB,bC,bD,[Px,Py]].map(p=>p[1]);
  const vx = Math.min(...allX)-PAD, vy = Math.min(...allY)-PAD;
  const vw = Math.max(...allX)-Math.min(...allX)+PAD*2;
  const vh = Math.max(...allY)-Math.min(...allY)+PAD*2;

  const ln = (a:number[],b:number[],clr="#475569",w=1.5,dash="") =>
    <line key={`${a[0]}-${a[1]}-${b[0]}-${b[1]}-${clr}`}
      x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={clr} strokeWidth={w} strokeDasharray={dash}/>;

  return (
    <section style={{ ...ISLAND, borderColor:"rgba(34,211,238,0.2)", overflow:"hidden", boxSizing:"border-box" }}>
      <h3 style={{ color:"white", fontSize:16, fontWeight:700, textAlign:"center", marginBottom:4 }}>מעבדת פירמידה — שנה ממדים</h3>
      <p style={{ color:"#64748b", fontSize:12, textAlign:"center", marginBottom:"1rem" }}>הערכים מתעדכנים בזמן אמת</p>

      {/* Sliders */}
      <div style={{ maxWidth:520, margin:"0 auto", display:"flex", flexDirection:"column", gap:8, marginBottom:"1.25rem" }}>
        {[{label:"צלע בסיס (a)", val:A, set:setA}, {label:"גובה (h)", val:H, set:setH}].map(r => (
          <div key={r.label}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#64748b", marginBottom:2 }}>
              <span>{r.label}</span>
              <span style={{ color:"white", fontWeight:700, fontFamily:"monospace" }}>{r.val}</span>
            </div>
            <input type="range" min={1} max={15} step={1} value={r.val}
              onChange={e => r.set(+e.target.value)}
              style={{ display:"block", width:"100%", accentColor:"#22d3ee" }}/>
          </div>
        ))}
      </div>

      {/* SVG */}
      <div style={{ borderRadius:12, border:"1px solid #1e293b", background:"rgba(0,0,0,0.5)", height:320, display:"flex", justifyContent:"center", alignItems:"center", marginBottom:"1rem", overflow:"hidden", padding:"1rem" }}>
        <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet"
          style={{ display:"block", width:"100%", height:"100%" }} aria-hidden>
          {/* Base */}
          {ln(bA,bB)}{ln(bB,bC)}{ln(bC,bD,"#475569",1.5,"4 3")}{ln(bD,bA,"#475569",1.5,"4 3")}
          {/* Lateral edges */}
          {ln([Px,Py],bA)}{ln([Px,Py],bB)}
          {ln([Px,Py],bC,"#475569",1.5,"4 3")}{ln([Px,Py],bD,"#475569",1.5,"4 3")}
          {/* Apothem mid-AB → P (amber) */}
          {ln([(bA[0]+bB[0])/2,(bA[1]+bB[1])/2],[Px,Py],"#f59e0b",2,"5 3")}
          {/* Height center → P (rose) */}
          {ln([cx,cy],[Px,Py],"#fb7185",1.5,"3 3")}
        </svg>
      </div>

      {/* Result tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:8, marginBottom:8 }}>
        {[
          { label:"נפח",           val: vol.toFixed(1),        sub:"⅓ · a² · h",          color:"#34d399" },
          { label:"מקצוע צדדי",    val: slantEdge.toFixed(2),  sub:"√(a²/2 + h²)",        color:"#a78bfa" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius:10, background:"rgba(0,0,0,0.4)", border:"1px solid #1e293b", padding:"10px 8px", textAlign:"center", minWidth:0 }}>
            <div style={{ color:"#64748b", fontSize:10, marginBottom:4 }}>{r.label}</div>
            <div style={{ color:r.color, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div>
            <div style={{ color:"#475569", fontSize:9, marginTop:3 }}>{r.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:8 }}>
        {[
          { label:"אפותמה",        val: apothem.toFixed(2),    sub:"√((a/2)² + h²)",      color:"#f59e0b" },
          { label:"זווית פאה",     val: baseAngle.toFixed(1)+"°", sub:"arctan(h / (a/2))", color:"#22d3ee" },
        ].map(r => (
          <div key={r.label} style={{ borderRadius:10, background:"rgba(0,0,0,0.4)", border:"1px solid #1e293b", padding:"10px 8px", textAlign:"center", minWidth:0 }}>
            <div style={{ color:"#64748b", fontSize:10, marginBottom:4 }}>{r.label}</div>
            <div style={{ color:r.color, fontWeight:700, fontSize:15, fontFamily:"monospace" }}>{r.val}</div>
            <div style={{ color:"#475569", fontSize:9, marginTop:3 }}>{r.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Level content ────────────────────────────────────────────────────────────

// ── Level 1 ──────────────────────────────────────────────────────────────────
const L1_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על פירמידה ישרה עם בסיס ריבועי שצלעו a=10 וגובה h=12.\n" +
  "עזור לי:\n" +
  "1. למצוא את אורך המקצוע הצדדי (מהקדקוד P לפינת הבסיס A).\n" +
  "2. למצוא את האפותמה — גובה הפאה המשולשת.\n" +
  "אל תפתור — שאל אותי שאלות מנחות בכל שלב.";

const L1_STEPS = [
  {
    title: "שלב א׳ — מקצוע צדדי PA",
    prompt:
      "\n\nאני רוצה למצוא את PA — האורך מהקדקוד P לפינת הבסיס A.\n" +
      "מה המרחק מהמרכז O של הבסיס לפינה A? (רמז: קצב הריבוע)\n" +
      "איזה משולש ישר-זווית כולל את PA, ו-h, ו-OA?",
  },
  {
    title: "שלב ב׳ — אפותמה (גובה הפאה המשולשת)",
    prompt:
      "\n\nמצאתי את PA. עכשיו אני צריך את האפותמה — גובה הפאה PAB.\n" +
      "מה נקודת האמצע M של צלע AB?\n" +
      "איזה משולש ישר-זווית אשתמש, ומה הניצבים h ו-a/2?",
  },
];

// ── Level 2 ──────────────────────────────────────────────────────────────────
const L2_PROMPT =
  "\n\nאתה מורה למתמטיקה. אני פותר תרגיל על פירמידה ישרה עם בסיס מלבני 6×8.\n" +
  "נפח הפירמידה: V = 160 סמ״ק.\n" +
  "1. עזור לי למצוא את גובה הפירמידה h מנוסחת הנפח.\n" +
  "2. עזור לי לחשב את האפותמה לפאה הגדולה (על צלע 8).\n" +
  "3. עזור לי למצוא את הזווית שבין הפאה הגדולה לבסיס.\n" +
  "הנחה אותי — אל תפתור ישירות.";

const L2_CONTEXT_WORDS = ["פירמידה", "גובה", "שטח בסיס", "נפח", "אלכסון", "צלע", "חישוב", "פיתגורס"];

// ── Level 3 ──────────────────────────────────────────────────────────────────
const L3_GATE_TEXT =
  "לפירמידה ישרה עם בסיס ריבועי נתון:\n" +
  "   מקצוע צדדי L  וזווית הפאה עם הבסיס: α\n\n" +
  "נסח פרומפט זהב שיבקש מה-AI לעזור לך:\n" +
  "1. לבטא את האפותמה כ-m = L·cos(α).\n" +
  "2. לבטא את צלע הבסיס: a = 2·L·cos(α).\n" +
  "3. לבטא את הגובה: h = L·sin(α).\n" +
  "4. לרשום ביטוי מלא לנפח V(L, α) אחרי הצבה.\n\n" +
  "כתוב לפחות 80 תווים — ניסוח מדויק בלבד:";

// ─── Level picker ─────────────────────────────────────────────────────────────

type Level = 1 | 2 | 3;
const LEVEL_META: Record<Level, { label:string; sub:string; color:string; glowColor:string }> = {
  1: { label:"בסיסי",  sub:"מקצוע צדדי ואפותמה",          color:"#34d399", glowColor:"rgba(52,211,153,0.35)"  },
  2: { label:"בינוני", sub:"גובה וזווית מנפח נתון",        color:"#f59e0b", glowColor:"rgba(245,158,11,0.35)"  },
  3: { label:"מתקדם", sub:"ביטוי לנפח עם L ו-α",          color:"#a78bfa", glowColor:"rgba(167,139,250,0.35)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PyramidPage() {
  const [level, setLevel] = useState<Level>(1);

  // Level 2
  const [l2t0, setL2t0] = useState("");
  const [l2t1, setL2t1] = useState("");
  const [l2t2, setL2t2] = useState("");
  const [l2p0, setL2p0] = useState(false);
  const [l2p1, setL2p1] = useState(false);
  const [l2p2, setL2p2] = useState(false);
  const l2Combined = l2t0 + " " + l2t1 + " " + l2t2;

  // Level 3
  const [l3Text, setL3Text]           = useState("");
  const [l3Submitted, setL3Submitted] = useState(false);
  const l3Count = l3Text.trim().length;
  const GATE    = 80;

  return (
    <div style={{ background:"#020617", minHeight:"100vh", width:"100%" }}>
      <main style={{ maxWidth:1000, margin:"0 auto", padding:"2rem", color:"white" }} dir="rtl">

        {/* Nav */}
        <div style={{ marginBottom:"1.5rem" }}>
          <Link
            href="/topic/grade12/space-geometry"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#4A4A4A", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#2D2D2D"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#4A4A4A"; }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            חזרה
          </Link>
          <h1 style={{ fontSize:"1.9rem", fontWeight:"bold", marginTop:"0.5rem" }}>הפירמידה הישרה — עם AI</h1>
          <p style={{ color:"#94a3b8", fontSize:14, marginTop:4 }}>גבהות, מקצועות, זוויות — ואיך לשאול AI את השאלות הנכונות</p>
        </div>

        {/* ── Level picker ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:"2.5rem" }}>
          {([1,2,3] as Level[]).map(lv => {
            const m = LEVEL_META[lv];
            const active = level === lv;
            return (
              <button key={lv} onClick={() => setLevel(lv)} style={{
                borderRadius:20, padding:"1.25rem 1rem",
                background: active ? "#0f172a" : "rgba(15,23,42,0.5)",
                border: `3px solid ${active ? m.color : "#1e293b"}`,
                cursor:"pointer", textAlign:"center", transition:"all 0.2s",
                boxShadow: active ? `0 0 20px 4px ${m.glowColor}` : "none",
              }}>
                <div style={{ color:m.color, fontWeight:800, fontSize:17, marginBottom:5 }}>{m.label}</div>
                <div style={{ color:"#64748b", fontSize:11, lineHeight:1.4 }}>{m.sub}</div>
              </button>
            );
          })}
        </div>

        {/* ══════════════ LEVEL 1 ══════════════ */}
        {level === 1 && (
          <>
            <section style={{ ...ISLAND, borderColor:"rgba(52,211,153,0.35)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem", paddingBottom:"0.75rem", borderBottom:"1px solid rgba(52,211,153,0.15)" }}>
                <div style={{ width:4, height:24, borderRadius:4, background:"#34d399", flexShrink:0 }}/>
                <h2 style={{ color:"#34d399", fontSize:17, fontWeight:800, margin:0 }}>🟢 רמה בסיסית — מקצוע צדדי ואפותמה</h2>
              </div>
              <PyramidSVG_L1/>
              <div style={{ borderRadius:12, background:"rgba(0,0,0,0.3)", border:"1px solid #1e293b", padding:"1rem", marginBottom:"1.25rem" }}>
                <p style={{ color:"#94a3b8", fontSize:13, fontWeight:700, marginBottom:8 }}>נתוני הבעיה</p>
                <p style={{ color:"#cbd5e1", fontSize:14, marginBottom:6 }}>פירמידה ישרה עם בסיס ריבועי: צלע a = 10 סמ, גובה h = 12 סמ.</p>
                <ol style={{ color:"#cbd5e1", fontSize:14, paddingRight:"1.25rem", display:"flex", flexDirection:"column", gap:4 }}>
                  <li>מצא את אורך המקצוע הצדדי PA.</li>
                  <li>מצא את האפותמה — גובה הפאה המשולשת.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L1_PROMPT} title="פרומפט זהב — רענן מורה AI"/>
              {L1_STEPS.map(s => <TutorStepBasic key={s.title} title={s.title} prompt={s.prompt}/>)}
            </section>
            <PyramidLab initA={10} initH={12}/>
          </>
        )}

        {/* ══════════════ LEVEL 2 ══════════════ */}
        {level === 2 && (
          <>
            <section style={{ ...ISLAND, borderColor:"rgba(245,158,11,0.35)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem", paddingBottom:"0.75rem", borderBottom:"1px solid rgba(245,158,11,0.15)" }}>
                <div style={{ width:4, height:24, borderRadius:4, background:"#f59e0b", flexShrink:0 }}/>
                <h2 style={{ color:"#f59e0b", fontSize:17, fontWeight:800, margin:0 }}>🟡 רמה בינונית — גובה וזווית מנפח נתון</h2>
              </div>
              <PyramidSVG_L2/>
              <div style={{ borderRadius:12, background:"rgba(0,0,0,0.3)", border:"1px solid #1e293b", padding:"1rem", marginBottom:"1.25rem" }}>
                <p style={{ color:"#94a3b8", fontSize:13, fontWeight:700, marginBottom:8 }}>נתוני הבעיה</p>
                <p style={{ color:"#cbd5e1", fontSize:14, marginBottom:6 }}>פירמידה ישרה עם <strong style={{ color:"#34d399" }}>בסיס מלבני 6×8</strong> סמ. נפח: V = 160 סמ״ק.</p>
                <ol style={{ color:"#cbd5e1", fontSize:14, paddingRight:"1.25rem", display:"flex", flexDirection:"column", gap:4 }}>
                  <li>מצא את גובה הפירמידה h.</li>
                  <li>מצא את האפותמה לפאה שעל צלע 8.</li>
                  <li>מצא את הזווית בין הפאה הגדולה לבסיס.</li>
                </ol>
              </div>
              <GoldenPromptCard prompt={L2_PROMPT} title="פרומפט זהב — שלב האימון"/>
              <KeywordPills text={l2Combined} keywords={L2_CONTEXT_WORDS}/>
              <TutorStepMedium
                title="שלב א׳ — גובה הפירמידה מנוסחת נפח"
                placeholder="כתוב: V = (1/3)·B·h, לכן h = 3V ÷ B = ... כי הבסיס הוא..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p0(true)}
              />
              <TutorStepMedium
                title="שלב ב׳ — אפותמה לפאה שעל צלע 8"
                placeholder="כתוב: האפותמה היא גובה המשולש PAB שבו... ולכן m = √(...²+h²) ="
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p1(true)}
              />
              <TutorStepMedium
                title="שלב ג׳ — זווית הפאה עם הבסיס"
                placeholder="כתוב: הזווית α בין הפאה לבסיס נמצאת במשולש שבו... ולכן tan(α) = h ÷ ..."
                contextWords={L2_CONTEXT_WORDS}
                onPass={() => setL2p2(true)}
              />
              {l2p0 && l2p1 && l2p2 && (
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  style={{ borderRadius:12, background:"rgba(6,78,59,0.15)", border:"1px solid rgba(52,211,153,0.3)", padding:"1rem", color:"#6ee7b7", fontSize:14, marginTop:"1rem" }}>
                  ✅ כל הכבוד! סיימת את רמת האימון.
                </motion.div>
              )}
            </section>
            <PyramidLab initA={6} initH={10}/>
          </>
        )}

        {/* ══════════════ LEVEL 3 ══════════════ */}
        {level === 3 && (
          <>
            <section style={{ ...ISLAND, borderColor:"rgba(167,139,250,0.35)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem", paddingBottom:"0.75rem", borderBottom:"1px solid rgba(167,139,250,0.15)" }}>
                <div style={{ width:4, height:24, borderRadius:4, background:"#a78bfa", flexShrink:0 }}/>
                <h2 style={{ color:"#a78bfa", fontSize:17, fontWeight:800, margin:0 }}>🟣 רמה מתקדמת — ביטוי לנפח עם L ו-α</h2>
              </div>
              <PyramidSVG_L3/>
              <div style={{ borderRadius:12, background:"rgba(0,0,0,0.3)", border:"1px solid #1e293b", padding:"1rem", marginBottom:"1.5rem" }}>
                <p style={{ color:"#94a3b8", fontSize:13, fontWeight:700, marginBottom:8 }}>נתוני הבעיה</p>
                <p style={{ color:"#cbd5e1", fontSize:14, marginBottom:6 }}>פירמידה ישרה עם בסיס ריבועי. נתון: <strong style={{ color:"#f59e0b" }}>מקצוע צדדי L</strong> וזווית הפאה עם הבסיס <strong style={{ color:"#a78bfa" }}>α</strong>.</p>
                <ol style={{ color:"#cbd5e1", fontSize:14, paddingRight:"1.25rem", display:"flex", flexDirection:"column", gap:4 }}>
                  <li>בטא את a, h כתלות ב-L ו-α.</li>
                  <li>הצב וכתוב ביטוי מלא ל-V(L, α).</li>
                </ol>
              </div>

              {!l3Submitted ? (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div style={{ borderRadius:12, border:"1px solid rgba(167,139,250,0.3)", background:"rgba(0,0,0,0.4)", padding:"1.25rem" }}>
                    <div style={{ color:"#a78bfa", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>🔐 נסח בעצמך פרומפט זהב מלא</div>
                    <pre style={{ color:"#cbd5e1", fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 }}>{L3_GATE_TEXT}</pre>
                  </div>
                  <textarea
                    value={l3Text} rows={5} dir="rtl"
                    onChange={e => setL3Text(e.target.value)}
                    placeholder="כתוב כאן פרומפט מדויק — לפחות 80 תווים..."
                    style={{ width:"100%", minHeight:130, borderRadius:12, background:"rgba(0,0,0,0.5)", border:"1px solid #334155", color:"white", fontSize:14, padding:14, resize:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                  />
                  <div>
                    <div style={{ height:5, borderRadius:4, background:"#1e293b", overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:4, background:l3Count>=GATE?"#34d399":"#a78bfa", width:`${Math.min(100,(l3Count/GATE)*100)}%`, transition:"width 0.2s" }}/>
                    </div>
                    <div style={{ fontSize:11, color:l3Count>=GATE?"#34d399":"#475569", marginTop:4, textAlign:"left" }}>{l3Count} / {GATE} תווים</div>
                  </div>
                  <button
                    onClick={() => { if (l3Count >= GATE) setL3Submitted(true); }}
                    disabled={l3Count < GATE}
                    style={{ padding:"12px 24px", borderRadius:12, background:l3Count>=GATE?"rgba(167,139,250,0.12)":"transparent", border:`1px solid ${l3Count>=GATE?"rgba(167,139,250,0.5)":"#1e293b"}`, color:l3Count>=GATE?"#a78bfa":"#334155", fontSize:14, fontWeight:600, cursor:l3Count>=GATE?"pointer":"not-allowed", transition:"all 0.3s" }}>
                    שלח לחונך →
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  style={{ borderRadius:12, background:"rgba(6,78,59,0.15)", border:"1px solid rgba(52,211,153,0.3)", padding:"1.25rem", color:"#6ee7b7", fontSize:15 }}>
                  ✅ כל הכבוד! הפרומפט שלך נשלח לחונך.
                </motion.div>
              )}
            </section>
            <PyramidLab initA={6} initH={8}/>
          </>
        )}

      </main>
    </div>
  );
}
