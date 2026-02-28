import { ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getImproveSuggestions, type ForgeScoreOutput } from "@/lib/forge-score";

interface Props {
  scores: ForgeScoreOutput;
}

export function ForgeScoreImprove({ scores }: Props) {
  const suggestions = getImproveSuggestions(scores);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">How to Improve</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {suggestions.map((suggestion, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{suggestion}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
