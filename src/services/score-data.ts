/**
 * Efficient data gathering for Forge Score computation.
 * All queries are aggregated to avoid N+1.
 */

import type {
  ForgeScoreInput,
  DeliverySuccessInput,
  ReliabilityInput,
  DeliveryQualityInput,
  DeliveryQualityItem,
  ConsistencyInput,
  ConfidenceInput,
  VerificationSignals,
  DepthFlags,
  OwnershipSignals,
} from "@/lib/forge-score";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

export async function gatherScoreInputs(
  client: Client,
  builderId: string
): Promise<ForgeScoreInput> {
  const now = Date.now();

  const [
    deliveriesResult,
    verificationsResult,
    evidenceResult,
    projectMembershipsResult,
    activityResult,
    collaboratorsResult,
  ] = await Promise.all([
    client
      .from("deliveries")
      .select("id, status, project_id, stack, deployment_url, repo_url, started_at, completed_at, created_at, updated_at")
      .eq("builder_id", builderId),
    client
      .from("verifications")
      .select("delivery_id, deployment_reachable, repo_exists, timeline_verified, collaborator_confirmed, overall_status"),
    client
      .from("evidence")
      .select("delivery_id, evidence_type, verified"),
    client
      .from("team_members")
      .select("team_id, teams!inner(project_id, projects!inner(status))")
      .eq("builder_id", builderId),
    client
      .from("activity_events")
      .select("created_at, event_type")
      .eq("actor_id", builderId)
      .gte("created_at", new Date(now - TWELVE_MONTHS_MS).toISOString()),
    client
      .from("team_members")
      .select("team_id, teams!inner(id)")
      .neq("builder_id", builderId),
  ]);

  const deliveries: any[] = deliveriesResult.data ?? [];
  const verifications: any[] = verificationsResult.data ?? [];
  const evidence: any[] = evidenceResult.data ?? [];
  const memberships: any[] = projectMembershipsResult.data ?? [];
  const activities: any[] = activityResult.data ?? [];

  const verificationMap = new Map<string, any>();
  for (const v of verifications) {
    verificationMap.set(v.delivery_id, v);
  }

  const evidenceByDelivery = new Map<string, any[]>();
  for (const e of evidence) {
    const arr = evidenceByDelivery.get(e.delivery_id) ?? [];
    arr.push(e);
    evidenceByDelivery.set(e.delivery_id, arr);
  }

  // ─── Delivery Success ───────────────────────────────────────────────

  const verifiedDeliveries = deliveries.filter((d) => d.status === "verified");
  const n_verified_deliveries = verifiedDeliveries.length;

  const n_sustained_deliveries = verifiedDeliveries.filter((d) => {
    if (!d.completed_at || !d.started_at) return false;
    const start = new Date(d.started_at).getTime();
    return now - start >= NINETY_DAYS_MS;
  }).length;

  const completedProjectIds = new Set(
    memberships
      .filter((m: any) => m.teams?.projects?.status === "completed")
      .map((m: any) => m.teams?.project_id)
      .filter(Boolean)
  );

  const n_team_completed_deliveries = verifiedDeliveries.filter(
    (d) => d.project_id && completedProjectIds.has(d.project_id)
  ).length;

  const delivery: DeliverySuccessInput = {
    n_verified_deliveries,
    n_sustained_deliveries,
    n_team_completed_deliveries,
  };

  // ─── Reliability ────────────────────────────────────────────────────

  const projectStatuses = memberships.map(
    (m: any) => m.teams?.projects?.status
  );
  const projects_joined = projectStatuses.length;
  const projects_completed = projectStatuses.filter(
    (s: string) => s === "completed"
  ).length;
  const projects_abandoned = projectStatuses.filter(
    (s: string) => s === "cancelled" || s === "archived"
  ).length;

  const droppedDeliveries = deliveries.filter((d) => d.status === "dropped");
  const projects_late = droppedDeliveries.length;

  const reliability: ReliabilityInput = {
    projects_joined,
    projects_completed,
    projects_abandoned,
    projects_late,
    projects_no_show: 0,
  };

  // ─── Delivery Quality ──────────────────────────────────────────────

  const qualityItems: DeliveryQualityItem[] = verifiedDeliveries.map((d) => {
    const v = verificationMap.get(d.id);
    const evList = evidenceByDelivery.get(d.id) ?? [];

    const hasCollabAttestation = evList.some(
      (e) => e.evidence_type === "collaborator_attestation" && e.verified
    );
    const hasTimelineProof = evList.some(
      (e) => e.evidence_type === "timeline_proof" && e.verified
    );
    const hasContribution = evList.some(
      (e) => (e.evidence_type === "repo_url" || e.evidence_type === "screenshot") && e.verified
    );

    const verification_signals: VerificationSignals = {
      deploy_reachable: v?.deployment_reachable ?? null,
      repo_exists: v?.repo_exists ?? null,
      contribution_evidence: hasContribution || null,
      timeline_evidence: v?.timeline_verified ?? (hasTimelineProof || null),
      collaborator_attestation: v?.collaborator_confirmed ?? (hasCollabAttestation || null),
    };

    const stackText = (d.stack ?? []).join(" ").toLowerCase();
    const descText = (d.title ?? "").toLowerCase();
    const combined = stackText + " " + descText;

    const depth_flags: DepthFlags = {
      has_auth: /auth|login|oauth|jwt|session/.test(combined),
      has_database: /postgres|mysql|mongo|database|supabase|prisma|drizzle|redis/.test(combined),
      has_api: /api|rest|graphql|grpc|endpoint/.test(combined),
      has_external_integrations: /stripe|twilio|sendgrid|aws|gcp|webhook|third.?party/.test(combined),
      has_payments: /stripe|payment|billing|checkout/.test(combined),
      has_background_jobs: /queue|worker|cron|background|celery|bull/.test(combined),
    };

    const sustained = d.started_at
      ? now - new Date(d.started_at).getTime() >= NINETY_DAYS_MS
      : false;

    const ownership_signals: OwnershipSignals = {
      deployment_owner_verified: d.deployment_url ? true : null,
      domain_owner_verified: null,
      primary_operator_likely: d.repo_url ? true : null,
    };

    const updateCount = d.updated_at && d.created_at
      ? Math.max(
          1,
          Math.floor(
            (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : 0;

    return {
      verification_signals,
      depth_flags,
      sustained_90_days: sustained,
      verified: true,
      ownership_signals,
      update_windows_24h_count: Math.min(updateCount, 30),
    };
  });

  const quality: DeliveryQualityInput = { deliveries: qualityItems };

  // ─── Consistency ───────────────────────────────────────────────────

  const sixMonthsAgo = now - SIX_MONTHS_MS;
  const twelveMonthsAgo = now - TWELVE_MONTHS_MS;

  const deliveries_last_6m = verifiedDeliveries.filter(
    (d) => new Date(d.created_at).getTime() >= sixMonthsAgo
  ).length;

  const allEventDates = [
    ...deliveries
      .filter((d) => d.status === "verified" || d.status === "completed")
      .map((d) => d.completed_at ?? d.created_at),
    ...activities.map((a) => a.created_at),
  ]
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .filter((t) => t >= twelveMonthsAgo);

  const weekSet = new Set(
    allEventDates.map((t) => Math.floor(t / (7 * 24 * 60 * 60 * 1000)))
  );
  const active_weeks_last_12 = weekSet.size;

  const lastVerifiedEvent = allEventDates.length > 0
    ? Math.max(...allEventDates)
    : 0;
  const recency_days = lastVerifiedEvent > 0
    ? Math.max(0, (now - lastVerifiedEvent) / (24 * 60 * 60 * 1000))
    : 365;

  const consistency: ConsistencyInput = {
    active_weeks_last_12,
    deliveries_last_6m,
    recency_days,
  };

  // ─── Confidence ────────────────────────────────────────────────────

  const teamIds = new Set(memberships.map((m: any) => m.team_id));
  const distinctCollabResult = collaboratorsResult.data ?? [];
  const n_distinct_collaborators = new Set(
    (distinctCollabResult as any[])
      .filter((m: any) => teamIds.has(m.team_id))
      .map((m: any) => m.builder_id)
  ).size;

  const n_outcomes = projectStatuses.filter(
    (s: string) => s === "completed" || s === "cancelled" || s === "archived"
  ).length;

  const confidence: ConfidenceInput = {
    n_verified_deliveries,
    n_sustained_deliveries,
    n_distinct_collaborators,
    n_outcomes,
  };

  return { delivery, reliability, quality, consistency, confidence };
}
