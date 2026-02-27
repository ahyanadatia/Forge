"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn, formatRelativeDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getConversations,
  getMessages,
  sendMessage,
  getOrCreateConversation,
  markMessagesAsRead,
} from "@/services/messages";
import type { Conversation, Message } from "@/types";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withUser = searchParams.get("with");

  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push("/login");
      setUserId(data.user.id);

      const convs = await getConversations(supabase, data.user.id);
      setConversations(convs);

      if (withUser && data.user.id) {
        const conv = await getOrCreateConversation(
          supabase,
          data.user.id,
          withUser
        );
        setActiveConv(conv.id);
        if (!convs.find((c) => c.id === conv.id)) {
          setConversations([conv, ...convs]);
        }
      } else if (convs.length > 0) {
        setActiveConv(convs[0].id);
      }
    });
  }, [supabase, router, withUser]);

  useEffect(() => {
    if (!activeConv || !userId) return;
    getMessages(supabase, activeConv).then(setMessages);
    markMessagesAsRead(supabase, activeConv, userId);
  }, [activeConv, userId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConv || !userId) return;
    setSending(true);
    try {
      const msg = await sendMessage(supabase, {
        conversation_id: activeConv,
        sender_id: userId,
        content: newMessage.trim(),
      });
      setMessages([...messages, msg]);
      setNewMessage("");
    } catch {
      // Ignore
    }
    setSending(false);
  };

  const getOtherParticipant = (conv: any) => {
    if (!userId) return null;
    return conv.participant_1_id === userId
      ? conv.participant_2 ?? conv.participant_1
      : conv.participant_1 ?? conv.participant_2;
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex h-[calc(100vh-10rem)] rounded-lg border overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r flex flex-col shrink-0">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv: any) => {
                const other = getOtherParticipant(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                      activeConv === conv.id && "bg-muted"
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={other?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(other?.display_name?.[0] ?? other?.first_name?.[0] ?? other?.full_name?.[0] ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {other?.display_name || [other?.first_name, other?.last_name].filter(Boolean).join(" ") || (other?.full_name ?? "Unknown")}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(conv.last_message_at)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          {activeConv ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.sender_id === userId
                        ? "justify-end"
                        : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                        msg.sender_id === userId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t p-3 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="h-9"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
