import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { declineInviteTransaction } from "@/services/membership";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await declineInviteTransaction(
    supabase,
    params.id,
    user.id
  );

  if (error) {
    return NextResponse.json({ error, code: data?.code }, { status: 400 });
  }

  return NextResponse.json(data);
}
