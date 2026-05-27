const EDW_TAXONOMY = [
    {
        zone: "Engine Bay",
        apcCategory: "engine",
        assemblies: [
            { name: "Engine", parts: ["Complete Engine", "Engine Block", "Cylinder Head", "Rocker Cover", "Sump / Oil Pan", "Timing Cover", "Timing Chain Kit", "Timing Belt Kit", "Engine Mount (Left)", "Engine Mount (Right)"] },
            { name: "Air Intake", parts: ["Air Filter Box", "Airflow Meter / MAF Sensor", "Turbocharger", "Supercharger", "Intercooler Hose Kit", "Throttle Body", "Idle Control Valve", "Intake Manifold"] },
            { name: "Engine Electrics", parts: ["Alternator", "Starter Motor", "Engine ECU / PCM", "Fuse Box (Engine Bay)", "Engine Wiring Harness", "Ignition Coil Pack", "Distributor"] },
            { name: "Engine Ancillaries", parts: ["EGR Valve", "EGR Cooler", "Vacuum Pump", "Oil Cooler", "Oil Separator / Catch Can"] },
        ]
    },
    {
        zone: "Transmission & Drivetrain",
        apcCategory: "transmission",
        assemblies: [
            { name: "Gearbox / Transmission", parts: ["Torque Converter", "Gearbox Mount", "Transmission Oil Cooler", "Transmission Oil Pan / Sump", "Auto Transmission", "Transfer Case (Automatic)", "Transfer Case (Manual)", "Manual Gearbox", "CVT Transmission"] },
            { name: "Driveshafts", parts: ["Front Driveshaft (Left)", "Front Driveshaft (Right)", "Rear Driveshaft (Left)", "Rear Driveshaft (Right)", "Propshaft (Front)", "Propshaft (Rear)", "Centre Bearing"] },
            { name: "Diff & Axles", parts: ["Diff (Front)", "Diff (Rear)", "Diff Centre", "Rear Axle (Left)", "Rear Axle (Right)", "Front Axle (Left)", "Front Axle (Right)"] },
            { name: "Clutch", parts: ["Clutch Kit (Plate, Pressure Plate, Bearing)", "Flywheel", "Dual Mass Flywheel", "Clutch Master Cylinder", "Clutch Slave Cylinder"] },
        ]
    },
    {
        zone: "Fuel System",
        apcCategory: "fuel",
        assemblies: [
            { name: "Fuel System", parts: ["Fuel Tank", "Fuel Pump (In-tank)", "High Pressure Fuel Pump", "Fuel Rail", "Fuel Injectors (Set)", "Fuel Filter (In-line)", "Fuel Pressure Regulator"] },
        ]
    },
    {
        zone: "Cooling & Air Con",
        apcCategory: "cooling",
        assemblies: [
            { name: "Engine Cooling", parts: ["Radiator Fan (Electric)", "Radiator Fan (Clutch)", "Overflow / Header Tank", "Thermostat Housing", "Water Pump", "Radiator (Manual)", "Radiator (Automatic)", "Intercooler"] },
            { name: "Air Con & Heating", parts: ["AC Compressor", "Condenser", "Evaporator", "Heater Core", "Blower Motor", "AC Receiver / Drier", "Expansion Valve", "Climate Control Module", "Rear AC Unit", "Fan Speed Resistor"] },
        ]
    },
    {
        zone: "Exhaust",
        apcCategory: "engine",
        assemblies: [
            { name: "Exhaust System", parts: ["Exhaust Manifold", "Front Pipe / Downpipe", "Catalytic Converter", "DPF (Diesel Particulate Filter)", "Centre Pipe", "Muffler / Centre Silencer", "Rear Muffler", "Exhaust Tips"] },
        ]
    },
    {
        zone: "Body Exterior",
        apcCategory: "body",
        assemblies: [
            { name: "Front End", parts: ["Bonnet / Hood", "Front Bumper Bar", "Front Bumper Reinforcement", "Grille", "Radiator Support Panel", "Front Crossmember", "Bonnet Latch / Release", "Bonnet Hinge (Left)", "Bonnet Hinge (Right)"] },
            { name: "Front Guards", parts: ["Front Guard (Left)", "Front Guard (Right)", "Guard Liner (Left)", "Guard Liner (Right)"] },
            { name: "Rear End", parts: ["Boot Lid", "Tailgate", "Tray (Ute)", "Rear Bumper Bar", "Rear Bumper Reinforcement", "Rear Quarter Panel (Left)", "Rear Quarter Panel (Right)", "Rear Guard Liner (Left)", "Rear Guard Liner (Right)"] },
            { name: "Roof & Pillars", parts: ["Roof Panel", "Sunroof Assembly", "A Pillar (Left)", "A Pillar (Right)", "B Pillar (Left)", "B Pillar (Right)", "C Pillar (Left)", "C Pillar (Right)", "Roof Rail (Left)", "Roof Rail (Right)"] },
            { name: "Mouldings / Trim", parts: ["Front Door Moulding (Left)", "Rear Door Moulding (Left)", "Side Skirt - Sill Panel Mould (Left)", "Front Door Moulding (Right)", "Rear Door Moulding (Right)", "Side Skirt - Sill Panel Mould (Right)", "Front Bumper Lower Moulding", "Rear Bumper Lower Moulding", "Front Wheel Arch Trim (Left)", "Front Wheel Arch Trim (Right)", "Rear Wheel Arch Trim (Left)", "Rear Wheel Arch Trim (Right)"] },
        ]
    },
    {
        zone: "Doors",
        apcCategory: "body",
        assemblies: [
            { name: "Front Door", parts: ["Complete Door (Left)", "Door Shell (Left)", "Door Glass (Left)", "Window Regulator — Electric (Left)", "Window Regulator — Manual (Left)", "Window Motor (Left)", "Door Mirror (Left)", "Mirror Glass (Left)", "Mirror Motor (Left)", "Door Handle — Outer (Left)", "Door Handle — Inner (Left)", "Door Lock / Latch (Left)", "Door Lock Actuator (Left)", "Door Card / Trim Panel (Left)", "Door Weatherstrip / Seal (Left)", "Door Hinge — Upper (Left)", "Door Hinge — Lower (Left)", "Window Switch (Left)", "Complete Door (Right)", "Door Shell (Right)", "Door Glass (Right)", "Window Regulator — Electric (Right)", "Window Regulator — Manual (Right)", "Window Motor (Right)", "Door Mirror (Right)", "Mirror Glass (Right)", "Mirror Motor (Right)", "Door Handle — Outer (Right)", "Door Handle — Inner (Right)", "Door Lock / Latch (Right)", "Door Lock Actuator (Right)", "Door Card / Trim Panel (Right)", "Door Weatherstrip / Seal (Right)", "Door Hinge — Upper (Right)", "Door Hinge — Lower (Right)", "Window Switch (Right - Master Switch)"] },
            { name: "Rear Door", parts: ["Complete Door (Left)", "Door Shell (Left)", "Door Glass (Left)", "Window Regulator — Electric (Left)", "Window Regulator — Manual (Left)", "Window Motor (Left)", "Door Handle — Outer (Left)", "Door Handle — Inner (Left)", "Door Lock / Latch (Left)", "Door Lock Actuator (Left)", "Door Card / Trim Panel (Left)", "Door Weatherstrip / Seal (Left)", "Door Hinge — Upper (Left)", "Door Hinge — Lower (Left)", "Window Switch (Left)", "Window Switch (Right)", "Door Hinge — Lower (Right)", "Door Hinge — Upper (Right)", "Door Weatherstrip / Seal (Right)", "Door Card / Trim Panel (Right)", "Door Lock Actuator (Right)", "Door Lock / Latch (Right)", "Door Handle — Inner (Right)", "Door Handle — Outer (Right)", "Window Motor (Right)", "Window Regulator — Manual (Right)", "Window Regulator — Electric (Right)", "Door Glass (Right)", "Door Shell (Right)", "Complete Door (Right)"] },
            { name: "Sliding Door", parts: ["Complete Sliding Door", "Sliding Door Rail Kit", "Window Glass", "Door Handle (Outer)", "Door Handle (Inner)", "Door Lock / Latch", "Door Card / Trim Panel", "Door Weatherstrip / Seal"] },
            { name: "Tailgate Door", parts: ["Complete Tailgate", "Window Glass (Rear)", "Tailgate Lock / Latch", "Tailgate Handle", "Tailgate Struts", "Tailgate Hinges"] },
        ]
    },
    {
        zone: "Lighting",
        apcCategory: "electrical",
        assemblies: [
            { name: "Front Lighting", parts: ["Headlight (Left)", "Headlight (Right)", "Fog Light (Left)", "Fog Light (Right)", "DRL / LED Bar (Left)", "DRL / LED Bar (Right)", "Indicator (Front Left)", "Indicator (Front Right)"] },
            { name: "Rear Lighting", parts: ["Taillight (Left)", "Taillight (Right)", "High-Mount Brake Light", "Indicator (Rear Left)", "Indicator (Rear Right)", "Number Plate Light", "Reverse Light (Left)", "Reverse Light (Right)"] },
            { name: "Other Lighting", parts: ["Side Marker (Left)", "Side Marker (Right)", "Map Light / Dome Light", "Boot / Cargo Light", "Work Lights (Ute / 4WD)"] },
        ]
    },
    {
        zone: "Glass",
        apcCategory: "glass",
        assemblies: [
            { name: "Glass", parts: ["Windscreen (Front)", "Rear Window", "Sunroof Glass", "Door Glass (Front Left)", "Door Glass (Front Right)", "Door Glass (Rear Left)", "Door Glass (Rear Right)", "Quarter Glass (Left)", "Quarter Glass (Right)", "Vent Glass (Front Left)", "Vent Glass (Front Right)"] },
        ]
    },
    {
        zone: "Interior",
        apcCategory: "interior",
        assemblies: [
            { name: "Dashboard", parts: ["Dashboard Assembly", "Instrument Cluster", "Steering Wheel", "Airbag — Driver", "Airbag — Passenger", "Glove Box", "Centre Console", "Dash Trim Panels", "Heater / AC Controls", "Head Unit / Infotainment", "Navigation Screen", "Rear View Mirror (Interior)"] },
            { name: "Seats", parts: ["Front Seat — Driver (Complete)", "Front Seat — Passenger (Complete)", "Rear Seat (Full)", "Rear Seat (Left)", "Rear Seat (Right)", "Rear Seat (Centre)", "3rd Row Seat"] },
            { name: "Seat Belts", parts: ["Seat Belt — Driver", "Seat Belt — Passenger", "Seat Belt — Rear Left", "Seat Belt — Rear Right", "Seat Belt — Rear Centre"] },
            { name: "Trim & Carpet", parts: ["Floor Carpet (Full Set)", "Boot / Cargo Carpet", "Headliner / Roof Lining", "Sun Visor (Left)", "Sun Visor (Right)", "Door Sill Trim (Left)", "Door Sill Trim (Right)", "Parcel Shelf"] },
            { name: "Controls", parts: ["Steering Column", "Indicator / Wiper Stalk", "Brake Pedal", "Clutch Pedal", "Accelerator Pedal"] },
        ]
    },
    {
        zone: "Electrical",
        apcCategory: "electrical",
        assemblies: [
            { name: "Modules & ECUs", parts: ["Body Control Module (BCM)", "ABS Module / Pump", "Airbag ECU / SRS Module", "Transmission ECU", "Central Locking Module", "Immobiliser / Transponder", "Keyless Entry Module", "Park Assist Module"] },
            { name: "Sensors", parts: ["ABS Sensor (Front Left)", "ABS Sensor (Front Right)", "ABS Sensor (Rear Left)", "ABS Sensor (Rear Right)", "O2 Sensor (Front / Upstream)", "O2 Sensor (Rear / Downstream)", "MAP Sensor", "Camshaft Position Sensor", "Crankshaft Position Sensor", "Coolant Temp Sensor", "Knock Sensor", "Throttle Position Sensor"] },
            { name: "Wiring & Fuses", parts: ["Engine Wiring Harness", "Body Wiring Harness", "Door Wiring Loom (Front Left)", "Door Wiring Loom (Front Right)", "Fuse Box (Cabin / Interior)", "Trailer Wiring Harness"] },
            { name: "Battery & Charging", parts: ["Battery", "Battery Tray / Holder", "Alternator"] },
        ]
    },
    {
        zone: "Suspension & Steering",
        apcCategory: "suspension",
        assemblies: [
            { name: "Front Suspension", parts: ["Strut / Shock Absorber (Front Left)", "Strut / Shock Absorber (Front Right)", "Coil Spring (Front Left)", "Coil Spring (Front Right)", "Leaf Spring (Front Left)", "Leaf Spring (Front Right)", "Lower Control Arm (Left)", "Lower Control Arm (Right)", "Upper Control Arm (Left)", "Upper Control Arm (Right)", "Ball Joint (Front Left)", "Ball Joint (Front Right)", "Sway Bar (Front)", "Sway Bar Link (Front Left)", "Sway Bar Link (Front Right)", "Hub / Wheel Bearing (Front Left)", "Hub / Wheel Bearing (Front Right)"] },
            { name: "Rear Suspension", parts: ["Shock Absorber (Rear Left)", "Shock Absorber (Rear Right)", "Strut (Rear Left)", "Strut (Rear Right)", "Coil Spring (Rear Left)", "Coil Spring (Rear Right)", "Leaf Spring (Rear Left)", "Leaf Spring (Rear Right)", "Trailing Arm (Left)", "Trailing Arm (Right)", "Panhard / Lateral Rod", "Sway Bar (Rear)", "Sway Bar Link (Rear Left)", "Sway Bar Link (Rear Right)", "Hub / Wheel Bearing (Rear Left)", "Hub / Wheel Bearing (Rear Right)"] },
            { name: "Steering", parts: ["Steering Rack", "Steering Box", "Power Steering Rack", "Power Steering Pump", "Power Steering Reservoir", "Power Steering Cooler", "Tie Rod (Left)", "Tie Rod (Right)", "Drag Link", "Steering Shaft / Intermediate Shaft", "Steering Column"] },
        ]
    },
    {
        zone: "Brakes",
        apcCategory: "brakes",
        assemblies: [
            { name: "Front Brakes", parts: ["Disc Rotor (Left)", "Disc Rotor (Right)", "Brake Caliper (Left)", "Brake Caliper (Right)", "Brake Pads (Front Set)"] },
            { name: "Rear Brakes", parts: ["Disc Rotor (Left)", "Disc Rotor (Right)", "Brake Caliper (Left)", "Brake Caliper (Right)", "Brake Drum (Left)", "Brake Drum (Right)", "Brake Pads (Rear Set)", "Brake Shoes (Rear Set)"] },
            { name: "Brake System", parts: ["Brake Master Cylinder", "Brake Booster", "ABS Module / Pump", "Handbrake / Park Brake Mechanism", "Brake Lines (Set)"] },
        ]
    },
    {
        zone: "Wheels & Tyres",
        apcCategory: "wheels",
        assemblies: [
            { name: "Wheels", parts: ["Alloy Wheel (Each)", "Steel Wheel (Each)", "Full Set of Wheels x4", "Spare Wheel", "Centre Cap / Hubcap"] },
            { name: "Tyres", parts: ["Tyre (Each)", "Full Set of Tyres x4", "Spare Tyre", "Spare Tyre Carrier / Winch"] },
        ]
    },
    {
        zone: "4WD / Off-road",
        apcCategory: "4x4",
        assemblies: [
            { name: "4WD Components", parts: ["Transfer Case", "Front Locker / Diff Lock", "Rear Locker / Diff Lock", "Diff Lock Actuator", "Free Wheeling Hubs (Set)", "4WD Selector / Switch"] },
        ]
    },
    {
        zone: "Accessories",
        apcCategory: "other",
        assemblies: [
            { name: "Towing", parts: ["Tow Bar / Tow Hitch", "Tow Ball", "Trailer Wiring Harness"] },
            { name: "Protection", parts: ["Bull Bar", "Nudge Bar", "Side Steps / Running Boards", "Rock Sliders", "Skid Plates"] },
            { name: "Ute Accessories", parts: ["Sports Bar", "Hard Lid / Canopy", "Tonneau Cover", "Tray Liner", "Toolbox"] },
            { name: "Other Accessories", parts: ["Roof Racks", "Snorkel", "Spare Wheel Carrier", "Winch", "Aerial / Antenna"] },
        ]
    }
];