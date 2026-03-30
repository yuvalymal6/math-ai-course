"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "שגיאה בכניסה");
        setLoading(false);
        return;
      }

      // Check if user has a grade cookie — if not, go to onboarding
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("שגיאת רשת — נסה שוב");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          <Brain size={20} className="text-[#00d4ff]" />
          <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Login card */}
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-[#3b82f6]/20 border border-[#00d4ff]/30 flex items-center justify-center mx-auto mb-4">
                <Brain size={28} className="text-[#00d4ff]" />
              </div>
              <h1 className="text-3xl font-extrabold text-white">ברוכים הבאים</h1>
              <p className="text-slate-400 text-sm">הכנס את הפרטים כדי להתחיל ללמוד</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">שם משתמש</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="לדוגמה: david123"
                  dir="ltr"
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d4ff] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)] transition-all text-base"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">סיסמה</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="הכנס סיסמה"
                    dir="ltr"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d4ff] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)] transition-all text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-[#00d4ff] to-[#3b82f6] hover:from-[#00b8d9] hover:to-[#2563eb] text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,212,255,0.25)] text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                <LogIn size={18} />
                {loading ? "מתחבר..." : "כניסה"}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            מתמטיקה + AI &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
