-- Analytics events and rollups

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.bot_teams(id) on delete cascade,
  bot_id uuid references public.bot_bots(id) on delete set null,
  conversation_id uuid references public.bot_conversations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists analytics_events_team_time_idx
  on public.analytics_events (team_id, occurred_at desc);

create index if not exists analytics_events_bot_time_idx
  on public.analytics_events (bot_id, occurred_at desc);

create index if not exists analytics_events_type_time_idx
  on public.analytics_events (event_type, occurred_at desc);

create table if not exists public.analytics_daily_rollups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.bot_teams(id) on delete cascade,
  bot_id uuid references public.bot_bots(id) on delete set null,
  rollup_date date not null,
  messages_user integer not null default 0,
  messages_bot integer not null default 0,
  conversations_started integer not null default 0,
  active_users integer not null default 0,
  unique_conversations integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_daily_rollups_unique_idx
  on public.analytics_daily_rollups (team_id, bot_id, rollup_date);
