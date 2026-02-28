import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { joinProjectAsOwner } from "@/services/membership";

const schema = z.object({
  project_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", parsed.data.project_id)
    .single() as { data: any; error: any };

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the project owner can join as owner" },
      { status: 403 }
    );
  }

  const { data, error } = await joinProjectAsOwner(
    supabase,
    parsed.data.project_id,
    user.id
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(data);
}
