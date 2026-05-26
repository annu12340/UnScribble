# Climate Incident Command Center

Dynamic prototype for a real-time disaster response platform that combines forecast risk, damage triage, routing, multilingual alerts, emergency calls, and an agent loop in one command-center UI.

Run the local server:

```bash
node server.js
```

Then open the printed localhost URL.

## What is implemented

- Historical/drill replay selector for Hurricane Helene flooding, Valencia flooding, cyclone landfall, wildfire, and earthquake scenarios.
- Live agent cycle that simulates Earth-2/FourCastNet/CorrDiff forecasting, Vision NIM damage triage, cuOpt routing, Nemotron alert drafting, and ASR call classification.
- Node API server with mutable incident state, server-sent events, live pause/resume, speed control, scenario switching, and report ingestion.
- Canvas operational map with forecast hazard overlays, road status, shelters, hospitals, routes, damage markers, and calls.
- Panels for forecast tables, damage assessment, evacuation/ambulance/supply routing, multilingual public alerts, situation reports, calls, report ingest, and NIM/tool health.

## Integration notes

The app uses local simulated adapters because Earth-2, cuOpt, and NIM deployments require credentials and endpoint-specific payloads. The dynamic API in `server.js` is the replacement point for live Earth-2, cuOpt, Vision NIM, LLM NIM, ASR, OSM, NOAA, and USGS integrations.

Useful endpoints:

- `GET /api/state`
- `POST /api/cycle`
- `POST /api/scenario`
- `POST /api/live`
- `POST /api/speed`
- `POST /api/report`
- `GET /events`
