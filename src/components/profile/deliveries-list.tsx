import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitBranch, ShieldCheck } from "lucide-react";
import type { Delivery } from "@/types";
import { formatRelativeDate } from "@/lib/utils";

interface Props {
  deliveries: Delivery[];
}

const statusConfig: Record<string, { label: string; variant: "success" | "secondary" | "warning" | "destructive" }> = {
  verified: { label: "Verified", variant: "success" },
  completed: { label: "Completed", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "warning" },
  dropped: { label: "Dropped", variant: "destructive" },
};

export function DeliveriesList({ deliveries }: Props) {
  if (deliveries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Verified Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No deliveries recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Verified Deliveries
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliveries.map((delivery) => {
          const status = statusConfig[delivery.status] ?? statusConfig.in_progress;
          return (
            <Link
              key={delivery.id}
              href={`/deliveries/${delivery.id}`}
              className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{delivery.title}</h4>
                    {delivery.status === "verified" && (
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {delivery.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {delivery.role}
                    </span>
                    {delivery.stack.slice(0, 4).map((tech) => (
                      <Badge
                        key={tech}
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        {tech}
                      </Badge>
                    ))}
                    {delivery.stack.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{delivery.stack.length - 4}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <div className="flex items-center gap-2">
                    {delivery.deployment_url && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {delivery.repo_url && (
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  {delivery.completed_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(delivery.completed_at)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
