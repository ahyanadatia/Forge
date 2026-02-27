import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ExternalLink, Folder, Github, Globe, ImagePlus, Mail, Plus, Star, Trash2, UserRound, X } from 'lucide-react';

import Header from '../components/Header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { supabase } from '../lib/supabase';
import { useRequireAuth } from '../lib/useRequireAuth';

/* ─────────────── GitHub Activity Heatmap ─────────────── */

function ActivityHeatmap({ contributions }) {
  // contributions: array of { date: 'YYYY-MM-DD', count: number }
  const weeks = useMemo(() => {
    if (!contributions || contributions.length === 0) return [];

    const map = new Map();
    contributions.forEach((c) => map.set(c.date, c.count));

    // Build 52 weeks ending today
    const today = new Date();
    const result = [];
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - 364);
    // Align to Sunday
    startDay.setDate(startDay.getDate() - startDay.getDay());

    let week = [];
    const cursor = new Date(startDay);
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
    return <p className="text-sm text-muted-foreground">No activity data available yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                className={`h-[11px] w-[11px] rounded-[2px] ${getColor(day.count)}`}
                title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-[2px]">
          {['bg-muted', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-700'].map((c) => (
            <div key={c} className={`h-[10px] w-[10px] rounded-[2px] ${c}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

/* ─────────────── Featured Projects Form ─────────────── */

const EMPTY_PROJECT = { name: '', description: '', url: '', techStack: '', screenshots: [] };
const FEATURED_PROJECTS_TABLE = 'featured_projects';

function mapFeaturedProjectRow(row) {
  return {
    id: String(row.id),
    name: row.name || '',
    description: row.description || '',
    url: row.url || '',
    techStack: Array.isArray(row.tech_stack) ? row.tech_stack : [],
    screenshots: Array.isArray(row.screenshots) ? row.screenshots : [],
  };
}

function FeaturedProjectModal({ open, onClose, onAdd }) {
  const [project, setProject] = useState({ ...EMPTY_PROJECT });
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setProject({ ...EMPTY_PROJECT });
      setUploadError('');
      setSubmitError('');
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleScreenshotUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const maxFiles = 4;
    const remainingSlots = maxFiles - project.screenshots.length;
    if (remainingSlots <= 0) {
      setUploadError('Maximum 4 screenshots per project.');
      return;
    }

    const selected = files.slice(0, remainingSlots);
    const tooLarge = selected.find((file) => file.size > 2 * 1024 * 1024);
    if (tooLarge) {
      setUploadError('Each screenshot must be 2MB or smaller.');
      return;
    }

    setUploadError('');
    const next = await Promise.all(
      selected.map(async (file, index) => ({
        id: `shot-${Date.now()}-${index}`,
        name: file.name,
        dataUrl: await fileToDataUrl(file),
      }))
    );

    setProject((prev) => ({
      ...prev,
      screenshots: [...prev.screenshots, ...next],
    }));

    event.target.value = '';
  };

  const removeScreenshot = (screenshotId) => {
    setProject((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((shot) => shot.id !== screenshotId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project.name.trim()) return;
    setSubmitError('');
    setSubmitting(true);

    const saved = await onAdd({
      ...project,
      techStack: project.techStack.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setSubmitting(false);
    if (!saved) {
      setSubmitError('Could not save project to database. Please try again.');
      return;
    }

    onClose();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-[2rem] border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Add Featured Project</h3>
            <p className="text-sm text-muted-foreground">Showcase work that isn&apos;t on GitHub.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Input
            placeholder="Project name *"
            value={project.name}
            onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <Textarea
            placeholder="Short description"
            value={project.description}
            onChange={(e) => setProject((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />

          <Input
            placeholder="Live URL or demo link (optional)"
            value={project.url}
            onChange={(e) => setProject((p) => ({ ...p, url: e.target.value }))}
          />

          <Input
            placeholder="Tech stack (comma-separated, e.g. React, Node.js)"
            value={project.techStack}
            onChange={(e) => setProject((p) => ({ ...p, techStack: e.target.value }))}
          />

          <div className="space-y-2 rounded-xl border p-3">
            <label className="text-sm font-medium">Screenshots</label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleScreenshotUpload}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">Up to 4 images, 2MB each.</p>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

            {project.screenshots.length > 0 && (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {project.screenshots.map((shot) => (
                  <div key={shot.id} className="relative overflow-hidden rounded-2xl border">
                    <img src={shot.dataUrl} alt={shot.name} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(shot.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                      aria-label={`Remove ${shot.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!project.name.trim() || submitting}>
              <Plus className="mr-1 h-4 w-4" /> Add Project
            </Button>
          </div>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </form>
          </div>
        </div>
      )}
    </>
  );
}

function PersonalInfoModal({ open, onClose, user, signingOut, onSignOut }) {
  useEffect(() => {
    if (!open) return undefined;

    const onEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  return (
    <>
      {open && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-[2rem] border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <p className="text-sm text-muted-foreground">Manage your identity and account actions.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <img
                src={`https://github.com/${user.user_metadata?.user_name || 'octocat'}.png`}
                alt="Profile avatar"
                className="h-16 w-16 rounded-full border"
                onError={e => (e.target.src = 'https://avatars.githubusercontent.com/u/583231?v=4')}
              />
              <div>
                <div className="text-base font-semibold">{user.user_metadata?.name || user.email}</div>
                <div className="text-sm text-muted-foreground">GitHub connected profile</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /> Name</div>
              <div className="font-medium">{user.user_metadata?.name || user.email}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Github className="h-4 w-4" /> GitHub Username</div>
              <div className="font-medium">{user.user_metadata?.user_name || 'Not set'}</div>
            </div>
            <div className="rounded-lg border p-4 md:col-span-2">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> Email</div>
              <div className="font-medium">{user.email}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> Account Created</div>
              <div className="font-medium">{user.created_at ? new Date(user.created_at).toISOString().slice(0, 10) : 'N/A'}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-1 text-sm text-muted-foreground">User ID</div>
              <div className="font-mono text-sm break-all">{user.id}</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <Button type="button" variant="outline" asChild>
              <a href="/dashboard">Back to Dashboard</a>
            </Button>
            <Button type="button" variant="destructive" onClick={onSignOut} disabled={signingOut}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────── Main Profile Component ─────────────── */

function Profile() {
  const { user, checkingAuth } = useRequireAuth();

  // GitHub data
  const [repos, setRepos] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');

  // Featured projects (user-managed, stored in Supabase)
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Load featured projects from database
  useEffect(() => {
    if (!user || user === false) return;

    let isMounted = true;
    const loadFeaturedProjects = async () => {
      setProjectsLoading(true);
      setProjectsError('');

      const { data, error } = await supabase
        .from(FEATURED_PROJECTS_TABLE)
        .select('id, name, description, url, tech_stack, screenshots, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setFeaturedProjects([]);
        setProjectsError('Could not load featured projects from database.');
      } else {
        setFeaturedProjects((data || []).map(mapFeaturedProjectRow));
      }

      setProjectsLoading(false);
    };

    loadFeaturedProjects();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const addFeaturedProject = useCallback(async (project) => {
    if (!user || user === false) return false;

    setProjectsError('');
    const { data, error } = await supabase
      .from(FEATURED_PROJECTS_TABLE)
      .insert({
        user_id: user.id,
        name: project.name,
        description: project.description,
        url: project.url,
        tech_stack: project.techStack,
        screenshots: project.screenshots,
      })
      .select('id, name, description, url, tech_stack, screenshots, created_at')
      .single();

    if (error || !data) {
      setProjectsError('Could not save featured project to database.');
      return false;
    }

    const mapped = mapFeaturedProjectRow(data);
    const nextProjects = [mapped, ...featuredProjects];
    setFeaturedProjects(nextProjects);
    return true;
  }, [user, featuredProjects]);

  const removeFeaturedProject = useCallback(async (id) => {
    if (!user || user === false) return;

    setProjectsError('');
    const { error } = await supabase
      .from(FEATURED_PROJECTS_TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      setProjectsError('Could not remove featured project from database.');
      return;
    }

    const nextProjects = featuredProjects.filter((project) => project.id !== id);
    setFeaturedProjects(nextProjects);
  }, [user, featuredProjects]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    window.location.href = '/login';
  };

  // Fetch GitHub data (public API, no token needed)
  useEffect(() => {
    if (!user || user === false) return;
    const username = user.user_metadata?.user_name;
    if (!username) return;

    let isMounted = true;
    const abortController = new AbortController();

    setGithubLoading(true);
    setGithubError('');

    // Fetch repos (public API, sorted by updated, max 30)
    const fetchGithubData = async () => {
      try {
        const repoRes = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=30&type=owner`,
          {
            headers: { Accept: 'application/vnd.github.v3+json' },
            signal: abortController.signal,
          }
        );
        if (!repoRes.ok) throw new Error(`GitHub API returned ${repoRes.status}`);
        const repoData = await repoRes.json();
        if (!isMounted) return;

        setRepos(
          repoData
            .filter((r) => !r.fork)
            .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        );

        // Fetch contribution data via GitHub events API (last 90 events → approximate heatmap)
        const eventsRes = await fetch(
          `https://api.github.com/users/${username}/events/public?per_page=100`,
          {
            headers: { Accept: 'application/vnd.github.v3+json' },
            signal: abortController.signal,
          }
        );
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const countMap = new Map();
          events.forEach((event) => {
            const date = event.created_at?.slice(0, 10);
            if (date) countMap.set(date, (countMap.get(date) || 0) + 1);
          });

          // Fill in last 365 days
          const today = new Date();
          const contribs = [];
          for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            contribs.push({ date: key, count: countMap.get(key) || 0 });
          }
          if (!isMounted) return;
          setContributions(contribs);
        }
      } catch (err) {
        if (!isMounted || err?.name === 'AbortError') return;
        setGithubError(err.message || 'Failed to load GitHub data');
      } finally {
        if (!isMounted) return;
        setGithubLoading(false);
      }
    };

    fetchGithubData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user]);

  if (checkingAuth || user === null) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  if (user === false) return null;

  const username = user.user_metadata?.user_name;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src={`https://github.com/${user.user_metadata?.user_name || 'octocat'}.png`}
                alt="Profile avatar"
                className="h-14 w-14 rounded-full border"
                onError={e => (e.target.src = 'https://avatars.githubusercontent.com/u/583231?v=4')}
              />
              <div>
              <Badge variant="secondary" className="mb-2 w-fit">Profile</Badge>
              <CardTitle className="text-2xl">{user.user_metadata?.name || 'Your Portfolio'}</CardTitle>
              <CardDescription>Show your GitHub activity and personal projects in one place.</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsPersonalInfoOpen(true)}>
              Personal Information
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              <CardTitle>Activity Heatmap</CardTitle>
            </div>
            <CardDescription>
              Your GitHub contribution activity over the past year
              {username && (
                <a
                  href={`https://github.com/${username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  @{username} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {githubLoading && <p className="text-sm text-muted-foreground">Loading GitHub activity...</p>}
            {githubError && <p className="text-sm text-destructive">{githubError}</p>}
            {!githubLoading && !githubError && <ActivityHeatmap contributions={contributions} />}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                <CardTitle>GitHub Projects</CardTitle>
              </div>
              <CardDescription>Your public repositories sorted by stars</CardDescription>
            </CardHeader>
            <CardContent>
              {githubLoading && <p className="text-sm text-muted-foreground">Loading repositories...</p>}
              {githubError && <p className="text-sm text-destructive">{githubError}</p>}
              {!githubLoading && !githubError && repos.length === 0 && (
                <p className="text-sm text-muted-foreground">No public repositories found.</p>
              )}
              {!githubLoading && !githubError && repos.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {repos.slice(0, 8).map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-xl border p-4 hover:border-primary/40 hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium text-primary group-hover:underline">{repo.name}</h4>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{repo.description || 'No description'}</p>
                        </div>
                        <ExternalLink className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {repo.language && <Badge variant="outline" className="text-xs">{repo.language}</Badge>}
                        {(repo.stargazers_count || 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3" /> {repo.stargazers_count}
                          </span>
                        )}
                        {repo.topics?.slice(0, 2).map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs">{topic}</Badge>
                        ))}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <CardTitle>Featured Projects</CardTitle>
                </div>
                <Button size="sm" onClick={() => setIsAddProjectOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Project
                </Button>
              </div>
              <CardDescription>Showcase personal projects that aren&apos;t on GitHub — side projects, designs, demos, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectsLoading && (
                <p className="text-sm text-muted-foreground">Loading your featured projects...</p>
              )}
              {projectsError && (
                <p className="text-sm text-destructive">{projectsError}</p>
              )}
              {featuredProjects.length > 0 && (
                <div className="space-y-3">
                  {featuredProjects.map((project) => (
                    <div key={project.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium">{project.name}</h4>
                          {project.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFeaturedProject(project.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {project.techStack?.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                        ))}
                        {project.url && (
                          <a
                            href={project.url.startsWith('http') ? project.url : `https://${project.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Demo
                          </a>
                        )}
                      </div>
                      {project.screenshots?.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {project.screenshots.map((shot) => (
                            <a
                              key={shot.id}
                              href={shot.dataUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-2xl border"
                            >
                              <img src={shot.dataUrl} alt={shot.name || 'Project screenshot'} className="h-24 w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {featuredProjects.length === 0 && (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <ImagePlus className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No featured projects yet. Click Add Project to showcase your work.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <FeaturedProjectModal
          open={isAddProjectOpen}
          onClose={() => setIsAddProjectOpen(false)}
          onAdd={addFeaturedProject}
        />
        <PersonalInfoModal
          open={isPersonalInfoOpen}
          onClose={() => setIsPersonalInfoOpen(false)}
          user={user}
          signingOut={signingOut}
          onSignOut={handleSignOut}
        />
      </main>
    </div>
  );
}

export default Profile;
