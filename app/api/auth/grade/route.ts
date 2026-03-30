import { NextRequest, NextResponse } from "next/server";

const VALID_GRADES = ["10", "11", "12"];

export async function POST(req: NextRequest) {
  const { grade } = await req.json();

  if (!VALID_GRADES.includes(grade)) {
    return NextResponse.json({ error: "כיתה לא תקינה" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  const isProduction = process.env.NODE_ENV === "production";
  res.cookies.set("math-grade", grade, {
    sameSite: "lax",
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return res;
}
