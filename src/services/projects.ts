import type { Project } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getProject(client: Client, id: string) {
  const { data, error } = await client
    .from("projects")
    .select("*, builders!projects_owner_id_fkey(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Project & { builders: any };
}

export async function getProjects(
  client: Client,
  params?: {
    status?: string;
    skills?: string[];
    category?: string;
    stage?: string;
    tags?: string[];
    rolesNeeded?: string[];
    minHoursPerWeek?: number;
    maxHoursPerWeek?: number;
    maxTimelineWeeks?: number;
    ftsQuery?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { page = 1, pageSize = 20 } = params ?? {};
  const offset = (page - 1) * pageSize;

  let query = client
    .from("projects")
    .select("*, builders!projects_owner_id_fkey(id, full_name, first_name, last_name, display_name, avatar_url, username, forge_score), forge_scores!inner(score, effective_score, confidence)", { count: "exact" });

  if (params?.status) {
    query = query.eq("status", params.status);
  }
  if (params?.category) {
    query = query.eq("category", params.category);
  }
  if (params?.stage) {
    query = query.eq("stage", params.stage);
  }
  if (params?.skills?.length) {
    query = query.overlaps("required_skills", params.skills);
  }
  if (params?.tags?.length) {
    query = query.overlaps("tags", params.tags);
  }
  if (params?.rolesNeeded?.length) {
    query = query.overlaps("roles_needed", params.rolesNeeded);
  }
  if (params?.minHoursPerWeek) {
    query = query.gte("hours_per_week", params.minHoursPerWeek);
  }
  if (params?.maxHoursPerWeek) {
    query = query.lte("hours_per_week", params.maxHoursPerWeek);
  }
  if (params?.maxTimelineWeeks) {
    query = query.lte("timeline_weeks", params.maxTimelineWeeks);
  }
  if (params?.ftsQuery) {
    query = query.textSearch("search_vector", params.ftsQuery, { type: "websearch" });
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    // If FTS/inner join fails (e.g. forge_scores missing), fall back without inner join
    const fallback = client
      .from("projects")
      .select("*, builders!projects_owner_id_fkey(id, full_name, first_name, last_name, display_name, avatar_url, username)", { count: "exact" });

    if (params?.status) fallback.eq("status", params.status);
    const fb = await fallback.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);
    return {
      projects: (fb.data ?? []) as unknown as (Project & { builders: any })[],
      total: fb.count ?? 0,
      page,
      pageSize,
    };
  }

  return {
    projects: data as unknown as (Project & { builders: any })[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function createProject(
  client: Client,
  project: {
    owner_id: string;
    title: string;
    description: string;
    goals?: string[];
    timeline?: string;
    hours_per_week?: number;
    required_skills?: string[];
    team_size?: number;
    status?: string;
    category?: string;
    stage?: string;
    tags?: string[];
    roles_needed?: string[];
    timeline_weeks?: number;
    hours_per_week_min?: number;
    hours_per_week_max?: number;
    team_size_target?: number;
  }
) {
  const { data, error } = await client
    .from("projects")
    .insert({ status: "draft", ...project })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Project;
}

export async function updateProject(
  client: Client,
  id: string,
  updates: {
    title?: string;
    description?: string;
    goals?: string[];
    timeline?: string;
    hours_per_week?: number;
    required_skills?: string[];
    team_size?: number;
    status?: string;
    category?: string;
    stage?: string;
    tags?: string[];
    roles_needed?: string[];
    timeline_weeks?: number;
    hours_per_week_min?: number;
    hours_per_week_max?: number;
    team_size_target?: number;
  }
) {
  const { data, error } = await client
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Project;
}
