"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PROJECT_CATEGORIES, PROJECT_STAGES, COMMON_ROLES } from "@/lib/project-constants";

interface Props {
  project: any;
  open: boolean;
  onClose: () => void;
}

export function EditProjectPanel({ project, open, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [category, setCategory] = useState(project.category ?? "");
  const [stage, setStage] = useState(project.stage ?? "");
  const [timeline, setTimeline] = useState(project.timeline ?? "");
  const [timelineWeeks, setTimelineWeeks] = useState(project.timeline_weeks?.toString() ?? "");
  const [hoursPerWeek, setHoursPerWeek] = useState(project.hours_per_week?.toString() ?? "");
  const [teamSize, setTeamSize] = useState((project.team_size_target ?? project.team_size)?.toString() ?? "4");
  const [skills, setSkills] = useState((project.required_skills ?? []).join(", "));
  const [tags, setTags] = useState((project.tags ?? []).join(", "));
  const [roles, setRoles] = useState<string[]>(project.roles_needed ?? []);
  const [goals, setGoals] = useState((project.goals ?? []).join("\n"));

  const toggleRole = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category: category || undefined,
          stage: stage || undefined,
          timeline: timeline || undefined,
          timeline_weeks: timelineWeeks ? parseInt(timelineWeeks) : undefined,
          hours_per_week: hoursPerWeek ? parseInt(hoursPerWeek) : undefined,
          team_size: teamSize ? parseInt(teamSize) : undefined,
          team_size_target: teamSize ? parseInt(teamSize) : undefined,
          required_skills: skills.split(",").map((s: string) => s.trim()).filter(Boolean),
          tags: tags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean),
          roles_needed: roles,
          goals: goals.split("\n").map((g: string) => g.trim()).filter(Boolean),
        }),
      });
      onClose();
    } catch {
      // Silent
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Project</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                <option value="">None</option>
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectClass}>
                <option value="">None</option>
                {PROJECT_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Roles needed</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ROLES.map((role) => (
                <button key={role} type="button" onClick={() => toggleRole(role)}>
                  <Badge variant={roles.includes(role) ? "default" : "outline"} className="cursor-pointer">
                    {role}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Timeline</label>
              <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 4 weeks" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Weeks</label>
              <Input type="number" min={1} max={104} value={timelineWeeks} onChange={(e) => setTimelineWeeks(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Team size</label>
              <Input type="number" min={1} max={20} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hours / week</label>
            <Input type="number" min={1} max={80} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Required skills (comma-separated)</label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Backend, React" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. hackathon, mvp" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Goals (one per line)</label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
