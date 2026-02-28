import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseProjectPrompt } from "@/lib/prompt-parser";
import { getProjects } from "@/services/projects";

const searchSchema = z.object({
  prompt: z.string().max(500).optional(),
  query: z.string().max(200).optional(),
  category: z.string().optional(),
  stage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  rolesNeeded: z.array(z.string()).optional(),
  minHoursPerWeek: z.number().optional(),
  maxHoursPerWeek: z.number().optional(),
  maxTimelineWeeks: z.number().optional(),
  status: z.string().default("open"),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // use defaults
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prompt, ...directFilters } = parsed.data;
  const promptFilters = prompt ? parseProjectPrompt(prompt) : {};
  const filters = { ...promptFilters, ...Object.fromEntries(
    Object.entries(directFilters).filter(([, v]) => v !== undefined)
  ) };

  const supabase = await createClient();

  try {
    const result = await getProjects(supabase, {
      status: filters.status,
      category: filters.category,
      stage: filters.stage,
      tags: filters.tags,
      rolesNeeded: filters.rolesNeeded,
      minHoursPerWeek: filters.minHoursPerWeek,
      maxHoursPerWeek: filters.maxHoursPerWeek,
      maxTimelineWeeks: filters.maxTimelineWeeks,
      ftsQuery: filters.ftsQuery,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    return NextResponse.json({ ...result, filters });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Search failed" }, { status: 500 });
  }
}
