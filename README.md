# Orbit — The Evolution of Communication

Phase 1 foundation for Orbit: a premium, AI-ready communication platform inspired by the best of realtime collaboration products, but with its own identity.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS + shadcn/ui primitives
- Framer Motion
- Lucide React
- Supabase Auth + Realtime
- Zustand

## Install command

```bash
npm install framer-motion lucide-react zustand @supabase/supabase-js @supabase/ssr clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-scroll-area @radix-ui/react-avatar @radix-ui/react-separator
```

## Core structure

```
src/
  components/
    auth/
    dashboard/
    landing/
    navigation/
  hooks/
  stores/
  types/
  lib/
```

## Phase 1 features

- **Neural Hub** landing page (`/`) with premium glassmorphic cosmic theme
- **Orbit Auth** (`/auth`) for email/password and Google OAuth via Supabase
- **Orbit Dashboard** (`/dashboard`) with:
  - 3-column glass layout
  - Dynamic Zustand-driven navigation
  - Unified Spaces architecture
  - AI-ready right rail placeholder

## Supabase setup

1. Copy env vars:

```bash
cp .env.example .env.local
```

2. Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Enable providers in Supabase Auth:
- Email
- Google

4. Add callback URL:
- `/auth/callback`

## Run

```bash
npm run dev
```
