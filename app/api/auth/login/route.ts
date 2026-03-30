import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";

const ADMIN_EMAIL = "yuvalymal6@gmail.com";
const FALLBACK_PASSWORD = "math2026";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "נא להזין כתובת אימייל תקינה" }, { status: 400 });
  }

  if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "ההרשמה סגורה זמנית. רכישת הקורס תתאפשר בקרוב." }, { status: 403 });
  }

  // Try Supabase auth first
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  let userId = data?.user?.id;

  // Fallback: if Supabase user doesn't exist yet, accept hardcoded password
  if (error && password === FALLBACK_PASSWORD) {
    userId = "admin-local";
  } else if (error) {
    return NextResponse.json({ error: "פרטים שגויים" }, { status: 401 });
  }

  // Fetch saved grade from profiles table
  let savedGrade: string | null = null;
  if (userId && userId !== "admin-local") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("grade")
      .eq("id", userId)
      .single();
    savedGrade = profile?.grade || null;
  }

  const res = NextResponse.json({ ok: true, userId, grade: savedGrade });

  // Set auth cookie
  res.cookies.set("math-auth", userId!, {
    path: "/",
    maxAge: 2592000,
    sameSite: "lax",
  });

  // If grade already saved, set cookie so proxy skips onboarding
  if (savedGrade) {
    res.cookies.set("math-grade", savedGrade, {
      path: "/",
      maxAge: 2592000,
      sameSite: "lax",
    });
  }

  return res;
}
