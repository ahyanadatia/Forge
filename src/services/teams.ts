import type { Team, TeamTask, ActivityEvent } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getTeam(client: Client, id: string) {
  const { data, error } = await client
    .from("teams")
    .select(
      "*, projects(*), team_members(*, builders(*)), team_tasks(*, builders(*))"
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Team;
}

export async function getTeamByProject(client: Client, projectId: string) {
  const { data, error } = await client
    .from("teams")
    .select(
      "*, projects(*), team_members(*, builders(*)), team_tasks(*, builders(*))"
    )
    .eq("project_id", projectId)
    .single();

  if (error) throw error;
  return data as unknown as Team;
}

export async function getBuilderTeams(client: Client, builderId: string) {
  const { data, error } = await client
    .from("team_members")
    .select("*, teams(*, projects(*))")
    .eq("builder_id", builderId);

  if (error) throw error;
  return data;
}

export async function createTask(
  client: Client,
  task: { team_id: string; title: string; owner_id?: string }
) {
  const { data, error } = await client
    .from("team_tasks")
    .insert(task)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as TeamTask;
}

export async function updateTask(
  client: Client,
  id: string,
  updates: { title?: string; status?: string; owner_id?: string | null }
) {
  const { data, error } = await client
    .from("team_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as TeamTask;
}

export async function getTeamActivity(client: Client, teamId: string) {
  const { data, error } = await client
    .from("activity_events")
    .select("*, builders(*)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as unknown as ActivityEvent[];
}
