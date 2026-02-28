import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteTransaction } from "@/services/membership";

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

  const { data, error } = await acceptInviteTransaction(
    supabase,
    params.id,
    user.id
  );

  if (error) {
    const code = data?.code as string | undefined;
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "FORBIDDEN"
          ? 403
          : code === "CAPACITY_FULL"
            ? 409
            : code === "EXPIRED"
              ? 410
              : code === "INVALID_STATUS"
                ? 422
                : 500;

    return NextResponse.json(
      { error, code, current: data?.current, max: data?.max },
      { status }
    );
  }

  return NextResponse.json(data);
}
