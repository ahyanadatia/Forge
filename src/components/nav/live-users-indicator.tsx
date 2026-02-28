"use client";

import { useEffect, useState, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const HEARTBEAT_INTERVAL = 60_000;
const POLL_INTERVAL = 20_000;

export function LiveUsersIndicator() {
  const [count, setCount] = useState<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const heartbeat = () => {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    };

    const poll = () => {
      fetch("/api/presence/live-count")
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.live_count === "number") setCount(d.live_count);
        })
        .catch(() => {});
    };

    heartbeat();
    poll();

    heartbeatRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);
    pollRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearInterval(heartbeatRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  if (count == null || count <= 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-default select-none">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="tabular-nums">{count}</span>
            <span className="hidden sm:inline">live</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Active in the last 5 minutes</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
