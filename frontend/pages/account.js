
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BadgeCheck, CalendarDays, Mail, UserRound } from 'lucide-react';

import Header from '../components/Header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { useRequireAuth } from '../lib/useRequireAuth';

export default function Account() {
  const { user, checkingAuth } = useRequireAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    window.location.href = '/login';
  };

  if (checkingAuth || user === null) return <div className="min-h-screen flex items-center justify-center">Loading account...</div>;
  if (user === false) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Personal Information</Badge>
            <CardTitle className="mt-2 text-2xl">Manage your personal details</CardTitle>
            <CardDescription>Identity and account actions moved here from profile.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-4 md:col-span-2">
              <div className="flex items-center gap-4">
                <img
                  src={`https://github.com/${user.user_metadata?.user_name || 'octocat'}.png`}
                  alt="Profile avatar"
                  className="h-16 w-16 rounded-full border"
                  onError={e => (e.target.src = 'https://avatars.githubusercontent.com/u/583231?v=4')}
                />
                <div>
                  <div className="text-base font-semibold">{user.user_metadata?.name || user.email}</div>
                  <div className="text-sm text-muted-foreground">GitHub connected profile</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /> Name</div>
              <div className="font-medium">{user.user_metadata?.name || user.email}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><BadgeCheck className="h-4 w-4" /> GitHub Username</div>
              <div className="font-medium">{user.user_metadata?.user_name || 'Not set'}</div>
            </div>
            <div className="rounded-lg border p-4 md:col-span-2">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> Email</div>
              <div className="font-medium">{user.email}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> Account Created</div>
              <div className="font-medium">{user.created_at ? new Date(user.created_at).toISOString().slice(0, 10) : 'N/A'}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-1 text-sm text-muted-foreground">User ID</div>
              <div className="font-mono text-sm break-all">{user.id}</div>
            </div>
            <div className="md:col-span-2">
              <Button asChild variant="outline">
                <Link href="/profile">Back to Profile</Link>
              </Button>
              <Button asChild className="ml-2">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
              <Button
                onClick={handleSignOut}
                disabled={loading}
                variant="destructive"
                className="ml-2"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {loading ? 'Signing out...' : 'Sign Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
