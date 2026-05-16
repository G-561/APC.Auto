// --- SUPABASE ---
const SUPABASE_URL  = 'https://ufpsnjtnvchazqswntch.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcHNuanRudmNoYXpxc3dudGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDc5MDAsImV4cCI6MjA5Mzg4MzkwMH0.Wl60CI8rcIo26EnNx1A1Dd7xfZEFOBlAXJDpXA6fyCA';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// --- GLOBAL STATE ---
let userIsSignedIn = false;          // starts logged out — header shows "Sign In" pill
let currentUserName  = null;          // e.g. "Gary"
let currentUserTier  = null;          // 'standard' | 'pro'
let currentUserId    = null;          // Supabase UUID of signed-in user
let currentUserEmail = null;          // signed-in user's email
let currentSearchMode = 'parts';     // 'parts' | 'wanted'
let gridShownCount   = 20;
function gridPageSize() { return window.innerWidth >= 900 ? 25 : 20; }
let currentOpenPartId = null;  // tracks which part detail is open
let _detailHistory    = [];    // stack of part IDs for store → listing → back navigation
let currentEditingListingId = null; // edit mode for Sell form
let currentEditStatus = null;       // status selected in manage section
let currentBuyerRating = 0;        // star rating selected in rate-buyer section
let authReturnAction = null; // optional callback after sign-in
let authMode = 'signin';
let sortOrder = 'none';  // 'none' | 'asc' | 'desc'
let _dashViewsChart  = null;
let _dashCatChart    = null;
let _dashCurrentTab  = 'active';
let _dashListingsShown = 25;
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
const _dismissedMockOfferIds = new Set();

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
    closedSales:  [],
    pendingSales: [],
    activity:     []
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
        services: {
            // Engine & Powertrain
            generalService: false, logbook: false, engineDiag: false, engineRebuild: false,
            transmission: false, exhaust: false, timingBelt: false,
            // Chassis & Vehicle Dynamics
            brakes: false, suspension: false, wheelAlign: false, tyreSupply: false,
            // Electrical, Climate & Cooling
            autoElectrical: false, battery: false, aircon: false, cooling: false, autoSecurity: false,
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
    autoSecurity: 'Security Systems & Accessories',
    collision: 'Collision Repair & Panel Beating',
    sprayPaint: 'Spray Painting & Refinishing',
    pdr: 'Paintless Dent Removal',
    autoGlass: 'Auto Glass',
    trimming: 'Motor Trimming & Upholstery',
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
const RECENTLY_VIEWED_MAX = 8;
let recentlyViewed = loadRecentlyViewed();

function loadRecentlyViewed() {
    try {
        const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
        return raw ? JSON.parse(raw) : [];
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

// Top-bar nav wrappers — set active state then open the section
function dtbOpenWorkshops() {
    setDtbActive('dtbWorkshops');
    onMenuOpenWorkshops();
}
function dtbOpenInbox() {
    setDtbActive('dtbMessages');
    onOpenInbox();
}

function clearRecentlyViewed() {
    recentlyViewed = [];
    saveRecentlyViewed();
    renderRecentlyViewed();
}
function addToRecentlyViewed(partId) {
    recentlyViewed = [partId, ...recentlyViewed.filter(id => id !== partId)].slice(0, RECENTLY_VIEWED_MAX);
    saveRecentlyViewed();
    renderRecentlyViewed();
}
function onOpenRecentlyViewed() {
    setActiveNav('recentNavItem');
    renderRecentlyViewed();
    toggleDrawer('recentlyViewedDrawer');
}

function renderRecentlyViewed() {
    const content = document.getElementById('rvDrawerContent');
    if (!content) return;

    if (!recentlyViewed.length) {
        content.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; color: #aaa;">
                <div style="font-size: 40px; margin-bottom: 12px;">🕐</div>
                <div style="font-weight: 800; font-size: 15px; margin-bottom: 8px; color: #888;">Nothing here yet</div>
                <div style="font-size: 13px;">Parts you view will appear here so you can find them again easily.</div>
            </div>`;
        return;
    }

    const parts = recentlyViewed.map(id => getPartById(id)).filter(Boolean);
    content.innerHTML = `
        <div class="rv-drawer-header">
            <span class="rv-drawer-count">${parts.length} part${parts.length === 1 ? '' : 's'}</span>
            <span class="rv-drawer-clear" onclick="clearRecentlyViewed()">Clear all</span>
        </div>
        ${parts.map(part => `
            <div class="rv-drawer-row" onclick="toggleDrawer('recentlyViewedDrawer'); openItemDetail(${part.id})">
                <img src="${part.images[0]}" alt="" class="rv-drawer-img">
                <div class="rv-drawer-info">
                    <div class="rv-drawer-title">${escapeHtml(part.title)}</div>
                    <div class="rv-drawer-meta">${escapeHtml(part.loc)}</div>
                </div>
                <div class="rv-drawer-price">$${part.price}</div>
            </div>
        `).join('')}`;
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
        privacySuburbOnly:    true,
        privacyPublicProfile: true,
        warehouseManagement:  false
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
        let q = sb.from('profiles')
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
    // Capture any pending suburb selection that the user may not have explicitly chosen
    document.querySelectorAll('.location-picker-wrap').forEach(wrap => {
        const sel = wrap.querySelector('.loc-suburb-select');
        if (sel && sel.style.display !== 'none' && sel.value) {
            onSuburbSelect(sel);
        }
    });
}

// ── POSTCODE / LOCATION PICKER ───────────────────────────────────────────────
// Profile mode uses a collapsible chip pattern (hide input → show chip).
// All other modes (sell, signup, workshop, ws-locator) use a two-column grid:
// postcode input always visible left, suburb select always visible right.
function onPostcodeInput(inputEl) {
    const wrap = inputEl.closest('.location-picker-wrap');
    const sel  = wrap.querySelector('.loc-suburb-select');
    const mode = wrap.dataset.mode || 'profile';
    const val  = inputEl.value.replace(/\D/g, '');
    inputEl.value = val;

    if (mode === 'profile') {
        const chip = wrap.querySelector('.location-chip');
        sel.style.display  = 'none';
        chip.style.display = 'none';
        if (val.length !== 4) return;
        const suburbs = (typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[val]) || [];
        if (!suburbs.length) return;
        sel.innerHTML = (suburbs.length > 1 ? '<option value="">Select suburb…</option>' : '') +
            suburbs.map(([s, st]) => `<option value="${s}, ${st} ${val}">${s}, ${st}</option>`).join('');
        sel.style.display = '';
        if (suburbs.length === 1) onSuburbSelect(sel);
    } else {
        // Grid modes: select is always visible — just repopulate
        if (val.length !== 4) {
            sel.innerHTML = '<option value="">Suburb, State</option>';
            return;
        }
        const suburbs = (typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[val]) || [];
        if (!suburbs.length) {
            sel.innerHTML = '<option value="">No match</option>';
            return;
        }
        sel.innerHTML = (suburbs.length > 1 ? '<option value="">Suburb, State</option>' : '') +
            suburbs.map(([s, st]) => `<option value="${s}, ${st} ${val}">${s}, ${st}</option>`).join('');
        if (suburbs.length === 1) onSuburbSelect(sel);
    }
}

function onSuburbSelect(selectEl) {
    const wrap = selectEl.closest('.location-picker-wrap');
    const val  = selectEl.value;
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

function clearLocationPicker(wrap) {
    const input = wrap.querySelector('.loc-postcode-input');
    const sel   = wrap.querySelector('.loc-suburb-select');
    const mode  = wrap.dataset.mode || 'profile';
    input.value = '';
    if (mode === 'profile') {
        const chip = wrap.querySelector('.location-chip');
        input.style.display = '';
        sel.style.display   = 'none';
        chip.style.display  = 'none';
        userSettings.location = '';
        saveUserSettings();
        renderProfile();
    } else {
        // Clear any stale inline display:none left by old code or profile mode
        input.style.display = '';
        sel.style.display   = '';
        sel.innerHTML = '<option value="">Suburb, State</option>';
        if (mode === 'sell') {
            const pcEl  = document.getElementById('sellPostcode');
            const locEl = document.getElementById('sellLocation');
            if (pcEl)  pcEl.value  = '';
            if (locEl) locEl.value = '';
        } else {
            wrap.dataset.selectedPostcode = '';
            wrap.dataset.selectedSuburb   = '';
            if (mode === 'ws-locator') renderWorkshopBrowseView();
        }
    }
}

function _applyLocationToWrap(wrap, locationStr) {
    const input    = wrap.querySelector('.loc-postcode-input');
    const sel      = wrap.querySelector('.loc-suburb-select');
    const chip     = wrap.querySelector('.location-chip');
    const chipText = wrap.querySelector('.location-chip-text');
    chipText.textContent = locationStr;
    chip.style.display   = 'flex';
    sel.style.display    = 'none';
    input.style.display  = 'none';
    const pcMatch = locationStr.match(/\b(\d{4})\b/);
    if (pcMatch) input.value = pcMatch[1];
}

function populateLocationPickers() {
    const loc = userSettings.location || '';
    document.querySelectorAll('.location-picker-wrap').forEach(wrap => {
        const mode = wrap.dataset.mode || 'profile';
        if (mode !== 'profile') return;
        const input = wrap.querySelector('.loc-postcode-input');
        const sel   = wrap.querySelector('.loc-suburb-select');
        const chip  = wrap.querySelector('.location-chip');
        if (loc) {
            _applyLocationToWrap(wrap, loc);
        } else {
            input.value         = '';
            input.style.display = '';
            sel.style.display   = 'none';
            chip.style.display  = 'none';
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
    const input = wrap.querySelector('.loc-postcode-input');
    const sel   = wrap.querySelector('.loc-suburb-select');
    input.value = resolvedPc;
    const suburbs = (typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[resolvedPc]) || [];
    if (!suburbs.length) return;
    sel.innerHTML = (suburbs.length > 1 ? '<option value="">Suburb, State</option>' : '') +
        suburbs.map(([s, st]) => `<option value="${s}, ${st} ${resolvedPc}">${s}, ${st}</option>`).join('');
    // Match the stored suburb if available
    if (loc) {
        const target = loc.toLowerCase().replace(/\s*\d{4}$/, '').trim();
        for (const opt of sel.options) {
            if (opt.value && opt.value.toLowerCase().startsWith(target.split(',')[0])) {
                sel.value = opt.value;
                break;
            }
        }
    } else if (suburbs.length === 1) {
        sel.value = sel.options[0]?.value || '';
    }
    const selVal = sel.value;
    if (selVal) {
        const pcEl  = document.getElementById('sellPostcode');
        const locEl = document.getElementById('sellLocation');
        if (pcEl)  pcEl.value  = selVal.match(/\b(\d{4})\b/)?.[1] || resolvedPc;
        if (locEl) locEl.value = selVal.replace(/\s*\d{4}$/, '').trim();
    }
}

function populateWsLocatorPicker() {
    const wrap = document.querySelector('.location-picker-wrap[data-mode="ws-locator"]');
    if (!wrap) return;
    const pc = userSettings.postcode || '';
    if (!pc) return;
    const input = wrap.querySelector('.loc-postcode-input');
    const sel   = wrap.querySelector('.loc-suburb-select');
    input.value = pc;
    const suburbs = (typeof AU_POSTCODES !== 'undefined' && AU_POSTCODES[pc]) || [];
    if (!suburbs.length) return;
    sel.innerHTML = (suburbs.length > 1 ? '<option value="">Suburb, State</option>' : '') +
        suburbs.map(([s, st]) => `<option value="${s}, ${st} ${pc}">${s}, ${st}</option>`).join('');
    if (suburbs.length === 1) {
        sel.value = sel.options[0]?.value || '';
        wrap.dataset.selectedPostcode = pc;
        wrap.dataset.selectedSuburb   = `${suburbs[0][0]}, ${suburbs[0][1]}`;
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
function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { showToast('Image too large — please use an image under 1 MB'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
        userSettings.businessLogo = e.target.result;
        saveUserSettings();
        renderLogoPreview();
        showToast('Logo saved');
    };
    reader.readAsDataURL(file);
}

function removeBusinessLogo() {
    userSettings.businessLogo = '';
    saveUserSettings();
    const fileInput = document.getElementById('logoFileInput');
    if (fileInput) fileInput.value = '';
    renderLogoPreview();
    showToast('Logo removed');
}

async function handleProfilePicUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large — please use an image under 2 MB'); input.value = ''; return; }
    if (!currentUserId || !sb) {
        showToast('Please sign in to save a profile photo');
        return;
    }
    showToast('Uploading…');
    const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
    const path = `profile-pics/${currentUserId}.${ext}`;
    const { error: upErr } = await sb.storage.from('listing-images').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { showToast('Upload failed — ' + upErr.message); return; }
    const { data: urlData } = sb.storage.from('listing-images').getPublicUrl(path);
    const url = urlData.publicUrl + '?t=' + Date.now();
    userSettings.profilePic = url;
    saveUserSettings();
    await sb.from('profiles').update({ profile_pic: url }).eq('id', currentUserId);
    renderProfilePicPreview();
    showToast('Profile photo saved');
}

async function removeProfilePic() {
    userSettings.profilePic = '';
    saveUserSettings();
    const input = document.getElementById('profilePicInput');
    if (input) input.value = '';
    renderProfilePicPreview();
    if (currentUserId && sb) {
        await sb.from('profiles').update({ profile_pic: null }).eq('id', currentUserId);
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

function renderLogoPreview() {
    const logo     = userSettings.businessLogo || '';
    const initial  = (currentUserName || 'G').charAt(0).toUpperCase();
    const img      = document.getElementById('logoPreviewImg');
    const initials = document.getElementById('logoPreviewInitials');
    const removeBtn = document.getElementById('logoRemoveBtn');
    if (img) { img.src = logo; img.style.display = logo ? 'block' : 'none'; }
    if (initials) initials.style.display = logo ? 'none' : '';
    if (initials && !logo) initials.textContent = initial;
    if (removeBtn) removeBtn.style.display = logo ? '' : 'none';
}

function handleBannerUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large — please use an image under 2 MB'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
        userSettings.businessBanner = e.target.result;
        saveUserSettings();
        renderBannerPreview();
        showToast('Banner saved');
    };
    reader.readAsDataURL(file);
}

function removeBannerImage() {
    userSettings.businessBanner = '';
    saveUserSettings();
    const fileInput = document.getElementById('bannerFileInput');
    if (fileInput) fileInput.value = '';
    renderBannerPreview();
    showToast('Banner removed');
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

function saveSettingsToggle(key, value) {
    userSettings[key] = value;
    saveUserSettings();
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
    const nameEl     = document.getElementById('settingsDisplayName');
    const proSection = document.getElementById('settingsProSection');
    if (nameEl) nameEl.value = currentUserName || '';
    const emailEl = document.getElementById('settingsEmailDisplay');
    if (emailEl) emailEl.textContent = currentUserEmail || '—';
    populateLocationPickers();
    renderProfilePicPreview();

    const isPro = currentUserTier === 'pro';
    const proBlock = document.getElementById('settingsProBlock');
    if (proBlock) proBlock.style.display = isPro ? 'block' : 'none';

    const toggleMap = {
        settingNotifyWanted:        'notifyWantedMatch',
        settingNotifyMessages:      'notifyMessages',
        settingNotifyPriceDrops:    'notifyPriceDrops',
        settingNotifyNewListings:   'notifyNewListings',
        settingPrivacySuburb:       'privacySuburbOnly',
        settingPrivacyPublic:       'privacyPublicProfile',
        settingWarehouseManagement: 'warehouseManagement',
        proSettingDefaultFitting:   'defaultFitting'
    };
    Object.entries(toggleMap).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (el) el.checked = userSettings[key];
    });
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
function recordSearch(term) {
    const clean = (term || '').toLowerCase().trim();
    if (!clean || clean.length < 3 || clean === _lastRecordedSearch) return;
    _lastRecordedSearch = clean;
    const data = loadSearchDemand();
    data.push({ term: clean, ts: Date.now() });
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    saveSearchDemand(data.filter(d => d.ts > cutoff).slice(-3000));
}

const _demandSeed = [];

function getDemandReport() {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const real = loadSearchDemand().filter(d => d.ts >= monthStart.getTime());
    const counts = {};
    real.forEach(d => { counts[d.term] = (counts[d.term] || 0) + 1; });
    const realEntries = Object.entries(counts).map(([term, count]) => ({ term, count }));
    // Merge seed data, boosting any real matches
    const merged = [..._demandSeed];
    realEntries.forEach(r => {
        const existing = merged.find(m => m.term.toLowerCase() === r.term);
        if (existing) existing.count += r.count;
        else merged.push({ term: r.term, count: r.count });
    });
    return merged.sort((a, b) => b.count - a.count).slice(0, 10);
}
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
    for (let i = 0; i < base64Images.length; i++) {
        const b64 = base64Images[i];
        if (!b64 || !b64.startsWith('data:')) { urls.push(b64); continue; }
        try {
            const compressed = await compressBase64(b64, 1600, 0.88);
            const res = await fetch(compressed);
            const blob = await res.blob();
            const path = `${listingUUID}/${i}.jpg`;
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
            warehouse_bin: localListing.warehouseBin || null,
            quantity: localListing.quantity || 1,
            apc_id: localListing.apcId || null,
            fitting_available: !!localListing.fit,
            fits_year: localListing.year || null,
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
                    localListing.fits.map(f => ({ listing_id: listingId, make: f.make, model: f.model }))
                )
            ).catch(e => console.warn('Vehicle fits sync:', e));
        }
    } catch (e) { showToast('Sync error: ' + (e.message || e)); }
}

async function loadPublicListingsFromSupabase() {
    try {
        const { data: rows, error } = await sb
            .from('listings')
            .select('*, listing_images(storage_path, position), listing_vehicles(make, model)')
            .in('status', ['active', 'pending'])
            .order('created_at', { ascending: false })
            .limit(40);
        if (error) { renderMainGrid(); return; }

        // Batch-fetch current display names so stale seller_name values don't show
        const sellerIds = [...new Set((rows || []).map(r => r.seller_id).filter(Boolean))];
        let nameMap = {};
        if (sellerIds.length) {
            const { data: profiles } = await sb.from('profiles')
                .select('id, display_name')
                .in('id', sellerIds);
            nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]).filter(([, n]) => n));
        }

        (rows || []).forEach(r => {
            const liveName = nameMap[r.seller_id] || r.seller_name || 'Seller';
            const existPub = partDatabase.find(p => p.supabaseId === r.id);
            if (existPub) { existPub.seller = liveName; return; }
            const existUser = userListings.find(l => l.supabaseId === r.id);
            if (existUser) { existUser.seller = liveName; return; }
            const images = (r.listing_images || [])
                .sort((a, b) => a.position - b.position)
                .map(img => img.storage_path).filter(Boolean);
            const fits = (r.listing_vehicles || []).map(v => ({ make: v.make, model: v.model }));
            partDatabase.push({
                id: nextPartId(), supabaseId: r.id, sellerId: r.seller_id,
                saves: r.saves_count || 0,
                date: new Date(r.created_at).getTime(),
                apcId: r.apc_id, title: r.title, category: r.category,
                price: r.price, condition: r.condition,
                description: r.description, loc: r.location,
                postcode: r.postcode, pickup: r.pickup, postage: r.postage,
                openToOffers: r.open_to_offers, isPro: r.is_pro,
                stockNumber: r.stock_number, odometer: r.odometer,
                warehouseBin: r.warehouse_bin, quantity: r.quantity || 1,
                fit: r.fitting_available, year: r.fits_year,
                seller: nameMap[r.seller_id] || r.seller_name || 'Seller',
                status: r.status === 'active' ? undefined : r.status,
                images: images.length ? images : [], fits,
            });
        });
        renderMainGrid();
        refreshInboxThreadHeader();
    } catch (e) { console.warn('Load public listings:', e); renderMainGrid(); }
}

async function loadUserListingsFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('listings')
            .select('*, listing_images(storage_path, position), listing_vehicles(make, model)')
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
            const fits = (r.listing_vehicles || []).map(v => ({ make: v.make, model: v.model }));
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
                    odometer: r.odometer, warehouseBin: r.warehouse_bin,
                    quantity: r.quantity || 1, apcId: r.apc_id,
                    fit: r.fitting_available, year: r.fits_year,
                    saves: r.saves_count || 0, sellerId: r.seller_id, fits,
                    seller: currentUserName || r.seller_name || '',
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
                    odometer: r.odometer, warehouseBin: r.warehouse_bin,
                    quantity: r.quantity || 1, fit: r.fitting_available,
                    year: r.fits_year, seller: r.seller_name || currentUserName || '',
                    images: images.length ? images : [], fits,
                });
            }
        });

        saveUserListings();
        renderMainGrid();
        renderMyParts();
        refreshInboxThreadHeader();
    } catch (e) { showToast('Load error: ' + (e.message || e)); }
}

// ── SUPABASE MESSAGES ─────────────────────────────────────────
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
    if (!buyerId) return false;

    const part = findPartAnywhere(conv.partId);
    if (!part?.supabaseId || !part.sellerId) return false;

    // Seller cannot be their own buyer
    if (buyerId === part.sellerId) return false;

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
            // Stale session — the account was deleted/recreated; clear it and prompt sign-in
            sb.auth.signOut().then(() => {
                showToast('Your session has expired — please sign in again');
                openAuthDrawer();
            });
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
    if (!ok) return;
    const firstMsg = conv.msgs[0];
    if (firstMsg && !firstMsg.offerCard) {
        await sb.from('messages').insert({
            conversation_id: conv.supabaseConvId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            text: firstMsg.text,
        });
    }
}

async function syncOfferMessageToSupabase(conv, offerText, offerData) {
    const ok = await ensureSupabaseConversation(conv);
    if (!ok) return;
    await sb.from('messages').insert({
        conversation_id: conv.supabaseConvId,
        sender_id: currentUserId,
        sender_name: currentUserName,
        text: offerText,
        offer_data: offerData,
    });
    await sb.from('conversations').update({
        last_message_at: new Date().toISOString(),
        unread_buyer: false,
        unread_seller: true,
    }).eq('id', conv.supabaseConvId);
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
            .select('*, messages(id, sender_id, sender_name, text, photo_url, offer_data, created_at)')
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) { console.warn('Load conversations error:', error.message); subscribeToRealtimeMessages(); subscribeToRealtimeListings(); return; }

        const visibleRows = (rows || []).filter(r =>
            r.buyer_id === userId ? !r.hidden_by_buyer : !r.hidden_by_seller
        );


        visibleRows.forEach(r => {
            const isBuyer = r.buyer_id === userId;
            const otherName = isBuyer ? (r.seller_name || 'Seller') : (r.buyer_name || 'Buyer');
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
                existing.unread = isUnread;
                if (r.listing_id) existing.partId = r.listing_id; // correct any stale numeric partId
            } else {
                const part = [...partDatabase, ...userListings].find(p => p.supabaseId === r.listing_id);
                conversations.unshift({
                    id: nextConvId(),
                    supabaseConvId: r.id,
                    buyerId: r.buyer_id,
                    sellerId: r.seller_id,
                    with: otherName,
                    isPro: false,
                    unread: isUnread,
                    partId: r.listing_id || part?.id,
                    partTitle: r.listing_title || 'Part',
                    msgs,
                });
            }
        });

        saveConversations();
        renderInboxConvList();
        updateInboxBadge();
        refreshInboxThreadHeader(); // correct header if auto-selected before data loaded
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
                    variant: r.variant || '', nickname: r.nickname || '', vin: r.vin || ''
                });
            } else {
                myVehicles.push({
                    id: nextVehicleId(),
                    supabaseId: r.id,
                    make: r.make || '', model: r.model || '', year: r.year || '',
                    variant: r.variant || '', nickname: r.nickname || '', vin: r.vin || ''
                });
            }
        });

        // Push any pre-existing local vehicles that have no supabaseId yet
        const unsynced = myVehicles.filter(v => !v.supabaseId);
        for (const v of unsynced) {
            const { data, error: e } = await sb.from('vehicles').insert({
                user_id: userId, make: v.make, model: v.model, year: String(v.year || ''),
                variant: v.variant || '', nickname: v.nickname || '', vin: v.vin || ''
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
            .select('*')
            .neq('user_id', excludeId)
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) { console.warn('public wanted load:', error.message); return; }
        if (!rows?.length) { publicWantedDatabase.splice(0); if (currentSearchMode === 'wanted') renderMainGrid(); return; }

        const userIds = [...new Set(rows.map(r => r.user_id))];
        const { data: profiles } = await sb.from('profiles')
            .select('id, display_name, is_pro, location')
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
                isPro: prof.is_pro || false,
                loc: prof.location || '',
                posted: new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
                userId: r.user_id,
                buyer: prof.display_name || 'Member',
                sellerName: prof.display_name || '',
            });
        });
        if (currentSearchMode === 'wanted') renderMainGrid();
    } catch (e) { console.warn('loadPublicWantedFromSupabase:', e); }
}

async function loadSavedListingsFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('saved_listings')
            .select('listing_id')
            .eq('user_id', userId);
        if (error) { console.warn('saved_listings load:', error.message); return; }
        if (!rows?.length) return;

        let changed = false;
        rows.forEach(r => {
            const part = [...partDatabase, ...userListings].find(p => p.supabaseId === r.listing_id);
            if (part && !savedParts.has(part.id)) {
                savedParts.add(part.id);
                changed = true;
            }
        });
        if (changed) {
            persistSavedParts();
            renderMainGrid();
            if (document.getElementById('savedPartsDrawer')?.classList.contains('active')) renderSavedParts();
        }
    } catch (e) { console.warn('loadSavedListingsFromSupabase:', e); }
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
                        .select('*').eq('id', msg.conversation_id).single();
                    if (!convRow) return;
                    const isBuyer = convRow.buyer_id === currentUserId;
                    const otherName = isBuyer ? (convRow.seller_name || 'Seller') : (convRow.buyer_name || 'Buyer');
                    const part = [...partDatabase, ...userListings].find(p => p.supabaseId === convRow.listing_id);
                    conv = {
                        id: nextConvId(),
                        supabaseConvId: convRow.id,
                        buyerId: convRow.buyer_id,
                        sellerId: convRow.seller_id,
                        with: otherName,
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
                    ...(msg.photo_url  ? { photo: msg.photo_url }     : {}),
                    ...(msg.offer_data ? { offerCard: msg.offer_data } : {}),
                    time: formatMsgDate(msg.created_at || new Date().toISOString()),
                    clock: formatMsgTime(msg.created_at || new Date().toISOString()),
                });
                conv.unread = true;
                saveConversations();

                if (activeConvId === conv.id) renderInboxMsgs(conv);
                renderInboxConvList(document.getElementById('inboxSearchInput')?.value || '');
                updateInboxBadge();

                const inboxOpen = document.getElementById('inboxDrawer')?.classList.contains('active');
                if (!inboxOpen) showToast(`New message from ${conv.with}`);
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
                            stockNumber: r.stock_number, odometer: r.odometer,
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
    const q = (filter || '').toLowerCase();
    const filtered = (q
        ? conversations.filter(c => c.with.toLowerCase().includes(q) || getConvPartTitle(c).toLowerCase().includes(q))
        : [...conversations]
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
        list.innerHTML = isSearch
            ? `<div style="text-align:center;padding:30px;color:#aaa;font-size:13px;font-weight:600;">No conversations match "${escapeHtml(filter)}"</div>`
            : `<div style="text-align:center;padding:40px 20px;color:#aaa;">
                <div style="font-size:36px;margin-bottom:10px;">💬</div>
                <div style="font-weight:800;font-size:14px;color:#888;margin-bottom:6px;">No messages yet</div>
                <div style="font-size:12px;line-height:1.5;">When you message a seller or receive an enquiry,<br>the conversation will appear here.</div>
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
    setTimeout(() => document.getElementById('inboxReplyInput')?.focus(), 300);
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
        : (sent && o.status === 'pending' ? `<div class="offer-card-awaiting">Awaiting seller response…</div>` : '');
    return `<div class="offer-card">
        <div class="offer-card-header">
            <img src="${escapeHtml(o.partImg)}" class="offer-card-img" alt="">
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

function renderInboxMsgs(conv) {
    const box = document.getElementById('inboxMsgList');
    if (!box) return;
    const me = currentUserName || 'You';
    let lastDay = '';
    box.innerHTML = conv.msgs.map((m, idx) => {
        let divider = '';
        if (m.time !== lastDay) { lastDay = m.time; divider = `<div class="inbox-date-divider">${m.time}</div>`; }
        const isOffer  = !!m.offerCard;
        const content  = isOffer
            ? buildOfferCardHTML(m.offerCard, m.sent, conv.id, idx)
            : (m.photo ? `<img src="${m.photo}" alt="Photo" style="cursor:zoom-in;" onclick="openDetailImageViewer('${m.photo.replace(/'/g,"\\'")}')">` : escapeHtml(m.text));
        const delBtn   = `<button class="inbox-msg-del" onclick="deleteInboxMsg(${conv.id},${idx})" title="Delete">×</button>`;
        const initial  = m.sent ? me.charAt(0).toUpperCase() : conv.with.charAt(0).toUpperCase();
        const colClass = isOffer ? 'inbox-msg-col offer-col' : 'inbox-msg-col';
        const bubClass = isOffer ? 'inbox-msg-bubble offer-bubble' : 'inbox-msg-bubble';
        return `${divider}
            <div class="inbox-msg-row ${m.sent?'sent':'received'}" ontouchstart="msgRowTouchStart(event)" ontouchend="msgRowTouchEnd(event,this)">
                ${!m.sent ? delBtn : ''}
                <div class="inbox-msg-avatar">${initial}</div>
                <div class="${colClass}">
                    <div class="${bubClass}">${content}</div>
                    <div class="inbox-msg-time">${m.clock}</div>
                </div>
                ${m.sent ? delBtn : ''}
            </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

let _msgTouchStartX = 0;
function msgRowTouchStart(e) {
    _msgTouchStartX = e.touches[0].clientX;
}
function msgRowTouchEnd(e, row) {
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

function closeInboxThread() {
    document.getElementById('inboxConvCol').classList.remove('slide-away');
    document.getElementById('inboxThreadCol').classList.remove('slide-in');
}

function closeInboxOrThread() {
    const isMobile = window.innerWidth < 900;
    const threadCol = document.getElementById('inboxThreadCol');
    if (isMobile && threadCol && threadCol.classList.contains('slide-in')) {
        closeInboxThread();
    } else {
        toggleDrawer('inboxDrawer');
    }
}

async function sendInboxMessage() {
    const input = document.getElementById('inboxReplyInput');
    const text  = input?.value.trim();
    if (!text || activeConvId === null) return;
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
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
    if (!conv || !conv.partId || conv.partId === 'general') { showToast('No listing linked to this conversation'); return; }
    // Also try matching by supabaseConvId's listing_id directly
    let part = findPartAnywhere(conv.partId);
    if (!part && conv.supabaseConvId) {
        // partId may be stale — re-fetch from supabase conversation record
        sb.from('conversations').select('listing_id').eq('id', conv.supabaseConvId).single()
            .then(({ data }) => {
                if (data?.listing_id) {
                    conv.partId = data.listing_id;
                    saveConversations();
                    const p = findPartAnywhere(data.listing_id);
                    if (p) openItemDetail(p.id, false, true);
                    else showToast('Listing no longer available');
                } else {
                    showToast('Listing no longer available');
                }
            });
        return;
    }
    if (!part) { showToast('Listing no longer available'); return; }
    openItemDetail(part.id, false, true);
}

function syncInboxPendingBtn() {
    const pendingBtn = document.getElementById('inboxPendingBtn');
    const soldBtn    = document.getElementById('inboxSoldBtn');
    const conv = conversations.find(c => c.id === activeConvId);
    const listing = conv && userListings.find(l => l.id === conv.partId);
    if (!listing) {
        if (pendingBtn) pendingBtn.style.display = 'none';
        if (soldBtn)    soldBtn.style.display    = 'none';
        return;
    }
    const isSold    = listing.status === 'sold';
    const isPending = listing.status === 'pending';
    if (pendingBtn) {
        pendingBtn.style.display = isSold ? 'none' : '';
        pendingBtn.textContent   = isPending ? 'Remove Pending' : 'Mark as Pending';
        pendingBtn.classList.toggle('inbox-pending-active', isPending);
    }
    if (soldBtn) {
        soldBtn.style.display = '';
        soldBtn.textContent   = isSold ? 'Relist' : 'Mark Sold';
        soldBtn.classList.toggle('is-sold', isSold);
    }
}

function toggleListingPending() {
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    const listing = userListings.find(l => l.id === conv.partId);
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
    const listing = userListings.find(l => l.id === conv.partId);
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
            listing.status   = 'sold';
            listing.soldDate = Date.now();
            saveUserListings();
            syncInboxPendingBtn();
            renderMainGrid();
            renderMyParts();
            if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
            showToast('Listing marked as sold!');
            syncListingStatusToSupabase(listing, 'sold');
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

    const fitmentHtml = part.fits && part.fits.length
        ? `<div class="iip-section-label">Vehicle Fitment</div>
           <div class="iip-fitment">${part.fits.map(f => [f.make, f.model].filter(Boolean).join(' ')).join(', ')}</div>`
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
        <div class="iip-section-label">Description</div>
        <div class="iip-description">${escapeHtml(part.description || 'Fully functional part. Tested and ready for installation.')}</div>
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
    return [...partDatabase, ...userListings].find(p => p.supabaseId === id);
}
function getPartById(id) {
    return getAllParts().find(p => p.id === id);
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
    const targetMake = part.fits && part.fits.length ? part.fits[0].make : null;
    const targetModel = part.fits && part.fits.length ? part.fits[0].model : null;
    return workshopDatabase
        .map(workshop => ({
            workshop,
            score: [
                targetMake && workshop.vehicleTypes.includes(targetMake) ? 2 : 0,
                targetModel && workshop.vehicleTypes.includes(targetModel) ? 2 : 0,
                workshop.services.some(s => part.category && s.toLowerCase().includes(part.category.toLowerCase())) ? 1 : 0
            ].reduce((sum, value) => sum + value, 0)
        }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.workshop.distance.localeCompare(b.workshop.distance))
        .map(entry => entry.workshop);
}

function buildWorkshopCardHTML(workshop) {
    const stars = workshop.rating ? `<span class="workshop-rating">★ ${workshop.rating}</span>` : '';
    return `
        <div class="workshop-card">
            <div class="workshop-card-header">
                <div class="workshop-card-name">${workshop.name}</div>
                <div class="workshop-card-distance">${workshop.distance}</div>
            </div>
            <div class="workshop-card-specialty">${workshop.specialty}</div>
            <div class="workshop-card-meta">Expert in ${workshop.vehicleTypes.join(', ')}</div>
            <div class="workshop-card-footer">
                ${stars}
                <button class="workshop-card-button" onclick="contactWorkshop(${workshop.id})">Contact</button>
            </div>
        </div>
    `;
}

function contactWorkshop(workshopId) {
    const workshop = workshopDatabase.find(w => w.id === workshopId);
    if (!workshop) return;
    showToast(`Contact request sent to ${workshop.name}`);
}

function getCurrentSellerName() {
    return currentUserName || 'Guest Seller';
}

// Returns the public-facing name for the signed-in user.
// Pro users with a business name show that; standard users show their display name.
function getPublicSellerName() {
    if (currentUserTier === 'pro' && userSettings.businessName) return userSettings.businessName;
    return currentUserName || 'Guest Seller';
}

async function openStorefrontByUserId(userId) {
    if (!sb || !userId) return;
    const { data: profile } = await sb.from('profiles')
        .select('display_name, is_pro, business_name, abn, about, profile_pic, location')
        .eq('id', userId).single();
    if (!profile) return;
    const sellerName = profile.display_name || 'Seller';
    const grid = document.getElementById('sellerPartsGrid');
    if (grid) grid.dataset.seller = sellerName;
    renderStorefront(
        sellerName,
        profile.is_pro || false,
        profile.profile_pic || '',
        profile.business_name || '',
        profile.abn || '',
        profile.about || '',
        profile.location || '',
        ''
    );
    const isOwn = userId === currentUserId || sellerName === getCurrentSellerName();
    const sfMsgBtn = document.getElementById('sfMsgBtn');
    if (sfMsgBtn) sfMsgBtn.style.display = isOwn ? 'none' : '';
    const sfEl    = document.getElementById('storefrontDrawer');
    const backBar = document.getElementById('storefrontBackBar');
    if (sfEl)    sfEl.style.zIndex    = '';
    if (backBar) backBar.style.display = 'none';
    toggleDrawer('storefrontDrawer', true);
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
    document.body.style.overflow = anyOpen ? 'hidden' : 'auto';
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.toggle('active', anyOpen);
}

function syncBackdrop() {
    const anyOpen = document.querySelectorAll('.drawer.active:not(#filterDrawer)').length > 0
        || (window.innerWidth < 900 && document.querySelectorAll('.drawer.active').length > 0);
    document.body.style.overflow = anyOpen ? 'hidden' : 'auto';
    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.toggle('active', anyOpen);
}

// Keep inbox pinned to the visual viewport when the keyboard opens on iOS/Android.
// iOS Safari scrolls the page on input focus (vv.offsetTop > 0), so we must
// reposition both top and height to match the visual viewport exactly.
function syncInboxToKeyboard() {
    if (window.innerWidth >= 900) return;
    const drawer = document.getElementById('inboxDrawer');
    if (!drawer || !drawer.classList.contains('active')) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const kbOpen = vv.height < window.innerHeight - 50;
    if (kbOpen) {
        drawer.style.top    = Math.round(vv.offsetTop)  + 'px';
        drawer.style.height = Math.round(vv.height)     + 'px';
        drawer.style.bottom = 'auto';
        const msgList = document.getElementById('inboxMsgList');
        if (msgList) setTimeout(() => { msgList.scrollTop = msgList.scrollHeight; }, 80);
    } else {
        drawer.style.top    = '';
        drawer.style.height = '';
        drawer.style.bottom = '';
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
    const hint = document.getElementById('radiusHint');
    const stateSelect = document.getElementById('filterStateSelect');
    if (control) control.classList.toggle('radius-seg-disabled', !hasPostcode);
    if (hint) hint.style.display = hasPostcode ? 'none' : 'block';
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
    const hint = document.getElementById('radiusHint');
    if (hasState && postcodeInput) {
        postcodeInput.value = '';
        if (control) control.classList.add('radius-seg-disabled');
        if (hint) hint.style.display = 'block';
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
    if (n > 0 && currentSearchMode !== 'wanted') {
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
    const radiusHint = document.getElementById('radiusHint');
    if (radiusHint) radiusHint.style.display = 'block';
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
        if (search) {
            const isPro = userIsSignedIn && currentUserTier === 'pro';
            const tokens = search.split(/\s+/).filter(Boolean);
            const haystack = [
                part.title.toLowerCase(),
                (part.description || '').toLowerCase(),
                part.loc.toLowerCase()
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
        if (part.tradeOnly && currentUserTier !== 'pro') return false;
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
    results.sort((a, b) => {
        if (sortOrder === 'asc')  { const d = a.price - b.price; if (d !== 0) return d; }
        if (sortOrder === 'desc') { const d = b.price - a.price; if (d !== 0) return d; }
        return (b.date || 0) - (a.date || 0); // newest first always
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

function buildCardHTML(part, eager = false) {
    // Only part.id goes into the onclick — never unsanitised user content
    const fittingLabel = part.fit
        ? `<span class="fitting-pill">FITTING AVAILABLE</span>`
        : '';

    const tradeBadge = part.tradeOnly
        ? `<span class="trade-only-badge">TRADE</span>`
        : '';

    const locationHTML = `📍 ${part.loc}`;

    const savedDot = savedParts.has(part.id) ? '<div class="card-saved-dot">&#x2665;&#xFE0E;</div>' : '';

    const pendingBanner = part.status === 'pending'
        ? `<div class="card-pending-banner">PENDING</div>`
        : '';

    return `
        <div class="item-card" onclick="openItemDetail(${part.id})">
            <img class="item-img" src="${part.images[0]}" alt="${part.title}" loading="${eager ? 'eager' : 'lazy'}">
            ${pendingBanner}
            <div class="item-info">
                <div class="price-row">
                    <span class="item-price">$${part.price}</span>
                    ${tradeBadge}${fittingLabel}
                </div>
                <div class="item-title">${part.title}</div>
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

function updateGridHeading(label, count) {
    const el = document.getElementById('gridHeading');
    if (!el) return;
    el.innerHTML = `<span class="grid-heading-label">${label}</span><span class="grid-heading-count">${count} part${count !== 1 ? 's' : ''}</span>`;
    el.style.display = 'flex';
}

function goHome() {
    document.querySelectorAll('.drawer.active').forEach(d => d.classList.remove('active'));
    syncBackdrop();
    renderMainGrid();
    window.scrollTo(0, 0);
    setActiveNav('homeNavItem');
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

function renderMainGrid(keepOffset = false) {
    const mainGrid = document.getElementById('mainGrid');
    if (!mainGrid) return;

    if (!keepOffset) gridShownCount = gridPageSize();
    mainGrid.innerHTML = '';
    recordSearch(activeFilters.search);

    if (currentSearchMode === 'wanted') {
        setDtbActive(null);
        const hdEl = document.getElementById('gridHeading');
        if (hdEl) hdEl.style.display = 'none';
        return renderWantedSearchResults(mainGrid);
    }
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
        updateGridHeading(`Results for "${escapeHtml(activeFilters.search)}"`, filtered.length);
    } else if (hasFilters) {
        updateGridHeading('Filtered results', filtered.length);
    } else {
        updateGridHeading('Recently Listed', filtered.length);
    }

    const visible = filtered.slice(0, gridShownCount);
    mainGrid.innerHTML = visible.map((part, i) => buildCardHTML(part, i < 6)).join('');

    if (filtered.length > gridShownCount) {
        const remaining = filtered.length - gridShownCount;
        const loadMoreWrap = document.createElement('div');
        loadMoreWrap.style.cssText = 'grid-column:1/-1; text-align:center; padding:24px 0 12px;';
        loadMoreWrap.innerHTML = `<button class="load-more-btn" onclick="loadMoreListings()">Load More &nbsp;·&nbsp; ${remaining} more</button>`;
        mainGrid.appendChild(loadMoreWrap);
    }
}

function loadMoreListings() {
    gridShownCount += gridPageSize();
    renderMainGrid(true);
}

// Returns true if this seller already has a listing covering the wanted request.
// Match requires part name overlap AND vehicle make/model compatibility.
function sellerHasListedFor(wanted) {
    const partLower = wanted.partName.toLowerCase();
    return userListings.some(listing => {
        const titleLower = listing.title.toLowerCase();
        const nameMatch = titleLower.includes(partLower) || partLower.includes(titleLower);
        if (!nameMatch) return false;
        if (!wanted.make) return true;
        return listing.fits.some(f =>
            f.make.toLowerCase() === wanted.make.toLowerCase() &&
            (!wanted.model || f.model.toLowerCase() === wanted.model.toLowerCase())
        );
    });
}

// FIND WANTED mode — shows other buyers' public wanted listings so sellers can see the market.
// This is a Pro seller tool: search what buyers are looking for, then list it.
// Wanted items the seller has already listed a matching part for are hidden automatically.
function renderWantedSearchResults(mainGrid) {
    const query  = activeFilters.search.toLowerCase();
    const fMake  = activeFilters.make     || '';
    const fModel = activeFilters.model    || '';
    const fYear  = activeFilters.year     || '';
    const fCat   = activeFilters.category || 'all';
    const fState = activeFilters.location || 'all';
    const matching = publicWantedDatabase.filter(w => {
        if (sellerHasListedFor(w)) return false;
        if (query && !w.partName.toLowerCase().includes(query) &&
                     !w.make.toLowerCase().includes(query) &&
                     !w.model.toLowerCase().includes(query)) return false;
        if (fMake  && !w.make.toLowerCase().includes(fMake))   return false;
        if (fModel && !w.model.toLowerCase().includes(fModel)) return false;
        if (fYear) {
            const searchYr = Number(fYear);
            const wYr      = Number(w.year);
            if (searchYr && wYr) {
                const range = getVehicleYearRange(w.make, w.model, wYr);
                const match = range ? (searchYr >= range[0] && searchYr <= range[1]) : (wYr === searchYr);
                if (!match) return false;
            }
        }
        if (fCat !== 'all' && w.category !== fCat)             return false;
        if (fState !== 'all') {
            const stateCode = w.loc.split(',')[1]?.trim();
            if (stateCode !== fState) return false;
        }
        if (!activeFilters.sellerPro     &&  w.isPro) return false;
        if (!activeFilters.sellerPrivate && !w.isPro) return false;
        return true;
    });

    if (!matching.length) {
        const safeSearch = escapeHtml(activeFilters.search);
        mainGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888;">
                <div style="font-weight: 700; margin-bottom: 10px;">No members looking for "${safeSearch}" right now</div>
                <div style="font-size: 13px;">Try a broader search — make, model, or part type.</div>
            </div>`;
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'wanted-results-wrap';

    const hdr = document.createElement('div');
    hdr.className = 'wanted-results-hdr';
    hdr.textContent = `${matching.length} part${matching.length === 1 ? '' : 's'} wanted`;
    wrap.appendChild(hdr);

    matching.forEach(w => {
        const initials = w.buyer.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const row = document.createElement('div');
        row.className = 'wanted-row';
        const buyerBadge = w.isPro
            ? `<span class="wanted-chip wanted-chip-pro">APC Pro</span>`
            : `<span class="wanted-chip wanted-chip-personal">Personal</span>`;
        row.innerHTML = `
            <div class="wanted-row-avatar${w.isPro ? ' wanted-avatar-pro' : ''}">${initials}</div>
            <div class="wanted-row-body">
                <div class="wanted-row-name">${escapeHtml(w.partName)}</div>
                <div class="wanted-row-chips">
                    ${buyerBadge}
                    <span class="wanted-chip">${escapeHtml(w.make)} ${escapeHtml(w.model)} ${escapeHtml(w.year)}</span>
                    <span class="wanted-chip">${escapeHtml(w.loc)}</span>
                    ${w.maxPrice ? `<span class="wanted-chip wanted-chip-budget">Max $${w.maxPrice}</span>` : ''}
                    <span class="wanted-chip wanted-chip-time">${escapeHtml(w.posted)}</span>
                </div>
            </div>
            <button class="wanted-have-btn" onclick="listFromWanted('${escapeHtml(w.make)}','${escapeHtml(w.model)}','${escapeHtml(w.year)}')">LIST THIS PART ›</button>
        `;
        wrap.appendChild(row);
    });

    mainGrid.appendChild(wrap);
}

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
            await sb.from('listing_images').delete().eq('listing_id', part.supabaseId);
            await sb.from('listings').delete().eq('id', part.supabaseId);
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

    myPartsList.innerHTML = '';
    const query = (document.getElementById('myPartsSearchInput')?.value || '').toLowerCase().trim();
    const myParts = userListings.filter(part =>
        part.status !== 'removed' &&
        (!query || part.title.toLowerCase().includes(query))
    ).sort((a, b) => {
        const w = s => s === 'sold' ? 2 : s === 'pending' ? 1 : 0;
        return w(a.status) - w(b.status);
    });

    if (myParts.length === 0) {
        myPartsList.innerHTML = query
            ? `<div style="text-align:center;color:#888;padding:30px;font-weight:700;">No listings match "${escapeHtml(query)}"</div>`
            : `<div style="text-align:center;padding:40px 20px;color:#aaa;">
                <div style="font-size:36px;margin-bottom:10px;">📦</div>
                <div style="font-weight:800;font-size:14px;color:#888;margin-bottom:6px;">No active listings</div>
                <div style="font-size:12px;">Tap <strong>+ Sell a Part</strong> to list your first part.</div>
               </div>`;
        return;
    }

    myParts.forEach(part => {
        const isSold    = part.status === 'sold';
        const isPending = part.status === 'pending';

        const row = document.createElement('div');
        row.className = 'my-part-row' + (isSold ? ' sold' : '');

        const thumb = document.createElement('img');
        thumb.src = part.images[0];
        thumb.className = 'my-part-thumb';
        if (!isSold) {
            thumb.style.cursor = 'pointer';
            thumb.onclick = (e) => { e.stopPropagation(); openItemDetail(part.id); };
        }

        const info = document.createElement('div');
        info.className = 'my-part-info';

        const title = document.createElement('div');
        title.className = 'my-part-title';
        title.textContent = part.title;

        const sub = document.createElement('div');
        sub.className = 'my-part-sub';

        const price = document.createElement('span');
        price.className = 'my-part-price';
        price.textContent = `$${part.price}`;

        const badge = document.createElement('span');
        badge.className = 'my-part-badge' + (isPending ? ' pending' : isSold ? ' sold' : '');
        badge.textContent = isPending ? 'PENDING' : isSold ? 'SOLD' : 'ACTIVE';

        sub.appendChild(price);
        sub.appendChild(badge);
        info.appendChild(title);
        info.appendChild(sub);

        const manageBtn = document.createElement('button');
        manageBtn.className = 'my-part-manage-btn';
        manageBtn.textContent = 'MANAGE';
        manageBtn.onclick = (e) => { e.stopPropagation(); openEditListing(part.id); };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'my-part-delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete listing';
        deleteBtn.onclick = (e) => { e.stopPropagation(); confirmDeleteListing(part.id); };

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(manageBtn);
        row.appendChild(deleteBtn);
        myPartsList.appendChild(row);
    });
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

function renderSellVehicleChip() {
    const chip    = document.getElementById('sellVehicleChip');
    const btn     = document.getElementById('sellVehiclePickerBtn');
    const mmEl    = document.getElementById('sellVehicleChipMakeModel');
    const ysEl    = document.getElementById('sellVehicleChipYearSeries');
    if (!chip || !btn) return;
    if (sellVehicleSelection?.make) {
        const { make, model, year, series } = sellVehicleSelection;
        if (mmEl) mmEl.textContent = `${make} ${model}`;
        if (ysEl) ysEl.textContent = [year, series].filter(Boolean).join(' · ');
        chip.style.display = 'flex';
        btn.style.display  = 'none';
    } else {
        chip.style.display = 'none';
        btn.style.display  = '';
    }
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
    if (sel?.make) {
        if (vpMake) vpMake.value = sel.make;
        const vpModel = document.getElementById('vpModel');
        if (vpModel) { vpModel.innerHTML = buildModelOptions(sel.make, sel.model); }
        const vpYear = document.getElementById('vpYear');
        if (vpYear) { vpYear.innerHTML = buildYearOptionsForModel(sel.make, sel.model, sel.year); }
        _refreshVpSeries(sel.make, sel.model, sel.year, sel.series);
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
    document.querySelectorAll('#vpGarageChips .vp-garage-chip').forEach(c => c.classList.remove('active'));
}

function vpOverlayClick(e) {
    if (e.target === document.getElementById('sellVehiclePickerModal')) closeSellVehiclePicker();
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
}

function onVpModelChange() {
    const make  = document.getElementById('vpMake')?.value  || '';
    const model = document.getElementById('vpModel')?.value || '';
    const yearEl = document.getElementById('vpYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '');
    _refreshVpSeries('', '', '', '');
}

function onVpYearChange() {
    const make  = document.getElementById('vpMake')?.value  || '';
    const model = document.getElementById('vpModel')?.value || '';
    const year  = document.getElementById('vpYear')?.value  || '';
    _refreshVpSeries(make, model, year, '');
}

function confirmSellVehicle() {
    const make   = document.getElementById('vpMake')?.value.trim()  || '';
    const model  = document.getElementById('vpModel')?.value.trim() || '';
    const year   = document.getElementById('vpYear')?.value.trim()  || '';
    const series = document.getElementById('vpSeries')?.value.trim() || '';
    if (!make || !model || !year) { showToast('Please select make, model and year.'); return; }
    // Check if series is required (series data exists for this combo but none selected)
    const seriesHtml = buildSeriesOptions(make, model, year, '');
    if (seriesHtml && !series) { showToast('Please select a series.'); return; }
    sellVehicleSelection = { make, model, year, series };
    renderSellVehicleChip();
    closeSellVehiclePicker();
}

function clearSellVehicle() {
    sellVehicleSelection = null;
    renderSellVehicleChip();
}

function initSellVehicleDropdowns(make, model, year, variant) {
    if (make && model && year) {
        sellVehicleSelection = { make, model, year, series: variant || '' };
    } else {
        sellVehicleSelection = null;
    }
    renderSellVehicleChip();
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
}

function onSellModelChange() {
    const make  = document.getElementById('sellMake')?.value || '';
    const model = document.getElementById('sellModel')?.value || '';
    const yearEl = document.getElementById('sellYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '');
    _refreshSellSeries('', '', '', ''); // hide series — wait for year selection
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

function openSellOverlay() {
    if (!userIsSignedIn) {
        openAuthDrawer(openSellOverlay);
        return;
    }

    currentEditingListingId = null;
    currentEditStatus = null;
    resetSellForm();
    populateSellLocationPicker();
    const fitting = document.getElementById('sellFittingAvailable');
    if (fitting && currentUserTier === 'pro' && userSettings.defaultFitting) fitting.checked = true;
    initSellVehicleDropdowns('', '', '');
    const title = document.getElementById('sellOverlayTitle');
    const submit = document.getElementById('sellSubmitBtn');
    if (title) title.textContent = 'LIST A PART';
    if (submit) submit.textContent = 'LIST PART NOW';
    const manageSection = document.getElementById('manageSection');
    if (manageSection) manageSection.style.display = 'none';
    updateSellFittingToggleVisibility();
    toggleDrawer('sellOverlay');
}

function listFromWanted(make, model, year) {
    openSellOverlay();
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
    const listing = userListings.find(l => l.id === listingId);
    if (!listing) return;
    currentEditingListingId = listingId;
    sellListingImages = [...listing.images];

    document.getElementById('sellTitle').value = listing.title || '';
    document.getElementById('sellCategory').value = listing.category || '';
    initSellVehicleDropdowns(listing.fits?.[0]?.make || '', listing.fits?.[0]?.model || '', listing.year || '', listing.fits?.[0]?.variant || '');
    document.getElementById('sellPostcode').value = listing.postcode || '';
    document.getElementById('sellLocation').value = listing.loc || '';
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

    renderSellImagePreviews();

    const titleEl = document.getElementById('sellOverlayTitle');
    const submit  = document.getElementById('sellSubmitBtn');
    if (titleEl) titleEl.textContent = 'MANAGE LISTING';
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
    const sellOverlayEl = document.getElementById('sellOverlay');
    if (sellOverlayEl) sellOverlayEl.style.zIndex = '3200';
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
    const odoSection = document.getElementById('sellOdometerSection');
    if (odoSection) odoSection.style.display = isPro ? 'block' : 'none';
}

function updateSellQuantityVisibility() {
    const section = document.getElementById('sellQuantitySection');
    if (section) section.style.display = (userIsSignedIn && currentUserTier === 'pro') ? 'block' : 'none';
}

function updateWarehouseBinVisibility() {
    const section = document.getElementById('sellWarehouseBinSection');
    if (!section) return;
    const warehouseOn = userIsSignedIn && currentUserTier === 'pro' && !!userSettings.warehouseManagement;
    section.style.display = warehouseOn ? 'block' : 'none';
    const printSection = document.getElementById('sellPrintLabelSection');
    if (printSection) printSection.style.display = (userIsSignedIn && currentUserTier === 'pro') ? 'block' : 'none';
}

function onToggleWarehouseManagement() {
    const el = document.getElementById('settingWarehouseManagement');
    if (el) saveSettingsToggle('warehouseManagement', el.checked);
    updateWarehouseBinVisibility();
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
    if (!title)    missing.push('Title');
    if (!category) missing.push('Category');
    if (!price)    missing.push('Price');
    if (!location) missing.push('Location');
    if (category && !VEHICLE_EXEMPT_CATEGORIES.includes(category)) {
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

    const fits = (make && model) ? [{ make: make.trim(), model: model.trim(), ...(variant ? { variant } : {}) }] : [];
    const fittingAvailable = userIsSignedIn && currentUserTier === 'pro' && document.getElementById('sellFittingAvailable')?.checked;
    const stockNumber = document.getElementById('sellStockNumber')?.value.trim() || null;
    const odoRaw = document.getElementById('sellOdometer')?.value.trim().replace(/\D/g, '');
    const odometer = (userIsSignedIn && currentUserTier === 'pro' && odoRaw) ? Number(odoRaw) : null;
    const openToOffers = !!document.getElementById('sellOpenToOffers')?.checked;
    const warehouseBin = (userIsSignedIn && currentUserTier === 'pro' && userSettings.warehouseManagement)
        ? (document.getElementById('sellWarehouseBin')?.value.trim() || null)
        : null;
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
        odometer
    };

    let message = 'Listing created';
    let syncTarget = null;
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
            const newListing = { id: nextPartId(), saves: 0, date: Date.now(), apcId: generateApcId(), ...listingPayload };
            userListings.push(newListing);
            syncTarget = newListing;
        }
    } else {
        const newListing = { id: nextPartId(), saves: 0, date: Date.now(), apcId: generateApcId(), ...listingPayload };
        userListings.push(newListing);
        syncTarget = newListing;
    }

    saveUserListings();

    const submitBtn = document.getElementById('sellSubmitBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publishing…'; }

    if (syncTarget) await syncListingToSupabase(syncTarget);

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
    }, 1500);
}

function printSellLabel(listing) {
    const fits = (listing.fits || []).map(f => [f.make, f.model].filter(Boolean).join(' ')).join(', ') || 'Universal';
    const condition = { new_oem: 'New — OEM', new_aftermarket: 'New — Aftermarket', used: 'Used', refurbished: 'Refurbished', parts_only: 'Parts Only' }[listing.condition] || listing.condition || '';
    const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    const apcId = listing.apcId || ('APC-' + listing.id);
    const bin  = listing.warehouseBin ? `<tr><td>Bin</td><td><strong>${listing.warehouseBin}</strong></td></tr>` : '';
    const year = listing.year ? `<tr><td>Year</td><td>${listing.year}</td></tr>` : '';
    const baseUrl = (location.protocol === 'file:' || location.hostname === 'localhost')
        ? 'https://g-561.github.io/APC.Auto/'
        : `${location.origin}${location.pathname}`;
    const listingUrl = `${baseUrl}?item=${listing.id}`;

    // Generate QR code in a hidden temp element, grab the data URL, then open print tab
    const qrTemp = document.createElement('div');
    qrTemp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(qrTemp);

    if (window.QRCode) {
        new QRCode(qrTemp, { text: listingUrl, width: 90, height: 90, correctLevel: QRCode.CorrectLevel.M });
    }

    setTimeout(() => {
        const qrImg = qrTemp.querySelector('canvas') || qrTemp.querySelector('img');
        let qrSrc = '';
        if (qrImg instanceof HTMLCanvasElement) qrSrc = qrImg.toDataURL();
        else if (qrImg) qrSrc = qrImg.src;
        document.body.removeChild(qrTemp);

        const qrHtml = qrSrc ? `<img src="${qrSrc}" width="90" height="90" />` : '';

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>APC Label — ${apcId}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .sell-label { border: 2px solid #222; border-radius: 6px; padding: 10px 12px; width: 100%; }
  .sell-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 8px; }
  .sell-brand { font-size: 18px; font-weight: 900; color: #f7941d; letter-spacing: -0.5px; }
  .sell-date { font-size: 10px; color: #aaa; text-align: right; }
  .sell-body { display: flex; gap: 12px; align-items: flex-start; }
  .sell-left { flex: 1; min-width: 0; }
  .sell-right { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .sell-title { font-size: 13px; font-weight: 800; margin-bottom: 7px; line-height: 1.3; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  td { padding: 2px 6px 2px 0; vertical-align: top; }
  td:first-child { color: #555; width: 65px; white-space: nowrap; }
  .sell-price-row { margin-top: 7px; border-top: 2px solid #222; padding-top: 7px; display: flex; align-items: baseline; gap: 6px; }
  .sell-price { font-size: 20px; font-weight: 900; }
  .sell-price-label { font-size: 11px; color: #555; }
  .sell-qr-id { font-size: 9px; color: #555; text-align: center; margin-top: 2px; word-break: break-all; max-width: 90px; }
  .sell-url { font-size: 8px; color: #888; margin-top: 5px; word-break: break-all; }
  @page { size: A6 landscape; margin: 8mm; }
</style>
</head><body>
<div class="sell-label">
  <div class="sell-header">
    <div class="sell-brand">AUTO PARTS CONNECTION</div>
    <div class="sell-date">${date}</div>
  </div>
  <div class="sell-body">
    <div class="sell-left">
      <div class="sell-title">${listing.title || ''}</div>
      <table>
        <tr><td>Item No.</td><td><strong>${apcId}</strong></td></tr>
        <tr><td>Condition</td><td>${condition}</td></tr>
        <tr><td>Fits</td><td>${fits}</td></tr>
        ${year}${bin}
        ${listing.stockNumber ? `<tr><td>Stock #</td><td>${listing.stockNumber}</td></tr>` : ''}
      </table>
      <div class="sell-price-row">
        <span class="sell-price">$${listing.price}</span>
        <span class="sell-price-label">Listed price</span>
      </div>
      <div class="sell-url">${listingUrl}</div>
    </div>
    <div class="sell-right">
      ${qrHtml}
      <div class="sell-qr-id">${apcId}</div>
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body></html>`;

        const tab = window.open('', '_blank');
        if (tab) { tab.document.open(); tab.document.write(html); tab.document.close(); }
        else showToast('Allow pop-ups to print labels');
    }, 150);
}

// --- DYNAMIC ITEM DETAIL ---
function openItemDetail(partId, _restoring = false, _fromInbox = false) {
    const part = getPartById(partId) || findPartAnywhere(partId);
    if (!part) return;

    const fromInbox   = _fromInbox || document.getElementById('inboxDrawer')?.classList.contains('active');
    const inStoreView = _detailHistory.length > 0 || document.getElementById('storefrontDrawer')?.classList.contains('active');

    // Push current listing to history when opening a new one from within the storefront
    const detailAlreadyOpen = document.getElementById('detailOverlay')?.classList.contains('active');
    if (!_restoring && detailAlreadyOpen && currentOpenPartId && currentOpenPartId !== partId) {
        if (document.getElementById('storefrontDrawer')?.classList.contains('active')) {
            _detailHistory.push(currentOpenPartId);
        }
    }

    currentOpenPartId = partId;
    if (!_restoring) addToRecentlyViewed(partId);
    history.pushState(null, '', '?item=' + partId);

    // 1. Carousel — images + dot indicators
    const carousel = document.getElementById('imageCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    if (carousel) {
        carousel.innerHTML = '';
        (part.images || []).forEach((src, i) => {
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = 'min-width:100%; scroll-snap-align:start; aspect-ratio:1/1; object-fit:contain; background:#f4f4f4; cursor: zoom-in;';
            img.alt = part.title;
            img.onclick = () => openDetailImageViewer(src, part.images || [], i);
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
    safeText(document.getElementById('detailLoc'), part.loc);
    safeText(document.getElementById('chatPartnerName'), part.seller);
    safeText(document.getElementById('detailDescription'), part.description || 'Fully functional part. Tested and ready for installation.');
    syncDetailSaveButton(part.id);

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
            detailMsgBtn.onclick           = () => openEditListing(part.id);
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

    // 3. Update the seller header in the overlay
    const sellerHeaderName = document.getElementById('detailSellerName');
    const sellerHeaderSub  = document.getElementById('detailSellerSub');
    const sellerAvatar     = document.getElementById('detailSellerAvatar');
    if (sellerHeaderName) sellerHeaderName.textContent = part.seller;
    if (sellerHeaderSub)  sellerHeaderSub.textContent  = '';

    // Avatar: show profile pic if own listing, otherwise tier-coloured initial
    const sellerPic   = isOwnListing ? (userSettings.profilePic || '') : '';
    const tierBg      = part.isPro ? 'var(--apc-blue)' : 'var(--apc-orange)';
    const tierShadow  = part.isPro ? '0 6px 16px rgba(0,122,255,0.18)' : '0 6px 16px rgba(255,149,0,0.18)';
    function applyAvatar(el) {
        if (!el) return;
        if (sellerPic) {
            el.innerHTML = `<img src="${sellerPic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
            el.style.background  = 'transparent';
            el.style.boxShadow   = 'none';
        } else {
            el.textContent       = (part.seller || '?').charAt(0).toUpperCase();
            el.style.background  = tierBg;
            el.style.boxShadow   = tierShadow;
        }
    }
    applyAvatar(sellerAvatar);

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
    applyAvatar(colAvatar);
    if (colName)   colName.textContent   = part.seller;
    if (colProBadge) colProBadge.style.display = part.isPro ? 'inline-block' : 'none';

    // Apply blur lock to col seller card (also gets .locked class for overlay visibility — done above)
    if (detailSellerColCard) detailSellerColCard.classList.toggle('blurred-detail', !userIsSignedIn);

    const workshopSection = document.getElementById('detailWorkshopSection');
    const workshopHeadline = document.getElementById('detailWorkshopHeadline');
    const workshopCards = document.getElementById('detailWorkshopCards');
    if (workshopSection) workshopSection.style.display = (fromInbox || inStoreView) ? 'none' : '';
    if (workshopSection && workshopHeadline && workshopCards && !fromInbox) {
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
    }

    // 4. Footer — more from seller or similar items, padded to TARGET
    const footer = document.getElementById('dynamicDetailFooter');
    if (!footer) return;

    const FOOTER_TARGET = window.innerWidth >= 900 ? 5 : 6;
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
            const img = (p.images && p.images[0]) ? p.images[0] : 'images/placeholder.png';
            return `<div class="detail-mini-card" onclick="openItemDetail(${p.id})">
                <img class="detail-mini-img" src="${img}" alt="${escapeHtml(p.title)}">
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
            detailEl.style.zIndex = ''; // drop back below store so store is visible on top
        } else if (document.getElementById('storefrontDrawer')?.classList.contains('active')) {
            detailEl.style.zIndex = '3250'; // lift above store to show this listing
        }
    } else {
        const parentOpen = [...document.querySelectorAll('.drawer.active')].some(d => d.id !== 'detailOverlay');
        if (parentOpen && detailEl) detailEl.style.zIndex = '3250'; // float above inbox/chat (z-index 3200)
        toggleDrawer('detailOverlay', parentOpen);
    }
}

function onDetailSellerClick() {
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    openStorefront(currentOpenPartId);
}

function closeDetailOverlay() {
    if (_detailHistory.length > 0) {
        const prevId = _detailHistory.pop();
        openItemDetail(prevId, true); // restore previous listing, leave overlay open
        return;
    }
    _detailHistory = [];
    const el = document.getElementById('detailOverlay');
    if (el) { el.classList.remove('active', 'chat-card'); el.style.zIndex = ''; el.style.transform = ''; el.style.opacity = ''; el.style.transition = ''; }
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
               !overlay.classList.contains('chat-card') &&
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

let _lightboxImages = [];
let _lightboxIdx    = 0;

function carouselStep(dir) {
    const carousel = document.getElementById('imageCarousel');
    if (carousel) carousel.scrollBy({ left: dir * carousel.offsetWidth, behavior: 'smooth' });
}

function openDetailImageViewer(src, images, idx) {
    _lightboxImages = (images && images.length) ? images : [src];
    _lightboxIdx    = (idx !== undefined) ? idx : _lightboxImages.indexOf(src);
    if (_lightboxIdx < 0) _lightboxIdx = 0;

    const lightbox = document.getElementById('imageLightbox');
    const image    = document.getElementById('lightboxImage');
    if (!lightbox || !image) return;

    // Build dots once per open
    const dotsEl = document.getElementById('lightboxDots');
    if (dotsEl) {
        dotsEl.innerHTML = '';
        if (_lightboxImages.length > 1) {
            _lightboxImages.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'carousel-dot' + (i === _lightboxIdx ? ' active' : '');
                dot.onclick = (e) => { e.stopPropagation(); _lightboxIdx = i; image.src = _lightboxImages[i]; updateLightboxNav(); };
                dotsEl.appendChild(dot);
            });
        }
    }

    image.src = _lightboxImages[_lightboxIdx];
    lightbox.style.zIndex = '19999';
    lightbox.classList.add('active');
    updateLightboxNav();
    // Allow pinch-to-zoom on the lightbox image
    document.querySelector('meta[name=viewport]').setAttribute('content',
        'width=device-width, initial-scale=1.0');

    _initLightboxPullDown(lightbox);
}

function _initLightboxPullDown(lightbox) {
    const inner = lightbox.querySelector('.image-lightbox-inner');
    if (!inner || inner._pullDownBound) return;
    inner._pullDownBound = true;

    let startY = 0, startX = 0, dragging = false;
    const THRESHOLD = 110;

    inner.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        dragging = false;
        inner.style.transition = 'none';
    }, { passive: true });

    inner.addEventListener('touchmove', e => {
        if (e.touches.length !== 1) { inner.style.transform = ''; return; }
        const dy = e.touches[0].clientY - startY;
        const dx = e.touches[0].clientX - startX;
        if (!dragging && Math.abs(dy) < 8) return;
        if (!dragging && Math.abs(dx) > Math.abs(dy)) return; // horizontal swipe — leave it
        dragging = true;
        if (dy < 0) return; // don't allow dragging up
        const progress = Math.min(dy / THRESHOLD, 1);
        inner.style.transform = `translateY(${dy * 0.6}px) scale(${1 - progress * 0.12})`;
        lightbox.style.background = `rgba(0,0,0,${0.92 - progress * 0.72})`;
    }, { passive: true });

    inner.addEventListener('touchend', e => {
        if (!dragging) return;
        const dy = e.changedTouches[0].clientY - startY;
        inner.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        lightbox.style.transition = 'background 0.25s ease';
        if (dy >= THRESHOLD) {
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
        dragging = false;
    }, { passive: true });
}

function lightboxNav(dir) {
    if (_lightboxImages.length < 2) return;
    _lightboxIdx = (_lightboxIdx + dir + _lightboxImages.length) % _lightboxImages.length;
    const image = document.getElementById('lightboxImage');
    if (image) image.src = _lightboxImages[_lightboxIdx];
    updateLightboxNav();
}

function updateLightboxNav() {
    const show = _lightboxImages.length > 1;
    const prev = document.querySelector('.lightbox-prev');
    const next = document.querySelector('.lightbox-next');
    if (prev) prev.style.display = show ? '' : 'none';
    if (next) next.style.display = show ? '' : 'none';
    document.querySelectorAll('#lightboxDots .carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === _lightboxIdx);
    });
}

function closeDetailImageViewer() {
    const lightbox = document.getElementById('imageLightbox');
    const image = document.getElementById('lightboxImage');
    if (!lightbox || !image) return;
    lightbox.classList.remove('active');
    image.src = '';
    // Restore zoom lock for the rest of the app
    document.querySelector('meta[name=viewport]').setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function shareCurrentListing(btn) {
    if (btn) btn.blur(); // clear focus/active state so button doesn't stay highlighted
    const part = getPartById(currentOpenPartId);
    if (!part) return;
    const text = `${part.title} — $${part.price} | Auto Parts Connection`;
    if (navigator.share) {
        navigator.share({ title: part.title, text, url: window.location.href }).catch(() => {});
    } else {
        navigator.clipboard?.writeText(text)
            .then(() => showToast('Link copied!'))
            .catch(() => showToast('Share not available on this browser'));
    }
}

// --- SELLER STOREFRONT ---
function renderStorefront(sellerName, isPro, logo, businessName, abn, about, location, banner) {
    currentStorefrontSeller = sellerName;
    const initial = (sellerName || 'S').charAt(0).toUpperCase();

    // Hero banner
    const hero = document.querySelector('#storefrontDrawer .sf-hero');
    if (hero) {
        if (banner) {
            hero.style.backgroundImage = `url(${banner})`;
            hero.style.backgroundSize = 'cover';
            hero.style.backgroundPosition = 'center';
            hero.classList.add('has-banner');
        } else {
            hero.style.backgroundImage = '';
            hero.style.backgroundSize = '';
            hero.style.backgroundPosition = '';
            hero.classList.remove('has-banner');
        }
    }

    // Logo / initials
    const logoImg      = document.getElementById('sfLogoImg');
    const logoInitials = document.getElementById('sfLogoInitials');
    if (logo) {
        if (logoImg)      { logoImg.src = logo; logoImg.style.display = 'block'; }
        if (logoInitials)   logoInitials.style.display = 'none';
    } else {
        if (logoImg)        logoImg.style.display = 'none';
        if (logoInitials) { logoInitials.style.display = ''; logoInitials.textContent = initial; }
    }

    // Identity
    const sfBizName = document.getElementById('sfBusinessName');
    const sfProBadge = document.getElementById('sfProBadge');
    const sfAbnChip  = document.getElementById('sfAbnChip');
    const sfSeller   = document.getElementById('sfSellerName');
    const sfLoc      = document.getElementById('sfLocation');

    if (sfBizName) { sfBizName.textContent = businessName || ''; sfBizName.style.display = businessName ? '' : 'none'; }
    if (sfProBadge)  sfProBadge.style.display = isPro ? '' : 'none';
    if (sfAbnChip)   sfAbnChip.style.display  = (isPro && abn) ? '' : 'none';
    if (sfSeller)    sfSeller.textContent = sellerName || '';
    if (sfLoc)     { sfLoc.textContent = location ? '📍 ' + location : ''; sfLoc.style.display = location ? '' : 'none'; }

    // About
    const sfAbout     = document.getElementById('sfAboutSection');
    const sfAboutText = document.getElementById('sfAboutText');
    if (sfAbout) sfAbout.style.display = (isPro && about) ? '' : 'none';
    if (sfAboutText) sfAboutText.textContent = about || '';

    // Stats
    const allParts   = getAllParts().filter(p => p.seller === sellerName);
    const totalSaves = allParts.reduce((s, p) => s + (p.saves || 0), 0);
    const listEl = document.getElementById('sfStatListings');
    const saveEl = document.getElementById('sfStatSaves');
    if (listEl) listEl.textContent = allParts.length;
    if (saveEl) saveEl.textContent = totalSaves;

    // Grid
    const grid = document.getElementById('sellerPartsGrid');
    if (grid) {
        grid.innerHTML = '';
        allParts.forEach(p => { grid.innerHTML += buildCardHTML(p); });
    }

    // Clear search
    const searchEl = document.getElementById('storefrontSearch');
    if (searchEl) searchEl.value = '';

    syncStoreSaveButton();
}

function filterStorefront() {
    const q = (document.getElementById('storefrontSearch')?.value || '').toLowerCase().trim();
    const grid = document.getElementById('sellerPartsGrid');
    if (!grid) return;
    const sellerName = grid.dataset.seller || '';
    const parts = getAllParts().filter(p => p.seller === sellerName &&
        (!q || p.title.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)));
    grid.innerHTML = '';
    parts.forEach(p => { grid.innerHTML += buildCardHTML(p); });
}

function openStorefront(partId) {
    const part = getPartById(partId);
    if (!part) return;
    const isOwn = part.seller === getCurrentSellerName();
    // All users get their profile pic; Pro-only fields require isOwn + isPro
    const logo         = isOwn ? (userSettings.profilePic || userSettings.businessLogo || '') : '';
    const banner       = (isOwn && part.isPro) ? (userSettings.businessBanner || '') : '';
    const businessName = (isOwn && part.isPro) ? (userSettings.businessName   || '') : '';
    const abn          = (isOwn && part.isPro) ? (userSettings.abn            || '') : '';
    const about        = (isOwn && part.isPro) ? (userSettings.about          || '') : '';
    const location     = isOwn ? (userSettings.location || '') : '';
    const grid = document.getElementById('sellerPartsGrid');
    if (grid) grid.dataset.seller = part.seller;
    renderStorefront(part.seller, part.isPro, logo, businessName, abn, about, location, banner);
    const sfMsgBtn = document.getElementById('sfMsgBtn');
    if (sfMsgBtn) sfMsgBtn.style.display = isOwn ? 'none' : '';
    // Float above detailOverlay (z-index 3150 mobile / 2050 desktop) when opening from within a listing
    const sfEl = document.getElementById('storefrontDrawer');
    if (sfEl) sfEl.style.zIndex = '3200';
    const backBar = document.getElementById('storefrontBackBar');
    if (backBar) backBar.style.display = currentOpenPartId ? '' : 'none';
    toggleDrawer('storefrontDrawer', true);
}

// --- WORKSHOP / SERVICE STOREFRONT ---

function openWorkshopStorefront(data, fromBrowser = false) {
    renderWorkshopStorefront(data);
    const sfEl  = document.getElementById('storefrontDrawer');
    const backBar = document.getElementById('storefrontBackBar');
    if (sfEl) sfEl.style.zIndex = '';
    if (backBar) backBar.style.display = 'none';
    toggleDrawer('storefrontDrawer', true);
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
    if (addrEl)  addrEl.innerHTML = addr ? '📍 ' + addr : '';

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
    if (makesChips) makesChips.innerHTML      = makesArr.map(m => `<span class="sf-chip">${m}</span>`).join('');

    // Parts categories chips (supplier/both)
    const catsSec  = document.getElementById('sfCatsSection');
    const catsChips = document.getElementById('sfCatsChips');
    const condEl    = document.getElementById('sfPartsCondition');
    const cats = data.partsCategories || data.parts_categories || [];
    const showCats = (bizType === 'supplier' || bizType === 'both') && cats.length;
    if (catsSec)   catsSec.style.display  = showCats ? '' : 'none';
    if (catsChips) catsChips.innerHTML    = cats.map(c => `<span class="sf-chip">${CAT_LABELS[c] || c}</span>`).join('');
    if (condEl) {
        const pt = data.partsType || data.parts_type || '';
        condEl.textContent = pt === 'new' ? 'New parts only' : pt === 'used' ? 'Used / reconditioned parts' : pt === 'both' ? 'New & used parts' : '';
    }

    // Hide search + parts grid for service-only
    const searchWrap = document.querySelector('#storefrontDrawer .sf-search-wrap');
    const partsGrid  = document.getElementById('sellerPartsGrid');
    const isService  = bizType === 'service';
    if (searchWrap) searchWrap.style.display = isService ? 'none' : '';
    if (partsGrid)  partsGrid.style.display  = isService ? 'none' : '';
}

// Fetch a workshop profile by userId from Supabase, then open their storefront
async function handleStoreDeepLink(userId) {
    if (!userId) return;
    if (!sb) return;
    // Always open the parts storefront — works for own profile and other users
    openStorefrontByUserId(userId);
}

// Sync workshop profile to Supabase after saving (Pro users)
async function syncWorkshopProfileToSupabase() {
    if (!userIsSignedIn || !currentUserId || !sb || currentUserTier !== 'pro') return;
    await sb.from('workshop_profiles').upsert({
        user_id:          currentUserId,
        business_name:    userSettings.businessName || '',
        about:            userSettings.about        || '',
        address:          workshopProfile.address   || '',
        abn:              userSettings.abn          || '',
        biz_type:         userSettings.businessType || 'supplier',
        services:         workshopProfile.services  || {},
        vehicles:         workshopProfile.vehicles  || [],
        parts_categories: workshopProfile.partsCategories || [],
        parts_type:       workshopProfile.partsType || 'new',
        wrecking:         workshopProfile.wrecking  || false,
        wrecking_makes:   workshopProfile.wreckingMakes || [],
        logo_url:         userSettings.businessLogo || userSettings.profilePic || '',
        banner_url:       userSettings.businessBanner || '',
        published:        true,
    }, { onConflict: 'user_id' });
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

    // Generate QR into hidden div, then draw entire badge once QR image is ready
    const qrTemp = document.getElementById('badgeQrTemp');
    if (qrTemp) {
        qrTemp.innerHTML = '';
        new QRCode(qrTemp, { text: storeUrl, width: 120, height: 120, colorDark: '#1a1a1a', colorLight: '#ffffff' });
    }
    setTimeout(() => _drawApcBadgeCanvas(biz, qrTemp), 300);
}

function _drawApcBadgeCanvas(biz, qrTemp) {
    const canvas = document.getElementById('apcBadgeCanvas');
    if (!canvas) return;

    const W = 420, H = 126;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = '300px';
    canvas.style.height = '90px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any leftover transform from previous calls
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#F7941D';
    _roundRect(ctx, 0, 0, W, H, 12);
    ctx.fill();

    // Left text
    ctx.fillStyle = 'white';
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('FIND US ON', 22, 32);
    ctx.font = '900 48px system-ui, -apple-system, sans-serif';
    ctx.fillText('APC', 18, 84);
    ctx.font = biz ? '700 13px system-ui, -apple-system, sans-serif' : '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = biz ? 'white' : 'rgba(255,255,255,0.7)';
    ctx.fillText(biz || 'Auto Parts Connection', 22, 108);

    // White QR box
    const qx = W - 132, qy = 10, qs = 106;
    ctx.fillStyle = 'white';
    _roundRect(ctx, qx, qy, qs, qs, 8);
    ctx.fill();

    // "Scan to view profile" label
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 9px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan to view profile', qx + qs / 2, H - 4);
    ctx.textAlign = 'left';

    // Draw QR image into the white box
    const qrImg = qrTemp?.querySelector('img') || qrTemp?.querySelector('canvas');
    if (qrImg) {
        try { ctx.drawImage(qrImg, qx + 3, qy + 3, qs - 6, qs - 6); } catch (e) {}
    }
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

    pendingGeneralEnquiry = {
        seller,
        isPro: document.getElementById('sfProBadge')?.style.display !== 'none'
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
    const part = getPartById(currentOpenPartId);
    if (!part) return;
    // Block self-messaging
    if ((currentUserId && part.sellerId === currentUserId) || part.seller === getCurrentSellerName()) return;

    // If a conversation already exists for this part, go straight to the inbox thread
    const existing = conversations.find(c => c.partId === currentOpenPartId || (part.supabaseId && c.partId === part.supabaseId));
    if (existing) {
        toggleDrawer('inboxDrawer', true);
        switchInboxTab('chats');
        openInboxConv(existing.id);
        return;
    }

    // First contact — open the floating compose card
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

let _lastSentConvId = null;

function sendContactMessage() {
    const msgEl = document.getElementById('contactCardMsg');
    const text  = msgEl ? msgEl.value.trim() : '';
    if (!text) return;

    let seller, isPro, partId, partTitle;
    if (pendingGeneralEnquiry) {
        ({ seller, isPro } = pendingGeneralEnquiry);
        partId = 'general';
        partTitle = 'General Enquiry';
        pendingGeneralEnquiry = null;
    } else {
        const part = getPartById(currentOpenPartId);
        if (!part) return;
        seller = part.seller;
        isPro  = !!part.isPro;
        partId = part.supabaseId || currentOpenPartId;
        partTitle = undefined;
    }

    // Create conversation and add the opening message
    const conv = { id: nextConvId(), with: seller, isPro, unread: false, partId, ...(partTitle && { partTitle }), msgs: [] };
    conv.msgs.push({ id: 1, sent: true, text, time: 'Today', clock: nowClock() });
    if (currentUserId) conv.buyerId = currentUserId;
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
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            currentUserId = session.user.id;
            // Use display_name from session metadata (set at sign-up) — avoids showing email prefix
            const emailName = session.user.email.split('@')[0];
            const metaName  = session.user.user_metadata?.display_name || emailName;
            // Use remembered tier as the initial value so Pro doesn't flicker to Standard
            const remembered = loadRememberedUser();
            const seedTier = (remembered?.email === session.user.email) ? (remembered?.tier || 'standard') : 'standard';
            signIn(metaName, seedTier, false, session.user.email);
            // Fetch real name + tier from profile — always authoritative
            sb.from('profiles').select('*').eq('id', session.user.id).single()
                .then(({ data: profile, error: profErr }) => {
                    if (profErr) console.warn('Profile fetch:', profErr.message);
                    if (profile) {
                        const name = profile.display_name || metaName;
                        const tier = profile.is_pro ? 'pro' : 'standard';
                        signIn(name, tier, false, session.user.email);
                        saveRememberedUser({ name, tier, email: session.user.email });
                        // Supabase is authoritative — always overwrite local values with server data
                        userSettings.location     = profile.location      || userSettings.location     || '';
                        userSettings.businessName = profile.business_name || '';
                        userSettings.abn          = profile.abn           || '';
                        userSettings.about        = profile.about         || '';
                        userSettings.profilePic   = profile.profile_pic   || userSettings.profilePic   || '';
                        userSettings.postcode     = profile.postcode      || userSettings.postcode     || '';
                        saveUserSettings(); populateLocationPickers(); renderProfilePicPreview();
                    }
                });
            loadPublicListingsFromSupabase();
            loadUserListingsFromSupabase(session.user.id);
            loadConversationsFromSupabase(session.user.id);
            loadVehiclesFromSupabase(session.user.id);
            loadWantedFromSupabase(session.user.id);
            loadSavedListingsFromSupabase(session.user.id);
            loadPublicWantedFromSupabase();
        } else if (event === 'SIGNED_OUT') {
            unsubscribeRealtime();
            userIsSignedIn = false;
            currentUserName  = null;
            currentUserTier  = null;
            currentUserId    = null;
            currentUserEmail = null;
            // Clear all user-specific data so it doesn't bleed into the next account on the same device
            userListings.splice(0); saveUserListings();
            conversations.splice(0); saveConversations();
            myVehicles.splice(0); saveVehicles();
            myWanted.splice(0); saveWanted();
            savedParts.clear(); persistSavedParts();
            // Reload public listings so the signed-out user's listings appear in the grid
            partDatabase.splice(0);
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

function initVehicleDropdowns(make, model, year, variant) {
    const makeEl  = document.getElementById('vehMake');
    const modelEl = document.getElementById('vehModel');
    const yearEl  = document.getElementById('vehYear');
    if (!makeEl || !modelEl || !yearEl) return;
    makeEl.innerHTML  = buildMakeOptions(make || '');
    modelEl.innerHTML = buildModelOptions(make || '', model || '');
    yearEl.innerHTML  = buildYearOptionsForModel(make || '', model || '', year || '');
    _refreshVehSeries(make || '', model || '', year || '', variant || '');
}

function onVehMakeChange() {
    const make    = document.getElementById('vehMake')?.value || '';
    const modelEl = document.getElementById('vehModel');
    const yearEl  = document.getElementById('vehYear');
    if (modelEl) modelEl.innerHTML = buildModelOptions(make, '');
    if (yearEl)  yearEl.innerHTML  = buildYearOptions('');
    _refreshVehSeries('', '', '', '');
}

function onVehModelChange() {
    const make   = document.getElementById('vehMake')?.value || '';
    const model  = document.getElementById('vehModel')?.value || '';
    const yearEl = document.getElementById('vehYear');
    if (yearEl) yearEl.innerHTML = buildYearOptionsForModel(make, model, '');
    _refreshVehSeries('', '', '', '');
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
    initVehicleDropdowns(v.make || '', v.model || '', v.year || '', v.variant || '');
    document.getElementById('vehNickname').value = v.nickname || '';
    document.getElementById('vehVin').value      = v.vin      || '';
    toggleDrawer('addVehicleDrawer', true);
}

// Back to garage from vehicle detail

// Validate + save the new vehicle
function submitAddVehicle() {
    const make     = document.getElementById('vehMake').value.trim();
    const model    = document.getElementById('vehModel').value.trim();
    const yearStr  = document.getElementById('vehYear').value.trim();
    const variant  = document.getElementById('vehVariant').value.trim();
    const nickname = document.getElementById('vehNickname').value.trim();
    const vin      = document.getElementById('vehVin').value.trim();

    if (!make || !model) {
        showToast('Make and Model are required.');
        return;
    }
    const year = yearStr ? Number(yearStr) : '';

    if (editingVehicleId) {
        const idx = myVehicles.findIndex(v => v.id === editingVehicleId);
        if (idx !== -1) {
            myVehicles[idx] = { ...myVehicles[idx], make, model, year,
                variant: variant||'', nickname: nickname||'', vin: vin||'' };
            if (currentUserId && myVehicles[idx].supabaseId) {
                sb.from('vehicles').update({
                    make, model, year: String(year||''),
                    variant: variant||'', nickname: nickname||'', vin: vin||''
                }).eq('id', myVehicles[idx].supabaseId)
                  .then(({ error }) => { if (error) console.warn('vehicle update:', error.message); });
            }
        }
        editingVehicleId = null;
    } else {
        const newV = {
            id: nextVehicleId(), make, model, year,
            variant: variant||'', nickname: nickname||'', vin: vin||''
        };
        myVehicles.push(newV);
        if (currentUserId) {
            sb.from('vehicles').insert({
                user_id: currentUserId, make, model, year: String(year||''),
                variant: variant||'', nickname: nickname||'', vin: vin||''
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


// Render the garage list — XSS-safe via createElement + textContent
function renderGarage() {
    const list = document.getElementById('garageVehicleList');
    if (!list) return;
    list.innerHTML = '';

    if (myVehicles.length === 0) {
        list.innerHTML = `
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
        const meta = [v.year, v.variant, v.nickname].filter(Boolean).join(' · ');
        const row = document.createElement('div');
        row.className = 'garage-row';
        row.dataset.vehicleId = v.id;
        row.onclick = () => selectGarageVehicle(v.id);
        row.innerHTML = `
            <div class="garage-row-info">
                <div class="garage-row-name">${v.make} ${v.model}</div>
                ${meta ? `<div class="garage-row-meta">${meta}</div>` : ''}
            </div>
            <div class="garage-row-actions">
                <button class="garage-row-edit" onclick="event.stopPropagation(); openEditVehicleDrawer(${v.id})">Edit</button>
                <button class="garage-row-delete" onclick="event.stopPropagation(); deleteVehicle(${v.id})">×</button>
            </div>`;
        list.appendChild(row);
    });

    if (myVehicles[0]) selectGarageVehicle(myVehicles[0].id);
}

function selectGarageVehicle(vehicleId) {
    currentVehicleId  = vehicleId;
    currentVehicleTab = 'wanted';
    document.querySelectorAll('#garageVehicleList .garage-row').forEach(r => {
        r.classList.toggle('garage-row-selected', Number(r.dataset.vehicleId) === vehicleId);
    });
    renderGarageInlineDetail();
}

function renderGarageInlineDetail() {
    const v      = myVehicles.find(x => x.id === currentVehicleId);
    const detail = document.getElementById('garageInlineDetail');
    if (!detail) return;
    if (!v) { detail.style.display = 'none'; return; }

    detail.style.display = 'block';

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
            savedParts.has(p.id) && (
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

// --- SAVED PARTS: data model + persistence ---
const SAVED_STORAGE_KEY = 'apc.saved.v1';
let savedParts = loadSavedParts();   // Set<partId>
let savedPartsTab = 'all';           // 'all' | 'active' | 'ended' | 'stores'

// --- SAVED STORES ---
const SAVED_STORES_KEY = 'apc.savedStores.v1';
let savedStores = loadSavedStores(); // Array<{ sellerName, businessName, isPro, savedAt }>
let currentStorefrontSeller = null;  // tracks whose storefront is open
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
    container.innerHTML = savedStores.map(store => {
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
                <button class="saved-store-visit-btn" onclick="openStoreFromSaved('${escapeHtml(store.sellerName)}')">Visit ›</button>
                <button class="saved-store-unsave-btn" onclick="toggleSaveStore('${escapeHtml(store.sellerName)}','${escapeHtml(store.businessName || '')}',${store.isPro})">×</button>
            </div>
        </div>`;
    }).join('');
}
function openStoreFromSaved(sellerName) {
    const part = [...partDatabase, ...userListings].find(p => p.seller === sellerName);
    const store = savedStores.find(s => s.sellerName === sellerName);
    closeSavedPartsDrawer();
    const isOwnStore = sellerName === getCurrentSellerName();
    const storeLogo  = isOwnStore ? (userSettings.profilePic || userSettings.businessLogo || '') : '';
    renderStorefront(
        sellerName, store?.isPro || (isOwnStore && currentUserTier === 'pro'),
        storeLogo, store?.businessName || (isOwnStore ? userSettings.businessName || '' : ''),
        '', isOwnStore ? userSettings.about || '' : '', isOwnStore ? userSettings.location || '' : '', ''
    );
    const grid = document.getElementById('sellerPartsGrid');
    if (grid) grid.dataset.seller = sellerName;
    const backBar3 = document.getElementById('storefrontBackBar');
    if (backBar3) backBar3.style.display = 'none';
    toggleDrawer('storefrontDrawer');
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
    const listing = userListings.find(l => l.id === partId);
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
                sb.from('saved_listings').upsert(
                    { user_id: currentUserId, listing_id: part.supabaseId },
                    { onConflict: 'user_id,listing_id' }
                ).then(({ error }) => { if (error) console.warn('save listing:', error.message); });
            }
            // Update saves_count on the listing atomically
            sb.rpc('update_saves_count', { listing_uuid: part.supabaseId, delta })
              .then(({ error }) => { if (error) console.warn('saves_count update:', error.message); });
            // Reflect immediately in local partDatabase so cards update without reload
            const pubPart = partDatabase.find(p => p.supabaseId === part.supabaseId);
            if (pubPart) pubPart.saves = Math.max(0, (pubPart.saves || 0) + delta);
        }
    }
    syncDetailSaveButton(partId);
    renderMainGrid(); // refresh saved indicators on cards
    if (currentVehicleId && currentVehicleTab === 'saved') renderGarageTab();
    if (document.getElementById('savedPartsDrawer')?.classList.contains('active')) renderSavedParts();
}

function closeSavedPartsDrawer() {
    const el = document.getElementById('savedPartsDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}
function onMenuOpenSavedParts() {
    closeAccountDropdown();
    savedPartsTab = 'all';
    renderSavedParts();
    toggleDrawer('savedPartsDrawer');
}

function setSavedPartsTab(tab) {
    savedPartsTab = tab;
    renderSavedParts();
}
function buildSavedTabsHTML(total, active, ended) {
    return `<div class="sp-tabs">
        <button class="sp-tab ${savedPartsTab === 'all'    ? 'sp-tab-active' : ''}" onclick="setSavedPartsTab('all')">All <span class="sp-tab-count">${total}</span></button>
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
        const tabsHTML = buildSavedTabsHTML(totalCount, [...savedParts].filter(id => getPartById(id)).length, [...savedParts].filter(id => !getPartById(id) && findPartAnywhere(id)).length);
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

    const tabsHTML = buildSavedTabsHTML(totalCount, activeParts.length, staleParts.length);

    const buildStaleHTML = (parts) => parts.map(part => {
        const similar = findSimilarActiveParts(part);
        const badge = part.status === 'sold' ? 'SOLD' : 'REMOVED';
        return `
        <div class="stale-row">
            <div class="stale-img-wrap">
                <img src="${part.images[0]}" alt="" class="rv-drawer-img stale-img">
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

    const buildActiveHTML = (parts) => parts.map(part => `
        <div class="rv-drawer-row wl-wanted-row" onclick="openItemDetail(${part.id})">
            <img src="${part.images[0]}" alt="" class="rv-drawer-img">
            <div class="rv-drawer-info">
                <div class="rv-drawer-title">${escapeHtml(part.title)}</div>
                <div class="rv-drawer-meta">${escapeHtml(part.loc)}</div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                <div class="rv-drawer-price">${part.price}</div>
                <button class="sp-unsave-btn" onclick="event.stopPropagation(); toggleSavedPart(${part.id})" aria-label="Remove from saved">×</button>
            </div>
        </div>
    `).join('');

    let bodyHTML = '';
    if (savedPartsTab === 'all') {
        bodyHTML = buildActiveHTML(activeParts);
        if (staleParts.length) bodyHTML += `<div class="stale-section-hdr">No longer available</div>${buildStaleHTML(staleParts)}`;
    } else if (savedPartsTab === 'active') {
        bodyHTML = activeParts.length
            ? buildActiveHTML(activeParts)
            : `<div style="text-align:center; padding:40px 20px; color:#aaa; font-size:13px;">All your saved listings have ended.</div>`;
    } else {
        bodyHTML = staleParts.length
            ? buildStaleHTML(staleParts)
            : `<div style="text-align:center; padding:40px 20px; color:#aaa; font-size:13px;">No ended listings — all your saves are still live.</div>`;
    }

    content.innerHTML = `
        <div style="padding: 12px 8px 10px; background:white; margin:-16px -16px 16px; border-bottom:1px solid #eee;">${tabsHTML}</div>
        ${bodyHTML}`;
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
}

function buildWantedCard(w, matches) {
    const hasMatches = matches.length > 0;
    const card = document.createElement('div');
    card.className = 'rv-drawer-row wl-wanted-row' + (hasMatches ? ' wl-row-match' : ' wl-row-watching');

    if (hasMatches) {
        card.onclick = () => {
            if (matches.length === 1) {
                openItemDetail(matches[0].id);
            } else {
                const total = getAllParts().filter(p => wantedMatchesPart(w, p));
                showWantedMatches(w, matches, total.length - matches.length);
            }
        };
    }

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
    return card;
}

function showWantedMatches(wanted, matches, dismissedCount = 0) {
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
    currentMatchesWanted = null;
    document.getElementById('wantedMatchesBody').style.display = 'none';
    document.getElementById('wantedListBody').style.display = 'block';
    document.getElementById('wantedAddBtn').style.display = 'inline-block';
    document.getElementById('wantedListTitle').textContent = 'MY WANTED LIST';
}

function closeWantedOrBack() {
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
    addWanted(partName, make, model, year, maxPrice, category, series);

    if (currentVehicleId && currentVehicleTab === 'wanted') renderGarageTab();
    if (document.getElementById('wantedListDrawer')?.classList.contains('active')) renderWantedList();
    renderProfile();

    // Show in-card success flash, then close and reset search bar
    const successMsg = document.getElementById('wantedSuccessMsg');
    if (successMsg) successMsg.style.display = 'block';

    setTimeout(() => {
        if (successMsg) successMsg.style.display = 'none';
        closeAddWantedDrawer();

        // Clear search bar text but leave filters (make/model/category etc.) intact
        const searchEl = document.getElementById('mainSearchInput');
        if (searchEl) { searchEl.value = ''; activeFilters.search = ''; renderMainGrid(); }

        // If vehicle not in garage, offer save via toast after card closes
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
    toggleDrawer('inboxDrawer');
    switchInboxTab('chats');
    // On desktop split-pane, auto-select the most recent conversation
    if (window.innerWidth >= 768 && conversations.length > 0) {
        setTimeout(() => openInboxConv(conversations[0].id), 50);
    }
}

function updateInboxBadge() {
    const unreadConvs  = conversations.filter(c => c.unread).length;
    const unreadNotifs = inboxItems.filter(i => i.unread).length;
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

    let filtered = inboxItems;
    if (currentInboxTab !== 'all') {
        filtered = inboxItems.filter(n => n.type === currentInboxTab);
    }

    if (!filtered.length) {
        content.innerHTML = '<div style="text-align:center; padding:40px; color:#888; font-weight:700;">No notifications.</div>';
        return;
    }

    filtered.forEach(item => content.appendChild(buildInboxItemNode(item)));
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

// Sign in (stub — wire into real auth later). Always lands as Standard tier.
function signIn(name = 'Gary S.', tier = 'standard', remember = false, email = '') {
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
        const titles = { 'signin': 'Sign In', 'signup': 'Create Account', 'signup-personal': 'Personal Account', 'signup-pro': 'Pro Account' };
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
        authSignUpProSection:      mode === 'signup-pro',
    };
    Object.entries(sections).forEach(([id, show]) => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? '' : 'none';
    });

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
        options: { data: { display_name: name, is_pro: false, postcode: postcode || '', location: suburb || '' } }
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
    const password     = document.getElementById('authPasswordPro')?.value;
    if (!name || !businessName || !abnRaw || !email || !password) {
        showAuthError('Please fill in all fields including your Business Name and ABN.'); return;
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
        options: { data: { display_name: name, is_pro: true, business_name: businessName, abn: abnDigits, postcode: postcode || '' } }
    });
    if (error) { showAuthError(error.message); return; }
    document.getElementById('authPasswordPro').value = '';
    userSettings.businessName = businessName;
    userSettings.abn = abnDigits;
    if (postcode) userSettings.postcode = postcode;
    if (suburb)   userSettings.location = suburb;
    saveUserSettings();
    hideAuthError();
    toggleDrawer('authDrawer');
    showToast('Pro account created! Check your email to confirm.');
    if (authReturnAction) { const next = authReturnAction; authReturnAction = null; next(); }
    else { setTimeout(showWelcomeModal, 350); }
}

async function onSignOut() {
    await sb.auth.signOut();
    userIsSignedIn = false;
    currentUserName = null;
    currentUserTier = null;
    closeAccountMenu();
    renderAccountState();
}

let selectedUpgradePlan = 'monthly';

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

async function confirmUpgrade() {
    if (!currentUserId) { showToast('Please sign in first.'); return; }

    const btn = document.getElementById('confirmUpgradeBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Activating…'; }

    const { error } = await sb.from('profiles')
        .update({ is_pro: true })
        .eq('id', currentUserId);

    if (error) {
        if (btn) { btn.disabled = false; btn.textContent = 'Start Free Trial →'; }
        showToast('Could not activate Pro — please try again.');
        console.error('Upgrade error:', error.message);
        return;
    }

    currentUserTier = 'pro';
    closeUpgradeModal();
    renderAccountState();
    if (document.getElementById('workshopDrawer')?.classList.contains('active')) {
        renderWorkshopProfile();
    }
    showToast('Pro activated! Welcome to APC Pro.');
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
    if (!userIsSignedIn) {
        openAuthDrawer();
        return;
    }
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
    const dd   = document.getElementById('accountDropdown');
    const pill = document.getElementById('accountPill');
    if (dd && dd.classList.contains('active') && !dd.contains(e.target) && !(pill && pill.contains(e.target))) {
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
        userSettings.businessBanner || ''
    );
    const backBar4 = document.getElementById('storefrontBackBar');
    if (backBar4) backBar4.style.display = 'none';
    toggleDrawer('storefrontDrawer');
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
// ===== SPONSORED CARD BUILDER =====
let _spbTemplate = 'supplier';
let _spbLogoData = '';
let _spbImageData = '';
let _spbExistingCard = null;

function openSponsoredBuilder() {
    _spbLogoData = '';
    _spbImageData = '';
    _spbExistingCard = null;
    document.getElementById('spbBackdrop').style.display = '';
    const modal = document.getElementById('spbModal');
    modal.style.display = 'flex';
    if (sb && currentUserId) {
        sb.from('sponsored_cards').select('*').eq('user_id', currentUserId).single()
            .then(({ data }) => {
                _spbExistingCard = data || null;
                if (data) {
                    _spbTemplate = data.template || 'supplier';
                    _spbLogoData = data.logo_data || '';
                    _spbImageData = data.image_data || '';
                }
                _spbBuildForm();
            });
    } else {
        _spbBuildForm();
    }
}

function closeSponsoredBuilder() {
    document.getElementById('spbBackdrop').style.display = 'none';
    document.getElementById('spbModal').style.display = 'none';
}

function selectSponsoredTemplate(type) {
    _spbTemplate = type;
    document.querySelectorAll('.spb-tpl-tab').forEach(t => t.classList.toggle('active', t.dataset.tpl === type));
    _spbBuildForm();
}

function _spbBuildForm() {
    document.querySelectorAll('.spb-tpl-tab').forEach(t => t.classList.toggle('active', t.dataset.tpl === _spbTemplate));
    const e = _spbExistingCard || {};
    const tpl = _spbTemplate;
    let html = '';

    if (tpl === 'supplier') {
        html = `
            <div class="input-group"><label>Business Name <span style="color:#e53935;">*</span></label>
                <input id="spbName" type="text" maxlength="50" placeholder="e.g. AA Automotive" value="${escapeHtml(e.business_name || '')}">
            </div>
            <div class="input-group"><label>Tagline <span style="font-weight:400;color:#aaa;">one line</span></label>
                <input id="spbTagline" type="text" maxlength="80" placeholder="e.g. Adelaide's trusted auto specialists since 1995" value="${escapeHtml(e.tagline || '')}">
            </div>
            <div class="input-group"><label>Tags <span style="font-weight:400;color:#aaa;">up to 3, comma-separated</span></label>
                <input id="spbTags" type="text" maxlength="80" placeholder="e.g. Servicing, Tyres, Performance" value="${escapeHtml((e.tags || []).join(', '))}">
            </div>
            <div class="input-group"><label>Logo</label>
                <div class="spb-logo-upload" id="spbLogoPreview" onclick="document.getElementById('spbLogoInput').click()">
                    ${_spbLogoData ? `<img src="${_spbLogoData}" style="width:100%;height:100%;object-fit:contain;">` : '<span class="spb-upload-hint">＋ Upload Logo</span>'}
                </div>
                <input type="file" id="spbLogoInput" accept="image/*" style="display:none;" onchange="handleSpbLogo(this)">
                <div style="font-size:11px;color:#aaa;margin-top:4px;">PNG transparent preferred · max 500 KB</div>
            </div>
            <div class="input-group"><label>Button Label</label>
                <input id="spbBtnLabel" type="text" maxlength="30" placeholder="Visit Website →" value="${escapeHtml(e.button_label || 'Visit Website →')}">
            </div>
            <div class="input-group"><label>Button URL <span style="color:#e53935;">*</span></label>
                <input id="spbBtnUrl" type="url" placeholder="https://yourwebsite.com.au" value="${escapeHtml(e.button_url || '')}">
            </div>`;
    } else if (tpl === 'product') {
        html = `
            <div class="input-group"><label>Hero Image <span style="color:#e53935;">*</span></label>
                <div class="spb-hero-upload" id="spbHeroPreview" onclick="document.getElementById('spbHeroInput').click()">
                    ${_spbImageData ? `<img src="${_spbImageData}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : '<span class="spb-upload-hint">＋ Upload Photo<br><small>400 × 240 px · JPG</small></span>'}
                </div>
                <input type="file" id="spbHeroInput" accept="image/*" style="display:none;" onchange="handleSpbImage(this)">
                <div style="font-size:11px;color:#aaa;margin-top:4px;">max 1 MB</div>
            </div>
            <div class="input-group"><label>Price</label>
                <input id="spbPrice" type="text" maxlength="20" placeholder="e.g. $149" value="${escapeHtml(e.price || '')}">
            </div>
            <div class="input-group"><label>Title <span style="color:#e53935;">*</span></label>
                <input id="spbName" type="text" maxlength="60" placeholder="e.g. Bosch Wiper Blades" value="${escapeHtml(e.business_name || '')}">
            </div>
            <div class="input-group"><label>Seller / Brand</label>
                <input id="spbTagline" type="text" maxlength="40" placeholder="e.g. AA Automotive" value="${escapeHtml(e.tagline || '')}">
            </div>
            <div class="input-group"><label>Link URL <span style="color:#e53935;">*</span></label>
                <input id="spbBtnUrl" type="url" placeholder="https://..." value="${escapeHtml(e.button_url || '')}">
            </div>`;
    } else {
        html = `
            <div class="input-group"><label>Partner Name <span style="color:#e53935;">*</span></label>
                <input id="spbName" type="text" maxlength="50" placeholder="e.g. Sendle" value="${escapeHtml(e.business_name || '')}">
            </div>
            <div class="input-group"><label>Short blurb <span style="color:#e53935;">*</span></label>
                <textarea id="spbBlurb" class="apc-textarea" rows="3" maxlength="120" placeholder="e.g. Australia-wide door-to-door delivery. Get an instant quote.">${escapeHtml(e.blurb || '')}</textarea>
            </div>
            <div class="input-group"><label>Logo <span style="font-weight:400;color:#aaa;">optional</span></label>
                <div class="spb-logo-upload" id="spbLogoPreview" onclick="document.getElementById('spbLogoInput').click()">
                    ${_spbLogoData ? `<img src="${_spbLogoData}" style="width:100%;height:100%;object-fit:contain;">` : '<span class="spb-upload-hint">＋ Logo</span>'}
                </div>
                <input type="file" id="spbLogoInput" accept="image/*" style="display:none;" onchange="handleSpbLogo(this)">
            </div>
            <div class="input-group"><label>Button Label</label>
                <input id="spbBtnLabel" type="text" maxlength="30" placeholder="Learn More →" value="${escapeHtml(e.button_label || 'Learn More →')}">
            </div>
            <div class="input-group"><label>Button URL <span style="color:#e53935;">*</span></label>
                <input id="spbBtnUrl" type="url" placeholder="https://..." value="${escapeHtml(e.button_url || '')}">
            </div>`;
    }

    document.getElementById('spbFormFields').innerHTML = html;
    document.getElementById('spbFormFields').querySelectorAll('input,textarea').forEach(el => {
        el.addEventListener('input', _spbUpdatePreview);
    });
    _spbUpdatePreview();
}

function _spbUpdatePreview() {
    const preview = document.getElementById('spbPreviewCard');
    if (!preview) return;
    const name     = document.getElementById('spbName')?.value || '';
    const tagline  = document.getElementById('spbTagline')?.value || '';
    const blurb    = document.getElementById('spbBlurb')?.value || '';
    const price    = document.getElementById('spbPrice')?.value || '';
    const btnLabel = document.getElementById('spbBtnLabel')?.value || '';
    const tagsRaw  = document.getElementById('spbTags')?.value || '';
    const tags     = tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3);
    preview.innerHTML = buildSponsoredCardHTML({
        template: _spbTemplate, business_name: name, tagline, blurb, price,
        button_label: btnLabel, button_url: '#', tags,
        logo_data: _spbLogoData, image_data: _spbImageData
    });
}

function handleSpbLogo(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { showToast('Logo too large — max 500 KB'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 400; let w = img.width, h = img.height;
            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            _spbLogoData = canvas.toDataURL('image/png', 0.9);
            const prev = document.getElementById('spbLogoPreview');
            if (prev) prev.innerHTML = `<img src="${_spbLogoData}" style="width:100%;height:100%;object-fit:contain;">`;
            _spbUpdatePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleSpbImage(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { showToast('Image too large — max 1 MB'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 500; let w = img.width, h = img.height;
            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            _spbImageData = canvas.toDataURL('image/jpeg', 0.85);
            const prev = document.getElementById('spbHeroPreview');
            if (prev) prev.innerHTML = `<img src="${_spbImageData}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
            _spbUpdatePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function submitSponsoredCard() {
    if (!sb || !currentUserId) { showToast('Please sign in'); return; }
    const name   = document.getElementById('spbName')?.value.trim();
    const btnUrl = document.getElementById('spbBtnUrl')?.value.trim();
    if (!name)   { showToast('Name / title is required'); return; }
    if (!btnUrl) { showToast('Button URL is required'); return; }
    if (_spbTemplate === 'product' && !_spbImageData) { showToast('Hero image is required for a Product card'); return; }

    const tagline  = document.getElementById('spbTagline')?.value.trim() || null;
    const blurb    = document.getElementById('spbBlurb')?.value.trim() || null;
    const price    = document.getElementById('spbPrice')?.value.trim() || null;
    const btnLabel = document.getElementById('spbBtnLabel')?.value.trim() || null;
    const tagsRaw  = document.getElementById('spbTags')?.value || '';
    const tags     = tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3);

    const payload = {
        user_id: currentUserId, template: _spbTemplate,
        business_name: name, tagline, blurb, price,
        tags: tags.length ? tags : null,
        logo_data: _spbLogoData || null, image_data: _spbImageData || null,
        button_label: btnLabel, button_url: btnUrl, active: false
    };

    let error;
    if (_spbExistingCard?.id) {
        ({ error } = await sb.from('sponsored_cards').update(payload).eq('id', _spbExistingCard.id));
    } else {
        ({ error } = await sb.from('sponsored_cards').insert(payload));
    }
    if (error) { showToast('Error: ' + error.message); return; }
    showToast('Submitted for review — we\'ll activate it shortly');
    closeSponsoredBuilder();
    renderDashSponsoredStatus();
}

function buildSponsoredCardHTML(card) {
    const tpl      = card.template;
    const name     = escapeHtml(card.business_name || '');
    const tagline  = escapeHtml(card.tagline || '');
    const blurb    = escapeHtml(card.blurb || '');
    const price    = escapeHtml(card.price || '');
    const btnLabel = escapeHtml(card.button_label || 'Visit →');
    const btnUrl   = escapeHtml(card.button_url || '#');
    const tags     = (card.tags || []).slice(0, 3);
    const logo     = card.logo_data || '';
    const image    = card.image_data || '';

    const userId  = card.user_id || '';
    const openCmd = userId ? `openStorefrontByUserId('${userId}')` : `window.open('${btnUrl}','_blank')`;

    if (tpl === 'supplier') {
        const logoHtml = logo
            ? `<img src="${logo}" style="width:100%;height:100%;object-fit:contain;" alt="">`
            : `<div class="drp-supplier-logo-placeholder">${name.slice(0, 3).toUpperCase()}</div>`;
        const tagsHtml = tags.map(t => `<span class="drp-tag">${escapeHtml(t)}</span>`).join('');
        return `<div class="drp-card drp-supplier-card">
            <div class="drp-sponsored-tag">Featured Supplier</div>
            <div class="drp-supplier-logo">${logoHtml}</div>
            <div class="drp-supplier-name">${name}</div>
            ${tagline ? `<div class="drp-supplier-tagline">${tagline}</div>` : ''}
            ${tagsHtml ? `<div class="drp-supplier-tags">${tagsHtml}</div>` : ''}
            <button class="drp-supplier-btn" onclick="${openCmd}">View Store →</button>
        </div>`;
    } else if (tpl === 'product') {
        const imgHtml = image
            ? `<img src="${image}" class="drp-sp-img" alt="">`
            : `<div class="drp-sp-img" style="background:#eee;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:11px;">No image</div>`;
        return `<div class="drp-card drp-sp-card" onclick="${openCmd}" style="cursor:pointer;">
            <div class="drp-sp-img-wrap">${imgHtml}
                <div class="drp-sponsored-tag drp-sponsored-tag--subtle">Sponsored</div>
            </div>
            <div class="drp-sp-info">
                ${price ? `<div class="drp-sp-price">${price}</div>` : ''}
                <div class="drp-sp-title">${name}</div>
                ${tagline ? `<div class="drp-sp-seller">${tagline}</div>` : ''}
            </div>
        </div>`;
    } else {
        const logoHtml = logo
            ? `<img src="${logo}" style="max-width:44px;max-height:44px;object-fit:contain;border-radius:6px;margin-bottom:6px;" alt="">`
            : '';
        return `<div class="drp-card">
            <div class="drp-sponsored-tag drp-sponsored-tag--subtle">Partner</div>
            <div class="drp-partner-card">
                ${logoHtml}
                <div class="drp-partner-name">${name}</div>
                ${blurb ? `<div class="drp-partner-desc">${blurb}</div>` : ''}
                <button class="drp-partner-btn" onclick="${openCmd}">View Store →</button>
            </div>
        </div>`;
    }
}

async function loadSponsoredCards() {
    if (!sb) return;
    const { data } = await sb.from('sponsored_cards')
        .select('*').eq('active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
    if (!data?.length) return;
    const panel = document.getElementById('desktopRightPanel');
    if (panel) panel.innerHTML = data.map(buildSponsoredCardHTML).join('');
}

async function renderDashSponsoredStatus() {
    if (!sb || !currentUserId) return;
    const { data } = await sb.from('sponsored_cards').select('*').eq('user_id', currentUserId).single();
    const badge = document.getElementById('dashSponsoredStatusBadge');
    const preview = document.getElementById('dashSponsoredPreview');
    const btn = document.getElementById('dashSponsoredBtn');
    if (!data) {
        if (badge) { badge.textContent = ''; }
        if (preview) preview.innerHTML = '';
        if (btn) btn.textContent = '+ Create Sponsored Card';
        return;
    }
    if (badge) {
        badge.textContent = data.active ? '● Live' : '⏳ Pending review';
        badge.style.color = data.active ? '#2e7d32' : '#f97316';
    }
    if (preview) {
        preview.innerHTML = `<div style="pointer-events:none; transform:scale(0.8); transform-origin:top left; width:125%;">${buildSponsoredCardHTML(data)}</div>`;
    }
    if (btn) btn.textContent = 'Edit Card';
}

function onMenuOpenWorkshops() {
    if (!userIsSignedIn) {
        openAuthDrawer(onMenuOpenWorkshops);
        return;
    }
    workshopRadiusKm = null;
    document.querySelectorAll('#workshopRadiusControl .radius-seg').forEach((s, i, arr) => {
        s.classList.toggle('active', i === arr.length - 1);
    });
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
    if (profileFields) profileFields.style.display = 'block';
    if (drawerTitle)   drawerTitle.textContent      = 'Workshop & Repairer Profile';
    if (notice)        notice.style.display         = currentUserTier !== 'pro' ? 'block' : 'none';
    // Pre-fill unified profile fields
    const bizEl   = document.getElementById('proSettingBusinessName');
    const abnEl   = document.getElementById('proSettingABN');
    const aboutEl = document.getElementById('proSettingAbout');
    if (bizEl)   bizEl.value   = userSettings.businessName || '';
    if (abnEl)   abnEl.value   = formatABN(userSettings.abn || '');
    if (aboutEl) aboutEl.value = userSettings.about        || '';
    const wsAddressEl = document.getElementById('wsAddress');
    if (wsAddressEl) wsAddressEl.value = workshopProfile.address || '';
    // Pre-fill workshop location picker from saved postcode
    const wsLocWrap = document.querySelector('#workshopProfileFields .location-picker-wrap[data-mode="workshop"]');
    if (wsLocWrap) {
        const pc = userSettings.postcode || '';
        const input = wsLocWrap.querySelector('.loc-postcode-input');
        const sel   = wsLocWrap.querySelector('.loc-suburb-select');
        if (input) input.value = pc;
        if (pc && sel && typeof AU_POSTCODES !== 'undefined') {
            const subs = AU_POSTCODES[pc] || [];
            if (subs.length) {
                sel.innerHTML = (subs.length > 1 ? '<option value="">Suburb, State</option>' : '') +
                    subs.map(([s, st]) => `<option value="${s}, ${st} ${pc}">${s}, ${st}</option>`).join('');
                const savedLoc = (userSettings.location || '').toLowerCase().replace(/\s*\d{4}$/, '').trim();
                for (const opt of sel.options) {
                    if (opt.value && opt.value.toLowerCase().startsWith(savedLoc.split(',')[0])) {
                        sel.value = opt.value;
                        const matched = opt.value.match(/\b(\d{4})\b/)?.[1] || pc;
                        const matchedSub = opt.value.replace(/\s*\d{4}$/, '').trim();
                        wsLocWrap.dataset.selectedPostcode = matched;
                        wsLocWrap.dataset.selectedSuburb   = matchedSub;
                        break;
                    }
                }
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
    setChk('wsAutoSecurity', svc.autoSecurity);
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
    renderLogoPreview();
    renderBannerPreview();
    // Badge trigger button — Pro users only
    const badgeSec = document.getElementById('apcBadgeSection');
    if (badgeSec) badgeSec.style.display = (currentUserTier === 'pro' && userIsSignedIn) ? 'block' : 'none';
    toggleDrawer('workshopDrawer', true);
}
function submitWorkshopProfile() {
    if (!userIsSignedIn) {
        openAuthDrawer(submitWorkshopProfile);
        return;
    }
    if (currentUserTier !== 'pro') {
        showToast('Upgrade to APC Pro to save your workshop profile');
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
    const getChk = id => document.getElementById(id)?.checked || false;
    workshopProfile = {
        vehicles: workshopProfile.vehicles || [],
        address: document.getElementById('wsAddress')?.value.trim() || '',
        services: {
            generalService: getChk('wsGeneralService'), logbook: getChk('wsLogbook'),
            engineDiag: getChk('wsEngineDiag'),   engineRebuild: getChk('wsEngineRebuild'),
            transmission: getChk('wsTransmission'), exhaust: getChk('wsExhaust'),
            timingBelt: getChk('wsTimingBelt'),
            brakes: getChk('wsBrakes'),           suspension: getChk('wsSuspension'),
            wheelAlign: getChk('wsWheelAlign'),   tyreSupply: getChk('wsTyreSupply'),
            autoElectrical: getChk('wsAutoElectrical'), battery: getChk('wsBattery'),
            aircon: getChk('wsAircon'),           cooling: getChk('wsCooling'),
            autoSecurity: getChk('wsAutoSecurity'),
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
        ['wfAutoSecurity',   'autoSecurity'],   ['wfCollision',     'collision'],
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

    const matches = workshopDatabase.filter(w => {
        if (filterApproved && !w.approvedClub) return false;
        if (workshopRadiusKm !== null) {
            const dist = parseFloat(w.distance);
            if (isNaN(dist) || dist > workshopRadiusKm) return false;
        }
        if (query) {
            const haystack = [w.name, w.loc, ...w.vehicleTypes, ...w.services].join(' ').toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        if (!anyFilter) return true;
        if (activeKeys.length && activeKeys.some(k => w.services.includes(k))) return true;
        if (filterParts    && w.services.some(x => x === 'parts' || x === 'partsSupplier')) return true;
        if (filterWrecking && w.services.includes('wrecking')) return true;
        return false;
    });

    if (!matches.length) {
        sponsoredList.innerHTML = `<div class="workshop-empty-state">
            <div class="workshop-empty-icon">🔧</div>
            <div class="workshop-empty-title">No workshops match your filters</div>
            <div class="workshop-empty-sub">Try adjusting your search or service filters</div>
            <button class="workshop-empty-cta" onclick="clearWorkshopFilters()">Show all workshops</button>
        </div>`;
        return;
    }

    sponsoredList.innerHTML = matches.map(buildSponsoredWorkshopCardHTML).join('');
}
function buildSponsoredWorkshopCardHTML(workshop) {
    const stars = workshop.rating ? `<span class="workshop-rating">★ ${workshop.rating}</span>` : '';
    const approvedBadge = workshop.approvedClub
        ? `<span class="card-approved-badge">${workshop.approvedClub} Approved</span>`
        : '';
    return `
        <div class="workshop-card workshop-sponsor-card">
            <div class="workshop-card-header">
                <div class="workshop-card-name">${workshop.name} ${approvedBadge}</div>
                <div class="workshop-card-distance">${workshop.distance}</div>
            </div>
            <div class="workshop-card-specialty">${workshop.specialty}</div>
            <div class="workshop-card-footer">
                ${stars}
                <button class="workshop-card-button" onclick="openWorkshopStorefront(workshopDatabase.find(w=>w.id===${workshop.id}), true)">View →</button>
            </div>
        </div>
    `;
}

function openWorkshopDetail(workshopId) {
    const w = workshopDatabase.find(w => w.id === workshopId);
    if (!w) return;
    const content = document.getElementById('workshopDetailContent');
    if (!content) return;
    const stars = w.rating ? `★ ${w.rating}` : '';
    const serviceChips = w.services.map(s => `<span class="wsd-chip">${s}</span>`).join('');
    const vehicleChips = w.vehicleTypes.map(v => `<span class="wsd-chip">${v}</span>`).join('');
    content.innerHTML = `
        <div class="wsd-hero">
            <div class="wsd-name">${w.name}</div>
            <div class="wsd-loc">📍 ${w.loc}</div>
            <div class="wsd-meta-row">
                <span class="wsd-rating">${stars}</span>
                <span class="wsd-distance">${w.distance} away</span>
            </div>
        </div>
        <div class="wsd-section">
            <h4>Speciality</h4>
            <div class="wsd-specialty">${w.specialty}</div>
        </div>
        <div class="wsd-section">
            <h4>Services</h4>
            <div class="wsd-chips">${serviceChips}</div>
        </div>
        <div class="wsd-section">
            <h4>Vehicles we work on</h4>
            <div class="wsd-chips">${vehicleChips}</div>
        </div>
        <button class="wsd-contact-btn" onclick="contactWorkshop(${w.id}); closeWorkshopDetailDrawer();">Contact this workshop</button>
    `;
    toggleDrawer('workshopDetailDrawer', true);
}

function closeWorkshopDetailDrawer() {
    const el = document.getElementById('workshopDetailDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}
function onMenuOpenMyListings() {
    closeAccountDropdown();
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

    pill.classList.remove('signed-out', 'signed-in', 'tier-standard', 'tier-pro');

    const initial = (currentUserName || 'G').charAt(0).toUpperCase();
    const isMobile = window.innerWidth < 900;
    const pic = userSettings.profilePic || '';
    const avatarInner = pic ? `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">` : initial;
    const avatarHTML = `<span class="pill-avatar${currentUserTier === 'pro' ? ' pro' : ''}">${avatarInner}</span>`;

    const signUpPrompt = document.getElementById('signUpPrompt');
    const searchModePill = document.getElementById('searchModeToggle');
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
        pill.classList.add('signed-in', 'tier-standard');
        pill.innerHTML = avatarHTML;
        if (searchModePill) searchModePill.style.display = 'none';
        if (signUpPrompt) signUpPrompt.style.display = 'none';
    }

    if (menuName)   menuName.textContent   = currentUserName || 'Guest';
    if (menuStatus) {
        menuStatus.classList.toggle('pro', currentUserTier === 'pro');
        menuStatus.textContent = currentUserTier === 'pro'      ? 'APC Pro member' :
                                 currentUserTier === 'standard' ? 'APC Standard member' : '';
    }
    if (menuAvatar) {
        if (pic) {
            menuAvatar.innerHTML = `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
            menuAvatar.style.background = 'transparent';
        } else {
            menuAvatar.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
            menuAvatar.style.background = currentUserTier === 'pro' ? 'var(--apc-blue)' : 'var(--apc-orange)';
        }
    }
    if (menuUpgrade)      menuUpgrade.style.display      = (currentUserTier === 'standard') ? 'flex' : 'none';
    const settingsUpgradeNudge = document.getElementById('settingsUpgradeNudge');
    if (settingsUpgradeNudge) settingsUpgradeNudge.style.display = (currentUserTier === 'standard') ? 'block' : 'none';
    if (searchModePill) searchModePill.style.display = (currentUserTier === 'pro') ? '' : 'none';
    syncSearchModePill();

    // Update bottom nav profile circle
    const navProfileCircle = document.getElementById('navProfileCircle');
    if (navProfileCircle) {
        if (!userIsSignedIn) {
            navProfileCircle.className = 'nav-profile-circle signed-out';
            navProfileCircle.innerHTML = 'Sign In';
        } else {
            navProfileCircle.className = `nav-profile-circle${currentUserTier === 'pro' ? ' pro' : ''}`;
            navProfileCircle.innerHTML = pic ? `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">` : initial;
        }
    }
    const isPro = userIsSignedIn && currentUserTier === 'pro';
    const dtbDash   = document.getElementById('dtbDashboard');
    const amenuDash = document.getElementById('amenuDashboard');
    if (dtbDash)   dtbDash.style.display   = isPro ? 'flex' : 'none';
    if (amenuDash) amenuDash.style.display = isPro ? 'flex'   : 'none';

    const headerInboxBtn   = document.getElementById('headerInboxBtn');
    const dtbMessages      = document.getElementById('dtbMessages');
    const desktopInboxItem = document.getElementById('desktopInboxItem');
    if (headerInboxBtn) {
        headerInboxBtn.style.display = userIsSignedIn ? '' : 'none';
        headerInboxBtn.classList.toggle('signed-in', userIsSignedIn);
    }
    if (dtbMessages)      dtbMessages.style.display      = userIsSignedIn ? '' : 'none';
    if (desktopInboxItem) desktopInboxItem.style.display = userIsSignedIn ? '' : 'none';

    // Sync desktop dropdown
    const ddAvatar  = document.getElementById('acctDdAvatar');
    const ddName    = document.getElementById('acctDdName');
    const ddTier    = document.getElementById('acctDdTier');
    const ddUpgrade = document.getElementById('acctDdUpgrade');
    const ddDash    = document.getElementById('acctDdDashboard');
    if (ddAvatar) {
        if (pic) {
            ddAvatar.innerHTML = `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
            ddAvatar.style.background = 'transparent';
        } else {
            ddAvatar.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
            ddAvatar.style.background = isPro ? 'var(--apc-blue)' : 'var(--apc-orange)';
        }
    }
    if (ddName)    ddName.textContent = currentUserName || 'Guest';
    if (ddTier) {
        ddTier.textContent  = isPro ? 'APC Pro' : (currentUserTier === 'standard' ? 'APC Standard' : '');
        ddTier.classList.toggle('pro', isPro);
    }
    if (ddUpgrade)  ddUpgrade.style.display  = (currentUserTier === 'standard') ? 'flex' : 'none';
    if (ddDash)     ddDash.style.display      = isPro ? 'flex' : 'none';

    maybeShowProDashboardBanner();
    updateSellFittingToggleVisibility();
    updateSellQuantityVisibility();
    updateWarehouseBinVisibility();
    if (!userIsSignedIn || currentUserTier !== 'pro') {
        currentSearchMode = 'parts';
        setSearchMode('parts');
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

        // Filter drawer always sits flush below the header on all screen sizes
        if (filterDrawer)    filterDrawer.style.top    = totalH + 'px';
        if (drawerBackdrop)  drawerBackdrop.style.top  = totalH + 'px';

        if (window.innerWidth >= 900) {
            // On desktop drawers slide in below the header — on mobile they cover it (top:0 via CSS)
            if (detailOverlay)        detailOverlay.style.top        = totalH + 'px';
            if (sellOverlay)          sellOverlay.style.top          = totalH + 'px';
            if (storefrontDrawer)     storefrontDrawer.style.top     = totalH + 'px';
            if (garageDrawer)         garageDrawer.style.top         = totalH + 'px';
            // addVehicleDrawer + addWantedDrawer are floating cards — top is fixed at 50% via CSS, not offset-driven
            if (wantedListDrawer)     wantedListDrawer.style.top     = totalH + 'px';
            if (savedPartsDrawer)     savedPartsDrawer.style.top     = totalH + 'px';
            if (settingsDrawer)       settingsDrawer.style.top       = totalH + 'px';
            if (profileDrawer)        profileDrawer.style.top        = totalH + 'px';
            if (myPartsDrawer)        myPartsDrawer.style.top        = totalH + 'px';
            if (workshopDrawer)       workshopDrawer.style.top       = totalH + 'px';
            const vehicleMakesDrawer = document.getElementById('vehicleMakesDrawer');
            if (vehicleMakesDrawer)   vehicleMakesDrawer.style.top   = totalH + 'px';
            if (recentlyViewedDrawer) recentlyViewedDrawer.style.top = totalH + 'px';
            if (inboxDrawer)          inboxDrawer.style.top          = totalH + 'px';
            if (messageDetailDrawer)  messageDetailDrawer.style.top  = totalH + 'px';
            if (chatDrawer)           chatDrawer.style.top           = totalH + 'px';
            if (helpDrawer)           helpDrawer.style.top           = totalH + 'px';
            if (authDrawer)           authDrawer.style.top           = totalH + 'px';
            if (dashView)             dashView.style.top             = totalH + 'px';
            if (rightPanel)           rightPanel.style.top           = totalH + 'px';
            if (accountDropdown)      accountDropdown.style.top      = (totalH + 8) + 'px';
        }
    }
}

window.addEventListener('resize', updateHeaderOffset);
// Re-run after images load — logo height affects the header height calculation
window.addEventListener('load', updateHeaderOffset);

// --- SEARCH MODE TOGGLE ---
function toggleSearchMode() {
    closeDashboard();
    currentSearchMode = currentSearchMode === 'wanted' ? 'parts' : 'wanted';
    syncSearchModePill();
    renderMainGrid();
}

function setSearchMode(mode) {
    currentSearchMode = mode === 'wanted' ? 'wanted' : 'parts';
    syncSearchModePill();
    renderMainGrid();
}

function syncSearchModePill() {
    const pill  = document.getElementById('searchModeToggle');
    const input = document.getElementById('mainSearchInput');
    const isWanted = currentSearchMode === 'wanted';
    if (pill) {
        pill.textContent = isWanted ? 'Search Parts' : 'Search Wanted';
        pill.classList.toggle('mode-wanted', isWanted);
    }
    if (input) input.placeholder = isWanted ? "Search members' wanted lists..." : 'Search parts for sale...';

    // Filter sidebar segmented control (desktop + mobile filter drawer)
    const proSection = document.getElementById('filterProModeSection');
    const segParts   = document.getElementById('filterSegParts');
    const segWanted  = document.getElementById('filterSegWanted');
    const showProMode = userIsSignedIn && currentUserTier === 'pro';
    if (proSection) proSection.style.display = showProMode ? '' : 'none';
    if (segParts)  segParts.classList.toggle('active', !isWanted);
    if (segWanted) segWanted.classList.toggle('active',  isWanted);
}

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
    const part = getPartById(partId);
    if (!part) return;

    const nameEl   = document.getElementById('labelPartName');
    const binEl    = document.getElementById('labelBinRef');
    const priceEl  = document.getElementById('labelPrice');
    const qrEl     = document.getElementById('labelQrCode');
    const apcIdEl  = document.getElementById('labelApcId');

    if (nameEl)  nameEl.textContent  = part.title;
    if (binEl)   binEl.textContent   = part.warehouseBin || '';
    if (priceEl) priceEl.textContent = '$' + part.price;
    if (apcIdEl) apcIdEl.textContent = part.apcId || '';

    if (qrEl) {
        qrEl.innerHTML = '';
        const apcId  = part.apcId || ('APC-' + part.id);
        const condLabel = { new_oem: 'New — OEM', new_aftermarket: 'New — Aftermarket', used: 'Used', refurbished: 'Refurbished', parts_only: 'Parts Only' }[part.condition] || part.condition || '';
        const qrText = [apcId, part.title, part.stockNumber ? 'Stock: ' + part.stockNumber : '', condLabel].filter(Boolean).join('\n');
        new QRCode(qrEl, { text: qrText, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
    }

    document.getElementById('labelModalBackdrop').style.display = 'block';
    document.getElementById('labelModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLabelModal() {
    document.getElementById('labelModalBackdrop').style.display = 'none';
    document.getElementById('labelModal').style.display = 'none';
    document.body.style.overflow = '';
}

// --- OFFER SHEET ---

function openOfferSheet(partId) {
    const part = getPartById(partId);
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
    const part  = getPartById(currentOpenPartId);
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
    let conv = conversations.find(c => c.partId === part.id && c.with === part.seller);
    if (!conv) {
        conv = { id: nextConvId(), with: part.seller, partId: part.id, unread: false, msgs: [] };
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
}

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
    if (offerId < 0) {
        _dismissedMockOfferIds.add(offerId);
        showToast(`Counter of $${price} sent!`);
        renderDashListings('pending');
        return;
    }
    const o = offersDb.find(x => x.id === offerId);
    if (!o) return;
    o.status       = 'countered';
    o.counterPrice = price;
    saveOffers();
    showToast(`Counter offer of $${price} sent to ${o.buyer}`);
    renderDashListings('pending');
}

function acceptMockOffer(mockId) {
    _dismissedMockOfferIds.add(mockId);
    showToast('Offer accepted — congrats on the sale!');
    renderDashListings('pending');
}

function declineMockOffer(mockId) {
    _dismissedMockOfferIds.add(mockId);
    showToast('Offer declined');
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

function openDashboard() {
    if (window.innerWidth < 900) return;
    setDtbActive('dtbDashboard');
    const fd = document.getElementById('filterDrawer');
    const rp = document.querySelector('.desktop-right-panel');
    if (fd) fd.style.setProperty('display', 'none', 'important');
    if (rp) rp.style.display = 'none';
    document.querySelectorAll('.drawer.active').forEach(d => d.classList.remove('active'));
    syncBackdrop();
    const dv = document.getElementById('dashboardView');
    if (dv) {
        const topBar = document.getElementById('desktopTopBar');
        const hdr    = document.getElementById('mainHeader');
        dv.style.top     = ((topBar ? topBar.offsetHeight : 0) + (hdr ? hdr.offsetHeight : 0)) + 'px';
        dv.style.display = 'block';
    }
    closeAccountMenu();
    closeAccountDropdown();
    renderDashboard();
}

function closeDashboard() {
    const dv = document.getElementById('dashboardView');
    if (!dv || dv.style.display === 'none') return;
    dv.style.display = 'none';
    setDtbActive(null);
    if (window.innerWidth >= 900) {
        const fd = document.getElementById('filterDrawer');
        const rp = document.querySelector('.desktop-right-panel');
        if (fd) fd.style.removeProperty('display');
        if (rp) rp.style.removeProperty('display');
    }
    updateHeaderOffset();
}

function renderDemandWidget() {
    const card = document.getElementById('dashDemandCard');
    if (!card) return;

    const report = getDemandReport();
    const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!report.length) {
        card.innerHTML = `
            <div class="dash-card-hdr">
                <span class="dash-card-title">Search Demand</span>
                <span class="dash-card-meta">${monthLabel}</span>
            </div>
            <div class="dash-empty-state" style="padding:20px 0;">No search data yet — demand trends will appear here as buyers search APC.</div>
        `;
        return;
    }
    const maxCount = report[0].count;

    // Find how many top terms have no matching listings
    const gaps = report.filter(r => {
        const t = r.term.toLowerCase();
        return !getAllParts().some(p => p.title.toLowerCase().includes(t));
    });

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
               <div><strong>${gaps.length} stocking ${gaps.length === 1 ? 'gap' : 'gaps'} this month</strong> — no listings match: ${gaps.slice(0,3).map(g => `<em>${escapeHtml(g.term)}</em>`).join(', ')}${gaps.length > 3 ? ` +${gaps.length - 3} more` : ''}. Consider sourcing these at auction.</div>
           </div>`
        : '';

    card.innerHTML = `
        <div class="dash-card-hdr">
            <span class="dash-card-title">Search Demand</span>
            <span class="dash-card-meta">${monthLabel}</span>
        </div>
        <p class="demand-subtitle">Most searched terms on APC this month — orange bars have no matching listings</p>
        <div class="demand-bars">${bars}</div>
        ${insight}
    `;
}

function renderDashboard() {
    const sellerName = getCurrentSellerName();
    const myListings = userListings.filter(p => p.status !== 'removed');
    const totalSaves = myListings.reduce((s, p) => s + (p.saves || 0), 0);
    const revenue    = dashMockData.closedSales.reduce((s, p) => s + p.price, 0);
    const unread     = conversations.filter(c => c.unread).length;

    const welcome = document.getElementById('dashWelcome');
    if (welcome) welcome.textContent = `Welcome back, ${currentUserName || 'Pro'} — here\'s your business overview`;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('dashStatListings', myListings.length);
    set('dashStatSaves',    totalSaves);
    set('dashStatMessages', unread);
    set('dashStatSales',    dashMockData.closedSales.length);
    set('dashStatRevenue',  '$' + revenue.toLocaleString());

    const countBadge = document.getElementById('dashActiveCount');
    if (countBadge) countBadge.textContent = myListings.length;
    const pendingBadge = document.getElementById('dashPendingCount');
    if (pendingBadge) {
        const pendingOfferCount = offersDb.filter(o => o.status === 'pending').length;
        pendingBadge.textContent = pendingOfferCount || '';
    }
    const soldBadge = document.getElementById('dashSoldCount');
    if (soldBadge) {
        const realSoldCount = userListings.filter(l => l.status === 'sold' && l.seller === getCurrentSellerName()).length;
        soldBadge.textContent = realSoldCount + dashMockData.closedSales.length;
    }

    renderDashboardCharts(myListings);
    renderDashActivity();
    renderDemandWidget();
    renderDashListings('active', document.querySelector('#dashboardView .dash-tab.active'));
    renderDashSponsoredStatus();
}

function renderDashboardCharts(myListings) {
    if (_dashViewsChart) { _dashViewsChart.destroy(); _dashViewsChart = null; }
    if (_dashCatChart)   { _dashCatChart.destroy();   _dashCatChart   = null; }
    if (!window.Chart) return;

    const vCtx = document.getElementById('dashViewsChart');
    if (vCtx) {
        _dashViewsChart = new Chart(vCtx, {
            type: 'line',
            data: {
                labels: dashMockData.weekLabels,
                datasets: [
                    { label: 'Views', data: dashMockData.weekViews, borderColor: '#F7941D', backgroundColor: 'rgba(247,148,29,0.08)', borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#F7941D', fill: true, tension: 0.4 },
                    { label: 'Saves', data: dashMockData.weekSaves, borderColor: '#007AFF', backgroundColor: 'rgba(0,122,255,0.05)',   borderWidth: 2,   pointRadius: 3, pointBackgroundColor: '#007AFF', fill: true, tension: 0.4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11, weight: '600' }, boxWidth: 12, padding: 14 } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f5f5f5' }, ticks: { font: { size: 11 } } },
                    x: { grid: { display: false },                       ticks: { font: { size: 11 } } }
                }
            }
        });
    }

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

function renderDashActivity() {
    const feed = document.getElementById('dashActivityFeed');
    if (!feed) return;
    const ico   = { save: '&#x2665;&#xFE0E;', message: '💬', view: '👁', trend: '📈' };
    const bg    = { save: '#fff3e5', message: '#e8f3ff', view: '#f4f4f4', trend: '#eafaf0' };
    feed.innerHTML = dashMockData.activity.map(a => `
        <div class="dash-activity-item">
            <div class="dash-act-ico" style="background:${bg[a.type] || '#f5f5f5'}">${ico[a.type] || '●'}</div>
            <div class="dash-act-text">${a.text}<span class="dash-act-time">${a.time}</span></div>
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

function renderDashListings(tab, btn) {
    _dashCurrentTab = tab;
    if (btn) {
        document.querySelectorAll('#dashboardView .dash-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
    }

    const q   = (document.getElementById('dashListingsSearch')?.value || '').trim().toLowerCase();
    const cat = (document.getElementById('dashListingsCatFilter')?.value || '');
    const countEl = document.getElementById('dashListingsCount');
    const sellerName = getCurrentSellerName();
    const body = document.getElementById('dashListingsBody');
    if (!body) return;

    let rows = '';
    let hasMore = false;
    if (tab === 'active') {
        let items = userListings.filter(p => p.status !== 'sold' && p.status !== 'removed');
        const total = items.length;
        if (q)   items = items.filter(p => p.title.toLowerCase().includes(q) || (p.category || '').includes(q) || p.loc.toLowerCase().includes(q) || String(p.stockNumber || '').includes(q));
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
            <td><img class="dash-thumb" src="${(p.images && p.images[0]) || 'images/placeholder.png'}" alt="" onclick="openItemDetail(${p.id})" style="cursor:pointer;" title="View listing"></td>
            <td><div class="dash-part-name">${escapeHtml(p.title)}</div>${p.quantity > 1 ? `<div class="dash-part-sub">Qty: ${p.quantity}</div>` : ''}${p.status === 'pending' ? `<span class="dash-pending-chip">PENDING</span>` : ''}</td>
            <td class="dash-td-price">$${p.price}</td>
            <td class="dash-td-saves">&#x2665;&#xFE0E; ${p.saves || 0}</td>
            <td class="dash-td-date">${dashFmtDate(p.date)}</td>
            <td>
                ${p.warehouseBin ? `<button class="dash-action-btn dash-btn-label" onclick="printPartLabel(${p.id})">&#127991; Label</button>` : ''}
                ${p.status === 'pending' ? `<button class="dash-action-btn dash-btn-warning" onclick="clearListingPending(${p.id})">Remove Pending</button>` : ''}
                <button class="dash-action-btn" onclick="openEditListing(${p.id});">Edit</button>
                <button class="dash-action-btn dash-btn-primary" onclick="markSold(${p.id})">Mark Sold</button>
                <button class="dash-action-btn dash-btn-danger" onclick="if(confirm('Delete this listing?')){deleteListing(${p.id});renderDashboard();}">Delete</button>
            </td></tr>`).join('');
    } else if (tab === 'pending') {
        const sellerName = getCurrentSellerName();
        // Real offers on seller's parts, plus mock data for demo
        const realOffers = offersDb.filter(o => {
            const part = getPartById(o.partId);
            return part && part.seller === sellerName && o.status === 'pending';
        });
        const mockOffers = dashMockData.pendingSales.map((s, i) => ({
            id: -1 - i, partTitle: s.title, partImg: s.img,
            listedPrice: s.price + 50, offerPrice: s.price,
            buyerNote: 'Can you include postage to Melbourne?',
            buyer: s.buyer, date: s.offered, status: 'pending', counterPrice: null
        })).filter(o => !_dismissedMockOfferIds.has(o.id));
        let items = [...realOffers, ...mockOffers];
        if (q) items = items.filter(o => o.partTitle.toLowerCase().includes(q) || o.buyer.toLowerCase().includes(q));
        if (countEl) countEl.textContent = `${items.length} offer${items.length !== 1 ? 's' : ''}`;
        rows = items.map(o => {
            const isMock = o.id < 0;
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
                ${isMock
                    ? `<button class="dash-action-btn dash-btn-primary" onclick="acceptMockOffer(${o.id})">Accept</button>
                       <button class="dash-action-btn dash-btn-danger" onclick="declineMockOffer(${o.id})">Decline</button>
                       <button class="dash-action-btn" onclick="showCounterInput(${o.id})">Counter</button>
                       <div class="dash-counter-row" id="counter-row-${o.id}" style="display:none;">
                           <input id="counter-input-${o.id}" type="number" class="dash-counter-input" placeholder="$">
                           <button class="dash-action-btn dash-btn-primary" onclick="submitCounterOffer(${o.id})">Send</button>
                       </div>`
                    : `<button class="dash-action-btn dash-btn-primary" onclick="acceptOffer(${o.id})">Accept</button>
                       <button class="dash-action-btn dash-btn-danger" onclick="declineOffer(${o.id})">Decline</button>
                       <button class="dash-action-btn" onclick="showCounterInput(${o.id})">Counter</button>
                       <div class="dash-counter-row" id="${counterRowId}" style="display:none;">
                           <input id="${counterInputId}" type="number" class="dash-counter-input" placeholder="$">
                           <button class="dash-action-btn dash-btn-primary" onclick="submitCounterOffer(${o.id})">Send</button>
                       </div>`
                }
            </td></tr>`;
        }).join('');
    } else {
        const sellerName = getCurrentSellerName();
        const realSold = userListings
            .filter(l => l.status === 'sold' && l.seller === sellerName)
            .map(l => ({ id: l.id, title: l.title, price: l.price, buyer: null, date: l.soldDate, img: (l.images && l.images[0]) || 'images/placeholder.png', isReal: true }));
        const mockSold = dashMockData.closedSales.map(s => ({ ...s, isReal: false }));
        let items = [...realSold, ...mockSold];
        if (q) items = items.filter(s => s.title.toLowerCase().includes(q) || (s.buyer || '').toLowerCase().includes(q));
        if (countEl) countEl.textContent = `${items.length} listing${items.length !== 1 ? 's' : ''}`;
        rows = items.map(s => `<tr>
            <td><img class="dash-thumb" src="${s.img}" alt=""></td>
            <td><div class="dash-part-name">${escapeHtml(s.title)}</div>${s.buyer ? `<div class="dash-part-sub">Sold to ${escapeHtml(s.buyer)}</div>` : ''}</td>
            <td class="dash-td-price">$${s.price}</td>
            <td></td>
            <td class="dash-td-date">${s.isReal ? dashFmtDate(s.date) : s.date}</td>
            <td>${s.isReal ? `<button class="dash-action-btn" onclick="relistPart(${s.id})">Relist</button>` : ''}</td>
        </tr>`).join('');
    }

    if (!rows) {
        body.innerHTML = '<div class="dash-empty-state">No listings match your search.</div>';
        return;
    }

    const hdrs = tab === 'active'
        ? ['', 'Part', 'Price', 'Saves', 'Listed', 'Actions']
        : tab === 'pending'
        ? ['', 'Part', 'Offer vs Listed', 'Date', 'Actions']
        : ['', 'Part', 'Sale Price', '', 'Sale Date', 'Actions'];

    body.innerHTML = `<table class="dash-table">
        <thead><tr>${hdrs.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
    </table>${hasMore ? `<div style="text-align:center; padding: 14px 0;"><button class="dash-action-btn" style="padding: 8px 24px; font-size:13px;" onclick="loadMoreDashListings()">Load more listings</button></div>` : ''}`;
}

function dashFmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderOffset();
    initFilterVehicleDropdowns();
    renderSkeletonGrid();
    loadPublicListingsFromSupabase();
    loadSponsoredCards();
    renderGarage();            // build vehicle list from localStorage so drawer is ready when opened
    updateInboxBadge();        // update badge from mock notifications
    const remembered = loadRememberedUser();
    if (remembered && remembered.name) {
        signIn(remembered.name, remembered.tier || 'standard', true, remembered.email || '');
    }
    renderMyParts();           // after sign-in so seller filter uses correct name
    renderAccountState();      // sets pill label/colour, hides pro toggle, sizes the grid offset

    // Sync carousel dots on scroll
    const carouselEl = document.getElementById('imageCarousel');
    if (carouselEl) carouselEl.addEventListener('scroll', updateCarouselActiveDot, { passive: true });

    // Wire up live search with debounce
    const searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            activeFilters.search = searchInput.value.trim();
            renderMainGrid();
            updateFilterChip();
        }, 300));
    }

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

    // Prepare the sell form preview boxes
    renderSellImagePreviews();

    // Deep-link: if URL contains ?item=123, open that listing directly
    const itemParam = new URLSearchParams(location.search).get('item');
    if (itemParam) openItemDetail(Number(itemParam));

    // Deep-link: if URL contains ?store=userId, open that workshop/supplier storefront
    const storeParam = new URLSearchParams(location.search).get('store');
    if (storeParam) handleStoreDeepLink(storeParam);

    // Lightbox keyboard navigation
    document.addEventListener('keydown', e => {
        const lightbox = document.getElementById('imageLightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxNav(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNav(1); }
        if (e.key === 'Escape')     { e.preventDefault(); closeDetailImageViewer(); }
    });

});