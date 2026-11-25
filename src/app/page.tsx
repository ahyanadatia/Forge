import Link from "next/link";
import { ArrowRight, CheckCircle2, GitBranch, Globe, Hammer, Lock, Scale, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForgeScoreV3Card } from "@/components/score/forge-score-v3-card";
import { toV3View, toHistorySeries } from "@/lib/score/v3-view";

// Illustrative numbers for the product preview only.
const exampleView = toV3View({
  score_v3: 612,
  delta: 21,
  model_version: "v3.0",
  breakdown: { dimensions: { ec: 68, rc: 74, aoi: 51, lpi: 83 }, confidence: 61, tenure_months: 7 },
});
const exampleHistory = toHistorySeries(
  [480, 505, 523, 549, 570, 591, 612].map((s, i) => ({
    score_v3: s,
    computed_at: new Date(Date.UTC(2026, 4 + i, 1)).toISOString(),
  }))
);

const steps = [
  {
    icon: GitBranch,
    title: "Log what you shipped",
    body: "A delivery is a live URL plus the GitHub repo behind it, tied to a project and a team.",
  },
  {
    icon: Globe,
    title: "Forge checks it",
    body: "Probes hit the deployment and the GitHub API, and every result is written to an append-only evidence ledger.",
  },
  {
    icon: Scale,
    title: "Evidence becomes a score",
    body: "A versioned, pure scoring model turns evidence into a 100–999 score, with anti-gaming checks and rate-limited movement.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2" aria-label="Forge home">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Hammer className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight">Forge</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/discover">Explore builders</Link>
            </Button>
            <Button asChild size="sm" variant="brand">
              <Link href="/login">
                Sign in <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
              Evidence, not self-description
            </p>
            <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              A track record for builders that <span className="text-brand">checks itself.</span>
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              CVs say what you claim. Forge verifies what you shipped: live deployments, real commits and finished
              team projects, turned into a score teams can use to pick collaborators who deliver.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="brand">
                <Link href="/login">
                  Build your record <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/discover">See builders</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-brand/15 via-transparent to-transparent blur-2xl" aria-hidden />
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Example profile score</p>
            <ForgeScoreV3Card view={exampleView} history={exampleHistory} isOwner={false} />
          </div>
        </section>

        <section className="border-y bg-card/60">
          <div className="container py-16 md:py-20">
            <h2 className="mb-10 text-2xl font-semibold sm:text-3xl">How it works</h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-xl border bg-background p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <s.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">Step {i + 1}</span>
                  </div>
                  <h3 className="mb-1.5 font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="container grid gap-10 py-16 md:grid-cols-2 md:py-20">
          <div className="space-y-3">
            <Users className="h-6 w-6 text-brand" aria-hidden />
            <h2 className="text-2xl font-semibold">Find people who finish</h2>
            <p className="text-muted-foreground">
              Post a project with the roles you need. Forge ranks builders by skill fit, availability and verified
              delivery history, and shows how likely each one is to accept.
            </p>
          </div>
          <div className="space-y-3">
            <Lock className="h-6 w-6 text-brand" aria-hidden />
            <h2 className="text-2xl font-semibold">Built so it can&apos;t be gamed easily</h2>
            <p className="text-muted-foreground">
              Users can read their evidence but never write it. Deployment probes are SSRF-guarded, bursty activity
              and attestation rings are discounted, and higher tiers need months of history.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex flex-col gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <Hammer className="h-4 w-4" aria-hidden /> Forge
          </span>
          <a href="https://github.com/ahyanadatia/Forge" className="hover:text-foreground">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
