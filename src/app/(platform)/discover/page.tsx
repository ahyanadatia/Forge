"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { parseBuilderPrompt, parseProjectPrompt } from "@/lib/prompt-parser";
import { PROJECT_CATEGORIES, PROJECT_STAGES, getCategoryLabel, getStageLabel } from "@/lib/project-constants";
import type { Builder } from "@/types";

const availabilityConfig: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "outline" }> = {
  available: { label: "Available", variant: "success" },
  open_to_opportunities: { label: "Open", variant: "secondary" },
  busy: { label: "Busy", variant: "warning" },
  unavailable: { label: "Unavailable", variant: "outline" },
};

export default function DiscoverPage() {
  const [tab, setTab] = useState("builders");
  const [prompt, setPrompt] = useState("");
  const [builders, setBuilders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [buildersTotal, setBuildersTotal] = useState(0);
  const [projectsTotal, setProjectsTotal] = useState(0);

  // Builder filters
  const [availability, setAvailability] = useState("");
  const [minScore, setMinScore] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "recency">("score");

  // Project filters
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("");

  // Active parsed filters display
  const [parsedHints, setParsedHints] = useState<string[]>([]);

  const supabase = createClient();

  const fetchBuilders = useCallback(async () => {
    setLoading(true);
    const promptFilters = prompt ? parseBuilderPrompt(prompt) : {};
    const hints: string[] = [];

    let q = supabase
      .from("builders")
      .select("*, forge_scores(*)", { count: "exact" });

    const textQuery = promptFilters.query || (prompt && !promptFilters.skills?.length && !promptFilters.minScore ? prompt : "");
    if (textQuery) {
      q = q.or(
        `full_name.ilike.%${textQuery}%,first_name.ilike.%${textQuery}%,last_name.ilike.%${textQuery}%,username.ilike.%${textQuery}%,role_descriptor.ilike.%${textQuery}%`
      );
    }

    const effectiveAvailability = availability || promptFilters.availability;
    if (effectiveAvailability) {
      q = q.eq("availability", effectiveAvailability);
      hints.push(`availability: ${effectiveAvailability}`);
    }

    const effectiveMinScore = minScore ? parseInt(minScore) : promptFilters.minScore;
    if (effectiveMinScore) {
      q = q.gte("forge_score", effectiveMinScore);
      hints.push(`score >= ${effectiveMinScore}`);
    }

    if (promptFilters.skills?.length) {
      hints.push(`skills: ${promptFilters.skills.join(", ")}`);
    }
    if (promptFilters.stacks?.length) {
      hints.push(`stacks: ${promptFilters.stacks.join(", ")}`);
    }
    if (promptFilters.minCompletionRate) {
      hints.push(`reliable (${promptFilters.minCompletionRate}%+ completion)`);
    }

    setParsedHints(hints);

    if (sortBy === "score") {
      q = q.order("forge_score", { ascending: false, nullsFirst: false });
    }
    q = q.order("created_at", { ascending: false }).limit(50);

    const { data, count } = await q;
    setBuilders(data ?? []);
    setBuildersTotal(count ?? 0);
    setLoading(false);
  }, [prompt, availability, minScore, sortBy, supabase]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const promptFilters = prompt ? parseProjectPrompt(prompt) : {};

    let q = supabase
      .from("projects")
      .select("*, builders!projects_owner_id_fkey(id, full_name, first_name, last_name, display_name, avatar_url, username, forge_score)", { count: "exact" })
      .eq("status", "open");

    if (promptFilters.ftsQuery) {
      q = q.textSearch("search_vector", promptFilters.ftsQuery, { type: "websearch" });
    } else if (prompt) {
      q = q.or(`title.ilike.%${prompt}%,description.ilike.%${prompt}%`);
    }

    const effectiveCategory = category || promptFilters.category;
    if (effectiveCategory) {
      q = q.eq("category", effectiveCategory);
    }

    const effectiveStage = stage || promptFilters.stage;
    if (effectiveStage) {
      q = q.eq("stage", effectiveStage);
    }

    if (promptFilters.maxTimelineWeeks) {
      q = q.lte("timeline_weeks", promptFilters.maxTimelineWeeks);
    }

    q = q.order("created_at", { ascending: false }).limit(50);

    const { data, count } = await q;
    setProjects(data ?? []);
    setProjectsTotal(count ?? 0);
    setLoading(false);
  }, [prompt, category, stage, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === "builders") fetchBuilders();
      else fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [tab, prompt, fetchBuilders, fetchProjects]);

  const clearFilters = () => {
    setAvailability("");
    setMinScore("");
    setCategory("");
    setStage("");
    setPrompt("");
  };

  const hasActiveFilters = availability || minScore || category || stage || prompt;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        <p className="text-muted-foreground">
          Find builders and projects by what matters.
        </p>
      </div>

      {/* Prompted search */}
      <div className="space-y-2">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tab === "builders"
                ? 'Try "reliable backend 700+ available" or just search names...'
                : 'Try "saas mvp 8 weeks" or search projects...'}
              className="pl-9"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-muted" : ""}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Parsed hints */}
        {parsedHints.length > 0 && tab === "builders" && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">Detected:</span>
            {parsedHints.map((hint) => (
              <Badge key={hint} variant="secondary" className="text-xs">
                {hint}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            {tab === "builders" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Any</option>
                    <option value="available">Available</option>
                    <option value="open_to_opportunities">Open to Opportunities</option>
                    <option value="busy">Busy</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Min Forge Score</label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="e.g. 400"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "score" | "recency")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="score">Forge Score</option>
                    <option value="recency">Most Recent</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">All categories</option>
                    {PROJECT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">All stages</option>
                    {PROJECT_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                      <X className="h-3 w-3 mr-1" /> Clear filters
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="builders">Builders</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground">
            {tab === "builders" ? buildersTotal : projectsTotal} results
          </span>
        </div>

        <TabsContent value="builders" className="space-y-3 mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : builders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No builders found.
            </p>
          ) : (
            builders.map((builder: any) => {
              const avail = availabilityConfig[builder.availability] ?? availabilityConfig.unavailable;
              const score = builder.forge_scores?.[0];
              const profileUrl = builder.username ? `/u/${builder.username}` : `/profile/${builder.id}`;
              return (
                <Link key={builder.id} href={profileUrl}>
                  <Card className="transition-colors hover:bg-muted/30">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={builder.avatar_url} />
                        <AvatarFallback>
                          {(builder.display_name || builder.first_name
                            ? [builder.first_name, builder.last_name].filter(Boolean).map((n: string) => n[0]).join("")
                            : builder.full_name?.split(" ").map((n: string) => n[0]).join("") ?? ""
                          ).toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {builder.display_name || [builder.first_name, builder.middle_names, builder.last_name].filter(Boolean).join(" ") || builder.full_name}
                          </p>
                          {builder.username && (
                            <span className="text-xs text-muted-foreground">@{builder.username}</span>
                          )}
                          <Badge variant={avail.variant} className="text-xs shrink-0">
                            {avail.label}
                          </Badge>
                        </div>
                        {builder.role_descriptor && (
                          <p className="text-sm text-muted-foreground truncate">
                            {builder.role_descriptor}
                          </p>
                        )}
                      </div>
                      {(builder.forge_score > 0 || score) && (
                        <div className="text-right shrink-0">
                          <p className="text-lg font-semibold tabular-nums">
                            {builder.forge_score || score?.score || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Forge Score
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-3 mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No open projects found.
            </p>
          ) : (
            projects.map((project: any) => {
              const owner = project.builders;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="transition-colors hover:bg-muted/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{project.title}</p>
                            {project.category && (
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryLabel(project.category)}
                              </Badge>
                            )}
                            {project.stage && (
                              <Badge variant="outline" className="text-xs">
                                {getStageLabel(project.stage)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {project.description}
                          </p>
                        </div>
                      </div>

                      {/* Roles needed */}
                      {project.roles_needed?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.roles_needed.map((role: string) => (
                            <Badge key={role} variant="default" className="text-xs font-normal">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {project.timeline_weeks ? (
                            <span>{project.timeline_weeks}w</span>
                          ) : (
                            <span>{project.timeline}</span>
                          )}
                          <span>{project.team_size_target || project.team_size} people</span>
                          {project.hours_per_week_min && project.hours_per_week_max ? (
                            <span>{project.hours_per_week_min}-{project.hours_per_week_max}h/wk</span>
                          ) : (
                            <span>{project.hours_per_week}h/wk</span>
                          )}
                        </div>

                        {/* Owner mini-card */}
                        {owner && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={owner.avatar_url} />
                              <AvatarFallback className="text-[10px]">
                                {(owner.first_name?.[0] ?? owner.full_name?.[0] ?? "?").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[120px]">
                              {owner.display_name || [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.full_name}
                            </span>
                            {owner.forge_score > 0 && (
                              <span className="font-mono tabular-nums font-medium text-foreground">
                                {owner.forge_score}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Skills */}
                      {project.required_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.required_skills.slice(0, 5).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                          {project.required_skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.required_skills.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
