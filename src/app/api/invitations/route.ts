import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInvitation, respondToInvitation } from "@/services/invitations";

const sendSchema = z.object({
  project_id: z.string().uuid(),
  builder_id: z.string().uuid(),
  role: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
  comp_type: z.enum(["unpaid", "hourly", "fixed", "equity", "prize_split", "tbd"]).optional(),
  comp_currency: z.string().max(10).optional(),
  comp_amount_min: z.number().min(0).optional(),
  comp_amount_max: z.number().min(0).optional(),
  comp_equity_range: z.string().max(100).optional(),
  comp_terms: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Verify sender owns the project
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", parsed.data.project_id)
    .single() as { data: any; error: any };

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Only project owners can send invites" }, { status: 403 });
  }

  try {
    const invitation = await sendInvitation(supabase, {
      ...parsed.data,
      sender_id: user.id,
    });
    return NextResponse.json(invitation);
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Invitation already sent to this builder" }, { status: 409 });
    }
    return NextResponse.json({ error: err?.message ?? "Failed to send invite" }, { status: 500 });
  }
}

const respondSchema = z.object({
  invitation_id: z.string().uuid(),
  status: z.enum(["accepted", "declined"]),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const invitation = await respondToInvitation(supabase, parsed.data.invitation_id, parsed.data.status);
    return NextResponse.json(invitation);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to respond" }, { status: 500 });
  }
}
