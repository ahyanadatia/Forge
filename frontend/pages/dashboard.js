import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import { Activity, ArrowRight, CheckCircle2, Compass, Users } from 'lucide-react';
import { calculateScores } from '../lib/score';
import { useRequireAuth } from '../lib/useRequireAuth';
import { supabase } from '../lib/supabase';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const COMMUNITY_REQUESTS_TABLE = 'community_posting_requests';

export default function Dashboard() {
  const router = useRouter();
  const { user, checkingAuth } = useRequireAuth();
  const [scores, setScores] = useState({
    technicalCredibility: 0,
    execution: 0,
    reliabilityScore: 0,
    composite: 0,
    metrics: {
      repoCount: 0,
      languageCount: 0,
      totalStars: 0,
      pushedCommits: 0,
      activeDays: 0,
      eventsLast7Days: 0,
      eventsLast30Days: 0,
      daysSinceLastEvent: 365,
    },
  });
  const [scoresLoading, setScoresLoading] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [updatingRequestId, setUpdatingRequestId] = useState('');

  const [mode, setMode] = useState('hackathon');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('forge_mode');
      if (stored === 'startup' || stored === 'hackathon') {
        setMode(stored);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forge_mode', mode);
    }
  }, [mode]);

  useEffect(() => {
    if (!user || user === false) return;
    const username = user.user_metadata?.user_name;
    if (!username) return;

    let isMounted = true;
    const abortController = new AbortController();

    const loadScores = async () => {
      setScoresLoading(true);
      try {
        const [reposRes, eventsRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30&type=owner`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
            signal: abortController.signal,
          }),
          fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
            signal: abortController.signal,
          }),
        ]);

        const repos = reposRes.ok ? await reposRes.json() : [];
        const events = eventsRes.ok ? await eventsRes.json() : [];
        if (!isMounted) return;

        setScores(calculateScores({ repos, events }));
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') return;
        setScores(calculateScores({ repos: [], events: [] }));
      } finally {
        if (!isMounted) return;
        setScoresLoading(false);
      }
    };

    loadScores();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user]);

  useEffect(() => {
    if (!user || user === false) return;

    let isMounted = true;

    const loadIncomingRequests = async () => {
      setRequestsLoading(true);
      setRequestsError('');

      const { data, error } = await supabase
        .from(COMMUNITY_REQUESTS_TABLE)
        .select('id, posting_id, requester_id, requester_name, status, created_at, posting:community_postings!inner(id, title, creator_id, creator_name)')
        .eq('posting.creator_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setIncomingRequests([]);
        setRequestsError('Could not load pending requests.');
      } else {
        setIncomingRequests((data || []).filter((request) => request.status === 'pending'));
      }

      setRequestsLoading(false);
    };

    loadIncomingRequests();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleRequestAction = async (request, nextStatus) => {
    if (!request?.id) return;
    setUpdatingRequestId(request.id);
    setRequestsError('');

    const { error } = await supabase
      .from(COMMUNITY_REQUESTS_TABLE)
      .update({ status: nextStatus })
      .eq('id', request.id);

    if (error) {
      setRequestsError('Could not update request status. Please try again.');
      setUpdatingRequestId('');
      return;
    }

    setIncomingRequests((prev) => prev.filter((item) => item.id !== request.id));
    setUpdatingRequestId('');

    if (nextStatus === 'accepted') {
      router.push(`/teams?posting=${request.posting_id}`);
    }
  };

  if (checkingAuth || user === null) return <div className="min-h-screen flex items-center justify-center">Loading your dashboard...</div>;
  if (user === false) return null;

  const scaleTo100 = (value, maxExpected) => {
    if (maxExpected <= 0) return 0;
    return Math.max(0, Math.min(100, (value / maxExpected) * 100));
  };

  const metricScores = {
    repoCountScore: scaleTo100(scores.metrics.repoCount, 12),
    languageScore: scaleTo100(scores.metrics.languageCount, 8),
    starsScore: scaleTo100(scores.metrics.totalStars, 120),
    commitsScore: scaleTo100(scores.metrics.pushedCommits, 120),
    activityConsistencyScore: scaleTo100(scores.metrics.activeDays, 25),
    weeklyMomentumScore: scaleTo100(scores.metrics.eventsLast7Days, 20),
    monthlyMomentumScore: scaleTo100(scores.metrics.eventsLast30Days, 80),
    recencyScore: Math.max(0, Math.min(100, 100 - scaleTo100(scores.metrics.daysSinceLastEvent, 30))),
  };

  const scoreBreakdowns = {
    technical: [
      `Commit signal: 30% × ${Math.round(metricScores.commitsScore)} = ${Math.round(0.3 * metricScores.commitsScore)}`,
      `Language breadth: 25% × ${Math.round(metricScores.languageScore)} = ${Math.round(0.25 * metricScores.languageScore)}`,
      `Repo volume: 25% × ${Math.round(metricScores.repoCountScore)} = ${Math.round(0.25 * metricScores.repoCountScore)}`,
      `Community stars: 20% × ${Math.round(metricScores.starsScore)} = ${Math.round(0.2 * metricScores.starsScore)}`,
    ],
    execution: [
      `Active days: 45% × ${Math.round(metricScores.activityConsistencyScore)} = ${Math.round(0.45 * metricScores.activityConsistencyScore)}`,
      `30-day momentum: 35% × ${Math.round(metricScores.monthlyMomentumScore)} = ${Math.round(0.35 * metricScores.monthlyMomentumScore)}`,
      `7-day momentum: 20% × ${Math.round(metricScores.weeklyMomentumScore)} = ${Math.round(0.2 * metricScores.weeklyMomentumScore)}`,
    ],
    reliability: [
      `Recency: 60% × ${Math.round(metricScores.recencyScore)} = ${Math.round(0.6 * metricScores.recencyScore)}`,
      `Consistency: 40% × ${Math.round(metricScores.activityConsistencyScore)} = ${Math.round(0.4 * metricScores.activityConsistencyScore)}`,
    ],
    composite: [
      `Technical: 40% × ${scores.technicalCredibility} = ${Math.round(0.4 * scores.technicalCredibility)}`,
      `Execution: 35% × ${scores.execution} = ${Math.round(0.35 * scores.execution)}`,
      `Reliability: 25% × ${scores.reliabilityScore} = ${Math.round(0.25 * scores.reliabilityScore)}`,
    ],
  };

  const scoreCards = [
    {
      label: 'Technical Credibility',
      value: String(scores.technicalCredibility),
      detail: `${scores.metrics.languageCount} languages · ${scores.metrics.pushedCommits} commits`,
      breakdown: scoreBreakdowns.technical,
      icon: Activity,
      cardClass: 'border-blue-100 bg-blue-50/50',
      iconClass: 'text-blue-600',
      valueClass: 'text-blue-700',
    },
    {
      label: 'Execution Score',
      value: String(scores.execution),
      detail: `${scores.metrics.eventsLast30Days} events in last 30 days`,
      breakdown: scoreBreakdowns.execution,
      icon: CheckCircle2,
      cardClass: 'border-emerald-100 bg-emerald-50/50',
      iconClass: 'text-emerald-600',
      valueClass: 'text-emerald-700',
    },
    {
      label: 'Reliability Score',
      value: String(scores.reliabilityScore),
      detail: scores.metrics.daysSinceLastEvent <= 1 ? 'Active today' : `${scores.metrics.daysSinceLastEvent} days since last activity`,
      breakdown: scoreBreakdowns.reliability,
      icon: Users,
      cardClass: 'border-amber-100 bg-amber-50/50',
      iconClass: 'text-amber-600',
      valueClass: 'text-amber-700',
    },
    {
      label: 'Composite Score',
      value: String(scores.composite),
      detail: `${scores.metrics.repoCount} repos · ${scores.metrics.totalStars} stars`,
      breakdown: scoreBreakdowns.composite,
      icon: Activity,
      cardClass: 'border-violet-100 bg-violet-50/50',
      iconClass: 'text-violet-600',
      valueClass: 'text-violet-700',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} setMode={setMode} />

      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3 rounded-full border-primary/20 bg-primary/10 text-primary">{mode === 'hackathon' ? 'Hackathon Dashboard' : 'Startup Dashboard'}</Badge>
              <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.user_metadata?.name || user.email}</h1>
              <p className="mt-2 text-muted-foreground">Review your momentum and take the next best action quickly.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/profile">View Profile</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {scoreCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="group relative">
                <Card className={card.cardClass}>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between">
                      {card.label}
                      <Icon className={`h-4 w-4 ${card.iconClass}`} />
                    </CardDescription>
                    <CardTitle className={card.valueClass}>{scoresLoading ? '…' : card.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-muted-foreground">{scoresLoading ? 'Calculating from GitHub activity' : card.detail}</CardContent>
                </Card>

                <div className="pointer-events-none absolute left-1/2 top-1 z-30 hidden w-80 -translate-x-1/2 -translate-y-full rounded-[1.75rem] border bg-background p-3 text-xs shadow-xl group-hover:block">
                  <p className="mb-2 font-semibold text-foreground">{card.label} Breakdown</p>
                  {scoresLoading ? (
                    <p className="text-muted-foreground">Waiting for GitHub data…</p>
                  ) : (
                    <div className="space-y-1 text-muted-foreground">
                      {card.breakdown.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <CardTitle>Discover Channels</CardTitle>
            </div>
            <CardDescription>Choose how you want to discover opportunities: official feeds or community-created posts.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link href="/" className="group rounded-3xl border bg-card p-5 hover:border-primary/40 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Official Hackathons</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Verified listings from curated public sources.</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/?view=community" className="group rounded-3xl border bg-card p-5 hover:border-primary/40 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">User Posted</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Community projects and hackathon posts where you can request to join.</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Join Requests</CardTitle>
            <CardDescription>Review teammate requests for your postings from here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestsLoading && (
              <p className="text-sm text-muted-foreground">Loading pending requests…</p>
            )}
            {!requestsLoading && requestsError && (
              <p className="text-sm text-destructive">{requestsError}</p>
            )}
            {!requestsLoading && !requestsError && incomingRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending requests right now.</p>
            )}
            {!requestsLoading && !requestsError && incomingRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3">
                <div>
                  <p className="text-sm font-medium">{request.posting?.title || 'Your posting'}</p>
                  <p className="text-xs text-muted-foreground">Requester: {request.requester_name || `Member ${request.requester_id?.slice(0, 8)}…`} · {String(request.created_at || '').slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updatingRequestId === request.id}
                    onClick={() => handleRequestAction(request, 'rejected')}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={updatingRequestId === request.id}
                    onClick={() => handleRequestAction(request, 'accepted')}
                  >
                    Accept & Open Team
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>Team formation, sprint tracking, and structured feedback will appear here.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
