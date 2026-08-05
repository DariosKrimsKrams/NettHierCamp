# Nett Hier Camp

Statische Party-Website mit einer Live-Umfrage ("Wer muss JETZT Ahoj trinken?"),
gehostet auf Netlify. Der Server-Teil läuft über Netlify Functions,
die Umfrage-Daten liegen in Netlify Blobs (kein externer DB-Account nötig).

## Struktur

- `public/` – statische Website (HTML/CSS/JS), das ist der Netlify "publish"-Ordner
- `netlify/functions/` – die 3 API-Endpunkte
  - `GET  /api/poll-status` – aktueller Umfrage-Status
  - `POST /api/start-poll`  – Umfrage mit 3 Namen starten
  - `POST /api/vote`        – für einen Namen abstimmen
- `netlify/lib/pollStore.js` – gemeinsame Hilfsfunktionen (Netlify Blobs Zugriff)

## Spielregeln

- Einmal pro Stunde (ab der vollen Stunde) ist die Umfrage "entsperrt".
- Wer als Erste(r) 3 Namen einträgt und absendet, startet die Umfrage.
- 3 Minuten lang kann jeder ohne Login abstimmen (1 Stimme pro Browser).
- Nach Ablauf wird der Name mit den meisten Stimmen öffentlich mit
  "… muss 'n Ahoj trinken! Prost!" angezeigt, bis zur nächsten vollen Stunde.

## Lokal starten

```bash
npm install
npx netlify dev
```

Das startet die Website inkl. Functions lokal (Standard: http://localhost:8888).

## Deployment

```bash
npx netlify deploy --prod
```

Netlify Blobs braucht keine zusätzliche Konfiguration – es funktioniert automatisch,
sobald die Seite auf Netlify gehostet ist (auch im lokalen `netlify dev`).
