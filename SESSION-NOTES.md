# APC Mobile — Session Notes for Claude

If you're a fresh Claude session reading this: **read this file first**, then ask Gary what he wants to work on next.

---

## What this project is

`APC.mobile.github` — mobile-first (now responsive) marketplace web app for **Auto Parts Connection (APC)**. Plain HTML/CSS/JS, no framework. Three core files at the project root:

- `index.html` — all markup. Drawers in DOM order (later = renders on top at equal z-index):
  `filterDrawer` → `authDrawer` → `sellOverlay` → `settingsDrawer` → `profileDrawer` → `myPartsDrawer` → `workshopDrawer` → `garageDrawer` → `addVehicleDrawer` → `vehicleDetailDrawer` → `addWantedDrawer` → `recentlyViewedDrawer` → `inboxDrawer` → `messageDetailDrawer` → `savedPartsDrawer` → `detailOverlay` → `storefrontDrawer` → `chatDrawer` → `accountMenuDrawer`
- `style.css` — all styles. CSS variables at top (`--apc-orange: #F7941D`, `--apc-blue: #007AFF`, etc.). **Never introduce a new colour without checking these first.**
- `script.js` — all state, render functions, drawer logic, auth, CRUD. ~2500+ lines.

Other files/folders:
- `manifest.json` + `sw.js` — PWA setup.
- `images/` — 35+ part photos + `apc_icon_512_centered.png` (PWA icon).
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
- **`getAllParts()`** = `[...partDatabase, ...userListings]`. Always use this, never `partDatabase` directly.
- **Pro Search defaults ON** when a user upgrades.
- **Saves metric** (♥ X saves on My Listings) is **Pro-only**.
- **Sort by Date defaults to "Newest first"** — no "Default" option. Price sort has no default; tap to activate, tap again to deselect.
- **Postcode + radius are mutually exclusive with state filter** — typing a postcode disables state dropdown; selecting a state clears postcode and locks radius chips.
- **`#accountMenuDrawer` z-index: 1999** — all other drawers at 2000 so sub-drawers stack on top of account menu.
- **Sub-drawers from account menu** use `allowStack: true` so closing them returns to account menu.

---

## Desktop layout (≥900px) — Session 6

Three-column layout:

- **Top utility bar** (`#desktopTopBar`, 36px, full-width fixed): Marketplace | Workshops [left] · Messages | My Garage | + Sell a Part [right]
- **Left sidebar** = `#filterDrawer` always visible as filter panel (240px wide, `display: flex !important`). Drawer header hidden. Apply button stays but doesn't close sidebar.
- **Header** (single row below top bar): Logo left (72px) | Search bar (flex:1) | Account pill right. Achieved via `display: contents` on `.header-top`.
- **Main grid**: 5 columns, card hover effect — glass overlay slides away, orange "VIEW PART →" button slides up.
- **Right sidebar** (`#desktopRightPanel`, 220px fixed): Featured Workshop (orange box) + Sponsored Spares thumbnails.
- **Drawers** open as right-side panels (500px), `#detailOverlay` 680px, `#accountMenuDrawer` 360px. `#drawerBackdrop` dims the rest of the page.
- **Desktop nav sidebar** (`.desktop-sidebar`) is hidden on desktop — navigation is in the top utility bar.
- **`updateHeaderOffset()`** accounts for both top bar height + header height when setting grid margin-top.
- **`closeTopDrawer()`** excludes `#filterDrawer` when on desktop.
- **Desktop still needs polish** — Gary confirmed it's a work-in-progress. Logo position (left) fixed in Session 6 end.

---

## Key code locations (post-Session 6)

`script.js` ~2500 lines. Key sections top-to-bottom:

- **Global state:** `userIsSignedIn`, `currentUserName`, `currentUserTier`, `proSearchOn`, `currentSearchMode`, `activeFilters`, `sortOrder` ('none'|'asc'|'desc'), `sortDate` ('newest'|'oldest').
- **`partDatabase`:** 8 parts, each with `fits`, `saves`, `date` fields. Hiace x3, Elise x3, universal x2.
- **`publicWantedDatabase`:** 8 mock buyer wanted listings.
- **`workshopDatabase`:** 4 mock workshops with `vehicleTypes`, `services`, `rating`, `distance`.
- **Sort:** `setSortOrder()` (price, toggleable), `setSortDate()` (date, always one active). Applied in `getFilteredParts()`.
- **Location filter:** `onPostcodeInput()` disables state dropdown when postcode entered; `onStateChange()` clears postcode when state selected. Mutually exclusive.
- **Workshop browse:** `renderWorkshopBrowseView()` filters by text search (`#workshopSearchInput`) + service checkboxes. `buildSponsoredWorkshopCardHTML()` includes star ratings.
- **Workshop profile:** Service checkboxes reordered — Row 1: Panel & body | Part fitting; Row 2: Mechanical repair | Wheels and Tyres; Row 3: Electrical & lighting | Wheel alignment. Textarea uses `.apc-textarea` class.
- **Recently Viewed:** `loadRecentlyViewed`, `saveRecentlyViewed`, `addToRecentlyViewed`, `renderRecentlyViewed`, `onOpenRecentlyViewed`, `clearRecentlyViewed`.
- **Settings:** `loadUserSettings`, `getDefaultSettings`, `saveUserSettings`, etc., `renderSettingsDrawer`.
- **`buildCardHTML`:** card markup. NO heart on cards. Includes `.card-hover-btn` (hidden mobile, slides up on desktop hover).
- **`applyFiltersAndRender()`:** closes filter drawer only on mobile (`window.innerWidth < 900`).
- **`updateHeaderOffset()`:** accounts for `#desktopTopBar` height on desktop.
- **`updateInboxBadge()`:** updates 3 badges — `#inboxBadge` (mobile nav), `#inboxBadgeDesktop` (hidden sidebar), `#inboxBadgeTopBar` (desktop top bar).
- **Sell form:** `openSellOverlay`, `handleSellImageFiles`, `renderSellImagePreviews`, `submitSellListing` (stamps `date: Date.now()` + `saves: 0`), `resetSellForm`, `openEditListing`, `deleteListing`.
- **Garage / Vehicle Detail / Wanted / Saved Parts / Inbox / Workshop UI / Detail / Storefront / Chat / Profile / Auth** — see Session 5 notes for details, unchanged in Session 6.
- **`closeTopDrawer()`:** excludes `#filterDrawer` on desktop.
- **`setActiveNav()`:** handles both `.nav-item` (mobile) and `.dsb-item` (desktop sidebar, currently hidden).

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
- **Geocoding:** radius filter UI is built; actual distance filtering needs a geocoding API at go-live (postcode → lat/lng → `ST_DWithin` query).
- **Backend plans:** Supabase is the preferred stack when going live — Postgres, built-in auth, storage, realtime. localStorage is the current stand-in.

---

## Sessions completed

### Session 6 (3 May 2026) — Desktop layout, filter UX overhaul, workshop polish

- **Account menu → proper drawer:** `#accountMenuDrawer` replaces old dropdown. Sub-drawers (Settings, Profile, etc.) open with `allowStack: true` and return to account menu on close. `z-index: 1999` so sub-drawers stack on top.
- **Account pill redesign:** signed-in shows username + blue "Pro" label. No more tier pill. `signed-in` class, no background/shadow.
- **Price filter → sort:** removed min/max price inputs. "Sort by Price" segmented control (Low→High / High→Low, tap to deselect). "Sort by Date" (Newest first default / Oldest first). `sortOrder` + `sortDate` globals. `date` field added to all `partDatabase` entries. New listings get `date: Date.now()`.
- **Location filter overhaul:** state dropdown (all 9 AU jurisdictions), postcode input, radius chips (50/100/250/500km). Postcode + state mutually exclusive — `onPostcodeInput()` / `onStateChange()`. Radius disabled until postcode entered.
- **Share button:** `shareCurrentListing()` on detail overlay — Web Share API with clipboard fallback.
- **Wanted list toast:** `z-index: 9999` on `.app-toast` fixes visibility behind all drawers.
- **Workshop browse:** text search box added (`#workshopSearchInput`, searches name/loc/vehicleTypes/services). Star ratings added to sponsored cards. `renderWorkshopBrowseView()` updated.
- **Workshop profile:** "Tyres" → "Wheels and Tyres". Checkboxes reordered into 3 rows of 2. Textarea styled with `.apc-textarea` (orange focus border, rounded).
- **Saved Parts drawer:** `#savedPartsDrawer` from account menu. Live unsave. Empty state.
- **PWA icon:** `apc_icon_512_centered.png` wired into `manifest.json` + `apple-touch-icon`.
- **Desktop layout v2:** 3-column (filter sidebar 240px | 5-col grid | right panel 220px). Top utility bar (Marketplace/Workshops/Messages/Garage/Sell). Card hover effect (glass overlay slides away, VIEW PART slides up). Drawers as right-side panels (500px). `#drawerBackdrop` for dimming. Logo left (72px) via `display: contents` on `.header-top`. **Desktop needs further polish — work in progress.**
- **`buildCardHTML`:** added `.card-hover-btn` (hidden mobile).
- **`updateHeaderOffset()`:** accounts for top bar height on desktop.
- **`updateInboxBadge()`:** 3 badge targets (mobile, sidebar, top bar).

### Session 5 (2 May 2026) — Profile, Settings, Recently Viewed, Saved Parts, PWA, polish

- Profile drawer, Settings drawer, Recently Viewed, Saved Parts, saves metric, sell form photo picker, PWA manifest+SW, inbox badge fix, filter conditions expanded to 5.

### Session 4 (2 May 2026) — Workshops/Services, Inbox, Wanted CRUD, Garage delete

### Session 3 (1 May 2026) — Auth remember-me + detail image zoom

### Session 2 (1 May 2026) — Garage phase 1

### Session 1 (30 April 2026) — Header redesign + carousel

---

## What's next

1. **Desktop polish** — many things to fix/tune after first look on PC. Logo now left-aligned. Still needed: overall spacing, right panel positioning, filter sidebar scroll, card grid proportions, top bar styling.
2. **Desktop live filters** — on desktop, filter changes should re-render grid instantly (no Apply button needed). `oninput` on all filter inputs calling `applyFiltersAndRender()` without closing sidebar.
3. **Edit vehicle** — tap vehicle card in garage to open Add Vehicle drawer pre-populated; save updates by id.
4. **Primary vehicle toggle** — flag one vehicle as primary; default in Add-to-Wanted prefill.
5. **Mute notifications per Wanted item** — toggle on Wanted card (`mutedNotifications` field already exists).
6. **Settings placeholders** — wire up Email, Change Password, Edit Profile, Help & Support rows.
7. **`.gitignore`** — add `mockups/`, `snapshots/`, `300426.claude/`.
8. **Wanted List** — add to desktop top utility bar (currently only Marketplace + Workshops).

---

## Last commit / push

Session 6 changes pushed incrementally during session.
Final changes (logo left fix + session notes) — push from Git Bash:
```
git add index.html style.css script.js SESSION-NOTES.md
git commit -m "Session 6 final — logo left on desktop, session notes updated"
git push
```
