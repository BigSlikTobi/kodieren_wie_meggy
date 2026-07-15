# Kodierpfad

Klickbarer Machbarkeitsprototyp für einen adaptiven Kodierworkflow im Krankenhaus.

## Start

```bash
npm install
npm run dev
```

Die App öffnet sich unter `http://localhost:5173`.

Wegen des Doppelpunkts im Namen des Projektordners baut `npm run dev` zuerst die App und startet anschließend eine lokale Vorschau. Änderungen werden nach einem Neustart des Befehls sichtbar.

## Prüfen

```bash
npm test
npm run build
```

Der besondere Test-Runner umgeht ein lokales Werkzeugproblem mit dem Doppelpunkt im Namen dieses Projektordners. Er kopiert die Testquellen nur temporär und verändert das Projekt nicht.

## Grenzen des Prototyps

- Alle medizinischen Kodes und Grouper-Ergebnisse sind illustrative Demodaten.
- Uploads speichern nur Dateiname und Typ im Browser.
- Der Grouper wird über eine austauschbare Mock-Schnittstelle simuliert.
- Es gibt kein Backend, keine Benutzerverwaltung und keine KIS-Anbindung.
- Lokale Daten können oben rechts vollständig zurückgesetzt werden.
