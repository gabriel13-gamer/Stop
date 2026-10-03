create extension if not exists pgcrypto;
create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check(length(username) between 3 and 20),
 display_name text not null default '',
 avatar_url text,
 level int not null default 1,
 wins int not null default 0,
 games_played int not null default 0,
 total_points int not null default 0,
 best_score int not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.rooms(
 id uuid primary key default gen_random_uuid(),
 code text unique not null,
 host_id uuid not null references public.profiles(id) on delete cascade,
 visibility text not null default 'privado',
 max_players int not null default 8 check(max_players between 2 and 8),
 categories jsonb not null,
 letters jsonb not null,
 round_seconds int not null default 60 check(round_seconds between 15 and 300),
 total_rounds int not null default 5 check(total_rounds between 1 and 20),
 status text not null default 'lobby',
 created_at timestamptz not null default now()
);
create table if not exists public.room_players(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 is_host boolean not null default false,
 joined_at timestamptz not null default now(),
 unique(room_id,user_id)
);
create table if not exists public.rounds(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 round_number int not null,
 letter text not null,
 categories jsonb not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 state text not null default 'playing',
 stop_reason text,
 stopped_by uuid references public.profiles(id),
 unique(room_id,round_number)
);
create table if not exists public.answers(
 id uuid primary key default gen_random_uuid(),
 round_id uuid not null references public.rounds(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 category text not null,
 answer text not null default '',
 validity text not null default 'pending',
 points int not null default 0,
 unique(round_id,user_id,category)
);
create table if not exists public.game_history(
 id uuid primary key default gen_random_uuid(),
 room_id uuid references public.rooms(id) on delete set null,
 room_code text,
 user_id uuid references public.profiles(id) on delete cascade,
 score int not null default 0,
 rounds int not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.friendships(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 friend_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending',
 created_at timestamptz not null default now(),
 unique(user_id,friend_id)
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,username,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'username','player_'||substr(new.id::text,1,6)),coalesce(new.raw_user_meta_data->>'username','Jogador')) on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.rounds enable row level security;
alter table public.answers enable row level security;
alter table public.game_history enable row level security;
alter table public.friendships enable row level security;
create policy if not exists profiles_read on public.profiles for select using(true);
create policy if not exists profiles_self on public.profiles for update using(auth.uid()=id);
create policy if not exists rooms_read on public.rooms for select using(true);
create policy if not exists rooms_insert on public.rooms for insert with check(auth.uid()=host_id);
create policy if not exists rooms_update on public.rooms for update using(auth.uid()=host_id);
create policy if not exists players_read on public.room_players for select using(true);
create policy if not exists players_insert on public.room_players for insert with check(auth.uid()=user_id);
create policy if not exists players_delete on public.room_players for delete using(auth.uid()=user_id or exists(select 1 from public.rooms r where r.id=room_id and r.host_id=auth.uid()));
create policy if not exists rounds_read on public.rounds for select using(exists(select 1 from public.room_players p where p.room_id=rounds.room_id and p.user_id=auth.uid()));
create policy if not exists answers_read on public.answers for select using(exists(select 1 from public.room_players p join public.rounds r on r.room_id=p.room_id where r.id=answers.round_id and p.user_id=auth.uid()));
create policy if not exists answers_insert on public.answers for insert with check(auth.uid()=user_id);
create policy if not exists answers_update on public.answers for update using(auth.uid()=user_id);
create policy if not exists history_read on public.game_history for select using(auth.uid()=user_id);
create policy if not exists friends_read on public.friendships for select using(auth.uid()=user_id or auth.uid()=friend_id);
create policy if not exists friends_insert on public.friendships for insert with check(auth.uid()=user_id);
create or replace function public.start_game(p_room_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.rooms%rowtype; l text; rid uuid; now_ts timestamptz:=clock_timestamp();
begin
 select * into r from public.rooms where id=p_room_id for update;
 if r.host_id<>auth.uid() then raise exception 'Só o host pode começar'; end if;
 if (select count(*) from public.room_players where room_id=p_room_id)<2 then raise exception 'É preciso pelo menos 2 jogadores'; end if;
 l:=upper(r.letters->>((floor(random()*jsonb_array_length(r.letters)))::int));
 insert into public.rounds(room_id,round_number,letter,categories,starts_at,ends_at) values(p_room_id,1,l,r.categories,now_ts,now_ts+make_interval(secs=>r.round_seconds)) returning id into rid;
 update public.rooms set status='playing' where id=p_room_id;
 return jsonb_build_object('round_id',rid,'letter',l);
end $$;
create or replace function public.stop_round(p_round_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
 update public.rounds set state='verifying',stop_reason=p_reason,stopped_by=case when p_reason='manual' then auth.uid() else null end where id=p_round_id and state='playing' and (ends_at>=clock_timestamp() or p_reason='timeout');
end $$;
create or replace function public.finalize_round(p_round_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare r public.rounds%rowtype; a public.answers%rowtype; ok boolean;
begin
 select * into r from public.rounds where id=p_round_id for update;
 for a in select * from public.answers where round_id=p_round_id loop
  ok=length(trim(a.answer))>0 and upper(left(trim(a.answer),1))=upper(r.letter);
  update public.answers set validity=case when ok then 'valid' else 'invalid' end,points=case when ok then 10 else 0 end where id=a.id;
 end loop;
 update public.answers a set points=5 where a.round_id=p_round_id and a.validity='valid' and exists(select 1 from public.answers b where b.round_id=a.round_id and b.category=a.category and lower(trim(b.answer))=lower(trim(a.answer)) and b.id<>a.id);
 update public.rounds set state='finished' where id=p_round_id;
end $$;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.answers;
