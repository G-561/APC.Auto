# APC Mobile — Session Notes for Claude

If you're a fresh Claude session reading this: **read this file first**, then ask Gary what he wants to work on next.

## What this project is

`APC.mobile.github` — mobile-first marketplace web app for **Auto Parts Connection (APC)**. Plain HTML/CSS/JS, no framework. Three core files at the project root:

- `index.html` — markup including header, drawers (filter, sell, my parts, auth, detail overlay, storefront, chat, **garage, add vehicle, vehicle detail**), bottom nav.
- `style.css` — all styles. CSS variables defined at top (`--apc-orange`, `--apc-blue`, etc.). DO NOT introduce a new colour without checking these first.
- `script.js` — state, render functions, drawer toggling, auth, account menu, carousel logic, **garage CRUD, saved parts, vehicle detail rendering**.

Other folders worth knowing:
- `images/` — all part photos (35+ files, mostly Hiace and Lotus Elise parts).
- `mockups/` — interactive design mockups (header redesign + navigation). Workspace clutter, **not** tracked in git.
- `snapshots/` — pre-change file backups for rollback. Workspace clutter, **not** tracked in git.
- `300426.claude/` — earlier auto-generated snapshot. Workspace clutter, **not** tracked in git.

## Sessions completed so far

### Session 1 (30 April 2026) — Header redesign + carousel polish

- Logo moved from centered 65px to left-aligned 56px.
- Right side of header now has a contextual pill button:
  - Signed out → orange "Sign In" → opens `#authDrawer`.
  - Signed in (Standard) → orange "APC Standard ▾" → opens dropdown menu.
  - Signed in (Pro) → blue (`#007AFF`) "APC Pro ▾" → opens dropdown menu.
- Pro-only FIND PARTS / FIND WANTED toggle bar in header, controlled by Pro-Search on/off switch.
- Account dropdown menu: Profile, Settings, My Listings, Messages, Saved Parts, Help & Support, Upgrade-to-Pro / Activate-Pro-Search toggle, Log Out.
- Carousel: each part has 2–4 images with scroll-snap behaviour and dot indicators below.

### Session 2 (1 May 2026) — Phase 1 of Garage build

**Bottom nav restructured to 4 items:** Home / Garage / Sell / Inbox. Profile removed (now in header pill from Session 1). Filters slot replaced by a `FILTER` text button on the right side of the search bar inside the Home header. Sell button changed from elevated orange circle to a flat orange tile that aligns inline with siblings (with a soft orange shadow for visual lift). Inbox stub shows alert for now.

**Garage drawer** (`#garageDrawer`):
- Vehicle list with cards (icon, name, meta) — empty state when no vehicles.
- "+ Add Vehicle" button at bottom.
- Tapping a vehicle card opens the vehicle detail drawer.

**Add Vehicle drawer** (`#addVehicleDrawer`) — stacks on top of garage:
- Required: Make, Model, Year (4-digit, 1900–2030).
- Optional: Variant (e.g. "GTti", "LWB"), Nickname (e.g. "Daily driver"), VIN (max 17 chars).
- Validation: simple alerts for missing required fields or bad year.
- On save: pushes to `myVehicles`, persists to `localStorage`, re-renders garage, closes the add drawer.

**Vehicle detail drawer** (`#vehicleDetailDrawer`) — stacks on top of garage:
- Orange gradient banner with vehicle name and meta.
- Segmented toggle: **All Parts | Wanted | Saved | Matches**.
- All Parts: filters `partDatabase` by `partFitsVehicle(part, vehicle)`.
- Saved: filters by `savedParts.has(part.id) && partFitsVehicle(...)`.
- Wanted and Matches show friendly "coming next" empty states.

**Fitment data:** added `fits` field to every entry in `partDatabase`:
- `fits: [{ make, model }]` — vehicle-specific (most parts)
- `fits: []` — universal (fits anything; e.g. center caps, cold air intake)
- Match function `partFitsVehicle()` is case-insensitive on make/model.

**Saved parts (heart icon):**
- Heart button is on the **detail overlay only**, NOT on result cards. Gary explicitly chose this — clean thumbnails, save action belongs where commitment lives.
- 44px white heart button positioned top-right of the carousel image inside `#detailOverlay`.
- `♡` (grey) when not saved, `♥` (red `#FF3B30`) when saved.
- Tapping toggles, persists to localStorage, fires a toast ("Saved" / "Removed from saved"), and updates Vehicle Saved tab if open.

**Toast system** (`showToast(msg)`): single global chip pinned at `bottom: 95px`, slides up briefly on save/unsave or other quick feedback.

## Design decisions to preserve (don't second-guess these)

- **Pill colour mapping:** orange for signed-out + Standard, `#007AFF` for Pro. The blue is deliberately the same as the PRO badges in the detail overlay's seller header.
- **Username is NOT on the pill** — pill shows tier; the username lives inside the dropdown header where it has room.
- **"APC Standard"** is the deliberate label for non-Pro members.
- **Pro Search defaults ON** when a user upgrades.
- **Heart save action on detail page ONLY**, never on result cards. Don't add it back to cards — Gary specifically chose to keep cards clean as a "hook" to drive clicks into the detail page.
- **Bottom nav has 4 items**, with Sell as a flat inline orange tile (NOT an elevated circle).
- **Filters is a text "FILTER" button** in the Home header search bar (NOT a gear icon — looks like settings, NOT a funnel icon — Gary tried both and preferred plain text).
- **`fits: []` means universal** in `partDatabase`. Don't introduce a separate `universal: true` flag.
- **Vehicles persist in `apc.vehicles.v1`**, **saved parts in `apc.saved.v1`** — both `localStorage`. Real backend can swap in later.
- **Drawers, not routes:** Garage, Add Vehicle, and Vehicle Detail all use the existing drawer pattern (`toggleDrawer(id, allowStack)`). Stay consistent — don't introduce a router.
- **Garage shows empty state when no vehicles**, not a placeholder vehicle. Add-Vehicle is the only way to populate.
- **The bottom-nav "Inbox" slot is a stub** that alerts for now — it's the entry point for the Phase 2 Inbox screen.

## What's pending — Phase 2 (next session)

In rough priority order:

1. **Wanted data model + CRUD** — `myWanted` array persisted in `apc.wanted.v1`. Each entry: `{ id, partName, vehicleId, maxPrice, mutedNotifications, createdAt }`. `vehicleId: null` means "any vehicle".
2. **Wanted tab inside vehicle detail** — populate with entries for the current vehicle. Show name, meta (max price + active/muted), and an action button.
3. **Delete a Wanted entry** — Gary specifically asked for this. Trash-can icon on each Wanted card, confirmation alert, then remove + persist.
3a. **Delete a vehicle from the Garage** — Gary specifically asked for this too. The `deleteVehicle(id)` function already exists in `script.js` but isn't wired to UI. Add a discrete affordance — likely a small trash-can icon on the vehicle card, or a "Remove from garage" link inside the vehicle detail header/menu. Confirmation prompt before delete (irreversible). Should also clean up any Wanted entries tied to that vehicle (decision: cascade-delete those, or convert them to "Any vehicle"? Ask Gary which he prefers).
4. **Search → no results → "Add to Wanted" prompt** — when a Home search returns zero results, show an empty state with CTA. Tapping opens a modal pre-filled with the search term and (if Garage knows the user's car) the matching vehicle selected.
5. **Add Wanted modal** (`#addWantedDrawer` or modal) — fields: part description, for-vehicle dropdown (populated from `myVehicles` plus "Any vehicle"), optional max price.
6. **Match logic** — `wantedMatchesPart(wanted, part)` — fuzzy: lowercase substring match on part name, plus vehicle compatibility check. Probably good enough for prototype.
7. **Matches tab inside vehicle detail** — populate with parts matching any of this vehicle's Wanted entries.
8. **Inbox screen** (`#inboxDrawer`) — replaces the alert stub on the bottom nav. Four notification types: 💬 messages, 🔔 wanted matches, 💰 saved price drops (mock for now), 📦 listing activity. Tabs at top to filter (All / Messages / Matches / Activity). Red badge on Inbox bottom-nav slot when there are unread items.
9. **Inbox notifications generation** — for the prototype, generate at init time from existing data: each unread chat = 💬, each wanted-with-matches = 🔔, etc.

## What's pending — Phase 3 (after that)

1. Edit-vehicle UI (delete moved up to Phase 2). Tap-to-edit on a vehicle card, opens the Add Vehicle drawer pre-populated, save updates the existing entry by id.
2. Primary vehicle toggle (one car flagged "primary" — used as default in Add-to-Wanted prefill).
3. Mute notifications per-Wanted-item (toggle on the Wanted card).
4. **Settings screen** — see Session 1 notes for the full scope discussion (Account / My Garage / Notifications / Search defaults / Selling defaults / Privacy / Payments / Pro features / Help & legal).
5. Profile screen (read-only public profile).
6. Help & Support (FAQ + contact).
7. `.gitignore` for `mockups/`, `snapshots/`, `300426.claude/`.
8. Decide what to do with the unrelated whitespace change in `images/list-part-final.html`.

Mockup-first workflow: Gary likes seeing interactive HTML mockups before any code change. Existing mockup `mockups/navigation-mockup.html` already has the Wanted/Inbox flows clickable — use it as visual reference when building.

## Key code locations (post-Session 2)

`script.js` is now ~700+ lines. Key sections:

- **Top:** auth state (`userIsSignedIn`, `currentUserName`, `currentUserTier`, `proSearchOn`).
- **`partDatabase`:** 8 parts with new `fits` field. Hiace-specific x3, Elise-specific x3, universal x2.
- **`buildCardHTML`:** card markup. NO heart on cards (deliberate).
- **Auth/menu functions block:** `signIn`, `handleSignInSubmit`, `onSignOut`, `onUpgradeToPro`, `onToggleProSearch`, `onAccountPillClick`, `closeAccountMenu`, `renderAccountState`, `updateHeaderOffset`.
- **Garage block:** `loadVehicles`, `saveVehicles`, `nextVehicleId`, `onOpenGarage`, `onAddVehicleClick`, `submitAddVehicle`, `deleteVehicle`, `renderGarage`.
- **Saved + Vehicle Detail block:** `loadSavedParts`, `persistSavedParts`, `toggleSavedPart`, `syncDetailSaveButton`, `partFitsVehicle`, `openVehicleDetail`, `setVehicleTab`, `renderVehicleTab`, `buildPartsGrid`, `buildVehicleEmpty`, `showToast`.
- **`onOpenInbox`:** still a stub that alerts. Replace in Phase 2.
- **Init block (`DOMContentLoaded`):** calls `renderMainGrid`, `renderMyParts`, `renderGarage`, `renderAccountState`, plus carousel scroll listener and search debounce.

`index.html` drawers in order: filter, auth, sell overlay, my parts, garage, add vehicle, vehicle detail, account menu (in header).

## Quirks to know

- **OneDrive sync delay:** This folder is in OneDrive. The Windows-side file (what the browser actually loads) updates correctly via Read/Write/Edit. The Linux bash sandbox mount may show stale content for a while — sometimes a lot. **Trust the Read tool view, not bash `cat`/`wc -l`.**
- **Limited bash perms on `.git`:** Claude can't fully run git operations from the sandbox (lock files can't be removed, some object files can't be unlinked). Git commits and pushes happen from Gary's Git Bash on Windows.
- **Backup before structural changes:** Always copy modified files to `snapshots/<descriptive-name>/` before a multi-file refactor, so rollback is one shell command.
- **Heart character vs emoji:** the save button uses `♡` and `♥` (Unicode dingbats), not `❤️` emoji — they take CSS `color` cleanly and render consistently across platforms.

## Testing helpers

Wipe all local state during testing:

```js
localStorage.removeItem('apc.vehicles.v1');
localStorage.removeItem('apc.saved.v1');
localStorage.removeItem('apc.wanted.v1');   // Phase 2 onward
location.reload();
```

## Last commit / push

Session 1 work was committed and pushed via Git Bash on Gary's machine.
**Session 2 work is currently uncommitted.** Gary will commit and push from Git Bash. Suggested commit message: `Phase 1 — Garage with vehicles, vehicle detail with segmented toggle, fitment-aware filtering, saved parts with heart on detail page`. Confirm with `git log --oneline -10` before assuming what's on the branch.
