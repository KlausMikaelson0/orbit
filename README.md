# Orbit — The Evolution of Communication

Orbit is now running on a multi-phase foundation:
- Phase 1: Cosmic UI + Auth + Dashboard shell
- Phase 2: Supabase schema, realtime text chat, invite-based server/channel system
- Phase 3: media uploads, LiveKit voice/video channels, member moderation, AI summary UI
- Phase 4: social core (DMs, friends, command palette, notifications, privacy mode)

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

Additional Phase 3 packages:

```bash
npm install @livekit/components-react livekit-client livekit-server-sdk @radix-ui/react-dropdown-menu
```

Additional Phase 4 package:

```bash
npm install cmdk
```

## Core structure

```
src/
  components/
    auth/
    dashboard/
    landing/
    chat/
    sidebar/
    live/
    modals/
    social/
    search/
  hooks/
  context/
  stores/
  types/
  lib/
```

## Active feature set

- **Neural Hub** landing page (`/`)
- **Orbit Auth** (`/auth`) with Supabase (email/password + Google)
- **Orbit Dashboard** (`/dashboard`)
  - Dynamic server/channel sidebars
  - Realtime text channels
  - Voice/video channel handoff to LiveKit
  - Online members sidebar with role coloring
  - Admin kick/ban context actions
  - Summarize Channel (mock AI summary)
  - Message attachment uploads (images + PDFs)
  - Direct messages (Home view)
  - Friends system (All/Pending/Add Friend)
  - Orbit Spotlight search (Ctrl/Cmd + K)
  - Browser notifications + Orbit ping sound
  - Privacy mode (blur chat until hover)
  - Mobile side panels (hamburger/menu-driven)

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

5. Run SQL migrations (in order) from:

```bash
supabase/migrations/
```

Required:
- `20260219_orbit_phase2.sql`
- `20260219_orbit_phase3_media_voice.sql`
- `20260219_orbit_phase4_social.sql`

These create:
- core tables (`profiles`, `servers`, `channels`, `members`, `messages`)
- moderation table (`server_bans`)
- storage bucket `message-attachments`
- social tables (`relationships`, `dm_threads`, `dm_participants`, `dm_messages`)
- realtime publication + RLS policies

## LiveKit setup

Create/Configure a LiveKit project and set:

- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

`/api/livekit/token` generates room tokens server-side.  
Room names are auto-derived from server/channel IDs.

## Run

```bash
npm run dev
```
