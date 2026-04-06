import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";

const VALID_UNITS = [3, 4, 5];

export async function POST(req: NextRequest) {
  const { units } = await req.json();
  const userId = req.cookies.get("math-auth")?.value;

  if (!VALID_UNITS.includes(units)) {
    return NextResponse.json({ error: "יחידות לא תקינות" }, { status: 400 });
  }

  // Save to Supabase profiles table
  if (userId) {
    await supabase
      .from("profiles")
      .upsert(
        { id: userId, units, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
  }

  const res = NextResponse.json({ ok: true });

  // Also set cookie for middleware
  res.cookies.set("math-units", String(units), {
    path: "/",
    maxAge: 2592000,
    sameSite: "lax",
  });

  return res;
}

/** GET /api/auth/units — fetch saved units from Supabase */
export async function GET(req: NextRequest) {
  const userId = req.cookies.get("math-auth")?.value;
  if (!userId) {
    return NextResponse.json({ units: null });
  }

  const { data } = await supabase
    .from("profiles")
    .select("units")
    .eq("id", userId)
    .single();

  return NextResponse.json({ units: data?.units || null });
}
