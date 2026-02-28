/**
 * Evidence Ledger — append-only evidence ingestion for Forge Score V3.
 * All score-relevant events are recorded as immutable evidence rows.
 * Score is computed exclusively from evidence + derived rollups.
 */

import { createHash } from "crypto";
import type { EvidenceType, EvidenceSource, ScoreEvidence } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export function hashPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

export async function ingestEvidence(
  client: Client,
  params: {
    builder_id: string;
    project_id?: string | null;
    delivery_id?: string | null;
    type: EvidenceType;
    source: EvidenceSource;
    payload: Record<string, unknown>;
    confidence: number;
  }
): Promise<ScoreEvidence | null> {
  const hash = hashPayload({
    builder_id: params.builder_id,
    type: params.type,
    delivery_id: params.delivery_id ?? null,
    project_id: params.project_id ?? null,
    ...params.payload,
  });

  const { data, error } = await client
    .from("score_evidence")
    .upsert(
      {
        builder_id: params.builder_id,
        project_id: params.project_id ?? null,
        delivery_id: params.delivery_id ?? null,
        type: params.type,
        source: params.source,
        payload: params.payload,
        confidence: Math.max(0, Math.min(1, params.confidence)),
        hash,
      },
      { onConflict: "builder_id,hash", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error && error.code !== "23505") {
    console.error("Evidence ingestion failed:", error);
    return null;
  }

  return data ?? null;
}

export async function getBuilderEvidence(
  client: Client,
  builderId: string,
  opts?: { types?: EvidenceType[]; since?: string }
): Promise<ScoreEvidence[]> {
  let query = client
    .from("score_evidence")
    .select("*")
    .eq("builder_id", builderId)
    .is("superseded_by", null)
    .order("created_at", { ascending: false });

  if (opts?.types && opts.types.length > 0) {
    query = query.in("type", opts.types);
  }
  if (opts?.since) {
    query = query.gte("created_at", opts.since);
  }

  const { data } = await query;
  return (data as ScoreEvidence[]) ?? [];
}

export async function countEvidenceByType(
  client: Client,
  builderId: string
): Promise<Record<string, number>> {
  const { data } = await client
    .from("score_evidence")
    .select("type")
    .eq("builder_id", builderId)
    .is("superseded_by", null);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { type: string }[]) {
    counts[row.type] = (counts[row.type] ?? 0) + 1;
  }
  return counts;
}

/**
 * Enqueue a score recompute triggered by new evidence.
 */
export async function enqueueRecompute(
  client: Client,
  builderId: string,
  triggerType: string,
  evidenceId?: string,
  priority: number = 0
): Promise<void> {
  await client.from("score_recompute_queue").insert({
    builder_id: builderId,
    trigger_type: triggerType,
    trigger_evidence_id: evidenceId ?? null,
    priority,
  });
}
