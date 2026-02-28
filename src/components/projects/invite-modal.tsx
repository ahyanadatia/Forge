"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  projectId: string;
  builderId: string;
  builderName: string;
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ projectId, builderId, builderName, open, onClose }: Props) {
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          builder_id: builderId,
          role: role || undefined,
          message: message || undefined,
        }),
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setSent(false); setError(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sent ? "Invite Sent" : `Invite ${builderName}`}
          </DialogTitle>
          {!sent && (
            <DialogDescription>
              Send a project invitation. They&apos;ll see it in their dashboard.
            </DialogDescription>
          )}
        </DialogHeader>

        {sent ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Your invitation has been sent to {builderName}. Expires in 14 days.
            </p>
            <Button className="mt-4" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role (optional)</label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Backend Engineer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Tell them why you'd like them on the team..."
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSend} disabled={sending} className="w-full">
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
