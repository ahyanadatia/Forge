"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { createProject } from "@/services/projects";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      const project = await createProject(supabase, {
        owner_id: user.id,
        title: form.get("title") as string,
        description: form.get("description") as string,
        goals: (form.get("goals") as string)
          .split("\n")
          .map((g) => g.trim())
          .filter(Boolean),
        timeline: form.get("timeline") as string,
        hours_per_week: parseInt(form.get("hours_per_week") as string) || 10,
        required_skills: (form.get("skills") as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        team_size: parseInt(form.get("team_size") as string) || 4,
      });
      router.push(`/projects/${project.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Post a Project</CardTitle>
          <CardDescription>
            Describe what you're building and find the right team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="title">
                Title
              </label>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g. Real-time analytics dashboard"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="What are you building and why?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="goals">
                Goals (one per line)
              </label>
              <textarea
                id="goals"
                name="goals"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={"Launch MVP by end of month\nIntegrate payments\n100 beta users"}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="timeline">
                  Timeline
                </label>
                <Input
                  id="timeline"
                  name="timeline"
                  required
                  placeholder="e.g. 4 weeks"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="hours_per_week">
                  Hours / week
                </label>
                <Input
                  id="hours_per_week"
                  name="hours_per_week"
                  type="number"
                  min={1}
                  max={80}
                  defaultValue={10}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="team_size">
                  Team Size
                </label>
                <Input
                  id="team_size"
                  name="team_size"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={4}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="skills">
                Required Skills (comma-separated)
              </label>
              <Input
                id="skills"
                name="skills"
                placeholder="e.g. Backend, React, PostgreSQL"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Post Project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
