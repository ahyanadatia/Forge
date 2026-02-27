"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { createApplication } from "@/services/applications";
import { CheckCircle2 } from "lucide-react";

interface Props {
  projectId: string;
  userId: string;
}

export function ApplyButton({ projectId, userId }: Props) {
  const [state, setState] = useState<"idle" | "form" | "loading" | "done">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const handleApply = async () => {
    setState("loading");
    try {
      const supabase = createClient();
      await createApplication(supabase, {
        project_id: projectId,
        builder_id: userId,
        message: message || undefined,
      });
      setState("done");
    } catch {
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Application submitted
        </CardContent>
      </Card>
    );
  }

  if (state === "form" || state === "loading") {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <Input
            placeholder="Optional message to the project owner..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              disabled={state === "loading"}
              size="sm"
            >
              {state === "loading" ? "Applying..." : "Submit Application"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState("idle")}
              disabled={state === "loading"}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button onClick={() => setState("form")}>Apply to this Project</Button>
  );
}
