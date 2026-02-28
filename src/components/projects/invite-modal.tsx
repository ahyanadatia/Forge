"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { CompType } from "@/types";

const COMP_OPTIONS: { value: CompType; label: string }[] = [
  { value: "tbd", label: "TBD" },
  { value: "unpaid", label: "Unpaid" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed", label: "Fixed" },
  { value: "equity", label: "Equity" },
  { value: "prize_split", label: "Prize Split" },
];

interface Props {
  projectId: string;
  builderId: string;
  builderName: string;
  open: boolean;
  onClose: () => void;
}

export function InviteModal({
  projectId,
  builderId,
  builderName,
  open,
  onClose,
}: Props) {
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [compType, setCompType] = useState<CompType>("tbd");
  const [compAmountMin, setCompAmountMin] = useState("");
  const [compAmountMax, setCompAmountMax] = useState("");
  const [compCurrency, setCompCurrency] = useState("USD");
  const [compTerms, setCompTerms] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from project roles if available
  const [projectRoles, setProjectRoles] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/projects/${projectId}/roles`)
      .then((r) => r.json())
      .then((data) => setProjectRoles(data.roles ?? []))
      .catch(() => {});
  }, [open, projectId]);

  const applyRoleDefaults = (roleName: string) => {
    setRole(roleName);
    const pr = projectRoles.find((r: any) => r.role_name === roleName);
    if (pr) {
      setCompType(pr.comp_type ?? "tbd");
      setCompAmountMin(pr.comp_amount_min?.toString() ?? "");
      setCompAmountMax(pr.comp_amount_max?.toString() ?? "");
      setCompCurrency(pr.comp_currency ?? "USD");
      setCompTerms(pr.comp_terms ?? "");
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        project_id: projectId,
        builder_id: builderId,
        role: role || undefined,
        message: message || undefined,
      };

      if (compType !== "tbd") {
        payload.comp_type = compType;
        if (compCurrency) payload.comp_currency = compCurrency;
        if (compAmountMin) payload.comp_amount_min = parseFloat(compAmountMin);
        if (compAmountMax) payload.comp_amount_max = parseFloat(compAmountMax);
        if (compTerms) payload.comp_terms = compTerms;
      }

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to send invite");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSent(false);
    setError("");
    setRole("");
    setMessage("");
    setCompType("tbd");
    setCompAmountMin("");
    setCompAmountMax("");
    setCompTerms("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sent ? "Invite Sent" : `Invite ${builderName}`}
          </DialogTitle>
          {!sent && (
            <DialogDescription>
              Send a project invitation with compensation details.
            </DialogDescription>
          )}
        </DialogHeader>

        {sent ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Your invitation has been sent to {builderName}. Expires in 14 days.
            </p>
            <Button className="mt-4" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              {projectRoles.length > 0 ? (
                <select
                  value={role}
                  onChange={(e) => applyRoleDefaults(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a role...</option>
                  {projectRoles.map((r: any) => (
                    <option key={r.role_name} value={r.role_name}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Backend Engineer"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Tell them why you'd like them on the team..."
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <label className="text-sm font-medium">Compensation Offer</label>
              <select
                value={compType}
                onChange={(e) => setCompType(e.target.value as CompType)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {COMP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {(compType === "hourly" || compType === "fixed") && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Currency
                    </label>
                    <Input
                      value={compCurrency}
                      onChange={(e) => setCompCurrency(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="USD"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Min</label>
                    <Input
                      type="number"
                      min={0}
                      value={compAmountMin}
                      onChange={(e) => setCompAmountMin(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max</label>
                    <Input
                      type="number"
                      min={0}
                      value={compAmountMax}
                      onChange={(e) => setCompAmountMax(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              {compType !== "tbd" && compType !== "unpaid" && (
                <div>
                  <label className="text-xs text-muted-foreground">
                    Terms (optional)
                  </label>
                  <textarea
                    value={compTerms}
                    onChange={(e) => setCompTerms(e.target.value)}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    placeholder="Payment terms, vesting schedule, etc."
                  />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full"
            >
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
