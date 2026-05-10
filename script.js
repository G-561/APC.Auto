// --- SUPABASE ---
const SUPABASE_URL  = 'https://ufpsnjtnvchazqswntch.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcHNuanRudmNoYXpxc3dudGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDc5MDAsImV4cCI6MjA5Mzg4MzkwMH0.Wl60CI8rcIo26EnNx1A1Dd7xfZEFOBlAXJDpXA6fyCA';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// --- GLOBAL STATE ---
let userIsSignedIn = false;          // starts logged out — header shows "Sign In" pill
let currentUserName = null;          // e.g. "Gary"
let currentUserTier = null;          // 'standard' | 'pro'
let proSearchOn    = true;           // when user is pro, controls FIND PARTS / FIND WANTED bar
let currentSearchMode = 'parts';     // 'parts' | 'wanted'
let currentOpenPartId = null;  // tracks which part detail is open
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
const partDatabase = [
    { id: 1, title: "Genuine Toyota Hiace Left Side Mirror (2019+)", price: 85, images: ["images/hiace.mirror.jpg", "images/hiace.handle.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 14, date: 1738540800000, openToOffers: true, warehouseBin: 'A1-S3', condition: 'used' },
    { id: 2, title: "Lotus Elise S2 GT Track Spoiler", price: 850, images: ["images/elise.wing.jpg", "images/elise.diffuser.jpg", "images/elise.exhaust.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 22, date: 1741046400000, openToOffers: true, warehouseBin: 'B2-S1', condition: 'used' },
    { id: 3, title: "Toyota Hiace Tail Light Assembly (Current)", price: 145, images: ["images/hiace.taillight.webp", "images/hiace.bumper.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "lighting", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 8, date: 1742688000000, warehouseBin: 'A1-S4', condition: 'used' },
    { id: 4, title: "Custom 3D Printed Racing Center Caps (Set of 4)", price: 40, images: ["images/elise.wheel.jpg", "images/elise.rims.jpg", "images/commodore.wheels.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "wheels", fits: [], saves: 31, date: 1743724800000, condition: 'new_aftermarket' },
    { id: 5, title: "Toyota Hiace Sliding Door Handle", price: 35, images: ["images/hiace.handle.jpg", "images/hiace.mirror.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 6, date: 1744502400000, status: 'sold', condition: 'used' },
    { id: 6, title: "Lotus Elise Sport Steering Wheel", price: 320, images: ["images/elise.steering.wheel.jpeg", "images/dash.mount.jpg", "images/gauge.pod.jpg", "images/elise.seat.jpg"], loc: "SYDNEY, NSW", fit: false, seller: "Sarah J.", isPro: false, category: "interior", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 18, date: 1745107200000, openToOffers: true, condition: 'used' },
    { id: 7, title: "Performance Brake Calipers (Front Set)", price: 450, images: ["images/elise.brake.pads.jpg", "images/elise.rims.jpg", "images/elise.wheel.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Mike D.", isPro: true, category: "brakes", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 9, date: 1745712000000, condition: 'used' },
    { id: 8, title: "Universal Cold Air Intake Kit", price: 120, images: ["images/Elise.scoops.webp", "images/turbo.webp", "images/1KD.engine.webp"], loc: "BRISBANE, QLD", fit: false, seller: "Alex T.", isPro: false, category: "engine", fits: [], saves: 27, date: 1746057600000, condition: 'new_aftermarket' },
    { id: 9, title: "Toyota Hiace 1KD-FTV Turbocharger", price: 650, images: ["images/hiace.turbo.jpg", "images/turbo.webp", "images/1KD.engine.webp"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, tradeOnly: true, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 19, date: 1736899200000, warehouseBin: 'C3-S2', condition: 'used' },
    { id: 10, title: "Lotus Elise S2 Carbon Rear Diffuser", price: 480, images: ["images/elise.diffuser.jpg", "images/elise.exhaust.jpg", "images/elise.wing.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 11, date: 1737590400000, status: 'sold', condition: 'used' },
    { id: 11, title: "Toyota Hiace Tow Bar Heavy Duty", price: 220, images: ["images/hiace.towbar.webp", "images/hiace.bumper.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Jason M.", isPro: false, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 7, date: 1738108800000, condition: 'new_aftermarket' },
    { id: 12, title: "Toyota 1KD-FTV Engine Complete Low Kms", price: 2800, images: ["images/1KD.engine.webp", "images/hiace.turbo.jpg", "images/hiace.alternator.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, tradeOnly: true, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 34, date: 1739318400000, warehouseBin: 'C1-S1', condition: 'used' },
    { id: 13, title: "Lotus Elise S2 Left Headlight", price: 380, images: ["images/elise.headlight.jpg", "images/elise.wing.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "lighting", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 15, date: 1740009600000, condition: 'used' },
    { id: 14, title: "Toyota Hiace Steering Rack Reconditioned", price: 295, images: ["images/hiace.steeringrack.jpg", "images/1KD.engine.webp"], loc: "SYDNEY, NSW", fit: true, seller: "Tom K.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 5, date: 1740528000000, condition: 'refurbished' },
    { id: 15, title: "Lotus Elise S2 Soft Top Hood", price: 550, images: ["images/elise.soft.top.jpg", "images/elise.seat.jpg"], loc: "PERTH, WA", fit: false, seller: "Chris B.", isPro: true, category: "interior", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 21, date: 1741219200000, condition: 'used' },
    { id: 16, title: "Toyota Hiace 80A Alternator", price: 180, images: ["images/hiace.alternator.webp", "images/1KD.engine.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 9, date: 1741910400000, condition: 'used' },
    { id: 17, title: "Holden Commodore VE 18\" Wheels Set of 4", price: 620, images: ["images/commodore.wheels.webp", "images/elise.rims.jpg"], loc: "MELBOURNE, VIC", fit: false, seller: "Dave R.", isPro: false, category: "wheels", fits: [{ make: 'Holden', model: 'Commodore' }], saves: 16, date: 1742601600000, condition: 'used' },
    { id: 18, title: "Toyota Hiace 1KD Injector Set (4 cyl)", price: 750, images: ["images/hiace.injector.webp", "images/1KD.engine.webp", "images/hiace.turbo.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 12, date: 1743292800000, condition: 'used' },
    { id: 19, title: "Toyota Hiace Front Grille 2014+", price: 95, images: ["images/hiace.grille.jpg", "images/hiace.bumper.jpg", "images/hiace.mirror.jpg"], loc: "BRISBANE, QLD", fit: false, seller: "Sam T.", isPro: false, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 4, date: 1743897600000, condition: 'used' },
    { id: 20, title: "Toyota Hiace Front Bumper Bar", price: 185, images: ["images/hiace.bumper.jpg", "images/hiace.grille.jpg"], loc: "ADELAIDE, SA", fit: true, seller: "Gary S.", isPro: true, category: "body", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 8, date: 1744329600000, condition: 'used' },
    { id: 21, title: "Lotus Elise S2 Recaro Racing Seat", price: 420, images: ["images/elise.seat.jpg", "images/elise.steering.wheel.jpeg", "images/elise.rims.jpg"], loc: "ADELAIDE, SA", fit: false, seller: "Lee P.", isPro: false, category: "interior", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 17, date: 1744761600000, condition: 'used' },
    { id: 22, title: "Universal Garrett-Style Performance Turbo", price: 890, images: ["images/turbo.webp", "images/Elise.scoops.webp", "images/1KD.engine.webp"], loc: "SYDNEY, NSW", fit: true, seller: "Alex T.", isPro: true, category: "engine", fits: [], saves: 28, date: 1745366400000, condition: 'new_aftermarket' },
    { id: 23, title: "Toyota Hiace Cargo Barrier (Van)", price: 110, images: ["images/hiace.cargo.barrier.webp", "images/hiace.floormats.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: true, category: "interior", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 6, date: 1745625600000, condition: 'new_aftermarket' },
    { id: 24, title: "Toyota Hiace Floor Mats Full Set", price: 55, images: ["images/hiace.floormats.webp", "images/hiace.cargo.barrier.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: false, category: "interior", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 3, date: 1745884800000, condition: 'new_oem' },
    { id: 25, title: "Toyota Hiace Oil & Fuel Filter Service Kit", price: 45, images: ["images/hiace.oilfilter.jpg", "images/hiace.fuel.filter.jpg", "images/hiace.filter.webp"], loc: "ADELAIDE, SA", fit: false, seller: "Gary S.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 3, date: 1745971200000, condition: 'new_oem' },
    { id: 26, title: "Lotus Elise S2 Exhaust System", price: 680, images: ["images/elise.exhaust.jpg", "images/elise.diffuser.jpg"], loc: "MELBOURNE, VIC", fit: true, seller: "Mike D.", isPro: true, category: "engine", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 23, date: 1745798400000, condition: 'used' },
    { id: 27, title: "Lotus Elise S2 Alloy Wheels (Set of 4)", price: 1100, images: ["images/elise.rims.jpg", "images/elise.wheel.jpg", "images/commodore.wheels.webp"], loc: "SYDNEY, NSW", fit: false, seller: "Sarah J.", isPro: false, category: "wheels", fits: [{ make: 'Lotus', model: 'Elise' }], saves: 29, date: 1745193600000, condition: 'used' },
    { id: 28, title: "Toyota Hiace Fuel Injector (Single)", price: 130, images: ["images/hiace.fuel.filter.jpg", "images/hiace.injector.webp"], loc: "PERTH, WA", fit: false, seller: "Mick O.", isPro: false, category: "engine", fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 2, date: 1744070400000, condition: 'refurbished' }
];

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

// Mock analytics data for Pro Dashboard — replaced by Supabase queries at go-live
const dashMockData = {
    weekLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekViews:  [18, 24, 31, 22, 45, 38, 56],
    weekSaves:  [3,   5,   7,  4,   9,  8,  12],
    closedSales: [
        { title: 'Lotus Elise S2 GT Track Spoiler',      price: 850, buyer: 'Sarah M.', date: '28 Apr 2026', img: 'images/elise.wing.jpg' },
        { title: 'Toyota Hiace Left Side Mirror (2019+)', price: 85,  buyer: 'John T.',  date: '22 Apr 2026', img: 'images/hiace.mirror.jpg' },
        { title: 'Toyota Hiace Tail Light Assembly',      price: 145, buyer: 'Pete K.',  date: '15 Apr 2026', img: 'images/hiace.taillight.webp' },
    ],
    pendingSales: [
        { title: 'Toyota Hiace Sliding Door Handle',     price: 35,  buyer: 'Mike R.',  offered: '1 May 2026',  img: 'images/hiace.handle.jpg' },
        { title: 'Lotus Elise Sport Steering Wheel',     price: 320, buyer: 'Chris B.', offered: '30 Apr 2026', img: 'images/elise.steering.wheel.jpeg' },
    ],
    activity: [
        { type: 'save',    text: 'Sarah M. saved your Elise Spoiler',              time: '2 min ago'  },
        { type: 'message', text: 'New message from John T.',                        time: '18 min ago' },
        { type: 'view',    text: 'Your Hiace Mirror got 12 views today',            time: '1 hr ago'   },
        { type: 'save',    text: 'Mike R. saved your Door Handle',                  time: '2 hr ago'   },
        { type: 'message', text: 'Chris B. made an offer on your Steering Wheel',  time: '3 hr ago'   },
        { type: 'trend',   text: '1KD Engine listing is trending in Adelaide',      time: '5 hr ago'   },
        { type: 'save',    text: 'Pete K. saved your Tail Light Assembly',          time: '6 hr ago'   },
    ]
};

// Public wanted listings from other buyers — searched in FIND WANTED (Pro) mode by sellers
const publicWantedDatabase = [
    { id: 101, partName: 'Hiace sliding door complete assembly', buyer: 'Mark T.',   loc: 'ADELAIDE, SA',   make: 'Toyota',     model: 'Hiace',      year: '2019', maxPrice: 400,  posted: '2 hours ago', category: 'body',        isPro: false },
    { id: 102, partName: 'Lotus Elise S2 front clamshell',       buyer: 'Chris B.',  loc: 'MELBOURNE, VIC', make: 'Lotus',      model: 'Elise',      year: '2004', maxPrice: 1200, posted: '5 hours ago', category: 'body',        isPro: false },
    { id: 103, partName: 'Toyota Hiace radiator 2015+',           buyer: 'Sam R.',    loc: 'SYDNEY, NSW',    make: 'Toyota',     model: 'Hiace',      year: '2017', maxPrice: 300,  posted: '1 day ago',   category: 'cooling',     isPro: true  },
    { id: 104, partName: 'Elise exhaust manifold',                buyer: 'Jay P.',    loc: 'BRISBANE, QLD',  make: 'Lotus',      model: 'Elise',      year: '2006', maxPrice: 600,  posted: '1 day ago',   category: 'engine',      isPro: false },
    { id: 105, partName: 'Hiace front bumper bar grey',           buyer: 'Tanya W.',  loc: 'PERTH, WA',      make: 'Toyota',     model: 'Hiace',      year: '2020', maxPrice: 250,  posted: '2 days ago',  category: 'body',        isPro: false },
    { id: 106, partName: 'Ford Falcon BA XR6 turbo engine',       buyer: 'Dave L.',   loc: 'ADELAIDE, SA',   make: 'Ford',       model: 'Falcon',     year: '2004', maxPrice: 2500, posted: '2 days ago',  category: 'engine',      isPro: true  },
    { id: 107, partName: 'Commodore VE SS front seats pair',      buyer: 'Nic A.',    loc: 'MELBOURNE, VIC', make: 'Holden',     model: 'Commodore',  year: '2008', maxPrice: 700,  posted: '3 days ago',  category: 'interior',    isPro: false },
    { id: 108, partName: 'Golf MK7 GTI exhaust system',           buyer: 'Petra H.',  loc: 'SYDNEY, NSW',    make: 'Volkswagen', model: 'Golf',       year: '2016', maxPrice: 800,  posted: '4 days ago',  category: 'performance', isPro: false },
    { id: 109, partName: 'Autel MaxiSys scan tool MS906BT',       buyer: 'Brett M.',  loc: 'BRISBANE, QLD',  make: '',           model: '',           year: '',     maxPrice: 600,  posted: '1 day ago',   category: 'tools',       isPro: true  },
    { id: 110, partName: '4x4 snorkel — 200 Series LandCruiser',  buyer: 'Craig F.',  loc: 'PERTH, WA',      make: 'Toyota',     model: 'LandCruiser',year: '2015', maxPrice: 350,  posted: '3 days ago',  category: '4x4',         isPro: false },
    { id: 111, partName: 'Bride reclinable bucket seat',          buyer: 'Tom K.',    loc: 'MELBOURNE, VIC', make: '',           model: '',           year: '',     maxPrice: 900,  posted: '5 days ago',  category: 'performance', isPro: true  },
    { id: 112, partName: 'Alpine head unit iLX-W650',             buyer: 'Lisa R.',   loc: 'SYDNEY, NSW',    make: '',           model: '',           year: '',     maxPrice: 400,  posted: '6 days ago',  category: 'audio',       isPro: false },
];

const workshopDatabase = [
    { id: 1, name: 'Eastside Toyota Repairs',       specialty: 'Camry bonnet, body panels & crash repair',              distance: '3.4km',  loc: 'ADELAIDE, SA',   rating: 4.9, approvedClub: 'RAA', vehicleTypes: ['Toyota', 'Camry', 'Hiace'],          services: ['collision', 'sprayPaint', 'cooling'] },
    { id: 2, name: 'City Crash Workshop',            specialty: 'Volkswagen and general panel fitment',                  distance: '5.1km',  loc: 'ADELAIDE, SA',   rating: 4.8, approvedClub: 'RAA', vehicleTypes: ['Volkswagen', 'Golf', 'Passat'],       services: ['collision', 'sprayPaint', 'autoElectrical', 'wheelAlign'] },
    { id: 3, name: 'Suburban Auto Fitters',          specialty: 'Suspension, brakes and body fitment for Japanese sedans', distance: '6.8km', loc: 'ADELAIDE, SA',  rating: 4.7,                       vehicleTypes: ['Toyota', 'Mazda', 'Nissan'],          services: ['logbook', 'brakes', 'suspension', 'wheelAlign', 'aircon'] },
    { id: 4, name: 'Crash & Panel Pros',             specialty: 'Full repair, repaint and fitting service',              distance: '8.4km',  loc: 'ADELAIDE, SA',   rating: 4.6,                       vehicleTypes: ['Toyota', 'Volkswagen', 'Ford'],       services: ['collision', 'sprayPaint', 'pdr', 'trimming'] },
    { id: 5, name: 'Hills Auto Trimmers',            specialty: 'Custom upholstery, seat repairs and interior restoration', distance: '24km', loc: 'STIRLING, SA',  rating: 4.8,                       vehicleTypes: ['All makes'],                         services: ['autoGlass', 'trimming'] },
    { id: 6, name: 'Southern Auto Electrics & Air',  specialty: 'Auto electrical, A/C regas and fault diagnosis',        distance: '38km',  loc: 'NOARLUNGA, SA',  rating: 4.7,                       vehicleTypes: ['All makes'],                         services: ['autoElectrical', 'aircon', 'battery'] },
    { id: 7, name: 'Barossa Mechanical & Cooling',   specialty: 'Radiator repairs, engine cooling and general mechanical', distance: '62km', loc: 'NURIOOTPA, SA', rating: 4.5,                       vehicleTypes: ['Toyota', 'Ford', 'Holden'],           services: ['engineDiag', 'logbook', 'transmission', 'cooling'] }
];

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
        vehicles: '',
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
        partsSpecialties: '',
        wrecking: false,
        wreckingMakes: '',
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
const _navPairs = {
    homeNavItem:    'dsbHomeItem',
    recentNavItem:  'dsbRecentItem',
    inboxNavItem:   'desktopInboxItem',
    dsbHomeItem:    'homeNavItem',
    dsbGarageItem:  null,
    dsbRecentItem:  'recentNavItem',
    desktopInboxItem: 'inboxNavItem',
};
function setActiveNav(el) {
    document.querySelectorAll('.nav-item, .dsb-item').forEach(n => n.classList.remove('active'));
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
function saveSettingsName() {
    const val = document.getElementById('settingsDisplayName')?.value.trim();
    if (val && val !== currentUserName) {
        const oldName = currentUserName;
        currentUserName = val;
        userListings.forEach(l => { if (l.seller === oldName) l.seller = val; });
        saveUserListings();
        renderAccountState();
        renderProfile();
        renderMyParts();
    }
}
function saveSettingsLocation() {
    const val = document.getElementById('settingsLocation')?.value.trim();
    if (val !== undefined) {
        userSettings.location = val || '';
        saveUserSettings();
    }
}
function saveSettingsAccount() {
    saveSettingsName();
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

function handleProfilePicUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { showToast('Image too large — please use an image under 1 MB'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
        userSettings.profilePic = e.target.result;
        saveUserSettings();
        renderProfilePicPreview();
        showToast('Profile photo saved');
    };
    reader.readAsDataURL(file);
}

function removeProfilePic() {
    userSettings.profilePic = '';
    saveUserSettings();
    const input = document.getElementById('profilePicInput');
    if (input) input.value = '';
    renderProfilePicPreview();
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
    if (hint) hint.textContent = banner ? '' : 'Recommended: 1200 × 400 px · JPG or PNG · max 2 MB';
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
    closeAccountDropdown();
    renderSettingsDrawer();
    toggleDrawer('settingsDrawer');
}
function renderSettingsDrawer() {
    renderProfile();
    const nameEl     = document.getElementById('settingsDisplayName');
    const locEl      = document.getElementById('settingsLocation');
    const proSection = document.getElementById('settingsProSection');
    const proToggle  = document.getElementById('settingProSearch');

    if (nameEl) nameEl.value = currentUserName || '';
    if (locEl)  locEl.value  = userSettings.location || '';
    renderProfilePicPreview();

    const isPro = currentUserTier === 'pro';
    const proBlock = document.getElementById('settingsProBlock');
    if (proBlock) proBlock.style.display = isPro ? 'block' : 'none';
    if (proToggle)  proToggle.checked = proSearchOn;

    const toggleMap = {
        settingNotifyWanted:        'notifyWantedMatch',
        settingNotifyMessages:      'notifyMessages',
        settingNotifyPriceDrops:    'notifyPriceDrops',
        settingNotifyNewListings:   'notifyNewListings',
        settingPrivacySuburb:       'privacySuburbOnly',
        settingPrivacyPublic:       'privacyPublicProfile',
        settingWarehouseManagement: 'warehouseManagement'
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

// Seed platform-level demand data for demo — represents aggregated APC-wide searches
const _demandSeed = [
    { term: 'Commodore VE engine',       count: 14 },
    { term: 'Hiace sliding door',         count: 11 },
    { term: 'Falcon BA gearbox',          count: 9  },
    { term: 'Hilux differential',         count: 8  },
    { term: 'Golf GTI exhaust',           count: 7  },
    { term: 'LandCruiser 200 snorkel',    count: 6  },
    { term: 'Elise front clam',           count: 5  },
    { term: 'Triton gearbox',             count: 4  },
    { term: 'WRX STI seats',              count: 3  },
    { term: 'Camry ABS pump',             count: 2  },
];

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
    return [
        { id: 9001, title: 'Toyota Hiace KDH 2KD Turbocharger — Low KM', price: 480, images: ['images/hiace.turbo.jpg'], loc: 'ADELAIDE, SA', postcode: '5000', seller: 'Gary S.', isPro: true, category: 'engine', fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 3, date: Date.now() - 3 * 24 * 60 * 60 * 1000, condition: 'used', description: 'Pulled from a 2016 KDH200 at 98,000km. Shaft play is minimal, no cracks on housing. Ready to bolt on.', pickup: true, postage: true },
        { id: 9002, title: 'Toyota Hiace Power Steering Rack — Complete Unit', price: 220, images: ['images/hiace.steeringrack.jpg'], loc: 'ADELAIDE, SA', postcode: '5000', seller: 'Gary S.', isPro: true, category: 'engine', fits: [{ make: 'Toyota', model: 'Hiace' }], saves: 1, date: Date.now() - 1 * 24 * 60 * 60 * 1000, condition: 'used', description: 'Complete rack and pinion unit from a 2018 Hiace. No leaks, smooth operation. Suits LWB and SLWB.', pickup: true, postage: false },
    ];
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

async function uploadListingImagesToStorage(listingUUID, base64Images) {
    const urls = [];
    for (let i = 0; i < base64Images.length; i++) {
        const b64 = base64Images[i];
        if (!b64 || !b64.startsWith('data:')) { urls.push(b64); continue; }
        try {
            const res = await fetch(b64);
            const blob = await res.blob();
            const ext = blob.type.includes('png') ? 'png' : 'jpg';
            const path = `${listingUUID}/${i}.${ext}`;
            const { error } = await sb.storage.from('listing_images').upload(path, blob, { contentType: blob.type, upsert: true });
            if (error) { showToast('Storage error: ' + error.message); continue; }
            const { data } = sb.storage.from('listing_images').getPublicUrl(path);
            urls.push(data.publicUrl);
        } catch (e) { showToast('Storage exception: ' + (e.message || e)); }
    }
    return urls.filter(Boolean);
}

async function syncListingToSupabase(localListing) {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) { showToast('Sync skipped: not signed in'); return; }

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
            is_pro: !!localListing.isPro,
            stock_number: localListing.stockNumber || null,
            odometer: localListing.odometer || null,
            warehouse_bin: localListing.warehouseBin || null,
            quantity: localListing.quantity || 1,
            apc_id: localListing.apcId || null,
            fitting_available: !!localListing.fit,
            fits_year: localListing.year || null,
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
                    urls.map((url, i) => ({ listing_id: listingId, url, position: i, is_primary: i === 0 }))
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

async function loadUserListingsFromSupabase(userId) {
    try {
        const { data: rows, error } = await sb
            .from('listings')
            .select('*, listing_images(url, position, is_primary), listing_vehicles(make, model)')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false });
        if (error || !rows?.length) return;

        rows.forEach(r => {
            const images = (r.listing_images || [])
                .sort((a, b) => a.position - b.position)
                .map(img => img.url)
                .filter(Boolean);
            const fits = (r.listing_vehicles || []).map(v => ({ make: v.make, model: v.model }));
            const existing = userListings.find(l => l.supabaseId === r.id);

            if (existing) {
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
                    saves: r.saves_count || 0, fits,
                    ...(images.length ? { images } : {}),
                });
            } else {
                userListings.push({
                    id: nextPartId(), supabaseId: r.id, saves: r.saves_count || 0,
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
                    year: r.fits_year, seller: currentUserName || '',
                    images: images.length ? images : [], fits,
                });
            }
        });

        saveUserListings();
        renderMainGrid();
        renderMyParts();
    } catch (e) { console.warn('Load listings from Supabase:', e); }
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
    return [
        { id:1, with:'Dave R.',            isPro:false, unread:true,  partId:1,  msgs:[
            {id:1,sent:false,text:'Hey, is the Hiace mirror still available?',          time:'Mon',       clock:'9:14 am'},
            {id:2,sent:true, text:'Yes still available — good condition, no cracks.',   time:'Mon',       clock:'9:32 am'},
            {id:3,sent:false,text:'Would you take $70 for it?',                         time:'Mon',       clock:'9:45 am'},
            {id:4,sent:true, text:'Best I can do is $75 — fits 2019+ perfectly.',       time:'Mon',       clock:'10:02 am'},
            {id:5,sent:false,text:'Done! Can I pick up Saturday morning?',              time:'Today',     clock:'8:03 am'},
            {id:6,sent:false,text:'Actually, would you consider a formal offer?',       time:'Today',     clock:'8:15 am'},
            {id:7,sent:false,text:'',time:'Today',clock:'8:16 am', offerCard:{offerId:101,partTitle:'Toyota Hiace Door Mirror (Left)',partImg:'images/hiace.mirror.jpg',listedPrice:95,offerPrice:72,buyerNote:'Happy to pick up this weekend',status:'pending'}},
        ]},
        { id:2, with:'Sarah J.',           isPro:false, unread:true,  partId:2,  msgs:[
            {id:1,sent:false,text:'Hi! Is the Lotus spoiler still for sale?',           time:'Yesterday', clock:'2:11 pm'},
            {id:2,sent:true, text:'Yes — genuine factory item, excellent condition.',   time:'Yesterday', clock:'2:45 pm'},
            {id:3,sent:false,text:'Does it come with the mounting hardware?',           time:'Yesterday', clock:'3:02 pm'},
        ]},
        { id:3, with:'Tom K.',             isPro:false, unread:false, partId:12, msgs:[
            {id:1,sent:false,text:'Interested in the 1KD engine — km reading?',        time:'Wed',       clock:'11:20 am'},
            {id:2,sent:true, text:'156,000km, ran perfectly when pulled. Fully tested.',time:'Wed',       clock:'11:55 am'},
            {id:3,sent:false,text:'Can you do $2,600?',                                 time:'Wed',       clock:'12:10 pm'},
            {id:4,sent:true, text:"Best is $2,700 — includes the turbo.",               time:'Wed',       clock:'12:18 pm'},
            {id:5,sent:false,text:'Fair enough! Can you arrange freight from Adelaide?',time:'Wed',       clock:'1:30 pm'},
        ]},
        { id:4, with:'Brett (Parts Plus)', isPro:true,  unread:true,  partId:9,  msgs:[
            {id:1,sent:false,text:"Do you have more Hiace turbos? We'd buy 3 if available.", time:'Thu', clock:'8:50 am'},
            {id:2,sent:true, text:"2 in stock now. Can source more — what's your timeline?", time:'Thu', clock:'9:15 am'},
            {id:3,sent:false,text:'No rush, within a month. Price firm on $650 each?',       time:'Thu', clock:'9:28 am'},
        ]},
        { id:5, with:'Lee P.',             isPro:false, unread:false, partId:13, msgs:[
            {id:1,sent:false,text:'Is the Elise headlight driver or passenger side?',   time:'Tue',      clock:'4:45 pm'},
            {id:2,sent:true, text:"Left (driver's side). Fits S2 models 2001–2011.",    time:'Tue',      clock:'5:10 pm'},
            {id:3,sent:false,text:"Perfect — exactly what I need. I'll be in touch!",   time:'Tue',      clock:'5:22 pm'},
        ]},
        { id:6, with:'Marcus W.',          isPro:false, unread:true,  partId:9001, msgs:[
            {id:1,sent:false,text:'Hi — is the KDH turbo still available?',                       time:'Yesterday', clock:'10:05 am'},
            {id:2,sent:true, text:'Yes still here. Pulled clean, very low shaft play.',            time:'Yesterday', clock:'10:28 am'},
            {id:3,sent:false,text:'Would you take $420 posted to Brisbane?',                       time:'Yesterday', clock:'10:44 am'},
            {id:4,sent:true, text:'Best I can do is $450 posted — can box it up today.',           time:'Yesterday', clock:'11:02 am'},
            {id:5,sent:false,text:"Deal — I'll pay this afternoon. Can you hold it?",              time:'Today',     clock:'8:15 am'},
            {id:6,sent:true, text:"Held for you. Send payment to the email in my profile.",        time:'Today',     clock:'8:41 am'},
        ]},
        { id:7, with:'Priya N.',           isPro:false, unread:true,  partId:9002, msgs:[
            {id:1,sent:false,text:'Does the steering rack suit a 2019 SLWB Hiace?',               time:'Today',     clock:'1:15 pm'},
            {id:2,sent:true, text:'Yes — suits 2014–2021 LWB and SLWB, petrol and diesel.',       time:'Today',     clock:'1:38 pm'},
            {id:3,sent:false,text:'Great. Any chance of pick-up this weekend in Adelaide?',        time:'Today',     clock:'1:52 pm'},
        ]},
    ];
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

function openInboxConv(id) {
    activeConvId = id;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conv.unread = false;
    saveConversations();
    updateInboxBadge();
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
            : (m.photo ? `<img src="${m.photo}" alt="Photo">` : escapeHtml(m.text));
        const delBtn   = `<button class="inbox-msg-del" onclick="deleteInboxMsg(${conv.id},${idx})" title="Delete">×</button>`;
        const initial  = m.sent ? me.charAt(0).toUpperCase() : conv.with.charAt(0).toUpperCase();
        const colClass = isOffer ? 'inbox-msg-col offer-col' : 'inbox-msg-col';
        const bubClass = isOffer ? 'inbox-msg-bubble offer-bubble' : 'inbox-msg-bubble';
        return `${divider}
            <div class="inbox-msg-row ${m.sent?'sent':'received'}" ontouchstart="this.classList.toggle('del-visible')">
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

function closeInboxThread() {
    document.getElementById('inboxConvCol').classList.remove('slide-away');
    document.getElementById('inboxThreadCol').classList.remove('slide-in');
}

function sendInboxMessage() {
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
}

function sendInboxPhoto(event) {
    const file = event.target.files[0];
    if (!file || activeConvId === null) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const conv = conversations.find(c => c.id === activeConvId);
        if (!conv) return;
        conv.msgs.push({ id: nextMsgId(conv), sent: true, text: '', photo: e.target.result, time: 'Today', clock: nowClock() });
        saveConversations();
        renderInboxConvList();
        renderInboxMsgs(conv);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
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
    const part = findPartAnywhere(conv.partId);
    if (!part) { showToast('Listing no longer available'); return; }
    openItemDetail(part.id);
}

function syncInboxPendingBtn() {
    const btn = document.getElementById('inboxPendingBtn');
    if (!btn) return;
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) { btn.style.display = 'none'; return; }
    const listing = userListings.find(l => l.id === conv.partId);
    if (!listing) { btn.style.display = 'none'; return; }
    // Only show for the seller (it's their listing)
    btn.style.display = '';
    const isPending = listing.status === 'pending';
    btn.textContent  = isPending ? 'Remove Pending' : 'Mark as Pending';
    btn.classList.toggle('inbox-pending-active', isPending);
}

function toggleListingPending() {
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    const listing = userListings.find(l => l.id === conv.partId);
    if (!listing) { showToast('Listing not found'); return; }
    listing.status = listing.status === 'pending' ? undefined : 'pending';
    saveUserListings();
    syncInboxPendingBtn();
    renderMainGrid();
    renderMyParts();
    if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
    showToast(listing.status === 'pending' ? 'Listing marked as Pending' : 'Pending status removed');
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
function inboxHandleKey(e) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendInboxMessage();} }

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
    return [...partDatabase, ...userListings].filter(p => p.status !== 'sold' && p.status !== 'removed');
}
function findPartAnywhere(id) {
    return [...partDatabase, ...userListings].find(p => p.id === id);
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

function applyFiltersAndRender() {
    getFilterValues();
    renderMainGrid();
    updateFilterChip();
    if (window.innerWidth < 900) toggleDrawer('filterDrawer');
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
    const makeInput = document.getElementById('filterMake');
    if (makeInput) makeInput.value = '';
    const modelInput = document.getElementById('filterModel');
    if (modelInput) modelInput.value = '';
    const yearSelect = document.getElementById('filterYear');
    if (yearSelect) yearSelect.value = '';
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
        if (activeFilters.location !== 'all') {
            const stateCode = part.loc.split(',')[1]?.trim();
            if (stateCode !== activeFilters.location) return false;
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

function buildCardHTML(part) {
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
            <img class="item-img" src="${part.images[0]}" alt="${part.title}" loading="lazy">
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
function renderMainGrid() {
    const mainGrid = document.getElementById('mainGrid');
    if (!mainGrid) return;

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

    filtered.forEach(part => {
        mainGrid.innerHTML += buildCardHTML(part);
    });
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
        if (fYear  && w.year !== fYear)                        return false;
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
    hdr.textContent = `${matching.length} member${matching.length === 1 ? '' : 's'} looking`;
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
function setListingStatus(id, status) {
    const part = userListings.find(p => p.id === id);
    if (!part) return;
    if (status === null || status === undefined) delete part.status;
    else part.status = status;
    saveUserListings();
    renderMainGrid();
    renderMyParts();
    if (document.getElementById('dashboardView')?.style.display !== 'none') renderDashboard();
    showToast(status === 'pending' ? 'Marked as Pending' : status === 'sold' ? 'Marked as Sold' : 'Listing relisted as Active');
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

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(manageBtn);
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

function openSellOverlay() {
    if (!userIsSignedIn) {
        openAuthDrawer(openSellOverlay);
        return;
    }

    currentEditingListingId = null;
    currentEditStatus = null;
    resetSellForm();
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
    // Pre-fill vehicle fitment so the seller only needs to add photos, price and description
    const makeEl  = document.getElementById('sellMake');
    const modelEl = document.getElementById('sellModel');
    const yearEl  = document.getElementById('sellYear');
    if (makeEl)  makeEl.value  = make;
    if (modelEl) modelEl.value = model;
    if (yearEl)  yearEl.value  = year;
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
    if (pickup) pickup.checked = false;
    if (postage) postage.checked = false;
    if (fitting) fitting.checked = false;
    const offersToggle = document.getElementById('sellOpenToOffers');
    if (offersToggle) offersToggle.checked = false;
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
}

function onToggleWarehouseManagement() {
    const el = document.getElementById('settingWarehouseManagement');
    if (el) saveSettingsToggle('warehouseManagement', el.checked);
    updateWarehouseBinVisibility();
}

async function submitSellListing() {
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

    const missing = [];
    if (!title)    missing.push('Title');
    if (!category) missing.push('Category');
    if (!price)    missing.push('Price');
    if (!location) missing.push('Location');
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
    if (!Number.isFinite(numericPrice) || numericPrice < 1) {
        showSellError('Enter a valid price (minimum $1).');
        return;
    }
    if (title.length > 120) {
        showSellError('Title is too long — keep it under 120 characters.');
        return;
    }
    hideSellError();

    const fits = (make && model) ? [{ make: make.trim(), model: model.trim() }] : [];
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
        seller: getCurrentSellerName(),
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
            } else {
                delete existing.status;
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
    setTimeout(() => {
        if (sellSuccess) sellSuccess.style.display = 'none';
        closeSellOverlay();
        if (submitBtn) submitBtn.disabled = false;
    }, 1500);
}

// --- DYNAMIC ITEM DETAIL ---
function openItemDetail(partId) {
    const part = getPartById(partId);
    if (!part) return;
    currentOpenPartId = partId;
    addToRecentlyViewed(partId);
    history.pushState(null, '', '?item=' + partId);

    // 1. Carousel — images + dot indicators
    const carousel = document.getElementById('imageCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    if (carousel) {
        carousel.innerHTML = '';
        part.images.forEach((src, i) => {
            const img = document.createElement('img');
            img.src = src;
            img.style.cssText = 'min-width:100%; scroll-snap-align:start; aspect-ratio:1/1; object-fit:contain; background:#f4f4f4; cursor: zoom-in;';
            img.alt = part.title;
            img.onclick = () => openDetailImageViewer(src, part.images, i);
            carousel.appendChild(img);
        });
        // Reset AFTER images are in the DOM so scroll-snap doesn't ignore it
        carousel.scrollTo({ left: 0, behavior: 'instant' });
    }
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        if (part.images.length > 1) {
            part.images.forEach((_, idx) => {
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
        desktopMain.src = part.images[0] || '';
        desktopMain.alt = part.title;
        desktopMain.onclick = () => openDetailImageViewer(part.images[0], part.images, 0);
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
                    desktopMain.onclick = () => openDetailImageViewer(src, part.images, i);
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
        const isOwnListing = userIsSignedIn && part.seller === getCurrentSellerName();
        offerSection.style.display = (part.openToOffers && !isOwnListing) ? 'block' : 'none';
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
    const detailMsgBtn = document.getElementById('detailMsgBtn');
    if (detailMsgBtn)        detailMsgBtn.style.display        = lockDetails ? 'none'  : '';
    if (detailSignInPrompt)  detailSignInPrompt.style.display  = lockDetails ? ''      : 'none';
    const detailVisitStoreBtn = document.getElementById('detailVisitStoreBtn');
    const isOwnListing = part.seller === getCurrentSellerName();
    const sellerHasOtherListings = getAllParts().some(p => p.id !== part.id && p.seller === part.seller && p.status !== 'sold' && p.status !== 'removed');
    if (detailVisitStoreBtn) detailVisitStoreBtn.style.display = (userIsSignedIn && !isOwnListing && sellerHasOtherListings) ? '' : 'none';

    // 3. Update the seller header in the overlay (was hardcoded to Gary)
    // Amber header seller card (mobile)
    const sellerHeaderName = document.getElementById('detailSellerName');
    const sellerHeaderSub  = document.getElementById('detailSellerSub');
    const sellerAvatar     = document.getElementById('detailSellerAvatar');
    if (sellerHeaderName) sellerHeaderName.textContent = part.seller;
    if (sellerHeaderSub)  sellerHeaderSub.textContent  = '';
    if (sellerAvatar)     sellerAvatar.textContent      = part.seller.charAt(0).toUpperCase();
    const detailProBadge = document.getElementById('detailProBadge');
    if (detailProBadge) detailProBadge.style.display = part.isPro ? 'inline-block' : 'none';
    const detailTradeBadge = document.getElementById('detailTradeBadge');
    if (detailTradeBadge) detailTradeBadge.style.display = part.tradeOnly ? 'inline-block' : 'none';

    // Info col seller card (desktop — shown via CSS)
    const colAvatar  = document.getElementById('detailSellerColAvatar');
    const colName    = document.getElementById('detailSellerColName');
    const colProBadge = document.getElementById('detailProBadgeCol');
    if (colAvatar) colAvatar.textContent = part.seller.charAt(0).toUpperCase();
    if (colName)   colName.textContent   = part.seller;
    if (colProBadge) colProBadge.style.display = part.isPro ? 'inline-block' : 'none';

    // Apply blur lock to col seller card (also gets .locked class for overlay visibility — done above)
    if (detailSellerColCard) detailSellerColCard.classList.toggle('blurred-detail', !userIsSignedIn);

    const workshopSection = document.getElementById('detailWorkshopSection');
    const workshopHeadline = document.getElementById('detailWorkshopHeadline');
    const workshopCards = document.getElementById('detailWorkshopCards');
    if (workshopSection && workshopHeadline && workshopCards) {
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
            MORE FROM ${escapeHtml(part.seller.toUpperCase())}
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

    footer.innerHTML = html;

    const detailScrollArea = document.getElementById('detailScrollArea');
    if (detailScrollArea) detailScrollArea.scrollTop = 0;

    const detailEl = document.getElementById('detailOverlay');
    if (detailEl && detailEl.classList.contains('active')) {
        // Already open — content has been refreshed above, no need to toggle
    } else {
        const parentOpen = [...document.querySelectorAll('.drawer.active')].some(d => d.id !== 'detailOverlay');
        if (parentOpen && detailEl) detailEl.style.zIndex = '3200'; // float above any open parent drawer
        toggleDrawer('detailOverlay', parentOpen);
    }
}

function onDetailSellerClick() {
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    openStorefront(currentOpenPartId);
}

function closeDetailOverlay() {
    const el = document.getElementById('detailOverlay');
    if (el) { el.classList.remove('active'); el.style.zIndex = ''; }
    syncBackdrop();
    history.pushState(null, '', location.pathname);
}

let _lightboxImages = [];
let _lightboxIdx    = 0;

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
    lightbox.style.zIndex = '9999';
    lightbox.classList.add('active');
    updateLightboxNav();
    // Allow pinch-to-zoom on the lightbox image
    document.querySelector('meta[name=viewport]').setAttribute('content',
        'width=device-width, initial-scale=1.0');
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
    // Float above detailOverlay (z-index 3150 mobile / 2050 desktop) when opening from within a listing
    const sfEl = document.getElementById('storefrontDrawer');
    if (sfEl) sfEl.style.zIndex = '3200';
    const backBar = document.getElementById('storefrontBackBar');
    if (backBar) backBar.style.display = currentOpenPartId ? '' : 'none';
    toggleDrawer('storefrontDrawer', true);
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
    const seller = currentStorefrontSeller;
    if (!seller) return;

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
    if (!userIsSignedIn) { openAuthDrawer(); return; }
    const part = getPartById(currentOpenPartId);
    if (!part) return;

    // If a conversation already exists for this part, go straight to the inbox thread
    const existing = conversations.find(c => c.partId === currentOpenPartId);
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
        partId = currentOpenPartId;
        partTitle = undefined;
    }

    // Create conversation and add the opening message
    const conv = { id: nextConvId(), with: seller, isPro, unread: false, partId, ...(partTitle && { partTitle }), msgs: [] };
    conv.msgs.push({ id: 1, sent: true, text, time: 'Today', clock: nowClock() });
    conversations.unshift(conv);
    saveConversations();
    updateInboxBadge();
    _lastSentConvId = conv.id;

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

// Allow sending chat with Enter key
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // Restore session on page load + react to sign in / sign out events
    sb.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            const { data: profile } = await sb
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            const name = profile?.display_name || session.user.email.split('@')[0];
            const tier = profile?.is_pro ? 'pro' : 'standard';
            signIn(name, tier, false, session.user.email);
            loadUserListingsFromSupabase(session.user.id);
        } else if (event === 'SIGNED_OUT') {
            userIsSignedIn = false;
            currentUserName = null;
            currentUserTier = null;
            renderAccountState();
        }
    });
});

// --- GARAGE: vehicle data model + persistence ---
const VEHICLES_STORAGE_KEY = 'apc.vehicles.v1';
let myVehicles = loadVehicles();
let editingVehicleId = null;
let primaryVehicleId = Number(localStorage.getItem('apcPrimaryVehicle')) || null;

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
function onAddVehicleClick() {
    editingVehicleId = null;
    const title = document.querySelector('#addVehicleDrawer .drawer-header span');
    if (title) title.textContent = 'ADD VEHICLE';
    ['vehMake','vehModel','vehYear','vehVariant','vehNickname','vehVin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    toggleDrawer('addVehicleDrawer', true);  // stack — keeps garage open underneath
}

function openEditVehicleDrawer(id) {
    const v = myVehicles.find(v => v.id === id);
    if (!v) return;
    editingVehicleId = id;
    const title = document.querySelector('#addVehicleDrawer .drawer-header span');
    if (title) title.textContent = 'EDIT VEHICLE';
    document.getElementById('vehMake').value     = v.make     || '';
    document.getElementById('vehModel').value    = v.model    || '';
    document.getElementById('vehYear').value     = v.year     || '';
    document.getElementById('vehVariant').value  = v.variant  || '';
    document.getElementById('vehNickname').value = v.nickname || '';
    document.getElementById('vehVin').value      = v.vin      || '';
    toggleDrawer('addVehicleDrawer', true);
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
        showToast('Make, Model and Year are required.');
        return;
    }
    const year = Number(yearStr);
    if (!Number.isFinite(year) || year < 1900 || year > 2030) {
        showToast('Please enter a valid 4-digit year (1900–2030).');
        return;
    }

    if (editingVehicleId) {
        const idx = myVehicles.findIndex(v => v.id === editingVehicleId);
        if (idx !== -1) {
            myVehicles[idx] = { ...myVehicles[idx], make, model, year,
                variant: variant||'', nickname: nickname||'', vin: vin||'' };
        }
        editingVehicleId = null;
    } else {
        myVehicles.push({
            id: nextVehicleId(),
            make, model, year,
            variant:  variant  || '',
            nickname: nickname || '',
            vin:      vin      || ''
        });
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
    const hasWanted = myWanted.some(w => w.vehicleId === id);
    const msg = hasWanted
        ? `Remove this vehicle? All ${myWanted.filter(w => w.vehicleId === id).length} wanted part(s) for it will also be removed.`
        : 'Remove this vehicle from your garage?';
    if (!confirm(msg)) return;
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

function setPrimaryVehicle(id) {
    primaryVehicleId = (primaryVehicleId === id) ? null : id;
    try { localStorage.setItem('apcPrimaryVehicle', primaryVehicleId ?? ''); } catch(e) {}
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

    const sorted = [...myVehicles].sort((a, b) => {
        if (a.id === primaryVehicleId) return -1;
        if (b.id === primaryVehicleId) return 1;
        return 0;
    });

    sorted.forEach(v => {
        const isPrimary = v.id === primaryVehicleId;

        const card = document.createElement('div');
        card.className = 'vehicle-card' + (isPrimary ? ' vehicle-card-primary' : '');
        card.dataset.vehicleId = v.id;
        card.onclick = () => selectGarageVehicle(v.id);

        // Edit — top left
        const editBtn = document.createElement('button');
        editBtn.className = 'vehicle-tile-edit';
        editBtn.textContent = '✏️';
        editBtn.onclick = (e) => { e.stopPropagation(); openEditVehicleDrawer(v.id); };

        // Delete — top right
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'vehicle-delete';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteVehicle(v.id); };

        // Name + meta
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

        // Star — bottom left
        const starBtn = document.createElement('button');
        starBtn.className = 'vehicle-star-btn' + (isPrimary ? ' active' : '');
        starBtn.textContent = isPrimary ? '★' : '☆';
        starBtn.title = isPrimary ? 'Remove as primary' : 'Set as primary vehicle';
        starBtn.onclick = (e) => { e.stopPropagation(); setPrimaryVehicle(v.id); };

        card.appendChild(editBtn);
        card.appendChild(deleteBtn);
        card.appendChild(info);
        card.appendChild(starBtn);
        list.appendChild(card);
    });

    // Auto-select primary vehicle or first in list
    const autoId = (primaryVehicleId && myVehicles.find(v => v.id === primaryVehicleId))
        ? primaryVehicleId
        : sorted[0]?.id;
    if (autoId) selectGarageVehicle(autoId);
}

function selectGarageVehicle(vehicleId) {
    currentVehicleId  = vehicleId;
    currentVehicleTab = 'wanted';

    document.querySelectorAll('#garageVehicleList .vehicle-card').forEach(c => {
        c.classList.toggle('vehicle-card-selected', Number(c.dataset.vehicleId) === vehicleId);
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
    renderStorefront(
        sellerName, store?.isPro || false,
        userSettings.businessLogo || '', store?.businessName || '',
        '', '', '', ''
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
    const makeInput = document.getElementById('filterMake');
    if (makeInput) makeInput.value = part.fits && part.fits.length ? part.fits[0].make : '';
    const modelInput = document.getElementById('filterModel');
    if (modelInput) modelInput.value = '';
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
function addWanted(partName, make, model, year, maxPrice, category) {
    myWanted.push({
        id: nextWantedId(),
        partName,
        make:     make     || '',
        model:    model    || '',
        year:     year     || '',
        maxPrice: maxPrice || null,
        category: category || '',
        mutedNotifications: false,
        createdAt: new Date().toISOString()
    });
    saveWanted();
}

// Delete a wanted entry
function deleteWanted(id) {
    if (!confirm('Remove this wanted part?')) return;
    myWanted = myWanted.filter(w => w.id !== id);
    saveWanted();
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
        const vehicleKeys = [...new Set(watching.filter(w => w.make).map(w => `${w.make}||${w.model}||${w.year}`))];
        const noVehicle   = watching.filter(w => !w.make);
        const groups = vehicleKeys.map(key => {
            const [make, model, year] = key.split('||');
            return { label: `${make} ${model}${year ? ' ' + year : ''}`, items: watching.filter(w => w.make === make && w.model === model && w.year === year) };
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
                document.getElementById('wantedMake').value  = '';
                document.getElementById('wantedModel').value = '';
                document.getElementById('wantedYear').value  = '';
            } else {
                // Select
                selectedWantedVehicleId = v.id;
                chips.querySelectorAll('.wanted-garage-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                document.getElementById('wantedMake').value  = v.make;
                document.getElementById('wantedModel').value = v.model;
                document.getElementById('wantedYear').value  = v.year;
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
    document.getElementById('wantedMake').value  = '';
    document.getElementById('wantedModel').value = '';
    document.getElementById('wantedYear').value  = '';
    const catEl = document.getElementById('wantedCategory');
    if (catEl) catEl.value = '';
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

    document.getElementById('wantedMake').value  = prefillMake;
    document.getElementById('wantedModel').value = prefillModel;
    document.getElementById('wantedYear').value  = prefillYear;

    populateWantedGarageChips(prefillMake, prefillModel, prefillYear);
    toggleDrawer('addWantedDrawer');
}

function openAddWantedForVehicle(vehicleId) {
    const v = myVehicles.find(x => x.id === vehicleId);
    document.getElementById('wantedPartName').value = '';
    document.getElementById('wantedMaxPrice').value = '';
    document.getElementById('wantedMake').value  = v ? v.make  : '';
    document.getElementById('wantedModel').value = v ? v.model : '';
    document.getElementById('wantedYear').value  = v ? v.year  : '';
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
    const category = document.getElementById('wantedCategory')?.value || '';

    if (!partName) { showToast('Part name is required.'); return; }

    const maxPrice = maxPriceStr ? Number(maxPriceStr) : null;
    addWanted(partName, make, model, year, maxPrice, category);

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
    const v = myVehicles.find(x => x.id === vehicleId);
    if (!v) return;
    currentVehicleId  = vehicleId;
    currentVehicleTab = 'wanted';

    document.getElementById('vehDetailHeaderTitle').textContent = `${v.make} ${v.model}`;
    document.getElementById('vehDetailBannerName').textContent  = `${v.make} ${v.model}`;
    document.getElementById('vehDetailBannerMeta').textContent  =
        [v.year, v.variant, v.nickname].filter(Boolean).join(' · ') || '—';
    const editBtn = document.getElementById('vehDetailEditBtn');
    if (editBtn) editBtn.onclick = () => openEditVehicleDrawer(vehicleId);

    setVehicleTab('wanted');
    toggleDrawer('vehicleDetailDrawer', true);  // stack on top of garage drawer
}

function setVehicleTab(tab) {
    currentVehicleTab = tab;
    document.querySelectorAll('#vehicleDetailDrawer .seg').forEach(s => {
        s.classList.toggle('active', s.dataset.tab === tab);
    });
    renderGarageTab();
}

function renderVehicleTab() {
    const c = document.getElementById('vehDetailTabContent');
    if (!c) return;
    const v = myVehicles.find(x => x.id === currentVehicleId);
    if (!v) { c.innerHTML = ''; return; }

    c.innerHTML = '';

    if (currentVehicleTab === 'wanted') {
        const vehicleWanted = myWanted.filter(w =>
            w.vehicleId === currentVehicleId ||
            (w.make && v && w.make.toLowerCase() === v.make.toLowerCase() &&
             w.model.toLowerCase() === v.model.toLowerCase() &&
             (!w.year || !v.year || String(w.year) === String(v.year)))
        );
        if (!vehicleWanted.length) {
            c.appendChild(buildVehicleEmpty(
                '🔍',
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
        const savedFitting = getAllParts().filter(p => savedParts.has(p.id) && p.fits?.length > 0 && partFitsVehicle(p, v));
        if (!savedFitting.length) {
            c.appendChild(buildVehicleEmpty('♡', `No saved listings for your ${v.make} ${v.model} yet.\nTap the heart on any listing to save it.`));
            return;
        }
        c.appendChild(buildPartsGrid(savedFitting));

    } else if (currentVehicleTab === 'matches') {
        const vehicleWanted = myWanted.filter(w =>
            w.vehicleId === currentVehicleId ||
            (w.make && v && w.make.toLowerCase() === v.make.toLowerCase() &&
             w.model.toLowerCase() === v.model.toLowerCase() &&
             (!w.year || !v.year || String(w.year) === String(v.year)))
        );
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
    setActiveNav('inboxNavItem');
    updateInboxBadge();
    // Always land on the conversation list, never a previously open thread
    document.getElementById('chatDrawer')?.classList.remove('active');
    document.getElementById('messageDetailDrawer')?.classList.remove('active');
    activeConvId = null;
    toggleDrawer('inboxDrawer');
    switchInboxTab('chats');
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

function showAuthError(msg) {
    const el = document.getElementById('authErrorBanner');
    if (!el) return;
    el.textContent = msg;
    el.style.display = '';
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
    showAuthError('Signing in…');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { showAuthError(error.message); return; }
    document.getElementById('authPassword').value = '';
    hideAuthError();
    toggleDrawer('authDrawer');
    if (authReturnAction) { const next = authReturnAction; authReturnAction = null; next(); }
}

async function handleSignUpPersonalSubmit() {
    const name     = document.getElementById('authNamePersonal')?.value.trim();
    const email    = document.getElementById('authEmailPersonal')?.value.trim() || '';
    const password = document.getElementById('authPasswordPersonal')?.value;
    if (!name || !email || !password) { showAuthError('Please enter your name, email and password.'); return; }
    showAuthError('Creating account…');
    const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name, is_pro: false } }
    });
    if (error) { showAuthError(error.message); return; }
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
    const email        = document.getElementById('authEmailPro')?.value.trim() || '';
    const password     = document.getElementById('authPasswordPro')?.value;
    if (!name || !businessName || !abnRaw || !email || !password) {
        showAuthError('Please fill in all fields including your Business Name and ABN.'); return;
    }
    const abnDigits = abnRaw.replace(/\s/g, '');
    if (!/^\d{11}$/.test(abnDigits)) {
        showAuthError('Please enter a valid 11-digit ABN (e.g. 51 824 753 556).'); return;
    }
    showAuthError('Creating Pro account…');
    const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name, is_pro: true, business_name: businessName, abn: abnDigits } }
    });
    if (error) { showAuthError(error.message); return; }
    document.getElementById('authPasswordPro').value = '';
    userSettings.businessName = businessName;
    userSettings.abn = abnDigits;
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

function confirmUpgrade() {
    // Production: route to payment gateway here
    currentUserTier = 'pro';
    proSearchOn = true;
    closeUpgradeModal();
    renderAccountState();
    if (document.getElementById('workshopDrawer')?.classList.contains('active')) {
        renderWorkshopProfile();
    }
    showToast('Your 3-month Pro trial has started! 🎉');
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

// Pro-only: turn the FIND PARTS / FIND WANTED bar on/off
function onToggleProSearch(e) {
    if (e) e.stopPropagation();
    proSearchOn = !proSearchOn;
    renderAccountState();
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
        userSettings.businessLogo   || '',
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

    if (avatarEl) avatarEl.textContent = (currentUserName || 'U').charAt(0).toUpperCase();
    if (nameEl)   nameEl.textContent   = currentUserName || 'User';

    const isPro = currentUserTier === 'pro';
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
    const locEl   = document.getElementById('proSettingLocation');
    const abnEl   = document.getElementById('proSettingABN');
    const aboutEl = document.getElementById('proSettingAbout');
    if (bizEl)   bizEl.value   = userSettings.businessName || '';
    if (locEl)   locEl.value   = userSettings.location     || '';
    if (abnEl)   abnEl.value   = formatABN(userSettings.abn || '');
    if (aboutEl) aboutEl.value = userSettings.about        || '';
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
    const vehiclesField = document.getElementById('workshopVehicles');
    if (vehiclesField) vehiclesField.value = workshopProfile.vehicles || '';
    // Parts section
    const partsType = workshopProfile.partsType || 'new';
    document.querySelectorAll('#partsTypeControl .radius-seg').forEach(s => {
        s.classList.toggle('active', s.dataset.pts === partsType);
    });
    const partsSpecEl = document.getElementById('wsPartsSpecialties');
    if (partsSpecEl) partsSpecEl.value = workshopProfile.partsSpecialties || '';
    const wreckingCb = document.getElementById('wsWrecking');
    if (wreckingCb) wreckingCb.checked = !!workshopProfile.wrecking;
    const wreckingMakesRow = document.getElementById('wsWreckingMakesRow');
    if (wreckingMakesRow) wreckingMakesRow.style.display = workshopProfile.wrecking ? 'block' : 'none';
    const wreckingMakesEl = document.getElementById('wsWreckingMakes');
    if (wreckingMakesEl) wreckingMakesEl.value = workshopProfile.wreckingMakes || '';
    renderLogoPreview();
    renderBannerPreview();
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
    userSettings.location     = document.getElementById('proSettingLocation')?.value.trim() || '';
    userSettings.abn          = document.getElementById('proSettingABN')?.value.trim() || '';
    userSettings.about        = document.getElementById('proSettingAbout')?.value.trim() || '';
    saveUserSettings();
    const getChk = id => document.getElementById(id)?.checked || false;
    workshopProfile = {
        vehicles: document.getElementById('workshopVehicles')?.value.trim() || '',
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
        partsSpecialties: document.getElementById('wsPartsSpecialties')?.value.trim() || '',
        wrecking: getChk('wsWrecking'),
        wreckingMakes: document.getElementById('wsWreckingMakes')?.value.trim() || '',
    };
    saveWorkshopProfile();
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
    const menuActivate   = document.getElementById('accountMenuActivate');
    const proSearchSwitch = document.getElementById('proSearchSwitch');

    if (!pill) return;

    pill.classList.remove('signed-out', 'signed-in', 'tier-standard', 'tier-pro');

    const initial = (currentUserName || 'G').charAt(0).toUpperCase();
    const isMobile = window.innerWidth < 900;
    const avatarHTML = `<span class="pill-avatar${currentUserTier === 'pro' ? ' pro' : ''}">${initial}</span>`;

    const signUpPrompt = document.getElementById('signUpPrompt');
    const searchModePill = document.getElementById('searchModeToggle');
    if (!userIsSignedIn) {
        pill.classList.add('signed-out');
        pill.innerHTML = 'Sign In';
        if (searchModePill) searchModePill.style.display = 'none';
        if (signUpPrompt) signUpPrompt.style.display = '';
    } else if (currentUserTier === 'pro') {
        pill.classList.add('signed-in');
        pill.innerHTML = avatarHTML;
        if (searchModePill) searchModePill.style.display = proSearchOn ? '' : 'none';
        if (signUpPrompt) signUpPrompt.style.display = 'none';
    } else {
        pill.classList.add('signed-in');
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
        menuAvatar.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
        menuAvatar.style.background = currentUserTier === 'pro' ? 'var(--apc-blue)' : 'var(--apc-orange)';
    }
    if (menuUpgrade)      menuUpgrade.style.display      = (currentUserTier === 'standard') ? 'flex' : 'none';
    const settingsUpgradeNudge = document.getElementById('settingsUpgradeNudge');
    if (settingsUpgradeNudge) settingsUpgradeNudge.style.display = (currentUserTier === 'standard') ? 'block' : 'none';
    if (menuActivate) {
        menuActivate.style.display = (currentUserTier === 'pro') ? 'flex' : 'none';
        menuActivate.classList.toggle('on', proSearchOn);
    }
    if (proSearchSwitch) proSearchSwitch.classList.toggle('on', proSearchOn);
    if (searchModePill) searchModePill.style.display = (proSearchOn && currentUserTier === 'pro') ? '' : 'none';
    if (!proSearchOn && currentSearchMode === 'wanted') setSearchMode('parts');
    const isPro = userIsSignedIn && currentUserTier === 'pro';
    const dtbDash   = document.getElementById('dtbDashboard');
    const amenuDash = document.getElementById('amenuDashboard');
    if (dtbDash)   dtbDash.style.display   = isPro ? 'flex' : 'none';
    if (amenuDash) amenuDash.style.display = isPro ? 'flex'   : 'none';

    const inboxNavItem     = document.getElementById('inboxNavItem');
    const dtbMessages      = document.getElementById('dtbMessages');
    const desktopInboxItem = document.getElementById('desktopInboxItem');
    if (inboxNavItem)     inboxNavItem.style.display     = userIsSignedIn ? '' : 'none';
    if (dtbMessages)      dtbMessages.style.display      = userIsSignedIn ? '' : 'none';
    if (desktopInboxItem) desktopInboxItem.style.display = userIsSignedIn ? '' : 'none';

    // Sync desktop dropdown
    const ddAvatar  = document.getElementById('acctDdAvatar');
    const ddName    = document.getElementById('acctDdName');
    const ddTier    = document.getElementById('acctDdTier');
    const ddUpgrade = document.getElementById('acctDdUpgrade');
    const ddActivate= document.getElementById('acctDdActivate');
    const ddDash    = document.getElementById('acctDdDashboard');
    const ddSwitch  = document.getElementById('proSearchSwitchDd');
    if (ddAvatar) {
        ddAvatar.textContent = (currentUserName || 'G').charAt(0).toUpperCase();
        ddAvatar.style.background = isPro ? 'var(--apc-blue)' : 'var(--apc-orange)';
    }
    if (ddName)    ddName.textContent = currentUserName || 'Guest';
    if (ddTier) {
        ddTier.textContent  = isPro ? 'APC Pro' : (currentUserTier === 'standard' ? 'APC Standard' : '');
        ddTier.classList.toggle('pro', isPro);
    }
    if (ddUpgrade)  ddUpgrade.style.display  = (currentUserTier === 'standard') ? 'flex' : 'none';
    if (ddActivate) { ddActivate.style.display = isPro ? 'flex' : 'none'; ddActivate.classList.toggle('on', proSearchOn); }
    if (ddDash)     ddDash.style.display      = isPro ? 'flex' : 'none';
    if (ddSwitch)   ddSwitch.classList.toggle('on', proSearchOn);

    updateSellFittingToggleVisibility();
    updateSellQuantityVisibility();
    updateWarehouseBinVisibility();
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
    const garageDrawer        = document.getElementById('garageDrawer');
    const vehicleDetailDrawer = document.getElementById('vehicleDetailDrawer');
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
            if (vehicleDetailDrawer)  vehicleDetailDrawer.style.top  = totalH + 'px';
            if (addVehicleDrawer)     addVehicleDrawer.style.top     = totalH + 'px';
            // addWantedDrawer is a floating card — top is fixed at 50% via CSS, not offset-driven
            if (wantedListDrawer)     wantedListDrawer.style.top     = totalH + 'px';
            if (savedPartsDrawer)     savedPartsDrawer.style.top     = totalH + 'px';
            if (settingsDrawer)       settingsDrawer.style.top       = totalH + 'px';
            if (profileDrawer)        profileDrawer.style.top        = totalH + 'px';
            if (myPartsDrawer)        myPartsDrawer.style.top        = totalH + 'px';
            if (workshopDrawer)       workshopDrawer.style.top       = totalH + 'px';
            if (recentlyViewedDrawer) recentlyViewedDrawer.style.top = totalH + 'px';
            if (inboxDrawer)          inboxDrawer.style.top          = totalH + 'px';
            if (messageDetailDrawer)  messageDetailDrawer.style.top  = totalH + 'px';
            if (chatDrawer)           chatDrawer.style.top           = totalH + 'px';
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
    if (!pill) return;
    if (currentSearchMode === 'wanted') {
        pill.textContent = 'Search Parts';
        pill.classList.add('mode-wanted');
        if (input) input.placeholder = "Search members' wanted lists...";
    } else {
        pill.textContent = 'Search Wanted';
        pill.classList.remove('mode-wanted');
        if (input) input.placeholder = 'Search parts for sale...';
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
        const qrText = apcId + '\n' + part.title + '\nBin: ' + (part.warehouseBin || 'N/A') + '\nPrice: $' + part.price;
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
    conv.msgs.push({ id: nextMsgId(conv), sent: true, time: 'Today', clock: nowClock(), text: `Offer accepted! Let's arrange the sale.` });
    saveConversations();
    renderInboxMsgs(conv);
    renderInboxConvList();
    showToast('Offer accepted!');
}

function declineOfferCard(convId, msgIdx) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.msgs[msgIdx];
    if (!msg?.offerCard) return;
    msg.offerCard.status = 'declined';
    conv.msgs.push({ id: nextMsgId(conv), sent: true, time: 'Today', clock: nowClock(), text: `Thanks for your offer, but I'll pass on this one.` });
    saveConversations();
    renderInboxMsgs(conv);
    renderInboxConvList();
    showToast('Offer declined.');
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
    conv.msgs.push({
        id: nextMsgId(conv), sent: true, time: 'Today', clock: nowClock(),
        text: `I can do $${counterPrice} — happy to arrange from there.`,
        offerCard: {
            ...msg.offerCard, offerPrice: counterPrice,
            status: 'pending', isCounter: true, counterPrice: null
        }
    });
    saveConversations();
    renderInboxMsgs(conv);
    renderInboxConvList();
    showToast(`Counter offer of $${counterPrice} sent.`);
}

function acceptOffer(offerId) {
    const o = offersDb.find(x => x.id === offerId);
    if (!o) return;
    o.status = 'accepted';
    saveOffers();
    showToast(`Offer accepted — congrats on the sale!`);
    renderDashListings('pending');
}

function declineOffer(offerId) {
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
    if (!confirm('Mark this listing as sold?')) return;
    const listing = userListings.find(l => l.id === partId);
    if (!listing) return;
    listing.status   = 'sold';
    listing.soldDate = Date.now();
    saveUserListings();
    renderDashboard();
    showToast('Listing marked as sold');
}

function relistPart(partId) {
    const listing = userListings.find(l => l.id === partId);
    if (!listing) return;
    listing.status   = 'active';
    listing.soldDate = null;
    saveUserListings();
    renderDashboard();
    showToast('Listing relisted');
}

// --- PRO DASHBOARD ---

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
    const maxCount = report[0]?.count || 1;
    const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

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
    const unread     = parseInt(document.getElementById('inboxBadgeTopBar')?.textContent || '0') || 2;

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
    const soldBadge = document.getElementById('dashSoldCount');
    if (soldBadge) {
        const realSoldCount = userListings.filter(l => l.status === 'sold' && l.seller === getCurrentSellerName()).length;
        soldBadge.textContent = realSoldCount + dashMockData.closedSales.length;
    }

    renderDashboardCharts(myListings);
    renderDashActivity();
    renderDemandWidget();
    renderDashListings('active', document.querySelector('#dashboardView .dash-tab.active'));
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
    renderMainGrid();
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

    // Live filters on desktop — re-render instantly on any filter input change
    document.querySelectorAll('#filterDrawer select, #filterDrawer input[type="checkbox"], #filterDrawer input[type="text"], #filterDrawer input[type="number"]').forEach(el => {
        const evt = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(evt, () => {
            if (window.innerWidth >= 900) applyFiltersAndRender();
        });
    });

    // Purge conversations trashed more than 30 days ago
    purgeTrashedConversations();
    updateTrashBadge();

    // Prepare the sell form preview boxes
    renderSellImagePreviews();

    // Deep-link: if URL contains ?item=123, open that listing directly
    const itemParam = new URLSearchParams(location.search).get('item');
    if (itemParam) openItemDetail(Number(itemParam));

    // Lightbox keyboard navigation
    document.addEventListener('keydown', e => {
        const lightbox = document.getElementById('imageLightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxNav(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNav(1); }
        if (e.key === 'Escape')     { e.preventDefault(); closeDetailImageViewer(); }
    });
});
l