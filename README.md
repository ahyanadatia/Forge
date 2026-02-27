# Foundr MVP

## Overview
Foundr is an execution-verified team formation platform for technical students. This MVP includes:
- Next.js (React) frontend with Tailwind CSS
- Node.js (Express) backend
- PostgreSQL database
- GitHub OAuth authentication
- GitHub API integration

## Structure
- `frontend/` — Next.js app
- `backend/` — Node.js (Express) API
- `shared/` — Shared types/models

## Setup
See frontend and backend folders for setup instructions.

## Supabase Migration (Featured Projects + RLS)
Run the SQL in [supabase/migrations/20260226_featured_projects_rls.sql](supabase/migrations/20260226_featured_projects_rls.sql) in your Supabase SQL Editor.

This creates `public.featured_projects` with Row Level Security policies for:
- Public read of `is_public = true` projects
- Owner-only insert/update/delete
- Owner read of private + public rows

## Supabase Migration (Community Postings + Join Requests)
Run [supabase/migrations/20260227_community_postings_and_requests_rls.sql](supabase/migrations/20260227_community_postings_and_requests_rls.sql).

This enables Discover page user-posted listings where:
- Users can create project/hackathon postings
- Other users can request to join
- RLS protects writes to owners/requesters while allowing safe public discovery of open postings
