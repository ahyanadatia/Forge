"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function ScoreExplainerSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground gap-1 h-7"
        >
          <Info className="h-3.5 w-3.5" />
          How Forge Score works
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Forge Score Explained</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4 text-sm">
          <Section title="What is the Forge Score?">
            The Forge Score (0–1000) is a deterministic execution credibility metric.
            It measures what you have actually delivered, how reliably you deliver,
            the quality of those deliveries, and how consistently you stay active.
            It is calculated entirely from verified data.
          </Section>

          <Section title="What it is NOT">
            It is not a social score, popularity metric, or based on self-reported skills.
            It cannot be gamed by activity volume alone.
          </Section>

          <Section title="Skills Layer">
            The Strength Map shows five skill dimensions — Backend, Frontend, ML/AI,
            Systems, and DevOps — derived from evidence signals like GitHub contributions,
            verified deliveries, and project complexity.
          </Section>

          <Section title="Trust Layer">
            The Trust Profile measures four execution traits:
          </Section>

          <div className="space-y-2">
            <DimRow name="Delivery Success" weight="45%" desc="Verified deliveries, sustained projects, and team completions." />
            <DimRow name="Reliability" weight="30%" desc="Completion rate, with heavy penalties for abandonment and ghosting." />
            <DimRow name="Quality" weight="15%" desc="Verification depth, system complexity, and sustained ownership." />
            <DimRow name="Consistency" weight="10%" desc="Regular cadence, recent activity, and steady contribution over time." />
          </div>

          <Section title="Confidence">
            Confidence (Low / Medium / High) reflects how much verified data backs the score.
            More deliveries, sustained projects, collaborators, and completed outcomes increase confidence.
            The final score is scaled by confidence — unproven high scores appear lower.
          </Section>

          <Section title="Evidence Coverage">
            Evidence coverage indicates how many skill areas have actual data.
            &quot;Low&quot; coverage means most dimensions lack verified signals.
            Add deliveries and connect GitHub to increase coverage.
          </Section>

          <Section title="Score Bands">
            <div className="grid grid-cols-5 gap-2 text-xs text-center mt-2">
              {[
                { name: "New", range: "0–199" },
                { name: "Developing", range: "200–399" },
                { name: "Proven", range: "400–599" },
                { name: "Strong", range: "600–799" },
                { name: "Elite", range: "800–1000" },
              ].map((b) => (
                <div key={b.name} className="rounded border px-2 py-1.5">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-muted-foreground">{b.range}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function DimRow({ name, weight, desc }: { name: string; weight: string; desc: string }) {
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
