"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Check, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  completed: boolean;
  optional?: boolean;
}

interface Props {
  items: ChecklistItem[];
  onDismiss: () => void;
}

export function ChecklistWidget({ items, onDismiss }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-semibold hover:text-foreground/80"
        >
          Getting started
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {completed}/{total}
          </span>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Progress bar */}
          <div className="h-1 w-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Items */}
          <div className="divide-y">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
              >
                {item.completed ? (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                  {item.label}
                  {item.optional && (
                    <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
