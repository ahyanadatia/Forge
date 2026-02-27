import type { Conversation, Message } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function getConversations(client: Client, userId: string) {
  const { data, error } = await client
    .from("conversations")
    .select(
      "*, participant_1:builders!conversations_participant_1_id_fkey(*), participant_2:builders!conversations_participant_2_id_fkey(*)"
    )
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data as unknown as Conversation[];
}

export async function getMessages(
  client: Client,
  conversationId: string,
  options?: { limit?: number; before?: string }
) {
  let query = client
    .from("messages")
    .select("*, builders(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  query = query.limit(options?.limit ?? 50);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Message[]).reverse();
}

export async function sendMessage(
  client: Client,
  message: {
    conversation_id: string;
    sender_id: string;
    content: string;
  }
) {
  const { data, error } = await client
    .from("messages")
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Message;
}

export async function getOrCreateConversation(
  client: Client,
  userId: string,
  otherUserId: string
) {
  const [p1, p2] =
    userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

  const { data: existing } = await client
    .from("conversations")
    .select("*")
    .eq("participant_1_id", p1)
    .eq("participant_2_id", p2)
    .single();

  if (existing) return existing as unknown as Conversation;

  const { data, error } = await client
    .from("conversations")
    .insert({ participant_1_id: p1, participant_2_id: p2 })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Conversation;
}

export async function markMessagesAsRead(
  client: Client,
  conversationId: string,
  userId: string
) {
  const { error } = await client
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) throw error;
}
