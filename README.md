# Data Spark · Graphics Studio

App locale per ricreare le 7 grafiche di riferimento cambiando **solo copy e soggetto** (le tue foto al posto della persona originale). Layout, font e palette sono bloccati sui brand colors Data Spark. Al posto di stelle/globo c'è il logo spark (`assets/logo.svg`).

## Come si apre

Doppio click su **`start.command`** (avvia un server locale su `localhost:8420` e apre il browser). Serve il server: aprendo `index.html` direttamente il browser blocca l'export PNG.

## Come si usa

1. Scegli il **template** (7, uno per ogni reference).
2. Scegli la **foto**: le tue 4 sono precaricate, col `+` ne carichi altre (restano solo in sessione, non vengono salvate).
3. Regola **zoom / posizione** della foto.
4. Cambia il **copy** nei campi. I colori si scelgono solo dagli swatch brand.
5. **Scarica PNG** → 1080×1350 (formato feed LinkedIn/IG).

## I template → reference

**Feed (4:5)**

| Template | Reference |
|---|---|
| Selfie annotato | selfie con scritte a mano arancio + frecce (Ana Jords) |
| Blur B/N | surfer mosso, testo rosso piccolo |
| Cartello | "You are way too creative for a 9 to 5" |
| Cutout sticker | faccia ritagliata su fondo verde |
| Statement su blur | "Because growth starts…" rosso giustificato |
| Card colorata | rettangolo blu + testo bianco giustificato |
| Parole sparse | "Go with the flow" + serif centrale |

**Storie (9:16)** — si aprono già in formato story

| Template | Reference | Cosa fa |
|---|---|---|
| Storie in serie | carosello numerato PROJECT50 (1. Make a plan, 2. Gear up…) | incolli tutto il testo → si divide in frame, ogni frame con foto sua |
| Cover storia | "WHAT IS CIRCLE21 CLUBS?" (titolo grande + occhiello + pill) | copertina di una serie |
| Cerchio / ciclo | 4 parole attorno a un cerchio con frecce (discipline/routine…) | schema a ciclo sopra la foto |

### Storie in serie (autopilot)

1. Scegli il template **Storie in serie** (passa da solo a 9:16).
2. Incolla tutto il copy nel box grande, un blocco per frame. **Separatori riconosciuti** (in ordine): righe tipo `Frame 1` / `Slide 2` / `Storia 3`, oppure una riga `---`, oppure una riga vuota. La **1ª riga di ogni blocco è il titolo**, il resto è il testo (le righe che iniziano con `-` diventano bullet).
3. **Modalità racconto** (checkbox sopra «Dividi»): per contenuti di prosa/persuasione dove ogni frame è un paragrafo scorrevole senza titolo né numero. Con la spunta il testo diventa un blocco unico centrato sopra la foto, con più scrim per leggibilità. Senza spunta → layout listicle (titolo grande + numero + bullet, stile PROJECT50).
4. Premi **✂️ Dividi in frame**: crea un frame per blocco. In modalità listicle il primo blocco senza corpo diventa **cover** (titolo centrato, senza numero); gli altri sono step numerati (1. 2. 3.).
5. Nella **striscia dei frame** (★ 1 2 3 …) clicchi un frame per editarlo: gli assegni la sua **foto di background**, zoom/posizione, e ritocchi titolo/testo. `+` aggiunge un frame, 🗑 elimina quello attivo.
6. Opzioni serie: colore testo, **evidenziatore keyword** (`*parola*` → nastro o cerchio, utile per la CTA es. `DM me *ENGINE*`), **posizione testo** del racconto (alto/centro/basso), numerazione automatica, puntini di avanzamento, quanto scurire la foto, logo.
7. **Scarica tutte le storie (ZIP)** → un PNG 1080×1920 per frame, pronti da caricare in sequenza. (Ridividendo il testo le foto già assegnate restano al loro posto.)

## Funzioni AI

- **Cutout sticker → "✂️ Ritaglia il soggetto dalla foto (AI)"**: rimozione sfondo direttamente nel browser (@imgly/background-removal). Al primo uso scarica il modello (~40MB, poi resta in cache). Ritaglia il soggetto dalla foto selezionata e lo mette su tinta brand con bordo sticker bianco. In alternativa puoi sempre caricare un PNG già scontornato col `+`.
- **Cartello → "🪄 Genera avatar con la mia faccia (AI)"**: genera lo sfondo (tu che reggi un cartello, vista dall'alto stile reference) partendo dalla foto selezionata, via Gemini `gemini-2.5-flash-image`. Serve una API key gratuita da [aistudio.google.com](https://aistudio.google.com) → incollala nel campo dedicato (resta in `localStorage`, solo sul tuo Mac). Il testo del campo "Testo sul cartello" viene passato a Gemini, che lo scrive direttamente sul cartello generato — e il cartello sovrapposto dell'app si spegne da solo. Se preferisci il cartello disegnato dall'app (testo sempre nitido e modificabile senza rigenerare), riaccendi il checkbox "Cartello disegnato dall'app" e svuota il testo prima di generare.

## Font (allineati alle reference)

- Annotazioni a mano + cartello: **Permanent Marker**
- Parole sparse calligrafiche: **Zeyada**
- Statement / card / blur B&N: **Helvetica Neue** (di sistema)
- Testo centrale serif: **EB Garamond**
- **Varianti "Font moderno"**: Selfie annotato e Parole sparse hanno un checkbox che passa le scritte a Helvetica (pulito, senza jitter), stile poster contemporaneo.

## Evidenziatore

Racchiudi le parole tra asterischi nei campi testo — `il *growth engine* nella tua voce` — e vengono evidenziate. Due stili (checkbox per template):

- **Nastro** (default): strisce marker piene con sbordi irregolari, stile poster Semi Permanent.
- **Cerchio**: ellisse a penna sketchy, doppio giro, come cerchiato a mano.

Il colore si sceglie dagli swatch brand ("Evidenziatore"). Funziona su tutti i template, incluso il testo giustificato (parole consecutive evidenziate diventano un'unica banda/cerchio).

## Note

- I font Google (Permanent Marker, Zeyada, EB Garamond) richiedono internet alla prima apertura.
- Le foto precaricate sono in `assets/` — per cambiarle in modo permanente sostituisci i file lì.
- Le foto caricate col `+` e gli avatar generati valgono solo per la sessione corrente: scarica il PNG finale prima di chiudere.
