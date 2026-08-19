/* Data Spark Graphics Studio
   7 template fissi ricreati dalle reference. Si cambia solo: foto (soggetto) + copy.
   Palette bloccata sui brand colors. Logo spark al posto di stelle/simboli. */

const W = 1080;
let H = 1350;                    // 1350 = 4:5 feed, 1920 = 9:16 story
let FORMAT = '4:5';
const sy = v => v * H / 1350;    // scala le y di layout sul formato attivo
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

function setFormat(f) {
  FORMAT = f;
  H = f === '9:16' ? 1920 : 1350;
  canvas.height = H;
  canvas.style.aspectRatio = f === '9:16' ? '9 / 16' : '4 / 5';
  updateExportBtn();
  buildAdjust();
  render();
}

const BRAND = ['#7b98a8','#0B3042','#C6A890','#fef6e2','#b6b394','#8e8d8b','#518fa6','#ee6a2d','#f43334','#212123','#d8dede'];

/* Font stack fedeli alle reference */
const SANS = "'Helvetica Neue','Archivo',sans-serif";      // statement / card / blur B&N
const MARKER = "'Permanent Marker',cursive";                // annotazioni a mano + cartello
const SCRIPT = "'Zeyada','La Belle Aurore',cursive";        // parole sparse calligrafiche
const SERIF = "'EB Garamond',serif";

/* Spark logo path (from data spark logo black on white.svg, viewBox 1276) */
const LOGO_PATH = new Path2D("M938.91 267.388C829.401 348.673 829.401 348.673 719.892 429.959C667.595 349.908 667.595 349.908 615.299 269.857C581.329 378.512 581.329 378.512 547.36 487.166C429.581 481.817 429.581 481.817 311.803 476.465C373.262 550.96 373.262 550.96 434.722 625.455C316.496 700.979 316.496 700.979 198.271 776.502C322.307 772.798 322.307 772.798 446.343 769.094C398.293 885.568 398.293 885.568 350.243 1002.04C465.115 916.231 465.115 916.231 579.988 830.418C634.52 919.522 634.52 919.522 689.051 1008.63C723.468 890.096 723.468 890.096 757.886 771.564C883.039 778.56 883.039 778.56 1008.19 785.557C939.357 707.152 939.357 707.152 870.522 628.748C988.972 552.607 988.972 552.607 1107.42 476.465C980.783 481.632 980.783 481.632 854.145 486.797C896.528 377.092 896.528 377.092 938.91 267.388Z");
const LOGO_CX = 652.8, LOGO_CY = 638, LOGO_SPAN = 910;

function drawLogo(c, x, y, size, color) {
  c.save();
  c.translate(x, y);
  const s = size / LOGO_SPAN;
  c.scale(s, s);
  c.translate(-LOGO_CX, -LOGO_CY);
  c.fillStyle = color;
  c.fill(LOGO_PATH);
  c.restore();
}

/* ---------- utils ---------- */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function coverDraw(c, img, zoom, ox, oy) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(W / iw, H / ih) * zoom;
  const w = iw * s, h = ih * s;
  c.drawImage(img, (W - w) / 2 + ox / 100 * W, (H - h) / 2 + oy / 100 * H, w, h);
}

function setFont(c, weight, size, family) {
  c.font = `${weight} ${size}px ${family}`;
}

function letterSpace(c, px) {
  if ('letterSpacing' in c) c.letterSpacing = px + 'px';
}

/* wrap text into lines that fit maxW with current ctx font */
function wrapLines(c, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = [];
  for (const w of words) {
    const test = [...line, w].join(' ');
    if (line.length && c.measureText(test).width > maxW) {
      lines.push(line);
      line = [w];
    } else line.push(w);
  }
  if (line.length) lines.push(line);
  return lines;
}

/* ---------- evidenziatore: *parola* nel testo = banda colore dietro la parola ---------- */
const stripMarks = s => s.replace(/\*/g, '');

function parseMarks(str) {
  const segs = [];
  str.split('*').forEach((seg, i) => {
    if (seg) segs.push({ t: seg, hl: i % 2 === 1 });
  });
  return segs;
}

/* evidenziazione organica: 'nastro' (strisce marker piene, sbordi irregolari)
   o 'cerchio' (ellisse a penna sketchy, doppio giro) */
function drawHighlight(c, x, y, w, h, color, style, seed) {
  const rnd = mulberry32(seed);
  c.save();
  if (style === 'cerchio') {
    c.strokeStyle = color;
    c.lineWidth = Math.max(3, h * 0.07);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const cx = x + w / 2, cy = y + h / 2;
    const rx = w / 2 + h * 0.45, ry = h * 0.80;
    const p1 = rnd() * 6.28, p2 = rnd() * 6.28;
    const a0 = -0.4 + (rnd() - 0.5) * 0.6;
    const steps = 64, loops = 2;
    c.beginPath();
    for (let i = 0; i <= steps * loops; i++) {
      const t = a0 + i / steps * Math.PI * 2;
      const j = 1 + 0.06 * Math.sin(t * 2.3 + p1) + 0.045 * Math.sin(t * 4.7 + p2) + (i / (steps * loops)) * 0.06;
      const px = cx + Math.cos(t) * rx * j;
      const py = cy + Math.sin(t) * ry * (j + 0.06 * Math.sin(t * 3.1 + p2));
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.stroke();
  } else {
    // nastro: 2 strisce sovrapposte, lunghezze/altezze leggermente diverse
    c.fillStyle = color;
    for (let k = 0; k < 2; k++) {
      const exL = h * (0.12 + rnd() * 0.45);
      const exR = h * (0.12 + rnd() * 0.45);
      const oy = (rnd() - 0.5) * h * 0.14;
      const hh = h * (0.85 + rnd() * 0.22);
      c.fillRect(x - exL, y + oy + (h - hh) / 2, w + exL + exR, hh);
    }
  }
  c.restore();
}

/* riga singola col font corrente, con evidenziazioni; baseline 'alphabetic' o 'middle' */
function drawMarkedLine(c, line, x, y, size, hlColor, align = 'left', baseline = 'alphabetic', hlStyle = 'nastro') {
  const segs = parseMarks(line);
  const total = segs.reduce((a, s) => a + c.measureText(s.t).width, 0);
  const startX = align === 'center' ? x - total / 2 : x;
  const prevAlign = c.textAlign;
  c.textAlign = 'left';
  const top = baseline === 'middle' ? y - size * 0.52 : y - size * 0.78;
  // segmenti evidenziati adiacenti uniti in un unico run
  const rects = [];
  let cx = startX, run = null;
  for (const s of segs) {
    const w = c.measureText(s.t).width;
    if (s.hl) {
      if (!run) run = { x: cx, w: 0 };
      run.w = cx + w - run.x;
    } else if (run) { rects.push(run); run = null; }
    cx += w;
  }
  if (run) rects.push(run);
  const seedOf = r => Math.abs((r.x * 7 + y * 3 + r.w) | 0) + 1;
  if (hlColor && hlStyle !== 'cerchio')
    rects.forEach(r => drawHighlight(c, r.x, top, r.w, size * 1.04, hlColor, hlStyle, seedOf(r)));
  cx = startX;
  for (const s of segs) {
    c.fillText(s.t, cx, y);
    cx += c.measureText(s.t).width;
  }
  if (hlColor && hlStyle === 'cerchio')
    rects.forEach(r => drawHighlight(c, r.x, top, r.w, size * 1.04, hlColor, hlStyle, seedOf(r)));
  c.textAlign = prevAlign;
}

/* force-justified uppercase block (ogni riga stirata a piena larghezza, come le reference) */
function drawJustified(c, opts) {
  const { text, x, y, width, size, color, lh = 1.35, weight = 500, family = SANS, ls = 2, hl, hlStyle = 'nastro' } = opts;
  c.save();
  setFont(c, weight, size, family);
  letterSpace(c, ls);
  c.fillStyle = color;
  c.textBaseline = 'alphabetic';
  // parole con flag evidenziatore (*parola*)
  const words = [];
  text.toUpperCase().split('*').forEach((seg, i) => {
    seg.split(/\s+/).filter(Boolean).forEach(t => words.push({ t, hl: i % 2 === 1 }));
  });
  const lines = [];
  let line = [];
  for (const w of words) {
    const test = [...line.map(o => o.t), w.t].join(' ');
    if (line.length && c.measureText(test).width > width) {
      lines.push(line);
      line = [w];
    } else line.push(w);
  }
  if (line.length) lines.push(line);
  let cy = y;
  for (const line of lines) {
    const wordsW = line.reduce((a, o) => a + c.measureText(o.t).width, 0);
    const gap = line.length > 1 ? (width - wordsW) / (line.length - 1) : 0;
    // run di parole evidenziate consecutive (gap inclusi)
    const runs = [];
    {
      let cx = x, run = null;
      line.forEach(o => {
        const w = c.measureText(o.t).width;
        if (o.hl) {
          if (!run) run = { x: cx, w: 0 };
          run.w = cx + w - run.x;
        } else if (run) { runs.push(run); run = null; }
        cx += w + gap;
      });
      if (run) runs.push(run);
    }
    const seedOf = r => Math.abs((r.x * 7 + cy * 3 + r.w) | 0) + 1;
    if (hl && hlStyle !== 'cerchio')
      runs.forEach(r => drawHighlight(c, r.x, cy - size * 0.78, r.w, size * 1.02, hl, hlStyle, seedOf(r)));
    let cx = x;
    for (const o of line) {
      c.fillText(o.t, cx, cy);
      cx += c.measureText(o.t).width + gap;
    }
    if (hl && hlStyle === 'cerchio')
      runs.forEach(r => drawHighlight(c, r.x, cy - size * 0.78, r.w, size * 1.02, hl, hlStyle, seedOf(r)));
    cy += size * lh;
  }
  letterSpace(c, 0);
  c.restore();
  return y + lines.length * size * lh;
}

/* handwritten multi-line slot with per-line jitter */
function drawHand(c, opts) {
  const { text, x, y, size, rot = 0, color, align = 'center', lh = 1.35,
          family = MARKER, weight = 400, seed = 1, jitter = true, hl, hlStyle = 'nastro' } = opts;
  if (!text || !text.trim()) return;
  const rnd = mulberry32(seed);
  c.save();
  c.translate(x, y);
  c.rotate(rot * Math.PI / 180);
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    c.save();
    if (jitter) {
      c.rotate((rnd() - 0.5) * 0.05);
      c.translate((rnd() - 0.5) * size * 0.25, i * size * lh);
    } else {
      rnd(); rnd();
      c.translate(0, i * size * lh);
    }
    setFont(c, weight, size, family);
    drawMarkedLine(c, line, 0, 0, size, hl, align, 'middle', hlStyle);
    c.restore();
  });
  c.restore();
}

/* hand-drawn curved arrow */
function drawArrow(c, x1, y1, x2, y2, curve, color, lw = 7) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - dy / len * curve, cy = my + dx / len * curve;
  c.save();
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x1, y1);
  c.quadraticCurveTo(cx, cy, x2, y2);
  c.stroke();
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const hl = 22;
  c.beginPath();
  c.moveTo(x2 - hl * Math.cos(ang - 0.45), y2 - hl * Math.sin(ang - 0.45));
  c.lineTo(x2, y2);
  c.lineTo(x2 - hl * Math.cos(ang + 0.45), y2 - hl * Math.sin(ang + 0.45));
  c.stroke();
  c.restore();
}

/* chevron (arrowhead) pointing along tangent angle a */
function drawChevron(c, px, py, a, color, lw, size) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(px - size * Math.cos(a - 0.5), py - size * Math.sin(a - 0.5));
  c.lineTo(px, py);
  c.lineTo(px - size * Math.cos(a + 0.5), py - size * Math.sin(a + 0.5));
  c.stroke();
  c.restore();
}

/* cyclic ring: two arcs with a gap top & bottom, clockwise arrowheads in the gaps */
function drawCycleRing(c, cx, cy, R, color, lw) {
  const g = 0.16;
  c.save();
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.lineCap = 'round';
  c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 + g, Math.PI / 2 - g); c.stroke();
  c.beginPath(); c.arc(cx, cy, R, Math.PI / 2 + g, Math.PI * 1.5 - g); c.stroke();
  c.restore();
  // top gap → arrowhead pointing clockwise (tangent = θ + 90°, at θ=-90° → a=0)
  drawChevron(c, cx + R * Math.cos(-Math.PI / 2 + g * 0.4), cy + R * Math.sin(-Math.PI / 2 + g * 0.4), 0, color, lw, R * 0.07);
  // bottom gap → arrowhead pointing counter-clockwise back (θ=90° → a=π)
  drawChevron(c, cx + R * Math.cos(Math.PI / 2 - g * 0.4), cy + R * Math.sin(Math.PI / 2 - g * 0.4), Math.PI, color, lw, R * 0.07);
}

/* dark legibility gradient for photo-backed story frames */
function storyOverlay(c, tint) {
  const t = (tint ?? 55) / 100;
  c.save();
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(8,10,12,${0.20 + 0.30 * t})`);
  g.addColorStop(0.45, `rgba(8,10,12,${0.10 * t})`);
  g.addColorStop(1, `rgba(8,10,12,${0.35 + 0.35 * t})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/* wrap honouring manual \n line breaks, returns array of strings */
function wrapKeepBreaks(c, text, maxW) {
  const out = [];
  (text || '').split('\n').forEach(part => {
    if (!part.trim()) { out.push(''); return; }
    wrapLines(c, part, maxW).forEach(ln => out.push(ln.join(' ')));
  });
  return out;
}

/* like wrapKeepBreaks but preserves *marks*, wrapping on the stripped width */
function wrapMarked(c, text, maxW) {
  const out = [];
  (text || '').split('\n').forEach(part => {
    if (!part.trim()) { out.push(''); return; }
    let line = [];
    part.split(/\s+/).filter(Boolean).forEach(w => {
      const test = [...line, w].join(' ');
      if (line.length && c.measureText(stripMarks(test)).width > maxW) { out.push(line.join(' ')); line = [w]; }
      else line.push(w);
    });
    if (line.length) out.push(line.join(' '));
  });
  return out;
}

/* film grain overlay */
let grainCanvas = null;
function drawGrain(c, alpha = 0.08) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 540; grainCanvas.height = 675;
    const g = grainCanvas.getContext('2d');
    const id = g.createImageData(540, 675);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }
  c.save();
  c.globalAlpha = alpha;
  c.globalCompositeOperation = 'overlay';
  c.drawImage(grainCanvas, 0, 0, W, H);
  c.restore();
}

/* organic blob path (sticker cutout) */
function blobPath(c, cx, cy, rx, ry, seed) {
  const rnd = mulberry32(seed);
  const o1 = rnd() * 6, o2 = rnd() * 6;
  const n = 48;
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n * Math.PI * 2;
    const r = 1 + 0.05 * Math.sin(3 * t + o1) + 0.035 * Math.sin(7 * t + o2);
    const px = cx + Math.cos(t) * rx * r;
    const py = cy + Math.sin(t) * ry * r;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}

/* fit a single line into maxW starting from size */
function fitSize(c, text, size, maxW, weight, family) {
  let s = size;
  setFont(c, weight, s, family);
  while (c.measureText(text).width > maxW && s > 14) {
    s -= 2;
    setFont(c, weight, s, family);
  }
  return s;
}

/* ---------- AI: rimozione sfondo in-browser (@imgly/background-removal) ---------- */
const cutouts = {};          // photo src -> HTMLImageElement con alpha
let bgRemovalMod = null;

async function makeCutout(src, setStatus) {
  if (cutouts[src]) return cutouts[src];
  if (!bgRemovalMod) {
    setStatus('Scarico il modello AI (solo la prima volta, ~40MB)…');
    bgRemovalMod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm');
  }
  setStatus('Ritaglio il soggetto…');
  const blob = await fetch(src).then(r => r.blob());
  const out = await bgRemovalMod.removeBackground(blob, {
    progress: (k, cur, tot) => {
      if (k.startsWith('fetch')) setStatus(`Scarico il modello… ${Math.round(cur / tot * 100)}%`);
    }
  });
  const raw = await loadImg(URL.createObjectURL(out));
  // pulizia: azzera l'alpha residua semitrasparente (aloni di sfondo)
  const cv = document.createElement('canvas');
  cv.width = raw.naturalWidth;
  cv.height = raw.naturalHeight;
  const g = cv.getContext('2d');
  g.drawImage(raw, 0, 0);
  const id = g.getImageData(0, 0, cv.width, cv.height);
  for (let i = 3; i < id.data.length; i += 4) {
    if (id.data[i] < 90) id.data[i] = 0;
  }
  g.putImageData(id, 0, 0);
  const img = await loadImg(cv.toDataURL());
  cutouts[src] = img;
  return img;
}

/* sticker con bordo bianco attorno alla silhouette (alpha) */
function drawSticker(c, img, x, y, w, h, outline = 20) {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(w));
  off.height = Math.max(1, Math.round(h));
  const o = off.getContext('2d');
  o.drawImage(img, 0, 0, off.width, off.height);
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = '#f4efe4';
  o.fillRect(0, 0, off.width, off.height);
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = 40;
  c.shadowOffsetY = 16;
  c.drawImage(off, x, y, w, h);
  c.shadowColor = 'transparent';
  const steps = 36;
  for (let i = 0; i < steps; i++) {
    const a = i / steps * Math.PI * 2;
    c.drawImage(off, x + Math.cos(a) * outline, y + Math.sin(a) * outline, w, h);
  }
  c.drawImage(img, x, y, w, h);
  c.restore();
}

/* ---------- AI: avatar di sfondo via Gemini (nano-banana), parte dalla foto scelta ---------- */
function imgToB64(img, maxDim = 1024) {
  const s = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * s);
  cv.height = Math.round(img.naturalHeight * s);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.9).split(',')[1];
}

async function generateAvatar(s, setStatus) {
  const key = (localStorage.getItem('geminiKey') || '').trim();
  if (!key) { setStatus('Serve la API key Gemini (campo qui sopra, la trovi su aistudio.google.com).'); return; }
  setStatus('Preparo la foto di riferimento…');
  const ref = await loadImg(s.photo);
  const signText = (s.signText || '').trim();
  let prompt = s.aiPrompt;
  if (signText) {
    const lines = signText.split('\n').map(l => `"${l}"`).join(' / ');
    prompt += ` The white sign must display exactly this text, hand-written in bold red marker capital letters, keeping these line breaks: ${lines}. Spell it exactly as given, no other text anywhere in the image.`;
  }
  const parts = [
    { inline_data: { mime_type: 'image/jpeg', data: imgToB64(ref) } },
    { text: prompt }
  ];
  const call = (genCfg) => fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], ...(genCfg ? { generationConfig: genCfg } : {}) })
    }
  );
  setStatus('Genero l\'avatar… (10-30 secondi)');
  let resp = await call({ responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '4:5' } });
  if (!resp.ok) resp = await call(null);
  const json = await resp.json();
  if (!resp.ok) { setStatus('Errore Gemini: ' + (json.error?.message || resp.status)); return; }
  const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.inline_data);
  if (!part) { setStatus('Gemini non ha restituito un\'immagine, riprova.'); return; }
  const d = part.inlineData || part.inline_data;
  const url = `data:${d.mimeType || d.mime_type};base64,${d.data}`;
  userPhotos.push(url);
  s.photo = url;
  if (signText) {
    // il testo è già nel cartello generato: spegni quello sovrapposto dall'app
    s.overlaySign = false;
    buildFields();
  }
  buildPhotos();
  setStatus(signText
    ? 'Avatar creato ✓ con il testo sul cartello (overlay app disattivato)'
    : 'Avatar creato ✓ (posiziona il cartello dell\'app sul segno bianco)');
}

/* ---------- template definitions ---------- */

const TEMPLATES = [
  {
    id: 'annotated',
    name: 'Selfie annotato',
    hint: 'scritte a mano arancio',
    defaultPhoto: 'assets/photo-selfie.jpg',
    fields: [
      { key: 'name', label: 'Nome (grande, alto a dx)', type: 'textarea', def: 'FEDERICO\nNIGRO' },
      { key: 'sub', label: 'Etichetta sotto il nome', type: 'text', def: '"the operator"' },
      { key: 'leftTop', label: 'Blocco alto a sx', type: 'textarea', def: 'AI GTM engine\nnella mia voce' },
      { key: 'leftList', label: 'Lista a sx (una voce per riga)', type: 'textarea', def: '- content\n- outbound\n- systems\n- growth' },
      { key: 'rightPlus', label: 'Lista + a dx', type: 'textarea', def: '+ proposito\n+ metodo\n+ crescita' },
      { key: 'rightQuote', label: 'Nota bassa a dx', type: 'text', def: '"the project"' },
      { key: 'bottom', label: 'Riga in basso', type: 'textarea', def: '+6 anni nel\ndigitale' },
      { key: 'inkColor', label: 'Colore scritte', type: 'swatch', def: '#ee6a2d' },
      { key: 'modern', label: 'Font moderno (Helvetica, niente marker)', type: 'check', def: false },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#fef6e2' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'showLogo', label: 'Logo spark in alto a sx', type: 'check', def: true },
    ],
    draw(c, s, img) {
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      c.save();
      c.fillStyle = 'rgba(20,15,10,0.14)';
      c.fillRect(0, 0, W, H);
      c.restore();
      const k = s.inkColor, T = (s.tsize || 100) / 100 * (s.modern ? 0.85 : 1);
      const st = { color: k, hl: s.hlColor, hlStyle: s.hlCircle ? 'cerchio' : 'nastro',
                   family: s.modern ? SANS : MARKER,
                   weight: s.modern ? 500 : 400,
                   jitter: !s.modern };
      drawHand(c, { ...st, text: s.name, x: 780, y: sy(150), size: 76 * T, rot: -7, seed: 11 });
      drawHand(c, { ...st, text: s.sub, x: 850, y: sy(330), size: 40 * T, rot: -5, seed: 12 });
      drawHand(c, { ...st, text: s.leftTop, x: 215, y: sy(230), size: 36 * T, rot: -8, seed: 13 });
      drawHand(c, { ...st, text: s.leftList, x: 55, y: sy(750), size: 40 * T, rot: -2, align: 'left', lh: 1.55, seed: 14 });
      drawHand(c, { ...st, text: s.rightPlus, x: 670, y: sy(500), size: 38 * T, rot: -4, align: 'left', lh: 1.5, seed: 15 });
      drawHand(c, { ...st, text: s.rightQuote, x: 880, y: sy(950), size: 40 * T, rot: -11, seed: 16 });
      drawHand(c, { ...st, text: s.bottom, x: 560, y: sy(1160), size: 48 * T, rot: -3, seed: 17 });
      if (s.leftTop.trim()) drawArrow(c, 250, sy(330), 330, sy(450), -40, k);
      if (s.name.trim()) drawArrow(c, 640, sy(210), 545, sy(320), 30, k);
      if (s.bottom.trim()) drawArrow(c, 420, sy(1130), 450, sy(1020), 35, k);
      if (s.rightQuote.trim()) drawArrow(c, 840, sy(890), 750, sy(830), -25, k);
      if (s.showLogo) drawLogo(c, 80, 90, 80, k);
      drawGrain(c, 0.05);
    }
  },

  {
    id: 'blur-motion',
    name: 'Blur B/N',
    hint: 'mosso, testo rosso piccolo',
    defaultPhoto: 'assets/photo-azulejos.jpg',
    fields: [
      { key: 'credit', label: 'Credit a sx', type: 'textarea', def: 'FEDERICO NIGRO\nDATA SPARK' },
      { key: 'title', label: 'Titolo a dx', type: 'text', def: 'BUILT IN MOTION' },
      { key: 'subtitle', label: 'Sottotitolo a dx', type: 'text', def: 'A MOMENT CAPTURED ON THE FAST LANE' },
      { key: 'motion', label: 'Effetto mosso', type: 'range', def: 14, min: 0, max: 40 },
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#f43334' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#fef6e2' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: false },
    ],
    draw(c, s, img) {
      c.save();
      c.filter = 'grayscale(1) contrast(1.12) brightness(1.05)';
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      if (s.motion > 0) {
        c.globalAlpha = 0.14;
        c.filter = `grayscale(1) contrast(1.12) brightness(1.05) blur(${s.motion / 6}px)`;
        for (let i = 1; i <= 7; i++) {
          const off = i * s.motion / 2.2;
          c.save(); c.translate(off, 0); coverDraw(c, img, s.zoom, s.ox, s.oy); c.restore();
          c.save(); c.translate(-off, 0); coverDraw(c, img, s.zoom, s.ox, s.oy); c.restore();
        }
      }
      c.restore();
      const T = (s.tsize || 100) / 100;
      c.save();
      c.fillStyle = s.txtColor;
      c.textBaseline = 'alphabetic';
      letterSpace(c, 1.5 * T);
      setFont(c, 700, 26 * T, SANS);
      const credit = s.credit.toUpperCase().split('\n');
      const hst = s.hlCircle ? 'cerchio' : 'nastro';
      credit.forEach((l, i) => drawMarkedLine(c, l, 160, sy(640) + i * 34 * T, 26 * T, s.hlColor, 'left', 'alphabetic', hst));
      drawMarkedLine(c, s.title.toUpperCase(), 590, sy(640), 26 * T, s.hlColor, 'left', 'alphabetic', hst);
      setFont(c, 500, 26 * T, SANS);
      const sub = wrapLines(c, s.subtitle.toUpperCase(), 400);
      sub.forEach((l, i) => drawMarkedLine(c, l.join(' '), 590, sy(640) + (i + 1) * 34 * T, 26 * T, s.hlColor, 'left', 'alphabetic', hst));
      letterSpace(c, 0);
      c.restore();
      if (s.showLogo) drawLogo(c, W / 2, H - 80, 60, s.txtColor);
      drawGrain(c, 0.07);
    }
  },

  {
    id: 'sign',
    name: 'Cartello',
    hint: 'scritta marker sul cartello',
    defaultPhoto: 'assets/photo-park.jpg',
    fields: [
      { key: 'signText', label: 'Testo sul cartello', type: 'textarea', def: 'YOU ARE\nWAY TOO CREATIVE\nFOR A 9 TO 5' },
      { key: '_key', type: 'apikey', label: 'Gemini API key (aistudio.google.com)' },
      { key: 'aiPrompt', label: 'Scena avatar (prompt)', type: 'textarea',
        def: 'Cinematic photo of this exact same person, identical face and hair, standing alone in the middle of a sunlit pedestrian crosswalk seen from above, holding up a plain blank white rectangular sign with both hands above his head, long shadow on the asphalt, warm afternoon light, editorial film photography, 4:5 vertical.' },
      { key: '_gen', type: 'button', label: '🪄 Genera avatar con la mia faccia (AI)',
        action: (s, setStatus) => generateAvatar(s, setStatus) },
      { key: 'overlaySign', label: 'Cartello disegnato dall\'app (spegnilo se il testo lo ha già scritto Gemini)', type: 'check', def: true },
      { key: 'signX', label: 'Cartello ↔', type: 'range', def: 540, min: 100, max: 980 },
      { key: 'signY', label: 'Cartello ↕', type: 'range', def: 350, min: 100, max: 1750 },
      { key: 'signW', label: 'Larghezza cartello', type: 'range', def: 460, min: 240, max: 820 },
      { key: 'signRot', label: 'Rotazione', type: 'range', def: -2, min: -15, max: 15 },
      { key: 'inkColor', label: 'Colore marker', type: 'swatch', def: '#f43334' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#fef6e2' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'showLogo', label: 'Logo spark sul cartello', type: 'check', def: false },
    ],
    draw(c, s, img) {
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      if (!s.overlaySign) { drawGrain(c, 0.05); return; }
      const lines = s.signText.split('\n').filter(l => l.trim());
      const pad = 34;
      let size = 64 * (s.tsize || 100) / 100;
      for (const l of lines) size = Math.min(size, fitSize(c, stripMarks(l), size, s.signW - pad * 2, 400, "'Permanent Marker'"));
      const lh = size * 1.28;
      const signH = lines.length * lh + pad * 2 + (s.showLogo ? size * 0.9 : 0);
      c.save();
      c.translate(s.signX, s.signY);
      c.rotate(s.signRot * Math.PI / 180);
      c.shadowColor = 'rgba(0,0,0,0.35)';
      c.shadowBlur = 24;
      c.shadowOffsetY = 10;
      c.fillStyle = '#fdfdfa';
      c.beginPath();
      c.roundRect(-s.signW / 2, -signH / 2, s.signW, signH, 6);
      c.fill();
      c.shadowColor = 'transparent';
      c.fillStyle = s.inkColor;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      setFont(c, 400, size, "'Permanent Marker'");
      const top = -signH / 2 + pad + lh / 2;
      lines.forEach((l, i) => drawMarkedLine(c, l, 0, top + i * lh, size, s.hlColor, 'center', 'middle', s.hlCircle ? 'cerchio' : 'nastro'));
      if (s.showLogo) drawLogo(c, 0, top + lines.length * lh + size * 0.25, size * 0.8, s.inkColor);
      c.restore();
      drawGrain(c, 0.05);
    }
  },

  {
    id: 'sticker',
    name: 'Cutout sticker',
    hint: 'faccia ritagliata su tinta',
    defaultPhoto: 'assets/photo-selfie.jpg',
    fields: [
      { key: '_cut', type: 'button', label: '✂️ Ritaglia il soggetto dalla foto (AI)',
        action: (s, setStatus) => makeCutout(s.photo, setStatus).then(() => setStatus('Soggetto ritagliato ✓')) },
      { key: 'bgColor', label: 'Sfondo', type: 'swatch', def: '#0B3042' },
      { key: 'caption', label: 'Caption (opzionale)', type: 'text', def: '' },
      { key: 'capColor', label: 'Colore caption', type: 'swatch', def: '#fef6e2' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nella caption)', type: 'swatch', def: '#ee6a2d' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'cutSize', label: 'Dimensione soggetto', type: 'range', def: 100, min: 40, max: 180 },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: true },
    ],
    draw(c, s, img) {
      c.fillStyle = s.bgColor;
      c.fillRect(0, 0, W, H);
      drawGrain(c, 0.12);
      const cy = s.caption.trim() ? sy(600) : sy(650);
      const cut = cutouts[s.photo];
      if (cut) {
        const scale = (sy(950) / cut.naturalHeight) * (s.cutSize / 100) * s.zoom;
        const w = cut.naturalWidth * scale, h = cut.naturalHeight * scale;
        drawSticker(c, cut, 540 - w / 2 + s.ox / 100 * W, cy - h / 2 + s.oy / 100 * H, w, h, 18);
      } else {
        // fallback senza AI: finestra organica sulla foto
        c.save();
        blobPath(c, 540, cy, 400 * s.cutSize / 100, 500 * s.cutSize / 100, 7);
        c.lineWidth = 26;
        c.strokeStyle = '#f4efe4';
        c.shadowColor = 'rgba(0,0,0,0.45)';
        c.shadowBlur = 40;
        c.shadowOffsetY = 14;
        c.stroke();
        c.shadowColor = 'transparent';
        c.clip();
        coverDraw(c, img, s.zoom, s.ox, s.oy);
        c.restore();
      }
      if (s.caption.trim()) {
        drawHand(c, { text: s.caption, x: 540, y: H - 180, size: 52 * (s.tsize || 100) / 100, rot: -2, color: s.capColor, hl: s.hlColor, hlStyle: s.hlCircle ? 'cerchio' : 'nastro', seed: 21 });
      }
      if (s.showLogo) drawLogo(c, W / 2, H - 78, 66, s.capColor);
      drawGrain(c, 0.06);
    }
  },

  {
    id: 'statement-blur',
    name: 'Statement su blur',
    hint: 'titolo rosso giustificato',
    defaultPhoto: 'assets/photo-cafe.jpg',
    fields: [
      { key: 'headline', label: 'Headline', type: 'textarea', def: 'Because growth starts when someone feels your brand belongs.' },
      { key: 'blur', label: 'Sfocatura foto', type: 'range', def: 14, min: 0, max: 40 },
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#f43334' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#fef6e2' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'size', label: 'Corpo testo', type: 'range', def: 64, min: 40, max: 90 },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: true },
    ],
    draw(c, s, img) {
      c.save();
      c.filter = `blur(${s.blur}px) saturate(1.08) brightness(1.02)`;
      coverDraw(c, img, s.zoom * (1 + s.blur / 200), s.ox, s.oy);
      c.restore();
      const size = s.size * (s.tsize || 100) / 100;
      setFont(c, 500, size, SANS);
      letterSpace(c, 2);
      const lines = wrapLines(c, stripMarks(s.headline).toUpperCase(), 900).length;
      letterSpace(c, 0);
      const blockH = lines * size * 1.18;
      drawJustified(c, {
        text: s.headline, x: 90, y: (H - blockH) / 2 + size * 0.55, width: 900,
        size, color: s.txtColor, lh: 1.18, weight: 500, ls: 2, hl: s.hlColor,
        hlStyle: s.hlCircle ? 'cerchio' : 'nastro'
      });
      if (s.showLogo) drawLogo(c, W / 2, H - 110, 64, s.txtColor);
      drawGrain(c, 0.05);
    }
  },

  {
    id: 'color-card',
    name: 'Card colorata',
    hint: 'rettangolo pieno + testo bianco',
    defaultPhoto: 'assets/photo-azulejos.jpg',
    fields: [
      { key: 'headline', label: 'Headline', type: 'textarea', def: "You're not stuck because of what you did. You're stuck because you won't deal with it." },
      { key: 'cardColor', label: 'Colore card', type: 'swatch', def: '#518fa6' },
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#fef6e2' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#ee6a2d' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'cardW', label: 'Larghezza card', type: 'range', def: 620, min: 400, max: 900 },
      { key: 'cardH', label: 'Altezza card', type: 'range', def: 780, min: 400, max: 1600 },
      { key: 'showLogo', label: 'Logo spark sulla card', type: 'check', def: true },
    ],
    draw(c, s, img) {
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      const cx = 540, cy = sy(620);
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.3)';
      c.shadowBlur = 30;
      c.shadowOffsetY = 12;
      c.fillStyle = s.cardColor;
      c.fillRect(cx - s.cardW / 2, cy - s.cardH / 2, s.cardW, s.cardH);
      c.restore();
      c.save();
      c.beginPath();
      c.rect(cx - s.cardW / 2, cy - s.cardH / 2, s.cardW, s.cardH);
      c.clip();
      drawGrain(c, 0.14);
      c.restore();
      const size = 46 * (s.tsize || 100) / 100;
      setFont(c, 500, size, SANS);
      letterSpace(c, 1.5);
      const nLines = wrapLines(c, stripMarks(s.headline).toUpperCase(), 900).length;
      letterSpace(c, 0);
      const blockH = nLines * size * 1.5;
      drawJustified(c, {
        text: s.headline, x: 90, y: cy - blockH / 2 + size * 0.8, width: 900,
        size, color: s.txtColor, lh: 1.5, weight: 500, ls: 1.5, hl: s.hlColor,
        hlStyle: s.hlCircle ? 'cerchio' : 'nastro'
      });
      if (s.showLogo) drawLogo(c, cx, cy + s.cardH / 2 - 70, 56, s.txtColor);
      drawGrain(c, 0.04);
    }
  },

  {
    id: 'scatter',
    name: 'Parole sparse',
    hint: 'scritte grandi a mano + serif',
    defaultPhoto: 'assets/photo-park.jpg',
    fields: [
      { key: 'bigWords', label: 'Parole grandi (separa con spazi)', type: 'text', def: 'GO WITH THE FLOW' },
      { key: 'centerText', label: 'Testo centrale serif', type: 'textarea', def: 'Stop living limited.\nStart building leverage.' },
      { key: 'wordColor', label: 'Colore parole', type: 'swatch', def: '#fef6e2' },
      { key: 'modern', label: 'Font moderno (Helvetica, niente corsivo)', type: 'check', def: false },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#ee6a2d' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'seed', label: 'Disposizione (mescola)', type: 'range', def: 3, min: 1, max: 30 },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: true },
    ],
    draw(c, s, img) {
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      c.fillStyle = 'rgba(10,10,14,0.18)';
      c.fillRect(0, 0, W, H);
      const words = s.bigWords.split(/\s+/).filter(Boolean).slice(0, 8);
      const anchors = [
        [180, 220], [800, 300], [230, 560], [800, 880],
        [280, 1010], [790, 1130], [520, 420], [520, 900]
      ];
      const rnd = mulberry32(s.seed * 97 + 13);
      const T = (s.tsize || 100) / 100;
      const fam = s.modern ? SANS : SCRIPT;
      const wgt = s.modern ? 700 : 400;
      const base = s.modern ? 130 : 280;
      words.forEach((w, i) => {
        const [ax, ay] = anchors[i % anchors.length];
        const word = s.modern ? w.toUpperCase() : w;
        const size = fitSize(c, stripMarks(word), (base - rnd() * (base * 0.15)) * T, 480, wgt, fam);
        drawHand(c, {
          text: word,
          x: ax + (rnd() - 0.5) * 60,
          y: sy(ay) + (rnd() - 0.5) * 50,
          size, rot: (rnd() - 0.5) * (s.modern ? 10 : 24),
          color: s.wordColor, family: fam, weight: wgt,
          jitter: !s.modern, hl: s.hlColor, hlStyle: s.hlCircle ? 'cerchio' : 'nastro', seed: s.seed + i
        });
      });
      if (s.centerText.trim()) {
        c.save();
        c.fillStyle = '#fdfaf2';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.shadowColor = 'rgba(0,0,0,0.5)';
        c.shadowBlur = 16;
        setFont(c, 400, 46 * T, s.modern ? SANS : SERIF);
        const lines = s.centerText.split('\n');
        lines.forEach((l, i) => drawMarkedLine(c, l, 620, sy(700) + i * 62 * T, 46 * T, s.hlColor, 'center', 'middle', s.hlCircle ? 'cerchio' : 'nastro'));
        c.restore();
      }
      if (s.showLogo) drawLogo(c, W / 2, H - 75, 60, s.wordColor);
      drawGrain(c, 0.06);
    }
  },

  /* ===== STORIE (9:16) ===== */

  {
    id: 'story-series',
    name: 'Storie in serie',
    hint: 'incolla il testo → si divide in frame',
    series: true,
    defaultFormat: '9:16',
    defaultPhoto: 'assets/photo-park.jpg',
    fields: [
      { key: 'style', scope: 'frame', label: 'Stile di questo frame', type: 'seg', def: 'step',
        options: [{ val: 'cover', label: 'Cover' }, { val: 'prose', label: 'Racconto' }, { val: 'step', label: 'Step' }, { val: 'cta', label: 'CTA' }] },
      { key: 'title', scope: 'frame', label: 'Titolo del frame', type: 'textarea', def: 'Titolo del frame' },
      { key: 'body', scope: 'frame', label: 'Testo del frame', type: 'textarea', def: 'Testo del frame.\n- punto uno\n- punto due' },
      { key: 'accent', scope: 'series', label: 'Colore testo', type: 'swatch', def: '#fef6e2' },
      { key: 'hlColor', scope: 'series', label: 'Evidenziatore keyword (*parola* nel testo)', type: 'swatch', def: '#ee6a2d' },
      { key: 'hlCircle', scope: 'series', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'textY', scope: 'series', label: 'Posizione testo racconto ↕ (0 alto, 100 basso)', type: 'range', def: 50, min: 15, max: 85 },
      { key: 'autonumber', scope: 'series', label: 'Numera gli step (1. 2. 3.)', type: 'check', def: true },
      { key: 'dots', scope: 'series', label: 'Puntini di avanzamento', type: 'check', def: true },
      { key: 'tint', scope: 'series', label: 'Scurisci foto (leggibilità)', type: 'range', def: 55, min: 0, max: 100 },
      { key: 'showLogo', scope: 'series', label: 'Logo spark in basso', type: 'check', def: true },
    ],
    draw(c, f, img, S) {
      coverDraw(c, img, f.zoom, f.ox, f.oy);
      storyOverlay(c, S.tint);
      const T = (S.tsize || 100) / 100;
      const acc = S.accent;
      const idx = S.frames.indexOf(f);
      const hst = S.hlCircle ? 'cerchio' : 'nastro';
      let style = f.style || (f.cover ? 'cover' : (S.prose ? 'prose' : 'step'));
      // degradazioni difensive: stili che richiedono un titolo ma non ce l'hanno
      if (style === 'step' && !(f.title && f.title.trim())) style = 'prose';
      if (style === 'cover' && !(f.title && f.title.trim()) && (f.body && f.body.trim())) style = 'prose';
      if (style === 'prose' || style === 'cta') {
        const centered = style === 'cta';
        c.save(); c.fillStyle = 'rgba(8,10,12,0.32)'; c.fillRect(0, 0, W, H); c.restore();
        const txt = [f.title, f.body].filter(x => x && x.trim()).join('\n');
        c.save();
        c.fillStyle = acc; c.textAlign = centered ? 'center' : 'left'; c.textBaseline = 'alphabetic';
        const size = (centered ? 50 : 45) * T;
        setFont(c, centered ? 600 : 500, size, SANS);
        const lines = wrapMarked(c, txt, centered ? 860 : 912);
        const lh = size * (centered ? 1.42 : 1.5);
        const y = H * (S.textY ?? 50) / 100 - (lines.length - 1) * lh / 2;
        const x = centered ? W / 2 : 84;
        lines.forEach((ln, i) => drawMarkedLine(c, ln, x, y + i * lh, size, S.hlColor, centered ? 'center' : 'left', 'alphabetic', hst));
        c.restore();
      } else if (style === 'cover') {
        c.save();
        c.fillStyle = acc; c.textAlign = 'center'; c.textBaseline = 'middle';
        let hs = 82 * T; hs = fitSize(c, (f.title || '').split('\n')[0], hs, 880, 700, SANS);
        setFont(c, 700, hs, SANS);
        const lines = wrapKeepBreaks(c, f.title, 880);
        const lh = hs * 1.14;
        let y0 = H * 0.44 - (lines.length - 1) * lh / 2;
        lines.forEach((ln, i) => c.fillText(ln, W / 2, y0 + i * lh));
        if ((f.body || '').trim()) {
          setFont(c, 500, 30 * T, SANS);
          c.fillStyle = acc; c.globalAlpha = 0.82;
          const bl = wrapKeepBreaks(c, f.body, 760);
          bl.forEach((ln, i) => c.fillText(ln, W / 2, y0 + lines.length * lh + 30 + i * 44 * T));
        }
        c.restore();
      } else {
        const stOf = fr => fr.style || (fr.cover ? 'cover' : 'step');
        let num = 0; for (let i = 0; i <= idx; i++) if (stOf(S.frames[i]) === 'step') num++;
        const x = 84; let y = H * 0.24;
        c.save();
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        const heading = (S.autonumber ? num + '. ' : '') + (f.title || '');
        let hs = 62 * T; hs = fitSize(c, heading, hs, 912, 700, SANS);
        setFont(c, 700, hs, SANS);
        c.fillStyle = acc;
        const hlines = wrapKeepBreaks(c, heading, 912);
        hlines.forEach((ln, i) => c.fillText(ln, x, y + i * hs * 1.16));
        y += hlines.length * hs * 1.16 + hs * 0.5;
        setFont(c, 500, 33 * T, SANS);
        c.fillStyle = acc; c.globalAlpha = 0.92;
        (f.body || '').split('\n').forEach(p => {
          if (!p.trim()) { y += 24 * T; return; }
          const bullet = /^\s*[-•]/.test(p);
          const txt = p.replace(/^\s*[-•]\s*/, '');
          const wl = wrapLines(c, txt, bullet ? 828 : 912);
          wl.forEach((ln, i) => {
            const tx = bullet ? x + 40 : x;
            if (bullet && i === 0) c.fillText('•', x, y);
            c.fillText(ln.join(' '), tx, y);
            y += 46 * T;
          });
        });
        c.restore();
      }
      if (S.dots && S.frames.length > 1) {
        const n = S.frames.length, gap = 26, r = 5, tot = (n - 1) * gap, sx = W / 2 - tot / 2, dy = H - 96;
        for (let i = 0; i < n; i++) {
          c.beginPath(); c.arc(sx + i * gap, dy, r, 0, 6.283);
          c.fillStyle = i === idx ? acc : 'rgba(254,246,226,0.35)';
          c.fill();
        }
      }
      if (S.showLogo) drawLogo(c, W / 2, H - 150, 54, acc);
      drawGrain(c, 0.05);
    }
  },

  {
    id: 'story-cover',
    name: 'Cover storia',
    hint: 'titolo grande + occhiello + pill',
    defaultFormat: '9:16',
    defaultPhoto: 'assets/photo-cafe.jpg',
    fields: [
      { key: 'headline', label: 'Titolo (grande, in basso)', type: 'textarea', def: 'COS’È IL\nGROWTH\nENGINE?' },
      { key: 'body', label: 'Occhiello (piccolo, in alto a dx)', type: 'textarea', def: 'Un motore di content e outbound che gira ogni giorno nella tua voce, senza presidiarlo a mano.' },
      { key: 'cta', label: 'Pill in basso (vuoto = niente)', type: 'text', def: 'SCOPRI DI PIÙ' },
      { key: 'brand', label: 'Parola brand (vicino al logo)', type: 'text', def: 'data spark' },
      { key: 'accent', label: 'Colore testo', type: 'swatch', def: '#fef6e2' },
      { key: 'tint', label: 'Scurisci foto', type: 'range', def: 45, min: 0, max: 100 },
      { key: 'showLogo', label: 'Logo spark in alto a dx', type: 'check', def: true },
    ],
    draw(c, s, img) {
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      storyOverlay(c, s.tint);
      const T = (s.tsize || 100) / 100, acc = s.accent;
      // occhiello in alto a dx
      c.save();
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillStyle = acc;
      setFont(c, 500, 31 * T, SANS);
      const bl = wrapKeepBreaks(c, s.body, 440);
      bl.forEach((ln, i) => c.fillText(ln, 560, H * 0.34 + i * 42 * T));
      // titolo grande in basso a sx
      let hs = 96 * T; hs = fitSize(c, s.headline.split('\n')[0].toUpperCase(), hs, 640, 800, SANS);
      setFont(c, 800, hs, SANS);
      const hlines = wrapKeepBreaks(c, s.headline.toUpperCase(), 640);
      const lh = hs * 1.02;
      let hy = H * 0.72 - (hlines.length - 1) * lh;
      hlines.forEach((ln, i) => c.fillText(ln, 72, hy + i * lh));
      c.restore();
      // logo + brand in alto a dx
      if (s.showLogo) {
        drawLogo(c, W - 96, 116, 66, acc);
        if ((s.brand || '').trim()) {
          c.save();
          c.fillStyle = acc; c.textAlign = 'right'; c.textBaseline = 'middle';
          setFont(c, 600, 30 * T, SANS);
          c.fillText(s.brand, W - 150, 116);
          c.restore();
        }
      }
      // pill CTA in basso
      if ((s.cta || '').trim()) {
        c.save();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        setFont(c, 600, 30 * T, SANS);
        letterSpace(c, 2);
        const tw = c.measureText(s.cta.toUpperCase()).width;
        const pw = tw + 96, ph = 84 * T, px = W / 2 - pw / 2, py = H * 0.90 - ph / 2;
        c.fillStyle = 'rgba(15,18,20,0.55)';
        c.beginPath(); c.roundRect(px, py, pw, ph, ph / 2); c.fill();
        c.lineWidth = 2; c.strokeStyle = acc; c.globalAlpha = 0.85; c.stroke();
        c.globalAlpha = 1; c.fillStyle = acc;
        c.fillText(s.cta.toUpperCase(), W / 2, H * 0.90 + 1);
        letterSpace(c, 0);
        c.restore();
      }
      drawGrain(c, 0.05);
    }
  },

  {
    id: 'story-circle',
    name: 'Cerchio / ciclo',
    hint: '4 parole attorno a un cerchio',
    defaultFormat: '9:16',
    defaultPhoto: 'assets/photo-park.jpg',
    fields: [
      { key: 'top', label: 'Parola in alto', type: 'text', def: 'content' },
      { key: 'right', label: 'Parola a destra', type: 'text', def: 'outbound' },
      { key: 'bottom', label: 'Parola in basso', type: 'text', def: 'sistema' },
      { key: 'left', label: 'Parola a sinistra', type: 'text', def: 'crescita' },
      { key: 'accent', label: 'Colore cerchio e testo', type: 'swatch', def: '#fef6e2' },
      { key: 'ring', label: 'Dimensione cerchio', type: 'range', def: 30, min: 18, max: 42 },
      { key: 'cy', label: 'Posizione verticale', type: 'range', def: 46, min: 25, max: 70 },
      { key: 'tint', label: 'Scurisci foto', type: 'range', def: 30, min: 0, max: 100 },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: false },
    ],
    draw(c, s, img) {
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      storyOverlay(c, s.tint);
      const T = (s.tsize || 100) / 100, acc = s.accent;
      const cx = W / 2, cy = H * (s.cy / 100), R = W * (s.ring / 100);
      drawCycleRing(c, cx, cy, R, acc, Math.max(2.5, W * 0.0035));
      c.save();
      c.fillStyle = acc;
      c.textBaseline = 'middle';
      const pad = 34, m = 40, base = 46 * T;
      const put = (txt, x, y, align, avail) => {
        c.textAlign = align;
        setFont(c, 500, fitSize(c, txt, base, avail, 500, SANS), SANS);
        c.fillText(txt, x, y);
      };
      put(s.top, cx, cy - R - pad, 'center', W - 2 * m);
      put(s.bottom, cx, cy + R + pad, 'center', W - 2 * m);
      put(s.left, cx - R - pad, cy, 'right', cx - R - pad - m);
      put(s.right, cx + R + pad, cy, 'left', W - m - (cx + R + pad));
      c.restore();
      if (s.showLogo) drawLogo(c, W / 2, H - 130, 54, acc);
      drawGrain(c, 0.05);
    }
  },
];

/* ---------- photos ---------- */
const PRESET_PHOTOS = [
  'assets/photo-selfie.jpg',
  'assets/photo-cafe.jpg',
  'assets/photo-park.jpg',
  'assets/photo-azulejos.jpg',
];
const imgCache = {};
function loadImg(src) {
  if (imgCache[src]) return Promise.resolve(imgCache[src]);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { imgCache[src] = img; res(img); };
    img.onerror = rej;
    img.src = src;
  });
}

/* ---------- state ---------- */
const states = {};

const SERIES_EXAMPLE =
`Il growth engine nella tua voce

---
Definisci l'offerta
Un solo problema, un solo cliente.
Prima chiarezza, poi scala.

---
Costruisci il sistema
Content + outbound che girano ogni giorno.
- nella tua voce
- senza presidiarlo a mano

---
Fai girare il motore
Ogni giorno lo stesso ritmo.
La costanza batte l'intensità.`;

function makeFrame(tpl) {
  const fr = { photo: tpl.defaultPhoto, zoom: 1, ox: 0, oy: 0 };
  tpl.fields.filter(f => (f.scope || 'frame') === 'frame').forEach(f => fr[f.key] = f.def);
  return fr;
}

function activeFrame(s) { return s.frames[s.active]; }

function stateFor(tpl) {
  if (!states[tpl.id]) {
    const s = { tsize: 100 };
    if (tpl.series) {
      tpl.fields.filter(f => f.scope === 'series').forEach(f => s[f.key] = f.def);
      s.prose = false;
      s.bulk = SERIES_EXAMPLE;
      s.frames = [makeFrame(tpl)];
      s.frames[0].style = 'cover';
      s.frames[0].cover = true;
      s.frames[0].title = 'Il growth engine\nnella tua voce';
      s.frames[0].body = '';
      s.active = 0;
    } else {
      s.photo = tpl.defaultPhoto; s.zoom = 1; s.ox = 0; s.oy = 0;
      tpl.fields.forEach(f => s[f.key] = f.def);
    }
    states[tpl.id] = s;
  }
  return states[tpl.id];
}

/* incolla → frame. Separatore, in ordine: righe "Frame N" / "Slide N" → '---' → riga vuota.
   1ª riga = titolo, resto = testo. `raw` = blocco intero (usato in modalità racconto). */
const FRAME_MARKER = /^\s*(?:frame|slide|storia|story|scena|card)\s*\d+\s*[:.)\-]?\s*$/i;
function splitBulk(text) {
  let t = (text || '').replace(/\r/g, '').trim();
  if (!t) return [];
  let blocks;
  if (t.split('\n').some(l => FRAME_MARKER.test(l))) {
    blocks = []; let cur = [];
    t.split('\n').forEach(l => {
      if (FRAME_MARKER.test(l)) { if (cur.join('').trim()) blocks.push(cur.join('\n')); cur = []; }
      else cur.push(l);
    });
    if (cur.join('').trim()) blocks.push(cur.join('\n'));
  } else if (/\n\s*---\s*\n/.test(t)) {
    blocks = t.split(/\n\s*---\s*\n/);
  } else {
    blocks = t.split(/\n\s*\n/);
  }
  return blocks.map(b => b.trim()).filter(Boolean).map(b => {
    const lines = b.split('\n');
    const title = lines.shift().replace(/^#+\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    return { title, body: lines.join('\n').trim(), raw: b };
  });
}

/* preset di flusso: pattern di stili head / body / tail applicato ai frame */
const FLOW_PRESETS = [
  { id: 'hook-step-cta', name: 'Hook → Step → CTA', head: 'cover', body: 'step', tail: 'cta' },
  { id: 'cover-prose-cta', name: 'Cover → Racconto → CTA', head: 'cover', body: 'prose', tail: 'cta' },
  { id: 'prose-cta', name: 'Racconto → CTA', head: 'prose', body: 'prose', tail: 'cta' },
];

const CTA_RE = /\b(dm|dmmi|scrivimi|commenta|comment|tap|swipe|link in bio|scopri|iscriviti|segui|follow|engine)\b/i;

/* indovina lo stile di un blocco in base al contenuto e alla posizione */
function detectStyle(block, i, n) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  const rest = lines.slice(1).join(' ');
  const wFirst = first.split(/\s+/).filter(Boolean).length;
  const hasBullets = /(^|\n)\s*[-•]/.test(block);
  if (i === n - 1 && CTA_RE.test(block)) return 'cta';
  if (i === 0 && wFirst <= 7 && !rest) return 'cover';
  if (hasBullets || (wFirst <= 7 && rest)) return 'step';
  return 'prose';
}

/* assegna a un frame stile + splitta title/body di conseguenza */
function applyStyle(fr, style, p) {
  fr.style = style;
  fr.cover = style === 'cover';
  if (style === 'prose' || style === 'cta') {
    if (p) { fr.title = ''; fr.body = p.raw; }
    else { fr.body = [fr.title, fr.body].filter(x => x && x.trim()).join('\n'); fr.title = ''; }
  } else if (p) { fr.title = p.title; fr.body = p.body; }
  else if (!(fr.title && fr.title.trim()) && fr.body) {
    // passo a titolo+corpo ma manca il titolo: promuovi la 1ª frase a titolo
    const m = fr.body.match(/^(.*?[.!?])\s+([\s\S]+)$/);
    if (m) { fr.title = m[1].trim(); fr.body = m[2].trim(); }
    else { fr.title = fr.body; fr.body = ''; }
  }
}

/* applica un preset di flusso ai frame correnti (o crea uno scheletro se sono vuoti) */
function applyPreset(s, preset) {
  if (s.frames.length < 3 && s.frames.every(f => !(f.title && f.title.trim()) && !(f.body && f.body.trim()))) {
    const pattern = [preset.head, preset.body, preset.body, preset.body, preset.tail];
    s.frames = pattern.map(st => { const fr = makeFrame(current); applyStyle(fr, st); return fr; });
  } else {
    const n = s.frames.length;
    s.frames.forEach((fr, i) => applyStyle(fr, i === 0 ? preset.head : (i === n - 1 ? preset.tail : preset.body)));
  }
  s.active = 0;
}

let current = TEMPLATES[0];

/* ---------- render ---------- */
let renderPending = false;
function render() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(async () => {
    renderPending = false;
    const s = stateFor(current);
    try {
      if (current.series) {
        const fr = activeFrame(s);
        const img = await loadImg(fr.photo);
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        current.draw(ctx, fr, img, s);
        ctx.restore();
      } else {
        const img = await loadImg(s.photo);
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        current.draw(ctx, s, img);
        ctx.restore();
      }
    } catch (e) {
      ctx.fillStyle = '#26262a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f43334';
      ctx.font = '28px Inter';
      ctx.fillText('Foto non caricata: apri l\'app con start.command (serve il server locale)', 60, 120);
    }
  });
}

/* ---------- UI builders ---------- */
const tplGrid = document.getElementById('tplGrid');
const photoGrid = document.getElementById('photoGrid');
const photoAdjust = document.getElementById('photoAdjust');
const fieldsEl = document.getElementById('fields');
const upload = document.getElementById('photoUpload');

function buildTemplates() {
  tplGrid.innerHTML = '';
  TEMPLATES.forEach(t => {
    const b = document.createElement('button');
    b.innerHTML = `${t.name}<span>${t.hint}</span>`;
    b.className = t === current ? 'active' : '';
    b.onclick = () => {
      current = t;
      if (t.defaultFormat && t.defaultFormat !== FORMAT) {
        FORMAT = t.defaultFormat;
        H = FORMAT === '9:16' ? 1920 : 1350;
        canvas.height = H;
        canvas.style.aspectRatio = FORMAT === '9:16' ? '9 / 16' : '4 / 5';
      }
      buildAll();
      render();
    };
    tplGrid.appendChild(b);
  });
}

let userPhotos = [];
function photoTarget() {
  const s = stateFor(current);
  return current.series ? activeFrame(s) : s;
}
function buildPhotos() {
  photoGrid.innerHTML = '';
  const t = photoTarget();
  [...PRESET_PHOTOS, ...userPhotos].forEach(src => {
    const b = document.createElement('button');
    b.className = 'ph' + (t.photo === src ? ' active' : '');
    b.style.backgroundImage = `url("${src}")`;
    b.title = src.split('/').pop();
    b.onclick = () => { t.photo = src; buildPhotos(); render(); };
    photoGrid.appendChild(b);
  });
  const up = document.createElement('button');
  up.className = 'up';
  up.textContent = '+';
  up.title = 'Carica una tua foto (per il cutout usa un PNG senza sfondo)';
  up.onclick = () => upload.click();
  photoGrid.appendChild(up);
}

upload.onchange = () => {
  const f = upload.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  userPhotos.push(url);
  photoTarget().photo = url;
  buildPhotos();
  render();
  upload.value = '';
};

function sliderRow(label, value, min, max, step, oninput) {
  const row = document.createElement('div');
  row.className = 'row';
  const lab = document.createElement('label');
  lab.textContent = label;
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = value;
  const val = document.createElement('span');
  val.className = 'val'; val.textContent = value;
  inp.oninput = () => { val.textContent = inp.value; oninput(parseFloat(inp.value)); render(); };
  row.append(lab, inp, val);
  return row;
}

function buildAdjust() {
  const s = stateFor(current);
  if (s.tsize === undefined) s.tsize = 100;
  photoAdjust.innerHTML = '';
  const fmtRow = document.createElement('div');
  fmtRow.className = 'row';
  const lab = document.createElement('label');
  lab.textContent = 'Formato';
  fmtRow.appendChild(lab);
  [['4:5', '4:5 feed'], ['9:16', '9:16 story']].forEach(([f, name]) => {
    const b = document.createElement('button');
    b.textContent = name;
    b.className = 'fmt' + (FORMAT === f ? ' active' : '');
    b.onclick = () => setFormat(f);
    fmtRow.appendChild(b);
  });
  const adj = current.series ? activeFrame(s) : s;
  photoAdjust.append(
    fmtRow,
    sliderRow('Dimensione testi %', s.tsize, 60, 180, 1, v => s.tsize = v),
    sliderRow('Zoom', adj.zoom, 1, 3, 0.02, v => adj.zoom = v),
    sliderRow('Sposta ↔', adj.ox, -60, 60, 1, v => adj.ox = v),
    sliderRow('Sposta ↕', adj.oy, -60, 60, 1, v => adj.oy = v),
  );
}

function updateExportBtn() {
  document.getElementById('exportBtn').textContent =
    current.series ? 'Scarica tutte le storie (ZIP)' : `Scarica PNG (${W}×${H})`;
}

/* pannello serie: striscia dei frame + incolla/dividi */
function buildSeriesPanel(s) {
  const panel = document.createElement('div');
  panel.style.marginBottom = '16px';

  const head = document.createElement('label');
  head.className = 'head';
  head.style.cssText = 'display:block;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#8e8d8b;margin-bottom:8px;';
  head.textContent = `Frame della serie (${s.frames.length})`;
  panel.appendChild(head);

  const strip = document.createElement('div');
  strip.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;';
  s.frames.forEach((fr, i) => {
    const b = document.createElement('button');
    const st = fr.style || (fr.cover ? 'cover' : 'step');
    b.textContent = st === 'cover' ? '★' : st === 'cta' ? '➤' : st === 'prose' ? '¶' : (i + 1);
    b.title = `Frame ${i + 1} · ${st}`;
    b.style.cssText = `width:40px;height:40px;border-radius:8px;font-family:inherit;font-size:13px;cursor:pointer;border:1px solid ${i === s.active ? 'var(--orange)' : '#333'};background:${i === s.active ? '#2d2620' : '#26262a'};color:${i === s.active ? 'var(--cream)' : 'var(--mist)'};`;
    b.onclick = () => { s.active = i; buildAll(); render(); };
    strip.appendChild(b);
  });
  const add = document.createElement('button');
  add.textContent = '+';
  add.title = 'Aggiungi frame';
  add.style.cssText = 'width:40px;height:40px;border-radius:8px;border:1px dashed #555;background:none;color:#8e8d8b;font-size:18px;cursor:pointer;';
  add.onclick = () => { s.frames.push(makeFrame(current)); s.active = s.frames.length - 1; buildAll(); render(); };
  strip.appendChild(add);
  panel.appendChild(strip);

  if (s.frames.length > 1) {
    const del = document.createElement('button');
    del.className = 'btn ghost';
    del.textContent = `🗑 Elimina frame ${s.active + 1}`;
    del.onclick = () => {
      s.frames.splice(s.active, 1);
      s.active = Math.min(s.active, s.frames.length - 1);
      buildAll(); render();
    };
    panel.appendChild(del);
  }

  const bulkWrap = document.createElement('div');
  bulkWrap.className = 'field';
  const bulkLab = document.createElement('label');
  bulkLab.innerHTML = 'Incolla tutto il testo qui, poi «Dividi»';
  const bulk = document.createElement('textarea');
  bulk.style.minHeight = '120px';
  bulk.value = s.bulk || '';
  bulk.oninput = () => { s.bulk = bulk.value; };
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:10px;color:#8e8d8b;margin:4px 0 8px;line-height:1.4;';
  hint.textContent = 'Separa i frame con «Frame 1 / Frame 2…», una riga --- o una riga vuota. La 1ª riga di ogni blocco è il titolo, il resto è il testo. Le foto già scelte restano al loro posto.';
  const split = document.createElement('button');
  split.className = 'btn ghost';
  split.textContent = '✂️ Dividi in frame';
  split.onclick = () => {
    const parsed = splitBulk(s.bulk);
    if (!parsed.length) return;
    const old = s.frames;
    s.frames = parsed.map((p, i) => {
      const fr = makeFrame(current);
      if (old[i]) { fr.photo = old[i].photo; fr.zoom = old[i].zoom; fr.ox = old[i].ox; fr.oy = old[i].oy; }
      applyStyle(fr, detectStyle(p.raw, i, parsed.length), p);
      return fr;
    });
    if (s.flow) applyPreset(s, s.flow);
    s.active = 0;
    buildAll();
    render();
  };
  bulkWrap.append(bulkLab, bulk, hint, split);
  panel.appendChild(bulkWrap);

  // preset di flusso: applica uno schema di stili ai frame (o crea uno scheletro)
  const flowLab = document.createElement('div');
  flowLab.style.cssText = 'font-size:11px;color:var(--mist);margin:2px 0 6px;';
  flowLab.textContent = 'Flusso — struttura gli stili dei frame:';
  panel.appendChild(flowLab);
  FLOW_PRESETS.forEach(p => {
    const b = document.createElement('button');
    b.className = 'btn ghost';
    b.textContent = (s.flow && s.flow.id === p.id ? '✓ ' : '') + p.name;
    b.onclick = () => { s.flow = p; applyPreset(s, p); buildAll(); render(); };
    panel.appendChild(b);
  });

  const hr = document.createElement('hr');
  panel.appendChild(hr);
  fieldsEl.appendChild(panel);
}

function buildFields() {
  const s = stateFor(current);
  fieldsEl.innerHTML = '';
  if (current.series) buildSeriesPanel(s);
  current.fields.forEach(f => {
    const target = current.series ? (f.scope === 'series' ? s : activeFrame(s)) : s;
    if (f.type === 'text' || f.type === 'textarea') {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lab = document.createElement('label');
      lab.textContent = f.label;
      const inp = document.createElement(f.type === 'text' ? 'input' : 'textarea');
      if (f.type === 'text') inp.type = 'text';
      inp.value = target[f.key];
      inp.oninput = () => { target[f.key] = inp.value; render(); };
      wrap.append(lab, inp);
      fieldsEl.appendChild(wrap);
    } else if (f.type === 'range') {
      fieldsEl.appendChild(sliderRow(f.label, target[f.key], f.min, f.max, 1, v => target[f.key] = v));
    } else if (f.type === 'seg') {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lab = document.createElement('label');
      lab.textContent = f.label;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;';
      f.options.forEach(o => {
        const b = document.createElement('button');
        b.className = 'fmt' + ((target[f.key] || f.def) === o.val ? ' active' : '');
        b.style.cssText = 'flex:1;background:#26262a;color:var(--mist);border:1px solid #333;border-radius:6px;padding:7px 4px;font-size:11px;font-family:inherit;cursor:pointer;';
        if ((target[f.key] || f.def) === o.val) { b.style.borderColor = 'var(--orange)'; b.style.color = 'var(--cream)'; b.style.background = '#2d2620'; }
        b.textContent = o.label;
        b.onclick = () => { target[f.key] = o.val; if (f.key === 'style') target.cover = o.val === 'cover'; buildFields(); render(); };
        row.appendChild(b);
      });
      wrap.append(lab, row);
      fieldsEl.appendChild(wrap);
    } else if (f.type === 'swatch') {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lab = document.createElement('label');
      lab.textContent = f.label;
      const sw = document.createElement('div');
      sw.className = 'swatches';
      BRAND.forEach(col => {
        const b = document.createElement('button');
        b.style.background = col;
        b.title = col;
        if (target[f.key].toLowerCase() === col.toLowerCase()) b.className = 'active';
        b.onclick = () => {
          target[f.key] = col;
          sw.querySelectorAll('button').forEach(x => x.className = '');
          b.className = 'active';
          render();
        };
        sw.appendChild(b);
      });
      wrap.append(lab, sw);
      fieldsEl.appendChild(wrap);
    } else if (f.type === 'button') {
      const b = document.createElement('button');
      b.className = 'btn ghost';
      b.textContent = f.label;
      const status = document.createElement('div');
      status.style.cssText = 'font-size:11px;color:#b6b394;margin:-4px 0 10px;min-height:14px;';
      b.onclick = async () => {
        b.disabled = true;
        try {
          await f.action(s, msg => { status.textContent = msg; });
        } catch (e) {
          status.textContent = 'Errore: ' + (e.message || e);
        }
        b.disabled = false;
        render();
      };
      fieldsEl.append(b, status);
    } else if (f.type === 'apikey') {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lab = document.createElement('label');
      lab.textContent = f.label;
      const inp = document.createElement('input');
      inp.type = 'password';
      inp.placeholder = 'incolla qui la tua key (resta solo su questo Mac)';
      inp.value = localStorage.getItem('geminiKey') || '';
      inp.oninput = () => localStorage.setItem('geminiKey', inp.value.trim());
      wrap.append(lab, inp);
      fieldsEl.appendChild(wrap);
    } else if (f.type === 'check') {
      const lab = document.createElement('label');
      lab.className = 'check';
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.checked = target[f.key];
      inp.onchange = () => { target[f.key] = inp.checked; render(); };
      lab.append(inp, document.createTextNode(f.label));
      fieldsEl.appendChild(lab);
    }
  });
}

function buildAll() {
  buildTemplates();
  buildPhotos();
  buildAdjust();
  buildFields();
  updateExportBtn();
}

/* ---------- export ---------- */
function exportSingle() {
  const a = document.createElement('a');
  a.download = `dataspark-${current.id}-${FORMAT.replace(':', 'x')}-${new Date().toISOString().slice(0, 10)}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

async function exportSeries() {
  const btn = document.getElementById('exportBtn');
  const label = btn.textContent;
  const s = stateFor(current);
  const date = new Date().toISOString().slice(0, 10);
  const shots = [];
  for (let i = 0; i < s.frames.length; i++) {
    btn.textContent = `Preparo storia ${i + 1}/${s.frames.length}…`;
    const fr = s.frames[i];
    let img;
    try { img = await loadImg(fr.photo); } catch (e) { continue; }
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    current.draw(ctx, fr, img, s);
    ctx.restore();
    shots.push({ name: `storia-${String(i + 1).padStart(2, '0')}.png`, data: canvas.toDataURL('image/png') });
  }
  try {
    const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
    const zip = new JSZip();
    shots.forEach(sh => zip.file(sh.name, sh.data.split(',')[1], { base64: true }));
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.download = `dataspark-storie-${date}.zip`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) {
    // fallback offline: download singoli scaglionati
    for (const sh of shots) {
      const a = document.createElement('a');
      a.download = `dataspark-${date}-${sh.name}`;
      a.href = sh.data;
      a.click();
      await new Promise(r => setTimeout(r, 400));
    }
  }
  btn.textContent = label;
  render();
}

document.getElementById('exportBtn').onclick = () => current.series ? exportSeries() : exportSingle();

/* ---------- boot ---------- */
buildAll();
render();
// i font Google non si caricano da soli per il canvas: forza il load, poi ridisegna
if (document.fonts) {
  Promise.all([
    document.fonts.load("400 40px 'Permanent Marker'"),
    document.fonts.load("400 40px 'Zeyada'"),
    document.fonts.load("400 40px 'La Belle Aurore'"),
    document.fonts.load("400 40px 'Shadows Into Light'"),
    document.fonts.load("500 40px 'Archivo'"),
    document.fonts.load("700 40px 'Archivo'"),
    document.fonts.load("400 40px 'EB Garamond'"),
  ]).then(render).catch(render);
}
