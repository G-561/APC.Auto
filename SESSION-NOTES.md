# APC Mobile — Session Notes for Claude

If you're a fresh Claude session reading this: **read this file first**, then ask Gary what he wants to work on next.

---

## What this project is

`APC.mobile.github` — mobile-first marketplace web app for **Auto Parts Connection (APC)**. Plain HTML/CSS/JS, no framework. Three core files at the project root:

- `index.html` — all markup. Drawers in DOM order (later = renders on top at equal z-index):
  `filterDrawer` → `authDrawer` → `sellOverlay` → `settingsDrawer` → `profileDrawer` → `myPartsDrawer` → `workshopDrawer` → `garageDrawer` → `addVehicleDrawer` → `vehicleDetailDrawer` → `addWantedDrawer` → `recentlyViewedDrawer` → `inboxDrawer` → `messageDetailDrawer` → `savedPartsDrawer` → `detailOverlay` → `storefrontDrawer` → `chatDrawer`
- `style.css` — all styles. CSS variables at top (`--apc-orange: #F7941D`, `--apc-blue: #007AFF`, etc.). **Never introduce a new colour without checking these first.**
- `script.js` — all state, render functions, drawer logic, auth, CRUD. ~2350 lines.

Other files/folders:
- `manifest.json` + `sw.js` — PWA setup (added Session 5).
- `images/` — 35+ part photos (Hiace, Lotus Elise, misc).
- `mockups/`, `snapshots/`, `300426.claude/` — workspace clutter, **not tracked in git**.

---

## Design decisions — do not second-guess these

- **Pill colour:** orange = signed-out or Standard; `#007AFF` blue = Pro. Same blue as PRO badges in detail overlay.
- **Pill label:** shows tier only ("APC Standard" / "APC Pro"). Username is inside the dropdown, not on the pill.
- **"APC Standard"** is the deliberate label for free members.
- **Heart save on detail page only** — never on result cards. Cards are the hook; saving happens at commitment point (detail).
- **Bottom nav: 5 text-only items** — Home | Garage | Sell | Recent | Inbox. Sell is centred orange tile. No emoji icons.
- **FILTER is a text button** in the search bar — not a gear (looks like settings) or funnel (Gary tried both).
- **`fits: []` = universal** in `partDatabase`. No separate `universal: true` flag.
- **Drawer pattern everywhere** — no router. All screens are drawers using `toggleDrawer(id, allowStack)`.
- **Stacked drawers** use `allowStack: true` to open on top. × buttons on stacked drawers use **dedicated close functions** (`closeAddVehicleDrawer()` etc.) — never bare `toggleDrawer()` which would close everything underneath.
- **`getAllParts()`** = `[...partDatabase, ...userListings]`. Always use this, never `partDatabase` directly.
- **Pro Search defaults ON** when a user upgrades.
- **Saves metric** (♥ X saves on My Listings) is **Pro-only**.
- **Wrecking / whole car**: decided NOT to build a separate category. Wreckers describe it in the listing description. Build it only if real wrecking yards ask for it.

---

## Key code locations (post-Session 5)

`script.js` ~2350 lines. Key sections top-to-bottom:

- **Global state:** `userIsSignedIn`, `currentUserName`, `currentUserTier`, `proSearchOn`, `currentSearchMode`, `activeFilters`.
- **`partDatabase`:** 8 parts, each with `fits`, `saves` fields. Hiace x3, Elise x3, universal x2.
- **`publicWantedDatabase`:** 8 mock buyer wanted listings (searched in FIND WANTED / Pro mode by sellers).
- **`workshopDatabase`:** 4 mock workshops with `vehicleTypes`, `services`, `rating`, `distance`.
- **Workshop profile CRUD:** `loadWorkshopProfile`, `saveWorkshopProfile`, `getDefaultWorkshopProfile`.
- **Recently Viewed:** `loadRecentlyViewed`, `saveRecentlyViewed`, `addToRecentlyViewed`, `renderRecentlyViewed`, `onOpenRecentlyViewed`, `clearRecentlyViewed`.
- **Settings:** `loadUserSettings`, `getDefaultSettings`, `saveUserSettings`, `saveSettingsName`, `saveSettingsLocation`, `saveSettingsToggle`, `renderSettingsDrawer`, `onMenuOpenSettings`, `closeSettingsDrawer`.
- **`buildCardHTML`:** card markup. NO heart on cards (deliberate).
- **Render / search:** `renderMainGrid`, `applyFilters`, `buildCardHTML`, `renderWantedSearchResults`.
- **Sell form:** `openSellOverlay`, `handleSellImageFiles`, `renderSellImagePreviews`, `submitSellListing`, `resetSellForm`, `openEditListing`, `deleteListing`.
- **Garage:** `loadVehicles`, `saveVehicles`, `nextVehicleId`, `onOpenGarage`, `onAddVehicleClick`, `submitAddVehicle`, `closeAddVehicleDrawer`, `deleteVehicle` (cascades wanted), `renderGarage`.
- **Vehicle Detail:** `partFitsVehicle`, `openVehicleDetail`, `setVehicleTab`, `renderVehicleTab`, `buildPartsGrid`, `buildWantedGrid`, `buildVehicleEmpty`.
- **Wanted:** `loadWanted`, `saveWanted`, `addWanted`, `deleteWanted`, `wantedMatchesPart`, `onAddWantedFromSearch`, `openAddWantedForVehicle`, `submitAddWanted`, `closeAddWantedDrawer`.
- **Saved Parts:** `loadSavedParts`, `persistSavedParts`, `toggleSavedPart` (tracks live saves on userListings), `syncDetailSaveButton`, `renderSavedParts`, `onMenuOpenSavedParts`, `closeSavedPartsDrawer`.
- **Inbox:** `loadInboxItems`, `saveInboxItems`, `onOpenInbox`, `updateInboxBadge`, `setInboxTab`, `renderInboxContent`, `buildInboxItemNode`, `toggleInboxFlag`, `deleteInboxItem`, `openMessageDetail`, `closeMessageDetailDrawer`.
- **Workshop UI:** `getRecommendedWorkshops`, `buildWorkshopCardHTML`, `contactWorkshop`, `onMenuOpenWorkshops`, `submitWorkshopProfile`, `renderWorkshopProfile`, `renderWorkshopBrowseView`, `buildSponsoredWorkshopCardHTML`.
- **Detail overlay:** `openItemDetail`, `openDetailImageViewer`, `closeDetailImageViewer`, `handleMessageSeller`.
- **Storefront:** `openStorefront`, `openMyStorefront`, `closeStorefrontDrawer`.
- **Chat:** `openChat`, `closeChatDrawer`, `sendChatMessage`, `sendChatImage`, `appendChatBubble`.
- **Profile:** `renderProfile`, `onMenuOpenProfile`, `closeProfileDrawer`.
- **Auth/menu:** `signIn`, `handleSignInSubmit`, `handleSignUpSubmit`, `onSignOut`, `onUpgradeToPro`, `onToggleProSearch`, `onAccountPillClick`, `closeAccountMenu`, `renderAccountState`, `updateHeaderOffset`.
- **My Listings menu:** `onMenuOpenMyListings`.
- **Utility:** `showToast`, `escapeHtml`, `safeText`, `debounce`, `getPartById`, `getAllParts`, `setActiveNav`, `onMenuPlaceholder`.
- **Init (`DOMContentLoaded`):** wires chat Enter key; calls `renderMainGrid`, `renderMyParts`, `renderGarage`, `renderAccountState`, `updateInboxBadge`.

`index.html` — drawer DOM order matters for stacking (see above). Account menu is inside `<header>`, not a drawer.

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

- **OneDrive sync delay:** This folder is in OneDrive. The Windows-side file (what the browser loads) updates correctly via Read/Write/Edit tools. The bash sandbox mount can show stale content. **Trust the Read tool, not `bash cat`.**
- **Git from Windows only:** Claude can't run git from the bash sandbox (lock file permissions). All commits/pushes happen from Gary's Git Bash on Windows.
- **Curly/smart quotes:** editing JS can introduce U+2018/2019 (`'`/`'`) causing "Invalid character" syntax errors. Run this PowerShell check after any session that edits script.js:
  ```powershell
  $p = "...\script.js"; $c = Get-Content $p -Raw -Encoding UTF8
  $c = $c -replace [char]0x2018,"'" -replace [char]0x2019,"'"
  Set-Content $p $c -Encoding UTF8 -NoNewline
  ```
- **Heart characters:** save button uses `♡` / `♥` (Unicode dingbats), not `❤️` emoji — takes CSS `color` cleanly.
- **Mockup-first:** Gary likes seeing an interactive HTML mockup before committing to a structural UI change.

---

## Sessions completed

### Session 5 (2 May 2026) — Profile, Settings, Recently Viewed, Saved Parts, PWA, polish

- **Copilot fixes:** Inbox Activity tab removed; FIND WANTED rewritten to search `publicWantedDatabase`; drawer stacking bugs fixed; `openMyStorefront()` fixed; vehicle detail tabs fixed to use `getAllParts()`.
- **Profile drawer:** hero banner, stats (Listings/Saved/Wanted), rating/member-since, about, storefront + edit buttons. `renderProfile()` / `onMenuOpenProfile()`.
- **Settings drawer:** 5 sections with iOS toggles. `userSettings` → `apc.settings.v1`. Search Radius segmented control added to filter drawer.
- **Workshop card:** Contact button replaced with small ghost pill (`workshop-card-button`).
- **Recently Viewed:** max-8 list, persisted `apc.recentlyViewed.v1`. Bottom nav "Recent" slot opens drawer. All-text bottom nav (no emoji), font-size 13px.
- **Saved Parts drawer:** `#savedPartsDrawer` wired from account menu. Shows all hearted parts with live unsave button. Empty state included.
- **Saves metric:** `saves` field on all parts (mock 6–31). New listings default `saves:0`. `toggleSavedPart()` tracks live count on userListings. My Listings shows "♥ X saves" — **Pro only**.
- **Sell form main photo:** `renderSellImagePreviews()` rewritten. First photo: orange ★ MAIN badge. Others: ☆ MAIN button to promote. Empty slots open picker; filled slots don't.
- **Bug fixes:** Inbox badge moved to top-right corner of nav item (was overlapping "Inbox" text). Filter drawer Condition expanded to 5 options matching sell form.
- **PWA:** `manifest.json` + `sw.js` added. `index.html` updated with manifest link, theme-color, iOS meta tags, apple-touch-icon, SW registration. **Pending: Gary to make a 512×512 square PNG icon → drop in `images/` → tell Claude filename → update manifest + apple-touch-icon.**

### Session 4 (2 May 2026) — Workshops/Services, Inbox, Wanted CRUD, Garage delete

- **Workshops:** `workshopDatabase` (4 workshops). `getRecommendedWorkshops()` scoring. "Need this fitted?" section in detail overlay (hidden for universal parts). `#workshopDrawer` dual-mode (Standard=browse, Pro=profile editor). Profile → `apc.workshopProfile.v1`.
- **Inbox:** `#inboxDrawer` with All/Messages/Matches tabs. `getInitialInboxItems()` mock data → `apc.inbox.v1`. `#messageDetailDrawer` stacked. Unread badge via `updateInboxBadge()`. Items marked read only on individual open.
- **Chat:** Photo attachment (📷) added. `appendChatBubble()` helper extracted.
- **Wanted CRUD:** `myWanted` → `apc.wanted.v1`. `addWanted`, `deleteWanted`, `wantedMatchesPart`. `#addWantedDrawer` with part/vehicle/price fields. Zero-results search state → "ADD TO WANTED LIST" CTA. Vehicle detail Wanted + Matches tabs populated.
- **Garage delete:** Trash icon on vehicle cards. `deleteVehicle()` cascades to remove that vehicle's wanted entries.

### Session 3 (1 May 2026) — Auth remember-me + detail image zoom

- **Remember me fix:** `onSignOut()` no longer calls `clearRememberedUser()`. Remembered email persists across logout.
- **Image lightbox:** `#imageLightbox` overlay with blur backdrop. Carousel images get `cursor:zoom-in` + click handler. `openDetailImageViewer()` / `closeDetailImageViewer()`.

### Session 2 (1 May 2026) — Garage phase 1

- Bottom nav restructured: Home/Garage/Sell/Inbox (4 items at the time). FILTER text button in search bar.
- `#garageDrawer`, `#addVehicleDrawer`, `#vehicleDetailDrawer` built. `fits` field added to all `partDatabase` entries. `partFitsVehicle()` added.
- Saved parts heart on detail overlay only. `savedParts` Set → `apc.saved.v1`. Toast system (`showToast`).

### Session 1 (30 April 2026) — Header redesign + carousel

- Logo left-aligned. Contextual account pill (Sign In / APC Standard / APC Pro). Pro FIND PARTS/FIND WANTED toggle. Account dropdown menu. Carousel scroll-snap + dot indicators.

---

## What's next

1. **PWA icon** — Gary making a 512×512 square PNG (orange bg, logo centred). Drop in `images/`, tell Claude filename.
2. **Desktop responsive layout** — CSS breakpoint ~900px: bottom nav hides, left sidebar appears, 4-5 col grid, drawers become centred modals. Gary has a PC homepage design as reference (pasted in session 5 chat).
3. **Edit vehicle** — tap vehicle card in garage to open Add Vehicle drawer pre-populated; save updates by id.
4. **Primary vehicle toggle** — flag one vehicle as primary; used as default in Add-to-Wanted prefill.
5. **Mute notifications per Wanted item** — toggle on Wanted card (`mutedNotifications` field already exists in data model).
6. **Settings placeholders** — wire up Email, Change Password, Edit Profile, Help & Support rows.
7. **`.gitignore`** — add `mockups/`, `snapshots/`, `300426.claude/`.

---

## Last commit / push

Sessions 1–4 pushed. Last pushed commit: `6c83ff4 Updated claude 010526`.
**Session 5 is uncommitted.** Push from Git Bash when ready.

Suggested commit message:
```
Session 5 — Profile, Settings, Recently Viewed, Saved Parts, PWA, saves metric, photo picker, polish
```
