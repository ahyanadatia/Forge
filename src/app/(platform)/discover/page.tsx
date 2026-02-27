"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
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
import type { Builder } from "@/types";

const availabilityConfig: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "outline" }> = {
  available: { label: "Available", variant: "success" },
  open_to_opportunities: { label: "Open", variant: "secondary" },
  busy: { label: "Busy", variant: "warning" },
  unavailable: { label: "Unavailable", variant: "outline" },
};

export default function DiscoverPage() {
  const [tab, setTab] = useState("builders");
  const [query, setQuery] = useState("");
  const [builders, setBuilders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchBuilders = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("builders")
      .select("*, forge_scores(*)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (query) {
      q = q.or(
        `full_name.ilike.%${query}%,github_username.ilike.%${query}%,role_descriptor.ilike.%${query}%`
      );
    }

    const { data } = await q;
    setBuilders(data ?? []);
    setLoading(false);
  }, [query, supabase]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("projects")
      .select("*, builders!projects_owner_id_fkey(full_name, avatar_url)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    if (query) {
      q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data } = await q;
    setProjects(data ?? []);
    setLoading(false);
  }, [query, supabase]);

  useEffect(() => {
    if (tab === "builders") fetchBuilders();
    else fetchProjects();
  }, [tab, query, fetchBuilders, fetchProjects]);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        <p className="text-muted-foreground">
          Find builders and projects by what matters.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search builders, skills, projects..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="builders">Builders</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

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
              return (
                <Link key={builder.id} href={`/profile/${builder.id}`}>
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
                          <Badge variant={avail.variant} className="text-xs">
                            {avail.label}
                          </Badge>
                        </div>
                        {builder.role_descriptor && (
                          <p className="text-sm text-muted-foreground truncate">
                            {builder.role_descriptor}
                          </p>
                        )}
                      </div>
                      {score && (
                        <div className="text-right shrink-0">
                          <p className="text-lg font-semibold tabular-nums">
                            {score.score}
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
            projects.map((project: any) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{project.timeline}</span>
                          <span>{project.team_size} people</span>
                          <span>{project.hours_per_week}h/wk</span>
                        </div>
                      </div>
                      {project.required_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {project.required_skills.slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
