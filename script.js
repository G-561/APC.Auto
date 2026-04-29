// --- GLOBAL STATE ---
let userIsSignedIn = true; 

// --- DATABASE (Upgraded with reliable automotive images) ---
const partDatabase = [
    { title: "Genuine Toyota Hiace Left Side Mirror (2019+)", price: 85, img: "images/hiace.mirror.jpg", loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true },
    { title: "Lotus Elise S2 GT Track Spoiler", price: 850, img: "images/elise.wing.jpg", loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true },
    { title: "Toyota Hiace Tail Light Assembly (Current)", price: 145, img: "images/hiace.taillight.webp", loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true },
    { title: "Custom 3D Printed Racing Center Caps (Set of 4)", price: 40, img: "images/elise.wheel.jpg", loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true },
    { title: "Toyota Hiace Sliding Door Handle", price: 35, img: "images/hiace.handle.jpg", loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true },
    { title: "Lotus Elise Sport Steering Wheel", price: 320, img: "images/elise.steering.wheel.jpeg", loc: "SYDNEY, NSW", fit: false, seller: "Sarah J.", isPro: false },
    { title: "Performance Brake Calipers (Front Set)", price: 450, img: "images/elise.brake.pads.jpg", loc: "MELBOURNE, VIC", fit: true, seller: "Mike D.", isPro: true },
    { title: "Universal Cold Air Intake Kit", price: 120, img: "images/Elise.scoops.webp", loc: "BRISBANE, QLD", fit: false, seller: "Alex T.", isPro: false }
];

// --- CORE UI CONTROLS ---
function toggleDrawer(id) {
    const drawer = document.getElementById(id);
    if (drawer) {
        drawer.classList.toggle('active');
        document.body.style.overflow = drawer.classList.contains('active') ? 'hidden' : 'auto';
    }
}

// --- RENDER MAIN HOME GRID ---
function renderMainGrid() {
    const mainGrid = document.getElementById('mainGrid');
    if (!mainGrid) return;
    
    mainGrid.innerHTML = ''; 
    for (let i = 0; i < 12; i++) {
        const index = i % partDatabase.length;
        const part = partDatabase[index];
        mainGrid.innerHTML += `
            <div class="item-card" onclick="openItemDetail(${index})">
                <img class="item-img" src="${part.img}" alt="${part.title}">
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
}

// --- RENDER MY PARTS (GARY'S INVENTORY) ---
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
        myPartsList.innerHTML += `
            <div style="background: white; border: 1px solid #eee; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <img src="${part.img}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 800; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${part.title}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <div style="font-size: 14px; font-weight: 900; color: #007AFF;">$${part.price}</div>
                        <div style="font-size: 9px; font-weight: 900; color: #28a745; background: #e6f4ea; padding: 2px 6px; border-radius: 4px;">ACTIVE</div>
                    </div>
                </div>
                <button style="border: 1px solid #ddd; background: #f9f9f9; padding: 8px 12px; border-radius: 6px; font-weight: 900; font-size: 10px; cursor: pointer;">EDIT</button>
            </div>`;
    });
}

// --- DYNAMIC ITEM DETAIL LOGIC ---
function openItemDetail(index) {
    const part = partDatabase[index];
    
    // 1. BUILD THE SWIPEABLE IMAGE CAROUSEL
    const carousel = document.getElementById('imageCarousel');
    if (carousel) {
        const img1 = part.img;
        const img2 = partDatabase[(index + 1) % partDatabase.length].img; 
        const img3 = partDatabase[(index + 2) % partDatabase.length].img; 
        
        carousel.innerHTML = `
            <img src="${img1}" style="min-width: 100%; snap-align: start; aspect-ratio: 4/3; object-fit: cover;">
            <img src="${img2}" style="min-width: 100%; snap-align: start; aspect-ratio: 4/3; object-fit: cover;">
            <img src="${img3}" style="min-width: 100%; snap-align: start; aspect-ratio: 4/3; object-fit: cover;">
        `;
    }

    // Update the top info
    document.getElementById('detailPrice').innerText = `$${part.price}`;
    document.getElementById('detailTitle').innerText = part.title;
    document.getElementById('detailLoc').innerText = part.loc;
    document.getElementById('chatPartnerName').innerText = part.seller;

    const footer = document.getElementById('dynamicDetailFooter');
    if(!footer) return;
    
    let miniGridHTML = '';
    for(let i=0; i<8; i++) {
        const dummyIndex = (index + i + 1) % partDatabase.length;
        const dummyPart = partDatabase[dummyIndex];
        miniGridHTML += `
            <div class="item-card" onclick="event.stopPropagation(); openItemDetail(${dummyIndex})">
                <img class="item-img" src="${dummyPart.img}">
                <div class="item-info">
                    <div class="price-row"><span class="item-price">$${dummyPart.price}</span></div>
                    <div class="item-title">${dummyPart.title}</div>
                </div>
            </div>`;
    }

    // 2. FORCE EDGE-TO-EDGE GRID
    if (part.isPro) {
        footer.innerHTML = `
            <div class="filter-section" style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; font-size: 12px; color: #888; padding: 0 15px;">MORE FROM ${part.seller.toUpperCase()}</h4>
                <div class="results-grid" style="margin-top: 0; padding-bottom: 15px; padding-left: 0 !important; padding-right: 0 !important;">${miniGridHTML}</div>
                <div style="text-align: center; padding-bottom: 30px; padding-top: 10px;">
                    <span onclick="openStorefront('${part.seller}', true)" style="color: var(--apc-orange); font-weight: 900; font-size: 12px; cursor: pointer; border-bottom: 2px solid var(--apc-orange);">VISIT STORE →</span>
                </div>
            </div>`;
    } else {
        footer.innerHTML = `
            <div class="filter-section" style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; font-size: 12px; color: #888; padding: 0 15px;">SIMILAR ITEMS</h4>
                <div class="results-grid" style="margin-top: 0; padding-bottom: 30px; padding-left: 0 !important; padding-right: 0 !important;">${miniGridHTML}</div>
            </div>`;
    }
    toggleDrawer('detailOverlay');
}

// --- SELLER STOREFRONT ---
function openStorefront(sellerName, isPro = false) {
    const sellerNameDisplay = document.getElementById('displaySellerName');
    if (sellerNameDisplay) sellerNameDisplay.innerText = sellerName;
    
    const sellerGrid = document.getElementById('sellerPartsGrid');
    if (sellerGrid) {
        sellerGrid.innerHTML = ''; 
        partDatabase.filter(p => p.seller === sellerName).forEach((part, i) => {
            // Find the global index so clicking in the storefront opens the correct part
            const globalIndex = partDatabase.indexOf(part);
            sellerGrid.innerHTML += `
                <div class="item-card" onclick="openItemDetail(${globalIndex})">
                    <img class="item-img" src="${part.img}">
                    <div class="item-info">
                        <div class="price-row">
                            <span class="item-price">$${part.price}</span>
                            ${part.fit ? `<span class="fitting-pill">FITTING AVAILABLE</span>` : ''}
                        </div>
                        <div class="item-title">${part.title}</div>
                        <div class="item-loc">📍 ${part.loc}</div>
                    </div>
                </div>`;
        });
    }
    toggleDrawer('storefrontDrawer');
}

// --- MESSAGING ---
function handleMessageSeller() {
    if (!userIsSignedIn) {
        toggleDrawer('authDrawer'); 
    } else {
        toggleDrawer('chatDrawer');
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const box = document.getElementById('chatBox');
    if (input && input.value.trim() !== "") {
        box.innerHTML += `<div style="align-self: flex-end; background: #DCF8C6; padding: 10px 15px; border-radius: 15px 15px 0 15px; max-width: 80%; font-size: 14px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${input.value}</div>`;
        input.value = "";
        box.scrollTop = box.scrollHeight;
    }
}

// --- AUTO-HIDE BOTTOM NAV ON SCROLL ---
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;
    
    bottomNav.style.transition = "transform 0.3s ease-in-out";
    if (window.scrollY > lastScrollY && window.scrollY > 50) {
        bottomNav.style.transform = "translateY(100%)"; 
    } else {
        bottomNav.style.transform = "translateY(0)";    
    }
    lastScrollY = window.scrollY;
});

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    renderMainGrid();
    renderMyParts();
});