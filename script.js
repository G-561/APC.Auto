// --- GLOBAL STATE ---
let userIsSignedIn = false;          // starts logged out — header shows "Sign In" pill
let currentUserName = null;          // e.g. "Gary"
let currentUserTier = null;          // 'standard' | 'pro'
let proSearchOn    = true;           // when user is pro, controls FIND PARTS / FIND WANTED bar
let currentOpenPartId = null;  // tracks which part detail is open
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
    { id: 1, title: "Genuine Toyota Hiace Left Side Mirror (2019+)", price: 85, images: ["images/hiace.mirror.jpg", "images/hiace.handle.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }] },
    { id: 2, title: "Lotus Elise S2 GT Track Spoiler", price: 850, images: ["images/elise.wing.jpg", "images/elise.diffuser.jpg", "images/elise.exhaust.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Lotus', model: 'Elise' }] },
    { id: 3, title: "Toyota Hiace Tail Light Assembly (Current)", price: 145, images: ["images/hiace.taillight.webp", "images/hiace.bumper.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "lighting", fits: [{ make: 'Toyota', model: 'Hiace' }] },
    { id: 4, title: "Custom 3D Printed Racing Center Caps (Set of 4)", price: 40, images: ["images/elise.wheel.jpg", "images/elise.rims.jpg", "images/commodore.wheels.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "wheels", fits: [] },
    { id: 5, title: "Toyota Hiace Sliding Door Handle", price: 35, images: ["images/hiace.handle.jpg", "images/hiace.mirror.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }] },
    { id: 6, title: "Lotus Elise Sport Steering Wheel", price: 320, images: ["images/elise.steering.wheel.jpeg", "images/dash.mount.jpg", "images/gauge.pod.jpg", "images/elise.seat.jpg"], loc: "SYDNEY, NSW", fit: false, seller: "Sarah J.", isPro: false, category: "interior", fits: [{ make: 'Lotus', model: 'Elise' }] },
    { id: 7, title: "Performance Brake Calipers (Front Set)", price: 450, images: ["images/elise.brake.pads.jpg", "images/elise.rims.jpg", "images/elise.wheel.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Mike D.", isPro: true, category: "brakes", fits: [{ make: 'Lotus', model: 'Elise' }] },
    { id: 8, title: "Universal Cold Air Intake Kit", price: 120, images: ["images/Elise.scoops.webp", "images/turbo.webp", "images/1KD.engine.webp"], loc: "BRISBANE, QLD", fit: false, seller: "Alex T.", isPro: false, category: "engine", fits: [] }
];

// Look up a part by its stable id instead of array index
function getPartById(id) {
    return partDatabase.find(p => p.id === id);
}

// --- CORE UI CONTROLS ---

// Close all open drawers, then open the requested one.
// Pass `allowStack: true` to open on top of an existing drawer (e.g. storefront from detail).
function toggleDrawer(id, allowStack = false) {
    const drawer = document.getElementById(id);
    if (!drawer) return;

    const isOpen = drawer.classList.contains('active');

    if (!allowStack) {
        // Close every other drawer first
        document.querySelectorAll('.drawer.active').forEach(d => {
            if (d.id !== id) d.classList.remove('active');
        });
    }

    drawer.classList.toggle('active');
    document.body.style.overflow = drawer.classList.contains('active') ? 'hidden' : 'auto';
}

// --- FILTER HELPERS ---

function getFilterValues() {
    activeFilters.category = document.querySelector('#filterDrawer select')?.value || 'all';

    const makeModelYear = document.querySelectorAll('#filterDrawer .input-row-flex input');
    if (makeModelYear.length >= 3) {
        activeFilters.make  = makeModelYear[0].value.trim().toLowerCase();
        activeFilters.model = makeModelYear[1].value.trim().toLowerCase();
        activeFilters.year  = makeModelYear[2].value.trim();
    }

    const locationSelect = document.querySelectorAll('#filterDrawer select')[1];
    activeFilters.location = locationSelect?.value || 'all';

    const priceInputs = document.querySelectorAll('#filterDrawer input[type="number"]');
    if (priceInputs.length >= 2) {
        activeFilters.minPrice = priceInputs[0].value;
        activeFilters.maxPrice = priceInputs[1].value;
    }

    const checkboxes = document.querySelectorAll('#filterDrawer input[type="checkbox"]');
    if (checkboxes.length >= 6) {
        activeFilters.conditionNew   = checkboxes[0].checked;
        activeFilters.conditionUsed  = checkboxes[1].checked;
        activeFilters.postage        = checkboxes[2].checked;
        activeFilters.pickup         = checkboxes[3].checked;
        activeFilters.sellerPrivate  = checkboxes[4].checked;
        activeFilters.sellerPro      = checkboxes[5].checked;
    }
}

function applyFiltersAndRender() {
    getFilterValues();
    renderMainGrid();
    toggleDrawer('filterDrawer');
}

function getFilteredParts() {
    const search = activeFilters.search.toLowerCase();
    return partDatabase.filter(part => {
        if (search && !part.title.toLowerCase().includes(search) && !part.loc.toLowerCase().includes(search)) return false;
        if (activeFilters.category !== 'all' && part.category !== activeFilters.category) return false;
        if (activeFilters.location !== 'all') {
            const stateCode = part.loc.split(',')[1]?.trim();
            if (stateCode !== activeFilters.location) return false;
        }
        if (activeFilters.minPrice !== '' && part.price < Number(activeFilters.minPrice)) return false;
        if (activeFilters.maxPrice !== '' && part.price > Number(activeFilters.maxPrice)) return false;
        if (!activeFilters.sellerPro && part.isPro) return false;
        if (!activeFilters.sellerPrivate && !part.isPro) return false;
        return true;
    });
}

// --- RENDER HELPERS ---

// Safe way to set text — avoids XSS by never using innerHTML for user-supplied content
function safeText(el, text) {
    if (el) el.textContent = text;
}

function buildCardHTML(part) {
    // Only part.id goes into the onclick — never unsanitised user content
    return `
        <div class="item-card" onclick="openItemDetail(${part.id})">
            <img class="item-img" src="${part.images[0]}" alt="${part.title}" loading="lazy">
            <div class="item-info">
                <div class="price-row">
                    <span class="item-price">$${part.price}</span>
                    ${part.fit ? `<span class="fitting-pill">FITTING AVAILABLE</span>` : ''}
                </div>
                <div class="item-title">${part.title}</div>
                <div class="item-loc">📍 ${part.loc}</div>
            </div>
        </div>`;
}

// Reflect the current saved state on the detail-overlay heart button
function syncDetailSaveButton(partId) {
    const btn = document.getElementById('detailSaveBtn');
    if (!btn) return;
    const isSaved = savedParts.has(partId);
    btn.classList.toggle('saved', isSaved);
    btn.textContent = isSaved ? '♥' : '♡';
    btn.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save listing');
}

// --- RENDER MAIN HOME GRID ---
function renderMainGrid() {
    const mainGrid = document.getElementById('mainGrid');
    if (!mainGrid) return;

    const filtered = getFilteredParts();
    mainGrid.innerHTML = '';

    if (filtered.length === 0) {
        mainGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #888; font-weight: 700;">No parts match your filters.</div>`;
        return;
    }

    // Repeat to fill the grid (remove this loop once you have real data)
    for (let i = 0; i < 12; i++) {
        mainGrid.innerHTML += buildCardHTML(filtered[i % filtered.length]);
    }
}

// --- RENDER MY PARTS ---
function renderMyParts() {
    const myPartsList = document.getElementById('myPartsList');
    if (!myPartsList) return;

    myPartsList.innerHTML = '';
    const myParts = partDatabase.filter(part => part.seller === "Gary S.");

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

        const editBtn = document.createElement('button');
        editBtn.className = 'my-part-edit-btn';
        editBtn.textContent = 'EDIT';

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(editBtn);
        myPartsList.appendChild(row);
    });
}

// --- DYNAMIC ITEM DETAIL ---
function openItemDetail(partId) {
    const part = getPartById(partId);
    if (!part) return;
    currentOpenPartId = partId;  // keeps the seller header link up to date

    // 1. Carousel — only show images this part actually has, plus dot indicators
    const carousel = document.getElementById('imageCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    if (carousel) {
        carousel.innerHTML = '';
        carousel.scrollLeft = 0;          // reset to first image when re-opening
        part.images.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = 'min-width:100%; scroll-snap-align:start; aspect-ratio:4/3; object-fit:cover;';
            img.alt = part.title;
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

    // 2. Update detail fields safely
    safeText(document.getElementById('detailPrice'), `$${part.price}`);
    safeText(document.getElementById('detailTitle'), part.title);
    safeText(document.getElementById('detailLoc'), part.loc);
    safeText(document.getElementById('chatPartnerName'), part.seller);
    syncDetailSaveButton(part.id);   // heart reflects current saved state

    // 3. Update the seller header in the overlay (was hardcoded to Gary)
    const sellerHeaderName = document.getElementById('detailSellerName');
    const sellerHeaderSub  = document.getElementById('detailSellerSub');
    const sellerAvatar     = document.getElementById('detailSellerAvatar');
    if (sellerHeaderName) sellerHeaderName.textContent = part.seller + (part.isPro ? '' : '');
    if (sellerHeaderSub)  sellerHeaderSub.textContent  = 'View seller\'s other items →';
    if (sellerAvatar)     sellerAvatar.textContent      = part.seller.charAt(0).toUpperCase();

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

    toggleDrawer('detailOverlay');
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

    toggleDrawer('storefrontDrawer', true); // stack on top of detail overlay
}

// --- MESSAGING ---
function handleMessageSeller() {
    if (!userIsSignedIn) {
        toggleDrawer('authDrawer');
    } else {
        toggleDrawer('chatDrawer', true);
    }
}

// XSS-safe chat: build message node with textContent, never innerHTML
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const box   = document.getElementById('chatBox');
    if (!input || input.value.trim() === '') return;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble-sent';
    bubble.textContent = input.value;  // safe — no HTML injection possible
    box.appendChild(bubble);

    input.value = '';
    box.scrollTop = box.scrollHeight;
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
    toggleDrawer('addVehicleDrawer');  // close the add drawer; garage stays open
}

// Remove a vehicle (used later from vehicle detail/edit)
function deleteVehicle(id) {
    myVehicles = myVehicles.filter(v => v.id !== id);
    saveVehicles();
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

        const arrow = document.createElement('div');
        arrow.className = 'vehicle-card-arrow';
        arrow.textContent = '›';

        card.appendChild(icon);
        card.appendChild(info);
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
function toggleSavedPart(partId) {
    if (!partId) return;
    if (savedParts.has(partId)) {
        savedParts.delete(partId);
        showToast('Removed from saved');
    } else {
        savedParts.add(partId);
        showToast('Saved');
    }
    persistSavedParts();
    syncDetailSaveButton(partId);
    // Vehicle Saved tab needs to update if the user is currently on it
    if (currentVehicleId && currentVehicleTab === 'saved') renderVehicleTab();
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
        const fitting = partDatabase.filter(p => partFitsVehicle(p, v));
        if (!fitting.length) {
            c.appendChild(buildVehicleEmpty('🔍', `No listings match a ${v.make} ${v.model} yet.\nCheck back soon.`));
            return;
        }
        c.appendChild(buildPartsGrid(fitting));

    } else if (currentVehicleTab === 'wanted') {
        c.appendChild(buildVehicleEmpty('✦', "Wanted list — coming next.\nYou'll be able to add parts you're looking for and we'll notify you when they're listed."));

    } else if (currentVehicleTab === 'saved') {
        const savedFitting = partDatabase.filter(p => savedParts.has(p.id) && partFitsVehicle(p, v));
        if (!savedFitting.length) {
            c.appendChild(buildVehicleEmpty('♡', `No saved listings for your ${v.make} ${v.model} yet.\nTap the heart on any listing to save it.`));
            return;
        }
        c.appendChild(buildPartsGrid(savedFitting));

    } else if (currentVehicleTab === 'matches') {
        c.appendChild(buildVehicleEmpty('🔔', "Matches — coming next.\nWhen new listings hit your wanted criteria, they'll show up here."));
    }
}

function buildPartsGrid(parts) {
    const g = document.createElement('div');
    g.className = 'results-grid';
    g.style.marginTop = '0';
    parts.forEach(p => { g.innerHTML += buildCardHTML(p); });
    return g;
}

function buildVehicleEmpty(ico, text) {
    const e = document.createElement('div');
    e.className = 'veh-empty';
    const i = document.createElement('div'); i.className = 'ico'; i.textContent = ico;
    const t = document.createElement('div'); t.className = 'text'; t.textContent = text;
    e.appendChild(i); e.appendChild(t);
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

// --- INBOX (stub — real screen lands in Phase 2) ---
function onOpenInbox() {
    alert('Inbox — coming with Wanted/Matches in the next phase. Will show messages, match notifications, and price drops.');
}

// --- AUTH STATE + ACCOUNT MENU ---

// Sign in (stub — wire into real auth later). Always lands as Standard tier.
function signIn(name = 'Gary', tier = 'standard') {
    userIsSignedIn = true;
    currentUserName = name;
    currentUserTier = tier;
    renderAccountState();
}

// Wired to the SIGN IN button inside #authDrawer
function handleSignInSubmit() {
    signIn('Gary', 'standard');
    toggleDrawer('authDrawer');
}

function onSignOut() {
    userIsSignedIn = false;
    currentUserName = null;
    currentUserTier = null;
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
        toggleDrawer('authDrawer');
        return;
    }
    const m = document.getElementById('accountMenu');
    if (!m) return;
    m.style.display = (m.style.display === 'block') ? 'none' : 'block';
}

function closeAccountMenu() {
    const m = document.getElementById('accountMenu');
    if (m) m.style.display = 'none';
}

// Menu-item helpers — placeholders until each screen is built
function onMenuPlaceholder(label) {
    closeAccountMenu();
    alert(label + ' — coming soon.');
}
function onMenuOpenMyListings() {
    closeAccountMenu();
    toggleDrawer('myPartsDrawer');
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

    pill.classList.remove('signed-out','tier-standard','tier-pro');

    if (!userIsSignedIn) {
        pill.classList.add('signed-out');
        pill.innerHTML = 'Sign In';
        if (proToggle) proToggle.style.display = 'none';
    } else if (currentUserTier === 'pro') {
        pill.classList.add('tier-pro');
        pill.innerHTML = 'APC Pro <span class="caret">▾</span>';
        if (proToggle) proToggle.style.display = proSearchOn ? 'flex' : 'none';
    } else {
        pill.classList.add('tier-standard');
        pill.innerHTML = 'APC Standard <span class="caret">▾</span>';
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

    // Header height changes when the pro toggle appears/disappears, so re-sync the grid offset.
    updateHeaderOffset();
}

// Keep the results-grid pushed below the fixed header — replaces the old hardcoded margin-top: 155px
function updateHeaderOffset() {
    const header = document.getElementById('mainHeader');
    const grid   = document.getElementById('mainGrid');
    if (header && grid) grid.style.marginTop = header.offsetHeight + 'px';
}

// Click anywhere outside the menu/pill → close the menu
document.addEventListener('click', (e) => {
    const menu = document.getElementById('accountMenu');
    const pill = document.getElementById('accountPill');
    if (!menu || !pill) return;
    if (menu.style.display !== 'block') return;
    if (!menu.contains(e.target) && !pill.contains(e.target)) closeAccountMenu();
});

window.addEventListener('resize', updateHeaderOffset);

// --- SEARCH MODE TOGGLE ---
function setSearchMode(mode) {
    const partBtn   = document.getElementById('searchModeParts');
    const wantedBtn = document.getElementById('searchModeWanted');
    if (!partBtn || !wantedBtn) return;

    if (mode === 'parts') {
        partBtn.style.background   = 'var(--white)';
        partBtn.style.color        = 'var(--apc-orange)';
        partBtn.style.boxShadow    = '0 1px 3px rgba(0,0,0,0.1)';
        wantedBtn.style.background = 'none';
        wantedBtn.style.color      = '#888';
        wantedBtn.style.boxShadow  = 'none';
    } else {
        wantedBtn.style.background = 'var(--white)';
        wantedBtn.style.color      = 'var(--apc-orange)';
        wantedBtn.style.boxShadow  = '0 1px 3px rgba(0,0,0,0.1)';
        partBtn.style.background   = 'none';
        partBtn.style.color        = '#888';
        partBtn.style.boxShadow    = 'none';
    }
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
});
