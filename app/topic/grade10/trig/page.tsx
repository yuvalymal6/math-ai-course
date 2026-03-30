"use client";

import Link from "next/link";
import { Brain, ChevronRight, Triangle, Compass } from "lucide-react";

export default function TrigHubPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlowCyan { 0%,100% { box-shadow: 0 0 0 0 rgba(0,212,255,0); } 50% { box-shadow: 0 0 18px 4px rgba(0,212,255,0.18); } }
        .card-hover { transition: transform 0.2s ease, border-color 0.2s ease; }
        .card-hover:hover { transform: translateY(-3px); }
      `}</style>

      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />
            כיתה י׳
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-14 space-y-10">
        <div className="text-center space-y-3 animate-[fadeSlideIn_0.4s_ease_both]">
          <p className="text-[#00d4ff] text-xs font-semibold uppercase tracking-widest">כיתה י׳</p>
          <h1 className="text-4xl font-extrabold">טריגונומטריה</h1>
          <p className="text-slate-400 text-sm">בחר את הנושא שאתה עובד עליו</p>
        </div>

        <div className="grid gap-5 animate-[fadeSlideIn_0.5s_ease_both]">

          {/* Trig basics card */}
          <Link href="/topic/grade10/trig-basics" className="card-hover block bg-[#0f172a] border border-slate-700 hover:border-[#00d4ff]/60 rounded-2xl p-6 group">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center shrink-0 group-hover:bg-[#00d4ff]/20 transition-colors">
                <Triangle size={22} className="text-[#00d4ff]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-white font-bold text-lg">סינוס, קוסינוס וטנגנס</h2>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff]">SOH-CAH-TOA</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">יחסי הצלעות במשולש ישר-זווית — חישוב צלעות, זוויות ומשולשים נסתרים.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["sin=נגדית/יתר", "cos=סמוכה/יתר", "tan=נגדית/סמוכה"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{t}</span>
                  ))}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600 group-hover:text-[#00d4ff] transition-colors shrink-0 mt-1" />
            </div>
          </Link>

          {/* Trig applications card */}
          <Link href="/topic/grade10/trig-applications" className="card-hover block bg-[#0f172a] border border-slate-700 hover:border-cyan-400/60 rounded-2xl p-6 group" style={{ animation: "pulseGlowCyan 3s ease-in-out infinite" }}>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center shrink-0 group-hover:bg-cyan-400/20 transition-colors">
                <Compass size={22} className="text-cyan-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-white font-bold text-lg">יישומי טריגונומטריה</h2>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">יישומים</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">בעיות מעשיות: גובה עץ, סולם על קיר, זווית הכלה ומשולשים מורכבים.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["זווית הסתכלות", "גובה עץ/בנין", "משולש שווה-שוקיים"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{t}</span>
                  ))}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600 group-hover:text-cyan-300 transition-colors shrink-0 mt-1" />
            </div>
          </Link>
        </div>

        <div className="border-t border-slate-800 pt-6 flex justify-center">
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
      </main>
    </div>
  );
}
