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
  "Datsun":      ["120Y","1200","1600","180B","200B","240Z","260Z","280Z","280ZX","Bluebird","Cherry","Fairlady","Laurel","Patrol","Stanza","Sunny","Ute"],
  "Dodge":       ["Caliber","Challenger","Charger","Durango","Journey","Nitro","Ram","Viper"],
  "Ferrari":     ["296","458","488","812","California","F8","GTC4 Lusso","Portofino","Roma","SF90"],
  "Fiat":        ["124 Spider","500","500L","500X","Bravo","Doblo","Ducato","Fiorino","Panda","Punto","Scudo","Tipo"],
  "Ford":        ["Bronco","Cortina","EcoSport","Edge","Endura","Escape","Everest","Explorer","Fairlane","Fairmont","Falcon","Falcon XA","Falcon XB","Falcon XC","Falcon XD","Falcon XE","Falcon XF","Falcon EA","Falcon EB","Falcon ED","Falcon EF","Falcon EL","Falcon AU","Falcon BA","Falcon BF","Falcon FG","Falcon FG X","Falcon Ute","Fiesta","Focus","Galaxy","Ka","Maverick","Mondeo","Mustang","Puma","Ranger","Territory","Transit","Transit Custom"],
  "Foton":       ["Tunland"],
  "Genesis":     ["G70","G80","G90","GV70","GV80"],
  "Great Wall":  ["Cannon","Deer","Hover","Sailor","Steed","Wingle"],
  "GWM":         ["Ute","Cannon"],
  "Haval":       ["H2","H6","H9","Jolion","Dargo"],
  "Holden":      ["Acadia","Astra","Barina","Berlina","Calais","Captiva","Colorado","Colorado 7","Combo","Commodore","Commodore VB","Commodore VC","Commodore VH","Commodore VK","Commodore VL","Commodore VN","Commodore VP","Commodore VR","Commodore VS","Commodore VT","Commodore VX","Commodore VY","Commodore VZ","Commodore VE","Commodore VF","Cruze","Equinox","Frontera","HSV ClubSport","HSV GTS","HSV Maloo","HSV Senator","Insignia","Jackaroo","Malibu","Monaro","One Tonner","Rodeo","Spark","Statesman","Suburban","Torana","Trailblazer","Trax","Ute","Vectra","Volt","Zafira"],
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
  "McLaren":      ["540C","570S","570GT","600LT","620R","650S","675LT","720S","750S","765LT","Artura","Elva","GT","MP4-12C","P1","Senna"],
  "Mercedes-Benz":["A-Class","AMG GT","B-Class","C-Class","CLA","CLS","E-Class","EQA","EQB","EQC","EQE","EQS","G-Class","GLA","GLB","GLC","GLE","GLS","S-Class","SL","SLC","SLK","Sprinter","V-Class","Vito","X-Class"],
  "MG":          ["3","4","HS","Marvel R","RX5","ZS","ZST"],
  "MINI":        ["Clubman","Convertible","Countryman","Hatch","Paceman"],
  "Mitsubishi":  ["3000GT","ASX","Colt","Eclipse","Eclipse Cross","Galant","Lancer","Mirage","Outlander","Outlander PHEV","Pajero","Pajero Sport","Sigma","Triton"],
  "Morris":      ["1100","850","Cowley","Marina","Mini","Minor","Oxford"],
  "Nissan":      ["100NX","180SX","200SX","240SX","300ZX","350Z","370Z","Cube","Dualis","Elgrand","GT-R","Juke","Lafesta","Leaf","Livina","Maxima","Micra","Murano","Navara","Note","Patrol","Pathfinder","Pintara","Pulsar","Qashqai","Serena","Skyline","Skyline R30","Skyline R31","Skyline R32","Skyline R33","Skyline R34","Tiida","X-Trail","Z"],
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

// ── VEHICLE YEAR RANGES ───────────────────────────────────────────────────────
// Each model maps to an array of [fromYear, toYear] generation ranges.
// Used to expand year searches — a search for "1988 Charade" returns all
// listings within the same generation (e.g. 1987–1996 G100).
// Covers top Australian makes. Falls back to exact-year matching if no data.
const VEHICLE_YEAR_RANGES = {
  "Daihatsu": {
    "Charade":    [[1977,1983],[1983,1987],[1987,1996],[1996,2001]],
    "Rocky":      [[1984,1992],[1992,1998]],
    "Terios":     [[1997,2006],[2006,2017]],
    "Sirion":     [[1998,2004],[2004,2012]],
    "Applause":   [[1989,1997]],
    "Move":       [[1995,2002],[2002,2010]],
    "Feroza":     [[1988,1997]],
    "Cuore":      [[1980,1985],[1985,1990],[1990,1998],[1998,2003]],
  },
  "Ford": {
    "Falcon":         [[1960,1979],[1979,1988],[1988,1998],[1998,2008],[2008,2016]],
    "Falcon XA":      [[1972,1973]],
    "Falcon XB":      [[1973,1976]],
    "Falcon XC":      [[1976,1979]],
    "Falcon XD":      [[1979,1982]],
    "Falcon XE":      [[1982,1984]],
    "Falcon XF":      [[1984,1988]],
    "Falcon EA":      [[1988,1991]],
    "Falcon EB":      [[1991,1993]],
    "Falcon ED":      [[1993,1994]],
    "Falcon EF":      [[1994,1996]],
    "Falcon EL":      [[1996,1998]],
    "Falcon AU":      [[1998,2002]],
    "Falcon BA":      [[2002,2005]],
    "Falcon BF":      [[2005,2008]],
    "Falcon FG":      [[2008,2014]],
    "Falcon FG X":    [[2014,2016]],
    "Ranger":         [[1998,2006],[2006,2011],[2011,2015],[2015,2022],[2022,2024]],
    "Territory":      [[2004,2011],[2011,2016]],
    "Mustang":        [[1964,1973],[1973,1979],[1979,1993],[1994,2004],[2005,2014],[2015,2023],[2023,2024]],
    "Focus":          [[1998,2004],[2004,2011],[2011,2018],[2018,2022]],
    "Mondeo":         [[1993,2000],[2000,2007],[2007,2014],[2014,2022]],
    "Fiesta":         [[1976,1983],[1983,1989],[1989,1994],[1994,2002],[2002,2008],[2008,2017],[2017,2022]],
    "Transit":        [[1965,2000],[2000,2013],[2013,2024]],
    "Fairlane":       [[1959,1979],[1979,1988],[1988,1998]],
    "Fairmont":       [[1966,1979],[1979,1988],[1988,1998]],
    "Cortina":        [[1963,1966],[1966,1970],[1970,1976],[1976,1982]],
    "Escape":         [[2001,2007],[2008,2012],[2013,2019],[2020,2024]],
  },
  "Holden": {
    "Commodore":      [[1978,1988],[1988,1993],[1993,1997],[1997,2006],[2006,2013],[2013,2017]],
    "Commodore VB":   [[1978,1980]],
    "Commodore VC":   [[1980,1981]],
    "Commodore VH":   [[1981,1982]],
    "Commodore VK":   [[1982,1984]],
    "Commodore VL":   [[1986,1988]],
    "Commodore VN":   [[1988,1991]],
    "Commodore VP":   [[1991,1993]],
    "Commodore VR":   [[1993,1995]],
    "Commodore VS":   [[1995,1997]],
    "Commodore VT":   [[1997,1999]],
    "Commodore VX":   [[1999,2002]],
    "Commodore VY":   [[2002,2004]],
    "Commodore VZ":   [[2004,2006]],
    "Commodore VE":   [[2006,2013]],
    "Commodore VF":   [[2013,2017]],
    "Monaro":         [[1968,1977],[2001,2005]],
    "Torana":     [[1967,1979]],
    "Astra":      [[1996,2004],[2004,2009],[2009,2015]],
    "Calais":     [[1984,1988],[1988,1997],[1997,2006],[2006,2013],[2013,2017]],
    "Statesman":  [[1971,1985],[1985,1999],[1999,2006],[2006,2008]],
    "Colorado":   [[2008,2012],[2012,2020],[2020,2024]],
    "Captiva":    [[2006,2011],[2011,2018]],
    "Trailblazer":[[2012,2016],[2016,2020]],
    "Cruze":      [[2009,2016]],
    "Barina":     [[1985,1994],[1994,2001],[2001,2005],[2005,2011],[2011,2019]],
    "Jackaroo":   [[1981,1991],[1991,1998],[1998,2004]],
    "Rodeo":      [[1988,2003],[2003,2008]],
  },
  "Honda": {
    "Civic":      [[1972,1979],[1979,1983],[1983,1987],[1987,1991],[1991,1995],[1995,2001],[2001,2006],[2006,2011],[2011,2015],[2015,2021],[2021,2024]],
    "Accord":     [[1976,1981],[1981,1985],[1985,1989],[1989,1993],[1993,1997],[1997,2002],[2002,2008],[2008,2015],[2015,2022],[2022,2024]],
    "CR-V":       [[1995,2001],[2001,2006],[2006,2012],[2012,2017],[2017,2022],[2022,2024]],
    "Jazz":       [[2001,2008],[2008,2014],[2014,2020],[2020,2024]],
    "Odyssey":    [[1994,1998],[1998,2004],[2004,2008],[2008,2014],[2014,2021]],
    "HR-V":       [[1999,2006],[2015,2021],[2021,2024]],
    "Accord Euro":[[2003,2008],[2008,2015]],
    "Legend":     [[1986,1990],[1990,1996],[1996,2004],[2004,2012]],
    "S2000":      [[1999,2009]],
    "City":       [[1981,1994],[1994,2003],[2003,2008],[2008,2014],[2014,2020],[2020,2024]],
  },
  "Hyundai": {
    "i30":        [[2007,2012],[2012,2017],[2017,2020],[2020,2024]],
    "Tucson":     [[2004,2009],[2009,2015],[2015,2020],[2020,2024]],
    "Santa Fe":   [[2001,2006],[2006,2012],[2012,2018],[2018,2024]],
    "Elantra":    [[1990,1995],[1995,2000],[2000,2006],[2006,2011],[2011,2016],[2016,2021],[2021,2024]],
    "Accent":     [[1994,1999],[1999,2006],[2006,2011],[2011,2018],[2018,2024]],
    "Getz":       [[2002,2011]],
    "ix35":       [[2009,2015]],
    "Sonata":     [[1988,1993],[1993,1998],[1998,2001],[2001,2006],[2006,2011],[2011,2015],[2015,2020],[2020,2024]],
    "Veloster":   [[2011,2019],[2019,2022]],
    "Kona":       [[2017,2023],[2023,2024]],
    "Ioniq":      [[2016,2022]],
    "Palisade":   [[2018,2024]],
  },
  "Mazda": {
    "3":          [[2003,2009],[2009,2013],[2013,2019],[2019,2024]],
    "6":          [[2002,2007],[2007,2013],[2013,2023]],
    "2":          [[2002,2007],[2007,2014],[2014,2022]],
    "CX-5":       [[2012,2017],[2017,2024]],
    "CX-3":       [[2015,2024]],
    "CX-7":       [[2006,2012]],
    "CX-9":       [[2006,2016],[2016,2024]],
    "MX-5":       [[1989,1997],[1997,2005],[2005,2015],[2015,2024]],
    "RX-7":       [[1979,1985],[1985,1991],[1991,2002]],
    "RX-8":       [[2002,2012]],
    "626":        [[1979,1987],[1987,1992],[1992,1997],[1997,2002]],
    "323":        [[1977,1989],[1989,1994],[1994,1998],[1998,2004]],
    "BT-50":      [[2006,2011],[2011,2020],[2020,2024]],
    "Tribute":    [[2000,2008],[2008,2011]],
  },
  "Mitsubishi": {
    "Lancer":     [[1973,1979],[1979,1983],[1983,1987],[1987,1992],[1992,1996],[1996,2003],[2003,2007],[2007,2017]],
    "Galant":     [[1969,1978],[1978,1983],[1983,1987],[1987,1992],[1992,1996],[1996,2003]],
    "Pajero":     [[1981,1990],[1990,1994],[1994,1999],[1999,2006],[2006,2021]],
    "Triton":     [[1986,1996],[1996,2006],[2006,2015],[2015,2024]],
    "Eclipse":    [[1989,1994],[1994,1999],[1999,2005],[2005,2012],[2017,2021]],
    "Outlander":  [[2001,2006],[2006,2012],[2012,2021],[2021,2024]],
    "ASX":        [[2010,2016],[2016,2022],[2022,2024]],
    "Magna":      [[1985,1991],[1991,1996],[1996,2003]],
    "Verada":     [[1991,1996],[1996,2003]],
    "380":        [[2005,2008]],
    "Colt":       [[1962,1971],[1971,1977],[1977,1984],[1984,1990],[2004,2012]],
    "Sigma":      [[1977,1983],[1983,1987]],
  },
  "Nissan": {
    "Patrol":     [[1951,1980],[1980,1988],[1988,1997],[1997,2013],[2013,2024]],
    "Navara":     [[1986,1997],[1997,2005],[2005,2015],[2015,2024]],
    "Skyline":    [[1957,1972],[1972,1977],[1977,1985],[1985,1989],[1989,1994],[1994,1998],[1998,2002],[2002,2007],[2007,2014]],
    "Skyline R30": [[1981,1985]],
    "Skyline R31": [[1985,1989]],
    "Skyline R32": [[1989,1994]],
    "Skyline R33": [[1993,1998]],
    "Skyline R34": [[1998,2002]],
    "300ZX":      [[1983,1989],[1989,1996]],
    "350Z":       [[2002,2009]],
    "370Z":       [[2008,2020]],
    "X-Trail":    [[2000,2007],[2007,2014],[2014,2022],[2022,2024]],
    "Pulsar":     [[1978,1982],[1982,1986],[1986,1990],[1990,1995],[1995,2000],[2000,2006],[2012,2017]],
    "Maxima":     [[1981,1988],[1988,1994],[1994,2000],[2000,2003],[2003,2009],[2009,2015]],
    "Tiida":      [[2004,2012]],
    "Micra":      [[1982,1992],[1992,2003],[2003,2011],[2011,2017],[2017,2024]],
    "Pathfinder": [[1985,1995],[1995,2004],[2004,2013],[2013,2021],[2021,2024]],
    "Murano":     [[2002,2008],[2008,2014],[2014,2021],[2021,2024]],
    "Dualis":     [[2007,2013]],
    "Qashqai":    [[2007,2013],[2013,2021],[2021,2024]],
  },
  "Subaru": {
    "Impreza":    [[1992,2000],[2000,2007],[2007,2011],[2011,2016],[2016,2024]],
    "WRX":        [[1994,2000],[2000,2007],[2007,2014],[2014,2021],[2021,2024]],
    "Forester":   [[1997,2002],[2002,2008],[2008,2013],[2013,2018],[2018,2024]],
    "Legacy":     [[1989,1994],[1994,1999],[1999,2003],[2003,2009],[2009,2015],[2015,2024]],
    "Outback":    [[1994,1999],[1999,2003],[2003,2009],[2009,2015],[2015,2021],[2021,2024]],
    "Liberty":    [[1989,1994],[1994,1999],[1999,2003],[2003,2009],[2009,2015],[2015,2024]],
    "XV":         [[2012,2017],[2017,2023],[2023,2024]],
    "BRZ":        [[2012,2021],[2021,2024]],
    "Levorg":     [[2014,2020],[2020,2024]],
    "Tribeca":    [[2005,2014]],
  },
  "Toyota": {
    "Camry":      [[1983,1992],[1992,1997],[1997,2002],[2002,2006],[2006,2011],[2011,2017],[2017,2024]],
    "Corolla":    [[1966,1983],[1983,1987],[1987,1992],[1992,1998],[1998,2001],[2001,2007],[2007,2013],[2013,2019],[2019,2024]],
    "HiLux":      [[1968,1988],[1988,2005],[2005,2015],[2015,2024]],
    "Hilux":      [[1968,1988],[1988,2005],[2005,2015],[2015,2024]],
    "LandCruiser":[[1951,1960],[1960,1980],[1980,1990],[1990,1998],[1998,2007],[2007,2021],[2021,2024]],
    "LandCruiser 70":[[1984,1999],[1999,2007],[2007,2024]],
    "LandCruiser 80":[[1990,1997]],
    "LandCruiser 100":[[1998,2007]],
    "LandCruiser 200":[[2007,2021]],
    "LandCruiser 300":[[2021,2024]],
    "Prado":              [[1990,1996],[1996,2002],[2002,2009],[2009,2024]],
    "LandCruiser Prado":  [[1990,1996],[1996,2002],[2002,2009],[2009,2024]],
    "LandCruiser 70 Series": [[1984,1999],[1999,2007],[2007,2024]],
    "RAV4":       [[1994,2000],[2000,2005],[2005,2012],[2012,2018],[2018,2024]],
    "Yaris":      [[1999,2005],[2005,2011],[2011,2020],[2020,2024]],
    "Celica":     [[1970,1977],[1977,1982],[1982,1989],[1989,1994],[1994,1999],[1999,2006]],
    "Supra":      [[1978,1986],[1986,1993],[1993,2002],[2019,2024]],
    "Aurion":     [[2006,2012],[2012,2017]],
    "Kluger":     [[2000,2007],[2007,2014],[2014,2020],[2020,2024]],
    "Tarago":     [[1983,2006],[2006,2019]],
    "HiAce":      [[1967,1977],[1977,1982],[1982,1989],[1989,1996],[1996,2005],[2005,2019],[2019,2024]],
    "Hiace":      [[1967,1977],[1977,1982],[1982,1989],[1989,1996],[1996,2005],[2005,2019],[2019,2024]],
    "Avalon":     [[1994,1999],[1999,2005],[2005,2012],[2012,2018],[2018,2022]],
    "Rukus":      [[2006,2014]],
    "FJ Cruiser": [[2006,2014]],
    "86":         [[2012,2021],[2021,2024]],
    "GR86":       [[2021,2024]],
    "Fortuner":   [[2005,2015],[2015,2024]],
  },
};

// Returns the [fromYear, toYear] generation range that contains the given year,
// or null if no range data exists (caller falls back to exact-year matching).
function getVehicleYearRange(make, model, year) {
    const yr = Number(year);
    if (!yr || !make || !model) return null;
    const ranges = VEHICLE_YEAR_RANGES[make]?.[model];
    if (!ranges) return null;
    return ranges.find(([from, to]) => yr >= from && yr <= to) || null;
}

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
