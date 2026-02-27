import type { Application } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getProjectApplications(
  client: Client,
  projectId: string
) {
  const { data, error } = await client
    .from("applications")
    .select("*, builders(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as (Application & { builders: any })[];
}

export async function getBuilderApplications(
  client: Client,
  builderId: string
) {
  const { data, error } = await client
    .from("applications")
    .select("*, projects(*, builders!projects_owner_id_fkey(*))")
    .eq("builder_id", builderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as Application[];
}

export async function createApplication(
  client: Client,
  application: {
    project_id: string;
    builder_id: string;
    message?: string;
  }
) {
  const { data, error } = await client
    .from("applications")
    .insert(application)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Application;
}

export async function updateApplicationStatus(
  client: Client,
  id: string,
  status: "accepted" | "rejected" | "withdrawn"
) {
  const { data, error } = await client
    .from("applications")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Application;
}
