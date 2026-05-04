# APC Mobile — Session Notes for Claude

If you're a fresh Claude session reading this: **read this file first**, then ask Gary what he wants to work on next.

---

## What this project is

`APC.mobile.github` — mobile-first (now responsive) marketplace web app for **Auto Parts Connection (APC)**. Plain HTML/CSS/JS, no framework. Three core files at the project root:

- `index.html` — all markup. Drawers in DOM order (later = renders on top at equal z-index):
  `filterDrawer` → `authDrawer` → `sellOverlay` → `settingsDrawer` → `profileDrawer` → `myPartsDrawer` → `workshopDrawer` → `garageDrawer` → `addVehicleDrawer` → `vehicleDetailDrawer` → `addWantedDrawer` → `recentlyViewedDrawer` → `inboxDrawer` → `messageDetailDrawer` → `savedPartsDrawer` → `detailOverlay` → `storefrontDrawer` → `chatDrawer` → `accountMenuDrawer`
- `style.css` — all styles. CSS variables at top (`--apc-orange: #F7941D`, `--apc-blue: #007AFF`, etc.). **Never introduce a new colour without checking these first.**
- `script.js` — all state, render functions, drawer logic, auth, CRUD. ~3000+ lines.

Other files/folders:
- `manifest.json` + `sw.js` — PWA setup.
- `images/` — 35+ part photos, `apc_icon_512_centered.png` (PWA icon), `croppedmotorclub.png` (motoring club logos banner).
- `mockups/`, `snapshots/`, `300426.claude/` — workspace clutter, **not tracked in git**.

---

## Design decisions — do not second-guess these

- **Pill colour:** orange = signed-out; after sign-in, pill shows username + "Pro" label in blue for Pro users. No tier pill when signed in.
- **"APC Standard"** is the deliberate label for free members (used in profile badge, not pill).
- **Heart save on detail page only** — never on result cards. Cards are the hook; saving happens at commitment point (detail).
- **Bottom nav: 5 text-only items** — Home | Garage | Sell | Recent | Inbox. Sell is centred orange tile. No emoji icons. Hidden on desktop (≥900px).
- **FILTER is a text button** in the search bar on mobile — hidden on desktop (filter sidebar always visible).
- **`fits: []` = universal** in `partDatabase`. No separate `universal: true` flag.
- **Drawer pattern everywhere** — no router. All screens are drawers using `toggleDrawer(id, allowStack)`.
- **Stacked drawers** use `allowStack: true` to open on top. × buttons on stacked drawers use **dedicated close functions** (`closeAddVehicleDrawer()` etc.) — never bare `toggleDrawer()`.
- **`getAllParts()`** = `[...partDatabase, ...userListings]` filtered to exclude `status: 'sold'/'removed'`. Always use this, never `partDatabase` directly.
- **`findPartAnywhere(id)`** — searches full array including sold/removed parts (used for stale saved card rendering).
- **Pro Search defaults ON** when a user upgrades.
- **Saves metric** (♥ X saves on My Listings) is **Pro-only**.
- **Sort by Date defaults to "Newest first"** — no "Default" option. Price sort has no default; tap to activate, tap again to deselect.
- **Postcode + radius are mutually exclusive with state filter** — typing a postcode disables state dropdown; selecting a state clears postcode and locks radius chips.
- **`#accountMenuDrawer` z-index: 1999** — all other drawers at 2000 so sub-drawers stack on top of account menu.
- **Sub-drawers from account menu** use `allowStack: true` so closing them returns to account menu.
- **Workshops drawer = pure browse** — profile management is in Settings (account menu), not in the workshops drawer.
- **`border-radius: 10px`** on `.account-pill` globally — matches site aesthetic, not 999px.

---

## Desktop layout (≥900px) — Sessions 6–8

Three-column layout:

- **Top utility bar** (`#desktopTopBar`, 36px, fixed): all links right-aligned — Dashboard (Pro only, `display:flex/none`) | + Sell a Part | Messages (with `#inboxBadgeTopBar`) | Workshops.
- **Left sidebar** = `#filterDrawer` always visible (240px wide, `display: flex !important`). Drawer header hidden. Apply button hidden (`#filterDrawer .action-container { display: none }`). All filter inputs have `oninput/onchange="applyFiltersAndRender()"` — live filtering, no Apply needed.
- **Clear All Filters** button — `.filter-clear-row` inside `drawer-content` (not drawer-header). `clearAllFilters()` resets DOM + globals + re-renders.
- **Header** (single row below top bar): three-zone layout — `.logo-main` (order:1, 240px) | `.search-col` (order:2, flex:1) | `#accountPillZone` (order:3, 220px). Achieved via `display: contents` on `.header-top`. Logo fills zone: `width: 100%; height: auto; max-height: 64px`. `#accountPillZone` is a wrapper div — the `#accountPill` button inside is content-width (auto), not 220px wide.
- **`scrollbar-gutter: stable`** on `html` inside desktop media query — prevents layout shift when scrollbar appears/disappears.
- **Main grid**: 5 columns, card hover effect — glass overlay slides away, orange "VIEW PART →" slides up.
- **Right sidebar** (`#desktopRightPanel`, 220px fixed): Featured Workshop + Sponsored Spares.
- **Centre-column drawers** — Garage, vehicleDetail, addVehicle, addWanted, savedParts, settings, profile, myParts, workshop, recentlyViewed, inbox, messageDetail, chat all use: `left: calc(max(0px, 50vw - 700px) + 240px) !important; right: calc(max(0px, 50vw - 700px) + 220px) !important; width: auto !important; height: auto !important; top: [dynamic]; bottom: 0;`
- **`#dashboardView`** z-index: 1090 (header is 1100, top bar is 1150) — header always clickable when dashboard open. `closeDashboard()` called from logo click, search focus, and top bar navigation.
- **Account pill (desktop)** — signed-in: white card, `border: 1.5px solid #e8e8e8`, `border-radius: 10px`, `.pill-avatar` circle (26px, orange=standard, blue=pro). Signed-out: compact orange button. Desktop dropdown (`#accountDropdown`, z-index 2001) replaces mobile drawer on ≥900px. Click-outside closes it.
- **`updateHeaderOffset()`** accounts for top bar + header height, sets `style.top` on all centre-column drawers.
- **`setDtbActive(id)`** — manages orange active state on top bar links. `null` clears all.

---

## Key code locations (post-Session 8)

`script.js` ~3000 lines. Key sections top-to-bottom:

- **Global state:** `userIsSignedIn`, `currentUserName`, `currentUserTier`, `proSearchOn`, `currentSearchMode`, `activeFilters`, `sortOrder`, `sortDate`, `savedPartsTab`, `workshopRadiusKm`.
- **`partDatabase`:** 8 parts with `fits`, `saves`, `date` fields. Parts id 5 and 10 have `status: 'sold'` for stale saved demo.
- **`publicWantedDatabase`:** 8 mock buyer wanted listings.
- **`workshopDatabase`:** 7 mock workshops — 4 in Adelaide inner suburbs (3–8km), plus Hills Auto Trimmers (24km), Southern Auto Electrics & Air (38km), Barossa Mechanical & Cooling (62km). Workshops 1 & 2 have `approvedClub: 'RAA'`.
- **Stale saved parts:** `findPartAnywhere(id)` retrieves sold parts. `renderSavedParts()` splits active/stale, renders tabs (All | Active | Ended). `.stale-row` UI with SOLD badge + SEE SIMILAR / ADD TO WANTED / DISMISS actions.
- **Workshop browse:** `renderWorkshopBrowseView()` — distance filter (`workshopRadiusKm`), approved filter, text search, 7 service checkboxes. `getApprovedClubInfo()` reads `#filterStateSelect` → returns state-specific club (RAA/NRMA/RACV/RACQ/RAC/RACT/AANT). `setWorkshopRadius(el, km)` — sets active chip, re-renders. `buildSponsoredWorkshopCardHTML()` shows `card-approved-badge` for approved workshops.
- **`clearAllFilters()`:** resets all filter DOM + globals + re-renders.
- **`onAccountPillClick()`:** desktop → dropdown toggle, mobile → drawer.
- **`renderAccountState()`:** syncs pill, drawer, dropdown. Sets `dtbDashboard.style.display = isPro ? 'flex' : 'none'`.
- **`closeDashboard()`:** early-return guard if already hidden. Clears `setDtbActive(null)`. Restores sidebar/right panel.
- **`updateInboxBadge()`:** 3 badge targets — `#inboxBadge` (mobile nav), `#inboxBadgeDesktop` (sidebar), `#inboxBadgeTopBar` (top bar).
- **Sort / Location / Sell / Garage / Wanted / Saved / Inbox / Profile / Auth** — see Sessions 5–7 notes, largely unchanged in Session 8.

---

## Workshop distance filter — RAA tie-in

Distance chips: **10km | 20km | 50km | State-wide** — deliberately matching RAA towing distances by membership tier. When the Motoring Club Approved filter is combined with a distance chip, users can find accredited workshops within their towing range. At go-live, `workshop.distance` will be replaced by real geocoded distance (postcode → lat/lng → `ST_DWithin`).

---

## Motoring Club Approved Repairer

- `approvedClub: 'RAA'` field on workshop entries.
- Filter badge and label update dynamically based on `#filterStateSelect`: SA→RAA, VIC→RACV, NSW/ACT→NRMA, QLD→RACQ, WA→RAC, TAS→RACT, NT→AANT. No state → "Motoring Club Approved Repairer".
- Logos banner: `images/croppedmotorclub.png` — `mix-blend-mode: multiply` blends white background into the blue filter box. `height: auto; max-height: 50px`.
- **Not yet pitched to clubs** — placeholder for future official accreditation program.

---

## localStorage keys

| Key | Contents |
|-----|----------|
| `apc.vehicles.v1` | `myVehicles` array |
| `apc.saved.v1` | `savedParts` Set (as array) |
| `apc.wanted.v1` | `myWanted` array |
| `apc.inbox.v1` | inbox items array |
| `apc.listings.v1` | `userListings` array |
| `apc.workshopProfile.v1` | workshop profile object |
| `apc.settings.v1` | `userSettings` object |
| `apc.recentlyViewed.v1` | `recentlyViewed` array (max 8 part IDs) |
| `apc.rememberMe.v1` | remembered email string |

**Full wipe for testing:**
```js
['apc.vehicles.v1','apc.saved.v1','apc.wanted.v1','apc.inbox.v1',
 'apc.listings.v1','apc.workshopProfile.v1','apc.settings.v1',
 'apc.recentlyViewed.v1','apc.rememberMe.v1'].forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## Quirks to know

- **OneDrive sync delay:** Trust the Read tool, not `bash cat`.
- **Git from Windows only:** Claude can't run git from the bash sandbox. All commits/pushes happen from Gary's Git Bash on Windows.
- **Curly/smart quotes:** editing JS can introduce U+2018/2019 causing syntax errors. Run PowerShell check after JS edits:
  ```powershell
  $p = "...\script.js"; $c = Get-Content $p -Raw -Encoding UTF8
  $c = $c -replace [char]0x2018,"'" -replace [char]0x2019,"'"
  Set-Content $p $c -Encoding UTF8 -NoNewline
  ```
- **Heart characters:** save button uses `♡` / `♥` (Unicode dingbats), not `❤️` emoji.
- **Mockup-first:** Gary likes seeing an interactive HTML mockup before committing to a structural UI change.
- **Geocoding:** radius filters (parts + workshops) are UI-only at demo stage. Go-live needs postcode → lat/lng → `ST_DWithin` query.
- **Backend plans:** Supabase is the preferred stack when going live — Postgres, built-in auth, storage, realtime. localStorage is the current stand-in.

---

## Sessions completed

### Session 10 (6 May 2026) — Message centre wired in, item preview panel, workshops mobile fix

- **Message centre — full two-panel inbox:** replaced `inboxDrawer` with two-panel layout. Chats tab (conversation list + thread) + Notifications tab (existing match/alert items). Desktop: 270px conv list + flex thread column. Mobile: full-width slide animation (list → thread).
- **Conversations data:** `conversations` array, `CONVS_KEY = 'apc.conversations.v1'`. 5 seeded mock conversations referencing real partDatabase parts (IDs 1, 2, 9, 12, 13). Each message: `{ id, sent, text, photo, time, clock }`.
- **`openInboxConv(id)`:** marks unread false, populates thread header via `findPartAnywhere`, renders bubbles, slides panels on mobile.
- **`renderInboxMsgs(conv)`:** date dividers, sent (orange right) / received (grey left) bubbles, × delete on hover/tap.
- **`handleMessageSeller()`:** finds or creates conversation for `currentOpenPartId`, opens inbox Chats tab, opens conversation directly.
- **`updateInboxBadge()`:** counts unread convs + notifications. Updates 3 badge targets + tab badges (`#inboxChatsBadge`, `#inboxNotifsBadge`).
- **Item preview panel (`#inboxItemPreview`):** absolutely positioned in `.inbox-thread-col`, slides in from right. Shows photo carousel (main + thumbs), price + condition, title, delivery badges, fitment, description (with fallback), APC ID. Header: "Item Details" left, "Back to chat →" right.
- **Workshops mobile fix:** "Workshops & Services" re-added to mobile account drawer with `amenu-mobile-only` class, hidden on desktop via `@media (min-width: 900px)`.

### Session 9 (5 May 2026) — Sell form polish, APC Item ID, stock number, message centre mockup

- **Sell form — Vehicle Details:** renamed "Vehicle Fitment" → "Vehicle Details" h4.
- **Fitting Available checkbox:** moved into `.shared-choice-box` alongside Pickup/Postage. All 3 on one line, `justify-content: space-between`, `flex: 1` on each. Fitting uses `display: contents` wrapper (Pro only) so it slots inline without breaking flex layout.
- **Stock Number field:** text input below Vehicle Details, `maxlength="20"`, `max-width: 22ch`. Saved to listing payload. Restored in `openEditListing()`, cleared in `resetSellForm()`.
- **`generateApcId()`:** `'APC' + String(Date.now() % 10000000000).padStart(10, '0')` — stamped on new listings only, not edits.
- **APC ID on detail page:** `#detailApcId` div below part title (13px, muted grey). Hidden when `part.apcId` absent (legacy mock parts unaffected).
- **APC ID on My Listings:** `.my-part-apc-id` (12px) + `.my-part-stock-num` (12px) appended below saves count. Both conditional on data existing.
- **Label modal:** `#labelApcId` element populated in `printPartLabel()`. QR code now encodes `part.apcId` as first line (falls back to `'APC-' + part.id` for legacy parts).
- **Pro search — APC ID + stock number:** `getFilteredParts()` extended. APC ID matches any part (globally unique). Stock number matches only the current user's own listings (`userListings.some(l => l.id === part.id)`) — prevents cross-seller stock number collisions.
- **Dashboard My Listings search:** placeholder updated; `filterDashListings()` filter extended to include `stockNumber`.
- **Dashboard My Listings — load more:** `_dashListingsShown = 25` global. Unfiltered list shows 25 at a time with "Load more listings" button. Search/category filter active → shows all results immediately.
- **Dashboard — removed "← Marketplace" button:** header now clean with just title + subtitle.
- **Universal parts — workshop section:** was hidden (`display: none`). Now shows 3 randomly shuffled workshops from `workshopDatabase` with headline "Recommended workshops near you". Vehicle-specific parts unchanged.
- **Message centre mockup:** `mockup-messages.html` — standalone interactive mockup. Two-panel desktop (300px conv list + thread), mobile slide animation. Features: clean email-style conv list (name, part title in orange, preview, timestamp, unread dot — no avatars/thumbnails), thread with date dividers + chat bubbles, photo sharing (camera button → file picker → image bubble), message delete (× on hover desktop / tap mobile), search filter, reply with Enter-to-send.

### Session 8 (4 May 2026) — Desktop nav overhaul, stale saved parts, workshop rebuild

- **Desktop live filters:** all filter inputs have `oninput/onchange="applyFiltersAndRender()"`. Apply button hidden on desktop. Clear All Filters button in `drawer-content` (`.filter-clear-row`), `clearAllFilters()`.
- **Centre-column drawers:** all account sub-drawers (Garage, Settings, Profile, My Listings, Saved Parts, Workshop, Inbox, etc.) open in the centre column on desktop, not the right panel. `updateHeaderOffset()` sets `style.top` dynamically.
- **Three-zone header:** `.logo-main` (240px) | `.search-col` (flex:1) | `#accountPillZone` (220px). Search bar width = grid width. `scrollbar-gutter: stable` prevents layout shift.
- **Logo:** fills 240px zone — `width: 100%; height: auto; max-height: 64px`.
- **`#accountPillZone` wrapper div:** pill button is content-width inside the 220px zone. `border-radius: 10px` globally. Desktop signed-in pill: white card with avatar circle.
- **Account dropdown (desktop):** `#accountDropdown` popover (z-index 2001), click-outside close. Mobile keeps drawer. `onAccountPillClick()` routes by viewport width.
- **Top bar cleanup:** removed Marketplace/Garage/Wanted from top bar. Final order: Dashboard (Pro) | + Sell a Part | Messages | Workshops. `dtbDashboard` fixed from `display: inline` → `display: flex` (was breaking alignment).
- **`#dashboardView` z-index:** 1090 (below header 1100). `closeDashboard()` called from search focus + logo click. Clears active top bar state.
- **Stale saved parts:** `status: 'sold'` on demo parts 5 & 10. `findPartAnywhere()` retrieves them. Tabs: All | Active | Ended. Stale UI: greyed image, SOLD badge, SEE SIMILAR / ADD TO WANTED / DISMISS actions.
- **Workshops drawer = pure browse:** profile management stays in Settings. Drawer title "Workshops & Services" for all users.
- **Workshop search bar:** upgraded from unstyled `.search-bar` to `.search-group` — matches main search aesthetic.
- **New service types:** Auto trimmer, Air conditioning, Radiator & cooling added to browse filters.
- **`#workshopServiceGrid`:** CSS grid, `grid-template-columns: 1fr 1fr` — 7 services in even 2-column layout.
- **Motoring Club Approved Repairer filter:** state-aware club badge (RAA/NRMA/RACV/RACQ/RAC/RACT/AANT). `getApprovedClubInfo()`. Logo banner `images/croppedmotorclub.png` with `mix-blend-mode: multiply`. `card-approved-badge` on workshop cards.
- **Workshop distance filter:** 10km | 20km | 50km | State-wide chips (RAA towing distance tiers). `workshopRadiusKm` global, `setWorkshopRadius()`. Resets to State-wide on open. 3 new demo workshops at 24km, 38km, 62km.

### Session 7 (4 May 2026) — Warehouse/QR, sell form polish, 1400px max-width, wanted list redesign

- Warehouse Management (Pro), QR label modal, Quantity field (Pro), sell overlay desktop treatment, 1400px max-width constraint, compact wanted rows, listFromWanted(), logo → home button.

### Session 6 (3 May 2026) — Desktop layout, filter UX overhaul, workshop polish

- Account menu drawer, account pill redesign, price/date sort, location filter overhaul, share button, workshop browse + profile polish, saved parts drawer, desktop 3-column layout v1.

### Session 5 (2 May 2026) — Profile, Settings, Recently Viewed, Saved Parts, PWA, polish

### Session 4 (2 May 2026) — Workshops/Services, Inbox, Wanted CRUD, Garage delete

### Session 3 (1 May 2026) — Auth remember-me + detail image zoom

### Session 2 (1 May 2026) — Garage phase 1

### Session 1 (30 April 2026) — Header redesign + carousel

---

## What's next

1. **Message centre — polish** — delete entire conversation, unread/read toggle, empty state when no conversations.
2. **Edit vehicle** — tap a garage card to open Add Vehicle drawer pre-populated; save updates by ID.
3. **Primary vehicle toggle** — flag one vehicle as primary; default in Add-to-Wanted prefill.
4. **Wanted List view** — standalone view accessible from account menu.
5. **Settings placeholders** — wire up Email, Change Password, Help & Support rows.
6. **Wanted → listing match notifications** — when a new listing is created, check `publicWantedDatabase` for matches and trigger in-app notification to buyer.
7. **Motoring club outreach** — pitch RAA (SA) first for official Approved Repairer program integration.

---

## Last commit / push

Session 10 — push from Git Bash:
```
git add index.html style.css script.js SESSION-NOTES.md
git commit -m "Session 10 — Message centre wired in, item preview panel, workshops mobile fix"
git push
```
