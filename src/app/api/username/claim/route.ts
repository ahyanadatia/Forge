import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/username";
import { setUsername } from "@/services/builders";

const claimSchema = z.object({
  username: usernameSchema,
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid username" },
      { status: 400 }
    );
  }

  try {
    const { data: existing } = await supabase
      .from("builders")
      .select("username")
      .eq("id", user.id)
      .single() as { data: any; error: any };

    const builder = await setUsername(
      supabase,
      user.id,
      parsed.data.username,
      existing?.username
    );
    return NextResponse.json({ username: builder.username });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err?.message ?? "Failed to set username" },
      { status: 500 }
    );
  }
}
