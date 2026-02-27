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
    page?: number;
    pageSize?: number;
  }
) {
  const { page = 1, pageSize = 20 } = params ?? {};
  const offset = (page - 1) * pageSize;

  let query = client
    .from("projects")
    .select("*, builders!projects_owner_id_fkey(*)", { count: "exact" });

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  if (params?.skills?.length) {
    query = query.overlaps("required_skills", params.skills);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

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
    timeline: string;
    hours_per_week: number;
    required_skills?: string[];
    team_size?: number;
  }
) {
  const { data, error } = await client
    .from("projects")
    .insert(project)
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
