-- APC Pre-launch DB index migrations
-- Run in Supabase SQL Editor: https://app.supabase.com → your project → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE INDEX CONCURRENTLY)

-- ── error_logs table (required for window.onerror monitoring) ──────────────
CREATE TABLE IF NOT EXISTS error_logs (
    id          bigserial PRIMARY KEY,
    created_at  timestamptz DEFAULT now(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    message     text,
    source      text,
    line_number int,
    col_number  int,
    stack       text,
    user_agent  text,
    page_url    text
);
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
-- Only allow inserts from authenticated or anonymous (anon key); no reads from frontend
CREATE POLICY "insert only" ON error_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── listings ──────────────────────────────────────────────────────────────
-- Seller dashboard + realtime + search filters
CREATE INDEX IF NOT EXISTS idx_listings_seller_status
    ON listings (seller_id, status);

CREATE INDEX IF NOT EXISTS idx_listings_status_created
    ON listings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_category_status
    ON listings (category, status);

-- ── listing_vehicles ──────────────────────────────────────────────────────
-- Vehicle-fit filter queries (most common search pattern)
CREATE INDEX IF NOT EXISTS idx_lv_make_model
    ON listing_vehicles (make, model);

CREATE INDEX IF NOT EXISTS idx_lv_listing_id
    ON listing_vehicles (listing_id);

-- ── listing_images ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_li_listing_position
    ON listing_images (listing_id, position);

-- ── conversations ─────────────────────────────────────────────────────────
-- Inbox load + realtime fan-out
CREATE INDEX IF NOT EXISTS idx_conv_buyer
    ON conversations (buyer_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_seller
    ON conversations (seller_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_listing
    ON conversations (listing_id);

-- ── messages ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_msg_conv_created
    ON messages (conversation_id, created_at ASC);

-- ── notifications ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notif_user
    ON notifications (user_id, created_at DESC);

-- ── saved_listings ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_saved_user
    ON saved_listings (user_id);

-- ── seller_ratings ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ratings_seller
    ON seller_ratings (seller_id);

-- ── wanted_parts ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wanted_user_created
    ON wanted_parts (user_id, created_at DESC);

-- ── dismantling_jobs ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_djobs_user_status
    ON dismantling_jobs (user_id, status);
