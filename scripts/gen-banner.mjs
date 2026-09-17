import fs from 'node:fs';
import opentype from 'opentype.js';

const load = (p) => opentype.parse(fs.readFileSync(p).buffer.slice(0));
const display = load('node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff');
const mono = load('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff');

const W = 1280, H = 420;

// Seeded random, så banneret blir likt hver gang det genereres
let seed = 1703;
const rnd = () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r1 = (n) => Math.round(n * 10) / 10;

// Egen serialisering: toPathData i opentype.js 2.0 kutter og snur enkelte glyfer
const n1 = (v) => String(Math.round(v * 10) / 10);
function toD(path) {
	return path.commands.map((c) => {
		if (c.type === 'M' || c.type === 'L') return `${c.type}${n1(c.x)} ${n1(c.y)}`;
		if (c.type === 'Q') return `Q${n1(c.x1)} ${n1(c.y1)} ${n1(c.x)} ${n1(c.y)}`;
		if (c.type === 'C') return `C${n1(c.x1)} ${n1(c.y1)} ${n1(c.x2)} ${n1(c.y2)} ${n1(c.x)} ${n1(c.y)}`;
		return 'Z';
	}).join('');
}

function textPath(font, text, x, y, size, tracking = 0) {
	const scale = size / font.unitsPerEm;
	const glyphs = [...text].map((ch) => font.charToGlyph(ch));
	let d = '';
	let cx = x;
	glyphs.forEach((g, i) => {
		d += toD(g.getPath(cx, y, size));
		let adv = g.advanceWidth * scale;
		if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * scale;
		cx += adv + tracking;
	});
	return { d, width: cx - tracking - x };
}

// Stjerner, holdt unna nederste del av himmelen
const stars = Array.from({ length: 90 }, (_, i) => {
	const x = r1(rnd() * W);
	const y = r1(rnd() * 250);
	const rad = r1(0.4 + rnd() * 1.1);
	const tw = i % 3 === 0 ? ` class="tw" style="animation-delay:-${r1(rnd() * 6)}s"` : '';
	return `<circle cx="${x}" cy="${y}" r="${rad}" opacity="${r1(0.35 + rnd() * 0.6)}"${tw}/>`;
}).join('');

// Nordlys-bånd: bølgende striper som fades opp og ned
function ribbon(y0, amp, thick, phase) {
	const pts = [];
	for (let x = -120; x <= W + 120; x += 40) {
		pts.push([x, y0 + Math.sin(x / 170 + phase) * amp + Math.sin(x / 61 + phase * 2) * amp * 0.25]);
	}
	const top = pts.map(([x, y]) => `${x},${r1(y)}`).join(' L');
	const bottom = [...pts].reverse().map(([x, y]) => `${x},${r1(y + thick + Math.sin(x / 90 + phase) * 14)}`).join(' L');
	return `M${top} L${bottom} Z`;
}

// Fjell i to lag
function ridge(base, peaks, seedShift) {
	let d = `M0,${H} L0,${base}`;
	for (let x = 0; x <= W; x += 20) {
		let y = base;
		for (const [px, ph, pw] of peaks) {
			const k = Math.max(0, 1 - Math.abs(x - px) / pw);
			y -= ph * k * k * (3 - 2 * k);
		}
		y += Math.sin(x / 23 + seedShift) * 3 + Math.sin(x / 7 + seedShift) * 1.5;
		d += ` L${x},${r1(y)}`;
	}
	return `${d} L${W},${H} Z`;
}
const backRidge = ridge(330, [[760, 120, 220], [980, 170, 200], [1180, 110, 190], [420, 40, 260]], 1);
const frontRidge = ridge(350, [[880, 70, 160], [1090, 105, 170], [1270, 60, 120], [120, 25, 200]], 4);

// Loddrette striper som gir nordlyset et gardin-preg
let rx = -20;
const rays = [];
while (rx < W + 20) {
	const w = r1(1.5 + rnd() * 5);
	rays.push(`<rect x="${r1(rx)}" y="0" width="${w}" height="260" opacity="${r1(0.25 + rnd() * 0.75)}"/>`);
	rx += w + rnd() * 7;
}

// Gress langs veikanten, i jakten på den fineste plena
const grassClumps = Array.from({ length: 8 }, (_, ci) => {
	const x0 = (W / 8) * ci;
	let d = '';
	for (let x = x0; x < x0 + W / 8 + 2; x += 2.2 + rnd() * 1.6) {
		const h = 7 + rnd() * 13;
		const lean = (rnd() - 0.35) * 5;
		d += `M${r1(x)},357 Q${r1(x + lean * 0.4)},${r1(357 - h * 0.6)} ${r1(x + lean)},${r1(357 - h)} L${r1(x + 1.8)},357Z`;
	}
	return `<path class="grass" style="animation-delay:-${r1(ci * 0.45)}s" d="${d}"/>`;
}).join('');

const name = textPath(display, 'Eirik Aflekt', 72, 172, 118, -1.5);
const sub = textPath(mono, 'developer · surdeigsbaker · amatørdetektiv · gressentusiast', 78, 226, 21, 0.6);
const cursorX = r1(78 + sub.width + 10);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Eirik Aflekt. Developer, surdeigsbaker, amatørdetektiv og gressentusiast.">
<style>
.tw{animation:tw 5s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.9}50%{opacity:.15}}
.au{transform-box:fill-box;transform-origin:center;animation:au 16s ease-in-out infinite alternate}
.au2{animation-duration:21s;animation-delay:-7s}
.au3{animation-duration:13s;animation-delay:-3s}
@keyframes au{0%{transform:translateX(-50px) scaleY(.85);opacity:.35}50%{opacity:.75}100%{transform:translateX(50px) scaleY(1.15);opacity:.45}}
.dash{animation:dash 1.2s linear infinite}
@keyframes dash{to{stroke-dashoffset:-56}}
.car{transform:translateX(930px);animation:drive 14s linear infinite}
@keyframes drive{from{transform:translateX(-180px)}to{transform:translateX(1460px)}}
.grass{transform-box:fill-box;transform-origin:50% 100%;animation:sway 3.6s ease-in-out infinite alternate}
@keyframes sway{from{transform:skewX(-7deg)}to{transform:skewX(5deg)}}
.blink{animation:blink 1s steps(1) infinite}
@keyframes blink{0%{opacity:1}50%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#050814"/><stop offset=".55" stop-color="#0b1a2c"/><stop offset="1" stop-color="#123040"/>
</linearGradient>
<linearGradient id="auG" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#7cffc4" stop-opacity="0"/><stop offset=".45" stop-color="#5ef0b0" stop-opacity=".8"/><stop offset="1" stop-color="#3fb6c9" stop-opacity="0"/>
</linearGradient>
<linearGradient id="auV" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#b58cff" stop-opacity="0"/><stop offset=".5" stop-color="#9a7bff" stop-opacity=".55"/><stop offset="1" stop-color="#5ef0b0" stop-opacity="0"/>
</linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#fff4c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff4c8" stop-opacity="0"/>
</linearGradient>
<filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
<filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.6 9"/></filter>
<mask id="curtain" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#6a6a6a"/>
<g fill="#fff" filter="url(#soft)">${rays.join('')}</g>
</mask>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g fill="#fff">${stars}</g>
<g mask="url(#curtain)"><g filter="url(#blur)">
<path class="au" d="${ribbon(70, 34, 70, 0.4)}" fill="url(#auG)"/>
<path class="au au2" d="${ribbon(40, 26, 60, 2.1)}" fill="url(#auV)"/>
<path class="au au3" d="${ribbon(120, 30, 50, 4.2)}" fill="url(#auG)" opacity=".6"/>
</g></g>
<path d="${backRidge}" fill="#10263a"/>
<path d="${frontRidge}" fill="#0a1a29"/>
<rect y="356" width="${W}" height="${H - 356}" fill="#070f19"/>
<line x1="0" y1="358" x2="${W}" y2="358" stroke="#1d3347" stroke-width="2"/>
<g fill="#1f5a3f">${grassClumps}</g>
<line class="dash" x1="0" y1="392" x2="${W}" y2="392" stroke="#c9d3dc" stroke-opacity=".45" stroke-width="3" stroke-dasharray="28 28"/>
<g class="car">
<path d="M58,371 L200,352 L200,390 L58,378 Z" fill="url(#beam)"/>
<path d="M-54,372 Q-54,360 -42,358 L-24,357 L-8,343 Q-4,340 2,340 L28,340 Q34,340 38,344 L50,357 Q60,358 62,366 L62,378 Q62,381 59,381 L-51,381 Q-54,381 -54,378 Z" fill="#e8e1d2"/>
<path d="M-5,346 Q-3,344 0,344 L12,344 L12,356 L-17,356 Z M16,344 L27,344 Q31,344 33,347 L41,356 L16,356 Z" fill="#12283a"/>
<rect x="-55" y="364" width="5" height="6" rx="1" fill="#ff3b3b"/>
<circle cx="-40" cy="381" r="8.5" fill="#0b0f14"/><circle cx="-40" cy="381" r="3.5" fill="#6b7885"/>
<circle cx="42" cy="381" r="8.5" fill="#0b0f14"/><circle cx="42" cy="381" r="3.5" fill="#6b7885"/>
<g class="blink"><circle cx="60" cy="363" r="7" fill="#ffa21a" filter="url(#glow)"/><rect x="57" y="360" width="5" height="5" rx="1" fill="#ffc24d"/></g>
</g>
<path d="${name.d}" fill="#f4efe4"/>
<path d="${sub.d}" fill="#9fb7c6"/>
<rect class="blink" x="${cursorX}" y="208" width="11" height="22" fill="#ffa21a"/>
</g>
</svg>
`;

fs.writeFileSync('assets/banner.svg', svg);
console.log('assets/banner.svg', Math.round(svg.length / 1024), 'KB; name width', Math.round(name.width), 'sub width', Math.round(sub.width));
