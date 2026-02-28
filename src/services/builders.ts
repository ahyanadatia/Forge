import type { Builder, BuilderSkills } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getBuilder(client: Client, id: string) {
  const { data, error } = await client
    .from("builders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Builder;
}

export async function getBuilderByUsername(client: Client, username: string) {
  const { data, error } = await client
    .from("builders")
    .select("*")
    .eq("username", username)
    .single();

  if (error) throw error;
  return data as unknown as Builder;
}

export async function getBuilderByOldUsername(client: Client, username: string) {
  const { data, error } = await client
    .from("username_history")
    .select("builder_id, new_username")
    .eq("old_username", username)
    .order("changed_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as { builder_id: string; new_username: string };
}

export async function checkUsernameAvailability(
  client: Client,
  username: string
): Promise<{ available: boolean; suggestion?: string }> {
  const { data } = await client
    .from("builders")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!data) return { available: true };
  return { available: false, suggestion: `${username}${Math.floor(Math.random() * 99)}` };
}

export async function setUsername(
  client: Client,
  builderId: string,
  username: string,
  oldUsername?: string | null
) {
  if (oldUsername) {
    await client.from("username_history").insert({
      builder_id: builderId,
      old_username: oldUsername,
      new_username: username,
    });
  }

  const { data, error } = await client
    .from("builders")
    .update({ username })
    .eq("id", builderId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Builder;
}

export async function updateBuilder(
  client: Client,
  id: string,
  updates: {
    full_name?: string;
    first_name?: string;
    middle_names?: string | null;
    last_name?: string;
    display_name?: string | null;
    username?: string | null;
    role_descriptor?: string | null;
    location?: string | null;
    bio?: string | null;
    availability?: string;
    skills?: BuilderSkills;
    self_backend?: number;
    self_frontend?: number;
    self_ml?: number;
    self_systems?: number;
    self_devops?: number;
    university_or_company?: string | null;
    primary_stack?: string | null;
    secondary_stack?: string | null;
    commitment_preferences?: string | null;
    website_url?: string | null;
    linkedin_url?: string | null;
    avatar_url?: string | null;
  }
) {
  const { data, error } = await client
    .from("builders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Builder;
}

export interface BuilderSearchParams {
  query?: string;
  availability?: string;
  skills?: string[];
  minScore?: number;
  minDeliveries?: number;
  page?: number;
  pageSize?: number;
}

export async function searchBuilders(
  client: Client,
  params: BuilderSearchParams
) {
  const { page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  let query = client
    .from("builders")
    .select("*, forge_scores(*)", { count: "exact" });

  if (params.query) {
    query = query.or(
      `full_name.ilike.%${params.query}%,first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,username.ilike.%${params.query}%,github_username.ilike.%${params.query}%,role_descriptor.ilike.%${params.query}%`
    );
  }

  if (params.availability) {
    query = query.eq("availability", params.availability);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    builders: data as unknown as (Builder & { forge_scores: any[] })[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getBuilderStats(client: Client, builderId: string) {
  const [deliveriesResult, projectsResult, teamsResult] = await Promise.all([
    client
      .from("deliveries")
      .select("status", { count: "exact" })
      .eq("builder_id", builderId),
    client
      .from("projects")
      .select("status", { count: "exact" })
      .eq("owner_id", builderId),
    client
      .from("team_members")
      .select("team_id", { count: "exact" })
      .eq("builder_id", builderId),
  ]);

  const deliveries: any[] = deliveriesResult.data ?? [];
  const verified = deliveries.filter((d: any) => d.status === "verified").length;
  const completed = deliveries.filter(
    (d: any) => d.status === "completed" || d.status === "verified"
  ).length;
  const dropped = deliveries.filter((d: any) => d.status === "dropped").length;
  const total = deliveries.length;

  return {
    totalDeliveries: total,
    verifiedDeliveries: verified,
    completedDeliveries: completed,
    droppedDeliveries: dropped,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    totalProjects: projectsResult.count ?? 0,
    totalTeams: teamsResult.count ?? 0,
  };
}
