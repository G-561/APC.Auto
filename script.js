// --- GLOBAL STATE ---
let userIsSignedIn = false;          // starts logged out — header shows "Sign In" pill
let currentUserName = null;          // e.g. "Gary"
let currentUserTier = null;          // 'standard' | 'pro'
let proSearchOn    = true;           // when user is pro, controls FIND PARTS / FIND WANTED bar
let currentSearchMode = 'parts';     // 'parts' | 'wanted'
let currentOpenPartId = null;  // tracks which part detail is open
let currentEditingListingId = null; // edit mode for Sell form
let authReturnAction = null; // optional callback after sign-in
let authMode = 'signin';
let sortOrder = 'none';     // 'none' | 'asc' | 'desc'
let sortDate  = 'newest';  // 'newest' | 'oldest'
let activeFilters = {
    search: '',
    category: 'all',
    make: '',
    model: '',
    year: '',
    location: 'all',
    minPrice: '',
    maxPrice: '',
    conditionNew: true,
    conditionUsed: true,
    postage: true,
    pickup: true,
    sellerPrivate: true,
    sellerPro: true
};

// --- DATABASE ---
// Each part now has a stable `id` field so lookups never break if the array is reordered.
// `images` is an array so the carousel can show real photos per part.
// `fits` = which vehicles a part suits. Empty array = universal (fits anything).
const partDatabase = [
    { id: 1, title: "Genuine Toyota Hiace Left Side Mirror (2019+)", price: 85, images: ["images/hiace.mirror.jpg", "images/hiace.handle.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 14, date: 1738540800000 },
    { id: 2, title: "Lotus Elise S2 GT Track Spoiler", price: 850, images: ["images/elise.wing.jpg", "images/elise.diffuser.jpg", "images/elise.exhaust.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 22, date: 1741046400000 },
    { id: 3, title: "Toyota Hiace Tail Light Assembly (Current)", price: 145, images: ["images/hiace.taillight.webp", "images/hiace.bumper.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "lighting", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 8, date: 1742688000000 },
    { id: 4, title: "Custom 3D Printed Racing Center Caps (Set of 4)", price: 40, images: ["images/elise.wheel.jpg", "images/elise.rims.jpg", "images/commodore.wheels.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "wheels", fits: [], saves: 31, date: 1743724800000 },
    { id: 5, title: "Toyota Hiace Sliding Door Handle", price: 35, images: ["images/hiace.handle.jpg", "images/hiace.mirror.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 6, date: 1744502400000 },
    { id: 6, title: "Lotus Elise Sport Steering Wheel", price: 320, images: ["images/elise.steering.wheel.jpeg", "images/dash.mount.jpg", "images/gauge.pod.jpg", "images/elise.seat.jpg"], loc: "SYDNEY, NSW", fit: false, seller: "Sarah J.", isPro: false, category: "interior", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 18, date: 1745107200000 },
    { id: 7, title: "Performance Brake Calipers (Front Set)", price: 450, images: ["images/elise.brake.pads.jpg", "images/elise.rims.jpg", "images/elise.wheel.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Mike D.", isPro: true, category: "brakes", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 9, date: 1745712000000 },
    { id: 8, title: "Universal Cold Air Intake Kit", price: 120, images: ["images/Elise.scoops.webp", "images/turbo.webp", "images/1KD.engine.webp"], loc: "BRISBANE, QLD", fit: false, seller: "Alex T.", isPro: false, category: "engine", fits: [], saves: 27, date: 1746057600000 },
    { id: 9, title: "Toyota Hiace 1KD-FTV Turbocharger", price: 650, images: ["images/hiace.turbo.jpg", "images/turbo.webp", "images/1KD.engine.webp"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 19, date: 1736899200000 },
    { id: 10, title: "Lotus Elise S2 Carbon Rear Diffuser", price: 480, images: ["images/elise.diffuser.jpg", "images/elise.exhaust.jpg", "images/elise.wing.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 11, date: 1737590400000 },
    { id: 11, title: "Toyota Hiace Tow Bar Heavy Duty", price: 220, images: ["images/hiace.towbar.webp", "images/hiace.bumper.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Jason M.", isPro: false, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 7, date: 1738108800000 },
    { id: 12, title: "Toyota 1KD-FTV Engine Complete Low Kms", price: 2800, images: ["images/1KD.engine.webp", "images/hiace.turbo.jpg", "images/hiace.alternator.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 34, date: 1739318400000 },
    { id: 13, title: "Lotus Elise S2 Left Headlight", price: 380, images: ["images/elise.headlight.jpg", "images/elise.wing.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "lighting", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 15, date: 1740009600000 },
    { id: 14, title: "Toyota Hiace Steering Rack Reconditioned", price: 295, images: ["images/hiace.steeringrack.jpg", "images/1KD.engine.webp"], loc: "SYDNEY, NSW", fit: true, seller: "Tom K.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 5, date: 1740528000000 },
    { id: 15, title: "Lotus Elise S2 Soft Top Hood", price: 550, images: ["images/elise.soft.top.jpg", "images/elise.seat.jpg"], loc: "PERTH, WA", fit: false, seller: "Chris B.", isPro: true, category: "interior", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 21, date: 1741219200000 },
    { id: 16, title: "Toyota Hiace 80A Alternator", price: 180, images: ["images/hiace.alternator.webp", "images/1KD.engine.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 9, date: 1741910400000 },
    { id: 17, title: "Holden Commodore VE 18\" Wheels Set of 4", price: 620, images: ["images/commodore.wheels.webp", "images/elise.rims.jpg"], loc: "MELBOURNE, VIC", fit: false, seller: "Dave R.", isPro: false, category: "wheels", fits: [{ make: 'Holden', model: 'Commodore' }], saves: 16, date: 1742601600000 },
    { id: 18, title: "Toyota Hiace 1KD Injector Set (4 cyl)", price: 750, images: ["images/hiace.injector.webp", "images/1KD.engine.webp", "images/hiace.turbo.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 12, date: 1743292800000 },
    { id: 19, title: "Toyota Hiace Front Grille 2014+", price: 95, images: ["images/hiace.grille.jpg", "images/hiace.bumper.jpg", "images/hiace.mirror.jpg"], loc: "BRISBANE, QLD", fit: false, seller: "Sam T.", isPro: false, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 4, date: 1743897600000 },
    { id: 20, title: "Toyota Hiace Front Bumper Bar", price: 185, images: ["images/hiace.bumper.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 8, date: 1744329600000 },
    { id: 21, title: "Lotus Elise S2 Recaro Racing Seat", price: 420, images: ["images/elise.seat.jpg", "images/elise.steering.wheel.jpeg", "images/elise.rims.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Lee P.", isPro: false, category: "interior", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 17, date: 1744761600000 },
    { id: 22, title: "Universal Garrett-Style Performance Turbo", price: 890, images: ["images/turbo.webp", "images/Elise.scoops.webp", "images/1KD.engine.webp"], loc: "SYDNEY, NSW", fit: true, seller: "Alex T.", isPro: true, category: "engine", fits: [], saves: 28, date: 1745366400000 },
    { id: 23, title: "Toyota Hiace Cargo Barrier (Van)", price: 110, images: ["images/hiace.cargo.barrier.webp", "images/hiace.floormats.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "interior", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 6, date: 1745625600000 },
    { id: 24, title: "Toyota Hiace Floor Mats Full Set", price: 55, images: ["images/hiace.floormats.webp", "images/hiace.cargo.barrier.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: false, category: "interior", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 3, date: 1745884800000 },
    { id: 25, title: "Toyota Hiace Oil & Fuel Filter Service Kit", price: 45, images: ["images/hiace.oilfilter.jpg", "images/hiace.fuel.filter.jpg", "images/hiace.filter.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 3, date: 1745971200000 },
    { id: 26, title: "Lotus Elise S2 Exhaust System", price: 680, images: ["images/elise.exhaust.jpg", "images/elise.diffuser.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Mike D.", isPro: true, category: "engine", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 23, date: 1745798400000 },
    { id: 27, title: "Lotus Elise S2 Alloy Wheels (Set of 4)", price: 1100, images: ["images/elise.rims.jpg", "images/elise.wheel.jpg", "images/commodore.wheels.webp"], loc: "SYDNEY, NSW", fit: false, seller: "Sarah J.", isPro: false, category: "wheels", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 29, date: 1745193600000 },
    { id: 28, title: "Toyota Hiace Fuel Injector (Single)", price: 130, images: ["images/hiace.fuel.filter.jpg", "images/hiace.injector.webp"], loc: "PERTH, WA", fit: false, seller: "Mick O.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 2, date: 1744070400000 }
];

// Public wanted listings from other buyers — searched in FIND WANTED (Pro) mode by sellers
const publicWantedDatabase = [
    { id: 101, partName: 'Hiace sliding door complete assembly', buyer: 'Mark T.', loc: 'ADELAIDE, SA', make: 'Toyota', model: 'Hiace', year: '2019', maxPrice: 400, posted: '2 hours ago' },
    { id: 102, partName: 'Lotus Elise S2 front clamshell', buyer: 'Chris B.', loc: 'MELBOURNE, VIC', make: 'Lotus', model: 'Elise', year: '2004', maxPrice: 1200, posted: '5 hours ago' },
    { id: 103, partName: 'Toyota Hiace radiator 2015+', buyer: 'Sam R.', loc: 'SYDNEY, NSW', make: 'Toyota', model: 'Hiace', year: '2017', maxPrice: 300, posted: '1 day ago' },
    { id: 104, partName: 'Elise exhaust manifold', buyer: 'Jay P.', loc: 'BRISBANE, QLD', make: 'Lotus', model: 'Elise', year: '2006', maxPrice: 600, posted: '1 day ago' },
    { id: 105, partName: 'Hiace front bumper bar grey', buyer: 'Tanya W.', loc: 'PERTH, WA', make: 'Toyota', model: 'Hiace', year: '2020', maxPrice: 250, posted: '2 days ago' },
    { id: 106, partName: 'Ford Falcon BA XR6 turbo engine complete', buyer: 'Dave L.', loc: 'ADELAIDE, SA', make: 'Ford', model: 'Falcon', year: '2004', maxPrice: 2500, posted: '2 days ago' },
    { id: 107, partName: 'Commodore VE SS front seats pair', buyer: 'Nic A.', loc: 'MELBOURNE, VIC', make: 'Holden', model: 'Commodore', year: '2008', maxPrice: 700, posted: '3 days ago' },
    { id: 108, partName: 'Golf MK7 GTI exhaust', buyer: 'Petra H.', loc: 'SYDNEY, NSW', make: 'Volkswagen', model: 'Golf', year: '2016', maxPrice: 800, posted: '4 days ago' }
];

const workshopDatabase = [
    { id: 1, name: 'Eastside Toyota Repairs', specialty: 'Camry bonnet, body panels & crash repair', distance: '3.4km', loc: 'ADELAIDE, SA', rating: 4.9, vehicleTypes: ['Toyota', 'Camry', 'Hiace'], services: ['panel', 'crash repair', 'fitting'] },
    { id: 2, name: 'City Crash Workshop', specialty: 'Volkswagen and general panel fitment', distance: '5.1km', loc: 'ADELAIDE, SA', rating: 4.8, vehicleTypes: ['Volkswagen', 'Golf', 'Passat'], services: ['panel', 'alignment', 'fitment', 'electrical'] },
    { id: 3, name: 'Suburban Auto Fitters', specialty: 'Suspension, brakes and body fitment for Japanese sedans', distance: '6.8km', loc: 'ADELAIDE, SA', rating: 4.7, vehicleTypes: ['Toyota', 'Mazda', 'Nissan'], services: ['mechanical', 'fitting', 'inspection', 'tyres'] },
    { id: 4, name: 'Crash & Panel Pros', specialty: 'Full repair, repaint and fitting service', distance: '8.4km', loc: 'ADELAIDE, SA', rating: 4.6, vehicleTypes: ['Toyota', 'Volkswagen', 'Ford'], services: ['panel', 'body', 'fitment'] }
];

const WORKSHOP_PROFILE_KEY = 'apc.workshopProfile.v1';
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
        name: '',
        location: '',
        vehicles: '',
        services: {
            panel: false,
            fitment: false,
            mechanical: false,
            electrical: false,
            alignment: false,
            tyres: false
        },
        description: ''
    };
}

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
function setActiveNav(el) {
    document.querySelectorAll('.nav-item, .dsb-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
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
        notifyWantedMatch:    true,
        notifyMessages:       true,
        notifyPriceDrops:     true,
        notifyNewListings:    true,
        privacySuburbOnly:    true,
        privacyPublicProfile: true
    };
}
function saveUserSettings() {
    try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(userSettings)); } catch (e) {}
}
function saveSettingsName() {
    const val = document.getElementById('settingsDisplayName')?.value.trim();
    if (val && val !== currentUserName) {
        currentUserName = val;
        renderAccountState();
        renderProfile();
        showToast('Name updated');
    }
}
function saveSettingsLocation() {
    const val = document.getElementById('settingsLocation')?.value.trim();
    if (val !== undefined) {
        userSettings.location = val;
        saveUserSettings();
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
function onMenuOpenSettings() {
    renderSettingsDrawer();
    toggleDrawer('settingsDrawer', true);
}
function renderSettingsDrawer() {
    const nameEl     = document.getElementById('settingsDisplayName');
    const locEl      = document.getElementById('settingsLocation');
    const proSection = document.getElementById('settingsProSection');
    const proToggle  = document.getElementById('settingProSearch');

    if (nameEl) nameEl.value = currentUserName || '';
    if (locEl)  locEl.value  = userSettings.location || '';

    if (proSection) proSection.style.display = currentUserTier === 'pro' ? 'block' : 'none';
    if (proToggle)  proToggle.checked = proSearchOn;

    const toggleMap = {
        settingNotifyWanted:    'notifyWantedMatch',
        settingNotifyMessages:  'notifyMessages',
        settingNotifyPriceDrops:'notifyPriceDrops',
        settingNotifyNewListings:'notifyNewListings',
        settingPrivacySuburb:   'privacySuburbOnly',
        settingPrivacyPublic:   'privacyPublicProfile'
    };
    Object.entries(toggleMap).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (el) el.checked = userSettings[key];
    });
}

const LISTINGS_STORAGE_KEY = 'apc.listings.v1';
const REMEMBER_ME_KEY = 'apc.rememberMe.v1';
let userListings = loadUserListings();
let sellListingImages = [];

function loadUserListings() {
    try {
        const raw = localStorage.getItem(LISTINGS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}
function saveUserListings() {
    try { localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(userListings)); } catch (e) {}
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
    return [
        { id: 1, type: 'messages', icon: '💬', title: 'New message from Gary S.', meta: 'About your brake pads listing', unread: true, flagged: false },
        { id: 2, type: 'messages', icon: '💬', title: 'Message from Sarah J.', meta: 'Interested in your Elise parts', unread: true, flagged: false },
        { id: 3, type: 'matches', icon: '🔔', title: 'Match found for "Lotus Elise" Wanted', meta: '2 parts available', unread: true, flagged: false }
    ];
}
function nextInboxItemId() {
    return inboxItems.length ? Math.max(...inboxItems.map(i => i.id)) + 1 : 1;
}

function nextPartId() {
    const ids = [...partDatabase, ...userListings].map(p => p.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
}
function getAllParts() {
    return [...partDatabase, ...userListings];
}
function getPartById(id) {
    return getAllParts().find(p => p.id === id);
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

    activeFilters.make  = (document.getElementById('filterMake')?.value  || '').trim().toLowerCase();
    activeFilters.model = (document.getElementById('filterModel')?.value || '').trim().toLowerCase();
    activeFilters.year  = (document.getElementById('filterYear')?.value  || '').trim();

    activeFilters.location = document.getElementById('filterStateSelect')?.value || 'all';

    activeFilters.postcode = document.getElementById('filterPostcode')?.value.trim() || '';
    const activeRadius = document.querySelector('#radiusSegControl .radius-seg.active');
    activeFilters.radius = activeFilters.postcode ? (activeRadius?.dataset.radius || '50') : null;

    // Checkboxes: 0-4 = condition, 5-6 = logistics, 7-8 = seller
    const checkboxes = document.querySelectorAll('#filterDrawer input[type="checkbox"]');
    if (checkboxes.length >= 9) {
        activeFilters.postage       = checkboxes[5].checked;
        activeFilters.pickup        = checkboxes[6].checked;
        activeFilters.sellerPrivate = checkboxes[7].checked;
        activeFilters.sellerPro     = checkboxes[8].checked;
    }
}

function onPostcodeInput(input) {
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
}

function setRadiusFilter(el) {
    const control = document.getElementById('radiusSegControl');
    if (control && control.classList.contains('radius-seg-disabled')) return;
    document.querySelectorAll('#radiusSegControl .radius-seg').forEach(s => s.classList.remove('active'));
    if (el) el.classList.add('active');
}

function setSortOrder(el, order) {
    if (sortOrder === order) {
        sortOrder = 'none';
        document.querySelectorAll('#sortSegControl .radius-seg').forEach(s => s.classList.remove('active'));
        renderMainGrid();
        return;
    }
    sortOrder = order;
    document.querySelectorAll('#sortSegControl .radius-seg').forEach(s => s.classList.remove('active'));
    if (el) el.classList.add('active');
    renderMainGrid();
}

function setSortDate(el, order) {
    sortDate = order;
    document.querySelectorAll('#sortDateSegControl .radius-seg').forEach(s => s.classList.remove('active'));
    if (el) el.classList.add('active');
    renderMainGrid();
}

function applyFiltersAndRender() {
    getFilterValues();
    renderMainGrid();
    if (window.innerWidth < 900) toggleDrawer('filterDrawer');
}

function getFilteredParts() {
    const search = activeFilters.search.toLowerCase();
    const results = getAllParts().filter(part => {
        if (search && !part.title.toLowerCase().includes(search) && !part.loc.toLowerCase().includes(search)) return false;
        if (activeFilters.category !== 'all' && part.category !== activeFilters.category) return false;
        if (activeFilters.make && part.fits.length > 0) {
            const mk = activeFilters.make;
            if (!part.fits.some(f => f.make?.toLowerCase().includes(mk)) && !part.title.toLowerCase().includes(mk)) return false;
        }
        if (activeFilters.model && part.fits.length > 0) {
            const mdl = activeFilters.model;
            if (!part.fits.some(f => f.model?.toLowerCase().includes(mdl)) && !part.title.toLowerCase().includes(mdl)) return false;
        }
        if (activeFilters.location !== 'all') {
            const stateCode = part.loc.split(',')[1]?.trim();
            if (stateCode !== activeFilters.location) return false;
        }
        if (!activeFilters.sellerPro && part.isPro) return false;
        if (!activeFilters.sellerPrivate && !part.isPro) return false;
        return true;
    });
    if (sortOrder === 'asc')    results.sort((a, b) => a.price - b.price);
    if (sortOrder === 'desc')   results.sort((a, b) => b.price - a.price);
    if (sortDate === 'newest')  results.sort((a, b) => (b.date || 0) - (a.date || 0));
    if (sortDate === 'oldest')  results.sort((a, b) => (a.date || 0) - (b.date || 0));
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

function buildCardHTML(part) {
    // Only part.id goes into the onclick — never unsanitised user content
    const fittingLabel = part.fit
        ? `<span class="fitting-pill">FITTING AVAILABLE</span>`
        : '';

    const locationHTML = userIsSignedIn
        ? `📍 ${part.loc}`
        : `<span class="blurred-location">📍 ${part.loc}</span>`;

    const savedDot = savedParts.has(part.id) ? '<div class="card-saved-dot">&#x2665;&#xFE0E;</div>' : '';

    return `
        <div class="item-card" onclick="openItemDetail(${part.id})">
            <img class="item-img" src="${part.images[0]}" alt="${part.title}" loading="lazy">
            <div class="item-info">
                <div class="price-row">
                    <span class="item-price">$${part.price}</span>
                    ${fittingLabel}
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
        btnInfo.classList.toggle('saved', isSaved);
        btnInfo.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save listing');
    }
}

// --- RENDER MAIN HOME GRID ---
function renderMainGrid() {
    const mainGrid = document.getElementById('mainGrid');
    if (!mainGrid) return;

    mainGrid.innerHTML = '';

    if (currentSearchMode === 'wanted') {
        return renderWantedSearchResults(mainGrid);
    }

    const filtered = getFilteredParts();
    mainGrid.innerHTML = '';

    if (filtered.length === 0) {
        if (activeFilters.search.trim()) {
            const safeSearch = escapeHtml(activeFilters.search);
            mainGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888;">
                    <div style="font-weight: 700; margin-bottom: 10px;">No parts found for "${safeSearch}"</div>
                    <div style="font-size: 13px; margin-bottom: 20px;">Can't find what you're looking for?</div>
                    <button onclick="onAddWantedFromSearch()" style="background: var(--apc-orange); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer;">ADD TO WANTED LIST</button>
                </div>`;
        } else {
            mainGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888; font-weight: 700;">No parts match your filters.</div>`;
        }
        return;
    }

    filtered.forEach(part => {
        mainGrid.innerHTML += buildCardHTML(part);
    });
}

// FIND WANTED mode — shows other buyers' public wanted listings so sellers can see the market.
// This is a Pro seller tool: search what buyers are looking for, then list it.
function renderWantedSearchResults(mainGrid) {
    const query = activeFilters.search.toLowerCase();
    const matching = publicWantedDatabase.filter(w => {
        if (!query) return true;
        return w.partName.toLowerCase().includes(query) ||
               w.make.toLowerCase().includes(query) ||
               w.model.toLowerCase().includes(query);
    });

    if (!matching.length) {
        const safeSearch = escapeHtml(activeFilters.search);
        mainGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888;">
                <div style="font-weight: 700; margin-bottom: 10px;">No buyers looking for "${safeSearch}" right now</div>
                <div style="font-size: 13px;">Try a broader search — make, model, or part type.</div>
            </div>`;
        return;
    }

    const header = document.createElement('div');
    header.style.cssText = 'grid-column: 1/-1; display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;';
    header.innerHTML = `
        <div style="font-size:14px; font-weight:700; color:#333;">${matching.length} buyer${matching.length === 1 ? '' : 's'} looking</div>
    `;
    mainGrid.appendChild(header);

    const list = document.createElement('div');
    list.className = 'wanted-list';
    matching.forEach(w => {
        const card = document.createElement('div');
        card.className = 'wanted-card';

        const info = document.createElement('div');
        info.className = 'wanted-info';

        const name = document.createElement('div');
        name.className = 'wanted-name';
        name.textContent = w.partName;

        const meta = document.createElement('div');
        meta.className = 'wanted-meta';
        const metaParts = [`${w.make} ${w.model} ${w.year}`, w.loc];
        if (w.maxPrice) metaParts.push(`Budget $${w.maxPrice}`);
        metaParts.push(w.posted);
        meta.textContent = metaParts.join(' · ');

        info.appendChild(name);
        info.appendChild(meta);
        card.appendChild(info);

        const contactBtn = document.createElement('button');
        contactBtn.className = 'wanted-contact-btn';
        contactBtn.textContent = 'I HAVE THIS';
        contactBtn.onclick = (e) => {
            e.stopPropagation();
            showToast(`Contact request sent to ${w.buyer}`);
        };
        card.appendChild(contactBtn);
        list.appendChild(card);
    });

    mainGrid.appendChild(list);
}

// --- RENDER MY PARTS ---
function renderMyParts() {
    const myPartsList = document.getElementById('myPartsList');
    if (!myPartsList) return;

    myPartsList.innerHTML = '';
    const mySeller = getCurrentSellerName();
    const myParts = getAllParts().filter(part => part.seller === mySeller);

    if (myParts.length === 0) {
        myPartsList.innerHTML = `<div style="text-align:center; color:#888; padding: 30px; font-weight: 700;">No active listings.</div>`;
        return;
    }

    myParts.forEach(part => {
        const row = document.createElement('div');
        row.className = 'my-part-row';

        const thumb = document.createElement('img');
        thumb.src = part.images[0];
        thumb.className = 'my-part-thumb';

        const info = document.createElement('div');
        info.className = 'my-part-info';

        const title = document.createElement('div');
        title.className = 'my-part-title';
        title.textContent = part.title;   // textContent — safe, no XSS risk

        const meta = document.createElement('div');
        meta.className = 'my-part-meta';

        const price = document.createElement('div');
        price.className = 'my-part-price';
        price.textContent = `$${part.price}`;

        const badge = document.createElement('div');
        badge.className = 'my-part-badge';
        badge.textContent = 'ACTIVE';

        meta.appendChild(price);
        meta.appendChild(badge);
        info.appendChild(title);
        info.appendChild(meta);

        if (currentUserTier === 'pro') {
            const saves = document.createElement('div');
            saves.className = 'my-part-saves';
            saves.textContent = `♥ ${part.saves || 0} save${(part.saves || 0) === 1 ? '' : 's'}`;
            info.appendChild(saves);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'my-part-edit-btn';
        editBtn.textContent = 'EDIT';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            openEditListing(part.id);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'my-part-delete-btn';
        deleteBtn.textContent = 'DELETE';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this listing?')) {
                deleteListing(part.id);
            }
        };

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(editBtn);
        row.appendChild(deleteBtn);
        myPartsList.appendChild(row);
    });
}

function openSellOverlay() {
    if (!userIsSignedIn) {
        openAuthDrawer(openSellOverlay);
        return;
    }

    currentEditingListingId = null;
    resetSellForm();
    const title = document.getElementById('sellOverlayTitle');
    const submit = document.getElementById('sellSubmitBtn');
    if (title) title.textContent = 'LIST A PART';
    if (submit) submit.textContent = 'LIST PART NOW';
    updateSellFittingToggleVisibility();
    toggleDrawer('sellOverlay');
}

function openEditListing(listingId) {
    const listing = userListings.find(l => l.id === listingId);
    if (!listing) return;
    currentEditingListingId = listingId;
    sellListingImages = [...listing.images];

    document.getElementById('sellTitle').value = listing.title || '';
    document.getElementById('sellCategory').value = listing.category || '';
    document.getElementById('sellMake').value = listing.fits?.[0]?.make || '';
    document.getElementById('sellModel').value = listing.fits?.[0]?.model || '';
    document.getElementById('sellYear').value = listing.year || '';
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

    renderSellImagePreviews();

    const title = document.getElementById('sellOverlayTitle');
    const submit = document.getElementById('sellSubmitBtn');
    if (title) title.textContent = 'EDIT LISTING';
    if (submit) submit.textContent = 'UPDATE LISTING';
    updateSellFittingToggleVisibility();
    toggleDrawer('sellOverlay');
}

function deleteListing(id) {
    userListings = userListings.filter(l => l.id !== id);
    saveUserListings();
    renderMyParts();
    renderMainGrid();
    if (currentEditingListingId === id) {
        currentEditingListingId = null;
        resetSellForm();
    }
    showToast('Listing removed');
}

function handleSellImageFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.slice(0, 5 - sellListingImages.length).forEach(file => {
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

    const maxPhotos = 5;
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
        'sellTitle', 'sellCategory', 'sellMake', 'sellModel', 'sellYear', 'sellPostcode', 'sellLocation', 'sellPrice', 'sellCondition', 'sellDescription'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName.toLowerCase() === 'select' || el.tagName.toLowerCase() === 'input') el.value = '';
        if (el.tagName.toLowerCase() === 'textarea') el.value = '';
    });
    const pickup = document.getElementById('sellPickup');
    const postage = document.getElementById('sellPostage');
    const fitting = document.getElementById('sellFittingAvailable');
    if (pickup) pickup.checked = true;
    if (postage) postage.checked = false;
    if (fitting) fitting.checked = false;
    renderSellImagePreviews();
    updateSellFittingToggleVisibility();
}

function updateSellFittingToggleVisibility() {
    const section = document.getElementById('sellFittingToggleSection');
    if (!section) return;
    section.style.display = (userIsSignedIn && currentUserTier === 'pro') ? 'block' : 'none';
}

function submitSellListing() {
    const title = document.getElementById('sellTitle')?.value.trim();
    const category = document.getElementById('sellCategory')?.value;
    const make = document.getElementById('sellMake')?.value.trim();
    const model = document.getElementById('sellModel')?.value.trim();
    const year = document.getElementById('sellYear')?.value.trim();
    const postcode = document.getElementById('sellPostcode')?.value.trim();
    const location = document.getElementById('sellLocation')?.value.trim();
    const pickup = document.getElementById('sellPickup')?.checked;
    const postage = document.getElementById('sellPostage')?.checked;
    const price = document.getElementById('sellPrice')?.value.trim();
    const condition = document.getElementById('sellCondition')?.value;
    const description = document.getElementById('sellDescription')?.value.trim();

    if (!title || !category || !price || !location) {
        alert('Please complete the title, category, price and location fields.');
        return;
    }
    if (!sellListingImages.length) {
        alert('Please add at least one photo.');
        return;
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        alert('Enter a valid price.');
        return;
    }

    const fits = (make && model) ? [{ make: make.trim(), model: model.trim() }] : [];
    const fittingAvailable = userIsSignedIn && currentUserTier === 'pro' && document.getElementById('sellFittingAvailable')?.checked;
    const listingPayload = {
        title,
        price: numericPrice,
        images: [...sellListingImages],
        loc: location.toUpperCase(),
        postcode,
        fit: !!fittingAvailable,
        seller: getCurrentSellerName(),
        isPro: currentUserTier === 'pro',
        category,
        fits,
        year: year ? Number(year) : null,
        description,
        pickup,
        postage,
        condition: condition || 'used'
    };

    let message = 'Listing created';
    if (currentEditingListingId !== null) {
        const existing = userListings.find(l => l.id === currentEditingListingId);
        if (existing) {
            Object.assign(existing, listingPayload);
            message = 'Listing updated';
        } else {
            userListings.push({ id: nextPartId(), saves: 0, date: Date.now(), ...listingPayload });
        }
    } else {
        userListings.push({ id: nextPartId(), saves: 0, date: Date.now(), ...listingPayload });
    }

    saveUserListings();
    renderMainGrid();
    renderMyParts();
    showToast(message);
    toggleDrawer('sellOverlay');
    resetSellForm();
}

// --- DYNAMIC ITEM DETAIL ---
function openItemDetail(partId) {
    const part = getPartById(partId);
    if (!part) return;
    currentOpenPartId = partId;
    addToRecentlyViewed(partId);

    // 1. Carousel — only show images this part actually has, plus dot indicators
    const carousel = document.getElementById('imageCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    if (carousel) {
        carousel.innerHTML = '';
        carousel.scrollLeft = 0;          // reset to first image when re-opening
        part.images.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = 'min-width:100%; scroll-snap-align:start; aspect-ratio:4/3; object-fit:cover; cursor: zoom-in;';
            img.alt = part.title;
            img.onclick = () => openDetailImageViewer(src);
            carousel.appendChild(img);
        });
    }
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        if (part.images.length > 1) {
            part.images.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
                dotsContainer.appendChild(dot);
            });
            dotsContainer.style.display = 'flex';
        } else {
            dotsContainer.style.display = 'none';   // hide entirely when only one photo
        }
    }

    // 1b. Desktop: large main image + clickable thumbnails
    const desktopMain  = document.getElementById('desktopMainImage');
    const desktopThumbs = document.getElementById('desktopThumbnails');
    if (desktopMain) {
        desktopMain.src = part.images[0] || '';
        desktopMain.alt = part.title;
        desktopMain.onclick = () => openDetailImageViewer(part.images[0]);
    }
    if (desktopThumbs) {
        desktopThumbs.innerHTML = '';
        part.images.forEach((src, i) => {
            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.alt = part.title;
            thumb.className = 'desktop-thumb' + (i === 0 ? ' active' : '');
            thumb.onclick = () => {
                if (desktopMain) {
                    desktopMain.src = src;
                    desktopMain.onclick = () => openDetailImageViewer(src);
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
    safeText(document.getElementById('detailLoc'), part.loc);
    safeText(document.getElementById('chatPartnerName'), part.seller);
    safeText(document.getElementById('detailDescription'), part.description || 'Fully functional part. Tested and ready for installation.');
    syncDetailSaveButton(part.id);   // heart reflects current saved state

    const detailSellerSection = document.getElementById('detailSellerSection');
    const detailLocationSection = document.getElementById('detailLocationSection');
    const detailDescriptionSection = document.getElementById('detailDescriptionSection');
    const detailSignInPrompt = document.getElementById('detailSignInPrompt');
    const lockDetails = !userIsSignedIn;

    [detailSellerSection, detailLocationSection, detailDescriptionSection].forEach(el => {
        if (!el) return;
        el.classList.toggle('blurred-detail', lockDetails);
    });
    if (detailSignInPrompt) {
        detailSignInPrompt.style.display = lockDetails ? 'block' : 'none';
    }

    // 3. Update the seller header in the overlay (was hardcoded to Gary)
    // Amber header seller card (mobile)
    const sellerHeaderName = document.getElementById('detailSellerName');
    const sellerHeaderSub  = document.getElementById('detailSellerSub');
    const sellerAvatar     = document.getElementById('detailSellerAvatar');
    if (sellerHeaderName) sellerHeaderName.textContent = part.seller;
    if (sellerHeaderSub)  sellerHeaderSub.textContent  = 'View seller\'s other items →';
    if (sellerAvatar)     sellerAvatar.textContent      = part.seller.charAt(0).toUpperCase();
    const detailProBadge = document.getElementById('detailProBadge');
    if (detailProBadge) detailProBadge.style.display = part.isPro ? 'inline-block' : 'none';

    // Info col seller card (desktop — shown via CSS)
    const colAvatar  = document.getElementById('detailSellerColAvatar');
    const colName    = document.getElementById('detailSellerColName');
    const colProBadge = document.getElementById('detailProBadgeCol');
    if (colAvatar) colAvatar.textContent = part.seller.charAt(0).toUpperCase();
    if (colName)   colName.textContent   = part.seller;
    if (colProBadge) colProBadge.style.display = part.isPro ? 'inline-block' : 'none';

    // Apply blur lock to col seller card same as header seller card
    const detailSellerColCard = document.getElementById('detailSellerColCard');
    if (detailSellerColCard) detailSellerColCard.classList.toggle('blurred-detail', !userIsSignedIn);

    const workshopSection = document.getElementById('detailWorkshopSection');
    const workshopHeadline = document.getElementById('detailWorkshopHeadline');
    const workshopCards = document.getElementById('detailWorkshopCards');
    if (workshopSection && workshopHeadline && workshopCards) {
        const isUniversal = !part.fits || part.fits.length === 0;
        if (isUniversal) {
            workshopSection.style.display = 'none';
        } else {
            const workshops = getRecommendedWorkshops(part).slice(0, 3);
            const vehicleLabel = getDetailVehicleLabel(part);
            workshopHeadline.textContent = `Local ${vehicleLabel} specialists near you`;
            workshopCards.innerHTML = workshops.length
                ? workshops.map(buildWorkshopCardHTML).join('')
                : `<div style="padding: 14px; border: 1px solid #eee; border-radius: 14px; background: #fbfbfb; color: #555; font-size: 13px;">No local fitters are listed for this vehicle yet — check back soon.</div>`;
            workshopSection.style.display = 'block';
        }
    }

    // 4. Footer — more from seller or similar items
    const footer = document.getElementById('dynamicDetailFooter');
    if (!footer) return;

    const relatedParts = partDatabase.filter(p => p.id !== part.id);
    let miniGridHTML = '';
    relatedParts.slice(0, 8).forEach(p => {
        miniGridHTML += buildCardHTML(p);
    });

    if (part.isPro) {
        footer.innerHTML = `
            <div class="filter-section" style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; font-size: 12px; color: #888; padding: 0 15px;">MORE FROM ${part.seller.toUpperCase()}</h4>
                <div class="results-grid" style="margin-top: 0; padding-bottom: 15px;">${miniGridHTML}</div>
                <div style="text-align: center; padding-bottom: 30px; padding-top: 10px;">
                    <span onclick="openStorefront(${part.id})" style="color: var(--apc-orange); font-weight: 900; font-size: 12px; cursor: pointer; border-bottom: 2px solid var(--apc-orange);">VISIT STORE →</span>
                </div>
            </div>`;
    } else {
        footer.innerHTML = `
            <div class="filter-section" style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; font-size: 12px; color: #888; padding: 0 15px;">SIMILAR ITEMS</h4>
                <div class="results-grid" style="margin-top: 0; padding-bottom: 30px;">${miniGridHTML}</div>
            </div>`;
    }

    const detailScrollArea = document.getElementById('detailScrollArea');
    if (detailScrollArea) detailScrollArea.scrollTop = 0;

    toggleDrawer('detailOverlay');
}

function openDetailImageViewer(src) {
    const lightbox = document.getElementById('imageLightbox');
    const image = document.getElementById('lightboxImage');
    if (!lightbox || !image) return;
    image.src = src;
    lightbox.classList.add('active');
    // Allow pinch-to-zoom on the lightbox image
    document.querySelector('meta[name=viewport]').setAttribute('content',
        'width=device-width, initial-scale=1.0');
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
function openStorefront(partId) {
    const part = getPartById(partId);
    if (!part) return;

    const sellerName = part.seller;
    const isPro = part.isPro;

    safeText(document.getElementById('displaySellerName'), sellerName);

    const sellerGrid = document.getElementById('sellerPartsGrid');
    if (sellerGrid) {
        sellerGrid.innerHTML = '';
        partDatabase
            .filter(p => p.seller === sellerName)
            .forEach(p => { sellerGrid.innerHTML += buildCardHTML(p); });
    }
    const sellerBadge = document.getElementById('proBadge');
    if (sellerBadge) sellerBadge.style.display = isPro ? 'inline-block' : 'none';

    toggleDrawer('storefrontDrawer', true); // stack on top of detail overlay
}

// --- MESSAGING ---
function closeChatDrawer() {
    const el = document.getElementById('chatDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}

function closeStorefrontDrawer() {
    const el = document.getElementById('storefrontDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
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
    if (!userIsSignedIn) {
        openAuthDrawer();
    } else {
        toggleDrawer('chatDrawer', true);
    }
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
        alert('Please choose an image file.');
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

// Allow sending chat with Enter key
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }
});

// --- GARAGE: vehicle data model + persistence ---
const VEHICLES_STORAGE_KEY = 'apc.vehicles.v1';
let myVehicles = loadVehicles();

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
    renderGarage();
    toggleDrawer('garageDrawer');
}

// Open the Add Vehicle form on top of the garage drawer
function onAddVehicleClick() {
    ['vehMake','vehModel','vehYear','vehVariant','vehNickname','vehVin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    toggleDrawer('addVehicleDrawer', true);  // stack — keeps garage open underneath
}

// Back to garage from vehicle detail
function onBackToGarage() {
    const drawer = document.getElementById('vehicleDetailDrawer');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = 'hidden';  // keep hidden since garage is still open
}

// Validate + save the new vehicle
function submitAddVehicle() {
    const make     = document.getElementById('vehMake').value.trim();
    const model    = document.getElementById('vehModel').value.trim();
    const yearStr  = document.getElementById('vehYear').value.trim();
    const variant  = document.getElementById('vehVariant').value.trim();
    const nickname = document.getElementById('vehNickname').value.trim();
    const vin      = document.getElementById('vehVin').value.trim();

    if (!make || !model || !yearStr) {
        alert('Make, Model and Year are required.');
        return;
    }
    const year = Number(yearStr);
    if (!Number.isFinite(year) || year < 1900 || year > 2030) {
        alert('Please enter a valid 4-digit year.');
        return;
    }

    myVehicles.push({
        id: nextVehicleId(),
        make, model, year,
        variant:  variant  || '',
        nickname: nickname || '',
        vin:      vin      || ''
    });
    saveVehicles();
    renderGarage();
    // Close only the add drawer — don't use toggleDrawer() here as it would nuke the garage underneath
    const addVehEl = document.getElementById('addVehicleDrawer');
    if (addVehEl) addVehEl.classList.remove('active');
}

// Remove a vehicle (used later from vehicle detail/edit)
function deleteVehicle(id) {
    myVehicles = myVehicles.filter(v => v.id !== id);
    myWanted = myWanted.filter(w => w.vehicleId !== id);
    saveVehicles();
    saveWanted();
    if (currentVehicleId === id) {
        currentVehicleId = null;
        toggleDrawer('vehicleDetailDrawer');
    }
    renderGarage();
}

// Render the garage list — XSS-safe via createElement + textContent
function renderGarage() {
    const list = document.getElementById('garageVehicleList');
    if (!list) return;
    list.innerHTML = '';

    if (myVehicles.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'garage-empty';
        empty.innerHTML = `
            <div class="ico">🏠</div>
            <div class="title">Your garage is empty</div>
            <div class="sub">Add a vehicle and we'll show you parts that fit, plus notify you when wanted parts come up for sale.</div>`;
        list.appendChild(empty);
        return;
    }

    myVehicles.forEach(v => {
        const card  = document.createElement('div');
        card.className = 'vehicle-card';
        card.onclick = () => openVehicleDetail(v.id);

        const icon = document.createElement('div');
        icon.className = 'vehicle-card-icon';
        icon.textContent = '🚗';

        const info = document.createElement('div');
        info.className = 'vehicle-card-info';

        const name = document.createElement('div');
        name.className = 'vehicle-card-name';
        name.textContent = `${v.make} ${v.model}`;

        const meta = document.createElement('div');
        meta.className = 'vehicle-card-meta';
        meta.textContent = [v.year, v.variant, v.nickname].filter(Boolean).join(' · ') || '—';

        info.appendChild(name);
        info.appendChild(meta);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'vehicle-delete';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Remove this vehicle from your garage? This will also remove any wanted parts for this vehicle.')) {
                deleteVehicle(v.id);
            }
        };

        const arrow = document.createElement('div');
        arrow.className = 'vehicle-card-arrow';
        arrow.textContent = '›';

        card.appendChild(icon);
        card.appendChild(info);
        card.appendChild(deleteBtn);
        card.appendChild(arrow);
        list.appendChild(card);
    });
}

// --- SAVED PARTS: data model + persistence ---
const SAVED_STORAGE_KEY = 'apc.saved.v1';
let savedParts = loadSavedParts();   // Set<partId>

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
    syncDetailSaveButton(partId);
    renderMainGrid(); // refresh saved indicators on cards
    if (currentVehicleId && currentVehicleTab === 'saved') renderVehicleTab();
    if (document.getElementById('savedPartsDrawer')?.classList.contains('active')) renderSavedParts();
}

function closeSavedPartsDrawer() {
    const el = document.getElementById('savedPartsDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}
function onMenuOpenSavedParts() {
    renderSavedParts();
    toggleDrawer('savedPartsDrawer', true);
}
function renderSavedParts() {
    const content = document.getElementById('savedPartsContent');
    if (!content) return;

    const parts = [...savedParts].map(id => getPartById(id)).filter(Boolean);
    if (!parts.length) {
        content.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; color: #aaa;">
                <div style="font-size: 40px; margin-bottom: 12px;">♡</div>
                <div style="font-weight: 800; font-size: 15px; margin-bottom: 8px; color: #888;">No saved parts yet</div>
                <div style="font-size: 13px;">Tap the heart on any listing to save it here.</div>
            </div>`;
        return;
    }

    content.innerHTML = `
        <div class="rv-drawer-header">
            <span class="rv-drawer-count">${parts.length} part${parts.length === 1 ? '' : 's'} saved</span>
        </div>
        ${parts.map(part => `
            <div class="rv-drawer-row" onclick="openItemDetail(${part.id})">
                <img src="${part.images[0]}" alt="" class="rv-drawer-img">
                <div class="rv-drawer-info">
                    <div class="rv-drawer-title">${escapeHtml(part.title)}</div>
                    <div class="rv-drawer-meta">${escapeHtml(part.loc)}</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                    <div class="rv-drawer-price">$${part.price}</div>
                    <button class="sp-unsave-btn" onclick="event.stopPropagation(); toggleSavedPart(${part.id})" aria-label="Remove from saved">×</button>
                </div>
            </div>
        `).join('')}`;
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

// Add a new wanted entry
function addWanted(partName, vehicleId, maxPrice) {
    const id = nextWantedId();
    myWanted.push({
        id,
        partName,
        vehicleId, // null for any vehicle
        maxPrice: maxPrice || null,
        mutedNotifications: false,
        createdAt: new Date().toISOString()
    });
    saveWanted();
}

// Delete a wanted entry
function deleteWanted(id) {
    myWanted = myWanted.filter(w => w.id !== id);
    saveWanted();
}

// Match logic: does this part match the wanted criteria?
function wantedMatchesPart(wanted, part) {
    // Fuzzy substring match on part name (case-insensitive)
    if (!part.title.toLowerCase().includes(wanted.partName.toLowerCase())) return false;
    // Vehicle compatibility: if wanted has vehicleId, check fit; if null, always true
    if (wanted.vehicleId !== null) {
        const vehicle = myVehicles.find(v => v.id === wanted.vehicleId);
        if (!vehicle || !partFitsVehicle(part, vehicle)) return false;
    }
    return true;
}

// Placeholder for Add Wanted from search
function closeAddWantedDrawer() {
    const el = document.getElementById('addWantedDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}

function onAddWantedFromSearch() {
    document.getElementById('wantedPartName').value = activeFilters.search;
    document.getElementById('wantedMaxPrice').value = '';
    populateWantedVehicleSelect();

    const vehicleSelect = document.getElementById('wantedVehicleSelect');
    if (myVehicles.length === 1 && vehicleSelect) {
        vehicleSelect.value = myVehicles[0].id;
    }

    toggleDrawer('addWantedDrawer');
}

// Populate the vehicle dropdown for Add Wanted
function populateWantedVehicleSelect() {
    const select = document.getElementById('wantedVehicleSelect');
    select.innerHTML = '<option value="">Any vehicle</option>';
    myVehicles.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.make} ${v.model} ${v.year}`;
        select.appendChild(option);
    });
}

function openAddWantedForVehicle(vehicleId) {
    document.getElementById('wantedPartName').value = '';
    document.getElementById('wantedMaxPrice').value = '';
    populateWantedVehicleSelect();
    const vehicleSelect = document.getElementById('wantedVehicleSelect');
    if (vehicleSelect && vehicleId !== null) {
        vehicleSelect.value = vehicleId;
    }
    toggleDrawer('addWantedDrawer', true);  // stack — keeps vehicle detail open underneath
}

// Submit Add Wanted
function submitAddWanted() {
    const partName = document.getElementById('wantedPartName').value.trim();
    const maxPriceStr = document.getElementById('wantedMaxPrice').value.trim();
    const vehicleIdStr = document.getElementById('wantedVehicleSelect').value;

    if (!partName) {
        alert('Part name is required.');
        return;
    }

    const maxPrice = maxPriceStr ? Number(maxPriceStr) : null;
    const vehicleId = vehicleIdStr ? Number(vehicleIdStr) : null;

    addWanted(partName, vehicleId, maxPrice);
    showToast('Added to wanted list');

    // Stay on the drawer so the user can add more — just clear the part name and price.
    // Vehicle selection is kept so rapid multi-add for the same car is frictionless.
    document.getElementById('wantedPartName').value = '';
    document.getElementById('wantedMaxPrice').value = '';
    document.getElementById('wantedPartName').focus();

    // If vehicle detail's wanted tab is open behind this drawer, keep it fresh
    if (currentVehicleId && currentVehicleTab === 'wanted') renderVehicleTab();
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
    const v = myVehicles.find(x => x.id === vehicleId);
    if (!v) return;
    currentVehicleId  = vehicleId;
    currentVehicleTab = 'all';

    document.getElementById('vehDetailHeaderTitle').textContent = `${v.make} ${v.model}`;
    document.getElementById('vehDetailBannerName').textContent  = `${v.make} ${v.model}`;
    document.getElementById('vehDetailBannerMeta').textContent  =
        [v.year, v.variant, v.nickname].filter(Boolean).join(' · ') || '—';

    setVehicleTab('all');
    toggleDrawer('vehicleDetailDrawer', true);  // stack on top of garage drawer
}

function setVehicleTab(tab) {
    currentVehicleTab = tab;
    document.querySelectorAll('#vehicleDetailDrawer .seg').forEach(s => {
        s.classList.toggle('active', s.dataset.tab === tab);
    });
    renderVehicleTab();
}

function renderVehicleTab() {
    const c = document.getElementById('vehDetailTabContent');
    if (!c) return;
    const v = myVehicles.find(x => x.id === currentVehicleId);
    if (!v) { c.innerHTML = ''; return; }

    c.innerHTML = '';

    if (currentVehicleTab === 'all') {
        const fitting = getAllParts().filter(p => partFitsVehicle(p, v));
        if (!fitting.length) {
            c.appendChild(buildVehicleEmpty('🔍', `No listings match a ${v.make} ${v.model} yet.\nCheck back soon.`));
            return;
        }
        c.appendChild(buildPartsGrid(fitting));

    } else if (currentVehicleTab === 'wanted') {
        const vehicleWanted = myWanted.filter(w => w.vehicleId === currentVehicleId);
        if (!vehicleWanted.length) {
            c.appendChild(buildVehicleEmpty(
                '✦',
                `No wanted parts for your ${v.make} ${v.model} yet.\nAdd parts you're looking for to get notified when they're listed.`,
                { label: 'ADD WANTED PART', onClick: () => openAddWantedForVehicle(currentVehicleId) }
            ));
            return;
        }
        const addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex; justify-content:flex-end; padding: 0 0 10px 0;';
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add Wanted';
        addBtn.style.cssText = 'background:none; border:1px solid var(--apc-orange); color:var(--apc-orange); padding:6px 14px; border-radius:999px; font-weight:700; font-size:12px; cursor:pointer;';
        addBtn.onclick = () => openAddWantedForVehicle(currentVehicleId);
        addRow.appendChild(addBtn);
        c.appendChild(addRow);
        c.appendChild(buildWantedGrid(vehicleWanted));

    } else if (currentVehicleTab === 'saved') {
        const savedFitting = getAllParts().filter(p => savedParts.has(p.id) && partFitsVehicle(p, v));
        if (!savedFitting.length) {
            c.appendChild(buildVehicleEmpty('♡', `No saved listings for your ${v.make} ${v.model} yet.\nTap the heart on any listing to save it.`));
            return;
        }
        c.appendChild(buildPartsGrid(savedFitting));

    } else if (currentVehicleTab === 'matches') {
        const vehicleWanted = myWanted.filter(w => w.vehicleId === currentVehicleId);
        const matchingParts = getAllParts().filter(p =>
            vehicleWanted.some(w => wantedMatchesPart(w, p))
        );
        if (!matchingParts.length) {
            c.appendChild(buildVehicleEmpty('🔔', `No new matches for your ${v.make} ${v.model} wanted parts yet.\nWe'll notify you when parts come up for sale.`));
            return;
        }
        c.appendChild(buildPartsGrid(matchingParts));
    }
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
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this wanted part?')) {
                deleteWanted(w.id);
                renderVehicleTab();
            }
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

// --- INBOX ---
let currentInboxTab = 'all';

function onOpenInbox() {
    renderInbox();
    updateInboxBadge();
    toggleDrawer('inboxDrawer');
}

function updateInboxBadge() {
    const unreadCount = inboxItems.filter(item => item.unread).length;
    const text = unreadCount > 99 ? '99+' : String(unreadCount);
    const show = unreadCount > 0;
    const mobile  = document.getElementById('inboxBadge');
    const sidebar = document.getElementById('inboxBadgeDesktop');
    const topBar  = document.getElementById('inboxBadgeTopBar');
    if (mobile)  { mobile.textContent  = text; mobile.style.display  = show ? 'block' : 'none'; }
    if (sidebar) { sidebar.textContent = text; sidebar.style.display = show ? 'inline-block' : 'none'; }
    if (topBar)  { topBar.textContent  = text; topBar.style.display  = show ? 'inline-block' : 'none'; }
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
    currentUserName = name;
    currentUserTier = tier;
    if (remember) {
        saveRememberedUser({ name, tier, email });
    } else {
        clearRememberedUser();
    }
    renderAccountState();
}

// Wired to the SIGN IN button inside #authDrawer
function setAuthMode(mode) {
    authMode = mode;
    const signInTab = document.getElementById('authTabSignIn');
    const signUpTab = document.getElementById('authTabSignUp');
    const signInSection = document.getElementById('authSignInSection');
    const signUpSection = document.getElementById('authSignUpSection');
    const authTitle = document.getElementById('authTitle');
    const proBenefitsPanel = document.getElementById('proBenefitsPanel');

    if (signInTab) signInTab.classList.toggle('active', mode === 'signin');
    if (signUpTab) signUpTab.classList.toggle('active', mode === 'signup');
    if (signInSection) signInSection.style.display = mode === 'signin' ? 'block' : 'none';
    if (signUpSection) signUpSection.style.display = mode === 'signup' ? 'block' : 'none';
    if (authTitle) authTitle.textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
    if (proBenefitsPanel) proBenefitsPanel.style.display = 'none';

    if (mode === 'signin') {
        prefillRememberedSignIn();
        if (signUpSection) clearSignUpFields();
    } else {
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
    const nameInput = document.getElementById('authName');
    const emailInput = document.getElementById('authEmailSignup');
    const passwordInput = document.getElementById('authPasswordSignup');
    const rememberCheckbox = document.getElementById('authRememberMeSignup');
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (rememberCheckbox) rememberCheckbox.checked = false;
}

function openAuthDrawer(returnAction = null, mode = 'signin') {
    authReturnAction = returnAction;
    setAuthMode(mode);
    toggleDrawer('authDrawer');
}

function handleSignInSubmit() {
    const email = document.getElementById('authEmail')?.value.trim() || '';
    const password = document.getElementById('authPassword')?.value;
    const remember = document.getElementById('authRememberMe')?.checked;
    if (!email || !password) {
        alert('Enter your email and password to sign in.');
        return;
    }
    document.getElementById('authPassword').value = '';
    const userName = email.split('@')[0] || 'Member';
    signIn(userName, 'standard', remember, email);
    toggleDrawer('authDrawer');
    if (authReturnAction) {
        const nextAction = authReturnAction;
        authReturnAction = null;
        nextAction();
    }
}

function handleSignUpSubmit() {
    const name = document.getElementById('authName')?.value.trim();
    const email = document.getElementById('authEmailSignup')?.value.trim() || '';
    const password = document.getElementById('authPasswordSignup')?.value;
    const remember = document.getElementById('authRememberMeSignup')?.checked;
    document.getElementById('authPasswordSignup').value = '';
    if (!name || !email || !password) {
        alert('Please enter your name, email and password to sign up.');
        return;
    }
    signIn(name, 'standard', remember, email);
    toggleDrawer('authDrawer');
    if (authReturnAction) {
        const nextAction = authReturnAction;
        authReturnAction = null;
        nextAction();
    }
}

function onShowProBenefits() {
    const panel = document.getElementById('proBenefitsPanel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function onSignOut() {
    userIsSignedIn = false;
    currentUserName = null;
    currentUserTier = null;
    // Preserve remembered login state so the user can sign back in faster.
    closeAccountMenu();
    renderAccountState();
}

// Stub for the upgrade flow — production would route to a payment screen first
function onUpgradeToPro() {
    if (!userIsSignedIn) return;
    currentUserTier = 'pro';
    proSearchOn = true;             // default ON so they immediately see what they paid for
    closeAccountMenu();
    renderAccountState();
    if (document.getElementById('workshopDrawer')?.classList.contains('active')) {
        renderWorkshopProfile();
    }
}

// Pro-only: turn the FIND PARTS / FIND WANTED bar on/off
function onToggleProSearch(e) {
    if (e) e.stopPropagation();
    proSearchOn = !proSearchOn;
    renderAccountState();
}

// Pill click: open auth drawer if signed out, else toggle the dropdown menu
function onAccountPillClick(e) {
    if (e) e.stopPropagation();
    if (!userIsSignedIn) {
        openAuthDrawer();
        return;
    }
    toggleDrawer('accountMenuDrawer');
}

function closeAccountMenu() {
    const m = document.getElementById('accountMenuDrawer');
    if (m) m.classList.remove('active');
    syncBackdrop();
}

// Menu-item helpers — placeholders until each screen is built
function closeProfileDrawer() {
    const el = document.getElementById('profileDrawer');
    if (el) el.classList.remove('active');
    syncBackdrop();
}

function onMenuOpenProfile() {
    renderProfile();
    toggleDrawer('profileDrawer', true);
}

function openMyStorefront() {
    closeProfileDrawer();
    const sellerName = currentUserName || 'Me';
    safeText(document.getElementById('displaySellerName'), sellerName);
    const badgeEl = document.getElementById('proBadge');
    if (badgeEl) badgeEl.style.display = currentUserTier === 'pro' ? 'inline-block' : 'none';
    const sellerGrid = document.getElementById('sellerPartsGrid');
    if (sellerGrid) {
        sellerGrid.innerHTML = '';
        getAllParts()
            .filter(p => p.seller === sellerName)
            .forEach(p => { sellerGrid.innerHTML += buildCardHTML(p); });
    }
    toggleDrawer('storefrontDrawer');
}

function renderProfile() {
    if (!userIsSignedIn) return;

    const avatarEl        = document.getElementById('profileAvatar');
    const nameEl          = document.getElementById('profileName');
    const badgeEl         = document.getElementById('profileTierBadge');
    const heroEl          = document.getElementById('profileHero');
    const listingsEl      = document.getElementById('profileStatListings');
    const savedEl         = document.getElementById('profileStatSaved');
    const wantedEl        = document.getElementById('profileStatWanted');

    if (avatarEl) avatarEl.textContent = (currentUserName || 'U').charAt(0).toUpperCase();
    if (nameEl)   nameEl.textContent   = currentUserName || 'User';

    const isPro = currentUserTier === 'pro';
    if (badgeEl) {
        badgeEl.textContent = isPro ? 'APC Pro' : 'APC Standard';
        badgeEl.className   = 'profile-tier-badge ' + (isPro ? 'pro' : 'standard');
    }
    if (heroEl) {
        heroEl.style.background = isPro
            ? 'linear-gradient(135deg, #007AFF 0%, #0055cc 100%)'
            : 'linear-gradient(135deg, var(--apc-orange) 0%, #e07b00 100%)';
    }

    const myListingCount = getAllParts().filter(p => p.seller === currentUserName).length;
    if (listingsEl) listingsEl.textContent = myListingCount;
    if (savedEl)    savedEl.textContent    = savedParts.size;
    if (wantedEl)   wantedEl.textContent   = myWanted.length;
}

function onMenuPlaceholder(label) {
    closeAccountMenu();
    showToast(label + ' — coming soon.');
}
function onMenuOpenWorkshops() {
    if (!userIsSignedIn) {
        openAuthDrawer(onMenuOpenWorkshops);
        return;
    }
    renderWorkshopProfile();
    if (currentUserTier !== 'pro') {
        renderWorkshopBrowseView();
    }
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
    workshopProfile = {
        name: document.getElementById('workshopName')?.value.trim() || '',
        location: document.getElementById('workshopLocation')?.value.trim() || '',
        vehicles: document.getElementById('workshopVehicles')?.value.trim() || '',
        services: {
            panel: document.getElementById('workshopServicePanel')?.checked || false,
            fitment: document.getElementById('workshopServiceFitment')?.checked || false,
            mechanical: document.getElementById('workshopServiceMechanical')?.checked || false,
            electrical: document.getElementById('workshopServiceElectrical')?.checked || false,
            alignment: document.getElementById('workshopServiceAlignment')?.checked || false,
            tyres: document.getElementById('workshopServiceTyres')?.checked || false
        },
        description: document.getElementById('workshopDescription')?.value.trim() || ''
    };
    saveWorkshopProfile();
    showToast('Workshop profile saved');
    toggleDrawer('workshopDrawer');
}
function renderWorkshopProfile() {
    const notice = document.getElementById('workshopProNotice');
    const profileFields = document.getElementById('workshopProfileFields');
    const browseSection = document.getElementById('workshopBrowseSection');
    const drawerTitle = document.getElementById('workshopDrawerTitle');
    const saveBtn = document.querySelector('#workshopDrawer .btn-full-action');
    const isPro = currentUserTier === 'pro';

    if (notice) notice.style.display = isPro ? 'none' : 'block';
    if (profileFields) profileFields.style.display = isPro ? 'block' : 'none';
    if (browseSection) browseSection.style.display = isPro ? 'none' : 'block';
    if (drawerTitle) drawerTitle.textContent = isPro ? 'APC Pro Workshops' : 'Find workshops & services';
    if (saveBtn) saveBtn.disabled = !isPro;

    const nameField = document.getElementById('workshopName');
    const locationField = document.getElementById('workshopLocation');
    const vehiclesField = document.getElementById('workshopVehicles');
    const descField = document.getElementById('workshopDescription');
    const servicePanel = document.getElementById('workshopServicePanel');
    const serviceFitment = document.getElementById('workshopServiceFitment');
    const serviceMechanical = document.getElementById('workshopServiceMechanical');
    const serviceElectrical = document.getElementById('workshopServiceElectrical');
    const serviceAlignment = document.getElementById('workshopServiceAlignment');
    const serviceTyres = document.getElementById('workshopServiceTyres');

    if (nameField) nameField.value = workshopProfile.name;
    if (locationField) locationField.value = workshopProfile.location;
    if (vehiclesField) vehiclesField.value = workshopProfile.vehicles;
    if (descField) descField.value = workshopProfile.description;
    if (servicePanel) servicePanel.checked = workshopProfile.services.panel;
    if (serviceFitment) serviceFitment.checked = workshopProfile.services.fitment;
    if (serviceMechanical) serviceMechanical.checked = workshopProfile.services.mechanical;
    if (serviceElectrical) serviceElectrical.checked = workshopProfile.services.electrical;
    if (serviceAlignment) serviceAlignment.checked = workshopProfile.services.alignment;
    if (serviceTyres) serviceTyres.checked = workshopProfile.services.tyres;
}
function renderWorkshopBrowseView() {
    const filters = {
        mechanical: document.getElementById('workshopFilterMechanical')?.checked,
        crash: document.getElementById('workshopFilterCrash')?.checked,
        electrician: document.getElementById('workshopFilterElectrician')?.checked,
        tyres: document.getElementById('workshopFilterTyres')?.checked
    };
    const sponsoredList = document.getElementById('workshopSponsoredList');
    if (!sponsoredList) return;

    const query = (document.getElementById('workshopSearchInput')?.value || '').trim().toLowerCase();

    const activeFilters = Object.entries(filters).filter(([, value]) => value).map(([key]) => key);
    const matches = workshopDatabase.filter(w => {
        if (query) {
            const haystack = [w.name, w.loc, ...w.vehicleTypes, ...w.services].join(' ').toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        if (!activeFilters.length) return true;
        return activeFilters.some(filter => {
            if (filter === 'mechanical') return w.services.includes('mechanical');
            if (filter === 'crash') return w.services.includes('crash repair') || w.services.includes('panel');
            if (filter === 'electrician') return w.services.includes('electrical');
            if (filter === 'tyres') return w.services.includes('tyres');
            return false;
        });
    });

    if (!matches.length) {
        sponsoredList.innerHTML = '<div class="workshop-card"><div class="workshop-card-name">No workshops match your search.</div></div>';
        return;
    }

    sponsoredList.innerHTML = matches.map(buildSponsoredWorkshopCardHTML).join('');
}
function buildSponsoredWorkshopCardHTML(workshop) {
    const stars = workshop.rating ? `<span class="workshop-rating">★ ${workshop.rating}</span>` : '';
    return `
        <div class="workshop-card workshop-sponsor-card">
            <div class="workshop-card-header">
                <div class="workshop-card-name">${workshop.name}</div>
                <div class="workshop-card-distance">${workshop.distance}</div>
            </div>
            <div class="workshop-card-specialty">${workshop.specialty}</div>
            <div class="workshop-card-footer">
                ${stars}
                <button class="workshop-card-button" onclick="openWorkshopDetail(${workshop.id})">View →</button>
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
    toggleDrawer('myPartsDrawer', true);
}

// Re-render the pill, menu, and pro-toggle visibility based on current state
function renderAccountState() {
    const pill           = document.getElementById('accountPill');
    const proToggle      = document.getElementById('proSearchToggle');
    const menuName       = document.getElementById('accountMenuName');
    const menuStatus     = document.getElementById('accountMenuStatus');
    const menuAvatar     = document.getElementById('accountMenuAvatar');
    const menuUpgrade    = document.getElementById('accountMenuUpgrade');
    const menuActivate   = document.getElementById('accountMenuActivate');
    const proSearchSwitch = document.getElementById('proSearchSwitch');

    if (!pill) return;

    pill.classList.remove('signed-out', 'signed-in', 'tier-standard', 'tier-pro');

    if (!userIsSignedIn) {
        pill.classList.add('signed-out');
        pill.innerHTML = 'Sign In';
        if (proToggle) proToggle.style.display = 'none';
    } else if (currentUserTier === 'pro') {
        pill.classList.add('signed-in');
        pill.innerHTML = escapeHtml(currentUserName || 'Account') + ' <span class="pill-pro-label">Pro</span> <span class="caret">▾</span>';
        if (proToggle) proToggle.style.display = proSearchOn ? 'flex' : 'none';
    } else {
        pill.classList.add('signed-in');
        pill.innerHTML = escapeHtml(currentUserName || 'Account') + ' <span class="caret">▾</span>';
        if (proToggle) proToggle.style.display = 'none';
    }

    if (menuName)   menuName.textContent   = currentUserName || 'Guest';
    if (menuStatus) {
        menuStatus.classList.toggle('pro', currentUserTier === 'pro');
        menuStatus.textContent = currentUserTier === 'pro'      ? 'APC Pro member' :
                                 currentUserTier === 'standard' ? 'APC Standard member' : '';
    }
    if (menuAvatar) {
        menuAvatar.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
        menuAvatar.style.background = currentUserTier === 'pro' ? 'var(--apc-blue)' : 'var(--apc-orange)';
    }
    if (menuUpgrade)      menuUpgrade.style.display      = (currentUserTier === 'standard') ? 'flex' : 'none';
    if (menuActivate) {
        menuActivate.style.display = (currentUserTier === 'pro') ? 'flex' : 'none';
        menuActivate.classList.toggle('on', proSearchOn);
    }
    if (proSearchSwitch)  proSearchSwitch.classList.toggle('on', proSearchOn);
    if (proSearchOn && currentUserTier === 'pro') {
        const proToggle = document.getElementById('proSearchToggle');
        if (proToggle) proToggle.style.display = 'flex';
    }
    updateSellFittingToggleVisibility();
    if (!userIsSignedIn || currentUserTier !== 'pro' || !proSearchOn) {
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
    if (header && grid) {
        // offsetParent is null for fixed elements regardless of visibility — use offsetHeight directly (0 when display:none)
        const topBarH = topBar ? topBar.offsetHeight : 0;
        const totalH  = header.offsetHeight + topBarH;
        grid.style.marginTop = totalH + 'px';
        if (window.innerWidth >= 900) {
            if (rightPanel)        rightPanel.style.top        = totalH + 'px';
            if (filterDrawer)      filterDrawer.style.top      = totalH + 'px';
            if (detailOverlay)     detailOverlay.style.top     = totalH + 'px';
            if (storefrontDrawer)  storefrontDrawer.style.top  = totalH + 'px';
        }
    }
}

window.addEventListener('resize', updateHeaderOffset);
// Re-run after images load — logo height affects the header height calculation
window.addEventListener('load', updateHeaderOffset);

// --- SEARCH MODE TOGGLE ---
function setSearchMode(mode) {
    const partBtn   = document.getElementById('searchModeParts');
    const wantedBtn = document.getElementById('searchModeWanted');
    const searchInput = document.getElementById('mainSearchInput');
    if (!partBtn || !wantedBtn) return;

    currentSearchMode = mode === 'wanted' ? 'wanted' : 'parts';

    if (mode === 'parts') {
        partBtn.style.background   = 'var(--white)';
        partBtn.style.color        = 'var(--apc-orange)';
        partBtn.style.boxShadow    = '0 1px 3px rgba(0,0,0,0.1)';
        wantedBtn.style.background = 'none';
        wantedBtn.style.color      = '#888';
        wantedBtn.style.boxShadow  = 'none';
        if (searchInput) searchInput.placeholder = 'Search parts for sale...';
    } else {
        wantedBtn.style.background = 'var(--white)';
        wantedBtn.style.color      = 'var(--apc-orange)';
        wantedBtn.style.boxShadow  = '0 1px 3px rgba(0,0,0,0.1)';
        partBtn.style.background   = 'none';
        partBtn.style.color        = '#888';
        partBtn.style.boxShadow    = 'none';
        if (searchInput) searchInput.placeholder = 'Search your wanted list...';
    }

    renderMainGrid();
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
    const dots     = document.querySelectorAll('#carouselDots .carousel-dot');
    if (!carousel || !dots.length) return;
    const idx = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    renderMainGrid();
    renderMyParts();
    renderGarage();            // build vehicle list from localStorage so drawer is ready when opened
    updateInboxBadge();        // update badge from mock notifications
    const remembered = loadRememberedUser();
    if (remembered && remembered.name) {
        signIn(remembered.name, remembered.tier || 'standard', true, remembered.email || '');
    }
    renderAccountState();      // sets pill label/colour, hides pro toggle, sizes the grid offset

    // Wire up the carousel scroll → active-dot sync once
    const carouselEl = document.getElementById('imageCarousel');
    if (carouselEl) {
        carouselEl.addEventListener('scroll', updateCarouselActiveDot, { passive: true });
    }

    // Wire up live search with debounce
    const searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            activeFilters.search = searchInput.value.trim();
            renderMainGrid();
        }, 300));
    }

    // Wire up the filter "Update Results" button
    const filterBtn = document.querySelector('#filterDrawer .btn-full-action');
    if (filterBtn) {
        filterBtn.onclick = applyFiltersAndRender;
    }

    // Live filters on desktop — re-render instantly on any filter input change
    document.querySelectorAll('#filterDrawer select, #filterDrawer input[type="checkbox"], #filterDrawer input[type="text"], #filterDrawer input[type="number"]').forEach(el => {
        const evt = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(evt, () => {
            if (window.innerWidth >= 900) applyFiltersAndRender();
        });
    });

    // Prepare the sell form preview boxes
    renderSellImagePreviews();

    // Wire up search radius segmented control in filters
    document.querySelectorAll('.radius-seg').forEach(seg => {
        seg.addEventListener('click', () => {
            document.querySelectorAll('.radius-seg').forEach(s => s.classList.remove('active'));
            seg.classList.add('active');
        });
    });
});
