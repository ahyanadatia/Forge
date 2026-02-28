import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/username";
import { checkUsernameAvailability } from "@/services/builders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("username") ?? "";

  const validation = validateUsername(raw);
  if (!validation.valid) {
    return NextResponse.json(
      { available: false, error: validation.error },
      { status: 200 }
    );
  }

  const supabase = await createClient();
  const result = await checkUsernameAvailability(supabase, validation.normalized!);

  return NextResponse.json(result);
}
