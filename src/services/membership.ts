// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function acceptInviteTransaction(
  client: Client,
  inviteId: string,
  userId: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await client.rpc("accept_invite", {
    p_invite_id: inviteId,
    p_user_id: userId,
  });

  if (error) return { data: null, error: error.message };

  const result = data as Record<string, unknown>;
  if (result?.error) {
    return { data: result, error: result.error as string };
  }

  return { data: result, error: null };
}

export async function declineInviteTransaction(
  client: Client,
  inviteId: string,
  userId: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await client.rpc("decline_invite", {
    p_invite_id: inviteId,
    p_user_id: userId,
  });

  if (error) return { data: null, error: error.message };

  const result = data as Record<string, unknown>;
  if (result?.error) {
    return { data: result, error: result.error as string };
  }

  return { data: result, error: null };
}

export async function joinProjectAsOwner(
  client: Client,
  projectId: string,
  ownerId: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await client.rpc("join_project_as_owner", {
    p_project_id: projectId,
    p_owner_id: ownerId,
  });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function acceptApplicationTransaction(
  client: Client,
  applicationId: string,
  ownerId: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await client.rpc("accept_application", {
    p_application_id: applicationId,
    p_owner_id: ownerId,
  });

  if (error) return { data: null, error: error.message };

  const result = data as Record<string, unknown>;
  if (result?.error) {
    return { data: result, error: result.error as string };
  }

  return { data: result, error: null };
}

export async function getProjectRoleSeatCounts(
  client: Client,
  projectId: string
): Promise<{ role: string; filled: number; total: number }[]> {
  const { data: roles } = await client
    .from("project_roles")
    .select("role_name, seats_total")
    .eq("project_id", projectId);

  if (!roles?.length) return [];

  const { data: teamData } = await client
    .from("teams")
    .select("id")
    .eq("project_id", projectId)
    .single();

  if (!teamData) {
    return (roles as any[]).map((r: any) => ({
      role: r.role_name,
      filled: 0,
      total: r.seats_total,
    }));
  }

  const { data: members } = await client
    .from("team_members")
    .select("role")
    .eq("team_id", teamData.id)
    .is("left_at", null);

  const memberRoles = (members ?? []) as { role: string }[];
  const countByRole: Record<string, number> = {};
  for (const m of memberRoles) {
    countByRole[m.role] = (countByRole[m.role] || 0) + 1;
  }

  return (roles as any[]).map((r: any) => ({
    role: r.role_name,
    filled: countByRole[r.role_name] || 0,
    total: r.seats_total,
  }));
}
