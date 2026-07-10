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

## I 7 template → reference

| Template | Reference |
|---|---|
| Selfie annotato | selfie con scritte a mano arancio + frecce (Ana Jords) |
| Blur B/N | surfer mosso, testo rosso piccolo |
| Cartello | "You are way too creative for a 9 to 5" |
| Cutout sticker | faccia ritagliata su fondo verde |
| Statement su blur | "Because growth starts…" rosso giustificato |
| Card colorata | rettangolo blu + testo bianco giustificato |
| Parole sparse | "Go with the flow" + serif centrale |

## Funzioni AI

- **Cutout sticker → "✂️ Ritaglia il soggetto dalla foto (AI)"**: rimozione sfondo direttamente nel browser (@imgly/background-removal). Al primo uso scarica il modello (~40MB, poi resta in cache). Ritaglia il soggetto dalla foto selezionata e lo mette su tinta brand con bordo sticker bianco. In alternativa puoi sempre caricare un PNG già scontornato col `+`.
- **Cartello → "🪄 Genera avatar con la mia faccia (AI)"**: genera lo sfondo (tu che reggi un cartello, vista dall'alto stile reference) partendo dalla foto selezionata, via Gemini `gemini-2.5-flash-image`. Serve una API key gratuita da [aistudio.google.com](https://aistudio.google.com) → incollala nel campo dedicato (resta in `localStorage`, solo sul tuo Mac). Il testo del campo "Testo sul cartello" viene passato a Gemini, che lo scrive direttamente sul cartello generato — e il cartello sovrapposto dell'app si spegne da solo. Se preferisci il cartello disegnato dall'app (testo sempre nitido e modificabile senza rigenerare), riaccendi il checkbox "Cartello disegnato dall'app" e svuota il testo prima di generare.

## Font (allineati alle reference)

- Annotazioni a mano + cartello: **Permanent Marker**
- Parole sparse calligrafiche: **Zeyada**
- Statement / card / blur B&N: **Helvetica Neue** (di sistema)
- Testo centrale serif: **EB Garamond**

## Note

- I font Google (Permanent Marker, Zeyada, EB Garamond) richiedono internet alla prima apertura.
- Le foto precaricate sono in `assets/` — per cambiarle in modo permanente sostituisci i file lì.
- Le foto caricate col `+` e gli avatar generati valgono solo per la sessione corrente: scarica il PNG finale prima di chiudere.
