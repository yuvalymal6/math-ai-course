import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";

/** GET /api/progress — fetch all progress for the logged-in user */
export async function GET(req: NextRequest) {
  const userId = req.cookies.get("math-auth")?.value;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_progress")
    .select("topic_id, exercise_id, completed")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ progress: data });
}

/** POST /api/progress — upsert a single exercise completion */
export async function POST(req: NextRequest) {
  const userId = req.cookies.get("math-auth")?.value;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { topicId, exerciseId, completed } = await req.json();

  if (!topicId || !exerciseId || typeof completed !== "boolean") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_progress")
    .upsert(
      {
        user_id: userId,
        topic_id: topicId,
        exercise_id: exerciseId,
        completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_id,exercise_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
