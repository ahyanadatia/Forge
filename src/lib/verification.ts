import type { Evidence, VerificationStatus } from "@/types";

interface VerificationInput {
  evidence: Evidence[];
  deployment_url: string | null;
  repo_url: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface VerificationResult {
  deployment_reachable: boolean | null;
  repo_exists: boolean | null;
  timeline_verified: boolean | null;
  collaborator_confirmed: boolean | null;
  overall_status: VerificationStatus;
}

export function runVerification(input: VerificationInput): VerificationResult {
  const result: VerificationResult = {
    deployment_reachable: null,
    repo_exists: null,
    timeline_verified: null,
    collaborator_confirmed: null,
    overall_status: "pending",
  };

  const deploymentEvidence = input.evidence.filter(
    (e) => e.evidence_type === "deployment_url"
  );
  if (deploymentEvidence.length > 0 || input.deployment_url) {
    result.deployment_reachable = deploymentEvidence.some((e) => e.verified);
  }

  const repoEvidence = input.evidence.filter(
    (e) => e.evidence_type === "repo_url"
  );
  if (repoEvidence.length > 0 || input.repo_url) {
    result.repo_exists = repoEvidence.some((e) => e.verified);
  }

  const timelineEvidence = input.evidence.filter(
    (e) => e.evidence_type === "timeline_proof"
  );
  if (input.started_at && input.completed_at) {
    const durationMs =
      new Date(input.completed_at).getTime() -
      new Date(input.started_at).getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    result.timeline_verified =
      durationDays > 0 &&
      durationDays < 365 &&
      timelineEvidence.some((e) => e.verified);
  }

  const attestations = input.evidence.filter(
    (e) => e.evidence_type === "collaborator_attestation"
  );
  if (attestations.length > 0) {
    result.collaborator_confirmed = attestations.some((e) => e.verified);
  }

  result.overall_status = determineOverallStatus(result);
  return result;
}

function determineOverallStatus(result: VerificationResult): VerificationStatus {
  const checks = [
    result.deployment_reachable,
    result.repo_exists,
    result.timeline_verified,
    result.collaborator_confirmed,
  ].filter((c) => c !== null);

  if (checks.length === 0) return "pending";

  const passed = checks.filter((c) => c === true).length;
  const total = checks.length;

  if (passed === total) return "verified";
  if (passed > 0) return "partial";
  return "failed";
}
