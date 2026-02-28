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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { createProject } from "@/services/projects";
import { PROJECT_CATEGORIES, COMMON_ROLES } from "@/lib/project-constants";
import type { CompType } from "@/types";

const COMP_OPTIONS: { value: CompType; label: string }[] = [
  { value: "tbd", label: "TBD" },
  { value: "unpaid", label: "Unpaid" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed", label: "Fixed" },
  { value: "equity", label: "Equity" },
  { value: "prize_split", label: "Prize Split" },
];

interface RoleConfig {
  role_name: string;
  seats: number;
  comp_type: CompType;
  comp_amount_min: string;
  comp_amount_max: string;
  comp_currency: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<Record<string, RoleConfig>>({});
  const [joinAsOwner, setJoinAsOwner] = useState(true);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        const next = prev.filter((r) => r !== role);
        setRoleConfigs((rc) => {
          const copy = { ...rc };
          delete copy[role];
          return copy;
        });
        return next;
      }
      setRoleConfigs((rc) => ({
        ...rc,
        [role]: {
          role_name: role,
          seats: 1,
          comp_type: "tbd",
          comp_amount_min: "",
          comp_amount_max: "",
          comp_currency: "USD",
        },
      }));
      return [...prev, role];
    });
  };

  const updateRoleConfig = (role: string, field: string, value: string | number) => {
    setRoleConfigs((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

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
      const category = form.get("category") as string;
      const totalSeats = selectedRoles.reduce(
        (sum, r) => sum + (roleConfigs[r]?.seats ?? 1),
        0
      );
      const teamSize = Math.max(
        totalSeats + (joinAsOwner ? 1 : 0),
        parseInt(form.get("team_size") as string) || 4
      );

      const project = await createProject(supabase, {
        owner_id: user.id,
        title: form.get("title") as string,
        description: form.get("description") as string,
        category: category || undefined,
        roles_needed: selectedRoles,
        team_size: teamSize,
        team_size_target: teamSize,
        status: "draft",
      });

      // Create role slots with compensation
      for (const role of selectedRoles) {
        const config = roleConfigs[role];
        if (!config) continue;
        await fetch(`/api/projects/${project.id}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role_name: config.role_name,
            seats_total: config.seats,
            comp_type: config.comp_type,
            comp_currency: config.comp_currency || undefined,
            comp_amount_min: config.comp_amount_min
              ? parseFloat(config.comp_amount_min)
              : undefined,
            comp_amount_max: config.comp_amount_max
              ? parseFloat(config.comp_amount_max)
              : undefined,
          }),
        });
      }

      // Owner auto-join
      if (joinAsOwner) {
        await fetch("/api/projects/join-owner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: project.id }),
        });
      }

      router.push(`/projects/${project.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create a Project</CardTitle>
          <CardDescription>
            Start with the basics. You can add more details after.
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
                Short description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="What are you building and why?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                name="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select category...</option>
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Roles */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Roles needed</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                  >
                    <Badge
                      variant={
                        selectedRoles.includes(role) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                    >
                      {role}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Role configurations */}
            {selectedRoles.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <p className="text-sm font-medium">
                  Role details & compensation
                </p>
                {selectedRoles.map((role) => {
                  const config = roleConfigs[role];
                  if (!config) return null;
                  return (
                    <div
                      key={role}
                      className="rounded-md border p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{role}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground">
                            Seats
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={config.seats}
                            onChange={(e) =>
                              updateRoleConfig(
                                role,
                                "seats",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-16 h-7 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Compensation
                          </label>
                          <select
                            value={config.comp_type}
                            onChange={(e) =>
                              updateRoleConfig(
                                role,
                                "comp_type",
                                e.target.value
                              )
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                          >
                            {COMP_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(config.comp_type === "hourly" ||
                          config.comp_type === "fixed") && (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground">
                                Min
                              </label>
                              <Input
                                type="number"
                                min={0}
                                value={config.comp_amount_min}
                                onChange={(e) =>
                                  updateRoleConfig(
                                    role,
                                    "comp_amount_min",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground">
                                Max
                              </label>
                              <Input
                                type="number"
                                min={0}
                                value={config.comp_amount_max}
                                onChange={(e) =>
                                  updateRoleConfig(
                                    role,
                                    "comp_amount_max",
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="team_size">
                Team size target
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

            {/* Owner join toggle */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Join as Owner</p>
                <p className="text-xs text-muted-foreground">
                  Count yourself as a team member
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={joinAsOwner}
                onClick={() => setJoinAsOwner((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  joinAsOwner ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    joinAsOwner ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
