// --- GLOBAL STATE ---
let userIsSignedIn = true;
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
const partDatabase = [
    { id: 1, title: "Genuine Toyota Hiace Left Side Mirror (2019+)", price: 85, images: ["images/hiace.mirror.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body" },
    { id: 2, title: "Lotus Elise S2 GT Track Spoiler", price: 850, images: ["images/elise.wing.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body" },
    { id: 3, title: "Toyota Hiace Tail Light Assembly (Current)", price: 145, images: ["images/hiace.taillight.webp"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "lighting" },
    { id: 4, title: "Custom 3D Printed Racing Center Caps (Set of 4)", price: 40, images: ["images/elise.wheel.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "wheels" },
    { id: 5, title: "Toyota Hiace Sliding Door Handle", price: 35, images: ["images/hiace.handle.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "body" },
    { id: 6, title: "Lotus Elise Sport Steering Wheel", price: 320, images: ["images/elise.steering.wheel.jpeg"], loc: "SYDNEY, NSW", fit: false, seller: "Sarah J.", isPro: false, category: "interior" },
    { id: 7, title: "Performance Brake Calipers (Front Set)", price: 450, images: ["images/elise.brake.pads.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Mike D.", isPro: true, category: "brakes" },
    { id: 8, title: "Universal Cold Air Intake Kit", price: 120, images: ["images/Elise.scoops.webp"], loc: "BRISBANE, QLD", fit: false, seller: "Alex T.", isPro: false, category: "engine" }
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

    // 1. Carousel — only show images this part actually has
    const carousel = document.getElementById('imageCarousel');
    if (carousel) {
        carousel.innerHTML = '';
        part.images.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = 'min-width:100%; scroll-snap-align:start; aspect-ratio:4/3; object-fit:cover;';
            img.alt = part.title;
            carousel.appendChild(img);
        });
    }

    // 2. Update detail fields safely
    safeText(document.getElementById('detailPrice'), `$${part.price}`);
    safeText(document.getElementById('detailTitle'), part.title);
    safeText(document.getElementById('detailLoc'), part.loc);
    safeText(document.getElementById('chatPartnerName'), part.seller);

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

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    renderMainGrid();
    renderMyParts();

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
