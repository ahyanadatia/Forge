"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ForgeScoreExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground gap-1"
        onClick={() => setOpen(!open)}
      >
        <Info className="h-3.5 w-3.5" />
        How this is calculated
      </Button>

      {open && (
        <div className="rounded-lg border bg-card p-5 space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1">What is the Forge Score?</h3>
            <p className="text-muted-foreground">
              The Forge Score (0–1000) is a deterministic execution credibility
              metric. It measures what you have actually delivered, how reliably
              you deliver, the quality of those deliveries, and how consistently
              you stay active. It is calculated entirely from verified data on
              the platform.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">What it is NOT</h3>
            <p className="text-muted-foreground">
              It is not a social score, popularity metric, or based on
              self-reported skills. It cannot be gamed by activity volume alone.
              It reflects real, verified execution outcomes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">The Four Dimensions</h3>
            <div className="space-y-2">
              <Dimension
                name="Delivery Success"
                weight="45%"
                desc="How many verified deliveries you have, with extra weight for sustained deliveries (active 90+ days) and team project completions. Diminishing returns prevent gaming through volume."
              />
              <Dimension
                name="Reliability"
                weight="30%"
                desc="Your track record of completing projects you commit to. Abandonment and ghosting are penalized heavily. Uses Bayesian estimation for stability with small sample sizes."
              />
              <Dimension
                name="Delivery Quality"
                weight="15%"
                desc="Depth and quality of each verified delivery — verification strength, system complexity (auth, databases, APIs), sustained ownership, and iteration over time."
              />
              <Dimension
                name="Consistency"
                weight="10%"
                desc="Regular activity cadence, recent deliveries, and how recently you were last active. Rewards steady contribution over time, not one-time bursts."
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Confidence</h3>
            <p className="text-muted-foreground">
              Confidence (Low/Medium/High) reflects how much verified data backs
              the score. More verified deliveries, sustained projects, distinct
              collaborators, and completed outcomes increase confidence. The
              final score is scaled by confidence — so an unproven high score
              will appear lower than a proven one.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Score Bands</h3>
            <div className="grid grid-cols-5 gap-2 text-xs text-center">
              <Band name="New" range="0–199" />
              <Band name="Developing" range="200–399" />
              <Band name="Proven" range="400–599" />
              <Band name="Strong" range="600–799" />
              <Band name="Elite" range="800–1000" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Dimension({ name, weight, desc }: { name: string; weight: string; desc: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-medium text-sm">{name}</span>
        <span className="text-xs text-muted-foreground">{weight}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function Band({ name, range }: { name: string; range: string }) {
  return (
    <div className="rounded border px-2 py-1.5">
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground">{range}</p>
    </div>
  );
}
