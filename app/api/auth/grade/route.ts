import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";

const VALID_GRADES = ["10", "11", "12"];

export async function POST(req: NextRequest) {
  const { grade } = await req.json();
  const userId = req.cookies.get("math-auth")?.value;

  if (!VALID_GRADES.includes(grade)) {
    return NextResponse.json({ error: "כיתה לא תקינה" }, { status: 400 });
  }

  // Save to Supabase profiles table
  if (userId) {
    await supabase
      .from("profiles")
      .upsert(
        { id: userId, grade, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
  }

  const res = NextResponse.json({ ok: true });

  // Also set cookie for middleware
  res.cookies.set("math-grade", grade, {
    path: "/",
    maxAge: 2592000,
    sameSite: "lax",
  });

  return res;
}

/** GET /api/auth/grade — fetch saved grade from Supabase */
export async function GET(req: NextRequest) {
  const userId = req.cookies.get("math-auth")?.value;
  if (!userId) {
    return NextResponse.json({ grade: null });
  }

  const { data } = await supabase
    .from("profiles")
    .select("grade")
    .eq("id", userId)
    .single();

  return NextResponse.json({ grade: data?.grade || null });
}
