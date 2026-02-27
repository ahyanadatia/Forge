import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  stats: {
    totalDeliveries: number;
    completedDeliveries: number;
    droppedDeliveries: number;
    completionRate: number;
    totalProjects: number;
  };
}

export function ReliabilityPanel({ stats }: Props) {
  const rows = [
    { label: "Projects Joined", value: stats.totalDeliveries },
    { label: "Projects Completed", value: stats.completedDeliveries },
    { label: "Projects Dropped", value: stats.droppedDeliveries },
    { label: "Completion Rate", value: `${stats.completionRate}%` },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Reliability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
