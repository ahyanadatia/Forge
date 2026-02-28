import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateApplicationStatus } from "@/services/applications";

const schema = z.object({
  status: z.enum(["accepted", "rejected", "withdrawn"]),
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

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Verify: the user must own the project this application belongs to, OR be the applicant (for withdraw)
  const { data: application } = await supabase
    .from("applications")
    .select("*, projects(owner_id)")
    .eq("id", params.id)
    .single() as { data: any; error: any };

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isProjectOwner = application.projects?.owner_id === user.id;
  const isApplicant = application.builder_id === user.id;

  if (parsed.data.status === "withdrawn" && !isApplicant) {
    return NextResponse.json({ error: "Only the applicant can withdraw" }, { status: 403 });
  }

  if ((parsed.data.status === "accepted" || parsed.data.status === "rejected") && !isProjectOwner) {
    return NextResponse.json({ error: "Only the project owner can accept or reject" }, { status: 403 });
  }

  try {
    const updated = await updateApplicationStatus(supabase, params.id, parsed.data.status);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to update" }, { status: 500 });
  }
}
