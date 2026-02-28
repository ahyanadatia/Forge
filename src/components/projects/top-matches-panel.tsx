"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { getConfidenceLabel } from "@/lib/forge-score";
import { InviteModal } from "@/components/projects/invite-modal";
import Link from "next/link";

interface MatchData {
  builder: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    role_descriptor: string | null;
    forge_score: number;
    confidence_score: number;
    availability: string;
  };
  compatibility: {
    scorePercent: number;
    breakdown: {
      skillFit: number;
      reliabilityFit: number;
      executionFit: number;
      stackFit: number;
      commitmentFit: number;
    };
    reasons: string[];
  };
  acceptance: {
    percent: number;
    confidence: string;
    reasons: string[];
  };
}

interface Props {
  projectId: string;
}

export function TopMatchesPanel({ projectId }: Props) {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MatchData | null>(null);
  const [inviteTarget, setInviteTarget] = useState<{ builderId: string; name: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/matches`);
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Finding best matches...
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) return null;

  const getName = (b: MatchData["builder"]) =>
    b.display_name || [b.first_name, b.last_name].filter(Boolean).join(" ") || b.full_name;

  const getInitials = (b: MatchData["builder"]) =>
    (b.first_name?.[0] ?? b.full_name?.[0] ?? "?").toUpperCase() +
    (b.last_name?.[0] ?? "").toUpperCase();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Recommended Builders</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ranked by project compatibility and likelihood to accept.
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {matches.map((m) => (
            <button
              key={m.builder.id}
              onClick={() => setSelected(m)}
              className="w-full flex items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/50"
            >
              {/* Left: Avatar + info */}
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={m.builder.avatar_url ?? undefined} />
                <AvatarFallback className="text-sm">{getInitials(m.builder)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{getName(m.builder)}</span>
                  {m.builder.username && (
                    <span className="text-xs text-muted-foreground">@{m.builder.username}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono tabular-nums">{m.builder.forge_score}</span>
                  <span className="text-xs text-muted-foreground">
                    {getConfidenceLabel(m.builder.confidence_score)}
                  </span>
                </div>
              </div>

              {/* Center: Compatibility */}
              <div className="text-center shrink-0 w-20">
                <p className="text-xl font-semibold tabular-nums">{m.compatibility.scorePercent}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {m.acceptance.percent}% likely
                </p>
              </div>

              {/* Right: Reasons */}
              <div className="hidden sm:flex flex-col gap-0.5 shrink-0 max-w-[180px]">
                {m.compatibility.reasons.slice(0, 2).map((r, i) => (
                  <span key={i} className="text-[11px] text-muted-foreground truncate">{r}</span>
                ))}
              </div>

              {/* Far right: Actions */}
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInviteTarget({ builderId: m.builder.id, name: getName(m.builder) });
                  }}
                >
                  Invite
                </Button>
                <Link href={m.builder.username ? `/u/${m.builder.username}` : `/profile/${m.builder.id}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                    Profile
                  </Button>
                </Link>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3 mt-2">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selected.builder.avatar_url ?? undefined} />
                    <AvatarFallback>{getInitials(selected.builder)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg">{getName(selected.builder)}</SheetTitle>
                    {selected.builder.username && (
                      <p className="text-sm text-muted-foreground">@{selected.builder.username}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="font-mono tabular-nums text-xs">
                        {selected.builder.forge_score}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getConfidenceLabel(selected.builder.confidence_score)} confidence
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Match Breakdown */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Match Breakdown</h3>
                  <div className="space-y-3">
                    {([
                      ["Skill Fit", selected.compatibility.breakdown.skillFit, 35],
                      ["Reliability Fit", selected.compatibility.breakdown.reliabilityFit, 25],
                      ["Execution Fit", selected.compatibility.breakdown.executionFit, 15],
                      ["Stack Fit", selected.compatibility.breakdown.stackFit, 15],
                      ["Commitment Fit", selected.compatibility.breakdown.commitmentFit, 10],
                    ] as [string, number, number][]).map(([label, value, weight]) => (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono tabular-nums">
                            {Math.round(value * weight / 100)} / {weight}
                          </span>
                        </div>
                        <Progress value={value} className="h-1.5" />
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t text-sm font-medium">
                      <span>Total Compatibility</span>
                      <span className="text-lg tabular-nums">{selected.compatibility.scorePercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Acceptance */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Likelihood to Accept</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums">{selected.acceptance.percent}%</span>
                    <span className="text-sm text-muted-foreground">
                      {selected.acceptance.confidence} confidence
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on availability fit, invite response history, and project attractiveness.
                  </p>
                </div>

                {/* Reasons */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Why this match</h3>
                  <ul className="space-y-1.5">
                    {selected.compatibility.reasons.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-foreground mt-0.5">·</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setInviteTarget({ builderId: selected.builder.id, name: getName(selected.builder) });
                      setSelected(null);
                    }}
                  >
                    Invite to Project
                  </Button>
                  <Link href={selected.builder.username ? `/u/${selected.builder.username}` : `/profile/${selected.builder.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">View Full Profile</Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Invite Modal */}
      {inviteTarget && (
        <InviteModal
          projectId={projectId}
          builderId={inviteTarget.builderId}
          builderName={inviteTarget.name}
          open={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </>
  );
}
