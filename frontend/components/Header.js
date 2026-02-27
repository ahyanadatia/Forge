import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Rocket, Trophy, UserRound } from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function Header({ mode, setMode }) {
  const router = useRouter();
  const [internalMode, setInternalMode] = useState('hackathon');
  const isControlled = typeof mode === 'string' && typeof setMode === 'function';
  const effectiveMode = isControlled ? mode : internalMode;

  const setEffectiveMode = (nextMode) => {
    if (nextMode !== 'startup' && nextMode !== 'hackathon') return;
    if (nextMode === effectiveMode) return;

    if (isControlled) {
      setMode(nextMode);
    } else {
      setInternalMode(nextMode);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('forge_mode', nextMode);
    }
  };

  const isStartupMode = effectiveMode === 'startup';
  const themeClasses = isStartupMode
    ? {
        brandIcon: 'bg-emerald-100 text-emerald-700',
        navWrap: 'border-emerald-200 bg-emerald-50/60',
        activeNav: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
        badge: 'border-emerald-300 bg-emerald-100 text-emerald-800',
        toggleWrap: 'border-emerald-200 bg-emerald-50',
      }
    : {
        brandIcon: 'bg-primary/10 text-primary',
        navWrap: 'border-border bg-muted/50',
        activeNav: '',
        badge: 'border-primary/20 bg-primary/5 text-primary',
        toggleWrap: 'border-border bg-muted',
      };

  const nav = effectiveMode === 'hackathon'
    ? [
        { href: '/', label: 'Discover' },
        { href: '/find-teammate', label: 'Find Teammate' },
        { href: '/teams', label: 'Teams' },
        { href: '/dashboard', label: 'Dashboard' },
      ]
    : [
        { href: '/startup-placeholder', label: 'Discover' },
        { href: '/teams', label: 'Teams' },
        { href: '/dashboard', label: 'Dashboard' },
      ];

  useEffect(() => {
    if (!isControlled && typeof window !== 'undefined') {
      const stored = localStorage.getItem('forge_mode');
      if (stored === 'startup' || stored === 'hackathon') {
        setInternalMode(stored);
      }
    }
  }, [isControlled]);

  useEffect(() => {
    if (!router.isReady) return;

    if (effectiveMode === 'startup' && (router.pathname === '/' || router.pathname === '/find-teammate')) {
      router.replace('/startup-placeholder');
      return;
    }
    if (effectiveMode === 'hackathon' && router.pathname === '/startup-placeholder') {
      router.replace('/');
    }
  }, [effectiveMode, router.isReady, router.pathname]);

  return (
    <nav className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2.5 ${themeClasses.brandIcon}`}>
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">forge</div>
            <div className="text-xs text-muted-foreground">Build with the right people, faster.</div>
          </div>
        </div>

        <div className={`hidden items-center gap-2 rounded-full border p-1.5 md:flex ${themeClasses.navWrap}`}>
          {nav.map((item) => (
            <Button
              key={`${item.href}-${item.label}`}
              variant={router.pathname === item.href ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-full px-4 ${router.pathname === item.href ? themeClasses.activeNav : ''}`}
              asChild
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <Button
            variant={router.pathname === '/profile' ? 'default' : 'outline'}
            size="icon"
            className="h-10 w-10 rounded-full"
            asChild
            aria-label="Open profile"
          >
            <Link href="/profile">
              <UserRound className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`hidden rounded-full sm:inline-flex ${themeClasses.badge}`}>
            <Trophy className="mr-1 h-3 w-3" />
            {effectiveMode === 'hackathon' ? 'Hackathon Mode' : 'Startup Mode'}
          </Badge>
          <div className={`flex rounded-full border p-1 ${themeClasses.toggleWrap}`}>
            <Button
              size="sm"
              variant={effectiveMode === 'hackathon' ? 'default' : 'ghost'}
              onClick={() => setEffectiveMode('hackathon')}
              aria-pressed={effectiveMode === 'hackathon'}
              className="h-8 rounded-full px-4"
            >
              Hackathon
            </Button>
            <Button
              size="sm"
              variant={effectiveMode === 'startup' ? 'default' : 'ghost'}
              onClick={() => setEffectiveMode('startup')}
              aria-pressed={effectiveMode === 'startup'}
              className={`h-8 rounded-full px-4 ${effectiveMode === 'startup' ? 'bg-emerald-600 text-white hover:bg-emerald-600/90' : ''}`}
            >
              Startup
            </Button>
          </div>
          <Button
            variant={router.pathname === '/profile' ? 'default' : 'outline'}
            size="icon"
            className="h-10 w-10 rounded-full md:hidden"
            asChild
            aria-label="Open profile"
          >
            <Link href="/profile">
              <UserRound className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
