import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CheckCircle2, Activity, Target, Users } from "lucide-react";

interface Props {
  stats: {
    verifiedDeliveries: number;
    totalDeliveries: number;
    completionRate: number;
    totalTeams: number;
  };
}

export function ExecutionSummary({ stats }: Props) {
  const cards = [
    {
      label: "Verified Deliveries",
      value: stats.verifiedDeliveries,
      icon: CheckCircle2,
    },
    {
      label: "Active Systems",
      value: stats.totalDeliveries,
      icon: Activity,
    },
    {
      label: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: Target,
    },
    {
      label: "Team Deliveries",
      value: stats.totalTeams,
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
