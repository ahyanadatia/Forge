import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/services/projects";
import { matchBuildersToProject } from "@/lib/matching";
import type { Builder } from "@/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  if (!projectId) {
    return NextResponse.json(
      { error: "project_id required" },
      { status: 400 }
    );
  }

  try {
    const project = await getProject(supabase, projectId);

    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: builders } = await supabase
      .from("builders")
      .select("*, forge_scores(*)")
      .in("availability", ["available", "open_to_opportunities"])
      .neq("id", user.id)
      .limit(100);

    if (!builders || builders.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const candidatesWithStats = await Promise.all(
      builders.map(async (b: any) => {
        const { data: deliveries } = await supabase
          .from("deliveries")
          .select("status")
          .eq("builder_id", b.id) as { data: any[] | null };

        const { data: teams } = await supabase
          .from("team_members")
          .select("id")
          .eq("builder_id", b.id) as { data: any[] | null };

        const all = deliveries ?? [];
        const verified = all.filter((d: any) => d.status === "verified").length;
        const completed = all.filter(
          (d: any) => d.status === "completed" || d.status === "verified"
        ).length;

        return {
          builder: b as unknown as Builder,
          builderStats: {
            verifiedDeliveries: verified,
            completionRate: all.length > 0
              ? Math.round((completed / all.length) * 100)
              : 0,
            totalTeams: teams?.length ?? 0,
          },
          forgeScore: b.forge_scores?.[0]?.score ?? 0,
        };
      })
    );

    const matches = matchBuildersToProject(project, candidatesWithStats);

    return NextResponse.json({
      matches: matches.slice(0, 20).map((m) => ({
        builder_id: m.builder.id,
        builder_name: m.builder.full_name,
        builder_avatar: m.builder.avatar_url,
        score: m.score,
        explanation: m.explanation,
        capability_fit: m.capability_fit,
        reliability_fit: m.reliability_fit,
        commitment_fit: m.commitment_fit,
        delivery_history_fit: m.delivery_history_fit,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Matching failed" },
      { status: 500 }
    );
  }
}
