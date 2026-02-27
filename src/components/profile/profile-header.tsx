import { MapPin, ExternalLink, Github } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDisplayName, getInitials } from "@/lib/profile";
import type { Builder, ForgeScore } from "@/types";
import Link from "next/link";

const availabilityConfig = {
  available: { label: "Available", variant: "success" as const },
  open_to_opportunities: {
    label: "Open to Opportunities",
    variant: "secondary" as const,
  },
  busy: { label: "Busy", variant: "warning" as const },
  unavailable: { label: "Unavailable", variant: "outline" as const },
};

interface Props {
  builder: Builder;
  forgeScore: ForgeScore | null;
  stats: {
    verifiedDeliveries: number;
    completionRate: number;
  };
  isOwner: boolean;
}

export function ProfileHeader({ builder, forgeScore, stats, isOwner }: Props) {
  const availability =
    availabilityConfig[builder.availability] ?? availabilityConfig.unavailable;

  const displayName = getDisplayName(builder);
  const initials = getInitials(builder);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <Avatar className="h-20 w-20 border-2 border-border">
        <AvatarImage src={builder.avatar_url ?? undefined} />
        <AvatarFallback className="text-xl">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {displayName}
            </h1>
            {builder.university_or_company && (
              <p className="text-sm text-muted-foreground">
                {builder.university_or_company}
              </p>
            )}
            {builder.role_descriptor && (
              <p className="text-muted-foreground">{builder.role_descriptor}</p>
            )}
          </div>
          {isOwner && (
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {builder.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {builder.location}
            </span>
          )}
          {builder.github_username && (
            <a
              href={`https://github.com/${builder.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              {builder.github_username}
            </a>
          )}
          {builder.website_url && (
            <a
              href={builder.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Website
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={availability.variant}>{availability.label}</Badge>
          {forgeScore && (
            <Badge variant="outline" className="font-mono tabular-nums">
              Forge Score: {forgeScore.score}
            </Badge>
          )}
          <Badge variant="outline" className="tabular-nums">
            {stats.verifiedDeliveries} Verified{" "}
            {stats.verifiedDeliveries === 1 ? "Delivery" : "Deliveries"}
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            {stats.completionRate}% Completion
          </Badge>
        </div>

        {builder.bio && (
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {builder.bio}
          </p>
        )}
      </div>
    </div>
  );
}
