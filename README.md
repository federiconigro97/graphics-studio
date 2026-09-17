# Data Spark · Graphics Studio

App locale per ricreare le 7 grafiche di riferimento cambiando **solo copy e soggetto** (le tue foto al posto della persona originale). Layout, font e palette sono bloccati sui brand colors Data Spark. Al posto di stelle/globo c'è il logo spark (`assets/logo.svg`).

> **Brand 2026-09:** accenti = Tiger Flame `#ee003a` + Arancio `#ee6a2d` + Brick Red `#df2620`, neutro Alabaster `#dbdfdd`. Font = **Helvetica bold** (statement) + **Reenie Beanie** (scrittura a mano). Fonte unica: [`../brand/brand-system.md`](../brand/brand-system.md) + moodboard in `../brand/moodboard/`. Se cambi palette/font qui (`BRAND`/`HAND` in `app.js`) aggiorna anche quel file.

## Come si apre

Doppio click su **`start.command`** (avvia un server locale su `localhost:8420` e apre il browser). Serve il server: aprendo `index.html` direttamente il browser blocca l'export PNG.

## Render headless (JSON → PNG, per API/flow)

Oltre all'uso manuale, lo studio è pilotabile da codice — è la base per il content engine che ricrea la moodboard in automatico.

- **In pagina:** `window.GS.render(spec)` / `window.GS.renderAll([spec,…])` → dataURL PNG. `spec = { template, format?, photo?, zoom?, ox?, oy?, tsize?, fields:{…} }`. `window.GS.templates()` elenca template e campi.
- **Da terminale:** `npm install` una volta, poi `node render.mjs [board.json] [outDir]`. Usa il Chrome di sistema (puppeteer-core, nessun download). Vedi `board.example.json` per il formato.

## Come si usa (manuale)

1. Scegli il **template**.
2. Scegli la **foto**: le tue 4 sono precaricate, col `+` ne carichi altre (restano solo in sessione, non vengono salvate).
3. Regola **zoom / posizione** della foto.
4. Cambia il **copy** nei campi. I colori si scelgono solo dagli swatch brand.
5. **Scarica PNG** → 1080×1350 (formato feed LinkedIn/IG).

## I template → reference

**Feed (4:5)**

| Template | Reference |
|---|---|
| Selfie annotato | selfie con scritte a mano + frecce |
| Blur B/N | surfer mosso, testo rosso piccolo |
| Statement su blur | "Because growth starts…" rosso giustificato |
| Card colorata | rettangolo pieno + testo su foto |
| Blocco Growth Engine | headline enorme (THE GROWTH ENGINE) su cream/colore/foto + colonna tag rossa + sottotesto Helvetica |
| Card testo pieno | statement grande su colore pieno, niente foto (IDEAS MOVE PEOPLE.) — ideale per caroselli |
| Frase a mano su foto | 1 foto lifestyle + 1 frase a mano ben posizionata (SLOW THINGS FAST MINDS) — la tile più frequente |

**Storie (9:16)** — si aprono già in formato story

| Template | Reference | Cosa fa |
|---|---|---|
| Storie in serie | carosello numerato PROJECT50 (1. Make a plan, 2. Gear up…) | incolli tutto il testo → si divide in frame, ogni frame con foto sua |
| Cover storia | "WHAT IS CIRCLE21 CLUBS?" (titolo grande + occhiello + pill) | copertina di una serie |
| Cerchio / ciclo | 4 parole attorno a un cerchio con frecce (discipline/routine…) | schema a ciclo sopra la foto |

### Storie in serie (autopilot)

Ogni frame può avere uno **stile diverso** — così la serie è già varia e curata. Quattro stili:

- **Cover** ★ — titolo grande centrato (hook / copertina)
- **Racconto** ¶ — paragrafo scorrevole, per la prosa che convince
- **Step** — titolo + numero + bullet (listicle stile PROJECT50)
- **CTA** ➤ — chiusura centrata (con keyword evidenziabile)
- **Cerchio** ◎ — schema a ciclo con 4 parole (scelta manuale, non auto). Testo del frame: una riga `a / b / c / d` = le 4 parole (su/dx/giù/sx); il testo prima di quella riga diventa un titolo sopra il cerchio.

**Flusso base:**

1. Scegli il template **Storie in serie** (passa da solo a 9:16).
2. Incolla tutto il copy nel box grande, un blocco per frame. **Separatori riconosciuti** (in ordine): righe tipo `Frame 1` / `Slide 2` / `Storia 3`, oppure una riga `---`, oppure una riga vuota. La **1ª riga di ogni blocco è il titolo**, il resto è il testo (le righe con `-` diventano bullet).
3. Premi **✂️ Dividi in frame**: crea un frame per blocco e **assegna da solo lo stile giusto** a ognuno leggendo il contenuto (paragrafo lungo → Racconto, titolo corto + bullet → Step, primo blocco breve → Cover, ultimo con «DM / tap / ENGINE…» → CTA).
4. (Opzionale) **Flusso** — i tre bottoni preset ristrutturano gli stili di tutta la serie in un colpo:
   - **Hook → Step → CTA** · **Cover → Racconto → CTA** · **Racconto → CTA**
   - Se non hai ancora incollato niente, il preset ti crea uno **scheletro** di frame vuoti già con lo stile giusto, tu riempi solo il testo.
5. Correzione manuale: su ogni frame c'è **Stile di questo frame** (Cover / Racconto / Step / CTA) per cambiarlo a mano.
6. Nella **striscia dei frame** (★ ¶ 1 ➤ …) clicchi un frame per editarlo: gli assegni la sua **foto di background**, zoom/posizione, e ritocchi il testo. `+` aggiunge un frame, 🗑 elimina quello attivo.
7. Opzioni serie: colore testo, **evidenziatore keyword** (`*parola*` → nastro o cerchio, es. `DM me *ENGINE*`), **posizione testo** (alto/centro/basso), numerazione automatica, puntini di avanzamento, quanto scurire la foto, logo.
8. **Scarica tutte le storie (ZIP)** → un PNG 1080×1920 per frame, pronti da caricare in sequenza. (Ridividendo il testo le foto già assegnate restano al loro posto.)

## Foto AI on-brand (Gemini)

Sezione **Foto AI on-brand** nella sidebar: genera foto lifestyle nello stile della moodboard (cinematografico, caldo, desaturato) quando le foto del telefono non bastano.

- Serve una **API key Gemini** gratuita da [aistudio.google.com](https://aistudio.google.com) → incollala nel campo (resta in `localStorage`, solo sul tuo Mac).
- Scrivi la **scena** (in inglese rende meglio) o usa un **preset** (Surf / Moto / Laptop / Costa / Aereo / Interno / Città / Oceano). Uno stile-base brand viene appeso in automatico a ogni prompt, così l'output è coerente.
- **"Usa la mia faccia"**: parte dalla foto selezionata come riferimento, per generare scene con te dentro.
- Il risultato entra nella lista foto e viene selezionato: usalo con qualsiasi template. Aspect ratio = formato attivo (4:5 o 9:16). Modello: `gemini-2.5-flash-image`.

## Font (brand 2026-09 — solo 2 voci, niente serif)

- **Helvetica** (Now Display Bold / Neue di sistema): tutti gli statement, headline, card, sottotesti, occhielli/tag.
- **Scrittura a mano**: font primario **Reenie Beanie** (marker autentico/organico, stile board "SLOW THINGS FAST MINDS", rispetta maiuscolo E minuscolo) per Selfie annotato e "Frase a mano su foto". Alternative nel toggle: **Zeyada** (corsivo) e **Permanent Marker**.
- Il **serif è fuori dal brand**: anche i paragrafi che ragionano vanno in Helvetica.
- **Checkbox "Font moderno"**: Selfie annotato e Parole sparse passano le scritte grandi a Helvetica (pulito, senza jitter).

## Evidenziatore

Racchiudi le parole tra asterischi nei campi testo — `il *growth engine* nella tua voce` — e vengono evidenziate. Due stili (checkbox per template):

- **Nastro** (default): strisce marker piene con sbordi irregolari, stile poster Semi Permanent.
- **Cerchio**: ellisse a penna sketchy, doppio giro, come cerchiato a mano.

Il colore si sceglie dagli swatch brand ("Evidenziatore"). Funziona su tutti i template, incluso il testo giustificato (parole consecutive evidenziate diventano un'unica banda/cerchio).

## Note

- I font Google (Permanent Marker, Zeyada, EB Garamond) richiedono internet alla prima apertura.
- Le foto precaricate sono in `assets/` — per cambiarle in modo permanente sostituisci i file lì.
- Le foto caricate col `+` e gli avatar generati valgono solo per la sessione corrente: scarica il PNG finale prima di chiudere.
