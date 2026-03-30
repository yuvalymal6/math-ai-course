"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Eye, EyeOff, LogIn, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "שגיאה בכניסה");
        setLoading(false);
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("שגיאת רשת — נסה שוב");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col" dir="rtl">
      <header className="bg-[#0f172a] border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          <Brain size={20} className="text-[#00d4ff]" />
          <span className="font-bold text-white text-sm">מתמטיקה + AI</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="text-center space-y-2 mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-[#3b82f6]/20 border border-[#00d4ff]/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Lock size={24} className="text-[#00d4ff]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">כניסה לקורס</h1>
              <p className="text-slate-400 text-sm">גישה מוגבלת — למשתמשים רשומים בלבד</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="your@email.com"
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
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-4 pr-12 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d4ff] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)] transition-all text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
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

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <p className="text-slate-500 text-xs">ההרשמה סגורה זמנית. רכישת הקורס תתאפשר בקרוב.</p>
            </div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            מתמטיקה + AI &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
