// --- SUPABASE ---
const SUPABASE_URL  = 'https://ufpsnjtnvchazqswntch.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcHNuanRudmNoYXpxc3dudGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDc5MDAsImV4cCI6MjA5Mzg4MzkwMH0.Wl60CI8rcIo26EnNx1A1Dd7xfZEFOBlAXJDpXA6fyCA';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// --- ERROR MONITORING ---
window.onerror = function(msg, src, line, col, err) {
    try {
        sb.from('error_logs').insert({
            message:     String(msg).slice(0, 500),
            source:      String(src || '').slice(0, 200),
            line_number: line || null,
            col_number:  col  || null,
            stack:       err?.stack ? String(err.stack).slice(0, 1000) : null,
            user_id:     currentUserId || null,
            user_agent:  navigator.userAgent.slice(0, 300),
            page_url:    location.href.slice(0, 300),
        });
    } catch (_) {}
};
window.onunhandledrejection = function(e) {
    try {
        const msg = e.reason?.message || String(e.reason || 'Unhandled rejection');
        sb.from('error_logs').insert({
            message:    String(msg).slice(0, 500),
            source:     'unhandledrejection',
            stack:      e.reason?.stack ? String(e.reason.stack).slice(0, 1000) : null,
            user_id:    currentUserId || null,
            user_agent: navigator.userAgent.slice(0, 300),
            page_url:   location.href.slice(0, 300),
        });
    } catch (_) {}
};

// --- GLOBAL STATE ---
let userIsSignedIn = false;          // starts logged out — header shows "Sign In" pill
let currentUserName  = null;          // e.g. "Gary"
let currentUserTier  = null;          // 'personal' | 'trade' | 'pro'
let currentUserId    = null;          // Supabase UUID of signed-in user
let currentUserEmail = null;          // signed-in user's email
let _fromWantedId    = null;         // UUID of wanted request that triggered "List this Part"
let myNotifications  = [];           // buyer's unread notifications from Supabase
let _listingsCursor    = null;   // created_at of last fetched row for cursor pagination
let _listingsExhausted = false;  // true when Supabase has no more pages
let _listingsLoading   = false;  // guard against concurrent fetches
let _pendingStoreOpen  = null;   // seller userId to auto-open storefront from ?store= URL param
let _pendingItemOpen   = null;   // listing id to auto-open from ?item= URL param after listings load
let _pendingPutAway    = false;  // open put-away scanner after auth from ?putaway=1 URL param
let currentOpenPartId = null;  // tracks which part detail is open
let _currentOpenPart  = null;  // direct part ref — avoids integer ID collision in getAllParts()
let _detailHistory    = [];    // stack of part IDs for store → listing → back navigation
let currentEditingListingId = null; // edit mode for Sell form
let currentEditStatus = null;       // status selected in manage section
let currentBuyerRating = 0;        // star rating selected in rate-buyer section
let authReturnAction = null; // optional callback after sign-in
let authMode = 'signin';
let sortOrder = 'none';  // 'none' | 'asc' | 'desc'
let _dashViewsChart  = null;
let _dashCatChart    = null;
let _dashCurrentTab    = 'active';
let _dashListingsShown = 25;
let _dashListingsCtx   = 'dash'; // 'dash' | 'pro'
let activeFilters = {
    search: '',
    category: 'all',
    make: '',
    model: '',
    year: '',
    series: '',
    location: 'all',
    minPrice: '',
    maxPrice: '',
    conditions: ['new_oem', 'new_aftermarket', 'used', 'refurbished', 'parts_only'],
    postage: true,
    pickup: true,
    sellerPrivate: true,
    sellerPro: true
};

// --- DATABASE ---
// Each part now has a stable `id` field so lookups never break if the array is reordered.
// `images` is an array so the carousel can show real photos per part.
// `fits` = which vehicles a part suits. Empty array = universal (fits anything).
const partDatabase = [];

// --- OFFERS ---
const OFFERS_KEY = 'apc.offers.v1';
let offersDb = loadOffers();
function loadOffers() {
    try { return JSON.parse(localStorage.getItem(OFFERS_KEY) || '[]'); } catch { return []; }
}
function saveOffers() {
    try { localStorage.setItem(OFFERS_KEY, JSON.stringify(offersDb)); } catch {}
}
function nextOfferId() {
    return offersDb.length ? Math.max(...offersDb.map(o => o.id)) + 1 : 1;
}

const dashMockData = {
    weekLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekViews:  [0, 0, 0, 0, 0, 0, 0],
    weekSaves:  [0, 0, 0, 0, 0, 0, 0],
    activity:   []
};

const publicWantedDatabase = [];

const workshopDatabase = [];

let workshopRadiusKm = null;

const WORKSHOP_PROFILE_KEY = 'apc.workshopProfile.v2';
let workshopProfile = loadWorkshopProfile();

function loadWorkshopProfile() {
    try {
        const raw = localStorage.getItem(WORKSHOP_PROFILE_KEY);
        return raw ? JSON.parse(raw) : getDefaultWorkshopProfile();
    } catch (e) {
        return getDefaultWorkshopProfile();
    }
}
function saveWorkshopProfile() {
    try { localStorage.setItem(WORKSHOP_PROFILE_KEY, JSON.stringify(workshopProfile)); } catch (e) {}
}
function getDefaultWorkshopProfile() {
    return {
        vehicles: [],
        address: '',
        phone: '',
        services: {
            // Engine & Powertrain
            generalService: false, logbook: false, engineDiag: false, engineRebuild: false,
            transmission: false, exhaust: false, timingBelt: false,
            // Chassis & Vehicle Dynamics
            brakes: false, suspension: false, wheelAlign: false, tyreSupply: false,
            // Electrical, Climate & Cooling
            autoElectrical: false, battery: false, aircon: false, cooling: false, autoSecurity: false, audioAccessories: false,
            // Body, Glass & Interior
            collision: false, sprayPaint: false, pdr: false, autoGlass: false, trimming: false,
        },
        partsType: 'new',
        partsCategories: [],
        wrecking: false,
        wreckingMakes: [],
    };
}

const SERVICE_LABELS = {
    generalService: 'General Servicing & Repairs',
    logbook: 'Logbook Servicing',
    engineDiag: 'Engine Diagnostics & Tuning',
    engineRebuild: 'Engine Rebuilds & Overhauls',
    transmission: 'Transmission & Drivetrain',
    exhaust: 'Exhaust & Emissions',
    timingBelt: 'Timing Belt & Chain',
    brakes: 'Brake Machining & Upgrades',
    suspension: 'Suspension & Steering',
    wheelAlign: 'Wheel Alignment & Balancing',
    tyreSupply: 'Tyre Supply & Fitting',
    autoElectrical: 'Auto Electrical',
    battery: 'Battery, Alternator & Starter',
    aircon: 'Air Conditioning',
    cooling: 'Cooling & Radiator',
    autoSecurity: 'Automotive Locksmith & Security',
    audioAccessories: 'Audio & Accessories',
    collision: 'Collision Repair & Panel Beating',
    sprayPaint: 'Spray Painting & Refinishing',
    pdr: 'Paintless Dent Removal',
    autoGlass: 'Auto Glass',
    trimming: 'Motor Trimming & Upholstery',
};
// Maps listing category → relevant workshop service keys for "Need this Fitted?" matching
const CATEGORY_SERVICE_MAP = {
    engine:       ['generalService', 'engineDiag', 'engineRebuild', 'timingBelt', 'exhaust'],
    transmission: ['transmission'],
    brakes:       ['brakes'],
    suspension:   ['suspension', 'wheelAlign'],
    wheels:       ['tyreSupply', 'wheelAlign', 'suspension'],
    electrical:   ['autoElectrical', 'battery', 'autoSecurity'],
    lighting:     ['autoElectrical'],
    cooling:      ['cooling'],
    body:         ['collision', 'sprayPaint', 'pdr', 'trimming'],
    glass:        ['autoGlass'],
    audio:        ['audioAccessories'],
    '4x4':        ['suspension', 'wheelAlign'],
    performance:  ['engineDiag', 'engineRebuild', 'exhaust'],
    interior:     ['trimming', 'audioAccessories'],
};

const CAT_LABELS = {
    body: 'Body & Exterior', lighting: 'Lighting & Electrical',
    engine: 'Engine & Drivetrain', wheels: 'Wheels & Suspension',
    interior: 'Interior', brakes: 'Brakes',
    cooling: 'Cooling & Heating', glass: 'Glass & Windows',
    '4x4': '4x4 & Accessories', performance: 'Performance & Race',
    audio: 'Audio & In-Car Tech', tools: 'Workshop Tools', other: 'Other',
};

const RECENTLY_VIEWED_KEY = 'apc.recentlyViewed.v1';
const RECENTLY_VIEWED_MAX = 50;
const RECENTLY_VIEWED_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days
let recentlyViewed = loadRecentlyViewed();
let _rvSearchQuery  = '';

function loadRecentlyViewed() {
    try {
        const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
        if (!raw) return [];
        const now = Date.now();
        return JSON.parse(raw)
            .map(e => typeof e === 'object' ? e : { id: e, viewedAt: now }) // migrate old format
            .filter(e => now - e.viewedAt < RECENTLY_VIEWED_TTL);
    } catch (e) { return []; }
}
function saveRecentlyViewed() {
    try { localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed)); } catch (e) {}
}
const _navPairs = {
    homeNavItem:      'dsbHomeItem',
    recentNavItem:    'dsbRecentItem',
    headerInboxBtn:   'desktopInboxItem',
    dsbHomeItem:      'homeNavItem',
    dsbGarageItem:    null,
    dsbRecentItem:    'recentNavItem',
    desktopInboxItem: 'headerInboxBtn',
};
function setActiveNav(el) {
    document.querySelectorAll('.nav-item, .dsb-item, .header-inbox-btn').forEach(n => n.classList.remove('active'));
    const target = typeof el === 'string' ? document.getElementById(el) : el;
    if (target) {
        target.classList.add('active');
        const pairedId = _navPairs[target.id];
        if (pairedId) { const p = document.getElementById(pairedId); if (p) p.classList.add('active'); }
    }
}

function setDtbActive(id) {
    document.querySelectorAll('.dtb-link').forEach(el => el.classList.remove('dtb-active'));
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('dtb-active');
    }
}

// Top-bar nav wrappers — close any open drawer first, then set active + open
function _dtbNav(id, fn) {
    document.querySelectorAll('.drawer.active').forEach(d => d.classList.remove('active'));
    syncBackdrop();
    setDtbActive(id);
    fn();
}
function dtbGoHome()        { goHome(); }
function dtbOpenDashboard() { _dtbNav('dtbDashboard', openDashboard); }
function dtbOpenGarage()    { _dtbNav('dtbGarage',    onOpenGarage); }
function dtbOpenListings()  { _dtbNav('dtbListings',  onMenuOpenMyListings); }
function dtbOpenWanted()    { _dtbNav('dtbWanted',    openWantedListDrawer); }
function dtbOpenSaved()     { _dtbNav('dtbSaved',     onMenuOpenSavedParts); }
function dtbOpenInbox()     { _dtbNav('dtbMessages',  onOpenInbox); }
function dtbOpenWorkshops() { _dtbNav('dtbWorkshops', onMenuOpenWorkshops); }

function clearRecentlyViewed() {
    recentlyViewed = [];
    _rvSearchQuery = '';
    saveRecentlyViewed();
    renderRecentlyViewed();
}
function addToRecentlyViewed(partId) {
    const now = Date.now();
    recentlyViewed = [
        { id: partId, viewedAt: now },
        ...recentlyViewed.filter(e => e.id !== partId),
    ].slice(0, RECENTLY_VIEWED_MAX);
    saveRecentlyViewed();
    if (sb && currentUserId && partId) {
        sb.from('recently_viewed')
            .upsert({ user_id: currentUserId, listing_id: partId, viewed_at: new Date(now).toISOString() },
                    { onConflict: 'user_id,listing_id' })
            .then(() => {});
    }
}

async function loadRecentlyViewedFromSupabase(userId) {
    if (!sb || !userId) return;
    const cutoff = new Date(Date.now() - RECENTLY_VIEWED_TTL).toISOString();
    const { data } = await sb.from('recently_viewed')
        .select('listing_id, viewed_at')
        .eq('user_id', userId)
        .gte('viewed_at', cutoff)
        .order('viewed_at', { ascending: false })
        .limit(RECENTLY_VIEWED_MAX);
    if (!data?.length) return;
    const merged = new Map();
    [...recentlyViewed,
     ...data.map(r => ({ id: r.listing_id, viewedAt: new Date(r.viewed_at).getTime() }))
    ].forEach(e => {
        const existing = merged.get(e.id);
        if (!existing || e.viewedAt > existing.viewedAt) merged.set(e.id, e);
    });
    recentlyViewed = [...merged.values()]
        .sort((a, b) => b.viewedAt - a.viewedAt)
        .slice(0, RECENTLY_VIEWED_MAX);
    saveRecentlyViewed();
}
function onOpenRecentlyViewed() {
    setActiveNav('recentNavItem');
    renderRecentlyViewed();
    toggleDrawer('recentlyViewedDrawer');
}

function renderRecentlyViewed() {
    const content = document.getElementById('rvDrawerContent');
    if (!content) return;

    // Load any recently-viewed listings not in the cache (fresh session) so none drop out.
    _preloadListings(recentlyViewed.map(e => e.id)).then(added => { if (added) renderRecentlyViewed(); });

    const allParts = recentlyViewed.map(e => findPartAnywhere(e.id)).filter(Boolean);

    if (!allParts.length) {
        _rvSearchQuery = '';
        content.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; color: #aaa;">
                <div style="font-size: 40px; margin-bottom: 12px;">🕐</div>
                <div style="font-weight: 800; font-size: 15px; margin-bottom: 8px; color: #888;">Nothing here yet</div>
                <div style="font-size: 13px;">Parts you view will appear here so you can find them again easily.</div>
            </div>`;
        return;
    }

    // Build header with search bar once; after that only refresh the list
    if (!content.querySelector('.rv-search-input')) {
        content.innerHTML = `
            <div class="rv-drawer-header">
                <input class="rv-search-input" type="text" placeholder="Search recently viewed…"
                       value="${escapeHtml(_rvSearchQuery)}"
                       oninput="_rvSearchQuery=this.value; _renderRvList()">
                <span class="rv-drawer-clear" onclick="clearRecentlyViewed()">Clear all</span>
            </div>
            <div id="rvListContent"></div>`;
    }
    _renderRvList(allParts);
}

function _renderRvList(allParts) {
    const list = document.getElementById('rvListContent');
    if (!list) return;
    if (!allParts) allParts = recentlyViewed.map(e => findPartAnywhere(e.id)).filter(Boolean);

    const q = _rvSearchQuery.toLowerCase().trim();
    const parts = q
        ? allParts.filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.loc      || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q))
        : allParts;

    const countLabel = q
        ? `${parts.length} of ${allParts.length} part${allParts.length === 1 ? '' : 's'}`
        : `${allParts.length} part${allParts.length === 1 ? '' : 's'} · last 14 days`;

    const grid = document.createElement('div');
    grid.className = 'results-grid';
    parts.forEach(part => {
        const temp = document.createElement('div');
        temp.innerHTML = buildCardHTML(part);
        const card = temp.firstElementChild;
        if (card) grid.appendChild(card);
    });

    list.innerHTML = `<div class="rv-drawer-count-row"><span class="rv-drawer-count">${countLabel}</span></div>
        ${parts.length === 0 ? `<div style="text-align:center;padding:40px 20px;color:#aaa;font-size:13px;">No matches for "${escapeHtml(_rvSearchQuery)}"</div>` : ''}`;
    if (parts.length) list.appendChild(grid);
}

const SETTINGS_STORAGE_KEY = 'apc.settings.v1';
let userSettings = loadUserSettings();

function loadUserSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : getDefaultSettings();
    } catch (e) { return getDefaultSettings(); }
}
function getDefaultSettings() {
    return {
        location: '',
        businessName: '',
        abn: '',
        about: '',
        businessType: 'supplier',
        profilePic: '',
        businessLogo: '',
        businessBanner: '',
        notifyWantedMatch:    true,
        notifyMessages:       true,
        notifyPriceDrops:     true,
        notifyNewListings:    true,
        privacyPublicProfile: true,
        warehouseManagement:  false,
        autoReplyEnabled:     false,
        autoReplyMessage:     ''
    };
}
function saveUserSettings() {
    try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(userSettings)); } catch (e) {}
}

// Silently captures a postcode the first time the user enters one anywhere in the app.
// No prompt, no interruption — just saves it in the background.
function silentSavePostcode(value) {
    const pc = (value || '').trim().replace(/\D/g, '');
    if (!/^\d{4}$/.test(pc)) return;          // must be a valid 4-digit AU postcode
    if (userSettings.postcode === pc) return;  // already saved — nothing to do
    userSettings.postcode = pc;
    saveUserSettings();
    // Sync to Supabase profile in background (fire and forget)
    if (sb && currentUserId) {
        sb.from('profiles').update({ postcode: pc }).eq('id', currentUserId)
            .then(() => {})
            .catch(() => {});
    }
    // Also pre-fill the sell form if it's open and blank
    const sellPc = document.getElementById('sellPostcode');
    if (sellPc && !sellPc.value) sellPc.value = pc;
}
async function isUsernameAvailable(name, excludeId) {
    if (!sb || !name) return true;
    try {
        let q = sb.from('public_profiles')
            .select('id', { count: 'exact', head: true })
            .ilike('display_name', name);
        if (excludeId) q = q.neq('id', excludeId);
        const { count } = await q;
        return count === 0;
    } catch { return true; }
}

function suggestUsernames(base) {
    const clean = base.replace(/[^a-zA-Z0-9]/g, '');
    if (!clean) return [];
    const rand = String(Math.floor(Math.random() * 90 + 10));
    const yr   = String(new Date().getFullYear()).slice(-2);
    return [clean + rand, clean + '_au', clean + yr];
}

function showUsernameSuggestions(suggestions, inputId, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = 'Try: ' + suggestions.map(s =>
        `<button class="username-suggestion-btn" onclick="fillUsername('${escapeHtml(s)}','${inputId}')">${escapeHtml(s)}</button>`
    ).join('');
    el.style.display = '';
}

function fillUsername(name, inputId) {
    const el = document.getElementById(inputId);
    if (el) el.value = name;
    ['authUsernameSuggestions','settingsUsernameSuggestions'].forEach(id => {
        const c = document.getElementById(id); if (c) c.style.display = 'none';
    });
    const errEl = document.getElementById('settingsNameError');
    if (errEl) errEl.style.display = 'none';
}

async function saveSettingsName() {
    const val    = document.getElementById('settingsDisplayName')?.value.trim();
    const errEl  = document.getElementById('settingsNameError');
    const sugEl  = document.getElementById('settingsUsernameSuggestions');
    if (errEl) errEl.style.display = 'none';
    if (sugEl) sugEl.style.display = 'none';
    if (!val || val === currentUserName) return true;
    const available = await isUsernameAvailable(val, currentUserId);
    if (!available) {
        if (errEl) { errEl.textContent = `"${val}" is already taken.`; errEl.style.display = ''; }
        showUsernameSuggestions(suggestUsernames(val), 'settingsDisplayName', 'settingsUsernameSuggestions');
        return false;
    }
    const oldName = currentUserName;
    currentUserName = val;
    userListings.forEach(l => { if (l.seller === oldName) l.seller = val; });
    saveUserListings();
    saveRememberedUser({ name: val, tier: currentUserTier, email: currentUserEmail });
    renderAccountState();
    renderProfile();
    renderMyParts();
    if (currentUserId && sb) {
        sb.from('profiles').update({ display_name: val }).eq('id', currentUserId).then(() => {});
        sb.from('listings').update({ seller_name: val }).eq('seller_id', currentUserId).then(() => {});
    }
    return true;
}
function saveSettingsLocation() {
    // The picker saves on selection; re-affirm a staged profile pick on Save.
    document.querySelectorAll('.location-picker-wrap').forEach(wrap => {
        const mode = wrap.dataset.mode || 'profile';
        if (mode !== 'profile') return;
        if (wrap.dataset.selectedSuburb && wrap.dataset.selectedPostcode) {
            _onLocationSelected(wrap, `${wrap.dataset.selectedSuburb} ${wrap.dataset.selectedPostcode}`);
        }
    });
}

// ── POSTCODE / LOCATION PICKER ───────────────────────────────────────────────
// Profile mode uses a collapsible chip pattern (hide input → show chip).
// All other modes (sell, signup, workshop, ws-locator) use a two-column grid:
// postcode input always visible left, suburb select always visible right.
// Left box: postcode → list that postcode's suburbs. Single suburb auto-selects.
function onPostcodeInput(inputEl) {
    const wrap = inputEl.closest('.location-picker-wrap');
    const mode = wrap.dataset.mode || 'profile';
    const val  = inputEl.value.replace(/\D/g, '').slice(0, 4);
    inputEl.value = val;
    wrap.dataset.selectedPostcode = '';
    wrap.dataset.selectedSuburb   = '';
    if (mode === 'profile') {
        const chip = wrap.querySelector('.location-chip');
        if (chip) chip.style.display = 'none';
    }
    if (val.length !== 4) { _locHideDropdown(wrap); return; }
    const suburbs = (typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[val]) || [];
    const matches = suburbs.map(([s, st]) => ({ s, st, pc: val }));
    if (matches.length === 1) _locApply(wrap, matches[0]);   // only one suburb → auto-pick
    else _locShowDropdown(wrap, matches);
}

// Right box: suburb name → reverse lookup across all postcodes. Same-name suburbs
// in different states show as separate options (e.g. Greenacres SA vs NSW).
function onSuburbInput(inputEl) {
    const wrap = inputEl.closest('.location-picker-wrap');
    wrap.dataset.selectedPostcode = '';
    wrap.dataset.selectedSuburb   = '';
    const q = inputEl.value.trim().toLowerCase();
    if (q.length < 2) { _locHideDropdown(wrap); return; }
    const matches = _getSuburbIndex()
        .filter(e => e.s.toLowerCase().includes(q))
        .sort((a, b) => {
            const aw = a.s.toLowerCase().startsWith(q) ? 0 : 1;
            const bw = b.s.toLowerCase().startsWith(q) ? 0 : 1;
            return aw - bw || a.s.localeCompare(b.s) || a.st.localeCompare(b.st);
        })
        .slice(0, 12);
    _locShowDropdown(wrap, matches);
}

function _locShowDropdown(wrap, matches) {
    const dd = wrap.querySelector('.loc-suburb-dd');
    if (!dd) return;
    dd.innerHTML = matches.length
        ? matches.map(m => `<div class="loc-dd-opt" onmousedown="_locPick(this)" data-s="${escapeHtml(m.s)}" data-st="${escapeHtml(m.st)}" data-pc="${escapeHtml(m.pc)}"><span>${escapeHtml(m.s)}, ${escapeHtml(m.st)}</span><span class="loc-dd-pc">${escapeHtml(m.pc)}</span></div>`).join('')
        : '<div class="loc-dd-empty">No matching suburb</div>';
    dd.style.display = 'block';
}

function _locHideDropdown(wrap) {
    const dd = wrap.querySelector('.loc-suburb-dd');
    if (dd) dd.style.display = 'none';
}

function _locPick(optEl) {
    const wrap = optEl.closest('.location-picker-wrap');
    _locApply(wrap, { s: optEl.dataset.s, st: optEl.dataset.st, pc: optEl.dataset.pc });
}

// Fill both boxes, record the selection, route it to the right place per mode.
function _locApply(wrap, m) {
    const pcInput  = wrap.querySelector('.loc-postcode-input');
    const subInput = wrap.querySelector('.loc-suburb-input');
    if (pcInput)  pcInput.value  = m.pc;
    if (subInput) subInput.value = `${m.s}, ${m.st}`;
    wrap.dataset.selectedPostcode = m.pc;
    wrap.dataset.selectedSuburb   = `${m.s}, ${m.st}`;
    _locHideDropdown(wrap);
    _onLocationSelected(wrap, `${m.s}, ${m.st} ${m.pc}`);
}

// Compulsory pick: typed text that wasn't chosen from the list isn't a real
// location, so clear it on blur (delay lets a dropdown click land first).
function onSuburbBlur(inputEl) {
    const wrap = inputEl.closest('.location-picker-wrap');
    setTimeout(() => {
        _locHideDropdown(wrap);
        if (!wrap.dataset.selectedSuburb && inputEl.value.trim()) inputEl.value = '';
    }, 150);
}

let _suburbIndex = null;
function _getSuburbIndex() {
    if (_suburbIndex) return _suburbIndex;
    _suburbIndex = [];
    if (typeof AU_POSTCODES !== 'undefined') {
        for (const pc in AU_POSTCODES) {
            for (const [s, st] of AU_POSTCODES[pc]) _suburbIndex.push({ s, st, pc });
        }
    }
    return _suburbIndex;
}

// Route a chosen "Suburb, State PC" to the right place per picker mode.
function _onLocationSelected(wrap, val) {
    if (!val) return;
    const mode   = wrap.dataset.mode || 'profile';
    const pc     = val.match(/\b(\d{4})\b/)?.[1] || '';
    const suburb = val.replace(/\s*\d{4}$/, '').trim();
    if (mode === 'sell') {
        const pcEl  = document.getElementById('sellPostcode');
        const locEl = document.getElementById('sellLocation');
        if (pcEl)  pcEl.value  = pc;
        if (locEl) locEl.value = suburb;
        silentSavePostcode(pc);
    } else if (mode === 'signup') {
        wrap.dataset.selectedPostcode = pc;
        wrap.dataset.selectedSuburb   = suburb;
        silentSavePostcode(pc);
    } else if (mode === 'workshop') {
        wrap.dataset.selectedPostcode = pc;
        wrap.dataset.selectedSuburb   = suburb;
    } else if (mode === 'ws-locator') {
        wrap.dataset.selectedPostcode = pc;
        wrap.dataset.selectedSuburb   = suburb;
        silentSavePostcode(pc);
        renderWorkshopBrowseView();
    } else {
        _applyLocationToWrap(wrap, val);
        userSettings.location = val;
        saveUserSettings();
        renderProfile();
        if (currentUserId && sb) {
            sb.from('profiles').update({ location: val }).eq('id', currentUserId).then(() => {});
        }
    }
}

// Close any open suburb dropdown when clicking outside a picker.
document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.location-picker-wrap')) {
        document.querySelectorAll('.loc-suburb-dd').forEach(dd => { dd.style.display = 'none'; });
    }
});

function clearLocationPicker(wrap) {
    const input  = wrap.querySelector('.loc-postcode-input');
    const subBox = wrap.querySelector('.loc-suburb-box');
    const subInp = wrap.querySelector('.loc-suburb-input');
    const mode   = wrap.dataset.mode || 'profile';
    if (input)  input.value  = '';
    if (subInp) subInp.value = '';
    _locHideDropdown(wrap);
    wrap.dataset.selectedPostcode = '';
    wrap.dataset.selectedSuburb   = '';
    if (mode === 'profile') {
        const chip = wrap.querySelector('.location-chip');
        if (input)  input.style.display  = '';
        if (subBox) subBox.style.display = '';
        if (chip)   chip.style.display   = 'none';
        userSettings.location = '';
        saveUserSettings();
        renderProfile();
    } else {
        if (input)  input.style.display  = '';
        if (subBox) subBox.style.display = '';
        if (mode === 'sell') {
            const pcEl  = document.getElementById('sellPostcode');
            const locEl = document.getElementById('sellLocation');
            if (pcEl)  pcEl.value  = '';
            if (locEl) locEl.value = '';
        } else if (mode === 'ws-locator') {
            renderWorkshopBrowseView();
        }
    }
}

function _applyLocationToWrap(wrap, locationStr) {
    const input    = wrap.querySelector('.loc-postcode-input');
    const subBox   = wrap.querySelector('.loc-suburb-box');
    const subInput = wrap.querySelector('.loc-suburb-input');
    const chip     = wrap.querySelector('.location-chip');
    const chipText = wrap.querySelector('.location-chip-text');
    if (chipText) chipText.textContent = locationStr;
    if (chip)     chip.style.display   = 'flex';
    if (subBox)   subBox.style.display = 'none';
    if (input)    input.style.display  = 'none';
    const pcMatch = locationStr.match(/\b(\d{4})\b/);
    if (pcMatch && input)    input.value    = pcMatch[1];
    if (subInput) subInput.value = locationStr.replace(/\s*\d{4}$/, '').trim();
}

function populateLocationPickers() {
    const loc = userSettings.location || '';
    document.querySelectorAll('.location-picker-wrap').forEach(wrap => {
        const mode = wrap.dataset.mode || 'profile';
        if (mode !== 'profile') return;
        const input  = wrap.querySelector('.loc-postcode-input');
        const subBox = wrap.querySelector('.loc-suburb-box');
        const subInp = wrap.querySelector('.loc-suburb-input');
        const chip   = wrap.querySelector('.location-chip');
        if (loc) {
            _applyLocationToWrap(wrap, loc);
        } else {
            if (input)  { input.value = ''; input.style.display = ''; }
            if (subInp) subInp.value = '';
            if (subBox) subBox.style.display = '';
            if (chip)   chip.style.display = 'none';
        }
    });
}

function populateSellLocationPicker() {
    const wrap = document.querySelector('#sellOverlay .location-picker-wrap[data-mode="sell"]');
    if (!wrap) return;
    const loc = userSettings.location || '';
    const pc  = userSettings.postcode  || '';
    const resolvedPc = loc.match(/\b(\d{4})\b/)?.[1] || pc;
    if (!resolvedPc) return;
    const input  = wrap.querySelector('.loc-postcode-input');
    const subInp = wrap.querySelector('.loc-suburb-input');
    if (input) input.value = resolvedPc;
    const suburbs = (typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[resolvedPc]) || [];
    if (!suburbs.length) return;
    // Match the stored suburb if we can, else the only one
    const target = loc.replace(/\s*\d{4}$/, '').split(',')[0].trim().toLowerCase();
    let chosen = target ? suburbs.find(([s]) => s.toLowerCase() === target) : null;
    if (!chosen && suburbs.length === 1) chosen = suburbs[0];
    if (!chosen) return;
    const label = `${chosen[0]}, ${chosen[1]}`;
    if (subInp) subInp.value = label;
    wrap.dataset.selectedPostcode = resolvedPc;
    wrap.dataset.selectedSuburb   = label;
    const pcEl  = document.getElementById('sellPostcode');
    const locEl = document.getElementById('sellLocation');
    if (pcEl)  pcEl.value  = resolvedPc;
    if (locEl) locEl.value = label;
}

function populateWsLocatorPicker() {
    const wrap = document.querySelector('.location-picker-wrap[data-mode="ws-locator"]');
    if (!wrap) return;
    const pc = userSettings.postcode || '';
    if (!pc) return;
    const input  = wrap.querySelector('.loc-postcode-input');
    const subInp = wrap.querySelector('.loc-suburb-input');
    if (input) input.value = pc;
    const suburbs = (typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[pc]) || [];
    if (suburbs.length === 1) {
        const label = `${suburbs[0][0]}, ${suburbs[0][1]}`;
        if (subInp) subInp.value = label;
        wrap.dataset.selectedPostcode = pc;
        wrap.dataset.selectedSuburb   = label;
    }
}
async function saveSettingsAccount() {
    const nameOk = await saveSettingsName();
    if (!nameOk) return;
    saveSettingsLocation();
    showToast('Account settings saved');
}
function formatABN(abn) {
    const d = abn.replace(/\s/g, '');
    if (d.length !== 11) return abn;
    return `${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8,11)}`;
}
function saveSettingsProBusiness() {
    userSettings.businessName = document.getElementById('proSettingBusinessName')?.value.trim() || '';
    userSettings.abn          = document.getElementById('proSettingABN')?.value.trim() || '';
    userSettings.about        = document.getElementById('proSettingAbout')?.value.trim() || '';
    saveUserSettings();
    if (currentUserId && sb) {
        sb.from('profiles').update({
            business_name: userSettings.businessName || null,
            abn:           userSettings.abn           || null,
            about:         userSettings.about         || null,
        }).eq('id', currentUserId).then(() => {});
    }
    showToast('Business details saved');
}

// ── PROFILE PIC CROP ─────────────────────────────────────────
const CROP_VP  = 280;  // viewport circle diameter (px)
const CROP_OUT = 400;  // output canvas size (px)

// ── BANNER CROP ───────────────────────────────────────────────
// Viewport dimensions are set dynamically to match the actual banner element
let _bannerVpW = 480;
let _bannerVpH = 160;
let _cropFile    = null;
let _cropScale   = 1;
let _cropMinScale = 1;
let _cropOffsetX = 0;
let _cropOffsetY = 0;
let _cropImgW    = 0;
let _cropImgH    = 0;
let _cropEventsAttached = false;

let _bannerCropFile           = null;
let _bannerCropScale          = 1;
let _bannerCropMinScale       = 1;
let _bannerCropOffsetX        = 0;
let _bannerCropOffsetY        = 0;
let _bannerCropImgW           = 0;
let _bannerCropImgH           = 0;
let _bannerCropEventsAttached = false;

function openPicCropper(file) {
    _cropFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('picCropImage');
        img.onload = () => {
            _cropImgW     = img.naturalWidth;
            _cropImgH     = img.naturalHeight;
            _cropMinScale = CROP_VP / Math.min(_cropImgW, _cropImgH);
            _cropScale    = _cropMinScale;
            _cropOffsetX  = 0;
            _cropOffsetY  = 0;
            _applyCropTransform();
            const modal = document.getElementById('picCropModal');
            modal.style.display = 'flex';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    if (!_cropEventsAttached) { _attachCropEvents(); _cropEventsAttached = true; }
}

function _applyCropTransform() {
    // Clamp so image always covers the circle
    const maxX = Math.max(0, (_cropImgW * _cropScale - CROP_VP) / 2);
    const maxY = Math.max(0, (_cropImgH * _cropScale - CROP_VP) / 2);
    _cropOffsetX = Math.max(-maxX, Math.min(maxX, _cropOffsetX));
    _cropOffsetY = Math.max(-maxY, Math.min(maxY, _cropOffsetY));
    const img = document.getElementById('picCropImage');
    img.style.transform = `translate(calc(-50% + ${_cropOffsetX}px), calc(-50% + ${_cropOffsetY}px)) scale(${_cropScale})`;
}

function _attachCropEvents() {
    const vp = document.getElementById('picCropViewport');
    let lastTouches = null;

    vp.addEventListener('touchstart', e => {
        e.preventDefault();
        lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    }, { passive: false });

    vp.addEventListener('touchmove', e => {
        e.preventDefault();
        const cur = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        if (!lastTouches) { lastTouches = cur; return; }

        if (cur.length === 1 && lastTouches.length >= 1) {
            _cropOffsetX += cur[0].x - lastTouches[0].x;
            _cropOffsetY += cur[0].y - lastTouches[0].y;
        } else if (cur.length === 2) {
            const prevDist = lastTouches.length === 2
                ? Math.hypot(lastTouches[1].x - lastTouches[0].x, lastTouches[1].y - lastTouches[0].y) : null;
            const currDist = Math.hypot(cur[1].x - cur[0].x, cur[1].y - cur[0].y);
            if (prevDist) {
                _cropScale = Math.max(_cropMinScale, Math.min(_cropScale * (currDist / prevDist), _cropMinScale * 4));
            }
            if (lastTouches.length === 2) {
                _cropOffsetX += (cur[0].x + cur[1].x) / 2 - (lastTouches[0].x + lastTouches[1].x) / 2;
                _cropOffsetY += (cur[0].y + cur[1].y) / 2 - (lastTouches[0].y + lastTouches[1].y) / 2;
            }
        }
        lastTouches = cur;
        _applyCropTransform();
    }, { passive: false });

    vp.addEventListener('touchend', e => {
        lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    });

    // Mouse drag
    let dragging = false, dragX = 0, dragY = 0;
    vp.addEventListener('mousedown', e => { dragging = true; dragX = e.clientX; dragY = e.clientY; e.preventDefault(); });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        _cropOffsetX += e.clientX - dragX; dragX = e.clientX;
        _cropOffsetY += e.clientY - dragY; dragY = e.clientY;
        _applyCropTransform();
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    // Scroll to zoom (desktop)
    vp.addEventListener('wheel', e => {
        e.preventDefault();
        _cropScale = Math.max(_cropMinScale, Math.min(_cropScale * (e.deltaY < 0 ? 1.1 : 0.9), _cropMinScale * 4));
        _applyCropTransform();
    }, { passive: false });
}

function cancelPicCrop() {
    document.getElementById('picCropModal').style.display = 'none';
    document.getElementById('profilePicInput').value = '';
    _cropFile = null;
}

async function confirmPicCrop() {
    if (!_cropFile) return;
    document.getElementById('picCropModal').style.display = 'none';
    showToast('Saving…');

    const img = new Image();
    img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = CROP_OUT;
        const ctx = canvas.getContext('2d');

        // Circular clip
        ctx.beginPath();
        ctx.arc(CROP_OUT / 2, CROP_OUT / 2, CROP_OUT / 2, 0, Math.PI * 2);
        ctx.clip();

        // Map viewport transform to canvas
        const ratio     = CROP_OUT / CROP_VP;
        const drawScale = _cropScale * ratio;
        const cx        = CROP_OUT / 2 + _cropOffsetX * ratio;
        const cy        = CROP_OUT / 2 + _cropOffsetY * ratio;
        ctx.drawImage(img, cx - _cropImgW * drawScale / 2, cy - _cropImgH * drawScale / 2,
                      _cropImgW * drawScale, _cropImgH * drawScale);

        canvas.toBlob(async blob => {
            if (!blob) { showToast('Crop failed'); return; }
            if (!currentUserId || !sb) { showToast('Please sign in first'); return; }
            const path = `profile-pics/${currentUserId}.jpg`;
            const { error: upErr } = await sb.storage.from('listing-images').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
            if (upErr) { showToast('Upload failed — ' + upErr.message); return; }
            const { data: urlData } = sb.storage.from('listing-images').getPublicUrl(path);
            const url = urlData.publicUrl + '?t=' + Date.now();
            userSettings.profilePic = url;
            saveUserSettings();
            const { error: profErr } = await sb.from('profiles').update({ avatar_url: url }).eq('id', currentUserId);
            if (profErr) { showToast('Photo saved locally — sync failed: ' + profErr.message); }
            else { renderProfilePicPreview(); showToast('Profile photo saved'); }
        }, 'image/jpeg', 0.92);
    };
    img.src = URL.createObjectURL(_cropFile);
}

async function handleProfilePicUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large — please use an image under 2 MB'); input.value = ''; return; }
    openPicCropper(file);
}


async function removeProfilePic() {
    userSettings.profilePic = '';
    saveUserSettings();
    const input = document.getElementById('profilePicInput');
    if (input) input.value = '';
    renderProfilePicPreview();
    if (currentUserId && sb) {
        await sb.from('profiles').update({ avatar_url: null }).eq('id', currentUserId);
    }
    showToast('Profile photo removed');
}

function renderProfilePicPreview() {
    const pic      = userSettings.profilePic || '';
    const initial  = (currentUserName || 'G').charAt(0).toUpperCase();
    const img      = document.getElementById('profilePicPreview');
    const ini      = document.getElementById('profilePicInitial');
    const removeBtn = document.getElementById('profilePicRemoveBtn');
    if (img) { img.src = pic; img.style.display = pic ? 'block' : 'none'; }
    if (ini) { ini.style.display = pic ? 'none' : ''; ini.textContent = initial; }
    if (removeBtn) removeBtn.style.display = pic ? '' : 'none';
    const picWrap = document.querySelector('.settings-profile-pic-wrap');
    if (picWrap) picWrap.classList.toggle('pro', currentUserTier === 'pro');
    renderAccountState();
}


function handleBannerUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large — please use an image under 5 MB'); input.value = ''; return; }
    openBannerCropper(file);
}

// ── BANNER CROP ───────────────────────────────────────────────
function openBannerCropper(file) {
    _bannerCropFile = file;

    // Match the crop viewport exactly to the actual rendered banner element
    const bannerBox = document.getElementById('bannerPreviewBox');
    if (bannerBox) {
        const rect = bannerBox.getBoundingClientRect();
        const maxVpW = Math.min(window.innerWidth - 40, 520);
        const scale  = Math.min(1, maxVpW / rect.width);
        _bannerVpW   = Math.round(rect.width  * scale);
        _bannerVpH   = Math.round(rect.height * scale);
    }
    const vpEl = document.getElementById('bannerCropViewport');
    if (vpEl) { vpEl.style.width = _bannerVpW + 'px'; vpEl.style.height = _bannerVpH + 'px'; }

    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('bannerCropImage');
        img.onload = () => {
            _bannerCropImgW     = img.naturalWidth;
            _bannerCropImgH     = img.naturalHeight;
            _bannerCropMinScale = Math.max(_bannerVpW / _bannerCropImgW, _bannerVpH / _bannerCropImgH);
            _bannerCropScale    = _bannerCropMinScale;
            _bannerCropOffsetX  = 0;
            _bannerCropOffsetY  = 0;
            _applyBannerCropTransform();
            document.getElementById('bannerCropModal').style.display = 'flex';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    if (!_bannerCropEventsAttached) { _attachBannerCropEvents(); _bannerCropEventsAttached = true; }
}

function _applyBannerCropTransform() {
    const maxX = Math.max(0, (_bannerCropImgW * _bannerCropScale - _bannerVpW) / 2);
    const maxY = Math.max(0, (_bannerCropImgH * _bannerCropScale - _bannerVpH) / 2);
    _bannerCropOffsetX = Math.max(-maxX, Math.min(maxX, _bannerCropOffsetX));
    _bannerCropOffsetY = Math.max(-maxY, Math.min(maxY, _bannerCropOffsetY));
    const img = document.getElementById('bannerCropImage');
    img.style.transform = `translate(calc(-50% + ${_bannerCropOffsetX}px), calc(-50% + ${_bannerCropOffsetY}px)) scale(${_bannerCropScale})`;
}

function _attachBannerCropEvents() {
    const vp = document.getElementById('bannerCropViewport');
    let lastTouches = null;

    vp.addEventListener('touchstart', e => {
        e.preventDefault();
        lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    }, { passive: false });

    vp.addEventListener('touchmove', e => {
        e.preventDefault();
        const cur = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        if (!lastTouches) { lastTouches = cur; return; }
        if (cur.length === 1 && lastTouches.length >= 1) {
            _bannerCropOffsetX += cur[0].x - lastTouches[0].x;
            _bannerCropOffsetY += cur[0].y - lastTouches[0].y;
        } else if (cur.length === 2) {
            const prevDist = lastTouches.length === 2
                ? Math.hypot(lastTouches[1].x - lastTouches[0].x, lastTouches[1].y - lastTouches[0].y) : null;
            const currDist = Math.hypot(cur[1].x - cur[0].x, cur[1].y - cur[0].y);
            if (prevDist) _bannerCropScale = Math.max(_bannerCropMinScale, Math.min(_bannerCropScale * (currDist / prevDist), _bannerCropMinScale * 4));
            if (lastTouches.length === 2) {
                _bannerCropOffsetX += (cur[0].x + cur[1].x) / 2 - (lastTouches[0].x + lastTouches[1].x) / 2;
                _bannerCropOffsetY += (cur[0].y + cur[1].y) / 2 - (lastTouches[0].y + lastTouches[1].y) / 2;
            }
        }
        lastTouches = cur;
        _applyBannerCropTransform();
    }, { passive: false });

    vp.addEventListener('touchend', e => {
        lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    });

    let dragging = false, dragX = 0, dragY = 0;
    vp.addEventListener('mousedown', e => { dragging = true; dragX = e.clientX; dragY = e.clientY; e.preventDefault(); });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        _bannerCropOffsetX += e.clientX - dragX; dragX = e.clientX;
        _bannerCropOffsetY += e.clientY - dragY; dragY = e.clientY;
        _applyBannerCropTransform();
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    vp.addEventListener('wheel', e => {
        e.preventDefault();
        _bannerCropScale = Math.max(_bannerCropMinScale, Math.min(_bannerCropScale * (e.deltaY < 0 ? 1.1 : 0.9), _bannerCropMinScale * 4));
        _applyBannerCropTransform();
    }, { passive: false });
}

function cancelBannerCrop() {
    document.getElementById('bannerCropModal').style.display = 'none';
    document.getElementById('bannerFileInput').value = '';
    _bannerCropFile = null;
}

async function confirmBannerCrop() {
    if (!_bannerCropFile) return;
    document.getElementById('bannerCropModal').style.display = 'none';
    showToast('Saving…');

    const img = new Image();
    img.onload = async () => {
        const canvas = document.createElement('canvas');
        const outScale = 3;  // 3× the displayed size for quality
        canvas.width  = _bannerVpW * outScale;
        canvas.height = _bannerVpH * outScale;
        const ctx = canvas.getContext('2d');
        const ratio     = outScale;
        const drawScale = _bannerCropScale * ratio;
        const cx = (canvas.width  / 2) + _bannerCropOffsetX * ratio;
        const cy = (canvas.height / 2) + _bannerCropOffsetY * ratio;
        ctx.drawImage(img,
            cx - _bannerCropImgW * drawScale / 2,
            cy - _bannerCropImgH * drawScale / 2,
            _bannerCropImgW * drawScale,
            _bannerCropImgH * drawScale);

        canvas.toBlob(async blob => {
            if (!blob) { showToast('Crop failed'); return; }
            if (!currentUserId || !sb) { showToast('Please sign in first'); return; }
            const path = `profile-banners/${currentUserId}.jpg`;
            const { error: upErr } = await sb.storage.from('listing-images').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
            if (upErr) { showToast('Upload failed — ' + upErr.message); return; }
            const { data: urlData } = sb.storage.from('listing-images').getPublicUrl(path);
            const url = urlData.publicUrl + '?t=' + Date.now();
            userSettings.businessBanner = url;
            saveUserSettings();
            const { error: profErr } = await sb.from('profiles').update({ business_banner: url }).eq('id', currentUserId);
            if (profErr) showToast('Banner saved locally — sync failed');
            else { renderBannerPreview(); showToast('Store banner saved'); }
        }, 'image/jpeg', 0.92);
    };
    img.src = URL.createObjectURL(_bannerCropFile);
}

// ── SPONSOR BUILDER IMAGE CROP ────────────────────────────────
let _spbCropFile           = null;
let _spbCropCallback       = null;
let _spbCropVpW            = 280;
let _spbCropVpH            = 280;
let _spbCropOutW           = 560;
let _spbCropOutH           = 560;
let _spbCropScale          = 1;
let _spbCropMinScale       = 1;
let _spbCropOffsetX        = 0;
let _spbCropOffsetY        = 0;
let _spbCropImgW           = 0;
let _spbCropImgH           = 0;
let _spbCropEventsAttached = false;

function openSpbCropper(file, vpW, vpH, outW, outH, title, confirmLabel, callback) {
    _spbCropFile     = file;
    _spbCropCallback = callback;
    _spbCropVpW      = vpW;
    _spbCropVpH      = vpH;
    _spbCropOutW     = outW;
    _spbCropOutH     = outH;

    const vp = document.getElementById('spbCropViewport');
    vp.style.width  = vpW + 'px';
    vp.style.height = vpH + 'px';

    const titleEl = document.getElementById('spbCropTitle');
    if (titleEl) titleEl.textContent = title || 'Move & Scale';
    const confirmBtn = document.getElementById('spbCropConfirmBtn');
    if (confirmBtn) confirmBtn.textContent = confirmLabel || 'Use Image';

    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('spbCropImage');
        img.onload = () => {
            _spbCropImgW     = img.naturalWidth;
            _spbCropImgH     = img.naturalHeight;
            _spbCropMinScale = Math.max(vpW / _spbCropImgW, vpH / _spbCropImgH);
            _spbCropScale    = _spbCropMinScale;
            _spbCropOffsetX  = 0;
            _spbCropOffsetY  = 0;
            _applySpbCropTransform();
            document.getElementById('spbCropModal').style.display = 'flex';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    if (!_spbCropEventsAttached) { _attachSpbCropEvents(); _spbCropEventsAttached = true; }
}

function _applySpbCropTransform() {
    const maxX = Math.max(0, (_spbCropImgW * _spbCropScale - _spbCropVpW) / 2);
    const maxY = Math.max(0, (_spbCropImgH * _spbCropScale - _spbCropVpH) / 2);
    _spbCropOffsetX = Math.max(-maxX, Math.min(maxX, _spbCropOffsetX));
    _spbCropOffsetY = Math.max(-maxY, Math.min(maxY, _spbCropOffsetY));
    const img = document.getElementById('spbCropImage');
    img.style.transform = `translate(calc(-50% + ${_spbCropOffsetX}px), calc(-50% + ${_spbCropOffsetY}px)) scale(${_spbCropScale})`;
}

function _attachSpbCropEvents() {
    const vp = document.getElementById('spbCropViewport');
    let lastTouches = null;

    vp.addEventListener('touchstart', e => {
        e.preventDefault();
        lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    }, { passive: false });

    vp.addEventListener('touchmove', e => {
        e.preventDefault();
        const cur = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        if (!lastTouches) { lastTouches = cur; return; }
        if (cur.length === 1 && lastTouches.length >= 1) {
            _spbCropOffsetX += cur[0].x - lastTouches[0].x;
            _spbCropOffsetY += cur[0].y - lastTouches[0].y;
        } else if (cur.length === 2) {
            const prevDist = lastTouches.length === 2
                ? Math.hypot(lastTouches[1].x - lastTouches[0].x, lastTouches[1].y - lastTouches[0].y) : null;
            const currDist = Math.hypot(cur[1].x - cur[0].x, cur[1].y - cur[0].y);
            if (prevDist) _spbCropScale = Math.max(_spbCropMinScale, Math.min(_spbCropScale * (currDist / prevDist), _spbCropMinScale * 4));
            _spbCropOffsetX += (cur[0].x + cur[1].x) / 2 - (lastTouches[0].x + lastTouches[1].x) / 2;
            _spbCropOffsetY += (cur[0].y + cur[1].y) / 2 - (lastTouches[0].y + lastTouches[1].y) / 2;
        }
        lastTouches = cur;
        _applySpbCropTransform();
    }, { passive: false });

    vp.addEventListener('touchend', () => { lastTouches = null; });

    let dragging = false, dragX = 0, dragY = 0;
    vp.addEventListener('mousedown', e => {
        dragging = true; dragX = e.clientX; dragY = e.clientY;
        vp.style.cursor = 'grabbing'; e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        _spbCropOffsetX += e.clientX - dragX; dragX = e.clientX;
        _spbCropOffsetY += e.clientY - dragY; dragY = e.clientY;
        _applySpbCropTransform();
    });
    window.addEventListener('mouseup', () => { dragging = false; vp.style.cursor = 'grab'; });
    vp.addEventListener('wheel', e => {
        e.preventDefault();
        _spbCropScale = Math.max(_spbCropMinScale, Math.min(_spbCropScale * (e.deltaY < 0 ? 1.1 : 0.9), _spbCropMinScale * 4));
        _applySpbCropTransform();
    }, { passive: false });
}

function cancelSpbCrop() {
    document.getElementById('spbCropModal').style.display = 'none';
    _spbCropFile = null;
    _spbCropCallback = null;
}

function confirmSpbCrop() {
    if (!_spbCropFile || !_spbCropCallback) return;
    document.getElementById('spbCropModal').style.display = 'none';

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = _spbCropOutW;
        canvas.height = _spbCropOutH;
        const ctx     = canvas.getContext('2d');
        const ratioX  = _spbCropOutW / _spbCropVpW;
        const ratioY  = _spbCropOutH / _spbCropVpH;
        const drawScale = _spbCropScale * ratioX;
        const cx = _spbCropOutW / 2 + _spbCropOffsetX * ratioX;
        const cy = _spbCropOutH / 2 + _spbCropOffsetY * ratioY;
        ctx.drawImage(img,
            cx - _spbCropImgW * drawScale / 2,
            cy - _spbCropImgH * drawScale / 2,
            _spbCropImgW * drawScale,
            _spbCropImgH * drawScale);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        _spbCropCallback(dataUrl);
        _spbCropFile = null;
        _spbCropCallback = null;
    };
    img.src = URL.createObjectURL(_spbCropFile);
}

function removeBannerImage() {
    userSettings.businessBanner = '';
    saveUserSettings();
    const fileInput = document.getElementById('bannerFileInput');
    if (fileInput) fileInput.value = '';
    renderBannerPreview();
    showToast('Banner removed');
    if (currentUserId && sb) sb.from('profiles').update({ business_banner: null }).eq('id', currentUserId);
}

function renderBannerPreview() {
    const banner      = userSettings.businessBanner || '';
    const img         = document.getElementById('bannerPreviewImg');
    const placeholder = document.getElementById('bannerPreviewPlaceholder');
    const removeBtn   = document.getElementById('bannerRemoveBtn');
    if (img) { img.src = banner; img.style.display = banner ? 'block' : 'none'; }
    if (placeholder) placeholder.style.display = banner ? 'none' : '';
    if (removeBtn) removeBtn.style.display = banner ? '' : 'none';
    const hint = document.getElementById('bannerSizeHint');
    if (hint) hint.textContent = banner ? '' : 'Recommended: 1200 × 300 px · JPG · max 2 MB';
}

function setBizType(el, type) {
    document.querySelectorAll('#bizTypeControl .radius-seg').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    userSettings.businessType = type;
    saveUserSettings();
    const servSection  = document.getElementById('workshopServicesSection');
    const partsSection = document.getElementById('workshopPartsSection');
    if (servSection)  servSection.style.display  = (type === 'service' || type === 'both') ? 'block' : 'none';
    if (partsSection) partsSection.style.display = (type === 'supplier' || type === 'both') ? 'block' : 'none';
}
function setPartsType(el, type) {
    document.querySelectorAll('#partsTypeControl .radius-seg').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    workshopProfile.partsType = type;
}
function toggleWreckingMakes(cb) {
    const row = document.getElementById('wsWreckingMakesRow');
    if (row) row.style.display = cb.checked ? 'block' : 'none';
}

// --- VEHICLE MAKES PICKER ---
let _activeMakesField = null;

function openMakesDrawer(fieldKey) {
    _activeMakesField = fieldKey;
    // Build checklist once
    const list = document.getElementById('makesList');
    if (list && !list.querySelector('label')) {
        const makes = Object.keys(VEHICLE_DB).sort();
        list.innerHTML = makes.map(m =>
            `<label class="choice-item makes-item"><input type="checkbox" class="make-cb" value="${m}" onchange="onMakeCheckChange()"> ${m}</label>`
        ).join('');
    }
    // Pre-populate from profile
    const current = workshopProfile[fieldKey];
    const arr = Array.isArray(current) ? current
                : (typeof current === 'string' && current) ? current.split(',').map(s => s.trim()).filter(Boolean)
                : [];
    const allCb = document.getElementById('makeCheckAll');
    if (allCb) allCb.checked = arr.includes('All Makes');
    document.querySelectorAll('.make-cb').forEach(cb => {
        cb.checked = arr.includes(cb.value);
    });
    toggleDrawer('vehicleMakesDrawer', true);
}

function closeMakesDrawer() {
    if (_activeMakesField) {
        const allCb = document.getElementById('makeCheckAll');
        const selected = (allCb && allCb.checked)
            ? ['All Makes']
            : Array.from(document.querySelectorAll('.make-cb:checked')).map(cb => cb.value);
        workshopProfile[_activeMakesField] = selected;
        _updateMakesSummary(_activeMakesField, selected);
    }
    document.getElementById('vehicleMakesDrawer')?.classList.remove('active');
    _activeMakesField = null;
}

function onAllMakesToggle(cb) {
    if (cb.checked) {
        document.querySelectorAll('.make-cb').forEach(c => c.checked = false);
    }
}

function onMakeCheckChange() {
    const allCb = document.getElementById('makeCheckAll');
    if (allCb) allCb.checked = false;
}

function _updateMakesSummary(fieldKey, makes) {
    const summaryId = fieldKey === 'vehicles' ? 'vehicleMakesSummary' : 'wreckingMakesSummary';
    const el = document.getElementById(summaryId);
    if (fieldKey === 'vehicles') _updateObMakesBtn(makes);
    if (!el) return;
    if (!makes || makes.length === 0) {
        el.textContent = 'Tap to select makes…';
        el.classList.add('makes-summary-empty');
    } else if (makes.includes('All Makes')) {
        el.textContent = 'All Makes';
        el.classList.remove('makes-summary-empty');
    } else if (makes.length <= 4) {
        el.textContent = makes.join(', ');
        el.classList.remove('makes-summary-empty');
    } else {
        el.textContent = `${makes.slice(0, 3).join(', ')} +${makes.length - 3} more`;
        el.classList.remove('makes-summary-empty');
    }
}

async function saveSettingsToggle(key, value) {
    userSettings[key] = value;
    saveUserSettings();
    if (key === 'privacyPublicProfile') {
        if (!currentUserId) { showToast('Error: not signed in'); return; }
        const { error } = await sb.from('profiles').update({ is_public: value }).eq('id', currentUserId);
        if (error) { showToast('Error saving: ' + error.message); return; }
        showToast(value ? 'Your profile is now public — listings visible to everyone' : 'Profile hidden — your listings are invisible to other users');
        if (value) _hiddenSellerIds.delete(currentUserId);
        else _hiddenSellerIds.add(currentUserId);
        renderMainGrid();
    }
}
const AUTO_REPLY_TEMPLATES = [
    'Thanks for your enquiry — we\'re closed for the public holiday and will reply as soon as we\'re back.',
    'Thanks for your message — I\'m currently out of the office and will respond as soon as possible.',
    'Thanks for reaching out — I\'m away on weekends but will get back to you first thing Monday.',
    'Thanks for your enquiry — we aim to reply within 24 hours.',
];

async function saveAutoReplyToggle(enabled) {
    userSettings.autoReplyEnabled = enabled;
    saveUserSettings();
    const section = document.getElementById('autoReplyMsgSection');
    if (section) section.style.display = enabled ? '' : 'none';
    if (!currentUserId || !sb) return;
    const { error } = await sb.from('profiles').update({ auto_reply_enabled: enabled }).eq('id', currentUserId);
    if (error) showToast('Error saving: ' + error.message);
    else showToast(enabled ? 'Auto-reply enabled' : 'Auto-reply disabled');
}

async function saveAutoReplyMessage() {
    const input = document.getElementById('autoReplyMsgInput');
    if (!input) return;
    const msg = input.value.trim();
    userSettings.autoReplyMessage = msg;
    saveUserSettings();
    if (!currentUserId || !sb) return;
    const { error } = await sb.from('profiles').update({ auto_reply_message: msg || null }).eq('id', currentUserId);
    if (error) showToast('Error saving: ' + error.message);
    else showToast('Auto-reply message saved');
}

function setAutoReplyTemplate(idx) {
    const input = document.getElementById('autoReplyMsgInput');
    const count = document.getElementById('autoReplyCharCount');
    if (!input) return;
    input.value = AUTO_REPLY_TEMPLATES[idx] || '';
    if (count) count.textContent = `${input.value.length} / 300`;
}

function autoReplyMsgChanged() {
    const input = document.getElementById('autoReplyMsgInput');
    const count = document.getElementById('autoReplyCharCount');
    if (input && count) count.textContent = `${input.value.length} / 300`;
}

function closeSettingsDrawer() {
    const el = document.getElementById('settingsDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}
async function sendPasswordReset() {
    if (!currentUserEmail) { showToast('No email on file'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(currentUserEmail, {
        redirectTo: 'https://www.autopartsconnection.online'
    });
    if (error) { showToast('Error: ' + error.message); return; }
    showToast('Password reset email sent to ' + currentUserEmail);
}
function onMenuOpenSettings() {
    closeAccountDropdown();
    renderSettingsDrawer();
    toggleDrawer('settingsDrawer');
}
function renderSettingsDrawer() {
    renderProfile();
    renderBannerColourPicker();
    if (isTradeOrPro()) renderSponsorManagement();
    const nameEl     = document.getElementById('settingsDisplayName');
    const proSection = document.getElementById('settingsProSection');
    if (nameEl) nameEl.value = currentUserName || '';
    const emailEl = document.getElementById('settingsEmailDisplay');
    if (emailEl) emailEl.textContent = currentUserEmail || '—';
    populateLocationPickers();
    renderProfilePicPreview();

    const isPro = currentUserTier === 'pro';
    const isPersonal = currentUserTier === 'personal';

    const tradeNudge  = document.getElementById('settingsTradeNudge');
    const upgradeNudge = document.getElementById('settingsUpgradeNudge');
    const proBlock    = document.getElementById('settingsProBlock');
    const proBlockLabel = document.getElementById('settingsProBlockLabel');
    const proOnlyRows = document.getElementById('settingsProOnlyRows');

    if (tradeNudge)  tradeNudge.style.display  = isPersonal ? 'block' : 'none';
    if (upgradeNudge) upgradeNudge.style.display = !isPro ? 'block' : 'none';
    if (proBlock)    proBlock.style.display     = isTradeOrPro() ? 'block' : 'none';
    if (proBlockLabel) proBlockLabel.textContent = currentUserTier === 'trade' ? 'APC Trade' : 'APC Pro';
    if (proOnlyRows) proOnlyRows.style.display  = isPro ? 'block' : 'none';

    const toggleMap = {
        settingNotifyWanted:        'notifyWantedMatch',
        settingNotifyMessages:      'notifyMessages',
        settingNotifyPriceDrops:    'notifyPriceDrops',
        settingNotifyNewListings:   'notifyNewListings',
        settingPrivacyPublic:       'privacyPublicProfile',
        proSettingDefaultFitting:   'defaultFitting'
    };
    Object.entries(toggleMap).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (el) el.checked = userSettings[key];
    });

    const arToggle = document.getElementById('settingAutoReply');
    const arSection = document.getElementById('autoReplyMsgSection');
    const arInput = document.getElementById('autoReplyMsgInput');
    const arCount = document.getElementById('autoReplyCharCount');
    if (arToggle) arToggle.checked = !!userSettings.autoReplyEnabled;
    if (arSection) arSection.style.display = userSettings.autoReplyEnabled ? '' : 'none';
    if (arInput) arInput.value = userSettings.autoReplyMessage || '';
    if (arCount) { const len = (userSettings.autoReplyMessage || '').length; arCount.textContent = `${len} / 300`; }
}

const BANNER_COLOURS = [
    '#f07020', // APC Orange (default)
    '#8968cd', // Purple
    '#1d4ed8', // Blue
    '#16a34a', // Green
    '#0891b2', // Teal
    '#e53935', // Red
    '#be185d', // Pink
    '#eab308', // Yellow
    '#374151', // Charcoal
];

function darkenHex(hex, amount) {
    const r = Math.max(0, Math.round(parseInt(hex.slice(1,3), 16) * (1 - amount)));
    const g = Math.max(0, Math.round(parseInt(hex.slice(3,5), 16) * (1 - amount)));
    const b = Math.max(0, Math.round(parseInt(hex.slice(5,7), 16) * (1 - amount)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function bannerGradient(hex) {
    return `linear-gradient(135deg, ${hex} 0%, ${darkenHex(hex, 0.12)} 100%)`;
}

const LISTINGS_STORAGE_KEY = 'apc.listings.v2';
const REMEMBER_ME_KEY = 'apc.rememberMe.v1';
const SEARCH_DEMAND_KEY = 'apc.searchDemand.v1';

function loadSearchDemand() {
    try { return JSON.parse(localStorage.getItem(SEARCH_DEMAND_KEY) || '[]'); } catch(e) { return []; }
}
function saveSearchDemand(data) {
    try { localStorage.setItem(SEARCH_DEMAND_KEY, JSON.stringify(data)); } catch(e) {}
}
let _lastRecordedSearch = '';
// source: 'marketplace' = buyer searching APC (site-wide demand) | 'stocklookup' = a yard's
// own phone-enquiry lookup (their private demand report). found: did the search return stock?
function recordSearch(term, opts = {}) {
    const source = opts.source || 'marketplace';
    const found  = (opts.found === undefined) ? null : !!opts.found;
    // make/model/part are stored only for stocklookup, so the My Yard report can group
    // by vehicle without re-parsing the term string (makes/models are often multi-word).
    const make  = opts.make  || null;
    const model = opts.model || null;
    const part  = opts.part  || null;
    const clean = (term || '').toLowerCase().trim();
    if (!clean || clean.length < 3) return;
    // Dedupe only marketplace typeahead spam — each yard enquiry is a distinct phone call.
    if (source === 'marketplace') {
        if (clean === _lastRecordedSearch) return;
        _lastRecordedSearch = clean;
    }
    const now = Date.now();
    const data = loadSearchDemand();
    data.push({ term: clean, ts: now, source, found, make, model, part, user_id: currentUserId || null });
    saveSearchDemand(data.filter(d => d.ts > Date.now() - 180 * 24 * 60 * 60 * 1000).slice(-3000));
    if (sb) {
        sb.from('search_demand')
            .insert({ term: clean, ts: new Date(now).toISOString(), user_id: currentUserId || null, source, found, make, model, part })
            .then(() => {});
    }
}

// A yard's own stock-lookup enquiry (typically a phone call). Recorded once results are
// known so we capture whether the yard could supply. Light dedupe stops a re-run/jump
// double-counting the same enquiry; a genuine later call logs as new demand.
let _lastYardEnquiry = { term: '', ts: 0 };
function recordYardEnquiry(term, found, ctx = {}) {
    const clean = (term || '').toLowerCase().trim();
    if (clean && clean === _lastYardEnquiry.term && Date.now() - _lastYardEnquiry.ts < 30000) return;
    _lastYardEnquiry = { term: clean, ts: Date.now() };
    recordSearch(term, { source: 'stocklookup', found, make: ctx.make, model: ctx.model, part: ctx.part });
}

async function getDemandReport(fromTs, toTs) {
    if (sb) {
        // APC-wide buyer demand via a SECURITY DEFINER aggregate — returns counts only,
        // never raw rows/user_ids. RLS keeps search_demand reads to a user's own rows
        // (the My Yard report), so the site-wide view MUST go through this RPC.
        const { data } = await sb.rpc('apc_demand_report', {
            from_ts: new Date(fromTs).toISOString(),
            to_ts:   new Date(toTs).toISOString(),
        });
        if (data?.length) return data.map(r => ({ term: r.term, count: Number(r.cnt) }));
    }
    const local = loadSearchDemand().filter(d => d.source !== 'stocklookup' && d.ts >= fromTs && d.ts <= toTs);
    const counts = {};
    local.forEach(d => { counts[d.term] = (counts[d.term] || 0) + 1; });
    return Object.entries(counts)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

// This yard's own enquiry log, grouped Make → Model → Part for the report drawer.
// Each node carries count / supplied / missed (found === false). misses[] is the flat
// "couldn't supply" shopping list. Aggregated client-side — fine for hundreds of rows;
// move the grouping into an RPC if a yard ever does thousands/month.
async function getYardEnquiryReport(fromTs, toTs) {
    let rows = [];
    if (sb && currentUserId) {
        const { data } = await sb.from('search_demand')
            .select('make, model, part, term, found')
            .eq('user_id', currentUserId).eq('source', 'stocklookup')
            .gte('ts', new Date(fromTs).toISOString())
            .lte('ts', new Date(toTs).toISOString());
        rows = data || [];
    }
    if (!rows.length) {
        rows = loadSearchDemand().filter(d =>
            d.source === 'stocklookup' && d.user_id === currentUserId && d.ts >= fromTs && d.ts <= toTs);
    }

    const makeMap = {}, missMap = {};
    let total = 0, supplied = 0;
    rows.forEach(d => {
        total++;
        const ok    = d.found === true;
        if (ok) supplied++;
        const make  = (d.make  || '—').trim() || '—';
        const model = (d.model || '—').trim() || '—';
        const part  = (d.part  || d.term || '—').trim() || '—';
        const M = makeMap[make]  || (makeMap[make] = { make, count: 0, supplied: 0, missed: 0, models: {} });
        M.count++; ok ? M.supplied++ : M.missed++;
        const Mo = M.models[model] || (M.models[model] = { model, count: 0, supplied: 0, missed: 0, parts: {} });
        Mo.count++; ok ? Mo.supplied++ : Mo.missed++;
        const P = Mo.parts[part]  || (Mo.parts[part] = { part, count: 0, supplied: 0, missed: 0 });
        P.count++; ok ? P.supplied++ : P.missed++;
        if (!ok) {
            const k = `${make}|${model}|${part}`;
            (missMap[k] || (missMap[k] = { make, model, part, count: 0 })).count++;
        }
    });

    const byCount = (a, b) => b.count - a.count;
    const makes = Object.values(makeMap).map(M => ({
        ...M,
        models: Object.values(M.models).map(Mo => ({
            ...Mo,
            parts: Object.values(Mo.parts).sort(byCount),
        })).sort(byCount),
    })).sort(byCount);
    const misses = Object.values(missMap).sort(byCount);
    return { total, supplied, missed: total - supplied, makes, misses };
}

// EDW_TAXONOMY is defined in taxonomy.js (loaded before script.js in index.html)


let userListings = loadUserListings();
let sellListingImages = [];

function getInitialUserListings() {
    return [];
}

function loadUserListings() {
    try {
        const raw = localStorage.getItem(LISTINGS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : getInitialUserListings();
    } catch (e) {
        return getInitialUserListings();
    }
}
function saveUserListings() {
    try { localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(userListings)); } catch (e) {}
}

// --- SUPABASE LISTINGS SYNC ---

function compressBase64(base64, maxPx, quality) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxPx || h > maxPx) {
                if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
                else { w = Math.round(w * maxPx / h); h = maxPx; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

function thumbUrl(src, width = 800) {
    if (!src || !src.includes('/storage/v1/object/public/')) return src;
    return src.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&quality=70`;
}

async function uploadListingImagesToStorage(listingUUID, base64Images) {
    const urls = [];
    let newCount = 0;
    for (let i = 0; i < base64Images.length; i++) {
        const b64 = base64Images[i];
        if (!b64 || !b64.startsWith('data:')) { urls.push(b64); continue; }
        try {
            const compressed = await compressBase64(b64, 1600, 0.88);
            const res = await fetch(compressed);
            const blob = await res.blob();
            // Use a timestamp-based path so new uploads never collide with
            // surviving images that already occupy 0.jpg, 1.jpg, etc.
            const path = `${listingUUID}/${Date.now()}_${newCount++}.jpg`;
            const { error } = await sb.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (error) { showToast('Storage error: ' + error.message); continue; }
            const { data } = sb.storage.from('listing-images').getPublicUrl(path);
            urls.push(data.publicUrl);
        } catch (e) { showToast('Storage exception: ' + (e.message || e)); }
    }
    return urls.filter(Boolean);
}

async function syncListingToSupabase(localListing) {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) return;

        const row = {
            seller_id: session.user.id,
            title: localListing.title,
            category: localListing.category,
            price: localListing.price,
            condition: localListing.condition || 'used',
            description: localListing.description || null,
            location: localListing.loc,
            postcode: localListing.postcode || null,
            pickup: !!localListing.pickup,
            postage: !!localListing.postage,
            open_to_offers: !!localListing.openToOffers,
            status: localListing.status || 'active',
            sold_at: localListing.status === 'sold'
                ? (localListing.soldDate ? new Date(localListing.soldDate).toISOString() : new Date().toISOString())
                : null,
            is_pro: !!localListing.isPro,
            stock_number: localListing.stockNumber || null,
            odometer: localListing.odometer || null,
            chassis_vin: localListing.chassisVin || null,
            warehouse_bin: localListing.warehouseBin || null,
            quantity: localListing.quantity || 1,
            apc_id: localListing.apcId || null,
            fitting_available: !!localListing.fit,
            fits_year: localListing.year || null,
            variant: localListing.variant || null,
            seller_name: localListing.seller || null,
        };

        let listingId;
        if (localListing.supabaseId) {
            const { error } = await sb.from('listings').update(row).eq('id', localListing.supabaseId);
            if (error) { showToast('Sync error: ' + error.message); return; }
            listingId = localListing.supabaseId;
        } else {
            const { data, error } = await sb.from('listings').insert(row).select('id').single();
            if (error) { showToast('Sync error: ' + error.message); return; }
            listingId = data.id;
            localListing.supabaseId = listingId;
            saveUserListings();
        }

        // Upload images + vehicle fits in the background — don't block the UI
        const base64Images = localListing.images || [];
        const hasBase64 = base64Images.some(img => img?.startsWith('data:'));
        if (hasBase64) {
            uploadListingImagesToStorage(listingId, base64Images).then(async urls => {
                if (!urls.length) return;
                await sb.from('listing_images').delete().eq('listing_id', listingId);
                await sb.from('listing_images').insert(
                    urls.map((url, i) => ({ listing_id: listingId, storage_path: url, position: i }))
                );
                localListing.images = urls;
                saveUserListings();
            }).catch(e => showToast('Image sync error: ' + (e.message || e)));
        }

        if (localListing.fits?.length) {
            sb.from('listing_vehicles').delete().eq('listing_id', listingId).then(() =>
                sb.from('listing_vehicles').insert(
                    localListing.fits.map(f => ({ listing_id: listingId, make: f.make, model: f.model, series: f.variant || null }))
                )
            ).catch(e => console.warn('Vehicle fits sync:', e));
        }
    } catch (e) { showToast('Sync error: ' + (e.message || e)); }
}

let _marketplaceTotal = null; // total active/pending listings (for the "X of Y" counter)
async function _loadMarketplaceTotal() {
    if (!sb) return;
    const { count } = await sb.from('listings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'pending']);
    if (typeof count === 'number') { _marketplaceTotal = count; renderMainGrid(); }
}

async function loadPublicListingsFromSupabase(append = false) {
    if (_listingsLoading) return;
    _listingsLoading = true;

    if (!append) {
        _listingsCursor    = null;
        _listingsExhausted = false;
    }

    const spinner = document.getElementById('gridLoadingSpinner');
    if (spinner) spinner.style.display = append ? 'flex' : 'none';

    try {
        let query = sb
            .from('listings')
            .select('*, listing_images(storage_path, position), listing_vehicles(make, model, series)')
            .in('status', ['active', 'pending'])
            .order('created_at', { ascending: false })
            .limit(20);

        // Own listings come from userListings (loaded separately). Excluding them here
        // stops pagination from burning whole pages on the signed-in seller's own —
        // often the newest — stock, which left the grid showing only their own parts.
        if (currentUserId) query = query.neq('seller_id', currentUserId);

        if (append && _listingsCursor) {
            query = query.lt('created_at', _listingsCursor);
        }

        const { data: rows, error } = await query;
        if (error) { renderMainGrid(); return; }

        if (rows && rows.length > 0) {
            _listingsCursor = rows[rows.length - 1].created_at;
        }
        if (!rows || rows.length < 20) _listingsExhausted = true;

        // Batch-fetch current display names, profile pics, visibility status, and seller ratings
        const sellerIds = [...new Set((rows || []).map(r => r.seller_id).filter(Boolean))];
        let nameMap = {};
        if (sellerIds.length) {
            const [{ data: profiles }, { data: ratings }] = await Promise.all([
                sb.from('public_profiles').select('id, display_name, business_name, avatar_url, is_public').in('id', sellerIds),
                sb.from('seller_ratings').select('seller_id, stars').in('seller_id', sellerIds),
            ]);
            (profiles || []).forEach(p => {
                const nm = p.business_name || p.display_name;
                if (nm) nameMap[p.id] = nm;
                if (p.avatar_url)   _sellerPicCache[p.id] = p.avatar_url;
                if (p.is_public === false) _hiddenSellerIds.add(p.id);
                else _hiddenSellerIds.delete(p.id);
            });
            if (ratings?.length) {
                const grouped = {};
                ratings.forEach(r => {
                    if (!grouped[r.seller_id]) grouped[r.seller_id] = [];
                    grouped[r.seller_id].push(r.stars);
                });
                Object.entries(grouped).forEach(([sid, stars]) => {
                    const avg = stars.reduce((a, b) => a + b, 0) / stars.length;
                    _sellerRatingCache[sid] = { avg: Math.round(avg * 10) / 10, count: stars.length };
                });
            }
        }

        let newCount = 0;
        (rows || []).forEach(r => {
            const liveName = nameMap[r.seller_id] || r.seller_name || 'Seller';
            const existPub = partDatabase.find(p => p.supabaseId === r.id);
            if (existPub) { existPub.seller = liveName; return; }
            const existUser = userListings.find(l => l.supabaseId === r.id);
            if (existUser) { existUser.seller = liveName; return; }
            const images = (r.listing_images || [])
                .sort((a, b) => a.position - b.position)
                .map(img => img.storage_path).filter(Boolean);
            const fits = (r.listing_vehicles || []).map(v => ({ make: v.make, model: v.model, ...(v.series ? { variant: v.series } : {}) }));
            partDatabase.push({
                id: nextPartId(), supabaseId: r.id, sellerId: r.seller_id,
                saves: r.saves_count || 0,
                date: new Date(r.created_at).getTime(),
                apcId: r.apc_id, title: r.title, category: r.category,
                price: r.price, condition: r.condition,
                description: r.description, loc: r.location,
                postcode: r.postcode, pickup: r.pickup, postage: r.postage,
                openToOffers: r.open_to_offers, isPro: r.is_pro,
                stockNumber: r.stock_number, odometer: r.odometer, chassisVin: r.chassis_vin || null,
                warehouseBin: r.warehouse_bin, quantity: r.quantity || 1,
                fit: r.fitting_available, year: r.fits_year,
                variant: r.variant || null,
                seller: nameMap[r.seller_id] || r.seller_name || 'Seller',
                status: r.status === 'active' ? undefined : r.status,
                images: images.length ? images : [], fits,
            });
            newCount++;
        });

        // If every row was a duplicate, we've caught up — stop fetching
        if (append && newCount === 0) _listingsExhausted = true;

        renderMainGrid();
        // If the storefront opened before listings arrived (deep-link), refresh its grid now
        const _sfDrawer = document.getElementById('storefrontDrawer');
        if (_sfDrawer?.classList.contains('active')) {
            const _sfGrid = document.getElementById('sellerPartsGrid');
            if (_sfGrid) {
                const _sfUserId = _sfGrid.dataset.userId || '';
                const _sfSeller = currentStorefrontSeller || '';
                const _sfParts  = getAllParts().filter(p =>
                    _sfUserId ? (p.sellerId === _sfUserId || p.seller === _sfSeller) : p.seller === _sfSeller
                );
                _sfGrid.innerHTML = _sfParts.map(p => buildCardHTML(p)).join('');
                _sfUpdatePartsVisibility();
                const _sfListEl = document.getElementById('sfStatListings');
                const _sfSaveEl = document.getElementById('sfStatSaves');
                if (_sfListEl) _sfListEl.textContent = _sfParts.length;
                if (_sfSaveEl) _sfSaveEl.textContent = _sfParts.reduce((s, p) => s + (p.saves || 0), 0);
            }
        }
        if (!append) {
            _loadMarketplaceTotal();
            refreshInboxThreadHeader();
            if (_pendingStoreOpen) {
                const sid = _pendingStoreOpen;
                _pendingStoreOpen = null;
                openStorefrontByUserId(sid);
            }
            if (_pendingItemOpen) {
                const iid = _pendingItemOpen;
                _pendingItemOpen = null;
                openItemDetail(iid);
            }
        }
    } catch (e) {
        console.warn('Load public listings:', e);
        renderMainGrid();
    } finally {
        _listingsLoading = false;
        if (spinner) spinner.style.display = 'none';
    }
}

async function loadUserListingsFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('listings')
            .select('*, listing_images(storage_path, position), listing_vehicles(make, model, series)')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false });
        if (error) { showToast('Fetch error: ' + error.message); return; }

        // Remove local listings that were deleted from Supabase
        const supabaseIds = new Set((rows || []).map(r => r.id));
        const hadCount = userListings.length;
        userListings.splice(0, userListings.length,
            ...userListings.filter(l => !l.supabaseId || supabaseIds.has(l.supabaseId))
        );
        if (userListings.length !== hadCount) { saveUserListings(); renderMainGrid(); renderMyParts(); }

        if (!rows?.length) return;

        rows.forEach(r => {
            const images = (r.listing_images || [])
                .sort((a, b) => a.position - b.position)
                .map(img => img.storage_path)
                .filter(Boolean);
            const fits = (r.listing_vehicles || []).map(v => ({ make: v.make, model: v.model, ...(v.series ? { variant: v.series } : {}) }));
            const existing = userListings.find(l => l.supabaseId === r.id)
                || (r.apc_id && userListings.find(l => !l.supabaseId && l.apcId === r.apc_id))
                || (!r.apc_id && userListings.find(l => !l.supabaseId && !l.apcId && l.title === r.title && Number(l.price) === Number(r.price)));

            if (existing) {
                if (!existing.supabaseId) { existing.supabaseId = r.id; }
                Object.assign(existing, {
                    title: r.title, category: r.category, price: r.price,
                    condition: r.condition, description: r.description,
                    loc: r.location, postcode: r.postcode,
                    pickup: r.pickup, postage: r.postage,
                    openToOffers: r.open_to_offers,
                    status: r.status === 'active' ? undefined : r.status,
                    isPro: r.is_pro, stockNumber: r.stock_number,
                    odometer: r.odometer, chassisVin: r.chassis_vin || null,
                    warehouseBin: r.warehouse_bin,
                    quantity: r.quantity || 1, apcId: r.apc_id,
                    fit: r.fitting_available, year: r.fits_year,
                    variant: r.variant || null,
                    saves: r.saves_count || 0, sellerId: r.seller_id, fits,
                    seller: getPublicSellerName(),
                    ...(images.length ? { images } : {}),
                });
            } else {
                userListings.push({
                    id: nextPartId(), supabaseId: r.id, sellerId: r.seller_id,
                    saves: r.saves_count || 0,
                    date: new Date(r.created_at).getTime(),
                    apcId: r.apc_id, title: r.title, category: r.category,
                    price: r.price, condition: r.condition,
                    description: r.description, loc: r.location,
                    postcode: r.postcode, pickup: r.pickup, postage: r.postage,
                    openToOffers: r.open_to_offers,
                    status: r.status === 'active' ? undefined : r.status,
                    isPro: r.is_pro, stockNumber: r.stock_number,
                    odometer: r.odometer, chassisVin: r.chassis_vin || null,
                    warehouseBin: r.warehouse_bin,
                    quantity: r.quantity || 1, fit: r.fitting_available,
                    year: r.fits_year, variant: r.variant || null,
                    seller: getPublicSellerName(),
                    images: images.length ? images : [], fits,
                });
            }
        });

        saveUserListings();
        renderMainGrid();
        renderMyParts();
        refreshInboxThreadHeader();

        // If the storefront is open for this user, refresh it now that listings are loaded
        const sfGrid   = document.getElementById('sellerPartsGrid');
        const sfDrawer = document.getElementById('storefrontDrawer');
        if (sfDrawer?.classList.contains('active') && sfGrid?.dataset.userId === userId) {
            const sellerName = sfGrid.dataset.seller || '';
            const parts = getAllParts().filter(p => p.sellerId === userId || p.seller === sellerName);
            sfGrid.innerHTML = parts.map(p => buildCardHTML(p)).join('');
            _sfUpdatePartsVisibility();
            const listEl = document.getElementById('sfStatListings');
            const saveEl = document.getElementById('sfStatSaves');
            if (listEl) listEl.textContent = parts.length;
            if (saveEl) saveEl.textContent = parts.reduce((s, p) => s + (p.saves || 0), 0);
        }
    } catch (e) { showToast('Load error: ' + (e.message || e)); }
}

// ── SUPABASE MESSAGES ─────────────────────────────────────────
function timeAgo(ms) {
    const d = Math.floor((Date.now() - ms) / 1000);
    if (d < 120)   return 'Posted just now';
    if (d < 3600)  return `Posted ${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `Posted ${Math.floor(d / 3600)}h ago`;
    const days = Math.floor(d / 86400);
    if (days < 7)  return `Posted ${days} day${days !== 1 ? 's' : ''} ago`;
    const wks = Math.floor(days / 7);
    if (wks < 5)   return `Posted ${wks} week${wks !== 1 ? 's' : ''} ago`;
    const mths = Math.floor(days / 30);
    return `Posted ${mths} month${mths !== 1 ? 's' : ''} ago`;
}
function formatMsgDate(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-AU', { weekday: 'short' });
}
function formatMsgTime(isoString) {
    const d = new Date(isoString);
    let h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

async function ensureSupabaseConversation(conv) {
    if (conv.supabaseConvId) return true;

    // Always use a fresh session UUID — avoids stale currentUserId after token refresh
    const { data: { session } } = await sb.auth.getSession();
    const buyerId = session?.user?.id;
    if (!buyerId) { console.warn('ensureConv: no session'); return false; }

    // General enquiry path: listing_id is null, use conv.sellerId directly
    if (conv.partId === 'general') {
        const sellerId = conv.sellerId;
        if (!sellerId) {
            console.warn('ensureConv: general enquiry missing sellerId', { conv });
            showToast('Error: could not identify seller — please try again.');
            return false;
        }
        if (buyerId === sellerId) { console.warn('ensureConv: self-message blocked'); return false; }

        console.log('ensureConv general enquiry — buyerId:', buyerId, 'sellerId:', sellerId);

        // listing_id stays null — RLS ties it to the listing's seller.
        // ref_listing_id carries the optional listing reference without ownership constraints.
        const { data: existing } = await sb.from('conversations')
            .select('id').is('listing_id', null)
            .eq('buyer_id', buyerId).eq('seller_id', sellerId).maybeSingle();
        if (existing) {
            conv.supabaseConvId = existing.id;
            conv.buyerId = buyerId;
            saveConversations();
            return true;
        }

        const { data, error } = await sb.from('conversations').insert({
            listing_id: null,
            ref_listing_id: conv.refListingId || null,
            buyer_id: buyerId,
            seller_id: sellerId,
            buyer_name: currentUserName,
            seller_name: conv.with || null,
            listing_title: conv.refListingTitle || 'General Enquiry',
            unread_buyer: false,
            unread_seller: true,
        }).select('id').single();

        if (error) {
            console.warn('Conv sync error (general enquiry):', error.message, error.code, error.details, error.hint);
            showToast('Error: ' + error.message);
            return false;
        }
        conv.supabaseConvId = data.id;
        conv.buyerId = buyerId;
        saveConversations();
        return true;
    }

    const part = findPartAnywhere(conv.partId);
    if (!part?.supabaseId || !part.sellerId) {
        console.warn('ensureConv: part missing data', { partId: conv.partId, found: !!part, supabaseId: part?.supabaseId, sellerId: part?.sellerId });
        return false;
    }

    // Seller cannot be their own buyer
    if (buyerId === part.sellerId) { console.warn('ensureConv: self-message blocked'); return false; }

    // Conversation may already exist in Supabase (duplicate key guard)
    const { data: existing } = await sb.from('conversations')
        .select('id')
        .eq('listing_id', part.supabaseId)
        .eq('buyer_id', buyerId)
        .maybeSingle();
    if (existing) {
        conv.supabaseConvId = existing.id;
        conv.buyerId = buyerId;
        saveConversations();
        return true;
    }

    const { data, error } = await sb.from('conversations').insert({
        listing_id: part.supabaseId,
        buyer_id: buyerId,
        seller_id: part.sellerId,
        buyer_name: currentUserName,
        seller_name: part.seller || null,
        listing_title: part.title,
        unread_buyer: false,
        unread_seller: true,
    }).select('id').single();

    if (error) {
        console.warn('Conv sync error:', error.message, { buyerId, sellerId: part.sellerId });
        if (error.message?.includes('foreign key')) {
            // FK violation — likely the seller re-created their account (UUID changed)
            // so the listing's seller_id is stale. The seller needs to re-post the listing.
            showToast("Can't message this listing — the seller may need to re-post it.");
        } else {
            showToast('Sync error: ' + error.message);
        }
        return false;
    }
    conv.supabaseConvId = data.id;
    conv.buyerId = buyerId;
    saveConversations();
    return true;
}

async function syncNewConversationToSupabase(conv) {
    const ok = await ensureSupabaseConversation(conv);
    if (!ok) {
        showToast("Message saved locally — couldn't reach the server. Re-open the conversation to retry.");
        return;
    }
    const firstMsg = conv.msgs[0];
    if (firstMsg && !firstMsg.offerCard) {
        const { error: msgErr } = await sb.from('messages').insert({
            conversation_id: conv.supabaseConvId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            text: firstMsg.text,
        });
        if (msgErr) console.warn('syncNewConv message insert:', msgErr.message);
        // Update last_message_at so this conversation sorts to the top for the recipient
        const { error: convErr } = await sb.from('conversations').update({
            last_message_at: new Date().toISOString(),
            unread_buyer: false,
            unread_seller: true,
        }).eq('id', conv.supabaseConvId);
        if (convErr) console.warn('syncNewConv conv update:', convErr.message);
    }
}

async function syncOfferMessageToSupabase(conv, offerText, offerData) {
    const ok = await ensureSupabaseConversation(conv);
    if (!ok) return;
    const { error: msgErr } = await sb.from('messages').insert({
        conversation_id: conv.supabaseConvId,
        sender_id: currentUserId,
        sender_name: currentUserName,
        text: offerText,
        offer_data: offerData,
    });
    if (msgErr) console.warn('syncOfferMsg insert:', msgErr.message);
    const { error: convErr } = await sb.from('conversations').update({
        last_message_at: new Date().toISOString(),
        unread_buyer: false,
        unread_seller: true,
    }).eq('id', conv.supabaseConvId);
    if (convErr) console.warn('syncOfferMsg conv update:', convErr.message);
}

async function syncPhotoMessageToSupabase(conv, base64, isBuyer) {
    const ok = await ensureSupabaseConversation(conv);
    if (!ok || !currentUserId) return;
    const supabaseConvId = conv.supabaseConvId;
    try {
        // Convert base64 to blob and upload
        const res = await fetch(base64);
        const blob = await res.blob();
        const path = `chat/${supabaseConvId}/${Date.now()}.jpg`;
        const { error: upErr } = await sb.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (upErr) { showToast('Photo upload failed: ' + upErr.message); return; }
        const { data: { publicUrl } } = sb.storage.from('listing-images').getPublicUrl(path);

        await sb.from('messages').insert({
            conversation_id: supabaseConvId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            text: '',
            photo_url: publicUrl,
        });
        await sb.from('conversations').update({
            last_message_at: new Date().toISOString(),
            unread_buyer: !isBuyer,
            unread_seller: !!isBuyer,
        }).eq('id', supabaseConvId);
    } catch(e) { console.warn('Photo msg sync:', e); }
}

async function syncMessageToSupabase(supabaseConvId, text, isBuyer) {
    if (!currentUserId || !supabaseConvId) return;
    const { error } = await sb.from('messages').insert({
        conversation_id: supabaseConvId,
        sender_id: currentUserId,
        sender_name: currentUserName,
        text,
    });
    if (error) throw new Error(error.message);
    await sb.from('conversations').update({
        last_message_at: new Date().toISOString(),
        unread_buyer: !isBuyer,
        unread_seller: !!isBuyer,
    }).eq('id', supabaseConvId);
}

async function loadConversationsFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('conversations')
            .select('*, messages(id, sender_id, sender_name, text, photo_url, offer_data, is_auto_reply, created_at)')
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) { console.warn('Load conversations error:', error.message); subscribeToRealtimeMessages(); subscribeToRealtimeListings(); return; }

        const visibleRows = (rows || []).filter(r =>
            r.buyer_id === userId ? !r.hidden_by_buyer : !r.hidden_by_seller
        );

        // Resolve the other party's current name from their profile (business name preferred)
        // so the thread list never shows a stale snapshot or a literal "Seller".
        const otherIds = [...new Set(visibleRows
            .map(r => (r.buyer_id === userId ? r.seller_id : r.buyer_id))
            .filter(Boolean))];
        let convNameMap = {};
        if (otherIds.length) {
            const { data: profs } = await sb.from('public_profiles')
                .select('id, display_name, business_name').in('id', otherIds);
            (profs || []).forEach(p => { const nm = p.business_name || p.display_name; if (nm) convNameMap[p.id] = nm; });
        }

        visibleRows.forEach(r => {
            const isBuyer = r.buyer_id === userId;
            const otherId = isBuyer ? r.seller_id : r.buyer_id;
            const otherName = convNameMap[otherId]
                || (isBuyer ? r.seller_name : r.buyer_name)
                || (isBuyer ? 'Seller' : 'Buyer');
            const msgs = (r.messages || [])
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((m, idx) => ({
                    id: idx + 1,
                    supabaseMsgId: m.id,
                    sent: m.sender_id === userId,
                    text: m.text || '',
                    ...(m.photo_url  ? { photo: m.photo_url }       : {}),
                    ...(m.offer_data ? { offerCard: m.offer_data }   : {}),
                    time: formatMsgDate(m.created_at),
                    clock: formatMsgTime(m.created_at),
                    ...(m.is_auto_reply ? { isAutoReply: true } : {}),
                }));

            // If flagged unread but the last message was sent by this user, they've clearly read it — auto-clear
            let isUnread = isBuyer ? !!r.unread_buyer : !!r.unread_seller;
            if (isUnread && msgs.length > 0 && msgs[msgs.length - 1].sent) {
                isUnread = false;
                sb.from('conversations')
                  .update(isBuyer ? { unread_buyer: false } : { unread_seller: false })
                  .eq('id', r.id).then(() => {});
            }

            const existing = conversations.find(c => c.supabaseConvId === r.id);
            if (existing) {
                existing.msgs = msgs;
                existing.with = otherName;
                // Don't restore unread from Supabase if already locally cleared — avoids race where
                // the reload completes before our own unread_buyer/seller update has committed.
                existing.unread = existing.unread && isUnread;
                existing.buyerId    = r.buyer_id    || existing.buyerId    || null;
                existing.sellerId   = r.seller_id   || existing.sellerId   || null;
                existing.buyerName  = r.buyer_name  || existing.buyerName  || '';
                existing.sellerName = r.seller_name || existing.sellerName || '';
                if (r.listing_id) existing.partId = r.listing_id;
                if (r.ref_listing_id) existing.refListingId = r.ref_listing_id;
            } else {
                const part = [...partDatabase, ...userListings].find(p => p.supabaseId === r.listing_id);
                conversations.unshift({
                    id: nextConvId(),
                    supabaseConvId: r.id,
                    buyerId: r.buyer_id,
                    sellerId: r.seller_id,
                    with: otherName,
                    buyerName:  r.buyer_name  || '',
                    sellerName: r.seller_name || '',
                    isPro: false,
                    unread: isUnread,
                    partId: r.listing_id || part?.id,
                    partTitle: r.listing_title || 'Part',
                    refListingId: r.ref_listing_id || null,
                    msgs,
                });
            }
        });

        saveConversations();
        renderInboxConvList();
        updateInboxBadge();
        proRefreshIfOpen();
        refreshInboxThreadHeader(); // correct header if auto-selected before data loaded
        // Source-level fix for the not-loaded preview bug: batch-load every listing these
        // conversations reference (one query) so all chat surfaces resolve it reliably —
        // not just the ones with per-surface fetch fallbacks.
        _preloadListings(conversations.map(c => c.partId)).then(added => {
            if (added) { renderInboxConvList(); if (activeConvId) openInboxConv(activeConvId); proRefreshIfOpen(); }
        });
    } catch (e) { console.warn('Load conversations:', e); }
    subscribeToRealtimeMessages();
    subscribeToRealtimeListings();
}

// ── SUPABASE: VEHICLES, WANTED, SAVED LISTINGS ───────────────
async function loadVehiclesFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('vehicles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
        if (error) { console.warn('vehicles load:', error.message); return; }

        (rows || []).forEach(r => {
            const existing = myVehicles.find(v => v.supabaseId === r.id);
            if (existing) {
                Object.assign(existing, {
                    make: r.make || '', model: r.model || '', year: r.year || '',
                    variant: r.variant || '', engineCode: r.engine_code || '',
                    nickname: r.nickname || '', vin: r.vin || ''
                });
            } else {
                myVehicles.push({
                    id: nextVehicleId(),
                    supabaseId: r.id,
                    make: r.make || '', model: r.model || '', year: r.year || '',
                    variant: r.variant || '', engineCode: r.engine_code || '',
                    nickname: r.nickname || '', vin: r.vin || ''
                });
            }
        });

        // Push any pre-existing local vehicles that have no supabaseId yet
        const unsynced = myVehicles.filter(v => !v.supabaseId);
        for (const v of unsynced) {
            const { data, error: e } = await sb.from('vehicles').insert({
                user_id: userId, make: v.make, model: v.model, year: String(v.year || ''),
                variant: v.variant || '', engine_code: v.engineCode || null,
                nickname: v.nickname || '', vin: v.vin || ''
            }).select('id').single();
            if (!e && data) v.supabaseId = data.id;
        }

        saveVehicles();
        renderGarage();
    } catch (e) { console.warn('loadVehiclesFromSupabase:', e); }
}

async function loadWantedFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('wanted_parts')
            .select('*')
            .eq('user_id', userId)
            .order('id', { ascending: true });
        if (error) { console.warn('wanted_parts load:', error.message); return; }

        (rows || []).forEach(r => {
            const existing = myWanted.find(w => w.supabaseId === r.id);
            if (existing) {
                Object.assign(existing, {
                    partName: r.part_name || r.title || '', make: r.make || '', model: r.model || '',
                    year: r.year ? String(r.year) : '', maxPrice: r.max_price || r.budget_max || null,
                    category: r.category || '', mutedNotifications: !!r.muted_notifications
                });
            } else {
                myWanted.push({
                    id: nextWantedId(),
                    supabaseId: r.id,
                    partName: r.part_name || r.title || '',
                    make: r.make || '', model: r.model || '',
                    year: r.year ? String(r.year) : '',
                    maxPrice: r.max_price || r.budget_max || null,
                    category: r.category || '',
                    mutedNotifications: !!r.muted_notifications,
                    createdAt: new Date().toISOString()
                });
            }
        });

        // Push any pre-existing local wanted parts with no supabaseId
        const unsynced = myWanted.filter(w => !w.supabaseId);
        for (const w of unsynced) {
            const { data, error: e } = await sb.from('wanted_parts').insert({
                user_id: userId, title: w.partName || '', part_name: w.partName || '',
                status: 'active', make: w.make || '', model: w.model || '',
                year: w.year ? Number(w.year) : null,
                max_price: w.maxPrice || null, budget_max: w.maxPrice || null,
                category: w.category || '', muted_notifications: !!w.mutedNotifications
            }).select('id').single();
            if (!e && data) w.supabaseId = data.id;
        }

        saveWanted();
        if (document.getElementById('wantedListDrawer')?.classList.contains('active')) renderWantedList();
    } catch (e) { console.warn('loadWantedFromSupabase:', e); }
}

async function loadPublicWantedFromSupabase() {
    if (!sb) return;
    try {
        const excludeId = currentUserId || '00000000-0000-0000-0000-000000000000';
        const { data: rows, error } = await sb
            .from('wanted_parts')
            .select('id, user_id, part_name, title, make, model, year, max_price, budget_max, category, created_at')
            .neq('user_id', excludeId)
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) { console.warn('public wanted load:', error.message); return; }
        if (!rows?.length) { publicWantedDatabase.splice(0); return; }

        const userIds = [...new Set(rows.map(r => r.user_id))];
        const { data: profiles } = await sb.from('public_profiles')
            .select('id, display_name, business_name, is_pro, tier, location')
            .in('id', userIds);
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

        publicWantedDatabase.splice(0);
        rows.forEach(r => {
            const prof = profileMap[r.user_id] || {};
            publicWantedDatabase.push({
                id: r.id,
                partName: r.part_name || r.title || '',
                make: r.make || '',
                model: r.model || '',
                year: r.year ? String(r.year) : '',
                maxPrice: r.max_price || r.budget_max || null,
                category: r.category || '',
                isPro: prof.tier === 'pro' || prof.is_pro || false,
                loc: prof.location || '',
                posted: new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
                userId: r.user_id,
                buyer: bizDisplayName(prof, 'Member'),
                sellerName: bizDisplayName(prof, ''),
            });
        });
    } catch (e) { console.warn('loadPublicWantedFromSupabase:', e); }
}

function _workshopRowToObj(p) {
    const wd = p.workshop_data || {};
    const activeKeys = Object.entries(wd.services || {}).filter(([, v]) => v).map(([k]) => k);
    const topLabels  = activeKeys.slice(0, 3).map(k => SERVICE_LABELS[k] || k);
    return {
        id:           p.id,
        userId:       p.id,
        name:         p.business_name || p.display_name || 'Workshop',
        logo:         p.avatar_url || '',
        location:     p.location || '',
        postcode:     p.postcode || '',
        address:      p.workshop_address || '',
        phone:         wd.phone    || '',
        email:         wd.email    || '',
        website:       wd.website  || '',
        businessHours: wd.business_hours || null,
        about:         p.about     || '',
        serviceKeys:  activeKeys,
        vehicleTypes: wd.vehicles || [],
        specialty:    topLabels.join(' · ') || 'Workshop Services',
        distance:     p.location || '',
        rating:       null,
    };
}

const _workshopById = new Map();  // per-ID cache for on-demand lookups
let   _workshopLoadState = 'idle'; // 'idle' | 'loading' | 'loaded'

async function ensureWorkshopsLoaded() {
    if (_workshopLoadState === 'loaded' || workshopDatabase.length > 0) return;
    if (_workshopLoadState === 'loading') {
        // Wait for the in-flight load to finish
        await new Promise(r => { const t = setInterval(() => { if (_workshopLoadState !== 'loading') { clearInterval(t); r(); } }, 50); });
        return;
    }
    await loadWorkshopDatabase();
}

async function fetchWorkshopById(id) {
    if (!id || !sb) return null;
    // Already in full cache or per-ID cache
    const inDb = workshopDatabase.find(w => w.id === id);
    if (inDb) return inDb;
    if (_workshopById.has(id)) return _workshopById.get(id);
    try {
        const { data } = await sb.from('public_profiles')
            .select('id, display_name, business_name, location, postcode, avatar_url, about, workshop_data, workshop_address')
            .eq('id', id).single();
        if (!data?.workshop_data) return null;
        const ws = _workshopRowToObj(data);
        _workshopById.set(id, ws);
        return ws;
    } catch { return null; }
}

async function loadWorkshopDatabase() {
    if (!sb) return;
    _workshopLoadState = 'loading';
    try {
        const { data, error } = await sb.from('public_profiles')
            .select('id, display_name, business_name, location, postcode, avatar_url, about, workshop_data, workshop_address')
            .or('tier.in.(trade,pro),is_pro.eq.true')
            .not('workshop_data', 'is', null)
            .neq('is_public', false)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) { console.warn('loadWorkshopDatabase:', error.message); _workshopLoadState = 'idle'; return; }
        workshopDatabase.splice(0);
        (data || []).forEach(p => {
            const ws = _workshopRowToObj(p);
            if (!ws.serviceKeys.length && !ws.vehicleTypes.length) return;
            workshopDatabase.push(ws);
        });
        _workshopLoadState = 'loaded';
    } catch (e) { console.warn('loadWorkshopDatabase:', e); _workshopLoadState = 'idle'; }
}

async function loadSavedListingsFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('saved_listings')
            .select('listing_id')
            .eq('user_id', userId)
            .limit(500);
        if (error) { console.warn('saved_listings load:', error.message); return; }
        if (!rows?.length) return;

        let changed = false;
        rows.forEach(r => {
            if (!savedParts.has(r.listing_id)) {
                savedParts.add(r.listing_id);
                changed = true;
            }
        });
        if (changed) {
            persistSavedParts();
            renderMainGrid();
            if (document.getElementById('savedPartsDrawer')?.classList.contains('active')) renderSavedParts();
        }
        // Load any saved listings that haven't paged into the feed (e.g. another seller's
        // part you saved) so the Saved tab shows them all, not just what happened to load.
        _preloadListings([...savedParts]).then(added => {
            if (added) {
                renderMainGrid();
                if (document.getElementById('savedPartsDrawer')?.classList.contains('active')) renderSavedParts();
            }
        });
    } catch (e) { console.warn('loadSavedListingsFromSupabase:', e); }
}

// ── NOTIFICATIONS (buyer side) ────────────────────────────────
async function loadNotificationsFromSupabase() {
    if (!sb || !currentUserId) return;
    try {
        const { data, error } = await sb
            .from('notifications')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) { console.warn('notifications load:', error.message); return; }
        myNotifications = data || [];
        renderNotificationBadge();
        // Refresh wanted list if it's open so match banners appear
        if (document.getElementById('wantedListDrawer')?.classList.contains('active')) renderWantedList();
    } catch (e) { console.warn('loadNotificationsFromSupabase:', e); }
}

function renderNotificationBadge() {
    const unread = myNotifications.filter(n => !n.read).length;
    const badge  = document.getElementById('navNotifBadge');
    if (badge) {
        badge.style.display = unread > 0 ? 'flex' : 'none';
        badge.textContent   = unread > 9 ? '9+' : String(unread);
    }
}

async function markNotificationRead(notifId) {
    myNotifications = myNotifications.map(n => n.id === notifId ? { ...n, read: true } : n);
    renderNotificationBadge();
    updateInboxBadge();
    if (sb) await sb.from('notifications').update({ read: true }).eq('id', notifId);
}

async function dismissNotification(notifId) {
    myNotifications = myNotifications.filter(n => n.id !== notifId);
    renderNotificationBadge();
    if (sb) await sb.from('notifications').delete().eq('id', notifId);
    renderWantedList();
}

// ── SUPABASE REALTIME ─────────────────────────────────────────
let _realtimeChannel = null;

function subscribeToRealtimeMessages() {
    if (!currentUserId) return;
    if (_realtimeChannel) { sb.removeChannel(_realtimeChannel); _realtimeChannel = null; }

    _realtimeChannel = sb.channel('inbox-' + currentUserId)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages' },
            (payload) => {
                const msg = payload.new;
                if (!msg?.offer_data) return;
                for (const conv of conversations) {
                    const localMsg = conv.msgs.find(m => m.supabaseMsgId === msg.id);
                    if (localMsg?.offerCard) {
                        localMsg.offerCard = msg.offer_data;
                        saveConversations();
                        if (activeConvId === conv.id) renderInboxMsgs(conv);
                        renderInboxConvList();
                        break;
                    }
                }
            }
        )
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async (payload) => {
                const msg = payload.new;
                if (!msg) return;
                if (msg.sender_id === currentUserId) return; // own message already shown

                let conv = conversations.find(c => c.supabaseConvId === msg.conversation_id);
                if (!conv) {
                    // New conversation the recipient hasn't loaded yet — fetch and create it
                    const { data: convRow } = await sb.from('conversations')
                        .select('id, buyer_id, seller_id, listing_id, listing_title, buyer_name, seller_name, last_message_at, unread_buyer, unread_seller')
                        .eq('id', msg.conversation_id).single();
                    if (!convRow) return;
                    const isBuyer = convRow.buyer_id === currentUserId;
                    const otherId = isBuyer ? convRow.seller_id : convRow.buyer_id;
                    let otherName = isBuyer ? (convRow.seller_name || 'Seller') : (convRow.buyer_name || 'Buyer');
                    if (otherId) {
                        const { data: prof } = await sb.from('public_profiles').select('display_name, business_name').eq('id', otherId).single();
                        otherName = bizDisplayName(prof, otherName);
                    }
                    const part = [...partDatabase, ...userListings].find(p => p.supabaseId === convRow.listing_id);
                    conv = {
                        id: nextConvId(),
                        supabaseConvId: convRow.id,
                        buyerId: convRow.buyer_id,
                        sellerId: convRow.seller_id,
                        with: otherName,
                        buyerName:  convRow.buyer_name  || '',
                        sellerName: convRow.seller_name || '',
                        isPro: false,
                        unread: false,
                        partId: convRow.listing_id || part?.id,
                        partTitle: convRow.listing_title || 'Part',
                        msgs: [],
                    };
                    conversations.unshift(conv);
                }

                conv.msgs.push({
                    id: nextMsgId(conv),
                    supabaseMsgId: msg.id,
                    sent: false,
                    text: msg.text || '',
                    ...(msg.photo_url   ? { photo: msg.photo_url }      : {}),
                    ...(msg.offer_data  ? { offerCard: msg.offer_data }  : {}),
                    ...(msg.is_auto_reply ? { isAutoReply: true }        : {}),
                    time: formatMsgDate(msg.created_at || new Date().toISOString()),
                    clock: formatMsgTime(msg.created_at || new Date().toISOString()),
                });
                conv.unread = true;
                saveConversations();

                if (activeConvId === conv.id) renderInboxMsgs(conv);
                renderInboxConvList(document.getElementById('inboxSearchInput')?.value || '');
                updateInboxBadge();
                proRefreshIfOpen(conv.id);
                _slRefreshChatIfOpen(conv.supabaseConvId);

                const inboxOpen = document.getElementById('inboxDrawer')?.classList.contains('active');
                if (!inboxOpen && !proEnquiriesIsOpen()) showToast(`New message from ${conv.with}`);
            }
        )
        .subscribe();
}

let _realtimeListingsChannel = null;

function subscribeToRealtimeListings() {
    if (!currentUserId) return;
    if (_realtimeListingsChannel) { sb.removeChannel(_realtimeListingsChannel); _realtimeListingsChannel = null; }

    _realtimeListingsChannel = sb.channel('listings-feed')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'listings' },
            (payload) => {
                const r = payload.new;
                if (!r || (r.status !== 'active' && r.status !== 'pending')) return;
                if (r.seller_id === currentUserId) return; // own listing already in userListings
                if (partDatabase.some(p => p.supabaseId === r.id)) return;
                if (userListings.some(l => l.supabaseId === r.id)) return;
                // Fetch images separately then add to grid
                sb.from('listing_images').select('storage_path, position').eq('listing_id', r.id)
                    .order('position').then(({ data: imgs }) => {
                        const images = (imgs || []).map(i => i.storage_path).filter(Boolean);
                        partDatabase.unshift({
                            id: nextPartId(), supabaseId: r.id, sellerId: r.seller_id,
                            saves: 0, date: new Date(r.created_at).getTime(),
                            apcId: r.apc_id, title: r.title, category: r.category,
                            price: r.price, condition: r.condition,
                            description: r.description, loc: r.location,
                            postcode: r.postcode, pickup: r.pickup, postage: r.postage,
                            openToOffers: r.open_to_offers, isPro: r.is_pro,
                            stockNumber: r.stock_number, odometer: r.odometer, chassisVin: r.chassis_vin || null,
                            warehouseBin: r.warehouse_bin, quantity: r.quantity || 1,
                            fit: r.fitting_available, year: r.fits_year,
                            seller: r.seller_name || 'Seller',
                            images: images.length ? images : [], fits: [],
                        });
                        renderMainGrid();
                    });
            }
        )
        .subscribe();
}

function unsubscribeRealtime() {
    if (_realtimeChannel) { sb.removeChannel(_realtimeChannel); _realtimeChannel = null; }
    if (_realtimeListingsChannel) { sb.removeChannel(_realtimeListingsChannel); _realtimeListingsChannel = null; }
}


function loadRememberedUser() {
    try {
        const raw = localStorage.getItem(REMEMBER_ME_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}
function saveRememberedUser(user) {
    try { localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(user)); } catch (e) {}
}
function clearRememberedUser() {
    try { localStorage.removeItem(REMEMBER_ME_KEY); } catch (e) {}
}

const INBOX_STORAGE_KEY = 'apc.inbox.v1';
let inboxItems = loadInboxItems();

// ── CONVERSATIONS (Message Centre) ───────────────────────────
const CONVS_KEY  = 'apc.conversations.v3';
const TRASH_KEY  = 'apc.conversations.trash.v1';
const TRASH_TTL  = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
let conversations        = loadConversations();
let trashedConversations = loadTrash();
let activeConvId         = null;
let inboxCurrentTab      = 'chats';

function loadConversations() {
    try { const s = localStorage.getItem(CONVS_KEY); if (s) return JSON.parse(s); } catch(e) {}
    return getInitialConversations();
}
function saveConversations() {
    try { localStorage.setItem(CONVS_KEY, JSON.stringify(conversations)); } catch(e) {}
}
function loadTrash() {
    try { const s = localStorage.getItem(TRASH_KEY); if (s) return JSON.parse(s); } catch(e) {}
    return [];
}
function saveTrash() {
    try { localStorage.setItem(TRASH_KEY, JSON.stringify(trashedConversations)); } catch(e) {}
}
function purgeTrashedConversations() {
    const cutoff = Date.now() - TRASH_TTL;
    const before = trashedConversations.length;
    trashedConversations = trashedConversations.filter(c => c.deletedAt > cutoff);
    if (trashedConversations.length !== before) saveTrash();
}
function getInitialConversations() {
    return [];
}
function nextConvId() { return conversations.length ? Math.max(...conversations.map(c=>c.id))+1 : 1; }
function nextMsgId(conv) { return conv.msgs.length ? Math.max(...conv.msgs.map(m=>m.id))+1 : 1; }
function nowClock() {
    const d=new Date(); let h=d.getHours(),m=d.getMinutes();
    const ap=h>=12?'pm':'am'; h=h%12||12;
    return `${h}:${String(m).padStart(2,'0')} ${ap}`;
}
function getConvPartTitle(conv) {
    const p = findPartAnywhere(conv.partId);
    return p ? p.title : (conv.partTitle || 'Part');
}

function switchInboxTab(tab) {
    inboxCurrentTab = tab;
    const chatsBtn  = document.getElementById('itabChats');
    const notifsBtn = document.getElementById('itabNotifs');
    const trashBtn  = document.getElementById('itabTrash');
    if (chatsBtn)  chatsBtn.classList.toggle('active',  tab === 'chats');
    if (notifsBtn) notifsBtn.classList.toggle('active', tab === 'notifications');
    if (trashBtn)  trashBtn.classList.toggle('active',  tab === 'trash');
    const chatsPanel  = document.getElementById('inboxChatsPanel');
    const notifsPanel = document.getElementById('inboxNotifsPanel');
    const trashPanel  = document.getElementById('inboxTrashPanel');
    if (chatsPanel)  chatsPanel.style.display  = tab === 'chats' ? 'flex' : 'none';
    if (notifsPanel) notifsPanel.style.display = tab === 'notifications' ? 'flex' : 'none';
    if (trashPanel)  trashPanel.style.display  = tab === 'trash' ? 'flex' : 'none';
    if (tab === 'chats')         renderInboxConvList();
    if (tab === 'notifications') renderInboxContent();
    if (tab === 'trash')         renderTrashList();
}

function renderInboxConvList(filter) {
    const list = document.getElementById('inboxConvList');
    if (!list) return;

    // Update tab badges
    const buyingUnread  = conversations.filter(c => c.unread && (c.buyerId === currentUserId || (!c.buyerId && !c.sellerId))).length;
    const sellingUnread = conversations.filter(c => c.unread && c.sellerId === currentUserId).length;
    const bBadge = document.getElementById('inboxRoleBadgeBuying');
    const sBadge = document.getElementById('inboxRoleBadgeSelling');
    if (bBadge) { bBadge.textContent = buyingUnread || ''; bBadge.style.display = buyingUnread ? '' : 'none'; }
    if (sBadge) { sBadge.textContent = sellingUnread || ''; sBadge.style.display = sellingUnread ? '' : 'none'; }

    const q = (filter || '').toLowerCase();
    const roleConvs = conversations.filter(c => {
        if (_inboxRoleTab === 'buying')  return c.buyerId === currentUserId || (!c.buyerId && !c.sellerId);
        if (_inboxRoleTab === 'selling') return c.sellerId === currentUserId;
        return true;
    });
    const filtered = (q
        ? roleConvs.filter(c => c.with.toLowerCase().includes(q) || getConvPartTitle(c).toLowerCase().includes(q))
        : [...roleConvs]
    ).sort((a, b) => {
        const weight = conv => {
            const t = (conv.msgs[conv.msgs.length - 1] || {}).time || '';
            if (t === 'Today') return 0;
            if (t === 'Yesterday') return 1;
            const di = ['Sun','Sat','Fri','Thu','Wed','Tue','Mon'].indexOf(t);
            return di >= 0 ? 2 + di : 9;
        };
        return weight(a) - weight(b);
    });
    if (!filtered.length) {
        const isSearch = !!filter;
        const emptyMsg = _inboxRoleTab === 'selling'
            ? 'When someone enquires about one of your listings, it will appear here.'
            : 'When you message a seller about a listing, it will appear here.';
        list.innerHTML = isSearch
            ? `<div style="text-align:center;padding:30px;color:#aaa;font-size:13px;font-weight:600;">No conversations match "${escapeHtml(filter)}"</div>`
            : `<div style="text-align:center;padding:40px 20px;color:#aaa;">
                <div style="font-size:36px;margin-bottom:10px;">💬</div>
                <div style="font-weight:800;font-size:14px;color:#888;margin-bottom:6px;">No messages yet</div>
                <div style="font-size:12px;line-height:1.5;">${emptyMsg}</div>
              </div>`;
        return;
    }
    list.innerHTML = filtered.map(c => {
        const last    = c.msgs[c.msgs.length - 1];
        const preview = last
            ? (last.sent ? 'You: ' : '') + (last.offerCard ? `💰 Offer: $${last.offerCard.offerPrice}` : last.photo ? '📷 Photo' : last.text)
            : '';
        return `
            <div class="inbox-conv-item${c.unread?' unread':''}${activeConvId===c.id?' active':''}${c.flagged?' flagged':''}" data-conv-id="${c.id}" onclick="openInboxConv(${c.id})">
                <button class="inbox-conv-del-btn" onclick="event.stopPropagation(); deleteConversation(${c.id})" title="Delete">×</button>
                <div class="inbox-conv-name-row">
                    <span class="inbox-conv-name">${escapeHtml(c.with)}</span>
                    <button class="inbox-conv-flag-btn${c.flagged?' flagged':''}" onclick="event.stopPropagation(); flagConversation(${c.id})" title="${c.flagged?'Unflag':'Flag'}">⚑</button>
                    <span class="inbox-conv-time">${last?last.time:''}</span>
                    ${c.unread?'<div class="inbox-unread-dot"></div>':''}
                </div>
                <div class="inbox-conv-part">${escapeHtml(getConvPartTitle(c))}</div>
                <div class="inbox-conv-preview">${escapeHtml(preview)}</div>
            </div>`;
    }).join('');
}

function refreshInboxThreadHeader() {
    if (activeConvId === null) return;
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    const part  = findPartAnywhere(conv.partId);
    const thumb = document.getElementById('inboxThreadThumb');
    if (thumb) { thumb.src = part?.images?.[0] || ''; thumb.style.display = part?.images?.[0] ? '' : 'none'; }
    const withEl  = document.getElementById('inboxThreadWith');
    const titleEl = document.getElementById('inboxThreadTitle');
    const priceEl = document.getElementById('inboxThreadPrice');
    if (withEl)  withEl.textContent  = conv.with;
    if (titleEl) titleEl.textContent = part ? part.title : (conv.partTitle || '');
    if (priceEl) priceEl.textContent = part ? '$' + part.price : '';
}

function openInboxConv(id) {
    activeConvId = id;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conv.unread = false;
    saveConversations();
    updateInboxBadge();
    if (currentUserId && conv.supabaseConvId) {
        const isBuyer = conv.buyerId === currentUserId;
        sb.from('conversations').update(isBuyer ? { unread_buyer: false } : { unread_seller: false })
          .eq('id', conv.supabaseConvId).then(() => {});
    }
    renderInboxConvList(document.getElementById('inboxSearchInput')?.value || '');
    const part  = findPartAnywhere(conv.partId);
    const thumb = document.getElementById('inboxThreadThumb');
    if (thumb) { thumb.src = part?.images?.[0] || ''; thumb.style.display = part?.images?.[0] ? '' : 'none'; }
    const withEl  = document.getElementById('inboxThreadWith');
    const titleEl = document.getElementById('inboxThreadTitle');
    const priceEl = document.getElementById('inboxThreadPrice');
    if (withEl)  withEl.textContent  = conv.with;
    if (titleEl) titleEl.textContent = part ? part.title : (conv.partTitle || '');
    if (priceEl) priceEl.textContent = part ? '$' + part.price : '';
    document.getElementById('inboxMsgList')?.classList.remove('times-visible');
    renderInboxMsgs(conv);
    syncInboxPendingBtn();
    document.getElementById('inboxThreadEmpty').style.display = 'none';
    const tc = document.getElementById('inboxThreadContent');
    tc.style.display = 'flex';
    document.getElementById('inboxConvCol').classList.add('slide-away');
    document.getElementById('inboxThreadCol').classList.add('slide-in');
    refreshInboxContextPanel(conv, part);
    // Buyer side: the listing may not be loaded — fetch it, then fill the header + preview.
    if (!part && conv.partId && conv.partId !== 'general') {
        _fetchListingIntoCache(conv.partId).then(p => {
            if (!p || activeConvId !== id) return;
            const t = document.getElementById('inboxThreadThumb');
            if (t) { t.src = p.images?.[0] || ''; t.style.display = p.images?.[0] ? '' : 'none'; }
            const tEl = document.getElementById('inboxThreadTitle');
            const pEl = document.getElementById('inboxThreadPrice');
            if (tEl) tEl.textContent = p.title;
            if (pEl) pEl.textContent = p.price ? '$' + p.price : '';
            refreshInboxContextPanel(conv, p);
        });
    }
    setTimeout(() => document.getElementById('inboxReplyInput')?.focus(), 300);
}

function refreshInboxContextPanel(conv, part) {
    const empty   = document.getElementById('inboxContextEmpty');
    const content = document.getElementById('inboxContextContent');
    if (!empty || !content) return;

    if (!part || conv?.partId === 'general') {
        empty.style.display   = '';
        content.style.display = 'none';
        return;
    }

    const img    = document.getElementById('inboxContextImg');
    const status = document.getElementById('inboxContextStatus');
    const title  = document.getElementById('inboxContextTitle');
    const price  = document.getElementById('inboxContextPrice');
    const withEl = document.getElementById('inboxContextWith');

    if (img)    { img.src = part.images?.[0] || ''; img.style.display = part.images?.[0] ? '' : 'none'; }
    if (title)  safeText(title, part.title);
    if (price)  safeText(price, part.price ? '$' + part.price : '');
    if (withEl) safeText(withEl, conv.with ? 'Conversation with ' + conv.with : '');
    if (status) {
        const s = part.status || 'active';
        status.textContent = s.toUpperCase();
        status.className = 'inbox-context-status' + (s === 'pending' ? ' status-pending' : s === 'sold' ? ' status-sold' : '');
    }

    empty.style.display   = 'none';
    content.style.display = 'flex';
}

function buildOfferCardHTML(o, sent, convId, msgIdx) {
    const statusHTML = o.status !== 'pending'
        ? `<div class="offer-card-status ${o.status}">${
            o.status === 'accepted'  ? '✓ Offer Accepted' :
            o.status === 'declined'  ? '✕ Offer Declined' :
            `↩ Countered at $${o.counterPrice}`}</div>`
        : '';
    const actionsHTML = (!sent && o.status === 'pending')
        ? `<div class="offer-card-actions" id="offer-actions-${convId}-${msgIdx}">
               <button class="offer-action-btn offer-accept"  onclick="acceptOfferCard(${convId},${msgIdx})">ACCEPT</button>
               <button class="offer-action-btn offer-decline" onclick="declineOfferCard(${convId},${msgIdx})">DECLINE</button>
               <button class="offer-action-btn offer-counter" onclick="showCounterForm(${convId},${msgIdx})">COUNTER</button>
           </div>
           <div class="offer-counter-form" id="offer-counter-${convId}-${msgIdx}" style="display:none;">
               <input type="number" class="offer-counter-input" id="offer-counter-input-${convId}-${msgIdx}" placeholder="Counter price $">
               <button class="offer-action-btn offer-accept" style="flex:0;padding:8px 12px;" onclick="submitCounter(${convId},${msgIdx})">SEND</button>
           </div>`
        : (sent && o.status === 'pending'
            ? `<div class="offer-card-awaiting">Awaiting seller response…</div>`
            : (sent && o.status === 'accepted'
                ? `<div class="offer-card-buyer-accepted">Your offer was accepted! Message the seller to arrange payment and pickup.</div>`
                : ''));
    return `<div class="offer-card">
        <div class="offer-card-header">
            <img src="${escapeHtml(thumbUrl(o.partImg, 200))}" class="offer-card-img" alt="">
            <div>
                <div class="offer-card-part-title">${escapeHtml(o.partTitle)}</div>
                <div class="offer-card-listed">Listed: $${o.listedPrice}</div>
            </div>
        </div>
        <div class="offer-card-body">
            <div class="offer-card-amount">$${o.offerPrice}<span>${o.isCounter ? 'COUNTER OFFER' : 'OFFER'}</span></div>
            ${o.buyerNote ? `<div class="offer-card-note">"${escapeHtml(o.buyerNote)}"</div>` : ''}
            ${statusHTML}${actionsHTML}
        </div>
    </div>`;
}

function buildRatePromptCard(offerCard, convId, msgIdx) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return '';
    const isBuyer  = conv.buyerId === currentUserId;
    const listingId = offerCard.listingId;
    const submitted = localStorage.getItem(`apc.rated.${listingId}.${currentUserId}`) === '1';
    const otherName = isBuyer ? escapeHtml(conv.sellerName || offerCard.sellerName || 'Seller')
                               : escapeHtml(conv.buyerName  || offerCard.buyerName  || 'Buyer');
    if (submitted) {
        return `<div class="rate-prompt-card rate-prompt-submitted">
            <div class="rate-prompt-thanks">✓ Rating submitted</div>
            <div class="rate-prompt-thanks-sub">Thanks for your feedback!</div>
        </div>`;
    }
    const cid = `${convId}_${msgIdx}`;
    return `<div class="rate-prompt-card" id="rpc-${cid}">
        <div class="rate-prompt-title">How was ${otherName}?</div>
        <div class="rate-prompt-label">LEAVE A RATING</div>
        <div class="rate-prompt-stars" data-stars="0" id="rps-${cid}">
            ${[1,2,3,4,5].map(n => `<span onclick="ratePromptSetStars(${convId},${msgIdx},${n})">★</span>`).join('')}
        </div>
        <textarea class="rate-prompt-note" maxlength="200" placeholder="Share your experience (optional)…"
            id="rpn-${cid}"
            oninput="document.getElementById('rpct-${cid}').textContent=this.value.length+' / 200'"></textarea>
        <div class="rate-prompt-counter" id="rpct-${cid}">0 / 200</div>
        <button class="rate-prompt-submit" id="rpsb-${cid}" onclick="submitRatingFromThread(${convId},${msgIdx})">Submit Rating</button>
    </div>`;
}

function ratePromptSetStars(convId, msgIdx, n) {
    const cid = `${convId}_${msgIdx}`;
    const el  = document.getElementById(`rps-${cid}`);
    if (!el) return;
    el.dataset.stars = n;
    el.querySelectorAll('span').forEach((s, i) => { s.style.color = i < n ? '#f59e0b' : '#ccc'; });
}

async function submitRatingFromThread(convId, msgIdx) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.msgs[msgIdx];
    if (!msg?.offerCard) return;
    const oc    = msg.offerCard;
    const cid   = `${convId}_${msgIdx}`;
    const stars = Number(document.getElementById(`rps-${cid}`)?.dataset.stars || 0);
    const note  = document.getElementById(`rpn-${cid}`)?.value.trim() || null;
    const btn   = document.getElementById(`rpsb-${cid}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    const isBuyer = conv.buyerId === currentUserId;
    if (sb) {
        try {
            if (isBuyer) {
                const sellerId = conv.sellerId || null;
                const { error } = await sb.from('seller_ratings').insert({
                    listing_id: oc.listingId || null,
                    rater_id:   currentUserId,
                    seller_id:  sellerId,
                    stars:      stars || null,
                    note,
                });
                if (error) throw error;
                // Immediately update the local cache so grid cards refresh without a full reload
                if (sellerId) {
                    const cur = _sellerRatingCache[sellerId];
                    if (cur) {
                        const n   = cur.count + 1;
                        const avg = Math.round(((cur.avg * cur.count) + (stars || 0)) / n * 10) / 10;
                        _sellerRatingCache[sellerId] = { avg, count: n };
                    } else {
                        _sellerRatingCache[sellerId] = { avg: stars || 0, count: 1 };
                    }
                    renderMainGrid();
                    // Refresh storefront rating display if currently open for this seller
                    const sfDrawer = document.getElementById('storefrontDrawer');
                    const sfGrid   = document.getElementById('sellerPartsGrid');
                    if (sfDrawer?.classList.contains('active') && sfGrid?.dataset.userId === sellerId) {
                        sb.from('seller_ratings').select('stars, note, created_at, listing_id')
                          .eq('seller_id', sellerId).order('created_at', { ascending: false }).limit(100)
                          .then(({ data }) => {
                              if (!data) return;
                              _sfRatings = data;
                              const ratingEl  = document.getElementById('sfRatingStat');
                              const divEl     = document.getElementById('sfRatingDivider');
                              if (!ratingEl) return;
                              if (!data.length) { ratingEl.style.display = 'none'; if (divEl) divEl.style.display = 'none'; return; }
                              const avg2 = data.reduce((s, r) => s + (r.stars || 0), 0) / data.length;
                              ratingEl.textContent  = `★ ${avg2.toFixed(1)} (${data.length})`;
                              ratingEl.style.display = '';
                              if (divEl) divEl.style.display = '';
                          });
                    }
                }
            }
            if (!isBuyer) {
                // Seller rates buyer — stored locally on the listing for now
                const listing = userListings.find(l => l.supabaseId == oc.listingId || l.id == oc.listingId);
                if (listing) { listing.buyerRating = { stars, note, ratedAt: Date.now() }; saveUserListings(); }
            }
        } catch(e) {
            showToast('Could not save rating — please try again');
            if (btn) { btn.disabled = false; btn.textContent = 'Submit Rating'; }
            return;
        }
    }
    localStorage.setItem(`apc.rated.${oc.listingId}.${currentUserId}`, '1');
    showToast('Rating submitted — thank you!');
    const openConv = conversations.find(c => c.id === activeConvId);
    if (openConv?.id === convId) renderInboxMsgs(openConv);
    if (_proActiveConvId === convId) proRenderThreadMsgs(conv);
}

function renderInboxMsgs(conv) {
    const box = document.getElementById('inboxMsgList');
    if (!box) return;
    const me = currentUserName || 'You';
    const linkedPart = findPartAnywhere(conv.partId);
    const soldBanner = (linkedPart?.status === 'sold')
        ? `<div class="inbox-sold-banner">This listing has been sold</div>`
        : '';
    let lastDay = '';
    box.innerHTML = soldBanner + conv.msgs.map((m, idx) => {
        let divider = '';
        if (m.time !== lastDay) { lastDay = m.time; divider = `<div class="inbox-date-divider">${m.time}</div>`; }
        if (m.offerCard?.type === 'rate_prompt') {
            return divider + buildRatePromptCard(m.offerCard, conv.id, idx);
        }
        const isOffer  = !!m.offerCard;
        const content  = isOffer
            ? buildOfferCardHTML(m.offerCard, m.sent, conv.id, idx)
            : (m.photo ? `<img src="${escapeHtml(m.photo)}" alt="Photo" style="cursor:zoom-in;" onclick="openDetailImageViewer('${escapeHtml(m.photo)}')">` : escapeHtml(m.text));
        const delBtn   = `<button class="inbox-msg-del" onclick="deleteInboxMsg(${conv.id},${idx})" title="Delete">×</button>`;
        const initial  = m.sent ? me.charAt(0).toUpperCase() : conv.with.charAt(0).toUpperCase();
        const colClass = isOffer ? 'inbox-msg-col offer-col' : 'inbox-msg-col';
        const bubClass = isOffer ? 'inbox-msg-bubble offer-bubble' : 'inbox-msg-bubble';
        return `${divider}
            <div class="inbox-msg-row ${m.sent?'sent':'received'}" data-conv-id="${conv.id}" data-msg-idx="${idx}" ontouchstart="msgRowTouchStart(event,this)" ontouchmove="msgRowTouchMove(event)" ontouchend="msgRowTouchEnd(event,this)">
                ${!m.sent ? delBtn : ''}
                <div class="inbox-msg-avatar">${initial}</div>
                <div class="${colClass}">
                    <div class="${bubClass}">${content}</div>
                    <div class="inbox-msg-time${m.isAutoReply ? ' inbox-msg-time--ar' : ''}">${m.isAutoReply ? '<span class="msg-auto-reply-label">Auto-reply</span> · ' : ''}${m.clock}${m.edited ? ' · edited' : ''}</div>
                </div>
                ${m.sent ? delBtn : ''}
            </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

let _msgTouchStartX = 0;
let _msgTouchStartY = 0;
let _msgLongPressTimer = null;
let _msgLongPressFired = false;
let _msgCopyText = '';

function msgRowTouchStart(e, row) {
    _msgTouchStartX = e.touches[0].clientX;
    _msgTouchStartY = e.touches[0].clientY;
    _msgLongPressFired = false;
    clearTimeout(_msgLongPressTimer);
    _msgLongPressTimer = setTimeout(() => {
        const convId = parseInt(row.dataset.convId);
        const msgIdx = parseInt(row.dataset.msgIdx);
        const conv = conversations.find(c => c.id === convId);
        const msg = conv?.msgs[msgIdx];
        if (msg?.text && !msg.offerCard && !msg.photo && !msg.isAutoReply) {
            _msgLongPressFired = true;
            if (navigator.vibrate) navigator.vibrate(30);
            showMsgCopyMenu(msg.text, _msgTouchStartY, !!msg.sent, convId, msgIdx);
        }
    }, 500);
}
function msgRowTouchMove(e) {
    const dx = Math.abs(e.touches[0].clientX - _msgTouchStartX);
    const dy = Math.abs(e.touches[0].clientY - _msgTouchStartY);
    if (dx > 10 || dy > 10) { clearTimeout(_msgLongPressTimer); }
}
function msgRowTouchEnd(e, row) {
    clearTimeout(_msgLongPressTimer);
    if (_msgLongPressFired) return;
    const dx = e.changedTouches[0].clientX - _msgTouchStartX;
    const list = document.getElementById('inboxMsgList');
    if (Math.abs(dx) < 15) {
        row.classList.toggle('del-visible');
    } else if (dx < -40) {
        if (list) list.classList.add('times-visible');
    } else if (dx > 40) {
        if (list) list.classList.remove('times-visible');
    }
}

let _editingConvId  = null;
let _editingMsgIdx  = null;

function showMsgCopyMenu(text, clientY, isSent, convId, msgIdx) {
    dismissMsgCopyMenu();
    _msgCopyText = text;
    const menu = document.createElement('div');
    menu.id = 'msgCopyMenu';
    menu.className = 'msg-copy-menu';
    menu.style.top = Math.max(60, clientY - 60) + 'px';
    const editBtn = isSent
        ? `<button class="msg-copy-btn" onclick="startMsgEdit(${convId},${msgIdx})">Edit</button><div class="msg-copy-sep"></div>`
        : '';
    menu.innerHTML = `${editBtn}<button class="msg-copy-btn" onclick="copyMsgText()">Copy</button>`;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('touchstart', dismissMsgCopyMenu, { once: true, passive: true }), 100);
}
function dismissMsgCopyMenu() {
    const m = document.getElementById('msgCopyMenu');
    if (m) m.remove();
}
async function copyMsgText() {
    dismissMsgCopyMenu();
    try {
        await navigator.clipboard.writeText(_msgCopyText);
        showToast('Copied');
    } catch {
        showToast('Copy not available on this browser');
    }
}

function startMsgEdit(convId, msgIdx) {
    dismissMsgCopyMenu();
    const conv = conversations.find(c => c.id === convId);
    const msg  = conv?.msgs[msgIdx];
    if (!msg || !msg.sent || msg.offerCard || msg.photo) return;
    _editingConvId = convId;
    _editingMsgIdx = msgIdx;
    const input  = document.getElementById('inboxReplyInput');
    const editBar = document.getElementById('inboxEditBar');
    if (input)   { input.value = msg.text; inboxAutoResize(input); input.focus(); }
    if (editBar) editBar.style.display = 'flex';
}

function cancelMsgEdit() {
    _editingConvId = null;
    _editingMsgIdx = null;
    const input   = document.getElementById('inboxReplyInput');
    const editBar = document.getElementById('inboxEditBar');
    if (input)   { input.value = ''; inboxAutoResize(input); }
    if (editBar) editBar.style.display = 'none';
}

function closeInboxThread() {
    document.getElementById('inboxConvCol').classList.remove('slide-away');
    document.getElementById('inboxThreadCol').classList.remove('slide-in');
    renderInboxConvList(document.getElementById('inboxSearchInput')?.value || '');
    updateInboxBadge();
}

function closeInboxOrThread() {
    const isMobile = window.innerWidth < 900;
    const threadCol = document.getElementById('inboxThreadCol');
    if (isMobile && threadCol && threadCol.classList.contains('slide-in')) {
        closeInboxThread();
    } else {
        const drawer = document.getElementById('inboxDrawer');
        const proHdr = document.getElementById('proHeader');
        const inProMode = proHdr && proHdr.style.display !== 'none';
        if (inProMode) { proOpenEnquiries(); return; }
        toggleDrawer('inboxDrawer');
    }
}

async function sendInboxMessage() {
    const input = document.getElementById('inboxReplyInput');
    const text  = input?.value.trim();
    if (!text || activeConvId === null) return;
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;

    // Edit mode — update existing message
    if (_editingConvId !== null) {
        const msg = conv.msgs[_editingMsgIdx];
        if (msg) {
            msg.text   = text;
            msg.edited = true;
        }
        cancelMsgEdit();
        saveConversations();
        renderInboxMsgs(conv);
        if (currentUserId && msg?.supabaseMsgId && sb) {
            sb.from('messages').update({ text }).eq('id', msg.supabaseMsgId).then(({ error }) => {
                if (error) console.warn('Edit message:', error.message);
            });
        }
        return;
    }

    conv.msgs.push({ id: nextMsgId(conv), sent: true, text, time: 'Today', clock: nowClock() });
    input.value = ''; input.style.height = 'auto';
    saveConversations();
    renderInboxConvList(document.getElementById('inboxSearchInput')?.value || '');
    renderInboxMsgs(conv);
    if (!currentUserId) return;
    const ok = await ensureSupabaseConversation(conv);
    if (!ok) { showToast('Message saved locally — sync failed'); return; }
    try {
        const isBuyer = conv.buyerId === currentUserId;
        await syncMessageToSupabase(conv.supabaseConvId, text, isBuyer);
    } catch (e) { showToast('Send failed: ' + (e.message || e)); }
}

function sendInboxPhoto(event) {
    const file = event.target.files[0];
    if (!file || activeConvId === null) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
        // Compress via canvas to handle large mobile photos
        const img = new Image();
        img.onload = () => {
            const MAX = 1200;
            let w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else { w = Math.round(w * MAX / h); h = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);

            const conv = conversations.find(c => c.id === activeConvId);
            if (!conv) return;
            conv.msgs.push({ id: nextMsgId(conv), sent: true, text: '', photo: compressed, time: 'Today', clock: nowClock() });
            saveConversations();
            renderInboxConvList();
            renderInboxMsgs(conv);

            if (currentUserId) {
                const isBuyer = conv.buyerId === currentUserId;
                syncPhotoMessageToSupabase(conv, compressed, isBuyer);
            }
        };
        img.onerror = () => showToast('Could not load photo');
        img.src = e.target.result;
    };
    reader.onerror = () => showToast('Could not read photo');
    reader.readAsDataURL(file);
}

function deleteInboxMsg(convId, msgIdx) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    conv.msgs.splice(msgIdx, 1);
    saveConversations();
    renderInboxConvList();
    renderInboxMsgs(conv);
}

function viewConvListing() {
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) { showToast('No listing linked to this conversation'); return; }
    // For workshop/general enquiries use refListingId; otherwise use partId
    const lookupId = conv.partId === 'general' ? (conv.refListingId || null) : conv.partId;
    if (!lookupId) { showToast('No listing linked to this conversation'); return; }
    let part = findPartAnywhere(lookupId);
    if (!part && conv.supabaseConvId) {
        sb.from('conversations').select('listing_id').eq('id', conv.supabaseConvId).single()
            .then(({ data }) => {
                if (data?.listing_id) {
                    const p = findPartAnywhere(data.listing_id);
                    if (p) openItemDetail(p.supabaseId || p.id, false, true);
                    else showToast('Listing no longer available');
                } else {
                    showToast('Listing no longer available');
                }
            });
        return;
    }
    if (!part) { showToast('Listing no longer available'); return; }
    openItemDetail(part.supabaseId || part.id, false, true);
}

function syncInboxPendingBtn() {
    const wrap = document.getElementById('inboxStatusWrap');
    const btn  = document.getElementById('inboxStatusBtn');
    const conv = conversations.find(c => c.id === activeConvId);
    const isBuyer = conv?.buyerId && conv.buyerId === currentUserId;
    const isSeller = !isBuyer && conv && (
        (conv.sellerId && conv.sellerId === currentUserId) ||
        (!conv.sellerId && userListings.some(l =>
            (l.supabaseId === conv.partId || l.id === conv.partId) && l.sellerId === currentUserId
        ))
    );
    if (!conv || !isSeller) {
        if (wrap) wrap.style.display = 'none';
        closeInboxStatusPicker();
        return;
    }
    const listing = userListings.find(l => l.supabaseId === conv.partId || l.id === conv.partId);
    if (!listing) { if (wrap) wrap.style.display = 'none'; closeInboxStatusPicker(); return; }
    if (!wrap || !btn) return;
    wrap.style.display = '';
    const s = listing.status || 'active';
    const label = s === 'active' ? 'ACTIVE' : s === 'pending' ? 'PENDING' : 'SOLD';
    btn.textContent = '● ' + label + ' ▾';
    btn.className = 'inbox-status-btn isp-status-' + s;
}

function toggleInboxStatusPicker(e) {
    if (e) e.stopPropagation();
    const picker = document.getElementById('inboxStatusPicker');
    if (!picker) return;
    const isOpen = picker.style.display !== 'none';
    picker.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
        const conv = conversations.find(c => c.id === activeConvId);
        const listing = conv && userListings.find(l => l.supabaseId === conv.partId || l.id === conv.partId);
        const current = listing?.status || 'active';
        ['active','pending','sold'].forEach(s => {
            const opt = document.getElementById('ispOpt' + s.charAt(0).toUpperCase() + s.slice(1));
            if (opt) opt.classList.toggle('active', s === current);
        });
    }
}

function closeInboxStatusPicker() {
    const picker = document.getElementById('inboxStatusPicker');
    if (picker) picker.style.display = 'none';
}

function setListingStatusFromInbox(status) {
    closeInboxStatusPicker();
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    const listing = userListings.find(l => l.supabaseId === conv.partId || l.id === conv.partId);
    if (!listing) return;
    const doSet = () => {
        listing.status   = status === 'active' ? undefined : status;
        listing.soldDate = status === 'sold' ? Date.now() : (status === 'active' ? null : listing.soldDate);
        saveUserListings();
        syncInboxPendingBtn();
        renderMainGrid();
        renderMyParts();
        if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
        const msg = status === 'active' ? 'Listing relisted as active' : status === 'pending' ? 'Listing marked as pending' : 'Listing marked as sold!';
        showToast(msg);
        syncListingStatusToSupabase(listing, status === 'active' ? 'active' : status);
    };
    if (status === 'sold' && listing.status !== 'sold') {
        showConfirmDialog('Mark as Sold', `Mark "${listing.title}" as sold? It will be removed from active listings.`, 'Mark Sold', doSet);
    } else {
        doSet();
    }
}

function toggleListingPending() {
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    const listing = userListings.find(l => l.supabaseId === conv.partId || l.id === conv.partId);
    if (!listing) { showToast('Listing not found'); return; }
    listing.status = listing.status === 'pending' ? undefined : 'pending';
    const newStatus = listing.status || 'active';
    saveUserListings();
    syncInboxPendingBtn();
    renderMainGrid();
    renderMyParts();
    if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
    showToast(newStatus === 'pending' ? 'Listing marked as Pending' : 'Pending status removed');
    syncListingStatusToSupabase(listing, newStatus);
}

function markSoldFromInbox() {
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    const listing = userListings.find(l => l.supabaseId === conv.partId || l.id === conv.partId);
    if (!listing) return;
    if (listing.status === 'sold') {
        listing.status   = 'active';
        listing.soldDate = null;
        saveUserListings();
        syncInboxPendingBtn();
        renderMainGrid();
        renderMyParts();
        showToast('Listing relisted as active');
        syncListingStatusToSupabase(listing, 'active');
        return;
    }
    showConfirmDialog(
        'Mark as Sold',
        `Mark "${listing.title}" as sold? It will be removed from active listings.`,
        'Mark Sold',
        () => {
            const soldConvId = activeConvId;
            const soldConv   = conversations.find(c => c.id === soldConvId);
            listing.status   = 'sold';
            listing.soldDate = Date.now();
            saveUserListings();
            syncInboxPendingBtn();
            renderMainGrid();
            renderMyParts();
            if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
            showToast('Listing marked as sold!');
            syncListingStatusToSupabase(listing, 'sold');
            _postSoldRatePrompts(listing, soldConvId);
            if (!listing.buyerRating) setTimeout(() => showRateBuyerDialog(listing.id, soldConv?.buyerName || soldConv?.with, soldConv?.buyerId), 400);
        }
    );
}

function clearListingPending(partId) {
    const listing = userListings.find(l => l.id === partId);
    if (!listing) return;
    listing.status = undefined;
    saveUserListings();
    renderMainGrid();
    renderMyParts();
    renderDashboard();
    showToast('Pending status removed');
}

function openItemPreview(part) {
    const body = document.getElementById('iipBody');
    if (!body) return;

    const images = part.images && part.images.length ? part.images : ['images/placeholder.png'];

    const thumbsHtml = images.length > 1
        ? `<div class="iip-thumbs">${images.map((src, i) =>
            `<img class="iip-thumb${i===0?' active':''}" src="${src}" alt=""
             onclick="iipSelectPhoto(this,'${src}')">`).join('')}</div>`
        : '';

    const deliveryBadges = [
        part.pickup  !== false ? '<div class="iip-delivery-badge">📍 Pickup Available</div>' : '',
        part.postage || part.postage === true ? '<div class="iip-delivery-badge">📦 Postage Available</div>' : '',
        part.fit ? '<div class="iip-delivery-badge">🔧 Fitting Available</div>' : '',
    ].filter(Boolean).join('');

    const _fitsUniversal = (!part.fits || part.fits.length === 0) && part.category && !VEHICLE_EXEMPT_CATEGORIES.includes(part.category);
    const fitmentHtml = part.fits && part.fits.length
        ? `<div class="iip-section-label">Vehicle Fitment</div>
           <div class="iip-fitment">${part.fits.map(f => [f.make, f.model, f.variant].filter(Boolean).join(' ')).join(', ')}</div>`
        : _fitsUniversal
            ? `<div class="iip-section-label">Vehicle Fitment</div>
               <div class="iip-fitment">Universal — fits all vehicles</div>`
            : '';

    const locHtml = part.loc
        ? `<div class="iip-delivery-badge">📍 ${escapeHtml(part.loc)}</div>` : '';

    body.innerHTML = `
        <div class="iip-photos">
            <img class="iip-main-photo" id="iipMainPhoto" src="${images[0]}" alt="${escapeHtml(part.title)}"
                 onclick="openDetailImageViewer('${images[0]}')">
            ${thumbsHtml}
        </div>
        <div class="iip-price-row">
            <div class="iip-price">$${part.price}</div>
            ${part.condition ? `<div class="iip-condition">${escapeHtml(part.condition)}</div>` : ''}
        </div>
        <div class="iip-title">${escapeHtml(part.title)}</div>
        <div class="iip-delivery">${deliveryBadges}${locHtml}</div>
        ${fitmentHtml}
        ${part.description ? `<div class="iip-section-label">Description</div><div class="iip-description">${escapeHtml(part.description)}</div>` : ''}
        ${part.apcId ? `<div class="iip-apc-id">Item ID: ${part.apcId}</div>` : ''}
    `;

    document.getElementById('inboxItemPreview').classList.add('open');
}

function closeItemPreview() {
    document.getElementById('inboxItemPreview').classList.remove('open');
}

function iipSelectPhoto(thumb, src) {
    document.getElementById('iipMainPhoto').src = src;
    document.querySelectorAll('.iip-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function flagConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conv.flagged = !conv.flagged;
    saveConversations();
    const row = document.querySelector(`#inboxConvList [data-conv-id="${id}"]`);
    if (row) {
        row.classList.toggle('flagged', conv.flagged);
        const btn = row.querySelector('.inbox-conv-flag-btn');
        if (btn) {
            btn.classList.toggle('flagged', conv.flagged);
            btn.title = conv.flagged ? 'Unflag' : 'Flag';
            btn.blur();
        }
    }
}
function deleteConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
        trashedConversations.unshift({ ...conv, deletedAt: Date.now() });
        saveTrash();
        updateTrashBadge();
        if (conv.supabaseConvId && currentUserId) {
            const flag = conv.buyerId === currentUserId ? { hidden_by_buyer: true } : { hidden_by_seller: true };
            sb.from('conversations').update(flag).eq('id', conv.supabaseConvId)
                .then(({ error }) => { if (error) console.warn('Conv hide sync failed:', error.message); });
        }
    }
    conversations = conversations.filter(c => c.id !== id);
    if (activeConvId === id) {
        activeConvId = null;
        document.getElementById('inboxThreadContent').style.display = 'none';
        document.getElementById('inboxThreadEmpty').style.display = '';
        document.getElementById('inboxConvCol').classList.remove('slide-away');
        document.getElementById('inboxThreadCol').classList.remove('slide-in');
    }
    saveConversations();
    updateInboxBadge();
    renderInboxConvList(document.getElementById('inboxSearchInput')?.value || '');
}
function restoreConversation(id) {
    const conv = trashedConversations.find(c => c.id === id);
    if (!conv) return;
    const { deletedAt, ...restored } = conv;
    conversations.unshift(restored);
    trashedConversations = trashedConversations.filter(c => c.id !== id);
    saveConversations();
    saveTrash();
    updateInboxBadge();
    updateTrashBadge();
    renderTrashList();
    if (conv.supabaseConvId && currentUserId) {
        const flag = conv.buyerId === currentUserId ? { hidden_by_buyer: false } : { hidden_by_seller: false };
        sb.from('conversations').update(flag).eq('id', conv.supabaseConvId).then(() => {});
    }
    showToast('Conversation restored');
}
function permanentDeleteConversation(id) {
    trashedConversations = trashedConversations.filter(c => c.id !== id);
    saveTrash();
    updateTrashBadge();
    renderTrashList();
}
function emptyTrash() {
    if (!trashedConversations.length) return;
    if (!confirm('Permanently delete all trashed conversations? This cannot be undone.')) return;
    trashedConversations = [];
    saveTrash();
    updateTrashBadge();
    renderTrashList();
}
function updateTrashBadge() {
    const badge = document.getElementById('itabTrashBadge');
    if (!badge) return;
    const count = trashedConversations.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
}
function renderTrashList() {
    const panel = document.getElementById('inboxTrashPanel');
    if (!panel) return;
    if (!trashedConversations.length) {
        panel.innerHTML = '<div class="inbox-trash-empty"><div style="font-size:36px;margin-bottom:8px;">🗑️</div><div>Trash is empty</div><div style="font-size:12px;color:#aaa;margin-top:4px;">Deleted chats are kept for 30 days</div></div>';
        return;
    }
    const fmt = ts => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
    };
    const daysLeft = ts => Math.max(0, Math.ceil((ts + TRASH_TTL - Date.now()) / 86400000));
    panel.innerHTML = `
        <div class="inbox-trash-toolbar">
            <span style="font-size:12px;color:#888;">${trashedConversations.length} chat${trashedConversations.length !== 1 ? 's' : ''} · auto-deleted after 30 days</span>
            <button class="inbox-trash-empty-btn" onclick="emptyTrash()">Empty Trash</button>
        </div>
        ${trashedConversations.map(c => {
            const partTitle = (() => { const p = partDatabase.concat(userListings).find(p => p.id === c.partId); return p ? p.title : (c.partTitle || 'Part'); })();
            const days = daysLeft(c.deletedAt);
            return `<div class="inbox-trash-item">
                <div class="inbox-trash-item-info">
                    <div class="inbox-trash-name">${escapeHtml(c.with)}</div>
                    <div class="inbox-trash-part">${escapeHtml(partTitle)}</div>
                    <div class="inbox-trash-meta">Deleted ${fmt(c.deletedAt)} · ${days > 0 ? `expires in ${days} day${days !== 1 ? 's' : ''}` : 'expires today'}</div>
                </div>
                <div class="inbox-trash-actions">
                    <button class="inbox-trash-restore-btn" onclick="restoreConversation(${c.id})">Restore</button>
                    <button class="inbox-trash-del-btn" onclick="permanentDeleteConversation(${c.id})">Delete</button>
                </div>
            </div>`;
        }).join('')}`;
}
function filterInboxConvs(val) { renderInboxConvList(val); }
function setInboxRoleTab(tab) {
    _inboxRoleTab = tab;
    document.getElementById('inboxRoleTabBuying')?.classList.toggle('active', tab === 'buying');
    document.getElementById('inboxRoleTabSelling')?.classList.toggle('active', tab === 'selling');
    // Clear thread if the open conversation isn't in the new tab
    if (activeConvId !== null) {
        const conv = conversations.find(c => c.id === activeConvId);
        const inTab = conv && (
            tab === 'buying'  ? (conv.buyerId === currentUserId || (!conv.buyerId && !conv.sellerId)) :
            tab === 'selling' ? conv.sellerId === currentUserId : true
        );
        if (!inTab) {
            activeConvId = null;
            document.getElementById('inboxThreadContent').style.display = 'none';
            document.getElementById('inboxThreadEmpty').style.display = '';
            document.getElementById('inboxConvCol')?.classList.remove('slide-away');
            refreshInboxContextPanel(null, null);
        }
    }
    renderInboxConvList(document.getElementById('inboxSearchInput')?.value || '');
}
function setMyListingsTab(tab) {
    _myListingsTab = tab;
    _myListingsSelectMode = false;
    _myListingsSelected.clear();
    const pill = document.getElementById('mlSelectPill');
    if (pill) pill.classList.remove('active');
    const footer = document.getElementById('mlBulkFooter');
    if (footer) footer.style.display = 'none';
    document.querySelectorAll('.my-listings-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    renderMyParts();
}
function inboxAutoResize(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,100)+'px'; }
function inboxHandleKey(e) { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); e.stopPropagation(); sendInboxMessage(); } }

function loadInboxItems() {
    try {
        const raw = localStorage.getItem(INBOX_STORAGE_KEY);
        return raw ? JSON.parse(raw) : getInitialInboxItems();
    } catch (e) {
        return getInitialInboxItems();
    }
}
function saveInboxItems() {
    try { localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(inboxItems)); } catch (e) {}
}
function getInitialInboxItems() {
    return [];
}
function nextInboxItemId() {
    return inboxItems.length ? Math.max(...inboxItems.map(i => i.id)) + 1 : 1;
}

function nextPartId() {
    const ids = [...partDatabase, ...userListings].map(p => p.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
}
function getAllParts() {
    const seen = new Set();
    // userListings first so owner's copy wins over partDatabase copy on dedup
    return [...userListings, ...partDatabase].filter(p => {
        if (p.status === 'sold' || p.status === 'removed') return false;
        const key = p.supabaseId || p.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
function findPartAnywhere(id) {
    const all  = [...userListings, ...partDatabase];
    const numId = Number(id);
    // 1. Exact supabaseId match (UUID string comparison)
    let found = all.find(p => p.supabaseId != null && p.supabaseId === id);
    if (found) return found;
    // 2. Coerced supabaseId match (stringified bigint: '5' → 5)
    if (!isNaN(numId)) {
        found = all.find(p => p.supabaseId != null && p.supabaseId === numId);
        if (found) return found;
    }
    // 3. Local integer id fallback (no supabaseId assigned yet)
    found = all.find(p => p.id === id);
    if (found) return found;
    if (!isNaN(numId)) return all.find(p => p.id === numId);
    return undefined;
}
function getPartById(id) {
    return getAllParts().find(p => p.id === id || (p.supabaseId && p.supabaseId === id));
}

// ── Listing resolution: cache-or-fetch ────────────────────────────────────
// The marketplace feed (partDatabase) is paginated, so it's an intentionally-incomplete
// cache. Anything that opens/previews a SPECIFIC listing by id (a buyer viewing a chat
// about another seller's part, a notification, a deep link) must resolve it from the
// source of truth if it isn't loaded — otherwise findPartAnywhere returns null and the
// surface silently fails. These helpers are the single canonical way to do that.

const LISTING_SELECT_COLS = `id, apc_id, title, price, condition, category, description, location, postcode,
    pickup, postage, open_to_offers, is_pro, stock_number, odometer, chassis_vin,
    warehouse_bin, quantity, fitting_available, fits_year, variant, saves_count,
    created_at, seller_id, status, seller_name,
    listing_images(storage_path, position), listing_vehicles(make, model, series)`;

// Canonical Supabase listing row → in-memory part object. One source of truth for the shape.
function _listingRowToPart(r) {
    const images = (r.listing_images || []).sort((a, b) => a.position - b.position).map(i => i.storage_path).filter(Boolean);
    const fits   = (r.listing_vehicles || []).map(v => ({ make: v.make, model: v.model, ...(v.series ? { variant: v.series } : {}) }));
    return {
        id: nextPartId(), supabaseId: r.id, sellerId: r.seller_id,
        saves: r.saves_count || 0, date: new Date(r.created_at).getTime(),
        apcId: r.apc_id, title: r.title, category: r.category, price: r.price,
        condition: r.condition, description: r.description, loc: r.location,
        postcode: r.postcode, pickup: r.pickup, postage: r.postage,
        openToOffers: r.open_to_offers, isPro: r.is_pro,
        stockNumber: r.stock_number, odometer: r.odometer, chassisVin: r.chassis_vin || null,
        warehouseBin: r.warehouse_bin, quantity: r.quantity || 1,
        fit: r.fitting_available, year: r.fits_year, variant: r.variant || null,
        seller: r.seller_name || 'Seller', status: r.status === 'active' ? undefined : r.status,
        images: images.length ? images : [], fits,
    };
}

// Fetch ONE listing into the cache if it isn't already loaded. Returns the part (or null).
async function _fetchListingIntoCache(listingId) {
    if (!sb || !listingId || listingId === 'general') return null;
    const cached = findPartAnywhere(listingId);
    if (cached) return cached;
    const { data: r } = await sb.from('listings').select(LISTING_SELECT_COLS).eq('id', listingId).maybeSingle();
    if (!r) return null;
    const part = _listingRowToPart(r);
    partDatabase.push(part);
    return part;
}

// Batch-preload a set of listing ids into the cache (one query) — used at conversation /
// notification load so every later findPartAnywhere(referenced id) just works.
async function _preloadListings(ids) {
    if (!sb) return 0;
    const missing = [...new Set(ids)].filter(id => id && id !== 'general' && !findPartAnywhere(id));
    if (!missing.length) return 0;
    const { data: rows } = await sb.from('listings').select(LISTING_SELECT_COLS).in('id', missing);
    let added = 0;
    (rows || []).forEach(r => { if (!findPartAnywhere(r.id)) { partDatabase.push(_listingRowToPart(r)); added++; } });
    return added;
}

// Canonical resolver: cache first, fetch if missing. Use this in any "open/preview a
// specific listing by id" entry point so the not-loaded bug class can't recur.
async function resolvePart(id) {
    return findPartAnywhere(id) || await _fetchListingIntoCache(id);
}

function findSimilarActiveParts(stalePart) {
    return getAllParts().filter(p => {
        if (p.category !== stalePart.category) return false;
        if (!stalePart.fits || stalePart.fits.length === 0) return true;
        if (!p.fits || p.fits.length === 0) return true;
        return p.fits.some(pf => stalePart.fits.some(sf => sf.make?.toLowerCase() === pf.make?.toLowerCase()));
    });
}

function getDetailVehicleLabel(part) {
    if (!part || !part.fits || !part.fits.length) return 'vehicle';
    const fit = part.fits[0];
    if (fit.model && fit.make) return `${fit.make} ${fit.model}`;
    return fit.make || fit.model || 'vehicle';
}

function getRecommendedWorkshops(part) {
    const targetMake    = part.fits?.[0]?.make  || null;
    const targetModel   = part.fits?.[0]?.model || null;
    const buyerPostcode = userSettings.postcode || '';
    const mappedKeys    = CATEGORY_SERVICE_MAP[part.category] || [];

    return workshopDatabase
        .map(ws => {
            const allMakes = ws.vehicleTypes.includes('All Makes');
            let score = 0;

            if (targetMake) {
                const makeMatch = allMakes || ws.vehicleTypes.some(v => v.toLowerCase() === targetMake.toLowerCase());
                if (!makeMatch) return { ws, score: 0 };   // hard exclude — doesn't work on this make
                score += allMakes ? 2 : 3;                 // specialist outranks generalist
            }
            if (targetModel && ws.vehicleTypes.some(v => v.toLowerCase() === targetModel.toLowerCase())) score += 2;
            if (mappedKeys.length && mappedKeys.some(k => ws.serviceKeys.includes(k))) score += 2;
            if (buyerPostcode && ws.postcode && buyerPostcode.slice(0, 3) === ws.postcode.slice(0, 3)) score += 1;
            return { ws, score };
        })
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(e => e.ws);
}

function buildWorkshopCardHTML(ws) {
    const logoHtml = ws.logo
        ? `<img class="ws-card-logo" src="${escapeHtml(ws.logo)}" alt="">`
        : `<div class="ws-card-initials">${escapeHtml((ws.name || '??').slice(0, 2).toUpperCase())}</div>`;
    const loc = ws.location || ws.address || '';
    return `
        <div class="workshop-card" onclick="openWorkshopOverlay('${escapeHtml(ws.id)}')">
            <div class="workshop-card-header">
                ${logoHtml}
                <div style="flex:1;min-width:0;">
                    <div class="workshop-card-name">${escapeHtml(ws.name)}</div>
                    ${loc ? `<div class="workshop-card-distance">${escapeHtml(loc)}</div>` : ''}
                </div>
                <div class="ws-card-see-more">See more</div>
            </div>
            <div class="workshop-card-specialty">${escapeHtml(ws.specialty)}</div>
        </div>
    `;
}

async function openWorkshopOverlay(wsId) {
    const ws = await fetchWorkshopById(wsId);
    if (!ws) return;

    const overlay = document.getElementById('workshopDetailOverlay');
    const content = document.getElementById('wsOverlayContent');
    const msgBtn  = document.getElementById('wsOverlayMsgBtn');
    if (!overlay || !content || !msgBtn) return;

    const logoHtml = ws.logo
        ? `<img class="ws-overlay-logo" src="${escapeHtml(ws.logo)}" alt="">`
        : `<div class="ws-overlay-initials">${escapeHtml((ws.name || '??').slice(0, 2).toUpperCase())}</div>`;

    const servicesHTML = ws.serviceKeys
        .map(k => `<span class="sf-chip">${escapeHtml(SERVICE_LABELS[k] || k)}</span>`)
        .join('');

    const makesHTML = (ws.vehicleTypes.includes('All Makes') ? ['All Makes'] : ws.vehicleTypes)
        .map(v => `<span class="sf-chip">${escapeHtml(v)}</span>`)
        .join('');

    content.innerHTML = `
        <div class="ws-overlay-header-row">
            ${logoHtml}
            <div style="flex:1;min-width:0;">
                <div class="ws-overlay-name">${escapeHtml(ws.name)}</div>
                ${ws.location ? `<div class="ws-overlay-loc">${escapeHtml(ws.location)}</div>` : ''}
                ${ws.address  ? `<div class="ws-overlay-addr">${escapeHtml(ws.address)}</div>` : ''}
            </div>
        </div>
        ${ws.about ? `<p class="ws-overlay-about">${escapeHtml(ws.about)}</p>` : ''}
        ${servicesHTML ? `
            <div class="ws-overlay-section-label">Services Offered</div>
            <div class="ws-overlay-chips">${servicesHTML}</div>
        ` : ''}
        ${makesHTML ? `
            <div class="ws-overlay-section-label">Vehicle Specialists</div>
            <div class="ws-overlay-chips">${makesHTML}</div>
        ` : ''}
    `;

    // Only prefill from a listing if the detail overlay is actually open right now
    const part = document.getElementById('detailOverlay')?.classList.contains('active') ? _currentOpenPart : null;
    let prefillMsg;
    if (part) {
        const make    = part.fits?.[0]?.make  || '';
        const model   = part.fits?.[0]?.model || '';
        const vehicle = [make, model].filter(Boolean).join(' ');
        prefillMsg = vehicle
            ? `Hi, I'm looking to have a "${part.title}" fitted for my ${vehicle}. Are you able to help?`
            : `Hi, I'm looking to have a "${part.title}" fitted. Are you able to help?`;
    }
    msgBtn.onclick = () => { closeWorkshopOverlay(); contactWorkshop(ws.id, ws.name, prefillMsg); };
    toggleDrawer('workshopDetailOverlay', true);
    const bd = document.getElementById('wsOverlayBackdrop');
    if (bd) bd.classList.add('active');
}

function closeWorkshopOverlay() {
    const overlay = document.getElementById('workshopDetailOverlay');
    if (overlay) overlay.classList.remove('active');
    const bd = document.getElementById('wsOverlayBackdrop');
    if (bd) bd.classList.remove('active');
    syncBackdrop();
}

function contactWorkshop(workshopId, workshopName, prefillMsg) {
    if (!userIsSignedIn) { showToast('Sign in to contact this workshop'); return; }
    if (workshopId === currentUserId) { showToast("That's your own workshop"); return; }
    const _refPart = _currentOpenPart;
    pendingGeneralEnquiry = {
        seller:         workshopName,
        isPro:          true,
        sellerId:       workshopId,
        refListingId:   _refPart?.supabaseId || null,
        refListingTitle: _refPart?.title     || null,
    };
    currentOpenPartId = null;
    const titleEl = document.getElementById('contactCardTitle');
    const msgEl   = document.getElementById('contactCardMsg');
    const compose = document.getElementById('contactCardCompose');
    const confirm = document.getElementById('contactCardConfirm');
    if (titleEl) titleEl.textContent = `Enquiry — ${workshopName}`;
    if (msgEl)   msgEl.value = prefillMsg || 'Hi, I have an enquiry about your fitting services.';
    if (compose) compose.style.display = '';
    if (confirm) confirm.style.display = 'none';
    document.getElementById('contactSellerBackdrop').style.display = '';
    document.getElementById('contactSellerCard').style.display     = '';
}

// Business name takes precedence over display name for all tiers — one consistent name on all listings.
function getPublicSellerName() {
    return userSettings.businessName || currentUserName || 'Guest Seller';
}

// Public-facing name for ANOTHER user's profile row: business name wins, username falls back.
function bizDisplayName(profile, fallback = 'Seller') {
    return (profile && (profile.business_name || profile.display_name)) || fallback;
}

function getCurrentSellerName() {
    return getPublicSellerName();
}

async function openStorefrontByUserId(userId) {
    if (!sb || !userId) return;
    const { data: profile } = await sb.from('public_profiles')
        .select('display_name, is_pro, tier, business_name, abn, about, avatar_url, location, banner_color, is_public, workshop_data, workshop_address')
        .eq('id', userId).single();
    if (!profile) return;
    if (profile.is_public === false && currentUserId && userId !== currentUserId) {
        showToast('This seller is currently unavailable');
        return;
    }
    if (profile.avatar_url) _sellerPicCache[userId] = profile.avatar_url;
    const sellerName = profile.display_name || 'Seller';
    const isOwn = userId === currentUserId;
    const grid = document.getElementById('sellerPartsGrid');
    if (grid) { grid.dataset.seller = sellerName; grid.dataset.userId = userId; }

    const isTradeOrProProfile = profile.tier === 'trade' || profile.tier === 'pro' || profile.is_pro;
    // Use own live workshopProfile for own store (most up-to-date), Supabase data for others
    const wd = isOwn ? {
        biz_type: userSettings.businessType || 'service',
        services: workshopProfile.services || {}, vehicles: workshopProfile.vehicles || [],
        parts_categories: workshopProfile.partsCategories || [], parts_type: workshopProfile.partsType || 'new',
        wrecking: workshopProfile.wrecking || false, wrecking_makes: workshopProfile.wreckingMakes || [],
    } : (profile.workshop_data || null);

    if (isTradeOrProProfile && wd) {
        renderWorkshopStorefront({
            user_id: userId, sellerName,
            logo_url: isOwn ? (userSettings.profilePic || userSettings.businessLogo || '') : (profile.avatar_url || ''),
            business_name: isOwn ? (userSettings.businessName || '') : (profile.business_name || ''),
            abn: isOwn ? (userSettings.abn || '') : (profile.abn || ''),
            about: isOwn ? (userSettings.about || '') : (profile.about || ''),
            location: isOwn ? (userSettings.location || '') : (profile.location || ''),
            banner_color: isOwn ? (userSettings.bannerColor || null) : (profile.banner_color || null),
            address: isOwn ? (workshopProfile.address || '') : (profile.workshop_address || ''),
            biz_type: wd.biz_type || 'service', services: wd.services || {},
            vehicles: wd.vehicles || [], parts_categories: wd.parts_categories || [],
            parts_type: wd.parts_type || 'new', wrecking: wd.wrecking || false,
            wrecking_makes: wd.wrecking_makes || [],
        });
    } else {
        renderStorefront(
            sellerName, isTradeOrProProfile,
            profile.avatar_url || '', profile.business_name || '',
            profile.abn || '', profile.about || '',
            profile.location || '', '', profile.banner_color || null, userId
        );
    }

    const sfMsgBtn = document.getElementById('sfMsgBtn');
    if (sfMsgBtn) sfMsgBtn.style.display = isOwn ? 'none' : '';
    const sfEl    = document.getElementById('storefrontDrawer');
    const backBar = document.getElementById('storefrontBackBar');
    if (sfEl)    sfEl.style.zIndex    = '';
    if (backBar) backBar.style.display = 'none';
    openDrawer('storefrontDrawer');
    _sfLoadSellerListings(userId, sellerName);
}

// Fetch a seller's active listings directly (scoped to seller_id) so the storefront shows
// ALL their stock to anyone — including a logged-out visitor arriving via the QR badge, whose
// global feed hasn't paged in that seller's parts yet. Merges into partDatabase (deduped).
async function _sfLoadSellerListings(userId, sellerName) {
    if (!sb || !userId) { _sfRenderGrid(userId, sellerName); return; }
    const { data: rows } = await sb.from('listings').select(LISTING_SELECT_COLS)
        .eq('seller_id', userId).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(200);
    (rows || []).forEach(r => {
        if (partDatabase.some(p => p.supabaseId === r.id) || userListings.some(l => l.supabaseId === r.id)) return;
        partDatabase.push({ ..._listingRowToPart(r), seller: sellerName || r.seller_name || '' });
    });
    _sfRenderGrid(userId, sellerName);
}

function _sfRenderGrid(userId, sellerName) {
    const grid = document.getElementById('sellerPartsGrid');
    if (!grid) return;
    const sName = sellerName || grid.dataset.seller || currentStorefrontSeller || '';
    const parts = getAllParts().filter(p =>
        userId ? (p.sellerId === userId || p.seller === sName) : p.seller === sName);
    grid.innerHTML = parts.map(p => buildCardHTML(p)).join('');
    _sfUpdatePartsVisibility();
    const listEl = document.getElementById('sfStatListings');
    const saveEl = document.getElementById('sfStatSaves');
    if (listEl) listEl.textContent = parts.length;
    if (saveEl) saveEl.textContent = parts.reduce((s, p) => s + (p.saves || 0), 0);
}

// --- CORE UI CONTROLS ---

// Close all open drawers, then open the requested one.
// Pass `allowStack: true` to open on top of an existing drawer (e.g. storefront from detail).
function toggleDrawer(id, allowStack = false) {
    const drawer = document.getElementById(id);
    if (!drawer) return;

    if (!allowStack) {
        document.querySelectorAll('.drawer.active').forEach(d => {
            if (d.id !== id) d.classList.remove('active');
        });
    }

    drawer.classList.toggle('active');

    if (drawer.classList.contains('active')) {
        const content = drawer.querySelector('.drawer-content');
        if (content) content.scrollTop = 0;
    }

    const anyOpen = document.querySelectorAll('.drawer.active').length > 0;
    // Stay locked if still in Pro mode (dashboard is the base layer) after a drawer closes.
    const proMode = document.getElementById('dashboardView')?.style.display !== 'none';
    document.body.style.overflow = (anyOpen || proMode) ? 'hidden' : 'auto';
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.toggle('active', anyOpen);
}

function openDrawer(id) {
    const drawer = document.getElementById(id);
    if (!drawer) return;
    drawer.classList.add('active');
    const content = drawer.querySelector('.drawer-content');
    if (content) content.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.add('active');
}

function syncBackdrop() {
    const dashVisible = document.getElementById('dashboardView')?.style.display !== 'none';
    const drawersOpen = document.querySelectorAll('.drawer.active:not(#filterDrawer)').length > 0
        || (window.innerWidth < 900 && document.querySelectorAll('.drawer.active').length > 0);
    // In Pro mode the marketplace is the base layer behind the dashboard — lock its
    // scroll so the mouse wheel doesn't run a hidden scrollbar underneath.
    document.body.style.overflow = (drawersOpen || dashVisible) ? 'hidden' : 'auto';
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.toggle('active', dashVisible || drawersOpen);
}

// Keep inbox pinned to the visual viewport when the keyboard opens on iOS/Android.
// iOS Safari scrolls the page on input focus (vv.offsetTop > 0), so we must
// reposition both top and height to match the visual viewport exactly.
function syncInboxToKeyboard() {
    if (window.innerWidth >= 900) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const kbOpen = vv.height < window.innerHeight - 50;
    ['inboxDrawer', 'chatDrawer'].forEach(drawerId => {
        const drawer = document.getElementById(drawerId);
        if (!drawer || !drawer.classList.contains('active')) return;
        if (kbOpen) {
            drawer.style.top    = Math.round(vv.offsetTop) + 'px';
            drawer.style.height = Math.round(vv.height)    + 'px';
            drawer.style.bottom = 'auto';
        } else {
            drawer.style.top    = '';
            drawer.style.height = '';
            drawer.style.bottom = '';
        }
    });
    if (kbOpen) {
        const msgList = document.getElementById('inboxMsgList');
        if (msgList) setTimeout(() => { msgList.scrollTop = msgList.scrollHeight; }, 80);
        const chatBox = document.getElementById('chatBox');
        if (chatBox) setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 80);
    }
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncInboxToKeyboard);
    window.visualViewport.addEventListener('scroll', syncInboxToKeyboard);
}

function closeTopDrawer() {
    const openDrawers = Array.from(document.querySelectorAll('.drawer.active'))
        .filter(d => !(d.id === 'filterDrawer' && window.innerWidth >= 900));
    if (!openDrawers.length) return;
    openDrawers[openDrawers.length - 1].classList.remove('active');
    syncBackdrop();
}

// --- FILTER HELPERS ---

function getFilterValues() {
    activeFilters.category = document.querySelector('#filterDrawer select')?.value || 'all';

    activeFilters.make   = (document.getElementById('filterMake')?.value   || '').trim().toLowerCase();
    activeFilters.model  = (document.getElementById('filterModel')?.value  || '').trim().toLowerCase();
    activeFilters.year   = (document.getElementById('filterYear')?.value   || '').trim();
    activeFilters.series = (document.getElementById('filterSeries')?.value || '').trim().toLowerCase();

    activeFilters.location = document.getElementById('filterStateSelect')?.value || 'all';

    activeFilters.postcode = document.getElementById('filterPostcode')?.value.trim() || '';
    const activeRadius = document.querySelector('#radiusSegControl .radius-seg.active');
    activeFilters.radius = activeFilters.postcode ? (activeRadius?.dataset.radius || '50') : null;

    activeFilters.conditions = [
        document.getElementById('filterCondNewOem')?.checked  && 'new_oem',
        document.getElementById('filterCondNewAft')?.checked  && 'new_aftermarket',
        document.getElementById('filterCondUsed')?.checked    && 'used',
        document.getElementById('filterCondRefurb')?.checked  && 'refurbished',
        document.getElementById('filterCondParts')?.checked   && 'parts_only',
    ].filter(Boolean);
    const checkboxes = document.querySelectorAll('#filterDrawer input[type="checkbox"]');
    if (checkboxes.length >= 9) {
        activeFilters.postage       = checkboxes[5].checked;
        activeFilters.pickup        = checkboxes[6].checked;
        activeFilters.sellerPrivate = checkboxes[7].checked;
        activeFilters.sellerPro     = checkboxes[8].checked;
    }
}

function onFilterRadiusPostcodeInput(input) {
    input.value = input.value.replace(/\D/g, '');
    const hasPostcode = input.value.trim().length > 0;
    const control = document.getElementById('radiusSegControl');
    const stateSelect = document.getElementById('filterStateSelect');
    if (control) control.classList.toggle('radius-seg-disabled', !hasPostcode);
    if (stateSelect) {
        stateSelect.disabled = hasPostcode;
        stateSelect.classList.toggle('filter-input-disabled', hasPostcode);
        if (hasPostcode) stateSelect.value = 'all';
    }
    applyFiltersLive();
}

function onStateChange(select) {
    const hasState = select.value !== 'all';
    const postcodeInput = document.getElementById('filterPostcode');
    const control = document.getElementById('radiusSegControl');
    if (hasState && postcodeInput) {
        postcodeInput.value = '';
        if (control) control.classList.add('radius-seg-disabled');
    }
    applyFiltersAndRender();
}

function setRadiusFilter(el) {
    const control = document.getElementById('radiusSegControl');
    if (control && control.classList.contains('radius-seg-disabled')) return;
    document.querySelectorAll('#radiusSegControl .radius-seg').forEach(s => s.classList.remove('active'));
    if (el) el.classList.add('active');
    applyFiltersAndRender();
}

function setSortOrder(el, order) {
    if (sortOrder === order) {
        sortOrder = 'none';
        document.querySelectorAll('#sortSegControl .radius-seg').forEach(s => s.classList.remove('active'));
    } else {
        sortOrder = order;
        document.querySelectorAll('#sortSegControl .radius-seg').forEach(s => s.classList.remove('active'));
        if (el) el.classList.add('active');
    }
    renderMainGrid();
}


function countActiveFilters() {
    let n = 0;
    if (activeFilters.search) n++;
    if (activeFilters.category !== 'all') n++;
    if (activeFilters.make) n++;
    if (activeFilters.model) n++;
    if (activeFilters.year) n++;
    if (activeFilters.location !== 'all') n++;
    if (activeFilters.postcode) n++;
    if (sortOrder !== 'none') n++;
    if (activeFilters.conditions && activeFilters.conditions.length < 5) n++;
    if (!activeFilters.postage || !activeFilters.pickup) n++;
    if (!activeFilters.sellerPrivate || !activeFilters.sellerPro) n++;
    return n;
}

function updateFilterChip() {
    const chip = document.getElementById('filterStatusChip');
    if (!chip) return;
    const n = countActiveFilters();
    if (n > 0) {
        const count = getFilteredParts().length;
        chip.innerHTML = `<span>${count} result${count !== 1 ? 's' : ''} &nbsp;·&nbsp; ${n} filter${n !== 1 ? 's' : ''} active</span><button onclick="clearAllFilters()" aria-label="Clear filters">✕ Clear</button>`;
        chip.style.display = 'flex';
    } else {
        chip.style.display = 'none';
    }
    updateHeaderOffset();
}

function initFilterVehicleDropdowns() {
    const makeEl  = document.getElementById('filterMake');
    const yearEl  = document.getElementById('filterYear');
    if (makeEl && !makeEl.querySelector('option[value="Toyota"]')) {
        makeEl.innerHTML = '<option value="">Any Make</option>' +
            VEHICLE_MAKES.map(m => `<option value="${m}">${m}</option>`).join('');
    }
    if (yearEl && yearEl.options.length < 3) {
        const current = new Date().getFullYear();
        let html = '<option value="">Any Year</option>';
        for (let y = current + 1; y >= 1950; y--) html += `<option value="${y}">${y}</option>`;
        yearEl.innerHTML = html;
    }
}

function _refreshFilterSeries(make, model, year) {
    const group = document.getElementById('filterSeriesGroup');
    const sel   = document.getElementById('filterSeries');
    if (!sel || !group) return;
    if (!model) { group.style.display = 'none'; sel.innerHTML = '<option value="">Any Series</option>'; return; }
    const rawHtml = buildSeriesOptions(make, model, year, '');
    if (!rawHtml) { group.style.display = 'none'; sel.innerHTML = '<option value="">Any Series</option>'; return; }
    sel.innerHTML = '<option value="">Any Series</option>' + rawHtml.replace('<option value="">Select series</option>', '');
    group.style.display = '';
}

function onFilterMakeChange() {
    const make    = document.getElementById('filterMake')?.value || '';
    const modelEl = document.getElementById('filterModel');
    const yearEl  = document.getElementById('filterYear');
    if (modelEl) {
        modelEl.innerHTML = '<option value="">Any Model</option>' +
            getVehicleModels(make).map(m => `<option value="${m}">${m}</option>`).join('');
    }
    if (yearEl) yearEl.innerHTML = buildYearOptions('');
    _refreshFilterSeries('', '', '');
    if (window.innerWidth >= 900) applyFiltersAndRender();
}

function onFilterModelChange() {
    const make  = document.getElementById('filterMake')?.value || '';
    const model = document.getElementById('filterModel')?.value || '';
    const yearEl = document.getElementById('filterYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '').replace('<option value="">Year</option>', '<option value="">Any Year</option>');
    _refreshFilterSeries('', '', ''); // hide series — wait for year selection
    if (window.innerWidth >= 900) applyFiltersAndRender();
}

function onFilterYearChange() {
    const make  = document.getElementById('filterMake')?.value || '';
    const model = document.getElementById('filterModel')?.value || '';
    const year  = document.getElementById('filterYear')?.value || '';
    _refreshFilterSeries(make, model, year);
    onFilterChange();
}

function applyFiltersAndRender() {
    getFilterValues();
    renderMainGrid();
    updateFilterChip();
    refreshSponsoredCards();
    if (window.innerWidth < 900) toggleDrawer('filterDrawer');
}

// Called by inline onchange on individual filter inputs — only auto-applies on desktop;
// on mobile the user taps "Update Results" to apply manually.
function onFilterChange() {
    if (window.innerWidth >= 900) applyFiltersAndRender();
}

function applyFiltersLive() {
    getFilterValues();
    renderMainGrid();
    updateFilterChip();
    refreshSponsoredCards();
}

function clearAllFilters() {
    // Reset DOM
    const categorySelect = document.querySelector('#filterDrawer select');
    if (categorySelect) categorySelect.value = 'all';
    const makeEl = document.getElementById('filterMake');
    if (makeEl) { makeEl.value = ''; onFilterMakeChange(); }
    const yearEl = document.getElementById('filterYear');
    if (yearEl) yearEl.value = '';
    const stateSelect = document.getElementById('filterStateSelect');
    if (stateSelect) { stateSelect.value = 'all'; stateSelect.disabled = false; stateSelect.classList.remove('filter-input-disabled'); }
    const postcodeInput = document.getElementById('filterPostcode');
    if (postcodeInput) postcodeInput.value = '';
    const radiusControl = document.getElementById('radiusSegControl');
    if (radiusControl) {
        radiusControl.classList.add('radius-seg-disabled');
        radiusControl.querySelectorAll('.radius-seg').forEach((s, i) => s.classList.toggle('active', i === 0));
    }
    document.querySelectorAll('#sortSegControl .radius-seg').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#filterDrawer input[type="checkbox"]').forEach(cb => cb.checked = true);
    // Reset globals
    sortOrder = 'none';
    sortDate  = 'newest';
    // Re-render (getFilterValues reads fresh DOM state)
    getFilterValues();
    renderMainGrid();
    updateFilterChip();
    showToast('Filters cleared');
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getFilteredParts() {
    const search = activeFilters.search.toLowerCase();
    const results = getAllParts().filter(part => {
        if (_hiddenSellerIds.has(part.sellerId) && part.sellerId !== currentUserId) return false;
        if (search) {
            const isPro = userIsSignedIn && currentUserTier === 'pro';
            const tokens = search.split(/\s+/).filter(Boolean);
            const vehicleText = (part.fits || []).map(f => [f.make, f.model, f.variant].filter(Boolean).join(' ')).join(' ').toLowerCase();
            const haystack = [
                part.title.toLowerCase(),
                (part.description || '').toLowerCase(),
                part.loc.toLowerCase(),
                vehicleText
            ].join(' ');
            const textMatch = tokens.every(t => haystack.includes(t));
            const apcIdMatch = isPro && part.apcId && part.apcId.toLowerCase().includes(search);
            const isOwnListing = userListings.some(l => l.id === part.id);
            const stockMatch = isPro && isOwnListing && part.stockNumber && String(part.stockNumber).includes(search);
            if (!textMatch && !apcIdMatch && !stockMatch) return false;
        }
        if (activeFilters.category !== 'all' && part.category !== activeFilters.category) return false;
        if (activeFilters.make && part.fits.length > 0) {
            const mk = activeFilters.make;
            if (!part.fits.some(f => f.make?.toLowerCase().includes(mk)) && !part.title.toLowerCase().includes(mk)) return false;
        }
        if (activeFilters.model && part.fits.length > 0) {
            const mdl = activeFilters.model;
            if (!part.fits.some(f => f.model?.toLowerCase().includes(mdl)) && !part.title.toLowerCase().includes(mdl)) return false;
        }
        if (activeFilters.series && part.fits.length > 0) {
            const srv = activeFilters.series;
            if (!part.fits.some(f => f.variant?.toLowerCase() === srv)) return false;
        }
        if (activeFilters.year && part.year) {
            const searchYr = Number(activeFilters.year);
            const partYr   = Number(part.year);
            if (searchYr && partYr) {
                const partMake  = part.fits?.[0]?.make  || '';
                const partModel = part.fits?.[0]?.model || '';
                const range = getVehicleYearRange(partMake, partModel, partYr);
                if (range) {
                    if (searchYr < range[0] || searchYr > range[1]) return false;
                } else {
                    if (partYr !== searchYr) return false;
                }
            }
        }
        if (activeFilters.location !== 'all') {
            const stateCode = part.loc.split(',')[1]?.trim();
            if (stateCode !== activeFilters.location) return false;
        }
        if (activeFilters.postcode && activeFilters.radius) {
            const coords = typeof AU_POSTCODE_COORDS !== 'undefined' && AU_POSTCODE_COORDS;
            const origin = coords && coords[activeFilters.postcode];
            if (origin) {
                const pc = part.postcode || (part.loc.match(/\b(\d{4})\b/) || [])[1];
                const dest = pc && coords[pc];
                if (dest) {
                    const km = haversineKm(origin[0], origin[1], dest[0], dest[1]);
                    if (km > Number(activeFilters.radius)) return false;
                }
                // if listing has no coords, let it through (permissive fallback)
            }
        }
        if (!activeFilters.sellerPro && part.isPro) return false;
        if (!activeFilters.sellerPrivate && !part.isPro) return false;
        if (part.tradeOnly && currentUserTier === 'personal') return false;
        if (activeFilters.conditions && activeFilters.conditions.length < 5 && part.condition) {
            if (!activeFilters.conditions.includes(part.condition)) return false;
        }
        // Postage / pickup — only filter when at least one is unchecked
        if (!activeFilters.postage || !activeFilters.pickup) {
            const hasPickup  = part.pickup  !== false;   // available unless explicitly false
            const hasPostage = part.postage === true;     // only if explicitly enabled
            const ok = (activeFilters.postage && hasPostage) || (activeFilters.pickup && hasPickup);
            if (!ok) return false;
        }
        return true;
    });
    const origin = (userSettings.postcode && typeof AU_POSTCODE_COORDS !== 'undefined')
        ? AU_POSTCODE_COORDS[userSettings.postcode] : null;
    const kmCache = new Map();
    const getKm = part => {
        if (!kmCache.has(part.id)) {
            const pc = part.postcode || (part.loc.match(/\b(\d{4})\b/) || [])[1];
            const dest = pc && origin && AU_POSTCODE_COORDS[pc];
            kmCache.set(part.id, dest ? haversineKm(origin[0], origin[1], dest[0], dest[1]) : null);
        }
        return kmCache.get(part.id);
    };
    results.sort((a, b) => {
        if (sortOrder === 'asc')  { const d = a.price - b.price; if (d !== 0) return d; }
        if (sortOrder === 'desc') { const d = b.price - a.price; if (d !== 0) return d; }
        if (origin) { const d = (getKm(a) ?? 99999) - (getKm(b) ?? 99999); if (d !== 0) return d; }
        return (b.date || 0) - (a.date || 0);
    });
    return results;
}

// --- RENDER HELPERS ---

// Safe way to set text — avoids XSS by never using innerHTML for user-supplied content
function safeText(el, text) {
    if (el) el.textContent = text;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Returns a Supabase image-transform URL for thumbnails.
// Non-Supabase URLs (external images) are returned unchanged.
function thumbUrl(url, width = 400) {
    if (!url || !url.includes('/storage/v1/object/public/')) return url;
    return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
           + '?width=' + width + '&quality=75';
}

function buildCardHTML(part, eager = false) {
    // Only part.id goes into the onclick — never unsanitised user content
    const fittingLabel = part.fit
        ? `<span class="fitting-pill">FITTING AVAILABLE</span>`
        : '';

    const tradeBadge = part.tradeOnly
        ? `<span class="trade-only-badge">TRADE</span>`
        : '';

    const locationHTML = `📍 ${escapeHtml(part.loc)}`;

    const savedDot = savedParts.has(part.supabaseId || part.id) ? '<div class="card-saved-dot">&#x2665;&#xFE0E;</div>' : '';

    const pendingBanner = part.status === 'pending'
        ? `<div class="card-pending-banner">PENDING</div>`
        : '';

    const fit = part.fits?.[0];
    const fitsLine = fit
        ? `<div class="item-fits">${escapeHtml(fit.make)} ${escapeHtml(fit.model)}${fit.variant ? ' ' + escapeHtml(fit.variant) : ''}${part.year ? ' · ' + part.year : ''}</div>`
        : '';

    const rating = _sellerRatingCache[part.sellerId];
    const ratingHTML = rating
        ? `<div class="item-rating">★ ${rating.avg} <span class="item-rating-count">(${rating.count})</span></div>`
        : '';

    return `
        <div class="item-card" onclick="openItemDetail('${part.supabaseId || part.id}')">
            <div class="item-img-wrap">
                <img class="item-img" src="${escapeHtml(thumbUrl(part.images[0]))}" alt="${escapeHtml(part.title)}" loading="${eager ? 'eager' : 'lazy'}">
            </div>
            ${pendingBanner}
            <div class="item-info">
                <div class="price-row">
                    <span class="item-price">$${part.price}</span>
                    ${tradeBadge}${fittingLabel}
                </div>
                <div class="item-title">${escapeHtml(part.title)}</div>
                ${fitsLine}
                <div class="item-loc">${locationHTML}</div>
            </div>
            ${savedDot}
        </div>`;
}

// Reflect the current saved state on both heart buttons in the detail overlay
function syncDetailSaveButton(partId) {
    const isSaved = savedParts.has(partId);

    // Mobile: floating heart on carousel image
    const btn = document.getElementById('detailSaveBtn');
    if (btn) {
        btn.classList.toggle('saved', isSaved);
        btn.textContent = isSaved ? '♥' : '♡';
        btn.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save listing');
    }

    // Desktop + mobile: SVG heart in info col actions row
    const btnInfo = document.getElementById('detailSaveBtnInfo');
    if (btnInfo) {
        btnInfo.style.display = userIsSignedIn ? '' : 'none';
        btnInfo.classList.toggle('saved', isSaved);
        btnInfo.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save listing');
    }
}

function updateGridHeading(label, count, opts = {}) {
    const el = document.getElementById('gridHeading');
    if (!el) return;
    const { total = null, partial = false, noun = 'part' } = opts;
    let countText;
    if (total != null && total > count) {
        countText = `Showing ${count.toLocaleString()} of ${total.toLocaleString()} ${noun}${total !== 1 ? 's' : ''}`;
    } else {
        countText = `${count.toLocaleString()}${partial ? '+' : ''} ${noun}${count !== 1 ? 's' : ''}`;
    }
    el.innerHTML = `<span class="grid-heading-label">${label}</span><span class="grid-heading-count">${countText}</span>`;
    el.style.display = 'flex';
}

function goHome() {
    document.querySelectorAll('.drawer.active').forEach(d => d.classList.remove('active'));
    // Dashboard is not a drawer — close it explicitly and restore panels
    const dv = document.getElementById('dashboardView');
    if (dv) dv.style.display = 'none';
    const fd = document.getElementById('filterDrawer');
    const rp = document.querySelector('.desktop-right-panel');
    if (fd) fd.style.removeProperty('display');
    if (rp) rp.style.removeProperty('display');
    syncBackdrop();
    renderMainGrid();
    window.scrollTo(0, 0);
    setActiveNav('homeNavItem');
    setDtbActive('dtbHome');
}

// --- RENDER MAIN HOME GRID ---
function renderSkeletonGrid(count = 8) {
    const mainGrid = document.getElementById('mainGrid');
    if (!mainGrid) return;
    const card = `
        <div class="skeleton-card">
            <div class="skeleton-line skeleton-img"></div>
            <div class="skeleton-info">
                <div class="skeleton-line skeleton-price"></div>
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-title2"></div>
                <div class="skeleton-line skeleton-loc"></div>
            </div>
        </div>`;
    mainGrid.innerHTML = Array(count).fill(card).join('');
}

function renderMainGrid() {
    const mainGrid = document.getElementById('mainGrid');
    if (!mainGrid) return;

    mainGrid.innerHTML = '';

    setDtbActive(null);

    const filtered = getFilteredParts();
    mainGrid.innerHTML = '';

    const hasSearch  = !!activeFilters.search.trim();
    const hasFilters = countActiveFilters() > 0;

    if (filtered.length === 0) {
        const hdEl = document.getElementById('gridHeading');
        if (hdEl) hdEl.style.display = 'none';
        if (hasSearch) {
            const safeSearch = escapeHtml(activeFilters.search);
            mainGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888;">
                    <div style="font-weight: 700; margin-bottom: 10px;">No parts found for "${safeSearch}"</div>
                    <div style="font-size: 13px; margin-bottom: 20px;">Can't find what you're looking for?</div>
                    <button onclick="onAddWantedFromSearch()" style="background: var(--apc-orange); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer;">ADD TO WANTED LIST</button>
                </div>`;
        } else {
            mainGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888;">
                    <div style="font-size:32px; margin-bottom:12px;">🔍</div>
                    <div style="font-weight:800; font-size:15px; margin-bottom:8px; color:#555;">No parts match your filters</div>
                    <div style="font-size:13px; margin-bottom:20px;">Try broadening your search or adjusting the filters.</div>
                    <button onclick="clearAllFilters()" style="background:var(--apc-orange); color:white; border:none; padding:10px 22px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:0.5px;">Clear Filters</button>
                </div>`;
        }
        return;
    }

    // Set heading label based on state
    if (hasSearch) {
        updateGridHeading(`Results for "${escapeHtml(activeFilters.search)}"`, filtered.length, { noun: 'result', partial: !_listingsExhausted });
    } else if (hasFilters) {
        updateGridHeading('Filtered results', filtered.length, { noun: 'result', partial: !_listingsExhausted });
    } else {
        updateGridHeading('Recently Listed', filtered.length, { total: _marketplaceTotal });
    }

    mainGrid.innerHTML = buildGridWithSponsored(filtered);
}

// ── WANTED ↔ LISTING MATCH ALGORITHM ────────────────────────────────────────
// Used both to hide already-stocked items in the seller's wanted feed,
// and to suggest which buyers to notify after a new listing is published.
function wantedMatchesListing(w, listing) {
    // Category must match if both sides have one
    const lCat = (listing.category || '').toLowerCase();
    const wCat = (w.category   || '').toLowerCase();
    if (lCat && wCat && lCat !== wCat) return false;

    // Make must match if both sides have one
    const lMake  = (listing.fits?.[0]?.make  || '').toLowerCase().trim();
    const wMake  = (w.make  || '').toLowerCase().trim();
    if (lMake && wMake && lMake !== wMake) return false;

    // Model must overlap if both sides have one
    const lModel = (listing.fits?.[0]?.model || '').toLowerCase().trim();
    const wModel = (w.model || '').toLowerCase().trim();
    if (lModel && wModel && !lModel.includes(wModel) && !wModel.includes(lModel)) return false;

    // Part-name word match: ALL significant words in the wanted request
    // must appear somewhere in the listing title (prevents "engine" matching "engine cover")
    const stopWords    = new Set(['for','a','an','the','of','with','to','from','in','on','at','and','or','my','i','need','wanted','looking','seeking','suit','suits']);
    const vehicleTerms = new Set([lMake, wMake, lModel, wModel].filter(Boolean));
    const tokenize = str => str.toLowerCase().split(/[\s\-\/,]+/)
        .filter(t => t.length > 2 && !stopWords.has(t) && !vehicleTerms.has(t));

    const lWords = tokenize(listing.title || '');
    const wWords = tokenize(w.partName    || '');
    if (!lWords.length || !wWords.length) return false;

    return wWords.every(ww => lWords.some(lw => lw === ww || lw.startsWith(ww) || ww.startsWith(lw)));
}

function findWantedMatches(listing) {
    if (!publicWantedDatabase.length) return [];
    return publicWantedDatabase.filter(w => wantedMatchesListing(w, listing));
}

// ── NOTIFY BUYERS MODAL ──────────────────────────────────────────────────────
function showNotifyBuyersModal(matches, listing) {
    const modal = document.getElementById('notifyBuyersModal');
    const list  = document.getElementById('notifyBuyersList');
    if (!modal || !list) return;

    list.innerHTML = '';
    // Put the directly-triggered request first
    const sorted = [...matches].sort((a, b) => (b.id === _fromWantedId) - (a.id === _fromWantedId));
    sorted.forEach(w => {
        const isDirect = w.id === _fromWantedId;
        const label = document.createElement('label');
        label.className = 'notify-buyer-item' + (isDirect ? ' notify-item-direct' : '');
        const vehicle = [w.make, w.model, w.year].filter(Boolean).join(' ');
        label.innerHTML = `
            <input type="checkbox" class="notify-buyer-cb" data-wanted-id="${w.id}" data-user-id="${w.userId}" checked>
            <div class="notify-buyer-details">
                ${isDirect ? '<span class="notify-direct-tag">Original request</span>' : ''}
                <div class="notify-buyer-part">${escapeHtml(w.partName)}</div>
                <div class="notify-buyer-vehicle">${escapeHtml(vehicle)}${w.loc ? ' · ' + escapeHtml(w.loc) : ''}</div>
                ${w.maxPrice ? `<div class="notify-buyer-budget">Budget up to $${w.maxPrice}</div>` : ''}
            </div>`;
        list.appendChild(label);
    });

    modal.dataset.listingId    = listing.supabaseId || '';
    modal.dataset.listingTitle = listing.title || '';
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
}

function closeNotifyModal() {
    const modal = document.getElementById('notifyBuyersModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

async function confirmNotifyBuyers() {
    const modal = document.getElementById('notifyBuyersModal');
    if (!modal) return;
    const listingId    = modal.dataset.listingId;
    const listingTitle = modal.dataset.listingTitle;
    const checked = [...modal.querySelectorAll('.notify-buyer-cb:checked')];
    if (!checked.length) { closeNotifyModal(); return; }

    const btn = document.getElementById('notifyConfirmBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    const lid = Number(listingId) || null;
    // Server-side notify_buyer RPC: verifies we own the listing + the target has that wanted
    // request, and templates the message — so the notifications table isn't open to spam.
    const results = await Promise.all(checked.map(cb =>
        sb.rpc('notify_buyer', {
            p_kind: 'listing_match',
            p_user_id: cb.dataset.userId,
            p_listing_id: lid,
            p_wanted_part_id: Number(cb.dataset.wantedId) || null,
        }).then(({ data, error }) => !error && data === true)
    ));
    const sent = results.filter(Boolean).length;
    if (!sent) showToast('Could not send notifications');
    else showToast(`${sent} buyer${sent !== 1 ? 's' : ''} notified`);

    if (btn) { btn.disabled = false; btn.textContent = 'NOTIFY SELECTED BUYERS'; }
    closeNotifyModal();
}

// Returns true if this seller already has a listing covering the wanted request.
// Match requires part name overlap AND vehicle make/model compatibility.

// --- RENDER MY PARTS ---
async function syncListingStatusToSupabase(listing, status) {
    if (!listing.supabaseId) return;
    const row = { status: status || 'active' };
    if (status === 'sold') row.sold_at = new Date().toISOString();
    if (status === 'active') row.sold_at = null;
    await sb.from('listings').update(row).eq('id', listing.supabaseId);
}

function setListingStatus(id, status) {
    const part = userListings.find(p => p.id === id);
    if (!part) return;
    if (status === null || status === undefined) { delete part.status; status = 'active'; }
    else part.status = status;
    saveUserListings();
    renderMainGrid();
    renderMyParts();
    if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
    showToast(status === 'pending' ? 'Marked as Pending' : status === 'sold' ? 'Marked as Sold' : 'Listing relisted as Active');
    syncListingStatusToSupabase(part, status);
}

function showBuyerFeedbackDialog(listingId) {
    const listing = userListings.find(p => p.id === listingId);
    if (!listing) return;

    const enquirers = [...new Set(
        conversations
            .filter(c => c.partId === listing.supabaseId || c.partId === listingId)
            .map(c => c.with)
            .filter(Boolean)
    )];

    const existing = document.getElementById('apcFeedbackDialog');
    if (existing) existing.remove();

    let selectedBuyer = enquirers.length ? enquirers[0] : null;
    let isOther = enquirers.length === 0;
    let selectedStars = 0;

    const overlay = document.createElement('div');
    overlay.id = 'apcFeedbackDialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.18);';

    // Header
    const hdr = document.createElement('div');
    hdr.innerHTML = `<div style="font-weight:800;font-size:17px;color:#111;margin-bottom:4px;">Who bought it?</div>
        <div style="font-size:12px;color:#888;margin-bottom:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(listing.title)}</div>`;
    box.appendChild(hdr);

    // Buyer chips
    const pickerWrap = document.createElement('div');
    pickerWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;';

    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.placeholder = 'Enter name…';
    otherInput.style.cssText = 'width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;margin-top:8px;display:' + (isOther ? '' : 'none');

    const makeChip = (label, isSelected, onClick) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.style.cssText = `padding:7px 14px;border-radius:20px;border:1.5px solid ${isSelected ? 'var(--apc-orange)' : '#ddd'};background:${isSelected ? '#fff5ee' : '#fff'};color:${isSelected ? 'var(--apc-orange)' : '#555'};font-weight:700;font-size:12px;cursor:pointer;transition:all 0.15s;font-family:inherit;`;
        btn.onclick = () => {
            onClick();
            pickerWrap.querySelectorAll('button').forEach(b => {
                b.style.borderColor = '#ddd'; b.style.background = '#fff'; b.style.color = '#555';
            });
            btn.style.borderColor = 'var(--apc-orange)';
            btn.style.background  = '#fff5ee';
            btn.style.color       = 'var(--apc-orange)';
        };
        return btn;
    };

    enquirers.forEach(name => {
        const chip = makeChip(name, name === selectedBuyer, () => {
            selectedBuyer = name; isOther = false; otherInput.style.display = 'none';
        });
        pickerWrap.appendChild(chip);
    });

    const otherChip = makeChip('Other…', isOther, () => {
        selectedBuyer = null; isOther = true; otherInput.style.display = '';
        otherInput.focus();
    });
    pickerWrap.appendChild(otherChip);
    pickerWrap.appendChild(otherInput);
    box.appendChild(pickerWrap);

    // Stars
    const starsSection = document.createElement('div');
    starsSection.style.cssText = 'margin-bottom:22px;';
    starsSection.innerHTML = '<div style="font-size:12px;font-weight:700;color:#888;margin-bottom:8px;letter-spacing:0.3px;">RATE THE BUYER (optional)</div>';
    const starsRow = document.createElement('div');
    starsRow.style.cssText = 'display:flex;gap:6px;';
    const renderStars = (n) => {
        selectedStars = n;
        starsRow.querySelectorAll('span').forEach((s, i) => {
            s.style.color = i < n ? '#f59e0b' : '#ddd';
        });
    };
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span');
        s.textContent = '★';
        s.style.cssText = `font-size:28px;cursor:pointer;color:#ddd;transition:color 0.1s;`;
        s.onclick = () => renderStars(i);
        starsRow.appendChild(s);
    }
    starsSection.appendChild(starsRow);
    box.appendChild(starsSection);

    // Note
    const noteWrap = document.createElement('div');
    noteWrap.style.cssText = 'margin-bottom:20px;';
    const noteLabel = document.createElement('div');
    noteLabel.style.cssText = 'font-size:12px;font-weight:700;color:#888;margin-bottom:8px;letter-spacing:0.3px;';
    noteLabel.textContent = 'ADD A NOTE (optional)';
    const noteInput = document.createElement('textarea');
    noteInput.maxLength = 120;
    noteInput.rows = 2;
    noteInput.placeholder = 'e.g. Great buyer, paid quickly…';
    noteInput.style.cssText = 'width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;line-height:1.4;';
    const noteCount = document.createElement('div');
    noteCount.style.cssText = 'text-align:right;font-size:11px;color:#bbb;margin-top:3px;';
    noteCount.textContent = '0 / 120';
    noteInput.oninput = () => { noteCount.textContent = `${noteInput.value.length} / 120`; };
    noteWrap.appendChild(noteLabel);
    noteWrap.appendChild(noteInput);
    noteWrap.appendChild(noteCount);
    box.appendChild(noteWrap);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;';

    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = 'flex:1;padding:11px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;color:#555;';
    skipBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'flex:2;padding:11px;border:none;border-radius:8px;background:var(--apc-orange);color:#fff;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;';
    saveBtn.onclick = () => {
        const buyerName = isOther ? (otherInput.value.trim() || null) : selectedBuyer;
        const note = noteInput.value.trim() || null;
        listing.buyerRating = { stars: selectedStars || null, buyerName: buyerName || null, note };
        listing.soldDate = listing.soldDate || Date.now();
        saveUserListings();
        renderMyParts();
        overlay.remove();
        showToast(buyerName ? `Saved — sold to ${buyerName}` : 'Sale recorded');

        // Notify buyer to rate the seller (only when a named enquirer was selected, not walk-in)
        if (!isOther && buyerName && sb && listing.supabaseId) {
            const matchedConv = conversations.find(c =>
                (c.partId === listing.supabaseId || c.partId === listingId) && c.with === buyerName
            );
            const buyerUserId = matchedConv?.buyerId;
            if (buyerUserId) {
                sb.rpc('notify_buyer', {
                    p_kind: 'rate_seller',
                    p_user_id: buyerUserId,
                    p_listing_id: listing.supabaseId,
                }).then(({ error }) => { if (error) console.warn('rate_seller notif:', error.message); });
            }
        }
    };

    btnRow.appendChild(skipBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(btnRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function confirmDeleteListing(id) {
    const part = userListings.find(p => p.id === id);
    if (!part) return;
    showConfirmDialog(
        'Delete Listing',
        `Are you sure you want to delete "${part.title}"? This cannot be undone.`,
        'Delete',
        () => deleteListing(id)
    );
}

function confirmListingAction(id) {
    const part = userListings.find(p => p.id === id);
    if (!part) return;
    const existing = document.getElementById('apcConfirmDialog');
    if (existing) existing.remove();

    const isSold    = part.status === 'sold';
    const isPending = part.status === 'pending';

    const btnStyle  = (bg) => `padding:12px 20px;border:none;border-radius:8px;background:${bg};color:#fff;font-weight:800;font-size:12px;letter-spacing:0.4px;cursor:pointer;`;
    const cancelStyle = 'padding:10px 20px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-weight:700;font-size:12px;cursor:pointer;color:#555;';

    let btnHTML = '';
    if (isSold) {
        btnHTML = `
            <button id="_laBtnRelist" style="${btnStyle('#22c55e')}">RELIST AS ACTIVE</button>
            ${!part.buyerRating ? `<button id="_laBtnRate" style="${btnStyle('#f59e0b')}">★ RATE BUYER</button>` : ''}
            <button id="_laBtnDelete" style="${btnStyle('#ef4444')}">DELETE LISTING</button>`;
    } else if (isPending) {
        btnHTML = `
            <button id="_laBtnActive"  style="${btnStyle('#22c55e')}">MARK AS ACTIVE</button>
            <button id="_laBtnSold"    style="${btnStyle('#f59e0b')}">MARK AS SOLD</button>
            <button id="_laBtnDelete"  style="${btnStyle('#ef4444')}">DELETE LISTING</button>`;
    } else {
        btnHTML = `
            <button id="_laBtnSold"    style="${btnStyle('#22c55e')}">MARK AS SOLD</button>
            <button id="_laBtnPending" style="${btnStyle('#f59e0b')}">MARK AS PENDING</button>
            <button id="_laBtnDelete"  style="${btnStyle('#ef4444')}">DELETE LISTING</button>`;
    }

    const overlay = document.createElement('div');
    overlay.id = 'apcConfirmDialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:28px 24px;max-width:360px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.18);';
    box.innerHTML = `
        <div style="font-weight:800;font-size:17px;margin-bottom:8px;color:#111;">Update Listing</div>
        <div style="font-size:13px;color:#666;margin-bottom:22px;line-height:1.4;">${escapeHtml(part.title)}</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
            ${btnHTML}
            <button id="_laBtnCancel" style="${cancelStyle}">Cancel</button>
        </div>`;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const doSold = () => {
        overlay.remove();
        part.status   = 'sold';
        part.soldDate = Date.now();
        saveUserListings();
        renderMainGrid();
        renderMyParts();
        if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
        showToast('Listing marked as sold');
        syncListingStatusToSupabase(part, 'sold');
        _postSoldRatePrompts(part);
        if (!part.buyerRating) setTimeout(() => showRateBuyerDialog(part.id), 400);
    };

    document.getElementById('_laBtnDelete').onclick  = () => { overlay.remove(); deleteListing(id); };
    document.getElementById('_laBtnCancel').onclick  = () => overlay.remove();

    if (isSold) {
        document.getElementById('_laBtnRelist').onclick  = () => { overlay.remove(); setListingStatus(id, 'active'); };
        const rateBtn = document.getElementById('_laBtnRate');
        if (rateBtn) rateBtn.onclick = () => { overlay.remove(); showRateBuyerDialog(id); };
    } else if (isPending) {
        document.getElementById('_laBtnActive').onclick  = () => { overlay.remove(); setListingStatus(id, 'active'); };
        document.getElementById('_laBtnSold').onclick    = doSold;
    } else {
        document.getElementById('_laBtnSold').onclick    = doSold;
        document.getElementById('_laBtnPending').onclick = () => { overlay.remove(); setListingStatus(id, 'pending'); };
    }
}

async function deleteListing(id) {
    const idx = userListings.findIndex(p => p.id === id);
    if (idx === -1) return;
    const part = userListings[idx];
    userListings.splice(idx, 1);
    saveUserListings();
    renderMainGrid();
    renderMyParts();
    if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
    showToast('Listing deleted');
    if (part.supabaseId) {
        try {
            const sid = part.supabaseId;
            await sb.from('listing_images').delete().eq('listing_id', sid);
            await sb.from('listing_vehicles').delete().eq('listing_id', sid);
            await sb.from('dismantling_items').update({ listing_id: null }).eq('listing_id', sid);
            await sb.from('offers').delete().eq('listing_id', sid);
            const { data: convRows } = await sb.from('conversations').select('id').eq('listing_id', sid);
            if (convRows?.length) {
                const convIds = convRows.map(c => c.id);
                await sb.from('messages').delete().in('conversation_id', convIds);
                await sb.from('conversations').delete().in('id', convIds);
            }
            const { error } = await sb.from('listings').delete().eq('id', sid);
            if (error) console.warn('Supabase listings delete error:', error.message, error.details, error.hint);
        } catch (e) { console.warn('Supabase delete error:', e); }
    }
}

function showConfirmDialog(title, message, confirmLabel, onConfirm) {
    const existing = document.getElementById('apcConfirmDialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'apcConfirmDialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:28px 24px;max-width:360px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.18);';
    box.innerHTML = `
        <div style="font-weight:800;font-size:17px;margin-bottom:10px;color:#111;">${escapeHtml(title)}</div>
        <div style="font-size:14px;color:#555;margin-bottom:24px;line-height:1.5;">${escapeHtml(message)}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="apcConfirmCancel" style="padding:10px 20px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">Cancel</button>
            <button id="apcConfirmOk" style="padding:10px 20px;border:none;border-radius:8px;background:#e53935;color:#fff;font-weight:700;font-size:14px;cursor:pointer;">${escapeHtml(confirmLabel)}</button>
        </div>`;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('apcConfirmCancel').onclick = () => overlay.remove();
    document.getElementById('apcConfirmOk').onclick = () => { overlay.remove(); onConfirm(); };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function renderMyParts() {
    const myPartsList = document.getElementById('myPartsList');
    if (!myPartsList) return;

    const awayBanner = document.getElementById('mlAwayBanner');
    if (awayBanner) awayBanner.style.display = userSettings.privacyPublicProfile === false ? '' : 'none';

    if (userIsSignedIn && currentUserId && !userListings.length) {
        loadUserListingsFromSupabase(currentUserId);
    }

    const query    = (document.getElementById('myPartsSearchInput')?.value || '').toLowerCase().trim();
    const allParts = userListings.filter(p => p.status !== 'removed');

    // Update tab badges
    const counts = { active: 0, pending: 0, sold: 0 };
    allParts.forEach(p => {
        if (p.status === 'pending') counts.pending++;
        else if (p.status === 'sold') counts.sold++;
        else counts.active++;
    });
    ['active','pending','sold'].forEach(k => {
        const el = document.getElementById('mlBadge-' + k);
        if (el) el.textContent = counts[k] || '';
    });

    const tokens = query.split(/\s+/).filter(Boolean);
    const tabParts = allParts.filter(p => {
        const matchTab =
            _myListingsTab === 'active'  ? (!p.status || p.status === 'active') :
            _myListingsTab === 'pending' ? p.status === 'pending' :
            _myListingsTab === 'sold'    ? p.status === 'sold' : true;
        if (!matchTab) return false;
        if (!tokens.length) return true;
        const vehicleText = (p.fits || []).map(f => [f.make, f.model, f.variant].filter(Boolean).join(' ')).join(' ');
        const haystack = [p.title, p.category, p.loc, p.stockNumber, p.apcId, vehicleText].filter(Boolean).join(' ').toLowerCase();
        return tokens.every(t => haystack.includes(t));
    }).sort((a, b) => (b.date || 0) - (a.date || 0));

    myPartsList.innerHTML = '';

    if (tabParts.length === 0) {
        const empty = {
            active:  { icon: '📦', title: 'No active listings',   sub: 'Tap <strong>+ Sell a Part</strong> to list your first part.' },
            pending: { icon: '⏳', title: 'No pending listings',  sub: 'Mark a listing as pending from your inbox.' },
            sold:    { icon: '✅', title: 'No sold listings yet', sub: 'Your sold history will appear here.' },
        }[_myListingsTab] || { icon: '📦', title: 'No listings', sub: '' };
        myPartsList.innerHTML = query
            ? `<div style="text-align:center;color:#888;padding:30px;font-weight:700;">No listings match "${escapeHtml(query)}"</div>`
            : `<div style="text-align:center;padding:40px 20px;color:#aaa;">
                <div style="font-size:36px;margin-bottom:10px;">${empty.icon}</div>
                <div style="font-weight:800;font-size:14px;color:#888;margin-bottom:6px;">${empty.title}</div>
                <div style="font-size:12px;">${empty.sub}</div>
               </div>`;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'results-grid';

    tabParts.forEach(part => {
        const isSold = part.status === 'sold';

        const temp = document.createElement('div');
        temp.innerHTML = buildCardHTML(part);
        const card = temp.firstElementChild;
        if (!card) return;

        const priceRow = card.querySelector('.price-row');
        if (priceRow) {
            const badge = document.createElement('span');
            badge.className = 'ml-saves-badge' + (part.saves > 0 ? ' ml-saves-badge--active' : '');
            badge.textContent = `♥︎ ${part.saves || 0}`;
            priceRow.appendChild(badge);
        }

        if (_myListingsSelectMode) {
            const isSelected = _myListingsSelected.has(part.id);
            card.dataset.selectId = part.id;
            if (isSelected) card.classList.add('ml-card-selected');
            card.onclick = (e) => { e.stopPropagation(); toggleMyListingCard(part.id); };
            const chk = document.createElement('div');
            chk.className = 'ml-select-chk';
            chk.textContent = isSelected ? '✓' : '';
            card.appendChild(chk);
        } else {
            if (isSold) card.classList.add('my-card--sold');
            const xBtn = document.createElement('button');
            xBtn.className = 'my-card-x-float';
            xBtn.textContent = '×';
            xBtn.onclick = (e) => { e.stopPropagation(); confirmListingAction(part.id); };
            card.appendChild(xBtn);
        }

        grid.appendChild(card);
    });

    myPartsList.appendChild(grid);
    _updateBulkFooterCount();
}

function toggleMyListingsSelectMode() {
    _myListingsSelectMode = !_myListingsSelectMode;
    _myListingsSelected.clear();
    const pill = document.getElementById('mlSelectPill');
    if (pill) pill.classList.toggle('active', _myListingsSelectMode);
    const footer = document.getElementById('mlBulkFooter');
    if (footer) footer.style.display = _myListingsSelectMode ? 'flex' : 'none';
    renderMyParts();
}

function toggleMyListingCard(id) {
    if (_myListingsSelected.has(id)) {
        _myListingsSelected.delete(id);
    } else {
        _myListingsSelected.add(id);
    }
    _updateBulkFooterCount();
    const card = document.querySelector(`[data-select-id="${id}"]`);
    if (card) {
        const isNowSelected = _myListingsSelected.has(id);
        card.classList.toggle('ml-card-selected', isNowSelected);
        const chk = card.querySelector('.ml-select-chk');
        if (chk) chk.textContent = isNowSelected ? '✓' : '';
    }
}

function myListingsSelectAll() {
    const query = (document.getElementById('myPartsSearchInput')?.value || '').toLowerCase().trim();
    userListings
        .filter(p => p.status !== 'removed')
        .filter(p => {
            const matchTab =
                _myListingsTab === 'active'  ? (!p.status || p.status === 'active') :
                _myListingsTab === 'pending' ? p.status === 'pending' :
                _myListingsTab === 'sold'    ? p.status === 'sold' : true;
            return matchTab && (!query || p.title.toLowerCase().includes(query));
        })
        .forEach(p => _myListingsSelected.add(p.id));
    _updateBulkFooterCount();
    document.querySelectorAll('[data-select-id]').forEach(card => {
        const id = Number(card.dataset.selectId);
        const isSelected = _myListingsSelected.has(id);
        card.classList.toggle('ml-card-selected', isSelected);
        const chk = card.querySelector('.ml-select-chk');
        if (chk) chk.textContent = isSelected ? '✓' : '';
    });
}

function _updateBulkFooterCount() {
    const countEl = document.getElementById('mlBulkCount');
    if (countEl) countEl.textContent = `${_myListingsSelected.size} selected`;
    const deleteBtn = document.getElementById('mlBulkDeleteBtn');
    if (deleteBtn) deleteBtn.disabled = _myListingsSelected.size === 0;
}

async function bulkDeleteMyListings() {
    const count = _myListingsSelected.size;
    if (count === 0) return;
    showConfirmDialog(
        'Delete Listings',
        `Delete ${count} listing${count !== 1 ? 's' : ''}? This cannot be undone.`,
        `DELETE ${count}`,
        async () => {
            const ids = [..._myListingsSelected];
            const parts = ids
                .map(id => userListings.find(l => l.id === id))
                .filter(p => p && p.sellerId === currentUserId);
            const supabaseIds = parts.map(p => p.supabaseId).filter(Boolean);
            parts.forEach(p => {
                const idx = userListings.indexOf(p);
                if (idx !== -1) userListings.splice(idx, 1);
            });
            saveUserListings();
            _myListingsSelectMode = false;
            _myListingsSelected.clear();
            const pill = document.getElementById('mlSelectPill');
            if (pill) pill.classList.remove('active');
            const footer = document.getElementById('mlBulkFooter');
            if (footer) footer.style.display = 'none';
            renderMainGrid();
            renderMyParts();
            if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
            showToast(`${parts.length} listing${parts.length !== 1 ? 's' : ''} deleted`);
            for (const sid of supabaseIds) {
                try {
                    await sb.from('listing_images').delete().eq('listing_id', sid);
                    await sb.from('listing_vehicles').delete().eq('listing_id', sid);
                    await sb.from('dismantling_items').update({ listing_id: null }).eq('listing_id', sid);
                    await sb.from('listings').delete().eq('id', sid);
                } catch (e) { console.warn('Supabase delete error:', e); }
            }
        }
    );
}

function showSellError(msg) {
    const banner = document.getElementById('sellErrorBanner');
    if (!banner) return;
    banner.textContent = '⚠ ' + msg;
    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideSellError() {
    const banner = document.getElementById('sellErrorBanner');
    if (banner) banner.style.display = 'none';
}

function _refreshSellSeries(make, model, year, selected) {
    const html  = buildSeriesOptions(make || '', model || '', year || '', selected || '');
    const group = document.getElementById('sellVariantGroup');
    const sel   = document.getElementById('sellVariant');
    if (group) group.style.display = html ? '' : 'none';
    if (sel)   sel.innerHTML       = html || '<option value="">Select series</option>';
}

// ── SELL VEHICLE PICKER ─────────────────────────────────────
let sellVehicleSelection = null; // { make, model, year, series }
let sellIsUniversal = false;

function renderSellVehicleChip() {
    const chip         = document.getElementById('sellVehicleChip');
    const btn          = document.getElementById('sellVehiclePickerBtn');
    const ecGroup      = document.getElementById('sellEngineCodeGroup');
    const universalRow = document.getElementById('sellUniversalRow');
    const mmEl         = document.getElementById('sellVehicleChipMakeModel');
    const ysEl         = document.getElementById('sellVehicleChipYearSeries');
    if (!chip || !btn) return;
    if (sellIsUniversal) {
        chip.style.display = 'none';
        btn.style.display  = 'none';
        if (ecGroup)      ecGroup.style.display      = 'none';
        if (universalRow) universalRow.style.display  = '';
        return;
    }
    if (sellVehicleSelection?.make) {
        const { make, model, year, series } = sellVehicleSelection;
        if (mmEl) mmEl.textContent = `${make} ${model}`;
        if (ysEl) ysEl.textContent = [year, series].filter(Boolean).join(' · ');
        chip.style.display = 'flex';
        btn.style.display  = 'none';
        if (ecGroup)      ecGroup.style.display      = 'none';
        if (universalRow) universalRow.style.display  = 'none';
    } else {
        chip.style.display = 'none';
        btn.style.display  = '';
        if (ecGroup)      ecGroup.style.display      = 'none';
        if (universalRow) universalRow.style.display  = '';
    }
}

function onSellUniversalToggle() {
    const checked = !!document.getElementById('sellUniversalToggle')?.checked;
    if (checked && sellVehicleSelection?.make) {
        // Revert immediately — confirm dialog will re-apply if confirmed
        document.getElementById('sellUniversalToggle').checked = false;
        showConfirmDialog(
            'Universal Part',
            'Remove the selected vehicle fitment and mark this as a universal part?',
            'Make Universal',
            () => {
                sellVehicleSelection = null;
                sellIsUniversal = true;
                document.getElementById('sellUniversalToggle').checked = true;
                renderSellVehicleChip();
            }
        );
        return;
    }
    sellIsUniversal = checked;
    renderSellVehicleChip();
}

function openSellVehiclePicker() {
    const modal = document.getElementById('sellVehiclePickerModal');
    if (!modal) return;
    modal.style.display = 'flex';
    // Populate makes
    const vpMake = document.getElementById('vpMake');
    if (vpMake && vpMake.options.length < 3)
        vpMake.innerHTML = '<option value="">Select make</option>' +
            VEHICLE_MAKES.map(m => `<option value="${m}">${m}</option>`).join('');
    // Pre-fill from current selection
    const sel = sellVehicleSelection;
    const currentEngine = sellVehicleSelection?.engine || '';
    if (sel?.make) {
        if (vpMake) vpMake.value = sel.make;
        const vpModel = document.getElementById('vpModel');
        if (vpModel) { vpModel.innerHTML = buildModelOptions(sel.make, sel.model); }
        const vpYear = document.getElementById('vpYear');
        if (vpYear) { vpYear.innerHTML = buildYearOptionsForModel(sel.make, sel.model, sel.year); }
        _refreshVpSeries(sel.make, sel.model, sel.year, sel.series);
        _refreshVpEngine(sel.make, sel.model, currentEngine);
    } else {
        const vpModel = document.getElementById('vpModel');
        if (vpModel) vpModel.innerHTML = '<option value="">Select model</option>';
        const vpYear = document.getElementById('vpYear');
        if (vpYear) vpYear.innerHTML = '<option value="">Select year</option>';
        _refreshVpSeries('', '', '', '');
    }
    // Garage chips
    const gSec  = document.getElementById('vpGarageSection');
    const chips = document.getElementById('vpGarageChips');
    if (gSec && chips) {
        if (myVehicles.length) {
            gSec.style.display = '';
            chips.innerHTML = '';
            myVehicles.forEach(v => {
                const label = [v.make, v.model, v.year, v.variant].filter(Boolean).join(' ');
                const btn = document.createElement('button');
                btn.className = 'vp-garage-chip';
                btn.type = 'button';
                btn.textContent = label;
                btn.onclick = () => vpFillFromGarage(v);
                chips.appendChild(btn);
            });
        } else {
            gSec.style.display = 'none';
        }
    }
}

function vpFillFromGarage(v) {
    const vpMake  = document.getElementById('vpMake');
    const vpModel = document.getElementById('vpModel');
    const vpYear  = document.getElementById('vpYear');
    if (vpMake)  { vpMake.innerHTML  = buildMakeOptions(v.make || '');                    vpMake.value  = v.make  || ''; }
    if (vpModel) { vpModel.innerHTML = buildModelOptions(v.make || '', v.model || '');    vpModel.value = v.model || ''; }
    if (vpYear)  { vpYear.innerHTML  = buildYearOptionsForModel(v.make || '', v.model || '', String(v.year || '')); vpYear.value = String(v.year || ''); }
    _refreshVpSeries(v.make || '', v.model || '', String(v.year || ''), v.variant || '');
    _refreshVpEngine(v.make || '', v.model || '', '');
    document.querySelectorAll('#vpGarageChips .vp-garage-chip').forEach(c => c.classList.remove('active'));
    event?.currentTarget?.classList.add('active');
}

function closeSellVehiclePicker() {
    const modal = document.getElementById('sellVehiclePickerModal');
    if (modal) modal.style.display = 'none';
    // Reset all picker dropdowns so next open always starts clean
    const vpMake  = document.getElementById('vpMake');
    const vpModel = document.getElementById('vpModel');
    const vpYear  = document.getElementById('vpYear');
    if (vpMake)  vpMake.value   = '';
    if (vpModel) vpModel.innerHTML = '<option value="">Select model</option>';
    if (vpYear)  vpYear.innerHTML  = '<option value="">Select year</option>';
    _refreshVpSeries('', '', '', '');
    _refreshVpEngine('', '', '');
    document.querySelectorAll('#vpGarageChips .vp-garage-chip').forEach(c => c.classList.remove('active'));
}

function vpOverlayClick(e) {
    if (e.target === document.getElementById('sellVehiclePickerModal')) closeSellVehiclePicker();
}

function _refreshVpEngine(make, model, currentVal) {
    const group = document.getElementById('vpEngineGroup');
    const wrap  = document.getElementById('vpEngineWrap');
    if (!group || !wrap) return;
    if (!make || !model) { group.style.display = 'none'; return; }
    const engines = (typeof VEHICLE_ENGINES !== 'undefined' && VEHICLE_ENGINES[make]?.[model]) || [];
    group.style.display = '';
    if (engines.length) {
        const opts = ['<option value="">Engine code (optional)…</option>',
            ...engines.map(e => `<option value="${escapeHtml(e)}"${e === currentVal ? ' selected' : ''}>${escapeHtml(e)}</option>`)
        ].join('');
        wrap.innerHTML = `<select id="vpEngine" style="width:100%;">${opts}</select>`;
    } else {
        wrap.innerHTML = `<input id="vpEngine" type="text" style="width:100%;" maxlength="60" placeholder="e.g. 1GR-FE, RB26DETT" value="${escapeHtml(currentVal || '')}">`;
    }
}

function _refreshVpSeries(make, model, year, selected) {
    const group = document.getElementById('vpSeriesGroup');
    const sel   = document.getElementById('vpSeries');
    if (!sel || !group) return;
    if (!model || !year) { group.style.display = 'none'; sel.innerHTML = '<option value="">Select series</option>'; return; }
    const html = buildSeriesOptions(make, model, year, selected || '');
    if (!html) { group.style.display = 'none'; sel.innerHTML = '<option value="">Select series</option>'; return; }
    sel.innerHTML = html;
    group.style.display = '';
}

function onVpMakeChange() {
    const make = document.getElementById('vpMake')?.value || '';
    const modelEl = document.getElementById('vpModel');
    const yearEl  = document.getElementById('vpYear');
    if (modelEl) modelEl.innerHTML = buildModelOptions(make, '');
    if (yearEl)  yearEl.innerHTML  = '<option value="">Select year</option>';
    _refreshVpSeries('', '', '', '');
    _refreshVpEngine('', '', '');
}

function onVpModelChange() {
    const make  = document.getElementById('vpMake')?.value  || '';
    const model = document.getElementById('vpModel')?.value || '';
    const yearEl = document.getElementById('vpYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '');
    _refreshVpSeries('', '', '', '');
    _refreshVpEngine(make, model, '');
}

function onVpYearChange() {
    const make  = document.getElementById('vpMake')?.value  || '';
    const model = document.getElementById('vpModel')?.value || '';
    const year  = document.getElementById('vpYear')?.value  || '';
    _refreshVpSeries(make, model, year, '');
}

function confirmSellVehicle() {
    const make   = document.getElementById('vpMake')?.value.trim()   || '';
    const model  = document.getElementById('vpModel')?.value.trim()  || '';
    const year   = document.getElementById('vpYear')?.value.trim()   || '';
    const series = document.getElementById('vpSeries')?.value.trim() || '';
    const engine = document.getElementById('vpEngine')?.value.trim() || '';
    if (!make || !model || !year) { showToast('Please select make, model and year.'); return; }
    const seriesHtml = buildSeriesOptions(make, model, year, '');
    if (seriesHtml && !series) { showToast('Please select a series.'); return; }
    sellVehicleSelection = { make, model, year, series, engine };
    renderSellVehicleChip();
    closeSellVehiclePicker();
}

function clearSellVehicle() {
    sellVehicleSelection = null;
    renderSellVehicleChip();
    _refreshSellVariant('', '', '');
}

function initSellVehicleDropdowns(make, model, year, variant, engine) {
    if (make && model && year) {
        sellVehicleSelection = { make, model, year, series: variant || '', engine: engine || '' };
    } else {
        sellVehicleSelection = null;
    }
    renderSellVehicleChip();
}

function _refreshSellVariant(make, model, currentVal) {
    const wrap = document.getElementById('sellVariantWrap');
    if (!wrap) return;
    const engines = (typeof VEHICLE_ENGINES !== 'undefined' && VEHICLE_ENGINES[make]?.[model]) || [];
    if (engines.length) {
        const opts = ['<option value="">Select engine code…</option>',
            ...engines.map(e => `<option value="${escapeHtml(e)}"${e === currentVal ? ' selected' : ''}>${escapeHtml(e)}</option>`)
        ].join('');
        wrap.innerHTML = `<select id="sellVariant" class="sell-select">${opts}</select>`;
    } else {
        wrap.innerHTML = `<input id="sellVariant" type="text" maxlength="60" placeholder="e.g. 1GR-FE, RB26DETT" value="${escapeHtml(currentVal || '')}">`;
    }
}

const VEHICLE_EXEMPT_CATEGORIES = ['tools', 'other'];

function onSellCategoryChange() {
    const cat  = document.getElementById('sellCategory')?.value || '';
    const note = document.getElementById('sellVehicleRequiredNote');
    if (note) note.style.display = VEHICLE_EXEMPT_CATEGORIES.includes(cat) ? 'none' : 'inline';
}

function onSellMakeChange() {
    const make    = document.getElementById('sellMake')?.value || '';
    const modelEl = document.getElementById('sellModel');
    const yearEl  = document.getElementById('sellYear');
    if (modelEl) modelEl.innerHTML = buildModelOptions(make, '');
    if (yearEl)  yearEl.innerHTML  = buildYearOptions('');
    _refreshSellSeries(make, '', '', '');
    _refreshSellVariant(make, '');
}

function onSellModelChange() {
    const make  = document.getElementById('sellMake')?.value || '';
    const model = document.getElementById('sellModel')?.value || '';
    const yearEl = document.getElementById('sellYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '');
    _refreshSellSeries('', '', '', '');
    _refreshSellVariant(make, model);
}

function onSellYearChange() {
    const make  = document.getElementById('sellMake')?.value || '';
    const model = document.getElementById('sellModel')?.value || '';
    const year  = document.getElementById('sellYear')?.value  || '';
    _refreshSellSeries(make, model, year, '');
}

function initWantedVehicleDropdowns(make, model, year, series) {
    const makeEl  = document.getElementById('wantedMake');
    const modelEl = document.getElementById('wantedModel');
    const yearEl  = document.getElementById('wantedYear');
    if (!makeEl || !modelEl || !yearEl) return;
    makeEl.innerHTML  = buildMakeOptions(make || '');
    modelEl.innerHTML = buildModelOptions(make || '', model || '');
    yearEl.innerHTML  = buildYearOptionsForModel(make || '', model || '', year || '');
    _refreshWantedSeries(make || '', model || '', year || '');
    if (series) { const s = document.getElementById('wantedSeries'); if (s) s.value = series; }
    checkWantedGaragePrompt();
}

function _refreshWantedSeries(make, model, year) {
    const group = document.getElementById('wantedSeriesGroup');
    const sel   = document.getElementById('wantedSeries');
    if (!sel || !group) return;
    if (!model || !year) { group.style.display = 'none'; sel.innerHTML = '<option value="">Any Series</option>'; return; }
    const html = buildSeriesOptions(make, model, year, '');
    if (!html) { group.style.display = 'none'; sel.innerHTML = '<option value="">Any Series</option>'; return; }
    sel.innerHTML = '<option value="">Any Series</option>' + html.replace('<option value="">Select series</option>', '');
    group.style.display = '';
}

function onWantedMakeChange() {
    const make    = document.getElementById('wantedMake')?.value || '';
    const modelEl = document.getElementById('wantedModel');
    const yearEl  = document.getElementById('wantedYear');
    if (modelEl) modelEl.innerHTML = buildModelOptions(make, '');
    if (yearEl)  yearEl.innerHTML  = buildYearOptions('');
    _refreshWantedSeries('', '', '');
    checkWantedGaragePrompt();
}

function onWantedModelChange() {
    const make  = document.getElementById('wantedMake')?.value || '';
    const model = document.getElementById('wantedModel')?.value || '';
    const yearEl = document.getElementById('wantedYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '');
    _refreshWantedSeries('', '', '');
    checkWantedGaragePrompt();
}

function onWantedYearChange() {
    const make  = document.getElementById('wantedMake')?.value  || '';
    const model = document.getElementById('wantedModel')?.value || '';
    const year  = document.getElementById('wantedYear')?.value  || '';
    _refreshWantedSeries(make, model, year);
    checkWantedGaragePrompt();
}

function checkWantedGaragePrompt() {
    const make  = document.getElementById('wantedMake')?.value || '';
    const model = document.getElementById('wantedModel')?.value || '';
    const prompt = document.getElementById('wantedGaragePrompt');
    const label  = document.getElementById('wantedGaragePromptText');
    if (!prompt) return;
    if (!make || !model) { prompt.style.display = 'none'; return; }
    const alreadyIn = myVehicles.some(v =>
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === model.toLowerCase()
    );
    if (alreadyIn) { prompt.style.display = 'none'; return; }
    if (label) label.textContent = `${make} ${model} isn't in your garage yet.`;
    prompt.style.display = 'flex';
}

// ── Taxonomy-backed part-name suggestions ─────────────────────────────────────
// One controlled vocabulary on both sides of a match: sellers pick a canonical part
// name on the listing title, buyers pick the same on a wanted request. Kills the
// typo/variant misses in wantedMatchesListing() and makes search reliable.
let _PART_VOCAB = null;
let _PART_CAT_MAP = null;
// Marketplace category for a taxonomy part: part-level override → assembly → zone.
function _partCategory(zone, asm, displayName) {
    return (typeof PART_CATEGORY_OVERRIDES !== 'undefined' && PART_CATEGORY_OVERRIDES[displayName])
        || asm?.apcCategory || zone?.apcCategory || 'other';
}
function getPartVocab() {
    if (_PART_VOCAB) return _PART_VOCAB;
    const set = new Set();
    _PART_CAT_MAP = {};
    if (typeof EDW_TAXONOMY !== 'undefined') {
        EDW_TAXONOMY.forEach(zone => zone.assemblies.forEach(asm =>
            asm.parts.forEach(p => {
                const name = _edwFullPartName(asm.name, p);
                set.add(name);
                if (!_PART_CAT_MAP[name]) _PART_CAT_MAP[name] = _partCategory(zone, asm, name);
            })));
    }
    _PART_VOCAB = [...set].sort((a, b) => a.localeCompare(b));
    return _PART_VOCAB;
}

const _PART_AC_STOP = new Set(['for','a','an','the','of','with','to','from','in','on','at','and','or','suit','suits','my','need']);
function _partSuggest(typed, exclude) {
    const words = (typed || '').toLowerCase().split(/[\s\-\/,]+/)
        .filter(w => w.length > 1 && !_PART_AC_STOP.has(w) && !exclude.has(w));
    if (!words.length) return [];
    const last = words[words.length - 1];
    const out = [];
    for (const name of getPartVocab()) {
        const lname = name.toLowerCase();
        if (words.every(w => lname.includes(w))) {
            out.push([lname.split(/\s+/).some(t => t.startsWith(last)) ? 0 : 1, name.length, name]);
        }
    }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return out.slice(0, 8).map(o => o[2]);
}

function attachPartAutocomplete(input, opts = {}) {
    if (!input || input._partAc) return;
    input._partAc = true;

    const wrap = document.createElement('span');
    wrap.className = 'part-ac-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const box = document.createElement('div');
    box.className = 'part-ac-box';
    wrap.appendChild(box);

    let active = -1, items = [];

    const exclude = () => {
        const s = new Set();
        if (opts.excludeVehicle && sellVehicleSelection) {
            `${sellVehicleSelection.make || ''} ${sellVehicleSelection.model || ''}`
                .toLowerCase().split(/\s+/).forEach(w => { if (w) s.add(w); });
        }
        return s;
    };
    const close = () => { box.style.display = 'none'; box.innerHTML = ''; active = -1; items = []; };
    const pick = (name) => {
        if (opts.compose && sellVehicleSelection?.make && sellVehicleSelection?.model) {
            input.value = `${name} to suit ${sellVehicleSelection.make} ${sellVehicleSelection.model}`;
        } else {
            input.value = name;
        }
        if (opts.setCategory) {
            const cat = _PART_CAT_MAP?.[name];
            const catEl = document.getElementById('sellCategory');
            // Always follow the picked part — so changing part (starter → door) re-points the category.
            if (cat && catEl && catEl.value !== cat) { catEl.value = cat; catEl.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        close();   // don't re-fire input/focus here — it would reopen the dropdown
    };
    const render = () => {
        items = _partSuggest(input.value, exclude());
        if (!items.length) return close();
        box.innerHTML = items.map((n, i) =>
            `<div class="part-ac-item${i === active ? ' active' : ''}" data-i="${i}">${escapeHtml(n)}</div>`).join('');
        box.style.display = 'block';
        box.querySelectorAll('.part-ac-item').forEach(el =>
            el.addEventListener('mousedown', e => { e.preventDefault(); pick(items[+el.dataset.i]); }));
    };

    input.addEventListener('input', () => { active = -1; render(); });
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', e => {
        if (box.style.display !== 'block' || !items.length) return;
        if (e.key === 'ArrowDown')      { e.preventDefault(); active = Math.min(active + 1, items.length - 1); render(); }
        else if (e.key === 'ArrowUp')   { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
        else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
        else if (e.key === 'Escape')    { close(); }
    });
}

// Add Part (from a Vehicle Stock Card) reuses the real List-a-Part modal so the
// seller gets photos + label printing; we just pre-fill the donor vehicle and
// stamp dismantling_job_id on the new listing so it lands back on the stock card.
let _sellDonorJobId   = null;
let _donorRefreshJobId = null;

function openSellOverlay() {
    if (!userIsSignedIn) {
        openAuthDrawer(openSellOverlay);
        return;
    }

    _sellDonorJobId = null;
    const _sellOv = document.getElementById('sellOverlay');
    if (_sellOv) _sellOv.style.zIndex = '';   // default; Add-Part lifts it above the stock card
    currentEditingListingId = null;
    currentEditStatus = null;
    resetSellForm();
    populateSellLocationPicker();
    const fitting = document.getElementById('sellFittingAvailable');
    if (fitting && currentUserTier === 'pro' && userSettings.defaultFitting) fitting.checked = true;
    initSellVehicleDropdowns('', '', '');
    const title = document.getElementById('sellOverlayTitle');
    const submit = document.getElementById('sellSubmitBtn');
    if (title) title.textContent = 'List a Part';
    if (submit) submit.textContent = 'LIST PART NOW';
    const manageSection = document.getElementById('manageSection');
    if (manageSection) manageSection.style.display = 'none';
    updateSellFittingToggleVisibility();
    closeDashboard();
    toggleDrawer('sellOverlay');
}

function listFromWanted(wantedId, partName, category, make, model, year) {
    _fromWantedId = wantedId || null;
    openSellOverlay();
    const titleEl = document.getElementById('sellTitle');
    if (titleEl && partName) titleEl.value = partName;
    const catEl = document.getElementById('sellCategory');
    if (catEl && category) catEl.value = category;
    initSellVehicleDropdowns(make, model, year);
}

function selectListingStatus(status) {
    currentEditStatus = status;
    ['active', 'pending', 'sold'].forEach(s => {
        const pill = document.getElementById('statusPill' + s.charAt(0).toUpperCase() + s.slice(1));
        if (pill) pill.className = 'status-pill' + (s === status ? ` pill-selected-${s}` : '');
    });
    const rateSec = document.getElementById('rateBuyerSection');
    if (rateSec) rateSec.style.display = status === 'sold' ? '' : 'none';
}

function renderBuyerStars(selected) {
    currentBuyerRating = selected || 0;
    const container = document.getElementById('rateBuyerStars');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'rate-star' + (i <= currentBuyerRating ? ' filled' : '');
        star.textContent = '★';
        star.onclick = () => renderBuyerStars(i);
        container.appendChild(star);
    }
}

function renderBuyerPicker(listingId, currentName) {
    const container = document.getElementById('rateBuyerPicker');
    if (!container) return;
    container.innerHTML = '';

    const enquirers = [...new Set(
        conversations.filter(c => c.partId === listingId).map(c => c.with)
    )];

    const wrap = document.createElement('div');
    wrap.className = 'buyer-picker';

    if (enquirers.length > 0) {
        enquirers.forEach(name => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'buyer-chip' + (name === currentName ? ' selected' : '');
            chip.textContent = name;
            chip.onclick = () => {
                wrap.querySelectorAll('.buyer-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                const inp = container.querySelector('.buyer-chip-input');
                if (inp) inp.value = '';
            };
            wrap.appendChild(chip);
        });
        // "Someone else" fallback input
        const other = document.createElement('button');
        other.type = 'button';
        other.className = 'buyer-chip' + (!currentName || enquirers.includes(currentName) ? '' : ' selected');
        other.textContent = 'Other…';
        other.onclick = () => {
            wrap.querySelectorAll('.buyer-chip').forEach(c => c.classList.remove('selected'));
            other.classList.add('selected');
            inp.style.display = '';
            inp.focus();
        };
        wrap.appendChild(other);

        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'buyer-chip-input';
        inp.placeholder = 'Enter buyer name';
        inp.style.display = (!currentName || enquirers.includes(currentName)) ? 'none' : '';
        inp.value = (!currentName || enquirers.includes(currentName)) ? '' : currentName;
        inp.id = 'rateBuyerName';
        wrap.appendChild(inp);
    } else {
        // No conversations — plain text input
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'buyer-chip-input';
        inp.placeholder = 'e.g. John D.';
        inp.value = currentName || '';
        inp.id = 'rateBuyerName';
        inp.style.display = '';
        wrap.appendChild(inp);
    }

    container.appendChild(wrap);
}

function openEditListing(listingId) {
    const listing = userListings.find(l => l.supabaseId != null && l.supabaseId === listingId)
                 || userListings.find(l => l.id === listingId);
    if (!listing) return;
    currentEditingListingId = listing.id;
    sellListingImages = [...listing.images];

    document.getElementById('sellTitle').value = listing.title || '';
    document.getElementById('sellCategory').value = listing.category || '';
    initSellVehicleDropdowns(listing.fits?.[0]?.make || '', listing.fits?.[0]?.model || '', listing.year || '', listing.fits?.[0]?.variant || '', listing.variant || '');
    const isUniversal = !listing.fits?.length && !VEHICLE_EXEMPT_CATEGORIES.includes(listing.category || '');
    sellIsUniversal = isUniversal;
    const uToggle = document.getElementById('sellUniversalToggle');
    if (uToggle) uToggle.checked = isUniversal;
    renderSellVehicleChip();
    document.getElementById('sellPostcode').value = listing.postcode || userSettings.postcode || '';
    document.getElementById('sellLocation').value = listing.loc     || userSettings.location || '';
    document.getElementById('sellPickup').checked = !!listing.pickup;
    document.getElementById('sellPostage').checked = !!listing.postage;
    document.getElementById('sellPrice').value = listing.price ?? '';
    document.getElementById('sellCondition').value = listing.condition || '';
    document.getElementById('sellDescription').value = listing.description || '';
    if (document.getElementById('sellFittingAvailable')) {
        document.getElementById('sellFittingAvailable').checked = !!listing.fit;
    }
    const offersToggle = document.getElementById('sellOpenToOffers');
    if (offersToggle) offersToggle.checked = !!listing.openToOffers;
    const qtyInput = document.getElementById('sellQuantity');
    if (qtyInput) qtyInput.value = listing.quantity > 1 ? listing.quantity : '';
    const binInput = document.getElementById('sellWarehouseBin');
    if (binInput) binInput.value = listing.warehouseBin || '';
    const stockInput = document.getElementById('sellStockNumber');
    if (stockInput) stockInput.value = listing.stockNumber || '';
    const odoInput = document.getElementById('sellOdometer');
    if (odoInput) odoInput.value = listing.odometer || '';
    const vinInput = document.getElementById('sellChassisVin');
    if (vinInput) vinInput.value = listing.chassisVin || '';

    renderSellImagePreviews();

    const titleEl = document.getElementById('sellOverlayTitle');
    const submit  = document.getElementById('sellSubmitBtn');
    if (titleEl) titleEl.textContent = 'Manage Listing';
    if (submit)  submit.textContent  = 'SAVE CHANGES';

    // Show manage section and populate status + buyer rating
    const manageSection = document.getElementById('manageSection');
    if (manageSection) manageSection.style.display = '';
    const statusStr = listing.status || 'active';
    selectListingStatus(statusStr);
    const br = listing.buyerRating || {};
    renderBuyerStars(br.stars || 0);
    renderBuyerPicker(listingId, br.buyerName || '');
    const noteEl = document.getElementById('rateBuyerNote');
    if (noteEl) noteEl.value = br.note || '';

    updateSellFittingToggleVisibility();
    // Close detail overlay so edit form isn't stacked behind it
    const detailEl = document.getElementById('detailOverlay');
    if (detailEl) detailEl.classList.remove('active', 'vsc-modal');

    const sellOverlayEl = document.getElementById('sellOverlay');
    if (sellOverlayEl) sellOverlayEl.style.zIndex = '3800'; // above VSC (3500) and detailOverlay (3700)
    toggleDrawer('sellOverlay', true);
}

function closeSellOverlay() {
    const overlay = document.getElementById('sellOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.zIndex = '';
    }
    syncBackdrop();
    resetSellForm();
    hideSellError();
}

function deleteListing(id) {
    userListings = userListings.filter(l => l.id !== id);
    saveUserListings();
    renderMyParts();
    renderMainGrid();
    if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
    if (currentEditingListingId === id) {
        currentEditingListingId = null;
        resetSellForm();
    }
    showToast('Listing removed');
}

function handleSellImageFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.slice(0, 6 - sellListingImages.length).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            sellListingImages.push(e.target.result);
            renderSellImagePreviews();
        };
        reader.readAsDataURL(file);
    });
    event.target.value = '';
}

function renderSellImagePreviews() {
    const grid = document.getElementById('sellPhotoGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const maxPhotos = 6;
    for (let index = 0; index < maxPhotos; index++) {
        const box = document.createElement('div');
        box.style.cssText = 'aspect-ratio: 1/1; border: 2px dashed var(--apc-orange); border-radius: 12px; background: #fafafa; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;';

        if (sellListingImages[index]) {
            const img = document.createElement('img');
            img.src = sellListingImages[index];
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            box.appendChild(img);

            const remove = document.createElement('button');
            remove.textContent = '×';
            remove.style.cssText = 'position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border: none; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; cursor: pointer; font-size: 16px; line-height: 1;';
            remove.onclick = (e) => {
                e.stopPropagation();
                sellListingImages.splice(index, 1);
                renderSellImagePreviews();
            };
            box.appendChild(remove);

            if (index === 0) {
                const mainBadge = document.createElement('div');
                mainBadge.textContent = '★ MAIN';
                mainBadge.style.cssText = 'position: absolute; bottom: 6px; left: 6px; background: var(--apc-orange); color: white; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.3px;';
                box.appendChild(mainBadge);
            } else {
                const starBtn = document.createElement('button');
                starBtn.textContent = '☆ MAIN';
                starBtn.title = 'Set as main photo';
                starBtn.style.cssText = 'position: absolute; bottom: 6px; left: 6px; background: rgba(0,0,0,0.55); color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: none; cursor: pointer; letter-spacing: 0.3px;';
                starBtn.onclick = (e) => {
                    e.stopPropagation();
                    const [chosen] = sellListingImages.splice(index, 1);
                    sellListingImages.unshift(chosen);
                    renderSellImagePreviews();
                };
                box.appendChild(starBtn);
            }
        } else {
            box.style.cursor = 'pointer';
            box.onclick = () => document.getElementById('sellImageInput')?.click();
            const label = document.createElement('div');
            label.style.cssText = 'text-align: center; color: #888; font-size: 10px; font-weight: 700;';
            label.innerHTML = '<span style="font-size: 22px; display: block;">📷</span><span style="display:block; margin-top: 6px;">Add photo</span>';
            box.appendChild(label);
        }

        grid.appendChild(box);
    }
}

function resetSellForm() {
    currentEditingListingId = null;
    sellListingImages = [];
    const fields = [
        'sellTitle', 'sellCategory', 'sellPostcode', 'sellLocation', 'sellPrice', 'sellCondition', 'sellDescription'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName.toLowerCase() === 'select' || el.tagName.toLowerCase() === 'input') el.value = '';
        if (el.tagName.toLowerCase() === 'textarea') el.value = '';
    });
    sellVehicleSelection = null;
    sellIsUniversal = false;
    const uToggle = document.getElementById('sellUniversalToggle');
    if (uToggle) uToggle.checked = false;
    renderSellVehicleChip();
    const sellLocWrap = document.querySelector('#sellOverlay .location-picker-wrap[data-mode="sell"]');
    if (sellLocWrap) clearLocationPicker(sellLocWrap);
    onSellCategoryChange();
    const pickup = document.getElementById('sellPickup');
    const postage = document.getElementById('sellPostage');
    const fitting = document.getElementById('sellFittingAvailable');
    if (pickup) pickup.checked = false;
    if (postage) postage.checked = false;
    if (fitting) fitting.checked = false;
    const offersToggle = document.getElementById('sellOpenToOffers');
    if (offersToggle) offersToggle.checked = false;
    const printToggle = document.getElementById('sellPrintLabel');
    if (printToggle) printToggle.checked = false;
    const qtyInput = document.getElementById('sellQuantity');
    if (qtyInput) qtyInput.value = '';
    const binInput = document.getElementById('sellWarehouseBin');
    if (binInput) binInput.value = '';
    const stockInput = document.getElementById('sellStockNumber');
    if (stockInput) stockInput.value = '';
    const odoInput = document.getElementById('sellOdometer');
    if (odoInput) odoInput.value = '';
    const vinInput = document.getElementById('sellChassisVin');
    if (vinInput) vinInput.value = '';
    renderSellImagePreviews();
    updateSellFittingToggleVisibility();
    updateSellQuantityVisibility();
    updateWarehouseBinVisibility();
}

function generateApcId() {
    return 'APC' + String(Date.now() % 10000000000).padStart(10, '0');
}

function updateSellFittingToggleVisibility() {
    const isPro = userIsSignedIn && currentUserTier === 'pro';
    const fitting = document.getElementById('sellFittingToggleSection');
    if (fitting) fitting.style.display = isPro ? 'contents' : 'none';
    const stockSection = document.getElementById('sellStockNumberSection');
    if (stockSection) stockSection.style.display = isPro ? 'block' : 'none';
    const vinOdoRow = document.getElementById('sellVinOdometerRow');
    if (vinOdoRow) vinOdoRow.style.display = isPro ? 'flex' : 'none';
}

function updateSellQuantityVisibility() {
    const section = document.getElementById('sellQuantitySection');
    if (section) section.style.display = (userIsSignedIn && currentUserTier === 'pro') ? 'block' : 'none';
}

function updateWarehouseBinVisibility() {
    const section = document.getElementById('sellWarehouseBinSection');
    if (!section) return;
    const warehouseOn = userIsSignedIn && currentUserTier === 'pro';
    section.style.display = warehouseOn ? 'block' : 'none';
    const printSection = document.getElementById('sellPrintLabelSection');
    if (printSection) printSection.style.display = (userIsSignedIn && currentUserTier === 'pro') ? 'block' : 'none';
}

async function submitSellListing() {
    const title = document.getElementById('sellTitle')?.value.trim();
    const category = document.getElementById('sellCategory')?.value;
    const make    = sellVehicleSelection?.make    || '';
    const model   = sellVehicleSelection?.model   || '';
    const year    = sellVehicleSelection?.year    || '';
    const variant = sellVehicleSelection?.series  || null;
    const postcode = document.getElementById('sellPostcode')?.value.trim();
    const location = document.getElementById('sellLocation')?.value.trim();
    const pickup = document.getElementById('sellPickup')?.checked;
    const postage = document.getElementById('sellPostage')?.checked;
    const price = document.getElementById('sellPrice')?.value.trim();
    const condition = document.getElementById('sellCondition')?.value;
    const description = document.getElementById('sellDescription')?.value.trim();

    const missing = [];
    if (!title)       missing.push('Title');
    if (!category)    missing.push('Category');
    if (!price)       missing.push('Price');
    if (!location)    missing.push('Location');
    if (!description) missing.push('Description');
    if (category && !VEHICLE_EXEMPT_CATEGORIES.includes(category) && !sellIsUniversal) {
        if (!sellVehicleSelection?.make) missing.push('Vehicle (make, model, year, series)');
    }
    if (missing.length) {
        showSellError(`Please complete: ${missing.join(', ')}`);
        return;
    }
    if (!sellListingImages.length) {
        showSellError('Please add at least one photo before listing.');
        return;
    }
    if (!pickup && !postage) {
        showSellError('Please select at least one delivery option — Pickup or Postage.');
        return;
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 1 || numericPrice > 9999999) {
        showSellError('Enter a valid price between $1 and $9,999,999.');
        return;
    }
    if (title.length > 120) {
        showSellError('Title is too long — keep it under 120 characters.');
        return;
    }
    hideSellError();

    const engineVariant = sellVehicleSelection?.engine?.trim() || null;
    const fits = (make && model) ? [{ make: make.trim(), model: model.trim(), ...(variant ? { variant } : {}) }] : [];
    const fittingAvailable = userIsSignedIn && currentUserTier === 'pro' && document.getElementById('sellFittingAvailable')?.checked;
    const stockNumber = document.getElementById('sellStockNumber')?.value.trim() || null;
    const odoRaw = document.getElementById('sellOdometer')?.value.trim().replace(/\D/g, '');
    const odometer = (userIsSignedIn && currentUserTier === 'pro' && odoRaw) ? Number(odoRaw) : null;
    const chassisVin = (userIsSignedIn && currentUserTier === 'pro')
        ? (document.getElementById('sellChassisVin')?.value.trim() || null)
        : null;
    const openToOffers = !!document.getElementById('sellOpenToOffers')?.checked;
    // Warehouse bin (Pro): the sell-form field is authoritative — set it or clear it.
    // For a non-Pro edit, keep the listing's existing bin so a save never wipes a
    // location set elsewhere (e.g. by the put-away scanner). New listings default to null.
    let warehouseBin;
    if (userIsSignedIn && currentUserTier === 'pro') {
        warehouseBin = document.getElementById('sellWarehouseBin')?.value.trim() || null;
    } else if (currentEditingListingId !== null) {
        warehouseBin = userListings.find(l => l.id === currentEditingListingId)?.warehouseBin || null;
    } else {
        warehouseBin = null;
    }
    const quantity = (userIsSignedIn && currentUserTier === 'pro')
        ? (Math.max(1, parseInt(document.getElementById('sellQuantity')?.value, 10) || 1))
        : 1;
    const listingPayload = {
        title,
        price: numericPrice,
        images: [...sellListingImages],
        loc: location.toUpperCase(),
        postcode,
        fit: !!fittingAvailable,
        seller: getPublicSellerName(),
        isPro: currentUserTier === 'pro',
        category,
        fits,
        year: year ? Number(year) : null,
        description,
        pickup,
        postage,
        condition: condition || 'used',
        openToOffers,
        warehouseBin,
        quantity,
        stockNumber,
        odometer,
        chassisVin,
        variant: engineVariant
    };

    let message = 'Listing created';
    let syncTarget = null;
    const isNewListing = currentEditingListingId === null;
    if (currentEditingListingId !== null) {
        const existing = userListings.find(l => l.id === currentEditingListingId);
        if (existing) {
            // Apply status from manage section
            if (currentEditStatus && currentEditStatus !== 'active') {
                listingPayload.status = currentEditStatus;
                if (currentEditStatus === 'sold' && !existing.soldDate) {
                    listingPayload.soldDate = Date.now();
                }
            } else {
                delete existing.status;
                listingPayload.soldDate = null;
            }
            // Save buyer rating if marked sold
            if (currentEditStatus === 'sold' && currentBuyerRating > 0) {
                // Prefer selected chip; fall back to text input
                const selectedChip = document.querySelector('#rateBuyerPicker .buyer-chip.selected:not(.other-chip)');
                const textInput = document.getElementById('rateBuyerName');
                const buyerName = (selectedChip && selectedChip.textContent !== 'Other…')
                    ? selectedChip.textContent.trim()
                    : (textInput?.value.trim() || '');
                listingPayload.buyerRating = {
                    stars: currentBuyerRating,
                    buyerName,
                    note: document.getElementById('rateBuyerNote')?.value.trim() || '',
                    date: Date.now()
                };
            }
            Object.assign(existing, listingPayload, { date: Date.now() });
            syncTarget = existing;
            message = 'Listing updated';
        } else {
            const newListing = { id: nextPartId(), saves: 0, date: Date.now(), apcId: generateApcId(), sellerId: currentUserId || null, ...listingPayload };
            userListings.push(newListing);
            syncTarget = newListing;
        }
    } else {
        const newListing = { id: nextPartId(), saves: 0, date: Date.now(), apcId: generateApcId(), sellerId: currentUserId || null, ...listingPayload };
        userListings.push(newListing);
        syncTarget = newListing;
    }

    saveUserListings();

    const submitBtn = document.getElementById('sellSubmitBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publishing…'; }

    if (syncTarget) await syncListingToSupabase(syncTarget);

    // Donor add from a stock card — link the new listing to the dismantling job so
    // it shows up on that Vehicle Stock Card's parts list.
    if (_sellDonorJobId && isNewListing && syncTarget?.supabaseId) {
        await sb.from('listings').update({ dismantling_job_id: _sellDonorJobId }).eq('id', syncTarget.supabaseId);
        syncTarget.dismantlingJobId = _sellDonorJobId;
        _donorRefreshJobId = _sellDonorJobId;
    }
    _sellDonorJobId = null;

    renderMainGrid();
    renderMyParts();
    if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();

    if (submitBtn) submitBtn.textContent = 'List Part';
    const sellSuccess = document.getElementById('sellSuccessMsg');
    if (sellSuccess) sellSuccess.style.display = 'block';

    const printLabel = currentUserTier === 'pro' && document.getElementById('sellPrintLabel')?.checked;
    if (printLabel && syncTarget) printSellLabel(syncTarget);

    setTimeout(() => {
        if (sellSuccess) sellSuccess.style.display = 'none';
        closeSellOverlay();
        if (submitBtn) submitBtn.disabled = false;
        if (isNewListing && syncTarget) {
            let showShare = true;
            if (currentUserTier === 'pro' && syncTarget.supabaseId) {
                const matches = findWantedMatches(syncTarget);
                if (matches.length) { setTimeout(() => showNotifyBuyersModal(matches, syncTarget), 350); showShare = false; }
            }
            if (showShare) setTimeout(() => _showListingSharePrompt(syncTarget), 400);
        }
        if (_donorRefreshJobId) { const jid = _donorRefreshJobId; _donorRefreshJobId = null; openVehicleStockCard(jid); }
        _fromWantedId = null;
    }, 1500);
}

function printSellLabel(listing) {
    openLabelPrintTab(listing);
}

// Largest font (mm) that fits text on one line within maxWidthMm, measured in
// the actual Arial 900 weight so wide strings ("...CARS", long bin codes) don't clip.
function fitLabelTextMm(text, maxWidthMm = 87, maxMm = 5, minMm = 3) {
    const ctx = document.createElement('canvas').getContext('2d');
    const PX = 3.7795; // CSS px per mm @ 96dpi
    const t = (text || '').toUpperCase();
    const ls = Math.max(0, t.length - 1) * 0.1 * PX; // letter-spacing: 0.1mm
    for (let mm = maxMm; mm > minMm; mm -= 0.1) {
        ctx.font = `900 ${mm * PX}px Arial`;
        if (ctx.measureText(t).width + ls <= maxWidthMm * PX) return Math.round(mm * 10) / 10;
    }
    return minMm;
}

// Landscape 100mm×62mm QR part label for the Brother QL-810W. Shared by the
// print-on-sell toggle and the dashboard "Label" button — prints straight from
// its own tab. Box is height-clamped + overflow:hidden so it can never spill to
// a second sheet.
function openLabelPrintTab(item) {
    const apcId = escapeHtml(item.apcId || ('APC-' + item.id));
    const bizName = (userSettings.businessName || '').trim();
    const brandRaw = bizName || 'AUTO PARTS CONNECTION';
    const brandFontMm = fitLabelTextMm(brandRaw);
    const headerText = escapeHtml(brandRaw);
    // QR encodes just the APC ID (sparse → easy to scan); the scanner resolves it.
    const qrText = item.apcId || ('APC-' + item.id);

    // Generate QR in a hidden temp element, grab the data URL, then open print tab
    const qrTemp = document.createElement('div');
    qrTemp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(qrTemp);
    if (window.QRCode) new QRCode(qrTemp, { text: qrText, width: 560, height: 560, correctLevel: QRCode.CorrectLevel.M });

    setTimeout(() => {
        const qrImg = qrTemp.querySelector('canvas') || qrTemp.querySelector('img');
        let qrSrc = '';
        if (qrImg instanceof HTMLCanvasElement) qrSrc = qrImg.toDataURL();
        else if (qrImg) qrSrc = qrImg.src;
        document.body.removeChild(qrTemp);

        const qrHtml = qrSrc ? `<div class="sell-qr-box"><img src="${qrSrc}" /></div>` : '';
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>APC Label — ${apcId}</title>
<style>${LABEL_PRINT_CSS}</style>
</head><body>
${_buildSellLabelMarkup(item, headerText, brandFontMm, qrHtml)}
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body></html>`;
        const tab = window.open('', '_blank');
        if (tab) { tab.document.open(); tab.document.write(html); tab.document.close(); }
        else showToast('Allow pop-ups to print labels');
    }, 150);
}

// Shared label CSS + markup so the single (My Listings / sell) and the EDW batch
// print paths stay byte-identical. page-break/qr-slot rules only affect the batch.
const LABEL_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .sell-label { width: 100mm; height: 61.5mm; overflow: hidden; padding: 2.5mm 2.5mm 2.5mm 4mm; display: flex; flex-direction: column; page-break-after: always; }
  .sell-label:last-child { page-break-after: avoid; }
  .sell-header { background: #1a1a1a; color: #fff; display: flex; align-items: center; padding: 1.5mm 2.5mm; border-radius: 1mm; margin-bottom: 2.5mm; }
  .sell-brand { flex: 1; min-width: 0; font-weight: 900; letter-spacing: 0.1mm; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sell-body { flex: 1; display: flex; gap: 3mm; min-height: 0; }
  .sell-left { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .sell-footer { margin-top: auto; padding-top: 1.5mm; }
  .sell-created { font-size: 3mm; color: #888; }
  .sell-powered { font-size: 2.8mm; color: #888; margin-top: 0.4mm; }
  .sell-powered .apc { font-weight: 800; color: #555; letter-spacing: 0.2mm; }
  .sell-title { font-size: 4.3mm; font-weight: 900; line-height: 1.15; margin-bottom: 1.5mm; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .sell-rows { display: flex; flex-direction: column; gap: 0.6mm; }
  .sell-row { font-size: 4.1mm; line-height: 1.15; color: #111; }
  .sell-row .lbl { color: #666; font-weight: 400; }
  .sell-row .val { font-weight: 700; }
  .sell-row .val-strong { font-weight: 900; }
  .sell-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 1.5mm; }
  .sell-qr-box { width: 38mm; padding: 3mm; background: #fff; }
  .sell-qr-box img, .sell-qr-box .sell-qr-slot, .sell-qr-box canvas { display: block; width: 100% !important; height: auto !important; }
  .sell-qr-id { font-size: 3.6mm; font-weight: 900; color: #111; text-align: center; word-break: break-all; width: 38mm; }
  @media print { @page { size: 100mm 62mm; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

function _buildSellLabelMarkup(item, headerText, brandFontMm, qrHtml) {
    const conditionMap = { new_oem: 'New — OEM', new_aftermarket: 'New — Aftermarket', used: 'Used', refurbished: 'Refurbished', parts_only: 'Parts Only', excellent: 'Excellent', good: 'Good', fair: 'Fair', damaged: 'Damaged' };
    const condition = escapeHtml(conditionMap[item.condition] || item.condition || '');
    const fits = escapeHtml((item.fits || []).map(f => [f.make, f.model].filter(Boolean).join(' ')).join(', ') || 'Universal');
    const apcId = escapeHtml(item.apcId || ('APC-' + item.id));
    const createdDate = new Date(item.date || Date.now()).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const bin  = item.warehouseBin ? `<div class="sell-row"><span class="lbl">Bin:</span> <span class="val val-strong">${escapeHtml(item.warehouseBin)}</span></div>` : '';
    const year = item.year ? `<div class="sell-row"><span class="lbl">Year:</span> <span class="val">${escapeHtml(String(item.year))}</span></div>` : '';
    const stock = item.stockNumber ? `<div class="sell-row"><span class="lbl">Stock #:</span> <span class="val">${escapeHtml(item.stockNumber)}</span></div>` : '';
    const vin  = item.chassisVin ? `<div class="sell-row"><span class="lbl">VIN:</span> <span class="val">${escapeHtml(item.chassisVin)}</span></div>` : '';
    return `<div class="sell-label">
  <div class="sell-header">
    <div class="sell-brand" style="font-size:${brandFontMm}mm">${headerText}</div>
  </div>
  <div class="sell-body">
    <div class="sell-left">
      <div class="sell-title">${escapeHtml(item.title || '')}</div>
      <div class="sell-rows">
        <div class="sell-row"><span class="lbl">Condition:</span> <span class="val">${condition}</span></div>
        <div class="sell-row"><span class="lbl">Fits:</span> <span class="val">${fits}</span></div>
        ${year}${bin}${stock}${vin}
      </div>
      <div class="sell-footer">
        <div class="sell-created">Created ${createdDate}</div>
        <div class="sell-powered">Powered by <span class="apc">APC</span></div>
      </div>
    </div>
    <div class="sell-right">
      ${qrHtml}
      <div class="sell-qr-id">${apcId}</div>
    </div>
  </div>
</div>`;
}

// Batch print: one print job, one label per page (QR drawn in the print tab).
function printEdwLabelsBatch(items) {
    if (!items || !items.length) return;
    const bizName = (userSettings.businessName || '').trim();
    const brandRaw = bizName || 'AUTO PARTS CONNECTION';
    const brandFontMm = fitLabelTextMm(brandRaw);
    const headerText = escapeHtml(brandRaw);
    const labelsHtml = items.map(item => {
        const code = item.apcId || ('APC-' + item.id); // QR = APC ID (sparse, scans easily)
        return _buildSellLabelMarkup(item, headerText, brandFontMm, `<div class="sell-qr-box"><div class="sell-qr-slot" data-qr="${escapeHtml(code)}"></div></div>`);
    }).join('\n');
    const win = window.open('', '_blank');
    if (!win) { showToast('Allow pop-ups to print labels'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>APC Labels (${items.length})</title>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
<style>${LABEL_PRINT_CSS}</style>
</head><body>
${labelsHtml}
<script>
  document.querySelectorAll('.sell-qr-slot').forEach(el => { new QRCode(el, { text: el.getAttribute('data-qr'), width: 560, height: 560, correctLevel: QRCode.CorrectLevel.M }); });
  setTimeout(() => window.print(), 700);
<\/script></body></html>`);
    win.document.close();
}

// --- DYNAMIC ITEM DETAIL ---
function openItemDetail(partId, _restoring = false, _fromInbox = false) {
    const part = findPartAnywhere(partId);
    if (!part) {
        // Not loaded (e.g. a buyer tapping "View Listing" on another seller's listing) — fetch then retry.
        _fetchListingIntoCache(partId).then(p => { if (p) openItemDetail(partId, _restoring, _fromInbox); });
        return;
    }

    const fromInbox   = _fromInbox || document.getElementById('inboxDrawer')?.classList.contains('active');
    const inStoreView = _detailHistory.length > 0 || document.getElementById('storefrontDrawer')?.classList.contains('active');

    // Push current listing to history when opening a new one from within the storefront
    const detailAlreadyOpen = document.getElementById('detailOverlay')?.classList.contains('active');
    if (!_restoring && detailAlreadyOpen && currentOpenPartId && currentOpenPartId !== partId) {
        if (document.getElementById('storefrontDrawer')?.classList.contains('active')) {
            _detailHistory.push(currentOpenPartId);
        }
    }

    currentOpenPartId = part.supabaseId || part.id;
    _currentOpenPart  = part;
    if (!_restoring) addToRecentlyViewed(part.supabaseId || part.id);
    history.pushState(null, '', '?item=' + (part.supabaseId || part.id));

    // Track view in Supabase — only for other sellers' listings, not own
    if (!_restoring && sb && part.supabaseId && part.sellerId !== currentUserId) {
        sb.from('listing_views').insert({ listing_id: part.supabaseId, viewer_id: currentUserId || null })
          .then(({ error }) => { if (error) console.warn('view track:', error.message); });
    }

    // 1. Carousel — images + dot indicators
    const carousel = document.getElementById('imageCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    if (carousel) {
        carousel.innerHTML = '';
        const images = part.images || [];
        if (images.length > 0) {
            carousel.classList.add('carousel-loading');
        }
        images.forEach((src, i) => {
            const img = document.createElement('img');
            img.style.cssText = 'min-width:100%; scroll-snap-align:start; aspect-ratio:1/1; object-fit:contain; background:#f4f4f4; cursor: zoom-in;' + (i === 0 ? 'opacity:0; transition:opacity 0.2s;' : '');
            img.alt = part.title;
            img.onclick = () => openDetailImageViewer(src, images, i);
            if (i === 0) {
                img.onload = () => { img.style.opacity = '1'; carousel.classList.remove('carousel-loading'); };
                img.onerror = () => { img.style.opacity = '1'; carousel.classList.remove('carousel-loading'); };
            }
            img.src = src; // load all carousel images immediately — small set (3-6 imgs), avoids iOS scroll-snap + lazy-load glitch
            carousel.appendChild(img);
        });
        // Reset to first image — deferred one frame so mobile browsers don't restore old scroll position
        carousel.scrollLeft = 0;
        requestAnimationFrame(() => { carousel.scrollLeft = 0; });
    }
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        if ((part.images || []).length > 1) {
            (part.images || []).forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
                dot.onclick = (e) => {
                    e.stopPropagation();
                    if (carousel) carousel.scrollTo({ left: idx * carousel.offsetWidth, behavior: 'smooth' });
                };
                dotsContainer.appendChild(dot);
            });
            dotsContainer.style.display = 'flex';
        } else {
            dotsContainer.style.display = 'none';
        }
    }

    // 1b. Desktop: large main image + clickable thumbnails
    const desktopMain  = document.getElementById('desktopMainImage');
    const desktopThumbs = document.getElementById('desktopThumbnails');
    if (desktopMain) {
        desktopMain.src = (part.images && part.images[0]) || '';
        desktopMain.alt = part.title;
        desktopMain.onclick = () => openDetailImageViewer((part.images || [])[0] || '', part.images || [], 0);
    }
    if (desktopThumbs) {
        desktopThumbs.innerHTML = '';
        (part.images || []).forEach((src, i) => {
            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.alt = part.title;
            thumb.className = 'desktop-thumb' + (i === 0 ? ' active' : '');
            thumb.onclick = () => {
                if (desktopMain) {
                    desktopMain.src = src;
                    desktopMain.onclick = () => openDetailImageViewer(src, part.images || [], i);
                }
                document.querySelectorAll('.desktop-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            desktopThumbs.appendChild(thumb);
        });
    }

    // 2. Update detail fields safely
    safeText(document.getElementById('detailPrice'), `$${part.price}`);
    safeText(document.getElementById('detailTitle'), part.title);
    const detailVehicleEl = document.getElementById('detailVehicle');
    if (detailVehicleEl) {
        if (Array.isArray(part.fits) && part.fits.length > 0) {
            const f = part.fits[0];
            const seriesKey = f.variant ? `${f.model} ${f.variant}` : f.model;
            const fullName = [f.make, seriesKey].filter(Boolean).join(' ');
            // Look up year range: prefer series-specific range, fall back to base model
            const ranges = (typeof VEHICLE_YEAR_RANGES !== 'undefined') &&
                (VEHICLE_YEAR_RANGES[f.make]?.[seriesKey] || VEHICLE_YEAR_RANGES[f.make]?.[f.model]);
            let yearLabel = '';
            if (ranges?.length && part.year) {
                const yr = parseInt(part.year);
                const gen = ranges.find(([s, e]) => yr >= s && yr <= e);
                if (gen) yearLabel = ` · ${gen[0]}–${gen[1]}`;
            } else if (ranges?.length) {
                const minY = Math.min(...ranges.map(([s]) => s));
                const maxY = Math.max(...ranges.map(([, e]) => e));
                yearLabel = ` · ${minY}–${maxY}`;
            } else if (part.year) {
                yearLabel = ` · ${part.year}`;
            }
            let label = fullName + yearLabel;
            if (part.fits.length > 1) label += ` +${part.fits.length - 1} more`;
            detailVehicleEl.textContent = 'Fits: ' + label;
            detailVehicleEl.style.display = 'block';
        } else {
            detailVehicleEl.style.display = 'none';
        }
    }
    const detailVariantEl = document.getElementById('detailVariant');
    if (detailVariantEl) {
        if (part.variant) {
            safeText(detailVariantEl, 'Engine / Variant: ' + part.variant);
            detailVariantEl.style.display = 'block';
        } else {
            detailVariantEl.style.display = 'none';
        }
    }
    const detailGarageMatchEl = document.getElementById('detailGarageMatch');
    if (detailGarageMatchEl) {
        const hasExplicitFits = part.fits && part.fits.length > 0;
        const matchedVehicle = hasExplicitFits && userIsSignedIn && myVehicles.length > 0
            ? myVehicles.find(v => partFitsVehicle(part, v))
            : null;
        if (matchedVehicle) {
            const vLabel = matchedVehicle.nickname ||
                [matchedVehicle.year, matchedVehicle.make, matchedVehicle.model].filter(Boolean).join(' ');
            safeText(detailGarageMatchEl, `✓ This item fits your ${vLabel} in your Garage`);
            detailGarageMatchEl.style.display = 'block';
        } else {
            detailGarageMatchEl.style.display = 'none';
        }
    }
    const detailPendingBanner = document.getElementById('detailPendingBanner');
    if (detailPendingBanner) detailPendingBanner.style.display = part.status === 'pending' ? '' : 'none';
    const detailApcIdEl = document.getElementById('detailApcId');
    if (detailApcIdEl) {
        if (part.apcId) {
            detailApcIdEl.textContent = 'Item ID: ' + part.apcId;
            detailApcIdEl.style.display = 'block';
        } else {
            detailApcIdEl.style.display = 'none';
        }
    }
    const detailOdoEl = document.getElementById('detailOdometer');
    if (detailOdoEl) {
        if (part.odometer) {
            detailOdoEl.textContent = '🔢 Odometer: ' + Number(part.odometer).toLocaleString() + ' km';
            detailOdoEl.style.display = 'block';
        } else {
            detailOdoEl.style.display = 'none';
        }
    }
    const detailVinEl = document.getElementById('detailVin');
    if (detailVinEl) {
        const ownsPart = userIsSignedIn && currentUserId && part.sellerId === currentUserId;
        if (part.chassisVin) {
            // Owner sees the full donor VIN; public sees the last 6 only (traceability without
            // exposing the whole VIN, which could aid rebirthing/cloning fraud).
            const vinText = ownsPart ? part.chassisVin : '…' + String(part.chassisVin).slice(-6);
            detailVinEl.textContent = '🔑 Donor VIN: ' + vinText;
            detailVinEl.style.display = 'block';
        } else {
            detailVinEl.style.display = 'none';
        }
    }
    const detailBinEl = document.getElementById('detailWarehouseBin');
    if (detailBinEl) {
        const isOwn = userIsSignedIn && currentUserId && part.sellerId === currentUserId;
        if (isOwn && part.warehouseBin) {
            detailBinEl.textContent = '📍 Bin: ' + part.warehouseBin;
            detailBinEl.style.display = 'block';
        } else {
            detailBinEl.style.display = 'none';
        }
    }
    const detailMetaEl = document.getElementById('detailMeta');
    if (detailMetaEl) {
        safeText(document.getElementById('detailPosted'), part.date ? timeAgo(part.date) : '');
        safeText(document.getElementById('detailWatching'), part.saves > 0 ? `${part.saves} watching` : '');
        detailMetaEl.style.display = 'flex';
    }
    safeText(document.getElementById('detailLoc'), part.loc);
    safeText(document.getElementById('chatPartnerName'), part.seller);
    const descSection = document.getElementById('detailDescriptionSection');
    const descEl      = document.getElementById('detailDescription');
    if (part.description) {
        safeText(descEl, part.description);
        if (descSection) descSection.style.display = '';
    } else {
        if (descSection) descSection.style.display = 'none';
    }
    syncDetailSaveButton(part.supabaseId || part.id);

    // Show "Make an Offer" button only when the part has offers enabled and the viewer isn't the seller
    const offerSection = document.getElementById('detailOfferSection');
    if (offerSection) {
        const isOwnListing = userIsSignedIn && ((currentUserId && part.sellerId === currentUserId) || part.seller === getCurrentSellerName());
        offerSection.style.display = (part.openToOffers && !isOwnListing && !fromInbox) ? 'block' : 'none';
    }

    const detailSellerSection = document.getElementById('detailSellerSection');
    const detailLocationSection = document.getElementById('detailLocationSection');
    const detailDescriptionSection = document.getElementById('detailDescriptionSection');
    const detailSignInPrompt = document.getElementById('detailSignInPrompt');
    const lockDetails = !userIsSignedIn;

    if (detailSellerSection) {
        detailSellerSection.classList.toggle('blurred-detail', lockDetails);
        detailSellerSection.classList.toggle('locked', lockDetails);
    }
    const detailSellerColCard = document.getElementById('detailSellerColCard');
    if (detailSellerColCard) detailSellerColCard.classList.toggle('locked', lockDetails);
    if (detailSignInPrompt)  detailSignInPrompt.style.display  = lockDetails ? ''      : 'none';
    const detailVisitStoreBtn = document.getElementById('detailVisitStoreBtn');
    const isOwnListing = userIsSignedIn && ((currentUserId && part.sellerId === currentUserId) || part.seller === getCurrentSellerName());
    const sellerHasOtherListings = getAllParts().some(p => p.id !== part.id && p.seller === part.seller && p.status !== 'sold' && p.status !== 'removed');
    if (detailVisitStoreBtn) detailVisitStoreBtn.style.display = (userIsSignedIn && !isOwnListing && sellerHasOtherListings && !inStoreView && !fromInbox) ? '' : 'none';

    const detailMsgBtn = document.getElementById('detailMsgBtn');
    if (detailMsgBtn) {
        if (lockDetails || fromInbox) {
            detailMsgBtn.style.display = 'none';
        } else if (isOwnListing) {
            detailMsgBtn.style.display = '';
            detailMsgBtn.innerHTML     = '✏️ EDIT LISTING';
            detailMsgBtn.disabled      = false;
            detailMsgBtn.style.background  = 'var(--apc-blue)';
            detailMsgBtn.style.color       = 'white';
            detailMsgBtn.style.boxShadow   = '0 4px 12px rgba(0,122,255,0.2)';
            detailMsgBtn.style.cursor      = 'pointer';
            detailMsgBtn.onclick           = () => openEditListing(part.supabaseId || part.id);
        } else {
            detailMsgBtn.style.display = '';
            detailMsgBtn.innerHTML     = '✉️ MESSAGE SELLER';
            detailMsgBtn.disabled      = false;
            detailMsgBtn.onclick       = handleMessageSeller;
            detailMsgBtn.style.background  = 'var(--apc-orange)';
            detailMsgBtn.style.color       = 'white';
            detailMsgBtn.style.boxShadow   = '0 4px 12px rgba(255,152,0,0.2)';
            detailMsgBtn.style.cursor      = 'pointer';
        }
    }

    // Show report link only for signed-in non-owners, not in inbox/store context
    const reportRow = document.getElementById('reportListingRow');
    if (reportRow) reportRow.style.display = (userIsSignedIn && !isOwnListing && !fromInbox && !inStoreView) ? 'block' : 'none';

    // 3. Update the seller header in the overlay
    const sellerHeaderName = document.getElementById('detailSellerName');
    const sellerHeaderSub  = document.getElementById('detailSellerSub');
    const sellerAvatar     = document.getElementById('detailSellerAvatar');
    if (sellerHeaderName) sellerHeaderName.textContent = part.seller;
    if (sellerHeaderSub)  sellerHeaderSub.textContent  = '';

    // Avatar: own listing uses local settings; others use cached Supabase pic
    const tierBg      = part.isPro ? 'var(--apc-blue)' : 'var(--apc-orange)';
    const tierShadow  = part.isPro ? '0 6px 16px rgba(0,122,255,0.18)' : '0 6px 16px rgba(255,149,0,0.18)';
    function applyAvatar(el, pic) {
        if (!el) return;
        if (pic) {
            el.innerHTML = `<img src="${escapeHtml(pic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
            el.style.background  = 'transparent';
            el.style.boxShadow   = 'none';
        } else {
            el.textContent       = (part.seller || '?').charAt(0).toUpperCase();
            el.style.background  = tierBg;
            el.style.boxShadow   = tierShadow;
        }
    }
    const initialPic = isOwnListing ? (userSettings.profilePic || '') : (_sellerPicCache[part.sellerId] || '');
    applyAvatar(sellerAvatar, initialPic);

    const detailProBadge = document.getElementById('detailProBadge');
    if (detailProBadge) detailProBadge.style.display = part.isPro ? 'inline-block' : 'none';
    const detailTradeBadge = document.getElementById('detailTradeBadge');
    if (detailTradeBadge) detailTradeBadge.style.display = part.tradeOnly ? 'inline-block' : 'none';
    const detailFittingCTA = document.getElementById('detailFittingCTA');
    if (detailFittingCTA) detailFittingCTA.style.display = part.fit ? 'flex' : 'none';

    // Info col seller card (desktop)
    const colAvatar   = document.getElementById('detailSellerColAvatar');
    const colName     = document.getElementById('detailSellerColName');
    const colProBadge = document.getElementById('detailProBadgeCol');
    applyAvatar(colAvatar, initialPic);
    // Cache miss for another seller — fetch lazily so avatar fills in without blocking the overlay
    if (!isOwnListing && !initialPic && part.sellerId && sb) {
        sb.from('public_profiles').select('avatar_url').eq('id', part.sellerId).single().then(({ data }) => {
            if (data?.avatar_url) {
                _sellerPicCache[part.sellerId] = data.avatar_url;
                applyAvatar(sellerAvatar, data.avatar_url);
                applyAvatar(colAvatar,    data.avatar_url);
            }
        });
    }
    if (colName)   colName.textContent   = part.seller;
    if (colProBadge) colProBadge.style.display = part.isPro ? 'inline-block' : 'none';

    // Seller rating in header
    _detailRatings = [];
    const detailRatingEl    = document.getElementById('detailSellerRating');
    const detailRatingColEl = document.getElementById('detailSellerRatingCol');
    if (detailRatingEl)    detailRatingEl.style.display    = 'none';
    if (detailRatingColEl) detailRatingColEl.style.display = 'none';
    if (part.sellerId && sb) {
        sb.from('seller_ratings').select('stars, note, created_at, rater_id').eq('seller_id', part.sellerId).order('created_at', { ascending: false }).limit(100)
          .then(({ data }) => {
              if (!data?.length) return;
              _detailRatings = data;
              const avg   = data.reduce((s, r) => s + (r.stars || 0), 0) / data.length;
              const label = `★ ${avg.toFixed(1)} (${data.length})`;
              if (detailRatingEl)    { detailRatingEl.textContent    = label; detailRatingEl.style.display    = ''; }
              if (detailRatingColEl) { detailRatingColEl.textContent = label; detailRatingColEl.style.display = ''; }
          });
    }

    // Apply blur lock to col seller card (also gets .locked class for overlay visibility — done above)
    if (detailSellerColCard) detailSellerColCard.classList.toggle('blurred-detail', !userIsSignedIn);

    {
        const workshopSection = document.getElementById('detailWorkshopSection');
        if (workshopSection) workshopSection.style.display = (fromInbox || inStoreView) ? 'none' : '';
        if (!fromInbox && !inStoreView) {
            ensureWorkshopsLoaded().then(() => {
                const workshopHeadline = document.getElementById('detailWorkshopHeadline');
                const workshopCards = document.getElementById('detailWorkshopCards');
                if (!workshopSection || !workshopHeadline || !workshopCards) return;
                const isUniversal = !part.fits || part.fits.length === 0;
                if (isUniversal) {
                    const shuffled = [...workshopDatabase].sort(() => Math.random() - 0.5).slice(0, 3);
                    workshopHeadline.textContent = 'Recommended workshops near you';
                    workshopCards.innerHTML = shuffled.map(buildWorkshopCardHTML).join('');
                    workshopSection.style.display = 'block';
                } else {
                    const workshops = getRecommendedWorkshops(part).slice(0, 3);
                    const vehicleLabel = getDetailVehicleLabel(part);
                    workshopHeadline.textContent = `Local ${vehicleLabel} specialists near you`;
                    workshopCards.innerHTML = workshops.length
                        ? workshops.map(buildWorkshopCardHTML).join('')
                        : `<div style="padding: 14px; border: 1px solid #eee; border-radius: 14px; background: #fbfbfb; font-size: 13px;">
                            <div style="color:#555; margin-bottom:10px;">No local fitters are listed for this vehicle yet.</div>
                            <div style="color:#888; line-height:1.5;">Are you a specialist workshop for this vehicle? If you offer fitting services and want to appear here, set up your <strong style="color:#555;">Workshop Profile</strong> in your <a href="#" onclick="event.preventDefault(); ${currentUserTier === 'pro' ? 'onMenuOpenSettings()' : 'onUpgradeToPro()'};" style="color:var(--apc-orange); font-weight:700; text-decoration:none;">${currentUserTier === 'pro' ? 'Pro Settings' : 'APC Pro account'}</a>.</div>
                          </div>`;
                    workshopSection.style.display = 'block';
                }
            });
        }
    }

    // 4. Footer — more from seller or similar items, padded to TARGET
    const footer = document.getElementById('dynamicDetailFooter');
    if (!footer) return;

    const FOOTER_TARGET = window.innerWidth >= 900 ? 8 : 6;
    const active = p => p.status !== 'sold' && p.status !== 'removed';
    const used = new Set([part.id]);

    function collectFooter(pool, n) {
        const picks = [];
        for (const p of pool) {
            if (picks.length >= n) break;
            if (!used.has(p.id)) { picks.push(p); used.add(p.id); }
        }
        return picks;
    }

    function buildStrip(parts) {
        return parts.map(p => {
            const img = thumbUrl((p.images && p.images[0]) ? p.images[0] : 'images/placeholder.png', 200);
            return `<div class="detail-mini-card" onclick="openItemDetail('${p.supabaseId || p.id}')">
                <img class="detail-mini-img" src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}">
                <div class="detail-mini-info">
                    <div class="detail-mini-title">${escapeHtml(p.title)}</div>
                    <div class="detail-mini-price">$${p.price}</div>
                </div>
            </div>`;
        }).join('');
    }

    const allActive = getAllParts().filter(p => active(p));

    let html = '';

    if (part.isPro) {
        const sellerParts = collectFooter(allActive.filter(p => p.seller === part.seller), FOOTER_TARGET);
        const need = FOOTER_TARGET - sellerParts.length;
        const catFill = need > 0 ? collectFooter(allActive.filter(p => p.category === part.category), need) : [];
        const stillNeed = need - catFill.length;
        const recentFill = stillNeed > 0 ? collectFooter(allActive, stillNeed) : [];
        const allStrip = [...sellerParts, ...catFill, ...recentFill];
        html += `<div class="detail-footer-label">
            MORE FROM ${escapeHtml((part.seller || '').toUpperCase())}
            <span onclick="openStorefront(${part.id})" style="color:var(--apc-orange);font-weight:900;cursor:pointer;font-size:10px;">VISIT STORE →</span>
        </div>
        <div class="detail-footer-strip">${buildStrip(allStrip)}</div>`;
    } else {
        const catParts    = collectFooter(allActive.filter(p => p.category === part.category), FOOTER_TARGET);
        const remaining   = FOOTER_TARGET - catParts.length;
        const recentFill  = remaining > 0 ? collectFooter(allActive, remaining) : [];
        const allFill = [...catParts, ...recentFill];
        html += `<div class="detail-footer-label">SIMILAR ITEMS</div>
        <div class="detail-footer-strip">${buildStrip(allFill)}</div>`;
    }

    footer.innerHTML = (inStoreView || fromInbox) ? '' : html;

    const detailScrollArea = document.getElementById('detailScrollArea');
    if (detailScrollArea) detailScrollArea.scrollTop = 0;

    const detailEl = document.getElementById('detailOverlay');
    if (detailEl) {
        detailEl.classList.toggle('chat-card', !!fromInbox);
        const mobileCarousel = detailEl.querySelector('.mobile-carousel');
        if (mobileCarousel) mobileCarousel.style.display = fromInbox ? 'block' : '';
    }

    if (detailEl && detailEl.classList.contains('active')) {
        if (_restoring) {
            detailEl.style.zIndex = '';
            detailEl.style.transform  = '';
            detailEl.style.opacity    = '';
            detailEl.style.transition = '';
        } else if (document.getElementById('storefrontDrawer')?.classList.contains('active')) {
            detailEl.style.zIndex = '3250'; // lift above store to show this listing
        }
    } else {
        const parentOpen = [...document.querySelectorAll('.drawer.active')].some(d => d.id !== 'detailOverlay');
        if (parentOpen && detailEl) detailEl.style.zIndex = '3755'; // float above inbox/chat (z-index 3750)
        toggleDrawer('detailOverlay', parentOpen);
    }
}

function onDetailSellerClick() {
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    openStorefront(currentOpenPartId);
}

function openReportSheet() {
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    document.querySelectorAll('#reportReasons input[type="radio"]').forEach(r => r.checked = false);
    const note = document.getElementById('reportNote');
    if (note) note.value = '';
    document.getElementById('reportBackdrop').style.display = 'block';
    document.getElementById('reportSheet').style.display = 'block';
}

function closeReportSheet() {
    document.getElementById('reportBackdrop').style.display = 'none';
    document.getElementById('reportSheet').style.display = 'none';
}

async function submitReport() {
    const selected = document.querySelector('#reportReasons input[type="radio"]:checked');
    if (!selected) { showToast('Please select a reason.'); return; }
    const note = (document.getElementById('reportNote')?.value || '').trim();
    const part = _currentOpenPart;
    if (!part || !sb) { showToast('Unable to submit — please try again.'); return; }
    const { error } = await sb.from('reports').insert({
        listing_id: part.supabaseId || null,
        reporter_id: currentUserId,
        reason: selected.value,
        note: note || null
    });
    closeReportSheet();
    if (error) {
        console.warn('submitReport:', error.message);
        showToast('Unable to submit report — please try again.');
    } else {
        showToast('Report submitted. Thank you.');
    }
}

function closeDetailOverlay() {
    if (_detailHistory.length > 0) {
        const prevId = _detailHistory.pop();
        // Clear swipe-dismiss animation styles before restoring — otherwise the overlay
        // stays off-screen (translateY 105%) and blocks touches on iOS Safari
        const el = document.getElementById('detailOverlay');
        if (el) { el.style.transform = ''; el.style.opacity = ''; el.style.transition = ''; }
        openItemDetail(prevId, true); // restore previous listing, leave overlay open
        return;
    }
    _detailHistory = [];
    const el = document.getElementById('detailOverlay');
    if (el) { el.classList.remove('active', 'chat-card', 'vsc-modal'); el.style.zIndex = ''; el.style.transform = ''; el.style.opacity = ''; el.style.transition = ''; }
    syncBackdrop();
    history.pushState(null, '', location.pathname);
}

function initDetailSwipeDismiss() {
    const overlay    = document.getElementById('detailOverlay');
    const handleBar  = document.getElementById('detailDragHandleBar');
    const header     = overlay?.querySelector('.drawer-header');
    const scrollArea = document.getElementById('detailScrollArea');
    if (!overlay || !header) return;

    let startY = 0, startX = 0, startScrollTop = 0, startTime = 0;
    let currentY = 0, dragging = false;

    function canActivate() {
        return overlay.classList.contains('active') &&
               window.innerWidth < 900;
    }

    function onStart(e) {
        if (!canActivate()) return;
        const t = e.touches[0];
        startY = t.clientY; startX = t.clientX;
        startTime = Date.now();
        startScrollTop = scrollArea ? scrollArea.scrollTop : 0;
        currentY = 0; dragging = false;
    }

    function onMove(e) {
        if (!canActivate()) return;
        const dy = e.touches[0].clientY - startY;
        const dx = e.touches[0].clientX - startX;

        if (!dragging) {
            if (Math.abs(dy) < 8) return;
            if (Math.abs(dx) > Math.abs(dy)) return; // horizontal — ignore
            if (dy < 0) return;                       // upward — ignore
            if (startScrollTop > 0) return;           // mid-scroll — ignore
            dragging = true;
        }

        currentY = Math.max(0, dy);
        overlay.style.transition = 'none';
        overlay.style.transform  = `translateY(${currentY}px)`;
        overlay.style.opacity    = String(Math.max(0.5, 1 - currentY / 400));
        e.preventDefault();
    }

    function onEnd() {
        if (!dragging) return;
        dragging = false;
        const velocity = currentY / (Date.now() - startTime);

        if (currentY > 110 || velocity > 0.45) {
            overlay.style.transition = 'transform 0.26s ease-in, opacity 0.26s ease-in';
            overlay.style.transform  = 'translateY(105%)';
            overlay.style.opacity    = '0';
            setTimeout(closeDetailOverlay, 260);
        } else {
            overlay.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            overlay.style.transform  = 'translateY(0)';
            overlay.style.opacity    = '1';
            setTimeout(() => { overlay.style.transform = ''; overlay.style.transition = ''; overlay.style.opacity = ''; }, 400);
        }
    }

    const opts = { passive: false };
    const passOpts = { passive: true };

    [handleBar, header].forEach(el => {
        if (!el) return;
        el.addEventListener('touchstart', onStart, passOpts);
        el.addEventListener('touchmove',  onMove,  opts);
        el.addEventListener('touchend',   onEnd,   passOpts);
    });

    if (scrollArea) {
        scrollArea.addEventListener('touchstart', onStart, passOpts);
        scrollArea.addEventListener('touchmove',  onMove,  opts);
        scrollArea.addEventListener('touchend',   onEnd,   passOpts);
    }
}

function initWorkshopSwipeDismiss() {
    const overlay    = document.getElementById('workshopDetailOverlay');
    const handleBar  = document.getElementById('wsOverlayHandleBar');
    const header     = overlay?.querySelector('.drawer-header');
    const scrollArea = document.getElementById('wsOverlayScrollArea');
    if (!overlay || !header) return;

    let startY = 0, startX = 0, startScrollTop = 0, startTime = 0;
    let currentY = 0, dragging = false;

    function canActivate() {
        return overlay.classList.contains('active') && window.innerWidth < 900;
    }
    function onStart(e) {
        if (!canActivate()) return;
        const t = e.touches[0];
        startY = t.clientY; startX = t.clientX;
        startTime = Date.now();
        startScrollTop = scrollArea ? scrollArea.scrollTop : 0;
        currentY = 0; dragging = false;
    }
    function onMove(e) {
        if (!canActivate()) return;
        const dy = e.touches[0].clientY - startY;
        const dx = e.touches[0].clientX - startX;
        if (!dragging) {
            if (Math.abs(dy) < 8) return;
            if (Math.abs(dx) > Math.abs(dy)) return;
            if (dy < 0) return;
            if (startScrollTop > 0) return;
            dragging = true;
        }
        currentY = Math.max(0, dy);
        overlay.style.transition = 'none';
        overlay.style.transform  = `translateY(${currentY}px)`;
        overlay.style.opacity    = String(Math.max(0.5, 1 - currentY / 400));
        e.preventDefault();
    }
    function onEnd() {
        if (!dragging) return;
        dragging = false;
        const velocity = currentY / (Date.now() - startTime);
        if (currentY > 110 || velocity > 0.45) {
            overlay.style.transition = 'transform 0.26s ease-in, opacity 0.26s ease-in';
            overlay.style.transform  = 'translateY(105%)';
            overlay.style.opacity    = '0';
            setTimeout(() => {
                closeWorkshopOverlay();
                overlay.style.transform = '';
                overlay.style.transition = '';
                overlay.style.opacity = '';
            }, 260);
        } else {
            overlay.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            overlay.style.transform  = 'translateY(0)';
            overlay.style.opacity    = '1';
            setTimeout(() => { overlay.style.transform = ''; overlay.style.transition = ''; overlay.style.opacity = ''; }, 400);
        }
    }

    const opts = { passive: false };
    const passOpts = { passive: true };
    [handleBar, header].forEach(el => {
        if (!el) return;
        el.addEventListener('touchstart', onStart, passOpts);
        el.addEventListener('touchmove',  onMove,  opts);
        el.addEventListener('touchend',   onEnd,   passOpts);
    });
    if (scrollArea) {
        scrollArea.addEventListener('touchstart', onStart, passOpts);
        scrollArea.addEventListener('touchmove',  onMove,  opts);
        scrollArea.addEventListener('touchend',   onEnd,   passOpts);
    }
}

let _lightboxImages = [];
let _lightboxIdx    = 0;

function carouselStep(dir) {
    const carousel = document.getElementById('imageCarousel');
    if (carousel) carousel.scrollBy({ left: dir * carousel.offsetWidth, behavior: 'smooth' });
}

// Lightbox zoom state (contained pinch-zoom + pan — owns the gesture so iOS doesn't
// zoom the whole page). scale 1 = fit; >1 = zoomed (pan enabled), swipe/pull-down disabled.
let _lbScale = 1, _lbTx = 0, _lbTy = 0;
function _lbResetZoom(animate) {
    _lbScale = 1; _lbTx = 0; _lbTy = 0;
    const img = document.getElementById('lightboxImage');
    if (!img) return;
    img.style.transition = animate ? 'transform 0.25s ease' : 'none';
    img.style.transform = '';
    if (animate) setTimeout(() => { if (img) img.style.transition = ''; }, 260);
}

function openDetailImageViewer(src, images, idx) {
    _lightboxImages = (images && images.length) ? images : [src];
    _lightboxIdx    = (idx !== undefined) ? idx : _lightboxImages.indexOf(src);
    if (_lightboxIdx < 0) _lightboxIdx = 0;

    const lightbox = document.getElementById('imageLightbox');
    if (!lightbox) return;

    // Reset strip to centre position
    const strip = lightbox.querySelector('.lightbox-strip');
    if (strip) { strip.style.transition = 'none'; strip.style.transform = ''; }

    // Build dots
    const dotsEl = document.getElementById('lightboxDots');
    if (dotsEl) {
        dotsEl.innerHTML = '';
        if (_lightboxImages.length > 1) {
            _lightboxImages.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'carousel-dot' + (i === _lightboxIdx ? ' active' : '');
                dot.onclick = (e) => { e.stopPropagation(); _lightboxIdx = i; _syncLightboxStrip(); updateLightboxNav(); };
                dotsEl.appendChild(dot);
            });
        }
    }

    _syncLightboxStrip();
    _lbResetZoom(false);
    lightbox.style.zIndex = '19999';
    lightbox.classList.add('active');
    updateLightboxNav();

    _initLightboxPullDown(lightbox);
}

function _initLightboxPullDown(lightbox) {
    const inner = lightbox.querySelector('.image-lightbox-inner');
    if (!inner || inner._pullDownBound) return;
    inner._pullDownBound = true;

    const strip = inner.querySelector('.lightbox-strip');
    const CLOSE_THRESHOLD = 110;
    const SWIPE_THRESHOLD = 55;
    const MAX_SCALE = 4;
    const getImg = () => document.getElementById('lightboxImage');
    const dist  = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const applyZoom = () => { const el = getImg(); if (el) el.style.transform = `translate(${_lbTx}px, ${_lbTy}px) scale(${_lbScale})`; };
    function clampPan() {
        const el = getImg(); if (!el) return;
        const maxX = Math.max(0, (el.clientWidth  * _lbScale - window.innerWidth)  / 2);
        const maxY = Math.max(0, (el.clientHeight * _lbScale - window.innerHeight) / 2);
        _lbTx = Math.max(-maxX, Math.min(maxX, _lbTx));
        _lbTy = Math.max(-maxY, Math.min(maxY, _lbTy));
    }

    let startX = 0, startY = 0, lockDir = null, activeDrag = false;
    let pinching = false, pinchDist0 = 0, pinchScale0 = 1, pinchIx = 0, pinchIy = 0;
    let panning = false, panX0 = 0, panY0 = 0, panTx0 = 0, panTy0 = 0;
    let lastTap = 0;
    // true while a pinch is/was in progress until ALL fingers lift — stops the leftover
    // finger after a pinch from triggering swipe / pull-down-to-close with stale coords.
    let multiTouch = false;

    // Block iOS native page zoom — the lightbox owns the pinch now.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev =>
        inner.addEventListener(ev, e => e.preventDefault(), { passive: false }));

    inner.addEventListener('touchstart', e => {
        // A fresh single finger clears it; a 2nd finger sets it. The leftover finger after a
        // pinch gets no new touchstart, so this stays true until they fully lift and start over.
        multiTouch = e.touches.length >= 2;
        if (e.touches.length === 2) {
            // pinch start — anchor to the midpoint in image space
            pinching = true; panning = false; activeDrag = false; lockDir = null;
            pinchDist0  = dist(e.touches[0], e.touches[1]);
            pinchScale0 = _lbScale;
            const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            pinchIx = (mx - window.innerWidth  / 2 - _lbTx) / _lbScale;
            pinchIy = (my - window.innerHeight / 2 - _lbTy) / _lbScale;
            const el = getImg(); if (el) el.style.transition = 'none';
            e.preventDefault();
            return;
        }
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lockDir = null; activeDrag = false;
        if (_lbScale > 1) {
            panning = true; panX0 = startX; panY0 = startY; panTx0 = _lbTx; panTy0 = _lbTy;
            const el = getImg(); if (el) el.style.transition = 'none';
        } else {
            inner.style.transition = 'none';
            if (strip) strip.style.transition = 'none';
        }
    }, { passive: false });

    inner.addEventListener('touchmove', e => {
        if (pinching && e.touches.length === 2) {
            e.preventDefault();
            const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            let s = pinchScale0 * (dist(e.touches[0], e.touches[1]) / pinchDist0);
            s = Math.max(0.6, Math.min(MAX_SCALE, s)); // slight under-zoom for rubber-band feel
            _lbScale = s;
            _lbTx = mx - window.innerWidth  / 2 - pinchIx * s;
            _lbTy = my - window.innerHeight / 2 - pinchIy * s;
            applyZoom();
            return;
        }
        if (panning && e.touches.length === 1) {
            e.preventDefault();
            _lbTx = panTx0 + (e.touches[0].clientX - panX0);
            _lbTy = panTy0 + (e.touches[0].clientY - panY0);
            clampPan();
            applyZoom();
            return;
        }
        if (e.touches.length !== 1 || _lbScale > 1 || multiTouch) return;
        // ── swipe / pull-down (only at fit, and not a leftover finger from a pinch) ──
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (!lockDir) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            lockDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
        if (lockDir === 'h') {
            if (_lightboxImages.length < 2) return;
            activeDrag = true;
            const atEdge = (dx < 0 && _lightboxIdx === _lightboxImages.length - 1) ||
                           (dx > 0 && _lightboxIdx === 0);
            if (strip) strip.style.transform = `translateX(calc(-33.333% + ${atEdge ? dx * 0.18 : dx}px))`;
        } else {
            if (dy < 0) return;
            activeDrag = true;
            const progress = Math.min(dy / CLOSE_THRESHOLD, 1);
            inner.style.transform = `translateY(${dy * 0.6}px) scale(${1 - progress * 0.12})`;
            lightbox.style.background = `rgba(0,0,0,${0.92 - progress * 0.72})`;
        }
    }, { passive: false });

    inner.addEventListener('touchend', e => {
        // pinch finished (a finger lifted)
        if (pinching && e.touches.length < 2) {
            pinching = false;
            const el = getImg();
            if (_lbScale <= 1) {
                _lbResetZoom(true); // rubber-band back to fit
            } else {
                clampPan();
                if (el) { el.style.transition = 'transform 0.2s ease'; applyZoom(); setTimeout(() => { if (el) el.style.transition = ''; }, 210); }
                if (e.touches.length === 1) { panning = true; panX0 = e.touches[0].clientX; panY0 = e.touches[0].clientY; panTx0 = _lbTx; panTy0 = _lbTy; }
            }
            return;
        }
        if (panning) { panning = false; return; }

        // double-tap to toggle zoom (only on a clean tap, not a drag)
        if (!activeDrag && !lockDir) {
            const now = Date.now();
            if (now - lastTap < 300) {
                lastTap = 0;
                const el = getImg();
                if (_lbScale > 1) { _lbResetZoom(true); }
                else if (el) {
                    _lbScale = 2.5; _lbTx = 0; _lbTy = 0;
                    el.style.transition = 'transform 0.2s ease'; applyZoom();
                    setTimeout(() => { if (el) el.style.transition = ''; }, 210);
                }
                return;
            }
            lastTap = now;
        }

        if (!activeDrag || !lockDir) { lockDir = null; activeDrag = false; return; }
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const n = _lightboxImages.length;

        if (lockDir === 'h') {
            const dir = dx < 0 ? 1 : -1;
            const atEdge = (dir === 1 && _lightboxIdx === n - 1) ||
                           (dir === -1 && _lightboxIdx === 0);

            if (atEdge || Math.abs(dx) < SWIPE_THRESHOLD) {
                // Spring back to centre
                if (strip) {
                    strip.style.transition = 'transform 0.28s ease';
                    strip.style.transform = 'translateX(-33.333%)';
                    setTimeout(() => { if (strip) strip.style.transition = ''; }, 290);
                }
            } else {
                // Animate strip to the adjacent slot — both images travel together until new one lands
                const targetPct = dir === 1 ? '-66.666%' : '0%';
                if (strip) {
                    strip.style.transition = 'transform 0.22s ease';
                    strip.style.transform = `translateX(${targetPct})`;
                }
                setTimeout(() => {
                    const newIdx = (_lightboxIdx + dir + n) % n;
                    // Pre-populate center slot before resetting strip (avoids a flash)
                    const imgEl = document.getElementById('lightboxImage');
                    if (imgEl) imgEl.src = _lightboxImages[newIdx];
                    if (strip) { strip.style.transition = 'none'; strip.style.transform = 'translateX(-33.333%)'; }
                    _lightboxIdx = newIdx;
                    _syncLightboxStrip();
                    updateLightboxNav();
                }, 225);
            }
        } else {
            inner.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
            lightbox.style.transition = 'background 0.25s ease';
            if (dy >= CLOSE_THRESHOLD) {
                inner.style.transform = `translateY(100vh)`;
                inner.style.opacity = '0';
                setTimeout(() => {
                    closeDetailImageViewer();
                    inner.style.transform = '';
                    inner.style.opacity   = '';
                    inner.style.transition = '';
                    lightbox.style.background = '';
                    lightbox.style.transition = '';
                }, 220);
            } else {
                inner.style.transform = '';
                lightbox.style.background = '';
                setTimeout(() => { inner.style.transition = ''; lightbox.style.transition = ''; }, 260);
            }
        }

        lockDir = null;
        activeDrag = false;
    }, { passive: true });
}

function _syncLightboxStrip() {
    const n    = _lightboxImages.length;
    const prev = document.getElementById('lightboxPrev');
    const curr = document.getElementById('lightboxImage');
    const next = document.getElementById('lightboxNext');
    if (curr) curr.src = _lightboxImages[_lightboxIdx] || '';
    if (prev) prev.src = n > 1 ? _lightboxImages[(_lightboxIdx - 1 + n) % n] : '';
    if (next) next.src = n > 1 ? _lightboxImages[(_lightboxIdx + 1) % n] : '';
}

function lightboxNav(dir) {
    if (_lightboxImages.length < 2) return;
    _lightboxIdx = (_lightboxIdx + dir + _lightboxImages.length) % _lightboxImages.length;
    _syncLightboxStrip();
    _lbResetZoom(false);
    updateLightboxNav();
}

function updateLightboxNav() {
    document.querySelectorAll('#lightboxDots .carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === _lightboxIdx);
    });
    const multi = _lightboxImages.length > 1;
    const isDesktop = window.innerWidth >= 900;
    const prevBtn = document.getElementById('lightboxPrevBtn');
    const nextBtn = document.getElementById('lightboxNextBtn');
    if (prevBtn) prevBtn.style.display = (multi && isDesktop) ? '' : 'none';
    if (nextBtn) nextBtn.style.display = (multi && isDesktop) ? '' : 'none';
}

function closeDetailImageViewer() {
    const lightbox = document.getElementById('imageLightbox');
    if (!lightbox) return;
    lightbox.classList.remove('active');
    ['lightboxPrev', 'lightboxImage', 'lightboxNext'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = '';
    });
    const strip = lightbox.querySelector('.lightbox-strip');
    if (strip) { strip.style.transition = 'none'; strip.style.transform = ''; }
    _lbResetZoom(false);
}

function shareCurrentListing(btn) {
    if (btn) btn.blur(); // clear focus/active state so button doesn't stay highlighted
    const part = findPartAnywhere(currentOpenPartId);
    if (!part) return;
    const text = `${part.title} — $${part.price} | Auto Parts Connection`;
    const shareUrl = `${location.origin}${location.pathname}?item=${part.supabaseId || part.id}`;
    if (navigator.share) {
        navigator.share({ title: part.title, text, url: shareUrl }).catch(() => {});
    } else {
        navigator.clipboard?.writeText(shareUrl)
            .then(() => showToast('Link copied!'))
            .catch(() => showToast('Share not available on this browser'));
    }
}

// --- SELLER STOREFRONT ---
function renderStorefront(sellerName, isPro, logo, businessName, abn, about, location, banner, bannerColor = null, userId = null) {
    currentStorefrontSeller = sellerName;
    const initial = (sellerName || 'S').charAt(0).toUpperCase();

    // Hero banner
    const hero = document.querySelector('#storefrontDrawer .sf-hero');
    if (hero) {
        if (banner) {
            hero.style.background = '';
            hero.style.backgroundImage = `url(${banner})`;
            hero.style.backgroundSize = 'cover';
            hero.style.backgroundPosition = 'center';
            hero.classList.add('has-banner');
        } else {
            hero.style.backgroundImage = '';
            hero.style.backgroundSize = '';
            hero.style.backgroundPosition = '';
            hero.style.background = bannerGradient(bannerColor || '#f07020');
            hero.classList.remove('has-banner');
        }
    }

    const isTrade = !isPro && (userId ? (getAllParts().find(p => p.sellerId === userId)?.sellerTier === 'trade') : false);

    // Logo / initials
    const logoImg      = document.getElementById('sfLogoImg');
    const logoInitials = document.getElementById('sfLogoInitials');
    if (logo) {
        if (logoImg)      { logoImg.src = logo; logoImg.style.display = 'block'; }
        if (logoInitials)   logoInitials.style.display = 'none';
    } else {
        if (logoImg)        logoImg.style.display = 'none';
        if (logoInitials) {
            logoInitials.style.display = '';
            logoInitials.textContent = initial;
            logoInitials.style.background = isPro ? 'var(--tier-pro)' : isTrade ? 'var(--tier-trade)' : 'var(--tier-personal)';
        }
    }

    // Identity
    const sfBizName = document.getElementById('sfBusinessName');
    const sfProBadge = document.getElementById('sfProBadge');
    const sfAbnChip  = document.getElementById('sfAbnChip');
    const sfSeller   = document.getElementById('sfSellerName');
    const sfLoc      = document.getElementById('sfLocation');

    const sfTradeBadge = document.getElementById('sfTradeBadge');
    if (sfBizName)    { sfBizName.textContent = businessName || ''; sfBizName.style.display = businessName ? '' : 'none'; }
    if (sfProBadge)    sfProBadge.style.display   = isPro ? '' : 'none';
    if (sfTradeBadge)  sfTradeBadge.style.display  = (!isPro && isTrade) ? '' : 'none';
    if (sfAbnChip)     sfAbnChip.style.display     = ((isPro || isTrade) && abn) ? '' : 'none';
    if (sfSeller) {
        sfSeller.textContent = sellerName || '';
        sfSeller.style.display = (sellerName && sellerName !== businessName) ? '' : 'none';
    }
    if (sfLoc)     { sfLoc.textContent = location ? '📍 ' + location : ''; sfLoc.style.display = location ? '' : 'none'; }

    // About
    const sfAbout     = document.getElementById('sfAboutSection');
    const sfAboutText = document.getElementById('sfAboutText');
    if (sfAbout) sfAbout.style.display = (isPro && about) ? '' : 'none';
    if (sfAboutText) sfAboutText.textContent = about || '';

    // Stats
    const matchPart = p => userId ? (p.sellerId === userId || p.seller === sellerName) : p.seller === sellerName;
    const allParts   = getAllParts().filter(matchPart);
    const totalSaves = allParts.reduce((s, p) => s + (p.saves || 0), 0);
    const listEl = document.getElementById('sfStatListings');
    const saveEl = document.getElementById('sfStatSaves');
    if (listEl) listEl.textContent = allParts.length;
    if (saveEl) saveEl.textContent = totalSaves;

    // Grid
    const grid = document.getElementById('sellerPartsGrid');
    if (grid) {
        grid.innerHTML = '';
        grid.dataset.userId = userId || '';
        allParts.forEach(p => { grid.innerHTML += buildCardHTML(p); });
    }

    // Clear search
    const searchEl = document.getElementById('storefrontSearch');
    if (searchEl) searchEl.value = '';

    // Ratings
    _sfRatings = [];
    const ratingEl = document.getElementById('sfRatingStat');
    if (ratingEl) ratingEl.style.display = 'none';
    if (userId && sb) {
        sb.from('seller_ratings')
            .select('stars, note, created_at, listing_id')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data }) => {
                if (!data?.length) return;
                _sfRatings = data;
                const avg = data.reduce((s, r) => s + (r.stars || 0), 0) / data.length;
                if (ratingEl) {
                    ratingEl.textContent = `★ ${avg.toFixed(1)} (${data.length})`;
                    ratingEl.style.display = '';
                    const divEl = document.getElementById('sfRatingDivider');
                    if (divEl) divEl.style.display = '';
                }
            });
    }

    syncStoreSaveButton();
}

let _sfRatings = [];
let _detailRatings = [];
let _dataLoadStarted = false; // guard against double-loading on session restore

function openSellerRatings(ratings = _sfRatings) {
    if (!ratings?.length) return;

    const existing = document.getElementById('sfRatingsSheet');
    if (existing) { existing.remove(); return; }

    const avg   = ratings.reduce((s, r) => s + (r.stars || 0), 0) / ratings.length;
    const total = ratings.length;
    const counts = [5,4,3,2,1].map(n => ({ n, c: ratings.filter(r => r.stars === n).length }));

    const sheet = document.createElement('div');
    sheet.id = 'sfRatingsSheet';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);padding:20px;box-sizing:border-box;';
    sheet.onclick = (e) => { if (e.target === sheet) sheet.remove(); };

    const panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;border-radius:20px;width:100%;max-width:520px;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.22);';

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:20px 20px 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
    hdr.innerHTML = `<div style="font-weight:800;font-size:17px;color:#111;">Seller Ratings</div>
        <button onclick="document.getElementById('sfRatingsSheet').remove()" style="background:none;border:none;font-size:22px;color:#aaa;cursor:pointer;padding:0;line-height:1;">×</button>`;

    // Summary strip
    const summary = document.createElement('div');
    summary.style.cssText = 'display:flex;align-items:center;gap:20px;padding:16px 20px 14px;border-bottom:1px solid #f0f0f0;flex-shrink:0;';

    const bigStar = document.createElement('div');
    bigStar.style.cssText = 'text-align:center;flex-shrink:0;';
    bigStar.innerHTML = `<div style="font-size:40px;font-weight:900;color:#111;line-height:1;">${avg.toFixed(1)}</div>
        <div style="font-size:18px;color:#f59e0b;letter-spacing:2px;">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</div>
        <div style="font-size:11px;color:#888;margin-top:3px;">${total} rating${total !== 1 ? 's' : ''}</div>`;

    const bars = document.createElement('div');
    bars.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;';
    counts.forEach(({ n, c }) => {
        const pct = total ? Math.round((c / total) * 100) : 0;
        bars.innerHTML += `<div style="display:flex;align-items:center;gap:6px;font-size:11px;">
            <span style="color:#f59e0b;width:14px;text-align:right;font-weight:700;">${n}</span>
            <div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:#f59e0b;border-radius:3px;"></div>
            </div>
            <span style="color:#888;width:18px;">${c}</span>
        </div>`;
    });

    summary.appendChild(bigStar);
    summary.appendChild(bars);

    // Reviews list
    const list = document.createElement('div');
    list.style.cssText = 'overflow-y:auto;flex:1;padding:0 20px 20px;';

    ratings.forEach(r => {
        const part = r.listing_id ? findPartAnywhere(r.listing_id) : null;
        const listingTitle = part ? part.title : null;
        const stars = r.stars ? '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars) : '';
        const date  = r.created_at ? new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

        const row = document.createElement('div');
        row.style.cssText = 'padding:14px 0;border-bottom:1px solid #f5f5f5;';
        row.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <span style="color:#f59e0b;font-size:15px;letter-spacing:1px;">${escapeHtml(stars)}</span>
                <span style="font-size:11px;color:#bbb;">${escapeHtml(date)}</span>
            </div>
            ${r.note ? `<div style="font-size:13px;color:#333;line-height:1.5;margin-bottom:4px;">"${escapeHtml(r.note)}"</div>` : ''}
            ${listingTitle ? `<div style="font-size:11px;color:#aaa;">Re: ${escapeHtml(listingTitle)}</div>` : ''}`;
        list.appendChild(row);
    });

    panel.appendChild(hdr);
    panel.appendChild(summary);
    panel.appendChild(list);
    sheet.appendChild(panel);
    document.body.appendChild(sheet);
}

function filterStorefront() {
    const q = (document.getElementById('storefrontSearch')?.value || '').toLowerCase().trim();
    const grid = document.getElementById('sellerPartsGrid');
    if (!grid) return;
    const sellerName = grid.dataset.seller || '';
    const userId = grid.dataset.userId || null;
    const matchPart = p => userId ? (p.sellerId === userId || p.seller === sellerName) : p.seller === sellerName;
    const parts = getAllParts().filter(p => matchPart(p) &&
        (!q || p.title.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)));
    grid.innerHTML = '';
    parts.forEach(p => { grid.innerHTML += buildCardHTML(p); });
}

function openStorefront(partId) {
    const part = findPartAnywhere(partId);
    if (!part) return;
    const isOwn = (currentUserId && part.sellerId === currentUserId) || part.seller === getCurrentSellerName();

    // Must be set AFTER any async path resolves — capture now so the closure uses the right value
    const fromListingDetail = !!currentOpenPartId;

    function _showStorefront(logo, businessName, abn, about, location, banner, bannerColor = null) {
        const grid = document.getElementById('sellerPartsGrid');
        if (grid) { grid.dataset.seller = part.seller; grid.dataset.userId = part.sellerId || ''; }
        renderStorefront(part.seller, part.isPro, logo, businessName, abn, about, location, banner, bannerColor, part.sellerId || null);
        const sfMsgBtn = document.getElementById('sfMsgBtn');
        if (sfMsgBtn) sfMsgBtn.style.display = isOwn ? 'none' : '';
        const sfEl  = document.getElementById('storefrontDrawer');
        const backBar = document.getElementById('storefrontBackBar');
        if (sfEl)    sfEl.style.zIndex    = fromListingDetail ? '3800' : '';
        if (backBar) backBar.style.display = fromListingDetail ? '' : 'none';
        openDrawer('storefrontDrawer');
    }

    if (isOwn) {
        if (isTradeOrPro()) {
            const grid = document.getElementById('sellerPartsGrid');
            if (grid) { grid.dataset.seller = part.seller; grid.dataset.userId = currentUserId; }
            renderWorkshopStorefront({
                user_id: currentUserId, sellerName: part.seller,
                logo_url: userSettings.profilePic || userSettings.businessLogo || '',
                business_name: userSettings.businessName || '', abn: userSettings.abn || '',
                about: userSettings.about || '', location: userSettings.location || '',
                banner_url: userSettings.businessBanner || '', banner_color: userSettings.bannerColor || null,
                address: workshopProfile.address || '',
                biz_type: userSettings.businessType || 'service',
                services: workshopProfile.services || {}, vehicles: workshopProfile.vehicles || [],
                parts_categories: workshopProfile.partsCategories || [],
                parts_type: workshopProfile.partsType || 'new',
                wrecking: workshopProfile.wrecking || false, wrecking_makes: workshopProfile.wreckingMakes || [],
            });
            const sfMsgBtn = document.getElementById('sfMsgBtn');
            if (sfMsgBtn) sfMsgBtn.style.display = 'none';
            const sfEl = document.getElementById('storefrontDrawer');
            const backBar = document.getElementById('storefrontBackBar');
            if (sfEl)    sfEl.style.zIndex    = fromListingDetail ? '3800' : '';
            if (backBar) backBar.style.display = fromListingDetail ? '' : 'none';
            openDrawer('storefrontDrawer');
        } else {
            _showStorefront(
                userSettings.profilePic || '', '', '', '',
                userSettings.location || '', '', userSettings.bannerColor || null
            );
        }
        return;
    }

    // Other seller — fetch full profile so pic + bio + workshop data show correctly
    const cached = _sellerPicCache[part.sellerId];
    if (cached !== undefined || !part.sellerId || !sb) {
        _showStorefront(cached || '', '', '', '', '', '');
        return;
    }
    sb.from('public_profiles')
        .select('display_name, is_pro, tier, avatar_url, business_name, abn, about, location, banner_color, workshop_data, workshop_address')
        .eq('id', part.sellerId).single()
        .then(({ data: profile }) => {
            const pic = profile?.avatar_url || '';
            if (pic) _sellerPicCache[part.sellerId] = pic;
            const isTradeOrProProfile = profile?.tier === 'trade' || profile?.tier === 'pro' || profile?.is_pro;
            if (isTradeOrProProfile && profile?.workshop_data) {
                const grid = document.getElementById('sellerPartsGrid');
                if (grid) { grid.dataset.seller = part.seller; grid.dataset.userId = part.sellerId; }
                const wd = profile.workshop_data;
                renderWorkshopStorefront({
                    user_id: part.sellerId, sellerName: part.seller,
                    logo_url: pic, business_name: profile.business_name || '',
                    abn: profile.abn || '', about: profile.about || '',
                    location: profile.location || '', banner_color: profile.banner_color || null,
                    address: profile.workshop_address || '',
                    biz_type: wd.biz_type || 'service', services: wd.services || {},
                    vehicles: wd.vehicles || [], parts_categories: wd.parts_categories || [],
                    parts_type: wd.parts_type || 'new', wrecking: wd.wrecking || false,
                    wrecking_makes: wd.wrecking_makes || [],
                });
                const sfMsgBtn = document.getElementById('sfMsgBtn');
                if (sfMsgBtn) sfMsgBtn.style.display = isOwn ? 'none' : '';
                const sfEl = document.getElementById('storefrontDrawer');
                const backBar = document.getElementById('storefrontBackBar');
                if (sfEl)    sfEl.style.zIndex    = fromListingDetail ? '3800' : '';
                if (backBar) backBar.style.display = fromListingDetail ? '' : 'none';
                openDrawer('storefrontDrawer');
            } else {
                _showStorefront(
                    pic,
                    (isTradeOrProProfile && profile?.business_name) ? profile.business_name : '',
                    (isTradeOrProProfile && profile?.abn)           ? profile.abn           : '',
                    (isTradeOrProProfile && profile?.about)         ? profile.about         : '',
                    profile?.location || '', '', profile?.banner_color || null
                );
            }
        });
}

// --- WORKSHOP / SERVICE STOREFRONT ---

function openWorkshopStorefront(data, fromBrowser = false) {
    renderWorkshopStorefront(data);
    const sfEl  = document.getElementById('storefrontDrawer');
    const backBar = document.getElementById('storefrontBackBar');
    if (sfEl) sfEl.style.zIndex = '';
    if (backBar) backBar.style.display = 'none';
    openDrawer('storefrontDrawer');
}

function renderWorkshopStorefront(data) {
    const bizType = data.bizType || data.biz_type || data.type || 'service';
    const name    = data.businessName || data.business_name || data.name || '';
    const about   = data.about || data.specialty || '';
    const loc     = data.location || data.loc || '';

    // Resolve seller name: explicit field first, then look up from parts by user_id
    let sellerName = data.sellerName || '';
    const userId = data.user_id || data.userId;
    if (!sellerName && userId) {
        const match = getAllParts().find(p => p.sellerId === userId);
        if (match) sellerName = match.seller;
    }

    const grid = document.getElementById('sellerPartsGrid');
    if (grid) grid.dataset.seller = sellerName;

    renderStorefront(
        sellerName,
        true,
        data.logo || data.logo_url || '',
        name,
        data.abn || '',
        about,
        loc,
        data.banner || data.banner_url || ''
    );

    // Contact button label
    const msgBtn = document.getElementById('sfMsgBtn');
    if (msgBtn) msgBtn.textContent = (bizType === 'service') ? 'Contact Workshop' : 'Message Seller';

    // Address
    const addrSec = document.getElementById('sfAddressSection');
    const addrEl  = document.getElementById('sfAddress');
    const addr = data.address || '';
    if (addrSec) addrSec.style.display = addr ? '' : 'none';
    if (addrEl)  addrEl.textContent = addr ? '📍 ' + addr : '';

    // Services chips
    const svcSec   = document.getElementById('sfServicesSection');
    const svcChips = document.getElementById('sfServicesChips');
    const services  = data.services || {};
    let svcHTML = Object.entries(services)
        .filter(([k, v]) => v && SERVICE_LABELS[k])
        .map(([k]) => `<span class="sf-chip">${SERVICE_LABELS[k]}</span>`)
        .join('');
    if (data.wrecking) svcHTML += '<span class="sf-chip">Wrecking &amp; Dismantling</span>';
    const showSvc = (bizType === 'service' || bizType === 'both') && svcHTML;
    if (svcSec)   svcSec.style.display   = showSvc ? '' : 'none';
    if (svcChips) svcChips.innerHTML      = svcHTML;

    // Vehicle makes chips
    const makesSec   = document.getElementById('sfMakesSection');
    const makesChips = document.getElementById('sfMakesChips');
    const vehiclesRaw = data.vehicles || data.vehicleTypes || data.vehicle_makes || [];
    const makesArr = Array.isArray(vehiclesRaw)
        ? vehiclesRaw
        : String(vehiclesRaw).split(',').map(s => s.trim()).filter(Boolean);
    if (makesSec)   makesSec.style.display   = makesArr.length ? '' : 'none';
    if (makesChips) makesChips.innerHTML      = makesArr.map(m => `<span class="sf-chip">${escapeHtml(m)}</span>`).join('');

    // Parts categories chips (supplier/both)
    const catsSec  = document.getElementById('sfCatsSection');
    const catsChips = document.getElementById('sfCatsChips');
    const condEl    = document.getElementById('sfPartsCondition');
    const cats = data.partsCategories || data.parts_categories || [];
    const showCats = (bizType === 'supplier' || bizType === 'both') && cats.length;
    if (catsSec)   catsSec.style.display  = showCats ? '' : 'none';
    if (catsChips) catsChips.innerHTML    = cats.map(c => `<span class="sf-chip">${escapeHtml(CAT_LABELS[c] || c)}</span>`).join('');
    if (condEl) {
        const pt = data.partsType || data.parts_type || '';
        condEl.textContent = pt === 'new' ? 'New parts only' : pt === 'used' ? 'Used / reconditioned parts' : pt === 'both' ? 'New & used parts' : '';
    }

    // Show the parts grid whenever the seller has parts listed — even a service
    // provider may stock parts. Only hide the parts UI when there's nothing to show.
    _sfUpdatePartsVisibility();
}

// Parts grid + search show whenever the storefront has any parts, regardless of
// business type (a service workshop can still list parts).
function _sfUpdatePartsVisibility() {
    const grid       = document.getElementById('sellerPartsGrid');
    const searchWrap = document.querySelector('#storefrontDrawer .sf-search-wrap');
    const hasParts   = !!(grid && grid.children.length > 0);
    if (grid)       grid.style.display       = hasParts ? '' : 'none';
    if (searchWrap) searchWrap.style.display = hasParts ? '' : 'none';
}

// Fetch a workshop profile by userId from Supabase, then open their storefront
async function handleStoreDeepLink(userId) {
    if (!userId) return;
    if (!sb) return;
    // Always open the parts storefront — works for own profile and other users
    openStorefrontByUserId(userId);
}

// Sync workshop profile to Supabase after saving (Trade or Pro users)
async function syncWorkshopProfileToSupabase() {
    if (!userIsSignedIn || !currentUserId || !sb || !isTradeOrPro()) return;
    await sb.from('profiles').update({
        workshop_address: workshopProfile.address || null,
        business_phone:   workshopProfile.phone   || null,
        workshop_data: {
            biz_type:         userSettings.businessType      || 'service',
            phone:            workshopProfile.phone          || null,
            email:            workshopProfile.email          || null,
            website:          workshopProfile.website        || null,
            payment_details:  workshopProfile.paymentDetails || null,
            business_hours:   workshopProfile.businessHours || null,
            services:         workshopProfile.services       || {},
            vehicles:         workshopProfile.vehicles       || [],
            parts_categories: workshopProfile.partsCategories || [],
            parts_type:       workshopProfile.partsType      || 'new',
            wrecking:         workshopProfile.wrecking       || false,
            wrecking_makes:   workshopProfile.wreckingMakes  || [],
        },
    }).eq('id', currentUserId);
}

// --- APC BADGE GENERATOR ---

function generateApcBadge() {
    if (!userIsSignedIn || !currentUserId) return;

    const baseUrl = (location.protocol === 'file:' || location.hostname === 'localhost')
        ? 'https://g-561.github.io/APC.Auto/'
        : `${location.origin}${location.pathname}`;
    const storeUrl = `${baseUrl}?store=${currentUserId}`;
    const biz = userSettings.businessName || '';

    const linkEl = document.getElementById('badgeLinkText');
    if (linkEl) linkEl.textContent = storeUrl;

    // Large QR preview shown in modal
    const qrLarge = document.getElementById('badgeQrLarge');
    if (qrLarge) {
        qrLarge.innerHTML = '';
        new QRCode(qrLarge, { text: storeUrl, width: 180, height: 180, colorDark: '#1a1a1a', colorLight: '#ffffff' });
    }

    // Hidden QR used to draw the badge canvas — high-res source for 4× canvas
    const qrTemp = document.getElementById('badgeQrTemp');
    if (qrTemp) {
        qrTemp.innerHTML = '';
        new QRCode(qrTemp, { text: storeUrl, width: 400, height: 400, colorDark: '#1a1a1a', colorLight: '#ffffff' });
    }
    setTimeout(() => _drawApcBadgeCanvas(biz, qrTemp), 300);
}

function _drawApcBadgeCanvas(biz, qrTemp) {
    const canvas = document.getElementById('apcBadgeCanvas');
    if (!canvas) return;
    const logoImg = new Image();
    logoImg.onload  = () => _paintBadge(canvas, biz, qrTemp, logoImg);
    logoImg.onerror = () => _paintBadge(canvas, biz, qrTemp, null);
    logoImg.src = 'images/APC.logo.png';
}

function _paintBadge(canvas, biz, qrTemp, logoImg) {
    const BORDER = 8, PAD = 16, QR = 140, W = 210, SCALE = 4;

    // Logo same width as QR; height from natural aspect ratio, capped at 55px
    const logoW = QR;
    const logoH = (logoImg && logoImg.naturalWidth > 0)
        ? Math.min(Math.round(logoImg.naturalHeight * (logoW / logoImg.naturalWidth)), 55)
        : 40;

    // Canvas height fits logo + QR + labels dynamically
    const H = BORDER * 2 + PAD + logoH + 12 + QR + 14 + 20 + PAD;

    canvas.width  = W * SCALE;
    canvas.height = H * SCALE;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(SCALE, SCALE);

    // Orange outer background (acts as border)
    ctx.fillStyle = '#f07020';
    _roundRect(ctx, 0, 0, W, H, 16);
    ctx.fill();

    // White inner panel
    ctx.fillStyle = '#ffffff';
    _roundRect(ctx, BORDER, BORDER, W - BORDER * 2, H - BORDER * 2, 10);
    ctx.fill();

    // APC logo — same width as QR, centered
    const logoX = Math.round((W - logoW) / 2);
    const logoY = BORDER + PAD;
    if (logoImg && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    } else {
        ctx.fillStyle = '#f07020';
        ctx.font = '900 28px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('APC', W / 2, logoY + 32);
        ctx.textAlign = 'left';
    }

    // QR code — centered, same x as logo
    const qrX = Math.round((W - QR) / 2);
    const qrY = logoY + logoH + 12;
    const qrImg = qrTemp?.querySelector('img') || qrTemp?.querySelector('canvas');
    if (qrImg) {
        try { ctx.drawImage(qrImg, qrX, qrY, QR, QR); } catch (e) {}
    }

    // Business name
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    ctx.font = `${biz ? '700' : '500'} 9px system-ui, -apple-system, sans-serif`;
    ctx.fillText(biz || 'autopartsconnection.com.au', W / 2, qrY + QR + 16);

    // Scan label
    ctx.fillStyle = '#999';
    ctx.font = '500 8px system-ui, -apple-system, sans-serif';
    ctx.fillText('Scan to view our store', W / 2, qrY + QR + 28);
    ctx.textAlign = 'left';
}

function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function downloadApcBadge() {
    const canvas = document.getElementById('apcBadgeCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'find-us-on-apc.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function openApcBadgeModal() {
    const modal    = document.getElementById('apcBadgeModal');
    const backdrop = document.getElementById('apcBadgeBackdrop');
    if (modal)    modal.style.display    = 'block';
    if (backdrop) backdrop.style.display = 'block';
    generateApcBadge();
}

function closeApcBadgeModal() {
    const modal    = document.getElementById('apcBadgeModal');
    const backdrop = document.getElementById('apcBadgeBackdrop');
    if (modal)    modal.style.display    = 'none';
    if (backdrop) backdrop.style.display = 'none';
}

// --- MESSAGING ---
function closeChatDrawer() {
    const el = document.getElementById('chatDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}

function closeStorefrontDrawer() {
    const el = document.getElementById('storefrontDrawer');
    if (el) {
        el.classList.remove('active');
        el.style.zIndex = '';
    }
    syncBackdrop();
}

function handleGeneralEnquiry() {
    if (!userIsSignedIn) { openAuthDrawer(() => handleGeneralEnquiry()); return; }
    // For service-only workshops with no parts, fall back to the displayed business name
    const seller = currentStorefrontSeller
        || document.getElementById('sfBusinessName')?.textContent?.trim()
        || '';
    if (!seller) return;
    // Block messaging your own store
    if (seller === getCurrentSellerName()) return;

    // If a general enquiry thread already exists with this seller, open it
    const existing = conversations.find(c => c.with === seller && c.partId === 'general');
    if (existing) {
        toggleDrawer('inboxDrawer', true);
        switchInboxTab('chats');
        openInboxConv(existing.id);
        return;
    }

    let sellerId = document.getElementById('sellerPartsGrid')?.dataset.userId || '';
    if (!sellerId) {
        // Fallback: find sellerId from any loaded listing by this seller
        const match = getAllParts().find(p => p.seller === seller && p.sellerId);
        if (match) sellerId = match.sellerId;
    }
    pendingGeneralEnquiry = {
        seller,
        isPro: document.getElementById('sfProBadge')?.style.display !== 'none',
        sellerId
    };
    currentOpenPartId = null;

    const titleEl = document.getElementById('contactCardTitle');
    const msgEl   = document.getElementById('contactCardMsg');
    const compose = document.getElementById('contactCardCompose');
    const confirm = document.getElementById('contactCardConfirm');
    if (titleEl) titleEl.textContent = 'General Enquiry';
    if (msgEl)   msgEl.value = `Hi, I have a general enquiry for you.`;
    if (compose) compose.style.display = '';
    if (confirm) confirm.style.display = 'none';

    document.getElementById('contactSellerBackdrop').style.display = '';
    document.getElementById('contactSellerCard').style.display     = '';
}

function closeAddVehicleDrawer() {
    const el = document.getElementById('addVehicleDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}

function closeMessageDetailDrawer() {
    const el = document.getElementById('messageDetailDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}

function handleMessageSeller() {
    if (!userIsSignedIn) { openAuthDrawer(() => handleMessageSeller()); return; }
    const part = _currentOpenPart || getPartById(currentOpenPartId);
    if (!part) return;
    // Block self-messaging
    if ((currentUserId && part.sellerId === currentUserId) || part.seller === getCurrentSellerName()) return;

    // If a conversation already exists for this part, go straight to the inbox thread.
    // Always match by Supabase UUID when available — local integer IDs are unstable across
    // reloads (nextPartId re-sequences) and can collide with a different listing's local ID.
    const existing = part.supabaseId
        ? conversations.find(c => c.partId === part.supabaseId)
        : conversations.find(c => c.with === part.seller && c.partId === currentOpenPartId);
    if (existing) {
        toggleDrawer('inboxDrawer', true);
        switchInboxTab('chats');
        openInboxConv(existing.id);
        return;
    }

    // First contact — open the floating compose card
    _pendingContactPart = part; // freeze part ref now — sendContactMessage must not re-read currentOpenPartId
    const titleEl = document.getElementById('contactCardTitle');
    const msgEl   = document.getElementById('contactCardMsg');
    const compose = document.getElementById('contactCardCompose');
    const confirm = document.getElementById('contactCardConfirm');
    if (titleEl) titleEl.textContent = part.title;
    if (msgEl)   msgEl.value = `Hi, is the ${part.title} still available?`;
    if (compose) compose.style.display = '';
    if (confirm) confirm.style.display = 'none';

    document.getElementById('contactSellerBackdrop').style.display = '';
    document.getElementById('contactSellerCard').style.display     = '';
}

let _lastSentConvId    = null;
let _pendingContactPart = null;
let _inboxRoleTab = 'buying';
let _myListingsTab = 'active';
let _myListingsSelectMode = false;
let _myListingsSelected = new Set();

function sendContactMessage() {
    const msgEl = document.getElementById('contactCardMsg');
    const text  = msgEl ? msgEl.value.trim() : '';
    if (!text) return;

    let seller, isPro, partId, partTitle, _generalSellerId, _refListingId, _refListingTitle;
    if (pendingGeneralEnquiry) {
        ({ seller, isPro } = pendingGeneralEnquiry);
        _generalSellerId  = pendingGeneralEnquiry.sellerId       || null;
        _refListingId     = pendingGeneralEnquiry.refListingId   || null;
        _refListingTitle  = pendingGeneralEnquiry.refListingTitle || null;
        partId = 'general';
        partTitle = _refListingTitle || 'General Enquiry';
        pendingGeneralEnquiry = null;
    } else {
        const part = _pendingContactPart || getPartById(currentOpenPartId);
        if (!part) return;
        seller = part.seller;
        isPro  = !!part.isPro;
        partId = part.supabaseId || part.id;
        partTitle = part.title;
        _pendingContactPart = null;
    }

    // Create conversation and add the opening message
    const conv = { id: nextConvId(), with: seller, isPro, unread: false, partId, partTitle, msgs: [] };
    conv.msgs.push({ id: 1, sent: true, text, time: 'Today', clock: nowClock() });
    if (currentUserId) conv.buyerId = currentUserId;
    if (_generalSellerId) conv.sellerId = _generalSellerId;
    if (_refListingId)    { conv.refListingId = _refListingId; conv.refListingTitle = _refListingTitle; }
    conversations.unshift(conv);
    saveConversations();
    updateInboxBadge();
    _lastSentConvId = conv.id;
    syncNewConversationToSupabase(conv);

    // Switch to confirmation state — no auto-close, user chooses next action
    const compose = document.getElementById('contactCardCompose');
    const confirm = document.getElementById('contactCardConfirm');
    const sub     = document.getElementById('contactCardConfirmSub');
    if (compose) compose.style.display = 'none';
    if (confirm) confirm.style.display = '';
    if (sub)     sub.textContent = `${seller} will be in touch shortly.`;
}

function viewSentConversation() {
    closeContactCard();
    onOpenInbox();
    if (_lastSentConvId !== null) {
        setTimeout(() => openInboxConv(_lastSentConvId), 220);
    }
}

function closeContactCard() {
    document.getElementById('contactSellerBackdrop').style.display = 'none';
    document.getElementById('contactSellerCard').style.display     = 'none';
    _pendingContactPart = null;
}

// XSS-safe chat: build message node with textContent, never innerHTML
function appendChatBubble({ text = '', imgSrc = '' }) {
    const box = document.getElementById('chatBox');
    if (!box) return;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-sent';

    if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = 'Sent photo';
        img.className = 'chat-bubble-image';
        bubble.appendChild(img);
        if (text) {
            const caption = document.createElement('div');
            caption.textContent = text;
            caption.style.marginTop = '8px';
            caption.style.fontSize = '13px';
            caption.style.color = '#333';
            bubble.appendChild(caption);
        }
    } else {
        bubble.textContent = text;
    }

    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input || input.value.trim() === '') return;

    appendChatBubble({ text: input.value.trim() });
    input.value = '';
}

function sendChatImage(event) {
    const file = event.target.files?.[0];
    const input = document.getElementById('chatInput');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please choose an image file.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        appendChatBubble({ imgSrc: reader.result });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
    if (input) input.focus();
}

// Allow sending chat with Enter key + auth form Enter-to-submit
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // Taxonomy part-name suggestions on the listing title + wanted-request field
    attachPartAutocomplete(document.getElementById('sellTitle'), { compose: true, excludeVehicle: true, setCategory: true });
    attachPartAutocomplete(document.getElementById('wantedPartName'), {});

    // Enter key on any sign-in field submits the form
    ['authEmail', 'authPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignInSubmit(); });
    });

    // Enter key on any personal sign-up field submits
    ['authNamePersonal', 'authEmailPersonal', 'authPasswordPersonal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignUpPersonalSubmit(); });
    });

    // Enter key on any Trade sign-up field submits
    ['authNameTrade', 'authBusinessNameTrade', 'authAbnTrade', 'authEmailTrade', 'authPasswordTrade'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignUpTradeSubmit(); });
    });

    // Enter key on any Pro sign-up field submits
    ['authNamePro', 'authBusinessNamePro', 'authAbnPro', 'authEmailPro', 'authPasswordPro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignUpProSubmit(); });
    });

    // Restore session on page load + react to sign in / sign out events
    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' && session?.user) {
            currentUserId = session.user.id; // keep in sync after silent token refresh
        }
        if (event === 'PASSWORD_RECOVERY') {
            // User arrived via a password-reset link — show the set-new-password panel
            showResetPasswordPanel();
            return;
        }
        if (event === 'INITIAL_SESSION' && !session) {
            // No real session — clear any remembered user that was speculatively shown on load
            clearRememberedUser();
            if (userIsSignedIn) {
                userIsSignedIn = false;
                currentUserName = null; currentUserTier = null; currentUserId = null; currentUserEmail = null;
                renderAccountState();
            }
            return;
        }
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            _dataLoadStarted = true;
            currentUserId = session.user.id;
            // Use display_name from session metadata (set at sign-up) — avoids showing email prefix
            const emailName = session.user.email.split('@')[0];
            const metaName  = session.user.user_metadata?.display_name || emailName;
            // Use remembered tier as the initial value so Pro doesn't flicker to Standard
            const remembered = loadRememberedUser();
            const seedTier = (remembered?.email === session.user.email) ? (remembered?.tier || 'personal') : 'personal';
            signIn(metaName, seedTier, false, session.user.email);
            // Fetch real name + tier from profile — always authoritative
            sb.from('profiles').select('*').eq('id', session.user.id).single()
                .then(async ({ data: profile, error: profErr }) => {
                    if (profErr && profErr.code !== 'PGRST116') console.warn('Profile fetch:', profErr.message);
                    if (profile) {
                        if (profile.blocked) {
                            await sb.auth.signOut();
                            clearRememberedUser();
                            setTimeout(() => showToast('Your account has been suspended. Contact support@autopartsconnection.com.au'), 300);
                            return;
                        }
                        const name = profile.display_name || metaName;
                        const metaTierMeta = session.user.user_metadata?.tier;
                        let tier = profile.tier || (profile.is_pro ? 'pro' : 'personal');
                        // DB trigger often omits tier — correct from sign-up metadata if needed
                        if ((!profile.tier || profile.tier === 'personal') && (metaTierMeta === 'trade' || metaTierMeta === 'pro')) {
                            tier = metaTierMeta;
                            sb.from('profiles').update({ tier, is_pro: metaTierMeta === 'pro' }).eq('id', session.user.id).then(() => {});
                        }
                        signIn(name, tier, false, session.user.email);
                        saveRememberedUser({ name, tier, email: session.user.email });
                        // Supabase is authoritative — always overwrite local values with server data.
                        // No local fallbacks for user-identity fields — that causes cross-user bleed.
                        userSettings.location       = profile.location        || '';
                        userSettings.businessName   = profile.business_name   || '';
                        userSettings.abn            = profile.abn             || '';
                        userSettings.about          = profile.about           || '';
                        userSettings.profilePic     = profile.avatar_url      || '';
                        userSettings.businessLogo   = profile.business_logo   || '';
                        userSettings.businessBanner = profile.business_banner || '';
                        userSettings.bannerColor    = profile.banner_color    || '';
                        userSettings.postcode       = profile.postcode        || '';
                        userSettings.privacyPublicProfile = profile.is_public !== false;
                        userSettings.autoReplyEnabled     = !!profile.auto_reply_enabled;
                        userSettings.autoReplyMessage     = profile.auto_reply_message || '';
                        saveUserSettings(); populateLocationPickers(); renderProfilePicPreview(); renderBannerPreview();
                        // Restore workshop/repairer profile from Supabase (authoritative for Trade/Pro)
                        if (profile.workshop_data) {
                            const wd = profile.workshop_data;
                            if (wd.biz_type)        userSettings.businessType       = wd.biz_type;
                            workshopProfile.address         = profile.workshop_address   || '';
                            workshopProfile.phone           = wd.phone || profile.business_phone || '';
                            workshopProfile.email           = wd.email                   || '';
                            workshopProfile.website         = wd.website                 || '';
                            workshopProfile.paymentDetails  = wd.payment_details          || '';
                            workshopProfile.businessHours   = wd.business_hours          || null;
                            workshopProfile.services        = wd.services                || {};
                            workshopProfile.vehicles        = wd.vehicles                || [];
                            workshopProfile.partsCategories = wd.parts_categories        || [];
                            workshopProfile.partsType       = wd.parts_type              || 'new';
                            workshopProfile.wrecking        = wd.wrecking                ?? false;
                            workshopProfile.wreckingMakes   = wd.wrecking_makes          || [];
                            saveWorkshopProfile();
                        } else if (tier === 'trade' || tier === 'pro' || profile.is_pro) {
                            if (profile.business_phone && !workshopProfile.phone) { workshopProfile.phone = profile.business_phone; saveWorkshopProfile(); }
                            const ageMs = profile.created_at ? Date.now() - new Date(profile.created_at).getTime() : Infinity;
                            if (ageMs < 2 * 60 * 1000) {
                                showOnboardingIfNeeded();
                            } else {
                                _showOnboardingReminder();
                            }
                        } else {
                            // Personal tier returning user — nudge profile completion if still incomplete
                            const ageMs = profile.created_at ? Date.now() - new Date(profile.created_at).getTime() : Infinity;
                            if (ageMs > 2 * 60 * 1000) setTimeout(_showPersonalProfileReminder, 2000);
                        }
                    } else {
                        // Profile row missing — trigger may have failed at sign-up; create it now
                        try {
                            const meta = session.user.user_metadata || {};
                            const isPro = meta.is_pro === true || meta.is_pro === 'true';
                            const metaTier = meta.tier || (isPro ? 'pro' : 'personal');
                            const name  = meta.display_name || metaName;
                            const { error: insertErr } = await sb.from('profiles').insert({
                                id:            session.user.id,
                                display_name:  name,
                                is_pro:        isPro,
                                tier:          metaTier,
                                business_name: meta.business_name || null,
                                abn:           meta.abn           || null,
                                postcode:      meta.postcode      || null,
                                location:      meta.location      || null,
                            });
                            // 23505 = unique_violation (row already created by trigger in parallel) — safe to ignore
                            if (!insertErr || insertErr.code === '23505') {
                                const tier = metaTier;
                                signIn(name, tier, false, session.user.email);
                                saveRememberedUser({ name, tier, email: session.user.email });
                                if (meta.postcode) { userSettings.postcode = meta.postcode; }
                                if (meta.location) { userSettings.location = meta.location; }
                                saveUserSettings(); populateLocationPickers();
                                if (metaTier === 'trade' || metaTier === 'pro' || isPro) {
                                    showOnboardingIfNeeded();
                                }
                            } else {
                                console.warn('Profile insert failed:', insertErr.code, insertErr.message);
                                showToast('Profile setup incomplete — please sign out and back in.');
                            }
                        } catch (insertEx) {
                            console.warn('Profile create exception:', insertEx);
                        }
                    }
                });
            loadPublicListingsFromSupabase();
            loadUserListingsFromSupabase(session.user.id);
            loadConversationsFromSupabase(session.user.id);
            loadVehiclesFromSupabase(session.user.id);
            loadWantedFromSupabase(session.user.id);
            loadSavedListingsFromSupabase(session.user.id);
            loadPublicWantedFromSupabase();
            loadNotificationsFromSupabase();
            loadRecentlyViewedFromSupabase(session.user.id);
        } else if (event === 'SIGNED_OUT') {
            clearRememberedUser();
            unsubscribeRealtime();
            userIsSignedIn = false;
            currentUserName  = null;
            currentUserTier  = null;
            currentUserId    = null;
            currentUserEmail = null;
            closeDashboard();
            // Clear all user-specific data so it doesn't bleed into the next account on the same device
            userSettings    = getDefaultSettings();    saveUserSettings();
            workshopProfile = getDefaultWorkshopProfile(); saveWorkshopProfile();
            userListings.splice(0); saveUserListings();
            conversations.splice(0); saveConversations();
            myVehicles.splice(0); saveVehicles();
            myWanted.splice(0); saveWanted();
            savedParts.clear(); persistSavedParts();
            // Reload public listings so the signed-out user's listings appear in the grid
            partDatabase.splice(0);
            _listingsCursor = null; _listingsExhausted = false;
            loadPublicListingsFromSupabase();
            renderAccountState();
            renderMyParts();
            renderInboxConvList();
        }
    });
});

// --- GARAGE: vehicle data model + persistence ---
const VEHICLES_STORAGE_KEY = 'apc.vehicles.v1';
let myVehicles = loadVehicles();
let editingVehicleId = null;

function loadVehicles() {
    try {
        const raw = localStorage.getItem(VEHICLES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}
function saveVehicles() {
    try { localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(myVehicles)); } catch (e) {}
}
function nextVehicleId() {
    return myVehicles.length ? Math.max(...myVehicles.map(v => v.id)) + 1 : 1;
}

// Open the garage drawer (called from bottom nav)
function onOpenGarage() {
    setActiveNav('garageNavItem');
    renderGarage();
    toggleDrawer('garageDrawer');
}

// Open the Add Vehicle form on top of the garage drawer
function _refreshVehSeries(make, model, year, selected) {
    const group = document.getElementById('vehSeriesGroup');
    const sel   = document.getElementById('vehVariant');
    if (!sel || !group) return;
    if (!model || !year) { group.style.display = 'none'; sel.innerHTML = '<option value="">Select series</option>'; return; }
    const html = buildSeriesOptions(make, model, year, selected || '');
    if (!html) { group.style.display = 'none'; sel.innerHTML = '<option value="">Select series</option>'; return; }
    sel.innerHTML = html;
    group.style.display = '';
}

function _refreshVehEngine(make, model, currentVal) {
    const group = document.getElementById('vehEngineGroup');
    const wrap  = document.getElementById('vehEngineWrap');
    if (!group || !wrap) return;
    if (!make || !model) { group.style.display = 'none'; return; }
    const engines = (typeof VEHICLE_ENGINES !== 'undefined' && VEHICLE_ENGINES[make]?.[model]) || [];
    group.style.display = '';
    if (engines.length) {
        const opts = ['<option value="">Engine code (optional)…</option>',
            ...engines.map(e => `<option value="${escapeHtml(e)}"${e === currentVal ? ' selected' : ''}>${escapeHtml(e)}</option>`)
        ].join('');
        wrap.innerHTML = `<select id="vehEngineCode" style="width:100%;">${opts}</select>`;
    } else {
        wrap.innerHTML = `<input id="vehEngineCode" type="text" style="width:100%;" maxlength="60" placeholder="e.g. 1GR-FE, RB26DETT" value="${escapeHtml(currentVal || '')}">`;
    }
}

function initVehicleDropdowns(make, model, year, variant, engineCode) {
    const makeEl  = document.getElementById('vehMake');
    const modelEl = document.getElementById('vehModel');
    const yearEl  = document.getElementById('vehYear');
    if (!makeEl || !modelEl || !yearEl) return;
    makeEl.innerHTML  = buildMakeOptions(make || '');
    modelEl.innerHTML = buildModelOptions(make || '', model || '');
    yearEl.innerHTML  = buildYearOptionsForModel(make || '', model || '', year || '');
    _refreshVehSeries(make || '', model || '', year || '', variant || '');
    _refreshVehEngine(make || '', model || '', engineCode || '');
}

function onVehMakeChange() {
    const make    = document.getElementById('vehMake')?.value || '';
    const modelEl = document.getElementById('vehModel');
    const yearEl  = document.getElementById('vehYear');
    if (modelEl) modelEl.innerHTML = buildModelOptions(make, '');
    if (yearEl)  yearEl.innerHTML  = buildYearOptions('');
    _refreshVehSeries('', '', '', '');
    _refreshVehEngine('', '', '');
}

function onVehModelChange() {
    const make   = document.getElementById('vehMake')?.value || '';
    const model  = document.getElementById('vehModel')?.value || '';
    const yearEl = document.getElementById('vehYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '');
    _refreshVehSeries('', '', '', '');
    _refreshVehEngine(make, model, '');
}

function onVehYearChange() {
    const make  = document.getElementById('vehMake')?.value  || '';
    const model = document.getElementById('vehModel')?.value || '';
    const year  = document.getElementById('vehYear')?.value  || '';
    _refreshVehSeries(make, model, year, '');
}

function onAddVehicleClick() {
    editingVehicleId = null;
    const title = document.querySelector('#addVehicleDrawer .drawer-header span');
    if (title) title.textContent = 'ADD VEHICLE';
    initVehicleDropdowns('', '', '');
    ['vehVariant','vehNickname','vehVin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    toggleDrawer('addVehicleDrawer', true);
}

function openEditVehicleDrawer(id) {
    const v = myVehicles.find(v => v.id === id);
    if (!v) return;
    editingVehicleId = id;
    const title = document.querySelector('#addVehicleDrawer .drawer-header span');
    if (title) title.textContent = 'EDIT VEHICLE';
    initVehicleDropdowns(v.make || '', v.model || '', v.year || '', v.variant || '', v.engineCode || '');
    document.getElementById('vehNickname').value = v.nickname || '';
    document.getElementById('vehVin').value      = v.vin      || '';
    toggleDrawer('addVehicleDrawer', true);
}

// Back to garage from vehicle detail

// Validate + save the new vehicle
function submitAddVehicle() {
    const make       = document.getElementById('vehMake').value.trim();
    const model      = document.getElementById('vehModel').value.trim();
    const yearStr    = document.getElementById('vehYear').value.trim();
    const variant    = document.getElementById('vehVariant').value.trim();
    const engineCode = document.getElementById('vehEngineCode')?.value.trim() || '';
    const nickname   = document.getElementById('vehNickname').value.trim();
    const vin        = document.getElementById('vehVin').value.trim();

    if (!make || !model) {
        showToast('Make and Model are required.');
        return;
    }
    const year = yearStr ? Number(yearStr) : '';

    if (editingVehicleId) {
        const idx = myVehicles.findIndex(v => v.id === editingVehicleId);
        if (idx !== -1) {
            myVehicles[idx] = { ...myVehicles[idx], make, model, year,
                variant: variant||'', engineCode: engineCode||'', nickname: nickname||'', vin: vin||'' };
            if (currentUserId && myVehicles[idx].supabaseId) {
                sb.from('vehicles').update({
                    make, model, year: String(year||''),
                    variant: variant||'', engine_code: engineCode||null, nickname: nickname||'', vin: vin||''
                }).eq('id', myVehicles[idx].supabaseId)
                  .then(({ error }) => { if (error) console.warn('vehicle update:', error.message); });
            }
        }
        editingVehicleId = null;
    } else {
        const newV = {
            id: nextVehicleId(), make, model, year,
            variant: variant||'', engineCode: engineCode||'', nickname: nickname||'', vin: vin||''
        };
        myVehicles.push(newV);
        if (currentUserId) {
            sb.from('vehicles').insert({
                user_id: currentUserId, make, model, year: String(year||''),
                variant: variant||'', engine_code: engineCode||null, nickname: nickname||'', vin: vin||''
            }).select('id').single()
              .then(({ data, error }) => {
                  if (error) console.warn('vehicle insert:', error.message);
                  else if (data) { newV.supabaseId = data.id; saveVehicles(); }
              });
        }
    }
    saveVehicles();
    renderGarage();
    // Close only the add drawer — don't use toggleDrawer() here as it would nuke the garage underneath
    const addVehEl = document.getElementById('addVehicleDrawer');
    if (addVehEl) addVehEl.classList.remove('active');
}

// Remove a vehicle (used later from vehicle detail/edit)
function deleteVehicle(id) {
    const vehicle = myVehicles.find(v => v.id === id);
    const wantedCount = myWanted.filter(w => w.vehicleId === id).length;
    const msg = wantedCount
        ? `Remove this vehicle? The ${wantedCount} wanted part(s) linked to it will also be removed.`
        : 'Remove this vehicle from your garage?';
    showConfirmDialog('Remove Vehicle', msg, 'Remove', () => {
        const toDelete = myVehicles.find(v => v.id === id);
        const linkedWanted = myWanted.filter(w => w.vehicleId === id);
        myVehicles = myVehicles.filter(v => v.id !== id);
        myWanted   = myWanted.filter(w => w.vehicleId !== id);
        saveVehicles();
        saveWanted();
        if (currentUserId) {
            if (toDelete?.supabaseId) {
                sb.from('vehicles').delete().eq('id', toDelete.supabaseId)
                  .then(({ error }) => { if (error) console.warn('vehicle delete:', error.message); });
            }
            linkedWanted.forEach(w => {
                if (w.supabaseId) {
                    sb.from('wanted_parts').delete().eq('id', w.supabaseId)
                      .then(({ error }) => { if (error) console.warn('wanted delete (vehicle):', error.message); });
                }
            });
        }
        if (currentVehicleId === id) currentVehicleId = null;
        renderGarage();
        syncBackdrop();
    });
}


// Render the garage chips bar — XSS-safe via createElement + textContent
function renderGarage() {
    const bar = document.getElementById('garageChipsBar');
    if (!bar) return;
    bar.innerHTML = '';

    if (myVehicles.length === 0) {
        bar.innerHTML = `
            <div class="garage-empty">
                <div class="ico">🏠</div>
                <div class="title">Your garage is empty</div>
                <div class="sub">Add a vehicle and we'll show you parts that fit, plus notify you when wanted parts come up for sale.</div>
            </div>`;
        const detail = document.getElementById('garageInlineDetail');
        if (detail) detail.style.display = 'none';
        return;
    }

    myVehicles.forEach(v => {
        const chip = document.createElement('button');
        chip.className = 'garage-chip';
        chip.dataset.vehicleId = v.id;
        chip.onclick = () => selectGarageVehicle(v.id);

        const nameEl = document.createElement('span');
        nameEl.className = 'garage-chip-name';
        nameEl.textContent = v.nickname || `${v.make} ${v.model}`;
        chip.appendChild(nameEl);

        if (v.year) {
            const yearEl = document.createElement('span');
            yearEl.className = 'garage-chip-year';
            yearEl.textContent = v.year;
            chip.appendChild(yearEl);
        }

        bar.appendChild(chip);
    });

    if (myVehicles[0]) selectGarageVehicle(myVehicles[0].id);
}

function selectGarageVehicle(vehicleId) {
    currentVehicleId  = vehicleId;
    currentVehicleTab = 'wanted';
    document.querySelectorAll('#garageChipsBar .garage-chip').forEach(c => {
        c.classList.toggle('active', Number(c.dataset.vehicleId) === vehicleId);
    });
    renderGarageInlineDetail();
}

function renderGarageInlineDetail() {
    const v      = myVehicles.find(x => x.id === currentVehicleId);
    const detail = document.getElementById('garageInlineDetail');
    if (!detail) return;
    if (!v) { detail.style.display = 'none'; return; }

    detail.style.display = 'block';

    const header = document.getElementById('garageVehicleHeader');
    if (header) {
        header.innerHTML = '';
        const nameEl = document.createElement('span');
        nameEl.className = 'garage-vh-name';
        nameEl.textContent = [v.make, v.model, v.year, v.variant].filter(Boolean).join(' · ');

        const actions = document.createElement('div');
        actions.className = 'garage-vh-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'garage-vh-edit';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => openEditVehicleDrawer(v.id);

        const delBtn = document.createElement('button');
        delBtn.className = 'garage-vh-delete';
        delBtn.textContent = '×';
        delBtn.onclick = () => deleteVehicle(v.id);

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        header.appendChild(nameEl);
        header.appendChild(actions);
    }

    document.querySelectorAll('#garageInlineDetail .seg').forEach(s => {
        s.classList.toggle('active', s.dataset.gtab === 'wanted');
    });

    renderGarageTab();
}

function setGarageTab(tab) {
    currentVehicleTab = tab;
    document.querySelectorAll('#garageInlineDetail .seg').forEach(s => {
        s.classList.toggle('active', s.dataset.gtab === tab);
    });
    renderGarageTab();
}

function renderGarageTab() {
    const c = document.getElementById('garageInlineTabContent');
    if (!c) return;
    const v = myVehicles.find(x => x.id === currentVehicleId);
    if (!v) { c.innerHTML = ''; return; }
    c.innerHTML = '';

    const vehicleWanted = myWanted.filter(w =>
        w.vehicleId === currentVehicleId ||
        (w.make && w.make.toLowerCase() === v.make.toLowerCase() &&
         w.model.toLowerCase() === v.model.toLowerCase() &&
             (!w.year || !v.year || String(w.year) === String(v.year)))
    );

    if (window.innerWidth >= 900) {
        renderGarageDesktopSections(c, v, vehicleWanted);
        return;
    }

    if (currentVehicleTab === 'wanted') {
        if (!vehicleWanted.length) {
            c.appendChild(buildVehicleEmpty(
                '🔍',
                `No wanted parts for your ${v.make} ${v.model} yet.`,
                { label: 'ADD WANTED PART', onClick: () => openAddWantedForVehicle(currentVehicleId) }
            ));
        } else {
            const addRow = document.createElement('div');
            addRow.style.cssText = 'display:flex; justify-content:flex-end; padding:0 0 10px 0;';
            const addBtn = document.createElement('button');
            addBtn.textContent = '+ Add Wanted';
            addBtn.style.cssText = 'background:none; border:1px solid var(--apc-orange); color:var(--apc-orange); padding:6px 14px; border-radius:999px; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit;';
            addBtn.onclick = () => openAddWantedForVehicle(currentVehicleId);
            addRow.appendChild(addBtn);
            c.appendChild(addRow);
            c.appendChild(buildWantedGrid(vehicleWanted));
        }

    } else if (currentVehicleTab === 'saved') {
        const savedFitting = getAllParts().filter(p =>
            savedParts.has(p.supabaseId || p.id) && (
                (p.fits?.length > 0 && partFitsVehicle(p, v)) ||
                vehicleWanted.some(w => wantedMatchesPart(w, p))
            )
        );
        if (!savedFitting.length) {
            c.appendChild(buildVehicleEmpty('♡', `No saved listings for your ${v.make} ${v.model} yet.`));
        } else {
            c.appendChild(buildPartsGrid(savedFitting));
        }

    } else if (currentVehicleTab === 'matches') {
        const matchingParts = getAllParts().filter(p => {
            const matchingWanteds = vehicleWanted.filter(w => wantedMatchesPart(w, p));
            if (!matchingWanteds.length) return false;
            return matchingWanteds.some(w => !dismissedMatches[String(w.id)]?.has(p.id));
        });
        if (!matchingParts.length) {
            c.appendChild(buildVehicleEmpty('🔔', `No matches for your ${v.make} ${v.model} wanted parts yet.`));
        } else {
            c.appendChild(buildPartsGrid(matchingParts));
        }
    }
}

function renderGarageDesktopSections(c, v, vehicleWanted) {
    function section(labelHTML, content) {
        const wrap = document.createElement('div');
        wrap.className = 'garage-section';
        const hdr = document.createElement('div');
        hdr.className = 'garage-section-hdr';
        hdr.innerHTML = labelHTML;
        wrap.appendChild(hdr);
        wrap.appendChild(content);
        c.appendChild(wrap);
    }

    // Wanted parts
    const wantedHdr = `WANTED PARTS <span class="garage-section-count${vehicleWanted.length ? '' : ''}">${vehicleWanted.length}</span>
        <button class="garage-section-add" onclick="openAddWantedForVehicle(${v.id})">+ Add</button>`;
    if (vehicleWanted.length) {
        section(wantedHdr, buildWantedGrid(vehicleWanted));
    } else {
        const emp = document.createElement('div');
        emp.className = 'garage-section-empty';
        emp.textContent = `No wanted parts for your ${v.make} ${v.model} yet.`;
        section(wantedHdr, emp);
    }

    // Matches
    const matchingParts = getAllParts().filter(p => {
        const mw = vehicleWanted.filter(w => wantedMatchesPart(w, p));
        return mw.length && mw.some(w => !dismissedMatches[String(w.id)]?.has(p.id));
    });
    if (matchingParts.length) {
        section(`MATCHES <span class="garage-section-count has-matches">${matchingParts.length}</span>`,
            buildPartsGrid(matchingParts));
    }

    // Saved for this car
    const savedFitting = getAllParts().filter(p =>
        savedParts.has(p.supabaseId || p.id) && (
            (p.fits?.length > 0 && partFitsVehicle(p, v)) ||
            vehicleWanted.some(w => wantedMatchesPart(w, p))
        )
    );
    if (savedFitting.length) {
        section(`SAVED FOR THIS CAR <span class="garage-section-count">${savedFitting.length}</span>`,
            buildPartsGrid(savedFitting));
    }
}

// --- SAVED PARTS: data model + persistence ---
const SAVED_STORAGE_KEY = 'apc.saved.v1';
let savedParts = loadSavedParts();   // Set<partId>
let savedPartsTab = 'active';        // 'active' | 'ended' | 'stores'

// --- SAVED STORES ---
const SAVED_STORES_KEY = 'apc.savedStores.v1';
let savedStores = loadSavedStores(); // Array<{ sellerName, businessName, isPro, savedAt }>
let currentStorefrontSeller = null;  // tracks whose storefront is open
let _sellerPicCache    = {};          // sellerId → profile_pic URL
let _sellerRatingCache = {};         // sellerId → { avg, count }
let _hiddenSellerIds = new Set();   // sellers with is_public = false
let pendingGeneralEnquiry  = null;  // { seller, isPro } — set when contacting from storefront

function loadSavedStores() {
    try { const s = localStorage.getItem(SAVED_STORES_KEY); return s ? JSON.parse(s) : []; } catch(e) { return []; }
}
function persistSavedStores() {
    try { localStorage.setItem(SAVED_STORES_KEY, JSON.stringify(savedStores)); } catch(e) {}
}
function isStoreSaved(sellerName) {
    return savedStores.some(s => s.sellerName === sellerName);
}
function toggleSaveStore(sellerName, businessName, isPro) {
    if (!userIsSignedIn) { openAuthDrawer(() => toggleSaveStore(sellerName, businessName, isPro)); return; }
    if (isStoreSaved(sellerName)) {
        savedStores = savedStores.filter(s => s.sellerName !== sellerName);
        showToast('Store removed from saved');
    } else {
        savedStores.unshift({ sellerName, businessName: businessName || '', isPro: !!isPro, savedAt: Date.now() });
        showToast('Store saved ♥');
    }
    persistSavedStores();
    syncStoreSaveButton();
    if (document.getElementById('savedPartsDrawer')?.classList.contains('active') && savedPartsTab === 'stores') renderSavedParts();
}
function syncStoreSaveButton() {
    const btn = document.getElementById('sfSaveStoreBtn');
    if (!btn || !currentStorefrontSeller) return;
    const saved = isStoreSaved(currentStorefrontSeller);
    const icon = btn.querySelector('.sf-heart-icon');
    if (icon) icon.innerHTML = saved ? '&#x2665;&#xFE0E;' : '&#x2661;';
    btn.title = saved ? 'Remove from saved stores' : 'Save this store';
    btn.classList.toggle('sf-save-btn-active', saved);
}
function renderSavedStores(container) {
    if (!savedStores.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:#aaa;">
                <div style="font-size:36px; margin-bottom:10px;">🏪</div>
                <div style="font-weight:800; font-size:15px; color:#888; margin-bottom:6px;">No saved stores yet</div>
                <div style="font-size:13px;">Tap the heart on any storefront to save it here.</div>
            </div>`;
        return;
    }
    container.innerHTML = savedStores.map((store, idx) => {
        const listingCount = [...partDatabase, ...userListings].filter(p => p.seller === store.sellerName && p.status !== 'sold' && p.status !== 'removed').length;
        return `
        <div class="saved-store-card">
            <div class="saved-store-avatar">${(store.businessName || store.sellerName).charAt(0).toUpperCase()}</div>
            <div class="saved-store-info">
                <div class="saved-store-name">${escapeHtml(store.businessName || store.sellerName)}</div>
                <div class="saved-store-meta">${escapeHtml(store.sellerName)}${store.isPro ? ' · <span class="saved-store-pro">PRO</span>' : ''}</div>
                <div class="saved-store-count">${listingCount} active listing${listingCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="saved-store-actions">
                <button class="saved-store-visit-btn" onclick="openStoreFromSaved(${idx})">Visit ›</button>
                <button class="saved-store-unsave-btn" onclick="removeSavedStore(${idx})">×</button>
            </div>
        </div>`;
    }).join('');
}
function openStoreFromSaved(idx) {
    const store = savedStores[idx];
    if (!store) return;
    const sellerName = store.sellerName;
    closeSavedPartsDrawer();
    const part = [...partDatabase, ...userListings].find(p => p.seller === sellerName && p.sellerId);
    if (part?.sellerId) {
        openStorefrontByUserId(part.sellerId);
        return;
    }
    if (!sb) { showToast('Could not open store'); return; }
    sb.from('public_profiles').select('id').eq('display_name', sellerName).maybeSingle()
        .then(({ data }) => {
            if (data?.id) openStorefrontByUserId(data.id);
            else showToast('Could not find this seller');
        });
}
function removeSavedStore(idx) {
    savedStores.splice(idx, 1);
    persistSavedStores();
    syncStoreSaveButton();
    if (document.getElementById('savedPartsDrawer')?.classList.contains('active') && savedPartsTab === 'stores') renderSavedParts();
}

function loadSavedParts() {
    try {
        const raw = localStorage.getItem(SAVED_STORAGE_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) { return new Set(); }
}
function persistSavedParts() {
    try { localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify([...savedParts])); } catch (e) {}
}

// Toggle the saved state of a part — wired to the heart on the detail overlay
function toggleSavedPart(partId, btn) {
    if (!partId) return;
    if (btn) btn.blur(); // clear focus/active so button doesn't stay highlighted on mobile
    const wasSaved = savedParts.has(partId);
    if (wasSaved) {
        savedParts.delete(partId);
        showToast('Removed from saved');
    } else {
        savedParts.add(partId);
        showToast('Saved');
    }
    // Keep saves count live on user-created listings
    const listing = userListings.find(l => l.id === partId || l.supabaseId === partId);
    if (listing) {
        listing.saves = Math.max(0, (listing.saves || 0) + (wasSaved ? -1 : 1));
        saveUserListings();
        renderMyParts();
    }
    persistSavedParts();
    if (currentUserId) {
        const part = getPartById(partId);
        if (part?.supabaseId) {
            const delta = wasSaved ? -1 : 1;
            if (wasSaved) {
                sb.from('saved_listings').delete()
                  .eq('user_id', currentUserId).eq('listing_id', part.supabaseId)
                  .then(({ error }) => { if (error) console.warn('unsave listing:', error.message); });
            } else {
                sb.from('saved_listings').insert({ user_id: currentUserId, listing_id: part.supabaseId })
                  .then(({ error }) => { if (error && !error.message?.includes('duplicate')) console.warn('save listing:', error.message); });
            }
            // Reflect immediately in local caches so cards and dashboard update without reload
            // saves_count on the listings table is maintained by a DB trigger on saved_listings
            const pubPart = partDatabase.find(p => p.supabaseId === part.supabaseId);
            if (pubPart) pubPart.saves = Math.max(0, (pubPart.saves || 0) + delta);
            const ownPart = userListings.find(l => l.supabaseId === part.supabaseId);
            if (ownPart) { ownPart.saves = Math.max(0, (ownPart.saves || 0) + delta); saveUserListings(); }
        }
    }
    syncDetailSaveButton(partId);
    renderMainGrid(); // refresh saved indicators on cards
    if (currentVehicleId && currentVehicleTab === 'saved') renderGarageTab();
    if (document.getElementById('savedPartsDrawer')?.classList.contains('active')) renderSavedParts();
}

function confirmUnsavePart(partId) {
    const part = getPartById(partId);
    const title = part ? part.title : 'this listing';
    showConfirmDialog('Remove from Saved', `Remove "${title}" from your saved parts?`, 'Remove', () => toggleSavedPart(partId));
}

function closeSavedPartsDrawer() {
    const el = document.getElementById('savedPartsDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}
function onMenuOpenSavedParts() {
    closeAccountDropdown();
    savedPartsTab = 'active';
    renderSavedParts();
    toggleDrawer('savedPartsDrawer');
}

function setSavedPartsTab(tab) {
    savedPartsTab = tab;
    renderSavedParts();
}
function buildSavedTabsHTML(active, ended) {
    return `<div class="sp-tabs">
        <button class="sp-tab ${savedPartsTab === 'active' ? 'sp-tab-active' : ''}" onclick="setSavedPartsTab('active')">Active <span class="sp-tab-count">${active}</span></button>
        <button class="sp-tab ${savedPartsTab === 'ended'  ? 'sp-tab-active' : ''}" onclick="setSavedPartsTab('ended')">Ended <span class="sp-tab-count sp-tab-count-ended">${ended}</span></button>
        <button class="sp-tab ${savedPartsTab === 'stores' ? 'sp-tab-active' : ''}" onclick="setSavedPartsTab('stores')">Stores <span class="sp-tab-count">${savedStores.length}</span></button>
    </div>`;
}
function renderSavedParts() {
    const content = document.getElementById('savedPartsContent');
    if (!content) return;

    if (savedPartsTab === 'stores') {
        const totalCount = [...savedParts].filter(id => getPartById(id)).length + [...savedParts].filter(id => !getPartById(id) && findPartAnywhere(id)).length;
        const tabsHTML = buildSavedTabsHTML([...savedParts].filter(id => getPartById(id)).length, [...savedParts].filter(id => !getPartById(id) && findPartAnywhere(id)).length);
        content.innerHTML = tabsHTML + '<div id="savedStoresBody"></div>';
        renderSavedStores(document.getElementById('savedStoresBody'));
        return;
    }

    const activeParts = [];
    const staleParts = [];
    [...savedParts].forEach(id => {
        const active = getPartById(id);
        if (active) {
            activeParts.push(active);
        } else {
            const anywhere = findPartAnywhere(id);
            if (anywhere) staleParts.push(anywhere);
        }
    });

    if (!activeParts.length && !staleParts.length) {
        content.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; color: #aaa;">
                <div style="font-size: 40px; margin-bottom: 12px;">♡</div>
                <div style="font-weight: 800; font-size: 15px; margin-bottom: 8px; color: #888;">No saved parts yet</div>
                <div style="font-size: 13px;">Tap the heart on any listing to save it here.</div>
            </div>`;
        return;
    }

    const totalCount = activeParts.length + staleParts.length;

    const tabsHTML = buildSavedTabsHTML(activeParts.length, staleParts.length);

    const buildStaleHTML = (parts) => parts.map(part => {
        const similar = findSimilarActiveParts(part);
        const badge = part.status === 'sold' ? 'SOLD' : 'REMOVED';
        return `
        <div class="stale-row">
            <div class="stale-img-wrap">
                <img src="${escapeHtml(thumbUrl(part.images[0]))}" alt="" class="rv-drawer-img stale-img">
                <div class="stale-badge">${badge}</div>
            </div>
            <div class="rv-drawer-info">
                <div class="stale-title">${escapeHtml(part.title)}</div>
                <div class="stale-meta">This listing is no longer available</div>
                <div class="stale-actions">
                    ${similar.length ? `<button class="stale-action-btn stale-similar-btn" onclick="viewSimilarToStale(${part.id})">SEE SIMILAR ›</button>` : ''}
                    <button class="stale-action-btn stale-wanted-btn" onclick="openAddWantedFromStale(${part.id})">ADD TO WANTED ›</button>
                    <button class="stale-dismiss-btn" onclick="dismissStalePart(${part.id})">DISMISS</button>
                </div>
            </div>
        </div>`;
    }).join('');

    const buildActiveGrid = (parts) => {
        const grid = document.createElement('div');
        grid.className = 'results-grid';
        parts.forEach(part => {
            const temp = document.createElement('div');
            temp.innerHTML = buildCardHTML(part);
            const card = temp.firstElementChild;
            if (!card) return;
            const xBtn = document.createElement('button');
            xBtn.className = 'my-card-x-float';
            xBtn.title = 'Remove from saved';
            xBtn.textContent = '×';
            xBtn.onclick = (e) => { e.stopPropagation(); confirmUnsavePart(part.supabaseId || part.id); };
            card.appendChild(xBtn);
            grid.appendChild(card);
        });
        return grid;
    };

    content.innerHTML = `<div style="padding: 12px 15px 10px; background:white; margin-bottom:12px; border-bottom:1px solid #eee;">${tabsHTML}</div>`;

    if (savedPartsTab === 'active') {
        if (activeParts.length) {
            content.appendChild(buildActiveGrid(activeParts));
        } else {
            content.insertAdjacentHTML('beforeend', `<div style="text-align:center; padding:40px 20px; color:#aaa; font-size:13px;">All your saved listings have ended.</div>`);
        }
    } else if (savedPartsTab === 'ended') {
        content.insertAdjacentHTML('beforeend', staleParts.length
            ? buildStaleHTML(staleParts)
            : `<div style="text-align:center; padding:40px 20px; color:#aaa; font-size:13px;">No ended listings — all your saves are still live.</div>`);
    }
}

function dismissStalePart(partId) {
    savedParts.delete(partId);
    persistSavedParts();
    renderSavedParts();
}

function viewSimilarToStale(partId) {
    const part = findPartAnywhere(partId);
    if (!part) return;
    activeFilters.category = part.category;
    activeFilters.make = part.fits && part.fits.length ? part.fits[0].make.toLowerCase() : '';
    activeFilters.model = '';
    const catSelect = document.querySelector('#filterDrawer select');
    if (catSelect) catSelect.value = part.category;
    const partMake = part.fits && part.fits.length ? part.fits[0].make : '';
    const makeEl = document.getElementById('filterMake');
    if (makeEl) { makeEl.value = partMake; onFilterMakeChange(); }
    closeSavedPartsDrawer();
    renderMainGrid();
    window.scrollTo(0, 0);
}

function openAddWantedFromStale(partId) {
    const part = findPartAnywhere(partId);
    if (!part) return;
    document.getElementById('wantedPartName').value = part.title;
    document.getElementById('wantedMaxPrice').value = part.price || '';
    populateWantedVehicleSelect();
    if (part.fits && part.fits.length) {
        const match = myVehicles.find(v => v.make?.toLowerCase() === part.fits[0].make?.toLowerCase());
        if (match) document.getElementById('wantedVehicleSelect').value = match.id;
    }
    closeSavedPartsDrawer();
    toggleDrawer('addWantedDrawer', true);
}

// --- WANTED PARTS: data model + persistence ---
const WANTED_STORAGE_KEY = 'apc.wanted.v1';
let myWanted = loadWanted();

function loadWanted() {
    try {
        const raw = localStorage.getItem(WANTED_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}
function saveWanted() {
    try { localStorage.setItem(WANTED_STORAGE_KEY, JSON.stringify(myWanted)); } catch (e) {}
}
function nextWantedId() {
    return myWanted.length ? Math.max(...myWanted.map(w => w.id)) + 1 : 1;
}

// --- DISMISSED MATCHES ---
let currentMatchesWanted = null;
let dismissedMatches = loadDismissedMatches();

function loadDismissedMatches() {
    try {
        const raw = localStorage.getItem('apc.dismissed.v1');
        if (!raw) return {};
        const obj = JSON.parse(raw);
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, new Set(v)]));
    } catch (e) { return {}; }
}
function saveDismissedMatches() {
    try {
        const obj = Object.fromEntries(Object.entries(dismissedMatches).map(([k, v]) => [k, [...v]]));
        localStorage.setItem('apc.dismissed.v1', JSON.stringify(obj));
    } catch (e) {}
}
function dismissMatch(wantedId, partId) {
    const key = String(wantedId);
    if (!dismissedMatches[key]) dismissedMatches[key] = new Set();
    dismissedMatches[key].add(partId);
    saveDismissedMatches();
    renderWantedList();
    if (currentVehicleId && currentVehicleTab === 'matches') renderGarageTab();
    if (currentMatchesWanted && String(currentMatchesWanted.id) === key) {
        const allMatches = getAllParts().filter(p => wantedMatchesPart(currentMatchesWanted, p));
        const active = allMatches.filter(p => !dismissedMatches[key]?.has(p.id));
        if (!active.length) { backToWantedList(); return; }
        showWantedMatches(currentMatchesWanted, active, allMatches.length - active.length);
    }
}
function restoreDismissedMatches(wantedId) {
    const key = String(wantedId);
    delete dismissedMatches[key];
    saveDismissedMatches();
    renderWantedList();
    if (currentVehicleId && currentVehicleTab === 'matches') renderGarageTab();
    if (currentMatchesWanted && String(currentMatchesWanted.id) === key) {
        const allMatches = getAllParts().filter(p => wantedMatchesPart(currentMatchesWanted, p));
        showWantedMatches(currentMatchesWanted, allMatches, 0);
    }
}

// Add a new wanted entry
function addWanted(partName, make, model, year, maxPrice, category, series) {
    const newW = {
        id: nextWantedId(),
        partName,
        make:     make     || '',
        model:    model    || '',
        year:     year     || '',
        series:   series   || '',
        maxPrice: maxPrice || null,
        category: category || '',
        mutedNotifications: false,
        createdAt: new Date().toISOString()
    };
    myWanted.push(newW);
    saveWanted();
    if (currentUserId) {
        sb.from('wanted_parts').insert({
            user_id: currentUserId,
            title: partName,
            part_name: partName,
            status: 'active',
            make: make || '', model: model || '',
            year: year ? Number(year) : null,
            max_price: maxPrice || null, budget_max: maxPrice || null,
            category: category || '', muted_notifications: false
        }).select('id').single()
          .then(({ data, error }) => {
              if (error) console.warn('wanted insert:', error.message);
              else if (data) { newW.supabaseId = data.id; saveWanted(); }
          });
    }
}

// Delete a wanted entry
function deleteWanted(id) {
    if (!confirm('Remove this wanted part?')) return;
    const toDelete = myWanted.find(w => w.id === id);
    myWanted = myWanted.filter(w => w.id !== id);
    saveWanted();
    if (toDelete?.supabaseId && currentUserId) {
        sb.from('wanted_parts').delete().eq('id', toDelete.supabaseId)
          .then(({ error }) => { if (error) console.warn('wanted delete:', error.message); });
    }
    if (document.getElementById('wantedListDrawer')?.classList.contains('active')) renderWantedList();
    if (currentVehicleId && currentVehicleTab === 'wanted') renderGarageTab();
    renderProfile();
}

function openWantedListDrawer() {
    closeAccountDropdown();
    backToWantedList();
    renderWantedList();
    toggleDrawer('wantedListDrawer');
}

function renderWantedList() {
    const body = document.getElementById('wantedListBody');
    if (!body) return;
    body.innerHTML = '';

    // Purge any entries with no part name (orphaned vehicle-only rows)
    const blanks = myWanted.filter(w => !w.partName);
    if (blanks.length) {
        blanks.forEach(w => {
            myWanted = myWanted.filter(x => x.id !== w.id);
            if (w.supabaseId && currentUserId) {
                sb.from('wanted_parts').delete().eq('id', w.supabaseId)
                  .then(({ error }) => { if (error) console.warn('wanted purge:', error.message); });
            }
        });
        saveWanted();
    }

    if (!myWanted.length) {
        body.innerHTML = `
            <div style="text-align:center; padding:48px 20px; color:#aaa;">
                <div style="font-size:36px; margin-bottom:12px;">📋</div>
                <div style="font-weight:800; font-size:15px; color:#666; margin-bottom:8px;">No wanted parts yet</div>
                <div style="font-size:13px; line-height:1.5;">Add parts you're looking for and we'll notify you when a matching listing goes live.</div>
            </div>`;
        return;
    }

    // Split into matched vs watching
    const withMatches = [];
    const watching    = [];
    myWanted.forEach(w => {
        const dismissed = dismissedMatches[String(w.id)] || new Set();
        const matches   = getAllParts().filter(p => wantedMatchesPart(w, p) && !dismissed.has(p.id));
        matches.length ? withMatches.push({ w, matches }) : watching.push(w);
    });

    // MATCHES FOUND section
    if (withMatches.length) {
        const hdr = document.createElement('div');
        hdr.className = 'wl-section-hdr wl-section-hdr-match';
        hdr.textContent = '🔔 Matches Found';
        body.appendChild(hdr);
        withMatches.forEach(({ w, matches }) => body.appendChild(buildWantedCard(w, matches)));
    }

    // WATCHING section — grouped by vehicle
    if (watching.length) {
        if (withMatches.length) {
            const hdr = document.createElement('div');
            hdr.className = 'wl-section-hdr';
            hdr.textContent = 'Watching';
            body.appendChild(hdr);
        }
        const vehicleKeys = [...new Set(watching.filter(w => w.make).map(w => `${w.make}||${w.model}||${String(w.year||'')}` ))];
        const noVehicle   = watching.filter(w => !w.make);
        const groups = vehicleKeys.map(key => {
            const [make, model, year] = key.split('||');
            return { label: `${make} ${model}${year ? ' ' + year : ''}`, items: watching.filter(w => w.make === make && w.model === model && String(w.year||'') === year) };
        });
        if (noVehicle.length) groups.push({ label: 'No vehicle specified', items: noVehicle });

        groups.forEach(group => {
            if (groups.length > 1 || withMatches.length) {
                const ghdr = document.createElement('div');
                ghdr.className = 'wl-vehicle-hdr';
                ghdr.textContent = `🚗 ${group.label}`;
                body.appendChild(ghdr);
            }
            group.items.forEach(w => body.appendChild(buildWantedCard(w, [])));
        });
    }

    // Desktop: always show the matches panel — auto-select first match, or show prompt
    if (window.innerWidth >= 900) {
        const matchesBody = document.getElementById('wantedMatchesBody');
        if (matchesBody) matchesBody.style.display = 'block';
        if (withMatches.length) {
            selectDesktopWantedPanel(withMatches[0].w, withMatches[0].matches);
        } else {
            if (matchesBody) matchesBody.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:#aaa;">
                    <div style="font-size:36px; margin-bottom:12px;">📋</div>
                    <div style="font-weight:800; font-size:15px; color:#666; margin-bottom:8px;">Select a wanted part</div>
                    <div style="font-size:13px; line-height:1.5; max-width:280px; margin:0 auto;">Click any item on the left to see available matches.</div>
                </div>`;
        }
    }
}

async function viewNotifListing(notifId, listingId) {
    if (notifId) await markNotificationRead(notifId);
    if (!listingId) return;
    // Close inbox so the detail overlay (lower z-index) isn't hidden behind it
    toggleDrawer('inboxDrawer', false);
    // Check local cache first
    const cached = [...partDatabase, ...userListings].find(p => p.supabaseId === listingId);
    if (cached) { openItemDetail(cached.supabaseId || cached.id); return; }
    // Fetch from Supabase, map, then open
    try {
        const { data: r, error } = await sb.from('listings')
            .select('*, listing_images(storage_path,position), listing_vehicles(make,model,series)')
            .eq('id', listingId).single();
        if (error || !r) { showToast('Listing not found'); return; }
        const images = (r.listing_images || []).sort((a, b) => a.position - b.position).map(i => i.storage_path).filter(Boolean);
        const fits   = (r.listing_vehicles || []).map(v => ({ make: v.make, model: v.model, ...(v.series ? { variant: v.series } : {}) }));
        const mapped = {
            id: nextPartId(), supabaseId: r.id, sellerId: r.seller_id,
            saves: r.saves_count || 0, date: new Date(r.created_at).getTime(),
            apcId: r.apc_id, title: r.title, category: r.category,
            price: r.price, condition: r.condition, description: r.description,
            loc: r.location, postcode: r.postcode, pickup: r.pickup, postage: r.postage,
            openToOffers: r.open_to_offers, isPro: r.is_pro,
            stockNumber: r.stock_number, odometer: r.odometer, chassisVin: r.chassis_vin || null,
            warehouseBin: r.warehouse_bin, quantity: r.quantity || 1,
            fit: r.fitting_available, year: r.fits_year,
            seller: r.seller_name || 'Seller',
            status: r.status === 'active' ? undefined : r.status,
            images, fits,
        };
        partDatabase.push(mapped);
        openItemDetail(mapped.supabaseId || mapped.id);
    } catch (e) { showToast('Could not load listing'); }
}

function selectDesktopWantedPanel(w, matches) {
    document.querySelectorAll('.wl-wanted-row').forEach(c => c.classList.remove('wl-selected'));
    const card = document.querySelector(`.wl-wanted-row[data-wanted-id="${w.id}"]`);
    if (card) card.classList.add('wl-selected');
    currentMatchesWanted = w;
    const body = document.getElementById('wantedMatchesBody');
    if (!body) return;
    body.innerHTML = '';
    if (!matches.length) {
        body.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:#aaa;">
                <div style="font-size:36px; margin-bottom:12px;">🔍</div>
                <div style="font-weight:800; font-size:15px; color:#666; margin-bottom:8px;">Watching for matches</div>
                <div style="font-size:13px; line-height:1.5; max-width:280px; margin:0 auto;">We'll notify you when a <strong>${escapeHtml(w.partName)}</strong>${w.make ? ' for your ' + escapeHtml(w.make) + ' ' + escapeHtml(w.model) : ''} comes up for sale.</div>
            </div>`;
        return;
    }
    const hdr = document.createElement('div');
    hdr.className = 'wl-panel-hdr';
    hdr.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''} · ${w.partName}`;
    body.appendChild(hdr);
    const total = getAllParts().filter(p => wantedMatchesPart(w, p));
    body.appendChild(buildMatchesGrid(matches, w.id));
    const dismissed = total.length - matches.length;
    if (dismissed > 0) {
        const row = document.createElement('div');
        row.style.cssText = 'text-align:center; padding:14px 0 4px; font-size:12px;';
        row.innerHTML = `<a href="#" onclick="event.preventDefault(); restoreDismissedMatches(${w.id})" style="color:#aaa; text-decoration:underline;">Show ${dismissed} dismissed listing${dismissed !== 1 ? 's' : ''}</a>`;
        body.appendChild(row);
    }
}

function buildWantedCard(w, matches) {
    const hasMatches = matches.length > 0;
    // Notifications for this specific wanted item
    const notifs = myNotifications.filter(n =>
        !n.read && n.type === 'listing_match' && n.wanted_part_id === w.supabaseId
    );
    const card = document.createElement('div');
    card.className = 'rv-drawer-row wl-wanted-row' + (hasMatches ? ' wl-row-match' : ' wl-row-watching');
    card.dataset.wantedId = w.id;

    card.onclick = () => {
        if (window.innerWidth >= 900) {
            selectDesktopWantedPanel(w, matches);
        } else if (hasMatches) {
            if (matches.length === 1) {
                openItemDetail(matches[0].supabaseId || matches[0].id);
            } else {
                const total = getAllParts().filter(p => wantedMatchesPart(w, p));
                showWantedMatches(w, matches, total.length - matches.length);
            }
        }
    };

    const info = document.createElement('div');
    info.className = 'rv-drawer-info';

    const name = document.createElement('div');
    name.className = 'rv-drawer-title';
    name.textContent = w.partName;

    const metaParts = [];
    if (w.make) metaParts.push(`${w.make} ${w.model}${w.year ? ' ' + w.year : ''}`);
    if (w.maxPrice) metaParts.push(`Max $${w.maxPrice}`);
    const meta = document.createElement('div');
    meta.className = 'rv-drawer-meta';
    meta.textContent = metaParts.join(' · ') || 'Any vehicle';

    info.appendChild(name);
    info.appendChild(meta);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;';
    if (hasMatches) {
        right.innerHTML = `<span class="wl-match-count">${matches.length} match${matches.length !== 1 ? 'es' : ''} ›</span>`;
    } else {
        right.innerHTML = `<span class="wl-watching-label">Watching</span>`;
    }

    const del = document.createElement('button');
    del.className = 'sp-unsave-btn';
    del.textContent = '×';
    del.onclick = (e) => { e.stopPropagation(); deleteWanted(w.id); };

    right.appendChild(del);
    card.appendChild(info);
    card.appendChild(right);

    // Notification banner — shown when a wrecker has listed a matching part
    if (notifs.length) {
        const notif = notifs[0]; // most recent
        const banner = document.createElement('div');
        banner.className = 'wanted-notif-banner';
        banner.innerHTML = `
            <div class="wanted-notif-banner-text">
                New listing posted for this
                <span>A seller may have what you need</span>
            </div>
            <button class="wanted-notif-view-btn" onclick="event.stopPropagation(); viewNotifListing('${notif.id}','${notif.listing_id || ''}')">View Listing</button>
            <button class="wanted-notif-found-btn" onclick="event.stopPropagation(); markNotificationRead('${notif.id}'); deleteWanted(${w.id})">Found it? Remove this request</button>`;
        card.appendChild(banner);
    }

    return card;
}

function showWantedMatches(wanted, matches, dismissedCount = 0) {
    if (window.innerWidth >= 900) {
        selectDesktopWantedPanel(wanted, matches);
        return;
    }
    currentMatchesWanted = wanted;
    document.getElementById('wantedListBody').style.display = 'none';
    document.getElementById('wantedMatchesBody').style.display = 'block';
    document.getElementById('wantedAddBtn').style.display = 'none';
    document.getElementById('wantedListTitle').textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''} · ${wanted.partName}`;

    const body = document.getElementById('wantedMatchesBody');
    body.innerHTML = '';
    body.appendChild(buildMatchesGrid(matches, wanted.id));

    if (dismissedCount > 0) {
        const restoreRow = document.createElement('div');
        restoreRow.style.cssText = 'text-align:center; padding:14px 0 4px; font-size:12px;';
        restoreRow.innerHTML = `<a href="#" onclick="event.preventDefault(); restoreDismissedMatches(${wanted.id})" style="color:#aaa; text-decoration:underline;">Show ${dismissedCount} dismissed listing${dismissedCount !== 1 ? 's' : ''}</a>`;
        body.appendChild(restoreRow);
    }
}

function buildMatchesGrid(parts, wantedId) {
    const g = document.createElement('div');
    g.className = 'results-grid';
    g.style.marginTop = '0';
    parts.forEach(p => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.innerHTML = buildCardHTML(p);
        const btn = document.createElement('button');
        btn.textContent = '✕';
        btn.title = 'Dismiss this match';
        btn.style.cssText = 'position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.45);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:10px;cursor:pointer;z-index:3;display:flex;align-items:center;justify-content:center;line-height:1;';
        btn.onclick = (e) => { e.stopPropagation(); dismissMatch(wantedId, p.id); };
        wrapper.appendChild(btn);
        g.appendChild(wrapper);
    });
    return g;
}

function backToWantedList() {
    if (window.innerWidth >= 900) {
        document.querySelectorAll('.wl-wanted-row').forEach(c => c.classList.remove('wl-selected'));
        currentMatchesWanted = null;
        return;
    }
    currentMatchesWanted = null;
    document.getElementById('wantedMatchesBody').style.display = 'none';
    document.getElementById('wantedListBody').style.display = 'block';
    document.getElementById('wantedAddBtn').style.display = 'inline-block';
    document.getElementById('wantedListTitle').textContent = 'MY WANTED LIST';
}

function closeWantedOrBack() {
    if (window.innerWidth >= 900) {
        toggleDrawer('wantedListDrawer');
        return;
    }
    const matchesVisible = document.getElementById('wantedMatchesBody')?.style.display !== 'none';
    if (matchesVisible) {
        backToWantedList();
    } else {
        toggleDrawer('wantedListDrawer');
    }
}

// Match logic: does this part match the wanted criteria?
function wantedMatchesPart(wanted, part) {
    if (!part.title.toLowerCase().includes(wanted.partName.toLowerCase())) return false;
    // If no make specified, any vehicle is fine
    if (!wanted.make) return true;
    // Legacy: wanted stored by vehicleId (old format)
    if (!wanted.make && wanted.vehicleId !== null && wanted.vehicleId !== undefined) {
        const vehicle = myVehicles.find(v => v.id === wanted.vehicleId);
        if (!vehicle || !partFitsVehicle(part, vehicle)) return false;
        return true;
    }
    return part.fits.some(f =>
        f.make.toLowerCase() === wanted.make.toLowerCase() &&
        (!wanted.model || f.model.toLowerCase() === wanted.model.toLowerCase())
    );
}

function closeAddWantedDrawer() {
    const el = document.getElementById('addWantedDrawer');
    if (el) el.classList.remove('active');
    selectedWantedVehicleId = null;
    syncBackdrop();
}

function saveWantedVehicleToGarage() {
    const make  = document.getElementById('wantedMake').value.trim();
    const model = document.getElementById('wantedModel').value.trim();
    const year  = document.getElementById('wantedYear').value.trim();
    if (!make) { showToast('Enter a make first'); return; }
    const alreadyIn = myVehicles.some(v =>
        v.make.toLowerCase() === make.toLowerCase() &&
        v.model.toLowerCase() === (model || '').toLowerCase()
    );
    if (alreadyIn) { showToast('Already in your garage'); return; }
    myVehicles.push({ id: nextVehicleId(), make, model, year: Number(year) || year || '', variant: '', nickname: '', vin: '' });
    saveVehicles();
    renderGarage();
    populateWantedGarageChips(make, model, year);
    checkWantedGaragePrompt();
    showToast(`${make} ${model} saved to garage`);
}

// Tracks which garage vehicle is selected in the Add Wanted form
let selectedWantedVehicleId = null;

// Populate the garage quick-fill chips above the Make/Model/Year fields
function populateWantedGarageChips(prefillMake, prefillModel, prefillYear, prefillVehicleId) {
    const wrap  = document.getElementById('wantedGarageQuickFill');
    const chips = document.getElementById('wantedGarageChips');
    if (!wrap || !chips) return;
    if (!myVehicles.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    chips.innerHTML = '';
    myVehicles.forEach(v => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'wanted-garage-chip';
        chip.textContent = `${v.make} ${v.model} ${v.year}`;
        chip.addEventListener('click', () => {
            if (selectedWantedVehicleId === v.id) {
                // Deselect
                selectedWantedVehicleId = null;
                chips.querySelectorAll('.wanted-garage-chip').forEach(c => c.classList.remove('active'));
                initWantedVehicleDropdowns('', '', '');
            } else {
                // Select
                selectedWantedVehicleId = v.id;
                chips.querySelectorAll('.wanted-garage-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                initWantedVehicleDropdowns(v.make, v.model, v.year);
            }
        });
        const shouldPreselect = prefillVehicleId
            ? v.id === prefillVehicleId
            : prefillMake && v.make.toLowerCase() === prefillMake.toLowerCase() &&
              prefillModel && v.model.toLowerCase() === prefillModel.toLowerCase() &&
              prefillYear  && String(v.year) === String(prefillYear);
        if (shouldPreselect) {
            chip.classList.add('active');
            selectedWantedVehicleId = v.id;
        }
        chips.appendChild(chip);
    });
}

function openAddWantedFromList() {
    document.getElementById('wantedPartName').value = '';
    document.getElementById('wantedMaxPrice').value = '';
    const catEl = document.getElementById('wantedCategory');
    if (catEl) catEl.value = '';
    initWantedVehicleDropdowns('', '', '');
    populateWantedGarageChips();
    toggleDrawer('addWantedDrawer', true);
}

function onAddWantedFromSearch() {
    document.getElementById('wantedPartName').value = activeFilters.search;
    document.getElementById('wantedMaxPrice').value = '';
    const catEl = document.getElementById('wantedCategory');
    if (catEl) catEl.value = '';

    // Pre-fill vehicle from filter panel inputs only (not activeFilters.make which can be set by part detail views)
    const prefillMake  = (document.getElementById('filterMake')?.value  || '').trim();
    const prefillModel = (document.getElementById('filterModel')?.value || '').trim();
    const prefillYear  = (document.getElementById('filterYear')?.value  || '').trim();

    initWantedVehicleDropdowns(prefillMake, prefillModel, prefillYear);
    populateWantedGarageChips(prefillMake, prefillModel, prefillYear);
    toggleDrawer('addWantedDrawer');
}

function openAddWantedForVehicle(vehicleId) {
    const v = myVehicles.find(x => x.id === vehicleId);
    document.getElementById('wantedPartName').value = '';
    document.getElementById('wantedMaxPrice').value = '';
    initWantedVehicleDropdowns(v?.make || '', v?.model || '', v?.year || '');
    populateWantedGarageChips(null, null, null, vehicleId);
    toggleDrawer('addWantedDrawer', true);
}

// Submit Add Wanted
let _pendingWanted = null; // stash form data while "check listings" modal is open

function submitAddWanted() {
    const partName = document.getElementById('wantedPartName').value.trim();
    const maxPriceStr = document.getElementById('wantedMaxPrice').value.trim();
    const make     = document.getElementById('wantedMake').value.trim();
    const model    = document.getElementById('wantedModel').value.trim();
    const year     = document.getElementById('wantedYear').value.trim();
    const series   = document.getElementById('wantedSeries')?.value.trim() || '';
    const category = document.getElementById('wantedCategory')?.value || '';

    if (!partName) { showToast('Part name is required.'); return; }

    const maxPrice = maxPriceStr ? Number(maxPriceStr) : null;

    // Check if listings already exist for this wanted request before posting
    const tempWanted = { partName, category, make, model, year, series };
    const existingMatches = findListingsForWanted(tempWanted);
    if (existingMatches.length >= 3) {
        _pendingWanted = { partName, make, model, year, maxPrice, category, series };
        showCheckListingsModal(existingMatches, partName);
        return;
    }

    _doAddWanted(partName, make, model, year, maxPrice, category, series);
}

function _doAddWanted(partName, make, model, year, maxPrice, category, series) {
    addWanted(partName, make, model, year, maxPrice, category, series);

    if (currentVehicleId && currentVehicleTab === 'wanted') renderGarageTab();
    if (document.getElementById('wantedListDrawer')?.classList.contains('active')) renderWantedList();
    renderProfile();

    const successMsg = document.getElementById('wantedSuccessMsg');
    if (successMsg) successMsg.style.display = 'block';

    setTimeout(() => {
        if (successMsg) successMsg.style.display = 'none';
        closeAddWantedDrawer();

        const searchEl = document.getElementById('mainSearchInput');
        if (searchEl) { searchEl.value = ''; activeFilters.search = ''; renderMainGrid(); }

        const alreadyInGarage = make && myVehicles.some(v =>
            v.make.toLowerCase() === make.toLowerCase() &&
            v.model.toLowerCase() === model.toLowerCase()
        );
        if (make && !alreadyInGarage) {
            showToastWithAction(
                `"${partName}" added`,
                `Save ${make} ${model} to garage?`,
                () => {
                    myVehicles.push({ id: nextVehicleId(), make, model, year: Number(year) || year || '', variant: '', nickname: '', vin: '' });
                    saveVehicles();
                    renderGarage();
                    showToast(`${make} ${model} saved to garage`);
                }
            );
        }
    }, 1500);
}

// Find active listings that match a draft wanted request
function findListingsForWanted(w) {
    return partDatabase.filter(listing => {
        if (listing.status && listing.status !== 'active') return false;
        return wantedMatchesListing(w, listing);
    });
}

// Show the "check listings first" modal
function showCheckListingsModal(matches, partName) {
    const modal = document.getElementById('checkListingsModal');
    const sub   = document.getElementById('checkListingsSub');
    const cards = document.getElementById('checkListingsCards');
    if (!modal || !cards) return;

    const n = matches.length;
    sub.textContent = `We found ${n} listing${n !== 1 ? 's' : ''} that might match "${partName}" — check these before posting a wanted request.`;

    const top3 = matches.slice(0, 3);
    cards.innerHTML = top3.map(p => {
        const thumb = (p.images && p.images[0]) ? `<img class="check-listing-thumb" src="${escapeHtml(thumbUrl(p.images[0], 200))}" alt="">` : `<div class="check-listing-thumb"></div>`;
        const price = p.price != null ? `$${Number(p.price).toLocaleString()}` : 'POA';
        const cond  = { new_oem: 'New — OEM', new_aftermarket: 'New — Aftermarket', used: 'Used', refurbished: 'Refurbished', parts_only: 'Parts Only' }[p.condition] || '';
        const meta  = [p.loc, cond].filter(Boolean).join(' · ');
        return `<div class="check-listing-card" onclick="dismissCheckListingsModal();openPartDetail('${p.id}')">
            ${thumb}
            <div class="check-listing-info">
                <div class="check-listing-title">${escapeHtml(p.title)}</div>
                ${meta ? `<div class="check-listing-meta">${escapeHtml(meta)}</div>` : ''}
                <div class="check-listing-price">${price}</div>
            </div>
        </div>`;
    }).join('');

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
}

function dismissCheckListingsModal() {
    const modal = document.getElementById('checkListingsModal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 280);
    _pendingWanted = null;
}

// "View matching listings" — close both drawers and run the search
function goCheckListings() {
    const pw = _pendingWanted;
    dismissCheckListingsModal();
    closeAddWantedDrawer();
    // Pre-fill search filters to match the draft wanted request
    if (pw) {
        const searchEl = document.getElementById('mainSearchInput');
        if (searchEl) { searchEl.value = pw.partName; activeFilters.search = pw.partName.toLowerCase(); }
        if (pw.make)  activeFilters.make  = pw.make;
        if (pw.model) activeFilters.model = pw.model;
        if (pw.category && pw.category !== '') activeFilters.category = pw.category;
        renderMainGrid();
    }
}

// "Post anyway" — proceed despite existing listings
function proceedAddWanted() {
    const pw = _pendingWanted;
    if (!pw) { dismissCheckListingsModal(); return; }
    dismissCheckListingsModal();
    _doAddWanted(pw.partName, pw.make, pw.model, pw.year, pw.maxPrice, pw.category, pw.series);
}

// --- VEHICLE DETAIL: open, segmented toggle, render each tab ---
let currentVehicleId   = null;
let currentVehicleTab  = 'all';   // 'all' | 'wanted' | 'saved' | 'matches'

// Does this part fit a given vehicle? Empty `fits` array means universal (always true).
function partFitsVehicle(part, vehicle) {
    if (!part.fits || part.fits.length === 0) return true;
    return part.fits.some(f =>
        f.make.toLowerCase()  === vehicle.make.toLowerCase() &&
        f.model.toLowerCase() === vehicle.model.toLowerCase()
    );
}

function openVehicleDetail(vehicleId) {
    if (!myVehicles.find(v => v.id === vehicleId)) return;
    toggleDrawer('garageDrawer');
    selectGarageVehicle(vehicleId);
}

function buildPartsGrid(parts) {
    const g = document.createElement('div');
    g.className = 'results-grid';
    g.style.marginTop = '0';
    parts.forEach(p => { g.innerHTML += buildCardHTML(p); });
    return g;
}

function buildWantedGrid(wanteds) {
    const g = document.createElement('div');
    g.className = 'wanted-list';
    wanteds.forEach(w => {
        const card = document.createElement('div');
        card.className = 'wanted-card';

        const info = document.createElement('div');
        info.className = 'wanted-info';

        const name = document.createElement('div');
        name.className = 'wanted-name';
        name.textContent = w.partName;

        const meta = document.createElement('div');
        meta.className = 'wanted-meta';
        const metaParts = [];
        if (w.maxPrice) metaParts.push(`Max: $${w.maxPrice}`);
        metaParts.push(w.mutedNotifications ? 'Muted' : 'Active');
        meta.textContent = metaParts.join(' · ');

        info.appendChild(name);
        info.appendChild(meta);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'wanted-delete';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteWanted(w.id);
        };

        card.appendChild(info);
        card.appendChild(deleteBtn);
        g.appendChild(card);
    });
    return g;
}

function buildVehicleEmpty(ico, text, cta) {
    const e = document.createElement('div');
    e.className = 'veh-empty';
    const i = document.createElement('div'); i.className = 'ico'; i.textContent = ico;
    const t = document.createElement('div'); t.className = 'text'; t.textContent = text;
    e.appendChild(i); e.appendChild(t);
    if (cta && cta.label && typeof cta.onClick === 'function') {
        const btn = document.createElement('button');
        btn.className = 'veh-empty-cta';
        btn.textContent = cta.label;
        btn.onclick = cta.onClick;
        e.appendChild(btn);
    }
    return e;
}

// --- TOAST: lightweight global feedback chip ---
let _toastTimer;
function showConfirm(message, sub, confirmLabel, onConfirm) {
    const existing = document.getElementById('apcConfirmOverlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'apc-confirm-overlay';
    overlay.id = 'apcConfirmOverlay';
    overlay.innerHTML = `
        <div class="apc-confirm-card">
            <div class="apc-confirm-msg">${escapeHtml(message)}</div>
            ${sub ? `<div class="apc-confirm-sub">${escapeHtml(sub)}</div>` : ''}
            <div class="apc-confirm-btns">
                <button class="apc-confirm-cancel" onclick="document.getElementById('apcConfirmOverlay').remove()">Cancel</button>
                <button class="apc-confirm-ok" id="apcConfirmOk">${escapeHtml(confirmLabel || 'Delete')}</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('apcConfirmOk').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
}

function showToast(msg) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.className = 'app-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function showToastWithAction(msg, actionLabel, actionFn) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.className = 'app-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = '';
    const text = document.createElement('span');
    text.textContent = msg;
    const btn = document.createElement('button');
    btn.textContent = actionLabel;
    btn.style.cssText = 'background:none; border:none; color:white; font-weight:900; font-size:12px; text-decoration:underline; cursor:pointer; margin-left:10px; font-family:inherit; padding:0;';
    btn.onclick = () => { actionFn(); toast.classList.remove('show'); };
    toast.appendChild(text);
    toast.appendChild(btn);
    toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// --- INBOX ---
let currentInboxTab = 'all';

function onOpenInbox() {
    setActiveNav('headerInboxBtn');
    updateInboxBadge();
    document.getElementById('chatDrawer')?.classList.remove('active');
    document.getElementById('messageDetailDrawer')?.classList.remove('active');
    document.getElementById('inboxConvCol')?.classList.remove('slide-away');
    document.getElementById('inboxThreadCol')?.classList.remove('slide-in');
    activeConvId = null;
    document.getElementById('inboxThreadContent').style.display = 'none';
    document.getElementById('inboxThreadEmpty').style.display = '';
    refreshInboxContextPanel(null, null);
    toggleDrawer('inboxDrawer');
    const hasUnreadNotifs = myNotifications.some(n => !n.read);
    switchInboxTab(hasUnreadNotifs ? 'notifications' : 'chats');
    // Always refresh from Supabase when inbox opens — catches messages missed during realtime gaps
    if (currentUserId) loadConversationsFromSupabase(currentUserId);
    // On desktop split-pane, auto-select the most recent conversation in the active role tab
    if (window.innerWidth >= 768 && conversations.length > 0) {
        const roleConvs = conversations.filter(c => {
            if (_inboxRoleTab === 'buying')  return c.buyerId === currentUserId || (!c.buyerId && !c.sellerId);
            if (_inboxRoleTab === 'selling') return c.sellerId === currentUserId;
            return true;
        });
        if (roleConvs.length > 0) setTimeout(() => openInboxConv(roleConvs[0].id), 50);
    }
}

function updateInboxBadge() {
    const unreadConvs  = conversations.filter(c => c.unread).length;
    const unreadNotifs = inboxItems.filter(i => i.unread).length
                       + myNotifications.filter(n => !n.read).length;
    const total = unreadConvs + unreadNotifs;
    const text  = total > 99 ? '99+' : String(total);
    const show  = total > 0;
    const mobile  = document.getElementById('inboxBadge');
    const sidebar = document.getElementById('inboxBadgeDesktop');
    const topBar  = document.getElementById('inboxBadgeTopBar');
    if (mobile)  { mobile.textContent  = text; mobile.style.display  = show ? 'block' : 'none'; }
    if (sidebar) { sidebar.textContent = text; sidebar.style.display = show ? 'inline-block' : 'none'; }
    if (topBar)  { topBar.textContent  = text; topBar.style.display  = show ? 'inline-block' : 'none'; }
    const chatsBadge  = document.getElementById('inboxChatsBadge');
    const notifsBadge = document.getElementById('inboxNotifsBadge');
    if (chatsBadge)  { chatsBadge.textContent  = unreadConvs;  chatsBadge.style.display  = unreadConvs  > 0 ? 'inline' : 'none'; }
    if (notifsBadge) { notifsBadge.textContent = unreadNotifs; notifsBadge.style.display = unreadNotifs > 0 ? 'inline' : 'none'; }
    const proMsgBadge = document.getElementById('proNavMsgBadge');
    if (proMsgBadge) { proMsgBadge.textContent = unreadConvs || ''; proMsgBadge.style.display = unreadConvs > 0 ? 'block' : 'none'; }
}

function setInboxTab(tab) {
    currentInboxTab = tab;
    document.querySelectorAll('#inboxDrawer .inbox-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderInboxContent();
}

function renderInbox() {
    setInboxTab('all');
}

function renderInboxContent() {
    const content = document.getElementById('inboxContent');
    if (!content) return;
    content.innerHTML = '';

    const rateNotifs  = myNotifications.filter(n => !n.read && n.type === 'rate_seller');
    const matchNotifs = myNotifications.filter(n => n.type === 'listing_match');
    rateNotifs.forEach(n  => content.appendChild(buildRateSellerCard(n)));
    matchNotifs.forEach(n => content.appendChild(buildListingMatchCard(n)));

    let filtered = inboxItems;
    if (currentInboxTab !== 'all') {
        filtered = inboxItems.filter(n => n.type === currentInboxTab);
    }

    if (!rateNotifs.length && !matchNotifs.length && !filtered.length) {
        content.innerHTML = '<div style="text-align:center; padding:40px; color:#888; font-weight:700;">No notifications.</div>';
        return;
    }

    filtered.forEach(item => content.appendChild(buildInboxItemNode(item)));
}

function buildListingMatchCard(notif) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border:1.5px solid #eee;border-radius:12px;padding:14px 16px;margin-bottom:10px;';

    const top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:flex-start;gap:10px;';

    const icon = document.createElement('div');
    icon.textContent = '🔔';
    icon.style.cssText = 'font-size:20px;flex-shrink:0;margin-top:1px;';

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:800;font-size:13px;color:#111;margin-bottom:3px;';
    title.textContent = notif.title || 'New listing match';

    const body = document.createElement('div');
    body.style.cssText = 'font-size:12px;color:#666;line-height:1.4;';
    body.textContent = notif.body || '';

    info.appendChild(title);
    info.appendChild(body);
    top.appendChild(icon);
    top.appendChild(info);
    card.appendChild(top);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

    if (notif.listing_id) {
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'View Listing';
        viewBtn.style.cssText = 'flex:1;padding:9px;border:none;border-radius:8px;background:var(--apc-orange);color:#fff;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;letter-spacing:0.3px;';
        viewBtn.onclick = () => viewNotifListing(notif.id, notif.listing_id);
        btnRow.appendChild(viewBtn);
    }

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.style.cssText = 'padding:9px 14px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;color:#888;';
    dismissBtn.onclick = () => { dismissNotification(notif.id); renderInboxContent(); updateInboxBadge(); };
    btnRow.appendChild(dismissBtn);

    card.appendChild(btnRow);
    return card;
}

function buildRateSellerCard(notif) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff5ee;border:1.5px solid var(--apc-orange);border-radius:12px;padding:14px 16px;margin-bottom:10px;';

    const top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:flex-start;gap:10px;';

    const icon = document.createElement('div');
    icon.textContent = '⭐';
    icon.style.cssText = 'font-size:20px;flex-shrink:0;margin-top:1px;';

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:800;font-size:13px;color:#111;margin-bottom:3px;';
    title.textContent = notif.title || 'How was your purchase?';

    const body = document.createElement('div');
    body.style.cssText = 'font-size:12px;color:#666;line-height:1.4;';
    body.textContent = notif.body || '';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

    const rateBtn = document.createElement('button');
    rateBtn.textContent = 'Rate Seller';
    rateBtn.style.cssText = 'flex:1;padding:9px;border:none;border-radius:8px;background:var(--apc-orange);color:#fff;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit;letter-spacing:0.3px;';
    rateBtn.onclick = () => showSellerRatingDialog(notif);

    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Dismiss';
    skipBtn.style.cssText = 'padding:9px 14px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;color:#888;';
    skipBtn.onclick = () => { dismissNotification(notif.id); renderInboxContent(); updateInboxBadge(); };

    info.appendChild(title);
    info.appendChild(body);
    btnRow.appendChild(rateBtn);
    btnRow.appendChild(skipBtn);
    top.appendChild(icon);
    top.appendChild(info);
    card.appendChild(top);
    card.appendChild(btnRow);
    return card;
}

function showRateBuyerDialog(listingId, preselectedBuyerName, preselectedBuyerId) {
    const listing = userListings.find(l => l.id === listingId);
    if (!listing) return;

    const existing = document.getElementById('apcRateBuyerDialog');
    if (existing) existing.remove();

    // Collect unique enquirers from conversations about this listing
    const seenNames = new Set();
    const enquirers = []; // { name, buyerId }
    conversations
        .filter(c => c.partId === listing.supabaseId || c.partId === listing.id)
        .forEach(c => {
            const name = c.buyerName || c.with || '';
            if (name && !seenNames.has(name)) {
                seenNames.add(name);
                enquirers.push({ name, buyerId: c.buyerId || null });
            }
        });

    // If a buyer was pre-supplied (e.g. called from inbox), ensure they're in the list
    if (preselectedBuyerName && !seenNames.has(preselectedBuyerName)) {
        enquirers.unshift({ name: preselectedBuyerName, buyerId: preselectedBuyerId || null });
    }

    let selectedBuyerName = preselectedBuyerName || (enquirers.length === 1 ? enquirers[0].name : null);
    let selectedBuyerId   = preselectedBuyerId   || (enquirers.length === 1 ? enquirers[0].buyerId : null);
    let selectedStars = 0;

    const overlay = document.createElement('div');
    overlay.id = 'apcRateBuyerDialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.18);max-height:90vh;overflow-y:auto;';

    box.innerHTML = `<div style="font-weight:800;font-size:17px;color:#111;margin-bottom:4px;">Rate your buyer</div>
        <div style="font-size:12px;color:#888;margin-bottom:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(listing.title)}</div>`;

    // ── Buyer picker ────────────────────────────────────────────
    const buyerLabel = document.createElement('div');
    buyerLabel.style.cssText = 'font-size:12px;font-weight:700;color:#888;margin-bottom:8px;letter-spacing:0.3px;';
    buyerLabel.textContent = 'WHO WAS THE BUYER?';

    const pickerWrap = document.createElement('div');
    pickerWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;';

    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.placeholder = 'Enter buyer name';
    otherInput.style.cssText = 'width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-top:6px;display:none;';
    otherInput.oninput = () => { selectedBuyerName = otherInput.value.trim() || null; selectedBuyerId = null; };

    const chipStyle = (sel) => `padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:background 0.12s,color 0.12s;border:1.5px solid ${sel ? 'var(--apc-orange)' : '#ddd'};background:${sel ? 'var(--apc-orange)' : '#fff'};color:${sel ? '#fff' : '#555'};`;

    const selectChip = (chip, enq) => {
        pickerWrap.querySelectorAll('button').forEach(b => {
            b.style.cssText = chipStyle(false);
        });
        chip.style.cssText = chipStyle(true);
        selectedBuyerName = enq ? enq.name : null;
        selectedBuyerId   = enq ? enq.buyerId : null;
        otherInput.style.display = enq ? 'none' : '';
        if (!enq) { otherInput.value = ''; otherInput.focus(); }
    };

    enquirers.forEach(enq => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.textContent = enq.name;
        const isPresel = enq.name === selectedBuyerName;
        chip.style.cssText = chipStyle(isPresel);
        chip.onclick = () => selectChip(chip, enq);
        pickerWrap.appendChild(chip);
    });

    // "Someone else" chip only if there are known enquirers
    if (enquirers.length > 0) {
        const otherChip = document.createElement('button');
        otherChip.type = 'button';
        otherChip.textContent = 'Other…';
        otherChip.style.cssText = chipStyle(false);
        otherChip.onclick = () => selectChip(otherChip, null);
        pickerWrap.appendChild(otherChip);
    } else {
        // No conversations at all — just show the text input directly
        otherInput.style.display = '';
        otherInput.placeholder = 'e.g. John D.';
    }

    // ── Stars ───────────────────────────────────────────────────
    const starsLabel = document.createElement('div');
    starsLabel.style.cssText = 'font-size:12px;font-weight:700;color:#888;margin-bottom:8px;letter-spacing:0.3px;';
    starsLabel.textContent = 'HOW WAS THE BUYER?';

    const starsRow = document.createElement('div');
    starsRow.style.cssText = 'display:flex;gap:6px;margin-bottom:18px;';
    const renderStars = (n) => {
        selectedStars = n;
        starsRow.querySelectorAll('span').forEach((s, i) => { s.style.color = i < n ? '#f59e0b' : '#ddd'; });
    };
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span');
        s.textContent = '★';
        s.style.cssText = 'font-size:28px;cursor:pointer;color:#ddd;transition:color 0.1s;';
        s.onclick = () => renderStars(i);
        starsRow.appendChild(s);
    }

    // ── Note ────────────────────────────────────────────────────
    const noteLabel = document.createElement('div');
    noteLabel.style.cssText = 'font-size:12px;font-weight:700;color:#888;margin-bottom:8px;letter-spacing:0.3px;';
    noteLabel.textContent = 'ADD A NOTE (optional)';

    const noteInput = document.createElement('textarea');
    noteInput.maxLength = 200;
    noteInput.rows = 2;
    noteInput.placeholder = 'e.g. Paid quickly, great communication…';
    noteInput.style.cssText = 'width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;line-height:1.4;margin-bottom:4px;';

    const noteCount = document.createElement('div');
    noteCount.style.cssText = 'text-align:right;font-size:11px;color:#bbb;margin-bottom:18px;';
    noteCount.textContent = '0 / 200';
    noteInput.oninput = () => { noteCount.textContent = `${noteInput.value.length} / 200`; };

    // ── Buttons ─────────────────────────────────────────────────
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;';

    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = 'flex:1;padding:11px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;color:#555;';
    skipBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Submit Rating';
    saveBtn.style.cssText = 'flex:2;padding:11px;border:none;border-radius:8px;background:var(--apc-orange);color:#fff;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;';
    saveBtn.onclick = () => {
        const name = selectedBuyerName || otherInput.value.trim() || null;
        const note = noteInput.value.trim() || null;
        listing.buyerRating = { stars: selectedStars || null, buyerName: name, buyerId: selectedBuyerId || null, note, ratedAt: Date.now() };
        saveUserListings();
        overlay.remove();
        renderMyParts();
        renderDashListings(_dashCurrentTab || 'sold');
        renderDashFeedbackCard();
        showToast('Rating saved!');
    };

    box.appendChild(buyerLabel);
    box.appendChild(pickerWrap);
    pickerWrap.appendChild(otherInput);
    box.appendChild(starsLabel);
    box.appendChild(starsRow);
    box.appendChild(noteLabel);
    box.appendChild(noteInput);
    box.appendChild(noteCount);
    btnRow.appendChild(skipBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

async function showSellerRatingDialog(notif) {
    // Resolve seller_id — try local cache first, fall back to Supabase
    let sellerId = null;
    let listingTitle = notif.body || '';
    const localPart = notif.listing_id ? findPartAnywhere(notif.listing_id) : null;
    if (localPart) {
        sellerId = localPart.sellerId;
        listingTitle = localPart.title;
    } else if (sb && notif.listing_id) {
        const { data } = await sb.from('listings').select('seller_id, title').eq('id', notif.listing_id).maybeSingle();
        if (data) { sellerId = data.seller_id; listingTitle = data.title; }
    }

    const existing = document.getElementById('apcSellerRatingDialog');
    if (existing) existing.remove();

    let selectedStars = 0;

    const overlay = document.createElement('div');
    overlay.id = 'apcSellerRatingDialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.18);';

    box.innerHTML = `<div style="font-weight:800;font-size:17px;color:#111;margin-bottom:4px;">Rate your seller</div>
        <div style="font-size:12px;color:#888;margin-bottom:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(listingTitle)}</div>`;

    // Stars
    const starsLabel = document.createElement('div');
    starsLabel.style.cssText = 'font-size:12px;font-weight:700;color:#888;margin-bottom:8px;letter-spacing:0.3px;';
    starsLabel.textContent = 'HOW WAS THE SELLER?';
    const starsRow = document.createElement('div');
    starsRow.style.cssText = 'display:flex;gap:6px;margin-bottom:18px;';
    const renderStars = (n) => {
        selectedStars = n;
        starsRow.querySelectorAll('span').forEach((s, i) => { s.style.color = i < n ? '#f59e0b' : '#ddd'; });
    };
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span');
        s.textContent = '★';
        s.style.cssText = 'font-size:28px;cursor:pointer;color:#ddd;transition:color 0.1s;';
        s.onclick = () => renderStars(i);
        starsRow.appendChild(s);
    }

    // Note
    const noteLabel = document.createElement('div');
    noteLabel.style.cssText = 'font-size:12px;font-weight:700;color:#888;margin-bottom:8px;letter-spacing:0.3px;';
    noteLabel.textContent = 'ADD A NOTE (optional)';
    const noteInput = document.createElement('textarea');
    noteInput.maxLength = 120;
    noteInput.rows = 2;
    noteInput.placeholder = 'e.g. Friendly, item as described…';
    noteInput.style.cssText = 'width:100%;border:1.5px solid #ddd;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;line-height:1.4;margin-bottom:4px;';
    const noteCount = document.createElement('div');
    noteCount.style.cssText = 'text-align:right;font-size:11px;color:#bbb;margin-bottom:18px;';
    noteCount.textContent = '0 / 120';
    noteInput.oninput = () => { noteCount.textContent = `${noteInput.value.length} / 120`; };

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;';

    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = 'flex:1;padding:11px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;color:#555;';
    skipBtn.onclick = () => { dismissNotification(notif.id); overlay.remove(); renderInboxContent(); updateInboxBadge(); };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Submit Rating';
    saveBtn.style.cssText = 'flex:2;padding:11px;border:none;border-radius:8px;background:var(--apc-orange);color:#fff;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;';
    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        const note = noteInput.value.trim() || null;
        if (sb) {
            const { error } = await sb.from('seller_ratings').insert({
                listing_id: notif.listing_id || null,
                rater_id:   currentUserId,
                seller_id:  sellerId || null,
                stars:      selectedStars || null,
                note
            });
            if (error) { showToast('Could not save rating: ' + error.message); saveBtn.disabled = false; saveBtn.textContent = 'Submit Rating'; return; }
        }
        await dismissNotification(notif.id);
        overlay.remove();
        renderInboxContent();
        updateInboxBadge();
        showToast('Rating submitted — thank you!');
    };

    box.appendChild(starsLabel);
    box.appendChild(starsRow);
    box.appendChild(noteLabel);
    box.appendChild(noteInput);
    box.appendChild(noteCount);
    btnRow.appendChild(skipBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function buildInboxItemNode(item) {
    const node = document.createElement('div');
    node.className = 'inbox-item' + (item.unread ? ' unread' : '') + (item.flagged ? ' flagged' : '');
    node.onclick = () => openMessageDetail(item.id);

    const icon = document.createElement('div');
    icon.className = 'inbox-icon';
    icon.textContent = item.icon;

    const text = document.createElement('div');
    text.className = 'inbox-text';

    const title = document.createElement('div');
    title.className = 'inbox-title';
    title.textContent = item.title;
    text.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'inbox-meta';
    meta.textContent = item.meta;
    text.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'inbox-actions';

    if (item.type === 'messages') {
        const flagButton = document.createElement('button');
        flagButton.className = 'inbox-action-btn inbox-flag-btn' + (item.flagged ? ' flagged' : '');
        flagButton.type = 'button';
        flagButton.title = item.flagged ? 'Unflag message' : 'Flag message';
        flagButton.textContent = item.flagged ? '🚩' : '⚑';
        flagButton.onclick = e => {
            e.stopPropagation();
            toggleInboxFlag(item.id);
        };
        actions.appendChild(flagButton);
    }

    const deleteButton = document.createElement('button');
    deleteButton.className = 'inbox-action-btn inbox-delete-btn';
    deleteButton.type = 'button';
    deleteButton.title = 'Delete notification';
    deleteButton.textContent = '🗑️';
    deleteButton.onclick = e => {
        e.stopPropagation();
        deleteInboxItem(item.id);
    };
    actions.appendChild(deleteButton);

    node.appendChild(icon);
    node.appendChild(text);
    node.appendChild(actions);
    return node;
}

function toggleInboxFlag(id) {
    const item = inboxItems.find(n => n.id === id);
    if (!item) return;
    item.flagged = !item.flagged;
    saveInboxItems();
    renderInboxContent();
}

function deleteInboxItem(id) {
    inboxItems = inboxItems.filter(item => item.id !== id);
    saveInboxItems();
    renderInboxContent();
    updateInboxBadge();
}

function openMessageDetail(id) {
    const item = inboxItems.find(i => i.id === id);
    if (!item) return;

    // Mark as read
    item.unread = false;
    saveInboxItems();
    updateInboxBadge();

    // Populate the detail drawer
    safeText(document.getElementById('messageDetailIcon'), item.icon);
    safeText(document.getElementById('messageDetailTitle'), item.title);
    safeText(document.getElementById('messageDetailMeta'), item.meta);

    // Show different content based on type
    const contentEl = document.getElementById('messageDetailContent');
    if (item.type === 'messages') {
        contentEl.innerHTML = `
            <div style="padding: 20px; background: #E5DDD5; border-radius: 15px; margin: 15px 0;">
                <div style="font-size: 14px; line-height: 1.5; color: #333;">
                    Hi! I'm interested in your listing. Is this part still available? Can you tell me more about the condition and any modifications?
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="toggleDrawer('chatDrawer', true)" style="background: var(--apc-orange); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; cursor: pointer;">
                    REPLY TO MESSAGE
                </button>
            </div>
        `;
    } else if (item.type === 'matches') {
        contentEl.innerHTML = `
            <div style="padding: 20px; background: #FFF9F2; border-radius: 15px; margin: 15px 0; border: 1px solid #F7941D;">
                <div style="font-size: 14px; line-height: 1.5; color: #333;">
                    Great news! We found matching parts for your wanted item. Check out these available options that fit your vehicle.
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="openVehicleDetail(currentVehicleId); closeMessageDetailDrawer()" style="background: var(--apc-blue); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; cursor: pointer;">
                    VIEW MATCHES
                </button>
            </div>
        `;
    }

    // Show/hide flag button based on type
    const flagBtn = document.getElementById('messageDetailFlagBtn');
    if (flagBtn) {
        flagBtn.style.display = item.type === 'messages' ? 'inline-flex' : 'none';
        flagBtn.className = 'message-detail-action-btn' + (item.flagged ? ' flagged' : '');
        flagBtn.textContent = item.flagged ? '🚩' : '⚑';
        flagBtn.onclick = () => {
            toggleInboxFlag(id);
            openMessageDetail(id); // Refresh the detail view
        };
    }

    const deleteBtn = document.getElementById('messageDetailDeleteBtn');
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            deleteInboxItem(id);
            closeMessageDetailDrawer();
        };
    }

    toggleDrawer('messageDetailDrawer', true);  // stack on top of inbox
}

// Generate mock notifications for prototype
function generateInboxNotifications() {
    const notifications = [];

    // Mock messages: each unread chat
    // For simplicity, add a few
    notifications.push({ type: 'messages', icon: '💬', title: 'New message from Gary S.', meta: 'About your brake pads listing' });
    notifications.push({ type: 'messages', icon: '💬', title: 'Message from Sarah J.', meta: 'Interested in your Elise parts' });

    // Mock matches: each wanted with matches
    myWanted.forEach(w => {
        const matches = partDatabase.filter(p => wantedMatchesPart(w, p));
        if (matches.length) {
            notifications.push({ type: 'matches', icon: '🔔', title: `Match found for "${w.partName}"`, meta: `${matches.length} part${matches.length > 1 ? 's' : ''} available` });
        }
    });

    // Mock activity: price drops, etc.
    notifications.push({ type: 'activity', icon: '💰', title: 'Price drop on saved part', meta: 'Lotus Elise Sport Steering Wheel - now $300' });
    notifications.push({ type: 'activity', icon: '📦', title: 'Listing activity', meta: 'Your Hiace mirror has 5 views this week' });

    return notifications;
}

// --- AUTH STATE + ACCOUNT MENU ---

function isTradeOrPro() { return currentUserTier === 'trade' || currentUserTier === 'pro'; }

// Sign in (stub — wire into real auth later). Always lands as Personal tier.
function signIn(name = 'Gary S.', tier = 'personal', remember = false, email = '') {
    userIsSignedIn = true;
    currentUserName  = name;
    currentUserTier  = tier;
    currentUserEmail = email || null;
    if (remember) {
        saveRememberedUser({ name, tier, email });
    }
    renderAccountState();
}

// Wired to the SIGN IN button inside #authDrawer
function setAuthMode(mode) {
    authMode = mode;

    const titleEl = document.getElementById('authDrawerTitle');
    if (titleEl) {
        const titles = { 'signin': 'Sign In', 'signup': 'Create Account', 'signup-personal': 'Personal Account', 'signup-trade': 'Trade Account', 'signup-pro': 'Pro Account' };
        titleEl.textContent = titles[mode] || 'Sign In';
    }

    hideAuthError();
    const tabSignIn = document.getElementById('authTabSignIn');
    const tabSignUp = document.getElementById('authTabSignUp');
    if (tabSignIn && tabSignUp) {
        tabSignIn.classList.toggle('active', mode === 'signin');
        tabSignUp.classList.toggle('active', mode !== 'signin');
    }

    const sections = {
        authSignInSection:         mode === 'signin',
        authSignUpSection:         mode === 'signup',
        authSignUpPersonalSection: mode === 'signup-personal',
        authSignUpTradeSection:    mode === 'signup-trade',
        authSignUpProSection:      mode === 'signup-pro',
    };
    Object.entries(sections).forEach(([id, show]) => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? '' : 'none';
    });

    const drawer = document.getElementById('authDrawer');
    if (drawer) drawer.classList.toggle('auth-drawer--wide', mode === 'signup');

    if (mode === 'signin') {
        prefillRememberedSignIn();
        clearSignUpFields();
    } else if (mode === 'signup') {
        clearSignUpFields();
    }
}

function prefillRememberedSignIn() {
    const remembered = loadRememberedUser();
    const emailInput = document.getElementById('authEmail');
    const rememberCheckbox = document.getElementById('authRememberMe');
    if (remembered && emailInput) {
        emailInput.value = remembered.email || '';
        if (rememberCheckbox) rememberCheckbox.checked = true;
    } else if (emailInput) {
        emailInput.value = '';
        if (rememberCheckbox) rememberCheckbox.checked = false;
    }
}

function clearSignUpFields() {
    ['authNamePersonal','authEmailPersonal','authPasswordPersonal',
     'authNamePro','authBusinessNamePro','authAbnPro','authEmailPro','authPasswordPro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['authRememberPersonal','authRememberPro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
}

function showAuthError(msg, isStatus = false) {
    const el = document.getElementById('authErrorBanner');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('auth-status', isStatus);
    el.style.display = '';
}
function showResetPasswordPanel() {
    // Hide sign-in/sign-up tabs, show only the reset form
    const tabBar = document.getElementById('authTabBar');
    if (tabBar) tabBar.style.display = 'none';
    ['authSignInSection','authSignUpSection','authSignUpPersonalSection','authSignUpTradeSection','authSignUpProSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const resetSection = document.getElementById('authResetSection');
    if (resetSection) resetSection.style.display = '';
    document.getElementById('resetNewPassword') && (document.getElementById('resetNewPassword').value = '');
    document.getElementById('resetConfirmPassword') && (document.getElementById('resetConfirmPassword').value = '');
    toggleDrawer('authDrawer', true);
}

async function submitNewPassword() {
    const pw1 = document.getElementById('resetNewPassword')?.value || '';
    const pw2 = document.getElementById('resetConfirmPassword')?.value || '';
    if (pw1.length < 8)    { showAuthError('Password must be at least 8 characters.'); return; }
    if (pw1 !== pw2)        { showAuthError('Passwords don\'t match.'); return; }
    showAuthError('Updating password…', true);
    const { error } = await sb.auth.updateUser({ password: pw1 });
    if (error) { showAuthError(error.message); return; }
    showAuthError('Password updated — you\'re signed in!', true);
    setTimeout(() => {
        // Restore tab bar and close drawer
        const tabBar = document.getElementById('authTabBar');
        if (tabBar) tabBar.style.display = '';
        const resetSection = document.getElementById('authResetSection');
        if (resetSection) resetSection.style.display = 'none';
        toggleDrawer('authDrawer');
        showToast('Password updated successfully');
    }, 1800);
}

async function forgotPassword() {
    const email = document.getElementById('authEmail')?.value.trim();
    if (!email) { showAuthError('Enter your email above first.'); return; }
    showAuthError('Sending reset link…', true);
    const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
    });
    if (error) { showAuthError(error.message); return; }
    showAuthError('Reset link sent — check your email.', true);
}

function togglePwVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
}

function hideAuthError() {
    const el = document.getElementById('authErrorBanner');
    if (el) el.style.display = 'none';
}

function openAuthDrawer(returnAction = null, mode = 'signin') {
    authReturnAction = returnAction;
    setAuthMode(mode);
    toggleDrawer('authDrawer');
}

async function handleSignInSubmit() {
    const email    = document.getElementById('authEmail')?.value.trim() || '';
    const password = document.getElementById('authPassword')?.value;
    if (!email || !password) { showAuthError('Enter your email and password to sign in.'); return; }
    showAuthError('Signing in…', true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { showAuthError(error.message); return; }
    document.getElementById('authPassword').value = '';
    hideAuthError();
    toggleDrawer('authDrawer');
    if (authReturnAction) { const next = authReturnAction; authReturnAction = null; next(); }
}

async function handleSignUpPersonalSubmit() {
    const name     = document.getElementById('authNamePersonal')?.value.trim();
    const pcWrap   = document.querySelector('#authSignUpPersonalSection .location-picker-wrap');
    const postcode = pcWrap?.dataset.selectedPostcode || document.getElementById('authPostcodePersonal')?.value.trim() || '';
    const suburb   = pcWrap?.dataset.selectedSuburb   || '';
    const email    = document.getElementById('authEmailPersonal')?.value.trim() || '';
    const password = document.getElementById('authPasswordPersonal')?.value;
    if (!name || !email || !password) { showAuthError('Please enter your name, email and password.'); return; }
    showAuthError('Checking username…', true);
    const nameAvailable = await isUsernameAvailable(name);
    if (!nameAvailable) {
        showAuthError(`"${name}" is already taken.`);
        showUsernameSuggestions(suggestUsernames(name), 'authNamePersonal', 'authUsernameSuggestions');
        return;
    }
    showAuthError('Creating account…', true);
    const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name, is_pro: false, tier: 'personal', postcode: postcode || '', location: suburb || '' } }
    });
    if (error) { showAuthError(error.message); return; }
    if (postcode) { userSettings.postcode = postcode; saveUserSettings(); }
    if (suburb)   { userSettings.location = suburb;   saveUserSettings(); }
    document.getElementById('authPasswordPersonal').value = '';
    hideAuthError();
    toggleDrawer('authDrawer');
    showToast('Account created! Check your email to confirm.');
    if (authReturnAction) { const next = authReturnAction; authReturnAction = null; next(); }
    else { setTimeout(showWelcomeModal, 350); }
}

async function handleSignUpProSubmit() {
    const name         = document.getElementById('authNamePro')?.value.trim();
    const businessName = document.getElementById('authBusinessNamePro')?.value.trim();
    const abnRaw       = document.getElementById('authAbnPro')?.value.trim();
    const pcWrapPro    = document.querySelector('#authSignUpProSection .location-picker-wrap');
    const postcode     = pcWrapPro?.dataset.selectedPostcode || document.getElementById('authPostcodePro')?.value.trim() || '';
    const suburb       = pcWrapPro?.dataset.selectedSuburb   || '';
    const email        = document.getElementById('authEmailPro')?.value.trim() || '';
    const phone        = document.getElementById('authPhonePro')?.value.trim() || '';
    const password     = document.getElementById('authPasswordPro')?.value;
    if (!name || !businessName || !abnRaw || !email || !password) {
        showAuthError('Please fill in all fields including your Business Name and ABN.'); return;
    }
    if (!postcode) {
        showAuthError('Please enter your postcode — it\'s used to show your business to nearby buyers.'); return;
    }
    const abnDigits = abnRaw.replace(/\s/g, '');
    if (!/^\d{11}$/.test(abnDigits)) {
        showAuthError('Please enter a valid 11-digit ABN (e.g. 51 824 753 556).'); return;
    }
    showAuthError('Checking username…', true);
    const nameAvailablePro = await isUsernameAvailable(name);
    if (!nameAvailablePro) {
        showAuthError(`"${name}" is already taken.`);
        showUsernameSuggestions(suggestUsernames(name), 'authNamePro', 'authUsernameSuggestions');
        return;
    }
    showAuthError('Creating Pro account…', true);
    const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name, is_pro: true, tier: 'pro', business_name: businessName, abn: abnDigits, business_phone: phone || '', postcode: postcode || '', location: suburb || '' } }
    });
    if (error) { showAuthError(error.message); return; }
    document.getElementById('authPasswordPro').value = '';
    userSettings.businessName = businessName;
    userSettings.abn = abnDigits;
    if (postcode) userSettings.postcode = postcode;
    if (suburb)   userSettings.location = suburb;
    if (phone) { workshopProfile.phone = phone; saveWorkshopProfile(); }
    saveUserSettings();
    hideAuthError();
    toggleDrawer('authDrawer');
    showToast('Pro account created! Check your email to confirm.');
    if (authReturnAction) { const next = authReturnAction; authReturnAction = null; next(); }
    else { setTimeout(showWelcomeModal, 350); }
}

async function handleSignUpTradeSubmit() {
    const name         = document.getElementById('authNameTrade')?.value.trim();
    const businessName = document.getElementById('authBusinessNameTrade')?.value.trim();
    const abnRaw       = document.getElementById('authAbnTrade')?.value.trim();
    const pcWrapTrade  = document.querySelector('#authSignUpTradeSection .location-picker-wrap');
    const postcode     = pcWrapTrade?.dataset.selectedPostcode || document.getElementById('authPostcodeTrade')?.value.trim() || '';
    const suburb       = pcWrapTrade?.dataset.selectedSuburb   || '';
    const email        = document.getElementById('authEmailTrade')?.value.trim() || '';
    const phone        = document.getElementById('authPhoneTrade')?.value.trim() || '';
    const password     = document.getElementById('authPasswordTrade')?.value;
    if (!name || !businessName || !abnRaw || !email || !password) {
        showAuthError('Please fill in all fields including your Business Name and ABN.'); return;
    }
    if (!postcode) {
        showAuthError('Please enter your postcode — it\'s used to show your business to nearby buyers.'); return;
    }
    const abnDigits = abnRaw.replace(/\s/g, '');
    if (!/^\d{11}$/.test(abnDigits)) {
        showAuthError('Please enter a valid 11-digit ABN (e.g. 51 824 753 556).'); return;
    }
    showAuthError('Checking username…', true);
    const nameAvailableTrade = await isUsernameAvailable(name);
    if (!nameAvailableTrade) {
        showAuthError(`"${name}" is already taken.`);
        showUsernameSuggestions(suggestUsernames(name), 'authNameTrade', 'authUsernameSuggestions');
        return;
    }
    showAuthError('Creating Trade account…', true);
    const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name, is_pro: false, tier: 'trade', business_name: businessName, abn: abnDigits, business_phone: phone || '', postcode: postcode || '', location: suburb || '' } }
    });
    if (error) { showAuthError(error.message); return; }
    document.getElementById('authPasswordTrade').value = '';
    userSettings.businessName = businessName;
    userSettings.abn = abnDigits;
    if (postcode) userSettings.postcode = postcode;
    if (suburb)   userSettings.location = suburb;
    if (phone) { workshopProfile.phone = phone; saveWorkshopProfile(); }
    saveUserSettings();
    hideAuthError();
    toggleDrawer('authDrawer');
    showToast('Trade account created! Check your email to confirm.');
    if (authReturnAction) { const next = authReturnAction; authReturnAction = null; next(); }
    else { setTimeout(showWelcomeModal, 350); }
}

async function onSignOut() {
    clearRememberedUser();
    await sb.auth.signOut();
    userIsSignedIn     = false;
    currentUserName    = null;
    currentUserTier    = null;
    currentUserId      = null;
    currentUserEmail   = null;
    currentUserProfile = null;
    // Reset all user-specific local state so the next user starts clean
    userSettings    = getDefaultSettings();
    workshopProfile = getDefaultWorkshopProfile();
    userListings    = [];
    conversations   = [];
    trashedConversations = [];
    saveUserSettings();
    saveWorkshopProfile();
    saveConversations();
    saveTrash();
    saveUserListings();
    document.body.classList.remove('tier-personal', 'tier-trade', 'tier-pro');
    closeAccountMenu();
    renderAccountState();
    renderMainGrid();
}

let selectedUpgradePlan = 'monthly';

function onUpgradeClick() {
    if (currentUserTier === 'trade') { onUpgradeToPro(); }
    else { onUpgradeToTrade(); }
}

function onUpgradeToTrade() {
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    if (isTradeOrPro()) return;
    const bizInput = document.getElementById('upgradeTradeBizName');
    const abnInput = document.getElementById('upgradeTradeAbn');
    if (bizInput) bizInput.value = userSettings.businessName || '';
    if (abnInput) abnInput.value = '';
    document.getElementById('upgradeTradeBackdrop').style.display = '';
    document.getElementById('upgradeTradeModal').style.display    = '';
}

function closeUpgradeToTradeModal() {
    document.getElementById('upgradeTradeBackdrop').style.display = 'none';
    document.getElementById('upgradeTradeModal').style.display    = 'none';
}

async function confirmUpgradeToTrade() {
    if (!currentUserId) { showToast('Please sign in first.'); return; }
    const bizName = document.getElementById('upgradeTradeBizName')?.value.trim();
    const abnRaw  = document.getElementById('upgradeTradeAbn')?.value.trim();
    if (!bizName) { showToast('Please enter your business name.'); return; }
    if (!abnRaw)  { showToast('Please enter your ABN.'); return; }
    const abnDigits = abnRaw.replace(/\s/g, '');
    if (!/^\d{11}$/.test(abnDigits)) { showToast('Please enter a valid 11-digit ABN.'); return; }

    const btn = document.getElementById('confirmUpgradeTradeBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Upgrading…'; }

    const { error } = await sb.from('profiles')
        .update({ tier: 'trade', business_name: bizName, abn: abnDigits })
        .eq('id', currentUserId);

    if (btn) { btn.disabled = false; btn.textContent = 'Upgrade to Trade →'; }
    if (error) { showToast('Something went wrong — please try again.'); return; }

    currentUserTier = 'trade';
    userSettings.businessName = bizName;
    userSettings.abn = abnDigits;
    saveUserSettings();
    closeUpgradeToTradeModal();
    renderAccountState();
    showToast('Welcome to APC Trade!');
}

function onUpgradeToPro() {
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    if (currentUserTier === 'pro') return;
    selectedUpgradePlan = 'monthly';
    selectUpgradePlan('monthly');
    closeAccountMenu();
    closeAccountDropdown();
    document.getElementById('upgradeBackdrop').style.display = '';
    document.getElementById('upgradeModal').style.display    = '';
}

function selectUpgradePlan(plan) {
    selectedUpgradePlan = plan;
    document.getElementById('planMonthly').classList.toggle('upgrade-plan-active', plan === 'monthly');
    document.getElementById('planAnnual').classList.toggle('upgrade-plan-active',  plan === 'annual');
}

function confirmUpgrade() {
    // Self-serve Pro activation is intentionally disabled until the Stripe billing flow
    // ships. The 'No client is_pro escalation' RLS policy blocks client-side is_pro/tier
    // writes by design — Pro is granted server-side (Stripe webhook) or via the admin
    // gift panel. Re-wire this button to create-checkout-session when Stripe lands.
    if (!currentUserId) { openAuthDrawer(); return; }
    closeUpgradeModal();
    showToast('APC Pro is launching soon — we\'ll let you know the moment trials open. 🎉');
}

function closeUpgradeModal() {
    document.getElementById('upgradeBackdrop').style.display = 'none';
    document.getElementById('upgradeModal').style.display    = 'none';
}

function showWelcomeModal() {
    if (localStorage.getItem('apcWelcomeSeen')) return;
    const modal   = document.getElementById('welcomeModal');
    const backdrop = document.getElementById('welcomeBackdrop');
    if (!modal || !backdrop) return;
    backdrop.style.display = 'block';
    modal.style.display    = 'flex';
}

function closeWelcomeModal() {
    document.getElementById('welcomeBackdrop').style.display = 'none';
    document.getElementById('welcomeModal').style.display    = 'none';
    localStorage.setItem('apcWelcomeSeen', '1');
    if (!currentUserTier || currentUserTier === 'personal') setTimeout(_showPersonalProfileReminder, 600);
}


let userTradeOnly = false;
function onToggleTradeOnly(src) {
    userTradeOnly = src ? src.checked : false;
    const a = document.getElementById('settingTradeOnly');
    const b = document.getElementById('proSettingTradeOnly');
    if (a && a !== src) a.checked = userTradeOnly;
    if (b && b !== src) b.checked = userTradeOnly;
    applyFiltersAndRender();
}

function openProSettings() {
    onMenuOpenSettings();
}

// Pill click: open auth drawer if signed out, else toggle the dropdown menu
function onAccountPillClick(e) {
    if (e) e.stopPropagation();
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    if (window.innerWidth >= 900) {
        const dd = document.getElementById('accountDropdown');
        if (dd) dd.classList.toggle('active');
    } else {
        toggleDrawer('accountMenuDrawer');
    }
}

function closeAccountDropdown() {
    const dd = document.getElementById('accountDropdown');
    if (dd) dd.classList.remove('active');
}

function closeAccountMenu() {
    const m = document.getElementById('accountMenuDrawer');
    if (m) m.classList.remove('active');
    syncBackdrop();
}

document.addEventListener('click', function(e) {
    const dd     = document.getElementById('accountDropdown');
    const pill   = document.getElementById('accountPill');
    const avatar = document.getElementById('dtbAvatar');
    if (dd && dd.classList.contains('active') &&
        !dd.contains(e.target) &&
        !(pill && pill.contains(e.target)) &&
        !(avatar && avatar.contains(e.target))) {
        closeAccountDropdown();
    }
});

// Menu-item helpers — placeholders until each screen is built
function closeProfileDrawer() {
    const el = document.getElementById('profileDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}

function onMenuOpenProfile() {
    onMenuOpenSettings();
}

function openMyStorefront() {
    closeSettingsDrawer();
    const sellerName = getCurrentSellerName();
    const grid = document.getElementById('sellerPartsGrid');
    if (grid) grid.dataset.seller = sellerName;
    renderStorefront(
        sellerName,
        currentUserTier === 'pro',
        userSettings.profilePic     || userSettings.businessLogo   || '',
        userSettings.businessName   || '',
        userSettings.abn            || '',
        userSettings.about          || '',
        userSettings.location       || '',
        userSettings.businessBanner || '',
        userSettings.bannerColor    || null
    );
    const sfMsgBtn = document.getElementById('sfMsgBtn');
    if (sfMsgBtn) sfMsgBtn.style.display = 'none';
    const backBar4 = document.getElementById('storefrontBackBar');
    if (backBar4) backBar4.style.display = 'none';
    toggleDrawer('storefrontDrawer');
}

function renderBannerColourPicker() {
    const wrap = document.getElementById('bannerColourSwatches');
    if (!wrap) return;
    const current = userSettings.bannerColor || '#f07020';
    wrap.innerHTML = BANNER_COLOURS.map(hex =>
        `<div class="banner-colour-swatch${hex === current ? ' active' : ''}"
             style="background:${bannerGradient(hex)}"
             onclick="pickBannerColour('${hex}')"></div>`
    ).join('');

    const preview = document.getElementById('bannerColourPreview');
    if (preview) preview.style.background = bannerGradient(current);

    const previewLogo = document.getElementById('bannerPreviewLogo');
    if (previewLogo) {
        const pic = userSettings.profilePic || userSettings.businessLogo || '';
        if (pic) {
            previewLogo.innerHTML = `<img src="${escapeHtml(pic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
            previewLogo.style.color = '';
        } else {
            previewLogo.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
            previewLogo.style.color = 'var(--apc-orange)';
        }
    }
}

async function pickBannerColour(hex) {
    userSettings.bannerColor = hex;
    saveUserSettings();
    renderBannerColourPicker();
    if (currentUserId && sb) {
        await sb.from('profiles').update({ banner_color: hex }).eq('id', currentUserId);
    }
}

function renderProfile() {
    if (!userIsSignedIn) return;

    const avatarEl   = document.getElementById('profileAvatar');
    const nameEl     = document.getElementById('profileName');
    const badgeEl    = document.getElementById('profileTierBadge');
    const listingsEl = document.getElementById('profileStatListings');
    const savedEl    = document.getElementById('profileStatSaved');
    const wantedEl   = document.getElementById('profileStatWanted');

    const isPro = currentUserTier === 'pro';
    if (avatarEl) {
        avatarEl.textContent = (currentUserName || 'U').charAt(0).toUpperCase();
        avatarEl.classList.toggle('pro', isPro);
    }
    if (nameEl) nameEl.textContent = currentUserName || 'User';
    if (badgeEl) {
        badgeEl.textContent = isPro ? 'APC Pro' : 'Standard';
        badgeEl.className   = 'profile-tier-badge ' + (isPro ? 'pro' : 'standard');
    }

    const myListingCount = userListings.filter(p => p.status !== 'sold' && p.status !== 'removed').length;
    if (listingsEl) listingsEl.textContent = myListingCount;
    if (savedEl)    savedEl.textContent    = savedParts.size;
    if (wantedEl)   wantedEl.textContent   = myWanted.length;

}

function onMenuPlaceholder(label) {
    closeAccountMenu();
    showToast(label + ' — coming soon.');
}

function openHelpDrawer() {
    closeAccountMenu();
    closeAccountDropdown();
    // Pre-fill contact form if signed in
    const nameEl  = document.getElementById('helpContactName');
    const emailEl = document.getElementById('helpContactEmail');
    if (nameEl  && currentUserName  && !nameEl.value)  nameEl.value  = currentUserName;
    if (emailEl && currentUserEmail && !emailEl.value) emailEl.value = currentUserEmail;
    toggleDrawer('helpDrawer', true);
}

function toggleFaq(btn) {
    const answer = btn.nextElementSibling;
    const isOpen = answer.classList.contains('open');
    // Close all open items first
    document.querySelectorAll('#helpFaqList .help-faq-a.open').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('#helpFaqList .help-faq-q.open').forEach(q => q.classList.remove('open'));
    if (!isOpen) {
        answer.classList.add('open');
        btn.classList.add('open');
    }
}

function submitHelpContact() {
    const name  = document.getElementById('helpContactName')?.value.trim();
    const email = document.getElementById('helpContactEmail')?.value.trim();
    const msg   = document.getElementById('helpContactMsg')?.value.trim();
    if (!email || !msg) { showToast('Please fill in your email and message'); return; }
    const subject = encodeURIComponent('APC Support Request');
    const body    = encodeURIComponent(`Name: ${name || 'Not provided'}\nEmail: ${email}\n\n${msg}`);
    window.location.href = `mailto:support@autopartsconnection.com.au?subject=${subject}&body=${body}`;
    showToast('Opening your email app…');
}
// ===== SPONSORED LISTINGS DRAWER =====

const SPB_CATEGORIES = [
    { value: 'body',         label: 'Body & Exterior' },
    { value: 'engine',       label: 'Engine' },
    { value: 'transmission', label: 'Transmission' },
    { value: 'suspension',   label: 'Suspension' },
    { value: 'brakes',       label: 'Brakes' },
    { value: 'wheels',       label: 'Wheels & Tyres' },
    { value: 'electrical',   label: 'Electrical' },
    { value: 'lighting',     label: 'Lighting' },
    { value: 'cooling',      label: 'Cooling' },
    { value: 'fuel',         label: 'Fuel System' },
    { value: 'interior',     label: 'Interior' },
    { value: '4x4',          label: '4x4 & Off-Road' },
    { value: 'performance',  label: 'Performance' },
    { value: 'audio',        label: 'Audio & Tech' },
    { value: 'glass',        label: 'Glass' },
    { value: 'tools',        label: 'Tools' },
];

function openSponsoredListingsDrawer() {
    toggleDrawer('sponsoredListingsDrawer');
    renderSponsoredListingsMgmt();
}

async function renderSponsoredListingsMgmt() {
    const list    = document.getElementById('slCardList');
    const countEl = document.getElementById('slCardCount');
    const createBtn = document.getElementById('slCreateBtn');
    if (!list || !sb || !currentUserId) return;

    const { data: cards } = await sb.from('sponsored_cards')
        .select('id, card_name, template, is_active, tags, created_at, image_data')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: true });

    const cardList = cards || [];
    if (countEl) countEl.textContent = `${cardList.length} / 10`;
    if (createBtn) createBtn.style.display = cardList.length >= 10 ? 'none' : '';

    if (!cardList.length) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:#aaa;font-size:13px;">No cards yet — create your first one below.</div>`;
        return;
    }

    const tplLabel = { supplier: 'Services', product: 'Products', partner: 'Partner' };
    list.innerHTML = cardList.map(c => {
        const tags = c.tags || [];
        const isTargeted = tags.some(t => t.startsWith('make:') || t.startsWith('cat:'));
        const makes = tags.filter(t => t.startsWith('make:')).map(t => t.slice(5));
        const cats  = tags.filter(t => t.startsWith('cat:')).map(t => {
            const found = SPB_CATEGORIES.find(x => x.value === t.slice(4));
            return found ? found.label : t.slice(4);
        });
        const targeting = isTargeted
            ? [...makes, ...cats].join(', ') || 'Targeted'
            : 'All searches';
        const thumbHtml = c.image_data
            ? `<img class="sl-card-thumb" src="${escapeHtml(c.image_data)}" alt="">`
            : `<div class="sl-card-thumb-placeholder">🖼</div>`;
        return `
        <div class="sl-card-item">
            <label class="settings-toggle" style="flex-shrink:0;">
                <input type="checkbox" ${c.is_active ? 'checked' : ''} onchange="toggleSponsorCard('${c.id}', this.checked)">
                <span class="settings-toggle-track"></span>
            </label>
            ${thumbHtml}
            <div style="flex:1;min-width:0;">
                <div class="sl-card-name">${escapeHtml(c.card_name || 'Unnamed')}</div>
                <div class="sl-card-meta">${tplLabel[c.template] || c.template} · ${targeting}</div>
            </div>
            <span class="sl-card-slot-badge ${isTargeted ? 'targeted' : 'run'}">${isTargeted ? 'Targeted' : 'Run of Site'}</span>
            <button onclick="openSponsoredBuilderById('${c.id}')" style="background:none;border:none;font-size:13px;font-weight:700;color:var(--apc-orange);cursor:pointer;padding:4px 8px;">Edit</button>
            <button onclick="deleteSponsorCard('${c.id}')" style="background:none;border:none;font-size:18px;color:#ccc;cursor:pointer;padding:4px;">✕</button>
        </div>`;
    }).join('');
}

// ===== SPONSORED CARD BUILDER =====
let _sponsoredCardsData = [];

let _spbTemplate = 'supplier';
let _spbLogoData = '';
let _spbImageData = '';
let _spbExistingCard = null;
let _spbSlotType = 'run_of_site';
let _spbTargetMakes = [];
let _spbTargetCategories = [];

function openSponsoredBuilder(card = null) {
    _spbExistingCard = card || null;
    _spbTemplate = card?.template || 'supplier';
    _spbLogoData = card?.logo_data || '';
    _spbImageData = card?.image_data || '';
    const tags = card?.tags || [];
    _spbTargetMakes      = tags.filter(t => t.startsWith('make:')).map(t => t.slice(5));
    _spbTargetCategories = tags.filter(t => t.startsWith('cat:')).map(t => t.slice(4));
    _spbSlotType = (_spbTargetMakes.length || _spbTargetCategories.length) ? 'targeted' : 'run_of_site';
    const nameEl = document.getElementById('spbCardName');
    if (nameEl) nameEl.value = card?.card_name || '';
    const titleEl = document.getElementById('slBuilderViewTitle');
    if (titleEl) titleEl.textContent = card ? 'EDIT CARD' : 'NEW CARD';
    document.getElementById('slListView').style.display = 'none';
    document.getElementById('slBuilderView').style.display = '';
    _spbBuildForm();
}

async function openSponsoredBuilderById(id) {
    const drawer = document.getElementById('sponsoredListingsDrawer');
    if (!drawer?.classList.contains('active')) openSponsoredListingsDrawer();
    const { data } = await sb.from('sponsored_cards').select('*').eq('id', id).single();
    if (data) openSponsoredBuilder(data);
}

function closeSponsoredBuilder() {
    document.getElementById('slBuilderView').style.display = 'none';
    document.getElementById('slListView').style.display = '';
}

function selectSponsoredTemplate() { /* unified template — no-op */ }

function _spbBuildForm() {
    const e = _spbExistingCard || {};
    const cardImg = _spbImageData || _spbLogoData;
    // Only show free display tags — not make:/cat: targeting tags
    const freeTags = (e.tags || []).filter(t => !t.startsWith('make:') && !t.startsWith('cat:')).join(', ');
    const html = `
        <div class="input-group"><label>Name / Title <span style="color:#e53935;">*</span></label>
            <input id="spbName" type="text" maxlength="60" placeholder="e.g. AA Automotive, Bosch Wiper Blades…" value="${escapeHtml(e.business_name || '')}">
        </div>
        <div class="input-group"><label>Tagline <span style="font-weight:400;color:#aaa;">one line</span></label>
            <input id="spbTagline" type="text" maxlength="80" placeholder="e.g. Adelaide's trusted specialists since 1995" value="${escapeHtml(e.tagline || e.blurb || '')}">
        </div>
        <div class="input-group"><label>Price <span style="font-weight:400;color:#aaa;">optional</span></label>
            <input id="spbPrice" type="text" maxlength="20" placeholder="e.g. $149 or From $49" value="${escapeHtml(e.price || '')}">
        </div>
        <div class="input-group"><label>Card Image <span style="font-weight:400;color:#aaa;">photo or logo</span></label>
            <div class="spb-hero-upload" id="spbHeroPreview" onclick="document.getElementById('spbHeroInput').click()">
                ${cardImg ? `<img src="${cardImg}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : '<span class="spb-upload-hint">＋ Upload Image<br><small>Photo or logo · JPG / PNG</small></span>'}
            </div>
            <input type="file" id="spbHeroInput" accept="image/*" style="display:none;" onchange="handleSpbImage(this)">
            <div style="font-size:11px;color:#aaa;margin-top:4px;">max 1 MB</div>
        </div>
        <div class="input-group"><label>Button Label</label>
            <input id="spbBtnLabel" type="text" maxlength="30" placeholder="Visit Website →" value="${escapeHtml(e.button_label || 'Visit Website →')}">
        </div>
        <div class="input-group"><label>Button URL <span style="color:#e53935;">*</span></label>
            <input id="spbBtnUrl" type="url" placeholder="https://yourwebsite.com.au" value="${escapeHtml(e.button_url || '')}">
        </div>
        <div class="input-group"><label>Search Keywords <span style="font-weight:400;color:#aaa;">up to 5, comma-separated</span></label>
            <input id="spbTags" type="text" maxlength="120" placeholder="e.g. wiper blades, suspension, oil change" value="${escapeHtml(freeTags)}">
            <div style="font-size:11px;color:#aaa;margin-top:4px;">Soft-matched against buyer search text — not the same as part categories. Use words buyers actually type.</div>
        </div>`;

    document.getElementById('spbFormFields').innerHTML = html;
    document.getElementById('spbFormFields').querySelectorAll('input,textarea').forEach(el => {
        el.addEventListener('input', _spbUpdatePreview);
    });
    _spbUpdatePreview();
    _spbRenderTargeting();
}

function _spbRenderTargeting() {
    const isEditing = !!_spbExistingCard?.id;
    const rosBtn = document.getElementById('spbSlotRunOfSite');
    const tgtBtn = document.getElementById('spbSlotTargeted');

    // Update button labels to reflect monthly pricing + trial
    if (rosBtn) rosBtn.innerHTML = `<div class="spb-slot-btn-name">📢 Run of Site</div><div class="spb-slot-btn-desc">${isEditing ? 'All searches · $79/mo' : 'Free 14-day trial · then $79/mo'}</div>`;
    if (tgtBtn) tgtBtn.innerHTML = `<div class="spb-slot-btn-name">🎯 Targeted</div><div class="spb-slot-btn-desc">Relevant buyers only · $149/mo</div>`;

    // Lock slot type buttons when editing an existing card
    if (isEditing) {
        [rosBtn, tgtBtn].forEach(btn => btn && (btn.style.pointerEvents = 'none'));
        const lockNote = document.getElementById('spbSlotLockNote');
        if (!lockNote) {
            const note = document.createElement('p');
            note.id = 'spbSlotLockNote';
            note.style.cssText = 'font-size:11px;color:#aaa;margin-top:8px;';
            note.textContent = 'Targeting type is locked for this card — create a new card to use a different type.';
            document.getElementById('spbSlotRunOfSite')?.closest('.spb-slot-row')?.after(note);
        }
    } else {
        [rosBtn, tgtBtn].forEach(btn => btn && (btn.style.pointerEvents = ''));
        document.getElementById('spbSlotLockNote')?.remove();
    }

    rosBtn?.classList.toggle('active', _spbSlotType === 'run_of_site');
    tgtBtn?.classList.toggle('active', _spbSlotType === 'targeted');
    const opts = document.getElementById('spbTargetingOptions');
    if (opts) opts.style.display = _spbSlotType === 'targeted' ? '' : 'none';
    if (_spbSlotType !== 'targeted') return;

    // Selected makes chips
    const makesEl = document.getElementById('spbSelectedMakes');
    if (makesEl) {
        makesEl.innerHTML = _spbTargetMakes.map(m =>
            `<span class="spb-tag-chip">${escapeHtml(m)}<button onclick="spbRemoveMake('${escapeHtml(m)}')">×</button></span>`
        ).join('');
    }
    // Category chips
    const catEl = document.getElementById('spbCategoryChips');
    if (catEl) {
        catEl.innerHTML = SPB_CATEGORIES.map(c =>
            `<span class="spb-cat-chip${_spbTargetCategories.includes(c.value) ? ' active' : ''}"
                onclick="spbToggleCategory('${c.value}')">${escapeHtml(c.label)}</span>`
        ).join('');
    }
    // Preview text
    _spbUpdateTargetPreview();
}

function spbSetSlotType(type) {
    _spbSlotType = type;
    _spbRenderTargeting();
}

function spbMakeSuggest() {
    const q = (document.getElementById('spbMakeSearch')?.value || '').toLowerCase().trim();
    const box = document.getElementById('spbMakeSuggestions');
    if (!box) return;
    if (!q || typeof VEHICLE_MAKES === 'undefined') { box.style.display = 'none'; return; }
    const matches = VEHICLE_MAKES.filter(m =>
        m.toLowerCase().includes(q) && !_spbTargetMakes.includes(m)
    ).slice(0, 8);
    if (!matches.length) { box.style.display = 'none'; return; }
    box.innerHTML = matches.map(m =>
        `<div class="spb-suggest-item" onclick="spbAddMake('${escapeHtml(m)}')">${escapeHtml(m)}</div>`
    ).join('');
    box.style.display = '';
}

function spbMakeKeydown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = (document.getElementById('spbMakeSearch')?.value || '').trim();
    if (!val) return;
    const match = (typeof VEHICLE_MAKES !== 'undefined')
        ? VEHICLE_MAKES.find(m => m.toLowerCase() === val.toLowerCase())
        : null;
    if (match) spbAddMake(match);
}

function spbAddMake(make) {
    if (!_spbTargetMakes.includes(make)) _spbTargetMakes.push(make);
    const inp = document.getElementById('spbMakeSearch');
    if (inp) inp.value = '';
    const box = document.getElementById('spbMakeSuggestions');
    if (box) box.style.display = 'none';
    _spbRenderTargeting();
}

function spbRemoveMake(make) {
    _spbTargetMakes = _spbTargetMakes.filter(m => m !== make);
    _spbRenderTargeting();
}

function spbToggleCategory(cat) {
    if (_spbTargetCategories.includes(cat)) {
        _spbTargetCategories = _spbTargetCategories.filter(c => c !== cat);
    } else {
        _spbTargetCategories.push(cat);
    }
    _spbRenderTargeting();
}

function _spbUpdateTargetPreview() {
    const el = document.getElementById('spbTargetPreview');
    if (!el) return;
    if (!_spbTargetMakes.length && !_spbTargetCategories.length) {
        el.textContent = 'Add at least one make or category to define your audience.';
        return;
    }
    const parts = [];
    if (_spbTargetMakes.length)      parts.push(_spbTargetMakes.join(', '));
    if (_spbTargetCategories.length) {
        const labels = _spbTargetCategories.map(v => SPB_CATEGORIES.find(c => c.value === v)?.label || v);
        parts.push(labels.join(', '));
    }
    el.textContent = `Your card will show when buyers search for: ${parts.join(' · ')}`;
}

function _spbUpdatePreview() {
    const preview = document.getElementById('spbPreviewCard');
    if (!preview) return;
    const name     = document.getElementById('spbName')?.value || '';
    const tagline  = document.getElementById('spbTagline')?.value || '';
    const price    = document.getElementById('spbPrice')?.value || '';
    const btnLabel = document.getElementById('spbBtnLabel')?.value || '';
    const tagsRaw  = document.getElementById('spbTags')?.value || '';
    const tags     = tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
    preview.innerHTML = buildSponsoredCardHTML({
        template: 'standard', business_name: name, tagline, price,
        button_label: btnLabel, button_url: '#', tags,
        image_data: _spbImageData || _spbLogoData
    });
}

function handleSpbLogo(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    if (file.size > 2 * 1024 * 1024) { showToast('Logo too large — max 2 MB'); return; }
    openSpbCropper(file, 240, 240, 480, 480, 'Position Logo', 'Use Logo', dataUrl => {
        _spbLogoData = dataUrl;
        const prev = document.getElementById('spbLogoPreview');
        if (prev) prev.innerHTML = `<img src="${_spbLogoData}" style="width:100%;height:100%;object-fit:contain;">`;
        _spbUpdatePreview();
    });
}

function handleSpbImage(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    if (file.size > 4 * 1024 * 1024) { showToast('Image too large — max 4 MB'); return; }
    openSpbCropper(file, 200, 240, 400, 480, 'Position Image', 'Use Image', dataUrl => {
        _spbImageData = dataUrl;
        const prev = document.getElementById('spbHeroPreview');
        if (prev) prev.innerHTML = `<img src="${_spbImageData}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        _spbUpdatePreview();
    });
}

async function submitSponsoredCard() {
    if (!sb || !currentUserId) { showToast('Please sign in'); return; }
    const name   = document.getElementById('spbName')?.value.trim();
    const btnUrl = document.getElementById('spbBtnUrl')?.value.trim();
    if (!name)   { showToast('Name / title is required'); return; }
    if (!btnUrl) { showToast('Button URL is required'); return; }

    const tagline  = document.getElementById('spbTagline')?.value.trim() || null;
    const price    = document.getElementById('spbPrice')?.value.trim() || null;
    const btnLabel = document.getElementById('spbBtnLabel')?.value.trim() || null;
    const tagsRaw  = document.getElementById('spbTags')?.value || '';
    const freeTags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
    const makeTags = _spbSlotType === 'targeted' ? _spbTargetMakes.map(m => `make:${m}`) : [];
    const catTags  = _spbSlotType === 'targeted' ? _spbTargetCategories.map(c => `cat:${c}`) : [];
    const tags = [...makeTags, ...catTags, ...freeTags];

    const cardName = document.getElementById('spbCardName')?.value.trim();
    if (!cardName) { showToast('Please give your card a name'); return; }
    const imageData = _spbImageData || _spbLogoData || null;
    const payload = {
        user_id: currentUserId, template: 'standard',
        card_name: cardName,
        business_name: name, tagline, blurb: null, price,
        tags: tags.length ? tags : null,
        logo_data: null, image_data: imageData,
        button_label: btnLabel, button_url: btnUrl, is_active: true,
        postcode: userSettings.postcode || null
    };

    let error;
    if (_spbExistingCard?.id) {
        ({ error } = await sb.from('sponsored_cards').update(payload).eq('id', _spbExistingCard.id));
    } else {
        ({ error } = await sb.from('sponsored_cards').insert(payload));
    }
    if (error) { showToast('Error: ' + error.message); return; }
    showToast(_spbExistingCard?.id ? 'Card updated' : 'Sponsored card created — now live!');
    closeSponsoredBuilder();
    renderSponsoredListingsMgmt();
    loadSponsoredCards();
}

function buildSponsoredInFeedHTML(card) {
    const name    = escapeHtml(card.business_name || 'Sponsored');
    const tagline = escapeHtml(card.tagline || card.blurb || '');
    const price   = escapeHtml(card.price || '');
    const cardId  = card.id || '';
    const userId  = card.user_id || '';
    const safeUrl = /^https:\/\//i.test(card.button_url || '') ? escapeHtml(card.button_url) : '#';
    const cardImg = card.image_data || card.logo_data || '';

    const imgHtml = cardImg
        ? `<img class="item-img" src="${cardImg}" alt="${name}" loading="lazy" style="object-fit:cover;">`
        : `<div class="item-img" style="background:linear-gradient(135deg,var(--apc-orange),#e05000);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:22px;font-weight:900;letter-spacing:1px;">${name.slice(0,2).toUpperCase()}</span></div>`;

    return `<div class="item-card" onclick="handleSponsoredCardClick('${cardId}','${userId}','${safeUrl}')">
        ${imgHtml}
        <span class="drp-type-badge drp-type-badge--sponsored">Sponsored</span>
        <div class="item-info">
            <div class="price-row">${price ? `<span class="item-price">${price}</span>` : `<span style="font-size:10px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;">Sponsored</span>`}</div>
            <div class="item-title">${name}</div>
            ${tagline ? `<div class="item-loc">${tagline}</div>` : ''}
        </div>
    </div>`;
}

function buildGridWithSponsored(parts) {
    const INTERVAL = 15;
    if (window.innerWidth >= 900 || !_sponsoredCardsData.length) {
        return parts.map((part, i) => buildCardHTML(part, i < 6)).join('');
    }
    const sorted = [..._sponsoredCardsData].sort((a, b) => {
        const sd = scoreCardByContext(b, activeFilters) - scoreCardByContext(a, activeFilters);
        return sd !== 0 ? sd : (b.priority || 0) - (a.priority || 0);
    });
    // One card per advertiser for in-feed rotation too
    const seen = new Set();
    const deduped = sorted.filter(card => {
        const uid = card.user_id || card.id;
        if (seen.has(uid)) return false;
        seen.add(uid);
        return true;
    });
    let html = '';
    let si = 0;
    parts.forEach((part, i) => {
        html += buildCardHTML(part, i < 6);
        if ((i + 1) % INTERVAL === 0) {
            html += buildSponsoredInFeedHTML(deduped[si % deduped.length]);
            si++;
        }
    });
    return html;
}

async function handleSponsoredCardClick(cardId, userId, url) {
    if (cardId && sb) {
        sb.from('sponsored_clicks')
            .insert({ card_id: cardId, user_id: currentUserId || null })
            .then(() => {});
    }
    // If the card owner has a workshop profile, open the workshop overlay
    const ws = userId ? await fetchWorkshopById(userId) : null;
    if (ws) {
        openWorkshopOverlay(userId);
        return;
    }
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else if (userId) {
        openStorefrontByUserId(userId);
    }
}

function buildSponsoredCardHTML(card) {
    const name    = escapeHtml(card.business_name || '');
    const sub     = escapeHtml(card.tagline || card.blurb || '');
    const price   = escapeHtml(card.price || '');
    const cardImg = card.image_data || card.logo_data || '';

    const safeUrl = /^https:\/\//i.test(card.button_url || '') ? escapeHtml(card.button_url) : '#';
    const userId  = card.user_id || '';
    const cardId  = card.id || '';
    const openCmd = `handleSponsoredCardClick('${cardId}','${userId}','${safeUrl}')`;

    const imgHtml = cardImg
        ? `<img src="${cardImg}" class="drp-card-img" alt="">`
        : `<div class="drp-card-ph" style="background:linear-gradient(135deg,var(--apc-orange),#e05000)"><span>${name.slice(0, 2).toUpperCase()}</span></div>`;

    return `<div class="drp-card" onclick="${openCmd}">
        ${imgHtml}
        <span class="drp-type-badge drp-type-badge--sponsored">Sponsored</span>
        <div class="drp-info">
            ${price ? `<div class="drp-info-price">${price}</div>` : ''}
            <div class="drp-info-name">${name}</div>
            ${sub ? `<div class="drp-info-sub">${sub}</div>` : ''}
        </div>
    </div>`;
}

async function renderSponsorManagement() {
    const countEl = document.getElementById('settingsSponsorCount');
    if (!sb || !currentUserId) return;
    const { data: cards } = await sb.from('sponsored_cards')
        .select('id').eq('user_id', currentUserId);
    const n = (cards || []).length;
    if (countEl) countEl.textContent = n
        ? `${n} card${n === 1 ? '' : 's'} active — tap to manage`
        : 'Create and target your sponsored listings';
}

async function toggleSponsorCard(id, value) {
    const { error } = await sb.from('sponsored_cards').update({ is_active: value }).eq('id', id).eq('user_id', currentUserId);
    if (error) { showToast('Error: ' + error.message); return; }
    loadSponsoredCards();
}

async function deleteSponsorCard(id) {
    if (!confirm('Delete this sponsored card?')) return;
    const { error } = await sb.from('sponsored_cards').delete().eq('id', id).eq('user_id', currentUserId);
    if (error) { showToast('Error: ' + error.message); return; }
    renderSponsoredListingsMgmt();
    loadSponsoredCards();
}

async function loadSponsoredCards() {
    if (!sb) return;
    const { data } = await sb.from('sponsored_cards')
        .select('*').eq('is_active', true).limit(30)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
    _sponsoredCardsData = data || [];
    refreshSponsoredCards();
}

function scoreCardByContext(card, filters) {
    const tags = (card.tags || []).map(t => t.toLowerCase().trim()).filter(Boolean);
    if (!tags.length) return 0;

    // Structured targeting: make:Toyota, cat:brakes
    const targetMakes = tags.filter(t => t.startsWith('make:')).map(t => t.slice(5));
    const targetCats  = tags.filter(t => t.startsWith('cat:')).map(t => t.slice(4));
    const freeTags    = tags.filter(t => !t.startsWith('make:') && !t.startsWith('cat:'));

    let score = 0;

    // Make match — strong signal (2 pts)
    const activeMake = (filters.make || '').toLowerCase();
    if (activeMake && targetMakes.some(m => m === activeMake || activeMake.includes(m))) score += 2;

    // Category match — strong signal (2 pts)
    const activeCat = filters.category && filters.category !== 'all' ? filters.category.toLowerCase() : '';
    if (activeCat && targetCats.includes(activeCat)) score += 2;

    // Search keyword fallback for free-form tags (1 pt each)
    const searchTerms = [
        ...(filters.search || '').toLowerCase().split(/\s+/),
        filters.model || '',
    ].map(t => t.trim()).filter(Boolean);
    for (const term of searchTerms) {
        if (freeTags.some(tag => tag.includes(term) || term.includes(tag))) score++;
    }

    // Location proximity bonus — only when buyer has set a postcode filter
    const buyerPc = (filters.postcode || '').trim();
    const cardPc  = (card.postcode || '').trim();
    if (buyerPc && cardPc) {
        const coords = typeof AU_POSTCODE_COORDS !== 'undefined' && AU_POSTCODE_COORDS;
        const origin = coords && coords[buyerPc];
        const dest   = coords && coords[cardPc];
        if (origin && dest) {
            const km = haversineKm(origin[0], origin[1], dest[0], dest[1]);
            if (km <= 50)       score += 2; // same metro area
            else if (km <= 200) score += 1; // same broad region
        } else if (buyerPc[0] === cardPc[0]) {
            score += 1; // same state by first digit — fallback if coords missing
        }
    }

    return score;
}

function refreshSponsoredCards() {
    if (!_sponsoredCardsData.length) return;
    const panel = document.getElementById('desktopRightPanel');
    if (!panel) return;

    const sorted = [..._sponsoredCardsData].sort((a, b) => {
        const scoreDiff = scoreCardByContext(b, activeFilters) - scoreCardByContext(a, activeFilters);
        if (scoreDiff !== 0) return scoreDiff;
        return (b.priority || 0) - (a.priority || 0);
    });

    // One card per advertiser — their highest-scoring card wins the slot
    const seen = new Set();
    const deduped = sorted.filter(card => {
        const uid = card.user_id || card.id;
        if (seen.has(uid)) return false;
        seen.add(uid);
        return true;
    });

    panel.innerHTML = `<div id="drpScrollInner"><div class="drp-section-heading">Sponsored</div>${deduped.map(buildSponsoredCardHTML).join('')}</div>`;
    const inner = document.getElementById('drpScrollInner');
    if (inner) inner.style.transform = `translateY(-${window.scrollY}px)`;
}

async function onMenuOpenWorkshops() {
    if (!userIsSignedIn) {
        openAuthDrawer(onMenuOpenWorkshops);
        return;
    }
    workshopRadiusKm = null;
    document.querySelectorAll('#workshopRadiusControl .radius-seg').forEach((s, i, arr) => {
        s.classList.toggle('active', i === arr.length - 1);
    });
    await ensureWorkshopsLoaded();
    renderWorkshopProfile();
    renderWorkshopBrowseView();
    populateWsLocatorPicker();
    toggleDrawer('workshopDrawer', true);
}

function openWorkshopProfileEditor() {
    if (!userIsSignedIn) { openAuthDrawer(openWorkshopProfileEditor); return; }
    const browseSection  = document.getElementById('workshopBrowseSection');
    const profileFields  = document.getElementById('workshopProfileFields');
    const drawerTitle    = document.getElementById('workshopDrawerTitle');
    const notice         = document.getElementById('workshopProNotice');
    if (browseSection) browseSection.style.display = 'none';
    if (profileFields) profileFields.style.display = '';
    if (drawerTitle)   drawerTitle.textContent      = 'Workshop & Repairer Profile';
    if (notice)        notice.style.display         = currentUserTier === 'personal' ? 'block' : 'none';
    // Pre-fill unified profile fields
    const bizEl   = document.getElementById('proSettingBusinessName');
    const abnEl   = document.getElementById('proSettingABN');
    const aboutEl = document.getElementById('proSettingAbout');
    if (bizEl)   bizEl.value   = userSettings.businessName || '';
    if (abnEl)   abnEl.value   = formatABN(userSettings.abn || '');
    if (aboutEl) aboutEl.value = userSettings.about        || '';
    const wsAddressEl = document.getElementById('wsAddress');
    if (wsAddressEl) wsAddressEl.value = workshopProfile.address || '';
    const wsPhoneEl = document.getElementById('wsPhone');
    if (wsPhoneEl) wsPhoneEl.value = workshopProfile.phone || '';
    const wsEmailEl = document.getElementById('wsEmail');
    if (wsEmailEl) wsEmailEl.value = workshopProfile.email || '';
    const wsWebsiteEl = document.getElementById('wsWebsite');
    if (wsWebsiteEl) wsWebsiteEl.value = workshopProfile.website || '';
    const wsPaymentEl = document.getElementById('wsPayment');
    if (wsPaymentEl) wsPaymentEl.value = workshopProfile.paymentDetails || '';
    renderWsHoursGrid(workshopProfile.businessHours || {});
    // Pre-fill workshop location picker from saved postcode
    const wsLocWrap = document.querySelector('#workshopProfileFields .location-picker-wrap[data-mode="workshop"]');
    if (wsLocWrap) {
        const pc = userSettings.postcode || '';
        const input  = wsLocWrap.querySelector('.loc-postcode-input');
        const subInp = wsLocWrap.querySelector('.loc-suburb-input');
        if (input) input.value = pc;
        if (pc && typeof AU_POSTCODES !== 'undefined') {
            const subs = AU_POSTCODES[pc] || [];
            const savedLoc = (userSettings.location || '').replace(/\s*\d{4}$/, '').split(',')[0].trim().toLowerCase();
            let chosen = savedLoc ? subs.find(([s]) => s.toLowerCase() === savedLoc) : null;
            if (!chosen && subs.length === 1) chosen = subs[0];
            if (chosen) {
                const label = `${chosen[0]}, ${chosen[1]}`;
                if (subInp) subInp.value = label;
                wsLocWrap.dataset.selectedPostcode = pc;
                wsLocWrap.dataset.selectedSuburb   = label;
            }
        }
    }
    // Business type selector
    const bizType = userSettings.businessType || 'supplier';
    document.querySelectorAll('#bizTypeControl .radius-seg').forEach(s => {
        s.classList.toggle('active', s.dataset.type === bizType);
    });
    const servSection  = document.getElementById('workshopServicesSection');
    const partsSection = document.getElementById('workshopPartsSection');
    if (servSection)  servSection.style.display  = (bizType === 'service' || bizType === 'both') ? 'block' : 'none';
    if (partsSection) partsSection.style.display = (bizType === 'supplier' || bizType === 'both') ? 'block' : 'none';
    // Service checkboxes
    const svc = workshopProfile.services || {};
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    setChk('wsGeneralService', svc.generalService); setChk('wsLogbook', svc.logbook);
    setChk('wsEngineDiag', svc.engineDiag);   setChk('wsEngineRebuild', svc.engineRebuild);
    setChk('wsTransmission', svc.transmission); setChk('wsExhaust', svc.exhaust);
    setChk('wsTimingBelt', svc.timingBelt);
    setChk('wsBrakes', svc.brakes);           setChk('wsSuspension', svc.suspension);
    setChk('wsWheelAlign', svc.wheelAlign);   setChk('wsTyreSupply', svc.tyreSupply);
    setChk('wsAutoElectrical', svc.autoElectrical); setChk('wsBattery', svc.battery);
    setChk('wsAircon', svc.aircon);           setChk('wsCooling', svc.cooling);
    setChk('wsAutoSecurity', svc.autoSecurity); setChk('wsAudioAcc', svc.audioAccessories);
    setChk('wsCollision', svc.collision);     setChk('wsSprayPaint', svc.sprayPaint);
    setChk('wsPDR', svc.pdr);                setChk('wsAutoGlass', svc.autoGlass);
    setChk('wsTrimming', svc.trimming);
    // Makes picker summaries
    _updateMakesSummary('vehicles', workshopProfile.vehicles);
    // Parts section
    const partsType = workshopProfile.partsType || 'new';
    document.querySelectorAll('#partsTypeControl .radius-seg').forEach(s => {
        s.classList.toggle('active', s.dataset.pts === partsType);
    });
    const partsCats = workshopProfile.partsCategories || [];
    document.querySelectorAll('.ws-cat-cb').forEach(cb => {
        cb.checked = partsCats.includes(cb.dataset.cat);
    });
    const wreckingCb = document.getElementById('wsWrecking');
    if (wreckingCb) wreckingCb.checked = !!workshopProfile.wrecking;
    const wreckingMakesRow = document.getElementById('wsWreckingMakesRow');
    if (wreckingMakesRow) wreckingMakesRow.style.display = workshopProfile.wrecking ? 'block' : 'none';
    _updateMakesSummary('wreckingMakes', workshopProfile.wreckingMakes);
    renderBannerPreview();
    // Badge trigger button — Pro users only
    const badgeSec = document.getElementById('apcBadgeSection');
    if (badgeSec) badgeSec.style.display = (isTradeOrPro() && userIsSignedIn) ? 'block' : 'none';
    toggleDrawer('workshopDrawer', true);
}
function submitWorkshopProfile() {
    if (!userIsSignedIn) {
        openAuthDrawer(submitWorkshopProfile);
        return;
    }
    if (!isTradeOrPro()) {
        showToast('Upgrade to APC Trade or Pro to save your workshop profile');
        return;
    }
    // Save unified profile to userSettings
    userSettings.businessName = document.getElementById('proSettingBusinessName')?.value.trim() || '';
    userSettings.abn          = document.getElementById('proSettingABN')?.value.trim() || '';
    userSettings.about        = document.getElementById('proSettingAbout')?.value.trim() || '';
    // Capture location from the two-box picker
    const wsLocWrap = document.querySelector('#workshopProfileFields .location-picker-wrap[data-mode="workshop"]');
    if (wsLocWrap) {
        const wsPc     = wsLocWrap.dataset.selectedPostcode || '';
        const wsSub    = wsLocWrap.dataset.selectedSuburb   || '';
        if (wsPc)  userSettings.postcode = wsPc;
        if (wsSub) userSettings.location = wsSub + (wsPc ? ' ' + wsPc : '');
    }
    saveUserSettings();
    if (currentUserId && sb) {
        sb.from('profiles').update({
            business_name: userSettings.businessName || null,
            abn:           userSettings.abn           || null,
            about:         userSettings.about         || null,
        }).eq('id', currentUserId).then(() => {});
    }
    const getChk = id => document.getElementById(id)?.checked || false;
    workshopProfile = {
        vehicles: workshopProfile.vehicles || [],
        address:  document.getElementById('wsAddress')?.value.trim()  || '',
        phone:    document.getElementById('wsPhone')?.value.trim()    || '',
        email:    document.getElementById('wsEmail')?.value.trim()    || '',
        website:  document.getElementById('wsWebsite')?.value.trim()  || '',
        paymentDetails: document.getElementById('wsPayment')?.value.trim() || '',
        businessHours: readWsHoursGrid(),
        services: {
            generalService: getChk('wsGeneralService'), logbook: getChk('wsLogbook'),
            engineDiag: getChk('wsEngineDiag'),   engineRebuild: getChk('wsEngineRebuild'),
            transmission: getChk('wsTransmission'), exhaust: getChk('wsExhaust'),
            timingBelt: getChk('wsTimingBelt'),
            brakes: getChk('wsBrakes'),           suspension: getChk('wsSuspension'),
            wheelAlign: getChk('wsWheelAlign'),   tyreSupply: getChk('wsTyreSupply'),
            autoElectrical: getChk('wsAutoElectrical'), battery: getChk('wsBattery'),
            aircon: getChk('wsAircon'),           cooling: getChk('wsCooling'),
            autoSecurity: getChk('wsAutoSecurity'),   audioAccessories: getChk('wsAudioAcc'),
            collision: getChk('wsCollision'),     sprayPaint: getChk('wsSprayPaint'),
            pdr: getChk('wsPDR'),                autoGlass: getChk('wsAutoGlass'),
            trimming: getChk('wsTrimming'),
        },
        partsType: document.querySelector('#partsTypeControl .radius-seg.active')?.dataset.pts || 'new',
        partsCategories: Array.from(document.querySelectorAll('.ws-cat-cb:checked')).map(cb => cb.dataset.cat),
        wrecking: getChk('wsWrecking'),
        wreckingMakes: workshopProfile.wreckingMakes || [],
    };
    saveWorkshopProfile();
    syncWorkshopProfileToSupabase();
    showToast('Profile saved');
    toggleDrawer('workshopDrawer');
}
function renderWorkshopProfile() {
    const notice = document.getElementById('workshopProNotice');
    const profileFields = document.getElementById('workshopProfileFields');
    const browseSection = document.getElementById('workshopBrowseSection');
    const drawerTitle = document.getElementById('workshopDrawerTitle');
    const saveBtn = document.querySelector('#workshopDrawer .btn-full-action');
    const isPro = currentUserTier === 'pro';

    if (notice) notice.style.display = 'none';
    if (browseSection) browseSection.style.display = 'block';
    if (profileFields) profileFields.style.display = 'none';
    if (drawerTitle) drawerTitle.textContent = 'Workshops & Services';

    const nameField = document.getElementById('workshopName');
    const locationField = document.getElementById('workshopLocation');
    const descField = document.getElementById('workshopDescription');
    const servicePanel = document.getElementById('workshopServicePanel');
    const serviceFitment = document.getElementById('workshopServiceFitment');
    const serviceMechanical = document.getElementById('workshopServiceMechanical');
    const serviceElectrical = document.getElementById('workshopServiceElectrical');
    const serviceAlignment = document.getElementById('workshopServiceAlignment');
    const serviceTyres = document.getElementById('workshopServiceTyres');

    if (nameField) nameField.value = workshopProfile.name;
    if (locationField) locationField.value = workshopProfile.location;
    if (descField) descField.value = workshopProfile.description;
    if (servicePanel) servicePanel.checked = workshopProfile.services.panel;
    if (serviceFitment) serviceFitment.checked = workshopProfile.services.fitment;
    if (serviceMechanical) serviceMechanical.checked = workshopProfile.services.mechanical;
    if (serviceElectrical) serviceElectrical.checked = workshopProfile.services.electrical;
    if (serviceAlignment) serviceAlignment.checked = workshopProfile.services.alignment;
    if (serviceTyres) serviceTyres.checked = workshopProfile.services.tyres;
}
function setWorkshopRadius(el, km) {
    workshopRadiusKm = km;
    document.querySelectorAll('#workshopRadiusControl .radius-seg').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    renderWorkshopBrowseView();
}

function toggleWsFilters() {
    const panel   = document.getElementById('workshopFilterPanel');
    const chevron = document.getElementById('wsFilterChevron');
    if (!panel) return;
    const open = panel.classList.toggle('open');
    if (chevron) chevron.textContent = open ? '▴' : '▾';
}

function updateWsFilterBadge() {
    const count = document.querySelectorAll('#workshopFilterPanel input[type="checkbox"]:checked').length;
    const badge = document.getElementById('wsFilterBadge');
    if (badge) { badge.textContent = count; badge.style.display = count ? '' : 'none'; }
    renderWorkshopBrowseView();
}

function wsSelectAll() {
    document.querySelectorAll('#workshopFilterPanel input[type="checkbox"]:not(#workshopFilterApproved)').forEach(c => c.checked = true);
    updateWsFilterBadge();
}

function wsClearAll() {
    document.querySelectorAll('#workshopFilterPanel input[type="checkbox"]:not(#workshopFilterApproved)').forEach(c => c.checked = false);
    updateWsFilterBadge();
}

function clearWorkshopFilters() {
    const searchInput = document.getElementById('workshopSearchInput');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('#workshopFilterPanel input[type="checkbox"]').forEach(c => c.checked = false);
    updateWsFilterBadge();
}

function getApprovedClubInfo() {
    const state = (document.getElementById('filterStateSelect')?.value || '').toUpperCase();
    const map = {
        SA:  { abbr: 'RAA',  full: 'RAA Approved Repairer' },
        NSW: { abbr: 'NRMA', full: 'NRMA Approved Repairer' },
        ACT: { abbr: 'NRMA', full: 'NRMA Approved Repairer' },
        VIC: { abbr: 'RACV', full: 'RACV Approved Repairer' },
        QLD: { abbr: 'RACQ', full: 'RACQ Approved Repairer' },
        WA:  { abbr: 'RAC',  full: 'RAC Approved Repairer' },
        TAS: { abbr: 'RACT', full: 'RACT Approved Repairer' },
        NT:  { abbr: 'AANT', full: 'AANT Approved Repairer' },
    };
    return map[state] || { abbr: 'Club', full: 'Motoring Club Approved Repairer' };
}

function renderWorkshopBrowseView() {
    const chk = id => document.getElementById(id)?.checked;
    const serviceMap = [
        ['wfGeneralService', 'generalService'], ['wfLogbook',      'logbook'],
        ['wfEngineDiag',     'engineDiag'],     ['wfEngineRebuild', 'engineRebuild'],
        ['wfTransmission',   'transmission'],   ['wfExhaust',       'exhaust'],
        ['wfBrakes',         'brakes'],         ['wfSuspension',    'suspension'],
        ['wfWheelAlign',     'wheelAlign'],     ['wfTyreSupply',    'tyreSupply'],
        ['wfAutoElectrical', 'autoElectrical'], ['wfBattery',       'battery'],
        ['wfAircon',         'aircon'],         ['wfCooling',       'cooling'],
        ['wfAutoSecurity',   'autoSecurity'],   ['wfAudioAcc',      'audioAccessories'],
        ['wfCollision',     'collision'],
        ['wfSprayPaint',     'sprayPaint'],     ['wfPdr',           'pdr'],
        ['wfAutoGlass',      'autoGlass'],      ['wfTrimming',      'trimming'],
    ];
    const activeKeys  = serviceMap.filter(([id]) => chk(id)).map(([, key]) => key);
    const filterParts    = chk('workshopFilterParts');
    const filterWrecking = chk('workshopFilterWrecking');
    const anyFilter = activeKeys.length || filterParts || filterWrecking;
    const sponsoredList = document.getElementById('workshopSponsoredList');
    if (!sponsoredList) return;

    // Sync approved repairer label to current state selection
    const clubInfo = getApprovedClubInfo();
    const badge = document.getElementById('workshopApprovedBadge');
    const text  = document.getElementById('workshopApprovedText');
    if (badge) badge.textContent = clubInfo.abbr;
    if (text)  text.textContent  = clubInfo.full;

    const filterApproved = chk('workshopFilterApproved');
    const query = (document.getElementById('workshopSearchInput')?.value || '').trim().toLowerCase();

    // Compute real km distances from user's selected postcode to each workshop
    const locWrap    = document.querySelector('.location-picker-wrap[data-mode="ws-locator"]');
    const userPc     = (locWrap?.dataset.selectedPostcode || '').trim();
    const coordDb    = typeof AU_POSTCODE_COORDS !== 'undefined' ? AU_POSTCODE_COORDS : null;
    const userCoords = (coordDb && userPc) ? coordDb[userPc] : null;
    const distKmMap  = new Map();
    if (userCoords) {
        workshopDatabase.forEach(w => {
            const wc = w.postcode && coordDb ? coordDb[w.postcode] : null;
            if (wc) distKmMap.set(w.id, haversineKm(userCoords[0], userCoords[1], wc[0], wc[1]));
        });
    }

    const matches = workshopDatabase.filter(w => {
        if (filterApproved && !w.approvedClub) return false;
        if (workshopRadiusKm !== null) {
            const distKm = distKmMap.get(w.id);
            if (distKm === undefined || distKm > workshopRadiusKm) return false;
        }
        if (query) {
            const haystack = [w.name, w.location, ...w.vehicleTypes, ...(w.serviceKeys || [])].join(' ').toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        if (!anyFilter) return true;
        if (activeKeys.length && activeKeys.some(k => (w.serviceKeys || []).includes(k))) return true;
        if (filterParts    && (w.serviceKeys || []).some(x => x === 'parts' || x === 'partsSupplier')) return true;
        if (filterWrecking && (w.serviceKeys || []).includes('wrecking')) return true;
        return false;
    });

    // Sort by distance when user has set a postcode
    if (userCoords) {
        matches.sort((a, b) => (distKmMap.get(a.id) ?? Infinity) - (distKmMap.get(b.id) ?? Infinity));
    }

    if (!matches.length) {
        sponsoredList.innerHTML = `<div class="workshop-empty-state">
            <div class="workshop-empty-icon">🔧</div>
            <div class="workshop-empty-title">No workshops match your filters</div>
            <div class="workshop-empty-sub">Try adjusting your search or service filters</div>
            <button class="workshop-empty-cta" onclick="clearWorkshopFilters()">Show all workshops</button>
        </div>`;
        return;
    }

    sponsoredList.innerHTML = matches.map(w => {
        const km = distKmMap.get(w.id);
        const distLabel = km !== undefined ? `${Math.round(km)} km away` : (w.location || '');
        return buildSponsoredWorkshopCardHTML(w, distLabel);
    }).join('');
}
function buildSponsoredWorkshopCardHTML(workshop, distLabel) {
    const displayDist = distLabel !== undefined ? distLabel : (workshop.location || '');
    const stars = workshop.rating ? `<span class="workshop-rating">★ ${workshop.rating}</span>` : '';
    const approvedBadge = workshop.approvedClub
        ? `<span class="card-approved-badge">${workshop.approvedClub} Approved</span>`
        : '';
    return `
        <div class="workshop-card workshop-sponsor-card" onclick="openWorkshopDetail('${escapeHtml(workshop.id)}')" style="cursor:pointer;">
            <div class="workshop-card-header">
                <div class="workshop-card-name">${escapeHtml(workshop.name)} ${approvedBadge}</div>
                <div class="workshop-card-distance">${escapeHtml(displayDist)}</div>
            </div>
            <div class="workshop-card-specialty">${escapeHtml(workshop.specialty)}</div>
            ${stars ? `<div class="workshop-card-footer">${stars}</div>` : ''}
        </div>
    `;
}

async function openWorkshopDetail(workshopId) {
    let w;
    try { w = await fetchWorkshopById(workshopId); } catch (e) { showToast('Could not load workshop'); return; }
    if (!w) { showToast('Workshop not found'); return; }
    const content = document.getElementById('workshopDetailContent');
    if (!content) { showToast('UI error: detail panel missing'); return; }
    const stars = w.rating ? `★ ${w.rating}` : '';
    const serviceChips = (w.serviceKeys || [])
        .map(s => `<span class="wsd-chip">${escapeHtml(SERVICE_LABELS[s] || s)}</span>`).join('');
    const vehicleChips = (w.vehicleTypes || []).map(v => `<span class="wsd-chip">${escapeHtml(v)}</span>`).join('');
    const wId   = `'${escapeHtml(w.id)}'`;
    const wName = `'${escapeHtml(w.name || '')}'`;
    content.innerHTML = `
        <div class="wsd-hero">
            <div class="wsd-name">${escapeHtml(w.name || '')}</div>
            ${w.address ? `<div class="wsd-loc">📍 ${escapeHtml(w.address)}${w.location ? ', ' + escapeHtml(w.location) : ''}</div>` : w.location ? `<div class="wsd-loc">📍 ${escapeHtml(w.location)}</div>` : ''}
            ${w.phone   ? `<a href="tel:${escapeHtml(w.phone.replace(/\s/g,''))}" class="wsd-phone">📞 ${escapeHtml(w.phone)}</a>` : ''}
            ${w.email   ? `<a href="mailto:${escapeHtml(w.email)}" class="wsd-phone">✉ ${escapeHtml(w.email)}</a>` : ''}
            ${w.website ? `<a href="${escapeHtml(w.website)}" target="_blank" rel="noopener" class="wsd-phone">🌐 ${escapeHtml(w.website.replace(/^https?:\/\//, ''))}</a>` : ''}
            <div class="wsd-meta-row">
                <span class="wsd-rating">${stars}</span>
            </div>
        </div>
        ${w.about ? `<div class="wsd-section"><h4>About</h4><div class="wsd-specialty">${escapeHtml(w.about)}</div></div>` : w.specialty ? `<div class="wsd-section"><h4>About</h4><div class="wsd-specialty">${escapeHtml(w.specialty)}</div></div>` : ''}
        ${serviceChips ? `<div class="wsd-section"><h4>Services</h4><div class="wsd-chips">${serviceChips}</div></div>` : ''}
        ${vehicleChips ? `<div class="wsd-section"><h4>Vehicles we work on</h4><div class="wsd-chips">${vehicleChips}</div></div>` : ''}
        ${w.businessHours ? `<div class="wsd-section"><h4>Business Hours</h4><div class="wsd-hours">${formatBusinessHours(w.businessHours)}</div></div>` : ''}
        <div class="wsd-cta-wrap">
            <button class="wsd-contact-btn" onclick="contactWorkshop(${wId}, ${wName}); closeWorkshopDetailDrawer();">Message Workshop</button>
        </div>
    `;
    openDrawer('workshopDetailDrawer');
}

const WS_DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const WS_DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function renderWsHoursGrid(hours) {
    const grid = document.getElementById('wsHoursGrid');
    if (!grid) return;
    grid.innerHTML = WS_DAYS.map((d, i) => {
        const h = hours[d] || {};
        const isOpen = h.open || false;
        return `<div class="ws-hours-row" id="wsHoursRow_${d}">
            <span class="ws-hours-day">${WS_DAY_LABELS[i]}</span>
            <label class="settings-toggle" style="flex-shrink:0;">
                <input type="checkbox" id="wsHoursOpen_${d}" ${isOpen ? 'checked' : ''} onchange="wsToggleDay('${d}')">
                <span class="settings-toggle-track"></span>
            </label>
            <div class="ws-hours-times" id="wsHoursTimes_${d}" style="${isOpen ? '' : 'display:none;'}">
                <input type="time" id="wsHoursFrom_${d}" value="${escapeHtml(h.from || '08:00')}">
                <span class="ws-hours-sep">–</span>
                <input type="time" id="wsHoursTo_${d}" value="${escapeHtml(h.to || '17:00')}">
            </div>
            <span class="ws-hours-closed" id="wsHoursClosed_${d}" style="${isOpen ? 'display:none;' : ''}">Closed</span>
        </div>`;
    }).join('');
}

function wsToggleDay(d) {
    const isOpen = document.getElementById(`wsHoursOpen_${d}`)?.checked;
    const times  = document.getElementById(`wsHoursTimes_${d}`);
    const closed = document.getElementById(`wsHoursClosed_${d}`);
    if (times)  times.style.display  = isOpen ? '' : 'none';
    if (closed) closed.style.display = isOpen ? 'none' : '';
}

function readWsHoursGrid() {
    const result = {};
    WS_DAYS.forEach(d => {
        const open = document.getElementById(`wsHoursOpen_${d}`)?.checked || false;
        const from = document.getElementById(`wsHoursFrom_${d}`)?.value || '';
        const to   = document.getElementById(`wsHoursTo_${d}`)?.value   || '';
        result[d] = { open, from: open ? from : '', to: open ? to : '' };
    });
    return result;
}

function _fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2,'0')}${ampm}` : `${h12}${ampm}`;
}

function formatBusinessHours(hours) {
    if (!hours) return '';
    return WS_DAYS.map((d, i) => {
        const h = hours[d];
        if (!h || !h.open) return `<span class="wsd-hours-row"><span class="wsd-hours-day">${WS_DAY_LABELS[i]}</span><span class="wsd-hours-closed">Closed</span></span>`;
        return `<span class="wsd-hours-row"><span class="wsd-hours-day">${WS_DAY_LABELS[i]}</span><span class="wsd-hours-time">${_fmtTime(h.from)} – ${_fmtTime(h.to)}</span></span>`;
    }).join('');
}

function closeWorkshopDetailDrawer() {
    const el = document.getElementById('workshopDetailDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}
function onMenuOpenMyListings() {
    closeAccountDropdown();
    _myListingsSelectMode = false;
    _myListingsSelected.clear();
    renderMyParts();
    toggleDrawer('myPartsDrawer');
}

// Re-render the pill, menu, and pro-toggle visibility based on current state
function renderAccountState() {
    const pill           = document.getElementById('accountPill');
    const menuName       = document.getElementById('accountMenuName');
    const menuStatus     = document.getElementById('accountMenuStatus');
    const menuAvatar     = document.getElementById('accountMenuAvatar');
    const menuUpgrade    = document.getElementById('accountMenuUpgrade');

    if (!pill) return;

    pill.classList.remove('signed-out', 'signed-in', 'tier-personal', 'tier-standard', 'tier-trade', 'tier-pro');

    const initial = (currentUserName || 'G').charAt(0).toUpperCase();
    const isMobile = window.innerWidth < 900;
    const pic = userSettings.profilePic || '';
    const avatarInner = pic ? `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">` : initial;
    const tierClass = currentUserTier === 'pro' ? 'pro' : currentUserTier === 'trade' ? 'trade' : '';
    const avatarHTML = `<span class="pill-avatar${tierClass ? ' ' + tierClass : ''}">${avatarInner}</span>`;
    const tierLabel  = currentUserTier === 'pro' ? 'APC Pro' : currentUserTier === 'trade' ? 'APC Trade' : 'APC Personal';

    const signUpPrompt = document.getElementById('signUpPrompt');
    const searchModePill = document.getElementById('searchModeToggle');
    const tierBadge = document.getElementById('tierBadge');
    if (tierBadge) {
        if (userIsSignedIn && (currentUserTier === 'trade' || currentUserTier === 'pro')) {
            tierBadge.className = `tier-badge ${currentUserTier}`;
            tierBadge.textContent = currentUserTier === 'trade' ? 'TRADE' : 'PRO';
            tierBadge.style.display = '';
        } else {
            tierBadge.style.display = 'none';
        }
    }
    if (!userIsSignedIn) {
        pill.classList.add('signed-out');
        pill.innerHTML = 'Sign In';
        if (searchModePill) searchModePill.style.display = 'none';
        if (signUpPrompt) signUpPrompt.style.display = '';
    } else if (currentUserTier === 'pro') {
        pill.classList.add('signed-in', 'tier-pro');
        pill.innerHTML = avatarHTML;
        if (searchModePill) searchModePill.style.display = '';
        if (signUpPrompt) signUpPrompt.style.display = 'none';
    } else {
        const tierCls = currentUserTier === 'trade' ? 'tier-trade' : 'tier-personal';
        pill.classList.add('signed-in', tierCls);
        pill.innerHTML = avatarHTML;
        if (searchModePill) searchModePill.style.display = 'none';
        if (signUpPrompt) signUpPrompt.style.display = 'none';
    }

    // Header border tier colour
    document.body.classList.remove('tier-personal', 'tier-trade', 'tier-pro');
    if (userIsSignedIn && currentUserTier) document.body.classList.add('tier-' + currentUserTier);

    if (menuName)   menuName.textContent   = currentUserName || 'Guest';
    if (menuStatus) {
        menuStatus.classList.remove('pro', 'trade', 'standard');
        menuStatus.classList.add(currentUserTier === 'pro' ? 'pro' : currentUserTier === 'trade' ? 'trade' : 'standard');
        menuStatus.textContent = currentUserTier === 'pro'      ? 'APC Pro member' :
                                 currentUserTier === 'trade'    ? 'APC Trade member' :
                                 currentUserTier === 'personal' ? 'APC Personal member' : '';
    }
    if (menuAvatar) {
        if (pic) {
            menuAvatar.innerHTML = `<img src="${escapeHtml(pic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
            menuAvatar.style.background = 'transparent';
        } else {
            menuAvatar.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
            menuAvatar.style.background = currentUserTier === 'pro' ? 'var(--tier-pro)' : currentUserTier === 'trade' ? 'var(--tier-trade)' : 'var(--tier-personal)';
        }
    }
    if (menuUpgrade) {
        const showMenuUpgrade = currentUserTier === 'personal' || currentUserTier === 'trade';
        menuUpgrade.style.display = showMenuUpgrade ? 'flex' : 'none';
        if (showMenuUpgrade) menuUpgrade.textContent = currentUserTier === 'trade' ? 'Upgrade to Pro ›' : 'Upgrade to Trade — Free ›';
    }
    if (searchModePill) searchModePill.style.display = 'none';

    // Update bottom nav profile circle
    const navProfileCircle = document.getElementById('navProfileCircle');
    if (navProfileCircle) {
        if (!userIsSignedIn) {
            navProfileCircle.className = 'nav-profile-circle signed-out';
            navProfileCircle.innerHTML = 'Sign In';
        } else {
            navProfileCircle.className = `nav-profile-circle${currentUserTier === 'pro' ? ' pro' : currentUserTier === 'trade' ? ' trade' : ''}`;
            navProfileCircle.innerHTML = pic ? `<img src="${escapeHtml(pic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">` : initial;
        }
    }
    const isPro = userIsSignedIn && currentUserTier === 'pro';
    const dtbDash   = document.getElementById('dtbDashboard');
    const amenuDash = document.getElementById('amenuDashboard');
    if (dtbDash)   dtbDash.style.display   = isPro ? 'flex' : 'none';
    if (amenuDash) amenuDash.style.display = isPro ? 'flex' : 'none';
    const amenuEdw       = document.getElementById('amenuEdw');
    const amenuWarehouse = document.getElementById('amenuWarehouse');
    if (amenuEdw)       amenuEdw.style.display       = isPro ? 'flex' : 'none';
    if (amenuWarehouse) amenuWarehouse.style.display = isPro ? 'flex' : 'none';
    const proNavWarehouse = document.getElementById('proNavWarehouse');
    if (proNavWarehouse) proNavWarehouse.style.display = isPro ? '' : 'none';

    const headerInboxBtn   = document.getElementById('headerInboxBtn');
    const dtbMessages      = document.getElementById('dtbMessages');
    const desktopInboxItem = document.getElementById('desktopInboxItem');
    if (headerInboxBtn) {
        headerInboxBtn.style.display = userIsSignedIn ? '' : 'none';
        headerInboxBtn.classList.toggle('signed-in', userIsSignedIn);
    }
    if (dtbMessages)      dtbMessages.style.display      = userIsSignedIn ? '' : 'none';
    if (desktopInboxItem) desktopInboxItem.style.display = userIsSignedIn ? '' : 'none';

    // Top bar full nav + avatar (desktop only)
    const dtbNavItems = document.getElementById('dtbNavItems');
    const dtbAvatar   = document.getElementById('dtbAvatar');
    if (dtbNavItems) dtbNavItems.style.display = userIsSignedIn ? 'flex' : 'none';
    if (dtbAvatar) {
        dtbAvatar.style.display = userIsSignedIn ? 'flex' : 'none';
        if (userIsSignedIn) {
            if (pic) {
                dtbAvatar.innerHTML = `<img src="${escapeHtml(pic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
                dtbAvatar.style.background = 'transparent';
            } else {
                dtbAvatar.textContent = initial;
                dtbAvatar.style.background = currentUserTier === 'pro' ? 'var(--tier-pro)' : currentUserTier === 'trade' ? 'var(--tier-trade)' : 'var(--tier-personal)';
            }
        }
    }

    // On desktop when signed in: show "List a Part" button, hide the avatar pill
    const headerListBtn  = document.getElementById('headerListBtn');
    const desktopSignedIn = !isMobile && userIsSignedIn;
    if (pill)          pill.style.display          = desktopSignedIn ? 'none' : '';
    if (headerListBtn) headerListBtn.style.display = desktopSignedIn ? ''     : 'none';

    // Sync desktop dropdown
    const ddAvatar  = document.getElementById('acctDdAvatar');
    const ddName    = document.getElementById('acctDdName');
    const ddTier    = document.getElementById('acctDdTier');
    const ddUpgrade = document.getElementById('acctDdUpgrade');
    const ddDash    = document.getElementById('acctDdDashboard');
    if (ddAvatar) {
        if (pic) {
            ddAvatar.innerHTML = `<img src="${escapeHtml(pic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
            ddAvatar.style.background = 'transparent';
        } else {
            ddAvatar.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
            ddAvatar.style.background = currentUserTier === 'pro' ? 'var(--tier-pro)' : currentUserTier === 'trade' ? 'var(--tier-trade)' : 'var(--tier-personal)';
        }
    }
    if (ddName)    ddName.textContent = currentUserName || 'Guest';
    if (ddTier) {
        ddTier.textContent  = currentUserTier === 'pro' ? 'APC Pro' : currentUserTier === 'trade' ? 'APC Trade' : currentUserTier === 'personal' ? 'APC Personal' : '';
        ddTier.classList.toggle('pro', isPro);
    }
    if (ddUpgrade) {
        const showUpgrade = currentUserTier === 'personal' || currentUserTier === 'trade';
        ddUpgrade.style.display = showUpgrade ? 'flex' : 'none';
        if (showUpgrade) ddUpgrade.textContent = currentUserTier === 'trade' ? 'Upgrade to Pro ›' : 'Upgrade to Trade — Free ›';
    }
    if (ddDash)     ddDash.style.display      = isPro ? 'flex' : 'none';

    maybeShowProDashboardBanner();
    updateSellFittingToggleVisibility();
    updateSellQuantityVisibility();
    updateWarehouseBinVisibility();

    if (_pendingPutAway && isPro) {
        _pendingPutAway = false;
        setTimeout(() => { openWarehouseDrawer(); whSetTab('scanner'); }, 400);
    }

    // Header height changes when the pro toggle appears/disappears, so re-sync the grid offset.
    updateHeaderOffset();
}

// Keep the results-grid pushed below the fixed header — replaces the old hardcoded margin-top: 155px
function updateHeaderOffset() {
    const header           = document.getElementById('mainHeader');
    const grid             = document.getElementById('mainGrid');
    const topBar           = document.getElementById('desktopTopBar');
    const rightPanel       = document.getElementById('desktopRightPanel');
    const filterDrawer     = document.getElementById('filterDrawer');
    const detailOverlay    = document.getElementById('detailOverlay');
    const storefrontDrawer = document.getElementById('storefrontDrawer');
    const garageDrawer        = document.getElementById('garageDrawer');
    const addVehicleDrawer    = document.getElementById('addVehicleDrawer');
    const addWantedDrawer     = document.getElementById('addWantedDrawer');
    const savedPartsDrawer    = document.getElementById('savedPartsDrawer');
    const settingsDrawer      = document.getElementById('settingsDrawer');
    const profileDrawer       = document.getElementById('profileDrawer');
    const wantedListDrawer    = document.getElementById('wantedListDrawer');
    const myPartsDrawer       = document.getElementById('myPartsDrawer');
    const workshopDrawer      = document.getElementById('workshopDrawer');
    const recentlyViewedDrawer= document.getElementById('recentlyViewedDrawer');
    const inboxDrawer         = document.getElementById('inboxDrawer');
    const messageDetailDrawer = document.getElementById('messageDetailDrawer');
    const chatDrawer          = document.getElementById('chatDrawer');
    const helpDrawer          = document.getElementById('helpDrawer');
    const accountDropdown     = document.getElementById('accountDropdown');
    if (header && grid) {
        const topBarH   = topBar ? topBar.offsetHeight : 0;
        const totalH    = header.offsetHeight + topBarH;
        const mainContentArea = document.getElementById('mainContentArea');
        if (mainContentArea) {
            mainContentArea.style.marginTop = totalH + 'px';
        } else {
            grid.style.marginTop = totalH + 'px';
        }

        const sellOverlay    = document.getElementById('sellOverlay');
        const authDrawer     = document.getElementById('authDrawer');
        const dashView       = document.getElementById('dashboardView');
        const drawerBackdrop = document.getElementById('drawerBackdrop');

        const proHdr    = document.getElementById('proHeader');
        const proOpen   = proHdr && proHdr.style.display !== 'none';
        const drawerTop = proOpen ? (proHdr.offsetHeight || 54) : totalH;

        // Filter drawer always sits flush below the header on all screen sizes
        if (filterDrawer)    filterDrawer.style.top    = drawerTop + 'px';
        if (drawerBackdrop)  drawerBackdrop.style.top  = drawerTop + 'px';

        if (window.innerWidth >= 900) {
            // On desktop drawers slide in below the header — on mobile they cover it (top:0 via CSS)
            if (detailOverlay)        detailOverlay.style.top        = drawerTop + 'px';
            if (sellOverlay)          sellOverlay.style.top          = drawerTop + 'px';
            const warehouseDrawer = document.getElementById('warehouseDrawer');
            if (warehouseDrawer)      warehouseDrawer.style.top      = drawerTop + 'px';
            if (storefrontDrawer)     storefrontDrawer.style.top     = drawerTop + 'px';
            if (garageDrawer)         garageDrawer.style.top         = drawerTop + 'px';
            // addVehicleDrawer + addWantedDrawer are floating cards — top is fixed at 50% via CSS, not offset-driven
            if (wantedListDrawer)     wantedListDrawer.style.top     = drawerTop + 'px';
            if (savedPartsDrawer)     savedPartsDrawer.style.top     = drawerTop + 'px';
            if (settingsDrawer)       settingsDrawer.style.top       = drawerTop + 'px';
            if (profileDrawer)        profileDrawer.style.top        = drawerTop + 'px';
            if (myPartsDrawer)        myPartsDrawer.style.top        = drawerTop + 'px';
            if (workshopDrawer)       workshopDrawer.style.top       = drawerTop + 'px';
            const vehicleMakesDrawer = document.getElementById('vehicleMakesDrawer');
            if (vehicleMakesDrawer)   vehicleMakesDrawer.style.top   = drawerTop + 'px';
            if (recentlyViewedDrawer) recentlyViewedDrawer.style.top = drawerTop + 'px';
            if (inboxDrawer)          inboxDrawer.style.top          = drawerTop + 'px';
            if (messageDetailDrawer)  messageDetailDrawer.style.top  = drawerTop + 'px';
            if (chatDrawer)           chatDrawer.style.top           = drawerTop + 'px';
            if (helpDrawer)           helpDrawer.style.top           = drawerTop + 'px';
            if (authDrawer)           authDrawer.style.top           = drawerTop + 'px';
            if (dashView)             dashView.style.top             = drawerTop + 'px';
            if (rightPanel)           rightPanel.style.top           = drawerTop + 'px';
            if (accountDropdown)      accountDropdown.style.top      = proOpen ? (drawerTop + 8) + 'px' : (topBarH + 8) + 'px';
        }
    }
}

window.addEventListener('resize', updateHeaderOffset);
// Re-run after images load — logo height affects the header height calculation
window.addEventListener('load', updateHeaderOffset);

// --- SEARCH MODE TOGGLE ---

// --- DEBOUNCE UTILITY ---
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// --- AUTO-HIDE BOTTOM NAV ON SCROLL ---
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;
    bottomNav.style.transition = 'transform 0.3s ease-in-out';
    if (window.scrollY > lastScrollY && window.scrollY > 50) {
        bottomNav.style.transform = 'translateY(100%)';
    } else {
        bottomNav.style.transform = 'translateY(0)';
    }
    lastScrollY = window.scrollY;
});

window.addEventListener('scroll', () => {
    const inner = document.getElementById('drpScrollInner');
    if (inner) inner.style.transform = `translateY(-${window.scrollY}px)`;
}, { passive: true });

// Update the active dot as the carousel is swiped/scrolled
function updateCarouselActiveDot() {
    const carousel = document.getElementById('imageCarousel');
    const dots = document.querySelectorAll('#carouselDots .carousel-dot');
    if (!carousel || !dots.length) return;
    const idx = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
}

// --- QR LABEL ---

function printPartLabel(partId) {
    const part = getPartById(partId) || findPartAnywhere(partId);
    if (!part) { showToast('Listing not found'); return; }
    openLabelPrintTab(part);
}

// --- OFFER SHEET ---

function openOfferSheet(partId) {
    const part = findPartAnywhere(partId);
    if (!part) return;
    if (!userIsSignedIn) { openAuthDrawer(() => openOfferSheet(partId)); return; }
    // Block self-offers
    if ((currentUserId && part.sellerId === currentUserId) || part.seller === getCurrentSellerName()) return;
    const info = document.getElementById('offerSheetPartInfo');
    if (info) {
        info.innerHTML = `<div class="offer-sheet-part-title">${escapeHtml(part.title)}</div>
            <div class="offer-sheet-listed-price">Listed price: <strong>$${part.price}</strong> — your offer can be below this</div>`;
    }
    document.getElementById('offerPriceInput').value = '';
    document.getElementById('offerNoteInput').value  = '';
    document.getElementById('offerSheetBackdrop').style.display = 'block';
    document.getElementById('offerSheet').classList.add('active');
}

function closeOfferSheet() {
    document.getElementById('offerSheet').classList.remove('active');
    document.getElementById('offerSheetBackdrop').style.display = 'none';
}

function submitOffer() {
    const part  = findPartAnywhere(currentOpenPartId);
    if (!part) return;
    const price = parseFloat(document.getElementById('offerPriceInput').value);
    if (!price || price < 1)  { showToast('Please enter a valid offer amount (minimum $1)'); return; }
    if (price >= part.price)  { showToast(`Offer must be below the listed price of $${part.price}`); return; }
    const note  = document.getElementById('offerNoteInput').value.trim();

    const offer = {
        id: nextOfferId(), partId: part.id, partTitle: part.title,
        partImg: part.images[0], listedPrice: part.price, offerPrice: price,
        buyerNote: note, buyer: currentUserName || 'Buyer',
        date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'pending', counterPrice: null
    };
    offersDb.push(offer);
    saveOffers();

    // Route offer into inbox conversation with seller
    const offerPartId = part.supabaseId || part.id;
    let conv = conversations.find(c => c.partId === offerPartId || c.partId === part.id);
    if (!conv) {
        conv = { id: nextConvId(), with: part.seller, partId: offerPartId, unread: false, msgs: [] };
        conversations.push(conv);
    }
    conv.msgs.push({
        id: nextMsgId(conv), sent: true, time: 'Today', clock: nowClock(),
        text: `I'd like to offer $${price} for your ${part.title}.`,
        offerCard: {
            offerId: offer.id, partTitle: part.title, partImg: part.images[0],
            listedPrice: part.price, offerPrice: price, buyerNote: note, status: 'pending'
        }
    });
    saveConversations();
    updateInboxBadge();

    syncOfferMessageToSupabase(conv, `I'd like to offer $${price} for your ${part.title}.`, {
        partTitle: part.title, partImg: part.images[0],
        listedPrice: part.price, offerPrice: price,
        buyerNote: note, status: 'pending',
    });

    closeOfferSheet();
    showToast(`Offer of $${price} sent to ${part.seller}!`);
    onOpenInbox();
    setTimeout(() => openInboxConv(conv.id), 220);
}

function acceptOfferCard(convId, msgIdx) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.msgs[msgIdx];
    if (!msg?.offerCard) return;
    msg.offerCard.status = 'accepted';
    const responseText = `Offer accepted! Message me here to arrange payment and pickup.`;
    conv.msgs.push({ id: nextMsgId(conv), sent: true, time: 'Today', clock: nowClock(), text: responseText });
    saveConversations();
    renderInboxMsgs(conv);
    renderInboxConvList();
    syncInboxPendingBtn();
    showToast('Offer accepted!');
    if (conv.supabaseConvId && currentUserId) {
        const isBuyer = conv.buyerId === currentUserId;
        if (msg.supabaseMsgId) sb.from('messages').update({ offer_data: msg.offerCard }).eq('id', msg.supabaseMsgId);
        syncMessageToSupabase(conv.supabaseConvId, responseText, isBuyer);
    }
    // Prompt seller to mark the listing as sold
    const listing = userListings.find(l => l.id === conv.partId);
    if (listing && listing.status !== 'sold') {
        setTimeout(() => showConfirmDialog(
            'Mark as Sold?',
            `Would you like to mark "${listing.title}" as sold now?`,
            'Mark Sold',
            () => {
                listing.status   = 'sold';
                listing.soldDate = Date.now();
                saveUserListings();
                syncInboxPendingBtn();
                renderMainGrid();
                renderMyParts();
                if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
                syncListingStatusToSupabase(listing, 'sold');
                showToast('Listing marked as sold!');
            }
        ), 400);
    }
}

function declineOfferCard(convId, msgIdx) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.msgs[msgIdx];
    if (!msg?.offerCard) return;
    msg.offerCard.status = 'declined';
    const responseText = `Thanks for the offer — it's not quite what I'm looking for at the moment.`;
    conv.msgs.push({ id: nextMsgId(conv), sent: true, time: 'Today', clock: nowClock(), text: responseText });
    saveConversations();
    renderInboxMsgs(conv);
    renderInboxConvList();
    showToast('Offer declined.');
    if (conv.supabaseConvId && currentUserId) {
        const isBuyer = conv.buyerId === currentUserId;
        if (msg.supabaseMsgId) sb.from('messages').update({ offer_data: msg.offerCard }).eq('id', msg.supabaseMsgId);
        syncMessageToSupabase(conv.supabaseConvId, responseText, isBuyer);
    }
}

function showCounterForm(convId, msgIdx) {
    document.getElementById(`offer-actions-${convId}-${msgIdx}`)?.style.setProperty('display','none');
    document.getElementById(`offer-counter-${convId}-${msgIdx}`)?.style.setProperty('display','flex');
    document.getElementById(`offer-counter-input-${convId}-${msgIdx}`)?.focus();
t}

function submitCounter(convId, msgIdx) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.msgs[msgIdx];
    if (!msg?.offerCard) return;
    const input = document.getElementById(`offer-counter-input-${convId}-${msgIdx}`);
    const counterPrice = parseFloat(input?.value);
    if (!counterPrice || counterPrice < 1) { showToast('Enter a valid counter price'); return; }
    msg.offerCard.status = 'countered';
    msg.offerCard.counterPrice = counterPrice;
    const counterText = `I can do $${counterPrice} — happy to arrange from there.`;
    const counterOfferData = { ...msg.offerCard, offerPrice: counterPrice, status: 'pending', isCounter: true, counterPrice: null };
    conv.msgs.push({
        id: nextMsgId(conv), sent: true, time: 'Today', clock: nowClock(),
        text: counterText, offerCard: counterOfferData,
    });
    saveConversations();
    renderInboxMsgs(conv);
    renderInboxConvList();
    showToast(`Counter offer of $${counterPrice} sent.`);
    if (conv.supabaseConvId && currentUserId) {
        if (msg.supabaseMsgId) sb.from('messages').update({ offer_data: msg.offerCard }).eq('id', msg.supabaseMsgId);
        syncOfferMessageToSupabase(conv, counterText, counterOfferData);
    }
}

function acceptOffer(offerId) {
    // Route through inbox offer card so Supabase stays in sync
    for (const conv of conversations) {
        const msgIdx = conv.msgs.findIndex(m => m.offerCard?.offerId === offerId);
        if (msgIdx !== -1) { acceptOfferCard(conv.id, msgIdx); renderDashListings('pending'); return; }
    }
    // Fallback if no conversation found
    const o = offersDb.find(x => x.id === offerId);
    if (!o) return;
    o.status = 'accepted';
    saveOffers();
    showToast('Offer accepted — congrats on the sale!');
    renderDashListings('pending');
}

function declineOffer(offerId) {
    // Route through inbox offer card so Supabase stays in sync
    for (const conv of conversations) {
        const msgIdx = conv.msgs.findIndex(m => m.offerCard?.offerId === offerId);
        if (msgIdx !== -1) { declineOfferCard(conv.id, msgIdx); renderDashListings('pending'); return; }
    }
    // Fallback if no conversation found
    offersDb = offersDb.filter(x => x.id !== offerId);
    saveOffers();
    showToast('Offer declined');
    renderDashListings('pending');
}

function showCounterInput(offerId) {
    const row = document.getElementById('counter-row-' + offerId);
    if (row) row.style.display = row.style.display === 'none' ? 'flex' : 'none';
}

function submitCounterOffer(offerId) {
    const input = document.getElementById('counter-input-' + offerId);
    const price = parseFloat(input?.value);
    if (!price || price <= 0) { showToast('Enter a valid counter price'); return; }
    const o = offersDb.find(x => x.id === offerId);
    if (!o) return;
    o.status       = 'countered';
    o.counterPrice = price;
    saveOffers();
    showToast(`Counter offer of $${price} sent to ${o.buyer}`);
    renderDashListings('pending');
}

function markSold(partId) {
    const listing = userListings.find(l => l.id === partId);
    if (!listing) return;
    showConfirmDialog(
        'Mark as Sold',
        `Mark "${listing.title}" as sold? It will move to your sold history.`,
        'Mark Sold',
        () => {
            listing.status   = 'sold';
            listing.soldDate = Date.now();
            saveUserListings();
            renderMainGrid();
            renderMyParts();
            renderDashboard();
            showToast('Listing marked as sold');
            syncListingStatusToSupabase(listing, 'sold');
            _postSoldRatePrompts(listing);
            if (!listing.buyerRating) setTimeout(() => showRateBuyerDialog(listing.id), 400);
        }
    );
}


function relistPart(partId) {
    const listing = userListings.find(l => l.id === partId);
    if (!listing) return;
    listing.status   = 'active';
    listing.soldDate = null;
    saveUserListings();
    renderMainGrid();
    renderMyParts();
    renderDashboard();
    showToast('Listing relisted as active');
    syncListingStatusToSupabase(listing, 'active');
}

async function _postSoldRatePrompts(listing, targetConvId) {
    const listingId = listing.supabaseId || listing.id;
    const convs = targetConvId
        ? conversations.filter(c => c.id === targetConvId)
        : conversations.filter(c => c.partId === listing.supabaseId || c.partId === listing.id);
    for (const conv of convs) {
        if (!conv.buyerId || conv.buyerId === currentUserId) continue; // skip if no real buyer or seller talking to themselves
        const card = {
            type:         'rate_prompt',
            listingId,
            listingTitle: listing.title || '',
            buyerName:    conv.buyerName  || conv.with || 'Buyer',
            sellerName:   conv.sellerName || currentUserName || 'Seller',
        };
        const msg = { id: nextMsgId(conv), sent: false, text: '', offerCard: card, time: 'Today', clock: nowClock(), timestamp: Date.now() };
        conv.msgs = conv.msgs || [];
        conv.msgs.push(msg);
        if (sb && conv.supabaseConvId) {
            try {
                await sb.from('messages').insert({
                    conversation_id: conv.supabaseConvId,
                    sender_id:       currentUserId,
                    sender_name:     currentUserName,
                    text:            '',
                    offer_data:      card,
                });
            } catch(e) {}
        }
    }
    saveConversations();
    const openConv = conversations.find(c => c.id === activeConvId);
    if (openConv && convs.find(c => c.id === openConv.id)) renderInboxMsgs(openConv);
    if (_proActiveConvId) {
        const proConv = convs.find(c => c.id === _proActiveConvId);
        if (proConv) proRenderThreadMsgs(proConv);
    }
}

// --- PRO DASHBOARD ---

const PRO_DASHBOARD_BANNER_KEY = 'apc.proDashBannerDismissed';

function maybeShowProDashboardBanner() {
    const banner = document.getElementById('proDashboardBanner');
    if (!banner) return;
    const isPro = userIsSignedIn && currentUserTier === 'pro';
    const dismissed = localStorage.getItem(PRO_DASHBOARD_BANNER_KEY);
    banner.style.display = (isPro && !dismissed && window.innerWidth < 900) ? 'flex' : 'none';
}

function dismissProDashboardBanner() {
    localStorage.setItem(PRO_DASHBOARD_BANNER_KEY, '1');
    const banner = document.getElementById('proDashboardBanner');
    if (banner) banner.style.display = 'none';
}

function onDashboardMenuTap() {
    if (window.innerWidth >= 900) {
        openDashboard();
        closeAccountMenu();
    } else {
        showToast('Your Pro Dashboard is available when you open APC on desktop');
        closeAccountMenu();
    }
}

let _dashJobsPollInterval = null;

function openDashboard() {
    if (window.innerWidth < 900) return;
    if (!userIsSignedIn || currentUserTier !== 'pro') { showToast('Pro Dashboard requires APC Pro membership'); return; }
    setDtbActive('dtbDashboard');
    const fd      = document.getElementById('filterDrawer');
    const rp      = document.querySelector('.desktop-right-panel');
    const topBar  = document.getElementById('desktopTopBar');
    const hdr     = document.getElementById('mainHeader');
    const proHdr  = document.getElementById('proHeader');
    const dv      = document.getElementById('dashboardView');
    if (fd)     fd.style.setProperty('display', 'none', 'important');
    if (rp)     rp.style.display = 'none';
    if (topBar) topBar.style.setProperty('display', 'none', 'important');
    if (hdr)    hdr.style.setProperty('display', 'none', 'important');
    document.querySelectorAll('.drawer.active').forEach(d => d.classList.remove('active'));
    // Show dashboard FIRST so it's never stranded hidden
    if (dv) {
        dv.style.top     = '54px';
        dv.style.display = 'block';
    }
    if (proHdr) {
        proHdr.style.display = 'block';
        try { renderProHeader(); } catch(e) { /* non-fatal */ }
    }
    syncBackdrop();
    closeAccountMenu();
    closeAccountDropdown();
    renderDashboard();
    clearInterval(_dashJobsPollInterval);
    _dashJobsPollInterval = setInterval(renderDashJobs, 30000);
}

function closeDashboard() {
    const dv = document.getElementById('dashboardView');
    if (!dv || dv.style.display === 'none') return;
    // In Pro mode the dashboard is the persistent base layer — ignore auto-close calls
    const proHdr = document.getElementById('proHeader');
    if (proHdr && proHdr.style.display !== 'none') return;
    clearInterval(_dashJobsPollInterval);
    dv.style.display = 'none';
    setDtbActive(null);
    if (window.innerWidth >= 900) {
        const fd     = document.getElementById('filterDrawer');
        const rp     = document.querySelector('.desktop-right-panel');
        const topBar = document.getElementById('desktopTopBar');
        const hdr    = document.getElementById('mainHeader');
        if (fd)     fd.style.removeProperty('display');
        if (rp)     rp.style.removeProperty('display');
        if (topBar) topBar.style.removeProperty('display');
        if (hdr)    hdr.style.removeProperty('display');
    }
    updateHeaderOffset();
    syncBackdrop();
}

function exitProMode() {
    const proHdr = document.getElementById('proHeader');
    if (proHdr) proHdr.style.display = 'none';
    closeDashboard();
    setDtbActive(null);
    clearInterval(_dashJobsPollInterval);
    const dv = document.getElementById('dashboardView');
    if (dv) dv.style.display = 'none';
    if (window.innerWidth >= 900) {
        const fd     = document.getElementById('filterDrawer');
        const rp     = document.querySelector('.desktop-right-panel');
        const topBar = document.getElementById('desktopTopBar');
        const hdr    = document.getElementById('mainHeader');
        if (fd)     fd.style.removeProperty('display');
        if (rp)     rp.style.removeProperty('display');
        if (topBar) topBar.style.removeProperty('display');
        if (hdr)    hdr.style.removeProperty('display');
    }
    updateHeaderOffset();
    syncBackdrop();
    dtbGoHome();
}

function proGoToDashboard() {
    proHideAllViews();
    _proActiveConvId = null;
    document.querySelectorAll('.pro-hdr-link').forEach(l => l.classList.remove('pro-hdr-active'));
    document.getElementById('proNavDash')?.classList.add('pro-hdr-active');
    syncBackdrop();
}

let _proFolder = 'selling';
let _proActiveConvId = null;

function _pauseEdw() {
    const drawer = document.getElementById('edwDrawer');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
}

function _pauseWarehouse() {
    const drawer = document.getElementById('warehouseDrawer');
    if (drawer) drawer.classList.remove('active');
}

function _edwHasActiveSession() {
    return _edwStep > 0 || !!_edwJobId;
}

function proShowView(viewId, navId) {
    _pauseEdw();
    _pauseWarehouse();
    ['proEnquiriesView', 'proListingsView', 'proStockView'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const inner = document.getElementById('dashInner');
    if (inner) inner.style.display = 'none';
    const view = document.getElementById(viewId);
    if (view) view.style.display = 'flex';
    document.querySelectorAll('.pro-hdr-link').forEach(l => l.classList.remove('pro-hdr-active'));
    document.getElementById(navId)?.classList.add('pro-hdr-active');
    syncBackdrop(); // _pauseEdw cleared body overflow — re-lock the marketplace behind the view
}

function proHideAllViews() {
    _pauseEdw();
    _pauseWarehouse();
    ['proEnquiriesView', 'proListingsView', 'proStockView'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const inner = document.getElementById('dashInner');
    if (inner) inner.style.display = '';
    _dashListingsCtx = 'dash';
}

// In-app refresh: re-pull data and re-render the current Pro view WITHOUT a browser
// reload (a real reload drops the user back to the home page, since the view isn't
// in the URL). Lets a Pro user pick up bin/location/quote updates and stay put.
async function proRefresh() {
    const btn = document.getElementById('proNavRefresh');
    btn?.classList.add('pro-hdr-refreshing');
    const vis = id => { const el = document.getElementById(id); return el && el.style.display !== 'none' && el.style.display !== ''; };
    try {
        if (currentUserId) await loadUserListingsFromSupabase(currentUserId);
        if (vis('proListingsView')) {
            await _loadQuotedListingsMap();
            _updateProLstTabCounts();
            const idx = [...document.querySelectorAll('#proLstTabs .dash-tab')].findIndex(b => b.classList.contains('active'));
            renderDashListings(['active', 'pending', 'sold'][idx] || 'active', null, 'pro');
        } else if (vis('proStockView')) {
            _slLoadTodaysQuotes();
            _slLoadMarkers();
        } else if (vis('proEnquiriesView')) {
            if (currentUserId) await loadConversationsFromSupabase(currentUserId);
            proRenderConvList(); proUpdateFolderBadges();
        } else {
            renderDashboard();
        }
        showToast('Refreshed');
    } catch (e) {
        showToast('Refresh failed — try again');
    } finally {
        btn?.classList.remove('pro-hdr-refreshing');
    }
}

function proOpenMyListings(tab) {
    proShowView('proListingsView', 'proNavListings');
    const openTab = tab || _dashCurrentTab || 'active';
    const tabBtns = document.querySelectorAll('#proLstTabs .dash-tab');
    const tabIdx  = ['active','pending','sold'].indexOf(openTab);
    tabBtns.forEach((b, i) => b.classList.toggle('active', i === tabIdx));
    _updateProLstTabCounts();
    renderDashListings(openTab, null, 'pro');
    // Load quote-interest badges in the background, then refresh the active tab
    _loadQuotedListingsMap().then(() => {
        const active = [...document.querySelectorAll('#proLstTabs .dash-tab')].findIndex(b => b.classList.contains('active'));
        if (active === 0 && document.getElementById('proListingsView')?.style.display !== 'none') renderDashListings('active', null, 'pro');
    });
}

function _updateProLstTabCounts() {
    const tabs = document.querySelectorAll('#proLstTabs .dash-tab');
    if (!tabs.length) return;
    const sellerName = getCurrentSellerName();
    const activeCount  = userListings.filter(p => p.status !== 'sold' && p.status !== 'removed').length;
    const pendingCount = offersDb.filter(o => { const p = getPartById(o.partId); return p && p.seller === sellerName && o.status === 'pending'; }).length;
    const soldCount    = userListings.filter(p => p.status === 'sold').length;
    const labels = ['active','pending','sold'];
    const counts = [activeCount, pendingCount, soldCount];
    tabs.forEach((b, i) => {
        const label = labels[i].charAt(0).toUpperCase() + labels[i].slice(1);
        b.textContent = counts[i] ? `${label} (${counts[i]})` : label;
    });
}

function proOpenEnquiries() {
    proShowView('proEnquiriesView', 'proNavMessages');
    proSetFolder('selling');
    if (currentUserId) loadConversationsFromSupabase(currentUserId).then(() => { proRenderConvList(); proUpdateFolderBadges(); });
    else proRenderConvList();
}

function proSetFolder(folder) {
    _proFolder = folder;
    _proActiveConvId = null;
    document.querySelectorAll('.pro-mail-folder').forEach(el => el.classList.remove('active'));
    document.getElementById('proFolder' + folder.charAt(0).toUpperCase() + folder.slice(1))?.classList.add('active');
    const titles = { selling:'Messages — Selling', buying:'Messages — Buying', notifications:'Notifications', trash:'Trash' };
    const titleEl = document.getElementById('proMailFolderTitle');
    if (titleEl) titleEl.textContent = titles[folder] || folder;
    proShowThreadEmpty();
    proRenderConvList();
}

function proUpdateFolderBadges() {
    const sellingUnread = conversations.filter(c => c.sellerId === currentUserId && c.unread).length;
    const buyingUnread  = conversations.filter(c => c.buyerId  === currentUserId && c.unread).length;
    const sb1 = document.getElementById('proFolderSellingBadge');
    const sb2 = document.getElementById('proFolderBuyingBadge');
    if (sb1) { sb1.textContent = sellingUnread || ''; sb1.style.display = sellingUnread ? '' : 'none'; }
    if (sb2) { sb2.textContent = buyingUnread  || ''; sb2.style.display = buyingUnread  ? '' : 'none'; }
    const trashCount = trashedConversations.filter(c => c.sellerId === currentUserId || c.buyerId === currentUserId).length;
    const tb = document.getElementById('proFolderTrashBadge');
    if (tb) { tb.textContent = trashCount || ''; tb.style.display = trashCount ? '' : 'none'; }
    const countEl = document.getElementById('proMailCount');
    if (countEl) {
        const total = proGetFolderConvs().length;
        countEl.textContent = total ? total + ' conversations' : '';
    }
}

function proGetFolderConvs(q) {
    let convs = [];
    if (_proFolder === 'selling')       convs = conversations.filter(c => c.sellerId === currentUserId);
    else if (_proFolder === 'buying')   convs = conversations.filter(c => c.buyerId  === currentUserId);
    else if (_proFolder === 'trash')    convs = trashedConversations.filter(c => c.sellerId === currentUserId || c.buyerId === currentUserId);
    else                                convs = [];
    if (q) {
        const lq = q.toLowerCase();
        convs = convs.filter(c => getConvPartTitle(c).toLowerCase().includes(lq) || (c.buyerName || c.sellerName || '').toLowerCase().includes(lq));
    }
    return convs.sort((a, b) => {
        const aTime = a.msgs?.length ? a.msgs[a.msgs.length-1]?.timestamp || 0 : 0;
        const bTime = b.msgs?.length ? b.msgs[b.msgs.length-1]?.timestamp || 0 : 0;
        return bTime - aTime;
    });
}

function proFilterConvs(val) { proRenderConvList(val); }

function proRenderConvList(filter) {
    const list = document.getElementById('proInboxConvList');
    if (!list) return;
    const q = filter !== undefined ? filter : (document.getElementById('proInboxSearch')?.value || '');
    const convs = proGetFolderConvs(q);
    proUpdateFolderBadges();
    if (!convs.length) {
        list.innerHTML = `<div class="pro-mail-empty-list">${q ? 'No conversations match your search' : 'No conversations in this folder'}</div>`;
        return;
    }
    list.innerHTML = convs.map(c => {
        const isSelling = c.sellerId === currentUserId;
        const otherName = escapeHtml(isSelling ? (c.buyerName || 'Buyer') : (c.sellerName || 'Seller'));
        const initial   = otherName[0]?.toUpperCase() || '?';
        const partTitle = escapeHtml(getConvPartTitle(c));
        const lastMsg   = c.msgs?.length ? c.msgs[c.msgs.length - 1] : null;
        const preview   = lastMsg ? escapeHtml(lastMsg.text || '').slice(0, 80) : '';
        const isUnread  = c.unread;
        const ts        = lastMsg?.timestamp ? relativeTime(new Date(lastMsg.timestamp)) : '';
        const dot       = isUnread ? '<div class="pro-mail-unread-dot"></div>' : '';
        const isTrash = _proFolder === 'trash';
        const actions = isTrash
            ? `<div class="pro-mail-row-actions">
                <button class="pro-mail-row-act" onclick="event.stopPropagation();restoreConversation(${c.id});proRenderConvList();proUpdateFolderBadges();" title="Restore">↩</button>
                <button class="pro-mail-row-act" onclick="event.stopPropagation();permanentDeleteConversation(${c.id});proRenderConvList();proUpdateFolderBadges();" title="Delete permanently">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>`
            : `<div class="pro-mail-row-actions">
                <button class="pro-mail-row-act${c.flagged ? ' flagged' : ''}" onclick="event.stopPropagation();proFlagConv(${c.id})" title="${c.flagged ? 'Unflag' : 'Flag'}">⚑</button>
                <button class="pro-mail-row-act" onclick="event.stopPropagation();proDeleteConv(${c.id})" title="Delete">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>`;
        return `<div class="pro-mail-row${c.id === _proActiveConvId ? ' active' : ''}${isUnread ? ' unread' : ''}${c.flagged ? ' flagged' : ''}" onclick="${isTrash ? '' : `proOpenConv(${c.id})`}">
            ${dot}
            <div class="pro-mail-avatar">${initial}</div>
            <div class="pro-mail-row-body">
                <div class="pro-mail-row-top">
                    <div class="pro-mail-sender">${otherName}</div>
                    ${actions}
                    <div class="pro-mail-time">${ts}</div>
                </div>
                <div class="pro-mail-subject">${partTitle}</div>
                <div class="pro-mail-preview">${preview}</div>
            </div>
        </div>`;
    }).join('');
}

function proFlagConv(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conv.flagged = !conv.flagged;
    saveConversations();
    proRenderConvList();
}

function proDeleteConv(id) {
    deleteConversation(id);
    if (_proActiveConvId === id) {
        _proActiveConvId = null;
        proShowThreadEmpty();
    }
    proRenderConvList();
    proUpdateFolderBadges();
}

function proShowThreadEmpty() {
    const empty = document.getElementById('proInboxThreadEmpty');
    const content = document.getElementById('proInboxThreadContent');
    if (empty)   empty.style.display = '';
    if (content) content.style.display = 'none';
}

function proOpenConv(id) {
    _proActiveConvId = id;
    proRenderConvList();
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    const empty   = document.getElementById('proInboxThreadEmpty');
    const content = document.getElementById('proInboxThreadContent');
    if (empty)   empty.style.display = 'none';
    if (content) {
        content.style.display = 'flex';
        const partTitle = escapeHtml(getConvPartTitle(conv));
        const part      = findPartAnywhere(conv.partId);
        const isSelling = conv.sellerId === currentUserId;
        const otherName = escapeHtml(isSelling ? (conv.buyerName || 'Buyer') : (conv.sellerName || 'Seller'));
        content.innerHTML = `
            <div class="pro-mail-empty-msg">
                <div class="pro-mail-thread-hdr">
                    <div class="pro-mail-thread-title">${partTitle}</div>
                    <div class="pro-mail-thread-meta">Conversation with ${otherName}${part ? ' · $' + Number(part.price||0).toLocaleString() : ''}</div>
                </div>
                <div class="pro-mail-thread-msgs" id="proThreadMsgs"></div>
                <div class="pro-mail-thread-reply">
                    <input type="file" id="proPhotoInput${id}" accept="image/*" style="display:none" onchange="proSendPhoto(event,${id})">
                    <button class="pro-mail-photo-btn" onclick="document.getElementById('proPhotoInput${id}').click()" title="Attach photo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                    ${isSelling ? `<button class="pro-mail-quote-btn" onclick="proOpenQuoteFromConv(${id})">Quote</button>` : ''}
                    <textarea class="pro-mail-reply-input" id="proReplyInput" placeholder="Reply…" rows="1" oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();proSendReply(${id});}"></textarea>
                    <button class="pro-mail-reply-send" onclick="proSendReply(${id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </div>
            </div>`;
        proRenderThreadMsgs(conv);
        proRenderContextPanel(conv, part);
    }

    // Mark as read
    if (conv.unread && currentUserId) {
        const isBuyer  = conv.buyerId === currentUserId;
        const unreadKey = isBuyer ? 'unread_buyer' : 'unread_seller';
        conv[unreadKey] = false; conv.unread = false;
        if (conv.supabaseConvId) sb.from('conversations').update({[unreadKey]:false}).eq('id', conv.supabaseConvId).then(()=>{});
        proUpdateFolderBadges();
    }
}

async function proRenderContextPanel(conv, part) {
    const panel = document.getElementById('proInboxContextPanel');
    if (!panel) return;
    if (conv?.partId === 'general' || !conv?.partId) {
        panel.innerHTML = `<div class="pro-ctx-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg><div>No listing linked</div></div>`;
        return;
    }
    if (!part && sb) {
        panel.innerHTML = `<div class="pro-ctx-empty" style="font-size:12px;color:#aaa;">Loading listing…</div>`;
        part = await _fetchListingIntoCache(conv.partId);
    }
    if (!part) {
        const fallbackTitle = conv.partTitle ? `<div style="font-size:13px;font-weight:600;color:#333;margin-bottom:4px;">${escapeHtml(conv.partTitle)}</div>` : '';
        panel.innerHTML = `<div class="pro-ctx-empty">${fallbackTitle}<div style="font-size:11px;color:#aaa;">Listing not available</div></div>`;
        return;
    }
    const img    = part.images?.[0] || '';
    const s      = part.status || 'active';
    const statusLabel = s === 'pending' ? 'PENDING' : s === 'sold' ? 'SOLD' : 'ACTIVE';
    const statusClass = s === 'sold' ? 'status-sold' : s === 'pending' ? 'status-pending' : 'inbox-context-status';
    const stockMeta = [
        part.stockNumber  ? `Stock: ${escapeHtml(String(part.stockNumber))}`  : '',
        part.warehouseBin ? `Bin: ${escapeHtml(String(part.warehouseBin))}`    : '',
    ].filter(Boolean).join(' · ');
    const partId = part.supabaseId || part.id;
    const isSeller = userListings.some(l => l.supabaseId === partId || l.id === partId);
    panel.innerHTML = `
        ${img ? `<img src="${escapeHtml(img)}" class="inbox-context-img" alt="${escapeHtml(part.title)}">` : ''}
        <div class="inbox-context-info">
            ${isSeller ? `
            <div style="position:relative;display:inline-block;margin-bottom:8px;">
                <button class="inbox-status-btn isp-status-${s}" id="proCtxStatusBtn" onclick="toggleProCtxStatusPicker(event,${partId})">● ${statusLabel} ▾</button>
                <div id="proCtxStatusPicker" style="display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #eee;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:50;min-width:140px;padding:6px 0;">
                    ${['active','pending','sold'].map(opt => `<div class="isp-option${s===opt?' active':''}" onclick="proSetListingStatus('${opt}',${partId})">${opt==='active'?'● ACTIVE':opt==='pending'?'⏳ PENDING':'✓ SOLD'}</div>`).join('')}
                </div>
            </div>` : `<div class="inbox-context-status ${statusClass}">${statusLabel}</div>`}
            <div class="inbox-context-title">${escapeHtml(part.title)}</div>
            <div class="inbox-context-price">$${Number(part.price || 0).toLocaleString()}</div>
            ${stockMeta ? `<div class="inbox-context-stock">${stockMeta}</div>` : ''}
            <div class="inbox-context-with">Conversation with ${escapeHtml(conv.buyerName || conv.sellerName || 'Buyer')}</div>
            <button class="inbox-context-view-btn" onclick="openItemDetail(${partId}, false, true)">View Listing →</button>
        </div>`;
}

function toggleProCtxStatusPicker(e, partId) {
    if (e) e.stopPropagation();
    const picker = document.getElementById('proCtxStatusPicker');
    if (!picker) return;
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function proSetListingStatus(status, partId) {
    const picker = document.getElementById('proCtxStatusPicker');
    if (picker) picker.style.display = 'none';
    const listing = userListings.find(l => l.supabaseId === partId || l.id === partId);
    if (!listing) return;
    const doSet = () => {
        listing.status   = status === 'active' ? undefined : status;
        listing.soldDate = status === 'sold' ? Date.now() : (status === 'active' ? null : listing.soldDate);
        saveUserListings();
        renderMainGrid();
        renderMyParts();
        if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
        // Refresh the context panel to reflect the new status
        const conv = conversations.find(c => c.id === activeConvId || (c.partId === partId && c.sellerId === currentUserId));
        if (conv) proRenderContextPanel(conv, listing);
        const msg = status === 'active' ? 'Listing relisted as active' : status === 'pending' ? 'Listing marked as pending' : 'Listing marked as sold!';
        showToast(msg);
        syncListingStatusToSupabase(listing, status === 'active' ? 'active' : status);
    };
    if (status === 'sold') {
        showConfirm('Mark this listing as sold?', null, 'Mark Sold', () => {
            doSet();
            _postSoldRatePrompts(listing, _proActiveConvId || undefined);
            if (!listing.buyerRating) {
                const proConv = conversations.find(c => c.id === _proActiveConvId);
                setTimeout(() => showRateBuyerDialog(listing.id, proConv?.buyerName || proConv?.with, proConv?.buyerId), 400);
            }
        });
        return;
    }
    doSet();
}

function proRenderThreadMsgs(conv) {
    const container = document.getElementById('proThreadMsgs');
    if (!container || !conv.msgs) return;
    const isBuyer = conv.buyerId === currentUserId;
    container.innerHTML = conv.msgs.map((m, idx) => {
        if (m.offerCard?.type === 'rate_prompt') {
            return buildRatePromptCard(m.offerCard, conv.id, idx);
        }
        const isSent = m.sent;
        const initial = isSent
            ? (currentUserName || '?')[0].toUpperCase()
            : (isBuyer ? (conv.sellerName||'S')[0] : (conv.buyerName||'B')[0]).toUpperCase();
        const content = m.offerCard?.type === 'quote'
            ? buildQuoteCardHTML(m.offerCard)
            : m.offerCard
            ? `<div style="font-size:12px;padding:8px 12px;background:rgba(255,255,255,0.2);border-radius:8px;">Offer: $${m.offerCard.offerPrice}</div>`
            : (m.photoUrl || m.photo)
            ? `<img src="${escapeHtml(m.photoUrl || m.photo)}" style="max-width:200px;border-radius:8px;" alt="photo">`
            : escapeHtml(m.text || '');
        return `<div class="pro-mail-msg${isSent ? ' sent' : ''}">
            <div class="pro-mail-msg-avatar">${initial}</div>
            <div>
                <div class="pro-mail-msg-bubble">${content}</div>
                <div class="pro-mail-msg-time">${m.clock || m.time || ''}</div>
            </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function proSendReply(convId) {
    const input = document.getElementById('proReplyInput');
    const text  = input?.value.trim();
    if (!text) return;
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    conv.msgs = conv.msgs || [];
    conv.msgs.push({ id: nextMsgId(conv), sent: true, text, time: 'Today', clock: nowClock(), timestamp: Date.now() });
    input.value = ''; input.style.height = 'auto';
    saveConversations();
    proRenderThreadMsgs(conv);
    syncMessageToSupabase(conv.supabaseConvId, text, conv.buyerId === currentUserId).catch(() => {});
}

async function proOpenQuoteFromConv(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv || !sb) return;

    const qn = await _slGenerateQuoteNumber();
    const { data: quoteRow, error } = await sb.from('quotes').insert({
        quote_number: qn, user_id: currentUserId, status: 'draft',
        customer_name: conv.buyerName || conv.with || null,
        freight_cost: 0,
    }).select().single();
    if (error || !quoteRow) { showToast('Could not create quote'); return; }

    // Insert line item and capture the returned row so we can show it immediately
    let lines = [];
    if (conv.partId && conv.partId !== 'general') {
        const partTitle = getConvPartTitle(conv);
        const part = findPartAnywhere(conv.partId);
        const { data: lineData } = await sb.from('quote_lines').insert({
            quote_id: quoteRow.id,
            listing_id: Number(conv.partId),
            title: partTitle,
            price: part?.price ?? null,
            qty: 1,
        }).select();
        if (lineData?.[0]) lines = [lineData[0]];
    }

    if (!_slQuotes.find(q => q.id === quoteRow.id)) _slQuotes.unshift(quoteRow);
    _slActiveQuote = { quote: quoteRow, lines };
    _slQuoteConvContext = { convId };
    _slRenderQuoteDetail();
}

function buildQuoteCardHTML(q) {
    const qNum  = q.quoteNumber || q.quote_number || '';
    const price = q.price != null ? `$${Number(q.price).toLocaleString('en-AU')}` : '';
    const meta  = [price, q.notes ? escapeHtml(q.notes) : ''].filter(Boolean).join(' · ');
    return `<div class="sl-quote-card" style="margin:0;cursor:default;max-width:240px;">
        <div><span class="sl-quote-num">${escapeHtml(qNum)}</span><span class="sl-quote-badge sent">SENT</span></div>
        ${q.partTitle ? `<div class="sl-quote-meta">${escapeHtml(q.partTitle)}</div>` : ''}
        ${meta ? `<div class="sl-quote-meta" style="font-weight:600;color:#333;">${meta}</div>` : ''}
    </div>`;
}

function proEnquiriesIsOpen() {
    const v = document.getElementById('proEnquiriesView');
    return v && v.style.display !== 'none';
}

function proRefreshIfOpen(updatedConvId) {
    if (!proEnquiriesIsOpen()) return;
    proRenderConvList();
    proUpdateFolderBadges();
    if (updatedConvId !== undefined && updatedConvId === _proActiveConvId) {
        const conv = conversations.find(c => c.id === updatedConvId);
        if (conv) proRenderThreadMsgs(conv);
    }
}

function proSendPhoto(event, convId) {
    const file = event.target.files?.[0];
    if (!file) return;
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const reader = new FileReader();
    reader.onload = e => {
        const base64 = e.target.result;
        conv.msgs = conv.msgs || [];
        conv.msgs.push({ id: nextMsgId(conv), sent: true, text: '', photoUrl: base64, time: 'Today', clock: nowClock(), timestamp: Date.now() });
        saveConversations();
        proRenderThreadMsgs(conv);
        syncPhotoMessageToSupabase(conv, base64, conv.buyerId === currentUserId).catch(() => {});
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function proOpenStockLookup() {
    if (window.innerWidth < 900) { showToast('Stock Lookup is available on desktop only'); return; }
    if (!userIsSignedIn || currentUserTier !== 'pro') { showToast('Stock Lookup requires APC Pro'); return; }
    proShowView('proStockView', 'proNavStock');
    // Resume an in-progress lookup rather than wiping it — stepping out to read a
    // message/thread and coming back must not lose the search. 'Clear' resets it.
    if (_slTabs.length || _slVehicle.make || _slSelectedAsm >= 0) { _slChatClose(); return; }
    _slVehicle = { make: '', model: '', year: '', series: '' };
    _slTabs = []; _slActiveTab = -1;
    _slSelectedZone = 0; _slSelectedAsm = -1; _slSelectedPartBase = null;
    _slSelected.clear(); _slResultsMap.clear(); _slActiveQuote = null;
    _slQuotedListings.clear(); _slPartNotes.clear();
    _slColWidths = null;    // recompute column widths against current styles
    _slSearchHistory = []; // fresh session log
    _slRenderSearchHistory();
    _slChatClose();
    try { _slRenderVehicleBar(); } catch(e) { console.error('SL veh bar error:', e); }
    try { _slRenderSelector(); }   catch(e) { console.error('SL selector error:', e); }
    _slRenderResultsArea();
    _slLoadTodaysQuotes();
    _slLoadMarkers();
    _slLoadYardChats();
    _slSetTodayTab('quotes');
}

function proOpenEDW() {
    _pauseWarehouse();
    document.querySelectorAll('.pro-hdr-link').forEach(l => l.classList.remove('pro-hdr-active'));
    document.getElementById('proNavEDW')?.classList.add('pro-hdr-active');
    if (_edwHasActiveSession()) {
        // Resume the paused session — re-show drawer without resetting state
        const drawer = document.getElementById('edwDrawer');
        if (drawer) { _edwPositionDrawer(drawer); drawer.classList.add('active'); }
        document.body.style.overflow = 'hidden';
    } else {
        openEdw();
    }
}

function renderProHeader() {
    const avatar = document.getElementById('proHdrAvatar');
    if (!avatar) return;
    const badge  = document.getElementById('proNavMsgBadge');
    const unread = conversations.filter(c => c.unread).length;
    if (badge) {
        badge.textContent = unread || '';
        badge.style.display = unread ? 'block' : 'none';
    }
    const profilePic = currentUserProfile?.avatar_url;
    const initial    = (currentUserName || currentUserId || 'P')[0].toUpperCase();
    if (profilePic) {
        avatar.innerHTML = `<img src="${escapeHtml(profilePic)}" alt="avatar">`;
    } else {
        avatar.textContent = initial;
    }
}

function setDemandPeriod(period) {
    const card = document.getElementById('dashDemandCard');
    if (card) { card.dataset.period = period; renderDemandWidget(); }
}

function setDemandScope(scope) {
    const card = document.getElementById('dashDemandCard');
    if (card) { card.dataset.scope = scope; renderDemandWidget(); }
}

async function renderDemandWidget() {
    const card = document.getElementById('dashDemandCard');
    if (!card) return;

    const scope  = card.dataset.scope || 'site';
    const isYard = scope === 'yard';
    const period = card.dataset.period || 'month';
    const now = Date.now();
    let fromTs, periodLabel;
    if (period === 'week') {
        fromTs = now - 7 * 24 * 60 * 60 * 1000;
        periodLabel = 'Last 7 Days';
    } else if (period === '90') {
        fromTs = now - 90 * 24 * 60 * 60 * 1000;
        periodLabel = 'Last 90 Days';
    } else {
        const ms = new Date(); ms.setDate(1); ms.setHours(0, 0, 0, 0);
        fromTs = ms.getTime();
        periodLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    const scopeToggle = `<div class="demand-scope">
        <button class="demand-scope-btn${!isYard ? ' active' : ''}" onclick="setDemandScope('site')">APC-wide</button>
        <button class="demand-scope-btn${isYard ? ' active' : ''}" onclick="setDemandScope('yard')">My Yard</button>
    </div>`;
    const pills = `<div class="demand-periods">
        <button class="demand-pill${period === 'week' ? ' active' : ''}" onclick="setDemandPeriod('week')">This Week</button>
        <button class="demand-pill${period === 'month' ? ' active' : ''}" onclick="setDemandPeriod('month')">This Month</button>
        <button class="demand-pill${period === '90' ? ' active' : ''}" onclick="setDemandPeriod('90')">Last 90 Days</button>
    </div>`;
    const shell = body => `
        <div class="dash-card-hdr">
            <span class="dash-card-title">${isYard ? 'My Yard Enquiries' : 'Search Demand'}</span>
            <span class="dash-card-meta">${periodLabel}</span>
        </div>
        ${scopeToggle}
        ${pills}
        ${body}`;

    card.innerHTML = shell(`<div class="dash-empty-state" style="padding:16px 0;color:#aaa;">Loading…</div>`);

    if (isYard) {
        const rep = await getYardEnquiryReport(fromTs, now);
        if (!rep.total) {
            card.innerHTML = shell(`<div class="dash-empty-state" style="padding:20px 0;">No enquiries yet — each Stock Lookup you run (e.g. when a customer phones) is logged here.</div>`);
            return;
        }
        const pct      = Math.round((rep.supplied / rep.total) * 100);
        const topMakes = rep.makes.slice(0, 5);
        const maxC     = topMakes[0].count;
        const bars = topMakes.map(M => {
            const w = Math.round((M.count / maxC) * 100);
            return `<div class="demand-bar-row">
                <div class="demand-bar-label">${escapeHtml(M.make)}</div>
                <div class="demand-bar-track">
                    <div class="demand-bar-fill${M.missed ? ' demand-bar-gap' : ''}" style="width:${w}%"></div>
                </div>
                <div class="demand-bar-count">${M.count}${M.missed ? ` <span class="demand-miss">${M.missed}✕</span>` : ''}</div>
            </div>`;
        }).join('');
        card.innerHTML = shell(`
            <div class="yard-sum">
                <span><strong>${rep.total}</strong> enquir${rep.total === 1 ? 'y' : 'ies'}</span>
                <span><strong>${pct}%</strong> supplied</span>
                ${rep.missed ? `<span class="yard-sum-miss"><strong>${rep.missed}</strong> couldn't supply</span>` : ''}
            </div>
            <p class="demand-subtitle">Top vehicles asked for — orange = you had none in stock</p>
            <div class="demand-bars">${bars}</div>
            <button class="yard-report-link" onclick="openYardReport()">View full report →</button>`);
        return;
    }

    const report = await getDemandReport(fromTs, now);
    if (!report.length) {
        card.innerHTML = shell(`<div class="dash-empty-state" style="padding:20px 0;">No search data for this period — trends appear as buyers search APC.</div>`);
        return;
    }
    const maxCount = report[0].count;
    const gaps = report.filter(r => !getAllParts().some(p => p.title.toLowerCase().includes(r.term.toLowerCase())));
    const bars = report.map(r => {
        const pct = Math.round((r.count / maxCount) * 100);
        const isGap = !getAllParts().some(p => p.title.toLowerCase().includes(r.term.toLowerCase()));
        return `<div class="demand-bar-row">
            <div class="demand-bar-label">${escapeHtml(r.term)}</div>
            <div class="demand-bar-track">
                <div class="demand-bar-fill${isGap ? ' demand-bar-gap' : ''}" style="width:${pct}%"></div>
            </div>
            <div class="demand-bar-count">${r.count}</div>
        </div>`;
    }).join('');

    const insight = gaps.length
        ? `<div class="demand-insight">
               <span class="demand-insight-ico">💡</span>
               <div><strong>${gaps.length} stocking ${gaps.length === 1 ? 'gap' : 'gaps'}</strong> — no listings match: ${gaps.slice(0,3).map(g => `<em>${escapeHtml(g.term)}</em>`).join(', ')}${gaps.length > 3 ? ` +${gaps.length - 3} more` : ''}. Consider sourcing these.</div>
           </div>`
        : '';

    card.innerHTML = shell(`
        <p class="demand-subtitle">Most searched terms on APC — orange bars have no matching listings</p>
        <div class="demand-bars">${bars}</div>
        ${insight}`);
}

// ─── MY YARD ENQUIRY REPORT (full drawer) ─────────────────────────────────
let _yrPeriod    = 'month';
let _yrTab       = 'vehicle';     // 'vehicle' | 'miss'
let _yrData      = null;
let _yrExpMakes  = new Set();      // expanded makes (by name)
let _yrExpModels = new Set();      // expanded models (by "make|model")

function _yrRange() {
    const now = Date.now();
    if (_yrPeriod === 'week') return { fromTs: now - 7  * 24 * 60 * 60 * 1000, now, label: 'Last 7 days' };
    if (_yrPeriod === '90')   return { fromTs: now - 90 * 24 * 60 * 60 * 1000, now, label: 'Last 90 days' };
    const ms = new Date(); ms.setDate(1); ms.setHours(0, 0, 0, 0);
    return { fromTs: ms.getTime(), now, label: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }) };
}

function openYardReport() {
    _yrExpMakes = new Set(); _yrExpModels = new Set();
    openDrawer('yardReportDrawer');
    _renderYardReport();
}
function closeYardReport() {
    document.getElementById('yardReportDrawer')?.classList.remove('active');
    syncBackdrop();
}
function setYardReportPeriod(p) { _yrPeriod = p; _yrExpMakes = new Set(); _yrExpModels = new Set(); _renderYardReport(); }
function setYardReportTab(t)    { _yrTab = t; _paintYardReport(); }
function _toggleYardMake(i) {
    const M = _yrData?.makes[i]; if (!M) return;
    _yrExpMakes.has(M.make) ? _yrExpMakes.delete(M.make) : _yrExpMakes.add(M.make);
    _paintYardReport();
}
function _toggleYardModel(mi, oi) {
    const Mo = _yrData?.makes[mi]?.models[oi]; if (!Mo) return;
    const key = _yrData.makes[mi].make + '|' + Mo.model;
    _yrExpModels.has(key) ? _yrExpModels.delete(key) : _yrExpModels.add(key);
    _paintYardReport();
}

async function _renderYardReport() {
    const body = document.getElementById('yardReportContent');
    if (!body) return;
    body.innerHTML = `<div class="yr-loading">Loading enquiries…</div>`;
    const { fromTs, now } = _yrRange();
    _yrData = await getYardEnquiryReport(fromTs, now);
    _paintYardReport();
}

function _paintYardReport() {
    const body = document.getElementById('yardReportContent');
    if (!body || !_yrData) return;
    const rep = _yrData;
    const { label } = _yrRange();
    const pct = rep.total ? Math.round((rep.supplied / rep.total) * 100) : 0;

    const periodPills = `<div class="demand-periods yr-periods">
        <button class="demand-pill${_yrPeriod === 'week'  ? ' active' : ''}" onclick="setYardReportPeriod('week')">This Week</button>
        <button class="demand-pill${_yrPeriod === 'month' ? ' active' : ''}" onclick="setYardReportPeriod('month')">This Month</button>
        <button class="demand-pill${_yrPeriod === '90'    ? ' active' : ''}" onclick="setYardReportPeriod('90')">Last 90 Days</button>
    </div>`;

    const stats = `<div class="yr-stats">
        <div class="yr-stat"><div class="yr-stat-num">${rep.total}</div><div class="yr-stat-lbl">Enquiries</div></div>
        <div class="yr-stat"><div class="yr-stat-num">${rep.makes.length}</div><div class="yr-stat-lbl">Makes</div></div>
        <div class="yr-stat"><div class="yr-stat-num">${pct}%</div><div class="yr-stat-lbl">Supplied</div></div>
        <div class="yr-stat yr-stat-miss"><div class="yr-stat-num">${rep.missed}</div><div class="yr-stat-lbl">Couldn't supply</div></div>
    </div>`;

    const tabs = `<div class="yr-tabs">
        <button class="yr-tab${_yrTab === 'vehicle' ? ' active' : ''}" onclick="setYardReportTab('vehicle')">By Vehicle</button>
        <button class="yr-tab${_yrTab === 'miss' ? ' active' : ''}" onclick="setYardReportTab('miss')">Couldn't Supply${rep.misses.length ? ` (${rep.misses.length})` : ''}</button>
    </div>`;

    let listHTML;
    if (!rep.total) {
        listHTML = `<div class="yr-empty">No enquiries in this period. Each Stock Lookup you run is logged here — e.g. when a customer phones asking for a part.</div>`;
    } else if (_yrTab === 'miss') {
        listHTML = rep.misses.length
            ? `<p class="yr-hint">Parts customers asked for that you had no stock of — your sourcing shortlist.</p>` +
              rep.misses.map(m => `<div class="yr-miss-row">
                  <div class="yr-miss-part">${escapeHtml(m.part)}</div>
                  <div class="yr-miss-veh">${escapeHtml([m.make, m.model].filter(x => x && x !== '—').join(' ') || '—')}</div>
                  <div class="yr-miss-count">${m.count}×</div>
              </div>`).join('')
            : `<div class="yr-empty">Nothing missed — you had stock for every enquiry this period. 🎉</div>`;
    } else {
        listHTML = rep.makes.map((M, mi) => {
            const open = _yrExpMakes.has(M.make);
            const models = open ? M.models.map((Mo, oi) => {
                const mopen = _yrExpModels.has(M.make + '|' + Mo.model);
                const parts = mopen ? Mo.parts.map(P => `<div class="yr-part-row">
                        <span class="yr-part-name">${escapeHtml(P.part)}</span>
                        <span class="yr-part-counts">${P.count}${P.missed ? ` <span class="yr-miss">⚠${P.missed}</span>` : ''}</span>
                    </div>`).join('') : '';
                return `<div class="yr-model">
                    <button class="yr-model-row" onclick="_toggleYardModel(${mi},${oi})">
                        <span class="yr-caret">${mopen ? '▾' : '▸'}</span>
                        <span class="yr-model-name">${escapeHtml(Mo.model)}</span>
                        <span class="yr-model-counts">${Mo.count}${Mo.missed ? ` <span class="yr-miss">⚠${Mo.missed}</span>` : ''}</span>
                    </button>
                    ${parts}
                </div>`;
            }).join('') : '';
            return `<div class="yr-make">
                <button class="yr-make-row" onclick="_toggleYardMake(${mi})">
                    <span class="yr-caret">${open ? '▾' : '▸'}</span>
                    <span class="yr-make-name">${escapeHtml(M.make)}</span>
                    <span class="yr-make-counts">${M.count} <span class="yr-ok">✓${M.supplied}</span>${M.missed ? ` <span class="yr-miss">⚠${M.missed}</span>` : ''}</span>
                </button>
                ${models}
            </div>`;
        }).join('');
    }

    body.innerHTML = `
        <div class="yr-top">
            <div class="yr-period-row">
                <div class="yr-period-label">${label}</div>
                ${rep.total ? `<button class="yr-export" onclick="exportYardReportPDF()">⤓ Export PDF</button>` : ''}
            </div>
            ${periodPills}
            ${stats}
            ${tabs}
        </div>
        <div class="yr-list">${listHTML}</div>`;
}

// Print-window PDF of the current period — full Make→Model→Part breakdown + misses list.
// Same browser-print approach as the label tabs (no PDF library); user picks "Save as PDF".
function exportYardReportPDF() {
    if (!_yrData || !_yrData.total) { showToast('No enquiries to export'); return; }
    const rep = _yrData;
    const { label } = _yrRange();
    const biz   = (userSettings.businessName || currentUserName || 'My Yard').trim();
    const pct   = Math.round((rep.supplied / rep.total) * 100);
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

    const vehicleRows = rep.makes.map(M => {
        const models = M.models.map(Mo => {
            const parts = Mo.parts.map(P => `<tr class="r-part">
                <td>${escapeHtml(P.part)}</td><td class="num">${P.count}</td><td class="num miss">${P.missed || ''}</td></tr>`).join('');
            return `<tr class="r-model"><td>${escapeHtml(Mo.model)}</td><td class="num">${Mo.count}</td><td class="num miss">${Mo.missed || ''}</td></tr>${parts}`;
        }).join('');
        return `<tr class="r-make"><td>${escapeHtml(M.make)}</td><td class="num">${M.count}</td><td class="num miss">${M.missed || ''}</td></tr>${models}`;
    }).join('');

    const missRows = rep.misses.length
        ? rep.misses.map(m => `<tr><td>${escapeHtml(m.part)}</td><td>${escapeHtml([m.make, m.model].filter(x => x && x !== '—').join(' ') || '—')}</td><td class="num">${m.count}</td></tr>`).join('')
        : `<tr><td colspan="3" class="empty">Nothing missed — every enquiry was supplied.</td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(biz)} — Enquiry Report</title>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #222; margin: 28px; font-size: 12px; }
header { border-bottom: 3px solid #f07020; padding-bottom: 10px; margin-bottom: 16px; }
.biz { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
.rh { font-size: 14px; color: #444; margin-top: 2px; }
.gen { font-size: 10px; color: #999; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
.stats { display: flex; gap: 22px; margin-bottom: 20px; }
.stats div { font-size: 12px; color: #666; }
.stats b { font-size: 20px; color: #222; display: block; font-weight: 800; }
.stats .m b { color: #f07020; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #f07020; border-bottom: 1px solid #eee; padding-bottom: 5px; margin: 22px 0 8px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #999; padding: 4px 6px; border-bottom: 1px solid #ddd; }
td { padding: 5px 6px; border-bottom: 1px solid #f2f2f2; }
.num { text-align: right; width: 70px; }
.miss { color: #f07020; font-weight: 700; }
.r-make td { font-weight: 800; background: #faf6f2; border-top: 1px solid #eee; }
.r-model td:first-child { padding-left: 22px; font-weight: 600; color: #555; }
.r-part td:first-child { padding-left: 40px; color: #666; }
.empty { color: #888; font-style: italic; }
@media print { body { margin: 12mm; } .r-make { page-break-inside: avoid; } }
</style></head><body>
<header>
    <div class="biz">${escapeHtml(biz)}</div>
    <div class="rh">Stock Enquiry Report · ${escapeHtml(label)}</div>
    <div class="gen">Generated ${today} · Auto Parts Connection</div>
</header>
<div class="stats">
    <div><b>${rep.total}</b> Enquiries</div>
    <div><b>${rep.makes.length}</b> Makes</div>
    <div><b>${pct}%</b> Supplied</div>
    <div class="m"><b>${rep.missed}</b> Couldn't supply</div>
</div>
<h2>By Vehicle</h2>
<table><thead><tr><th>Make / Model / Part</th><th class="num">Asked</th><th class="num">Missed</th></tr></thead><tbody>${vehicleRows}</tbody></table>
<h2>Couldn't Supply — sourcing shortlist</h2>
<table><thead><tr><th>Part</th><th>Vehicle</th><th class="num">Times</th></tr></thead><tbody>${missRows}</tbody></table>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body></html>`;

    const tab = window.open('', '_blank');
    if (tab) { tab.document.open(); tab.document.write(html); tab.document.close(); }
    else showToast('Allow pop-ups to export the report');
}

// ─── ELECTRONIC DISMANTLING WORKFLOW (EDW) ────────────────────────────────

let _edwVehicle       = {};
let _edwItems         = {};   // key: "zI:aI:pI" → { grade, notes, price, photos: [] }
let _edwStep          = 0;
let _edwJobId         = null; // dismantling_jobs.id for the current stock card
let _edwCommitted     = false; // true once the job is sent/published — close without the "unsaved" prompt
let _edwPendingLabels = []; // labels queued from the last publish — printed via the success-screen button
let _edwStock         = [];   // loaded list of in_stock/stripping jobs
let _edwStockFilter   = '';
let _edwSelectedZone  = 0;
let _edwSelectedAsm   = -1;
let _edwVehiclePhotos = []; // { angle, file, previewUrl, selected }
let _edwActiveZone = null; // currently expanded zone index in step 2 grid
let _edwActiveAsm  = null; // currently expanded assembly index within active zone
let _edwSelectedPartBase = null; // index into _edwGetPartGroups() result for the expanded accordion row

const EDW_VEHICLE_ANGLES = ['Front Left', 'Front Right', 'Rear Left', 'Rear Right', 'Instrument Cluster', 'Compliance Plate'];

const EDW_BODY_FILTER = {
    'Sedan':        { hideZones: ['4WD / Off-road'], hideAsms: ['Sliding Door', 'Tailgate Door', 'Ute Accessories'] },
    'Hatchback':    { hideZones: ['4WD / Off-road'], hideAsms: ['Sliding Door', 'Ute Accessories'] },
    'Wagon':        { hideZones: ['4WD / Off-road'], hideAsms: ['Sliding Door', 'Ute Accessories'] },
    'Coupe':        { hideZones: ['4WD / Off-road'], hideAsms: ['Rear Door', 'Sliding Door', 'Tailgate Door', 'Ute Accessories'] },
    'Convertible':  { hideZones: ['4WD / Off-road'], hideAsms: ['Rear Door', 'Sliding Door', 'Tailgate Door', 'Ute Accessories'] },
    'SUV / 4WD':    { hideAsms: ['Sliding Door', 'Ute Accessories'] },
    'Ute / Pickup': { hideAsms: ['Sliding Door'] },
    'Van':          { hideZones: ['4WD / Off-road'], hideAsms: ['Ute Accessories'] },
    'People Mover': { hideZones: ['4WD / Off-road'], hideAsms: ['Ute Accessories'] },
};

// Returns the disambiguated part name — prepends the assembly's positional qualifier
// (Front/Rear/etc.) when it isn't already present in the part name, so that
// "Complete Door (Left)" from "Front Door" vs "Rear Door" produce distinct titles.
function _edwFullPartName(asmName, partName) {
    const POSITIONAL = new Set(['front','rear','upper','lower','inner','outer']);
    const first = (asmName || '').split(/[\s\/&]+/)[0] || '';
    if (!POSITIONAL.has(first.toLowerCase())) return partName;
    if (partName.toLowerCase().includes(first.toLowerCase())) return partName;
    return `${first} ${partName}`;
}

// Part name with the engine variant baked in for the Complete Engine, so the listing
// title carries the engine code (e.g. "Complete Engine 2ZZ-GE 1.8") — that's what makes
// Stock Lookup's engine-variant matching find it. Applied at every publish/preview path.
function _edwPartNameWithVariant(asmName, partName) {
    const full = _edwFullPartName(asmName, partName);
    if (asmName === 'Engine' && full === 'Complete Engine' && _edwVehicle.engineCode) {
        return `${full} ${_edwVehicle.engineCode}`;
    }
    return full;
}

function _edwPositionDrawer(drawer) {
    if (window.innerWidth < 900) {
        drawer.style.top = drawer.style.left = drawer.style.right = drawer.style.width = '';
        return;
    }
    const proHdr = document.getElementById('proHeader');
    const proOpen = proHdr && proHdr.style.display !== 'none';
    const topBar  = document.getElementById('desktopTopBar');
    const hdr     = document.getElementById('mainHeader');
    const topOffset  = proOpen ? (proHdr.offsetHeight || 54) : (topBar ? topBar.offsetHeight : 0) + (hdr ? hdr.offsetHeight : 0);
    const sideOffset = proOpen ? 0 : Math.max(0, Math.round(window.innerWidth / 2) - 700);
    drawer.style.top   = topOffset + 'px';
    drawer.style.left  = sideOffset + 'px';
    drawer.style.right = sideOffset + 'px';
    drawer.style.width = 'auto';
}

function openEdw() {
    if (currentUserTier !== 'pro') { showToast('EDW is a Pro feature'); return; }
    if (window.innerWidth < 768) { showToast('EDW requires a tablet or larger screen'); return; }
    _edwVehicle       = {};
    _edwItems         = {};
    _edwStep          = 0;
    _edwJobId         = null;
    _edwStock         = [];
    _edwStockFilter   = '';
    _edwSelectedZone  = 0;
    _edwSelectedAsm   = -1;
    _edwVehiclePhotos = EDW_VEHICLE_ANGLES.map(angle => ({ angle, file: null, previewUrl: null, selected: true }));
    const drawer = document.getElementById('edwDrawer');
    if (drawer) {
        _edwPositionDrawer(drawer);
        drawer.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
    _renderEdw();
}

function closeEdw() {
    if (!_edwCommitted && _edwHasActiveSession() && !confirm('End this EDW session? Unsaved work will be lost.')) return;
    _edwCommitted = false;
    _edwVehicle = {}; _edwItems = {}; _edwStep = 0; _edwJobId = null;
    _edwStock = []; _edwStockFilter = ''; _edwVehiclePhotos = [];
    const drawer = document.getElementById('edwDrawer');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
    document.querySelectorAll('.pro-hdr-link').forEach(l => l.classList.remove('pro-hdr-active'));
    document.getElementById('proNavDash')?.classList.add('pro-hdr-active');
}

// EDW is Pro-only — after publishing, send a desktop Pro user to their working
// view (the dashboard spreadsheet), not the consumer grid. A tablet (768–899, no
// dashboard) or any non-Pro falls back to the normal My Listings.
function _edwViewMyListings() {
    closeEdw();
    if (window.innerWidth >= 900 && currentUserTier === 'pro') {
        const dv = document.getElementById('dashboardView');
        if (!dv || dv.style.display === 'none') openDashboard();
        proOpenMyListings('active');
    } else {
        onMenuOpenMyListings();
    }
}

function _renderEdw() {
    _renderEdwHeader();
    if (_edwStep === 0)      _renderEdwStep0();
    else if (_edwStep === 1) _renderEdwStep1();
    else if (_edwStep === 2) _renderEdwStep2();
    else if (_edwStep === 3) _renderEdwStep3();
}

function _renderEdwHeader() {
    const ind = document.getElementById('edwStepIndicator');
    if (!ind) return;
    if (_edwStep === 0) {
        ind.innerHTML = `<span style="font-size:13px;font-weight:700;color:#333;letter-spacing:0.3px;">Stock</span>`;
        return;
    }
    const steps = ['Enter Vehicle into Stock', 'Select Parts', 'Review & Price'];
    ind.innerHTML = steps.map((s, i) => `
        <div class="edw-step-dot ${i + 1 === _edwStep ? 'active' : i + 1 < _edwStep ? 'done' : ''}">
            <div class="edw-step-num">${i + 1 < _edwStep ? '✓' : i + 1}</div>
            <div class="edw-step-lbl">${s}</div>
        </div>
    `).join('<div class="edw-step-line"></div>');
}

function _renderEdwStep1() {
    const body = document.getElementById('edwBody');
    const footer = document.getElementById('edwFooter');
    if (!body || !footer) return;

    const makes = Object.keys(VEHICLE_DB || {}).sort();
    const v = _edwVehicle;

    body.innerHTML = `
        <div class="edw-section-title">Enter Vehicle into Stock</div>
        <div class="edw-form-grid">
            <div class="edw-field">
                <label class="edw-label">Stock Number</label>
                <input id="edwStockNumber" class="edw-input" type="text" placeholder="e.g. VH2847, 2025-042" value="${escapeHtml(v.stockNumber || '')}" oninput="_edwSaveField('stockNumber', this.value)">
            </div>
            <div class="edw-field">
                <label class="edw-label">Purchase Cost <span style="font-size:10px;font-weight:500;color:#aaa;text-transform:none;">(internal — not shown publicly)</span></label>
                <div class="edw-price-wrap"><span class="edw-price-sym">$</span><input id="edwVehicleCost" class="edw-input edw-price-inp" type="number" min="0" step="1" placeholder="0" value="${v.vehicleCost || ''}" oninput="_edwSaveField('vehicleCost', this.value)"></div>
            </div>
            <div class="edw-field">
                <label class="edw-label">Make *</label>
                <select id="edwMake" class="edw-input" onchange="_edwOnMakeChange()">
                    <option value="">Select make…</option>
                    ${makes.map(m => `<option value="${escapeHtml(m)}"${v.make === m ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}
                </select>
            </div>
            <div class="edw-field">
                <label class="edw-label">Model *</label>
                <select id="edwModel" class="edw-input" onchange="_edwOnModelChange()">
                    ${buildModelOptions(v.make, v.model)}
                </select>
            </div>
            <div class="edw-field">
                <label class="edw-label">Year *</label>
                <select id="edwYear" class="edw-input" onchange="_edwOnYearChange()">
                    ${buildYearOptionsForModel(v.make, v.model, v.year)}
                </select>
            </div>
            <div class="edw-field" id="edwSeriesGroup">
                <label class="edw-label">Series</label>
                <select id="edwSeries" class="edw-input" onchange="_edwOnSeriesChange()">
                    <option value="">Select series…</option>
                </select>
            </div>
            <div class="edw-field">
                <label class="edw-label">Body Type</label>
                <select id="edwBodyType" class="edw-input" onchange="_edwSaveField('bodyType', this.value)">
                    <option value="">Select…</option>
                    ${['Sedan','Hatchback','Wagon','Ute / Pickup','SUV / 4WD','Van','Coupe','Convertible','People Mover'].map(t => `<option value="${t}"${v.bodyType === t ? ' selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="edw-field">
                <label class="edw-label">Colour</label>
                <input id="edwColour" class="edw-input" type="text" placeholder="e.g. Graphite Grey" value="${escapeHtml(v.colour || '')}" oninput="_edwSaveField('colour', this.value)">
            </div>
            <div class="edw-field">
                <label class="edw-label">VIN / Chassis</label>
                <input id="edwVin" class="edw-input" type="text" placeholder="17-char VIN" maxlength="17" value="${escapeHtml(v.vin || '')}" oninput="_edwSaveField('vin', this.value.toUpperCase())" style="text-transform:uppercase">
            </div>
            <div class="edw-field">
                <label class="edw-label">Paint Code</label>
                <input id="edwPaintCode" class="edw-input" type="text" placeholder="e.g. 1G3, NH883P" value="${escapeHtml(v.paintCode || '')}" oninput="_edwSaveField('paintCode', this.value)">
            </div>
            <div class="edw-field">
                <label class="edw-label">Engine Code</label>
                <div id="edwEngineCodeWrap">${_buildEngineCodeField('edw', v.make, v.model, v.engineCode, v.series)}</div>
            </div>
            <div class="edw-field">
                <label class="edw-label">Transmission Code</label>
                <input id="edwTransCode" class="edw-input" type="text" placeholder="e.g. A750E, R154" value="${escapeHtml(v.transCode || '')}" oninput="_edwSaveField('transCode', this.value)">
            </div>
            <div class="edw-field">
                <label class="edw-label">Transmission Type</label>
                <select id="edwTransType" class="edw-input" onchange="_edwSaveField('transType', this.value)">
                    <option value="">Select…</option>
                    ${['Manual 4-speed','Manual 5-speed','Manual 6-speed','Auto 4-speed','Auto 6-speed','Auto 8-speed','Auto 9-speed','Auto 10-speed','CVT','DCT (Dual-Clutch)','Sequential','Other'].map(t => `<option value="${t}"${v.transType === t ? ' selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="edw-field">
                <label class="edw-label">Odometer (km)</label>
                <input id="edwOdo" class="edw-input" type="number" placeholder="e.g. 187000" value="${v.odometer || ''}" oninput="_edwSaveField('odometer', this.value)">
            </div>
            <div class="edw-field">
                <label class="edw-label">Build Date (compliance plate)</label>
                <input id="edwBuild" class="edw-input" type="text" placeholder="e.g. 08/2018" value="${escapeHtml(v.buildDate || '')}" oninput="_edwSaveField('buildDate', this.value)">
            </div>
        </div>

        <div class="edw-section-title" style="margin-top:22px;">Vehicle Photos <span style="font-weight:400;text-transform:none;font-size:11px;color:#aaa;">(optional)</span></div>
        <div class="edw-vp-hint">Tap a photo to toggle whether it gets added to listings without their own part photo.</div>
        <div class="edw-vp-grid" id="edwVpGrid">${_buildVehiclePhotoSlots()}</div>
    `;

    footer.innerHTML = `
        <button class="edw-btn-secondary" onclick="_edwStep = 0; _renderEdw();">← Back to Stock</button>
        <button class="edw-btn-primary" onclick="_edwSaveToStock()">Save to Stock →</button>
    `;
    _edwRefreshSeries();
}

function _buildVehiclePhotoSlots() {
    return _edwVehiclePhotos.map((vp, i) => {
        if (vp.file) {
            return `
                <div class="edw-vp-slot">
                    <div class="edw-vp-thumb-wrap ${vp.selected ? 'selected' : 'deselected'}" onclick="_edwToggleVehiclePhoto(${i})">
                        <img class="edw-vp-thumb" src="${vp.previewUrl}" alt="${escapeHtml(vp.angle)}">
                        <div class="edw-vp-overlay">${vp.selected ? '✓' : '✕'}</div>
                    </div>
                    <div class="edw-vp-label">${escapeHtml(vp.angle)}</div>
                </div>`;
        }
        return `
            <div class="edw-vp-slot">
                <label class="edw-vp-empty">
                    <input type="file" accept="image/*" style="display:none" onchange="_edwAddVehiclePhoto(${i}, this)">
                    <span class="edw-vp-add-ico">+</span>
                </label>
                <div class="edw-vp-label">${escapeHtml(vp.angle)}</div>
            </div>`;
    }).join('');
}

function _edwAddVehiclePhoto(index, input) {
    const file = input.files?.[0];
    if (!file) return;
    _edwVehiclePhotos[index].file = file;
    _edwVehiclePhotos[index].previewUrl = URL.createObjectURL(file);
    _edwVehiclePhotos[index].selected = true;
    _fileToBase64(file).then(b64 => { _edwVehiclePhotos[index].base64 = b64; });
    const grid = document.getElementById('edwVpGrid');
    if (grid) grid.innerHTML = _buildVehiclePhotoSlots();
}

function _edwToggleVehiclePhoto(index) {
    _edwVehiclePhotos[index].selected = !_edwVehiclePhotos[index].selected;
    const grid = document.getElementById('edwVpGrid');
    if (grid) grid.innerHTML = _buildVehiclePhotoSlots();
}

function _fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


function _edwOnMakeChange() {
    const make = document.getElementById('edwMake')?.value;
    _edwVehicle.make = make;
    _edwVehicle.model = _edwVehicle.year = _edwVehicle.series = _edwVehicle.engineCode = '';
    const modelSel = document.getElementById('edwModel');
    if (modelSel) modelSel.innerHTML = buildModelOptions(make, '');
    const yearSel = document.getElementById('edwYear');
    if (yearSel) yearSel.innerHTML = buildYearOptions('');
    _edwRefreshSeries();
    const ecWrap = document.getElementById('edwEngineCodeWrap');
    if (ecWrap) ecWrap.innerHTML = _buildEngineCodeField('edw', make, '', '');
}

function _edwOnModelChange() {
    const make  = document.getElementById('edwMake')?.value;
    const model = document.getElementById('edwModel')?.value;
    _edwVehicle.model = model;
    _edwVehicle.year = _edwVehicle.series = _edwVehicle.engineCode = '';
    const yearSel = document.getElementById('edwYear');
    if (yearSel) yearSel.innerHTML = buildYearOptionsForModel(make, model, '');
    _edwRefreshSeries();
    const ecWrap = document.getElementById('edwEngineCodeWrap');
    if (ecWrap) ecWrap.innerHTML = _buildEngineCodeField('edw', make, model, '');
}

function _edwOnYearChange() {
    _edwVehicle.year   = document.getElementById('edwYear')?.value || '';
    _edwVehicle.series = '';
    _edwRefreshSeries();
}

function _edwOnSeriesChange() {
    _edwVehicle.series = document.getElementById('edwSeries')?.value || '';
    // Rebuild engine codes for the chosen generation (e.g. Mazda "6 1gen")
    const ecWrap = document.getElementById('edwEngineCodeWrap');
    if (ecWrap) ecWrap.innerHTML = _buildEngineCodeField('edw', _edwVehicle.make, _edwVehicle.model, _edwVehicle.engineCode || '', _edwVehicle.series);
}

function _edwRefreshSeries() {
    const grp = document.getElementById('edwSeriesGroup');
    const sel = document.getElementById('edwSeries');
    if (!grp || !sel) return;
    const html = buildSeriesOptions(_edwVehicle.make, _edwVehicle.model, _edwVehicle.year, _edwVehicle.series || '');
    if (html) {
        sel.innerHTML = html;
        sel.style.display = '';
        const txt = document.getElementById('edwSeriesText');
        if (txt) txt.style.display = 'none';
    } else {
        sel.style.display = 'none';
        let txt = document.getElementById('edwSeriesText');
        if (!txt) {
            txt = document.createElement('input');
            txt.id = 'edwSeriesText';
            txt.className = 'edw-input';
            txt.type = 'text';
            txt.placeholder = 'e.g. N70, GX, Workmate';
            txt.addEventListener('input', () => { _edwVehicle.series = txt.value; });
            sel.parentNode.insertBefore(txt, sel.nextSibling);
        }
        txt.value = _edwVehicle.series || '';
        txt.style.display = '';
    }
    grp.style.display = '';
}

function _edwSaveField(field, value) {
    _edwVehicle[field] = value;
}

function _buildEngineCodeField(prefix, make, model, currentVal, series) {
    // Match Stock Lookup: try the generation-specific key first (e.g. "6 1gen"),
    // then the bare model — some models only have gen-specific engine entries.
    const key = series ? `${model} ${series}` : model;
    const engines = (typeof VEHICLE_ENGINES !== 'undefined' &&
        (VEHICLE_ENGINES[make]?.[key] || VEHICLE_ENGINES[make]?.[model])) || [];
    const id = `${prefix}EngineCode`;
    if (engines.length) {
        const opts = ['<option value="">Select engine code…</option>',
            ...engines.map(e => `<option value="${escapeHtml(e)}"${e === currentVal ? ' selected' : ''}>${escapeHtml(e)}</option>`)
        ].join('');
        return `<select id="${id}" class="edw-input" onchange="_edwSaveField('engineCode',this.value)">${opts}</select>`;
    }
    return `<input id="${id}" class="edw-input" type="text" maxlength="60" placeholder="e.g. 1GR-FE, RB26DETT" value="${escapeHtml(currentVal || '')}" oninput="_edwSaveField('engineCode',this.value)">`;
}

function _edwStep1Next() {
    if (!_edwVehicle.make || !_edwVehicle.model || !_edwVehicle.year) {
        showToast('Please select Make, Model and Year to continue');
        return;
    }
    // VIN / chassis is compulsory before stripping — every part must trace to its donor vehicle.
    if (!(_edwVehicle.vin || '').trim()) {
        showToast('Enter the VIN / chassis number before stripping — required for parts traceability');
        document.getElementById('edwVin')?.focus();
        return;
    }
    _edwStep = 2;
    _renderEdw();
    document.getElementById('edwBody')?.scrollTo(0, 0);
}

function _edwNewVehicle() {
    _edwVehicle = {};
    _edwItems = {};
    _edwJobId = null;
    _edwVehiclePhotos = EDW_VEHICLE_ANGLES.map(angle => ({ angle, file: null, previewUrl: null, selected: true }));
    _edwStep = 1;
    _renderEdw();
    document.getElementById('edwBody')?.scrollTo(0, 0);
}

async function _renderEdwStep0() {
    const body = document.getElementById('edwBody');
    const footer = document.getElementById('edwFooter');
    if (!body || !footer) return;
    body.style.padding = '20px';
    body.style.overflow = 'auto';
    body.style.display = '';
    body.style.flexDirection = '';
    footer.innerHTML = '';
    body.innerHTML = `<div style="text-align:center;color:#aaa;font-size:13px;padding:40px 0;">Loading stock…</div>`;
    if (!sb || !currentUserId) { body.innerHTML = `<div style="text-align:center;color:#aaa;font-size:13px;padding:40px 0;">Sign in required</div>`; return; }
    const { data: jobs } = await sb.from('dismantling_jobs')
        .select('id, stock_number, make, model, year, series, status, created_at, odometer, vin, vehicle_photos, colour, body_type')
        .eq('user_id', currentUserId)
        .in('status', ['in_stock', 'stripping'])
        .order('created_at', { ascending: false });
    _edwStock = jobs || [];
    _edwRenderStock();
}

function _edwRenderStock() {
    const body = document.getElementById('edwBody');
    if (!body) return;
    // Only build the toolbar once — subsequent filter changes only update the list
    if (!document.getElementById('edwStockList')) {
        body.innerHTML = `
            <div class="edw-stock-toolbar">
                <input class="edw-input edw-stock-search" id="edwStockSearch" placeholder="Search stock no., make, model, VIN…"
                    value="${escapeHtml(_edwStockFilter)}"
                    oninput="_edwStockFilter=this.value;_edwUpdateStockList()">
                <button class="edw-btn-primary edw-stock-add-btn" onclick="_edwNewVehicle()">+ Add Vehicle</button>
            </div>
            <div id="edwStockList"></div>
        `;
    }
    _edwUpdateStockList();
}

function _edwUpdateStockList() {
    const list = document.getElementById('edwStockList');
    if (!list) return;
    const q = _edwStockFilter.toLowerCase();
    const filtered = q
        ? _edwStock.filter(j =>
            (j.stock_number || '').toLowerCase().includes(q) ||
            (j.make || '').toLowerCase().includes(q) ||
            (j.model || '').toLowerCase().includes(q) ||
            (j.vin || '').toLowerCase().includes(q))
        : _edwStock;
    list.innerHTML = filtered.length === 0 ? `
        <div class="edw-stock-empty">
            ${_edwStock.length === 0
                ? 'No vehicles in stock yet. Tap <strong>+ Add Vehicle</strong> to get started.'
                : 'No results match your search.'}
        </div>
    ` : `<div class="edw-stock-list">${filtered.map(j => _edwStockCardHtml(j)).join('')}</div>`;
}

function _edwStockCardHtml(j) {
    const label = `${j.year} ${j.make} ${j.model}${j.series ? ' ' + j.series : ''}`;
    const badge = j.status === 'stripping'
        ? `<span class="edw-stock-badge edw-stock-badge-stripping">Dismantling</span>`
        : `<span class="edw-stock-badge edw-stock-badge-stock">In Stock</span>`;
    const date = new Date(j.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    const meta = [
        j.stock_number ? `#${escapeHtml(j.stock_number)}` : null,
        j.vin          ? `VIN: ${escapeHtml(j.vin)}` : null,
        j.odometer     ? `${Number(j.odometer).toLocaleString()} km` : null,
        date,
    ].filter(Boolean).join(' · ');
    return `
        <div class="edw-stock-card" onclick="_edwOpenStockCard(${j.id})">
            <div class="edw-stock-card-body">
                <div class="edw-stock-vehicle">${escapeHtml(label)}</div>
                <div class="edw-stock-meta">${meta}</div>
            </div>
            <div class="edw-stock-card-right">${badge}<span class="edw-stock-arrow">›</span></div>
        </div>
    `;
}

async function _edwOpenStockCard(jobId, activeTab = 'vehicle') {
    document.getElementById('edwStockCardOverlay')?.remove();
    const { data: job } = await sb.from('dismantling_jobs').select('*').eq('id', jobId).single();
    if (!job) { showToast('Could not load vehicle'); return; }
    const { data: parts } = await sb.from('listings')
        .select('id, title, price, status, stock_number, warehouse_bin, condition')
        .eq('dismantling_job_id', jobId)
        .eq('seller_id', currentUserId)
        .order('title');
    _edwStockCardData = { job, parts: parts || [] };
    _edwRenderStockCard(activeTab);
}

let _edwStockCardData = null;
let _edwStockCardEditMode = false;
let _edwPartsFilter = '';

function _edwRenderStockCard(activeTab = 'vehicle') {
    document.getElementById('edwStockCardOverlay')?.remove();
    const { job, parts } = _edwStockCardData;
    const label = `${job.year} ${job.make} ${job.model}${job.series ? ' ' + job.series : ''}`;
    const overlay = document.createElement('div');
    overlay.id = 'edwStockCardOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9900;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    const tabBtn = (id, label, active) =>
        `<button onclick="_edwStockCardTab('${id}')" style="padding:8px 18px;border:none;border-bottom:2px solid ${active?'#f07020':'transparent'};background:none;font-size:13px;font-weight:${active?'700':'500'};color:${active?'#f07020':'#888'};cursor:pointer;font-family:inherit;">${label}${id==='parts'&&parts.length?` <span style="background:#f07020;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;margin-left:4px;">${parts.length}</span>`:''}</button>`;

    overlay.innerHTML = `
        <div style="background:#fff;border-radius:14px;width:600px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.25);">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px 0;flex-shrink:0;">
                <span style="font-size:15px;font-weight:800;color:#333;">${escapeHtml(label)}</span>
                <button onclick="document.getElementById('edwStockCardOverlay')?.remove()" style="background:none;border:none;font-size:20px;color:#aaa;cursor:pointer;padding:4px;line-height:1;">✕</button>
            </div>
            <div style="display:flex;border-bottom:1px solid #eee;padding:0 18px;flex-shrink:0;">
                ${tabBtn('vehicle','Vehicle Info', activeTab==='vehicle')}
                ${tabBtn('parts','Parts', activeTab==='parts')}
            </div>
            <div id="edwStockCardBody" style="flex:1;overflow-y:auto;"></div>
            <div id="edwStockCardFooter" style="padding:14px 16px;border-top:1px solid #eee;flex-shrink:0;"></div>
        </div>`;
    document.body.appendChild(overlay);
    _edwStockCardTab(activeTab);
}

function _edwStockCardTab(tab) {
    const { job, parts } = _edwStockCardData;
    const body   = document.getElementById('edwStockCardBody');
    const footer = document.getElementById('edwStockCardFooter');
    if (!body || !footer) return;

    if (tab === 'vehicle') {
        const fields = [
            ['stock_number','Stock #',job.stock_number], ['vin','VIN',job.vin],
            ['colour','Colour',job.colour], ['odometer','Odometer',job.odometer],
            ['body_type','Body Type',job.body_type], ['engine_code','Engine Code',job.engine_code],
            ['variant','Engine / Variant',job.variant], ['transmission_type','Transmission',job.transmission_type],
            ['transmission_code','Trans Code',job.transmission_code], ['paint_code','Paint Code',job.paint_code],
            ['build_date','Build Date',job.build_date],
        ];
        const rowsHtml = fields.filter(([,, v]) => v).map(([key, label, val]) => `
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid #f4f4f4;gap:12px;">
                <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;color:#aaa;flex-shrink:0;">${label}</span>
                <span style="font-size:13px;color:#333;font-weight:600;text-align:right;">${escapeHtml(String(val))}</span>
            </div>`).join('');
        const emptyMsg = fields.every(([,,v]) => !v) ? '<div style="padding:20px;text-align:center;color:#aaa;font-size:13px;">No vehicle details recorded</div>' : '';
        body.innerHTML = `<div id="edwPhotoSection">${_edwPhotoSectionHTML()}</div><div style="padding:4px 16px 12px;">${rowsHtml}${emptyMsg}</div>`;
        footer.innerHTML = `
            <div style="display:flex;gap:10px;">
                <button onclick="_edwEditVehicle(${job.id})" style="flex:1;padding:12px;border:1.5px solid #f07020;color:#f07020;background:#fff;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;">Edit Vehicle</button>
                <button onclick="_edwStartWalkaround(${job.id})" style="flex:2;padding:12px;background:#f07020;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;">Select Parts to Dismantle →</button>
            </div>`;
    } else {
        _edwPartsFilter = '';
        body.innerHTML = _edwPartsTabHtml(parts);
        footer.innerHTML = `<button onclick="_edwStartWalkaround(${job.id})" style="width:100%;padding:12px;background:#f07020;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;">Select Parts to Dismantle →</button>`;
    }
}

// ─── EDW stock-card vehicle photos — view + edit (add / remove) ───────────
let _edwPhotosEdit = [];

function _edwPhotoSectionHTML() {
    const photos = _edwStockCardData?.job?.vehicle_photos || [];
    const strip = photos.length
        ? `<div style="display:flex;gap:8px;overflow-x:auto;padding:0 16px 10px;">${photos.map(u => `<img src="${escapeHtml(u)}" alt="" style="height:80px;width:auto;border-radius:6px;flex-shrink:0;" loading="lazy">`).join('')}</div>`
        : `<div style="padding:0 16px 10px;color:#aaa;font-size:13px;">No vehicle photos yet</div>`;
    return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 6px;">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;color:#aaa;">Photos${photos.length ? ` (${photos.length})` : ''}</span>
            <button class="vsc-photo-edit-btn" onclick="_edwEditPhotos()">${photos.length ? 'Edit Photos' : '+ Add Photos'}</button>
        </div>
        ${strip}
        <div style="border-bottom:1px solid #eee;"></div>`;
}

function _edwEditPhotos() {
    _edwPhotosEdit = [...(_edwStockCardData?.job?.vehicle_photos || [])];
    _edwRenderPhotoEdit();
}

function _edwRenderPhotoEdit() {
    const sec = document.getElementById('edwPhotoSection');
    if (!sec) return;
    const tiles = _edwPhotosEdit.map((u, i) => `
        <div class="vsc-photo-edit-tile" style="width:110px;height:80px;">
            <img src="${escapeHtml(u)}" alt="">
            <button class="vsc-photo-remove" onclick="_edwRemovePhoto(${i})" title="Remove photo">✕</button>
        </div>`).join('');
    sec.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 8px;">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;color:#aaa;">Edit Photos (${_edwPhotosEdit.length})</span>
            <div style="display:flex;gap:8px;">
                <button class="vsc-photo-edit-btn" onclick="_edwCancelEditPhotos()">Cancel</button>
                <button class="vsc-photo-save-btn" onclick="_edwSavePhotos()">Done</button>
            </div>
        </div>
        <div class="vsc-photos vsc-photos-edit" style="padding:0 16px 10px;">
            ${tiles}
            <label class="vsc-photo-add-tile" style="width:110px;height:80px;">
                <input type="file" accept="image/*" multiple style="display:none" onchange="_edwAddPhotos(this)">
                <span>+ Add</span>
            </label>
        </div>
        <div style="border-bottom:1px solid #eee;"></div>`;
}

function _edwRemovePhoto(i) {
    _edwPhotosEdit.splice(i, 1);
    _edwRenderPhotoEdit();
}

async function _edwAddPhotos(input) {
    const files = Array.from(input.files || []);
    input.value = '';
    const jobId = _edwStockCardData?.job?.id;
    if (!files.length || !jobId || !sb) return;
    showToast('Uploading…');
    const urls = [];
    for (let i = 0; i < files.length; i++) {
        try {
            const b64 = await _fileToBase64(files[i]);
            if (!b64?.startsWith('data:')) continue;
            const compressed = await compressBase64(b64, 1600, 0.88);
            const blob = await (await fetch(compressed)).blob();
            const path = `vehicle-photos/${jobId}/${Date.now()}_${i}.jpg`;
            const { error } = await sb.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (!error) { const { data } = sb.storage.from('listing-images').getPublicUrl(path); urls.push(data.publicUrl); }
        } catch (_) {}
    }
    if (!urls.length) { showToast('Upload failed'); return; }
    _edwPhotosEdit.push(...urls);
    _edwRenderPhotoEdit();
    showToast(`${urls.length} photo${urls.length !== 1 ? 's' : ''} added`);
}

async function _edwSavePhotos() {
    const jobId = _edwStockCardData?.job?.id;
    if (!jobId || !sb) return;
    const { error } = await sb.from('dismantling_jobs').update({ vehicle_photos: _edwPhotosEdit }).eq('id', jobId);
    if (error) { showToast('Save failed: ' + error.message); return; }
    _edwStockCardData.job.vehicle_photos = [..._edwPhotosEdit];
    const sec = document.getElementById('edwPhotoSection');
    if (sec) sec.innerHTML = _edwPhotoSectionHTML();
    showToast('Photos saved');
}

function _edwCancelEditPhotos() {
    const sec = document.getElementById('edwPhotoSection');
    if (sec) sec.innerHTML = _edwPhotoSectionHTML();
}

function _edwPartsTabHtml(parts) {
    const q = _edwPartsFilter.toLowerCase();
    const filtered = q ? parts.filter(p =>
        (p.title||'').toLowerCase().includes(q) ||
        (p.stock_number||'').toLowerCase().includes(q) ||
        (p.warehouse_bin||'').toLowerCase().includes(q)
    ) : parts;

    const statusColor = s => s === 'sold' ? '#ef4444' : s === 'pending' ? '#f59e0b' : '#22c55e';
    const statusLabel = s => s === 'sold' ? 'SOLD' : s === 'pending' ? 'PENDING' : 'ACTIVE';

    const rowsHtml = filtered.length ? filtered.map(p => {
        const s = p.status || 'active';
        const meta = [
            p.stock_number ? `#${escapeHtml(p.stock_number)}` : null,
            p.warehouse_bin ? `Bin: ${escapeHtml(p.warehouse_bin)}` : null,
            p.condition ? escapeHtml(p.condition) : null,
        ].filter(Boolean).join(' · ');
        return `<div onclick="_edwPartStatusPicker(event,${p.id},'${s}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f4f4f4;gap:10px;cursor:pointer;-webkit-tap-highlight-color:rgba(240,112,32,0.08);">
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title||'Untitled')}</div>
                ${meta ? `<div style="font-size:11px;color:#aaa;margin-top:2px;">${meta}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <span style="font-size:13px;font-weight:700;color:#f07020;">${p.price != null ? '$'+Number(p.price).toLocaleString('en-AU') : '—'}</span>
                <span style="padding:4px 10px;border:1.5px solid ${statusColor(s)};color:${statusColor(s)};border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;">● ${statusLabel(s)} ▾</span>
            </div>
        </div>`;
    }).join('') : `<div style="padding:24px;text-align:center;color:#aaa;font-size:13px;">${q ? 'No parts match your search' : 'No parts published yet for this vehicle'}</div>`;

    return `<div style="padding:10px 16px 4px;">
        <input id="edwPartsSearch" type="text" placeholder="Search parts, stock #, bin…" value="${escapeHtml(_edwPartsFilter)}"
            oninput="_edwPartsFilter=this.value;document.getElementById('edwPartsBody').innerHTML=_edwPartsRowsHtml(window._edwStockCardData?.parts||[])"
            style="width:100%;padding:9px 14px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;">
        <div id="edwPartsBody">${rowsHtml}</div>
    </div>`;
}

function _edwPartStatusPicker(e, listingId, currentStatus) {
    e.stopPropagation();
    document.getElementById('edwPartStatusMenu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'edwPartStatusMenu';
    const x = Math.min(e.clientX, window.innerWidth - 150);
    const y = Math.min(e.clientY + 8, window.innerHeight - 130);
    menu.style.cssText = `position:fixed;top:${y}px;left:${Math.max(10,x)}px;background:#fff;border:1px solid #eee;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:9999;min-width:130px;padding:6px 0;`;
    ['active','pending','sold'].forEach(s => {
        const opt = document.createElement('div');
        opt.textContent = s === 'active' ? '● Active' : s === 'pending' ? '⏳ Pending' : '✓ Sold';
        opt.style.cssText = `padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;color:${s===currentStatus?'#f07020':'#333'};`;
        opt.onmouseenter = () => opt.style.background = '#f9f9f9';
        opt.onmouseleave = () => opt.style.background = '';
        opt.onclick = () => { menu.remove(); _edwChangePartStatus(listingId, s); };
        menu.appendChild(opt);
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }), 10);
}

async function _edwChangePartStatus(listingId, status) {
    const { error } = await sb.from('listings').update({ status }).eq('id', listingId);
    if (error) { showToast('Failed to update status'); return; }
    const part = _edwStockCardData?.parts.find(p => p.id === listingId);
    if (part) part.status = status;
    const listing = userListings.find(l => l.supabaseId === listingId || l.id === listingId);
    if (listing) { listing.status = status === 'active' ? undefined : status; saveUserListings(); renderMainGrid(); renderMyParts(); }
    const body = document.getElementById('edwPartsBody');
    if (body) body.innerHTML = _edwPartsRowsHtml(_edwStockCardData.parts);
    showToast(status === 'sold' ? 'Marked as sold' : status === 'pending' ? 'Marked as pending' : 'Relisted as active');
}

function _edwPartsRowsHtml(parts) {
    const q = _edwPartsFilter.toLowerCase();
    const filtered = q ? parts.filter(p =>
        (p.title||'').toLowerCase().includes(q) ||
        (p.stock_number||'').toLowerCase().includes(q) ||
        (p.warehouse_bin||'').toLowerCase().includes(q)
    ) : parts;
    const statusColor = s => s === 'sold' ? '#ef4444' : s === 'pending' ? '#f59e0b' : '#22c55e';
    const statusLabel = s => s === 'sold' ? 'SOLD' : s === 'pending' ? 'PENDING' : 'ACTIVE';
    if (!filtered.length) return `<div style="padding:24px;text-align:center;color:#aaa;font-size:13px;">${q ? 'No parts match your search' : 'No parts published yet'}</div>`;
    return filtered.map(p => {
        const s = p.status || 'active';
        const meta = [p.stock_number?`#${escapeHtml(p.stock_number)}`:null, p.warehouse_bin?`Bin: ${escapeHtml(p.warehouse_bin)}`:null, p.condition?escapeHtml(p.condition):null].filter(Boolean).join(' · ');
        return `<div onclick="_edwPartStatusPicker(event,${p.id},'${s}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f4f4f4;gap:10px;cursor:pointer;-webkit-tap-highlight-color:rgba(240,112,32,0.08);">
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title||'Untitled')}</div>
                ${meta?`<div style="font-size:11px;color:#aaa;margin-top:2px;">${meta}</div>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <span style="font-size:13px;font-weight:700;color:#f07020;">${p.price!=null?'$'+Number(p.price).toLocaleString('en-AU'):'—'}</span>
                <span style="padding:4px 10px;border:1.5px solid ${statusColor(s)};color:${statusColor(s)};border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;">● ${statusLabel(s)} ▾</span>
            </div>
        </div>`;
    }).join('');
}

function _edwEditVehicle(jobId) {
    const { job } = _edwStockCardData;
    const body   = document.getElementById('edwStockCardBody');
    const footer = document.getElementById('edwStockCardFooter');
    if (!body || !footer) return;
    const field = (key, label, val, type='text') =>
        `<div style="margin-bottom:12px;">
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;color:#aaa;margin-bottom:4px;">${label}</label>
            <input id="edwEdit_${key}" type="${type}" value="${escapeHtml(String(val||''))}" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;" onfocus="this.style.borderColor='#f07020'" onblur="this.style.borderColor='#e0e0e0'">
        </div>`;
    body.innerHTML = `<div style="padding:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
            ${field('year','Year',job.year,'number')}
            ${field('make','Make',job.make)}
            ${field('model','Model',job.model)}
            ${field('series','Series / Variant',job.series)}
            ${field('stock_number','Stock #',job.stock_number)}
            ${field('vin','VIN',job.vin)}
            ${field('colour','Colour',job.colour)}
            ${field('odometer','Odometer (km)',job.odometer,'number')}
            ${field('body_type','Body Type',job.body_type)}
            ${field('engine_code','Engine Code',job.engine_code)}
            ${field('variant','Engine / Variant',job.variant)}
            ${field('transmission_type','Transmission',job.transmission_type)}
            ${field('transmission_code','Trans Code',job.transmission_code)}
            ${field('paint_code','Paint Code',job.paint_code)}
            ${field('build_date','Build Date',job.build_date)}
        </div>
    </div>`;
    footer.innerHTML = `
        <div style="display:flex;gap:10px;">
            <button onclick="_edwStockCardTab('vehicle')" style="flex:1;padding:12px;border:1.5px solid #ddd;color:#888;background:#fff;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;">Cancel</button>
            <button onclick="_edwSaveVehicle(${jobId})" style="flex:2;padding:12px;background:#f07020;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;">Save Changes</button>
        </div>`;
}

async function _edwSaveVehicle(jobId) {
    const get = key => document.getElementById(`edwEdit_${key}`)?.value.trim() || null;
    const updates = {
        year: get('year') ? Number(get('year')) : null,
        make: get('make'), model: get('model'), series: get('series'),
        stock_number: get('stock_number'), vin: get('vin'), colour: get('colour'),
        odometer: get('odometer') ? Number(get('odometer')) : null,
        body_type: get('body_type'), engine_code: get('engine_code'), variant: get('variant'),
        transmission_type: get('transmission_type'), transmission_code: get('transmission_code'),
        paint_code: get('paint_code'), build_date: get('build_date'),
    };
    const { error } = await sb.from('dismantling_jobs').update(updates).eq('id', jobId);
    if (error) { showToast('Save failed: ' + error.message); return; }
    Object.assign(_edwStockCardData.job, updates);
    const stub = _edwStock.find(j => j.id === jobId);
    if (stub) Object.assign(stub, updates);
    const label = `${updates.year||''} ${updates.make||''} ${updates.model||''}${updates.series?' '+updates.series:''}`.trim();
    const titleEl = document.querySelector('#edwStockCardOverlay span[style*="font-size:15px"]');
    if (titleEl) titleEl.textContent = label;

    // Always stamp donor fields onto the parts (idempotent) — repairs parts published
    // before they were ever synced, even when nothing changed in this save.
    const n = await _backfillJobToListings(jobId, _donorFieldsFromJob(_edwStockCardData.job));
    const { data: freshParts } = await sb.from('listings')
        .select('id, title, price, status, stock_number, warehouse_bin, condition')
        .eq('dismantling_job_id', jobId).eq('seller_id', currentUserId).order('title');
    if (freshParts && freshParts.length) _edwStockCardData.parts = freshParts;
    showToast(n ? `Synced to ${n} listed part${n !== 1 ? 's' : ''}` : 'Vehicle updated');
    _edwStockCardTab('vehicle');
}

// Donor-vehicle fields every part off the car shares (kms, stock #, VIN, fits-year,
// variant). Maps a dismantling_jobs row to the matching listing column names.
function _donorFieldsFromJob(job) {
    return {
        stock_number: job.stock_number || null,
        odometer:     (job.odometer != null && job.odometer !== '') ? Number(job.odometer) : null,
        chassis_vin:  job.vin || null,
        fits_year:    job.year ? Number(job.year) : null,
        variant:      job.variant || null,
    };
}

// When a stock card is edited after parts are published, stamp the donor fields onto
// every part off that vehicle so My Listings / Stock Lookup stay in sync. We match
// BOTH the internal link (dismantling_job_id) AND the shared stock number — so a
// vehicle whose parts were published without the job link still updates. warehouse_bin
// is per-part and never touched; make/model/series live in listing_vehicles.
async function _backfillJobToListings(jobId, fields) {
    if (!sb || !currentUserId || !jobId) return 0;
    const ids = new Set();
    const { data: byJob } = await sb.from('listings')
        .select('id').eq('seller_id', currentUserId).eq('dismantling_job_id', jobId);
    (byJob || []).forEach(p => ids.add(p.id));
    if (fields.stock_number) {
        const { data: bySn } = await sb.from('listings')
            .select('id').eq('seller_id', currentUserId).eq('stock_number', fields.stock_number);
        (bySn || []).forEach(p => ids.add(p.id));
    }
    if (!ids.size) return 0;
    await sb.from('listings').update(fields).eq('seller_id', currentUserId).in('id', [...ids]);
    await loadUserListingsFromSupabase(currentUserId);
    return ids.size;
}

function _edwStartWalkaround(jobId) {
    const job = _edwStock.find(j => j.id === jobId);
    if (!job) return;
    // VIN / chassis is compulsory before stripping — required for parts traceability.
    if (!(job.vin || '').trim()) {
        showToast('Add the VIN / chassis number before stripping (Edit Vehicle → VIN)');
        return;
    }
    document.getElementById('edwStockCardOverlay')?.remove();
    _edwJobId = jobId;
    _edwItems = {};
    _edwVehicle = {
        make: job.make, model: job.model, year: String(job.year),
        series: job.series || '', bodyType: job.body_type || '',
        vin: job.vin || '', paintCode: job.paint_code || '',
        engineCode: job.engine_code || '', transCode: job.transmission_code || '',
        transType: job.transmission_type || '', odometer: job.odometer || '',
        buildDate: job.build_date || '', colour: job.colour || '',
        stockNumber: job.stock_number || '', variant: job.variant || '',
        vehicleCost: job.vehicle_cost ? String(job.vehicle_cost) : '',
        vehiclePhotos: job.vehicle_photos || [],
    };
    _edwVehiclePhotos = EDW_VEHICLE_ANGLES.map(angle => ({ angle, file: null, previewUrl: null, selected: false }));
    _edwStep = 2;
    _renderEdw();
    document.getElementById('edwBody')?.scrollTo(0, 0);
}

async function _edwUploadVehiclePhotos(jobId, photosArr = null) {
    const photos   = photosArr || _edwVehiclePhotos;
    const toUpload = photos.filter(p => (p.base64 || p.file));
    if (!toUpload.length) return [];
    const urls = [];
    for (let i = 0; i < toUpload.length; i++) {
        const vp = toUpload[i];
        try {
            const b64 = vp.base64 || await _fileToBase64(vp.file);
            if (!b64?.startsWith('data:')) continue;
            const compressed = await compressBase64(b64, 1600, 0.88);
            const blob = await (await fetch(compressed)).blob();
            const path = `vehicle-photos/${jobId}/${Date.now()}_${i}.jpg`;
            const { error } = await sb.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (!error) {
                const { data } = sb.storage.from('listing-images').getPublicUrl(path);
                urls.push(data.publicUrl);
            }
        } catch (_) {}
    }
    return urls;
}

async function _edwSaveToStock() {
    if (!_edwVehicle.make || !_edwVehicle.model || !_edwVehicle.year) {
        showToast('Please select Make, Model and Year');
        return;
    }
    if (!sb || !currentUserId) { showToast('Sign in required'); return; }
    const footer = document.getElementById('edwFooter');
    if (footer) footer.innerHTML = `<div class="edw-footer-meta">Saving to stock…</div>`;
    const v = _edwVehicle;
    const { data: job, error } = await sb.from('dismantling_jobs').insert({
        user_id: currentUserId, status: 'in_stock',
        make: v.make, model: v.model, year: Number(v.year),
        series: v.series || null, body_type: v.bodyType || null,
        vin: v.vin || null, paint_code: v.paintCode || null,
        engine_code: v.engineCode || null, transmission_code: v.transCode || null,
        transmission_type: v.transType || null,
        odometer: v.odometer ? Number(v.odometer) : null,
        build_date: v.buildDate || null, colour: v.colour || null,
        stock_number: v.stockNumber || null, variant: v.variant || null,
        vehicle_cost: v.vehicleCost ? Number(v.vehicleCost) : null,
    }).select('id').single();
    if (error || !job) { showToast('Failed to save vehicle'); _renderEdwStep1(); return; }
    _edwJobId = job.id;
    if (footer) footer.innerHTML = `<div class="edw-footer-meta">Uploading photos…</div>`;
    const photoUrls = await _edwUploadVehiclePhotos(job.id);
    if (photoUrls.length) {
        await sb.from('dismantling_jobs').update({ vehicle_photos: photoUrls }).eq('id', job.id);
    }
    showToast('Vehicle saved to stock');
    _edwStep = 0;
    await _renderEdwStep0();
}

function _renderEdwStep2() {
    const body   = document.getElementById('edwBody');
    const footer = document.getElementById('edwFooter');
    if (!body || !footer) return;
    _renderEdwStep2Table(body, footer);
}

function _renderEdwStep2Table(body, footer) {
    body.style.padding       = '0';
    body.style.overflow      = 'hidden';
    body.style.display       = 'flex';
    body.style.flexDirection = 'column';

    const v = _edwVehicle;
    const vehicleLabel = `${v.year} ${v.make} ${v.model}${v.series ? ' ' + v.series : ''}`;
    const checkedCount = Object.keys(_edwItems).length;

    const metaParts = [
        v.stockNumber ? `#${escapeHtml(v.stockNumber)}` : null,
        v.vin         ? `VIN: ${escapeHtml(v.vin)}` : null,
        v.odometer    ? `${Number(v.odometer).toLocaleString()} km` : null,
        v.colour      ? escapeHtml(v.colour) : null,
        v.transType   ? escapeHtml(v.transType) : null,
    ].filter(Boolean).join(' &nbsp;·&nbsp; ');
    const thumbs = (v.vehiclePhotos || []).slice(0, 4)
        .map(url => `<img class="edw-vb-thumb" src="${escapeHtml(url)}" alt="">`)
        .join('');

    body.innerHTML = `
        <div class="edw-vehicle-banner" style="flex-shrink:0;">
            <div class="edw-vb-left">
                <div class="edw-vehicle-title">${escapeHtml(vehicleLabel)}</div>
                ${metaParts ? `<div class="edw-vehicle-sub">${metaParts}</div>` : ''}
            </div>
            ${thumbs ? `<div class="edw-vb-photos">${thumbs}</div>` : ''}
        </div>
        <div class="edw-3panel" id="edwPanel">
            <div class="edw-3ph">Zone</div>
            <div class="edw-3ph">Assembly</div>
            <div class="edw-3ph">Part</div>
            <div class="edw-3ph">Options</div>
            <div class="edw-3pcol" id="edwPanelZones">${_buildPanelZones()}</div>
            <div class="edw-3pcol" id="edwPanelAsms">${_buildPanelAsms(_edwSelectedZone)}</div>
            <div class="edw-3pcol" id="edwPanelParts">${_buildPanelParts(_edwSelectedZone, _edwSelectedAsm)}</div>
            <div class="edw-3pcol" id="edwPanelQuals">${_buildEdwPanelQuals()}</div>
        </div>
    `;

    const [zW, aW, pW] = _slComputeColWidths();
    const panel = document.getElementById('edwPanel');
    if (panel) panel.style.gridTemplateColumns = `${zW}px ${aW}px ${pW}px 1fr`;

    footer.innerHTML = `
        <div class="edw-footer-meta">${checkedCount} part${checkedCount !== 1 ? 's' : ''} selected</div>
        <button class="edw-btn-secondary" onclick="_edwStep2Back()">← Back</button>
        <button class="edw-btn-primary" onclick="_edwStep2Next()">Review ${checkedCount} Part${checkedCount !== 1 ? 's' : ''} →</button>
    `;
}

function _buildPanelZones() {
    const f = EDW_BODY_FILTER[_edwVehicle.bodyType] || {};
    const hiddenZones = new Set(f.hideZones || []);
    return EDW_TAXONOMY.map((zone, zI) => {
        if (hiddenZones.has(zone.zone)) return '';
        const count  = Object.keys(_edwItems).filter(k => k.startsWith(zI + ':')).length;
        const active = _edwSelectedZone === zI;
        return `<div class="edw-panel-row${active ? ' active' : ''}" onclick="_edwSelectZonePanel(${zI})">
            <span>${escapeHtml(zone.zone)}</span>
            ${count ? `<span class="edw-panel-badge">${count}</span>` : ''}
        </div>`;
    }).join('');
}

function _buildPanelAsms(zI) {
    const zone = EDW_TAXONOMY[zI];
    if (!zone) return '';
    const f = EDW_BODY_FILTER[_edwVehicle.bodyType] || {};
    const hiddenAsms = new Set(f.hideAsms || []);
    return zone.assemblies.map((asm, aI) => {
        if (hiddenAsms.has(asm.name)) return '';
        const count  = asm.parts.filter((_, pI) => !!_edwItems[`${zI}:${aI}:${pI}`]).length;
        const active = _edwSelectedAsm === aI;
        return `<div class="edw-panel-row${active ? ' active' : ''}" onclick="_edwSelectAsmPanel(${aI})">
            <span>${escapeHtml(asm.name)}</span>
            ${count ? `<span class="edw-panel-badge">${count}</span>` : ''}
        </div>`;
    }).join('');
}

function _buildEdwPartControls(key, zI) {
    const item = _edwItems[key];
    if (!item) return '';
    return `
    <div class="edw-pcell edw-pcell-grade">
        ${['A','B','C','D'].map(g => `<button class="edw-grade-btn${item.grade === g ? ' active' : ''}" onclick="_edwSetGrade('${key}',${zI},'${g}')">${g}</button>`).join('')}
    </div>
    <div class="edw-pcell edw-pcell-price">
        <span class="edw-price-pre">$</span>
        <input class="edw-tbl-price-inp" style="width:64px;" type="number" min="0" step="1" placeholder="0"
            value="${item.price || ''}" oninput="_edwGridPrice('${key}',this.value)">
    </div>
    <div class="edw-pcell edw-pcell-notes">
        <input class="edw-tbl-notes-inp" type="text" placeholder="Notes"
            value="${escapeHtml(item.notes || '')}" oninput="_edwGridNotes('${key}',this.value)">
    </div>
    <div class="edw-pcell edw-pcell-photo">
        <label class="edw-tbl-photo-lbl">
            <input type="file" accept="image/*" multiple style="display:none" onchange="_edwGridPhoto('${key}',this)">
            <span>📷</span>
            ${item.photos?.length ? `<span class="edw-tbl-photo-count">(${item.photos.length})</span>` : ''}
        </label>
    </div>`;
}

function _buildPanelParts(zI, aI) {
    const groups = _edwGetPartGroups(zI, aI);
    if (!groups.length) return `<div class="edw-panel-empty">Select an assembly</div>`;
    return groups.map(({ base, quals, directPI }, gIdx) => {
        const isSelected   = _edwSelectedPartBase === gIdx;
        const checkedCount = quals.length
            ? quals.filter(q => !!_edwItems[`${zI}:${aI}:${q.pI}`]).length
            : (directPI !== null && !!_edwItems[`${zI}:${aI}:${directPI}`] ? 1 : 0);
        return `
        <div class="edw-panel-row${isSelected ? ' active' : ''}" onclick="_edwSelectPartBase(${gIdx})" style="cursor:pointer;">
            <span>${escapeHtml(base)}</span>
            ${checkedCount
                ? `<span class="edw-panel-badge">${checkedCount}</span>`
                : quals.length ? `<span style="color:#bbb;font-size:11px;flex-shrink:0;">▸</span>` : ''}
        </div>`;
    }).join('');
}

function _buildEdwPanelQuals() {
    if (_edwSelectedPartBase === null) {
        return `<div class="edw-panel-empty" style="font-size:12px;padding:20px 10px;text-align:center;">← select<br>a part</div>`;
    }
    const zI = _edwSelectedZone, aI = _edwSelectedAsm;
    const groups = _edwGetPartGroups(zI, aI);
    const group  = groups[_edwSelectedPartBase];
    if (!group) return '';

    if (!group.quals.length) {
        const key     = `${zI}:${aI}:${group.directPI}`;
        const checked = !!_edwItems[key];
        const asmName = EDW_TAXONOMY[zI]?.assemblies[aI]?.name || '';
        const isEngine = asmName === 'Engine' && group.base === 'Complete Engine';

        // Complete Engine → inline variant dropdown from VEHICLE_ENGINES (same data Stock
        // Lookup uses). One car = one engine; picking it tags the listed engine for search.
        if (isEngine) {
            const { make, model, series } = _edwVehicle;
            const variants = (typeof VEHICLE_ENGINES !== 'undefined' &&
                (VEHICLE_ENGINES[make]?.[series ? `${model} ${series}` : model] || VEHICLE_ENGINES[make]?.[model])) || [];
            if (variants.length) {
                const opts = ['<option value="">Select engine…</option>',
                    ...variants.map(e => `<option value="${escapeHtml(e)}"${e === _edwVehicle.engineCode ? ' selected' : ''}>${escapeHtml(e)}</option>`)
                ].join('');
                return `
                <div class="edw-panel-part${checked ? ' checked' : ''}">
                    <div class="edw-pcell edw-pcell-name" style="gap:8px;">
                        <input type="checkbox" ${checked ? 'checked' : ''} onchange="_edwTogglePart('${key}',${zI},${aI},${group.directPI},this.checked)" style="flex-shrink:0;cursor:pointer;">
                        <select class="edw-engine-pick" onchange="_edwSetEngineVariant(this.value)">${opts}</select>
                    </div>
                    ${_buildEdwPartControls(key, zI)}
                </div>`;
            }
        }

        const transCode  = (!isEngine && asmName === 'Gearbox / Transmission'
            && (group.base === 'Auto Transmission' || group.base === 'CVT Transmission')
            && _edwVehicle.transCode)
            ? _edwVehicle.transCode : null;
        const displayCode = (isEngine && _edwVehicle.engineCode) ? _edwVehicle.engineCode : transCode;
        const label = displayCode
            ? `<span class="edw-part-name">${escapeHtml(displayCode)}</span>`
            : `<span class="edw-part-name" style="font-style:italic;color:#999;">Select</span>`;
        return `
        <div class="edw-panel-part${checked ? ' checked' : ''}">
            <div class="edw-pcell edw-pcell-name">
                <label class="edw-part-check">
                    <input type="checkbox" ${checked ? 'checked' : ''} onchange="_edwTogglePart('${key}',${zI},${aI},${group.directPI},this.checked)">
                    ${label}
                </label>
            </div>
            ${_buildEdwPartControls(key, zI)}
        </div>`;
    }

    return group.quals.map(({ label, pI }) => {
        const key     = `${zI}:${aI}:${pI}`;
        const checked = !!_edwItems[key];
        return `
        <div class="edw-panel-part${checked ? ' checked' : ''}">
            <div class="edw-pcell edw-pcell-name">
                <label class="edw-part-check">
                    <input type="checkbox" ${checked ? 'checked' : ''} onchange="_edwTogglePart('${key}',${zI},${aI},${pI},this.checked)">
                    <span class="edw-part-name">${escapeHtml(label)}</span>
                </label>
            </div>
            ${_buildEdwPartControls(key, zI)}
        </div>`;
    }).join('');
}

function _edwSetEngineVariant(val) {
    _edwVehicle.engineCode = val;
    const q = document.getElementById('edwPanelQuals');
    if (q) q.innerHTML = _buildEdwPanelQuals();
}

function _edwSelectZonePanel(zI) {
    _edwSelectedZone = zI; _edwSelectedAsm = -1; _edwSelectedPartBase = null;
    const z = document.getElementById('edwPanelZones');
    const a = document.getElementById('edwPanelAsms');
    const p = document.getElementById('edwPanelParts');
    const q = document.getElementById('edwPanelQuals');
    if (z) z.innerHTML = _buildPanelZones();
    if (a) { a.innerHTML = _buildPanelAsms(zI); a.scrollTop = 0; }
    if (p) { p.innerHTML = _buildPanelParts(zI, -1); p.scrollTop = 0; }
    if (q) q.innerHTML = _buildEdwPanelQuals();
    _updateEdwFooterCount();
}

function _edwSelectAsmPanel(aI) {
    _edwSelectedAsm = aI; _edwSelectedPartBase = null;
    const a = document.getElementById('edwPanelAsms');
    const p = document.getElementById('edwPanelParts');
    const q = document.getElementById('edwPanelQuals');
    if (a) a.innerHTML = _buildPanelAsms(_edwSelectedZone);
    if (p) { p.innerHTML = _buildPanelParts(_edwSelectedZone, aI); p.scrollTop = 0; }
    if (q) q.innerHTML = _buildEdwPanelQuals();
}

function _edwSelectPartBase(gIdx) {
    _edwSelectedPartBase = (_edwSelectedPartBase === gIdx) ? null : gIdx;
    const p = document.getElementById('edwPanelParts');
    const q = document.getElementById('edwPanelQuals');
    if (p) p.innerHTML = _buildPanelParts(_edwSelectedZone, _edwSelectedAsm);
    if (q) q.innerHTML = _buildEdwPanelQuals();
}

function _edwGetPartGroups(zI, aI) {
    const asm = EDW_TAXONOMY[zI]?.assemblies[aI];
    if (!asm) return [];
    const map = new Map();
    asm.parts.forEach((part, pI) => {
        const m = part.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        const base = m ? m[1].trim() : part;
        const qual = m ? m[2].trim() : null;
        if (!map.has(base)) map.set(base, { quals: [], directPI: null });
        const entry = map.get(base);
        if (qual) entry.quals.push({ label: qual, pI });
        else entry.directPI = pI;
    });
    return [...map.entries()].map(([base, { quals, directPI }]) => ({ base, quals, directPI }));
}


function _renderEdwStep2MasterDetail(body, footer) {
    body.style.padding       = '0';
    body.style.overflow      = 'hidden';
    body.style.display       = 'flex';
    body.style.flexDirection = 'column';

    const v = _edwVehicle;
    const vehicleLabel = `${v.year} ${v.make} ${v.model}${v.series ? ' ' + v.series : ''}`;
    const checkedCount = Object.keys(_edwItems).length;

    body.innerHTML = `
        <div class="edw-vehicle-banner" style="flex-shrink:0;">
            <div class="edw-vehicle-title">${escapeHtml(vehicleLabel)}</div>
            ${v.vin ? `<div class="edw-vehicle-sub">VIN: ${escapeHtml(v.vin)}</div>` : ''}
        </div>
        <div class="edw-split" id="edwSplit">
            <div class="edw-zone-nav" id="edwZoneNav">${_buildZoneNav()}</div>
            <div class="edw-zone-detail" id="edwZoneDetail">${_buildAssemblies(EDW_TAXONOMY[_edwSelectedZone], _edwSelectedZone)}</div>
        </div>
    `;

    footer.innerHTML = `
        <div class="edw-footer-meta">${checkedCount} part${checkedCount !== 1 ? 's' : ''} selected</div>
        <button class="edw-btn-secondary" onclick="_edwStep2Back()">← Back</button>
        <button class="edw-btn-primary" onclick="_edwStep2Next()">Review ${checkedCount} Part${checkedCount !== 1 ? 's' : ''} →</button>
    `;
}

function _edwStep2Back() {
    const body = document.getElementById('edwBody');
    if (body) { body.style.padding = ''; body.style.overflow = ''; body.style.display = ''; body.style.flexDirection = ''; }
    _edwStep = 1; _renderEdw();
}

function _buildZoneNav() {
    return EDW_TAXONOMY.map((zone, zI) => {
        const count = Object.keys(_edwItems).filter(k => k.startsWith(zI + ':')).length;
        return `
        <button class="edw-zone-nav-item${_edwSelectedZone === zI ? ' active' : ''}" onclick="_edwSelectZone(${zI})">
            <span class="edw-zone-nav-name">${escapeHtml(zone.zone)}</span>
            ${count ? `<span class="edw-zone-nav-badge">${count}</span>` : ''}
        </button>`;
    }).join('');
}

function _edwSelectZone(zI) {
    _edwSelectedZone = zI;
    _edwSelectedAsm  = -1;
    const nav = document.getElementById('edwZoneNav');
    if (nav) nav.innerHTML = _buildZoneNav();
    const detail = document.getElementById('edwZoneDetail');
    if (detail) { detail.innerHTML = _buildAssemblies(EDW_TAXONOMY[zI], zI); detail.scrollTop = 0; }
}

function _edwSelectAsm(aI) {
    _edwSelectedAsm = aI;
    const detail = document.getElementById('edwZoneDetail');
    if (detail) detail.innerHTML = _buildAssemblies(EDW_TAXONOMY[_edwSelectedZone], _edwSelectedZone);
}

function _buildAssemblies(zone, zI) {
    return zone.assemblies.map((asm, aI) => {
        const isOpen   = _edwSelectedAsm === aI;
        const asmCount = asm.parts.filter((_, pI) => !!_edwItems[`${zI}:${aI}:${pI}`]).length;
        const parts = isOpen ? asm.parts.map((part, pI) => {
            const key     = `${zI}:${aI}:${pI}`;
            const item    = _edwItems[key];
            const checked = !!item;
            return `
                <div class="edw-part-row${checked ? ' checked' : ''}">
                    <label class="edw-part-check">
                        <input type="checkbox" ${checked ? 'checked' : ''} onchange="_edwTogglePart('${key}', ${zI}, ${aI}, ${pI}, this.checked)">
                        <span class="edw-part-name">${escapeHtml(part)}</span>
                    </label>
                    ${checked ? `
                    <div class="edw-part-detail">
                        <div class="edw-grade-row">
                            ${['A','B','C','D'].map(g => `<button class="edw-grade-btn${item.grade === g ? ' active' : ''}" onclick="_edwSetGrade('${key}',${zI},'${g}')">${g}</button>`).join('')}
                            <span class="edw-grade-hint">${item.grade === 'A' ? 'Like new' : item.grade === 'B' ? 'Good used' : item.grade === 'C' ? 'Average' : item.grade === 'D' ? 'Damaged' : 'Select grade'}</span>
                        </div>
                        <input class="edw-notes-input" type="text" placeholder="Notes (optional)" value="${escapeHtml(item.notes || '')}" oninput="_edwSetNotes('${key}', this.value)">
                        <label class="edw-part-photo-btn">
                            <input type="file" accept="image/*" multiple style="display:none" onchange="_edwAddPartPhoto('${key}', this)">
                            <span>+ Photos${item.photos?.length ? ` (${item.photos.length})` : ''}</span>
                        </label>
                    </div>` : ''}
                </div>`;
        }).join('') : '';
        return `
        <div class="edw-assembly">
            <div class="edw-assembly-hdr${isOpen ? ' active' : ''}" onclick="_edwSelectAsm(${aI})">
                <span class="edw-assembly-name">${escapeHtml(asm.name)}</span>
                <div class="edw-asm-hdr-right">
                    ${asmCount ? `<span class="edw-asm-badge">${asmCount}</span>` : ''}
                    <span class="edw-asm-arrow">${isOpen ? '▾' : '▸'}</span>
                </div>
            </div>
            ${parts}
        </div>`;
    }).join('');
}

function _edwTogglePart(key, zI, aI, pI, checked) {
    if (checked) {
        _edwItems[key] = { grade: 'B', notes: '', price: '', photos: [] };
    } else {
        delete _edwItems[key];
    }
    _edwRefreshView();
}

function _edwSetGrade(key, zI, grade) {
    if (!_edwItems[key]) return;
    _edwItems[key].grade = grade;
    _edwRefreshView();
}

function _edwSetNotes(key, value) {
    if (_edwItems[key]) _edwItems[key].notes = value;
}

function _edwAddPartPhoto(key, input) {
    if (!_edwItems[key] || !input.files?.length) return;
    if (!_edwItems[key].photos) _edwItems[key].photos = [];
    Array.from(input.files).forEach(file => {
        _edwItems[key].photos.push({ file, previewUrl: URL.createObjectURL(file) });
    });
    _edwRefreshView();
}

function _edwRefreshView() {
    const z = document.getElementById('edwPanelZones');
    const a = document.getElementById('edwPanelAsms');
    const p = document.getElementById('edwPanelParts');
    const q = document.getElementById('edwPanelQuals');
    if (z) z.innerHTML = _buildPanelZones();
    if (a) a.innerHTML = _buildPanelAsms(_edwSelectedZone);
    if (p) p.innerHTML = _buildPanelParts(_edwSelectedZone, _edwSelectedAsm);
    if (q) q.innerHTML = _buildEdwPanelQuals();
    _updateEdwFooterCount();
}

function _updateEdwFooterCount() {
    const count = Object.keys(_edwItems).length;
    const meta = document.querySelector('.edw-footer-meta');
    if (meta) meta.textContent = `${count} part${count !== 1 ? 's' : ''} selected`;
    const reviewBtn = document.querySelector('#edwFooter .edw-btn-primary');
    if (reviewBtn) reviewBtn.textContent = `Review ${count} Part${count !== 1 ? 's' : ''} →`;
}

function _edwSelectZone(zI) {
    if (_edwActiveZone === zI) {
        _edwActiveZone = null;
        _edwActiveAsm  = null;
    } else {
        _edwActiveZone = zI;
        _edwActiveAsm  = null;
    }
    const wrap = document.getElementById('edwSgWrap');
    if (wrap) wrap.innerHTML = _buildEdwGrid();
}

function _edwSelectAsm(aI) {
    _edwActiveAsm = (_edwActiveAsm === aI) ? null : aI;
    const wrap = document.getElementById('edwSgWrap');
    if (wrap) wrap.innerHTML = _buildEdwGrid();
}

function _edwGridToggle(key, zI, aI, pI, checked) {
    if (checked) {
        _edwItems[key] = { grade: 'B', notes: '', price: '', photos: [] };
    } else {
        delete _edwItems[key];
    }
    const body = document.getElementById('edwBody');
    const scrollTop = body?.scrollTop || 0;
    const wrap = document.getElementById('edwSgWrap');
    if (wrap) wrap.innerHTML = _buildEdwGrid();
    if (body) body.scrollTop = scrollTop;
    _updateEdwFooterCount();
}

function _edwGridRemove(key, event) {
    event.stopPropagation();
    delete _edwItems[key];
    const body = document.getElementById('edwBody');
    const scrollTop = body?.scrollTop || 0;
    const wrap = document.getElementById('edwSgWrap');
    if (wrap) wrap.innerHTML = _buildEdwGrid();
    if (body) body.scrollTop = scrollTop;
    _updateEdwFooterCount();
}

function _edwGridGrade(key, grade) {
    if (!_edwItems[key]) return;
    _edwItems[key].grade = grade;
    document.getElementById(`edwgg-${key}`)?.querySelectorAll('.edw-tbl-grade-btn')
        .forEach(btn => btn.classList.toggle('active', btn.textContent === grade));
}

function _edwGridPrice(key, value) {
    if (_edwItems[key]) _edwItems[key].price = value ? Number(value) : '';
}

function _edwGridNotes(key, value) {
    if (_edwItems[key]) _edwItems[key].notes = value;
}

function _edwGridPhoto(key, input) {
    if (!_edwItems[key] || !input.files?.length) return;
    if (!_edwItems[key].photos) _edwItems[key].photos = [];
    Array.from(input.files).forEach(file => {
        const entry = { file, previewUrl: URL.createObjectURL(file) };
        _edwItems[key].photos.push(entry);
        _fileToBase64(file).then(b64 => { entry.base64 = b64; });
    });
    const count = _edwItems[key].photos.length;
    const countSpan = document.getElementById(`edwgph-${key}`)?.querySelector('.edw-tbl-photo-count');
    if (countSpan) countSpan.textContent = ` (${count})`;
}

function _edwStep2Next() {
    if (!Object.keys(_edwItems).length) { showToast('Tick at least one part to continue'); return; }
    _edwStep = 3;
    _renderEdw();
    document.getElementById('edwBody')?.scrollTo(0, 0);
}

function _renderEdwStep3() {
    const body   = document.getElementById('edwBody');
    const footer = document.getElementById('edwFooter');
    if (!body || !footer) return;

    body.style.padding       = '0';
    body.style.overflow      = 'auto';
    body.style.display       = '';
    body.style.flexDirection = '';

    const v = _edwVehicle;
    const vehicleTitle = `${v.year} ${v.make} ${v.model}${v.series ? ' ' + v.series : ''}${v.variant ? ' — ' + v.variant : ''}`;
    const gradeLabel = { A: 'Like New', B: 'Good Used', C: 'Average', D: 'Damaged' };

    const cards = Object.entries(_edwItems).map(([key, item]) => {
        const [zI, aI, pI] = key.split(':').map(Number);
        const zone  = EDW_TAXONOMY[zI];
        const asm   = zone?.assemblies[aI];
        const part  = _edwPartNameWithVariant(asm?.name, asm?.parts[pI] || '');
        const listingTitle = `${part} to suit ${vehicleTitle}`;
        return `
            <div class="edw-review-card">
                <div class="edw-review-card-top">
                    <div class="edw-review-part-name">${escapeHtml(part)}</div>
                    <span class="edw-review-grade grade-${item.grade}">${item.grade} — ${gradeLabel[item.grade] || ''}</span>
                </div>
                <div class="edw-review-title">${escapeHtml(listingTitle)}</div>
                ${item.notes ? `<div class="edw-review-notes">${escapeHtml(item.notes)}</div>` : ''}
                <div class="edw-price-row">
                    <span class="edw-price-lbl">Price $</span>
                    <input class="edw-price-input" type="number" min="0" step="1" placeholder="0.00"
                        value="${item.price || ''}" oninput="_edwItems['${key}'].price = this.value">
                    <button class="edw-label-toggle ${item.printLabel === false ? 'off' : ''}" onclick="_edwToggleLabel('${key}', this)" title="Print a label for this part">&#127991; Label</button>
                    <button class="edw-remove-btn" onclick="_edwRemoveItem('${key}')">Remove</button>
                </div>
            </div>
        `;
    }).join('');

    body.innerHTML = `
        <div class="edw-vehicle-banner">
            <div class="edw-vehicle-title">${escapeHtml(vehicleTitle)}</div>
        </div>
        <div class="edw-review-hint">Set a price for each part. You can edit listings individually after publishing.</div>
        <div class="edw-review-list">${cards}</div>
    `;

    const labelCount = Object.values(_edwItems).filter(it => it.printLabel !== false).length;
    footer.innerHTML = `
        <div class="edw-footer-meta">${Object.keys(_edwItems).length} parts</div>
        <button id="edwLabelCount" class="edw-label-count" onclick="_edwToggleAllLabels()" title="Tap to toggle all labels">&#127991; ${labelCount}</button>
        <button class="edw-btn-secondary" onclick="_edwStep=2;_renderEdw()">← Back</button>
        <button class="edw-btn-secondary" onclick="_edwPrintStrippingList()">Print List</button>
        <button class="edw-btn-secondary" onclick="_edwSendToWorkers()">Send to Workers</button>
        <button class="edw-btn-primary" onclick="_edwPublish()">Publish Now</button>
    `;
}

function _edwRemoveItem(key) {
    delete _edwItems[key];
    _renderEdwStep3();
}

function _edwToggleLabel(key, btn) {
    if (!_edwItems[key]) return;
    _edwItems[key].printLabel = _edwItems[key].printLabel === false; // flip off->on, else on->off
    if (btn) btn.classList.toggle('off', _edwItems[key].printLabel === false);
    _edwUpdateLabelCount();
}

function _edwUpdateLabelCount() {
    const n = Object.values(_edwItems).filter(it => it.printLabel !== false).length;
    const el = document.getElementById('edwLabelCount');
    if (el) el.innerHTML = `&#127991; ${n}`;
}

function _edwToggleAllLabels() {
    const items = Object.values(_edwItems);
    if (!items.length) return;
    const anyOn = items.some(it => it.printLabel !== false);
    items.forEach(it => it.printLabel = !anyOn);
    _renderEdwStep3();
}

function _edwPrintStrippingList() {
    const v = _edwVehicle;
    const vehicleTitle = `${v.year} ${v.make} ${v.model}${v.series ? ' ' + v.series : ''}${v.variant ? ' — ' + v.variant : ''}`;
    const gradeLabel = { A: 'Like New', B: 'Good Used', C: 'Average', D: 'Damaged' };
    const date = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Group items by zone and assembly
    const grouped = {};
    Object.entries(_edwItems).forEach(([key, item]) => {
        const [zI, aI, pI] = key.split(':').map(Number);
        const zone = EDW_TAXONOMY[zI];
        const asm  = zone?.assemblies[aI];
        const part = asm?.parts[pI] || '';
        const zName = zone?.zone || '';
        const aName = asm?.name || '';
        if (!grouped[zName]) grouped[zName] = {};
        if (!grouped[zName][aName]) grouped[zName][aName] = [];
        grouped[zName][aName].push({ part, grade: item.grade, notes: item.notes });
    });

    const zoneRows = Object.entries(grouped).map(([zone, assemblies]) => {
        const asmRows = Object.entries(assemblies).map(([asm, parts]) => {
            const partRows = parts.map(p => `
                <tr>
                    <td style="width:28px; text-align:center;">☐</td>
                    <td style="padding:6px 10px;">${p.part}</td>
                    <td style="width:80px; text-align:center;">
                        <span style="background:${p.grade==='A'?'#dcfce7':p.grade==='B'?'#dbeafe':p.grade==='C'?'#fef9c3':'#fee2e2'};
                               color:${p.grade==='A'?'#15803d':p.grade==='B'?'#1d4ed8':p.grade==='C'?'#92400e':'#991b1b'};
                               padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;">${p.grade} — ${gradeLabel[p.grade]||''}</span>
                    </td>
                    <td style="padding:6px 10px; font-size:12px; color:#666;">${escapeHtml(p.notes || '')}</td>
                </tr>`).join('');
            return `
                <tr><td colspan="4" style="padding:8px 10px 4px; font-size:11px; font-weight:700; color:#f07020; text-transform:uppercase; letter-spacing:0.4px;">${asm}</td></tr>
                ${partRows}`;
        }).join('');
        return `
            <tr style="background:#1a1a2e;">
                <td colspan="4" style="padding:10px 12px; color:#fff; font-size:14px; font-weight:800;">${zone}</td>
            </tr>
            ${asmRows}`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Stripping List — ${vehicleTitle}</title>
    <style>
        body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; color: #333; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .sub { font-size: 13px; color: #666; margin-bottom: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        td { border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
        @media print { @page { margin: 15mm; } button { display: none !important; } }
    </style>
    </head><body>
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
            <h1>Stripping List</h1>
            <div class="sub">${vehicleTitle}${v.stockNumber ? ' &nbsp;|&nbsp; Stock: ' + v.stockNumber : ''}${v.vin ? ' &nbsp;|&nbsp; VIN: ' + v.vin : ''}${v.colour ? ' &nbsp;|&nbsp; ' + v.colour : ''}${v.odometer ? ' &nbsp;|&nbsp; ' + Number(v.odometer).toLocaleString() + ' km' : ''}</div>
        </div>
        <div style="text-align:right; font-size:12px; color:#888;">
            <div>Printed: ${date}</div>
            <div style="margin-top:4px;">${Object.keys(_edwItems).length} parts</div>
            <button onclick="window.print()" style="margin-top:8px; background:#f07020; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:12px; font-weight:700; cursor:pointer;">Print / Save PDF</button>
        </div>
    </div>
    <table>
        <thead><tr style="background:#f4f4f4;">
            <th style="width:28px;"></th>
            <th style="text-align:left; padding:8px 10px;">Part</th>
            <th style="width:120px; text-align:center;">Grade</th>
            <th style="text-align:left; padding:8px 10px;">Notes</th>
        </tr></thead>
        <tbody>${zoneRows}</tbody>
    </table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
    else showToast('Allow pop-ups to open the stripping list');

}

async function _edwPublish() {
    if (!sb || !currentUserId) { showToast('Sign in required'); return; }
    const items = Object.entries(_edwItems);
    if (!items.length) { showToast('Nothing to publish'); return; }

    const footer = document.getElementById('edwFooter');
    if (footer) footer.innerHTML = `<div class="edw-footer-meta">Publishing ${items.length} listings…</div>`;

    const v = _edwVehicle;
    const vehicleTitle = `${v.year} ${v.make} ${v.model}${v.series ? ' ' + v.series : ''}${v.variant ? ' — ' + v.variant : ''}`;
    const gradeToCondition = { A: 'excellent', B: 'good', C: 'fair', D: 'damaged' };
    const gradeLabel      = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Damaged' };

    // Use existing stock card job, or create one if EDW was entered mid-session
    let jobId = _edwJobId;
    if (jobId) {
        await sb.from('dismantling_jobs').update({ status: 'stripping' }).eq('id', jobId);
    } else {
        const { data: newJob } = await sb.from('dismantling_jobs').insert({
            user_id: currentUserId, status: 'stripping',
            make: v.make, model: v.model, year: Number(v.year),
            series: v.series || null, body_type: v.bodyType || null,
            vin: v.vin || null, paint_code: v.paintCode || null,
            engine_code: v.engineCode || null, transmission_code: v.transCode || null, transmission_type: v.transType || null,
            odometer: v.odometer ? Number(v.odometer) : null,
            build_date: v.buildDate || null, colour: v.colour || null,
            stock_number: v.stockNumber || null,
        }).select('id').single();
        jobId = newJob?.id;
    }
    const job = { id: jobId };

    // Pre-resolve vehicle photo base64s once — avoids re-reading the same File
    // object via FileReader for every part in the loop (some browsers fail on repeat reads)
    const vehicleBase64s = await Promise.all(
        _edwVehiclePhotos
            .filter(p => (p.base64 || p.file) && p.selected)
            .map(p => p.base64 ? Promise.resolve(p.base64) : _fileToBase64(p.file))
    );

    const labelItems = [];
    let published = 0;
    for (const [key, item] of items) {
        const [zI, aI, pI] = key.split(':').map(Number);
        const zone  = EDW_TAXONOMY[zI];
        const asm   = zone?.assemblies[aI];
        const part  = _edwPartNameWithVariant(asm?.name, asm?.parts[pI] || '');
        const title = `${part} to suit ${vehicleTitle}`;
        const price = item.price ? Number(item.price) : 0;
        const apcId = generateApcId();
        const stockNo = v.stockNumber || null;

        const { data: listing } = await sb.from('listings').insert({
            seller_id: currentUserId,
            seller_name: getPublicSellerName(),
            apc_id: apcId,
            title,
            price,
            category: _partCategory(zone, asm, _edwFullPartName(asm?.name, asm?.parts[pI] || '')),
            condition: gradeToCondition[item.grade] || 'good',
            status: 'active',
            description: item.notes || `${gradeLabel[item.grade] || 'Used'} condition ${part} removed from a ${vehicleTitle}. Contact us for more details.`,
            fits_year: Number(v.year),
            variant: v.variant || null,
            chassis_vin: v.vin || null,
            stock_number: stockNo,
            odometer: v.odometer ? Number(v.odometer) : null,
            location: userSettings.location || null,
            postcode: userSettings.postcode || null,
            dismantling_job_id: jobId || null,
        }).select('id').single();

        if (listing?.id) {
            // Link vehicle
            await sb.from('listing_vehicles').insert({
                listing_id: listing.id,
                make: v.make, model: v.model,
                series: v.series || null,
            });

            // Photos: part photos → new vehicle session photos → stored stock card URLs
            const partPhotos = item.photos?.filter(p => p.base64 || p.file) || [];
            if (partPhotos.length > 0) {
                const base64s = await Promise.all(partPhotos.map(p => p.base64 || _fileToBase64(p.file)));
                const urls = await uploadListingImagesToStorage(String(listing.id), base64s);
                if (urls.length) await sb.from('listing_images').insert(urls.map((url, i) => ({ listing_id: listing.id, storage_path: url, position: i })));
            } else if (vehicleBase64s.length) {
                const urls = await uploadListingImagesToStorage(String(listing.id), vehicleBase64s);
                if (urls.length) await sb.from('listing_images').insert(urls.map((url, i) => ({ listing_id: listing.id, storage_path: url, position: i })));
            } else if (v.vehiclePhotos?.length) {
                // Already uploaded at stock-entry time — insert URLs directly, no re-upload needed
                await sb.from('listing_images').insert(v.vehiclePhotos.map((url, i) => ({ listing_id: listing.id, storage_path: url, position: i })));
            }

            // Save dismantling item record
            if (job?.id) {
                await sb.from('dismantling_items').insert({
                    job_id: job.id, user_id: currentUserId,
                    zone: zone.zone, assembly: asm.name, part_name: part,
                    grade: item.grade, notes: item.notes || '',
                    price, listing_id: listing.id, status: 'published',
                });
            }
            if (item.printLabel !== false) labelItems.push({
                id: listing.id, supabaseId: listing.id, title, apcId,
                condition: gradeToCondition[item.grade] || 'good',
                fits: [{ make: v.make, model: v.model }],
                year: v.year, stockNumber: stockNo, warehouseBin: null,
            });
            published++;
        }
    }

    await loadUserListingsFromSupabase(currentUserId);
    renderMyParts();
    renderMainGrid();
    _edwCommitted = true; // listings saved — closing from here shouldn't warn
    _edwPendingLabels = labelItems;

    const body = document.getElementById('edwBody');
    if (body) body.innerHTML = `
        <div class="edw-success">
            <div class="edw-success-ico">✓</div>
            <div class="edw-success-title">${published} listing${published !== 1 ? 's' : ''} published</div>
            <div class="edw-success-sub">All parts for ${escapeHtml(vehicleTitle)} are now live on APC.</div>
            ${labelItems.length ? `<button class="edw-btn-primary" style="margin-top:24px;" onclick="printEdwLabelsBatch(_edwPendingLabels)">&#128424; Print ${labelItems.length} label${labelItems.length !== 1 ? 's' : ''}</button>
            <button class="edw-btn-secondary" style="margin-top:10px;width:100%;" onclick="_edwViewMyListings();">View My Listings</button>` : `<button class="edw-btn-primary" style="margin-top:24px;" onclick="_edwViewMyListings();">View My Listings</button>`}
            <button class="edw-btn-secondary" style="margin-top:10px;width:100%;" onclick="_edwCommitted=false;_edwStep=0;_edwJobId=null;_renderEdw();_renderEdwStep0();">Back to Stock</button>
        </div>
    `;
    if (footer) footer.innerHTML = `
        <button class="edw-btn-secondary" onclick="closeEdw()">Close</button>
        <button class="edw-btn-secondary" onclick="_edwPrintStrippingList()">Print Stripping List</button>
    `;
    showToast(`${published} listings published`);
}

// ─── EDW — SEND TO WORKERS ────────────────────────────────────────────────

async function _edwSendToWorkers() {
    if (!sb || !currentUserId) { showToast('Sign in required'); return; }
    const items = Object.entries(_edwItems);
    if (!items.length) { showToast('No parts selected'); return; }

    const footer = document.getElementById('edwFooter');
    if (footer) footer.innerHTML = `<div class="edw-footer-meta">Creating job…</div>`;

    const v = _edwVehicle;
    let jobId = _edwJobId;
    let jobToken = null;
    if (jobId) {
        const { data: updated } = await sb.from('dismantling_jobs')
            .update({ status: 'stripping' }).eq('id', jobId)
            .select('job_token').single();
        jobToken = updated?.job_token || null;
    } else {
        const { data: newJob, error } = await sb.from('dismantling_jobs').insert({
            user_id: currentUserId,
            make: v.make, model: v.model, year: Number(v.year),
            series: v.series || null, body_type: v.bodyType || null,
            vin: v.vin || null, paint_code: v.paintCode || null,
            engine_code: v.engineCode || null, transmission_code: v.transCode || null, transmission_type: v.transType || null,
            odometer: v.odometer ? Number(v.odometer) : null,
            build_date: v.buildDate || null, colour: v.colour || null,
            stock_number: v.stockNumber || null, status: 'stripping',
        }).select('id, job_token').single();
        if (error || !newJob) { showToast('Failed to create job'); _renderEdwStep3(); return; }
        jobId = newJob.id;
        jobToken = newJob.job_token;
    }
    const job = { id: jobId, job_token: jobToken };

    const itemRows = items.map(([key, item]) => {
        const [zI, aI, pI] = key.split(':').map(Number);
        const zone = EDW_TAXONOMY[zI];
        const asm  = zone?.assemblies[aI];
        const part = _edwPartNameWithVariant(asm?.name, asm?.parts[pI] || '');
        return {
            job_id: job.id, user_id: currentUserId,
            zone: zone?.zone || '', assembly: asm?.name || '', part_name: part,
            grade: item.grade, notes: item.notes || '',
            price: item.price ? Number(item.price) : null,
            worker_done: false,
        };
    });

    await sb.from('dismantling_items').insert(itemRows);
    _renderEdwJobSent(job.job_token, items.length);
}

function _renderEdwJobSent(jobToken, count) {
    const body   = document.getElementById('edwBody');
    const footer = document.getElementById('edwFooter');
    if (!body || !footer) return;
    _edwCommitted = true; // job is saved — closing from here shouldn't warn

    const url   = `${location.origin}${location.pathname}?job=${jobToken}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

    body.innerHTML = `
        <div class="edw-sent-screen">
            <div class="edw-success-ico">✓</div>
            <div class="edw-success-title">Stripping Job Created</div>
            <div class="edw-success-sub">${count} part${count !== 1 ? 's' : ''} ready for your team</div>
            <div class="edw-sent-qr"><img src="${qrUrl}" alt="Job QR" width="200" height="200"></div>
            <div class="edw-sent-url-label">Or share this link:</div>
            <div class="edw-sent-url-box">
                <span class="edw-sent-url-text">${escapeHtml(url)}</span>
                <button class="edw-copy-btn" onclick="_edwCopyJobUrl('${escapeHtml(url)}')">Copy</button>
            </div>
            <p class="edw-sent-hint">Workers open this on their phone or tablet — no login needed. Once done, you'll see the job in your dashboard to review and publish.</p>
        </div>
    `;
    footer.innerHTML = `<button class="edw-btn-primary" onclick="closeEdw()">Done</button>`;
}

function _edwCopyJobUrl(url) {
    navigator.clipboard?.writeText(url).then(() => showToast('Link copied')).catch(() => showToast('Copy failed'));
}

function showJobQr(jobToken) {
    const url   = `${location.origin}${location.pathname}?job=${jobToken}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
    const existing = document.getElementById('jobQrOverlay');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'jobQrOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    el.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:24px 20px;max-width:300px;width:90%;text-align:center;">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px;">Worker Job Link</div>
            <div style="color:#888;font-size:12px;margin-bottom:16px;">Scan or share to resume this job</div>
            <img src="${qrUrl}" width="220" height="220" alt="Job QR code" style="display:block;margin:0 auto 16px;">
            <div style="background:#f4f4f4;border-radius:8px;padding:10px;font-size:11px;word-break:break-all;color:#333;margin-bottom:16px;">${escapeHtml(url)}</div>
            <div style="display:flex;gap:8px;">
                <button onclick="_edwCopyJobUrl('${escapeHtml(url)}')" style="flex:1;padding:12px;background:#f07020;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;">Copy Link</button>
                <button onclick="document.getElementById('jobQrOverlay').remove()" style="flex:1;padding:12px;background:#eee;color:#333;border:none;border-radius:8px;font-weight:700;font-size:14px;">Close</button>
            </div>
        </div>`;
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
}

// ─── WORKER VIEW ──────────────────────────────────────────────────────────

let _wJob   = null;
let _wItems = [];

async function initWorkerView(token) {
    document.body.innerHTML = `<div id="workerApp" style="min-height:100vh;background:#f2f2f7;font-family:-apple-system,sans-serif;"><div style="padding:60px 20px;text-align:center;color:#888;">Loading job…</div></div>`;

    // Token-scoped via SECURITY DEFINER RPC — anon never reads the jobs/items tables
    // directly (that exposed vehicle_cost and let anyone edit any yard's items).
    const { data, error } = await sb.rpc('worker_get_job', { p_token: token });
    const job = data?.job;
    if (error || !job) {
        document.getElementById('workerApp').innerHTML = `<div class="w-empty"><div class="w-empty-ico">✕</div><div class="w-empty-title">Job not found</div><div class="w-empty-sub">This link may have expired or been entered incorrectly.</div></div>`;
        return;
    }
    _wJob   = { ...job, job_token: token };
    _wItems = data.items || [];
    _renderWorkerView();
}

// Persist an item's full current state through the token-validated RPC. The client holds
// the complete item (grade/notes/photos/done from worker_get_job), so sending all four
// each save never clobbers an unedited field.
function _wSaveItem(item) {
    if (!sb || !_wJob || !item) return;
    sb.rpc('worker_save_item', {
        p_token:  _wJob.job_token,
        p_item_id: item.id,
        p_grade:  item.grade || null,
        p_notes:  item.notes || null,
        p_photos: item.worker_photos || [],
        p_done:   !!item.worker_done,
    }).then(() => {});
}

function _renderWorkerView() {
    const app = document.getElementById('workerApp');
    if (!app) return;

    const j = _wJob;
    const vehicleTitle = `${j.year || ''} ${j.make || ''} ${j.model || ''}${j.series ? ' ' + j.series : ''}`.trim();
    const done    = _wItems.filter(i => i.worker_done).length;
    const total   = _wItems.length;
    const allDone = done === total && total > 0;
    const gradeLabel = { A: 'Like New', B: 'Good Used', C: 'Average', D: 'Damaged' };

    const parts = _wItems.map(item => {
        const photosHtml = (item.worker_photos || []).map(p =>
            `<img src="${escapeHtml(p)}" class="w-photo-thumb" alt="part photo">`
        ).join('');
        return `
        <div class="w-part-card${item.worker_done ? ' w-done' : ''}" id="wpart-${item.id}">
            <div class="w-part-header" onclick="_wToggleExpand(${item.id})">
                <div class="w-check${item.worker_done ? ' checked' : ''}"></div>
                <div class="w-part-info">
                    <div class="w-part-name">${escapeHtml(item.part_name)}</div>
                    <div class="w-part-zone">${escapeHtml(item.zone)} › ${escapeHtml(item.assembly)}</div>
                </div>
                <div class="w-grade-badge grade-${item.grade || 'B'}">${item.grade || 'B'}</div>
                <div class="w-expand-chevron">›</div>
            </div>
            <div class="w-part-body" id="wbody-${item.id}">
                <div class="w-section-label">Condition Grade</div>
                <div class="w-grade-row">
                    ${['A','B','C','D'].map(g => `
                        <button class="w-grade-btn${item.grade === g ? ' active' : ''}" onclick="_wSetGrade(${item.id},'${g}')">
                            <strong>${g}</strong><span>${gradeLabel[g]}</span>
                        </button>`).join('')}
                </div>
                <div class="w-section-label">Notes</div>
                <textarea class="w-notes" rows="3" placeholder="Damage, missing parts, anything to flag…"
                    onblur="_wSetNotes(${item.id}, this.value)">${escapeHtml(item.notes || '')}</textarea>
                <div class="w-section-label">Photos</div>
                <div class="w-photos-row" id="wphotos-${item.id}">${photosHtml}</div>
                <label class="w-add-photo-btn">
                    <input type="file" accept="image/*" multiple capture="environment" style="display:none"
                        onchange="_wAddPhotos(${item.id}, this)">
                    + Add Photos
                </label>
                <button class="w-done-btn${item.worker_done ? ' w-undone' : ''}" onclick="_wMarkDone(${item.id})">
                    ${item.worker_done ? '✕ Mark Not Done' : '✓ Mark as Stripped'}
                </button>
            </div>
        </div>`;
    }).join('');

    app.innerHTML = `
        <div class="w-header">
            <div class="w-header-logo">APC</div>
            <div class="w-vehicle-title">${escapeHtml(vehicleTitle)}</div>
            ${j.stock_number ? `<div class="w-stock-num">${escapeHtml(j.stock_number)}</div>` : ''}
            <div class="w-progress">
                <div class="w-progress-bar"><div class="w-progress-fill" style="width:${total ? Math.round(done/total*100) : 0}%"></div></div>
                <div class="w-progress-text">${done} of ${total} parts done</div>
            </div>
        </div>
        <div class="w-parts-list">${parts}</div>
        <div class="w-submit-wrap">
            ${allDone ? `<button class="w-submit-btn" onclick="_wSubmitForReview()">Submit for Review →</button>` : ''}
        </div>
        <div style="height:40px;"></div>
    `;
}

function _wToggleExpand(itemId) {
    const body = document.getElementById(`wbody-${itemId}`);
    if (!body) return;
    const isOpen = body.classList.contains('open');
    document.querySelectorAll('.w-part-body.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) body.classList.add('open');
}

async function _wSetGrade(itemId, grade) {
    const item = _wItems.find(i => i.id === itemId);
    if (!item) return;
    item.grade = grade;
    _wSaveItem(item);
    const gradeLabel = { A: 'Like New', B: 'Good Used', C: 'Average', D: 'Damaged' };
    const body = document.getElementById(`wbody-${itemId}`);
    if (body) {
        body.querySelector('.w-grade-row').innerHTML = ['A','B','C','D'].map(g => `
            <button class="w-grade-btn${grade === g ? ' active' : ''}" onclick="_wSetGrade(${itemId},'${g}')">
                <strong>${g}</strong><span>${gradeLabel[g]}</span>
            </button>`).join('');
    }
    const badge = document.querySelector(`#wpart-${itemId} .w-grade-badge`);
    if (badge) { badge.className = `w-grade-badge grade-${grade}`; badge.textContent = grade; }
}

async function _wSetNotes(itemId, notes) {
    const item = _wItems.find(i => i.id === itemId);
    if (!item) return;
    item.notes = notes;
    _wSaveItem(item);
}

async function _wAddPhotos(itemId, input) {
    const item = _wItems.find(i => i.id === itemId);
    if (!item || !sb) return;
    const files = Array.from(input.files);
    if (!files.length) return;
    showToast('Uploading…');
    const results = await Promise.all(files.map(async file => {
        try {
            const b64 = await _fileToBase64(file);
            const compressed = await compressBase64(b64, 1400, 0.82);
            const blob = await (await fetch(compressed)).blob();
            const path = `${_wJob.job_token}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
            const { error } = await sb.storage.from('edw-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (error) return null;
            const { data: pub } = sb.storage.from('edw-photos').getPublicUrl(path);
            return pub.publicUrl;
        } catch (_) { return null; }
    }));
    const uploaded = results.filter(Boolean);
    if (!uploaded.length) { showToast('Upload failed'); return; }
    const merged = [...(item.worker_photos || []), ...uploaded];
    item.worker_photos = merged;
    const row = document.getElementById(`wphotos-${itemId}`);
    if (row) row.innerHTML = merged.map(p => `<img src="${escapeHtml(p)}" class="w-photo-thumb" alt="part photo">`).join('');
    showToast(`${uploaded.length} photo${uploaded.length !== 1 ? 's' : ''} saved`);
    input.value = '';
    _wSaveItem(item);
}

async function _wMarkDone(itemId) {
    const item = _wItems.find(i => i.id === itemId);
    if (!item) return;
    item.worker_done = !item.worker_done;
    _renderWorkerView();
    _wSaveItem(item);
}

async function _wSubmitForReview() {
    if (!sb || !_wJob) return;
    const btn = document.querySelector('.w-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    const { data: ok, error } = await sb.rpc('submit_job_for_review', { p_token: _wJob.job_token });
    if (error || !ok) {
        if (btn) { btn.disabled = false; btn.textContent = 'Submit for Review →'; }
        const app = document.getElementById('workerApp');
        if (app) {
            const errBanner = app.querySelector('.w-submit-error') || document.createElement('div');
            errBanner.className = 'w-submit-error';
            errBanner.textContent = 'Submit failed — please try again or contact your manager.';
            errBanner.style.cssText = 'color:#ef4444;font-size:13px;text-align:center;padding:10px;';
            btn?.parentNode?.appendChild(errBanner);
        }
        return;
    }

    const app = document.getElementById('workerApp');
    if (app) app.innerHTML = `
        <div class="w-empty">
            <div class="w-empty-ico" style="color:#22c55e;">✓</div>
            <div class="w-empty-title">Job Submitted</div>
            <div class="w-empty-sub">Your manager will review the parts and publish the listings. You're done!</div>
            <button onclick="window.close()" class="w-close-btn">Close this window</button>
        </div>`;
}

// ─── DASHBOARD — DISMANTLING JOBS ─────────────────────────────────────────

async function renderDashJobs() {
    const card = document.getElementById('dashJobsCard');
    if (!card || !sb || !currentUserId) return;

    const { data: jobs, error: jobsErr } = await sb.from('dismantling_jobs')
        .select('id, make, model, year, series, stock_number, status, created_at, job_token')
        .eq('user_id', currentUserId)
        .in('status', ['stripping', 'ready'])
        .order('created_at', { ascending: false })
        .limit(10);

    if (jobsErr) { console.warn('renderDashJobs:', jobsErr.message); return; }
    if (!jobs?.length) { card.style.display = 'none'; return; }
    card.style.display = '';

    const statusLabel = { stripping: 'Stripping', ready: 'Ready for Review' };
    const statusCls   = { stripping: 'job-status-stripping', ready: 'job-status-ready' };

    const rows = jobs.map(j => {
        const title = `${j.year || ''} ${j.make || ''} ${j.model || ''}${j.series ? ' ' + j.series : ''}`.trim();
        const date  = new Date(j.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
        const qrBtn = j.job_token
            ? `<button class="dash-job-qr-btn" onclick="event.stopPropagation();showJobQr('${escapeHtml(j.job_token)}')" title="Show QR code">QR</button>`
            : '';
        return `
        <div class="dash-job-row" onclick="openJobReview(${j.id})">
            <div class="dash-job-info">
                <div class="dash-job-title">${escapeHtml(title)}</div>
                <div class="dash-job-meta">${j.stock_number ? escapeHtml(j.stock_number) + ' · ' : ''}${date}</div>
            </div>
            ${qrBtn}
            <span class="dash-job-status ${statusCls[j.status] || ''}">${statusLabel[j.status] || j.status}</span>
            <span class="dash-job-arrow">›</span>
        </div>`;
    }).join('');

    card.innerHTML = `
        <div class="dash-card-hdr">
            <span class="dash-card-title">Dismantling Jobs</span>
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="dash-card-meta">${jobs.length} active</span>
                <button onclick="renderDashJobs()" class="dash-jobs-refresh" title="Refresh">↻</button>
            </div>
        </div>
        <div class="dash-jobs-list">${rows}</div>
    `;
}

async function renderDashWanted() {
    const card = document.getElementById('dashWantedCard');
    if (!card || !currentUserId) return;

    const myActive = userListings.filter(p => p.status === 'active' || p.status === 'pending');
    if (!myActive.length) { card.style.display = 'none'; return; }

    if (!publicWantedDatabase.length) await loadPublicWantedFromSupabase();
    if (!publicWantedDatabase.length) { card.style.display = 'none'; return; }

    const matches = [];
    const seenWanted = new Set();
    for (const w of publicWantedDatabase) {
        if (seenWanted.has(w.id)) continue;
        for (const listing of myActive) {
            if (wantedMatchesListing(w, listing)) {
                matches.push({ wanted: w, listing });
                seenWanted.add(w.id);
                break;
            }
        }
        if (matches.length >= 10) break;
    }

    if (!matches.length) { card.style.display = 'none'; return; }
    card.style.display = '';

    const rows = matches.map(({ wanted: w, listing }) => {
        const vehicle = [w.make, w.model, w.year].filter(Boolean).join(' ');
        const budget  = w.maxPrice ? `<span class="dash-wanted-budget">$${w.maxPrice} budget</span>` : '';
        const loc     = w.loc ? ` · ${escapeHtml(w.loc)}` : '';
        return `
        <div class="dash-wanted-row">
            <div class="dash-wanted-info">
                <div class="dash-wanted-part">${escapeHtml(w.partName)}</div>
                <div class="dash-wanted-meta">${escapeHtml(vehicle)}${loc}${budget ? ' · ' + budget : ''}</div>
                <div class="dash-wanted-match">Matches: <span>${escapeHtml(listing.title)}</span></div>
            </div>
            <button class="dash-wanted-btn"
                data-wanted-id="${w.id}"
                data-user-id="${w.userId}"
                data-listing-id="${listing.supabaseId || ''}"
                data-listing-title="${escapeHtml(listing.title)}"
                onclick="notifyWantedBuyer(this)">Notify</button>
        </div>`;
    }).join('');

    card.innerHTML = `
        <div class="dash-card-hdr">
            <span class="dash-card-title">Wanted Matches</span>
            <span class="dash-card-meta">${matches.length} buyer${matches.length !== 1 ? 's' : ''} looking for parts you may have</span>
        </div>
        <div class="dash-wanted-list">${rows}</div>`;
}

async function notifyWantedBuyer(btn) {
    const wantedId     = btn.dataset.wantedId;
    const userId       = btn.dataset.userId;
    const listingId    = btn.dataset.listingId || null;
    const listingTitle = btn.dataset.listingTitle;
    if (!wantedId || !userId) return;

    btn.disabled = true;
    btn.textContent = 'Sending…';

    const { data, error } = await sb.rpc('notify_buyer', {
        p_kind: 'listing_match',
        p_user_id: userId,
        p_listing_id: Number(listingId) || null,
        p_wanted_part_id: Number(wantedId) || null,
    });

    if (error || data !== true) {
        showToast('Could not notify buyer');
        btn.disabled = false;
        btn.textContent = 'Notify';
    } else {
        btn.textContent = 'Notified ✓';
        btn.style.background = '#22c55e';
        btn.style.cursor = 'default';
    }
}

async function renderDashVehicleSearch() {
    const card = document.getElementById('dashVehicleSearchCard');
    if (!card || !sb || !currentUserId) return;

    const { data: jobs } = await sb.from('dismantling_jobs')
        .select('id, make, model, year, series, stock_number, status, shell_scrapped, colour')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

    _dashSvJobs = jobs || [];
    const onLot = _dashSvJobs.filter(j => !j.shell_scrapped).length;

    card.innerHTML = `
        <div class="dash-card-hdr">
            <span class="dash-card-title">Vehicle Stock</span>
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="dash-card-meta">${onLot} on lot · ${_dashSvJobs.length} total</span>
                <button class="dash-vsearch-add" onclick="openVehicleIntake()">+ Add</button>
            </div>
        </div>
        <input type="text" id="dashVsInput" class="dash-vsearch-input"
            placeholder="Search make, model, stock no., VIN…"
            oninput="_dashVsRender(this.value)" autocomplete="off">
        <div id="dashVsResults" class="dash-vsearch-results"></div>`;

    _dashVsRender('');
}

function _dashVsRender(q) {
    const results = document.getElementById('dashVsResults');
    if (!results) return;
    const lq = (q || '').toLowerCase().trim();

    const filtered = lq
        ? _dashSvJobs.filter(j =>
            (j.make   || '').toLowerCase().includes(lq) ||
            (j.model  || '').toLowerCase().includes(lq) ||
            (j.stock_number || '').toLowerCase().includes(lq) ||
            (j.colour || '').toLowerCase().includes(lq) ||
            String(j.year || '').includes(lq))
        : _dashSvJobs.slice(0, 8);

    if (!filtered.length) {
        results.innerHTML = `<div class="dash-vsearch-empty">${lq ? `No vehicles matching "${escapeHtml(lq)}"` : 'No vehicles in stock yet'}</div>`;
        return;
    }

    results.innerHTML = filtered.slice(0, 12).map(j => {
        const title  = `${j.year || ''} ${j.make || ''} ${j.model || ''}${j.series ? ' ' + j.series : ''}`.trim();
        const sn     = j.stock_number ? `<span class="dash-vsearch-sn">#${escapeHtml(j.stock_number)}</span>` : '';
        const st     = _VSC_STATUS[j.status] || { label: j.status, cls: '' };
        const scrapped = j.shell_scrapped ? `<span class="dash-vsearch-scrapped">Scrapped</span>` : '';
        return `<div class="dash-vsearch-row" onclick="openVehicleStockCard(${j.id})">
            <div class="dash-vsearch-info">
                <span class="dash-vsearch-name">${escapeHtml(title)}</span>
                ${sn}${scrapped}
            </div>
            <span class="vsc-status-chip ${st.cls}" style="font-size:10px;flex-shrink:0;">${st.label}</span>
        </div>`;
    }).join('');

    if (filtered.length > 12) {
        results.innerHTML += `<div class="dash-vsearch-more">+ ${filtered.length - 12} more — refine your search</div>`;
    }
}

let _dashSvJobs   = [];
let _dashSvFilter2 = 'lot'; // 'all' | 'lot' | 'scrapped'

const _VSC_STATUS = {
    in_stock:  { label: 'In Stock',       cls: 'vsc-s-stock' },
    stripping: { label: 'Stripping',      cls: 'vsc-s-strip' },
    ready:     { label: 'Ready to Review',cls: 'vsc-s-ready' },
    published: { label: 'Parts Listed',   cls: 'vsc-s-pub'   },
    complete:  { label: 'Complete',       cls: 'vsc-s-done'  },
};

async function renderDashStockVehicles() {
    const card = document.getElementById('dashStockVehiclesCard');
    if (!card || !sb || !currentUserId) return;

    const { data: jobs } = await sb.from('dismantling_jobs')
        .select('id, make, model, year, series, stock_number, status, created_at, colour, odometer, vehicle_cost, shell_scrapped, shell_scrapped_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

    _dashSvJobs = jobs || [];
    if (!_dashSvJobs.length) { card.style.display = 'none'; return; }
    card.style.display = '';

    card.innerHTML = `
        <div class="dash-card-hdr">
            <span class="dash-card-title">Vehicle Inventory</span>
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="dash-card-meta" id="dashSvCount"></span>
                <button class="pro-lst-new-btn" style="font-size:11px;padding:6px 12px;" onclick="openVehicleIntake()">+ Add Vehicle</button>
            </div>
        </div>
        <div class="dash-sv-filter-row">
            <button class="dash-sv-pill${_dashSvFilter2==='all'?' active':''}" onclick="_dashSvSetFilter('all')">All</button>
            <button class="dash-sv-pill${_dashSvFilter2==='lot'?' active':''}" onclick="_dashSvSetFilter('lot')">On Lot</button>
            <button class="dash-sv-pill${_dashSvFilter2==='scrapped'?' active':''}" onclick="_dashSvSetFilter('scrapped')">Shell Scrapped</button>
        </div>
        <input type="text" id="dashSvSearch" class="dash-wr-search"
            placeholder="Search make, model, stock number…"
            oninput="_dashSvRender()">
        <div class="dash-sv-list" id="dashSvList"></div>`;

    _dashSvRender();
}

function _dashSvSetFilter(f) {
    _dashSvFilter2 = f;
    document.querySelectorAll('.dash-sv-pill').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dash-sv-pill').forEach(b => {
        if (b.textContent.toLowerCase().replace(/\s+/g,'') === {all:'all',lot:'onlot',scrapped:'shellscrapped'}[f]) b.classList.add('active');
    });
    _dashSvRender();
}

function _dashSvRender() {
    const list    = document.getElementById('dashSvList');
    const countEl = document.getElementById('dashSvCount');
    const q       = (document.getElementById('dashSvSearch')?.value || '').toLowerCase();
    if (!list) return;

    let filtered = _dashSvJobs;
    if (_dashSvFilter2 === 'lot')      filtered = filtered.filter(j => !j.shell_scrapped);
    if (_dashSvFilter2 === 'scrapped') filtered = filtered.filter(j =>  j.shell_scrapped);
    if (q) filtered = filtered.filter(j =>
        (j.make || '').toLowerCase().includes(q) ||
        (j.model || '').toLowerCase().includes(q) ||
        (j.stock_number || '').toLowerCase().includes(q) ||
        String(j.year || '').includes(q));

    if (countEl) countEl.textContent = `${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''}`;

    list.innerHTML = filtered.map(j => {
        const title   = `${j.year || ''} ${j.make || ''} ${j.model || ''}${j.series ? ' ' + j.series : ''}`.trim();
        const meta    = [j.stock_number ? `#${j.stock_number}` : null, j.colour || null].filter(Boolean).join(' · ');
        const date    = new Date(j.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
        const st      = _VSC_STATUS[j.status] || { label: j.status, cls: '' };
        const scrappedChip = j.shell_scrapped ? `<span class="dash-sv-scrapped-chip">Shell Scrapped</span>` : '';
        return `
        <div class="dash-sv-row" onclick="openVehicleStockCard(${j.id})" style="cursor:pointer;">
            <div class="dash-sv-info">
                <div class="dash-sv-title">${escapeHtml(title)} ${scrappedChip}</div>
                <div class="dash-sv-meta">${meta ? escapeHtml(meta) + ' · ' : ''}${date}</div>
            </div>
            <span class="vsc-status-chip ${st.cls}" style="font-size:10px;flex-shrink:0;">${st.label}</span>
            <span class="dash-sv-arrow">›</span>
        </div>`;
    }).join('') || `<div style="padding:16px 0;color:#aaa;font-size:13px;text-align:center;">No vehicles match this filter.</div>`;
}

async function renderDashWantedRequests() {
    const card = document.getElementById('dashWantedRequestsCard');
    if (!card) return;

    if (!publicWantedDatabase.length) await loadPublicWantedFromSupabase();

    const total = publicWantedDatabase.length;
    card.innerHTML = `
        <div class="dash-card-hdr">
            <span class="dash-card-title">Members Wanted</span>
            <span class="dash-card-meta" id="dashWrCount">${total} request${total !== 1 ? 's' : ''}</span>
        </div>
        <input type="text" id="dashWrSearch" class="dash-wr-search"
            placeholder="Search make, model, part…"
            oninput="_dashWrFilter(this.value)">
        <div class="dash-wr-list" id="dashWrList"></div>`;

    _dashWrFilter('');
}

function _dashWrFilter(q) {
    const list    = document.getElementById('dashWrList');
    const countEl = document.getElementById('dashWrCount');
    if (!list) return;
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = tokens.length
        ? publicWantedDatabase.filter(w => {
            const haystack = [w.partName, w.make, w.model, w.year, w.loc, w.category].filter(Boolean).join(' ').toLowerCase();
            return tokens.every(t => haystack.includes(t));
          })
        : publicWantedDatabase;

    if (countEl) countEl.textContent = `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
        list.innerHTML = `<div class="dash-wr-empty">${q ? 'No results for "' + escapeHtml(q) + '"' : 'No wanted requests yet.'}</div>`;
        return;
    }

    list.innerHTML = filtered.slice(0, 30).map(w => {
        const vehicle = [w.make, w.model, w.year].filter(Boolean).join(' ');
        const budget  = w.maxPrice ? `<span class="dash-wr-budget">Max $${w.maxPrice}</span>` : '';
        return `
        <div class="dash-wr-row">
            <div class="dash-wr-info">
                <div class="dash-wr-part">${escapeHtml(w.partName)}</div>
                <div class="dash-wr-meta">${escapeHtml(vehicle)}${w.loc ? ' · ' + escapeHtml(w.loc) : ''} · ${escapeHtml(w.posted)}${budget ? ' · ' + budget : ''}</div>
            </div>
            <button class="dash-wr-btn"
                data-id="${w.id}" data-part="${escapeHtml(w.partName)}"
                data-cat="${escapeHtml(w.category)}" data-make="${escapeHtml(w.make)}"
                data-model="${escapeHtml(w.model)}" data-year="${escapeHtml(w.year)}"
                onclick="listFromWanted(this.dataset.id,this.dataset.part,this.dataset.cat,this.dataset.make,this.dataset.model,this.dataset.year)">List This Part ›</button>
        </div>`;
    }).join('');
}

// ─── Vehicle Stock Card ───────────────────────────────────────────────────────
async function openVehicleStockCard(jobId) {
    const overlay = document.getElementById('vehicleStockCardOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const body = document.getElementById('vscBody');
    const titleEl = document.getElementById('vscTitle');
    if (body) body.innerHTML = `<div style="padding:40px;text-align:center;color:#aaa;">Loading…</div>`;

    const edwBtn = document.getElementById('vscEdwBtn');
    if (edwBtn) edwBtn.onclick = () => {
        const overlay = document.getElementById('vehicleStockCardOverlay');
        if (overlay) overlay.style.display = 'none';
        _edwLoadAndOpen(jobId); // keeps body.overflow:hidden — no flicker
    };

    if (!sb || !currentUserId) return;

    const [{ data: job }, { data: parts }] = await Promise.all([
        sb.from('dismantling_jobs').select('*').eq('id', jobId).single(),
        sb.from('listings')
            .select('id, title, price, status, category, stock_number, created_at')
            .eq('dismantling_job_id', jobId)
            .order('created_at', { ascending: false }),
    ]);

    if (!job) { if (body) body.innerHTML = `<div style="padding:40px;text-align:center;color:#aaa;">Vehicle not found.</div>`; return; }

    const vehicleLabel = `${job.year || ''} ${job.make || ''} ${job.model || ''}${job.series ? ' ' + job.series : ''}`.trim();
    const st = _VSC_STATUS[job.status] || { label: job.status, cls: '' };
    if (titleEl) titleEl.innerHTML = `${escapeHtml(vehicleLabel) || 'Stock Card'} <span class="vsc-status-chip ${st.cls}" style="font-size:11px;vertical-align:middle;margin-left:8px;">${st.label}</span>${job.shell_scrapped ? '<span class="vsc-scrapped-badge">Shell Scrapped</span>' : ''}`;

    const allParts  = parts || [];
    _vscCurrentJobId = jobId;
    _vscCurrentJob   = job;
    _vscAllParts     = allParts;
    const active    = allParts.filter(p => p.status === 'active' || p.status === 'pending');
    const sold      = allParts.filter(p => p.status === 'sold');
    const cost      = job.vehicle_cost ? Number(job.vehicle_cost) : null;
    const soldRev   = sold.reduce((s, p) => s + Number(p.price || 0), 0);
    const activeVal = active.reduce((s, p) => s + Number(p.price || 0), 0);
    const profit    = cost != null ? soldRev - cost : null;

    _vscPhotos = job.vehicle_photos || [];

    const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString('en-AU')}` : '—';
    const profitCls = profit == null ? '' : profit >= 0 ? 'vsc-profit-pos' : 'vsc-profit-neg';
    const profitSign = profit == null ? '' : profit >= 0 ? '+' : '';

    const details = [
        ['Make', job.make], ['Model', job.model], ['Year', job.year],
        ['Series', job.series], ['Body Type', job.body_type],
        ['Colour', job.colour], ['Odometer', job.odometer ? `${Number(job.odometer).toLocaleString()} km` : null],
        ['Engine Code', job.engine_code], ['Transmission', job.transmission_type || job.transmission_code],
        ['VIN / Chassis', job.vin], ['Paint Code', job.paint_code],
        ['Build Date', job.build_date], ['Stock Number', job.stock_number],
    ].filter(([, v]) => v);

    const partsRows = _vscBuildPartRows(allParts);

    body.innerHTML = `
        <div id="vscPhotoSection" class="vsc-photo-section">${_vscPhotoSectionHTML()}</div>
        <div class="vsc-grid">
            <div class="vsc-card" id="vscVehicleCard">
                <div class="vsc-section-title" style="display:flex;align-items:center;justify-content:space-between;">
                    Vehicle Details
                    <button onclick="_vscEditVehicle()" style="background:none;border:1.5px solid #f07020;color:#f07020;border-radius:6px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Edit</button>
                </div>
                <dl class="vsc-dl" id="vscVehicleDl">
                    ${details.map(([k, v]) => `<div class="vsc-dl-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('')}
                </dl>
            </div>
            <div class="vsc-card">
                <div class="vsc-section-title">Financial Summary</div>
                <dl class="vsc-dl">
                    <div class="vsc-dl-row"><dt>Purchase Cost</dt><dd class="vsc-cost-val" data-job-id="${jobId}">${fmtMoney(cost)}</dd></div>
                    <div class="vsc-dl-row"><dt>Parts Sold (${sold.length})</dt><dd>${fmtMoney(soldRev)}</dd></div>
                    <div class="vsc-dl-row"><dt>Active Listings (${active.length})</dt><dd style="color:#888;">${fmtMoney(activeVal)}</dd></div>
                </dl>
                <div class="vsc-profit-banner ${profitCls}">
                    <span class="vsc-profit-label">Profit to date</span>
                    <span class="vsc-profit-val">${profit != null ? profitSign + fmtMoney(profit) : 'Enter purchase cost to calculate'}</span>
                </div>
                ${cost == null ? `<button class="vsc-set-cost-btn" onclick="_vscSetCost(${jobId})">Set Purchase Cost</button>` : `<button class="vsc-set-cost-btn" onclick="_vscSetCost(${jobId})">Edit Purchase Cost</button>`}
                <div class="vsc-shell-row">
                    ${job.shell_scrapped
                        ? `<div class="vsc-shell-scrapped">Shell scrapped ${job.shell_scrapped_at ? new Date(job.shell_scrapped_at).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
                           <button class="vsc-set-cost-btn" style="margin-top:6px;" onclick="_vscToggleShellScrapped(${jobId}, false)">Unmark — Shell Still Present</button>`
                        : `<button class="vsc-shell-scrap-btn" onclick="_vscToggleShellScrapped(${jobId}, true)">Mark Shell as Scrapped</button>`
                    }
                </div>
            </div>
        </div>
        <div class="vsc-card vsc-parts-card">
            <div class="vsc-parts-hdr">
                <span class="vsc-section-title" style="margin-bottom:0;">Parts (${allParts.length})</span>
                <div style="display:flex;align-items:center;gap:10px;margin-left:auto;">
                    <span class="vsc-parts-summary">
                        <span class="vsc-status-chip vsc-part-active">${active.length} active</span>
                        <span class="vsc-status-chip vsc-part-sold">${sold.length} sold</span>
                    </span>
                    <button class="vsc-add-part-btn" onclick="_vscOpenAddPart()">+ Add Part</button>
                </div>
            </div>
            <input id="vscPartsSearch" type="text" placeholder="Search parts, stock number…"
                oninput="_vscFilterParts(this.value)"
                style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:10px;box-sizing:border-box;"
                onfocus="this.style.borderColor='#f07020'" onblur="this.style.borderColor='#e0e0e0'">
            <table class="vsc-parts-table">
                <thead><tr><th>Part</th><th>Stock No.</th><th>Price</th><th>Status</th></tr></thead>
                <tbody id="vscPartsBody">${partsRows}</tbody>
            </table>
        </div>`;
}

// ─── VSC Add Part — opens the real List-a-Part modal pre-filled from the donor ──
// vehicle, so the seller gets photos, label printing and the title autocomplete.
// On publish, submitSellListing() stamps dismantling_job_id (via _sellDonorJobId)
// so the new listing lands back on this stock card.
function _vscOpenAddPart() {
    const job = _vscCurrentJob;
    if (!job) return;
    openSellOverlay();               // resets the form (clears _sellDonorJobId) + opens
    _sellDonorJobId = job.id;        // set AFTER open so the reset doesn't wipe it
    initSellVehicleDropdowns(
        job.make || '', job.model || '',
        job.year ? String(job.year) : '',
        job.series || '', job.engine_code || ''
    );
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null && String(val) !== '') el.value = val; };
    set('sellStockNumber', job.stock_number);
    set('sellChassisVin',  job.vin);
    set('sellOdometer',    job.odometer);
    const ov = document.getElementById('sellOverlayTitle');
    if (ov) ov.textContent = 'Add Part to Stock Card';
    const sellOv = document.getElementById('sellOverlay');
    if (sellOv) sellOv.style.zIndex = '3600';   // sit above the stock card overlay (3500)
    showToast('Vehicle pre-filled — add the part name, price & photos');
}

// ─── Vehicle Intake — standalone entry form ───────────────────────────────────
let _viVehicle = {};
let _viVehiclePhotos = [];

function openVehicleIntake() {
    _viVehicle = {};
    _viVehiclePhotos = EDW_VEHICLE_ANGLES.map(angle => ({ angle, file: null, previewUrl: null, base64: null }));
    const overlay = document.getElementById('vehicleIntakeOverlay');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _renderVehicleIntakeForm();
}

function closeVehicleIntake() {
    const overlay = document.getElementById('vehicleIntakeOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

function _viSave(field, value) { _viVehicle[field] = value; }

function _viOnMakeChange() {
    const make = document.getElementById('viMake')?.value || '';
    _viVehicle.make = make; _viVehicle.model = ''; _viVehicle.year = ''; _viVehicle.series = '';
    const ms = document.getElementById('viModel'); if (ms) ms.innerHTML = buildModelOptions(make, '');
    const ys = document.getElementById('viYear');  if (ys) ys.innerHTML = buildYearOptions('');
    const ew = document.getElementById('viEngineCodeWrap'); if (ew) ew.innerHTML = _buildEngineCodeField('vi', make, '', '');
    _viRefreshSeries();
}

function _viOnModelChange() {
    const make = document.getElementById('viMake')?.value || '';
    const model = document.getElementById('viModel')?.value || '';
    _viVehicle.model = model; _viVehicle.year = ''; _viVehicle.series = '';
    const ys = document.getElementById('viYear'); if (ys) ys.innerHTML = buildYearOptionsForModel(make, model, '');
    const ew = document.getElementById('viEngineCodeWrap'); if (ew) ew.innerHTML = _buildEngineCodeField('vi', make, model, '');
    _viRefreshSeries();
}

function _viOnYearChange() { _viVehicle.year = document.getElementById('viYear')?.value || ''; _viRefreshSeries(); }

function _viRefreshSeries() {
    const grp = document.getElementById('viSeriesGroup');
    const sel = document.getElementById('viSeries');
    if (!grp || !sel) return;
    const html = buildSeriesOptions(_viVehicle.make, _viVehicle.model, _viVehicle.year, '');
    if (html) { sel.innerHTML = html; grp.style.display = ''; }
    else       { grp.style.display = 'none'; }
}

function _buildVIPhotoSlots() {
    return _viVehiclePhotos.map((vp, i) => {
        if (vp.previewUrl) {
            return `<div class="edw-vp-slot">
                <img src="${escapeHtml(vp.previewUrl)}" class="edw-vp-img" alt="${escapeHtml(vp.angle)}" onclick="_viRemovePhoto(${i})" title="Tap to remove">
                <div class="edw-vp-label">${escapeHtml(vp.angle)}</div>
            </div>`;
        }
        return `<div class="edw-vp-slot">
            <label class="edw-vp-empty">
                <input type="file" accept="image/*" style="display:none" onchange="_viAddPhoto(${i}, this)">
                <span class="edw-vp-add-ico">+</span>
            </label>
            <div class="edw-vp-label">${escapeHtml(vp.angle)}</div>
        </div>`;
    }).join('');
}
function _viAddPhoto(index, input) {
    const file = input.files?.[0];
    if (!file) return;
    _viVehiclePhotos[index].file = file;
    _viVehiclePhotos[index].previewUrl = URL.createObjectURL(file);
    _fileToBase64(file).then(b64 => { _viVehiclePhotos[index].base64 = b64; });
    const grid = document.getElementById('viVpGrid');
    if (grid) grid.innerHTML = _buildVIPhotoSlots();
}
function _viRemovePhoto(index) {
    _viVehiclePhotos[index].file = null;
    _viVehiclePhotos[index].previewUrl = null;
    _viVehiclePhotos[index].base64 = null;
    const grid = document.getElementById('viVpGrid');
    if (grid) grid.innerHTML = _buildVIPhotoSlots();
}

function _renderVehicleIntakeForm() {
    const body = document.getElementById('viBody');
    if (!body) return;
    const makes = Object.keys(VEHICLE_DB || {}).sort();
    body.innerHTML = `
        <div class="vi-grid">
            <div class="edw-field"><label class="edw-label">Stock Number</label>
                <input id="viStockNumber" class="edw-input" type="text" placeholder="e.g. VH2847" oninput="_viSave('stockNumber',this.value)"></div>
            <div class="edw-field"><label class="edw-label">Purchase Cost <span style="font-size:10px;color:#aaa;font-weight:500;text-transform:none;">(internal)</span></label>
                <div class="edw-price-wrap"><span class="edw-price-sym">$</span><input id="viVehicleCost" class="edw-input edw-price-inp" type="number" min="0" step="1" placeholder="0" oninput="_viSave('vehicleCost',this.value)"></div></div>
            <div class="edw-field"><label class="edw-label">Make *</label>
                <select id="viMake" class="edw-input" onchange="_viOnMakeChange()">
                    <option value="">Select make…</option>
                    ${makes.map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}
                </select></div>
            <div class="edw-field"><label class="edw-label">Model *</label>
                <select id="viModel" class="edw-input" onchange="_viOnModelChange()">${buildModelOptions('','')}</select></div>
            <div class="edw-field"><label class="edw-label">Year *</label>
                <select id="viYear" class="edw-input" onchange="_viOnYearChange()">${buildYearOptions('')}</select></div>
            <div class="edw-field" id="viSeriesGroup" style="display:none;"><label class="edw-label">Series</label>
                <select id="viSeries" class="edw-input" onchange="_viSave('series',this.value)"><option value="">Select series…</option></select></div>
            <div class="edw-field"><label class="edw-label">Body Type</label>
                <select id="viBodyType" class="edw-input" onchange="_viSave('bodyType',this.value)">
                    <option value="">Select…</option>
                    ${['Sedan','Hatchback','Wagon','Ute / Pickup','SUV / 4WD','Van','Coupe','Convertible','People Mover'].map(t=>`<option value="${t}">${t}</option>`).join('')}
                </select></div>
            <div class="edw-field"><label class="edw-label">Colour</label>
                <input id="viColour" class="edw-input" type="text" placeholder="e.g. Graphite Grey" oninput="_viSave('colour',this.value)"></div>
            <div class="edw-field"><label class="edw-label">Odometer (km)</label>
                <input id="viOdo" class="edw-input" type="number" placeholder="e.g. 187000" oninput="_viSave('odometer',this.value)"></div>
            <div class="edw-field"><label class="edw-label">VIN / Chassis</label>
                <input id="viVin" class="edw-input" type="text" placeholder="17-char VIN" maxlength="17" oninput="_viSave('vin',this.value.toUpperCase())" style="text-transform:uppercase"></div>
            <div class="edw-field"><label class="edw-label">Engine Code</label>
                <div id="viEngineCodeWrap">${_buildEngineCodeField('vi','','','')}</div></div>
            <div class="edw-field"><label class="edw-label">Transmission Type</label>
                <select id="viTransType" class="edw-input" onchange="_viSave('transType',this.value)">
                    <option value="">Select…</option>
                    ${['Manual 4-speed','Manual 5-speed','Manual 6-speed','Auto 4-speed','Auto 6-speed','Auto 8-speed','Auto 9-speed','Auto 10-speed','CVT','DCT (Dual-Clutch)','Sequential','Other'].map(t=>`<option value="${t}">${t}</option>`).join('')}
                </select></div>
        </div>
        <div style="margin-top:16px;">
            <div class="edw-label" style="margin-bottom:8px;">Vehicle Photos <span style="font-weight:400;color:#aaa;font-size:10px;text-transform:none;">(optional)</span></div>
            <div class="edw-vp-grid" id="viVpGrid">${_buildVIPhotoSlots()}</div>
        </div>`;
}

async function saveVehicleIntake() {
    const v = _viVehicle;
    v.make  = document.getElementById('viMake')?.value  || v.make  || '';
    v.model = document.getElementById('viModel')?.value || v.model || '';
    v.year  = document.getElementById('viYear')?.value  || v.year  || '';
    v.series= document.getElementById('viSeries')?.value || '';
    v.engineCode = document.getElementById('viEngineCode')?.value || '';

    if (!v.make || !v.model || !v.year) { showToast('Please select Make, Model and Year'); return; }
    if (!sb || !currentUserId) { showToast('Sign in required'); return; }

    const saveBtn = document.querySelector('#vehicleIntakeOverlay .vi-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    const { data: job, error } = await sb.from('dismantling_jobs').insert({
        user_id: currentUserId, status: 'in_stock',
        make: v.make, model: v.model, year: Number(v.year),
        series: v.series || null, body_type: v.bodyType || null,
        vin: v.vin || null, colour: v.colour || null,
        engine_code: v.engineCode || null, transmission_type: v.transType || null,
        odometer: v.odometer ? Number(v.odometer) : null,
        stock_number: v.stockNumber || null,
        vehicle_cost: v.vehicleCost ? Number(v.vehicleCost) : null,
    }).select('id').single();

    if (error || !job) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save to Stock →'; }
        showToast('Failed to save vehicle'); return;
    }

    const hasPhotos = _viVehiclePhotos.some(p => p.file || p.base64);
    if (hasPhotos) {
        if (saveBtn) saveBtn.textContent = 'Uploading photos…';
        const photoUrls = await _edwUploadVehiclePhotos(job.id, _viVehiclePhotos);
        if (photoUrls.length) await sb.from('dismantling_jobs').update({ vehicle_photos: photoUrls }).eq('id', job.id);
    }

    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save to Stock →'; }
    showToast('Vehicle added to stock');
    closeVehicleIntake();
    renderDashStockVehicles();
    openVehicleStockCard(job.id);
}

function closeVehicleStockCard() {
    const overlay = document.getElementById('vehicleStockCardOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

async function _vscSetCost(jobId) {
    const current = document.querySelector(`.vsc-cost-val[data-job-id="${jobId}"]`)?.textContent?.replace('$','').replace(/,/g,'').trim();
    const val = prompt('Enter purchase cost for this vehicle ($):', current === '—' ? '' : current);
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) { showToast('Enter a valid amount'); return; }
    await sb.from('dismantling_jobs').update({ vehicle_cost: num }).eq('id', jobId);
    showToast('Purchase cost saved');
    openVehicleStockCard(jobId);
}

async function _vscToggleShellScrapped(jobId, scrapped) {
    if (scrapped && !confirm('Mark the shell for this vehicle as scrapped? This records that the body has been disposed of.')) return;
    const update = scrapped
        ? { shell_scrapped: true,  shell_scrapped_at: new Date().toISOString() }
        : { shell_scrapped: false, shell_scrapped_at: null };
    await sb.from('dismantling_jobs').update(update).eq('id', jobId);
    showToast(scrapped ? 'Shell marked as scrapped' : 'Shell marked as still present');
    openVehicleStockCard(jobId);
    renderDashStockVehicles();
}

async function _edwLoadAndOpen(jobId) {
    const { data: job } = await sb.from('dismantling_jobs').select('*').eq('id', jobId).single();
    if (!job) { document.body.style.overflow = ''; showToast('Vehicle not found'); return; }
    _edwStock = [job];
    _edwStartWalkaround(jobId);
    proOpenEDW();
}

async function openJobReview(jobId) {
    if (!sb) return;
    const { data: job }   = await sb.from('dismantling_jobs').select('*').eq('id', jobId).single();
    const { data: items } = await sb.from('dismantling_items').select('*').eq('job_id', jobId).order('id');
    if (!job) { showToast('Job not found'); return; }
    _openEdwShell(job, items || []);
}

function _openEdwShell(job, items) {
    const drawer = document.getElementById('edwDrawer');
    if (!drawer) return;
    _edwPositionDrawer(drawer);
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    const ind = document.getElementById('edwStepIndicator');
    if (ind) ind.innerHTML = '';
    _renderJobReviewView(job, items);
}

function _renderJobReviewView(job, items) {
    const body   = document.getElementById('edwBody');
    const footer = document.getElementById('edwFooter');
    if (!body || !footer) return;

    const vehicleTitle = `${job.year || ''} ${job.make || ''} ${job.model || ''}${job.series ? ' ' + job.series : ''}`.trim();
    const gradeLabel   = { A: 'Like New', B: 'Good Used', C: 'Average', D: 'Damaged' };
    const done  = items.filter(i => i.worker_done).length;
    const total = items.length;

    const workerBanner = job.status === 'ready'
        ? `<div class="jr-banner jr-done">Worker finished — ${done} of ${total} parts marked done. Review below and publish.</div>`
        : `<div class="jr-banner jr-pending">Stripping in progress — ${done} of ${total} parts done so far. You can publish any time.</div>`;

    const condMap   = { A: 'excellent', B: 'good', C: 'fair', D: 'damaged' };
    const cards = items.map(item => {
        const photos = (item.worker_photos || []).map(p =>
            `<img src="${escapeHtml(p)}" class="edw-review-photo" alt="part photo">`
        ).join('');
        const grade = item.grade || 'B';
        const autoDesc = `${gradeLabel[grade] || 'Good Used'} condition ${item.part_name} removed from a ${vehicleTitle}. Contact us for more details.`;
        const descVal  = escapeHtml(item.notes || autoDesc);
        const gradeOpts = ['A','B','C','D'].map(g =>
            `<option value="${g}" ${grade === g ? 'selected' : ''}>${g} — ${gradeLabel[g]}</option>`
        ).join('');
        return `
        <div class="edw-review-card" id="jrcard-${item.id}">
            <div class="edw-review-card-top">
                <div class="edw-review-part-name">${escapeHtml(item.part_name)}</div>
                <select class="edw-grade-select grade-${grade}" onchange="_jrUpdateGrade(${item.id}, this.value, this)">${gradeOpts}</select>
            </div>
            <div class="edw-review-title">${escapeHtml(item.assembly)} › ${escapeHtml(item.zone)}</div>
            ${photos ? `<div class="edw-review-photos">${photos}</div>` : `<div class="edw-review-no-photo">No photos yet</div>`}
            <div class="edw-price-row">
                <span class="edw-price-lbl">Price $</span>
                <input class="edw-price-input" type="number" min="0" step="1" placeholder="0.00"
                    value="${item.price || ''}" oninput="_jrUpdatePrice(${item.id}, this.value)">
                <button class="edw-remove-btn" onclick="_jrRemoveItem(${item.id}, this)">Remove</button>
            </div>
            <textarea class="edw-review-desc" rows="2" oninput="_jrUpdateDesc(${item.id}, this.value)">${descVal}</textarea>
        </div>`;
    }).join('');

    body.innerHTML = `
        <div class="edw-vehicle-banner">
            <div class="edw-vehicle-title">${escapeHtml(vehicleTitle)}${job.stock_number ? ` — ${escapeHtml(job.stock_number)}` : ''}</div>
        </div>
        ${workerBanner}
        <div class="edw-review-hint">Set prices, remove anything not wanted, then publish.</div>
        <div class="edw-review-list" id="jrReviewList">${cards}</div>
    `;
    footer.innerHTML = `
        <div class="edw-footer-meta" id="jrMeta">${items.length} parts</div>
        <button class="edw-btn-secondary" onclick="closeEdw()">Close</button>
        <button class="edw-btn-primary" onclick="_jrPublish(${job.id})">Publish All →</button>
    `;

    window._jrItems = items.map(i => ({ ...i }));
    window._jrJob   = job;
}

function _jrUpdatePrice(itemId, val) {
    const item = window._jrItems?.find(i => i.id === itemId);
    if (item) item.price = val ? Number(val) : null;
}

function _jrUpdateGrade(itemId, val, selectEl) {
    const item = window._jrItems?.find(i => i.id === itemId);
    if (!item) return;
    item.grade = val;
    if (selectEl) selectEl.className = `edw-grade-select grade-${val}`;
}

function _jrUpdateDesc(itemId, val) {
    const item = window._jrItems?.find(i => i.id === itemId);
    if (item) item.notes = val;
}

function _jrRemoveItem(itemId, btn) {
    if (window._jrItems) window._jrItems = window._jrItems.filter(i => i.id !== itemId);
    btn.closest('.edw-review-card')?.remove();
    const meta = document.getElementById('jrMeta');
    if (meta && window._jrItems) meta.textContent = `${window._jrItems.length} parts`;
}

async function _jrPublish(jobId) {
    if (!sb || !currentUserId || !window._jrItems?.length) { showToast('Nothing to publish'); return; }
    const footer = document.getElementById('edwFooter');
    if (footer) footer.innerHTML = `<div class="edw-footer-meta">Publishing…</div>`;

    const job   = window._jrJob;
    const items = window._jrItems;
    const vehicleTitle = `${job.year || ''} ${job.make || ''} ${job.model || ''}${job.series ? ' ' + job.series : ''}`.trim();
    const condMap      = { A: 'excellent', B: 'good', C: 'fair', D: 'damaged' };
    const gradeLabelJR = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Damaged' };
    let published = 0;

    for (const item of items) {
        const zoneData = EDW_TAXONOMY.find(z => z.zone === item.zone);
        const asmData  = zoneData?.assemblies.find(a => a.name === item.assembly);
        const category = _partCategory(zoneData, asmData, item.part_name) || 'general';
        const title    = `${item.part_name} to suit ${vehicleTitle}`;
        const { data: listing } = await sb.from('listings').insert({
            seller_id: currentUserId,
            seller_name: getPublicSellerName(),
            apc_id: generateApcId(),
            title, price: item.price || 0,
            category, condition: condMap[item.grade] || 'good',
            status: 'active', description: item.notes || `${gradeLabelJR[item.grade] || 'Used'} condition ${item.part_name} removed from a ${vehicleTitle}. Contact us for more details.`,
            fits_year: Number(job.year), chassis_vin: job.vin || null,
            stock_number: job.stock_number || null,
            location: userSettings.location || null,
            postcode: userSettings.postcode || null,
            dismantling_job_id: jobId || null,
        }).select('id').single();

        if (listing?.id) {
            await sb.from('listing_vehicles').insert({
                listing_id: listing.id, make: job.make, model: job.model, series: job.series || null,
            });
            const photos = item.worker_photos || [];
            if (photos.length) {
                await sb.from('listing_images').insert(
                    photos.map((url, i) => ({ listing_id: listing.id, storage_path: url, position: i }))
                );
            }
            await sb.from('dismantling_items').update({ listing_id: listing.id, status: 'published' }).eq('id', item.id);
            published++;
        }
    }

    await sb.from('dismantling_jobs').update({ status: 'published' }).eq('id', jobId);
    await loadUserListingsFromSupabase(currentUserId);
    renderMyParts(); renderMainGrid();
    _edwCommitted = true; // listings saved — closing from here shouldn't warn

    const body = document.getElementById('edwBody');
    if (body) body.innerHTML = `
        <div class="edw-success">
            <div class="edw-success-ico">✓</div>
            <div class="edw-success-title">${published} listing${published !== 1 ? 's' : ''} published</div>
            <div class="edw-success-sub">All parts for ${escapeHtml(vehicleTitle)} are now live on APC.</div>
            <button class="edw-btn-primary" style="margin-top:24px;" onclick="_edwViewMyListings();">View My Listings</button>
            <button class="edw-btn-secondary" style="margin-top:10px;width:100%;" onclick="_edwCommitted=false;_edwStep=0;_edwJobId=null;_renderEdw();_renderEdwStep0();">Back to Stock</button>
        </div>
    `;
    if (footer) footer.innerHTML = `<button class="edw-btn-secondary" onclick="closeEdw()">Close</button>`;
    showToast(`${published} listings published`);
    renderDashJobs();
}

// ─── Stock Lookup ─────────────────────────────────────────────────────────────

let _slVehicle        = { make: '', model: '', year: '', series: '' };
let _slSelectedZone   = 0;
let _slSelectedAsm    = -1;
let _slSelectedPartBase = null; // { base, qualifiers[] } — selected part in col 3
let _slTabs           = [];   // [{ partName, results:[], loading:false, error:null }]
let _slActiveTab      = -1;
let _slStockDebounce  = null;
let _slSearchHistory  = [];   // session log: { partName, vehicle, time, tabIdx, found }
let _slColWidths      = null; // computed once from full taxonomy — never recalculated
let _slSelected       = new Map(); // listingId -> { title, price, stock_number }
let _slResultsMap     = new Map(); // listingId -> result row data (populated when results load)
let _slQuotedListings = new Map(); // listingId -> [{id, quote_number, customer_name, status}] active quotes
let _slPartNotes      = new Map(); // listingId -> EDW note text (own parts only)
let _slQuotes         = [];        // quotes loaded from Supabase
let _slActiveQuote    = null;      // { quote, lines } currently shown in detail panel
let _slQuoteConvContext = null;    // set when quote overlay is opened from a DBMC conversation
let _slQuoteDebounce  = null;
let _slProOnly        = false;     // when true, OTHER YARDS section filters to pro sellers only
let _slSort           = { key: null, dir: 1 }; // results sort: column key + direction (spreadsheet headers)
let _slStateFilter    = null;      // OTHER YARDS: filter listings to one state (derived from postcode)
let _slPendingQuoteNumber = null;  // quote # generated when the add-to-quote modal opens (consumed on save)

function openStockLookup() {
    proOpenStockLookup();
}

function closeStockLookup() {
    proGoToDashboard();
}

function _slRenderVehicleBar() {
    const bar = document.getElementById('slVehicleBar');
    if (!bar) return;
    const makes    = Object.keys(VEHICLE_DB).sort();
    const models   = _slVehicle.make ? getVehicleModels(_slVehicle.make) : [];
    const yearOpts = (_slVehicle.make && _slVehicle.model)
        ? buildYearOptionsForModel(_slVehicle.make, _slVehicle.model, _slVehicle.year)
        : '<option value="">Select…</option>';

    const seriesOpts = (_slVehicle.make && _slVehicle.model && _slVehicle.year)
        ? buildSeriesOptions(_slVehicle.make, _slVehicle.model, _slVehicle.year, _slVehicle.series)
        : '';

    bar.innerHTML = `
        <div class="sl-veh-group">
            <span class="sl-veh-label">Make</span>
            <select class="sl-veh-select sl-veh-select-make" onchange="_slOnMakeChange(this.value)">
                <option value="">Select…</option>
                ${makes.map(m => `<option value="${escapeHtml(m)}"${_slVehicle.make===m?' selected':''}>${escapeHtml(m)}</option>`).join('')}
            </select>
            <span class="sl-veh-label">Model</span>
            <select class="sl-veh-select sl-veh-select-model" onchange="_slOnModelChange(this.value)" ${models.length?'':'disabled'}>
                <option value="">Select…</option>
                ${models.map(m => `<option value="${escapeHtml(m)}"${_slVehicle.model===m?' selected':''}>${escapeHtml(m)}</option>`).join('')}
            </select>
            <span class="sl-veh-label">Year</span>
            <select class="sl-veh-select sl-veh-select-narrow" onchange="_slOnYearChange(this.value)" ${(_slVehicle.make && _slVehicle.model)?'':'disabled'}>
                ${yearOpts}
            </select>
            ${seriesOpts ? `
            <span class="sl-veh-label">Series</span>
            <select class="sl-veh-select sl-veh-select-narrow" onchange="_slOnSeriesChange(this.value)">
                <option value="">All</option>
                ${seriesOpts}
            </select>` : ''}
            ${_slVehicle.make ? `<button class="sl-veh-clear-btn" onclick="_slClearSearch()">Clear</button>` : ''}
        </div>
        <div class="sl-stock-group">
            <span class="sl-veh-label">Stock No.</span>
            <input class="sl-stock-input" id="slStockInput" type="text" placeholder="e.g. VEH-001"
                oninput="_slStockDebounceSearch(this.value)">
        </div>`;
}

function _slOnMakeChange(val) {
    _slVehicle = { make: val, model: '', year: '', series: '' };
    _slRenderVehicleBar();
}
function _slOnModelChange(val) {
    _slVehicle.model = val; _slVehicle.year = ''; _slVehicle.series = '';
    _slRenderVehicleBar();
}
function _slOnYearChange(val) {
    _slVehicle.year = val; _slVehicle.series = '';
    _slRenderVehicleBar();
}
function _slOnSeriesChange(val) {
    _slVehicle.series = val;
}

function _slClearSearch() {
    _slVehicle        = { make: '', model: '', year: '', series: '' };
    _slTabs           = [];
    _slActiveTab      = -1;
    _slSelected       = new Map();
    _slResultsMap     = new Map();
    _slReverseMap     = null;
    _slSelectedZone   = 0;
    _slSelectedAsm    = -1;
    _slSelectedPartBase = null;
    _slRenderVehicleBar();
    _slRenderResultsArea();
    _slRenderSelector();
    const stockInput = document.getElementById('slStockInput');
    if (stockInput) stockInput.value = '';
}

function _slStockDebounceSearch(val) {
    clearTimeout(_slStockDebounce);
    if (!val.trim()) return;
    _slStockDebounce = setTimeout(() => _slSearchByStock(val.trim()), 500);
}

async function _slSearchByStock(stockNo) {
    if (!stockNo || !currentUserId || !sb) return;

    const tabName = `#${stockNo}`;
    const existing = _slTabs.findIndex(t => t.partName === tabName);
    if (existing >= 0) { _slSetActiveTab(existing); return; }

    _slTabs.push({ partName: tabName, isStockSearch: true, stockNo, results: [], loading: true, error: null });
    const idx = _slTabs.length - 1;
    _slSetActiveTab(idx);

    const { data, error } = await sb
        .from('listings')
        .select(`id, title, price, condition, status, stock_number, warehouse_bin, odometer, apc_id,
                 listing_images(storage_path, position)`)
        .eq('seller_id', currentUserId)
        .ilike('stock_number', stockNo)
        .order('title', { ascending: true });

    if (_slTabs[idx]) {
        _slTabs[idx].loading = false;
        _slTabs[idx].error   = error ? error.message : null;
        _slTabs[idx].results = data || [];
        (data || []).forEach(r => _slResultsMap.set(r.id, r));
    }
    if (_slActiveTab === idx) _slRenderResults();
    _slRenderTabs();
}


// Splits "Lower Control Arm (Left)" → { base:"Lower Control Arm", qualifier:"Left" }
function _slParsePartName(fullName) {
    const m = fullName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return m ? { base: m[1].trim(), qualifier: m[2].trim() } : { base: fullName, qualifier: null };
}

// Returns [{base, qualifiers[]}] for the given zone/assembly, merging parts that share a base name
function _slGetPartGroups(zI, aI) {
    const asm = EDW_TAXONOMY[zI]?.assemblies[aI];
    if (!asm) return [];
    const map = new Map();
    asm.parts.forEach(p => {
        const { base, qualifier } = _slParsePartName(p);
        if (!map.has(base)) map.set(base, []);
        if (qualifier) map.get(base).push(qualifier);
    });
    // fullBase carries the assembly's position (Front/Rear/Upper/…) the same way
    // EDW bakes it into the listing title — so the search + tab identity are
    // position-aware and Front/Rear parts of the same name don't collide.
    return [...map.entries()].map(([base, qualifiers]) => ({ base, qualifiers, fullBase: _edwFullPartName(asm.name, base) }));
}

function _slComputeColWidths() {
    if (_slColWidths) return _slColWidths;
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxW = arr => arr.length ? Math.ceil(Math.max(...arr.map(t => ctx.measureText(t).width))) : 0;

    // 16px h-padding + 28px for badge/arrow/border, min wide enough for content
    const zW = Math.max(maxW(EDW_TAXONOMY.map(z => z.zone)) + 44, 130);
    const aW = Math.max(maxW(EDW_TAXONOMY.flatMap(z => z.assemblies.map(a => a.name))) + 44, 120);

    const allBases = [], allQuals = [];
    EDW_TAXONOMY.forEach(z => z.assemblies.forEach(a => {
        a.parts.forEach(p => {
            const m = p.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
            if (m) { allBases.push(m[1].trim()); allQuals.push(m[2].trim()); }
            else allBases.push(p);
        });
    }));
    const pW = Math.max(maxW([...new Set(allBases)]) + 56, 130); // 56 = padding + ▸/↗ icon
    const qW = allQuals.length ? Math.max(maxW([...new Set(allQuals)]) + 44, 100) : 100;

    _slColWidths = [zW, aW, pW, qW];
    return _slColWidths;
}

function _slRenderSelector() {
    const sel = document.getElementById('slSelector');
    if (!sel) return;
    sel.innerHTML = `
        <div class="edw-3panel" style="border-top:none;">
            <div class="edw-3ph">Zone</div>
            <div class="edw-3ph">Assembly</div>
            <div class="edw-3ph">Part</div>
            <div class="edw-3ph">Options</div>
            <div class="edw-3pcol" id="slPanelZones">${_buildSlZones()}</div>
            <div class="edw-3pcol" id="slPanelAsms">${_buildSlAsms(_slSelectedZone)}</div>
            <div class="edw-3pcol" id="slPanelParts">${_buildSlParts(_slSelectedZone, _slSelectedAsm)}</div>
            <div class="edw-3pcol" id="slPanelQuals">${_buildSlQualifiers()}</div>
        </div>`;
    const [zW, aW, pW, qW] = _slComputeColWidths();
    const panel = sel.querySelector('.edw-3panel');
    if (panel) panel.style.gridTemplateColumns = `${zW}px ${aW}px ${pW}px ${qW}px`;
}

// Cached reverse map: partName/base → { zI, aI } — built once from taxonomy
let _slReverseMap = null;
function _slGetReverseMap() {
    if (_slReverseMap) return _slReverseMap;
    _slReverseMap = new Map();
    EDW_TAXONOMY.forEach((zone, zI) => {
        zone.assemblies.forEach((asm, aI) => {
            asm.parts.forEach(p => {
                const { base, qualifier } = _slParsePartName(p);
                const fullBase = _edwFullPartName(asm.name, base);
                if (!_slReverseMap.has(fullBase)) _slReverseMap.set(fullBase, { zI, aI });
                if (qualifier) _slReverseMap.set(`${fullBase} — ${qualifier}`, { zI, aI });
            });
        });
    });
    return _slReverseMap;
}

// Count how many open tabs belong to the given zone/assembly
function _slTabCountForZone(zI) {
    const m = _slGetReverseMap();
    return _slTabs.filter(t => {
        const loc = m.get(t.partName) || m.get(t.partName.split(' — ')[0]);
        return loc?.zI === zI;
    }).length;
}
function _slTabCountForAsm(zI, aI) {
    const m = _slGetReverseMap();
    return _slTabs.filter(t => {
        const loc = m.get(t.partName) || m.get(t.partName.split(' — ')[0]);
        return loc?.zI === zI && loc?.aI === aI;
    }).length;
}

function _buildSlZones() {
    return EDW_TAXONOMY.map((zone, zI) => {
        const active = _slSelectedZone === zI;
        const count  = _slTabCountForZone(zI);
        return `<div class="edw-panel-row${active ? ' active' : ''}" onclick="_slSelectZone(${zI})">
            <span>${escapeHtml(zone.zone)}</span>
            ${count ? `<span class="sl-count-badge">${count}</span>` : (active ? '<span style="color:#f07020;font-size:10px;margin-left:auto;">▸</span>' : '')}
        </div>`;
    }).join('');
}

function _buildSlAsms(zI) {
    const zone = EDW_TAXONOMY[zI];
    if (!zone) return '';
    return zone.assemblies.map((asm, aI) => {
        const active = _slSelectedAsm >= 0 && _slSelectedAsm === aI;
        const count  = _slTabCountForAsm(zI, aI);
        return `<div class="edw-panel-row${active ? ' active' : ''}" onclick="_slSelectAsm(${aI})">
            <span>${escapeHtml(asm.name)}</span>
            ${count ? `<span class="sl-count-badge">${count}</span>` : ''}
        </div>`;
    }).join('');
}

function _buildSlParts(zI, aI) {
    const groups = _slGetPartGroups(zI, aI);
    if (!groups.length) return `<div class="edw-panel-empty">Select an assembly</div>`;
    const searched = new Set(_slTabs.map(t => t.partName));
    return groups.map(({ base, qualifiers, fullBase }, idx) => {
        const hasQuals   = qualifiers.length > 0;
        const isSelected = _slSelectedPartBase?.base === base;
        const checkedAll = searched.has(fullBase);
        const checkedAny = hasQuals && qualifiers.some(q => searched.has(`${fullBase} — ${q}`));
        const checked    = checkedAll || checkedAny;
        const count      = hasQuals
            ? qualifiers.filter(q => searched.has(`${fullBase} — ${q}`)).length + (checkedAll ? 1 : 0)
            : (checkedAll ? 1 : 0);
        return `<div class="edw-panel-row sl-part-row${checked ? ' searched' : ''}${isSelected ? ' active' : ''}"
                     onclick="_slSelectPartBase(${idx})">
            <span>${escapeHtml(base)}</span>
            ${count  ? `<span class="sl-count-badge">${count}</span>` : ''}
            ${hasQuals ? '<span style="color:#bbb;font-size:13px;flex-shrink:0;margin-left:auto;">▸</span>' : ''}
        </div>`;
    }).join('');
}

function _buildSlQualifiers() {
    if (!_slSelectedPartBase) {
        return `<div class="edw-panel-empty" style="font-size:12px;padding:20px 10px;text-align:center;">← select<br>a part</div>`;
    }
    const { base, qualifiers, fullBase } = _slSelectedPartBase;
    const searched  = new Set(_slTabs.map(t => t.partName));
    const safeBase  = escapeHtml(fullBase).replace(/'/g, "\\'");

    // No qualifiers — check for engine codes if in Engine assembly, otherwise show "Select"
    if (!qualifiers.length) {
        const asmName = EDW_TAXONOMY[_slSelectedZone]?.assemblies[_slSelectedAsm]?.name || '';
        const { make, model, series } = _slVehicle;
        const engineCodes = (asmName === 'Engine' && make && model)
            ? (VEHICLE_ENGINES?.[make]?.[model + (series ? ' ' + series : '')] || VEHICLE_ENGINES?.[make]?.[model] || [])
            : [];

        if (engineCodes.length) {
            return engineCodes.map(code => {
                const done    = searched.has(`${fullBase} — ${code}`);
                const safeCode = escapeHtml(code).replace(/'/g, "\\'");
                return `<div class="edw-panel-row sl-part-row${done ? ' searched' : ''}">
                    <label class="sl-part-check" onclick="event.stopPropagation()">
                        <input type="checkbox"${done ? ' checked' : ''} onchange="_slTogglePartCheck('${safeBase}','${safeCode}',this.checked)">
                    </label>
                    <span>${escapeHtml(code)}</span>
                </div>`;
            }).join('');
        }

        const checked = searched.has(fullBase);
        return `<div class="edw-panel-row sl-part-row${checked ? ' searched' : ''}">
            <label class="sl-part-check" onclick="event.stopPropagation()">
                <input type="checkbox"${checked ? ' checked' : ''} onchange="_slTogglePartCheck('${safeBase}','',this.checked)">
            </label>
            <span style="color:#999;font-style:italic;">Select</span>
        </div>`;
    }

    // Has qualifiers — show each as a checkbox row
    return qualifiers.map(q => {
        const done  = searched.has(`${fullBase} — ${q}`);
        const safeQ = escapeHtml(q).replace(/'/g, "\\'");
        return `<div class="edw-panel-row sl-part-row${done ? ' searched' : ''}">
            <label class="sl-part-check" onclick="event.stopPropagation()"><input type="checkbox"${done ? ' checked' : ''} onchange="_slTogglePartCheck('${safeBase}','${safeQ}',this.checked)"></label>
            <span>${escapeHtml(q)}</span>
        </div>`;
    }).join('');
}

function _slSelectZone(zI) {
    _slSelectedZone = zI; _slSelectedAsm = -1; _slSelectedPartBase = null;
    const z = document.getElementById('slPanelZones');
    const a = document.getElementById('slPanelAsms');
    const p = document.getElementById('slPanelParts');
    const q = document.getElementById('slPanelQuals');
    if (z) z.innerHTML = _buildSlZones();
    if (a) { a.innerHTML = _buildSlAsms(zI); a.scrollTop = 0; }
    if (p) { p.innerHTML = `<div class="edw-panel-empty">Select an assembly</div>`; p.scrollTop = 0; }
    if (q) { q.innerHTML = _buildSlQualifiers(); q.scrollTop = 0; }
}

function _slSelectAsm(aI) {
    _slSelectedAsm = aI; _slSelectedPartBase = null;
    const a = document.getElementById('slPanelAsms');
    const p = document.getElementById('slPanelParts');
    const q = document.getElementById('slPanelQuals');
    if (a) a.innerHTML = _buildSlAsms(_slSelectedZone);
    if (p) { p.innerHTML = _buildSlParts(_slSelectedZone, aI); p.scrollTop = 0; }
    if (q) { q.innerHTML = _buildSlQualifiers(); q.scrollTop = 0; }
}

function _slSelectPartBase(baseIdx) {
    const groups = _slGetPartGroups(_slSelectedZone, _slSelectedAsm);
    const group = groups[baseIdx];
    if (!group) return;
    // Always set selected part — col 4 shows "Select" (no quals) or L/R checkboxes
    _slSelectedPartBase = group;
    const p = document.getElementById('slPanelParts');
    const q = document.getElementById('slPanelQuals');
    if (p) p.innerHTML = _buildSlParts(_slSelectedZone, _slSelectedAsm);
    if (q) q.innerHTML = _buildSlQualifiers();
}

function _slSelectQualifier(base, qualifier) {
    if (!_slVehicle.make || !_slVehicle.model || !_slVehicle.year) {
        showToast('Select a vehicle first'); return;
    }
    const tabName = qualifier ? `${base} — ${qualifier}` : base;
    const existing = _slTabs.findIndex(t => t.partName === tabName);
    if (existing >= 0) { _slSetActiveTab(existing); return; }
    _slTabs.push({ partName: tabName, results: [], loading: true, error: null });
    const idx = _slTabs.length - 1;
    _slSetActiveTab(idx);
    _slLogSearch(tabName, idx);
    _slSearch(base, qualifier || null, idx);
    _slRefreshSelectorBadges();
}

function _slRefreshSelectorBadges() {
    const z = document.getElementById('slPanelZones');
    const a = document.getElementById('slPanelAsms');
    const p = document.getElementById('slPanelParts');
    const q = document.getElementById('slPanelQuals');
    if (z) z.innerHTML = _buildSlZones();
    if (a) a.innerHTML = _buildSlAsms(_slSelectedZone);
    if (p) p.innerHTML = _buildSlParts(_slSelectedZone, _slSelectedAsm);
    if (q) q.innerHTML = _buildSlQualifiers();
}

function _slLogSearch(partName, tabIdx) {
    const vehicle = [_slVehicle.year, _slVehicle.make, _slVehicle.model].filter(Boolean).join(' ');
    const time    = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    const veh     = { ..._slVehicle };  // structured context so a click can repopulate the fields
    // Dedupe on part + vehicle so the same part on a different car stays a separate entry
    const existing = _slSearchHistory.findIndex(h => h.partName === partName && h.vehicle === vehicle);
    if (existing >= 0) { _slSearchHistory[existing].tabIdx = tabIdx; _slSearchHistory[existing].time = time; _slSearchHistory[existing].veh = veh; }
    else               { _slSearchHistory.unshift({ partName, vehicle, veh, time, tabIdx, found: null }); }
    _slRenderSearchHistory();
}

function _slUpdateSearchFound(tabIdx, count) {
    const entry = _slSearchHistory.find(h => h.tabIdx === tabIdx);
    if (entry) { entry.found = count; _slRenderSearchHistory(); }
}

function _slRenderSearchHistory() {
    const list    = document.getElementById('slSearchHistory');
    const countEl = document.getElementById('slSearchCount');
    if (!list) return;
    if (countEl) countEl.textContent = _slSearchHistory.length ? `${_slSearchHistory.length}` : '';
    if (!_slSearchHistory.length) {
        list.innerHTML = `<div class="sl-sp-empty">No searches yet this session</div>`;
        return;
    }
    list.innerHTML = _slSearchHistory.map((h, i) => {
        const foundChip = h.found === null
            ? '<span class="sl-sp-chip sl-sp-searching">…</span>'
            : h.found > 0
                ? `<span class="sl-sp-chip sl-sp-found">${h.found} found</span>`
                : `<span class="sl-sp-chip sl-sp-none">None</span>`;
        return `<div class="sl-sp-row" onclick="_slJumpToSearch(${i})">
            <div class="sl-sp-info">
                <div class="sl-sp-part">${escapeHtml(h.partName)}</div>
                <div class="sl-sp-meta">${escapeHtml(h.vehicle)} · ${h.time}</div>
            </div>
            ${foundChip}
        </div>`;
    }).join('');
}

function _slJumpToSearch(idx) {
    const h = _slSearchHistory[idx];
    if (!h) return;
    const tabIdx = _slTabs.findIndex(t => t.partName === h.partName);
    if (tabIdx >= 0) { _slSetActiveTab(tabIdx); return; }
    // Restore the vehicle this search was run against so the Make/Model/Year/Series
    // fields repopulate, then re-run the part search to bring the results back up.
    if (h.veh && h.veh.make) {
        _slVehicle = { make: h.veh.make || '', model: h.veh.model || '', year: h.veh.year || '', series: h.veh.series || '' };
        _slRenderVehicleBar();
    }
    // Restore the zone → assembly → part highlight for visual continuity.
    const fullBase = h.partName.includes(' — ') ? h.partName.split(' — ', 2)[0] : h.partName;
    const map = _slGetReverseMap();
    const loc = map.get(h.partName) || map.get(fullBase);
    if (loc) {
        _slSelectedZone = loc.zI; _slSelectedAsm = loc.aI;
        _slSelectedPartBase = _slGetPartGroups(loc.zI, loc.aI).find(g => g.fullBase === fullBase) || null;
    }
    _slRenderSelector();
    const [base, qualifier] = h.partName.includes(' — ')
        ? h.partName.split(' — ', 2)
        : [h.partName, null];
    _slSelectQualifier(base, qualifier);
}

// ─── Stock Lookup: in-place chat ─────────────────────────────────────────────
let _slActiveChat     = null;
let _slChatMinimised  = false;

function _slOpenChatBtn(btn) {
    _slOpenChat(Number(btn.dataset.lid), btn.dataset.sid, btn.dataset.title, btn.dataset.seller);
}

async function _slOpenChat(listingId, sellerId, listingTitle, sellerName) {
    if (!currentUserId) { showToast('Sign in to message'); return; }
    if (sellerId === currentUserId) { showToast('This is your own listing'); return; }

    const float = document.getElementById('slChatFloat');
    const yard  = document.getElementById('slCfYard');
    const part  = document.getElementById('slCfPart');
    if (yard)  yard.textContent  = sellerName;
    if (part)  part.textContent  = listingTitle;
    if (float) { float.style.display = 'flex'; float.classList.remove('minimised'); }
    _slChatMinimised = false;

    const msgsEl = document.getElementById('slCfMsgs');
    if (msgsEl) msgsEl.innerHTML = `<div class="sl-cf-loading">Connecting…</div>`;

    const conv = await _slEnsureConversation(listingId, sellerId, listingTitle, sellerName);
    if (!conv) return;
    _slActiveChat = conv;
    _slChatRender();
    _slPushYardChat(listingId, sellerId, sellerName, listingTitle);
}

// ── Today panel: Quotes / Searches / Yard Chats switch ────────────────────
let _slTodayTab  = 'quotes';
let _slYardChats = [];   // yard-to-yard chats started from Stock Lookup today

function _slSetTodayTab(tab) {
    _slTodayTab = tab;
    [['quotes', 'slTodayQuotes', 'slTodayTabQuotes'],
     ['searches', 'slTodaySearches', 'slTodayTabSearches'],
     ['chats', 'slTodayChats', 'slTodayTabChats']].forEach(([t, viewId, tabId]) => {
        const view = document.getElementById(viewId);
        const btn  = document.getElementById(tabId);
        if (view) view.style.display = (t === tab) ? 'flex' : 'none';
        if (btn)  btn.classList.toggle('sl-today-tab--active', t === tab);
    });
}

// Surface a chat the moment it's opened — keeps the list live without a round-trip.
function _slPushYardChat(listingId, sellerId, sellerName, partTitle) {
    const key = String(listingId);
    _slYardChats = _slYardChats.filter(c => String(c.listingId) !== key);
    _slYardChats.unshift({ listingId, sellerId, with: sellerName || 'Yard', partTitle: partTitle || '', time: nowClock(), unread: false });
    _slRenderYardChats();
}

// Hydrate today's yard chats from Supabase so the list survives a refresh.
async function _slLoadYardChats() {
    _slYardChats = [];
    _slRenderYardChats();
    if (!sb || !currentUserId) return;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const { data } = await sb.from('conversations')
        .select('id, listing_id, seller_id, seller_name, listing_title, unread_buyer, created_at')
        .eq('buyer_id', currentUserId).eq('source', 'stocklookup')
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false }).limit(30);
    _slYardChats = (data || []).map(c => ({
        supabaseConvId: c.id, listingId: c.listing_id, sellerId: c.seller_id,
        with: c.seller_name || 'Yard', partTitle: c.listing_title || '',
        time: formatMsgTime(c.created_at), unread: !!c.unread_buyer,
    }));
    _slRenderYardChats();
}

function _slRenderYardChats() {
    const list  = document.getElementById('slYardChatsList');
    const badge = document.getElementById('slChatsBadge');
    if (badge) {
        const unread = _slYardChats.filter(c => c.unread).length;
        badge.textContent = unread ? String(unread) : '';
    }
    if (!list) return;
    if (!_slYardChats.length) {
        list.innerHTML = `<div class="sl-sp-empty">No yard chats yet today. Message another yard from a search result and it shows up here.</div>`;
        return;
    }
    list.innerHTML = _slYardChats.map((c, i) => `
        <div class="sl-sp-row" onclick="_slReopenYardChat(${i})">
            <div class="sl-sp-info">
                <div class="sl-sp-part">${escapeHtml(c.with)}</div>
                <div class="sl-sp-meta">${escapeHtml(c.partTitle)}${c.time ? ` · ${escapeHtml(c.time)}` : ''}</div>
            </div>
            ${c.unread ? `<span class="sl-sp-chip sl-sp-none">New</span>` : ''}
        </div>`).join('');
}

function _slReopenYardChat(i) {
    const c = _slYardChats[i];
    if (!c) return;
    c.unread = false;
    _slRenderYardChats();
    _slOpenChat(Number(c.listingId), c.sellerId, c.partTitle, c.with);
}

async function _slEnsureConversation(listingId, sellerId, listingTitle, sellerName) {
    if (!sb || !currentUserId) return null;

    // Check local cache first
    let conv = conversations.find(c => String(c.partId) === String(listingId) && c.buyerId === currentUserId);
    if (conv) return conv;

    // Check Supabase for existing conversation
    const { data: existing } = await sb.from('conversations')
        .select('id').eq('listing_id', listingId).eq('buyer_id', currentUserId).maybeSingle();

    if (existing) {
        const { data: msgs } = await sb.from('messages')
            .select('id, sender_id, text, photo_url, offer_data, created_at')
            .eq('conversation_id', existing.id).order('created_at', { ascending: true });
        conv = {
            id: nextConvId(), supabaseConvId: existing.id,
            partId: String(listingId), sellerId, buyerId: currentUserId,
            buyerName: currentUserName, with: sellerName, partTitle: listingTitle, msgs: [], unread: false,
        };
        conv.msgs = (msgs || []).map((m, i) => ({
            id: i + 1, supabaseMsgId: m.id, sent: m.sender_id === currentUserId,
            text: m.text || '',
            ...(m.photo_url  ? { photo: m.photo_url }     : {}),
            ...(m.offer_data ? { offerCard: m.offer_data } : {}),
            time: formatMsgDate(m.created_at), clock: formatMsgTime(m.created_at),
        }));
        conversations.unshift(conv);
        saveConversations();
        proUpdateFolderBadges();
        return conv;
    }

    // Create new conversation
    const { data, error } = await sb.from('conversations').insert({
        listing_id: listingId, buyer_id: currentUserId, seller_id: sellerId,
        buyer_name: currentUserName, seller_name: sellerName,
        listing_title: listingTitle, unread_buyer: false, unread_seller: true,
        source: 'stocklookup',
    }).select('id').single();

    if (error) { showToast('Could not start chat: ' + error.message); return null; }

    conv = {
        id: nextConvId(), supabaseConvId: data.id,
        partId: String(listingId), sellerId, buyerId: currentUserId,
        buyerName: currentUserName, with: sellerName, partTitle: listingTitle, msgs: [], unread: false,
    };
    conversations.unshift(conv);
    saveConversations();
    proUpdateFolderBadges();
    return conv;
}

function _slChatRender() {
    const el = document.getElementById('slCfMsgs');
    const conv = _slActiveChat;
    if (!el || !conv) return;
    if (!conv.msgs?.length) {
        el.innerHTML = `<div class="sl-cf-empty">No messages yet — send your first message below.</div>`;
        return;
    }
    el.innerHTML = conv.msgs.map(m => {
        if (m.offerCard?.type === 'quote') {
            return `<div class="sl-cf-msg ${m.sent ? 'sent' : 'recv'}">
                ${buildQuoteCardHTML(m.offerCard)}
                <div class="sl-cf-time">${m.clock || m.time || ''}</div>
            </div>`;
        }
        const bubble = m.text ? escapeHtml(m.text) : (m.photo ? `<img src="${escapeHtml(m.photo)}" style="max-width:180px;border-radius:6px;" alt="">` : '');
        return `<div class="sl-cf-msg ${m.sent ? 'sent' : 'recv'}">
            <div class="sl-cf-bubble">${bubble}</div>
            <div class="sl-cf-time">${m.clock || m.time || ''}</div>
        </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
}

function _slChatSend() {
    const input = document.getElementById('slCfInput');
    const text  = input?.value.trim();
    if (!text || !_slActiveChat) return;
    const conv = _slActiveChat;
    conv.msgs = conv.msgs || [];
    conv.msgs.push({ id: nextMsgId(conv), sent: true, text, time: 'Today', clock: nowClock(), timestamp: Date.now() });
    input.value = '';
    saveConversations();
    _slChatRender();
    syncMessageToSupabase(conv.supabaseConvId, text, true).catch(() => {});
}

function _slChatMinimize() {
    const float = document.getElementById('slChatFloat');
    if (!float) return;
    _slChatMinimised = !_slChatMinimised;
    float.classList.toggle('minimised', _slChatMinimised);
}

function _slViewInEnquiries() {
    const conv = _slActiveChat;
    _slChatClose();
    proOpenEnquiries();
    proSetFolder('buying');
    if (conv?.supabaseConvId) {
        const local = conversations.find(c => c.supabaseConvId === conv.supabaseConvId);
        if (local) setTimeout(() => openInboxConv(local.id), 250);
    }
}

function _slChatClose() {
    const float = document.getElementById('slChatFloat');
    if (float) float.style.display = 'none';
    _slActiveChat = null;
}

function _slPreviewChat() {
    const float = document.getElementById('slChatFloat');
    const yard  = document.getElementById('slCfYard');
    const part  = document.getElementById('slCfPart');
    if (yard) yard.textContent = 'WreckIt Auto Parts — Adelaide';
    if (part) part.textContent = 'Z6-DE 1.6 Engine to suit 2006 Mazda 3 BK';
    if (float) { float.style.display = 'flex'; float.classList.remove('minimised'); }
    _slChatMinimised = false;

    const now = new Date();
    const t = h => `${String(h).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const msgs = [
        { id:1, sent:false, text:'Hi, yes we have this engine in stock. Grade B, around 95k km on it. Pulled from a factory auto car.', clock: t(now.getHours()-1) },
        { id:2, sent:true,  text:'Great! Does it come with the loom and ECU?', clock: t(now.getHours()-1) },
        { id:3, sent:false, text:'Loom yes, ECU we can include for an extra $80. Engine price is $650 + freight.', clock: t(now.getHours()) },
        { id:4, sent:true,  text:"What's freight to 3000 VIC?", clock: t(now.getHours()) },
        { id:5, sent:false, text:'Give me a sec, I\'ll check with our freight guy…', clock: t(now.getHours()) },
    ];

    _slActiveChat = { id: 'preview', supabaseConvId: null, msgs, with: 'WreckIt Auto Parts' };
    const el = document.getElementById('slCfMsgs');
    if (el) {
        el.innerHTML = msgs.map(m => {
            const bubble = escapeHtml(m.text);
            return `<div class="sl-cf-msg ${m.sent ? 'sent' : 'recv'}">
                <div class="sl-cf-bubble">${bubble}</div>
                <div class="sl-cf-time">${m.clock}</div>
            </div>`;
        }).join('');
        el.scrollTop = el.scrollHeight;
    }
}

function _slRefreshChatIfOpen(convId) {
    if (!_slActiveChat || _slActiveChat.supabaseConvId !== convId) return;
    _slChatRender();
}

function _slTogglePartCheck(base, qualifier, checked) {
    if (checked) {
        _slSelectQualifier(base, qualifier);
    } else {
        const tabName = qualifier ? `${base} — ${qualifier}` : base;
        const idx = _slTabs.findIndex(t => t.partName === tabName);
        if (idx >= 0) _slCloseTab(idx);
    }
}

// Engine-variant matching. With an engine-code qualifier, a listing is an EXACT
// match if its title names that code, a POSSIBLE match if it names no engine code
// (could be any engine), and excluded if it names a *different* code. Exact sorts
// first. Sided qualifiers (Left/Right) exclude the opposite side outright — a
// wrong-side panel never fits, so it is never offered as "possible".
function _slClassifyByEngine(results, qualifier) {
    if (!qualifier) return results;
    const { make, model, series } = _slVehicle;
    const codes = (VEHICLE_ENGINES?.[make]?.[model + (series ? ' ' + series : '')]
                || VEHICLE_ENGINES?.[make]?.[model] || []).map(c => String(c).toLowerCase());
    const qLow = qualifier.toLowerCase();

    // Left/Right is a hard side constraint: drop listings that name the opposite
    // side. Word-boundaried so "right" doesn't match "upright". Engine/gearbox-type
    // generics are untouched and still flow through the "possible" logic below.
    const sideMatch = qLow.match(/\b(left|right)\b/);
    const sideRe = sideMatch && new RegExp(`\\b${sideMatch[1]}\\b`);
    const oppRe  = sideMatch && new RegExp(`\\b${sideMatch[1] === 'left' ? 'right' : 'left'}\\b`);
    const wrongSide = t => oppRe && oppRe.test(t) && !sideRe.test(t);

    // Match the engine code against title + the listing's variant field (where EDW/older
    // listings store it, e.g. "Engine / Variant: L3-VE 2.3") — the title alone misses it.
    const hayOf = r => `${(r.title || '').toLowerCase()} ${(r.variant || '').toLowerCase()}`;
    if (!codes.length) {
        return results.filter(r => {
            const t = (r.title || '').toLowerCase();
            return !wrongSide(t) && hayOf(r).includes(qLow);
        });
    }
    const out = [];
    for (const r of results) {
        const t   = (r.title || '').toLowerCase();
        const hay = hayOf(r);
        if (wrongSide(t))                     continue; // opposite side — never fits
        if (hay.includes(qLow))               out.push({ ...r, _match: 'exact' });
        else if (codes.some(c => hay.includes(c))) continue; // names a different engine
        else                                  out.push({ ...r, _match: 'possible' });
    }
    out.sort((a, b) => (a._match === 'exact' ? 0 : 1) - (b._match === 'exact' ? 0 : 1));
    return out;
}

async function _slSearch(partBase, qualifier, tabIdx) {
    if (!sb) return;
    // Capture demand: include vehicle context so the report shows "Toyota HiAce Taillight Left"
    const { make, model, year } = _slVehicle;
    const vehiclePrefix = [make, model].filter(Boolean).join(' ');
    const demandTerm = [vehiclePrefix, partBase, qualifier].filter(Boolean).join(' ');
    const _slSeries = _slVehicle.series;
    const yearRange = (year && make && model)
        ? (_slSeries && getVehicleYearRange(make, `${model} ${_slSeries}`, year))
          || getVehicleYearRange(make, model, year)
        : null;

    // Year filter: always include null fits_year (universal parts fit any vehicle)
    // Uses two chained .or() calls which AND together to give:
    //   fits_year IS NULL  OR  (fits_year >= lo AND fits_year <= hi)
    const applyYearFilter = q => {
        if (yearRange) {
            return q
                .or(`fits_year.is.null,fits_year.gte.${yearRange[0]}`)
                .or(`fits_year.is.null,fits_year.lte.${yearRange[1]}`);
        }
        if (year) return q.or(`fits_year.is.null,fits_year.eq.${Number(year)}`);
        return q;
    };

    const cols = `id, title, price, condition, status, seller_id, apc_id, stock_number, warehouse_bin, odometer, postcode, location, variant, chassis_vin,
                  listing_images(storage_path, position)`;

    // Fetch vehicle-matching listing IDs first — used for both own and other-yard filtering
    let vehicleIds = [];
    if (make && model) {
        const { data: vRows } = await sb
            .from('listing_vehicles').select('listing_id').ilike('make', make).ilike('model', model);
        vehicleIds = (vRows || []).map(v => v.listing_id).filter(Boolean);
    }

    // Search A: own listings — filter by vehicle when make+model selected
    let ownQ = sb.from('listings').select(cols)
        .eq('seller_id', currentUserId).eq('status', 'active')
        .ilike('title', `%${partBase}%`).order('created_at', { ascending: false }).limit(60);
    // Always restrict to the selected vehicle's listings — an empty match must
    // return nothing, never fall back to matching the part name alone.
    // (Qualifier/engine-code matching is done in JS so generics can be "possible".)
    if (make && model) ownQ = ownQ.in('id', vehicleIds);
    ownQ = applyYearFilter(ownQ);

    // Search B: other yards — via listing_vehicles
    const promises = [ownQ];
    if (vehicleIds.length) {
        let otherQ = sb.from('listings').select(cols)
            .in('id', vehicleIds).neq('seller_id', currentUserId)
            .eq('status', 'active').ilike('title', `%${partBase}%`)
            .order('created_at', { ascending: false }).limit(60);
        otherQ = applyYearFilter(otherQ);
        promises.push(otherQ);
    }

    const responses = await Promise.all(promises);
    const ownResults   = responses[0]?.data || [];
    const otherResults = (responses[1]?.data || []).filter(r => !ownResults.some(o => o.id === r.id));
    const error        = responses[0]?.error;

    // Fetch profiles for other yards
    let profileMap = {};
    if (otherResults.length) {
        const sellerIds = [...new Set(otherResults.map(r => r.seller_id))].filter(Boolean);
        if (sellerIds.length) {
            const { data: profs } = await sb.from('public_profiles').select('id, display_name, business_name, is_pro').in('id', sellerIds);
            profileMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
        }
    }

    let results = [
        ...ownResults.map(r => ({ ...r, profiles: null })),
        ...otherResults.map(r => ({ ...r, profiles: profileMap[r.seller_id] || null })),
    ];
    results = _slClassifyByEngine(results, qualifier);
    results.forEach(r => _slResultsMap.set(r.id, r));

    // Log this lookup as the yard's own demand (their phone enquiry), with whether we could
    // supply. Structured make/model/part feed the My Yard report's Make → Model → Part grouping.
    recordYardEnquiry(demandTerm, results.length > 0, {
        make,
        model: [model, _slSeries].filter(Boolean).join(' '),
        part:  [partBase, qualifier].filter(Boolean).join(' '),
    });

    if (_slTabs[tabIdx]) {
        _slTabs[tabIdx].loading = false;
        _slTabs[tabIdx].error   = error ? error.message : null;
        _slTabs[tabIdx].results = results;
        _slUpdateSearchFound(tabIdx, results.length);
    }
    if (_slActiveTab === tabIdx) _slRenderResults();
    _slRenderTabs();
}

function _slRenderResultsArea() {
    const empty   = document.getElementById('slResultsEmpty');
    const tabBar  = document.getElementById('slTabBar');
    const content = document.getElementById('slResultsContent');
    if (!empty || !tabBar || !content) return;
    if (_slTabs.length === 0) {
        empty.style.display   = '';
        tabBar.style.display  = 'none';
        content.style.display = 'none';
        _slRenderActionBar();
        return;
    }
    empty.style.display   = 'none';
    tabBar.style.display  = '';
    content.style.display = '';
    _slRenderTabs();
    _slRenderResults();
}

function _slRenderTabs() {
    const tabBar = document.getElementById('slTabBar');
    if (!tabBar) return;
    tabBar.innerHTML = _slTabs.map((t, i) => {
        const active  = i === _slActiveTab;
        const loading = t.loading;
        const count   = t.results.length;
        return `<div class="sl-tab${active ? ' active' : ''}" onclick="_slSetActiveTab(${i})">
            ${escapeHtml(t.partName)}
            ${loading ? '<span style="font-size:10px;color:#aaa;">…</span>' : count ? `<span class="edw-panel-badge">${count}</span>` : ''}
            <span class="sl-tab-close" onclick="event.stopPropagation();_slCloseTab(${i})">×</span>
        </div>`;
    }).join('');
}

function _slSetActiveTab(idx) {
    _slActiveTab = idx;
    const empty   = document.getElementById('slResultsEmpty');
    const tabBar  = document.getElementById('slTabBar');
    const content = document.getElementById('slResultsContent');
    if (empty)  empty.style.display   = 'none';
    if (tabBar) { tabBar.style.display = ''; _slRenderTabs(); }
    if (content) content.style.display = '';
    _slRenderResults();
}

function _slCloseTab(idx) {
    _slTabs.splice(idx, 1);
    if (_slTabs.length === 0) {
        _slActiveTab = -1;
        _slRenderResultsArea();
    } else {
        _slActiveTab = Math.min(_slActiveTab, _slTabs.length - 1);
        _slRenderTabs();
        _slRenderResults();
    }
    _slRefreshSelectorBadges();
}

function _slRenderResults() {
    const content = document.getElementById('slResultsContent');
    if (!content || _slActiveTab < 0 || !_slTabs[_slActiveTab]) return;
    const tab = _slTabs[_slActiveTab];

    if (tab.loading) {
        content.innerHTML = `<div class="sl-loading">Searching…</div>`;
        return;
    }
    if (tab.error) {
        content.innerHTML = `<div class="sl-no-results">Search error — please try again.</div>`;
        return;
    }

    if (tab.isStockSearch) {
        if (!tab.results.length) {
            content.innerHTML = `<div class="sl-no-results">No listings found for stock number <strong>${escapeHtml(tab.stockNo)}</strong></div>`;
            _slRenderActionBar(); return;
        }
        const statusColour = { active: '#22c55e', pending: '#f59e0b', sold: '#888', draft: '#aaa' };
        const stockColHdr = `<div class="sl-results-col-hdr">
            <div class="sl-hdr-cell" style="width:36px;padding:0 8px;"></div>
            <div class="sl-hdr-cell" style="width:52px;padding:0 4px;"></div>
            <div class="sl-hdr-cell flex">Part</div>
            <div class="sl-hdr-cell" style="width:56px;">Gr.</div>
            <div class="sl-hdr-cell" style="width:70px;">Price</div>
            <div class="sl-hdr-cell" style="width:76px;">KMs</div>
            <div class="sl-hdr-cell" style="width:120px;">Bin / Status</div>
        </div>`;
        const stockRows = tab.results.map(r => {
                const img   = (r.listing_images || []).sort((a,b) => a.position-b.position)[0]?.storage_path || '';
                const grade = r.condition || '';
                const gradeClass = grade ? `grade-${grade.charAt(0).toUpperCase()}` : '';
                const bin   = r.warehouse_bin ? `Bin: ${escapeHtml(r.warehouse_bin)}` : '';
                const st    = r.status || '';
                const chk   = _slSelected.has(r.id) ? ' checked' : '';
                return `<div class="sl-row own${_slSelected.has(r.id) ? ' selected' : ''}" onclick="_slOpenResultDetail(${r.id})">
                    <label class="sl-cell sl-cell-check" onclick="event.stopPropagation()"><input type="checkbox"${chk} onchange="_slToggleSelect(${r.id},this.checked)"></label>
                    <div class="sl-cell sl-cell-thumb">${img ? `<img src="${escapeHtml(img)}" alt="">` : `<div class="sl-no-img">📦</div>`}</div>
                    <div class="sl-cell-title"><span class="sl-title-text">${escapeHtml(r.title)}</span></div>
                    <div class="sl-cell sl-cell-grade ${gradeClass}">${escapeHtml(grade)}</div>
                    <div class="sl-cell sl-cell-price">${r.price ? '$'+r.price : '—'}</div>
                    <div class="sl-cell sl-cell-kms">${r.odometer ? Number(r.odometer).toLocaleString('en-AU') : ''}</div>
                    <div class="sl-cell sl-cell-meta">
                        ${bin ? `<span>${bin}</span>` : ''}
                        ${st ? `<span style="color:${statusColour[st]||'#888'};font-weight:700;font-size:10px;text-transform:uppercase;">${escapeHtml(st)}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
        content.innerHTML =
            `<div class="sl-section-hdr own"><span class="sl-section-own-pill">STOCK #${escapeHtml(tab.stockNo)}</span>${tab.results.length} part${tab.results.length!==1?'s':''} listed</div>` +
            `<div class="sl-results-table">${stockColHdr}${stockRows}</div>`;
        _slRenderActionBar(); return;
    }

    const own   = tab.results.filter(r => r.seller_id === currentUserId);
    const allOther = tab.results.filter(r => r.seller_id !== currentUserId);
    const proOther = _slProOnly ? allOther.filter(r => r.profiles?.is_pro) : allOther;
    const otherStates = [...new Set(proOther.map(_slStateOf).filter(Boolean))].sort();
    if (_slStateFilter && !otherStates.includes(_slStateFilter)) _slStateFilter = null;
    const other = _slStateFilter ? proOther.filter(r => _slStateOf(r) === _slStateFilter) : proOther;

    if (!own.length && !allOther.length) {
        content.innerHTML = `<div class="sl-no-results">No results found for <strong>${escapeHtml(tab.partName)}</strong> — ${escapeHtml(_slVehicle.year)} ${escapeHtml(_slVehicle.make)} ${escapeHtml(_slVehicle.model)}</div>`;
        _slRenderActionBar(); return;
    }

    // Both sections share one column template so they line up like a spreadsheet.
    // Stock # / Bin are blank for other yards (private); Yard / Chat blank for own.
    const rowHTML = (r, isOwn) => {
        const img    = (r.listing_images || []).sort((a,b) => a.position-b.position)[0]?.storage_path || '';
        const grade  = r.condition || '';
        const gradeClass = grade ? `grade-${grade.charAt(0).toUpperCase()}` : '';
        const chk    = _slSelected.has(r.id) ? ' checked' : '';
        const chatBtn = !isOwn && r.seller_id
            ? `<button class="sl-chat-row-btn"
                  data-lid="${r.id}" data-sid="${r.seller_id}"
                  data-title="${escapeHtml(r.title)}" data-seller="${escapeHtml(bizDisplayName(r.profiles, 'Wrecker'))}"
                  onclick="event.stopPropagation();_slOpenChatBtn(this)">Chat</button>` : '';
        const matchClass = r._match ? ` sl-row--${r._match}` : '';
        const matchBadge = r._match ? `<span class="sl-match sl-match--${r._match}">${r._match === 'exact' ? 'Exact' : 'Possible'}</span>` : '';
        const quotes = _slQuotedListings.get(r.id) || [];
        const note   = isOwn ? _slPartNotes.get(r.id) : null;
        const quoteChip = quotes.length
            ? `<button class="sl-quote-chip" title="On ${quotes.length} active quote${quotes.length>1?'s':''}" onclick="event.stopPropagation();_slShowQuotesFor(${r.id},this)">📋 ${quotes.length}</button>` : '';
        const noteIcon = note
            ? `<span class="sl-note-icon" title="${escapeHtml(note)}" onclick="event.stopPropagation();_slShowNoteFor(${r.id},this)">📝</span>` : '';
        return `<div class="sl-row${isOwn ? ' own' : ''}${matchClass}${_slSelected.has(r.id) ? ' selected' : ''}" onclick="_slOpenResultDetail(${r.id})">
            <label class="sl-cell sl-cell-check" onclick="event.stopPropagation()"><input type="checkbox"${chk} onchange="_slToggleSelect(${r.id},this.checked)"></label>
            <div class="sl-cell sl-cell-thumb">${img ? `<img src="${escapeHtml(img)}" alt="">` : `<div class="sl-no-img">📦</div>`}</div>
            <div class="sl-cell-title">${matchBadge}<span class="sl-title-text">${escapeHtml(r.title)}</span>${noteIcon}${quoteChip}</div>
            <div class="sl-cell sl-cell-stock">${isOwn ? escapeHtml(r.stock_number || '') : ''}</div>
            <div class="sl-cell sl-cell-kms">${r.odometer ? Number(r.odometer).toLocaleString('en-AU') : ''}</div>
            <div class="sl-cell sl-cell-grade ${gradeClass}">${escapeHtml(grade)}</div>
            <div class="sl-cell sl-cell-bin">${isOwn ? escapeHtml(r.warehouse_bin || '') : escapeHtml(_slStateOf(r))}</div>
            <div class="sl-cell sl-cell-price">${r.price ? '$'+r.price : '—'}</div>
            <div class="sl-cell sl-cell-yard">${isOwn ? '' : escapeHtml(bizDisplayName(r.profiles, 'Wrecker'))}</div>
            <div class="sl-cell sl-cell-chat">${chatBtn}</div>
        </div>`;
    };

    const proToggle = `<button class="sl-pro-filter-btn${_slProOnly ? ' active' : ''}" onclick="_slToggleProOnly()">${_slProOnly ? '★ Pro only' : '☆ Pro only'}</button>`;
    const stateFilter = otherStates.length
        ? `<select class="sl-state-filter" onchange="_slSetStateFilter(this.value)">
            <option value="">All States</option>
            ${otherStates.map(s => `<option value="${s}"${_slStateFilter === s ? ' selected' : ''}>${s}</option>`).join('')}
        </select>`
        : '';
    const otherFiltered = _slProOnly || _slStateFilter;
    const otherHdr = allOther.length
        ? `<div class="sl-section-hdr">OTHER YARDS — ${other.length}${otherFiltered && other.length < allOther.length ? ` of ${allOther.length}` : ''} result${other.length!==1?'s':''}${stateFilter}${proToggle}</div>`
        : '';
    const otherBody = other.length
        ? `<div class="sl-results-table">${_slResultsHdr(false)}${_slSortRows(other).map(r=>rowHTML(r,false)).join('')}</div>`
        : (allOther.length ? `<div class="sl-no-results" style="padding:10px 15px;font-size:12px;">No other-yard results match this filter</div>` : '');

    content.innerHTML =
        (own.length ? `<div class="sl-section-hdr own"><span class="sl-section-own-pill">YOUR STOCK</span>${own.length} result${own.length!==1?'s':''}</div><div class="sl-results-table">${_slResultsHdr(true)}${_slSortRows(own).map(r=>rowHTML(r,true)).join('')}</div>` : '') +
        otherHdr + otherBody;
    _slRenderActionBar();
}

function _slToggleProOnly() {
    _slProOnly = !_slProOnly;
    _slRenderResults();
}

// Shared spreadsheet header — clickable columns drive _slSort. Same template for
// both YOUR STOCK and OTHER YARDS so every column lines up vertically. The Bin slot
// is relabelled "State" for other yards (their rack/bin is private; State is public).
function _slResultsHdr(isOwn) {
    const arrow = k => _slSort.key === k ? (_slSort.dir > 0 ? ' ▲' : ' ▼') : '';
    const cell  = (k, label, w) => `<div class="sl-hdr-cell sl-hdr-sort${_slSort.key === k ? ' active' : ''}" style="width:${w}px;" onclick="_slSortBy('${k}')">${label}${arrow(k)}</div>`;
    // The 3 spacer cells (checkbox, thumb, action) mirror the row cells' tighter
    // padding so every column header lines up exactly with the data below it.
    return `<div class="sl-results-col-hdr">
        <div class="sl-hdr-cell" style="width:36px;padding:0 8px;"></div>
        <div class="sl-hdr-cell" style="width:52px;padding:0 4px;"></div>
        <div class="sl-hdr-cell flex sl-hdr-sort${_slSort.key === 'title' ? ' active' : ''}" onclick="_slSortBy('title')">Part${arrow('title')}</div>
        ${cell('stock', 'Stock #', 88)}
        ${cell('kms',   'KMs',     76)}
        ${cell('grade', 'Cond',    56)}
        ${cell('bin',   isOwn ? 'Bin' : 'State', 76)}
        ${cell('price', 'Price',   70)}
        ${cell('yard',  'Yard',   130)}
        <div class="sl-hdr-cell" style="width:72px;padding:0 8px;"></div>
    </div>`;
}

// State for a listing — derived from its postcode (AU_POSTCODES), with a text
// fallback. Used for the other-yards State column and the state filter.
function _slStateOf(r) {
    const pc = r && r.postcode != null ? String(r.postcode) : '';
    if (pc && typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[pc]) {
        return AU_POSTCODES[pc][0]?.[1] || '';
    }
    const m = (r?.location || '').match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/i);
    return m ? m[1].toUpperCase() : '';
}

function _slSetStateFilter(v) {
    _slStateFilter = v || null;
    _slRenderResults();
}

function _slSortRows(rows) {
    if (!_slSort.key) return rows;
    const { key, dir } = _slSort;
    const get = r => {
        switch (key) {
            case 'kms':   return r.odometer != null ? Number(r.odometer) : null;
            case 'price': return r.price != null ? Number(r.price) : null;
            case 'stock': return (r.stock_number || '').toLowerCase();
            case 'bin':   return (r.warehouse_bin || _slStateOf(r) || '').toLowerCase();
            case 'grade': return (r.condition || '').toLowerCase();
            case 'yard':  return bizDisplayName(r.profiles, '').toLowerCase();
            case 'title': return (r.title || '').toLowerCase();
            default:      return null;
        }
    };
    return [...rows].sort((a, b) => {
        const va = get(a), vb = get(b);
        const ea = va === null || va === '', eb = vb === null || vb === '';
        if (ea && eb) return 0;
        if (ea) return 1;   // blanks always sort to the bottom
        if (eb) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
    });
}

function _slSortBy(key) {
    if (_slSort.key === key) _slSort.dir = -_slSort.dir;
    else _slSort = { key, dir: 1 };
    _slRenderResults();
}

async function _slOpenResultDetail(id) {
    if (!sb) return;
    // Own listings are already in userListings — just open directly
    const existing = findPartAnywhere(id);
    if (existing) { openItemDetail(id); return; }

    // Fetch full listing from Supabase and push into partDatabase so openItemDetail can find it
    const { data: rows, error } = await sb
        .from('listings')
        .select('*, listing_images(storage_path, position), listing_vehicles(make, model, series)')
        .eq('id', id)
        .limit(1);
    if (error || !rows?.length) { showToast('Could not load listing'); return; }
    const r = rows[0];

    let sellerName = 'Seller';
    if (r.seller_id) {
        const { data: prof } = await sb.from('public_profiles').select('display_name, avatar_url').eq('id', r.seller_id).single();
        if (prof?.display_name) sellerName = prof.display_name;
        if (prof?.avatar_url) _sellerPicCache[r.seller_id] = prof.avatar_url;
    }

    const images = (r.listing_images || [])
        .sort((a, b) => a.position - b.position)
        .map(img => img.storage_path).filter(Boolean);
    const fits = (r.listing_vehicles || []).map(v => ({
        make: v.make, model: v.model, ...(v.series ? { variant: v.series } : {}),
    }));

    partDatabase.push({
        id: nextPartId(), supabaseId: r.id, sellerId: r.seller_id,
        saves: r.saves_count || 0,
        date: new Date(r.created_at).getTime(),
        apcId: r.apc_id, title: r.title, category: r.category,
        price: r.price, condition: r.condition,
        description: r.description, loc: r.location,
        postcode: r.postcode, pickup: r.pickup, postage: r.postage,
        openToOffers: r.open_to_offers, isPro: r.is_pro,
        stockNumber: r.stock_number, odometer: r.odometer, chassisVin: r.chassis_vin || null,
        warehouseBin: r.warehouse_bin, quantity: r.quantity || 1,
        fit: r.fitting_available, year: r.fits_year,
        variant: r.variant || null, seller: sellerName,
        status: r.status === 'active' ? undefined : r.status,
        images, fits,
    });

    openItemDetail(id);
}

// ── Quote selection / action bar ──────────────────────────────────────────

function _slToggleSelect(id, checked) {
    if (checked) {
        const r = _slResultsMap.get(id);
        if (r) _slSelected.set(id, { title: r.title, price: r.price, stock_number: r.stock_number, chassis_vin: r.chassis_vin || null });
    } else {
        _slSelected.delete(id);
    }
    _slRenderActionBar();
}

function _slClearSelection() {
    _slSelected.clear();
    _slRenderActionBar();
    _slRenderResults();
}

function _slRenderActionBar() {
    const bar = document.getElementById('slActionBar');
    if (!bar) return;
    if (_slSelected.size === 0 || _slTabs.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = '';
    const n = _slSelected.size;
    bar.innerHTML = `
        <span class="sl-action-count">${n} part${n !== 1 ? 's' : ''} selected</span>
        <button class="sl-action-btn sl-action-btn-ghost" onclick="_slClearSelection()">Clear</button>
        <button class="sl-action-btn sl-action-btn-primary" onclick="_slOpenAddToQuote()">Add to Quote →</button>`;
}

// ── Quote loading / panel rendering ──────────────────────────────────────

// ── Result-row markers: quote membership + EDW notes ─────────────────────────
// Loads which listings sit on the user's active (draft/sent) quotes, and which of
// their own parts carry an EDW note. Re-renders results so the markers appear.
// Builds _slQuotedListings: listingId -> the active (draft/sent) quotes it sits on.
// Shared by Stock Lookup result rows and the My Listings table badge.
async function _loadQuotedListingsMap() {
    _slQuotedListings = new Map();
    if (!sb || !currentUserId) return;
    const { data: quotes } = await sb.from('quotes')
        .select('id, quote_number, customer_name, status')
        .eq('user_id', currentUserId).in('status', ['draft', 'sent']);
    if (!quotes || !quotes.length) return;
    const qById = new Map(quotes.map(q => [q.id, q]));
    const { data: lines } = await sb.from('quote_lines')
        .select('listing_id, quote_id').in('quote_id', quotes.map(q => q.id));
    (lines || []).forEach(l => {
        const q = qById.get(l.quote_id);
        if (!q || l.listing_id == null) return;
        const key = Number(l.listing_id);
        const arr = _slQuotedListings.get(key) || [];
        arr.push({ id: q.id, quote_number: q.quote_number, customer_name: q.customer_name, status: q.status });
        _slQuotedListings.set(key, arr);
    });
}

async function _slLoadMarkers() {
    if (!sb || !currentUserId) return;
    await _loadQuotedListingsMap();
    _slPartNotes = new Map();
    const { data: notes } = await sb.from('dismantling_items').select('listing_id, notes')
        .eq('user_id', currentUserId).not('listing_id', 'is', null).neq('notes', '');
    (notes || []).forEach(n => {
        if (n.listing_id != null && n.notes && n.notes.trim()) _slPartNotes.set(Number(n.listing_id), n.notes.trim());
    });
    if (_slActiveTab >= 0) _slRenderResults();
}

function _slMarkerPopover(anchorEl, html) {
    document.getElementById('slMarkerPop')?.remove();
    const pop = document.createElement('div');
    pop.id = 'slMarkerPop';
    pop.className = 'sl-marker-pop';
    pop.innerHTML = html;
    document.body.appendChild(pop);
    const rect = anchorEl.getBoundingClientRect();
    pop.style.top  = `${rect.bottom + 6}px`;
    pop.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 12))}px`;
    setTimeout(() => {
        const close = e => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', close); } };
        document.addEventListener('mousedown', close);
    }, 0);
}

function _slShowQuotesFor(id, el) {
    const quotes = _slQuotedListings.get(Number(id)) || [];
    if (!quotes.length) return;
    const rows = quotes.map(q =>
        `<div class="sl-mp-row" onclick="_slGotoQuoteDetail(${q.id})">
            <span class="sl-mp-qnum">${escapeHtml(q.quote_number)}</span>
            <span class="sl-mp-cust${q.customer_name ? '' : ' sl-mp-cust--none'}">${escapeHtml(q.customer_name || 'No name yet')}</span>
            <span class="sl-mp-status sl-mp-status--${q.status}">${escapeHtml(q.status)}</span>
        </div>`).join('');
    _slMarkerPopover(el, `<div class="sl-mp-title">On ${quotes.length} active quote${quotes.length>1?'s':''}</div>${rows}`);
}

function _slShowNoteFor(id, el) {
    const note = _slPartNotes.get(Number(id));
    if (!note) return;
    _slMarkerPopover(el, `<div class="sl-mp-title">Part note</div><div class="sl-mp-note">${escapeHtml(note)}</div>`);
}

// Open a quote from anywhere — switches to the Stock Lookup view first if needed
// (the quotes panel lives there), so the My Listings badge can jump to it too.
function _slGotoQuoteDetail(id) {
    document.getElementById('slMarkerPop')?.remove();
    const slView = document.getElementById('proStockView');
    if (slView && slView.style.display === 'none') proShowView('proStockView', 'proNavStock');
    _slOpenQuoteDetail(id);
}

// Quote-interest chip for the My Listings table — same data/popover as Stock Lookup.
function _dashQuoteChip(p) {
    const ql = _slQuotedListings.get(Number(p.supabaseId || p.id)) || [];
    return ql.length
        ? `<span class="dash-quote-chip" title="On ${ql.length} active quote${ql.length>1?'s':''}" onclick="event.stopPropagation();_slShowQuotesFor(${p.supabaseId || p.id},this)">📋 ${ql.length}</span>`
        : '';
}

async function _slLoadTodaysQuotes() {
    if (!currentUserId || !sb) return;
    const { data } = await sb.from('quotes')
        .select('id, quote_number, status, customer_name, freight_cost, created_at, invoice_number, invoiced_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);
    _slQuotes = data || [];
    _slRenderQuotesList();
}

function _slRenderQuotesList() {
    const list = document.getElementById('slQuotesList');
    if (!list) return;
    if (!_slQuotes.length) {
        list.innerHTML = '<div class="sl-quotes-empty">No quotes yet</div>';
        return;
    }
    const statusLabel = { draft: 'Draft', sent: 'Sent', approved: 'Approved', invoiced: 'Invoiced' };
    list.innerHTML = _slQuotes.map(q => {
        const isActive = _slActiveQuote?.quote?.id === q.id;
        const date = new Date(q.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
        const st = q.status || 'draft';
        return `<div class="sl-quote-card${isActive ? ' active' : ''}" onclick="_slOpenQuoteDetail(${q.id})">
            <div>
                <span class="sl-quote-num">${escapeHtml(q.quote_number)}</span>
                <span class="sl-quote-badge ${st}">${statusLabel[st] || st}</span>
            </div>
            ${q.customer_name ? `<div class="sl-quote-meta">${escapeHtml(q.customer_name)}</div>` : ''}
            <div class="sl-quote-meta">${date}</div>
        </div>`;
    }).join('');
}

// ── Quote creation ────────────────────────────────────────────────────────

async function _slGenerateQuoteNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `Q-${today}-`;
    const { data } = await sb.from('quotes')
        .select('quote_number')
        .eq('user_id', currentUserId)
        .ilike('quote_number', `${prefix}%`)
        .order('quote_number', { ascending: false })
        .limit(1);
    const seq = data?.[0]?.quote_number ? parseInt(data[0].quote_number.slice(-3)) + 1 : 1;
    return `${prefix}${String(seq).padStart(3, '0')}`;
}

async function _slNewQuote() {
    if (!currentUserId || !sb) return;
    const qn = await _slGenerateQuoteNumber();
    const { data, error } = await sb.from('quotes').insert({
        quote_number: qn, user_id: currentUserId, status: 'draft', freight_cost: 0,
    }).select().single();
    if (error || !data) { showToast('Could not create quote'); return; }
    _slQuotes.unshift(data);
    _slRenderQuotesList();
    _slOpenQuoteDetail(data.id);
}

// ── Add-to-quote modal ────────────────────────────────────────────────────

async function _slOpenAddToQuote() {
    if (!_slSelected.size) return;
    const partsHtml = [..._slSelected.entries()].map(([, d]) =>
        `<div class="sl-qm-parts-row">
            <span class="sl-qm-parts-title">${escapeHtml(d.title)}</span>
            ${d.stock_number ? `<span class="sl-qm-parts-stock">${escapeHtml(d.stock_number)}</span>` : ''}
            <span class="sl-qm-parts-price">${d.price != null ? '$'+Number(d.price).toFixed(2) : '—'}</span>
        </div>`).join('');

    const drafts = _slQuotes.filter(q => q.status === 'draft' || q.status === 'sent');
    const existingHtml = drafts.length ? `
        <div class="sl-qm-subtitle" style="margin-bottom:6px;">Add to existing quote</div>
        <input class="sl-qm-input" placeholder="🔍 Search by name or quote #" autocomplete="off" style="margin-bottom:6px;"
            oninput="_slFilterExistingQuotes(this.value)">
        <div id="slQmExistingList">
        ${drafts.map(q => `<div class="sl-qm-quote-row" onclick="_slAddToExistingQuote(${q.id})"
            data-search="${escapeHtml((q.quote_number + ' ' + (q.customer_name || '')).toLowerCase())}">
            <span class="sl-qm-qnum">${escapeHtml(q.quote_number)}</span>
            ${q.customer_name ? `<span class="sl-qm-qmeta">${escapeHtml(q.customer_name)}</span>` : ''}
        </div>`).join('')}
        </div>
        <div style="margin:12px 0 8px;border-top:1px solid #eee;padding-top:12px;">
            <div class="sl-qm-subtitle">Create new quote</div>
        </div>` : '';

    const overlay = document.createElement('div');
    overlay.className = 'sl-quote-modal-overlay';
    overlay.id = 'slQuoteModalOverlay';
    overlay.onclick = e => { if (e.target === overlay) _slCloseQuoteModal(); };
    overlay.innerHTML = `
        <div class="sl-quote-modal">
            <div class="sl-qm-header">
                <span class="sl-qm-title" id="slQmTitle">New Quote</span>
                <button class="sl-qm-close" onclick="_slCloseQuoteModal()">✕</button>
            </div>
            <div class="sl-qm-body">
                ${existingHtml}
                <div class="sl-qm-section">
                    <div class="sl-qm-label">Customer / Crash Shop</div>
                    <input id="slQmName"  class="sl-qm-input" placeholder="Name" autocomplete="off">
                    <input id="slQmPhone" class="sl-qm-input" placeholder="Phone" type="tel">
                    <input id="slQmEmail" class="sl-qm-input" placeholder="Email (optional)" type="email">
                </div>
                <div class="sl-qm-section">
                    <div class="sl-qm-label">Parts (${_slSelected.size})</div>
                    <div class="sl-qm-parts-list">${partsHtml}</div>
                </div>
                <div class="sl-qm-section sl-qm-inline-fields">
                    <div>
                        <div class="sl-qm-label">Freight</div>
                        <input id="slQmFreight" class="sl-qm-input" type="number" min="0" step="0.01" placeholder="0.00">
                    </div>
                </div>
                <div class="sl-qm-section">
                    <div class="sl-qm-label">Notes</div>
                    <textarea id="slQmNotes" class="sl-qm-input" style="height:52px;resize:none;" placeholder="Internal notes…"></textarea>
                </div>
                <button class="sl-qm-create-btn" onclick="_slSaveNewQuote()">Save Quote</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    // Generate the quote number now (not at save) and show it at the top, so the
    // wrecker can read it to the caller while filling in freight/details. It's only
    // consumed on Save — cancelling leaves it free for the next quote (no gaps).
    _slPendingQuoteNumber = null;
    const titleEl = document.getElementById('slQmTitle');
    if (titleEl) titleEl.innerHTML = '<span class="sl-qm-eyebrow">New Quote</span><span class="sl-qm-qnum-big">…</span>';
    const qn = await _slGenerateQuoteNumber().catch(() => null);
    if (!document.getElementById('slQuoteModalOverlay')) return; // closed while generating
    _slPendingQuoteNumber = qn;
    const t = document.getElementById('slQmTitle');
    if (t) t.innerHTML = qn
        ? `<span class="sl-qm-eyebrow">New Quote</span><span class="sl-qm-qnum-big">${escapeHtml(qn)}</span>`
        : 'New Quote';
}

function _slCloseQuoteModal() {
    _slPendingQuoteNumber = null;
    const overlay = document.getElementById('slQuoteModalOverlay');
    if (overlay) overlay.remove();
}

function _slFilterExistingQuotes(term) {
    const t = term.toLowerCase();
    document.querySelectorAll('#slQmExistingList .sl-qm-quote-row').forEach(r => {
        r.style.display = !t || (r.dataset.search || '').includes(t) ? '' : 'none';
    });
}

async function _slAddToExistingQuote(quoteId) {
    _slCloseQuoteModal();
    if (!sb || !_slSelected.size) return;
    const lines = [..._slSelected.entries()].map(([listing_id, d]) => ({
        quote_id: quoteId, listing_id, title: d.title,
        stock_number: d.stock_number || null, price: d.price || null, qty: 1,
        vin: d.chassis_vin || null,
    }));
    const { error } = await sb.from('quote_lines').insert(lines);
    if (error) { showToast('Could not add parts to quote'); return; }
    showToast(`${lines.length} part${lines.length !== 1 ? 's' : ''} added`);
    _slClearSelection();
    _slLoadMarkers();
    _slOpenQuoteDetail(quoteId);
}

async function _slSaveNewQuote() {
    if (!currentUserId || !sb || !_slSelected.size) return;
    const name    = document.getElementById('slQmName')?.value.trim() || null;
    const phone   = document.getElementById('slQmPhone')?.value.trim() || null;
    const email   = document.getElementById('slQmEmail')?.value.trim() || null;
    const freight = parseFloat(document.getElementById('slQmFreight')?.value) || 0;
    const notes   = document.getElementById('slQmNotes')?.value.trim() || null;

    const qn = _slPendingQuoteNumber || await _slGenerateQuoteNumber();
    const { data: quote, error } = await sb.from('quotes').insert({
        quote_number: qn, user_id: currentUserId, status: 'draft',
        customer_name: name, customer_phone: phone, customer_email: email,
        freight_cost: freight, notes,
    }).select().single();
    if (error || !quote) { showToast('Could not create quote'); return; }

    const lines = [..._slSelected.entries()].map(([listing_id, d]) => ({
        quote_id: quote.id, listing_id, title: d.title,
        stock_number: d.stock_number || null, price: d.price || null, qty: 1,
        vin: d.chassis_vin || null,
    }));
    await sb.from('quote_lines').insert(lines);

    _slQuotes.unshift(quote);
    _slClearSelection();
    _slCloseQuoteModal();
    _slRenderQuotesList();
    _slLoadMarkers();
    showToast(`Quote ${qn} saved`);
}

// ── Quote detail panel ────────────────────────────────────────────────────

async function _slOpenQuoteDetail(quoteId) {
    if (!sb) return;
    const [{ data: quote }, { data: lines }] = await Promise.all([
        sb.from('quotes').select('*').eq('id', quoteId).single(),
        sb.from('quote_lines').select('*').eq('quote_id', quoteId).order('created_at', { ascending: true }),
    ]);
    if (!quote) return;
    _slActiveQuote = { quote, lines: lines || [] };
    _slRenderQuoteDetail();
    _slRenderQuotesList();
}

function _slRenderQuoteDetail() {
    if (!_slActiveQuote) return;
    const existing = document.getElementById('slQuoteDetailOverlay');
    if (existing) existing.remove();

    const { quote, lines } = _slActiveQuote;
    const subtotal = lines.reduce((s, l) => s + ((l.price || 0) * (l.qty || 1)), 0);
    const freight  = parseFloat(quote.freight_cost) || 0;
    const total    = subtotal + freight;
    const statusLabel = { draft: 'Draft', sent: 'Sent', approved: 'Approved', invoiced: 'Invoiced' };
    const st = quote.status || 'draft';
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const dateLabel = quote.invoice_number
        ? `Invoiced ${fmtD(quote.invoiced_at || quote.created_at)}`
        : `Created ${fmtD(quote.created_at)}`;

    const overlay = document.createElement('div');
    overlay.className = 'sl-quote-modal-overlay';
    overlay.id = 'slQuoteDetailOverlay';
    overlay.onclick = e => { if (e.target === overlay) _slCloseQuoteDetail(); };

    overlay.innerHTML = `
        <div class="sl-quote-modal" style="width:460px;">
            <div class="sl-qm-header">
                <div style="display:flex;flex-direction:column;gap:2px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="sl-qm-title">${escapeHtml(quote.quote_number)}</span>
                        ${st !== 'draft' ? `<span class="sl-quote-badge ${st}">${statusLabel[st] || st}</span>` : ''}
                    </div>
                    <span style="font-size:11px;color:#999;font-weight:600;">${dateLabel}</span>
                </div>
                <button class="sl-qm-close" onclick="_slCloseQuoteDetail()">✕</button>
            </div>
            <div class="sl-qm-body">
                <div class="sl-qm-section">
                    <div class="sl-qm-label">Customer / Crash Shop</div>
                    <input class="sl-qm-input" placeholder="Name"
                        value="${escapeHtml(quote.customer_name || '')}"
                        onblur="_slSaveQuoteField(${quote.id},'customer_name',this.value)">
                    <input class="sl-qm-input" placeholder="Phone"
                        value="${escapeHtml(quote.customer_phone || '')}"
                        onblur="_slSaveQuoteField(${quote.id},'customer_phone',this.value)">
                    <input class="sl-qm-input" placeholder="Email"
                        value="${escapeHtml(quote.customer_email || '')}"
                        onblur="_slSaveQuoteField(${quote.id},'customer_email',this.value)">
                </div>
                <div class="sl-qm-section">
                    <div class="sl-qm-label">Parts (${lines.length})</div>
                    <div class="sl-qm-parts-list">
                        ${lines.length ? lines.map(l => {
                            const lineBin = userListings.find(u => (u.supabaseId || u.id) == l.listing_id)?.warehouseBin
                                || _slResultsMap.get(l.listing_id)?.warehouse_bin || '';
                            return `
                            <div class="sl-qd-line">
                                <span class="sl-qd-line-title" title="${escapeHtml(l.title)}">${escapeHtml(l.title)}</span>
                                ${l.stock_number ? `<span class="sl-qd-line-meta">${escapeHtml(l.stock_number)}</span>` : ''}
                                ${l.vin ? `<span class="sl-qd-line-meta" title="Donor VIN">VIN ${escapeHtml(l.vin)}</span>` : ''}
                                ${lineBin ? `<span class="sl-qd-line-bin">📍 ${escapeHtml(lineBin)}</span>` : ''}
                                <input class="sl-qd-line-price-input" type="number" min="0" step="0.01"
                                    value="${l.price != null ? l.price : ''}" placeholder="—"
                                    onblur="_slSaveLinePrice(${l.id},${quote.id},this.value)">
                                <button class="sl-qd-line-del" onclick="_slDeleteQuoteLine(${l.id},${quote.id})" title="Remove">×</button>
                            </div>`;
                        }).join('') :
                            '<div style="color:#bbb;font-size:12px;padding:8px 0;">No parts on this quote</div>'}
                    </div>
                </div>
                <div class="sl-qm-section sl-qm-inline-fields">
                    <div>
                        <div class="sl-qm-label">Freight</div>
                        <input class="sl-qm-input" type="number" min="0" step="0.01" placeholder="0.00"
                            value="${freight > 0 ? freight : ''}"
                            onblur="_slSaveQuoteField(${quote.id},'freight_cost',this.value)">
                    </div>
                    <div>
                        <div class="sl-qm-label">Total</div>
                        <div class="sl-qd-total-amount" style="font-size:16px;font-weight:800;color:#f07020;padding-top:6px;">$${total.toFixed(2)}</div>
                    </div>
                </div>
                <div class="sl-qm-section">
                    <div class="sl-qm-label">Notes</div>
                    <textarea class="sl-qm-input" style="height:52px;resize:none;" placeholder="Internal notes…"
                        onblur="_slSaveQuoteField(${quote.id},'notes',this.value)">${escapeHtml(quote.notes || '')}</textarea>
                </div>
            </div>
            <div class="sl-qd-actions">
                ${_slQuoteConvContext ? `
                <div class="sl-qd-actions-row" style="margin-bottom:4px;">
                    <button class="sl-qd-btn sl-qd-btn-primary" style="flex:1;font-size:13px;padding:11px;" onclick="_slSendQuoteToConv()">Send Quote to Conversation ✉️</button>
                </div>` : ''}
                <div class="sl-qd-actions-row sl-qd-actions-row-primary">
                    <button class="sl-qd-btn sl-qd-btn-save" onclick="_slSaveQuoteChanges(${quote.id})">Save</button>
                    <button class="sl-qd-btn sl-qd-btn-ghost" onclick="_slEmailQuote(${quote.id})">Email</button>
                    <button class="sl-qd-btn sl-qd-btn-danger" onclick="_slDeleteQuote(${quote.id})" title="Delete quote">🗑</button>
                </div>
                <div class="sl-qd-actions-row" style="margin-bottom:4px;">
                    ${quote.invoice_number
                        ? `<span style="flex:1;font-size:12px;font-weight:800;color:#6d28d9;display:flex;align-items:center;gap:5px;">🧾 ${escapeHtml(quote.invoice_number)}</span>`
                        : `<button class="sl-qd-btn sl-qd-btn-primary" style="flex:1;" onclick="_slConvertToInvoice(${quote.id})">🧾 Convert to Invoice</button>`}
                    <button class="sl-qd-btn sl-qd-btn-ghost" onclick="_slPrintQuoteA4()">${quote.invoice_number ? 'Print Invoice' : 'Print Quote'}</button>
                </div>
                <div class="sl-qd-actions-row">
                    ${st === 'draft'    ? `<button class="sl-qd-btn sl-qd-btn-primary" onclick="_slAdvanceQuoteStatus(${quote.id},'sent')">Process Invoice</button>` : ''}
                    ${st === 'sent'     ? `<button class="sl-qd-btn sl-qd-btn-primary" onclick="_slAdvanceQuoteStatus(${quote.id},'approved')">Mark Approved</button>` : ''}
                    ${st === 'approved' ? `<button class="sl-qd-btn sl-qd-btn-primary" onclick="_slAdvanceQuoteStatus(${quote.id},'invoiced')">Process Sale</button>` : ''}
                    ${st === 'invoiced' ? `<span style="font-size:11px;color:#22c55e;font-weight:700;padding:0 4px;">✓ Sold</span>` : ''}
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function _slCloseQuoteDetail() {
    _slActiveQuote = null;
    _slQuoteConvContext = null;
    const overlay = document.getElementById('slQuoteDetailOverlay');
    if (overlay) overlay.remove();
}

// A4 quote document — business header + customer + line items + GST-inclusive totals.
// Same print-tab approach as the labels/report; the browser's Save-as-PDF gives a
// professional quote the wrecker can hand to a customer. Prices are GST-inclusive
// (GST = total / 11), matching how AU trade prices are quoted.
function _slPrintQuoteA4() {
    if (!_slActiveQuote) { showToast('Open a quote first'); return; }
    const { quote, lines } = _slActiveQuote;

    const subtotal = lines.reduce((s, l) => s + ((l.price || 0) * (l.qty || 1)), 0);
    const freight  = parseFloat(quote.freight_cost) || 0;
    const total    = subtotal + freight;
    const gst      = total / 11;

    const biz   = (userSettings.businessName || currentUserName || 'My Business').trim();
    const abn   = (userSettings.abn || '').trim();
    const loc   = (userSettings.location || '').trim();
    const email = currentUserEmail || '';
    const phone = (workshopProfile.phone || '').trim();
    const pay   = (workshopProfile.paymentDetails || '').trim();
    const logo  = userSettings.businessLogo || userSettings.profilePic || '';

    const isInvoice = !!quote.invoice_number;
    const docTitle  = isInvoice ? 'TAX INVOICE' : 'QUOTE';
    const docNumber = isInvoice ? quote.invoice_number : quote.quote_number;
    const issued    = (isInvoice && quote.invoiced_at) ? new Date(quote.invoiced_at)
                    : (quote.created_at ? new Date(quote.created_at) : new Date());
    const validUntil = new Date(issued.getTime() + 14 * 24 * 60 * 60 * 1000);
    const fmt = d => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

    const rows = lines.map((l, i) => {
        const lineTotal = (l.price || 0) * (l.qty || 1);
        return `<tr>
            <td class="c">${i + 1}</td>
            <td>${escapeHtml(l.title || '')}${l.stock_number ? `<span class="sku">Stock #${escapeHtml(l.stock_number)}</span>` : ''}${l.vin ? `<span class="sku">Donor VIN: ${escapeHtml(l.vin)}</span>` : ''}</td>
            <td class="c">${l.qty || 1}</td>
            <td class="r">${l.price != null ? '$' + Number(l.price).toFixed(2) : '—'}</td>
            <td class="r">${l.price != null ? '$' + lineTotal.toFixed(2) : '—'}</td>
        </tr>`;
    }).join('');

    const custLines = [quote.customer_name, quote.customer_phone, quote.customer_email]
        .filter(Boolean).map(x => `<div>${escapeHtml(x)}</div>`).join('') || '<div class="muted">—</div>';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quote ${escapeHtml(quote.quote_number)} — ${escapeHtml(biz)}</title>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #222; margin: 0; font-size: 13px; }
.page { max-width: 800px; margin: 0 auto; padding: 32px 36px; }
.top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f07020; padding-bottom: 18px; }
.biz-block { display: flex; gap: 14px; align-items: flex-start; }
.logo { max-height: 64px; max-width: 150px; object-fit: contain; }
.biz-name { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
.biz-meta { font-size: 11px; color: #666; line-height: 1.6; margin-top: 3px; }
.doc-block { text-align: right; }
.doc-title { font-size: 30px; font-weight: 800; color: #f07020; letter-spacing: 0.02em; line-height: 1; }
.doc-meta { font-size: 12px; color: #555; margin-top: 10px; line-height: 1.7; }
.doc-meta b { color: #222; }
.parties { margin: 22px 0 18px; }
.party-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #999; margin-bottom: 5px; }
.party div { font-size: 13px; color: #333; line-height: 1.6; }
.muted { color: #aaa; }
table { width: 100%; border-collapse: collapse; margin-top: 4px; }
thead th { background: #1a1a2e; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 9px 10px; }
thead th.c { text-align: center; } thead th.r { text-align: right; }
tbody td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
tbody td.c { text-align: center; } tbody td.r { text-align: right; white-space: nowrap; }
.sku { display: block; font-size: 10px; color: #999; margin-top: 2px; }
.totals { margin-top: 16px; margin-left: auto; width: 280px; }
.totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #555; }
.totals .grand { border-top: 2px solid #1a1a2e; margin-top: 4px; padding-top: 10px; font-size: 18px; font-weight: 800; color: #222; }
.totals .gst { font-size: 11px; color: #888; padding-top: 2px; }
.terms { margin-top: 30px; border-top: 1px solid #eee; padding-top: 14px; font-size: 11px; color: #777; line-height: 1.7; }
.terms b { color: #444; }
.foot { margin-top: 22px; text-align: center; font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 0.06em; }
@page { margin: 0; }
@media print { .page { padding: 14mm; max-width: none; } }
</style></head><body>
<div class="page">
  <div class="top">
    <div class="biz-block">
      ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="">` : ''}
      <div>
        <div class="biz-name">${escapeHtml(biz)}</div>
        <div class="biz-meta">${abn ? `ABN ${escapeHtml(abn)}<br>` : ''}${loc ? `${escapeHtml(loc)}<br>` : ''}${phone ? `${escapeHtml(phone)}<br>` : ''}${email ? escapeHtml(email) : ''}</div>
      </div>
    </div>
    <div class="doc-block">
      <div class="doc-title">${docTitle}</div>
      <div class="doc-meta">
        <div><b>${escapeHtml(docNumber)}</b></div>
        <div>Issued ${fmt(issued)}</div>
        ${isInvoice ? `<div>Ref quote ${escapeHtml(quote.quote_number)}</div>` : `<div>Valid until ${fmt(validUntil)}</div>`}
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party-label">Prepared for</div>
    <div class="party">${custLines}</div>
  </div>

  <table>
    <thead><tr>
      <th class="c" style="width:34px;">#</th>
      <th>Description</th>
      <th class="c" style="width:46px;">Qty</th>
      <th class="r" style="width:92px;">Unit Price</th>
      <th class="r" style="width:92px;">Amount</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="muted" style="padding:18px;text-align:center;">No parts on this quote</td></tr>`}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    ${freight > 0 ? `<div class="row"><span>Freight</span><span>$${freight.toFixed(2)}</span></div>` : ''}
    <div class="row grand"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    <div class="row gst"><span>Includes GST (10%)</span><span>$${gst.toFixed(2)}</span></div>
  </div>

  ${isInvoice
    ? `<div class="terms"><b>Payment</b><br>${pay ? escapeHtml(pay).replace(/\n/g, '<br>') : 'Payment due within 7 days. Please quote your invoice number on payment.'}<br><span style="color:#999;">Prices are in AUD and include GST.</span></div>`
    : `<div class="terms"><b>This quote is valid until ${fmt(validUntil)}.</b> Prices are in AUD and include GST. Parts are subject to prior sale.</div>`}
  <div class="foot">Powered by Auto Parts Connection · autopartsconnection.com.au</div>
</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body></html>`;

    const tab = window.open('', '_blank');
    if (tab) { tab.document.open(); tab.document.write(html); tab.document.close(); }
    else showToast('Allow pop-ups to print the quote');
}

async function _slGenerateInvoiceNumber() {
    const today  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${today}-`;
    const { data } = await sb.from('quotes')
        .select('invoice_number')
        .eq('user_id', currentUserId)
        .ilike('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);
    const seq = data?.[0]?.invoice_number ? parseInt(data[0].invoice_number.slice(-3)) + 1 : 1;
    return `${prefix}${String(seq).padStart(3, '0')}`;
}

// One-click quote → tax invoice: locks in an invoice number + date, marks invoiced.
// The same document then prints as a TAX INVOICE. Accounting stays in the wrecker's
// own software — this is the customer-facing document only.
async function _slConvertToInvoice(quoteId) {
    if (!sb || !_slActiveQuote) return;
    if (_slActiveQuote.quote.invoice_number) { _slPrintQuoteA4(); return; }
    if (!confirm('Convert this quote to a tax invoice?\n\nThis locks in an invoice number. You can still print, email or send it.')) return;
    const inv = await _slGenerateInvoiceNumber();
    const now = new Date().toISOString();
    const { error } = await sb.from('quotes')
        .update({ invoice_number: inv, invoiced_at: now, status: 'invoiced', updated_at: now })
        .eq('id', quoteId);
    if (error) { showToast('Could not create invoice: ' + error.message); return; }
    _slActiveQuote.quote.invoice_number = inv;
    _slActiveQuote.quote.invoiced_at    = now;
    _slActiveQuote.quote.status         = 'invoiced';
    const q = _slQuotes.find(x => x.id === quoteId);
    if (q) { q.invoice_number = inv; q.invoiced_at = now; q.status = 'invoiced'; }
    showToast(`Invoice ${inv} created`);
    _slRenderQuoteDetail();
    _slRenderQuotesList();
}

async function _slSendQuoteToConv() {
    if (!_slQuoteConvContext || !_slActiveQuote) return;
    const { convId } = _slQuoteConvContext;
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    const { quote, lines } = _slActiveQuote;
    const subtotal = lines.reduce((s, l) => s + ((l.price || 0) * (l.qty || 1)), 0);
    const freight  = parseFloat(quote.freight_cost) || 0;
    const total    = subtotal + freight;
    const firstTitle = lines[0]?.title || getConvPartTitle(conv) || 'Quote';

    const quoteData = {
        type: 'quote', quoteNumber: quote.quote_number,
        price: total, notes: quote.notes || '', partTitle: firstTitle,
        listingId: conv.partId,
    };
    const text = `Quote ${quote.quote_number}: $${total.toLocaleString('en-AU')}${quote.notes ? ' — ' + quote.notes : ''}`;

    conv.msgs = conv.msgs || [];
    conv.msgs.push({ id: nextMsgId(conv), sent: true, text, offerCard: quoteData, time: 'Today', clock: nowClock(), timestamp: Date.now() });
    saveConversations();

    // Mark quote as sent in DB
    try { await sb.from('quotes').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', quote.id); } catch(e) {}
    const idx = _slQuotes.findIndex(q => q.id === quote.id);
    if (idx >= 0) _slQuotes[idx].status = 'sent';

    // Sync message to Supabase
    const isBuyer = conv.buyerId === currentUserId;
    sb.from('messages').insert({
        conversation_id: conv.supabaseConvId, sender_id: currentUserId,
        sender_name: currentUserName, text,
    }).then(() => sb.from('conversations').update({
        last_message_at: new Date().toISOString(),
        unread_buyer: !isBuyer, unread_seller: !!isBuyer,
    }).eq('id', conv.supabaseConvId)).catch(err => console.warn('sendQuoteToConv:', err?.message || err));

    proRenderThreadMsgs(conv);
    _slCloseQuoteDetail();
    showToast('Quote sent!');
}

async function _slSaveQuoteField(quoteId, field, value) {
    if (!sb) return;
    const parsed = field === 'freight_cost' ? (parseFloat(value) || 0) : (value || null);
    await sb.from('quotes').update({ [field]: parsed, updated_at: new Date().toISOString() }).eq('id', quoteId);
    if (_slActiveQuote?.quote?.id === quoteId) {
        _slActiveQuote.quote[field] = parsed;
        if (field === 'freight_cost') {
            const el = document.querySelector('#slQuoteDetailOverlay .sl-qd-total-amount');
            if (el) {
                const sub = _slActiveQuote.lines.reduce((s, l) => s + ((l.price||0)*(l.qty||1)), 0);
                el.textContent = '$' + (sub + parsed).toFixed(2);
            }
        }
    }
    const idx = _slQuotes.findIndex(q => q.id === quoteId);
    if (idx >= 0) {
        _slQuotes[idx][field] = parsed;
        if (field === 'customer_name') _slRenderQuotesList();
    }
}

async function _slSaveLinePrice(lineId, quoteId, value) {
    if (!sb) return;
    const price = parseFloat(value) || null;
    await sb.from('quote_lines').update({ price }).eq('id', lineId);
    if (_slActiveQuote?.quote?.id === quoteId) {
        const line = _slActiveQuote.lines.find(l => l.id === lineId);
        if (line) line.price = price;
        const freight  = parseFloat(_slActiveQuote.quote.freight_cost) || 0;
        const subtotal = _slActiveQuote.lines.reduce((s, l) => s + ((l.price||0)*(l.qty||1)), 0);
        const el = document.querySelector('#slQuoteDetailOverlay .sl-qd-total-amount');
        if (el) el.textContent = '$' + (subtotal + freight).toFixed(2);
    }
}

async function _slDeleteQuoteLine(lineId, quoteId) {
    if (!sb) return;
    await sb.from('quote_lines').delete().eq('id', lineId);
    if (_slActiveQuote?.quote?.id === quoteId) {
        _slActiveQuote.lines = _slActiveQuote.lines.filter(l => l.id !== lineId);
        _slRenderQuoteDetail();
    }
}

async function _slAdvanceQuoteStatus(quoteId, newStatus) {
    if (!sb) return;
    await sb.from('quotes').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', quoteId);
    if (_slActiveQuote?.quote?.id === quoteId) { _slActiveQuote.quote.status = newStatus; _slRenderQuoteDetail(); }
    const idx = _slQuotes.findIndex(q => q.id === quoteId);
    if (idx >= 0) { _slQuotes[idx].status = newStatus; _slRenderQuotesList(); }
}

async function _slSaveQuoteChanges(quoteId) {
    if (!sb) return;
    const overlay = document.getElementById('slQuoteDetailOverlay');
    if (!overlay) return;
    const inputs = overlay.querySelectorAll('.sl-qm-input, textarea.sl-qm-input');
    const fields = {};
    inputs.forEach(el => {
        const onblurAttr = el.getAttribute('onblur') || '';
        const fieldMatch = onblurAttr.match(/_slSaveQuoteField\(\d+,'([^']+)'/);
        if (fieldMatch) {
            const field = fieldMatch[1];
            fields[field] = field === 'freight_cost' ? (parseFloat(el.value) || 0) : (el.value.trim() || null);
        }
    });
    fields.updated_at = new Date().toISOString();
    await sb.from('quotes').update(fields).eq('id', quoteId);
    if (_slActiveQuote?.quote?.id === quoteId) {
        Object.assign(_slActiveQuote.quote, fields);
        const idx = _slQuotes.findIndex(q => q.id === quoteId);
        if (idx >= 0) Object.assign(_slQuotes[idx], fields);
        _slRenderQuotesList();
    }
    showToast('Quote saved');
    _slCloseQuoteDetail();
}

function _slDeleteQuote(quoteId) {
    showConfirm('Delete this quote?', 'This cannot be undone.', 'Delete', async () => {
        if (!sb) return;
        await sb.from('quote_lines').delete().eq('quote_id', quoteId);
        await sb.from('quotes').delete().eq('id', quoteId);
        _slQuotes = _slQuotes.filter(q => q.id !== quoteId);
        _slCloseQuoteDetail();
        _slRenderQuotesList();
        showToast('Quote deleted');
    });
}

function _slEmailQuote(quoteId) {
    const q = _slActiveQuote?.quote;
    const lines = _slActiveQuote?.lines || [];
    if (!q) return;
    const to = q.customer_email || '';
    const subject = encodeURIComponent(`Quote ${q.quote_number} — Auto Parts Connection`);
    const freight = parseFloat(q.freight_cost) || 0;
    const subtotal = lines.reduce((s, l) => s + ((l.price || 0) * (l.qty || 1)), 0);
    const total = subtotal + freight;
    const partLines = lines.map(l => `  - ${l.title}${l.stock_number ? ` (${l.stock_number})` : ''}: $${(l.price || 0).toFixed(2)}`).join('\n');
    const body = encodeURIComponent(
        `Hi ${q.customer_name || 'there'},\n\nPlease find your quote below.\n\nQuote #: ${q.quote_number}\n\nParts:\n${partLines || '  (none)'}\n\nFreight: $${freight.toFixed(2)}\nTotal: $${total.toFixed(2)}\n${q.notes ? `\nNotes: ${q.notes}\n` : ''}\nThanks,\nAuto Parts Connection`
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

// ── Quote number search ───────────────────────────────────────────────────

function _slQuoteDebounceSearch(val) {
    clearTimeout(_slQuoteDebounce);
    if (!val.trim()) return;
    _slQuoteDebounce = setTimeout(() => _slSearchByQuoteNumber(val.trim()), 600);
}

async function _slSearchByQuoteNumber(qn) {
    if (!sb || !currentUserId) return;
    const { data } = await sb.from('quotes')
        .select('id')
        .eq('user_id', currentUserId)
        .ilike('quote_number', `%${qn}%`)
        .order('created_at', { ascending: false })
        .limit(1);
    if (!data?.length) { showToast('Quote not found'); return; }
    if (!_slQuotes.find(q => q.id === data[0].id)) await _slLoadTodaysQuotes();
    _slOpenQuoteDetail(data[0].id);
}

function refreshDashSavesFromSupabase() {
    if (!currentUserId || !sb || !userListings.length) return;
    const ids = userListings.map(l => l.supabaseId).filter(Boolean);
    if (!ids.length) return;
    sb.from('listings').select('id, saves_count').in('id', ids)
      .then(({ data }) => {
          if (!data) return;
          const counts = Object.fromEntries(data.map(r => [r.id, r.saves_count || 0]));
          let changed = false;
          userListings.forEach(l => {
              if (l.supabaseId && counts[l.supabaseId] !== undefined) {
                  const fresh = counts[l.supabaseId];
                  if (fresh !== (l.saves || 0)) { l.saves = fresh; changed = true; }
              }
          });
          if (changed) { saveUserListings(); renderDashboard(); }
      });
}

async function loadDashGraphData() {
    if (!currentUserId || !sb) return;
    const listingIds = userListings.map(l => l.supabaseId).filter(Boolean);
    if (!listingIds.length) return;

    const since = new Date(Date.now() - 6 * 86400000).toISOString();
    const dayLabel = d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d).getDay()];
    const labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i)); return dayLabel(d);
    });
    const dateKey = d => new Date(d).toISOString().slice(0, 10);
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i)); return dateKey(d);
    });

    const [{ data: views }, { data: saves }] = await Promise.all([
        sb.from('listing_views').select('created_at').in('listing_id', listingIds).gte('created_at', since),
        sb.from('saved_listings').select('created_at').in('listing_id', listingIds).gte('created_at', since),
    ]);

    const countByDay = (rows) => {
        const map = {};
        (rows || []).forEach(r => { const k = dateKey(r.created_at); map[k] = (map[k] || 0) + 1; });
        return last7.map(k => map[k] || 0);
    };

    dashMockData.weekLabels = labels;
    dashMockData.weekViews  = countByDay(views);
    dashMockData.weekSaves  = countByDay(saves);

    if (document.getElementById('dashboardView')?.style.display !== 'none') {
        renderDashboardCharts(userListings.filter(p => p.status !== 'removed'));
    }
}

let _dashFeedbackRatings = [];

async function renderDashFeedbackCard() {
    const card = document.getElementById('dashFeedbackCard');
    if (!card) return;
    const soldListings = userListings.filter(p => p.status === 'sold');
    const toLeave      = soldListings.filter(l => !l.buyerRating).length;

    card.style.display = '';
    card.innerHTML = `<div class="dash-card-hdr"><span class="dash-card-title">Seller Feedback</span></div>
        <div style="padding:4px 0 8px;font-size:12px;color:#bbb;">Loading…</div>`;

    if (!sb || !currentUserId) return;
    let ratings = [];
    try {
        const { data } = await sb.from('seller_ratings')
            .select('stars, note, created_at, listing_id')
            .eq('seller_id', currentUserId)
            .order('created_at', { ascending: false });
        ratings = data || [];
    } catch(e) {}
    _dashFeedbackRatings = ratings;

    const received = ratings.length;
    const avg      = received ? ratings.reduce((s, r) => s + (r.stars || 0), 0) / received : 0;
    const pending  = Math.max(0, soldListings.length - received);

    const receivedVal = received
        ? `<span class="dash-fb-stars">★ ${avg.toFixed(1)}</span><span class="dash-fb-count">${received} rating${received !== 1 ? 's' : ''}</span>`
        : `<span class="dash-fb-none">None yet</span>`;

    card.innerHTML = `
        <div class="dash-card-hdr">
            <span class="dash-card-title">Seller Feedback</span>
            ${received ? `<button class="dash-card-action" onclick="_dashOpenRatings()">View all →</button>` : ''}
        </div>
        <div class="dash-fb-rows">
            <div class="dash-fb-row">
                <span class="dash-fb-ico">★</span>
                <span class="dash-fb-label">Received</span>
                <span class="dash-fb-val">${receivedVal}</span>
            </div>
            <div class="dash-fb-row">
                <span class="dash-fb-ico">⏳</span>
                <span class="dash-fb-label">Awaiting from buyers</span>
                <span class="dash-fb-val dash-fb-num ${pending > 0 ? 'warn' : 'ok'}">${pending}</span>
            </div>
            <div class="dash-fb-row">
                <span class="dash-fb-ico">✍</span>
                <span class="dash-fb-label">You haven't rated yet</span>
                <span class="dash-fb-val dash-fb-num ${toLeave > 0 ? 'orange' : 'ok'}">${toLeave}${toLeave > 0 ? `<button class="dash-fb-link" onclick="proOpenMyListings('sold')">View sales</button>` : ''}</span>
            </div>
        </div>`;
}

function _dashOpenRatings() {
    openSellerRatings(_dashFeedbackRatings);
}

function renderDashboard() {
    // Safety: if signed in but userListings empty, may be a post-sign-in race — reload
    if (userIsSignedIn && currentUserId && !userListings.length) {
        loadUserListingsFromSupabase(currentUserId).then(() => renderDashboard());
        return;
    }
    refreshDashSavesFromSupabase();
    loadDashGraphData();
    const sellerName = getCurrentSellerName();
    const myListings = userListings.filter(p => p.status !== 'removed');
    const totalSaves  = myListings.reduce((s, p) => s + (p.saves || 0), 0);
    const soldListings = userListings.filter(p => p.status === 'sold');
    const revenue      = soldListings.reduce((s, p) => s + (Number(p.price) || 0), 0);
    const unread       = conversations.filter(c => c.unread).length;

    const welcome = document.getElementById('dashWelcome');
    if (welcome) welcome.textContent = `Welcome back, ${currentUserName || 'Pro'} — here\'s your business overview`;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('dashStatListings', myListings.length);
    set('dashStatSaves',    totalSaves);
    set('dashStatMessages', unread);
    set('dashStatSales',    soldListings.length);
    set('dashStatRevenue',  '$' + revenue.toLocaleString());

    renderDashboardCharts(myListings);
    renderDashActivity();
    renderDemandWidget();
    renderDashVehicleSearch();
    renderDashJobs();
    renderDashWanted();
    renderDashWantedRequests();
    renderDashFeedbackCard();
}

function renderDashboardCharts(myListings) {
    if (_dashViewsChart) { _dashViewsChart.destroy(); _dashViewsChart = null; }
    if (_dashCatChart)   { _dashCatChart.destroy();   _dashCatChart   = null; }
    if (!window.Chart) return;

    const catCounts = {};
    myListings.forEach(p => { const c = p.category || 'other'; catCounts[c] = (catCounts[c] || 0) + 1; });
    const catLabels = Object.keys(catCounts).map(c => c.charAt(0).toUpperCase() + c.slice(1));
    const catData   = Object.values(catCounts);

    const cCtx = document.getElementById('dashCategoryChart');
    if (cCtx) {
        _dashCatChart = new Chart(cCtx, {
            type: 'bar',
            data: {
                labels: catLabels,
                datasets: [{ label: 'Listings', data: catData, backgroundColor: 'rgba(247,148,29,0.8)', borderColor: '#F7941D', borderWidth: 0, borderRadius: 6 }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f5f5f5' }, ticks: { font: { size: 11 }, stepSize: 1 } },
                    y: { grid: { display: false },                       ticks: { font: { size: 11 } } }
                }
            }
        });
    }
}

function relativeTime(date) {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    if (isNaN(diff) || diff < 0) return '—';
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 2)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hrs  < 24)  return `${hrs}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days} days ago`;
    return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function renderDashActivity() {
    const feed = document.getElementById('dashActivityFeed');
    if (!feed) return;

    const events = [];
    const sellerName = getCurrentSellerName();

    // Listings (recent + sold)
    [...userListings]
        .filter(p => p.sellerId === currentUserId || p.sellerName === sellerName)
        .sort((a, b) => new Date(b.listDate || b.createdAt || 0) - new Date(a.listDate || a.createdAt || 0))
        .slice(0, 8)
        .forEach(p => {
            const isSold = p.status === 'sold';
            events.push({
                type: isSold ? 'sold' : 'listed',
                text: isSold ? `Marked sold — <strong>${escapeHtml(p.title)}</strong>` : `Listed <strong>${escapeHtml(p.title)}</strong>`,
                sub:  p.price ? `$${Number(p.price).toLocaleString()}` : '',
                ts:   new Date(p.listDate || p.createdAt || 0)
            });
        });

    // Enquiries received as seller
    conversations
        .filter(c => c.sellerId === currentUserId)
        .forEach(c => {
            const partName = findPartAnywhere(c.partId)?.title || c.partTitle || 'a listing';
            events.push({
                type: 'message',
                text: `Enquiry on <strong>${escapeHtml(partName)}</strong>`,
                sub:  c.unread ? '● Unread' : '',
                ts:   new Date(c.lastMessageAt || 0)
            });
        });

    // Offers received
    offersDb
        .filter(o => o.sellerId === currentUserId)
        .forEach(o => {
            const partName = findPartAnywhere(o.partId)?.title || 'a listing';
            events.push({
                type: 'offer',
                text: `Offer <strong>$${Number(o.amount || 0).toLocaleString()}</strong> on ${escapeHtml(partName)}`,
                sub:  o.status === 'pending' ? 'Awaiting response' : (o.status || ''),
                ts:   new Date(o.createdAt || 0)
            });
        });

    events.sort((a, b) => b.ts - a.ts);

    if (!events.length) {
        feed.innerHTML = `<div class="dash-activity-empty">No activity yet — list your first part to get started.</div>`;
        return;
    }

    const icons  = { listed:'📦', sold:'✅', message:'💬', offer:'💰' };
    const colors = { listed:'#fff3e5', sold:'#e8f8ee', message:'#e8f3ff', offer:'#fff9e5' };

    feed.innerHTML = events.slice(0, 9).map(e => `
        <div class="dash-activity-item">
            <div class="dash-act-ico" style="background:${colors[e.type] || '#f5f5f5'}">${icons[e.type] || '●'}</div>
            <div class="dash-act-body">
                <div class="dash-act-text">${e.text}</div>
                <div class="dash-act-meta">${e.sub ? `<span class="dash-act-sub">${e.sub}</span>` : ''}${relativeTime(e.ts) !== '—' ? `<span class="dash-act-time">${relativeTime(e.ts)}</span>` : ''}</div>
            </div>
        </div>`).join('');
}

function filterDashListings() {
    _dashListingsShown = 25;
    renderDashListings(_dashCurrentTab);
}

function loadMoreDashListings() {
    _dashListingsShown += 25;
    renderDashListings(_dashCurrentTab);
}

let _dashSelected = new Set(); // bulk-select on the dashboard My Listings (active tab)
function renderDashListings(tab, btn, ctx) {
    if (ctx) _dashListingsCtx = ctx;
    _dashCurrentTab = tab;
    _dashSelected.clear();
    const isPro = _dashListingsCtx === 'pro';
    if (btn) {
        const tabScope = isPro ? '#proLstTabs' : '#dashListingsTabs';
        document.querySelectorAll(`${tabScope} .dash-tab`).forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
    }

    if (isPro) _updateProLstTabCounts();
    const pfx  = isPro ? 'proLst' : 'dashListings';
    const q    = (document.getElementById(`${pfx}Search`)?.value || '').trim().toLowerCase();
    const cat  = (document.getElementById(`${pfx}CatFilter`)?.value || '');
    const countEl = document.getElementById(isPro ? 'proLstCount' : 'dashListingsCount');
    const sellerName = getCurrentSellerName();
    const body = document.getElementById(isPro ? 'proLstBody' : 'dashListingsBody');
    if (!body) return;

    let rows = '';
    let hasMore = false;
    if (tab === 'active') {
        let items = userListings.filter(p => p.status !== 'sold' && p.status !== 'removed');
        const total = items.length;
        if (q) {
            const tokens = q.split(/\s+/).filter(Boolean);
            items = items.filter(p => {
                const vehicleText = (p.fits || []).map(f => [f.make, f.model, f.variant].filter(Boolean).join(' ')).join(' ');
                const haystack = [p.title, p.category, p.loc, p.stockNumber, p.apcId, vehicleText].filter(Boolean).join(' ').toLowerCase();
                return tokens.every(t => haystack.includes(t));
            });
        }
        if (cat) items = items.filter(p => p.category === cat);
        if (countEl) countEl.textContent = items.length < total ? `${items.length} of ${total} listings` : `${total} listing${total !== 1 ? 's' : ''}`;
        if (!total) {
            body.innerHTML = '<div class="dash-empty-state">No active listings yet. <a href="#" onclick="openSellOverlay();return false;" style="color:var(--apc-orange);">List your first part →</a></div>';
            return;
        }
        if (!items.length) {
            body.innerHTML = '<div class="dash-empty-state">No listings match your search.</div>';
            return;
        }
        const isFiltered = q || cat;
        const visible = isFiltered ? items : items.slice(0, _dashListingsShown);
        hasMore = !isFiltered && items.length > _dashListingsShown;
        rows = visible.map(p => `<tr>
            <td class="dash-chk-cell"><input type="checkbox" class="dash-row-chk" data-id="${p.id}" onchange="_dashToggleSelect(${p.id},this.checked)"></td>
            <td><img class="dash-thumb" src="${escapeHtml(thumbUrl((p.images && p.images[0]) || 'images/placeholder.png', 200))}" alt="" onclick="openItemDetail('${p.supabaseId || p.id}')" style="cursor:pointer;" title="View listing"></td>
            <td><div class="dash-part-name">${escapeHtml(p.title)}${_dashQuoteChip(p)}</div>${p.quantity > 1 ? `<div class="dash-part-sub">Qty: ${p.quantity}</div>` : ''}${p.status === 'pending' ? `<span class="dash-pending-chip">PENDING</span>` : ''}</td>
            <td class="dash-td-price">$${p.price}</td>
            <td class="dash-td-stock">${p.stockNumber ? escapeHtml(p.stockNumber) : '<span class="dash-td-loc--empty">—</span>'}</td>
            <td class="dash-td-loc">${p.warehouseBin ? `<span class="dash-bin-chip">${escapeHtml(p.warehouseBin)}</span>` : '<span class="dash-td-loc--empty">—</span>'}</td>
            <td class="dash-td-kms">${p.odometer ? Number(p.odometer).toLocaleString('en-AU') : '<span class="dash-td-loc--empty">—</span>'}</td>
            <td class="dash-td-saves">&#x2665;&#xFE0E; ${p.saves || 0}</td>
            <td class="dash-td-date">${dashFmtDate(p.date)}</td>
            <td>
                ${p.status === 'pending' ? `<button class="dash-action-btn dash-btn-warning" onclick="clearListingPending(${p.id})">Remove Pending</button>` : ''}
                <button class="dash-action-btn" onclick="openEditListing(${p.supabaseId ?? p.id});">Edit</button>
                <button class="dash-action-btn dash-btn-primary" onclick="markSold(${p.id})">Mark Sold</button>
            </td></tr>`).join('');
    } else if (tab === 'pending') {
        const sellerName = getCurrentSellerName();
        const realOffers = offersDb.filter(o => {
            const part = getPartById(o.partId);
            return part && part.seller === sellerName && o.status === 'pending';
        });
        let items = [...realOffers];
        if (q) items = items.filter(o => o.partTitle.toLowerCase().includes(q) || o.buyer.toLowerCase().includes(q));
        if (countEl) countEl.textContent = `${items.length} offer${items.length !== 1 ? 's' : ''}`;
        rows = items.map(o => {
            const counterRowId = `counter-row-${o.id}`;
            const counterInputId = `counter-input-${o.id}`;
            return `<tr>
            <td><img class="dash-thumb" src="${o.partImg}" alt=""></td>
            <td>
                <div class="dash-part-name">${escapeHtml(o.partTitle)}</div>
                <div class="dash-part-sub">From ${escapeHtml(o.buyer)}</div>
            </td>
            <td>
                <span class="dash-offered-price">$${o.offerPrice}</span>
                <span class="dash-listed-price">Listed: $${o.listedPrice}</span>
                ${o.buyerNote ? `<div class="dash-offer-note">"${escapeHtml(o.buyerNote)}"</div>` : ''}
            </td>
            <td class="dash-td-date">${o.date}</td>
            <td>
                <button class="dash-action-btn dash-btn-primary" onclick="acceptOffer(${o.id})">Accept</button>
                <button class="dash-action-btn dash-btn-danger" onclick="declineOffer(${o.id})">Decline</button>
                <button class="dash-action-btn" onclick="showCounterInput(${o.id})">Counter</button>
                <div class="dash-counter-row" id="${counterRowId}" style="display:none;">
                    <input id="${counterInputId}" type="number" class="dash-counter-input" placeholder="$">
                    <button class="dash-action-btn dash-btn-primary" onclick="submitCounterOffer(${o.id})">Send</button>
                </div>
            </td></tr>`;
        }).join('');
    } else {
        const sellerName = getCurrentSellerName();
        const realSold = userListings
            .filter(l => l.status === 'sold')
            .map(l => ({ id: l.id, title: l.title, price: l.price, buyer: null, date: l.soldDate, img: (l.images && l.images[0]) || 'images/placeholder.png', isReal: true }));
        let items = [...realSold];
        if (q) items = items.filter(s => s.title.toLowerCase().includes(q) || (s.buyer || '').toLowerCase().includes(q));
        if (countEl) countEl.textContent = `${items.length} listing${items.length !== 1 ? 's' : ''}`;
        rows = items.map(s => `<tr>
            <td><img class="dash-thumb" src="${s.img}" alt=""></td>
            <td><div class="dash-part-name">${escapeHtml(s.title)}</div>${s.buyer ? `<div class="dash-part-sub">Sold to ${escapeHtml(s.buyer)}</div>` : ''}</td>
            <td class="dash-td-price">$${s.price}</td>
            <td></td>
            <td class="dash-td-date">${dashFmtDate(s.date)}</td>
            <td>
                ${!userListings.find(l => l.id === s.id)?.buyerRating ? `<button class="dash-action-btn dash-btn-primary" onclick="showRateBuyerDialog(${s.id})">Rate Buyer</button>` : `<span class="dash-rated-chip">★ Rated</span>`}
                <button class="dash-action-btn" onclick="relistPart(${s.id})">Relist</button>
            </td>
        </tr>`).join('');
    }

    if (!rows) {
        body.innerHTML = '<div class="dash-empty-state">No listings match your search.</div>';
        return;
    }

    const hdrs = tab === 'active'
        ? ['', 'Part', 'Price', 'Stock #', 'Location', 'KMs', 'Saves', 'Listed', 'Actions']
        : tab === 'pending'
        ? ['', 'Part', 'Offer vs Listed', 'Date', 'Actions']
        : ['', 'Part', 'Sale Price', '', 'Sale Date', 'Actions'];

    const bulkBar = tab === 'active'
        ? `<div id="dashBulkBar" class="dash-bulk-bar" style="display:none;">
               <span id="dashBulkCount" class="dash-bulk-count">0 selected</span>
               <div class="dash-bulk-actions">
                   <button class="dash-action-btn dash-btn-label" onclick="_dashBulkLabels()">&#127991; Print Labels</button>
                   <button class="dash-action-btn dash-btn-danger" onclick="_dashBulkDelete()">&#128465;&#xFE0F; Delete</button>
                   <button class="dash-action-btn" onclick="_dashClearSelection()">Clear</button>
               </div>
           </div>`
        : '';
    const selectAllTh = tab === 'active'
        ? `<th class="dash-chk-cell"><input type="checkbox" id="dashSelectAll" onchange="_dashSelectAll(this.checked)" title="Select all"></th>`
        : '';

    body.innerHTML = `${bulkBar}<table class="dash-table">
        <thead><tr>${selectAllTh}${hdrs.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
    </table>${hasMore ? `<div style="text-align:center; padding: 14px 0;"><button class="dash-action-btn" style="padding: 8px 24px; font-size:13px;" onclick="loadMoreDashListings()">Load more listings</button></div>` : ''}`;
}

// ── Dashboard My Listings — bulk select (email-style) ────────────────────────
function _dashToggleSelect(id, checked) {
    if (checked) _dashSelected.add(id); else _dashSelected.delete(id);
    _dashUpdateBulkBar();
}
function _dashSelectAll(checked) {
    document.querySelectorAll('.dash-row-chk').forEach(cb => {
        cb.checked = checked;
        const id = Number(cb.dataset.id);
        if (checked) _dashSelected.add(id); else _dashSelected.delete(id);
    });
    _dashUpdateBulkBar();
}
function _dashClearSelection() {
    _dashSelected.clear();
    document.querySelectorAll('.dash-row-chk').forEach(cb => { cb.checked = false; });
    _dashUpdateBulkBar();
}
function _dashUpdateBulkBar() {
    const n = _dashSelected.size;
    const countEl = document.getElementById('dashBulkCount');
    if (countEl) countEl.textContent = `${n} selected`;
    const bar = document.getElementById('dashBulkBar');
    if (bar) bar.style.display = n > 0 ? '' : 'none';
    const sa = document.getElementById('dashSelectAll');
    if (sa) {
        const all = document.querySelectorAll('.dash-row-chk');
        const checked = [...all].filter(cb => cb.checked).length;
        sa.checked = all.length > 0 && checked === all.length;
        sa.indeterminate = checked > 0 && checked < all.length;
    }
}
function _dashSelectedParts() {
    return [..._dashSelected].map(id => userListings.find(l => l.id === id)).filter(p => p && p.sellerId === currentUserId);
}
function _dashBulkLabels() {
    const parts = _dashSelectedParts();
    if (!parts.length) return;
    if (!confirm(`Print ${parts.length} label${parts.length !== 1 ? 's' : ''}?`)) return;
    printEdwLabelsBatch(parts.map(p => ({
        id: p.id, supabaseId: p.supabaseId, title: p.title, apcId: p.apcId,
        condition: p.condition, fits: p.fits || [], year: p.year,
        stockNumber: p.stockNumber, warehouseBin: p.warehouseBin,
    })));
}
function _dashBulkDelete() {
    const parts = _dashSelectedParts();
    if (!parts.length) return;
    showConfirmDialog(
        'Delete Listings',
        `Delete ${parts.length} listing${parts.length !== 1 ? 's' : ''}? This cannot be undone.`,
        `DELETE ${parts.length}`,
        async () => {
            const supabaseIds = parts.map(p => p.supabaseId).filter(Boolean);
            parts.forEach(p => { const idx = userListings.indexOf(p); if (idx !== -1) userListings.splice(idx, 1); });
            saveUserListings();
            _dashSelected.clear();
            showToast(`${parts.length} listing${parts.length !== 1 ? 's' : ''} deleted`);
            renderMainGrid();
            renderMyParts();
            renderDashListings(_dashCurrentTab || 'active', null, _dashListingsCtx);
            for (const sid of supabaseIds) {
                try {
                    await sb.from('listing_images').delete().eq('listing_id', sid);
                    await sb.from('listing_vehicles').delete().eq('listing_id', sid);
                    await sb.from('dismantling_items').update({ listing_id: null }).eq('listing_id', sid);
                    await sb.from('listings').delete().eq('id', sid);
                } catch (e) { console.warn('Supabase delete error:', e); }
            }
        }
    );
}

function dashFmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Worker view: ?job=TOKEN — replace app entirely, no auth needed
    const _workerToken = new URLSearchParams(location.search).get('job');
    if (_workerToken && sb) { initWorkerView(_workerToken); return; }

    // Put-away worker view: ?putaway=<token> — no-login scanner scoped to that yard.
    // (Legacy ?putaway=1 falls through to the signed-in flow below.)
    const _paToken = new URLSearchParams(location.search).get('putaway');
    if (_paToken && _paToken !== '1' && sb) { initPutAwayWorkerView(_paToken); return; }

    // Always start with a blank filter postcode — never pre-fill from browser autocomplete or profile
    const fp = document.getElementById('filterPostcode');
    if (fp) {
        fp.value = '';
        // Autocomplete fires after DOMContentLoaded — clear again after a tick
        setTimeout(() => { fp.value = ''; }, 200);
        // Guard: reject anything non-numeric that autocomplete sneaks in on focus
        fp.addEventListener('focus', () => { if (!/^\d*$/.test(fp.value)) fp.value = ''; });
    }
    document.addEventListener('click', e => {
        if (!e.target.closest('#inboxStatusWrap')) closeInboxStatusPicker();
        if (!e.target.closest('#proCtxStatusBtn') && !e.target.closest('#proCtxStatusPicker')) {
            const p = document.getElementById('proCtxStatusPicker');
            if (p) p.style.display = 'none';
        }
    });
    updateHeaderOffset();
    initFilterVehicleDropdowns();
    // Deep-link: ?store=USERID — open the storefront directly (profile fetch is independent of listings)
    const _storeParam = new URLSearchParams(location.search).get('store');
    if (_storeParam) openStorefrontByUserId(_storeParam);

    renderSkeletonGrid();
    loadPublicListingsFromSupabase();

    // Infinite scroll — trigger next Supabase page when sentinel enters view
    const _gridSentinel = document.getElementById('gridSentinel');
    if (_gridSentinel) {
        new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !_listingsLoading && !_listingsExhausted) {
                loadPublicListingsFromSupabase(true);
            }
        }, { rootMargin: '400px' }).observe(_gridSentinel);
    }

    loadSponsoredCards();
    renderGarage();            // build vehicle list from localStorage so drawer is ready when opened
    updateInboxBadge();        // update badge from mock notifications
    const remembered = loadRememberedUser();
    if (remembered && remembered.name) {
        signIn(remembered.name, remembered.tier || 'standard', true, remembered.email || '');
    }

    // Fallback for private/incognito mode where INITIAL_SESSION fires with null despite a valid
    // stored JWT — getSession() reads the token directly and triggers the data load if missed.
    if (sb) {
        sb.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && !_dataLoadStarted) {
                _dataLoadStarted = true;
                currentUserId = session.user.id;
                loadPublicListingsFromSupabase();
                loadUserListingsFromSupabase(session.user.id);
                loadConversationsFromSupabase(session.user.id);
                loadVehiclesFromSupabase(session.user.id);
                loadWantedFromSupabase(session.user.id);
                loadSavedListingsFromSupabase(session.user.id);
                loadPublicWantedFromSupabase();
                loadNotificationsFromSupabase();
            } else if (!session?.user && _pendingPutAway && !userIsSignedIn) {
                // Worker scanned the put-away QR but isn't signed in — open the sign-in
                // modal directly so they don't have to hunt for it. The _pendingPutAway
                // hook in renderAccountState opens the scanner once they're signed in.
                openAuthDrawer();
            }
        });
    }

    renderMyParts();           // after sign-in so seller filter uses correct name
    renderAccountState();      // sets pill label/colour, hides pro toggle, sizes the grid offset

    // Sync carousel dots on scroll
    const carouselEl = document.getElementById('imageCarousel');
    if (carouselEl) carouselEl.addEventListener('scroll', updateCarouselActiveDot, { passive: true });

    // Wire up live search with debounce
    const searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        let _recordSearchTimer = null;

        const scheduleRecordSearch = (term) => {
            clearTimeout(_recordSearchTimer);
            _recordSearchTimer = setTimeout(() => recordSearch(term), 2500);
        };

        searchInput.addEventListener('input', debounce(() => {
            activeFilters.search = searchInput.value.trim();
            renderMainGrid();
            updateFilterChip();
            refreshSponsoredCards();
            scheduleRecordSearch(activeFilters.search);
        }, 300));

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(_recordSearchTimer);
                recordSearch(searchInput.value.trim());
            }
        });

        searchInput.addEventListener('focus', () => {
            closeDetailOverlay();
            goHome();
        });
    }

    // Preload listing images on touchstart (mobile) and mouseover (desktop) so they're
    // already in-flight before the detail overlay opens — cuts perceived load time significantly.
    let _preloadId = null;
    function _preloadListingImages(partId) {
        if (_preloadId === partId) return;
        _preloadId = partId;
        const part = findPartAnywhere(partId);
        if (part) (part.images || []).slice(0, 3).forEach(url => { new Image().src = url; });
    }
    function _extractPreloadId(el) {
        const card = el.closest && el.closest('.item-card[onclick]');
        if (!card) return null;
        const m = (card.getAttribute('onclick') || '').match(/openItemDetail\('?([^')]+)'?\)/);
        return m ? m[1] : null;
    }
    document.addEventListener('touchstart', e => {
        const id = _extractPreloadId(e.target);
        if (id) _preloadListingImages(id);
    }, { passive: true });
    document.addEventListener('mouseover', e => {
        const id = _extractPreloadId(e.target);
        if (id) _preloadListingImages(id);
    });

    // Wire up the filter "Update Results" button
    const filterBtn = document.querySelector('#filterDrawer .btn-full-action');
    if (filterBtn) {
        filterBtn.onclick = applyFiltersAndRender;
    }

    // Live filters on desktop for text/number inputs (selects + checkboxes handled via inline onFilterChange())
    document.querySelectorAll('#filterDrawer input[type="text"], #filterDrawer input[type="number"]').forEach(el => {
        el.addEventListener('input', () => {
            if (window.innerWidth >= 900) applyFiltersAndRender();
        });
    });

    // Purge conversations trashed more than 30 days ago
    purgeTrashedConversations();
    updateTrashBadge();

    initDetailSwipeDismiss();
    initWorkshopSwipeDismiss();

    // Prepare the sell form preview boxes
    renderSellImagePreviews();

    // Deep-link: ?item=123 — defer until after listings load (partDatabase is empty at this point)
    const itemParam = new URLSearchParams(location.search).get('item');
    if (itemParam) _pendingItemOpen = itemParam.includes('-') ? itemParam : Number(itemParam);

    // Deep-link: ?putaway=1 — open warehouse put-away scanner (worker QR code)
    if (new URLSearchParams(location.search).get('putaway') === '1') _pendingPutAway = true;

    // Lightbox keyboard navigation
    document.addEventListener('keydown', e => {
        const lightbox = document.getElementById('imageLightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxNav(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNav(1); }
        if (e.key === 'Escape')     { e.preventDefault(); closeDetailImageViewer(); }
    });

});

// ================================================================
// WAREHOUSE — Label Generator + Put-Away Scanner
// ================================================================

let _whCameraStream     = null;
let _whScanState        = 'idle'; // idle | scan_part | scan_rack | saved | stk_rack | stk_scanning
let _whScannedPart      = null;
let _whScannedRack      = null;
let _whLabelCodes       = [];
let _whRafId            = null;
let _whBarcodeDetector  = null;
let _whScanMode         = 'putaway'; // putaway | stocktake
let _whPutawayToken     = null;      // set in the no-login worker view — routes reads/writes via RPCs
let _paSessionCount     = 0;         // parts put away in the current worker session
let _stkRack            = '';
let _stkExpected        = [];  // [{ id, title, apcId, status, scanned }]
let _stkExtras          = [];  // parts scanned that aren't assigned to this rack
let _stkLastId          = null;
let _stkLastTime        = 0;

let _proNavBeforeWarehouse = null;

function openWarehouseDrawer() {
    if (!userIsSignedIn || currentUserTier !== 'pro') { openAuthDrawer(openWarehouseDrawer); return; }
    _pauseEdw();
    // Warehouse is a drawer, not a proShowView, so light up its nav item manually.
    // Remember the prior active item to restore when the drawer closes.
    _proNavBeforeWarehouse = document.querySelector('.pro-hdr-link.pro-hdr-active')?.id || null;
    document.querySelectorAll('.pro-hdr-link').forEach(l => l.classList.remove('pro-hdr-active'));
    document.getElementById('proNavWarehouse')?.classList.add('pro-hdr-active');
    toggleDrawer('warehouseDrawer', true);
    // Labels generator is desktop-only (printing); mobile gets the scanner.
    whSetTab(window.innerWidth < 900 ? 'scanner' : 'labels');
    whRenderWorkerQR();
}

async function whRenderWorkerQR() {
    const wrap = document.getElementById('whWorkerQr');
    if (!wrap || !window.QRCode) return;
    if (wrap.querySelector('canvas') || wrap.querySelector('img')) return; // already rendered
    const base = (location.protocol === 'file:' || location.hostname === 'localhost')
        ? 'https://autopartsconnection.com.au/'
        : `${location.origin}${location.pathname}`;
    // Per-yard token → workers scan in with no login, scoped to put-away only.
    let token = null;
    if (sb && currentUserId) {
        const { data } = await sb.from('profiles').select('putaway_token').eq('id', currentUserId).single();
        token = data?.putaway_token || null;
    }
    const url = token ? `${base}?putaway=${token}` : `${base}?putaway=1`;
    new QRCode(wrap, { text: url, width: 120, height: 120, colorDark: '#1a1a1a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
}

// Regenerate the yard's put-away token — instantly revokes every previously shared QR.
async function whResetWorkerAccess() {
    if (!sb || !currentUserId) return;
    if (!confirm('Reset worker access?\n\nThe current QR will stop working — workers will need to scan the new one.')) return;
    const newToken = crypto.randomUUID();
    const { error } = await sb.from('profiles').update({ putaway_token: newToken }).eq('id', currentUserId);
    if (error) { showToast('Could not reset: ' + error.message); return; }
    const wrap = document.getElementById('whWorkerQr');
    if (wrap) wrap.innerHTML = ''; // clear the old QR so it re-renders with the new token
    whRenderWorkerQR();
    showToast('Worker access reset — share the new QR');
}

// Print the worker QR as a scan-ready label (large QR + simple instructions).
async function whPrintWorkerQR() {
    const base = (location.protocol === 'file:' || location.hostname === 'localhost')
        ? 'https://autopartsconnection.com.au/'
        : `${location.origin}${location.pathname}`;
    let token = null;
    if (sb && currentUserId) {
        const { data } = await sb.from('profiles').select('putaway_token').eq('id', currentUserId).single();
        token = data?.putaway_token || null;
    }
    const url = token ? `${base}?putaway=${token}` : `${base}?putaway=1`;
    const bizName = (userSettings.businessName || '').trim() || 'Put-Away Scanner';
    const win = window.open('', '_blank');
    if (!win) { showToast('Allow pop-ups to print the QR'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Put-Away QR</title>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
<style>
  *{box-sizing:border-box;} body{font-family:-apple-system,'Segoe UI',sans-serif;margin:0;padding:40px;text-align:center;color:#1a1a2e;}
  .pa-card{max-width:480px;margin:0 auto;border:2px solid #1a1a2e;border-radius:16px;padding:32px;}
  .pa-eyebrow{font-size:13px;font-weight:800;letter-spacing:1px;color:#f07020;text-transform:uppercase;}
  .pa-title{font-size:26px;font-weight:900;margin:6px 0 4px;}
  .pa-sub{font-size:13px;color:#555;margin-bottom:22px;}
  .pa-qr{display:inline-block;padding:12px;background:#fff;}
  .pa-steps{font-size:14px;color:#333;margin-top:22px;line-height:1.8;text-align:left;display:inline-block;}
  @media print{@page{margin:12mm;} body{padding:0;}}
</style></head><body>
  <div class="pa-card">
    <div class="pa-eyebrow">&#128229; Put-Away Scanner</div>
    <div class="pa-title">${escapeHtml(bizName)}</div>
    <div class="pa-sub">Scan with your phone camera to put parts away</div>
    <div class="pa-qr" id="paQr"></div>
    <div class="pa-steps">
      1. Point your phone camera at this code<br>
      2. Scan a part label<br>
      3. Scan the rack / shelf label<br>
      4. Tap <b>Save</b> &mdash; done!
    </div>
  </div>
  <script>
    new QRCode(document.getElementById('paQr'), { text: ${JSON.stringify(url)}, width: 320, height: 320, correctLevel: QRCode.CorrectLevel.M });
    setTimeout(() => window.print(), 600);
  <\/script>
</body></html>`);
    win.document.close();
}

// No-login worker put-away view — opened by scanning the boss's ?putaway=<token> QR.
// Reuses the normal scanner engine; reads/writes go through token-scoped RPCs.
async function initPutAwayWorkerView(token) {
    _whPutawayToken = token;
    _whScanMode = 'putaway';
    _paSessionCount = 0;
    document.body.innerHTML = `<div style="min-height:100vh;background:#1a1a2e;display:flex;align-items:center;justify-content:center;color:#aaa;font-family:-apple-system,sans-serif;">Loading…</div>`;
    let yard = null;
    try { const { data } = await sb.rpc('putaway_resolve', { p_token: token }); yard = data || null; } catch (e) {}
    if (!yard) {
        document.body.innerHTML = `<div style="min-height:100vh;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:-apple-system,sans-serif;text-align:center;padding:30px;">
            <div style="font-size:40px;margin-bottom:12px;">✕</div>
            <div style="font-size:17px;font-weight:800;margin-bottom:6px;">Link not valid</div>
            <div style="font-size:13px;color:#aaa;">This put-away code has expired or is incorrect. Ask the yard for a fresh QR.</div>
        </div>`;
        return;
    }
    document.body.innerHTML = `
    <div style="min-height:100vh;background:#1a1a2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="background:#16213e;color:#fff;padding:16px;text-align:center;">
            <div style="font-size:11px;font-weight:800;letter-spacing:0.6px;color:#f07020;text-transform:uppercase;">📥 Put-Away Scanner</div>
            <div style="font-size:16px;font-weight:700;margin-top:3px;">${escapeHtml(yard)}</div>
        </div>
        <div style="max-width:480px;margin:0 auto;padding:12px;">
            <div class="wh-camera-wrap">
                <video id="whCameraVideo" autoplay playsinline muted class="wh-camera-video"></video>
                <canvas id="whCameraCanvas" style="display:none;"></canvas>
                <div class="wh-scan-corner wh-sc-tl"></div>
                <div class="wh-scan-corner wh-sc-tr"></div>
                <div class="wh-scan-corner wh-sc-bl"></div>
                <div class="wh-scan-corner wh-sc-br"></div>
                <div class="wh-scan-status-bar" id="whScanStatus">Point camera at a part label</div>
            </div>
            <div class="wh-scan-info">
                <div id="whPutawayUi" class="wh-scan-stack">
                    <div id="whPartCard" class="wh-result-card" style="display:none;">
                        <div id="whPartThumb" class="wh-result-thumb"></div>
                        <div class="wh-result-body">
                            <div class="wh-result-title" id="whPartTitle"></div>
                            <div class="wh-result-meta" id="whPartMeta"></div>
                        </div>
                        <div class="wh-result-check">✓</div>
                    </div>
                    <div id="whRackCard" class="wh-result-card wh-result-card--rack" style="display:none;">
                        <div class="wh-result-thumb wh-result-thumb--rack">📍</div>
                        <div class="wh-result-body">
                            <div class="wh-result-title" id="whRackCode"></div>
                            <div class="wh-result-meta">Rack location scanned</div>
                        </div>
                        <div class="wh-result-check">✓</div>
                    </div>
                    <button id="whSaveBtn" class="btn-full-action" style="display:none; margin:12px 15px 4px;" onclick="whSaveLocation()">Save Location</button>
                    <button id="whResetBtn" class="wh-ghost-btn" style="display:none;" onclick="whResetScan()">Scan another part →</button>
                    <div id="whScanHint" class="wh-scan-hint">Scan the QR code on a part label first, then scan the rack location label.</div>
                </div>
            </div>
            <button onclick="whWorkerDone()" style="display:block;width:calc(100% - 24px);margin:18px 12px 30px;padding:13px;background:#16213e;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;">✓ Done — Close Scanner</button>
        </div>
    </div>`;
    whStartCamera();
}

function whWorkerDone() {
    whStopCamera();
    const n = _paSessionCount;
    document.body.innerHTML = `
    <div style="min-height:100vh;background:#1a1a2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;color:#fff;">
        <div style="font-size:52px;margin-bottom:14px;">✓</div>
        <div style="font-size:20px;font-weight:800;margin-bottom:6px;">All done</div>
        <div style="font-size:14px;color:#bbb;margin-bottom:26px;">${n} part${n !== 1 ? 's' : ''} put away this session</div>
        <button onclick="initPutAwayWorkerView(_whPutawayToken)" style="background:#f07020;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-size:14px;font-weight:800;cursor:pointer;">Scan more parts</button>
        <div style="font-size:12px;color:#777;margin-top:22px;">You can now close this tab.</div>
    </div>`;
}

function closeWarehouseDrawer() {
    whStopCamera();
    whClearLabels();
    // Restore the nav item that was active before — unless the user navigated elsewhere.
    const wasActive = document.getElementById('proNavWarehouse')?.classList.contains('pro-hdr-active');
    document.getElementById('proNavWarehouse')?.classList.remove('pro-hdr-active');
    if (wasActive && _proNavBeforeWarehouse) {
        document.getElementById(_proNavBeforeWarehouse)?.classList.add('pro-hdr-active');
    }
    _proNavBeforeWarehouse = null;
    toggleDrawer('warehouseDrawer', false);
}

function whClearLabels() {
    _whLabelCodes = [];
    const grid    = document.getElementById('whLabelGrid');
    const preview = document.getElementById('whLabelPreview');
    const manual  = document.getElementById('whManualCodes');
    if (grid)    grid.innerHTML      = '';
    if (preview) preview.style.display = 'none';
    if (manual)  manual.value        = '';
}

function whSetTab(tab) {
    const tabs = {
        labels:  { panel: 'whLabelsTab',  btn: 'whTabLabels',  display: '' },
        scanner: { panel: 'whScannerTab', btn: 'whTabScanner', display: 'flex' },
        lookup:  { panel: 'whLookupTab',  btn: 'whTabLookup',  display: '' },
    };
    whStopCamera();
    for (const [name, t] of Object.entries(tabs)) {
        const panel = document.getElementById(t.panel);
        const btn   = document.getElementById(t.btn);
        if (panel) panel.style.display = (name === tab) ? t.display : 'none';
        if (btn)   btn.classList.toggle('wh-tab--active', name === tab);
    }
    if (tab === 'scanner') {
        whSetScanMode('putaway');
        if (window.innerWidth < 900) whStartCamera();
    } else if (tab === 'lookup') {
        whLoadLookupAlerts();
        const input = document.getElementById('whLookupInput');
        if (input) setTimeout(() => input.focus(), 50);
    }
}

// ── Location Lookup ───────────────────────────────────────────────
// "What's in this rack?" — type a full bin for one shelf, or a rack/level
// prefix to see everything beneath it (R1 → R1.B2.L2.P1, R1.B3…).

async function whLookupLocation() {
    const input = document.getElementById('whLookupInput');
    const out   = document.getElementById('whLookupResults');
    if (!input || !out) return;
    const code = (input.value || '').trim().toUpperCase().replace(/[^A-Z0-9.\-_]/g, '');
    if (!code) { out.innerHTML = ''; return; }
    if (!sb || !currentUserId) { out.innerHTML = '<div class="wh-lookup-empty">Sign in required</div>'; return; }
    out.innerHTML = '<div class="wh-lookup-empty">Searching…</div>';
    // Exact bin OR children one level down by '.' or '-' separator (avoids R1 matching R10).
    const { data, error } = await sb.from('listings')
        .select('id, title, apc_id, price, condition, status, stock_number, warehouse_bin')
        .eq('seller_id', currentUserId)
        .or(`warehouse_bin.ilike.${code},warehouse_bin.ilike.${code}.%,warehouse_bin.ilike.${code}-%`)
        .order('warehouse_bin').order('status').limit(500);
    if (error) { out.innerHTML = `<div class="wh-lookup-empty">Error: ${escapeHtml(error.message)}</div>`; return; }
    whRenderLookupResults(data || [], code);
}

function whRenderLookupResults(rows, code) {
    const out = document.getElementById('whLookupResults');
    if (!out) return;
    if (!rows.length) {
        out.innerHTML = `<div class="wh-lookup-empty">No stock assigned to <strong>${escapeHtml(code)}</strong> yet.</div>`;
        return;
    }
    const groups = {};
    rows.forEach(r => { (groups[r.warehouse_bin] = groups[r.warehouse_bin] || []).push(r); });
    const bins = Object.keys(groups).sort();
    const activeCount = rows.filter(r => r.status === 'active').length;
    const condLabel = { new_oem: 'New·OEM', new_aftermarket: 'New·Aftermkt', used: 'Used', refurbished: 'Refurb', parts_only: 'Parts', excellent: 'Excellent', good: 'Good', fair: 'Fair', damaged: 'Damaged' };
    const badge = (s) => {
        const m = { active: ['Active', '#22c55e'], pending: ['Pending', '#f59e0b'], sold: ['Sold', '#ef4444'] };
        const [lbl, col] = m[s] || [s || '—', '#888'];
        return `<span class="wh-lk-badge" style="background:${col}22;color:${col};">${escapeHtml(lbl)}</span>`;
    };
    let html = `<div class="wh-lk-summary"><strong>${rows.length}</strong> part${rows.length !== 1 ? 's' : ''} under <strong>${escapeHtml(code)}</strong>` +
        `${bins.length > 1 ? ` · ${bins.length} bins` : ''} · ${activeCount} active</div>`;
    bins.forEach(bin => {
        const items = groups[bin];
        html += `<div class="wh-lk-bin"><div class="wh-lk-bin-hd"><span>${escapeHtml(bin)}</span><span class="wh-lk-count">${items.length}</span></div>`;
        items.forEach(r => {
            const apc  = escapeHtml(r.apc_id || ('APC-' + r.id));
            const meta = [apc, '$' + escapeHtml(String(r.price ?? '')), escapeHtml(condLabel[r.condition] || r.condition || ''), r.stock_number ? '#' + escapeHtml(r.stock_number) : ''].filter(Boolean).join(' · ');
            html += `<div class="wh-lk-row" onclick="whOpenListing('${r.id}')">` +
                `<div class="wh-lk-row-main"><div class="wh-lk-row-title">${escapeHtml(r.title || 'Untitled')}</div>` +
                `<div class="wh-lk-row-meta">${meta}</div></div>${badge(r.status)}</div>`;
        });
        html += `</div>`;
    });
    out.innerHTML = html;
}

function whOpenListing(id) {
    closeWarehouseDrawer();
    openItemDetail(id);
}

let _whLookupMode = 'location';

function whLookupSearch() {
    document.getElementById('whAlertPutaway')?.classList.remove('wh-lk-alert--active');
    document.getElementById('whAlertPull')?.classList.remove('wh-lk-alert--active');
    if (_whLookupMode === 'part') whLookupPart();
    else whLookupLocation();
}

function whSetLookupMode(mode) {
    _whLookupMode = mode;
    document.getElementById('whLkModeLocation')?.classList.toggle('wh-lk-mode--active', mode === 'location');
    document.getElementById('whLkModePart')?.classList.toggle('wh-lk-mode--active', mode === 'part');
    const input = document.getElementById('whLookupInput');
    const hint  = document.getElementById('whLookupHint');
    if (mode === 'part') {
        if (input) input.placeholder = 'Part name or APC ID — e.g. alternator or APC1340…';
        if (hint)  hint.textContent  = 'Find where a part lives — searches title and APC ID, and shows each part’s bin.';
    } else {
        if (input) input.placeholder = 'Rack or bin — e.g. R1 or R1.B2.L2.P1';
        if (hint)  hint.textContent  = 'Type a full bin (R1.B2.L2.P1) for one shelf, or a rack/level (R1, R1.B2) to see everything under it.';
    }
    const out = document.getElementById('whLookupResults');
    if (input && input.value.trim()) whLookupSearch();
    else if (out) out.innerHTML = '';
    input?.focus();
}

async function whLookupPart() {
    const input = document.getElementById('whLookupInput');
    const out   = document.getElementById('whLookupResults');
    if (!input || !out) return;
    const q = (input.value || '').trim();
    const safe = q.replace(/[^A-Za-z0-9 .\-]/g, ' ').trim(); // keep the .or() filter safe
    if (!safe) { out.innerHTML = ''; return; }
    if (!sb || !currentUserId) { out.innerHTML = '<div class="wh-lookup-empty">Sign in required</div>'; return; }
    out.innerHTML = '<div class="wh-lookup-empty">Searching…</div>';
    const { data, error } = await sb.from('listings')
        .select('id, title, apc_id, price, condition, status, stock_number, warehouse_bin')
        .eq('seller_id', currentUserId)
        .or(`apc_id.ilike.%${safe}%,title.ilike.%${safe}%`)
        .order('status').order('title').limit(100);
    if (error) { out.innerHTML = `<div class="wh-lookup-empty">Error: ${escapeHtml(error.message)}</div>`; return; }
    whRenderPartResults(data || [], q);
}

function whRenderPartResults(rows, q, opts = {}) {
    const out = document.getElementById('whLookupResults');
    if (!out) return;
    if (!rows.length) {
        out.innerHTML = `<div class="wh-lookup-empty">${opts.emptyMsg || `No parts match <strong>${escapeHtml(q)}</strong>.`}</div>`;
        return;
    }
    const condLabel = { new_oem: 'New·OEM', new_aftermarket: 'New·Aftermkt', used: 'Used', refurbished: 'Refurb', parts_only: 'Parts', excellent: 'Excellent', good: 'Good', fair: 'Fair', damaged: 'Damaged' };
    const badge = (s) => {
        const m = { active: ['Active', '#22c55e'], pending: ['Pending', '#f59e0b'], sold: ['Sold', '#ef4444'] };
        const [lbl, col] = m[s] || [s || '—', '#888'];
        return `<span class="wh-lk-badge" style="background:${col}22;color:${col};">${escapeHtml(lbl)}</span>`;
    };
    const located = rows.filter(r => r.warehouse_bin).length;
    const summary = opts.summary || `<strong>${rows.length}</strong> part${rows.length !== 1 ? 's' : ''} match · ${located} located`;
    let html = `<div class="wh-lk-summary">${summary}</div><div class="wh-lk-partlist">`;
    rows.forEach(r => {
        const apc  = escapeHtml(r.apc_id || ('APC-' + r.id));
        const meta = [apc, '$' + escapeHtml(String(r.price ?? '')), escapeHtml(condLabel[r.condition] || r.condition || ''), r.stock_number ? '#' + escapeHtml(r.stock_number) : ''].filter(Boolean).join(' · ');
        const bin  = r.warehouse_bin
            ? `<span class="wh-lk-binchip">📍 ${escapeHtml(r.warehouse_bin)}</span>`
            : `<span class="wh-lk-binchip wh-lk-binchip--none">No bin</span>`;
        html += `<div class="wh-lk-row" onclick="whOpenListing('${r.id}')">` +
            `<div class="wh-lk-row-main"><div class="wh-lk-row-title">${escapeHtml(r.title || 'Untitled')}</div>` +
            `<div class="wh-lk-row-meta">${meta}</div></div>` +
            `<div class="wh-lk-row-right">${bin}${badge(r.status)}</div></div>`;
    });
    html += `</div>`;
    out.innerHTML = html;
}

// Cleanup queues — proactive "to-do" chips. Needs put-away = active with no
// bin; To pull = sold but still holding a bin (go free the space).
async function whLoadLookupAlerts() {
    if (!sb || !currentUserId) return;
    const wrap = document.getElementById('whLookupAlerts');
    const paEl = document.getElementById('whAlertPutaway');
    const plEl = document.getElementById('whAlertPull');
    const [pa, pl] = await Promise.all([
        sb.from('listings').select('id', { count: 'exact', head: true })
            .eq('seller_id', currentUserId).eq('status', 'active').is('warehouse_bin', null),
        sb.from('listings').select('id', { count: 'exact', head: true })
            .eq('seller_id', currentUserId).eq('status', 'sold').not('warehouse_bin', 'is', null),
    ]);
    const paN = pa.count || 0, plN = pl.count || 0;
    if (paEl) {
        paEl.innerHTML = `📦 <span class="wh-lk-alert-n">${paN}</span> need put-away`;
        paEl.style.display = paN ? '' : 'none';
        paEl.classList.remove('wh-lk-alert--active');
    }
    if (plEl) {
        plEl.innerHTML = `📤 <span class="wh-lk-alert-n">${plN}</span> to pull`;
        plEl.style.display = plN ? '' : 'none';
        plEl.classList.remove('wh-lk-alert--active');
    }
    if (wrap) wrap.style.display = (paN || plN) ? 'flex' : 'none';
}

async function whShowQueue(type) {
    const out = document.getElementById('whLookupResults');
    if (!out || !sb || !currentUserId) return;
    document.getElementById('whAlertPutaway')?.classList.toggle('wh-lk-alert--active', type === 'putaway');
    document.getElementById('whAlertPull')?.classList.toggle('wh-lk-alert--active', type === 'pull');
    out.innerHTML = '<div class="wh-lookup-empty">Loading…</div>';
    let query = sb.from('listings')
        .select('id, title, apc_id, price, condition, status, stock_number, warehouse_bin')
        .eq('seller_id', currentUserId);
    query = (type === 'putaway')
        ? query.eq('status', 'active').is('warehouse_bin', null).order('title')
        : query.eq('status', 'sold').not('warehouse_bin', 'is', null).order('warehouse_bin');
    const { data, error } = await query.limit(500);
    if (error) { out.innerHTML = `<div class="wh-lookup-empty">Error: ${escapeHtml(error.message)}</div>`; return; }
    const n = (data || []).length;
    if (type === 'putaway') {
        whRenderPartResults(data || [], '', {
            emptyMsg: '✓ All active stock is shelved — nothing to put away.',
            summary: `<strong>${n}</strong> part${n !== 1 ? 's' : ''} need putting away`,
        });
    } else {
        whRenderPartResults(data || [], '', {
            emptyMsg: '✓ Nothing to pull — no sold stock still on a shelf.',
            summary: `<strong>${n}</strong> sold part${n !== 1 ? 's' : ''} still on the shelf — pull to free the bin`,
        });
    }
}

// ── Label Generator ───────────────────────────────────────────────

function whGenerateBatch() {
    const prefix = document.getElementById('whBatchPrefix')?.value.trim() || '';
    const from   = parseInt(document.getElementById('whBatchFrom')?.value) || 1;
    const to     = parseInt(document.getElementById('whBatchTo')?.value)   || 20;
    const pad    = parseInt(document.getElementById('whBatchPad')?.value)   || 2;
    if (from > to || to - from > 199) { showToast('Range must be 1–200 labels'); return; }
    const codes = [];
    for (let i = from; i <= to; i++) codes.push(prefix + String(i).padStart(pad, '0'));
    whRenderLabelPreview(codes);
}

function whGenerateManual() {
    const raw   = document.getElementById('whManualCodes')?.value || '';
    const codes = raw.split('\n').map(s => s.trim()).filter(Boolean);
    if (!codes.length) { showToast('Enter at least one code'); return; }
    whRenderLabelPreview(codes);
}

function whRenderLabelPreview(codes) {
    _whLabelCodes = codes;
    const grid    = document.getElementById('whLabelGrid');
    const preview = document.getElementById('whLabelPreview');
    const countEl = document.getElementById('whLabelCount');
    if (!grid || !preview) return;
    if (countEl) countEl.textContent = `${codes.length} label${codes.length !== 1 ? 's' : ''}`;
    grid.innerHTML = '';
    codes.forEach(code => {
        const card = document.createElement('div');
        card.className = 'wh-label-card';
        const qrWrap = document.createElement('div');
        qrWrap.className = 'wh-label-qr';
        card.appendChild(qrWrap);
        const label = document.createElement('div');
        label.className = 'wh-label-card-code';
        label.textContent = code;
        card.appendChild(label);
        grid.appendChild(card);
        if (window.QRCode) {
            new QRCode(qrWrap, { text: code, width: 72, height: 72, colorDark: '#1a1a1a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        }
    });
    preview.style.display = '';
}

function whPrintLabels() {
    if (!_whLabelCodes.length) return;
    const labelHtml = _whLabelCodes.map(code => {
        const fm = fitLabelTextMm(code, 90, 17, 9); // big single-line code, full width
        return `<div class="wl-label"><div class="wl-qr" data-code="${escapeHtml(code)}"></div><div class="wl-code" style="font-size:${fm}mm">${escapeHtml(code)}</div></div>`;
    }).join('');
    const win = window.open('', '_blank');
    if (!win) { showToast('Allow pop-ups to print labels'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>APC Warehouse Labels</title>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;background:#fff;}
  .wl-label{
    width:100mm;height:61.5mm;overflow:hidden;padding:3mm 4mm;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5mm;page-break-after:always;
  }
  .wl-label:last-child{page-break-after:avoid;}
  .wl-qr{width:36mm;flex-shrink:0;}
  .wl-qr canvas,.wl-qr img{display:block;width:100%!important;height:auto!important;}
  .wl-code{font-weight:900;letter-spacing:0.5px;text-align:center;color:#1a1a1a;line-height:1.0;word-break:break-all;max-width:100%;}
  @media print{
    @page{size:100mm 62mm;margin:0;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style></head><body>
${labelHtml}
<script>
  document.querySelectorAll('.wl-qr').forEach(el => {
    new QRCode(el, {text:el.getAttribute('data-code'),width:450,height:450,colorDark:'#1a1a1a',colorLight:'#ffffff'});
  });
  setTimeout(() => window.print(), 800);
<\/script></body></html>`);
    win.document.close();
}

// ── Put-Away Scanner ──────────────────────────────────────────────

function whStartCamera() {
    const video = document.getElementById('whCameraVideo');
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) { whSetStatus('Camera not supported on this device'); return; }
    if ('BarcodeDetector' in window && !_whBarcodeDetector) {
        try { _whBarcodeDetector = new BarcodeDetector({ formats: ['qr_code'] }); } catch(e) {}
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
        .then(stream => {
            _whCameraStream = stream;
            video.srcObject = stream;
            video.play();
            video.addEventListener('canplay', () => {
                if (_whScanMode === 'stocktake') {
                    _whScanState = 'stk_rack';
                    whSetStatus('Scan a rack label to start');
                } else {
                    _whScanState = 'scan_part';
                    whSetStatus('Point camera at a part label');
                }
                whScanLoop();
            }, { once: true });
        })
        .catch(() => whSetStatus('Camera access denied — check browser permissions'));
}

function whStopCamera() {
    if (_whRafId) { clearTimeout(_whRafId); _whRafId = null; }
    if (_whCameraStream) { _whCameraStream.getTracks().forEach(t => t.stop()); _whCameraStream = null; }
    _whScanState = 'idle';
}

async function whScanLoop() {
    if (!_whCameraStream || _whScanState === 'idle' || _whScanState === 'saved') return;
    const video = document.getElementById('whCameraVideo');
    if (!video || video.readyState < 2 || !video.videoWidth) { _whRafId = setTimeout(whScanLoop, 200); return; }

    // Native BarcodeDetector (Chrome/Android — hardware accelerated)
    if (_whBarcodeDetector) {
        try {
            const results = await _whBarcodeDetector.detect(video);
            if (results.length) { whHandleQR(results[0].rawValue); return; }
        } catch(e) {}
    }

    // jsQR fallback
    const canvas = document.getElementById('whCameraCanvas');
    if (canvas) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = (typeof jsQR !== 'undefined') && jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) { whHandleQR(code.data); return; }
    }

    _whRafId = setTimeout(whScanLoop, 150);
}

// Part labels encode just the APC ID (e.g. APC1340324429). Rack codes never start with APC.
function _whPartRef(data) {
    const t = (data || '').trim();
    return /^APC[-\d]/i.test(t) ? t : null;
}
async function _whFetchPart(apcId, cols) {
    if (!sb || !apcId) return null;
    if (_whPutawayToken) {
        // No-login worker: look up via the token-scoped RPC, shaped like a listings row.
        const { data } = await sb.rpc('putaway_lookup_part', { p_token: _whPutawayToken, p_apc_id: apcId });
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return null;
        return { id: row.id, title: row.title, apc_id: row.apc_id,
                 listing_images: row.image ? [{ storage_path: row.image, position: 0 }] : [],
                 listing_vehicles: [] };
    }
    if (!currentUserId) return null;
    const { data } = await sb.from('listings').select(cols).eq('seller_id', currentUserId).eq('apc_id', apcId).single();
    return data;
}

async function whHandleQR(data) {
    if (_whScanState === 'scan_part') {
        const ref = _whPartRef(data);
        if (!ref) { _whRafId = requestAnimationFrame(whScanLoop); return; }
        whSetStatus('Fetching part…');
        if (!sb) { showToast('Not signed in'); return; }
        const row = await _whFetchPart(ref, 'id, title, apc_id, listing_images(storage_path, position), listing_vehicles(make, model)');
        if (!row) { whSetStatus('Part not found or not yours — try again'); _whRafId = requestAnimationFrame(whScanLoop); return; }
        const thumb  = (row.listing_images || []).sort((a,b) => a.position - b.position)[0]?.storage_path || '';
        const v      = (row.listing_vehicles || [])[0];
        const vehicle = v ? `${v.make} ${v.model}` : '';
        _whScannedPart = { id: row.id, title: row.title, apcId: row.apc_id, thumb, vehicle };
        whShowPartCard();
        _whScanState = 'scan_rack';
        whSetStatus('Now scan the rack location label');
        _whRafId = requestAnimationFrame(whScanLoop);
    } else if (_whScanState === 'scan_rack') {
        // Any QR that isn't a part = rack location
        if (_whPartRef(data)) { _whRafId = requestAnimationFrame(whScanLoop); return; }
        _whScannedRack = data.trim();
        whShowRackCard();
        _whScanState = 'saved';
        whSetStatus('Ready to save');
    } else if (_whScanState === 'stk_rack') {
        // Stocktake: first scan the rack to load its expected list.
        if (_whPartRef(data)) { _whRafId = setTimeout(whScanLoop, 250); return; }
        _stkRack = data.trim();
        whSetStatus('Loading expected list…');
        await _stkLoadExpected();
        _whScanState = 'stk_scanning';
        whSetStatus('Scan each part on the shelf');
        _whRafId = setTimeout(whScanLoop, 400);
    } else if (_whScanState === 'stk_scanning') {
        const ref = _whPartRef(data);
        if (ref) await _stkHandlePartScan(ref);
        _whRafId = setTimeout(whScanLoop, 120);
    }
}

function whShowPartCard() {
    const card  = document.getElementById('whPartCard');
    const title = document.getElementById('whPartTitle');
    const meta  = document.getElementById('whPartMeta');
    const thumb = document.getElementById('whPartThumb');
    const hint  = document.getElementById('whScanHint');
    if (!card) return;
    if (title) title.textContent = _whScannedPart.title;
    if (meta)  meta.textContent  = [_whScannedPart.apcId, _whScannedPart.vehicle].filter(Boolean).join(' · ');
    if (thumb) {
        thumb.innerHTML = _whScannedPart.thumb
            ? `<img src="${escapeHtml(_whScannedPart.thumb)}" alt="">`
            : '📦';
    }
    card.style.display = 'flex';
    if (hint) hint.style.display = 'none';
}

function whShowRackCard() {
    const card       = document.getElementById('whRackCard');
    const codeEl     = document.getElementById('whRackCode');
    const saveBtn    = document.getElementById('whSaveBtn');
    if (codeEl)      codeEl.textContent       = _whScannedRack;
    if (card)        card.style.display       = 'flex';
    if (saveBtn)     saveBtn.style.display    = '';
}

async function whSaveLocation() {
    if (!_whScannedPart?.id || !_whScannedRack) return;
    const saveBtn = document.getElementById('whSaveBtn');
    if (saveBtn) saveBtn.textContent = 'Saving…';
    let ok = false, errMsg = '';
    if (_whPutawayToken) {
        const { data, error } = await sb.rpc('putaway_set_bin', { p_token: _whPutawayToken, p_listing_id: _whScannedPart.id, p_bin: _whScannedRack });
        ok = !error && !!data; errMsg = error?.message || (!data ? 'Part not found for this yard' : '');
    } else {
        const { error } = await sb.from('listings')
            .update({ warehouse_bin: _whScannedRack })
            .eq('id', _whScannedPart.id)
            .eq('seller_id', currentUserId);
        ok = !error; errMsg = error?.message || '';
    }
    if (!ok) { showToast('Error: ' + errMsg); if (saveBtn) saveBtn.textContent = 'Save Location'; return; }
    showToast(`📍 Saved: ${_whScannedPart.title} → ${_whScannedRack}`);
    if (_whPutawayToken) _paSessionCount++;
    if (saveBtn)  saveBtn.style.display  = 'none';
    const resetBtn = document.getElementById('whResetBtn');
    if (resetBtn) resetBtn.style.display = '';
    whSetStatus('Saved! Tap "Scan another part" to continue');
    // Update local cache (signed-in boss only — worker view has no userListings)
    if (!_whPutawayToken) {
        const local = userListings.find(l => l.supabaseId === _whScannedPart.id || l.id === _whScannedPart.id);
        if (local) local.warehouseBin = _whScannedRack;
    }
}

function whResetScan() {
    _whScannedPart = null;
    _whScannedRack = null;
    _whScanState   = 'scan_part';
    const partCard   = document.getElementById('whPartCard');
    const rackCard   = document.getElementById('whRackCard');
    const saveBtn    = document.getElementById('whSaveBtn');
    const resetBtn   = document.getElementById('whResetBtn');
    const hint       = document.getElementById('whScanHint');
    if (partCard)   { partCard.style.display   = 'none'; }
    if (rackCard)   { rackCard.style.display   = 'none'; }
    if (saveBtn)    { saveBtn.style.display    = 'none'; saveBtn.textContent = 'Save Location'; }
    if (resetBtn)   { resetBtn.style.display   = 'none'; }
    if (hint)       { hint.style.display       = ''; }
    whSetStatus('Point camera at a part label');
    whScanLoop();
}

function whSetStatus(msg) {
    const el = document.getElementById('whScanStatus');
    if (el) el.textContent = msg;
}

// ── Stocktake (mobile) ────────────────────────────────────────────
// Scan a rack → load its expected parts → scan each to tick off →
// report missing (expected, not scanned) vs misfiled (scanned, belongs elsewhere).

function whSetScanMode(mode) {
    _whScanMode = mode;
    document.getElementById('whModePutaway')?.classList.toggle('wh-scan-mode--active', mode === 'putaway');
    document.getElementById('whModeStocktake')?.classList.toggle('wh-scan-mode--active', mode === 'stocktake');
    const putawayUi = document.getElementById('whPutawayUi');
    const stkPanel  = document.getElementById('whStkPanel');
    if (putawayUi) putawayUi.style.display = mode === 'putaway' ? '' : 'none';
    if (stkPanel)  stkPanel.style.display  = mode === 'stocktake' ? '' : 'none';
    if (mode === 'stocktake') whStkReset();
    else whResetScan();
}

function whStkReset() {
    _stkRack = ''; _stkExpected = []; _stkExtras = [];
    _stkLastId = null; _stkLastTime = 0;
    _whScanState = 'stk_rack';
    const rackBar = document.getElementById('whStkRackBar');
    const hint    = document.getElementById('whStkHint');
    const list    = document.getElementById('whStkList');
    const extras  = document.getElementById('whStkExtrasWrap');
    const actions = document.getElementById('whStkActions');
    if (rackBar) rackBar.style.display = 'none';
    if (hint)  { hint.style.display = ''; hint.textContent = 'Scan a rack label to start the stocktake.'; }
    if (list)  list.innerHTML = '';
    if (extras) extras.style.display = 'none';
    if (actions) { actions.style.display = 'none'; actions.innerHTML = `<button class="btn-full-action" style="margin:12px 15px 4px;" onclick="whStkFinish()">Finish Stocktake</button><button class="wh-ghost-btn" onclick="whStkReset()">Restart</button>`; }
    whSetStatus('Scan a rack label to start');
    whScanLoop();
}

async function _stkLoadExpected() {
    if (!sb || !currentUserId || !_stkRack) return;
    const { data } = await sb.from('listings')
        .select('id, title, apc_id, status')
        .eq('seller_id', currentUserId)
        .ilike('warehouse_bin', _stkRack)
        .in('status', ['active', 'pending'])
        .order('title').limit(500);
    _stkExpected = (data || []).map(r => ({ id: r.id, title: r.title, apcId: r.apc_id, status: r.status, scanned: false }));
    _stkExtras = [];
    const rackBar = document.getElementById('whStkRackBar');
    const hint    = document.getElementById('whStkHint');
    const actions = document.getElementById('whStkActions');
    if (rackBar) rackBar.style.display = 'flex';
    if (hint) hint.style.display = 'none';
    if (actions) actions.style.display = '';
    _stkRenderChecklist();
}

function _stkRenderChecklist() {
    const found = _stkExpected.filter(e => e.scanned).length;
    const total = _stkExpected.length;
    const rackBar = document.getElementById('whStkRackBar');
    if (rackBar) rackBar.innerHTML = `📍 <strong>${escapeHtml(_stkRack)}</strong><span class="wh-stk-tally">${found}/${total} found</span>`;
    const list = document.getElementById('whStkList');
    if (list) {
        list.innerHTML = total
            ? _stkExpected.map(e => `<div class="wh-stk-row ${e.scanned ? 'is-found' : ''}"><span class="wh-stk-check">${e.scanned ? '✓' : '○'}</span><div class="wh-stk-row-main"><div class="wh-stk-row-title">${escapeHtml(e.title)}</div><div class="wh-stk-row-meta">${escapeHtml(e.apcId || '')}${e.status === 'pending' ? ' · PENDING' : ''}</div></div></div>`).join('')
            : '<div class="wh-scan-hint">No active parts assigned to this rack.</div>';
    }
    _stkRenderExtras();
}

async function _stkHandlePartScan(apcId) {
    const now = Date.now();
    if (apcId === _stkLastId && now - _stkLastTime < 2500) return; // debounce repeats
    _stkLastId = apcId; _stkLastTime = now;
    const match = (e) => String(e.apcId) === String(apcId);
    const item = _stkExpected.find(match);
    if (item) {
        if (!item.scanned) { item.scanned = true; if (navigator.vibrate) navigator.vibrate(40); whSetStatus(`✓ ${item.title}`); }
        _stkRenderChecklist();
        return;
    }
    if (_stkExtras.find(match)) return;
    const row = await _whFetchPart(apcId, 'id, title, apc_id, status, warehouse_bin');
    if (!row) { whSetStatus('Part not found or not yours'); return; }
    _stkExtras.push({ id: row.id, title: row.title, apcId: row.apc_id, status: row.status, bin: row.warehouse_bin || '' });
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
    whSetStatus(`⚠ ${row.title} — ${row.warehouse_bin ? 'assigned ' + row.warehouse_bin : 'no bin set'}`);
    _stkRenderExtras();
}

function _stkRenderExtras() {
    const wrap = document.getElementById('whStkExtrasWrap');
    const list = document.getElementById('whStkExtras');
    const moveBtn = document.getElementById('whStkMoveBtn');
    if (!wrap || !list) return;
    if (!_stkExtras.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    list.innerHTML = _stkExtras.map(e => `<div class="wh-stk-row is-extra"><span class="wh-stk-check">⚠</span><div class="wh-stk-row-main"><div class="wh-stk-row-title">${escapeHtml(e.title)}</div><div class="wh-stk-row-meta">${escapeHtml(e.apcId || '')} · ${e.bin ? 'assigned ' + escapeHtml(e.bin) : 'no bin'}${e.status === 'sold' ? ' · SOLD' : ''}</div></div></div>`).join('');
    if (moveBtn) { moveBtn.style.display = ''; moveBtn.textContent = `Move ${_stkExtras.length} to ${_stkRack}`; }
}

async function whStkMoveExtras() {
    if (!_stkExtras.length || !sb || !currentUserId) return;
    const ids = _stkExtras.map(e => e.id);
    const { error } = await sb.from('listings').update({ warehouse_bin: _stkRack }).in('id', ids).eq('seller_id', currentUserId);
    if (error) { showToast('Error: ' + error.message); return; }
    ids.forEach(id => { const l = userListings.find(x => x.supabaseId === id || x.id === id); if (l) l.warehouseBin = _stkRack; });
    showToast(`📍 Moved ${ids.length} part${ids.length !== 1 ? 's' : ''} to ${_stkRack}`);
    _stkExtras.forEach(e => { if (!_stkExpected.find(x => String(x.id) === String(e.id))) _stkExpected.push({ id: e.id, title: e.title, apcId: e.apcId, status: e.status, scanned: true }); });
    _stkExtras = [];
    _stkRenderChecklist();
}

function whStkFinish() {
    _whScanState = 'saved'; // stop scanning
    const found   = _stkExpected.filter(e => e.scanned);
    const missing = _stkExpected.filter(e => !e.scanned);
    const list    = document.getElementById('whStkList');
    const hint    = document.getElementById('whStkHint');
    const actions = document.getElementById('whStkActions');
    if (hint) hint.style.display = 'none';
    if (list) {
        let html = `<div class="wh-stk-stat"><strong>${found.length}</strong> found · <strong>${missing.length}</strong> missing · <strong>${_stkExtras.length}</strong> misfiled</div>`;
        if (missing.length) {
            html += `<div class="wh-stk-section-label">Missing — expected here, not scanned</div>` +
                missing.map(e => `<div class="wh-stk-row is-missing"><span class="wh-stk-check">✗</span><div class="wh-stk-row-main"><div class="wh-stk-row-title">${escapeHtml(e.title)}</div><div class="wh-stk-row-meta">${escapeHtml(e.apcId || '')}</div></div></div>`).join('');
        } else if (_stkExpected.length) {
            html += `<div class="wh-scan-hint">✓ All expected parts accounted for.</div>`;
        }
        list.innerHTML = html;
    }
    if (actions) actions.innerHTML = `<button class="wh-ghost-btn" onclick="whStkReset()">New stocktake →</button>`;
    whSetStatus(`Done · ${found.length}/${_stkExpected.length} found`);
}

// --- TRADE / PRO ONBOARDING ---

function showOnboardingIfNeeded() {
    if (!document.getElementById('onboardingOverlay')) _buildOnboardingOverlay();
    _openOnboardingOverlay();
}

function _buildOnboardingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
        <div class="onb-container">
            <div class="onb-top-bar">
                <div class="onb-logo">APC</div>
                <button class="onb-skip-link" onclick="onboardSkip()">Do it later</button>
            </div>
            <div class="onb-screen">
                <h2 class="onb-heading">Welcome to APC!</h2>
                <p class="onb-subhead">To help us match your business with the right customers, set up your Trade profile now — it only takes a few minutes.</p>
                <div class="onb-checklist">
                    <div class="onb-check-item">✓ &nbsp;Business contact details &amp; address</div>
                    <div class="onb-check-item">✓ &nbsp;Services you offer</div>
                    <div class="onb-check-item">✓ &nbsp;Vehicle makes you specialise in</div>
                    <div class="onb-check-item">✓ &nbsp;Business hours</div>
                </div>
                <button class="onb-btn-primary" onclick="_closeOnboardingOverlay(); openWorkshopProfileEditor();">Set up my profile now</button>
                <button class="onb-btn-later" onclick="onboardSkip()">Do it later</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function _openOnboardingOverlay() {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function onboardSkip() {
    _closeOnboardingOverlay();
    if (!currentUserId || !sb) return;
    await sb.from('profiles').update({
        workshop_data: { biz_type: userSettings.businessType || 'service', _onboard_skipped: true },
    }).eq('id', currentUserId);
}

function _closeOnboardingOverlay() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

function _showOnboardingReminder() {
    if (!currentUserId) return;
    const key = `apc.onbRemind.${currentUserId}`;
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    if (count >= 3) return;
    localStorage.setItem(key, String(count + 1));
    if (document.getElementById('onbReminderBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'onbReminderBanner';
    banner.className = 'onb-reminder-banner';
    banner.innerHTML = `
        <div class="onb-reminder-inner">
            <div class="onb-reminder-text">
                <strong>Your profile is incomplete</strong>
                <span>Complete your setup to appear in workshop searches.</span>
            </div>
            <button class="onb-reminder-cta" onclick="showOnboardingIfNeeded(); document.getElementById('onbReminderBanner').remove();">Set up now</button>
            <button class="onb-reminder-close" onclick="document.getElementById('onbReminderBanner').remove();" aria-label="Dismiss">×</button>
        </div>`;
    document.body.appendChild(banner);
}

function _updateObMakesBtn() {} // stub — kept so _updateMakesSummary call is harmless

// --- VSC: search + status change + photo lightbox ---
let _vscCurrentJobId = null;
let _vscCurrentJob   = null;
let _vscAllParts     = [];
let _vscPhotos       = [];
let _vscPhotoIdx     = 0;

function _vscEditVehicle() {
    const card = document.getElementById('vscVehicleCard');
    if (!card || !_vscCurrentJob) return;
    const j = _vscCurrentJob;
    const f = (key, label, val, type = 'text') =>
        `<div style="margin-bottom:10px;">
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;color:#aaa;margin-bottom:3px;">${label}</label>
            <input id="vscEd_${key}" type="${type}" value="${escapeHtml(String(val || ''))}"
                style="width:100%;padding:8px 10px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;"
                onfocus="this.style.borderColor='#f07020'" onblur="this.style.borderColor='#e0e0e0'">
        </div>`;
    card.innerHTML = `
        <div class="vsc-section-title">Edit Vehicle Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">
            ${f('year','Year',j.year,'number')}
            ${f('make','Make',j.make)}
            ${f('model','Model',j.model)}
            ${f('series','Series / Variant',j.series)}
            ${f('stock_number','Stock #',j.stock_number)}
            ${f('vin','VIN / Chassis',j.vin)}
            ${f('colour','Colour',j.colour)}
            ${f('odometer','Odometer (km)',j.odometer,'number')}
            ${f('body_type','Body Type',j.body_type)}
            ${f('engine_code','Engine Code',j.engine_code)}
            ${f('variant','Engine / Variant',j.variant)}
            ${f('transmission_type','Transmission',j.transmission_type)}
            ${f('transmission_code','Trans Code',j.transmission_code)}
            ${f('paint_code','Paint Code',j.paint_code)}
            ${f('build_date','Build Date',j.build_date)}
        </div>
        <div style="display:flex;gap:10px;margin-top:4px;">
            <button onclick="_vscCancelEditVehicle()" style="flex:1;padding:11px;border:1.5px solid #ddd;color:#888;background:#fff;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;">Cancel</button>
            <button onclick="_vscSaveVehicle()" style="flex:2;padding:11px;background:#f07020;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;">Save Changes</button>
        </div>`;
}

function _vscCancelEditVehicle() {
    // Re-render the details view from cached job
    const card = document.getElementById('vscVehicleCard');
    if (!card || !_vscCurrentJob) return;
    const j = _vscCurrentJob;
    const details = [
        ['Make', j.make], ['Model', j.model], ['Year', j.year],
        ['Series', j.series], ['Body Type', j.body_type],
        ['Colour', j.colour], ['Odometer', j.odometer ? `${Number(j.odometer).toLocaleString()} km` : null],
        ['Engine Code', j.engine_code], ['Transmission', j.transmission_type || j.transmission_code],
        ['VIN / Chassis', j.vin], ['Paint Code', j.paint_code],
        ['Build Date', j.build_date], ['Stock Number', j.stock_number],
    ].filter(([, v]) => v);
    card.innerHTML = `
        <div class="vsc-section-title" style="display:flex;align-items:center;justify-content:space-between;">
            Vehicle Details
            <button onclick="_vscEditVehicle()" style="background:none;border:1.5px solid #f07020;color:#f07020;border-radius:6px;padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">Edit</button>
        </div>
        <dl class="vsc-dl" id="vscVehicleDl">
            ${details.map(([k, v]) => `<div class="vsc-dl-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('')}
        </dl>`;
}

// ─── VSC vehicle photos — view + edit (add / remove) ──────────────────────
let _vscPhotosEdit = [];

function _vscPhotoSectionHTML() {
    const photos = _vscPhotos || [];
    const strip = photos.length
        ? `<div class="vsc-photos">${photos.map((u, i) => `<img class="vsc-photo" src="${escapeHtml(u)}" alt="" onclick="_vscOpenPhoto(${i})" style="cursor:zoom-in;">`).join('')}</div>`
        : `<div class="vsc-photos-empty">No vehicle photos yet</div>`;
    return `
        <div class="vsc-photo-hdr">
            <span class="vsc-section-title" style="margin-bottom:0;">Vehicle Photos${photos.length ? ` (${photos.length})` : ''}</span>
            <button class="vsc-photo-edit-btn" onclick="_vscEditPhotos()">${photos.length ? 'Edit Photos' : '+ Add Photos'}</button>
        </div>
        ${strip}`;
}

function _vscEditPhotos() {
    _vscPhotosEdit = [..._vscPhotos];
    _vscRenderPhotoEdit();
}

function _vscRenderPhotoEdit() {
    const sec = document.getElementById('vscPhotoSection');
    if (!sec) return;
    const tiles = _vscPhotosEdit.map((u, i) => `
        <div class="vsc-photo-edit-tile">
            <img src="${escapeHtml(u)}" alt="">
            <button class="vsc-photo-remove" onclick="_vscRemovePhoto(${i})" title="Remove photo">✕</button>
        </div>`).join('');
    sec.innerHTML = `
        <div class="vsc-photo-hdr">
            <span class="vsc-section-title" style="margin-bottom:0;">Edit Photos (${_vscPhotosEdit.length})</span>
            <div style="display:flex;gap:8px;">
                <button class="vsc-photo-edit-btn" onclick="_vscCancelEditPhotos()">Cancel</button>
                <button class="vsc-photo-save-btn" onclick="_vscSavePhotos()">Done</button>
            </div>
        </div>
        <div class="vsc-photos vsc-photos-edit">
            ${tiles}
            <label class="vsc-photo-add-tile">
                <input type="file" accept="image/*" multiple style="display:none" onchange="_vscAddPhotos(this)">
                <span>+ Add</span>
            </label>
        </div>`;
}

function _vscRemovePhoto(idx) {
    _vscPhotosEdit.splice(idx, 1);
    _vscRenderPhotoEdit();
}

async function _vscAddPhotos(input) {
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || !_vscCurrentJobId || !sb) return;
    showToast('Uploading…');
    const urls = [];
    for (let i = 0; i < files.length; i++) {
        try {
            const b64 = await _fileToBase64(files[i]);
            if (!b64?.startsWith('data:')) continue;
            const compressed = await compressBase64(b64, 1600, 0.88);
            const blob = await (await fetch(compressed)).blob();
            const path = `vehicle-photos/${_vscCurrentJobId}/${Date.now()}_${i}.jpg`;
            const { error } = await sb.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (!error) { const { data } = sb.storage.from('listing-images').getPublicUrl(path); urls.push(data.publicUrl); }
        } catch (_) {}
    }
    if (!urls.length) { showToast('Upload failed'); return; }
    _vscPhotosEdit.push(...urls);
    _vscRenderPhotoEdit();
    showToast(`${urls.length} photo${urls.length !== 1 ? 's' : ''} added`);
}

async function _vscSavePhotos() {
    if (!_vscCurrentJobId || !sb) return;
    const { error } = await sb.from('dismantling_jobs').update({ vehicle_photos: _vscPhotosEdit }).eq('id', _vscCurrentJobId);
    if (error) { showToast('Save failed: ' + error.message); return; }
    _vscPhotos = [..._vscPhotosEdit];
    if (_vscCurrentJob) _vscCurrentJob.vehicle_photos = _vscPhotos;
    const sec = document.getElementById('vscPhotoSection');
    if (sec) sec.innerHTML = _vscPhotoSectionHTML();
    showToast('Photos saved');
}

function _vscCancelEditPhotos() {
    const sec = document.getElementById('vscPhotoSection');
    if (sec) sec.innerHTML = _vscPhotoSectionHTML();
}

async function _vscSaveVehicle() {
    if (!_vscCurrentJob || !_vscCurrentJobId) return;
    const get = key => document.getElementById(`vscEd_${key}`)?.value.trim() || null;
    const updates = {
        year: get('year') ? Number(get('year')) : null,
        make: get('make'), model: get('model'), series: get('series'),
        stock_number: get('stock_number'), vin: get('vin'), colour: get('colour'),
        odometer: get('odometer') ? Number(get('odometer')) : null,
        body_type: get('body_type'), engine_code: get('engine_code'), variant: get('variant'),
        transmission_type: get('transmission_type'), transmission_code: get('transmission_code'),
        paint_code: get('paint_code'), build_date: get('build_date'),
    };
    const saveBtn = document.querySelector('#vscVehicleCard button[onclick="_vscSaveVehicle()"]');
    if (saveBtn) saveBtn.textContent = 'Saving…';
    const { error } = await sb.from('dismantling_jobs').update(updates).eq('id', _vscCurrentJobId);
    if (error) { showToast('Save failed: ' + error.message); if (saveBtn) saveBtn.textContent = 'Save Changes'; return; }
    Object.assign(_vscCurrentJob, updates);
    // Also sync the stub in the EDW stock list so the card title updates
    if (typeof _edwStock !== 'undefined') {
        const stub = _edwStock.find(j => j.id === _vscCurrentJobId);
        if (stub) Object.assign(stub, updates);
    }
    // Always stamp donor fields onto the parts (idempotent) — repairs parts published
    // before they were ever synced, even when nothing changed in this save.
    const n = await _backfillJobToListings(_vscCurrentJobId, _donorFieldsFromJob(_vscCurrentJob));
    showToast(n ? `Synced to ${n} listed part${n !== 1 ? 's' : ''}` : 'Vehicle details saved');
    openVehicleStockCard(_vscCurrentJobId); // re-render the stock card in place — stay on the VSC, not EDW
}

function _vscBuildPartRows(parts) {
    const fmt = n => n != null ? `$${Number(n).toLocaleString('en-AU')}` : '—';
    if (!parts.length) return `<tr><td colspan="4" style="padding:20px;text-align:center;color:#aaa;">No parts listed yet — open in EDW to start dismantling.</td></tr>`;
    return parts.map(p => {
        const sc = { active:'vsc-part-active', pending:'vsc-part-pending', sold:'vsc-part-sold' }[p.status] || '';
        const sl = { active:'Active', pending:'Pending', sold:'Sold' }[p.status] || (p.status || 'Active');
        return `<tr class="vsc-part-row" onclick="_vscViewPart('${p.id}')">
            <td class="vsc-part-name">${escapeHtml(p.title)}</td>
            <td class="vsc-part-sn">${escapeHtml(p.stock_number || '—')}</td>
            <td class="vsc-part-price">${fmt(p.price)}</td>
            <td><span class="vsc-status-chip ${sc} vsc-status-tap" onclick="_vscStatusPicker(event,${p.id},'${p.status||'active'}')">${sl} ▾</span></td>
        </tr>`;
    }).join('');
}

function _vscFilterParts(q) {
    const lq = (q || '').toLowerCase();
    const filtered = lq ? _vscAllParts.filter(p =>
        (p.title||'').toLowerCase().includes(lq) ||
        (p.stock_number||'').toLowerCase().includes(lq)
    ) : _vscAllParts;
    const tbody = document.getElementById('vscPartsBody');
    if (tbody) tbody.innerHTML = _vscBuildPartRows(filtered);
}

function _vscViewPart(partId) {
    const overlay = document.getElementById('detailOverlay');
    if (overlay) overlay.classList.add('vsc-modal');
    openItemDetail(partId);
}

function _vscOpenPhoto(idx) {
    _vscPhotoIdx = idx;
    document.getElementById('vscPhotoLightbox')?.remove();
    const total = _vscPhotos.length;
    const url   = _vscPhotos[idx];
    if (!url) return;
    const lb = document.createElement('div');
    lb.id = 'vscPhotoLightbox';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:4500;display:flex;align-items:center;justify-content:center;';
    lb.onclick = e => { if (e.target === lb) lb.remove(); };
    // All controls are inside a wrapper sized to the image — so arrows/close sit ON the image
    lb.innerHTML = `
        <div style="position:relative;max-width:92vw;max-height:88vh;line-height:0;">
            <img id="vscLbImg" src="${escapeHtml(url)}" alt="" style="max-width:92vw;max-height:88vh;object-fit:contain;border-radius:6px;display:block;">
            <button onclick="document.getElementById('vscPhotoLightbox')?.remove()"
                style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.45);border:none;color:#fff;font-size:22px;font-weight:300;cursor:pointer;line-height:1;padding:0;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;">✕</button>
            ${total > 1 ? `<div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.4);color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;pointer-events:none;">${idx+1} / ${total}</div>` : ''}
            ${total > 1 ? `
                <button onclick="event.stopPropagation();_vscPhotoNav(-1)" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.45);border:none;color:#fff;font-size:28px;cursor:pointer;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;">&#8249;</button>
                <button onclick="event.stopPropagation();_vscPhotoNav(1)"  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.45);border:none;color:#fff;font-size:28px;cursor:pointer;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;">&#8250;</button>
            ` : ''}
        </div>`;
    document.body.appendChild(lb);
}

function _vscPhotoNav(dir) {
    _vscPhotoIdx = (_vscPhotoIdx + dir + _vscPhotos.length) % _vscPhotos.length;
    const img = document.getElementById('vscLbImg');
    if (img) img.src = _vscPhotos[_vscPhotoIdx];
    const counter = document.querySelector('#vscPhotoLightbox div');
    if (counter && counter.style.pointerEvents === 'none') counter.textContent = `${_vscPhotoIdx + 1} / ${_vscPhotos.length}`;
}

function _vscStatusPicker(e, partId, currentStatus) {
    e.stopPropagation();
    document.getElementById('vscStatusMenu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'vscStatusMenu';
    const x = Math.min(e.clientX, window.innerWidth - 150);
    const y = Math.min(e.clientY + 8, window.innerHeight - 130);
    menu.style.cssText = `position:fixed;top:${y}px;left:${Math.max(10,x)}px;background:#fff;border:1px solid #eee;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:4100;min-width:130px;padding:6px 0;`;
    ['active','pending','sold'].forEach(s => {
        const opt = document.createElement('div');
        opt.textContent = s === 'active' ? '● Active' : s === 'pending' ? '⏳ Pending' : '✓ Sold';
        opt.style.cssText = `padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;color:${s===currentStatus?'#f07020':'#333'};`;
        opt.onmouseenter = () => opt.style.background = '#f9f9f9';
        opt.onmouseleave = () => opt.style.background = '';
        opt.onclick = () => { menu.remove(); _vscChangeStatus(partId, s); };
        menu.appendChild(opt);
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }), 10);
}

async function _vscChangeStatus(partId, status) {
    const { error } = await sb.from('listings').update({ status }).eq('id', partId);
    if (error) { showToast('Failed to update status'); return; }
    const part = _vscAllParts.find(p => p.id === partId);
    if (part) part.status = status;
    const listing = userListings.find(l => l.supabaseId === partId || l.id === partId);
    if (listing) { listing.status = status === 'active' ? undefined : status; saveUserListings(); renderMainGrid(); renderMyParts(); }
    const tbody = document.getElementById('vscPartsBody');
    if (tbody) tbody.innerHTML = _vscBuildPartRows(_vscAllParts);
    showToast(status === 'sold' ? 'Marked as sold' : status === 'pending' ? 'Marked as pending' : 'Relisted as active');
}

// --- LISTING SHARE PROMPT ---
let _lspUrl = '', _lspTitle = '', _lspText = '';

function _showListingSharePrompt(listing) {
    const id = listing.supabaseId || listing.id;
    if (!id) return;
    _lspUrl   = `${location.origin}${location.pathname}?item=${id}`;
    _lspTitle = listing.title || 'Part listing';
    _lspText  = `${listing.title} — $${listing.price} | Auto Parts Connection`;

    document.getElementById('listingSharePrompt')?.remove();
    const el = document.createElement('div');
    el.id = 'listingSharePrompt';
    el.className = 'lsp-wrap';
    const hasNative = !!navigator.share;
    el.innerHTML = `
        <div class="lsp-backdrop" onclick="document.getElementById('listingSharePrompt')?.remove()"></div>
        <div class="lsp-sheet">
            <button class="lsp-close" onclick="document.getElementById('listingSharePrompt')?.remove()">×</button>
            <div class="lsp-heading">Your listing is live!</div>
            <div class="lsp-sub">Share it to reach more buyers</div>
            <div class="lsp-grid${hasNative ? ' has-native' : ''}">
                ${hasNative ? '<button class="lsp-btn lsp-native" onclick="_lspNativeShare()">Share via&hellip;</button>' : ''}
                <button class="lsp-btn lsp-fb" onclick="_lspFacebook()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    Facebook
                </button>
                <button class="lsp-btn lsp-wa" onclick="_lspWhatsApp()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    WhatsApp
                </button>
                <button class="lsp-btn lsp-x" onclick="_lspX()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L2.013 2.25H8.08l4.256 5.647 5.908-5.647zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Post on X
                </button>
                <button class="lsp-btn lsp-copy" onclick="_lspCopyLink()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Link
                </button>
            </div>
        </div>`;
    document.body.appendChild(el);
    // Fade + lift animation
    const sheet = el.querySelector('.lsp-sheet');
    sheet.style.opacity = '0';
    sheet.style.transform = 'translateY(16px)';
    requestAnimationFrame(() => {
        sheet.style.transition = 'opacity 0.22s ease, transform 0.25s cubic-bezier(0.22,1,0.36,1)';
        sheet.style.opacity   = '1';
        sheet.style.transform = 'translateY(0)';
    });
}

function _lspNativeShare() {
    navigator.share({ title: _lspTitle, text: _lspText, url: _lspUrl }).catch(() => {});
}
function _lspFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(_lspUrl)}`, '_blank', 'noopener,width=600,height=500');
}
function _lspWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(_lspText + ' ' + _lspUrl)}`, '_blank', 'noopener');
}
function _lspX() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(_lspText)}&url=${encodeURIComponent(_lspUrl)}`, '_blank', 'noopener,width=600,height=400');
}
function _lspCopyLink() {
    if (!navigator.clipboard) { showToast('Cannot copy on this browser'); return; }
    navigator.clipboard.writeText(_lspUrl)
        .then(() => showToast('Link copied!'))
        .catch(() => showToast('Cannot copy on this browser'));
}

// --- PERSONAL PROFILE COMPLETENESS REMINDER ---
function _showPersonalProfileReminder() {
    if (!currentUserId) return;
    if (userSettings.profilePic && userSettings.about?.trim()) return;
    const key   = `apc.profRemind.${currentUserId}`;
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    if (count >= 2) return;
    localStorage.setItem(key, String(count + 1));
    if (document.getElementById('personalProfileReminder')) return;
    const banner = document.createElement('div');
    banner.id = 'personalProfileReminder';
    banner.className = 'ppr-banner';
    banner.innerHTML = `
        <div class="ppr-inner">
            <div class="ppr-text">
                <strong>Complete your profile</strong>
                <span>Add a photo and bio so buyers know who they're dealing with.</span>
            </div>
            <button class="ppr-cta" onclick="onMenuOpenSettings(); document.getElementById('personalProfileReminder')?.remove();">Update profile</button>
            <button class="ppr-close" onclick="document.getElementById('personalProfileReminder')?.remove();" aria-label="Dismiss">&times;</button>
        </div>`;
    document.body.appendChild(banner);
}
