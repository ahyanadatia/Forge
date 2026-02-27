import type { Delivery } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getDelivery(client: Client, id: string) {
  const { data, error } = await client
    .from("deliveries")
    .select("*, builders(*), projects(*), evidence(*), verifications(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Delivery;
}

export async function getBuilderDeliveries(
  client: Client,
  builderId: string,
  options?: { status?: string; limit?: number }
) {
  let query = client
    .from("deliveries")
    .select("*, verifications(*)")
    .eq("builder_id", builderId)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Delivery[];
}

export async function createDelivery(
  client: Client,
  delivery: {
    builder_id: string;
    project_id?: string;
    title: string;
    description: string;
    role: string;
    stack?: string[];
    deployment_url?: string;
    repo_url?: string;
    started_at?: string;
  }
) {
  const { data, error } = await client
    .from("deliveries")
    .insert(delivery)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Delivery;
}

export async function updateDelivery(
  client: Client,
  id: string,
  updates: {
    title?: string;
    description?: string;
    role?: string;
    stack?: string[];
    status?: string;
    deployment_url?: string | null;
    repo_url?: string | null;
    completed_at?: string | null;
  }
) {
  const { data, error } = await client
    .from("deliveries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Delivery;
}
