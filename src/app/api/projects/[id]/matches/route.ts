import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCompatibility } from "@/lib/matching/project-match";
import { computeAcceptanceLikelihood } from "@/lib/matching/acceptance-likelihood";
import { getInvitationHistory } from "@/services/invitations";

export const dynamic = "force-dynamic";

export async function GET(
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
    .select("*, builders!projects_owner_id_fkey(forge_score)")
    .eq("id", params.id)
    .single() as { data: any; error: any };

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch candidate builders (exclude owner), ordered by forge_score
  const { data: candidates } = await supabase
    .from("builders")
    .select("*")
    .neq("id", user.id)
    .order("forge_score", { ascending: false, nullsFirst: false })
    .limit(200);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ matches: [] });
  }

  const projectProfile = {
    required_skills: project.required_skills ?? [],
    hours_per_week: project.hours_per_week,
    hours_per_week_min: project.hours_per_week_min,
    hours_per_week_max: project.hours_per_week_max,
    timeline_weeks: project.timeline_weeks,
    team_size: project.team_size,
    category: project.category,
    stage: project.stage,
    roles_needed: project.roles_needed ?? [],
    tags: project.tags ?? [],
  };

  const ownerScore = project.builders?.forge_score ?? 0;

  // Score all candidates
  const scored = await Promise.all(
    candidates.map(async (b: any) => {
      const compatibility = computeCompatibility({
        project: projectProfile,
        builder: b,
      });

      const history = await getInvitationHistory(supabase, b.id);

      const acceptance = computeAcceptanceLikelihood({
        builder: {
          availability: b.availability,
          forge_score: b.forge_score ?? 0,
          confidence_score: b.confidence_score ?? 0,
          reliability_score: b.reliability_score ?? 0,
        },
        project: {
          owner_forge_score: ownerScore,
          stage: project.stage,
          hours_per_week: project.hours_per_week,
          team_size: project.team_size,
          roles_needed: project.roles_needed ?? [],
        },
        history,
        compatibilityPercent: compatibility.scorePercent,
      });

      return {
        builder: {
          id: b.id,
          full_name: b.full_name,
          first_name: b.first_name,
          last_name: b.last_name,
          display_name: b.display_name,
          username: b.username,
          avatar_url: b.avatar_url,
          role_descriptor: b.role_descriptor,
          forge_score: b.forge_score ?? 0,
          confidence_score: b.confidence_score ?? 0,
          availability: b.availability,
        },
        compatibility,
        acceptance,
      };
    })
  );

  // Sort by compatibility score desc, then forge score
  scored.sort((a, b) => {
    if (b.compatibility.scorePercent !== a.compatibility.scorePercent) {
      return b.compatibility.scorePercent - a.compatibility.scorePercent;
    }
    return b.builder.forge_score - a.builder.forge_score;
  });

  return NextResponse.json({ matches: scored.slice(0, 10) });
}
