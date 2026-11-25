import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDelivery } from "@/services/deliveries";
import { getDeliveryEvidence } from "@/services/evidence";
import { z } from "zod";

const bodySchema = z.object({ delivery_id: z.string().min(1) });
import { runVerification } from "@/lib/verification";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "delivery_id required" },
      { status: 400 }
    );
  }
  const { delivery_id } = parsed.data;

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
      await supabase
        .from("verifications")
        .update({
          ...result,
          last_checked_at: new Date().toISOString(),
        })
        .eq("delivery_id", delivery_id);
    } else {
      await supabase.from("verifications").insert({
        delivery_id,
        ...result,
      });
    }

    if (result.overall_status === "verified") {
      await supabase
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
