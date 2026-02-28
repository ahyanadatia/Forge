"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hammer } from "lucide-react";

interface Props {
  onStartTour: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ onStartTour, onSkip }: Props) {
  const [open, setOpen] = useState(true);

  const handleTour = () => {
    setOpen(false);
    onStartTour();
  };

  const handleSkip = () => {
    setOpen(false);
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Hammer className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg">Welcome to Forge</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            In 60 seconds, we&apos;ll walk you through how to set up your execution record
            and start finding the right teammates.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button size="sm" onClick={handleTour}>
            Take a tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
