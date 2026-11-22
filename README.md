# Forge

[![CI](https://github.com/ahyanadatia/Forge/actions/workflows/ci.yml/badge.svg)](https://github.com/ahyanadatia/Forge/actions/workflows/ci.yml)

**A track record for builders, computed from evidence rather than self-description.**

LinkedIn shows employment. GitHub shows code. Forge shows what people actually deliver: builders
log what they shipped, Forge checks it against live deployments and repositories, and the result
is a score that teams can use to find collaborators they can rely on.

Next.js 14 (App Router) · TypeScript · Supabase (Postgres, Auth, Row Level Security) · Tailwind + shadcn/ui · Vitest

## What is in here

| Area | What it does | Where |
| --- | --- | --- |
| Scoring engine | Four-dimension composite mapped to a 100–999 score, with movement caps, tenure gates and inactivity decay | `src/lib/scoring/engine.ts` |
| Anti-gaming | A multiplier (0.6–1.05) that penalises bursty activity, attestation rings and cloned templates | `src/lib/scoring/anti-gaming.ts` |
| Verification probes | Live HTTP checks on deployments and GitHub API checks on repositories; every probe writes an evidence row | `src/lib/scoring/probes.ts` |
| Recompute pipeline | Queue-driven rescoring with rate limiting, score history and versioned model weights | `src/lib/scoring/pipeline.ts` |
| Matching | Builder-to-project compatibility, plus an estimate of whether an invite will be accepted | `src/lib/matching/` |
| Skill analysis | Skill estimates from GitHub signals via an LLM, with a deterministic fallback, blended with self-assessment | `src/lib/skill-ai.ts`, `src/lib/skill-signals.ts`, `src/lib/skills.ts` |
| Search | Natural-language queries parsed into structured filters, no LLM involved | `src/lib/prompt-parser.ts` |
| Teams | Invite → accept → join implemented as Postgres functions with row locks | `supabase/migrations/20260228_invite_flow_v2.sql` |

## How the Forge Score works

The score is deterministic given the evidence on record.

1. **Evidence in.** Verified deliveries, probe results, team attestations and project outcomes are
   stored as rows in `score_evidence`.
2. **Four dimensions**, each 0–100, combined with weights held in the `scoring_model_versions`
   table so the model can be re-versioned without a deploy:

   | Dimension | Default weight |
   | --- | --- |
   | Execution Consistency | 30% |
   | Reliability & Commitment | 30% |
   | AI-Orchestration Intelligence | 20% |
   | Live Performance Index | 20% |

3. **Anti-gaming multiplier.** Weekly activity is bucketed and scored with a Gini coefficient to
   catch bursts; reciprocal attestation rings and template clones are detected separately. The
   multiplier ranges from 0.6 (flagged) to 1.05 (consistent long-term activity).
4. **Mapping.** The adjusted composite goes through a sigmoid onto a 100–999 scale.
5. **Guard rails.**
   - Inactivity decay starts after 60 days without new evidence.
   - 800+ requires at least 4 months of evidence; 900+ requires at least 9.
   - A recompute moves the score by at most ±35, or ±70 when there is milestone evidence.

A confidence value (0–100) is reported alongside, based on evidence volume, evidence diversity,
tenure and whether any anti-gaming flag fired.

An earlier formula (V2, 0–1000, `src/lib/forge-score.ts`) is still used by parts of the UI.

## Matching

Builders are ranked against a project on five components:

| Component | Weight |
| --- | --- |
| Skill fit | 35% |
| Reliability fit | 25% |
| Execution fit | 15% |
| Stack fit | 15% |
| Commitment fit | 10% |

Skill levels blend an AI estimate with self-assessment (`0.6 × AI + 0.4 × self`). The AI estimate
uses the OpenAI API when `OPENAI_API_KEY` is set and falls back to a deterministic heuristic
when it is not, so the app runs without any model key.

## Data model

26 Postgres tables across 16 migrations in `supabase/migrations/`, with 63 Row Level Security
policies. Authentication is GitHub OAuth through Supabase Auth.

## Tests

```bash
npm test          # 254 tests across 15 files (Vitest), including property-based tests
npx tsc --noEmit  # type-check
```

The tests cover the scoring engines, matching, acceptance likelihood, the search parser, skill
blending, the invite flow and project workflow rules. Property-based tests (fast-check) assert
the scoring invariants for arbitrary inputs: scores stay in range, movement caps and tenure
gates hold, and more verified work never lowers a score. CI runs the type-check and the tests on
every push and pull request.

## Run it locally

```bash
git clone https://github.com/ahyanadatia/Forge.git
cd Forge
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev                        # http://localhost:3000
```

1. Create a [Supabase project](https://supabase.com/dashboard) and run the files in
   `supabase/migrations/` in filename order in the SQL editor.
2. Enable GitHub under Authentication → Providers.
3. Set the environment variables:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
   | `GITHUB_TOKEN` | No | Higher GitHub API rate limits for repository probes |
   | `OPENAI_API_KEY` | No | LLM skill analysis; a deterministic fallback is used without it |
   | `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |

## Project layout

```
src/
├── app/
│   ├── (auth)/          # Login and OAuth callback
│   ├── (platform)/      # Dashboard, profiles, projects, teams, discover, messages, settings
│   ├── u/[username]/    # Profile pages by username
│   └── api/             # Scoring, verification, matching, search, invites, presence
├── components/          # UI, grouped by feature (shadcn/ui primitives in ui/)
├── lib/
│   ├── scoring/         # V3 engine, anti-gaming, probes, evidence, recompute pipeline
│   ├── matching/        # Compatibility, acceptance likelihood, project level
│   ├── supabase/        # Browser, server and middleware clients
│   └── __tests__/       # Unit tests
├── services/            # Database access layer
└── types/               # Domain and database types
supabase/migrations/     # Schema, RLS policies and Postgres functions
```

## Contributors

Ahyan Adatia and Likhith Bakkachenna.
