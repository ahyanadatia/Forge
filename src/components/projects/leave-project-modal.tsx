"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const REASONS = [
  { value: "time_constraints", label: "Time constraints" },
  { value: "project_mismatch", label: "Project not a good fit" },
  { value: "personal_reasons", label: "Personal reasons" },
  { value: "found_other_project", label: "Found another project" },
  { value: "other", label: "Other" },
];

interface Props {
  teamId: string;
  projectTitle: string;
  open: boolean;
  onClose: () => void;
  onLeft: () => void;
}

export function LeaveProjectModal({ teamId, projectTitle, open, onClose, onLeft }: Props) {
  const [reason, setReason] = useState("time_constraints");
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const res = await fetch("/api/projects/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          reason,
          notify_owner: notifyOwner,
        }),
      });
      if (res.ok) {
        onClose();
        onLeft();
      }
    } catch {
      // Silent
    } finally {
      setLeaving(false);
    }
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave {projectTitle}?</DialogTitle>
          <DialogDescription>
            You can rejoin later if the project is still open.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Leaving may affect your reliability score.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={selectClass}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyOwner}
              onChange={(e) => setNotifyOwner(e.target.checked)}
              className="rounded border-input"
            />
            Notify project owner
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="destructive" onClick={handleLeave} disabled={leaving} className="flex-1">
              {leaving ? "Leaving..." : "Confirm Leave"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
