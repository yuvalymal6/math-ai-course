import { NextRequest, NextResponse } from "next/server";

const VALID_GRADES = ["10", "11", "12"];

export async function POST(req: NextRequest) {
  const { grade } = await req.json();

  if (!VALID_GRADES.includes(grade)) {
    return NextResponse.json({ error: "כיתה לא תקינה" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("math-grade", grade, {
    path: "/",
    maxAge: 2592000,
    sameSite: "lax",
  });

  return res;
}
