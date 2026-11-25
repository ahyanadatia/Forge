# Forge

[![CI](https://github.com/ahyanadatia/Forge/actions/workflows/ci.yml/badge.svg)](https://github.com/ahyanadatia/Forge/actions/workflows/ci.yml)

A track record for builders, computed from evidence instead of self-description.

Builders log what they shipped. Forge checks each delivery against the live deployment and the
GitHub repository, records what it finds as evidence, and turns that evidence into a score teams
can use to find collaborators who deliver.

Next.js 16 · React 19 · TypeScript · Supabase (Postgres, Auth, row level security) · Vitest

## Architecture

```mermaid
flowchart LR
  UI["Next.js app<br/>(App Router)"] -->|user session| API["Route handlers<br/>/api/*"]
  API -->|RLS-checked reads| DB[("Supabase Postgres<br/>26 tables, RLS")]
  API -->|"verify a delivery"| Probes["Verification probes"]
  Probes -->|"safeFetch<br/>(SSRF-guarded)"| Site["Builder's deployment"]
  Probes -->|REST| GH["GitHub API"]
  Probes -->|"service role"| Ledger[("score_evidence<br/>append-only ledger")]
  Ledger --> Queue[("score_recompute_queue")]
  Cron["Scheduler<br/>(CRON_SECRET)"] --> Worker["process-queue"]
  Queue --> Worker --> Engine["V3 scoring engine<br/>(pure functions)"]
  Engine --> History[("score_history")]
```

Two rules shape the design:

- **Evidence is append-only and written by the system.** Users can read the ledger but cannot
  write to it; row level security has no insert policy. Routes authenticate the caller with their
  own session, check ownership, and only then write with a server-only service-role client.
- **Scoring is pure.** The engine in `src/lib/scoring/engine.ts` takes evidence and returns a
  score with no I/O, which is what makes it property-testable.

## How the score works

1. **Evidence.** Verified deliveries, probe results, team attestations and project outcomes, one
   row each in `score_evidence`, deduplicated by a hash of their content.
2. **Four dimensions**, 0–100 each, weighted by the active row in `scoring_model_versions` so the
   model can be re-versioned without a deploy: execution consistency (30%), reliability and
   commitment (30%), AI-orchestration (20%), live performance (20%).
3. **Anti-gaming multiplier** (0.6–1.05): bursty activity is scored with a Gini coefficient over
   weekly buckets, and reciprocal attestation rings and cloned templates are detected separately.
4. **Mapping** onto 100–999 through a sigmoid, with guard rails: decay after 60 days without new
   evidence, 800+ needs 4 months of history and 900+ needs 9, and one recompute moves the score by
   at most ±35 (±70 with milestone evidence).

## Verification probes and SSRF

A delivery's deployment URL is typed in by a user and fetched by the server, which is the classic
server-side request forgery setup. All such requests go through `src/lib/net/safe-fetch.ts`:

- only `http`/`https` on ports 80 and 443, and no credentials in the URL;
- IP literals are checked against private, loopback, link-local (including the cloud metadata
  address), CGNAT, multicast and reserved ranges, for IPv4 and IPv6, including IPv4-mapped forms;
- hostnames are resolved inside the socket's own DNS lookup hook, so the address that is checked
  is the address that is connected to (no DNS-rebinding gap between check and connect);
- redirects are followed by hand, and every hop is validated again (at most 3);
- a total timeout and a 512 KB cap on the body.

GitHub repository URLs are parsed strictly (`https://github.com/<owner>/<repo>` with valid
names) before they become API paths.

## Status

- The V3 engine, evidence ledger, probes and queue are implemented and tested, and the API routes
  under `/api/scoring/v3/*` work once `SUPABASE_SERVICE_ROLE_KEY` is set.
- The interface still shows the earlier V2 score (`src/lib/forge-score.ts`). Switching the profile
  and dashboard to V3 is the next piece of work.
- `src/types/database.ts` is hand-written and does not yet describe every table; queries against
  undescribed tables go through an explicit `untyped()` helper. Generating the types from the
  schema will remove it.

## Run it locally

Requires Node 22.12+.

```bash
git clone https://github.com/ahyanadatia/Forge.git
cd Forge
npm install
cp .env.local.example .env.local   # fill in the values
npm run dev                        # http://localhost:3000
```

1. Create a Supabase project and run the files in `supabase/migrations/` in filename order.
2. Enable GitHub under Authentication → Providers.
3. Fill in `.env.local`. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
   required; `SUPABASE_SERVICE_ROLE_KEY` is needed for V3 scoring; `GITHUB_TOKEN`,
   `OPENAI_API_KEY` and `CRON_SECRET` are optional (see the example file).

## Checks

```bash
npm test            # Vitest, including property-based tests (fast-check)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run build
```

CI runs all four on every push and pull request.

## Layout

```
src/
├── app/                 # pages and route handlers (api/)
├── components/          # UI by feature; shadcn/ui primitives in ui/
├── lib/
│   ├── net/             # safeFetch
│   ├── scoring/         # V3 engine, anti-gaming, probes, evidence ledger, queue
│   ├── matching/        # builder-project compatibility, acceptance likelihood
│   ├── supabase/        # browser, server and service-role clients
│   └── __tests__/
├── services/            # database access
└── types/
supabase/migrations/     # schema, RLS policies, Postgres functions
```

## Contributors

Ahyan Adatia and Likhith Bakkachenna.
