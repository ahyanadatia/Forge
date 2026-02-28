export interface TourStep {
  id: string;
  title: string;
  description: string;
  selector: string; // CSS selector to anchor to
  ctaLabel?: string;
  ctaAction?: "next" | "generate-score" | "create-project" | "done";
  position?: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "profile",
    title: "Your execution record",
    description: "Your Forge profile is your execution record. Everything here is derived from verified evidence.",
    selector: "[data-tour='profile-header']",
    ctaLabel: "Next",
    ctaAction: "next",
    position: "bottom",
  },
  {
    id: "forge-score",
    title: "Your Forge Score",
    description: "Generate your Forge Score to get an initial credibility estimate based on your deliveries and activity.",
    selector: "[data-tour='forge-score']",
    ctaLabel: "Next",
    ctaAction: "next",
    position: "bottom",
  },
  {
    id: "create-project",
    title: "Post a project",
    description: "Post a project and Forge ranks builders by fit. Find the right teammates for your idea.",
    selector: "[data-tour='create-project']",
    ctaLabel: "Next",
    ctaAction: "next",
    position: "bottom",
  },
  {
    id: "matches",
    title: "Discover top matches",
    description: "Invite from the top matches list. You'll see compatibility and likelihood to accept.",
    selector: "[data-tour='matches']",
    ctaLabel: "Done",
    ctaAction: "done",
    position: "bottom",
  },
];
