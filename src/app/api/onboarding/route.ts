import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await (supabase as any)
    .from("user_onboarding_state")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: created, error: insertErr } = await (supabase as any)
      .from("user_onboarding_state")
      .insert({
        user_id: user.id,
        first_login_completed: false,
        tour_completed: false,
        tour_step: 0,
        checklist_dismissed: false,
      })
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    return NextResponse.json(created);
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["first_login_completed", "tour_completed", "tour_step", "checklist_dismissed"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await (supabase as any)
    .from("user_onboarding_state")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
