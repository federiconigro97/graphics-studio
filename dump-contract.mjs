/* Dump del contratto template (window.GS.templates()) -> templates.json.
   È la mappa che il content engine usa per generare board.json validi.
   Uso: node dump-contract.mjs   (rigenera dopo aver cambiato i template) */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(import.meta.dirname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const buf = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(buf);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle0' });
  const tpls = await page.evaluate(() => window.GS.templates());
  await writeFile(join(ROOT, 'templates.json'), JSON.stringify(tpls, null, 2) + '\n');
  console.log(`templates.json <- ${tpls.length} template`);
} finally { await browser.close(); server.close(); }
