import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "yuvaymal6@gmail.com";
const ADMIN_PASSWORD = "math2026";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "נא להזין כתובת אימייל תקינה" }, { status: 400 });
  }

  if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "ההרשמה סגורה זמנית. רכישת הקורס תתאפשר בקרוב." }, { status: 403 });
  }

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("math-auth", email.trim().toLowerCase(), {
    path: "/",
    maxAge: 2592000,
    sameSite: "lax",
  });

  return res;
}
