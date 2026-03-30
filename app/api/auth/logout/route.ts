import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set("math-auth", "", { path: "/", maxAge: 0 });
  res.cookies.set("math-grade", "", { path: "/", maxAge: 0 });

  return res;
}
