create table if not exists profiles (
  user_id text primary key,
  username text not null unique,
  display_name text not null,
  avatar_id text not null default 's1',
  is_guest boolean not null default false,
  looking boolean not null default false,
  last_seen timestamptz not null default now(),
  wins integer not null default 0,
  games_played integer not null default 0,
  total_points integer not null default 0,
  best_score integer not null default 0,
  stops integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists friend_requests (
  id text primary key,
  from_id text not null,
  to_id text not null,
  status text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists friend_requests_pair_idx on friend_requests (from_id, to_id);
create index if not exists friend_requests_to_idx on friend_requests (to_id, status);

create table if not exists rooms (
  code text primary key,
  host_id text not null,
  mode text not null,
  max_players integer not null,
  categories jsonb not null,
  letters jsonb not null,
  used_letters jsonb not null default '[]',
  round_seconds integer not null,
  total_rounds integer not null,
  duplicate_points integer not null default 5,
  status text not null default 'lobby',
  current_round integer not null default 0,
  current_letter text,
  round_started_at timestamptz,
  round_ends_at timestamptz,
  stop_by text,
  stop_kind text,
  created_at timestamptz not null default now()
);
create index if not exists rooms_status_idx on rooms (status);

create table if not exists room_players (
  room_code text not null,
  user_id text not null,
  is_host boolean not null default false,
  is_bot boolean not null default false,
  connected boolean not null default true,
  last_seen timestamptz not null default now(),
  score integer not null default 0,
  stops integer not null default 0,
  correct integer not null default 0,
  invalid integer not null default 0,
  best_round integer not null default 0,
  rounds_won integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

create table if not exists round_answers (
  room_code text not null,
  round integer not null,
  user_id text not null,
  answers jsonb not null default '{}',
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room_code, round, user_id)
);

create table if not exists round_results (
  room_code text not null,
  round integer not null,
  letter text not null,
  stop_by text,
  stop_kind text,
  items jsonb not null,
  scores jsonb not null,
  created_at timestamptz not null default now(),
  primary key (room_code, round)
);

create table if not exists answer_votes (
  room_code text not null,
  round integer not null,
  category_id text not null,
  answer_user_id text not null,
  voter_id text not null,
  accept boolean not null,
  primary key (room_code, round, category_id, answer_user_id, voter_id)
);

create table if not exists match_history (
  id text primary key,
  room_code text not null,
  played_at timestamptz not null default now(),
  winner_id text,
  total_rounds integer not null,
  players jsonb not null,
  rounds jsonb not null
);
create index if not exists match_history_played_idx on match_history (played_at desc);

create table if not exists history_players (
  history_id text not null,
  user_id text not null,
  primary key (history_id, user_id)
);

create table if not exists room_invites (
  id text primary key,
  room_code text not null,
  from_id text not null,
  to_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists room_invites_to_idx on room_invites (to_id, status);
