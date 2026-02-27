import type { Evidence } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getDeliveryEvidence(
  client: Client,
  deliveryId: string
) {
  const { data, error } = await client
    .from("evidence")
    .select("*")
    .eq("delivery_id", deliveryId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as unknown as Evidence[];
}

export async function addEvidence(
  client: Client,
  evidence: {
    delivery_id: string;
    evidence_type: string;
    value: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await client
    .from("evidence")
    .insert(evidence)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Evidence;
}
