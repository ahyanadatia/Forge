"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hammer,
  Search,
  FolderKanban,
  Users,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { getBuilder } from "@/services/builders";
import { getDisplayName, getInitials } from "@/lib/profile";
import { LiveUsersIndicator } from "@/components/nav/live-users-indicator";
import { InviteBadge } from "@/components/nav/invite-badge";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Builder } from "@/types";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Discover", href: "/discover", icon: Search },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Messages", href: "/messages", icon: MessageSquare },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [builder, setBuilder] = useState<Builder | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        try {
          const b = await getBuilder(supabase, data.user.id);
          setBuilder(b);
        } catch {
          // Builder profile may not exist yet
        }
      }
    });
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const initials = builder
    ? getInitials(builder)
    : user?.user_metadata?.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) ?? "?";

  const avatarUrl = builder?.avatar_url ?? user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <Hammer className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">Forge</span>
        </Link>

        {user && (
          <nav className="flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 gap-1.5 text-sm font-normal",
                      isActive &&
                        "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center space-x-3">
          {user ? (
            <>
              <LiveUsersIndicator />
              <InviteBadge />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-tour="matches"
                onClick={() => (window as any).__startForgeTour?.()}
                title="Take a tour"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Link href={`/profile/${user.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={avatarUrl}
                      alt={builder ? getDisplayName(builder) : ""}
                    />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
