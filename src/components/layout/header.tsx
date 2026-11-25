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
    <>
    <header className="sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center gap-2">
        <Link href={user ? "/dashboard" : "/"} className="mr-4 flex items-center gap-2 md:mr-8" aria-label="Forge home">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Hammer className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">Forge</span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    isActive && "bg-accent font-medium text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <span className="hidden lg:inline-flex">
                <LiveUsersIndicator />
              </span>
              <InviteBadge />
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-9 w-9 sm:inline-flex"
                data-tour="matches"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => (window as any).__startForgeTour?.()}
                aria-label="Take a tour"
                title="Take a tour"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Link
                href={`/profile/${user.id}`}
                className="rounded-full"
                aria-label="Your profile"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={avatarUrl}
                    alt={builder ? getDisplayName(builder) : ""}
                  />
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="brand">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>

    {user && (
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
                    isActive && "font-medium text-brand"
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    )}
    </>
  );
}
