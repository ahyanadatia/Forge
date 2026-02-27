import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDelivery } from "@/services/deliveries";
import { getDeliveryEvidence } from "@/services/evidence";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ExternalLink,
  GitBranch,
  Calendar,
  User,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

const statusConfig: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "destructive" }> = {
  verified: { label: "Verified", variant: "success" },
  completed: { label: "Completed", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "warning" },
  dropped: { label: "Dropped", variant: "destructive" },
};

const verificationStatusConfig: Record<string, { label: string; icon: any; color: string }> = {
  verified: { label: "Verified", icon: ShieldCheck, color: "text-emerald-600" },
  partial: { label: "Partially Verified", icon: ShieldAlert, color: "text-amber-600" },
  pending: { label: "Pending Verification", icon: ShieldQuestion, color: "text-muted-foreground" },
  failed: { label: "Verification Failed", icon: ShieldAlert, color: "text-destructive" },
};

export default async function DeliveryPage({ params }: Props) {
  const supabase = await createClient();

  let delivery;
  try {
    delivery = await getDelivery(supabase, params.id);
  } catch {
    notFound();
  }

  const evidence = await getDeliveryEvidence(supabase, params.id);
  const verification = delivery.verification;
  const vConfig = verification
    ? verificationStatusConfig[verification.overall_status]
    : verificationStatusConfig.pending;
  const VIcon = vConfig.icon;
  const status = statusConfig[delivery.status] ?? statusConfig.in_progress;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {delivery.title}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-muted-foreground">{delivery.description}</p>
          </div>
          <div className={`flex items-center gap-1.5 ${vConfig.color}`}>
            <VIcon className="h-5 w-5" />
            <span className="text-sm font-medium">{vConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium">{delivery.role}</p>
            </div>
          </div>
          {delivery.started_at && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Started</p>
                <p className="text-sm font-medium">
                  {formatDate(delivery.started_at)}
                </p>
              </div>
            </div>
          )}
          {delivery.completed_at && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-medium">
                  {formatDate(delivery.completed_at)}
                </p>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {delivery.stack.map((tech) => (
                <Badge key={tech} variant="secondary" className="text-xs">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex gap-3">
        {delivery.deployment_url && (
          <a
            href={delivery.deployment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Deployment
          </a>
        )}
        {delivery.repo_url && (
          <a
            href={delivery.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            Repository
          </a>
        )}
      </div>

      {/* Verification Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Verification Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {verification && (
            <div className="grid gap-3 sm:grid-cols-2">
              <VerificationCheck
                label="Deployment Reachable"
                value={verification.deployment_reachable}
              />
              <VerificationCheck
                label="Repository Exists"
                value={verification.repo_exists}
              />
              <VerificationCheck
                label="Timeline Verified"
                value={verification.timeline_verified}
              />
              <VerificationCheck
                label="Collaborator Confirmed"
                value={verification.collaborator_confirmed}
              />
            </div>
          )}

          {evidence.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Evidence
                </p>
                {evidence.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium capitalize">
                        {e.evidence_type.replace(/_/g, " ")}
                      </span>
                      <span className="ml-2 text-muted-foreground truncate">
                        {e.value}
                      </span>
                    </div>
                    <Badge
                      variant={e.verified ? "success" : "outline"}
                      className="text-xs"
                    >
                      {e.verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {!verification && evidence.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No verification evidence submitted yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Builder link */}
      {delivery.builder && (
        <div className="text-sm text-muted-foreground">
          Delivered by{" "}
          <Link
            href={`/profile/${delivery.builder_id}`}
            className="font-medium text-foreground hover:underline"
          >
            {(delivery.builder as any).display_name || [(delivery.builder as any).first_name, (delivery.builder as any).last_name].filter(Boolean).join(" ") || (delivery.builder as any).full_name}
          </Link>
        </div>
      )}
    </div>
  );
}

function VerificationCheck({
  label,
  value,
}: {
  label: string;
  value: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value === null ? (
        <span className="text-xs text-muted-foreground">N/A</span>
      ) : value ? (
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
      ) : (
        <ShieldAlert className="h-4 w-4 text-destructive" />
      )}
    </div>
  );
}
