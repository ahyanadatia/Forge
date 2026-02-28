import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runProbesForDelivery } from "@/lib/scoring/probes";

/**
 * POST /api/scoring/v3/verify
 * Runs live verification probes for a specific delivery and ingests evidence.
 * Auth-gated: only the delivery owner can trigger.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { delivery_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.delivery_id) {
    return NextResponse.json({ error: "delivery_id required" }, { status: 400 });
  }

  // Fetch delivery + verify ownership
  const { data: delivery, error } = await (supabase as any)
    .from("deliveries")
    .select("id, builder_id, deployment_url, repo_url, project_id")
    .eq("id", body.delivery_id)
    .single();

  if (error || !delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  if (delivery.builder_id !== user.id) {
    return NextResponse.json({ error: "Not your delivery" }, { status: 403 });
  }

  // Fetch builder's GitHub username
  const { data: builder } = await (supabase as any)
    .from("builders")
    .select("github_username")
    .eq("id", user.id)
    .single();

  const githubToken = process.env.GITHUB_TOKEN;

  try {
    const { evidenceIds, results } = await runProbesForDelivery(
      supabase as any,
      user.id,
      delivery.id,
      {
        deployment_url: delivery.deployment_url,
        repo_url: delivery.repo_url,
        project_id: delivery.project_id,
      },
      builder?.github_username,
      githubToken
    );

    return NextResponse.json({
      success: true,
      evidence_count: evidenceIds.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Probe failed" },
      { status: 500 }
    );
  }
}
