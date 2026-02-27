import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBuilderStats } from "@/services/builders";
import { computeForgeScore } from "@/lib/scoring";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { builder_id } = await request.json();
  const targetId = builder_id || user.id;

  try {
    const stats = await getBuilderStats(supabase, targetId);

    const { data: teamData } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("builder_id", targetId) as { data: any[] | null };

    const { data: deliveries } = await supabase
      .from("deliveries")
      .select("created_at, status")
      .eq("builder_id", targetId)
      .order("created_at", { ascending: true }) as { data: any[] | null };

    const activeMonths = countActiveMonths(
      (deliveries ?? []).map((d: any) => d.created_at)
    );
    const consecutiveActiveMonths = countConsecutiveActiveMonths(
      (deliveries ?? []).map((d: any) => d.created_at)
    );

    const result = computeForgeScore({
      verifiedDeliveries: stats.verifiedDeliveries,
      totalDeliveries: stats.totalDeliveries,
      completedDeliveries: stats.completedDeliveries,
      droppedDeliveries: stats.droppedDeliveries,
      projectsJoined: stats.totalDeliveries,
      projectsCompleted: stats.completedDeliveries,
      teamDeliveries: teamData?.length ?? 0,
      totalTeams: stats.totalTeams,
      activeMonths,
      consecutiveActiveMonths,
    });

    const { data: existing } = await supabase
      .from("forge_scores")
      .select("id")
      .eq("builder_id", targetId)
      .single() as { data: any };

    if (existing) {
      await (supabase as any)
        .from("forge_scores")
        .update({
          ...result,
          computed_at: new Date().toISOString(),
        })
        .eq("builder_id", targetId);
    } else {
      await (supabase as any).from("forge_scores").insert({
        builder_id: targetId,
        ...result,
      });
    }

    return NextResponse.json({ success: true, score: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Failed to compute score" },
      { status: 500 }
    );
  }
}

function countActiveMonths(dates: string[]): number {
  const months = new Set(
    dates.map((d) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${date.getMonth()}`;
    })
  );
  return months.size;
}

function countConsecutiveActiveMonths(dates: string[]): number {
  if (dates.length === 0) return 0;

  const months = [
    ...new Set(
      dates.map((d) => {
        const date = new Date(d);
        return date.getFullYear() * 12 + date.getMonth();
      })
    ),
  ].sort((a, b) => b - a);

  let streak = 1;
  for (let i = 1; i < months.length; i++) {
    if (months[i - 1] - months[i] === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
