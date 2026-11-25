import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_NOT_CONFIGURED, createAdminClient } from "@/lib/supabase/admin";
import { runProbesForDelivery } from "@/lib/scoring/probes";
import { z } from "zod";

// safeFetch uses node:http/node:https and a custom DNS lookup.
export const runtime = "nodejs";

const bodySchema = z.object({ delivery_id: z.string().uuid() });

/**
 * POST /api/scoring/v3/verify
 * Runs live verification probes for one delivery and records the evidence.
 * Only the delivery's owner can trigger it. Ownership is checked with the
 * user's own session; the evidence is then written with the service-role
 * client, because the evidence ledger is not writable by users.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "delivery_id (uuid) required" }, { status: 400 });
  }

  const { data: delivery, error } = await supabase
    .from("deliveries")
    .select("id, builder_id, deployment_url, repo_url, project_id")
    .eq("id", parsed.data.delivery_id)
    .single();

  if (error || !delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }
  if (delivery.builder_id !== user.id) {
    return NextResponse.json({ error: "Not your delivery" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json(ADMIN_NOT_CONFIGURED, { status: 503 });

  const { data: builder } = await supabase
    .from("builders")
    .select("github_username")
    .eq("id", user.id)
    .single();

  try {
    const { evidenceIds, results } = await runProbesForDelivery(
      admin,
      user.id,
      delivery.id,
      {
        deployment_url: delivery.deployment_url,
        repo_url: delivery.repo_url,
        project_id: delivery.project_id,
      },
      builder?.github_username,
      process.env.GITHUB_TOKEN
    );

    return NextResponse.json({ success: true, evidence_count: evidenceIds.length, results });
  } catch (err) {
    console.error("verify: probe run failed", err);
    return NextResponse.json({ error: "Probe failed" }, { status: 500 });
  }
}
