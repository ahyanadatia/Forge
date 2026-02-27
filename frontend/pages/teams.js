import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Users } from 'lucide-react';

import Header from '../components/Header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { useRequireAuth } from '../lib/useRequireAuth';

const COMMUNITY_POSTS_TABLE = 'community_postings';
const COMMUNITY_REQUESTS_TABLE = 'community_posting_requests';

function shortId(value) {
  if (!value || typeof value !== 'string') return 'unknown';
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

export default function TeamsPage() {
  const router = useRouter();
  const { user, checkingAuth } = useRequireAuth();

  const [mode, setMode] = useState('hackathon');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(null);
  const [acceptedMembers, setAcceptedMembers] = useState([]);
  const [hasAccess, setHasAccess] = useState(true);

  const postingId = useMemo(() => (
    typeof router.query?.posting === 'string' ? router.query.posting : ''
  ), [router.query?.posting]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('forge_mode');
      if (stored === 'startup' || stored === 'hackathon') {
        setMode(stored);
      }
    }
  }, []);

  useEffect(() => {
    if (!user || user === false || !postingId) return;

    let isMounted = true;

    const loadTeam = async () => {
      setLoading(true);
      setError('');
      setHasAccess(true);

      const { data: postingRow, error: postingError } = await supabase
        .from(COMMUNITY_POSTS_TABLE)
        .select('id, creator_id, creator_name, posting_type, title, description, location, team_size, tags, created_at')
        .eq('id', postingId)
        .single();

      if (!isMounted) return;

      if (postingError || !postingRow) {
        setPosting(null);
        setAcceptedMembers([]);
        setError('Could not load team project.');
        setLoading(false);
        return;
      }

      const isOwner = postingRow.creator_id === user.id;
      let isAcceptedMember = false;

      if (!isOwner) {
        const { data: membershipRow, error: membershipError } = await supabase
          .from(COMMUNITY_REQUESTS_TABLE)
          .select('id')
          .eq('posting_id', postingId)
          .eq('requester_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!membershipError && membershipRow) {
          isAcceptedMember = true;
        }
      }

      if (!isOwner && !isAcceptedMember) {
        setPosting(null);
        setAcceptedMembers([]);
        setHasAccess(false);
        setError('You do not have access to this team.');
        setLoading(false);
        return;
      }

      setPosting(postingRow);

      const { data: requestRows, error: requestsError } = await supabase
        .from(COMMUNITY_REQUESTS_TABLE)
        .select('id, requester_id, requester_name, status, created_at')
        .eq('posting_id', postingId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      if (requestsError) {
        if (isOwner) {
          setAcceptedMembers([]);
        } else {
          const { data: selfMemberRows } = await supabase
            .from(COMMUNITY_REQUESTS_TABLE)
            .select('id, requester_id, requester_name, status, created_at')
            .eq('posting_id', postingId)
            .eq('requester_id', user.id)
            .eq('status', 'accepted');
          setAcceptedMembers(selfMemberRows || []);
        }
      } else {
        setAcceptedMembers(requestRows || []);
      }

      setLoading(false);
    };

    loadTeam();

    return () => {
      isMounted = false;
    };
  }, [postingId, user]);

  if (checkingAuth || user === null) return <div className="min-h-screen flex items-center justify-center">Loading team...</div>;
  if (user === false) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} setMode={setMode} />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Teams</Badge>
            <CardTitle className="mt-2 text-3xl">Project Team</CardTitle>
            <CardDescription>View your accepted teammates for this posting.</CardDescription>
          </CardHeader>
        </Card>

        {!postingId && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Choose a team from pending requests in your dashboard.
            </CardContent>
          </Card>
        )}

        {postingId && loading && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading team details…</CardContent>
          </Card>
        )}

        {postingId && !loading && error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-10 text-center text-destructive">{error}</CardContent>
          </Card>
        )}

        {postingId && !loading && !hasAccess && (
          <div>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        )}

        {postingId && !loading && !error && hasAccess && posting && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{posting.title}</CardTitle>
                <CardDescription>
                  {posting.posting_type === 'project' ? 'Project Posting' : 'Hackathon Posting'}
                  {posting.location ? ` · ${posting.location}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{posting.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Team size {posting.team_size || 4}</Badge>
                  <Badge variant="outline">Created {String(posting.created_at || '').slice(0, 10)}</Badge>
                  {Array.isArray(posting.tags) && posting.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <CardTitle>Members</CardTitle>
                </div>
                <CardDescription>Project owner and accepted teammates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{posting.creator_name || 'Project Owner'}</p>
                  <p className="text-xs text-muted-foreground">Owner · {shortId(posting.creator_id)}</p>
                </div>

                {acceptedMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No accepted teammates yet.</p>
                )}

                {acceptedMembers.map((member) => (
                  <div key={member.id} className="rounded-xl border p-3">
                    <p className="text-sm font-medium">{member.requester_name || `Member ${shortId(member.requester_id)}`}</p>
                    <p className="text-xs text-muted-foreground">Accepted · {String(member.created_at || '').slice(0, 10)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        <div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
