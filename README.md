# Forge

**Execution identity infrastructure for builders.**

Forge is the trusted execution record for builders. LinkedIn shows employment. GitHub shows code. Forge shows what builders actually deliver.

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, auth callback
│   ├── (platform)/         # Authenticated platform pages
│   │   ├── dashboard/      # Builder dashboard
│   │   ├── profile/[id]/   # Builder profiles
│   │   ├── deliveries/[id] # Delivery detail + verification
│   │   ├── projects/       # Project listing, detail, creation
│   │   ├── teams/          # Team workspace + tasks
│   │   ├── discover/       # Builder & project search
│   │   ├── messages/       # 1:1 messaging
│   │   └── settings/       # Profile settings
│   └── api/                # Server-side API routes
│       ├── scoring/        # Forge Score computation
│       ├── verification/   # Delivery verification engine
│       └── matching/       # Builder-to-project matching
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Header, navigation
│   ├── profile/            # Profile section components
│   ├── projects/           # Project components
│   └── teams/              # Team components
├── lib/
│   ├── supabase/           # Client, server, middleware
│   ├── scoring.ts          # Forge Score algorithm
│   ├── verification.ts     # Verification rules engine
│   ├── matching.ts         # Builder matching engine
│   ├── insights.ts         # Insights generation
│   └── utils.ts            # Utilities
├── services/               # Database operations layer
│   ├── builders.ts
│   ├── deliveries.ts
│   ├── projects.ts
│   ├── applications.ts
│   ├── teams.ts
│   ├── messages.ts
│   └── evidence.ts
└── types/                  # TypeScript type definitions
    ├── index.ts            # Domain types
    └── database.ts         # Supabase schema types
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel

## Setup

### 1. Clone & Install

```bash
git clone <repo-url> forge
cd forge
npm install
```

### 2. Supabase

Create a [Supabase project](https://supabase.com/dashboard) and run the migration:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20260227_forge_schema.sql
```

Enable GitHub OAuth in Authentication > Providers.

### 3. Environment

```bash
cp .env.local.example .env.local
```

Set your Supabase URL and anon key in `.env.local`.

### 4. Run

```bash
npm run dev
```

### 5. Deploy to Vercel

```bash
vercel
```

Set environment variables in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Core Concepts

### Forge Score (0–1000)

| Component | Weight |
|-----------|--------|
| Verified Deliveries | 45% |
| Reliability | 30% |
| Collaboration | 15% |
| Consistency | 10% |

**Confidence Score** (0–100): Based on data completeness.

**Effective Score**: `ForgeScore × (0.6 + 0.4 × Confidence/100)`

### Verification

Deliveries are verified through:
- Deployment reachability checks
- Repository existence checks
- Timeline verification
- Collaborator attestations

### Matching

Rule-based engine scoring builders against project requirements:
- Capability fit (35%)
- Reliability (30%)
- Delivery history (20%)
- Commitment match (15%)

## Database

13 tables with full RLS:

`builders` · `deliveries` · `evidence` · `verifications` · `projects` · `applications` · `teams` · `team_members` · `team_tasks` · `activity_events` · `forge_scores` · `conversations` · `messages`

## Security

- Row Level Security on every table
- Users can only edit their own profiles
- Score tables are read-only for users
- Evidence records are immutable
- Auth via Supabase (GitHub OAuth)
