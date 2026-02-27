import React from 'react';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Lightbulb, Rocket } from 'lucide-react';

import Header from '../components/Header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useRequireAuth } from '../lib/useRequireAuth';

export default function StartupPlaceholder() {
  const { user, checkingAuth } = useRequireAuth();

  if (checkingAuth || user === null) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (user === false) return null;

  const workflow = [
    { title: 'Problem Discovery', description: 'Validate pain points with fast interviews and signal checks.', icon: Lightbulb },
    { title: 'MVP Build Sprint', description: 'Ship one high-value user flow in a focused one-week cycle.', icon: Rocket },
    { title: 'Go-To-Market Loop', description: 'Measure conversion and iterate the onboarding journey.', icon: BriefcaseBusiness },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Startup Workspace</Badge>
            <CardTitle className="mt-2 text-3xl">From idea to traction, with less friction</CardTitle>
            <CardDescription>Organize startup execution into clear stages and stay focused on user value.</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {workflow.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardHeader>
                  <div className="mb-2 w-fit rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{step.description}</CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="flex flex-col items-start justify-between gap-4 py-6 md:flex-row md:items-center">
            <div>
              <div className="font-semibold">Ready to review progress?</div>
              <div className="text-sm text-muted-foreground">Track account-level signals and profile strength from your dashboard.</div>
            </div>
            <Button asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
