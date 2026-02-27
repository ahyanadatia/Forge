import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import { ArrowUpRight, MapPin, Plus, Search, UserRound, Users } from 'lucide-react';

import CommunityProfileModal from '../components/CommunityProfileModal';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { fetchUpcomingHackathons } from '../lib/hackathons';
import { supabase } from '../lib/supabase';

const COMMUNITY_POSTS_TABLE = 'community_postings';
const COMMUNITY_REQUESTS_TABLE = 'community_posting_requests';

function formatStableDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toISOString().slice(0, 10);
}

function getLocationCandidates(location) {
  if (!location) return [];
  const segments = location
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  return Array.from(new Set([location.trim(), ...segments]));
}

function formatShortId(value) {
  if (!value || typeof value !== 'string') return 'Unknown';
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}…`;
}

export default function Home({ hackathons = [], fetchError = '', fetchedAt = '' }) {
  const router = useRouter();
  const [discoverMode, setDiscoverMode] = useState('official');
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(18);
  const [user, setUser] = useState(null);

  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState('');
  const [communityActionError, setCommunityActionError] = useState('');
  const [requestingPostId, setRequestingPostId] = useState('');
  const [requestedPostIds, setRequestedPostIds] = useState(new Set());

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    postingType: 'hackathon',
    title: '',
    description: '',
    location: '',
    teamSize: '4',
    tags: '',
  });

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setUser(data?.user || false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const requested = typeof router.query?.view === 'string' ? router.query.view : '';
    if (requested === 'community') {
      setDiscoverMode('community');
    } else {
      setDiscoverMode('official');
    }
  }, [router.isReady, router.query?.view]);

  const handleDiscoverModeChange = (mode) => {
    setDiscoverMode(mode);
    if (mode === 'community') {
      router.replace({ pathname: '/', query: { view: 'community' } }, undefined, { shallow: true });
    } else {
      router.replace({ pathname: '/' }, undefined, { shallow: true });
    }
  };

  useEffect(() => {
    if (discoverMode !== 'community') return;

    let isMounted = true;

    const loadCommunityData = async () => {
      setCommunityLoading(true);
      setCommunityError('');
      setCommunityActionError('');

      const { data: postsData, error: postsError } = await supabase
        .from(COMMUNITY_POSTS_TABLE)
        .select('id, creator_id, creator_name, creator_github_username, posting_type, title, description, location, team_size, tags, created_at, is_open')
        .eq('is_open', true)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (postsError) {
        setCommunityPosts([]);
        setRequestedPostIds(new Set());
        setCommunityError('Could not load community postings. Please verify Supabase tables and RLS policies.');
        setCommunityLoading(false);
        return;
      }

      setCommunityPosts(postsData || []);

      if (user?.id) {
        const { data: requestsData, error: requestsError } = await supabase
          .from(COMMUNITY_REQUESTS_TABLE)
          .select('posting_id')
          .eq('requester_id', user.id);

        if (isMounted) {
          if (requestsError) {
            setRequestedPostIds(new Set());
          } else {
            setRequestedPostIds(new Set((requestsData || []).map((row) => row.posting_id)));
          }
        }
      } else if (isMounted) {
        setRequestedPostIds(new Set());
      }

      if (isMounted) {
        setCommunityLoading(false);
      }
    };

    loadCommunityData();
    return () => {
      isMounted = false;
    };
  }, [discoverMode, user?.id]);

  const selectedCommunityProfile = useMemo(() => {
    if (!selectedCreatorId) return null;
    const posts = communityPosts.filter((post) => post.creator_id === selectedCreatorId);
    if (posts.length === 0) return null;

    const lead = posts[0];
    return {
      creatorId: selectedCreatorId,
      creatorName: lead.creator_name || `User ${formatShortId(selectedCreatorId)}`,
      displayName: lead.creator_name || `User ${formatShortId(selectedCreatorId)}`,
      githubUsername: lead.creator_github_username || '',
      location: lead.location || '',
      postings: posts,
      postingCount: posts.length,
      latestPostDate: posts[0]?.created_at || '',
    };
  }, [selectedCreatorId, communityPosts]);

  const locationOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        hackathons
          .flatMap((hackathon) => getLocationCandidates(hackathon.location))
          .filter(Boolean)
      )
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [hackathons]);

  const countryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(hackathons.map((h) => h.country).filter((c) => c && c !== 'Unknown'))
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [hackathons]);

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const locationValue = locationFilter.trim().toLowerCase();
    const countryValue = countryFilter.trim().toLowerCase();

    return hackathons.filter((h) => {
      const name = h.name.toLowerCase();
      const location = h.location.toLowerCase();
      const description = h.description.toLowerCase();

      const matchesSearch =
        !searchValue ||
        name.includes(searchValue) ||
        location.includes(searchValue) ||
        description.includes(searchValue);

      const matchesLocation =
        !locationValue ||
        location.includes(locationValue) ||
        locationValue.includes(location);

      const matchesCountry =
        !countryValue ||
        (h.country && h.country.toLowerCase().includes(countryValue));

      const matchesFormat =
        formatFilter === 'all' ||
        (formatFilter === 'online' && h.isOnline) ||
        (formatFilter === 'university' && h.isUniversity) ||
        (formatFilter === 'real' && h.isInPerson);

      return matchesSearch && matchesLocation && matchesCountry && matchesFormat;
    });
  }, [hackathons, search, locationFilter, countryFilter, formatFilter]);

  useEffect(() => {
    setVisibleCount(18);
  }, [search, formatFilter, locationFilter, countryFilter]);

  const visibleHackathons = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'online', label: 'Online' },
    { key: 'university', label: 'University' },
    { key: 'real', label: 'Real (In-Person)' },
  ];

  const createCommunityPosting = async (event) => {
    event.preventDefault();
    if (!user) {
      setCreateError('Please log in to create a posting.');
      return;
    }
    if (!createForm.title.trim() || !createForm.description.trim()) {
      setCreateError('Title and description are required.');
      return;
    }

    setCreateLoading(true);
    setCreateError('');
    setCommunityActionError('');

    const payload = {
      creator_id: user.id,
      posting_type: createForm.postingType,
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      location: createForm.location.trim(),
      team_size: Math.max(2, Math.min(12, Number(createForm.teamSize) || 4)),
      tags: createForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_open: true,
    };

    const { data, error } = await supabase
      .from(COMMUNITY_POSTS_TABLE)
      .insert(payload)
      .select('id, creator_id, creator_name, creator_github_username, posting_type, title, description, location, team_size, tags, created_at, is_open')
      .single();

    if (error || !data) {
      setCreateError('Could not create posting in database. Please check Supabase setup and try again.');
      setCreateLoading(false);
      return;
    }

    setCommunityPosts((prev) => [data, ...prev]);
    setCreateForm({
      postingType: 'hackathon',
      title: '',
      description: '',
      location: '',
      teamSize: '4',
      tags: '',
    });
    setIsCreateOpen(false);
    setCreateLoading(false);
  };

  const requestToJoin = async (postId) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (requestedPostIds.has(postId)) return;

    setCommunityActionError('');
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
    } else {
      setCommunityActionError('Could not send join request. Please try again.');
    }

    setRequestingPostId('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3">Discover Opportunities</Badge>
              <h1 className="text-3xl font-bold tracking-tight">Find your next hackathon</h1>
              <p className="mt-2 text-muted-foreground">Search events, compare formats, and jump into the right challenge faster.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => handleDiscoverModeChange('official')}
              className={`rounded-3xl border p-4 text-left ${discoverMode === 'official' ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/40'}`}
            >
              <div className="text-base font-semibold">Official Hackathons</div>
              <p className="mt-1 text-sm text-muted-foreground">Curated hackathon feed from official sources.</p>
            </button>
            <button
              type="button"
              onClick={() => handleDiscoverModeChange('community')}
              className={`rounded-3xl border p-4 text-left ${discoverMode === 'community' ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/40'}`}
            >
              <div className="text-base font-semibold">User Posted</div>
              <p className="mt-1 text-sm text-muted-foreground">Projects and hackathons posted by users where you can request to join.</p>
            </button>
          </div>

          {discoverMode === 'community' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm text-muted-foreground">Post your own project or hackathon and let others request to join.</p>
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Create Posting
              </Button>
            </div>
          )}

          {discoverMode === 'official' && (
            <>
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, location, or topic"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={formatFilter === option.key ? 'default' : 'outline'}
                onClick={() => setFormatFilter(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="location-filter" className="text-sm font-medium text-muted-foreground">
              Filter by location
            </label>
            <Input
              id="location-filter"
              list="location-options"
              className="sm:max-w-xs"
              placeholder="Type a city or region"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
            <datalist id="location-options">
              {locationOptions.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </datalist>
            {locationFilter && (
              <Button size="sm" variant="outline" onClick={() => setLocationFilter('')}>
                Clear location
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="country-filter" className="text-sm font-medium text-muted-foreground">
              Filter by country
            </label>
            <Input
              id="country-filter"
              list="country-options"
              className="sm:max-w-xs"
              placeholder="Type a country name"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            />
            <datalist id="country-options">
              {countryOptions.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </datalist>
            {countryFilter && (
              <Button size="sm" variant="outline" onClick={() => setCountryFilter('')}>
                Clear country
              </Button>
            )}
          </div>
          {fetchedAt && !fetchError && (
            <p className="mt-3 text-xs text-muted-foreground">Updated daily · Last refresh {formatStableDate(fetchedAt)}</p>
          )}
            </>
          )}
        </section>

        {discoverMode === 'official' && (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {fetchError && (
            <Card className="md:col-span-2 lg:col-span-3 border-destructive/30 bg-destructive/5">
              <CardContent className="py-10 text-center text-destructive">{fetchError}</CardContent>
            </Card>
          )}

          {!fetchError && filtered.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-muted-foreground">No hackathons match your search.</CardContent>
            </Card>
          )}

          {!fetchError && visibleHackathons.map(h => (
            <Card key={h.id} className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">{h.name}</CardTitle>
                <CardDescription>{h.date} · {h.location}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{h.description}</p>
                {h.isInPerson && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Location:</span>
                    <span>{h.location || 'Venue to be announced'}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{h.timeLeft || 'Open'}</Badge>
                  {h.isOnline && <Badge variant="secondary">Online</Badge>}
                  {h.isInPerson && <Badge variant="secondary">In-Person</Badge>}
                  {h.isUniversity && <Badge variant="secondary">University</Badge>}
                  {h.country && h.country !== 'Unknown' && (
                    <Badge variant="outline" className="text-xs">{h.country}</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button size="sm" variant="outline" asChild>
                    <a href={h.url} target="_blank" rel="noreferrer">
                      View Details
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
        )}

        {discoverMode === 'community' && (
          <>
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {communityLoading && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-10 text-center text-muted-foreground">Loading user postings…</CardContent>
              </Card>
            )}

            {!communityLoading && communityError && (
              <Card className="md:col-span-2 lg:col-span-3 border-destructive/30 bg-destructive/5">
                <CardContent className="py-10 text-center text-destructive">{communityError}</CardContent>
              </Card>
            )}

            {!communityLoading && !communityError && communityPosts.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-10 text-center text-muted-foreground">No user postings yet. Be the first to create one.</CardContent>
              </Card>
            )}

            {!communityLoading && !communityError && communityActionError && (
              <Card className="md:col-span-2 lg:col-span-3 border-destructive/30 bg-destructive/5">
                <CardContent className="py-4 text-center text-sm text-destructive">{communityActionError}</CardContent>
              </Card>
            )}

            {!communityLoading && !communityError && communityPosts.map((post) => {
              const isOwner = user?.id && post.creator_id === user.id;
              const hasRequested = requestedPostIds.has(post.id);
              return (
                <Card key={post.id} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    <CardDescription>
                      {post.posting_type === 'project' ? 'Project Posting' : 'Hackathon Posting'}
                      {post.location ? ` · ${post.location}` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{post.description}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline"><Users className="mr-1 h-3 w-3" /> Team size {post.team_size || 4}</Badge>
                      {Array.isArray(post.tags) && post.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Badge variant="outline" className="w-fit whitespace-nowrap">{formatStableDate(post.created_at)}</Badge>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Button size="sm" variant="outline" onClick={() => setSelectedCreatorId(post.creator_id)}>
                          <UserRound className="mr-1 h-4 w-4" /> View Profile
                        </Button>
                        {isOwner ? (
                          <Button size="sm" variant="outline" disabled>
                            Your posting
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => requestToJoin(post.id)}
                            disabled={!user || hasRequested || requestingPostId === post.id}
                          >
                            {hasRequested ? 'Request sent' : requestingPostId === post.id ? 'Sending…' : 'Request to join'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
          </>
        )}

        {discoverMode === 'official' && !fetchError && filtered.length > visibleCount && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setVisibleCount((current) => current + 18)}>
              Load more ({filtered.length - visibleCount} remaining)
            </Button>
          </div>
        )}

        {selectedCommunityProfile && (
          <CommunityProfileModal
            profile={selectedCommunityProfile}
            currentUser={user || null}
            requestedPostIds={requestedPostIds}
            requestingPostId={requestingPostId}
            onRequestToJoin={requestToJoin}
            onClose={() => setSelectedCreatorId('')}
          />
        )}

        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>Create a User Posting</CardTitle>
                <CardDescription>Post your project or hackathon listing so others can request to join.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={createCommunityPosting}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">Posting type</label>
                      <select
                        value={createForm.postingType}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, postingType: e.target.value }))}
                        className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm"
                      >
                        <option value="hackathon">Hackathon</option>
                        <option value="project">Project</option>
                      </select>
                    </div>
                    <Input
                      placeholder="Team size"
                      value={createForm.teamSize}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, teamSize: e.target.value }))}
                    />
                  </div>
                  <Input
                    placeholder="Title"
                    value={createForm.title}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Describe what you're building and who you're looking for"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                  <Input
                    placeholder="Location (optional)"
                    value={createForm.location}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                  <Input
                    placeholder="Tags (comma-separated, e.g. React, AI, Design)"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, tags: e.target.value }))}
                  />
                  {createError && <p className="text-sm text-destructive">{createError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createLoading}>
                      {createLoading ? 'Posting…' : 'Publish Posting'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export async function getStaticProps() {
  try {
    const hackathons = await fetchUpcomingHackathons(60);
    return {
      props: {
        hackathons,
        fetchedAt: new Date().toISOString(),
        fetchError: '',
      },
      revalidate: 60 * 60 * 24,
    };
  } catch (error) {
    return {
      props: {
        hackathons: [],
        fetchedAt: '',
        fetchError: 'Live hackathon feed is temporarily unavailable.',
      },
      revalidate: 60 * 60,
    };
  }
}
