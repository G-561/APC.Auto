const VEHICLE_DB = {
  "Alfa Romeo":  ["147","156","159","Brera","Giulia","Giulietta","GT","GTV","MiTo","Spider","Stelvio","Tonale"],
  "Audi":        ["A1","A2","A3","A4","A5","A6","A7","A8","E-Tron","Q2","Q3","Q4 E-Tron","Q5","Q6 E-Tron","Q7","Q8","R8","RS3","RS4","RS5","RS6","RS7","S3","S4","S5","S6","S7","S8","SQ5","SQ7","SQ8","TT"],
  "Austin":      ["1100","A30","A35","A40","A50","A55","A60","Allegro","Healey","Lancer","Maxi","Mini","Sheerline"],
  "BMW":         ["1 Series","2 Series","3 Series","4 Series","5 Series","6 Series","7 Series","8 Series","i3","i4","i7","iX","iX3","M2","M3","M4","M5","M8","X1","X2","X3","X4","X5","X6","X7","Z3","Z4"],
  "BYD":         ["Atto 3","Dolphin","Seal","Shark","Sealion 6","Sealion 7"],
  "Chery":       ["Omoda 5","Tiggo 4","Tiggo 7","Tiggo 8"],
  "Chrysler":    ["300","300C","Charger","Grand Voyager","Neon","PT Cruiser","Sebring","Valiant","Voyager"],
  "Citroen":     ["Berlingo","C1","C2","C3","C3 Aircross","C4","C4 Cactus","C5","C5 Aircross","C5 X","C6","C8","Dispatch","DS3","DS4","DS5","Jumper","Jumpy","Picasso","Xsara"],
  "Cupra":       ["Ateca","Born","Formentor","Leon"],
  "Daewoo":      ["Kalos","Lacetti","Leganza","Matiz","Nubira"],
  "Daihatsu":    ["Applause","Charade","Copen","Cuore","Delta","Feroza","Gran Move","Move","Rocky","Sirion","Terios","YRV"],
  "Dodge":       ["Caliber","Challenger","Charger","Durango","Journey","Nitro","Ram","Viper"],
  "Ferrari":     ["296","458","488","812","California","F8","GTC4 Lusso","Portofino","Roma","SF90"],
  "Fiat":        ["124 Spider","500","500L","500X","Bravo","Doblo","Ducato","Fiorino","Panda","Punto","Scudo","Tipo"],
  "Ford":        ["Bronco","Cortina","EcoSport","Edge","Endura","Escape","Everest","Explorer","Fairlane","Fairmont","Falcon","Falcon Ute","Fiesta","Focus","Galaxy","Ka","Maverick","Mondeo","Mustang","Puma","Ranger","Territory","Transit","Transit Custom"],
  "Foton":       ["Tunland"],
  "Genesis":     ["G70","G80","G90","GV70","GV80"],
  "Great Wall":  ["Cannon","Deer","Hover","Sailor","Steed","Wingle"],
  "GWM":         ["Ute","Cannon"],
  "Haval":       ["H2","H6","H9","Jolion","Dargo"],
  "Holden":      ["Acadia","Astra","Barina","Berlina","Calais","Captiva","Colorado","Colorado 7","Combo","Commodore","Cruze","Equinox","Frontera","HSV ClubSport","HSV GTS","HSV Maloo","HSV Senator","Insignia","Jackaroo","Malibu","Monaro","One Tonner","Rodeo","Spark","Statesman","Suburban","Torana","Trailblazer","Trax","Ute","Vectra","Volt","Zafira"],
  "Honda":       ["Accord","Accord Euro","Amaze","City","Civic","City Hatch","CR-V","CR-Z","FRV","HR-V","Insight","Jazz","Legend","Odyssey","Pilot","S2000","Stream"],
  "HSV":         ["ClubSport","Commodore","GTO","GTS","Maloo","Mallala","Senator","Typhoon"],
  "Hyundai":     ["Accent","Bayon","Elantra","Getz","i20","i20 N","i30","i30 N","i30 Fastback","i40","iLoad","iMax","Ioniq","Ioniq 5","Ioniq 6","ix35","Kona","Kona Electric","Palisade","Santa Cruz","Santa Fe","Sonata","Staria","Terracan","Trajet","Tucson","Veloster","Venue"],
  "Infiniti":    ["EX","FX","G","M","Q30","Q50","Q60","QX30","QX50","QX60","QX70","QX80"],
  "Isuzu":       ["D-Max","MU-7","MU-X","Trooper"],
  "Jaguar":      ["E-Pace","F-Pace","F-Type","I-Pace","XE","XF","XJ","XJ8","XK","XKR"],
  "Jeep":        ["Cherokee","Commander","Compass","Gladiator","Grand Cherokee","Grand Wagoneer","Patriot","Renegade","Wrangler"],
  "Kia":         ["Carnival","Carens","Cerato","EV6","EV9","Niro","Optima","Picanto","Proceed","Rio","Seltos","Sorento","Soul","Sportage","Stinger","Stonic"],
  "Lamborghini": ["Huracan","Revuelto","Urus"],
  "Land Rover":  ["Defender","Discovery","Discovery Sport","Freelander","Range Rover","Range Rover Evoque","Range Rover Sport","Range Rover Velar","Series I","Series II","Series III"],
  "LDV":         ["D90","G10","G20","Deliver 9","T60","T60 Max","Terron"],
  "Lexus":       ["CT","ES","GS","GX","IS","LC","LM","LS","LX","NX","RC","RX","UX"],
  "Lincoln":     ["Aviator","Continental","Corsair","MKC","MKT","MKX","MKZ","Navigator"],
  "Lotus":       ["2-Eleven","3-Eleven","Elan","Elise","Emira","Europa","Evija","Evora","Excel","Exige","Esprit","Seven"],
  "Mahindra":    ["Pik Up","Roxor","Scorpio","XUV300"],
  "Maserati":    ["Ghibli","Ghibli Hybrid","Grancabrio","Granturismo","Levante","Quattroporte"],
  "Mazda":       ["2","3","6","BT-50","CX-3","CX-30","CX-5","CX-60","CX-70","CX-8","CX-80","CX-9","MX-3","MX-5","MX-6","MX-30","MPV","RX-7","RX-8","Tribute"],
  "Mercedes-Benz":["A-Class","AMG GT","B-Class","C-Class","CLA","CLS","E-Class","EQA","EQB","EQC","EQE","EQS","G-Class","GLA","GLB","GLC","GLE","GLS","S-Class","SL","SLC","SLK","Sprinter","V-Class","Vito","X-Class"],
  "MG":          ["3","4","HS","Marvel R","RX5","ZS","ZST"],
  "MINI":        ["Clubman","Convertible","Countryman","Hatch","Paceman"],
  "Mitsubishi":  ["3000GT","ASX","Colt","Eclipse","Eclipse Cross","Galant","Lancer","Mirage","Outlander","Outlander PHEV","Pajero","Pajero Sport","Sigma","Triton"],
  "Morris":      ["1100","850","Cowley","Marina","Mini","Minor","Oxford"],
  "Nissan":      ["100NX","180SX","200SX","240SX","300ZX","350Z","370Z","Cube","Dualis","Elgrand","GT-R","Juke","Lafesta","Leaf","Livina","Maxima","Micra","Murano","Navara","Note","Patrol","Pathfinder","Pintara","Pulsar","Qashqai","Serena","Skyline","Tiida","X-Trail","Z"],
  "Peugeot":     ["1007","107","108","2008","206","207","208","3008","306","307","308","4007","4008","406","407","408","5008","508","607","807","Expert","Partner","Traveller"],
  "Porsche":     ["718 Boxster","718 Cayman","911","918","928","944","968","Cayenne","Cayenne E-Hybrid","Macan","Panamera","Taycan"],
  "RAM":         ["1500","2500","3500"],
  "Renault":     ["Arkana","Captur","Clio","Fluence","Kadjar","Kangoo","Koleos","Laguna","Master","Megane","Safrane","Scenic","Symbol","Trafic","Zoe"],
  "Rover":       ["25","45","75","200","400","600","800","Metro","Mini"],
  "Saab":        ["9-3","9-5","900","9000"],
  "Skoda":       ["Fabia","Kamiq","Karoq","Kodiaq","Octavia","Rapid","Scala","Superb","Yeti"],
  "SsangYong":   ["Korando","Musso","Rexton","Tivoli"],
  "Subaru":      ["BRZ","Forester","Impreza","Levorg","Liberty","Outback","Tribeca","WRX","XV"],
  "Suzuki":      ["Alto","Baleno","Cappuccino","Celerio","Carry","Equator","Grand Vitara","Ignis","Jimny","Kizashi","Liana","S-Cross","Sierra","SJ410","SJ413","Super Carry","Swift","Vitara"],
  "Toyota":      ["86","Alphard","Aurion","Avalon","C-HR","Camry","Corolla","Corolla Cross","FJ Cruiser","GR86","GR Corolla","GR Supra","GR Yaris","HiAce","Hilux","Kluger","LandCruiser","LandCruiser 70 Series","LandCruiser 100","LandCruiser 200","LandCruiser 300","LandCruiser Prado","MR2","Prius","Prius C","Prius V","RAV4","RAV4 Prime","Rukus","Supra","Tarago","Venza","Yaris","Yaris Cross"],
  "Triumph":     ["2000","Dolomite","GT6","Herald","Spitfire","Stag","Toledo","TR6","TR7","TR8"],
  "Volkswagen":  ["Amarok","Arteon","Atlas","Beetle","Bora","Caddy","Caravelle","Crafter","Golf","Golf GTI","Golf R","ID.3","ID.4","ID.5","Jetta","Multivan","Passat","Phaeton","Polo","Saveiro","T-Cross","T-Roc","Tiguan","Touareg","Touran","Transporter","Up"],
  "Volvo":       ["C30","C40","C70","S40","S60","S80","S90","V40","V50","V60","V70","V90","XC40","XC60","XC70","XC90"]
};

const VEHICLE_MAKES = Object.keys(VEHICLE_DB).sort();

function getVehicleModels(make) {
    return (VEHICLE_DB[make] || []).slice().sort();
}

function buildYearOptions(selectedYear) {
    const current = new Date().getFullYear();
    let html = '<option value="">Year</option>';
    for (let y = current + 1; y >= 1950; y--) {
        html += `<option value="${y}"${selectedYear == y ? ' selected' : ''}>${y}</option>`;
    }
    return html;
}

function buildMakeOptions(selectedMake) {
    let html = '<option value="">Make</option>';
    VEHICLE_MAKES.forEach(make => {
        html += `<option value="${make}"${selectedMake === make ? ' selected' : ''}>${make}</option>`;
    });
    return html;
}

function buildModelOptions(make, selectedModel) {
    const models = getVehicleModels(make);
    let html = '<option value="">Model</option>';
    models.forEach(model => {
        html += `<option value="${model}"${selectedModel === model ? ' selected' : ''}>${model}</option>`;
    });
    return html;
}
