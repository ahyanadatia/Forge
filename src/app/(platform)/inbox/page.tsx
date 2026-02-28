"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Clock,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { formatCompRange } from "@/lib/compensation";
import { getCategoryLabel, getStageLabel } from "@/lib/project-constants";
import { AcceptConfirmationModal } from "@/components/invites/accept-confirmation-modal";
import type { CompType } from "@/types";

function getName(b: any) {
  return (
    b?.display_name ||
    [b?.first_name, b?.last_name].filter(Boolean).join(" ") ||
    b?.full_name ||
    "Unknown"
  );
}

function getInitials(b: any) {
  return (
    (b?.first_name?.[0] ?? b?.full_name?.[0] ?? "?") +
    (b?.last_name?.[0] ?? "")
  ).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function expiresIn(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 1) return `${days} days left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h left`;
}

const STATUS_STYLE: Record<string, { label: string; icon: any; variant: string }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  accepted: { label: "Accepted", icon: CheckCircle2, variant: "default" },
  declined: { label: "Declined", icon: XCircle, variant: "outline" },
  expired: { label: "Expired", icon: AlertCircle, variant: "outline" },
  withdrawn: { label: "Withdrawn", icon: AlertCircle, variant: "outline" },
  revoked: { label: "Revoked", icon: AlertCircle, variant: "destructive" },
};

export default function InboxPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmInvite, setConfirmInvite] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleAccept = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const res = await fetch(`/api/invites/${inviteId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setInvites((prev) =>
          prev.map((i) => (i.id === inviteId ? { ...i, status: "accepted" } : i))
        );
        setConfirmInvite(null);
        if (data.project_id) {
          router.push(`/projects/${data.project_id}`);
        }
      } else {
        alert(data.error || "Failed to accept");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const res = await fetch(`/api/invites/${inviteId}/decline`, {
        method: "POST",
      });
      if (res.ok) {
        setInvites((prev) =>
          prev.map((i) =>
            i.id === inviteId ? { ...i, status: "declined" } : i
          )
        );
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const pending = invites.filter((i) => i.status === "pending");
  const past = invites.filter((i) => i.status !== "pending");

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invitations and notifications
          </p>
        </div>
        {pending.length > 0 && (
          <Badge variant="default" className="text-sm">
            {pending.length} pending
          </Badge>
        )}
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Invites
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invites" className="space-y-4 mt-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : invites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">No invites yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When someone invites you to a project, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Pending ({pending.length})
                  </h2>
                  {pending.map((invite) => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      onAccept={() => setConfirmInvite(invite)}
                      onDecline={() => handleDecline(invite.id)}
                      loading={actionLoading === invite.id}
                    />
                  ))}
                </div>
              )}

              {past.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    History ({past.length})
                  </h2>
                  {past.map((invite) => (
                    <InviteCard key={invite.id} invite={invite} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {confirmInvite && (
        <AcceptConfirmationModal
          open={!!confirmInvite}
          invite={confirmInvite}
          onConfirm={() => handleAccept(confirmInvite.id)}
          onClose={() => setConfirmInvite(null)}
          loading={actionLoading === confirmInvite?.id}
        />
      )}
    </div>
  );
}

function InviteCard({
  invite,
  onAccept,
  onDecline,
  loading,
}: {
  invite: any;
  onAccept?: () => void;
  onDecline?: () => void;
  loading?: boolean;
}) {
  const project = invite.project;
  const sender = invite.sender;
  const isPending = invite.status === "pending";
  const isExpired =
    invite.status === "expired" ||
    (isPending && new Date(invite.expires_at) < new Date());
  const statusInfo = STATUS_STYLE[invite.status] ?? STATUS_STYLE.pending;
  const StatusIcon = statusInfo.icon;

  const compLabel = formatCompRange(
    invite.comp_type as CompType,
    invite.comp_currency,
    invite.comp_amount_min,
    invite.comp_amount_max,
    invite.comp_equity_range
  );

  return (
    <Card
      className={
        isPending && !isExpired
          ? "border-primary/20 shadow-sm"
          : "opacity-80"
      }
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: project + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${project?.id}`}
                className="font-semibold text-sm hover:underline truncate"
              >
                {project?.title ?? "Unknown Project"}
              </Link>
              {project?.category && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {getCategoryLabel(project.category)}
                </Badge>
              )}
            </div>
            {project?.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {isExpired ? "Expired" : statusInfo.label}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {sender && (
            <span className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={sender.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(sender)}
                </AvatarFallback>
              </Avatar>
              From {getName(sender)}
            </span>
          )}
          {invite.role && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> Role: {invite.role}
            </span>
          )}
          {compLabel !== "TBD" && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> {compLabel}
            </span>
          )}
          {isPending && !isExpired && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {expiresIn(invite.expires_at)}
            </span>
          )}
          <span>{timeAgo(invite.created_at)}</span>
        </div>

        {invite.message && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 italic">
            &ldquo;{invite.message}&rdquo;
          </p>
        )}

        {/* Actions for pending */}
        {isPending && !isExpired && onAccept && onDecline && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={onAccept}
              disabled={loading}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {loading ? "..." : "Accept"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDecline}
              disabled={loading}
            >
              Decline
            </Button>
            <Link href={`/invitations/${invite.id}`} className="ml-auto">
              <Button size="sm" variant="ghost" className="gap-1 text-xs">
                View Details <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {invite.status === "accepted" && invite.project?.id && (
          <Link href={`/projects/${invite.project.id}`}>
            <Button size="sm" variant="ghost" className="gap-1 text-xs">
              Go to project <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
