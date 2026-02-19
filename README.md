# Orbit — The Evolution of Communication

Orbit is a realtime productivity-social platform built in phases:
- **Phase 1**: Cosmic UI foundation + auth shell
- **Phase 2**: Supabase schema + realtime servers/channels/messages
- **Phase 3**: Media uploads + LiveKit voice/video + moderation controls
- **Phase 4**: Social engine (DMs, friends, command palette, notifications, privacy mode)
- **Phase 5**: Theme engine, Orbit-Bot commands/moderation, channel tasks, threaded replies, PWA readiness

## Stack

- Next.js 16 (App Router + TypeScript)
- Tailwind CSS + shadcn-style primitives
- Zustand
- Supabase (Auth, Postgres, Realtime, Storage)
- LiveKit
- Cmdk
- Framer Motion + Lucide

## Feature highlights

### Core
- Multi-sidebar Discord-style dashboard
- Invite-based servers and channels
- Realtime chat + optimistic message delivery
- Attachment support (images + PDFs)
- Voice/video channels via LiveKit

### Social
- DM home + private threads
- Friends (All / Pending / Add by `username#tag`)
- Presence indicators
- Global command palette (`Ctrl/Cmd + K`)

### Power user (Phase 5)
- **Theme engine**: Midnight, Onyx, Cyberpunk, Custom CSS
- **Orbit-Bot slash commands** in channels:
  - `/summarize` (last 24h summary)
  - `/clear [count]`
  - `/poll question | option 1 | option 2`
- **Sentiment-based moderation flags** for toxic message patterns
- **Channel tasks tab** (realtime task board per channel)
- **Threaded replies** for cleaner conversations
- **PWA support** (installable manifest + service worker registration)
- **Skeleton loaders** for smoother loading states

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Optional AI provider keys (Orbit-Bot summarize endpoint):
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

## Supabase setup

Run migrations in order from `supabase/migrations/`:

1. `20260219_orbit_phase2.sql`
2. `20260219_orbit_phase3_media_voice.sql`
3. `20260219_orbit_phase4_social.sql`
4. `20260219_orbit_phase5_power_user.sql`

Phase 5 adds:
- `orbit_bots` (per-server bot metadata)
- `channel_tasks` (per-channel task board)
- `message_flags` (moderation signals)
- `messages.thread_parent_id` (threaded replies)

Also make sure Supabase Auth providers include:
- Email/Password
- Google OAuth

Callback URL:
- `/auth/callback`

## LiveKit setup

`/api/livekit/token` issues room tokens server-side.  
Room names are derived from server/channel IDs.

## PWA

Orbit ships with:
- `app/manifest.ts`
- `public/sw.js`
- runtime registration via `OrbitPwaRegister`

Users can install Orbit from supported browsers (desktop + mobile).

## Deployment (Vercel)

### Manual
1. Create a Vercel project and connect this repo.
2. Add all required environment variables in Vercel Project Settings.
3. Deploy:

```bash
npm run lint
npm run build
vercel --prod
```

### Scripted
Use the included deployment helper:

```bash
./scripts/deploy-vercel.sh
```

This runs lint/build before `vercel --prod`.
