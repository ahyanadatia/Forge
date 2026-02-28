"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function UsernameOnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [claiming, setClaiming] = useState(false);

  const checkAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    try {
      const res = await fetch(`/api/username/check?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (data.error) {
        setStatus("invalid");
        setError(data.error);
      } else if (data.available) {
        setStatus("available");
        setError("");
      } else {
        setStatus("taken");
        setError("Username is already taken");
        if (data.suggestion) setSuggestion(data.suggestion);
      }
    } catch {
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) checkAvailability(username.toLowerCase());
    }, 400);
    return () => clearTimeout(timer);
  }, [username, checkAvailability]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/username/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/u/${data.username}`);
      } else {
        setError(data.error ?? "Failed to claim username");
        setStatus("taken");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Choose your username</CardTitle>
          <CardDescription>
            This will be your unique handle on Forge. You can change it later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                forge.dev/u/
              </span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="pl-[5.5rem]"
                placeholder="your_username"
                maxLength={20}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {status === "available" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {(status === "taken" || status === "invalid") && <XCircle className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {status === "taken" && suggestion && (
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setUsername(suggestion)}
              >
                Try &ldquo;{suggestion}&rdquo; instead?
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              3-20 characters. Lowercase letters, numbers, and underscores only.
            </p>
          </div>
          <Button
            onClick={handleClaim}
            disabled={status !== "available" || claiming}
            className="w-full"
          >
            {claiming ? "Claiming..." : "Claim Username"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => router.push("/dashboard")}
          >
            Skip for now
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
