import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, Zap, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Forge" width={24} height={24} className="h-6 w-auto" />
            <span className="text-lg font-semibold tracking-tight">Forge</span>
          </Link>
          <div className="ml-auto flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            Trusted execution records for builders
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            What have you
            <br />
            <span className="text-muted-foreground">actually built?</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            LinkedIn shows employment. GitHub shows code. Forge shows what
            builders actually deliver. Verified execution records that
            founders, teams, and companies trust.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="min-w-[200px]">
                Start Building Your Record
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                Explore Builders
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-t bg-muted/30 px-4 py-24">
        <div className="container mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Verified Deliveries</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every delivery is backed by evidence — deployment checks,
                repository verification, collaborator attestations. No
                self-reported claims.
              </p>
            </div>
            <div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Execution Identity</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your Forge Score quantifies delivery track record, reliability,
                and collaboration. A single signal that speaks for itself.
              </p>
            </div>
            <div>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Build Better Teams</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Find builders by what they've actually done. Match on verified
                skills, reliability, and delivery history — not resumes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Forge" width={20} height={20} className="h-5 w-auto" />
            <span>Forge</span>
          </div>
          <p>Execution identity infrastructure for builders.</p>
        </div>
      </footer>
    </div>
  );
}
