import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Folder, Github, MapPin, Star, X } from 'lucide-react';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { supabase } from '../lib/supabase';

const FEATURED_PROJECTS_TABLE = 'featured_projects';

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString || '';
  return date.toISOString().slice(0, 10);
}

function avatarForUser(userId) {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(userId || 'forge-user')}`;
}

function ActivityHeatmap({ contributions }) {
  const weeks = useMemo(() => {
    if (!Array.isArray(contributions) || contributions.length === 0) return [];

    const map = new Map();
    contributions.forEach((item) => {
      if (item?.date) map.set(item.date, item.count || 0);
    });

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    const result = [];
    let week = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      week.push({ date: key, count: map.get(key) || 0 });
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length > 0) result.push(week);
    return result;
  }, [contributions]);

  const getColor = (count) => {
    if (count === 0) return 'bg-muted';
    if (count <= 2) return 'bg-emerald-200';
    if (count <= 5) return 'bg-emerald-400';
    if (count <= 10) return 'bg-emerald-500';
    return 'bg-emerald-700';
  };

  if (weeks.length === 0) {
    return <p className="text-sm text-muted-foreground">No heatmap data available.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                className={`h-[9px] w-[9px] rounded-[2px] ${getColor(day.count)}`}
                title={`${day.date}: ${day.count}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommunityProfileModal({
  profile,
  currentUser,
  requestedPostIds,
  requestingPostId,
  onRequestToJoin,
  onClose,
}) {
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubContrib, setGithubContrib] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredError, setFeaturedError] = useState('');

  const profilePosts = useMemo(
    () => (profile?.posts || profile?.postings || []),
    [profile]
  );

  const profileSummary = useMemo(() => {
    if (!profile) return null;
    const postingTypes = Array.from(new Set(profilePosts.map((post) => post.posting_type).filter(Boolean)));
    const focus = postingTypes.includes('hackathon') && postingTypes.includes('project')
      ? 'Hackathons + Projects'
      : postingTypes.includes('hackathon')
        ? 'Hackathons'
        : 'Projects';

    const latest = profilePosts[0]?.created_at || profile?.latestPostDate || '';
    return {
      focus,
      latestActive: formatDate(latest),
      postingCount: profile?.postingCount || profilePosts.length,
    };
  }, [profile, profilePosts]);

  const githubUsername = useMemo(() => {
    if (!profile || !currentUser) return '';
    if (profile.githubUsername) return profile.githubUsername;
    if (profile.creatorId === currentUser.id) return currentUser.user_metadata?.user_name || '';
    return '';
  }, [profile, currentUser]);

  useEffect(() => {
    if (!profile) {
      setGithubRepos([]);
      setGithubContrib([]);
      setGithubLoading(false);
      setGithubError('');
      setFeaturedProjects([]);
      setFeaturedLoading(false);
      setFeaturedError('');
      return;
    }

    let isMounted = true;

    const loadFeaturedProjects = async () => {
      setFeaturedLoading(true);
      setFeaturedError('');

      const { data, error } = await supabase
        .from(FEATURED_PROJECTS_TABLE)
        .select('id, name, description, url, tech_stack, screenshots, created_at')
        .eq('user_id', profile.creatorId)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setFeaturedProjects([]);
        setFeaturedError('Could not load personal projects.');
      } else {
        setFeaturedProjects(data || []);
      }
      setFeaturedLoading(false);
    };

    const loadGithubData = async () => {
      if (!githubUsername) {
        setGithubRepos([]);
        setGithubContrib([]);
        setGithubError('GitHub username not shared for this user.');
        setGithubLoading(false);
        return;
      }

      setGithubLoading(true);
      setGithubError('');

      try {
        const [repoRes, eventsRes] = await Promise.all([
          fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=12&type=owner`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
          }),
          fetch(`https://api.github.com/users/${githubUsername}/events/public?per_page=100`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
          }),
        ]);

        if (!repoRes.ok) throw new Error('Could not load GitHub repositories.');
        const repos = await repoRes.json();

        let contributions = [];
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const countMap = new Map();
          events.forEach((event) => {
            const date = event.created_at?.slice(0, 10);
            if (date) countMap.set(date, (countMap.get(date) || 0) + 1);
          });

          const today = new Date();
          for (let i = 364; i >= 0; i -= 1) {
            const day = new Date(today);
            day.setDate(day.getDate() - i);
            const key = day.toISOString().slice(0, 10);
            contributions.push({ date: key, count: countMap.get(key) || 0 });
          }
        }

        if (!isMounted) return;

        setGithubRepos(Array.isArray(repos) ? repos.filter((repo) => !repo.fork) : []);
        setGithubContrib(contributions);
      } catch (error) {
        if (!isMounted) return;
        setGithubRepos([]);
        setGithubContrib([]);
        setGithubError(error?.message || 'Could not load GitHub data.');
      } finally {
        if (isMounted) setGithubLoading(false);
      }
    };

    loadFeaturedProjects();
    loadGithubData();

    return () => {
      isMounted = false;
    };
  }, [profile, githubUsername]);

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <Card className="w-full max-w-3xl max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <img src={avatarForUser(profile.creatorId)} alt={profile.displayName || profile.creatorName || 'Profile'} className="h-14 w-14 rounded-full border" />
              <div>
                <CardTitle>{profile.displayName || profile.creatorName || 'Community member'}</CardTitle>
                <CardDescription>{profile.creatorId === currentUser?.id ? 'Your community profile' : 'Community member profile'}</CardDescription>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {profileSummary && (
            <div className="rounded-2xl border bg-card p-4">
              <h4 className="text-sm font-semibold">User Profile Information</h4>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div className="rounded-xl border p-2">
                  <p className="text-xs text-muted-foreground">Focus</p>
                  <p className="font-medium">{profileSummary.focus}</p>
                </div>
                <div className="rounded-xl border p-2">
                  <p className="text-xs text-muted-foreground">Latest Activity</p>
                  <p className="font-medium">{profileSummary.latestActive}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{profileSummary.postingCount} active postings</Badge>
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Github className="h-4 w-4" />
              <h4 className="text-sm font-semibold">GitHub Activity Heatmap</h4>
            </div>
            {githubLoading ? (
              <p className="text-sm text-muted-foreground">Loading GitHub activity…</p>
            ) : githubError ? (
              <p className="text-sm text-muted-foreground">{githubError}</p>
            ) : (
              <ActivityHeatmap contributions={githubContrib} />
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <h4 className="text-sm font-semibold">GitHub Projects</h4>
            </div>
            {githubLoading ? (
              <p className="text-sm text-muted-foreground">Loading repositories…</p>
            ) : githubError ? (
              <p className="text-sm text-muted-foreground">{githubError}</p>
            ) : githubRepos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No public repositories found.</p>
            ) : (
              <div className="space-y-2">
                {githubRepos.slice(0, 5).map((repo) => (
                  <a key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer" className="block rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{repo.name}</p>
                        <p className="text-xs text-muted-foreground">{repo.description || 'No description'}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {repo.language && <Badge variant="outline">{repo.language}</Badge>}
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {repo.stargazers_count || 0}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <h4 className="text-sm font-semibold">Personal Projects</h4>
            </div>
            {featuredLoading ? (
              <p className="text-sm text-muted-foreground">Loading personal projects…</p>
            ) : featuredError ? (
              <p className="text-sm text-muted-foreground">{featuredError}</p>
            ) : featuredProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No personal projects shared yet.</p>
            ) : (
              <div className="space-y-2">
                {featuredProjects.slice(0, 5).map((project) => (
                  <div key={project.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.description || 'No description'}</p>
                      </div>
                      {project.url && (
                        <a href={project.url} target="_blank" rel="noreferrer" className="text-muted-foreground">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {Array.isArray(project.tech_stack) && project.tech_stack.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {project.tech_stack.slice(0, 4).map((tech) => (
                          <Badge key={`${project.id}-${tech}`} variant="secondary">{tech}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <h4 className="mb-3 text-sm font-semibold">Active Postings</h4>
            <div className="space-y-3">
              {profilePosts.map((post) => {
                const hasRequested = requestedPostIds.has(post.id);
                const isOwner = post.creator_id === currentUser?.id;

                return (
                  <div key={post.id} className="rounded-2xl border-2 border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium">{post.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>
                      </div>
                      <Badge variant="outline">Team size {post.team_size || 4}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{post.posting_type}</Badge>
                      {post.location && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" /> {post.location}</Badge>}
                      {Array.isArray(post.tags) && post.tags.slice(0, 4).map((tag) => (
                        <Badge key={`${post.id}-${tag}`} variant="secondary">{tag}</Badge>
                      ))}
                      <Badge variant="outline">{formatDate(post.created_at)}</Badge>
                    </div>

                    {!isOwner && (
                      <div className="mt-3">
                        <Button size="sm" onClick={() => onRequestToJoin(post.id)} disabled={hasRequested || requestingPostId === post.id}>
                          {hasRequested ? 'Request sent' : requestingPostId === post.id ? 'Sending…' : 'Request to join'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
