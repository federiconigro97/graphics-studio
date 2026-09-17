/* Headless render: board JSON spec -> PNG files. Riusa il canvas dello studio via window.GS.
   Uso:  node render.mjs [board.json] [outDir]
   Env:  CHROME_BIN (default: Google Chrome su macOS)
   Nessun download browser: usa il Chrome di sistema via puppeteer-core. */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(import.meta.dirname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const boardPath = resolve(process.argv[2] || join(ROOT, 'board.example.json'));
const outDir = resolve(process.argv[3] || join(ROOT, 'output'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json' };

// static server sulla cartella dello studio
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const buf = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const board = JSON.parse(await readFile(boardPath, 'utf8'));
const specs = Array.isArray(board) ? board : (board.tiles || []);
if (!specs.length) { console.error('board vuota:', boardPath); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.GS.fontsReady);
  const dataUrls = await page.evaluate(s => window.GS.renderAll(s), specs);

  await mkdir(outDir, { recursive: true });
  let i = 0;
  for (const [idx, d] of dataUrls.entries()) {
    const raw = specs[idx].name || `${String(idx + 1).padStart(2, '0')}_${specs[idx].template}`;
    const name = raw.replace(/[^a-z0-9_-]+/gi, '-');
    await writeFile(join(outDir, `${name}.png`), Buffer.from(d.split(',')[1], 'base64'));
    console.log(`  ✓ ${name}.png`);
    i++;
  }
  console.log(`\n${i} tile -> ${outDir}`);
} finally {
  await browser.close();
  server.close();
}
