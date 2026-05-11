-- ============================================================
-- APC — Supabase Schema Migration v2
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. VEHICLES ──────────────────────────────────────────────
create table if not exists vehicles (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users on delete cascade,
  make        text,
  model       text,
  year        text,
  variant     text,
  nickname    text,
  vin         text,
  created_at  timestamptz not null default now()
);

alter table vehicles enable row level security;
create policy "Users can read their own vehicles"   on vehicles for select using (auth.uid() = user_id);
create policy "Users can insert their own vehicles" on vehicles for insert with check (auth.uid() = user_id);
create policy "Users can update their own vehicles" on vehicles for update using (auth.uid() = user_id);
create policy "Users can delete their own vehicles" on vehicles for delete using (auth.uid() = user_id);


-- ── 2. WANTED PARTS ──────────────────────────────────────────
create table if not exists wanted_parts (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users on delete cascade,
  part_name            text        not null default '',
  make                 text,
  model                text,
  year                 text,
  max_price            numeric(10,2),
  category             text,
  muted_notifications  boolean     not null default false,
  created_at           timestamptz not null default now()
);

alter table wanted_parts enable row level security;
create policy "Users can read their own wanted parts"   on wanted_parts for select using (auth.uid() = user_id);
create policy "Users can insert their own wanted parts" on wanted_parts for insert with check (auth.uid() = user_id);
create policy "Users can update their own wanted parts" on wanted_parts for update using (auth.uid() = user_id);
create policy "Users can delete their own wanted parts" on wanted_parts for delete using (auth.uid() = user_id);


-- ── 3. SAVED LISTINGS ────────────────────────────────────────
create table if not exists saved_listings (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users on delete cascade,
  listing_id  uuid        not null references listings on delete cascade,
  created_at  timestamptz not null default now(),
  constraint saved_listings_user_listing_unique unique (user_id, listing_id)
);

alter table saved_listings enable row level security;
create policy "Users can read their own saved listings"   on saved_listings for select using (auth.uid() = user_id);
create policy "Users can insert their own saved listings" on saved_listings for insert with check (auth.uid() = user_id);
create policy "Users can delete their own saved listings" on saved_listings for delete using (auth.uid() = user_id);


-- ============================================================
-- DONE.
-- If the tables already exist but were created with different
-- column names, you may need to run ALTER TABLE commands to
-- add the missing columns — or drop and recreate the tables.
-- ============================================================
