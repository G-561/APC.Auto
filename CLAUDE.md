# APC — Claude Code Instructions

Auto Parts Connection (APC): a mobile-first, three-sided Australian marketplace for auto parts, workshops, and wreckers. Sole developer: Gary. Production at autopartsconnection.com.au (GitHub Pages).

---

## Tech stack

- **Frontend**: Vanilla JS (ES2020), single-page app — one `index.html`, one `script.js`, one `style.css`
- **Data**: Supabase (PostgreSQL) — JS client via CDN, anon key in `script.js` (intentional — public by design)
- **Auth**: Supabase Auth (magic link + email/password). Custom SMTP via Resend → noreply@autopartsconnection.com.au
- **Storage**: Supabase Storage for listing images and user avatars/banners
- **Hosting**: GitHub Pages, custom domain autopartsconnection.com.au with HTTPS enforced
- **Vehicle data**: `vehicles.js` — `VEHICLE_DB`, `VEHICLE_YEAR_RANGES`, `buildSeriesOptions()` etc.
- **No build step, no bundler, no framework** — just files. Keep it that way unless Gary explicitly asks to change.

---

## Database schema (key tables)

| Table | Notes |
|---|---|
| `profiles` | `id` (UUID, FK auth.users), `display_name`, `avatar_url`, `banner_url`, `is_pro`, `bio`, `location` |
| `listings` | `id` (bigint), `seller_id` (UUID), `title`, `price`, `category`, `condition`, `status`, `fits_year`, `fitting_available`, `trade_only`, `open_to_offers`, `odometer`, `chassis_vin`, `stock_number`, `warehouse_bin`, `apc_id` |
| `listing_images` | `listing_id` (bigint FK), `storage_path`, `position` |
| `listing_vehicles` | `listing_id` (bigint FK), `make`, `model`, `series` (text, nullable) |
| `conversations` | `id`, `listing_id` (nullable — null = general enquiry), `buyer_id`, `seller_id`, `unread_buyer`, `unread_seller` |
| `messages` | `id`, `conversation_id`, `sender_id`, `body`, `created_at` |
| `wanted_requests` | buyer posts a wanted ad — make/model/part they need |
| `offers` | buyer makes offer on a listing |
| `vehicles` | user's garage — their own cars |
| `notifications` | unread alerts for buyers |

`listings.id` is **bigint** (not UUID) — never add FK constraints referencing it from other tables without checking Supabase allows bigint FK.

---

## User tiers

- `standard` — default free tier
- `pro` — unlocks: fitting available toggle, stock number, odometer, warehouse bin, chassis VIN, storefront, "More from seller" section, EDW (future)

Check via `currentUserTier === 'pro'` in JS. `profiles.is_pro` in DB. Boolean for now — future roadmap has multiple pro tiers (workshop vs wrecker).

---

## Design system

### Colours
- **Primary action**: `#f07020` (APC orange) — buttons, CTAs, highlights, badges
- **Orange hover/active**: `#d95f10`
- **Background**: `#f4f4f4` (app), `#ffffff` (cards), `#1a1a2e` (dark overlays)
- **Text primary**: `#333`
- **Text secondary**: `#666`, `#888`, `#aaa`
- **Success**: `#22c55e` | **Warning**: `#f59e0b` | **Error**: `#ef4444`
- **Border**: `#eee`, `#ddd`

### Typography
- System font stack — no custom fonts loaded
- Card titles: 11px bold | Prices: 14px bold | Detail title: 17px 800 weight
- Uppercase + letter-spacing for badge/pill labels (PENDING, TRADE, etc.)

### Spacing & radius
- Cards: no border-radius (grid butts edge to edge)
- Drawers / overlays: 16px radius top corners
- Buttons: 8px radius
- Standard padding unit: 15px horizontal, 20px vertical section gap

### Component patterns (approved — do not redesign without reason)
- **Drawer cards**: `position: fixed`, full-column, 16px top radius, box shadow, 20px header gap. **Never `display: flex` on ID selectors** — use class selectors only.
- **Grid**: CSS grid, 2-column on mobile, fills viewport width
- **Item cards**: white bg, `overflow: hidden`, `position: relative`, no border/radius, image `aspect-ratio: 4/3`
- **Pending banner**: amber strip top of card, absolute positioned
- **Orange CTA buttons**: full-width, 16px padding, `box-shadow: 0 4px 12px rgba(255,152,0,0.2)`
- **Toast notifications**: bottom-centre, auto-dismiss
- **Saved dot / heart**: orange, absolute top-right of card

### Mobile-first rules
- Design for 390px viewport first
- Touch targets minimum 44px
- No hover-only interactions (all interactions must work on tap)
- Test on real device via GitHub Pages (Gary has no localhost access on phone)

---

## Code style

- **No TypeScript** — plain JS only
- **No framework** — no React, Vue, etc.
- **No comments explaining WHAT** — only add a comment when WHY is non-obvious
- **No multi-paragraph docstrings**
- `safeText(el, value)` for setting text content safely — use this, not `el.textContent =` directly, for consistency
- `escapeHtml(str)` — use whenever user-supplied strings go into an innerHTML template
- Prefer `const` / `let`, arrow functions, template literals
- IDs in HTML match camelCase JS references (e.g. `detailTitle`, `sellMake`)
- Supabase queries: always use `.select()` with explicit columns — never `select('*')` on sensitive tables in production paths

---

## Security rules (non-negotiable)

### XSS prevention
- **Never** put user-supplied strings into `innerHTML` without `escapeHtml()`
- User-supplied = anything from: Supabase rows, URL params, localStorage, form inputs
- Safe fields (numeric IDs, hardcoded enums like status) don't need escaping
- `safeText()` is always safe — prefer it for plain text nodes
- When building card/overlay HTML with template literals, escape: `title`, `description`, `seller name`, `location`, `message body`, `display_name`, `bio`

### Authentication checks
- Seller-only actions (edit, delete, mark sold): always verify `part.sellerId === currentUserId` before rendering controls
- Never trust client-side role — re-check `currentUserTier` is fetched from Supabase profile, not localStorage alone
- Self-message guard: always block `buyerId === sellerId` before creating conversations

### Supabase / RLS
- All sensitive tables must have RLS enabled
- `conversations` and `messages`: users should only read rows where they are buyer or seller
- `listings`: anyone can read active listings; only seller can insert/update/delete their own
- `profiles`: anyone can read public fields; only owner can update
- `listing_vehicles`, `listing_images`: readable by anyone; writable only by listing owner (via listing FK)
- Never select sensitive columns (email, phone) in public-facing queries

### URL parameters
- `?store=`, `?listing=`, `?ref=` etc. — always sanitise before use
- Never put raw URL param values into innerHTML

### Secrets
- Supabase anon key in `script.js` is intentional and safe (RLS is the security layer)
- **Never** put the Supabase service role key in any frontend file
- **Never** commit `.env` files

---

## Key patterns & gotchas

- `findPartAnywhere(id)` — canonical lookup across `partDatabase` + `userListings`. Always use this, never scan arrays directly.
- `ensureSupabaseConversation(conv)` — handles both listing convs and general enquiries (`partId === 'general'`). Has self-message guard.
- `syncInboxPendingBtn` — isBuyer guard prevents buyers seeing seller status pills. Logic: `isBuyer = conv.buyerId === currentUserId` → if isBuyer, cannot be seller.
- `buildCardHTML(part, eager)` — card renderer. Part title goes through `escapeHtml()`. No vehicle overlay on card (vehicle fit shown in detail overlay only).
- `detailVehicle` element — shows "Fits: Toyota HiLux N70 · 2005–2015" in orange below postage/pickup row. Hidden for universal parts.
- Cursor pagination: `_listingsCursor`, `_listingsExhausted`, `_listingsLoading` guard concurrent fetches. Load More button.
- `conversations.listing_id` is nullable — null means general storefront enquiry.
- `listing_vehicles.series` stores the variant suffix (e.g. "N70", "MK") — not the full "HiLux N70".

---

## Workflow

- Gary tests exclusively via GitHub Pages on his phone — **always push after changes**
- No localhost testing on mobile — changes must be live to test
- Commit messages: concise, describe WHY not WHAT, include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- One commit per logical change — don't bundle unrelated fixes
- `main` branch → direct to production (no staging)

---

## What NOT to do

- Do not add a build step, bundler, or package.json
- Do not introduce React, Vue, or any JS framework
- Do not add TypeScript
- Do not redesign approved component patterns without Gary confirming
- Do not use `display: flex` on ID selectors in CSS (use class selectors)
- Do not create documentation .md files unless Gary asks
- Do not add error handling for impossible scenarios
- Do not add backwards-compatibility shims
- Do not over-engineer: three similar lines is better than a premature abstraction
