import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectRoleSeatCounts } from "@/services/membership";

const roleSchema = z.object({
  role_name: z.string().min(1).max(120),
  seats_total: z.number().int().min(1).max(50).default(1),
  comp_type: z
    .enum(["unpaid", "hourly", "fixed", "equity", "prize_split", "tbd"])
    .default("tbd"),
  comp_currency: z.string().max(10).optional(),
  comp_amount_min: z.number().min(0).optional(),
  comp_amount_max: z.number().min(0).optional(),
  comp_equity_range: z.string().max(100).optional(),
  comp_terms: z.string().max(2000).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data: roles, error } = await (supabase as any)
    .from("project_roles")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seatCounts = await getProjectRoleSeatCounts(supabase, params.id);

  return NextResponse.json({ roles: roles ?? [], seatCounts });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", params.id)
    .single() as { data: any; error: any };

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase as any)
    .from("project_roles")
    .upsert(
      { project_id: params.id, ...parsed.data },
      { onConflict: "project_id,role_name" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
