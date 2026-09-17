import fs from 'node:fs';
import opentype from 'opentype.js';

const load = (p) => opentype.parse(fs.readFileSync(p).buffer.slice(0));
const display = load('node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff');
const mono = load('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff');

const W = 440, H = 631;

let seed = 917;
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
const centered = (font, text, cx, y, size, tracking = 0) => {
	const w = textPath(font, text, 0, 0, size, tracking).width;
	return textPath(font, text, cx - w / 2, y, size, tracking);
};

// Regn: to identiske lag stablet over hverandre, så loopen blir sømløs
const drops = Array.from({ length: 80 }, () => {
	const x = r1(rnd() * (W + 60) - 30);
	const y = r1(rnd() * H);
	const len = r1(14 + rnd() * 26);
	return `M${x},${y} l-${r1(len * 0.18)},${len}`;
}).join('');

// Redigerte (sladdede) linjer på arket
const bars = [
	[40, 196, 180], [40, 216, 232], [40, 236, 150],
	[40, 276, 210], [40, 296, 120], [172, 296, 70],
	[40, 336, 226], [40, 356, 96],
].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="11" rx="1.5"/>`).join('');

// Smuler. Ingen kommentar.
const crumbs = Array.from({ length: 9 }, (_, i) => {
	const x = r1(236 + rnd() * 70);
	const y = r1(410 + rnd() * 30);
	const rx = r1(1.4 + rnd() * 2.6);
	return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${r1(rx * (0.6 + rnd() * 0.3))}" transform="rotate(${Math.round(rnd() * 180)} ${x} ${y})" fill="${i % 3 ? '#b07a3b' : '#d9a760'}"/>`;
}).join('');

const caseNo = textPath(mono, 'SAK NR. 0917', 40, 132, 13, 1.6);
const title = textPath(display, 'Inspectorson', 40, 170, 31, -0.3);
const status = textPath(mono, 'STATUS:', 40, 393, 12, 1.4);
const stamp1 = centered(display, 'UNDER', 0, -12, 30, 2);
const stamp2 = centered(display, 'ETTERFORSKNING', 0, 22, 21, 0.8);
const foot = centered(mono, 'aflekt.no · snart', W / 2, 604, 13, 1.2);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Saksmappe 0917, Inspectorson. Under etterforskning. Kommer på aflekt.no.">
<style>
.rain{animation:rain .9s linear infinite}
@keyframes rain{from{transform:translateY(-${H}px)}to{transform:translateY(0)}}
.lamp{animation:flicker 7s steps(1) infinite}
@keyframes flicker{0%,100%{opacity:1}61%{opacity:.55}62%{opacity:1}64%{opacity:.7}65%{opacity:1}}
.stamp{transform-box:fill-box;transform-origin:center;animation:thump .5s cubic-bezier(.2,1.6,.4,1) 1.2s both}
@keyframes thump{from{opacity:0;transform:scale(1.6)}60%{opacity:1}to{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
<linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0b0d12"/><stop offset="1" stop-color="#141a21"/>
</linearGradient>
<radialGradient id="glow" cx="340" cy="40" r="420" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#ffc36b" stop-opacity=".42"/><stop offset=".5" stop-color="#ff9d3c" stop-opacity=".1"/><stop offset="1" stop-color="#ff9d3c" stop-opacity="0"/>
</radialGradient>
<linearGradient id="manila" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#d8b77c"/><stop offset="1" stop-color="#a98450"/>
</linearGradient>
<linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#f1ebdd"/><stop offset="1" stop-color="#ddd3bf"/>
</linearGradient>
<filter id="grunge" x="-10%" y="-20%" width="120%" height="140%">
<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.6" result="holes"/>
<feComposite in="SourceGraphic" in2="holes" operator="in" result="ink"/>
<feDisplacementMap in="ink" in2="n" scale="2.5"/>
</filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".6"/></filter>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#night)"/>
<rect class="lamp" width="${W}" height="${H}" fill="url(#glow)"/>
<g stroke="#9fb3c8" stroke-opacity=".22" stroke-width="1.2" stroke-linecap="round" fill="none">
<g class="rain"><path d="${drops}"/><path d="${drops}" transform="translate(0 ${H})"/></g>
</g>
<g transform="rotate(-4 220 300)" filter="url(#shadow)">
<path d="M24,74 L24,58 Q24,50 32,50 L140,50 Q148,50 152,58 L160,74 Z" fill="#b89260"/>
<rect x="24" y="72" width="392" height="428" rx="6" fill="url(#manila)"/>
<g transform="rotate(1.5 220 280)">
<rect x="26" y="98" width="326" height="360" rx="2" fill="url(#paper)"/>
<path d="${caseNo.d}" fill="#5b5346"/>
<path d="${title.d}" fill="#1b1a17"/>
<g fill="#16150f">${bars}</g>
<path d="${status.d}" fill="#5b5346"/>
<rect x="104" y="382" width="92" height="12" rx="1.5" fill="#16150f"/>
<circle cx="298" cy="182" r="30" fill="none" stroke="#6b4a2a" stroke-opacity=".22" stroke-width="5"/>
<circle cx="301" cy="180" r="30" fill="none" stroke="#6b4a2a" stroke-opacity=".12" stroke-width="2"/>
</g>
<path d="M322,64 L322,120 Q322,130 312,130 Q302,130 302,120 L302,76 Q302,70 308,70 Q314,70 314,76 L314,116" fill="none" stroke="#aab4bd" stroke-width="3" stroke-linecap="round"/>
${crumbs}
</g>
<g transform="translate(262 318) rotate(-13)">
<g class="stamp" filter="url(#grunge)">
<rect x="-112" y="-50" width="224" height="92" rx="6" fill="none" stroke="#d0212d" stroke-width="5.5"/>
<path d="${stamp1.d}" fill="#c8202b"/>
<path d="${stamp2.d}" fill="#c8202b"/>
</g>
</g>
<path d="${foot.d}" fill="#8d99a6"/>
</g>
</svg>
`;

fs.writeFileSync('assets/inspectorson-teaser.svg', svg);
console.log('teaser', Math.round(svg.length / 1024), 'KB');
