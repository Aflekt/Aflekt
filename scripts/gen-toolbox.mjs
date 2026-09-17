import fs from 'node:fs';
import opentype from 'opentype.js';
import * as simpleIcons from 'simple-icons';

const ICONS = Object.fromEntries(Object.values(simpleIcons).map((i) => [i.slug, i]));

const load = (p) => opentype.parse(fs.readFileSync(p).buffer.slice(0));
const bold = load('node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff');
const mono = load('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff');

// [navn, simple-icons-slug] eller [navn, null, monogram, farge] når ikonet ikke finnes
const TOOLBOX = [
	['frontend', [
		['TypeScript', 'typescript'], ['JavaScript', 'javascript'], ['React', 'react'], ['Next.js', 'nextdotjs'],
		['TanStack Start', 'tanstack'], ['Vite', 'vite'], ['Astro', 'astro'], ['Tailwind', 'tailwindcss'],
		['shadcn/ui', 'shadcnui'], ['Storybook', 'storybook'], ['Sass', 'sass'], ['styled-components', 'styledcomponents'],
		['Three.js', 'threedotjs'],
	]],
	['apps', [
		['React Native', 'react'], ['Expo', 'expo'], ['Swift', 'swift'], ['SwiftUI', 'swift'],
		['Xamarin', null, 'X', '#3498DB'], ['Flutter', 'flutter'],
	]],
	['backend', [
		['Node.js', 'nodedotjs'], ['NestJS', 'nestjs'], ['GraphQL', 'graphql'], ['Apollo', 'apollographql'],
		['tRPC', 'trpc'], ['Hono', 'hono'], ['Express', 'express'], ['Strapi', 'strapi'], ['Prisma', 'prisma'],
		['Drizzle', 'drizzle'], ['Python', 'python'], ['C#', 'dotnet'], ['WordPress', 'wordpress'],
	]],
	['data', [
		['PostgreSQL', 'postgresql'], ['Neon', 'neon'], ['Redis', 'redis'], ['Firestore', 'firebase'],
		['SQLite', 'sqlite'], ['BigQuery', 'googlebigquery'], ['Supabase', 'supabase'],
	]],
	['cloud & ops', [
		['Docker', 'docker'], ['Kubernetes', 'kubernetes'], ['Google Cloud', 'googlecloud'], ['Firebase', 'firebase'],
		['Vercel', 'vercel'], ['Netlify', 'netlify'], ['Scaleway', 'scaleway'], ['GitHub Actions', 'githubactions'],
		['Turborepo', 'turborepo'], ['Biome', 'biome'],
	]],
	['testing & drift', [
		['Vitest', 'vitest'], ['Jest', 'jest'], ['Playwright', null, 'Pw', '#45BA4B'], ['k6', 'k6'],
		['Checkly', null, 'Ck', '#0075FF'], ['Sentry', 'sentry'], ['PostHog', 'posthog'], ['Grafana', 'grafana'],
		['InfluxDB', 'influxdb'],
	]],
	['ai', [
		['Claude', 'claude'], ['OpenAI', null, 'AI', '#74AA9C'], ['Whisper', null, 'W', '#74AA9C'],
		['Azure Speech', null, 'Az', '#0089D6'], ['MCP', 'modelcontextprotocol'], ['AI SDK', 'vercel'],
	]],
	['integrasjoner', [
		['Stripe', 'stripe'], ['Vipps', null, 'V', '#FF5B24'], ['BankID', null, 'iD', '#39134C'], ['Clerk', 'clerk'],
		['Algolia', 'algolia'], ['Resend', 'resend'], ['Shopify', 'shopify'], ['Google Maps', 'googlemaps'],
	]],
];

const W = 880, PAD = 32, LABEL_W = 150, CHIP_H = 30, GAP = 8, ICON = 16;
const TEXT = '#e6edf3';

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

// Hver glyf tegnes én gang i <defs> og gjenbrukes med <use>, ellers blir fila flere hundre kB
const glyphDefs = new Map();
function textUse(font, fontKey, text, x, y, size, tracking = 0) {
	const scale = size / font.unitsPerEm;
	const glyphs = [...text].map((ch) => font.charToGlyph(ch));
	let out = '';
	let cx = x;
	glyphs.forEach((g, i) => {
		const key = `${fontKey}-${size}-${g.index}`;
		if (!glyphDefs.has(key)) glyphDefs.set(key, { id: `g${glyphDefs.size}`, d: toD(g.getPath(0, 0, size)) });
		const { id, d } = glyphDefs.get(key);
		if (d) out += `<use href="#${id}" x="${n1(cx)}" y="${n1(y)}"/>`;
		let adv = g.advanceWidth * scale;
		if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * scale;
		cx += adv + tracking;
	});
	return { out, width: cx - tracking - x };
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

// Mørke merkefarger (Next.js, Vercel, Prisma ...) forsvinner mot nattehimmelen, så de blir lyse
function iconColor(hex) {
	const [r, g, b] = [0, 2, 4].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.09 ? TEXT : `#${hex}`;
}

function icon(slug) {
	const i = ICONS[slug];
	if (!i) throw new Error(`Fant ikke ikonet ${slug} i simple-icons`);
	const d = /[aA]/.test(i.path)
		? i.path
		: i.path.replace(/-?(?:\d+\.?\d*|\.\d+)/g, (m) => ` ${Math.round(Number.parseFloat(m) * 10) / 10}`).replace(/([a-zA-Z])\s+/g, '$1').trim();
	return { d, color: iconColor(i.hex) };
}

let y = PAD;
const rows = [];
TOOLBOX.forEach(([label, items], ri) => {
	const parts = [];
	const lab = textUse(mono, 'mono', label.toUpperCase(), PAD, y + 19, 11, 1.4);
	parts.push(`<g fill="#ffa21a">${lab.out}</g>`);
	let x = PAD + LABEL_W;
	let rowY = y;
	for (const [name, slug, mono2, color] of items) {
		const t = textPath(bold, name, 0, 0, 14);
		const w = Math.round(10 + ICON + 8 + t.width + 12);
		if (x + w > W - PAD) {
			x = PAD + LABEL_W;
			rowY += CHIP_H + GAP;
		}
		parts.push(`<rect x="${x}" y="${rowY}" width="${w}" height="${CHIP_H}" rx="8" class="chip"/>`);
		const ix = x + 10, iy = rowY + (CHIP_H - ICON) / 2;
		if (slug) {
			const ic = icon(slug);
			parts.push(`<path transform="translate(${ix} ${iy}) scale(${ICON / 24})" d="${ic.d}" fill="${ic.color}"/>`);
		} else {
			const m = textPath(mono, mono2, 0, 0, mono2.length > 1 ? 8.5 : 11);
			parts.push(`<rect x="${ix}" y="${iy}" width="${ICON}" height="${ICON}" rx="4" fill="${color}"/>`);
			parts.push(`<path transform="translate(${(ix + (ICON - m.width) / 2).toFixed(1)} ${iy + (mono2.length > 1 ? 11 : 12)})" d="${m.d}" fill="#fff"/>`);
		}
		const tp = textUse(bold, 'bold', name, x + 10 + ICON + 8, rowY + 20, 14);
		parts.push(`<g fill="${TEXT}">${tp.out}</g>`);
		x += w + GAP;
	}
	rows.push(`<g class="row" style="animation-delay:${(ri * 0.12).toFixed(2)}s">${parts.join('')}</g>`);
	y = rowY + CHIP_H + 18;
});

const foot = textPath(mono, '+ alt jeg har glemt', PAD + LABEL_W, y + 12, 12, 0.6);
const H = y + 12 + PAD - 4;
const all = TOOLBOX.flatMap(([l, items]) => `${l}: ${items.map((i) => i[0]).join(', ')}`).join('. ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Toolbox. ${all.replace(/&/g, '&amp;')}.">
<style>
.chip{fill:#fff;fill-opacity:.05;stroke:#fff;stroke-opacity:.1}
.row{animation:in .5s ease-out both}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.blink{animation:blink 1s steps(1) infinite}
@keyframes blink{0%{opacity:1}50%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0b1a2c"/><stop offset="1" stop-color="#070f19"/>
</linearGradient>
${[...glyphDefs.values()].map((g) => `<path id="${g.id}" d="${g.d}"/>`).join('')}
<pattern id="peg" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="1.3" fill="#fff" fill-opacity=".05"/></pattern>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#peg)"/>
${rows.join('\n')}
<path d="${foot.d}" fill="#7d8f9e"/>
<rect class="blink" x="${(PAD + LABEL_W + foot.width + 6).toFixed(1)}" y="${y + 1}" width="7" height="14" fill="#ffa21a"/>
</g>
</svg>
`;

fs.writeFileSync('assets/toolbox.svg', svg);
console.log('assets/toolbox.svg', Math.round(svg.length / 1024), 'KB,', W, 'x', H);
