import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.cookies.get("math-auth")?.value;
  const grade = req.cookies.get("math-grade")?.value;

  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, username: auth, grade: grade || null });
}
