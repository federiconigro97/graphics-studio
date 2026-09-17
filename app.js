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

// Palette allineata a brand/brand-system.md (moodboard 2026-09). Accenti: Tiger Flame #ee003a + Arancio #ee6a2d.
const BRAND = ['#1a1a1a','#ee003a','#ee6a2d','#df2620','#8a6a5a','#639b98','#1a5e99','#dbdfdd','#f4efe4','#7d766c','#ffffff'];

/* Font stack fedeli alle reference */
const SANS = "'Helvetica Now Display','Helvetica Neue',Helvetica,Arial,sans-serif";      // statement / card / blur B&N
const HAND = "'Reenie Beanie','Shadows Into Light Two',cursive"; // scrittura a mano primaria (marker autentico, stile board "Slow things fast minds", maiuscolo+minuscolo)
const MARKER = "'Permanent Marker',cursive";                // marker pesante (solo cartello)
const SCRIPT = "'Zeyada','La Belle Aurore',cursive";        // corsivo calligrafico (opzionale)
// serif rimosso dal brand 2026-09 (solo scrittura a mano + Helvetica bold)

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
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(W / iw, H / ih) * zoom;
  const w = iw * s, h = ih * s;
  c.drawImage(img, (W - w) / 2 + ox / 100 * W, (H - h) / 2 + oy / 100 * H, w, h);
}

/* Grayscale + contrast/brightness a mano (getImageData). Serve perché ctx.filter
   NON è supportato su Safari iOS / molti browser mobile → là il B/N non veniva applicato.
   Ritorna un canvas offscreen (cacheato per src). */
const _grayCache = {};
function grayscaleCanvas(img, contrast = 1, brightness = 1) {
  const src = img.src || img.dataset && img.dataset.gid || '';
  const key = `${src}|${contrast}|${brightness}`;
  if (src && _grayCache[key]) return _grayCache[key];
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    let v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    v = (v - 128) * contrast + 128;
    v *= brightness;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(id, 0, 0);
  if (src) _grayCache[key] = cv;
  return cv;
}

/* Cover-draw con sfocatura cross-browser (downscale→upscale, niente ctx.filter). */
function coverDrawBlurred(c, img, zoom, ox, oy, blurPx) {
  if (!blurPx || blurPx <= 0) { coverDraw(c, img, zoom, ox, oy); return; }
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const down = Math.max(0.02, 1 / (1 + blurPx * 0.9));
  const sw = Math.max(2, Math.round(iw * down)), sh = Math.max(2, Math.round(ih * down));
  const off = document.createElement('canvas');
  off.width = sw; off.height = sh;
  const o = off.getContext('2d');
  o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
  o.drawImage(img, 0, 0, sw, sh);
  const s = Math.max(W / iw, H / ih) * zoom;
  const w = iw * s, h = ih * s;
  c.save();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(off, (W - w) / 2 + ox / 100 * W, (H - h) / 2 + oy / 100 * H, w, h);
  c.restore();
}

/* Slow-shutter / lunga esposizione: media temporale di N copie del soggetto in
   movimento (traslazione + leggera rotazione/scala lungo un vettore, con easing e
   una curva laterale) → smear direzionale organico invece del doppione orizzontale
   rigido di blur-motion. Niente ctx.filter → funziona su Safari iOS / mobile. */
function longExposureDraw(c, img, s, motion, angleDeg, swirlDeg) {
  if (!motion || motion <= 0) { coverDraw(c, img, s.zoom, s.ox, s.oy); return; }
  const N = 30;
  const rad = angleDeg * Math.PI / 180;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const o = off.getContext('2d');
  o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);
    const ease = t * t;                       // accelera → base nitida, coda che sfuma
    const perp = Math.sin(t * Math.PI) * motion * 0.14;  // curva laterale → traiettoria organica
    const dx = Math.cos(rad) * motion * ease - Math.sin(rad) * perp;
    const dy = Math.sin(rad) * motion * ease + Math.cos(rad) * perp;
    const rot = swirlDeg * Math.PI / 180 * ease;
    const scl = 1 + 0.05 * ease;
    o.globalAlpha = 1 / (k + 1);              // media progressiva = mean(frame) = vera lunga esposizione
    o.save();
    o.translate(W / 2 + dx, H / 2 + dy);
    o.rotate(rot);
    o.scale(scl, scl);
    o.translate(-W / 2, -H / 2);
    coverDraw(o, img, s.zoom, s.ox, s.oy);
    o.restore();
  }
  c.drawImage(off, 0, 0);
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
          family = HAND, weight = 400, seed = 1, jitter = true, hl, hlStyle = 'nastro' } = opts;
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

/* ---------- AI: avatar di sfondo via Gemini (nano-banana), parte dalla foto scelta ---------- */
function imgToB64(img, maxDim = 1024) {
  const s = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * s);
  cv.height = Math.round(img.naturalHeight * s);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.9).split(',')[1];
}

/* Stile-foto brand: appeso a ogni prompt così l'output ha il look moodboard (cinematografico, caldo, desaturato). */
const BRAND_PHOTO_STYLE = 'Editorial film photography, cinematic, warm natural light, high contrast, slightly desaturated muted tones, candid aspirational lifestyle, 35mm, shallow depth of field. No text, no logos, no watermark.';

const SCENE_PRESETS = [
  { label: 'Surf', prompt: 'a lone surfer riding a clean ocean wave at golden hour, shot from the beach' },
  { label: 'Moto', prompt: 'a vintage cafe racer motorcycle parked on a sunlit european city street' },
  { label: 'Laptop', prompt: 'a man working on a laptop in a warm minimal cafe, side profile, focused' },
  { label: 'Costa', prompt: 'a dramatic rocky coastline with turquoise sea under warm afternoon light' },
  { label: 'Aereo', prompt: 'the view out of an airplane window over clouds at sunset, wing visible' },
  { label: 'Interno', prompt: 'a warm minimal interior with a designer leather chair, plants and books, cozy evening light' },
  { label: 'Città', prompt: 'a solo figure walking across a modern city bridge, cinematic wide shot from behind' },
  { label: 'Oceano', prompt: 'open sea horizon from a boat, spray and motion, adventurous mood' },
];

/* Genera una foto lifestyle on-brand via Gemini. opts: { prompt, useFace, faceSrc, format } */
async function generatePhoto({ prompt, useFace, faceSrc, format }, setStatus) {
  const key = (localStorage.getItem('geminiKey') || '').trim();
  if (!key) { setStatus('Serve la API key Gemini (campo qui sopra, gratis su aistudio.google.com).'); return; }
  if (!prompt || !prompt.trim()) { setStatus('Scrivi una scena o scegli un preset.'); return; }
  const parts = [];
  if (useFace && faceSrc) {
    setStatus('Preparo la foto di riferimento…');
    try { parts.push({ inline_data: { mime_type: 'image/jpeg', data: imgToB64(await loadImg(faceSrc)) } }); } catch {}
  }
  const full = `${prompt.trim()}.${useFace ? ' Feature this exact same person, identical face and hair.' : ''} ${BRAND_PHOTO_STYLE}`;
  parts.push({ text: full });
  const ar = format === '9:16' ? '9:16' : '4:5';
  const call = (genCfg) => fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], ...(genCfg ? { generationConfig: genCfg } : {}) })
    }
  );
  setStatus('Genero la foto… (10-30 secondi)');
  let resp = await call({ responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: ar } });
  if (!resp.ok) resp = await call(null);
  const json = await resp.json();
  if (!resp.ok) { setStatus('Errore Gemini: ' + (json.error?.message || resp.status)); return; }
  const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.inline_data);
  if (!part) { setStatus('Gemini non ha restituito un\'immagine, riprova.'); return; }
  const d = part.inlineData || part.inline_data;
  const url = `data:${d.mimeType || d.mime_type};base64,${d.data}`;
  userPhotos.push(url);
  photoTarget().photo = url;
  buildPhotos();
  render();
  setStatus('Foto creata ✓ e selezionata.');
}

/* headline impilata stile moodboard: righe manuali (\n), peso bold, interlinea stretta,
   ogni riga adattata alla larghezza. Ritorna { size, bottom } per posizionare gli altri elementi. */
function drawStackHeadline(c, lines, x, y, maxSize, maxW, color, weight = 800, lh = 0.94, align = 'left', hlColor, hlStyle = 'nastro') {
  const rows = lines.map(l => l).filter(l => l.trim().length);
  if (!rows.length) return { size: 0, bottom: y };
  let size = maxSize;
  for (const l of rows) size = Math.min(size, fitSize(c, stripMarks(l), maxSize, maxW, weight, SANS));
  setFont(c, weight, size, SANS);
  letterSpace(c, -size * 0.01);
  c.textBaseline = 'alphabetic';
  c.fillStyle = color;
  let cy = y + size * 0.82;
  for (const l of rows) {
    drawMarkedLine(c, l, x, cy, size, hlColor, align, 'alphabetic', hlStyle);
    cy += size * lh;
  }
  letterSpace(c, 0);
  return { size, bottom: cy - size * (lh - 0.82) };
}

/* lista tag moodboard: uppercase, tracking largo. Verticale (colonna) o riga con separatore. */
function drawTagList(c, tags, x, y, size, color, opts = {}) {
  const { vertical = true, lh = 2.1, align = 'left', ls = 3, weight = 600, sep = '   ·   ' } = opts;
  const items = tags.map(t => t.trim().toUpperCase()).filter(Boolean);
  if (!items.length) return y;
  c.save();
  setFont(c, weight, size, SANS);
  letterSpace(c, ls);
  c.fillStyle = color;
  c.textBaseline = 'alphabetic';
  c.textAlign = align;
  if (vertical) {
    items.forEach((t, i) => c.fillText(t, x, y + i * size * lh));
  } else {
    c.fillText(items.join(sep), x, y);
  }
  letterSpace(c, 0);
  c.restore();
  return vertical ? y + items.length * size * lh : y;
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
      { key: 'inkColor', label: 'Colore scritte', type: 'swatch', def: '#ee003a' },
      { key: 'modern', label: 'Font moderno (Helvetica, niente scrittura a mano)', type: 'check', def: false },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#f4efe4' },
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
                   family: s.modern ? SANS : HAND,
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
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#ee003a' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#f4efe4' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: false },
    ],
    draw(c, s, img) {
      // grayscale a mano (niente ctx.filter → funziona anche su Safari iOS / mobile)
      const gray = grayscaleCanvas(img, 1.12, 1.05);
      c.save();
      coverDraw(c, gray, s.zoom, s.ox, s.oy);
      if (s.motion > 0) {
        c.globalAlpha = 0.14;
        for (let i = 1; i <= 7; i++) {
          const off = i * s.motion / 2.2;
          c.save(); c.translate(off, 0); coverDraw(c, gray, s.zoom, s.ox, s.oy); c.restore();
          c.save(); c.translate(-off, 0); coverDraw(c, gray, s.zoom, s.ox, s.oy); c.restore();
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
    id: 'blur-longexp',
    name: 'Blur B/N slow-shutter',
    hint: 'lunga esposizione, smear organico',
    defaultPhoto: 'assets/photo-azulejos.jpg',
    fields: [
      { key: 'credit', label: 'Credit a sx', type: 'textarea', def: 'FEDERICO NIGRO\nDATA SPARK' },
      { key: 'title', label: 'Titolo a dx', type: 'text', def: 'BUILT IN MOTION' },
      { key: 'subtitle', label: 'Sottotitolo a dx', type: 'text', def: 'A MOMENT CAPTURED ON THE FAST LANE' },
      { key: 'motion', label: 'Lunghezza esposizione', type: 'range', def: 40, min: 0, max: 90 },
      { key: 'angle', label: 'Direzione (gradi)', type: 'range', def: -80, min: -180, max: 180 },
      { key: 'swirl', label: 'Rotazione organica', type: 'range', def: 5, min: 0, max: 20 },
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#ee003a' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#f4efe4' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: false },
    ],
    draw(c, s, img) {
      // grayscale a mano (niente ctx.filter → funziona anche su Safari iOS / mobile)
      const gray = grayscaleCanvas(img, 1.12, 1.05);
      longExposureDraw(c, gray, s, s.motion, s.angle, s.swirl);
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
    id: 'statement-blur',
    name: 'Statement su blur',
    hint: 'titolo rosso giustificato',
    defaultPhoto: 'assets/photo-cafe.jpg',
    fields: [
      { key: 'headline', label: 'Headline', type: 'textarea', def: 'Because growth starts when someone feels your brand belongs.' },
      { key: 'blur', label: 'Sfocatura foto', type: 'range', def: 14, min: 0, max: 40 },
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#ee003a' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#f4efe4' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'size', label: 'Corpo testo', type: 'range', def: 64, min: 40, max: 90 },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: true },
    ],
    draw(c, s, img) {
      // sfocatura cross-browser (niente ctx.filter, che manca su Safari iOS / mobile)
      coverDrawBlurred(c, img, s.zoom * (1 + s.blur / 200), s.ox, s.oy, s.blur);
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
      { key: 'cardColor', label: 'Colore card', type: 'swatch', def: '#639b98' },
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#f4efe4' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#ee003a' },
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
    id: 'growth-engine',
    name: 'Blocco Growth Engine',
    hint: 'headline enorme + tag',
    defaultPhoto: 'assets/photo-cafe.jpg',
    fields: [
      { key: 'headline', label: 'Headline (una parola per riga)', type: 'textarea', def: 'THE\nGROWTH\nENGINE' },
      { key: 'tags', label: 'Tag (uno per riga)', type: 'textarea', def: 'CONTENT\nOUTBOUND\nSYSTEMS\nAI\nPEOPLE' },
      { key: 'subcopy', label: 'Sottotesto (Helvetica)', type: 'textarea', def: 'Un motore di content e outbound che gira ogni giorno nella tua voce.' },
      { key: 'bgMode', label: 'Sfondo', type: 'seg', def: 'cream',
        options: [{ val: 'cream', label: 'Cream' }, { val: 'color', label: 'Colore' }, { val: 'photo', label: 'Foto' }] },
      { key: 'bgColor', label: 'Colore sfondo (se "Colore")', type: 'swatch', def: '#df2620' },
      { key: 'txtColor', label: 'Colore headline', type: 'swatch', def: '#1a1a1a' },
      { key: 'accent', label: 'Colore tag / accento', type: 'swatch', def: '#ee003a' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* in headline)', type: 'swatch', def: '#ee003a' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'showStar', label: 'Star spark accanto alla headline', type: 'check', def: false },
    ],
    draw(c, s, img) {
      if (s.bgMode === 'photo') {
        coverDraw(c, img, s.zoom, s.ox, s.oy);
        c.save(); c.fillStyle = 'rgba(12,10,9,0.42)'; c.fillRect(0, 0, W, H); c.restore();
      } else {
        c.fillStyle = s.bgMode === 'color' ? s.bgColor : '#f4efe4';
        c.fillRect(0, 0, W, H);
      }
      const T = (s.tsize || 100) / 100;
      const M = 90;
      const hlStyle = s.hlCircle ? 'cerchio' : 'nastro';
      const headCol = s.bgMode === 'photo' ? '#f4efe4' : s.txtColor;  // su foto headline chiara, leggibile
      const hd = drawStackHeadline(c, s.headline.split('\n'), M, sy(150), 200 * T, W - M * 2 - 120,
        headCol, 800, 0.92, 'left', s.hlColor, hlStyle);
      if (s.showStar) drawLogo(c, W - M - 46, sy(150) + hd.size * 0.5, 84, s.accent);
      // colonna tag a destra, allineata all'inizio della headline
      drawTagList(c, s.tags.split('\n'), W - M, sy(180), 22 * T, s.accent, { vertical: true, lh: 2.2, align: 'right', ls: 3, weight: 600 });
      // sottotesto Helvetica in basso
      if (s.subcopy.trim()) {
        c.save();
        setFont(c, 500, 34 * T, SANS);
        c.fillStyle = s.bgMode === 'photo' ? '#f4efe4' : s.txtColor;
        c.textBaseline = 'alphabetic';
        const lines = wrapLines(c, s.subcopy, W - M * 2 - 260);
        let cy = H - 150 - (lines.length - 1) * 46 * T;
        lines.forEach(l => { c.fillText(l.join(' '), M, cy); cy += 46 * T; });
        c.restore();
      }
      if (s.bgMode !== 'photo') drawGrain(c, 0.05);
    }
  },

  {
    id: 'text-card',
    name: 'Card testo pieno',
    hint: 'statement su colore, niente foto',
    defaultPhoto: 'assets/photo-cafe.jpg',
    fields: [
      { key: 'eyebrow', label: 'Occhiello (piccolo, sopra)', type: 'text', def: '' },
      { key: 'headline', label: 'Statement (una parola/riga per riga)', type: 'textarea', def: 'IDEAS\nMOVE\nPEOPLE.' },
      { key: 'tags', label: 'Tag in basso (uno per riga)', type: 'textarea', def: '' },
      { key: 'bgColor', label: 'Sfondo', type: 'swatch', def: '#df2620' },
      { key: 'txtColor', label: 'Colore testo', type: 'swatch', def: '#f4efe4' },
      { key: 'accent', label: 'Colore occhiello / tag', type: 'swatch', def: '#f4efe4' },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nel testo)', type: 'swatch', def: '#1a1a1a' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'align', label: 'Allineamento', type: 'seg', def: 'left',
        options: [{ val: 'left', label: 'Sinistra' }, { val: 'center', label: 'Centro' }] },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: false },
    ],
    draw(c, s, img) {
      c.fillStyle = s.bgColor;
      c.fillRect(0, 0, W, H);
      drawGrain(c, 0.1);
      const T = (s.tsize || 100) / 100;
      const M = 90;
      const al = s.align === 'center' ? 'center' : 'left';
      const hx = al === 'center' ? W / 2 : M;
      const hlStyle = s.hlCircle ? 'cerchio' : 'nastro';
      if (s.eyebrow.trim()) {
        c.save();
        setFont(c, 600, 24 * T, SANS);
        letterSpace(c, 4);
        c.fillStyle = s.accent;
        c.textAlign = al; c.textBaseline = 'alphabetic';
        c.fillText(s.eyebrow.toUpperCase(), hx, sy(230));
        letterSpace(c, 0);
        c.restore();
      }
      // blocco headline centrato verticalmente
      const rows = s.headline.split('\n').filter(l => l.trim());
      let size = 200 * T;
      for (const l of rows) size = Math.min(size, fitSize(c, stripMarks(l), 200 * T, W - M * 2, 800, SANS));
      const blockH = rows.length * size * 0.98;
      drawStackHeadline(c, rows, hx, (H - blockH) / 2 - size * 0.1, size, W - M * 2,
        s.txtColor, 800, 0.98, al, s.hlColor, hlStyle);
      drawTagList(c, s.tags.split('\n'), hx, H - 150, 22 * T, s.accent,
        { vertical: false, align: al, ls: 3, weight: 600 });
      if (s.showLogo) drawLogo(c, al === 'center' ? W / 2 : W - M - 30, H - 130, 60, s.accent);
      drawGrain(c, 0.04);
    }
  },

  {
    id: 'hand-photo',
    name: 'Frase a mano su foto',
    hint: '1 foto + 1 frase scritta a mano',
    defaultPhoto: 'assets/photo-park.jpg',
    fields: [
      { key: 'phrase', label: 'Frase (maiuscolo o minuscolo, come scrivi)', type: 'textarea', def: 'SLOW THINGS\nFAST MINDS' },
      { key: 'font', label: 'Stile scrittura', type: 'seg', def: 'hand',
        options: [{ val: 'hand', label: 'A mano' }, { val: 'script', label: 'Corsivo' }, { val: 'marker', label: 'Marker' }] },
      { key: 'inkColor', label: 'Colore scritta', type: 'swatch', def: '#ee003a' },
      { key: 'eyebrow', label: 'Occhiello sans (piccolo, in alto)', type: 'text', def: '' },
      { key: 'posX', label: 'Posizione ↔', type: 'range', def: 50, min: 5, max: 95 },
      { key: 'posY', label: 'Posizione ↕', type: 'range', def: 50, min: 5, max: 95 },
      { key: 'phraseSize', label: 'Dimensione frase', type: 'range', def: 70, min: 30, max: 130 },
      { key: 'rot', label: 'Rotazione', type: 'range', def: -5, min: -15, max: 15 },
      { key: 'tint', label: 'Scurisci foto (leggibilità)', type: 'range', def: 22, min: 0, max: 70 },
      { key: 'hlColor', label: 'Evidenziatore (*parola* nella frase)', type: 'swatch', def: '#f4efe4' },
      { key: 'hlCircle', label: 'Evidenzia a cerchio (invece del nastro)', type: 'check', def: false },
      { key: 'showLogo', label: 'Logo spark in basso', type: 'check', def: false },
    ],
    draw(c, s, img) {
      coverDraw(c, img, s.zoom, s.ox, s.oy);
      if (s.tint > 0) { c.save(); c.fillStyle = `rgba(12,10,9,${s.tint / 100})`; c.fillRect(0, 0, W, H); c.restore(); }
      const T = (s.tsize || 100) / 100;
      if (s.eyebrow.trim()) {
        c.save();
        setFont(c, 600, 24 * T, SANS);
        letterSpace(c, 4);
        c.fillStyle = s.inkColor;
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.fillText(s.eyebrow.toUpperCase(), 90, sy(120));
        letterSpace(c, 0);
        c.restore();
      }
      drawHand(c, {
        text: s.phrase,
        x: s.posX / 100 * W, y: s.posY / 100 * H,
        size: s.phraseSize * T, rot: s.rot,
        color: s.inkColor,
        family: s.font === 'script' ? SCRIPT : s.font === 'marker' ? MARKER : HAND,
        weight: 400, jitter: s.font !== 'script',
        hl: s.hlColor, hlStyle: s.hlCircle ? 'cerchio' : 'nastro', seed: 31,
      });
      if (s.showLogo) drawLogo(c, W / 2, H - 78, 60, s.inkColor);
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
        options: [{ val: 'cover', label: 'Cover' }, { val: 'prose', label: 'Racconto' }, { val: 'step', label: 'Step' }, { val: 'cta', label: 'CTA' }, { val: 'circle', label: 'Cerchio' }] },
      { key: 'title', scope: 'frame', label: 'Titolo del frame', type: 'textarea', def: 'Titolo del frame' },
      { key: 'body', scope: 'frame', label: 'Testo del frame', type: 'textarea', def: 'Testo del frame.\n- punto uno\n- punto due' },
      { key: 'accent', scope: 'series', label: 'Colore testo', type: 'swatch', def: '#f4efe4' },
      { key: 'hlColor', scope: 'series', label: 'Evidenziatore keyword (*parola* nel testo)', type: 'swatch', def: '#ee003a' },
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
      } else if (style === 'circle') {
        const { words, heading } = circleWords(f);
        const cx = W / 2, cy = H * 0.52, R = W * 0.28;
        drawCycleRing(c, cx, cy, R, acc, Math.max(2.5, W * 0.0035));
        c.save();
        c.fillStyle = acc; c.textBaseline = 'middle';
        const pad = 34, m = 40, baseS = 46 * T;
        const put = (txt, px, py, align, avail) => {
          if (!txt) return;
          c.textAlign = align;
          setFont(c, 500, fitSize(c, txt, baseS, avail, 500, SANS), SANS);
          c.fillText(txt, px, py);
        };
        put(words[0], cx, cy - R - pad, 'center', W - 2 * m);
        put(words[2], cx, cy + R + pad, 'center', W - 2 * m);
        put(words[3], cx - R - pad, cy, 'right', cx - R - pad - m);
        put(words[1], cx + R + pad, cy, 'left', W - m - (cx + R + pad));
        if (heading) {
          c.textAlign = 'center'; c.textBaseline = 'alphabetic';
          setFont(c, 600, fitSize(c, heading, 46 * T, W - 2 * m, 600, SANS), SANS);
          c.fillText(heading, W / 2, H * 0.16);
        }
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
      { key: 'accent', label: 'Colore testo', type: 'swatch', def: '#f4efe4' },
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
      { key: 'accent', label: 'Colore cerchio e testo', type: 'swatch', def: '#f4efe4' },
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
/* 4 parole (su/dx/giù/sx) + heading opzionale, per lo stile Cerchio.
   Sintassi: una riga con "a / b / c / d". Testo prima della riga = heading. */
function circleWords(f) {
  const raw = [f.title, f.body].filter(x => x && x.trim()).join('\n');
  const lines = raw.split('\n');
  let wl = lines.find(l => l.includes('/'));
  let heading = '';
  if (wl) heading = lines.filter(l => l !== wl && l.trim()).join(' ').trim();
  else wl = raw;
  const words = wl.split(/[\/\n]/).map(w => w.trim()).filter(Boolean).slice(0, 4);
  while (words.length < 4) words.push('');
  return { words, heading };
}

function applyStyle(fr, style, p) {
  fr.style = style;
  fr.cover = style === 'cover';
  if (style === 'circle') return;
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
      ctx.fillStyle = '#ee003a';
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
const aiPhotoEl = document.getElementById('aiPhoto');
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

const aiState = { prompt: '', useFace: false };
function buildAiPhoto() {
  aiPhotoEl.innerHTML = '';
  const mk = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
  // API key
  const keyWrap = mk('<div class="field"><label>API key Gemini (una volta, resta sul tuo Mac)</label><input type="password" placeholder="incolla la key…"></div>');
  const keyInp = keyWrap.querySelector('input');
  keyInp.value = localStorage.getItem('geminiKey') || '';
  keyInp.oninput = () => localStorage.setItem('geminiKey', keyInp.value.trim());
  aiPhotoEl.appendChild(keyWrap);
  // prompt
  const pWrap = mk('<div class="field"><label>Scena (in inglese rende meglio)</label><textarea placeholder="es. a lone surfer at golden hour"></textarea></div>');
  const pInp = pWrap.querySelector('textarea');
  pInp.value = aiState.prompt;
  pInp.oninput = () => aiState.prompt = pInp.value;
  aiPhotoEl.appendChild(pWrap);
  // preset chips
  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;';
  SCENE_PRESETS.forEach(s => {
    const b = document.createElement('button');
    b.textContent = s.label;
    b.style.cssText = 'background:#26262a;color:var(--mist);border:1px solid #333;border-radius:6px;padding:6px 10px;font-size:11px;font-family:inherit;cursor:pointer;';
    b.onclick = () => { aiState.prompt = s.prompt; pInp.value = s.prompt; };
    chips.appendChild(b);
  });
  aiPhotoEl.appendChild(chips);
  // usa la mia faccia
  const faceLab = document.createElement('label');
  faceLab.className = 'check';
  const faceChk = document.createElement('input');
  faceChk.type = 'checkbox'; faceChk.checked = aiState.useFace;
  faceChk.onchange = () => aiState.useFace = faceChk.checked;
  faceLab.append(faceChk, document.createTextNode(' Usa la mia faccia (dalla foto selezionata)'));
  aiPhotoEl.appendChild(faceLab);
  // status + generate
  const status = document.createElement('div');
  status.style.cssText = 'font-size:11px;color:#b6b394;margin:4px 0 8px;min-height:14px;';
  const gen = document.createElement('button');
  gen.className = 'btn ghost';
  gen.textContent = '✨ Genera foto on-brand';
  gen.onclick = () => generatePhoto(
    { prompt: aiState.prompt, useFace: aiState.useFace, faceSrc: photoTarget().photo, format: FORMAT },
    msg => status.textContent = msg
  );
  aiPhotoEl.append(gen, status);
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
    b.textContent = st === 'cover' ? '★' : st === 'cta' ? '➤' : st === 'prose' ? '¶' : st === 'circle' ? '◎' : (i + 1);
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
        b.onclick = () => {
          target[f.key] = o.val;
          if (f.key === 'style') {
            target.cover = o.val === 'cover';
            const bodyEmpty = !(target.body || '').trim() || target.body === 'Testo del frame.\n- punto uno\n- punto due';
            if (o.val === 'circle' && bodyEmpty && !(target.body || '').includes('/')) target.body = 'content / outbound / sistema / crescita';
          }
          buildFields(); render();
        };
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
  buildAiPhoto();
  buildAdjust();
  buildFields();
  updateExportBtn();
}

/* ---------- export ---------- */
const isMobile = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);

/* Salvataggio cross-device. iOS Safari IGNORA l'attributo <a download> e su http
   via IP LAN navigator.share non c'è (serve secure context). Quindi:
   1) share sheet nativo se disponibile (https/localhost) → "Salva immagine";
   2) mobile senza share → overlay: tieni premuto sull'immagine per salvarla (va anche http);
   3) desktop → download classico da blob. */
async function saveBlob(blob, filename) {
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }  // utente ha annullato lo share
  if (isMobile() && (blob.type || '').startsWith('image/')) { showSaveOverlay(blob, filename); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename; a.href = url; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function showSaveOverlay(blob, filename) {
  const url = URL.createObjectURL(blob);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;box-sizing:border-box';
  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'max-width:100%;max-height:76vh;border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,.5)';
  const tip = document.createElement('div');
  tip.textContent = 'Tieni premuto sull’immagine → Salva foto. Tocca fuori per chiudere.';
  tip.style.cssText = 'color:#f4efe4;font:500 15px/1.4 ' + SANS + ';text-align:center;max-width:320px';
  ov.appendChild(img); ov.appendChild(tip);
  ov.addEventListener('click', e => {
    if (e.target !== img) { document.body.removeChild(ov); URL.revokeObjectURL(url); }
  });
  document.body.appendChild(ov);
}

async function exportSingle() {
  const name = `dataspark-${current.id}-${FORMAT.replace(':', 'x')}-${new Date().toISOString().slice(0, 10)}.png`;
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) {  // fallback estremo
    const a = document.createElement('a');
    a.download = name; a.href = canvas.toDataURL('image/png'); a.click();
    return;
  }
  await saveBlob(blob, name);
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
    await saveBlob(blob, `dataspark-storie-${date}.zip`);
  } catch (e) {
    // fallback offline: salva i singoli PNG uno per uno (share/overlay/download secondo device)
    for (const sh of shots) {
      const b = await (await fetch(sh.data)).blob();
      await saveBlob(b, `dataspark-${date}-${sh.name}`);
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
    document.fonts.load("400 40px 'Reenie Beanie'"),
    document.fonts.load("400 40px 'Shadows Into Light Two'"),
    document.fonts.load("600 40px 'Caveat'"),
    document.fonts.load("700 40px 'Caveat'"),
    document.fonts.load("400 40px 'Permanent Marker'"),
    document.fonts.load("400 40px 'Zeyada'"),
    document.fonts.load("400 40px 'La Belle Aurore'"),
    document.fonts.load("400 40px 'Shadows Into Light'"),
    document.fonts.load("500 40px 'Archivo'"),
    document.fonts.load("700 40px 'Archivo'"),
    document.fonts.load("400 40px 'EB Garamond'"),
  ]).then(render).catch(render);
}

/* ---------- API programmatica (headless / flow) ----------
   window.GS.render(spec) -> Promise<dataURL PNG>. Riusa lo stesso codice canvas dell'app.
   spec = { template, format?, photo?, zoom?, ox?, oy?, tsize?, fields:{...} }
   Non-series only (feed + cover/cerchio storia). Vedi board.example.json + render.mjs. */
const _fontsReady = (document.fonts
  ? Promise.all([
      document.fonts.load("400 40px 'Reenie Beanie'"), document.fonts.load("400 40px 'Shadows Into Light Two'"),
      document.fonts.load("600 40px 'Caveat'"), document.fonts.load("700 40px 'Caveat'"),
      document.fonts.load("400 40px 'Permanent Marker'"), document.fonts.load("400 40px 'Zeyada'"),
      document.fonts.load("400 40px 'La Belle Aurore'"), document.fonts.load("400 40px 'Shadows Into Light'"),
      document.fonts.load("500 40px 'Archivo'"), document.fonts.load("700 40px 'Archivo'"),
    ]).then(() => document.fonts.ready).catch(() => {})
  : Promise.resolve());

window.GS = {
  fontsReady: _fontsReady,
  templates() {
    return TEMPLATES.map(t => ({
      id: t.id, name: t.name, series: !!t.series, format: t.defaultFormat || '4:5',
      fields: t.fields.filter(f => !['button', 'apikey'].includes(f.type))
        .map(f => ({ key: f.key, type: f.type, def: f.def, ...(f.options ? { options: f.options.map(o => o.val) } : {}) })),
    }));
  },
  async render(spec) {
    const tpl = TEMPLATES.find(t => t.id === spec.template);
    if (!tpl) throw new Error('template sconosciuto: ' + spec.template);
    if (tpl.series) throw new Error('template series non supportato da render(): ' + spec.template);
    const fmt = spec.format || tpl.defaultFormat || '4:5';
    const prevH = H, prevW = canvas.width, prevHt = canvas.height;
    H = fmt === '9:16' ? 1920 : 1350;
    canvas.width = W; canvas.height = H;
    const s = {
      tsize: spec.tsize ?? 100, zoom: spec.zoom ?? 1, ox: spec.ox ?? 0, oy: spec.oy ?? 0,
      photo: spec.photo || tpl.defaultPhoto,
    };
    tpl.fields.forEach(f => { s[f.key] = f.def; });
    Object.assign(s, spec.fields || {});
    try {
      const img = await loadImg(s.photo);
      ctx.save(); ctx.clearRect(0, 0, W, H);
      tpl.draw(ctx, s, img);
      ctx.restore();
      return canvas.toDataURL('image/png');
    } finally {
      H = prevH; canvas.width = prevW; canvas.height = prevHt;
    }
  },
  async renderAll(specs) {
    const out = [];
    for (const sp of specs) out.push(await this.render(sp));
    return out;
  },
};
