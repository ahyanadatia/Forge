import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDelivery } from "@/services/deliveries";
import { getDeliveryEvidence } from "@/services/evidence";
import { runVerification } from "@/lib/verification";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { delivery_id } = await request.json();
  if (!delivery_id) {
    return NextResponse.json(
      { error: "delivery_id required" },
      { status: 400 }
    );
  }

  try {
    const delivery = await getDelivery(supabase, delivery_id);

    if (delivery.builder_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const evidence = await getDeliveryEvidence(supabase, delivery_id);

    const result = runVerification({
      evidence,
      deployment_url: delivery.deployment_url,
      repo_url: delivery.repo_url,
      started_at: delivery.started_at,
      completed_at: delivery.completed_at,
    });

    const { data: existing } = await supabase
      .from("verifications")
      .select("id")
      .eq("delivery_id", delivery_id)
      .single() as { data: any };

    if (existing) {
      await (supabase as any)
        .from("verifications")
        .update({
          ...result,
          last_checked_at: new Date().toISOString(),
        })
        .eq("delivery_id", delivery_id);
    } else {
      await (supabase as any).from("verifications").insert({
        delivery_id,
        ...result,
      });
    }

    if (result.overall_status === "verified") {
      await (supabase as any)
        .from("deliveries")
        .update({ status: "verified" })
        .eq("id", delivery_id);
    }

    return NextResponse.json({ success: true, verification: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Verification failed" },
      { status: 500 }
    );
  }
}
