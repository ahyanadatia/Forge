"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface Props {
  invitationId: string;
  status: string;
  projectId: string;
}

export function InviteResponseButtons({ invitationId, status, projectId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [responded, setResponded] = useState(status !== "pending");

  const respond = async (action: "accepted" | "declined") => {
    setLoading(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation_id: invitationId, status: action }),
      });
      if (res.ok) {
        setResponded(true);
        if (action === "accepted") {
          router.push(`/projects/${projectId}`);
        }
      }
    } catch {
      // Silent
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
    <div className="flex gap-3">
      <Button onClick={() => respond("accepted")} disabled={loading} className="flex-1" size="lg">
        {loading ? "..." : "Accept"}
      </Button>
      <Button onClick={() => respond("declined")} disabled={loading} variant="outline" className="flex-1" size="lg">
        Decline
      </Button>
    </div>
  );
}
