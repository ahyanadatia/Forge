import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBuilderByUsername, getBuilderByOldUsername } from "@/services/builders";

export const dynamic = "force-dynamic";

interface Props {
  params: { username: string };
}

export default async function PublicProfilePage({ params }: Props) {
  const supabase = await createClient();

  let builder;
  try {
    builder = await getBuilderByUsername(supabase, params.username);
  } catch {
    // Check if this is an old username that should redirect
    const history = await getBuilderByOldUsername(supabase, params.username);
    if (history) {
      redirect(`/u/${history.new_username}`);
    }
    notFound();
  }

  // Redirect to the canonical profile page
  redirect(`/profile/${builder.id}`);
}
