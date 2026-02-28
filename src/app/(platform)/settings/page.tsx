"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { getBuilder, updateBuilder } from "@/services/builders";
import { profileSchema } from "@/lib/validations/profile";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { getInitials, buildFullName } from "@/lib/profile";
import { getScoreBand, getConfidenceLabel } from "@/lib/forge-score";
import { formatRelativeDate } from "@/lib/utils";
import type { Builder, BuilderAvailability } from "@/types";

const availabilityOptions: { value: BuilderAvailability; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "open_to_opportunities", label: "Open to Opportunities" },
  { value: "busy", label: "Busy" },
  { value: "unavailable", label: "Unavailable" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [builder, setBuilder] = useState<Builder | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push("/login");
      setEmail(data.user.email ?? "");
      try {
        const b = await getBuilder(supabase, data.user.id);
        setBuilder(b);
      } catch {
        router.push("/login");
      }
    });
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!builder) return;
    setLoading(true);
    setSaved(false);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form.entries());
    const result = profileSchema.safeParse(raw);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    const v = result.data;

    try {
      const updated = await updateBuilder(supabase, builder.id, {
        first_name: v.first_name,
        middle_names: v.middle_names,
        last_name: v.last_name,
        display_name: v.display_name,
        full_name: buildFullName(v.first_name, v.middle_names, v.last_name),
        role_descriptor: v.role_descriptor,
        location: v.location,
        bio: v.bio,
        university_or_company: v.university_or_company,
        primary_stack: v.primary_stack,
        secondary_stack: v.secondary_stack,
        commitment_preferences: v.commitment_preferences,
        availability: v.availability,
        website_url: v.website_url,
        linkedin_url: v.linkedin_url,
      });
      setBuilder(updated);
      setSaved(true);
    } catch {
      setErrors({ _form: "Failed to save. Please try again." });
    }
    setLoading(false);
  };

  const handleRecalculate = useCallback(async () => {
    if (!builder) return;
    setRecalculating(true);
    setRecalcError(null);
    try {
      const res = await fetch("/api/scoring/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builder_id: builder.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRecalcError(body.error ?? "Recalculation failed.");
        setRecalculating(false);
        return;
      }
      const b = await getBuilder(supabase, builder.id);
      setBuilder(b);
    } catch {
      setRecalcError("Recalculation failed. Please try again.");
    }
    setRecalculating(false);
  }, [builder, supabase]);

  if (!builder) {
    return (
      <div className="container max-w-2xl py-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const b = builder as any;

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Picture</CardTitle>
          <CardDescription>
            Your avatar is visible on your profile, search results, and teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            userId={builder.id}
            currentUrl={builder.avatar_url}
            initials={getInitials(builder)}
            onUploaded={(url) =>
              setBuilder((prev) => (prev ? { ...prev, avatar_url: url } : prev))
            }
          />
        </CardContent>
      </Card>

      {/* Email (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Address</CardTitle>
          <CardDescription>
            Managed via your authentication provider. Contact support to change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={email} disabled className="max-w-sm bg-muted" />
        </CardContent>
      </Card>

      {/* Forge Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Forge Score</CardTitle>
          </div>
          <CardDescription>
            Your score is computed from verified deliveries, project outcomes,
            and activity. It cannot be edited manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">
                {b.forge_score || 0}
              </span>
              <span className="text-sm text-muted-foreground">/1000</span>
            </div>
            {b.forge_score > 0 && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {getScoreBand(b.forge_score)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getConfidenceLabel(b.confidence_score || 0)} confidence
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRecalculate}
              disabled={recalculating}
              variant="outline"
              size="sm"
            >
              {recalculating && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {recalculating ? "Recalculating..." : "Recalculate Score"}
            </Button>
            {b.last_scored_at && (
              <span className="text-xs text-muted-foreground">
                Last updated {formatRelativeDate(b.last_scored_at)}
              </span>
            )}
          </div>
          {recalcError && (
            <p className="text-sm text-destructive">{recalcError}</p>
          )}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
          <CardDescription>
            Your identity and professional details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors._form && (
              <p className="text-sm text-destructive">{errors._form}</p>
            )}

            {/* Name Fields */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldGroup
                label="First Name"
                name="first_name"
                required
                defaultValue={builder.first_name}
                error={errors.first_name}
              />
              <FieldGroup
                label="Middle Names"
                name="middle_names"
                defaultValue={builder.middle_names ?? ""}
                error={errors.middle_names}
                placeholder="Optional"
              />
              <FieldGroup
                label="Last Name"
                name="last_name"
                required
                defaultValue={builder.last_name}
                error={errors.last_name}
              />
            </div>

            <FieldGroup
              label="Display Name"
              name="display_name"
              defaultValue={builder.display_name ?? ""}
              error={errors.display_name}
              placeholder="Optional — overrides constructed name"
              hint="Leave blank to use your full name."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup
                label="Role"
                name="role_descriptor"
                defaultValue={builder.role_descriptor ?? ""}
                placeholder="e.g. Full-Stack Engineer"
                error={errors.role_descriptor}
              />
              <FieldGroup
                label="Location"
                name="location"
                defaultValue={builder.location ?? ""}
                placeholder="e.g. London, UK"
                error={errors.location}
              />
            </div>

            <FieldGroup
              label="University or Company"
              name="university_or_company"
              defaultValue={builder.university_or_company ?? ""}
              placeholder="e.g. MIT, Google"
              error={errors.university_or_company}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <textarea
                name="bio"
                rows={3}
                defaultValue={builder.bio ?? ""}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Tell people about what you build"
              />
              {errors.bio && (
                <p className="text-xs text-destructive">{errors.bio}</p>
              )}
            </div>

            <Separator />

            {/* Stacks & Commitment */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup
                label="Primary Stack"
                name="primary_stack"
                defaultValue={builder.primary_stack ?? ""}
                placeholder="e.g. Next.js, TypeScript, Postgres"
                error={errors.primary_stack}
              />
              <FieldGroup
                label="Secondary Stack"
                name="secondary_stack"
                defaultValue={builder.secondary_stack ?? ""}
                placeholder="e.g. Python, FastAPI, Redis"
                error={errors.secondary_stack}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Weekly Availability
                </label>
                <select
                  name="availability"
                  defaultValue={builder.availability}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {availabilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <FieldGroup
                label="Commitment Preferences"
                name="commitment_preferences"
                defaultValue={builder.commitment_preferences ?? ""}
                placeholder="e.g. 10–20 hrs/week, evenings only"
                error={errors.commitment_preferences}
              />
            </div>

            <Separator />

            {/* Links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup
                label="Website"
                name="website_url"
                defaultValue={builder.website_url ?? ""}
                placeholder="https://..."
                error={errors.website_url}
              />
              <FieldGroup
                label="LinkedIn"
                name="linkedin_url"
                defaultValue={builder.linkedin_url ?? ""}
                placeholder="https://linkedin.com/in/..."
                error={errors.linkedin_url}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              {saved && (
                <span className="text-sm text-emerald-600">Saved</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldGroup({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  error,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
