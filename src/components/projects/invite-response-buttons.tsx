"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  invitationId: string;
  status: string;
  projectId: string;
}

export function InviteResponseButtons({
  invitationId,
  status,
  projectId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [responded, setResponded] = useState(status !== "pending");
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${invitationId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResponded(true);
        router.push(`/projects/${data.project_id ?? projectId}`);
      } else {
        if (data.code === "CAPACITY_FULL") {
          setError(
            `Team is full (${data.current}/${data.max}). No seats available.`
          );
        } else if (data.code === "EXPIRED") {
          setError("This invitation has expired.");
        } else {
          setError(data.error ?? "Failed to accept invitation.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${invitationId}/decline`, {
        method: "POST",
      });
      if (res.ok) {
        setResponded(true);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (responded || status !== "pending") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 p-4 text-sm">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {status === "accepted"
              ? "You accepted this invitation."
              : status === "declined"
                ? "You declined this invitation."
                : status === "expired"
                  ? "This invitation has expired."
                  : "This invitation is no longer active."}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}
      <div className="flex gap-3">
        <Button
          onClick={handleAccept}
          disabled={loading}
          className="flex-1"
          size="lg"
        >
          {loading ? "Joining..." : "Accept & Join"}
        </Button>
        <Button
          onClick={handleDecline}
          disabled={loading}
          variant="outline"
          className="flex-1"
          size="lg"
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
