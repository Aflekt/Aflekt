// Tar opp plen-splatten bilde for bilde mens kameraet går en runde.
// Kjør `npm run plen` først. Bildene havner i video/plen/.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' };
const server = http.createServer((req, res) => {
	let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	if (p === '/') p = '/scripts/plen.html';
	const f = path.join(root, p);
	if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
		res.writeHead(404);
		return res.end();
	}
	res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' });
	fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));

const FRAMES = Number(process.env.FRAMES ?? 48);
const RADIUS = Number(process.env.RADIUS ?? 4.0);
const HEIGHT = Number(process.env.HEIGHT ?? 2.65);

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 440, height: 631 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('[sidefeil]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[konsoll]', m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 });

fs.rmSync('video/plen', { recursive: true, force: true });
fs.mkdirSync('video/plen', { recursive: true });
const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) {
	const angle = 0.5 + (i / FRAMES) * Math.PI * 2;
	await page.evaluate(([a, r, h]) => window.setOrbit(a, r, h), [angle, RADIUS, HEIGHT]);
	await page.screenshot({ path: `video/plen/${String(i).padStart(3, '0')}.png` });
	if (i === 0) console.log('første bilde etter', Date.now() - t0, 'ms');
}
console.log(FRAMES, 'bilder på', Math.round((Date.now() - t0) / 1000), 's');
await browser.close();
server.close();
