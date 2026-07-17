# Adaptive Krankenhauskodierung – Projektzusammenfassung

> Stand: 17. Juli 2026
>
> Status: Fach- und UX-Konzept mit klickbarem Machbarkeitsprototyp
>
> Öffentliche Demo: <https://kodierpfad-adaptive-kodierung.bigsliktobi.chatgpt.site/>
>
> Wichtig: Alle medizinischen Kodes, Grouper-Ergebnisse und Fallinformationen im Prototyp sind illustrative Demodaten.

## 1. Ziel des Projekts

Das Projekt soll die fallabschließende Krankenhauskodierung neu organisieren. Kodierfachkräfte sollen einen Fall nicht mehr vollständig von Detail zu Detail durcharbeiten, bevor sie die wirtschaftlich und fachlich relevante Fallstruktur erkennen.

Der neue Ansatz beginnt mit einer groben, plausiblen DRG-Hypothese. Danach wird gezielt geprüft, welche Informationen diese Hypothese bestätigen, verändern oder ausschließen können. Die Kodierung wird schrittweise präzisiert. Aufwand entsteht dort, wo er das Gruppierungsergebnis, ein Entgelt, die Regelkonformität oder die Beleglage beeinflussen kann.

Das Ziel ist nicht die teuerste und auch nicht die günstigste Abrechnung. Das Ziel ist eine möglichst sichere, regelkonforme und belegte Abrechnung mit angemessenem Zeitaufwand:

- richtige DRG und Basis-DRG,
- richtige Haupt- und Nebendiagnosen nach ICD-10-GM,
- richtige Prozeduren nach OPS,
- richtige Zusatzentgelte und NUB-Entgelte,
- richtige Berücksichtigung von Komplexbehandlungen, PCCL und technischen Grouper-Werten,
- nachvollziehbare Anwendung der Deutschen Kodierrichtlinien,
- belastbare Dokumentennachweise,
- dokumentierte Restunsicherheiten,
- bei Bedarf eine medizinische Begründung der vollstationären Behandlung.

## 2. Ausgangslage

Heute lesen Kodierfachkräfte häufig die gesamte Patientenakte. Sie übersetzen einzelne Passagen in ICD-10-GM und OPS, ergänzen die Kodierung und geben das Ergebnis in einen Grouper. Aus der Kodierung entstehen DRG, Zusatzentgelte und NUB-relevante Informationen. Diese fließen gemeinsam mit weiteren Falldaten über den Datenaustausch nach § 301 SGB V in die Abrechnung ein.

Dieses Vorgehen folgt meist der Richtung **klein nach groß**:

1. Dokumente lesen.
2. Einzelinformationen kodieren.
3. Alles zusammenführen.
4. Grouping durchführen.
5. Darauf hoffen, dass die richtige Fallpauschale getroffen wurde.

Das erzeugt drei Probleme:

- Viele erhobene Details haben keinen Einfluss auf DRG oder andere Entgelte.
- Wenige hochrelevante Details können das Ergebnis massiv verändern und müssen besonders genau geprüft werden.
- Ohne sichtbaren Zielpfad fallen Kodierfachkräfte leicht in eine vollständige, aber zeitintensive Aktenprüfung zurück.

## 3. Zielbild: von groß nach klein

Der neue Prozess folgt der Richtung **groß nach klein**:

1. Behandlungskette und Fallcharakter verstehen.
2. Erste DRG- und Kodierhypothese aus Vorkodierung, Verlauf und Krankenhauskontext bilden.
3. Grob groupen.
4. Realistische alternative DRG- und Entgeltpfade erkennen.
5. Nur die entscheidenden Abzweigungen gezielt prüfen.
6. Erforderliche Dokumente oder technische Werte anfordern.
7. Nach jeder relevanten Änderung neu groupen.
8. Unkritische Details pragmatisch vervollständigen.
9. Abschlussvorschlag mit Belegen, Änderungen und Restunsicherheiten erstellen.

Die Puzzle-Analogie beschreibt das Ziel gut: Vor dem Zusammensetzen werden die Teile sortiert. Rand, Farben und auffällige Formen geben zuerst Struktur. Erst danach werden die Details bearbeitet. Das Tool übernimmt diese Vorsortierung, damit ein Mensch nicht zu viele Sachverhalte parallel im Kopf halten muss.

## 4. Fachliche Kernlogik

### 4.1 Erste Fallorientierung

Zu Beginn betrachtet die Kodierfachkraft die Behandlungskette:

- Wie lange war der Patient insgesamt im Krankenhaus?
- In welchen Fachabteilungen und Versorgungsformen war er?
- Wie viele Teilaufenthalte und Fachabteilungswechsel gab es?
- Gab es einen Intensivaufenthalt?
- Welche Fachabteilung und Behandlungsform waren vermutlich führend?
- Gab es invasive oder nicht-invasive Diagnostik?
- Gab es therapeutische Eingriffe oder Operationen?
- Gab es konservative oder aufwendige medikamentöse Therapien?
- Gab es Komplexbehandlungen, Organersatzverfahren, Beatmung, Chemotherapie, Transfusionen oder zusatzentgeltfähige Medikamente?

Aus zeitlicher Reihenfolge, Größenordnung und Ereignissen entsteht eine erste Arbeitshypothese.

Beispiel: Ein Patient liegt zwei Tage in der Pneumologie. Dort erfolgt eine invasive Diagnostik. Danach liegt er 14 Tage in der Onkologie und erhält eine medikamentöse Therapie. Eine plausible Arbeitshypothese ist:

1. Aufnahme wegen eines pulmonalen Symptoms.
2. Auffälliger Röntgenbefund.
3. Bronchoskopische Biopsie.
4. Nachweis eines Karzinoms.
5. Verlegung in die Onkologie.
6. Ersttherapie, zum Beispiel Chemotherapie.

Diese Hypothese wird zuerst gegen Vorkodierung und Grouper-Ergebnis geprüft. Erst wenn sie nicht passt oder mehrere realistische Pfade offen sind, beginnt eine detailliertere Prüfung.

### 4.2 Reine und unreine Fälle

Ein **reiner Fall** ist im Grundsatz ein Fall ohne Fachabteilungswechsel und ohne Intensivaufenthalt. Er spricht für einen standardisierten Patientenversorgungsprozess.

Diese Regel ist eine Heuristik, kein starres Abrechnungsgesetz. Ausnahmen sind wichtig:

- Ein kurzer postoperativer Überwachungsaufenthalt auf Intensivstation kann in bestimmten Fachgebieten, etwa der Herzchirurgie, trotzdem standardnah sein.
- Ein Fall ohne Fachabteilungswechsel kann durch mehrere Operationen, Revisionen oder Komplikationen unrein und komplex werden.
- Fachabteilungswechsel oder unerwartete Intensivbehandlung sind starke Hinweise auf einen nicht standardisierten Verlauf.

Der Prototyp verwendet deshalb drei verständliche Klassen:

- **standardnah**,
- **prüfbedürftig**,
- **komplex**.

Zusätzlich wird erklärt, warum die Einstufung entstanden ist. Ein abstrakter KI-Sicherheitswert wird bewusst nicht verwendet.

### 4.3 Typisch oder untypisch für das Krankenhaus

Ein Fall soll nicht nur medizinisch, sondern auch im Kontext des behandelnden Hauses eingeordnet werden:

- Ist die Behandlungskette für dieses Krankenhaus und diesen Standort typisch?
- Kommt der vermutete DRG-Pfad dort historisch vor?
- Passen Fachabteilung, OPS, Hauptdiagnose und Behandlungsform zu öffentlich bekannten Qualitätsdaten?
- Gibt es vergleichbare Fälle aus den vergangenen zwei Jahren?
- Besitzt das Haus die nötigen Strukturmerkmale?
- Ist eine Leistung an diesem Standort überhaupt plausibel oder strukturell ausgeschlossen?

Die Einstufung kann technisch aus historischen und strukturellen Daten entstehen. Sie muss aber manuell änderbar bleiben. Angezeigt werden mindestens:

- typisch,
- untypisch,
- ungeklärt,
- Begründung,
- Zahl vergleichbarer Fälle oder Hinweis auf fehlende Daten.

Diese Information ist eine Orientierung. Sie ersetzt keine fallbezogene Prüfung und keine DKR.

### 4.4 Hauptdiagnose, OPS und Basis-DRG

Wenn die erste Hypothese nicht zur Vorkodierung passt oder mehrere relevante Pfade offen sind, wird zuerst die Hauptdiagnose über den Gesamtfall festgelegt.

Der vorgesehene Arbeitsweg ist:

1. Aufnahmebefund und durchgeführte Verfahren im Arztbrief querlesen.
2. Epikrise gezielt lesen.
3. Hauptdiagnose nach den Deutschen Kodierrichtlinien festlegen.
4. Relevante DKR direkt im Arbeitskontext anzeigen.
5. OR-Prozeduren und andere Basis-DRG-relevante OPS prüfen.
6. Basis-DRG ermitteln.
7. Prüfen, durch welche realistischen Diagnosen, Prozeduren, PCCL-Effekte oder Entgelte der aktuelle Pfad noch verlassen werden kann.

Wenn kein realistischer Alternativpfad besteht, darf die restliche Kodierung pragmatisch und ausreichend spezifisch abgeschlossen werden. Wenn ein Alternativpfad besteht, wird nur der dafür benötigte Nachweis detailliert geprüft.

### 4.5 Pneumonie als adaptives Beispiel

Das Pneumoniebeispiel zeigt die gewünschte Logik besonders klar:

- Für eine Pneumonie können beispielsweise 35 ICD-Varianten infrage kommen.
- 31 Varianten führen im betrachteten Demopfad in dieselbe DRG.
- Vier spezielle Varianten könnten eine andere DRG erzeugen.
- Eine Pilzpneumonie wäre beispielsweise nur bei einem belastbaren Nachweis relevant.

Das Tool soll daher nicht alle 35 Varianten gleich intensiv prüfen. Es soll erklären:

> 31 Varianten verändern die aktuelle DRG voraussichtlich nicht. Vier spezielle Varianten können einen anderen Pfad öffnen. Für eine Pilzpneumonie wird ein belastbarer mikrobiologischer Nachweis benötigt. Liegt eine Mikrobiologie des Sputums vor, soll sie gezielt hochgeladen werden. Liegt sie nicht vor, bleibt die wahrscheinlichste ausreichend belegte Pneumoniekodierung bestehen.

Für die spezifische Pneumoniekodierung wurde als Demo-Regel festgelegt:

- passende Bildgebung vorhanden,
- mikrobiologischer Befund vorhanden,
- definierte Kontaminationsgrenze überschritten,
- ärztlicher Zusammenhang zwischen Keim und Pneumonie dokumentiert,
- Ausschlüsse und Jahresversion berücksichtigt.

Die Zahlen und Kodes im Prototyp sind illustrativ. Die produktive Logik muss aus gültigen Regelwerken und echten Grouper-Ergebnissen kommen.

### 4.6 Besondere Entgelt- und Leistungsprüfungen

Die Prüfung wird nach Versorgungssituation angepasst.

Bei Normalstationsfällen sind besonders relevant:

- invasive Diagnostik,
- therapeutische Eingriffe und Operationen,
- aufwendige medikamentöse Verfahren,
- Chemotherapien,
- Bluttransfusionen,
- Medikamente mit Zusatzentgelt- oder NUB-Relevanz,
- onkologische Erkrankungen,
- Gerinnungsstörungen,
- Pilzerkrankungen,
- mögliche Komplexbehandlungen.

Bei Intensivfällen kommen hinzu:

- Organersatzverfahren,
- Beatmungszeiten,
- Intensivbehandlung mit oder ohne Punkteermittlung,
- Altersgrenzen,
- anwendbare Strukturmerkmale,
- passende Intensiv- und Komplexbehandlungs-OPS.

Komplexbehandlungen werden unabhängig davon immer als eigener Prüfbereich betrachtet. Beispiel: Bei einem onkologischen Aufenthalt kann ein palliativmedizinischer Abschnitt relevant sein. Dafür müssen Standort, Struktur, Dauer und Einfluss auf die DRG geprüft werden.

### 4.7 Alter und Behandlungsjahr

Die gültige Kodier- und Entgeltlogik hängt immer vom Behandlungsjahr ab. Krankenhausprofil, Strukturmerkmale, NUB-Vereinbarungen, DKR, ICD-10-GM, OPS und Entgeltregeln müssen passend zum Jahr geladen werden.

Das Alter bei Aufnahme ist ebenfalls früh zu erfassen. Beispiele für altersabhängige Prüfungen sind:

- Neugeborene bis 28 Tage,
- Gewichtslogik bis 365 Tage,
- Intensivkomplexbehandlung für Erwachsene ab einer relevanten Altersgrenze,
- Hybrid-DRG ab 18 Jahren,
- weitere fachspezifische Altersgrenzen.

Der Prototyp zeigt diese Logik als regelbasierte Hinweise. Produktiv müssen die exakten Jahresregeln versioniert und fachlich freigegeben werden.

## 5. Datenaufnahme und Fallfindung

### 5.1 Fallnummer und Fallpool

Die Fallnummer ist ein Pseudonym und im KIS auffindbar. Sie kann als eindeutiger Schlüssel dienen. Fälle können aus einem Pool übernommen werden. Die Zuweisung zu Kodierfachkräften erfolgt aktuell in einer anderen Anwendung. Eine spätere Verbindung beider Systeme ist vorgesehen, aber nicht Bestandteil des Prototyps.

### 5.2 Vier mögliche Eingangswege

Das Tool muss mit sehr unterschiedlichen Datenlagen umgehen können:

1. **Strukturierter Krankenhaus-Batch**

   Aufnahme- und Entlassdaten, Fallnummer, Stationsverlauf, Vorkodierung und technische Werte werden für viele Fälle eingespielt.

2. **Screenshot aus dem KIS**

   Vorkodierung oder Stationsverlauf werden als Screenshot hochgeladen und später technisch erkannt. Im Prototyp wird die Erkennung nur simuliert.

3. **Dokumentbasierte Ableitung**

   Teilaufenthalte und Behandlungskette werden aus Überschriften und Inhalten von Arztbriefen vorgeschlagen. Im Prototyp wird auch dies simuliert.

4. **Manuelle Erfassung**

   Teilaufenthalte, Stationen, Zeiten, Ereignisse und Versorgungsformen werden über Auswahlfelder zusammengestellt, wenn die Informationen im KIS verteilt sind.

Der vorgeschlagene Verlauf muss immer durch eine Kodierfachkraft überprüfbar und korrigierbar sein.

### 5.3 Unterstützte Uploadformen

Für den späteren produktiven Prozess sind vorgesehen:

- durchsuchbare PDF-Dateien,
- TXT-Dateien,
- Bilder und Screenshots,
- strukturierte Exporte der aktuellen Kodierung,
- XLS-Dateien für Strukturmerkmale, NUBs und historische Daten.

Im aktuellen Prototyp werden keine Inhalte verarbeitet. Es werden nur Dateiname, Typ und eine vorbereitete Demoauswertung lokal gespeichert.

### 5.4 Technische Grouper-Werte ohne Dokumentenzwang

Nicht jede Kodierung muss durch ein zusätzliches Dokument im Tool belegt werden. Einige Werte kommen bereits technisch und zuverlässig aus anderen Systemen.

Beispiele:

- Beatmungszeit als Summe,
- Beatmungsintervalle, aus denen eine Summe entsteht,
- fertige Komplexbehandlungs-OPS,
- Zeiträume einer Non-MRE-Isolation,
- OPS mit Leistungsdatum und Uhrzeit.

Beispieldaten:

- Non-MRE-Isolation auf nicht spezieller Isolationseinheit vom 10.07. bis 17.07.2026,
- `8-98g.11` am 10.07.2026 um 11:00 Uhr.

Diese Werte müssen in den Grouper eingehen und in der vollständigen Kodierung sichtbar sein. Das Tool soll aber keinen unnötigen Upload einer Beatmungskurve oder eines anderen Primärnachweises erzwingen, wenn der technische Wert als akzeptierte Quelle geliefert wird.

## 6. Dokumentenlogik

### 6.1 Dokumente sind keine gleichartigen Puzzleteile

Für das Fallverständnis werden Dokumente nach ihrer Funktion getrennt.

**Verlaufsdokumentation** beschreibt einen oder mehrere Teilaufenthalte:

- Aufnahmebericht,
- Verlegungsbericht,
- Entlassungsbericht,
- Arztbrief,
- Visitenverlauf,
- Pflegebericht,
- Intensivbericht.

Ein Arztbrief kann mehrere Aufenthaltsabschnitte zusammenfassen. Ein Intensivaufenthalt besitzt häufig einen eigenen Bericht.

**Ereignisdokumentation** beschreibt ein konkretes Ereignis:

- OP-Bericht,
- Interventionsbericht,
- Endoskopie- oder Katheterbefund,
- Histologie,
- Radiologie,
- Mikrobiologie,
- Medikations- oder Therapienachweis.

Je nach Dokumentart sind typischerweise unterschiedliche Kodes zu erwarten:

- Verlaufsberichte können ICD und OPS enthalten.
- OP- und Interventionsberichte erzeugen häufig OPS und gegebenenfalls ICD.
- Histologie und Mikrobiologie stützen häufig ICD-Spezifikationen.
- Leistungsnachweise stützen Mengen, Zeiten, Medikamente oder Komplexbehandlungen.
- Ein strukturierter Export bildet die vorhandene Vorkodierung ab.

Diese Erwartung ist eine Suchhilfe, keine automatische Kodierentscheidung.

### 6.2 Bewertung zur aktuellen DRG-Hypothese

Jedes Dokument wird relativ zur aktuellen Hypothese bewertet. Die Bewertung kann sich nach einer neuen Grouper-Iteration ändern.

Die vereinbarten Zustände sind:

- **Vorkodierung** – Ausgangspunkt, aber noch kein Fallnachweis.
- **Jetzt klären** – fehlend oder vorhanden, potenziell ergebnisrelevant und priorisiert zu prüfen.
- **Validiert** – vollständig geprüft und für die Hypothese belastbar.
- **Vorläufig stimmig** – grob mit Verlauf und Vorkodierung abgeglichen; Detailprüfung aktuell nicht nötig.
- **Vermutlich nicht relevant** – nach aktuellem Pfad ohne erwarteten Ergebniswechsel.
- **Nachvalidierung nötig** – vorläufig geprüft, aber bei Spezifität oder Widerspruch detailliert zu lesen.

Zusätzlich werden getrennt angezeigt:

- vorhanden oder fehlend,
- grob geprüft oder vollständig validiert,
- verknüpfte Vorkodes,
- erwartete Auswirkung auf DRG, OPS, Entgelte, Vollständigkeit oder MBEG,
- letzte bewertete Iteration,
- Begründung der Einordnung.

Ein fehlender, vermutlich irrelevanter OP-Bericht blockiert den Fall nicht zwingend. Die Operation darf dennoch nicht unkodiert bleiben. Sie kann gegebenenfalls ausreichend unspezifisch aus einem belastbaren Verlaufsbericht übernommen werden. Wird der Eingriff für einen alternativen DRG-Pfad relevant, muss der Originalbericht angefordert und geprüft werden.

### 6.3 Dokumentenlandkarte und Behandlungsverlauf

Die Behandlungskette soll auf einen Blick zeigen:

- Zahl und Reihenfolge der Teilaufenthalte,
- relative Dauer und Bedeutung der Abschnitte,
- Fachabteilungswechsel,
- Normal- und Intensivversorgung,
- relevante invasive und nicht-invasive Diagnostik,
- Interventionen und Operationen,
- konservative Therapien,
- Komplexbehandlungen,
- zugeordnete Verlaufs- und Ereignisdokumente,
- Zahl der verknüpften Kodes.

Die visuelle Lösung verwendet eine zeitproportionale Behandlungslinie. Aufenthalte werden als unterschiedlich lange Abschnitte dargestellt. Ereignisse sitzen als klickbare Marker mit Datum auf der Linie. Dokumentbänder zeigen zusammenfassende Verlaufsdokumentation. Ein Klick auf Aufenthalt, Ereignis oder Dokument öffnet die passende Stelle in der Dokumentenlandkarte.

So sollen auch Fälle mit vier Fachabteilungswechseln, fünf diagnostischen Interventionen und sechs Operationen lesbar bleiben. Details liegen in einem zweiten Screen beziehungsweise Drawer und überfrachten den Hauptscreen nicht.

## 7. Kodierung und Iterationen

### 7.1 Vier Wege zu einer Kodierentscheidung

An jeder Stelle, an der ICD oder OPS ergänzt, geändert, validiert oder entfernt werden können, braucht die Kodierfachkraft dieselben Handlungswege:

1. **Manuell durch die Kodierfachkraft**

   Ein erfahrener Nutzer kann einen ICD oder OPS direkt eingeben, auch ohne vorherige Toolunterstützung.

2. **Vorhandene Vorkodierung übernehmen oder validieren**

   Vorkodes werden sichtbar als ungeprüft, vorläufig geprüft oder validiert geführt.

3. **Gemeinsam mit dem Kodierwiki erarbeiten**

   Grundlagen, DKR, ICD-/OPS-Systematik und medizinische Begriffe werden geklärt. Das Ergebnis kann anschließend in einen Kodierentwurf übernommen werden.

4. **Menschliches Kodierkonsil anfordern**

   Eine spezialisierte Kodierfachkraft beurteilt einen gruppierungsrelevanten oder fachfremden Sachverhalt mit vollständigem Fallkontext.

Die Relevanzeinschätzung allein reicht nicht. Ein relevanter Sachverhalt muss im selben Arbeitskontext fachlich abgeschlossen werden können.

### 7.2 Kodierung aus Dokumenten

Jedes Dokument kann Kodes erzeugen. Im Dokumentdetail werden deshalb angezeigt:

- bereits verknüpfte ICD und OPS,
- Herkunft und Leistungsdatum,
- Verhältnis zur Vorkodierung,
- Belegstatus,
- bewertete Iteration.

Die Kodierfachkraft kann direkt aus dem Dokument:

- einen ICD oder OPS ergänzen,
- einen vorhandenen Kode ändern,
- einen Vorkode validieren,
- einen Kode löschen beziehungsweise zur Löschung im KIS markieren.

### 7.3 Neue Iteration nach jeder relevanten Änderung

Jede relevante Kodier- oder Nachweisänderung erzeugt einen neuen Grouper-Lauf. Die alte Bewertung wird nicht überschrieben.

Die nachvollziehbare Kette lautet:

> Hypothese → Grouper-Lauf → offene Abzweigung → Nachweis oder Fachentscheidung → neue Kodierung → Neubewertung

Nach einer Änderung werden alle Hypothesenbestandteile neu bewertet. Dokumente behalten ihren Verlauf und erhalten einen neuen Iterationsbezug, wenn ihre Bedeutung neu geprüft wurde.

Die Iterationshistorie enthält mindestens:

- Auslöser,
- aktive Hauptdiagnose,
- relevante OPS und Nebendiagnosen,
- Basis-DRG,
- DRG,
- PCCL,
- Begründung,
- offene Alternativen,
- Nachweis- und Entscheidungsstand.

### 7.4 Vollständige Kodierung für die KIS-Übertragung

Im Bereich „DRG und Entgelte“ muss die vollständige Kodierung geöffnet werden können. Sie wird gegenüber der Vorkodierung gegliedert:

- **ergänzen**,
- **ändern**,
- **löschen**,
- **unverändert übernehmen**,
- **technische Grouper-Werte separat prüfen oder übernehmen**.

Jeder Eintrag zeigt Quelle, Dokumentbezug und Iteration. Damit kann die Kodierfachkraft das Ergebnis kontrolliert in das KIS übertragen.

## 8. Wiki-Chat und Kodierkonsil

### 8.1 Kodierwiki

Der Wiki-Chat ist eine Wissenshilfe. Er eignet sich, wenn:

- der Sachverhalt voraussichtlich keinen Einfluss auf die DRG hat,
- die Kodierfachkraft Grundkenntnisse besitzt,
- eine DKR, ICD-/OPS-Systematik oder ein medizinischer Begriff erklärt werden soll,
- eine Kodierung gemeinsam vorbereitet werden soll.

Der Wiki-Chat darf eine fallbezogene Entscheidung nicht allein als belegt markieren. Sein Ergebnis kann in die Kodiermaske übernommen werden, muss aber anschließend durch die Kodierfachkraft entschieden und belegt werden.

### 8.2 Kodierkonsil

Das Kodierkonsil ist die menschliche Eskalation. Es wird empfohlen, wenn:

- der Sachverhalt gruppierungsrelevant ist,
- fehlende Fachkenntnis die DRG-Hypothese gefährdet,
- der Verlauf komplex oder widersprüchlich ist,
- mehrere Spezialgebiete beteiligt sind,
- eine DKR- oder Leistungsentscheidung nicht sicher getroffen werden kann.

Beispiele sind ein unfallchirurgischer Fall mit herzchirurgischer Teilfrage oder eine internistische Kodierung mit komplexer nephrologischer Problematik.

Das Prinzip folgt dem medizinischen Konsil: Ein einfacher bekannter Sachverhalt wird selbst bearbeitet. Bei fachfremder oder komplizierter Lage wird ein Spezialist hinzugezogen.

Das Konsil erhält den vollständigen nötigen Fallkontext:

- Behandlungskette,
- relevante Dokumente,
- aktuelle und historische Kodierung,
- Grouper-Läufe,
- Alternativpfade,
- DKR- und Regelhinweise,
- konkrete Fragestellung.

Das Ergebnis des Konsils erzeugt eine neue Bewertung und bei kodierrelevanter Änderung eine neue Grouper-Iteration.

## 9. Krankenhauswissen und Regelwerke

### 9.1 Krankenhausverwaltung

Für jedes Haus, jeden Standort und jedes Behandlungsjahr sollen getrennte Profile gepflegt werden. Sie enthalten:

- Strukturmerkmale,
- NUB-Vereinbarungen,
- historische Kodier- und Falldaten,
- verfügbare Abrechnungsjahre,
- Datenstand und Gültigkeit,
- fehlende Pflichtfelder,
- doppelte Datensätze,
- standortspezifische Leistungsangebote.

XLS-Uploads werden im Prototyp simuliert. Produktiv braucht es eine validierte Importlogik mit Schema, Fehlerbericht und Versionierung.

### 9.2 KIS-Fundorte

Kodierfachkräfte arbeiten in vielen Häusern und unterschiedlichen KIS-Oberflächen. Projektleitungen sollen deshalb hausbezogene Hinweise hinterlegen können:

- Modul und Navigationspfad,
- Suchbegriff,
- kurze Arbeitsanweisung,
- Hausbesonderheit,
- schematischer oder echter Screenshot des KIS.

Diese Information ist tertiär. Sie erscheint erst im Dokumentdetail oder bei einer konkreten Anforderung. Damit hilft sie bei der Orientierung, ohne den Hauptscreen zu überladen.

### 9.3 Regelwerk-Center

Nicht jede relevante Regel kann automatisch aus offiziellen Regelwerken abgeleitet werden. Deshalb braucht das Tool ein versioniertes Regelwerk-Center.

Regeln werden zunächst in Alltagssprache erfasst. Das System erzeugt daraus eine strukturierte Vorschau:

- Auslöser,
- Bedingungen,
- Ausschlüsse,
- benötigte Nachweise,
- Reaktion,
- Geltungsbereich,
- Behandlungsjahr.

Regeltypen werden sichtbar getrennt:

- offizielle Regel,
- medizinische Plausibilität,
- interner Standard,
- Erfahrungswert.

Freigabestufen sind:

- Entwurf,
- geprüft,
- freigegeben,
- ersetzt,
- abgekündigt.

Eine Regel darf erst nach manueller Freigabe aktiv werden. Eine simulierte Auswirkungsanalyse gegen historische Fälle soll zeigen, welche Fälle und DRG-Pfade betroffen wären.

## 10. Medizinische Begründung der vollstationären Behandlung

Am Ende der Kodierung kann optional eine medizinische Begründung für die Krankenkasse erforderlich sein. Sie soll erklären, warum eine vollstationäre Behandlung notwendig war und warum eine ambulante oder teilstationäre Versorgung nicht ausgereicht hätte.

Die Begründung kann einfach sein, wenn ein Organersatzverfahren nur stationär möglich ist. Sie kann komplexer sein, wenn Behandlungsintensität, Überwachungsbedarf, instabiler Verlauf oder mehrere Maßnahmen zusammenspielen.

Das Regelwerk-Center soll dafür allgemeine und fachspezifische Regeln verwalten. Am Fallende kann ein MBEG-Entwurf geöffnet werden, wenn ausreichende Informationen vorliegen.

Der Entwurf muss:

- fallbezogen sein,
- jede Aussage mit Dokument oder Ereignis belegen,
- den stationären Behandlungsgrund konkret nennen,
- ambulante oder teilstationäre Alternativen konkret abgrenzen,
- von einer Fachkraft geprüft und freigegeben werden.

Der Prototyp simuliert diesen Entwurf. Er versendet nichts an eine Krankenkasse.

## 11. UX-Konzept

### 11.1 Leitprinzipien

Die Oberfläche soll die begrenzte menschliche Parallelverarbeitung respektieren. Deshalb gelten folgende Prinzipien:

- progressive Offenlegung statt eines überfüllten Cockpits,
- klare Schrittfolge statt gleichzeitiger Detailprüfung,
- Behandlungskette als visuelle Orientierung,
- Ergebniswirkung vor Vollständigkeitsarbeit,
- Begründungen statt undurchsichtiger Scores,
- Fachkraft bleibt entscheidungsfähig,
- jede relevante Stelle bietet einen direkten Abschlussweg,
- Details in Drawern, Modalen oder zweiten Screens,
- sichtbare Fokuszustände und verständliche Labels.

### 11.2 Vorgesehene Hauptschritte

Der Fallworkflow ist als geführte Folge angelegt:

1. Fall finden oder erfassen.
2. Behandlungskette prüfen.
3. DRG- und Kodierhypothese prüfen.
4. Dokumente und Nachweise priorisiert bearbeiten.
5. DRG, Entgelte und Alternativen bewerten.
6. Vollständige Kodierung für das KIS vorbereiten.
7. Optional MBEG erstellen.
8. Fall abschließen.

Die Krankenhausverwaltung und das Regelwerk-Center liegen getrennt in der Navigation.

### 11.3 Fortschritt und Status

Ein Arbeitsfortschritt darf angezeigt werden, aber kein pauschaler „KI-Sicherheitswert“. Sinnvolle Fortschrittsbereiche sind:

- Fallverständnis,
- Basis-DRG,
- Alternativen,
- Entgelte,
- Nachweise,
- Abschluss.

Zusätzlich werden getrennt gezeigt:

- Nachweisstatus,
- Zahl realistischer DRG-Alternativen,
- offene Entscheidungen,
- Regel- und Entgeltprüfungen.

Statuswerte stehen immer als Text:

- belegt,
- wahrscheinlich,
- ungeklärt,
- widersprüchlich,
- ausgeschlossen,
- Entscheidung nötig.

Der Abschluss ist erst möglich, wenn zwingende Entscheidungen bearbeitet wurden. Unkritische Restunsicherheiten dürfen dokumentiert bleiben.

## 12. Aktueller Prototyp

### 12.1 Technische Basis

Der Prototyp ist als React-Web-App mit TypeScript und Vite umgesetzt.

Vorhanden sind:

- React und TypeScript,
- Vite-Build,
- lokale Speicherung im Browser über `localStorage`,
- Reset auf Demodaten,
- responsive Oberfläche bis 320 Pixel Breite,
- zentrale TypeScript-Typen,
- austauschbares Interface `GrouperClient.group(input)`,
- simulierter `MockGrouperClient`,
- automatisierte UI- und Grouper-Tests.

### 12.2 Umgesetzte Demo-Funktionen

Im klickbaren Prototyp sind unter anderem vorhanden:

- geführter Fallstart,
- Demo-Fallpool,
- Krankenhaus-, Standort- und Jahreswahl,
- simulierte Batch-, Screenshot-, Dokument- und manuelle Aufnahme,
- Behandlungskette mit zeitproportionalen Aufenthalten und Ereignismarkern,
- Trennung von Verlaufs-, Ereignis-, Nachweis- und Vorkodierungsdokumenten,
- Dokumentenbewertung zur aktuellen DRG-Hypothese,
- Krankenhaus-Typik und manuelle Korrektur,
- DKR-Hinweise,
- Hauptdiagnose-, OPS-, DRG- und Entgelthypothesen,
- direkte ICD-/OPS-Eingabe an Prüfentscheidungen,
- Kodierung aus Dokumenten,
- Validierung vorhandener Vorkodierung,
- unveränderliche Grouper-Iterationen,
- Wiki-Chat und Kodierkonsil,
- vollständige Änderungsliste für die KIS-Übertragung,
- technische Grouper-Werte ohne unnötigen Dokumentenupload,
- Krankenhausverwaltung mit KIS-Fundorten,
- Regelwerk-Center mit Pneumonie-Demoregel,
- optionaler MBEG-Entwurf.

### 12.3 Demodaten

Der Prototyp enthält:

- zwei Krankenhäuser,
- mehrere Standorte,
- zwei Abrechnungsjahre,
- einen standardnahen Fall,
- einen komplexen pulmologisch-onkologischen Fall,
- einen Pneumoniepfad,
- illustrative ICD-, OPS-, DRG-, PCCL-, ZE- und NUB-Angaben.

Diese Daten dienen ausschließlich der UX- und Machbarkeitsprüfung.

### 12.4 Bewusste Grenzen

Noch nicht produktiv umgesetzt sind:

- echte OCR- und Dokumentenanalyse,
- medizinische Informationsextraktion,
- echte PDF-, Bild-, TXT- oder XLS-Verarbeitung,
- zertifizierte Grouper-Anbindung,
- vollständige und lizenzkonforme Regelwerksintegration,
- KIS- oder §-301-Schnittstelle,
- Backend und zentrale Datenbank,
- Benutzerverwaltung und Rollenrechte,
- Mandantentrennung,
- echte Konsilkommunikation,
- Versand einer MBEG,
- Datenschutz-, Sicherheits- und Medizinproduktfreigabe.

## 13. Deployment und Qualität

Die Demo ist öffentlich über folgenden Link erreichbar:

<https://kodierpfad-adaptive-kodierung.bigsliktobi.chatgpt.site/>

Die veröffentlichte Seite enthält:

- HTML-Metadaten mit `noindex`, `nofollow`, `noarchive`, `nosnippet` und `noimageindex`,
- eine `robots.txt` mit `Disallow: /`.

Das reduziert die Auffindbarkeit in Suchmaschinen. Es ist **kein Zugriffsschutz**. Jede Person mit dem Link kann die Demo öffnen. Es dürfen deshalb keine realen Patientendaten verwendet werden.

Der zuletzt dokumentierte Prüfstand umfasst:

- 17 erfolgreiche Tests,
- erfolgreichen TypeScript-Check,
- erfolgreichen Produktionsbuild,
- Prüfung der responsiven Darstellung bis 320 Pixel,
- klare Kennzeichnung illustrativer Demodaten.

## 14. Fachliche und technische Risiken

### 14.1 Scheingenauigkeit

Ein früher DRG-Vorschlag kann zu stark verankern. Das Tool muss deshalb Alternativen, Widersprüche und fehlende Nachweise sichtbar halten. Ein Ergebnis darf nie allein wegen statistischer Typik als korrekt gelten.

### 14.2 Falsche Optimierung

Das Produkt darf nicht auf maximalen Erlös optimieren. Die Zielfunktion ist regelkonforme, belegte und plausible Abrechnung. Über- und Unterkodierung sind beide Fehler.

### 14.3 Regelwerksqualität

Offizielle Regeln, medizinische Plausibilität, interne Standards und Erfahrungswerte dürfen nicht vermischt werden. Herkunft, Jahr, Freigabe und Geltungsbereich müssen sichtbar bleiben.

### 14.4 Dokumentenklassifikation

Dokumenttitel sind nicht immer eindeutig. Die Zuordnung zu Aufenthalt, Ereignis und erwartetem Kodierinhalt muss korrigierbar sein. Fehlklassifikationen dürfen keine stillen Kodierentscheidungen auslösen.

### 14.5 Krankenhaus-Typik

Historische Daten können alte Fehler, lokale Gewohnheiten oder unvollständige Leistungen abbilden. Typik ist ein Priorisierungssignal, kein Wahrheitsbeweis.

### 14.6 Datenschutz und Zugriff

Der aktuelle öffentliche Prototyp ist nur für Demodaten geeignet. Ein produktives System braucht mindestens Authentifizierung, Rollen, Mandantentrennung, Verschlüsselung, Löschkonzept, Protokollierung und eine abgestimmte Datenschutzarchitektur.

### 14.7 Menschliche Verantwortung

Kodierwiki, Regeln, Statistiken und Grouper unterstützen die Fachkraft. Sie ersetzen keine fachliche Freigabe. Besonders gruppierungsrelevante und fachfremde Fragen brauchen einen klaren menschlichen Eskalationsweg.

## 15. Empfohlene nächste Schritte

### Phase 1: Machbarkeit mit echten, anonymisierten Abläufen

- Fünf bis zehn typische und komplexe Fallmuster auswählen.
- Benötigte Eingangsdaten je Krankenhaus erfassen.
- Dokumenttypen und Behandlungsketten manuell als Goldstandard markieren.
- Relevanzentscheidungen erfahrener Kodierfachkräfte vergleichen.
- Messen, welche Dokumente tatsächlich gelesen wurden und warum.

### Phase 2: Regel- und Datenmodell festigen

- Versioniertes Modell für ICD-10-GM, OPS, DKR, Entgelte und Strukturmerkmale definieren.
- Offizielle Regeln strikt von internen Regeln trennen.
- Krankenhausprofile und historische Vergleichsdaten standardisieren.
- Nachweisarten und zulässige technische Quellen definieren.
- Freigabeprozess mit fachlicher Verantwortung festlegen.

### Phase 3: Technische Integrationen

- Zertifizierten Grouper anbinden.
- Batchschema für Fallpool, Vorkodierung und technische Werte definieren.
- PDF-, TXT-, Bild- und XLS-Import aufbauen.
- Dokumentklassifikation und Ereignisextraktion zunächst als Vorschlag umsetzen.
- Jede maschinelle Ableitung korrigierbar und auditierbar machen.

### Phase 4: Pilotbetrieb

- Geschütztes Mehrbenutzersystem aufbauen.
- Kodierkonsil mit Rollen, Zuständigkeiten und Benachrichtigungen umsetzen.
- Zeitersparnis, Ergebnisänderungen, Nachweisqualität und Eskalationen messen.
- Über- und Unterkodierungsrisiken getrennt auswerten.
- Erst nach fachlicher, datenschutzrechtlicher und technischer Prüfung erweitern.

## 16. Erfolgskriterien

Der Ansatz ist erfolgreich, wenn Kodierfachkräfte:

- den Fallcharakter schneller verstehen,
- relevante von irrelevanten Dokumenten sicherer trennen,
- weniger unnötige Dokumente detailliert lesen,
- DRG-relevante Abzweigungen früher erkennen,
- Vorkodierung gezielt statt pauschal prüfen,
- alternative Pfade nachvollziehbar schließen,
- Regeln und Belege direkt im Arbeitskontext sehen,
- bei Wissenslücken passend zwischen Wiki und Konsil wählen,
- vollständige Änderungen kontrolliert ins KIS übertragen,
- einen regelkonformen und belegten Abschluss erzeugen.

Die wichtigste Kennzahl ist nicht allein Erlös oder Geschwindigkeit. Entscheidend ist das Verhältnis aus Bearbeitungszeit, Regelkonformität, Belegqualität, nachvollziehbaren Entscheidungen und vermiedener Über- beziehungsweise Unterkodierung.

## 17. Zusammenfassung der Produktidee

Die zentrale Idee ist machbar und fachlich plausibel: Krankenhauskodierung kann hypothesenbasiert und adaptiv organisiert werden. Das Tool beginnt mit Behandlungskette, Vorkodierung, Krankenhauskontext und einer ersten Gruppierung. Danach fokussiert es nur auf realistische Ergebnisänderungen.

Der Mensch bleibt im Zentrum. Er kann jederzeit selbst kodieren, Vorkodierung validieren, Wissen im Kodierwiki erarbeiten oder ein menschliches Kodierkonsil hinzuziehen. Dokumente werden nicht bloß gesammelt, sondern relativ zur aktuellen DRG-Hypothese bewertet. Jede relevante Änderung erzeugt eine nachvollziehbare neue Grouper-Iteration.

Der aktuelle Prototyp beweist vor allem die UX- und Prozessidee. Er beweist noch nicht die medizinische oder abrechnungstechnische Korrektheit einer automatisierten Lösung. Der nächste wichtige Schritt ist daher ein kontrollierter Pilot mit echten, anonymisierten Arbeitsabläufen, gültigen Regelwerken und einem zertifizierten Grouper.
