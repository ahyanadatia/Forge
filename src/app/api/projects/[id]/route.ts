import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProject } from "@/services/projects";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  goals: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  hours_per_week: z.number().int().min(1).max(80).optional(),
  required_skills: z.array(z.string()).optional(),
  team_size: z.number().int().min(1).max(20).optional(),
  status: z.enum(["draft", "open", "full", "active", "completed", "archived"]).optional(),
  category: z.string().optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  roles_needed: z.array(z.string()).optional(),
  timeline_weeks: z.number().int().min(1).max(104).optional(),
  hours_per_week_min: z.number().int().min(1).max(80).optional(),
  hours_per_week_max: z.number().int().min(1).max(80).optional(),
  team_size_target: z.number().int().min(1).max(20).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", params.id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const updated = await updateProject(supabase, params.id, parsed.data);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Update failed" }, { status: 500 });
  }
}
