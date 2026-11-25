"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // fall through
  }
  return `Request failed (${res.status})`;
}

/**
 * Queues a V3 recompute for the signed-in builder, then processes their own
 * queued job straight away so the result shows without waiting for the cron.
 */
export function RecomputeV3Button({ label = "Recompute score", size = "sm" as const }: { label?: string; size?: "sm" | "default" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function run() {
    setBusy(true);
    try {
      const queued = await fetch("/api/scoring/v3/compute", { method: "POST" });
      if (!queued.ok) {
        toast.error(await readError(queued));
        return;
      }
      const processed = await fetch("/api/scoring/v3/process-queue", { method: "POST" });
      if (!processed.ok) {
        toast.error(await readError(processed));
        return;
      }
      toast.success("Score updated from your latest evidence.");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size={size} onClick={run} disabled={busy} aria-busy={busy}>
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
      {busy ? "Recomputing…" : label}
    </Button>
  );
}
