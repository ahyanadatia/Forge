import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, UserRound, Users } from 'lucide-react';
import { useRouter } from 'next/router';

import CommunityProfileModal from '../components/CommunityProfileModal';
import Header from '../components/Header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { useRequireAuth } from '../lib/useRequireAuth';

const COMMUNITY_POSTS_TABLE = 'community_postings';
const COMMUNITY_REQUESTS_TABLE = 'community_posting_requests';

function formatShortId(value) {
  if (!value || typeof value !== 'string') return 'Unknown';
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}…`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString || '';
  return date.toISOString().slice(0, 10);
}

function avatarForUser(userId) {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(userId || 'forge-user')}`;
}

export default function FindTeammate() {
  const { user, checkingAuth } = useRequireAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [postingFilter, setPostingFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [requestError, setRequestError] = useState('');

  const [requestedPostIds, setRequestedPostIds] = useState(new Set());
  const [requestingPostId, setRequestingPostId] = useState('');
  const [selectedCreatorId, setSelectedCreatorId] = useState('');

  useEffect(() => {
    if (!user || user === false) return;

    let isMounted = true;

    const loadData = async () => {
      setLoadingPosts(true);
      setPostsError('');
      setRequestError('');

      const { data: postRows, error: postError } = await supabase
        .from(COMMUNITY_POSTS_TABLE)
        .select('id, creator_id, creator_name, creator_github_username, posting_type, title, description, location, team_size, tags, created_at, is_open')
        .eq('is_open', true)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (postError) {
        setPosts([]);
        setRequestedPostIds(new Set());
        setPostsError('Could not load teammate postings from database. Please check Supabase setup.');
        setLoadingPosts(false);
        return;
      }

      setPosts(postRows || []);

      const { data: ownRequests } = await supabase
        .from(COMMUNITY_REQUESTS_TABLE)
        .select('posting_id')
        .eq('requester_id', user.id);

      if (isMounted) {
        setRequestedPostIds(new Set((ownRequests || []).map((row) => row.posting_id)));
        setLoadingPosts(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const requestToJoin = async (postId) => {
    if (!user || requestedPostIds.has(postId)) return;

    setRequestError('');
    setRequestingPostId(postId);
    const { error } = await supabase
      .from(COMMUNITY_REQUESTS_TABLE)
      .insert({
        posting_id: postId,
        requester_id: user.id,
        status: 'pending',
      });

    if (!error) {
      setRequestedPostIds((prev) => new Set([...Array.from(prev), postId]));
      setRequestingPostId('');
      return;
    }
    setRequestError('Could not send join request. Please try again.');
    setRequestingPostId('');
  };

  const creatorProfiles = useMemo(() => {
    const grouped = new Map();

    posts.forEach((post) => {
      if (!post?.creator_id) return;
      if (!grouped.has(post.creator_id)) {
        grouped.set(post.creator_id, {
          creatorId: post.creator_id,
          displayName: post.creator_name || (post.creator_id === user?.id ? (user?.user_metadata?.name || 'You') : `User ${formatShortId(post.creator_id)}`),
          githubUsername: post.creator_github_username || '',
          location: post.location || '',
          tags: new Set(),
          postings: [],
          postingTypes: new Set(),
        });
      }

      const profile = grouped.get(post.creator_id);
      if (post.creator_name && !profile.displayName) {
        profile.displayName = post.creator_name;
      }
      if (post.creator_github_username && !profile.githubUsername) {
        profile.githubUsername = post.creator_github_username;
      }
      profile.postings.push(post);
      profile.postingTypes.add(post.posting_type || 'project');
      if (post.location && !profile.location) {
        profile.location = post.location;
      }
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          if (tag) profile.tags.add(tag);
        });
      }
    });

    return Array.from(grouped.values())
      .map((profile) => ({
        ...profile,
        tags: Array.from(profile.tags).slice(0, 5),
        postingTypes: Array.from(profile.postingTypes),
        postingCount: profile.postings.length,
        latestPostDate: profile.postings[0]?.created_at || '',
      }))
      .sort((a, b) => String(b.latestPostDate).localeCompare(String(a.latestPostDate)));
  }, [posts, user?.id, user?.user_metadata?.name]);

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();

    return creatorProfiles.filter((profile) => {
      if (postingFilter !== 'all' && !profile.postingTypes.includes(postingFilter)) {
        return false;
      }

      if (!term) return true;

      const haystack = [
        profile.displayName,
        profile.creatorId,
        profile.location,
        ...profile.tags,
        ...profile.postings.map((post) => `${post.title} ${post.description}`),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [creatorProfiles, postingFilter, search]);

  const selectedProfile = useMemo(
    () => creatorProfiles.find((profile) => profile.creatorId === selectedCreatorId) || null,
    [creatorProfiles, selectedCreatorId]
  );

  useEffect(() => {
    if (!router.isReady) return;
    const requestedUser = typeof router.query?.user === 'string' ? router.query.user : '';
    if (!requestedUser) return;
    setSelectedCreatorId(requestedUser);
  }, [router.isReady, router.query?.user]);

  if (checkingAuth || user === null) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (user === false) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Teammate Discovery</Badge>
            <CardTitle className="mt-2 text-3xl">Find teammates from active community postings</CardTitle>
            <CardDescription>Browse builders currently looking for teammates and open their profile previews.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by role, tags, location, or posting"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              value={postingFilter}
              onChange={(event) => setPostingFilter(event.target.value)}
              className="h-10 rounded-full border border-input bg-background px-4 text-sm"
            >
              <option value="all">All posting types</option>
              <option value="hackathon">Hackathon only</option>
              <option value="project">Project only</option>
            </select>
          </CardContent>
        </Card>

        {requestError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 text-sm text-destructive">{requestError}</CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadingPosts && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-muted-foreground">Loading teammate profiles…</CardContent>
            </Card>
          )}

          {!loadingPosts && postsError && (
            <Card className="md:col-span-2 lg:col-span-3 border-destructive/30 bg-destructive/5">
              <CardContent className="py-10 text-center text-destructive">{postsError}</CardContent>
            </Card>
          )}

          {!loadingPosts && !postsError && filteredProfiles.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-muted-foreground">No teammates match this search yet.</CardContent>
            </Card>
          )}

          {!loadingPosts && !postsError && filteredProfiles.map((profile) => {
            const isYou = profile.creatorId === user.id;
            const firstOpenPosting = profile.postings.find((post) => post.creator_id !== user.id) || profile.postings[0];
            const canRequest = firstOpenPosting && firstOpenPosting.creator_id !== user.id;
            const hasRequested = firstOpenPosting ? requestedPostIds.has(firstOpenPosting.id) : false;

            return (
              <Card key={profile.creatorId}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <img src={avatarForUser(profile.creatorId)} alt={profile.displayName} className="h-12 w-12 rounded-full border" />
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{profile.displayName}</CardTitle>
                      <CardDescription className="truncate">{isYou ? 'This is your profile' : 'Community member profile'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{profile.postingCount} active postings</Badge>
                    {profile.postingTypes.map((type) => (
                      <Badge key={type} variant="secondary">{type}</Badge>
                    ))}
                    {profile.location && (
                      <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" /> {profile.location}</Badge>
                    )}
                  </div>

                  {profile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedCreatorId(profile.creatorId)}>
                      <UserRound className="mr-1 h-4 w-4" /> View Profile
                    </Button>
                    {canRequest && (
                      <Button
                        size="sm"
                        onClick={() => requestToJoin(firstOpenPosting.id)}
                        disabled={hasRequested || requestingPostId === firstOpenPosting.id}
                      >
                        {hasRequested ? 'Request sent' : requestingPostId === firstOpenPosting.id ? 'Sending…' : 'Request to join'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {selectedProfile && (
          <CommunityProfileModal
            profile={selectedProfile}
            currentUser={user}
            requestedPostIds={requestedPostIds}
            requestingPostId={requestingPostId}
            onRequestToJoin={requestToJoin}
            onClose={() => setSelectedCreatorId('')}
          />
        )}
      </main>
    </div>
  );
}
