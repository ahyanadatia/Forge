import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseBuilderPrompt } from "@/lib/prompt-parser";

const searchSchema = z.object({
  prompt: z.string().max(500).optional(),
  query: z.string().max(200).optional(),
  skills: z.array(z.string()).optional(),
  availability: z.string().optional(),
  minScore: z.number().optional(),
  stacks: z.array(z.string()).optional(),
  sortBy: z.enum(["score", "recency", "reliability"]).optional(),
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

  const { prompt, page, pageSize, ...directFilters } = parsed.data;

  // Parse prompt into filters, then merge with any direct filters
  const promptFilters = prompt ? parseBuilderPrompt(prompt) : {};
  const filters = { ...promptFilters, ...Object.fromEntries(
    Object.entries(directFilters).filter(([, v]) => v !== undefined)
  ) };

  const supabase = await createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("builders")
    .select("*, forge_scores(*)", { count: "exact" });

  if (filters.query) {
    query = query.or(
      `full_name.ilike.%${filters.query}%,first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%,username.ilike.%${filters.query}%,role_descriptor.ilike.%${filters.query}%`
    );
  }
  if (filters.availability) {
    query = query.eq("availability", filters.availability);
  }
  if (filters.minScore) {
    query = query.gte("forge_score", filters.minScore);
  }

  // Sort by effective score desc (primary), then recency
  if (filters.sortBy === "score") {
    query = query.order("forge_score", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("forge_score", { ascending: false, nullsFirst: false });
  }
  query = query.order("created_at", { ascending: false });

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    builders: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    filters,
  });
}
