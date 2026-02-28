import type { Invitation } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function sendInvitation(
  client: Client,
  invitation: {
    project_id: string;
    sender_id: string;
    builder_id: string;
    role?: string;
    message?: string;
  }
) {
  const { data, error } = await client
    .from("invitations")
    .insert(invitation)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Invitation;
}

export async function getProjectInvitations(client: Client, projectId: string) {
  const { data, error } = await client
    .from("invitations")
    .select("*, builder:builders!invitations_builder_id_fkey(id, full_name, first_name, last_name, display_name, avatar_url, username, forge_score)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as (Invitation & { builder: any })[];
}

export async function getBuilderInvitations(client: Client, builderId: string) {
  const { data, error } = await client
    .from("invitations")
    .select("*, project:projects(id, title, timeline, hours_per_week, team_size, status, category, stage), sender:builders!invitations_sender_id_fkey(id, full_name, first_name, last_name, display_name, avatar_url, forge_score)")
    .eq("builder_id", builderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as (Invitation & { project: any; sender: any })[];
}

export async function getSentInvitations(client: Client, senderId: string) {
  const { data, error } = await client
    .from("invitations")
    .select("*, project:projects(id, title), builder:builders!invitations_builder_id_fkey(id, full_name, first_name, last_name, display_name, avatar_url, username, forge_score)")
    .eq("sender_id", senderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as (Invitation & { project: any; builder: any })[];
}

export async function respondToInvitation(
  client: Client,
  invitationId: string,
  status: "accepted" | "declined"
) {
  const { data, error } = await client
    .from("invitations")
    .update({ status })
    .eq("id", invitationId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Invitation;
}

export async function getInvitationHistory(client: Client, builderId: string) {
  const { data } = await client
    .from("invitations")
    .select("status, created_at")
    .eq("builder_id", builderId);

  const invites = (data ?? []) as { status: string; created_at: string }[];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  return {
    past_invites_received: invites.length,
    past_invites_accepted: invites.filter(i => i.status === "accepted").length,
    past_invites_declined: invites.filter(i => i.status === "declined").length,
    recent_invites_7d: invites.filter(i => new Date(i.created_at).getTime() > sevenDaysAgo).length,
  };
}
