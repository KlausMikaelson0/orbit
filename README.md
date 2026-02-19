# Orbit Chat (Discord Clone Foundation)

Full-stack Discord-style foundation built with:

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui primitives
- Supabase (Auth + Postgres + Realtime + Storage)
- Zustand for global UI state
- Framer Motion + Lucide icons

## What is included

### Core Layout

- Professional multi-sidebar shell:
  - Servers sidebar
  - Channels sidebar
  - Main chat panel
  - Members sidebar
- Responsive behavior:
  - Desktop: full multi-column layout
  - Mobile/tablet: dialog-based slide-in side panels

### Data & Realtime Model

`types.ts` includes strongly typed interfaces for:

- `profiles`
- `servers`
- `channels`
- `messages`
- `members`

`supabase/schema.sql` includes:

- Enum types (`channel_type`, `member_role`, `profile_status`)
- Full table schema with relations, indexes, and constraints
- RLS policies for read/write permissions
- Triggers for `updated_at` and auth profile bootstrapping
- Storage bucket + policies for message attachments
- Publication setup for Supabase Realtime

### Auth

- Supabase email/password auth
- Google OAuth
- OAuth callback handler (`app/auth/callback/route.ts`)
- Middleware-based session refresh (`middleware.ts`)

### UI Components

shadcn-style primitives initialized and used:

- Dialog
- Tooltip
- ScrollArea
- Avatar
- Separator

### Feature Components

- Server creation modal (`components/modals/server-setup-modal.tsx`)
- Server sidebar with Supabase data fetching + realtime updates
- Channel/member sidebars with live updates
- Chat header and chat input components
- Message rendering with:
  - Markdown (`react-markdown`, `remark-gfm`)
  - File attachment previews
  - Image previews

## Local setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Apply Supabase schema

- Open Supabase SQL editor
- Run `supabase/schema.sql`

4. Start the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Suggested Supabase Auth settings

- Enable Email provider
- Enable Google provider
- Set Site URL to your app URL (for OAuth redirects)
- Add `/auth/callback` as an allowed redirect path
