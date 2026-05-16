-- ============================================================
-- APC — Supabase Schema Migration v1
-- Paste the entire contents of this file into:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  is_pro        boolean not null default false,
  business_name text,
  abn           text,
  profile_pic   text,
  location      text,
  about         text,
  created_at    timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, is_pro, business_name, abn)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    coalesce((new.raw_user_meta_data->>'is_pro')::boolean, false),
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'abn'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
create policy "Anyone can read any profile"      on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);


-- ── 2. LISTINGS ──────────────────────────────────────────────
create table if not exists listings (
  id                uuid        primary key default gen_random_uuid(),
  seller_id         uuid        not null references auth.users on delete cascade,
  title             text        not null,
  category          text,
  price             numeric(10,2),
  condition         text,
  description       text,
  location          text,
  postcode          text,
  pickup            boolean     default false,
  postage           boolean     default false,
  open_to_offers    boolean     default false,
  status            text        not null default 'active',
  is_pro            boolean     default false,
  stock_number      text,
  odometer          numeric,
  warehouse_bin     text,
  quantity          integer     default 1,
  apc_id            text,
  fitting_available boolean     default false,
  fits_year         text,
  seller_name       text,
  saves_count       integer     not null default 0,
  sold_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table listings enable row level security;
create policy "Anyone can read active listings"      on listings for select  using (status = 'active' or auth.uid() = seller_id);
create policy "Sellers can insert their own listings" on listings for insert  with check (auth.uid() = seller_id);
create policy "Sellers can update their own listings" on listings for update  using (auth.uid() = seller_id);
create policy "Sellers can delete their own listings" on listings for delete  using (auth.uid() = seller_id);


-- ── 3. LISTING IMAGES ────────────────────────────────────────
create table if not exists listing_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings on delete cascade,
  storage_path text not null,
  position     integer not null default 0
);

alter table listing_images enable row level security;
create policy "Anyone can read listing images"    on listing_images for select using (true);
create policy "Sellers can manage listing images" on listing_images for all   using (
  auth.uid() = (select seller_id from listings where id = listing_id)
);


-- ── 4. LISTING VEHICLES ──────────────────────────────────────
create table if not exists listing_vehicles (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  make       text,
  model      text
);

alter table listing_vehicles enable row level security;
create policy "Anyone can read listing vehicles"    on listing_vehicles for select using (true);
create policy "Sellers can manage listing vehicles" on listing_vehicles for all   using (
  auth.uid() = (select seller_id from listings where id = listing_id)
);


-- ── 5. CONVERSATIONS ─────────────────────────────────────────
create table if not exists conversations (
  id              uuid        primary key default gen_random_uuid(),
  listing_id      uuid        references listings on delete set null,
  buyer_id        uuid        not null references auth.users on delete cascade,
  seller_id       uuid        not null references auth.users on delete cascade,
  buyer_name      text,
  seller_name     text,
  listing_title   text,
  last_message    text,
  last_message_at timestamptz,
  unread_buyer    boolean     not null default false,
  unread_seller   boolean     not null default true,
  created_at      timestamptz not null default now()
);

alter table conversations enable row level security;
create policy "Participants can read their conversations" on conversations
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers can start conversations" on conversations
  for insert with check (auth.uid() = buyer_id);
create policy "Participants can update conversations" on conversations
  for update using (auth.uid() = buyer_id or auth.uid() = seller_id);


-- ── 6. MESSAGES ──────────────────────────────────────────────
create table if not exists messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references conversations on delete cascade,
  sender_id       uuid        not null references auth.users on delete cascade,
  sender_name     text,
  text            text,
  offer_data      jsonb,
  photo_url       text,
  created_at      timestamptz not null default now()
);

alter table messages enable row level security;
create policy "Participants can read messages" on messages
  for select using (
    auth.uid() in (
      select buyer_id  from conversations where id = conversation_id
      union
      select seller_id from conversations where id = conversation_id
    )
  );
create policy "Participants can insert messages" on messages
  for insert with check (
    auth.uid() = sender_id and
    auth.uid() in (
      select buyer_id  from conversations where id = conversation_id
      union
      select seller_id from conversations where id = conversation_id
    )
  );


-- ── 7. REALTIME ──────────────────────────────────────────────
-- Enables push notifications to the inbox when a new message arrives
alter publication supabase_realtime add table messages;


-- ── 8. SPONSORED CARDS ───────────────────────────────────────
create table if not exists sponsored_cards (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  template      text not null check (template in ('supplier','product','partner')),
  business_name text,
  tagline       text,
  blurb         text,
  tags          text[],
  logo_data     text,
  image_data    text,
  price         text,
  button_label  text,
  button_url    text,
  active        boolean not null default false,
  priority      int not null default 0,
  created_at    timestamptz not null default now()
);

alter table sponsored_cards enable row level security;

-- Anyone (including signed-out) can read active cards for the right panel
create policy "Public read active sponsored cards" on sponsored_cards
  for select using (active = true);

-- Pro users can read their own card regardless of active status
create policy "Users read own sponsored card" on sponsored_cards
  for select using (auth.uid() = user_id);

-- Authenticated users can submit a card (active defaults to false — needs approval)
create policy "Users insert sponsored card" on sponsored_cards
  for insert with check (auth.uid() = user_id);

-- Users can update their own card
create policy "Users update own sponsored card" on sponsored_cards
  for update using (auth.uid() = user_id);

-- Users can delete their own card
create policy "Users delete own sponsored card" on sponsored_cards
  for delete using (auth.uid() = user_id);


-- ============================================================
-- DONE. After running this SQL:
--
-- 1. Go to Storage → New bucket
--    Name: listing-images
--    Public: YES (toggle on)
--    Click Save
--
-- 2. Test by signing up a new account in the app — a profile
--    row should appear in the profiles table automatically.
--
-- 3. To activate a sponsored card a user has submitted:
--    Table Editor → sponsored_cards → find the row → set active = true
--    Optionally set priority (higher = shown first).
-- ============================================================
