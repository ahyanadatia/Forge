"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Clock, DollarSign, Briefcase } from "lucide-react";
import { formatCompRange, getCompLabel } from "@/lib/compensation";
import { getCategoryLabel } from "@/lib/project-constants";
import type { CompType } from "@/types";

interface Props {
  open: boolean;
  invite: any;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function getName(b: any) {
  return (
    b?.display_name ||
    [b?.first_name, b?.last_name].filter(Boolean).join(" ") ||
    b?.full_name ||
    "Unknown"
  );
}

export function AcceptConfirmationModal({
  open,
  invite,
  onConfirm,
  onClose,
  loading,
}: Props) {
  const project = invite?.project;
  const sender = invite?.sender;

  const compLabel = formatCompRange(
    invite?.comp_type as CompType,
    invite?.comp_currency,
    invite?.comp_amount_min,
    invite?.comp_amount_max,
    invite?.comp_equity_range
  );

  const hasComp = invite?.comp_type && invite.comp_type !== "tbd";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join {project?.title}?</DialogTitle>
          <DialogDescription>
            Review the details below before accepting this invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Role */}
          {invite?.role && (
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Your Role</p>
                <p className="text-sm font-medium">{invite.role}</p>
              </div>
            </div>
          )}

          {/* Compensation */}
          {hasComp && (
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Compensation</p>
                <p className="text-sm font-medium">{compLabel}</p>
                {invite.comp_type && (
                  <p className="text-xs text-muted-foreground">
                    {getCompLabel(invite.comp_type as CompType)}
                  </p>
                )}
              </div>
            </div>
          )}

          {invite?.comp_terms && (
            <div className="bg-muted/50 rounded-md px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">Terms</p>
              <p className="text-xs">{invite.comp_terms}</p>
            </div>
          )}

          {/* Project details */}
          <Separator />

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {project?.category && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(project.category)}
                </Badge>
              </div>
            )}
            {project?.timeline && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">{project.timeline}</span>
              </div>
            )}
            {project?.hours_per_week > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs">
                  {project.hours_per_week}h / week
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">
                Team of{" "}
                {project?.team_size_target ?? project?.team_size ?? "?"}
              </span>
            </div>
          </div>

          {sender && (
            <p className="text-xs text-muted-foreground">
              Invited by {getName(sender)}
            </p>
          )}

          {invite?.message && (
            <div className="bg-muted/50 rounded-md px-3 py-2">
              <p className="text-xs italic">&ldquo;{invite.message}&rdquo;</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Joining..." : "Confirm & Join"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
