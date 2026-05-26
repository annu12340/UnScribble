"use strict";

const scenarios = [
  {
    id: "helene",
    name: "Hurricane Helene Flood Replay",
    type: "flood",
    place: "Western North Carolina",
    trigger: "Historical replay",
    leadText: "Mountain basin flood response",
    clock: "2024-09-27 12:00 ET",
    center: [48, 48],
    metrics: {
      population: 186000,
      evacuees: 24800,
      shelters: 9,
      hospitals: 6,
      ambulances: 38,
      responderTeams: 27,
    },
    tools: [
      ["Earth-2 CorrDiff", "Downscales rainfall and flood-risk grids", 96],
      ["FourCastNet", "Projects wind and precipitation bands", 94],
      ["Vision NIM", "Finds blocked roads and inundated structures", 91],
      ["cuOpt NIM", "Solves evacuation and ambulance routes", 89],
      ["Nemotron LLM NIM", "Drafts alerts and responder instructions", 97],
      ["ASR NIM", "Classifies emergency voice calls", 88],
    ],
    forecasts: [
      { lead: "Now", rain: 78, wind: 52, water: 84, risk: 88, confidence: 94, note: "French Broad and Swannanoa corridors remain above major flood stage." },
      { lead: "+3h", rain: 86, wind: 45, water: 91, risk: 94, confidence: 92, note: "CorrDiff expands flash-flood footprint across low bridges and river roads." },
      { lead: "+6h", rain: 63, wind: 38, water: 93, risk: 96, confidence: 90, note: "River crest reaches downtown access points before gradual rainfall taper." },
      { lead: "+9h", rain: 44, wind: 33, water: 87, risk: 90, confidence: 87, note: "Secondary slides likely on saturated ridgelines." },
      { lead: "+12h", rain: 31, wind: 28, water: 74, risk: 78, confidence: 84, note: "Evacuation routes reopen if debris clearance holds." },
      { lead: "+18h", rain: 18, wind: 21, water: 58, risk: 63, confidence: 82, note: "Shelter demand shifts from rescue to medical transport and supplies." },
    ],
    zones: [
      { name: "River Arts District", severity: "critical", x: 36, y: 58, radius: 20, detail: "Floodwater above first-floor threshold in mixed-use blocks." },
      { name: "Swannanoa", severity: "high", x: 64, y: 45, radius: 17, detail: "Road network fractured by washouts and debris piles." },
      { name: "Black Mountain", severity: "medium", x: 76, y: 36, radius: 13, detail: "Slope failures threaten two east-west connectors." },
    ],
    roads: [
      { name: "I-40 Eastbound", status: "restricted", points: [[8, 70], [24, 65], [42, 62], [62, 55], [86, 45]] },
      { name: "I-26 North", status: "open", points: [[18, 92], [30, 76], [42, 59], [54, 39], [65, 12]] },
      { name: "US-70", status: "closed", points: [[31, 47], [48, 46], [62, 43], [79, 36], [92, 28]] },
      { name: "NC-191", status: "open", points: [[20, 25], [30, 40], [38, 59], [47, 78]] },
      { name: "Blue Ridge Connector", status: "restricted", points: [[49, 25], [57, 39], [67, 55], [80, 65]] },
    ],
    rivers: [
      [[17, 22], [28, 31], [38, 47], [45, 66], [61, 82], [74, 96]],
      [[69, 9], [64, 25], [60, 43], [53, 55], [42, 66]],
    ],
    shelters: [
      { name: "Erwin High Shelter", x: 25, y: 31, capacity: 820, occupied: 610 },
      { name: "Civic Center Shelter", x: 45, y: 38, capacity: 1100, occupied: 1040 },
      { name: "Montreat College Shelter", x: 82, y: 27, capacity: 620, occupied: 330 },
      { name: "Arden High Shelter", x: 32, y: 82, capacity: 760, occupied: 510 },
    ],
    hospitals: [
      { name: "Mission Hospital", x: 41, y: 52, capacity: 68, occupied: 61, status: "surge" },
      { name: "AdventHealth Hendersonville", x: 31, y: 89, capacity: 44, occupied: 33, status: "open" },
      { name: "Black Mountain Clinic", x: 78, y: 39, capacity: 16, occupied: 14, status: "limited" },
    ],
    damage: [
      { name: "Bridge deck undermined", source: "Drone VLM", severity: "critical", confidence: 96, x: 55, y: 49, status: "Close and route around", need: "Engineer team" },
      { name: "Warehouse roof collapse", source: "Maxar + DINOv2", severity: "high", confidence: 91, x: 35, y: 61, status: "Search pending", need: "USAR team" },
      { name: "Water over US-70", source: "Responder photo", severity: "high", confidence: 88, x: 67, y: 42, status: "Barricade requested", need: "Road crew" },
      { name: "Landslide at Ridge Road", source: "Drone VLM", severity: "medium", confidence: 84, x: 75, y: 60, status: "Monitor", need: "Dozer" },
    ],
    routes: [
      { name: "Evac A1", from: "River Arts", to: "Erwin High Shelter", people: 2900, eta: 34, status: "rerouted", constraint: "Avoid US-70 washout", points: [[38, 59], [34, 52], [30, 43], [25, 31]] },
      { name: "Ambulance M4", from: "Mission Hospital", to: "Arden High Shelter", people: 4, eta: 21, status: "active", constraint: "High-clearance vehicle", points: [[41, 52], [38, 63], [34, 74], [32, 82]] },
      { name: "Supply S2", from: "Airport staging", to: "Civic Center Shelter", people: 0, eta: 28, status: "queued", constraint: "Fuel + water pallets", points: [[22, 86], [29, 72], [36, 55], [45, 38]] },
    ],
    calls: [
      { name: "Family trapped on second floor", language: "English", severity: "critical", confidence: 95, x: 36, y: 56, transcript: "Water is up to the windows and the stairs are gone.", status: "Boat rescue assigned" },
      { name: "Medical oxygen low", language: "Spanish", severity: "high", confidence: 89, x: 43, y: 40, transcript: "Necesitamos energia para un concentrador de oxigeno.", status: "Medic routed" },
      { name: "Road blocked by trees", language: "English", severity: "medium", confidence: 86, x: 71, y: 58, transcript: "Two lanes blocked and power lines are down.", status: "Utility crew notified" },
    ],
    alerts: {
      en: "Flash flood emergency remains in effect. Move to higher ground immediately. Do not attempt to cross flooded roads. Use shelter routes A1 and A3 unless directed by responders.",
      es: "La emergencia por inundacion repentina continua. Suba a terreno elevado de inmediato. No cruce caminos inundados. Use las rutas de refugio A1 y A3 salvo indicacion de los equipos de respuesta.",
      hi: "Achaanak baadh ki aapat sthiti jaari hai. Turant unchi jagah par jayein. Paani bhari sadkon ko paar na karein. Responder ke nirdesh ke bina shelter routes A1 aur A3 ka upyog karein.",
    },
    sitrep: "Flood operations prioritize swift-water rescue, bridge closures, and shelter decompression. cuOpt is favoring high-clearance corridors while Vision NIM flags debris barriers for public works.",
  },
  {
    id: "valencia",
    name: "Valencia Flood Replay",
    type: "flood",
    place: "Valencia, Spain",
    trigger: "Historical replay",
    leadText: "Urban flash-flood response",
    clock: "2024-10-29 19:30 CET",
    center: [54, 50],
    metrics: {
      population: 318000,
      evacuees: 41200,
      shelters: 12,
      hospitals: 8,
      ambulances: 52,
      responderTeams: 34,
    },
    tools: [
      ["Earth-2 CorrDiff", "Downscales convective rainfall bands", 93],
      ["FourCastNet", "Maintains storm-cell timing envelope", 90],
      ["Vision NIM", "Classifies submerged roads and stranded vehicles", 92],
      ["cuOpt NIM", "Routes buses, ambulances, and supply trucks", 87],
      ["Nemotron LLM NIM", "Drafts multilingual public alerts", 96],
      ["ASR NIM", "Extracts locations from hotline calls", 85],
    ],
    forecasts: [
      { lead: "Now", rain: 92, wind: 31, water: 82, risk: 91, confidence: 91, note: "Rainfall intensity exceeds drainage capacity across southern suburbs." },
      { lead: "+2h", rain: 88, wind: 34, water: 89, risk: 95, confidence: 89, note: "Urban underpasses and rail approaches become impassable." },
      { lead: "+4h", rain: 72, wind: 29, water: 94, risk: 97, confidence: 88, note: "Floodwater pooling expands toward arterial ring roads." },
      { lead: "+6h", rain: 51, wind: 25, water: 86, risk: 90, confidence: 85, note: "Shelter arrivals peak after road closures propagate." },
      { lead: "+9h", rain: 33, wind: 22, water: 71, risk: 76, confidence: 82, note: "Pump staging and debris removal become dominant constraints." },
      { lead: "+12h", rain: 19, wind: 18, water: 55, risk: 61, confidence: 79, note: "Re-entry remains blocked around underpasses and low garages." },
    ],
    zones: [
      { name: "Paiporta Corridor", severity: "critical", x: 45, y: 64, radius: 18, detail: "Rapid water rise and trapped vehicles in low streets." },
      { name: "Ribera Industrial", severity: "high", x: 62, y: 58, radius: 15, detail: "Warehouse district requires search sweeps." },
      { name: "Coastal Access", severity: "medium", x: 78, y: 72, radius: 12, detail: "Wind-driven debris blocks coastbound lanes." },
    ],
    roads: [
      { name: "V-30 Ring", status: "restricted", points: [[11, 42], [30, 36], [52, 38], [75, 49], [91, 64]] },
      { name: "A-3 West", status: "open", points: [[4, 58], [24, 55], [43, 52], [63, 51], [92, 53]] },
      { name: "CV-400", status: "closed", points: [[35, 83], [43, 68], [50, 54], [59, 37]] },
      { name: "Rail Underpass", status: "closed", points: [[53, 72], [57, 60], [60, 48], [62, 35]] },
      { name: "Port Access", status: "restricted", points: [[68, 84], [75, 76], [84, 71], [95, 70]] },
    ],
    rivers: [
      [[15, 36], [30, 40], [48, 45], [70, 53], [95, 61]],
      [[43, 15], [48, 29], [51, 45], [55, 63], [60, 82]],
    ],
    shelters: [
      { name: "Mislata Sports Center", x: 32, y: 37, capacity: 1400, occupied: 980 },
      { name: "Torrent Pavilion", x: 42, y: 75, capacity: 1250, occupied: 1170 },
      { name: "University Hall", x: 61, y: 32, capacity: 960, occupied: 510 },
      { name: "Port Authority Hall", x: 86, y: 68, capacity: 720, occupied: 390 },
    ],
    hospitals: [
      { name: "La Fe", x: 58, y: 44, capacity: 86, occupied: 78, status: "surge" },
      { name: "General Hospital", x: 40, y: 45, capacity: 61, occupied: 49, status: "open" },
      { name: "Manises", x: 25, y: 31, capacity: 38, occupied: 34, status: "limited" },
    ],
    damage: [
      { name: "Underpass full of water", source: "Traffic camera VLM", severity: "critical", confidence: 97, x: 56, y: 60, status: "Closure verified", need: "Pump unit" },
      { name: "Cars stranded at roundabout", source: "Drone VLM", severity: "high", confidence: 93, x: 45, y: 63, status: "Rescue sweep", need: "Boat team" },
      { name: "Warehouse district dark", source: "Satellite change detection", severity: "medium", confidence: 80, x: 64, y: 56, status: "Power crew queued", need: "Generator" },
      { name: "Clinic access flooded", source: "Field report", severity: "high", confidence: 87, x: 51, y: 70, status: "Ambulance route changed", need: "Medical transport" },
    ],
    routes: [
      { name: "Bus E7", from: "Paiporta Corridor", to: "Torrent Pavilion", people: 1180, eta: 42, status: "active", constraint: "Avoid rail underpass", points: [[46, 65], [42, 70], [42, 75]] },
      { name: "Ambulance V2", from: "Clinic South", to: "La Fe", people: 2, eta: 26, status: "rerouted", constraint: "No underpasses", points: [[51, 70], [48, 58], [53, 48], [58, 44]] },
      { name: "Supply P1", from: "Port staging", to: "Mislata Sports Center", people: 0, eta: 53, status: "queued", constraint: "Drinking water pallets", points: [[86, 68], [74, 57], [55, 47], [32, 37]] },
    ],
    calls: [
      { name: "People on vehicle roofs", language: "Spanish", severity: "critical", confidence: 94, x: 45, y: 65, transcript: "Hay personas encima de los coches cerca de la rotonda.", status: "Boat rescue assigned" },
      { name: "Basement filling quickly", language: "Valencian", severity: "high", confidence: 86, x: 58, y: 57, transcript: "L'aigua esta entrant al soterrani i no podem eixir.", status: "Fire unit routed" },
      { name: "Shelter needs medication", language: "English", severity: "medium", confidence: 81, x: 42, y: 75, transcript: "We need insulin and dry blankets at the pavilion.", status: "Supply manifest updated" },
    ],
    alerts: {
      en: "Flash-flood danger remains severe. Avoid underpasses, garages, and low streets. Move to upper floors if travel is unsafe. Buses are loading on marked dry corridors only.",
      es: "El peligro de inundacion repentina sigue siendo grave. Evite pasos inferiores, garajes y calles bajas. Suba a plantas altas si no puede desplazarse con seguridad.",
      hi: "Flash flood ka khatra abhi gambhir hai. Underpass, garage aur nichli sadkon se door rahen. Yatra surakshit na ho to upar ki manzil par chale jayein.",
    },
    sitrep: "Operations are focused on trapped motorists, underpass closures, and shelter logistics. cuOpt is holding bus loading points on dry corridors while Vision NIM verifies submerged road segments.",
  },
  {
    id: "pacific-fire",
    name: "Pacific Ridge Wildfire Drill",
    type: "wildfire",
    place: "Northern California foothills",
    trigger: "Escalation drill",
    leadText: "Wind-driven wildfire response",
    clock: "2026-05-26 10:00 PT",
    center: [53, 48],
    metrics: {
      population: 92000,
      evacuees: 13800,
      shelters: 5,
      hospitals: 4,
      ambulances: 24,
      responderTeams: 31,
    },
    tools: [
      ["FourCastNet", "Projects wind shifts and humidity recovery", 89],
      ["CorrDiff", "Sharpens local wind and ember-risk gradients", 86],
      ["Vision NIM", "Detects flame fronts, smoke columns, blocked roads", 90],
      ["cuOpt NIM", "Routes phased evacuation and engines", 92],
      ["Nemotron LLM NIM", "Generates zone alerts and crew briefings", 95],
      ["ASR NIM", "Transcribes 911 and radio traffic", 84],
    ],
    forecasts: [
      { lead: "Now", rain: 88, wind: 58, water: 79, risk: 82, confidence: 88, note: "Gusty northeast wind pushes fire toward canyon communities." },
      { lead: "+1h", rain: 93, wind: 66, water: 88, risk: 91, confidence: 87, note: "Ember cast threatens two ridgeline roads and a communications site." },
      { lead: "+2h", rain: 91, wind: 62, water: 91, risk: 93, confidence: 85, note: "Evacuation Zone C should clear before smoke drops visibility." },
      { lead: "+4h", rain: 74, wind: 49, water: 76, risk: 80, confidence: 82, note: "Humidity recovery begins after frontal passage." },
      { lead: "+6h", rain: 62, wind: 35, water: 61, risk: 66, confidence: 79, note: "Structure defense shifts to perimeter mop-up on west flank." },
      { lead: "+9h", rain: 49, wind: 27, water: 48, risk: 54, confidence: 76, note: "Repairs and escorted re-entry planning can start outside hot zones." },
    ],
    zones: [
      { name: "Canyon Zone C", severity: "critical", x: 62, y: 43, radius: 17, detail: "Wind-driven head fire approaching subdivisions." },
      { name: "Ridge Estates", severity: "high", x: 50, y: 34, radius: 14, detail: "Ember spotting probability above evacuation threshold." },
      { name: "Valley Smoke Band", severity: "medium", x: 39, y: 58, radius: 13, detail: "Visibility and respiratory load degrading." },
    ],
    roads: [
      { name: "Ridge Road", status: "closed", points: [[43, 20], [52, 31], [63, 43], [78, 56]] },
      { name: "County 12", status: "restricted", points: [[17, 68], [36, 60], [53, 52], [75, 49], [92, 50]] },
      { name: "Highway 49", status: "open", points: [[14, 18], [22, 35], [30, 51], [40, 72], [47, 92]] },
      { name: "Reservoir Access", status: "open", points: [[56, 82], [60, 68], [64, 54], [67, 38]] },
      { name: "Powerline Trail", status: "restricted", points: [[72, 20], [68, 36], [62, 55], [54, 71]] },
    ],
    rivers: [
      [[18, 74], [29, 69], [41, 66], [57, 70], [73, 80], [88, 88]],
    ],
    shelters: [
      { name: "Fairgrounds Shelter", x: 27, y: 78, capacity: 1900, occupied: 1210 },
      { name: "West High Gym", x: 21, y: 40, capacity: 740, occupied: 460 },
      { name: "Community College", x: 38, y: 88, capacity: 880, occupied: 610 },
    ],
    hospitals: [
      { name: "Foothill Medical", x: 34, y: 63, capacity: 48, occupied: 39, status: "open" },
      { name: "Valley Trauma", x: 20, y: 82, capacity: 72, occupied: 66, status: "surge" },
    ],
    damage: [
      { name: "Road blocked by fire", source: "Drone VLM", severity: "critical", confidence: 94, x: 64, y: 43, status: "Closed", need: "Law enforcement" },
      { name: "Spot fire near repeater", source: "Tower camera VLM", severity: "high", confidence: 90, x: 54, y: 28, status: "Engine assigned", need: "Type 3 engine" },
      { name: "Smoke-choked arterial", source: "Traffic camera VLM", severity: "medium", confidence: 84, x: 38, y: 58, status: "Escort traffic", need: "CHP unit" },
      { name: "Power pole down", source: "Field report", severity: "medium", confidence: 82, x: 72, y: 56, status: "Utility requested", need: "Line crew" },
    ],
    routes: [
      { name: "Evac C-West", from: "Canyon Zone C", to: "Fairgrounds Shelter", people: 6400, eta: 47, status: "active", constraint: "One-way outbound", points: [[62, 43], [52, 50], [39, 61], [27, 78]] },
      { name: "Engine Strike 5", from: "Reservoir", to: "Ridge Estates", people: 0, eta: 18, status: "active", constraint: "Do not enter Ridge Road closure", points: [[56, 82], [59, 63], [55, 46], [50, 34]] },
      { name: "Medical Smoke 1", from: "Valley Smoke Band", to: "Foothill Medical", people: 12, eta: 22, status: "queued", constraint: "Oxygen bus", points: [[39, 58], [36, 61], [34, 63]] },
    ],
    calls: [
      { name: "Mobility-limited resident", language: "English", severity: "high", confidence: 91, x: 58, y: 40, transcript: "My father cannot leave without an accessible van.", status: "Paratransit assigned" },
      { name: "Flames visible behind homes", language: "English", severity: "critical", confidence: 88, x: 63, y: 44, transcript: "Flames are over the ridge and embers are hitting the deck.", status: "Strike team notified" },
      { name: "Smoke inhalation at shelter", language: "Spanish", severity: "medium", confidence: 82, x: 27, y: 78, transcript: "Varias personas necesitan inhaladores.", status: "Medical cache routed" },
    ],
    alerts: {
      en: "Zone C is under mandatory evacuation. Leave westbound now using County 12. Do not use Ridge Road. Keep headlights on and follow traffic control.",
      es: "La Zona C esta bajo evacuacion obligatoria. Salga hacia el oeste por County 12. No use Ridge Road. Mantenga las luces encendidas y siga el control de trafico.",
      hi: "Zone C mein anivarya evacuation hai. County 12 se turant westbound niklein. Ridge Road ka upyog na karein. Headlights chalu rakhein aur traffic control follow karein.",
    },
    sitrep: "The incident loop is prioritizing Zone C evacuation, structure defense, smoke medical support, and dynamic road restrictions as wind forecasts update.",
  },
  {
    id: "gulf-cyclone",
    name: "Gulf Cyclone Landfall Drill",
    type: "cyclone",
    place: "Tampa Bay, Florida",
    trigger: "Landfall drill",
    leadText: "Storm surge and wind response",
    clock: "2026-05-26 14:00 ET",
    center: [60, 47],
    metrics: {
      population: 276000,
      evacuees: 58600,
      shelters: 16,
      hospitals: 9,
      ambulances: 58,
      responderTeams: 42,
    },
    tools: [
      ["Earth-2 CorrDiff", "Downscales eyewall rain and surge exposure", 95],
      ["FourCastNet", "Projects track, wind radii, and rainfall bands", 93],
      ["Vision NIM", "Detects flooded arterials and roof damage", 88],
      ["cuOpt NIM", "Optimizes staged evacuation and ambulance moves", 91],
      ["Nemotron LLM NIM", "Issues zone-specific multilingual alerts", 96],
      ["ASR NIM", "Converts emergency calls to dispatch tasks", 86],
    ],
    forecasts: [
      { lead: "Now", rain: 64, wind: 72, water: 77, risk: 83, confidence: 91, note: "Outer rain bands and rising tide begin closing low causeways." },
      { lead: "+3h", rain: 79, wind: 86, water: 89, risk: 92, confidence: 89, note: "Surge envelope expands into Zone A with tropical-storm-force winds inland." },
      { lead: "+6h", rain: 91, wind: 94, water: 96, risk: 97, confidence: 87, note: "Landfall window: bridge closures and hospital transfers reach hard deadline." },
      { lead: "+9h", rain: 82, wind: 88, water: 93, risk: 94, confidence: 85, note: "Back-bay flooding persists after eyewall passage." },
      { lead: "+12h", rain: 58, wind: 67, water: 81, risk: 83, confidence: 82, note: "Search routes reopen only on elevated arterials." },
      { lead: "+18h", rain: 36, wind: 44, water: 63, risk: 68, confidence: 78, note: "Power restoration and medical resupply become primary constraints." },
    ],
    zones: [
      { name: "Zone A Surge", severity: "critical", x: 69, y: 58, radius: 18, detail: "Mandatory evacuation for low coastal neighborhoods." },
      { name: "Barrier Islands", severity: "high", x: 82, y: 45, radius: 14, detail: "Causeway closure window is under three hours." },
      { name: "Inland Wind Swath", severity: "medium", x: 48, y: 36, radius: 15, detail: "Treefall and outage risk rising along feeder roads." },
    ],
    roads: [
      { name: "I-275 North", status: "open", points: [[40, 91], [44, 76], [50, 60], [55, 42], [61, 17]] },
      { name: "Courtney Campbell", status: "restricted", points: [[56, 48], [68, 45], [82, 43], [96, 42]] },
      { name: "Gandy Bridge", status: "closed", points: [[51, 64], [65, 61], [80, 58], [94, 55]] },
      { name: "US-19", status: "restricted", points: [[26, 85], [31, 67], [35, 49], [38, 29], [41, 10]] },
      { name: "Selmon Expressway", status: "open", points: [[26, 58], [42, 56], [58, 54], [72, 52]] },
    ],
    rivers: [
      [[72, 18], [73, 33], [75, 49], [78, 67], [84, 88]],
      [[44, 12], [48, 27], [51, 44], [54, 63], [58, 84]],
    ],
    shelters: [
      { name: "Raymond James Shelter", x: 43, y: 50, capacity: 2600, occupied: 2110 },
      { name: "Sun Dome Shelter", x: 58, y: 31, capacity: 1800, occupied: 970 },
      { name: "Lakeland Civic Shelter", x: 27, y: 36, capacity: 3100, occupied: 1680 },
      { name: "Brandon High Shelter", x: 45, y: 70, capacity: 1250, occupied: 1090 },
    ],
    hospitals: [
      { name: "Tampa General", x: 58, y: 55, capacity: 74, occupied: 70, status: "surge" },
      { name: "St. Joseph's", x: 46, y: 45, capacity: 67, occupied: 55, status: "open" },
      { name: "Bayfront Health", x: 70, y: 72, capacity: 38, occupied: 35, status: "limited" },
    ],
    damage: [
      { name: "Causeway overtopping", source: "Traffic camera VLM", severity: "critical", confidence: 95, x: 69, y: 45, status: "Closure pending", need: "DOT barricades" },
      { name: "Roof damage cluster", source: "Drone VLM", severity: "high", confidence: 89, x: 73, y: 59, status: "Post-landfall sweep", need: "USAR light team" },
      { name: "Hospital transfer queue", source: "EMS feed", severity: "high", confidence: 93, x: 58, y: 55, status: "Ambulances staged", need: "ALS units" },
      { name: "Power substation flooded", source: "Utility report", severity: "medium", confidence: 82, x: 64, y: 67, status: "Isolation requested", need: "Utility crew" },
    ],
    routes: [
      { name: "Evac Zone A", from: "Zone A Surge", to: "Lakeland Civic Shelter", people: 18400, eta: 66, status: "active", constraint: "Northbound contraflow", points: [[69, 58], [58, 54], [45, 46], [27, 36]] },
      { name: "Hospital T1", from: "Tampa General", to: "St. Joseph's", people: 18, eta: 24, status: "active", constraint: "Before bridge closure", points: [[58, 55], [53, 50], [46, 45]] },
      { name: "Supply W3", from: "State staging", to: "Raymond James Shelter", people: 0, eta: 41, status: "queued", constraint: "Water, cots, generator fuel", points: [[30, 28], [36, 39], [43, 50]] },
    ],
    calls: [
      { name: "Evacuation transport needed", language: "English", severity: "high", confidence: 90, x: 70, y: 58, transcript: "We are in Zone A and need a wheelchair van before the bridge closes.", status: "Accessible transport assigned" },
      { name: "Water entering apartment", language: "Spanish", severity: "critical", confidence: 87, x: 75, y: 61, transcript: "El agua esta entrando y no podemos bajar las escaleras.", status: "Rescue queued after wind threshold" },
      { name: "Generator fuel at shelter", language: "English", severity: "medium", confidence: 85, x: 43, y: 50, transcript: "Shelter generator has four hours of fuel remaining.", status: "Supply W3 updated" },
    ],
    alerts: {
      en: "Zone A is under mandatory evacuation. Leave now using marked northbound routes. Bridges may close before landfall. Do not shelter in mobile homes or ground-floor coastal units.",
      es: "La Zona A esta bajo evacuacion obligatoria. Salga ahora por las rutas marcadas hacia el norte. Los puentes pueden cerrar antes de que toque tierra.",
      hi: "Zone A mein anivarya evacuation hai. Marked northbound routes se abhi niklein. Landfall se pehle bridges band ho sakte hain. Mobile homes ya ground-floor coastal units mein shelter na lein.",
    },
    sitrep: "Cyclone operations prioritize Zone A evacuation, bridge closure timing, hospital transfers, and shelter resupply before landfall winds exceed response limits.",
  },
  {
    id: "quake",
    name: "Bay Fault Earthquake Drill",
    type: "earthquake",
    place: "San Francisco Bay Area",
    trigger: "Earthquake drill",
    leadText: "Urban search and medical routing",
    clock: "2026-05-26 07:15 PT",
    center: [50, 52],
    metrics: {
      population: 420000,
      evacuees: 17100,
      shelters: 14,
      hospitals: 11,
      ambulances: 64,
      responderTeams: 48,
    },
    tools: [
      ["USGS ShakeMap", "Feeds intensity and ground-failure surfaces", 94],
      ["Vision NIM", "Detects collapsed facades and blocked arterials", 92],
      ["cuOpt NIM", "Balances ambulances, shelters, and bridge constraints", 90],
      ["Nemotron LLM NIM", "Issues multilingual aftershock guidance", 97],
      ["ASR NIM", "Transcribes emergency calls at surge volume", 87],
      ["Earth-2 Weather", "Checks smoke and marine layer for air operations", 78],
    ],
    forecasts: [
      { lead: "Now", rain: 84, wind: 18, water: 81, risk: 84, confidence: 93, note: "Shake intensity and liquefaction risk concentrate near waterfront fill." },
      { lead: "+30m", rain: 88, wind: 19, water: 86, risk: 88, confidence: 90, note: "Aftershock probability keeps bridge inspections and building triage elevated." },
      { lead: "+1h", rain: 82, wind: 21, water: 83, risk: 82, confidence: 87, note: "Ambulance load peaks as calls clear ASR triage backlog." },
      { lead: "+2h", rain: 74, wind: 20, water: 76, risk: 76, confidence: 84, note: "Shelter routing shifts away from liquefaction zones." },
      { lead: "+4h", rain: 66, wind: 17, water: 68, risk: 68, confidence: 80, note: "Damage assessment transitions to tagging and utility isolation." },
      { lead: "+8h", rain: 54, wind: 14, water: 57, risk: 57, confidence: 76, note: "Hospital decompression and supply delivery dominate operations." },
    ],
    zones: [
      { name: "Waterfront Fill", severity: "critical", x: 58, y: 52, radius: 16, detail: "Liquefaction and collapsed facade reports." },
      { name: "Bridge Approaches", severity: "high", x: 72, y: 38, radius: 13, detail: "Inspection hold creates route bottlenecks." },
      { name: "Downtown Core", severity: "high", x: 48, y: 46, radius: 14, detail: "Falling glass and stairwell entrapments." },
    ],
    roads: [
      { name: "US-101", status: "restricted", points: [[29, 91], [34, 74], [42, 58], [50, 42], [57, 17]] },
      { name: "I-80 Bridge", status: "closed", points: [[56, 45], [68, 40], [82, 37], [96, 35]] },
      { name: "Market Street", status: "restricted", points: [[25, 54], [39, 50], [52, 47], [65, 43]] },
      { name: "Embarcadero", status: "closed", points: [[55, 22], [59, 38], [61, 53], [59, 70], [54, 87]] },
      { name: "I-280", status: "open", points: [[20, 83], [31, 70], [39, 60], [46, 50]] },
    ],
    rivers: [
      [[65, 12], [70, 28], [73, 44], [72, 63], [67, 86]],
    ],
    shelters: [
      { name: "Kezar Pavilion", x: 30, y: 49, capacity: 1300, occupied: 760 },
      { name: "Cow Palace", x: 28, y: 84, capacity: 2200, occupied: 1380 },
      { name: "Moscone Hall C", x: 50, y: 50, capacity: 1700, occupied: 1490 },
      { name: "Richmond Rec Center", x: 22, y: 27, capacity: 820, occupied: 410 },
    ],
    hospitals: [
      { name: "UCSF Mission Bay", x: 48, y: 63, capacity: 88, occupied: 80, status: "surge" },
      { name: "ZSFG", x: 42, y: 58, capacity: 69, occupied: 66, status: "surge" },
      { name: "CPMC Van Ness", x: 43, y: 39, capacity: 51, occupied: 44, status: "open" },
    ],
    damage: [
      { name: "Facade collapse", source: "Street camera VLM", severity: "critical", confidence: 93, x: 52, y: 46, status: "USAR assigned", need: "Search team" },
      { name: "Bridge inspection hold", source: "DOT feed", severity: "high", confidence: 99, x: 72, y: 38, status: "Closed", need: "Structural engineer" },
      { name: "Gas leak cluster", source: "911 + utility", severity: "high", confidence: 88, x: 45, y: 54, status: "Isolation underway", need: "Utility crew" },
      { name: "Hospital generator fault", source: "Field report", severity: "medium", confidence: 81, x: 48, y: 63, status: "Supply routed", need: "Generator tech" },
    ],
    routes: [
      { name: "Ambulance Grid 2", from: "Downtown Core", to: "CPMC Van Ness", people: 9, eta: 19, status: "active", constraint: "Avoid Embarcadero", points: [[50, 48], [46, 43], [43, 39]] },
      { name: "Evac Fill-W", from: "Waterfront Fill", to: "Kezar Pavilion", people: 3100, eta: 38, status: "rerouted", constraint: "No I-80 bridge", points: [[58, 52], [49, 51], [38, 50], [30, 49]] },
      { name: "Supply Gen-4", from: "Logistics yard", to: "UCSF Mission Bay", people: 0, eta: 31, status: "queued", constraint: "Generator and diesel", points: [[24, 79], [34, 70], [44, 64], [48, 63]] },
    ],
    calls: [
      { name: "Elevator entrapment", language: "English", severity: "high", confidence: 92, x: 47, y: 44, transcript: "Six people are stuck in an elevator and the building alarms are going off.", status: "Rescue unit routed" },
      { name: "Gas smell in apartment", language: "Chinese", severity: "high", confidence: 84, x: 45, y: 55, transcript: "We smell gas and cannot reach the shutoff.", status: "Utility isolation" },
      { name: "Injury at shelter line", language: "Spanish", severity: "medium", confidence: 83, x: 50, y: 50, transcript: "Una persona se cayo y necesita atencion medica.", status: "Medic dispatched" },
    ],
    alerts: {
      en: "Expect aftershocks. Drop, cover, and hold on during shaking. Avoid waterfront streets, damaged buildings, and bridges until inspected. Text instead of calling when possible.",
      es: "Espere replicas. Agachese, cubrase y sujetese durante el movimiento. Evite calles costeras, edificios danados y puentes hasta que sean inspeccionados.",
      hi: "Aftershocks ki sambhavana hai. Hilne par jhukkar cover lein aur pakde rahen. Waterfront sadkon, damaged buildings aur bridges se inspection tak door rahen.",
    },
    sitrep: "Urban search, gas isolation, bridge restrictions, and hospital load balancing are the active priorities. cuOpt is avoiding closed waterfront streets and bridge approaches.",
  },
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { scenarios };
}

const state = {
  scenarios,
  scenarioId: "helene",
  forecastIndex: 0,
  cycle: 0,
  live: true,
  speed: 1600,
  view: "forecast",
  remote: false,
  connected: false,
  lastUpdate: null,
  selected: null,
  layers: {
    forecast: true,
    damage: true,
    routes: true,
    facilities: true,
    calls: true,
  },
  language: "en",
  loop: [],
  hitTargets: [],
  timer: null,
  eventSource: null,
};

const els = {};

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initApp);
}

async function initApp() {
  bindElements();
  hydrateScenarioSelect();
  bindEvents();
  resizeMap();

  const connected = await connectDynamicRuntime();
  if (!connected) {
    runAgentCycle("initial");
    startLiveLoop();
  }
}

function bindElements() {
  Object.assign(els, {
    scenarioSelect: document.querySelector("#scenarioSelect"),
    speedSelect: document.querySelector("#speedSelect"),
    runCycleBtn: document.querySelector("#runCycleBtn"),
    toggleLiveBtn: document.querySelector("#toggleLiveBtn"),
    statusStrip: document.querySelector("#statusStrip"),
    incidentSubhead: document.querySelector("#incidentSubhead"),
    incidentTitle: document.querySelector("#incidentTitle"),
    incidentMeta: document.querySelector("#incidentMeta"),
    map: document.querySelector("#incidentMap"),
    mapMetrics: document.querySelector("#mapMetrics"),
    mapLegend: document.querySelector("#mapLegend"),
    selectionCard: document.querySelector("#selectionCard"),
    forecastRange: document.querySelector("#forecastRange"),
    forecastLead: document.querySelector("#forecastLead"),
    forecastSummary: document.querySelector("#forecastSummary"),
    forecastTicks: document.querySelector("#forecastTicks"),
    opsGrid: document.querySelector("#opsGrid"),
    panelBody: document.querySelector("#panelBody"),
    tabs: document.querySelectorAll(".tab"),
    layerInputs: document.querySelectorAll("[data-layer]"),
    loopLog: document.querySelector("#loopLog"),
    cycleClock: document.querySelector("#cycleClock"),
  });
}

function hydrateScenarioSelect() {
  els.scenarioSelect.innerHTML = state.scenarios
    .map((scenario) => `<option value="${scenario.id}">${escapeHtml(scenario.name)}</option>`)
    .join("");
  els.scenarioSelect.value = state.scenarioId;
}

function bindEvents() {
  els.scenarioSelect.addEventListener("change", async (event) => {
    if (state.remote) {
      await postJson("/api/scenario", { scenarioId: event.target.value });
      return;
    }

    state.scenarioId = event.target.value;
    state.forecastIndex = 0;
    state.cycle = 0;
    state.selected = null;
    state.loop = [];
    runAgentCycle("scenario");
  });

  els.speedSelect.addEventListener("change", async (event) => {
    state.speed = Number(event.target.value);
    if (state.remote) {
      await postJson("/api/speed", { speed: state.speed });
      return;
    }

    if (state.live) startLiveLoop();
  });

  els.runCycleBtn.addEventListener("click", () => runAgentCycle("manual"));

  els.toggleLiveBtn.addEventListener("click", async () => {
    if (state.remote) {
      await postJson("/api/live", { live: !state.live });
      return;
    }

    state.live = !state.live;
    els.toggleLiveBtn.textContent = state.live ? "Pause" : "Resume";
    if (state.live) {
      startLiveLoop();
    } else {
      window.clearInterval(state.timer);
      state.timer = null;
    }
  });

  els.forecastRange.addEventListener("input", (event) => {
    state.forecastIndex = Number(event.target.value);
    render();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.view = tab.dataset.view;
      els.tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      renderPanel();
    });
  });

  els.layerInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.layers[input.dataset.layer] = input.checked;
      drawMap();
    });
  });

  els.map.addEventListener("click", (event) => {
    const rect = els.map.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = state.hitTargets
      .slice()
      .reverse()
      .find((target) => distance(target.x, target.y, x, y) <= target.r);
    state.selected = hit ? hit : null;
    renderSelection();
  });

  window.addEventListener("resize", resizeMap);
}

function startLiveLoop() {
  if (state.remote) return;
  window.clearInterval(state.timer);
  state.timer = window.setInterval(() => {
    if (state.live) runAgentCycle("auto");
  }, state.speed);
}

function getScenario() {
  return state.scenarios.find((scenario) => scenario.id === state.scenarioId) || state.scenarios[0];
}

function getForecast() {
  const scenario = getScenario();
  return scenario.forecasts[state.forecastIndex] || scenario.forecasts[0];
}

async function runAgentCycle(source) {
  if (state.remote) {
    await postJson("/api/cycle", { source });
    return;
  }

  const scenario = getScenario();
  if (source !== "initial" && source !== "scenario") {
    state.forecastIndex = (state.forecastIndex + 1) % scenario.forecasts.length;
  }
  state.cycle += 1;

  const forecast = getForecast();
  const criticalDamage = scenario.damage.filter((item) => item.severity === "critical").length;
  const closedRoads = scenario.roads.filter((road) => road.status === "closed").length;
  const highCalls = scenario.calls.filter((call) => ["critical", "high"].includes(call.severity)).length;
  const topRoute = scenario.routes[(state.cycle - 1) % scenario.routes.length];

  state.loop.unshift({
    cycle: state.cycle,
    lead: forecast.lead,
    title: `${scenario.trigger}: ${scenario.place}`,
    actions: [
      `${scenario.type === "earthquake" ? "USGS/Earth-2" : "Earth-2"} risk ${forecast.risk}% with ${forecast.confidence}% confidence`,
      `Vision triage marked ${criticalDamage} critical scenes and ${closedRoads} closed roads`,
      `cuOpt refreshed ${topRoute.name} toward ${topRoute.to} in ${topRoute.eta} min`,
      `Nemotron drafted public alert and responder brief for ${scenario.alerts.en.length} characters`,
      `ASR escalated ${highCalls} high-priority calls for dispatch review`,
    ],
  });

  state.loop = state.loop.slice(0, 7);
  els.forecastRange.value = String(state.forecastIndex);
  render();
}

async function connectDynamicRuntime() {
  try {
    const snapshot = await fetchState();
    applyServerState(snapshot);
    startEventStream();
    return true;
  } catch {
    state.remote = false;
    state.connected = false;
    return false;
  }
}

async function fetchState() {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) throw new Error(`State request failed: ${response.status}`);
  return response.json();
}

function startEventStream() {
  if (!("EventSource" in window)) {
    window.setInterval(async () => {
      if (!state.remote) return;
      try {
        applyServerState(await fetchState());
      } catch {
        state.connected = false;
        render();
      }
    }, 2500);
    return;
  }

  if (state.eventSource) state.eventSource.close();
  state.eventSource = new EventSource("/events");
  state.eventSource.addEventListener("open", () => {
    state.connected = true;
    render();
  });
  state.eventSource.addEventListener("state", (event) => {
    applyServerState(JSON.parse(event.data));
  });
  state.eventSource.addEventListener("error", () => {
    state.connected = false;
    render();
  });
}

function applyServerState(snapshot) {
  state.remote = true;
  state.connected = true;
  state.scenarios = snapshot.scenarios || state.scenarios;
  state.scenarioId = snapshot.scenarioId || state.scenarioId;
  state.forecastIndex = Number(snapshot.forecastIndex || 0);
  state.cycle = Number(snapshot.cycle || 0);
  state.live = Boolean(snapshot.live);
  state.speed = Number(snapshot.speed || state.speed);
  state.loop = Array.isArray(snapshot.loop) ? snapshot.loop : state.loop;
  state.lastUpdate = snapshot.updatedAt || null;

  hydrateScenarioSelect();
  els.scenarioSelect.value = state.scenarioId;
  els.speedSelect.value = String(state.speed);
  els.toggleLiveBtn.textContent = state.live ? "Pause" : "Resume";
  els.forecastRange.value = String(state.forecastIndex);
  render();
}

async function postJson(path, payload) {
  if (!state.remote) return null;

  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const snapshot = await response.json();
    applyServerState(snapshot);
    return snapshot;
  } catch (error) {
    state.connected = false;
    render();
    return null;
  }
}

function render() {
  const scenario = getScenario();
  const forecast = getForecast();
  els.forecastRange.max = String(scenario.forecasts.length - 1);
  els.incidentSubhead.textContent = `${scenario.place} - ${scenario.leadText}`;
  els.incidentTitle.textContent = scenario.name;
  els.incidentMeta.textContent = `${scenario.clock} - ${scenario.trigger} - ${scenario.metrics.responderTeams} responder teams`;

  els.statusStrip.innerHTML = [
    chip(`${forecast.risk}% risk`, riskTone(forecast.risk)),
    chip(`${scenario.metrics.evacuees.toLocaleString()} evacuees`, "purple"),
    chip(`${openHospitalCapacity(scenario)} beds open`, openHospitalCapacity(scenario) < 25 ? "danger" : "ok"),
    chip(state.live ? "Live loop" : "Paused", state.live ? "ok" : "warn"),
    chip(state.remote ? (state.connected ? "API stream" : "API reconnecting") : "Local fallback", state.connected ? "ok" : "warn"),
  ].join("");

  els.forecastLead.textContent = forecast.lead;
  els.forecastSummary.textContent = forecast.note;
  els.forecastTicks.innerHTML = scenario.forecasts
    .map((item) => `<span>${escapeHtml(item.lead)}</span>`)
    .join("");

  renderMapMetrics();
  renderLegend();
  renderOpsGrid();
  renderPanel();
  renderLoop();
  drawMap();
}

function renderMapMetrics() {
  const scenario = getScenario();
  const forecast = getForecast();
  const closedRoads = scenario.roads.filter((road) => road.status === "closed").length;
  const shelterUse = shelterLoad(scenario);
  els.mapMetrics.innerHTML = `
    <div class="metric-stack">
      ${metricRow("Risk index", `${forecast.risk}%`)}
      ${metricRow(labelForWater(scenario), `${forecast.water}%`)}
      ${metricRow("Road closures", closedRoads)}
      ${metricRow("Shelter load", `${shelterUse}%`)}
    </div>
  `;
}

function renderLegend() {
  const hazardColor = getScenario().type === "wildfire" ? "#d1542f" : getScenario().type === "earthquake" ? "#6247aa" : "#2477b9";
  els.mapLegend.innerHTML = [
    legendRow(hazardColor, "Forecast hazard"),
    legendRow("#bd3932", "Critical damage"),
    legendRow("#26744c", "Optimized route"),
    legendRow("#17202a", "Shelter or hospital"),
  ].join("");
}

function renderOpsGrid() {
  const scenario = getScenario();
  const forecast = getForecast();
  const severeItems = scenario.damage.filter((item) => ["critical", "high"].includes(item.severity)).length;
  const routeLoad = scenario.routes.reduce((sum, route) => sum + route.people, 0);
  const openBeds = openHospitalCapacity(scenario);

  els.opsGrid.innerHTML = [
    opsCard("Forecast", `${forecast.risk}%`, forecast.note),
    opsCard("Damage", severeItems, `${scenario.damage.length} vision and field items in triage.`),
    opsCard("Routing", routeLoad.toLocaleString(), `${scenario.routes.length} cuOpt plans active or queued.`),
    opsCard("Medical", openBeds, `${scenario.metrics.ambulances} ambulances across ${scenario.hospitals.length} hospitals.`),
  ].join("");
}

function renderPanel() {
  const active = document.activeElement;
  if (active && els.panelBody.contains(active) && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) {
    return;
  }

  const scenario = getScenario();
  const forecast = getForecast();
  const renderer = {
    forecast: renderForecastPanel,
    damage: renderDamagePanel,
    routing: renderRoutingPanel,
    comms: renderCommsPanel,
    calls: renderCallsPanel,
    ingest: renderIngestPanel,
    nims: renderNimsPanel,
  }[state.view];
  els.panelBody.innerHTML = renderer ? renderer(scenario, forecast) : "";

  const copyButtons = els.panelBody.querySelectorAll("[data-copy]");
  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const target = els.panelBody.querySelector(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.value || target.textContent);
        button.textContent = "Copied";
        window.setTimeout(() => (button.textContent = "Copy"), 1200);
      } catch {
        button.textContent = "Select Text";
        window.setTimeout(() => (button.textContent = "Copy"), 1400);
      }
    });
  });

  const languageSelect = els.panelBody.querySelector("#languageSelect");
  if (languageSelect) {
    languageSelect.addEventListener("change", (event) => {
      state.language = event.target.value;
      const alertBox = els.panelBody.querySelector("#alertText");
      alertBox.value = scenario.alerts[event.target.value];
    });
  }

  const reportForm = els.panelBody.querySelector("#reportForm");
  if (reportForm) {
    reportForm.addEventListener("submit", submitReport);
  }
}

function renderForecastPanel(scenario) {
  const rows = scenario.forecasts
    .map(
      (forecast) => `
        <tr>
          <td>${forecast.lead}</td>
          <td>${forecast.rain}%</td>
          <td>${forecast.wind}%</td>
          <td>${forecast.water}%</td>
          <td><span class="severity ${riskClass(forecast.risk)}">${forecast.risk}%</span></td>
        </tr>
      `,
    )
    .join("");

  return `
    <div class="panel-stack">
      <div class="panel-card">
        <div class="split-row">
          <div>
            <h3>${scenario.type === "earthquake" ? "Hazard Surface" : "Weather Forecast"}</h3>
            <p>${escapeHtml(scenario.forecasts[state.forecastIndex].note)}</p>
          </div>
          <span class="severity ${riskClass(getForecast().risk)}">${getForecast().confidence}% conf</span>
        </div>
        <div class="progress ${riskClass(getForecast().risk)}"><span style="width:${getForecast().risk}%"></span></div>
      </div>
      <div class="panel-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>${labelForPrecip(scenario)}</th>
              <th>Wind</th>
              <th>${labelForWater(scenario)}</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${scenario.zones.map(zoneCard).join("")}
    </div>
  `;
}

function renderDamagePanel(scenario) {
  return `
    <div class="panel-stack">
      ${scenario.damage
        .map(
          (item) => `
            <article class="damage-card">
              <div class="split-row">
                <h3>${escapeHtml(item.name)}</h3>
                <span class="severity ${item.severity}">${item.severity}</span>
              </div>
              <p>${escapeHtml(item.status)}. Need: ${escapeHtml(item.need)}.</p>
              <div class="meta-row">
                <span class="mini-chip">${escapeHtml(item.source)}</span>
                <span class="mini-chip">${item.confidence}% confidence</span>
                <span class="mini-chip">${Math.round(distance(item.x, item.y, scenario.center[0], scenario.center[1]))} km grid</span>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRoutingPanel(scenario) {
  return `
    <div class="panel-stack">
      ${scenario.routes
        .map(
          (route) => `
            <article class="route-card">
              <div class="split-row">
                <h3>${escapeHtml(route.name)}</h3>
                <span class="severity ${route.status === "active" ? "low" : route.status === "rerouted" ? "watch" : "medium"}">${route.status}</span>
              </div>
              <p>${escapeHtml(route.from)} to ${escapeHtml(route.to)} - ${route.eta} min ETA</p>
              <div class="meta-row">
                <span class="mini-chip">${route.people ? `${route.people.toLocaleString()} people` : "Supply run"}</span>
                <span class="mini-chip">${escapeHtml(route.constraint)}</span>
              </div>
            </article>
          `,
        )
        .join("")}
      <div class="panel-card">
        <h3>Shelter Capacity</h3>
        <p>${shelterLoad(scenario)}% occupied across ${scenario.shelters.length} open shelters.</p>
        <div class="progress ${shelterLoad(scenario) > 85 ? "danger" : "warn"}">
          <span style="width:${shelterLoad(scenario)}%"></span>
        </div>
      </div>
    </div>
  `;
}

function renderCommsPanel(scenario) {
  return `
    <div class="panel-stack">
      <div class="panel-card">
        <div class="split-row">
          <h3>Public Alert</h3>
          <label class="field compact">
            <span>Language</span>
            <select id="languageSelect">
              <option value="en" ${state.language === "en" ? "selected" : ""}>English</option>
              <option value="es" ${state.language === "es" ? "selected" : ""}>Spanish</option>
              <option value="hi" ${state.language === "hi" ? "selected" : ""}>Hindi</option>
            </select>
          </label>
        </div>
        <div class="textarea-shell">
          <textarea id="alertText">${escapeHtml(scenario.alerts[state.language] || scenario.alerts.en)}</textarea>
          <button class="button" type="button" data-copy="#alertText">Copy</button>
        </div>
      </div>
      <div class="panel-card">
        <div class="split-row">
          <h3>Situation Report</h3>
          <button class="button" type="button" data-copy="#sitrepText">Copy</button>
        </div>
        <textarea id="sitrepText">${escapeHtml(buildSitrep(scenario))}</textarea>
      </div>
    </div>
  `;
}

function renderCallsPanel(scenario) {
  return `
    <div class="panel-stack">
      ${scenario.calls
        .map(
          (call) => `
            <article class="call-card">
              <div class="split-row">
                <h3>${escapeHtml(call.name)}</h3>
                <span class="severity ${call.severity}">${call.severity}</span>
              </div>
              <p>${escapeHtml(call.transcript)}</p>
              <div class="meta-row">
                <span class="mini-chip">${escapeHtml(call.language)}</span>
                <span class="mini-chip">${call.confidence}% ASR confidence</span>
                <span class="mini-chip">${escapeHtml(call.status)}</span>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderIngestPanel() {
  return `
    <form class="report-form" id="reportForm">
      <div class="panel-stack">
        <div class="panel-card">
          <div class="split-row">
            <h3>Live Report</h3>
            <span class="severity ${state.remote && state.connected ? "low" : "medium"}">${state.remote && state.connected ? "connected" : "local"}</span>
          </div>
          <div class="form-grid">
            <label class="field">
              <span>Type</span>
              <select name="type">
                <option value="call">Emergency call</option>
                <option value="damage">Damage report</option>
                <option value="road">Road closure</option>
                <option value="shelter">Shelter update</option>
              </select>
            </label>
            <label class="field">
              <span>Severity</span>
              <select name="severity">
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label class="field">
              <span>Location</span>
              <input name="title" type="text" value="New field report" maxlength="70" />
            </label>
            <label class="field">
              <span>Language</span>
              <select name="language">
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="Hindi">Hindi</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>
          <label class="field full">
            <span>Details</span>
            <textarea name="details">Responder reports a blocked route and requests rerouting.</textarea>
          </label>
          <div class="form-actions">
            <button class="button primary" type="submit">Submit Report</button>
            <span id="reportStatus" class="muted">Ready</span>
          </div>
        </div>
        <div class="panel-card">
          <h3>Latest Intake</h3>
          <p>${state.loop[0] ? escapeHtml(state.loop[0].actions[0]) : "No intake yet."}</p>
        </div>
      </div>
    </form>
  `;
}

function renderNimsPanel(scenario) {
  return `
    <div class="panel-stack">
      ${scenario.tools
        .map(
          ([name, detail, health]) => `
            <article class="tool-card">
              <div class="split-row">
                <h3>${escapeHtml(name)}</h3>
                <span class="severity ${health > 92 ? "low" : health > 84 ? "medium" : "watch"}">${health}%</span>
              </div>
              <p>${escapeHtml(detail)}</p>
              <div class="progress ${health > 92 ? "" : health > 84 ? "warn" : "danger"}">
                <span style="width:${health}%"></span>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

async function submitReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector("#reportStatus");
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.scenarioId = state.scenarioId;

  if (status) status.textContent = "Submitting";

  if (state.remote) {
    const snapshot = await postJson("/api/report", payload);
    if (status) status.textContent = snapshot ? "Accepted" : "Retry needed";
    if (snapshot) form.reset();
    return;
  }

  addLocalReport(payload);
  if (status) status.textContent = "Accepted locally";
  form.reset();
  render();
}

function addLocalReport(report) {
  const scenario = getScenario();
  const point = randomIncidentPoint(scenario);
  const severity = report.severity || "high";
  const title = report.title || "New field report";
  const details = report.details || "Responder submitted a new report.";

  if (report.type === "damage") {
    scenario.damage.unshift({
      name: title,
      source: "Field ingest",
      severity,
      confidence: 82,
      x: point.x,
      y: point.y,
      status: "Needs triage",
      need: "Dispatch review",
    });
  } else if (report.type === "road") {
    const road = scenario.roads.find((item) => item.status !== "closed") || scenario.roads[0];
    road.status = severity === "critical" ? "closed" : "restricted";
    scenario.damage.unshift({
      name: title,
      source: "Road ingest",
      severity,
      confidence: 86,
      x: point.x,
      y: point.y,
      status: `${road.name} marked ${road.status}`,
      need: "Traffic control",
    });
  } else if (report.type === "shelter") {
    const shelter = scenario.shelters[0];
    shelter.occupied = Math.min(shelter.capacity, shelter.occupied + 45);
    scenario.metrics.evacuees += 45;
  } else {
    scenario.calls.unshift({
      name: title,
      language: report.language || "English",
      severity,
      confidence: 84,
      x: point.x,
      y: point.y,
      transcript: details,
      status: "Dispatch review",
    });
  }

  state.loop.unshift({
    cycle: state.cycle,
    lead: getForecast().lead,
    title: `Field ingest: ${scenario.place}`,
    actions: [
      `${report.type || "call"} report accepted with ${severity} priority`,
      "Agent loop queued routing, alert, and triage refresh",
      "Local fallback mode updated the active scenario state",
    ],
  });
  state.loop = state.loop.slice(0, 7);
}

function renderLoop() {
  els.cycleClock.textContent = `Cycle ${state.cycle}`;
  els.loopLog.innerHTML = state.loop
    .map(
      (entry) => `
        <li class="loop-item">
          <strong>${escapeHtml(entry.title)} - ${escapeHtml(entry.lead)}</strong>
          <div class="loop-actions">
            ${entry.actions.map((action) => `<span>${escapeHtml(action)}</span>`).join("")}
          </div>
        </li>
      `,
    )
    .join("");
}

function renderSelection() {
  if (!state.selected) {
    els.selectionCard.innerHTML = `
      <div class="selection-title"><strong>Map Selection</strong><span class="mini-chip">Click a marker</span></div>
      <div class="selection-card-text">Shelters, hospitals, calls, routes, and damage markers expose dispatch details here.</div>
    `;
    return;
  }

  const item = state.selected.item;
  const title = item.name || state.selected.kind;
  const meta = [
    item.status,
    item.severity,
    item.source,
    item.to ? `to ${item.to}` : "",
    item.capacity ? `${item.occupied}/${item.capacity} used` : "",
  ]
    .filter(Boolean)
    .join(" - ");
  els.selectionCard.innerHTML = `
    <div class="selection-title">
      <strong>${escapeHtml(title)}</strong>
      <span class="mini-chip">${escapeHtml(state.selected.kind)}</span>
    </div>
    <div class="selection-card-text">${escapeHtml(meta || item.detail || "Operational asset selected.")}</div>
  `;
}

function resizeMap() {
  const rect = els.map.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.map.width = Math.max(320, Math.floor(rect.width * dpr));
  els.map.height = Math.max(300, Math.floor(rect.height * dpr));
  els.map.style.width = `${rect.width}px`;
  els.map.style.height = `${rect.height}px`;
  const ctx = els.map.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawMap();
}

function drawMap() {
  if (!els.map) return;
  const canvas = els.map;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const scenario = getScenario();
  const forecast = getForecast();
  state.hitTargets = [];

  ctx.clearRect(0, 0, width, height);
  drawBase(ctx, width, height, scenario);
  drawRivers(ctx, width, height, scenario);
  drawRoads(ctx, width, height, scenario);
  if (state.layers.forecast) drawHazard(ctx, width, height, scenario, forecast);
  if (state.layers.routes) drawRoutes(ctx, width, height, scenario);
  if (state.layers.facilities) drawFacilities(ctx, width, height, scenario);
  if (state.layers.damage) drawDamage(ctx, width, height, scenario);
  if (state.layers.calls) drawCalls(ctx, width, height, scenario);
  drawMapLabels(ctx, width, height, scenario);
  renderSelection();
}

function drawBase(ctx, width, height, scenario) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#e9eff2");
  gradient.addColorStop(0.55, "#f5f0e7");
  gradient.addColorStop(1, "#e7ece4");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#8796a6";
  ctx.lineWidth = 1;
  const step = Math.max(48, Math.min(width, height) / 7);
  for (let x = -step; x < width + step; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + step * 0.7, height);
    ctx.stroke();
  }
  for (let y = step * 0.5; y < height + step; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y - step * 0.4);
    ctx.stroke();
  }
  ctx.restore();

  scenario.zones.forEach((zone, index) => {
    const point = toCanvas(width, height, zone.x, zone.y);
    ctx.save();
    ctx.globalAlpha = 0.11;
    ctx.fillStyle = index % 2 ? "#087a8f" : "#6247aa";
    drawBlob(ctx, point.x, point.y, zone.radius * width * 0.0045, 7, index * 0.7);
    ctx.fill();
    ctx.restore();
  });
}

function drawRivers(ctx, width, height, scenario) {
  ctx.save();
  ctx.lineCap = "round";
  scenario.rivers.forEach((river) => {
    ctx.beginPath();
    river.forEach((point, index) => {
      const p = toCanvas(width, height, point[0], point[1]);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = scenario.type === "wildfire" ? "rgba(36, 119, 185, 0.38)" : "rgba(36, 119, 185, 0.58)";
    ctx.lineWidth = Math.max(5, width * 0.008);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = Math.max(1, width * 0.002);
    ctx.stroke();
  });
  ctx.restore();
}

function drawRoads(ctx, width, height, scenario) {
  scenario.roads.forEach((road) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    road.points.forEach((point, index) => {
      const p = toCanvas(width, height, point[0], point[1]);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = road.status === "closed" ? "#bd3932" : road.status === "restricted" ? "#b96f14" : "#ffffff";
    ctx.lineWidth = road.status === "closed" ? 7 : 6;
    ctx.globalAlpha = road.status === "open" ? 0.95 : 0.9;
    ctx.stroke();
    ctx.strokeStyle = road.status === "open" ? "#667384" : "rgba(255,255,255,0.82)";
    ctx.lineWidth = road.status === "closed" ? 2 : 1.5;
    if (road.status !== "open") ctx.setLineDash([7, 5]);
    ctx.stroke();
    const mid = road.points[Math.floor(road.points.length / 2)];
    const midPoint = toCanvas(width, height, mid[0], mid[1]);
    state.hitTargets.push({ kind: "road", item: road, x: midPoint.x, y: midPoint.y, r: 18 });
    ctx.restore();
  });
}

function drawHazard(ctx, width, height, scenario, forecast) {
  const riskScale = 0.74 + forecast.risk / 150;
  if (scenario.type === "wildfire") {
    scenario.zones.forEach((zone, index) => {
      const p = toCanvas(width, height, zone.x + index * 1.5, zone.y - index);
      const radius = zone.radius * width * 0.006 * riskScale;
      const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.1, p.x, p.y, radius);
      gradient.addColorStop(0, "rgba(209, 84, 47, 0.56)");
      gradient.addColorStop(0.55, "rgba(185, 111, 20, 0.28)");
      gradient.addColorStop(1, "rgba(80, 80, 80, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    drawWind(ctx, width, height, scenario.center, "#d1542f");
    return;
  }

  if (scenario.type === "cyclone") {
    const center = toCanvas(width, height, scenario.center[0], scenario.center[1]);
    scenario.zones.forEach((zone, index) => {
      const p = toCanvas(width, height, zone.x, zone.y);
      const radius = zone.radius * width * 0.006 * riskScale;
      const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.16, p.x, p.y, radius);
      gradient.addColorStop(0, "rgba(36, 119, 185, 0.45)");
      gradient.addColorStop(0.58, "rgba(8, 122, 143, 0.23)");
      gradient.addColorStop(1, "rgba(36, 119, 185, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = "rgba(8, 122, 143, 0.36)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * (1.15 + index * 0.34), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    drawWind(ctx, width, height, scenario.center, "#087a8f");
    return;
  }

  if (scenario.type === "earthquake") {
    const center = toCanvas(width, height, scenario.center[0], scenario.center[1]);
    [0.65, 1, 1.35].forEach((factor, index) => {
      ctx.save();
      ctx.globalAlpha = 0.25 - index * 0.04;
      ctx.strokeStyle = "#6247aa";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center.x, center.y, width * 0.11 * factor * riskScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    scenario.zones.forEach((zone) => {
      const p = toCanvas(width, height, zone.x, zone.y);
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#6247aa";
      drawBlob(ctx, p.x, p.y, zone.radius * width * 0.005 * riskScale, 9, 0.35);
      ctx.fill();
      ctx.restore();
    });
    return;
  }

  scenario.zones.forEach((zone, index) => {
    const p = toCanvas(width, height, zone.x, zone.y);
    const radius = zone.radius * width * 0.006 * riskScale;
    const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.12, p.x, p.y, radius);
    gradient.addColorStop(0, "rgba(36, 119, 185, 0.52)");
    gradient.addColorStop(0.7, "rgba(8, 122, 143, 0.22)");
    gradient.addColorStop(1, "rgba(36, 119, 185, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = "rgba(36,119,185,0.38)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * (1.12 + index * 0.05), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawWind(ctx, width, height, center, color) {
  const c = toCanvas(width, height, center[0], center[1]);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const y = c.y - 120 + i * 30;
    ctx.beginPath();
    ctx.moveTo(c.x - 190, y);
    ctx.bezierCurveTo(c.x - 90, y - 26, c.x + 30, y + 26, c.x + 180, y - 12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoutes(ctx, width, height, scenario) {
  scenario.routes.forEach((route, index) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    route.points.forEach((point, pointIndex) => {
      const p = toCanvas(width, height, point[0], point[1]);
      if (pointIndex === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = index === 0 ? "#26744c" : index === 1 ? "#087a8f" : "#6247aa";
    ctx.lineWidth = 4;
    if (route.status === "queued") ctx.setLineDash([8, 7]);
    ctx.stroke();
    const last = route.points[route.points.length - 1];
    const p = toCanvas(width, height, last[0], last[1]);
    drawMarker(ctx, p.x, p.y, "#26744c", "route");
    state.hitTargets.push({ kind: "route", item: route, x: p.x, y: p.y, r: 16 });
    ctx.restore();
  });
}

function drawFacilities(ctx, width, height, scenario) {
  scenario.shelters.forEach((shelter) => {
    const p = toCanvas(width, height, shelter.x, shelter.y);
    drawSquare(ctx, p.x, p.y, "#17202a", "#ffffff", "S");
    state.hitTargets.push({ kind: "shelter", item: shelter, x: p.x, y: p.y, r: 16 });
  });

  scenario.hospitals.forEach((hospital) => {
    const p = toCanvas(width, height, hospital.x, hospital.y);
    const fill = hospital.status === "surge" ? "#bd3932" : hospital.status === "limited" ? "#b96f14" : "#26744c";
    drawSquare(ctx, p.x, p.y, fill, "#ffffff", "H");
    state.hitTargets.push({ kind: "hospital", item: hospital, x: p.x, y: p.y, r: 16 });
  });
}

function drawDamage(ctx, width, height, scenario) {
  scenario.damage.forEach((item) => {
    const p = toCanvas(width, height, item.x, item.y);
    const fill = item.severity === "critical" ? "#bd3932" : item.severity === "high" ? "#d1542f" : "#b96f14";
    drawTriangle(ctx, p.x, p.y, fill);
    state.hitTargets.push({ kind: "damage", item, x: p.x, y: p.y, r: 17 });
  });
}

function drawCalls(ctx, width, height, scenario) {
  scenario.calls.forEach((call) => {
    const p = toCanvas(width, height, call.x, call.y);
    const fill = call.severity === "critical" ? "#bd3932" : call.severity === "high" ? "#b96f14" : "#087a8f";
    drawMarker(ctx, p.x, p.y, fill, "call");
    state.hitTargets.push({ kind: "call", item: call, x: p.x, y: p.y, r: 16 });
  });
}

function drawMapLabels(ctx, width, height, scenario) {
  ctx.save();
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.fillStyle = "rgba(23,32,42,0.72)";
  ctx.shadowColor = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = 5;
  scenario.zones.forEach((zone) => {
    const p = toCanvas(width, height, zone.x, zone.y);
    ctx.fillText(zone.name, p.x + 10, p.y - 12);
  });
  ctx.restore();
}

function drawMarker(ctx, x, y, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSquare(ctx, x, y, fill, textColor, label) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundedRect(ctx, x - 10, y - 10, 20, 20, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
}

function drawTriangle(ctx, x, y, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x + 10, y + 9);
  ctx.lineTo(x - 10, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBlob(ctx, x, y, radius, points, phase) {
  ctx.beginPath();
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const wave = 1 + Math.sin(angle * 2 + phase) * 0.12 + Math.cos(angle * 3 - phase) * 0.08;
    const px = x + Math.cos(angle) * radius * wave;
    const py = y + Math.sin(angle) * radius * wave;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function toCanvas(width, height, x, y) {
  return {
    x: (x / 100) * width,
    y: (y / 100) * height,
  };
}

function chip(label, tone) {
  return `<span class="chip ${tone || ""}">${escapeHtml(label)}</span>`;
}

function metricRow(label, value) {
  return `<div class="metric-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function legendRow(color, label) {
  return `<div class="legend-row"><span class="legend-swatch" style="background:${color}"></span><span>${escapeHtml(label)}</span></div>`;
}

function opsCard(title, value, detail) {
  return `
    <article class="ops-card">
      <h3>${escapeHtml(title)}</h3>
      <strong class="big-number">${escapeHtml(String(value))}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}

function zoneCard(zone) {
  return `
    <article class="panel-card">
      <div class="split-row">
        <h3>${escapeHtml(zone.name)}</h3>
        <span class="severity ${zone.severity}">${zone.severity}</span>
      </div>
      <p>${escapeHtml(zone.detail)}</p>
    </article>
  `;
}

function buildSitrep(scenario) {
  const forecast = getForecast();
  const closed = scenario.roads.filter((road) => road.status === "closed").map((road) => road.name);
  const critical = scenario.damage.filter((item) => item.severity === "critical").map((item) => item.name);
  return [
    `${scenario.name} - ${scenario.clock}`,
    `Forecast: ${forecast.note} Current risk index is ${forecast.risk}% with ${forecast.confidence}% model confidence.`,
    `Routing: ${scenario.routes.length} active cuOpt plans, ${scenario.metrics.evacuees.toLocaleString()} evacuees tracked, shelter load at ${shelterLoad(scenario)}%.`,
    `Damage: critical items include ${critical.join(", ") || "none"}. Closed roads: ${closed.join(", ") || "none"}.`,
    `Commander's intent: ${scenario.sitrep}`,
  ].join("\n\n");
}

function openHospitalCapacity(scenario) {
  return scenario.hospitals.reduce((sum, hospital) => sum + Math.max(0, hospital.capacity - hospital.occupied), 0);
}

function shelterLoad(scenario) {
  const totals = scenario.shelters.reduce(
    (acc, shelter) => {
      acc.capacity += shelter.capacity;
      acc.occupied += shelter.occupied;
      return acc;
    },
    { capacity: 0, occupied: 0 },
  );
  return Math.round((totals.occupied / totals.capacity) * 100);
}

function riskTone(value) {
  if (value >= 88) return "danger";
  if (value >= 70) return "warn";
  return "ok";
}

function riskClass(value) {
  if (value >= 88) return "critical";
  if (value >= 70) return "high";
  if (value >= 55) return "medium";
  return "low";
}

function labelForWater(scenario) {
  if (scenario.type === "wildfire") return "Ember risk";
  if (scenario.type === "earthquake") return "Lifeline risk";
  if (scenario.type === "cyclone") return "Surge risk";
  return "Flood depth";
}

function labelForPrecip(scenario) {
  if (scenario.type === "wildfire") return "Dryness";
  if (scenario.type === "earthquake") return "Shake";
  return "Rain";
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function randomIncidentPoint(scenario) {
  const zone = scenario.zones[Math.floor(Math.random() * scenario.zones.length)] || { x: 50, y: 50 };
  return {
    x: clampNumber(zone.x + Math.random() * 12 - 6, 6, 94),
    y: clampNumber(zone.y + Math.random() * 12 - 6, 6, 94),
  };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
