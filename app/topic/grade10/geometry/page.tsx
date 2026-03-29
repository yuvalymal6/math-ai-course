"use client";

import Link from "next/link";
import { Brain, ChevronRight, Square, Diamond } from "lucide-react";

export default function GeometryHubPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlowViolet { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); } 50% { box-shadow: 0 0 18px 4px rgba(139,92,246,0.18); } }
        .card-hover { transition: transform 0.2s ease, border-color 0.2s ease; }
        .card-hover:hover { transform: translateY(-3px); }
      `}</style>

      <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
            <Brain size={20} className="text-[#00d4ff]" />
            <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
          </Link>
          <Link href="/topic/grade10" className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1">
            <ChevronRight size={14} className="rotate-180" />
            כיתה י׳
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-14 space-y-10">
        <div className="text-center space-y-3 animate-[fadeSlideIn_0.4s_ease_both]">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest">כיתה י׳</p>
          <h1 className="text-4xl font-extrabold">גאומטריה</h1>
          <p className="text-slate-400 text-sm">בחר את הנושא שאתה עובד עליו</p>
        </div>

        <div className="grid gap-5 animate-[fadeSlideIn_0.5s_ease_both]">

          {/* Parallelogram card */}
          <Link href="/topic/grade10/geo-parallelogram" className="card-hover block bg-[#0f172a] border border-slate-700 hover:border-violet-500/60 rounded-2xl p-6 group">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition-colors">
                <Square size={22} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-white font-bold text-lg">המקבילית והמלבן</h2>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400">מקבילית</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">הוכחות ותכונות: שני זוגות צלעות מקבילות, אלכסונים שווים, זוויות חילופיות.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["אלכסונים מחצים", "הוכחת מלבן", "זוויות חילופיות"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{t}</span>
                  ))}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600 group-hover:text-violet-400 transition-colors shrink-0 mt-1" />
            </div>
          </Link>

          {/* Rhombus card */}
          <Link href="/topic/grade10/geo-rhombus" className="card-hover block bg-[#0f172a] border border-slate-700 hover:border-violet-400/60 rounded-2xl p-6 group" style={{ animation: "pulseGlowViolet 3s ease-in-out infinite" }}>
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-violet-400/10 border border-violet-400/30 flex items-center justify-center shrink-0 group-hover:bg-violet-400/20 transition-colors">
                <Diamond size={22} className="text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-white font-bold text-lg">המעוין והריבוע</h2>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-400/10 border border-violet-400/30 text-violet-300">מעוין</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">אלכסונים ניצבים, חציית זוויות, הוכחת ריבוע מתוך מעוין.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["אלכסונים ניצבים", "חציית זוויות", "מעוין → ריבוע"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{t}</span>
                  ))}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600 group-hover:text-violet-300 transition-colors shrink-0 mt-1" />
            </div>
          </Link>

        </div>

        <div className="border-t border-slate-800 pt-6 flex justify-center">
          <Link
            href="/topic/grade10"
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
