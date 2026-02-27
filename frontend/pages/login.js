import { Github, LogIn } from 'lucide-react';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../lib/supabase';

export default function Login() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:3000/dashboard'
      }
    });
  };

  return (
    <div className="min-h-screen bg-background px-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Forge</CardTitle>
            <CardDescription>Sign in with GitHub to unlock teammate matching and execution insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleLogin}>
              <Github className="mr-2 h-4 w-4" />
              <span className="mr-1">Sign in with GitHub</span>
              <LogIn className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
