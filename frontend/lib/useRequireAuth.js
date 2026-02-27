import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { supabase } from './supabase';

export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(false);
        router.replace('/login');
      }
      setCheckingAuth(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        return;
      }

      setUser(false);
      router.replace('/login');
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [router]);

  return { user, checkingAuth };
}
