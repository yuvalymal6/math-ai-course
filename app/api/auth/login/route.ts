import { NextRequest, NextResponse } from "next/server";

const VALID_PASSWORD = "math2026";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || username.trim().length < 2) {
    return NextResponse.json({ error: "שם המשתמש חייב להכיל לפחות 2 תווים" }, { status: 400 });
  }

  if (password !== VALID_PASSWORD) {
    return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // Set auth cookie (30 days)
  res.cookies.set("math-auth", username.trim(), {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return res;
}
