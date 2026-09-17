// Lager splat/plen.splat: en flytende plentorv med klippestriper, jordlag,
// tusenfryd og en liten robotklipper. Formatet er antimatter15 .splat
// (32 byte per splat), det samme som Splat Share tar imot.
import fs from 'node:fs';

let seed = 1709;
const rnd = () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const splats = [];
// pos: [x,y,z] (Y opp), scale: [sx,sy,sz], rgb 0..1, alpha 0..1, q: [w,x,y,z]
const add = (pos, scale, rgb, alpha, q = [1, 0, 0, 0]) => splats.push({ pos, scale, rgb, alpha, q });

// Kvaternion som dreier Y-aksen mot retningen (dx, dy, dz)
function alignY(dx, dy, dz) {
	const len = Math.hypot(dx, dy, dz);
	const [x, y, z] = [dx / len, dy / len, dz / len];
	// akse = (0,1,0) x v = (z, 0, -x), vinkel = acos(y)
	const s = Math.hypot(z, x);
	if (s < 1e-6) return [1, 0, 0, 0];
	const ang = Math.acos(clamp(y, -1, 1));
	const k = Math.sin(ang / 2) / s;
	return [Math.cos(ang / 2), z * k, 0, -x * k];
}

// Torvas omriss: avrundet kvadrat
const HALF = 1.0, CORNER = 0.32;
function inside(x, z, inset = 0) {
	const h = HALF - inset, r = Math.max(0.01, CORNER - inset);
	const qx = Math.abs(x) - (h - r), qz = Math.abs(z) - (h - r);
	return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r <= 0;
}
function randomInside(inset = 0) {
	for (;;) {
		const x = (rnd() * 2 - 1) * HALF, z = (rnd() * 2 - 1) * HALF;
		if (inside(x, z, inset)) return [x, z];
	}
}
// Punkt på kanten av omrisset, parametrisert rundt
function edgePoint(u) {
	for (;;) {
		const a = u * Math.PI * 2;
		const dx = Math.cos(a), dz = Math.sin(a);
		let lo = 0, hi = 2;
		for (let i = 0; i < 24; i++) {
			const m = (lo + hi) / 2;
			if (inside(dx * m, dz * m)) lo = m; else hi = m;
		}
		return [dx * lo, dz * lo];
	}
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const jitter = (c, amt) => c.map((v) => clamp(v + gauss() * amt, 0, 1));

// Jord: toppsjikt under gresset og lagdelte sider
const SOIL_TOP = [0.16, 0.11, 0.07], SOIL_MID = [0.34, 0.23, 0.14], CLAY = [0.52, 0.38, 0.24], STONE = [0.55, 0.55, 0.52];
for (let i = 0; i < 26000; i++) {
	const [x, z] = randomInside(0.01);
	add([x, -0.004 + gauss() * 0.003, z], [0.02, 0.004, 0.02], jitter(SOIL_TOP, 0.03), 1);
}
const DEPTH = 0.42;
for (let i = 0; i < 70000; i++) {
	const u = rnd();
	const [ex, ez] = edgePoint(u);
	const d = rnd();
	const y = -d * DEPTH;
	// litt ujevn bunn og kant
	const out = 1 - 0.015 * rnd() - (d > 0.85 ? (d - 0.85) * 0.5 : 0);
	let c = d < 0.28 ? mix(SOIL_TOP, SOIL_MID, d / 0.28) : mix(SOIL_MID, CLAY, (d - 0.28) / 0.72);
	c = jitter(c, 0.035);
	if (rnd() < 0.025) c = jitter(STONE, 0.08);
	const n = [ex, 0, ez];
	add([ex * out, y, ez * out], [0.009, 0.006, 0.009], c, 1, alignY(...n));
}
for (let i = 0; i < 16000; i++) {
	const [x, z] = randomInside(0.03);
	add([x, -DEPTH + gauss() * 0.01, z], [0.025, 0.006, 0.025], jitter(mix(CLAY, SOIL_MID, 0.4), 0.03), 1);
}

// Robotklipperens plass (brukes også for å holde gresset unna kroppen)
const MX = 0.42, MZ = -0.3, MY = 0.075;

// Gress: klippestriper langs x. Lyse striper lener bort fra kamera, mørke mot.
const STRIPE = 0.25;
const LIGHT = [0.55, 0.78, 0.33], DARK = [0.24, 0.5, 0.18], BASE = [0.1, 0.24, 0.07];
const BLADES = 52000;
for (let i = 0; i < BLADES; i++) {
	const [x, z] = randomInside(0);
	if (((x - MX) / 0.16) ** 2 + ((z - MZ) / 0.12) ** 2 < 1) continue;
	const stripe = Math.floor((x + HALF) / STRIPE) % 2;
	const tip = stripe ? LIGHT : DARK;
	const h = 0.055 + rnd() * 0.04;
	const lean = (stripe ? 1 : -1) * (0.35 + rnd() * 0.25);
	const dx = gauss() * 0.18, dz = lean + gauss() * 0.15;
	const len = Math.hypot(dx, 1, dz);
	const dir = [dx / len, 1 / len, dz / len];
	const q = alignY(...dir);
	for (let s = 0; s < 3; s++) {
		const t = (s + 0.5) / 3;
		const c = jitter(mix(BASE, tip, 0.35 + t * 0.65), 0.03);
		add([x + dir[0] * h * t, dir[1] * h * t, z + dir[2] * h * t], [0.0035, h * 0.2, 0.0035], c, 0.95, q);
	}
}

// Tusenfryd
const PETAL = [0.97, 0.97, 0.94], MIDDLE = [0.98, 0.78, 0.15];
for (let f = 0; f < 22; f++) {
	const [x, z] = randomInside(0.1);
	if (x > 0.05 && x < 0.75 && z > -0.6 && z < 0.05) continue; // hold klipperen fri
	const y = 0.085 + rnd() * 0.02;
	const stemQ = alignY(gauss() * 0.1, 1, gauss() * 0.1);
	for (let s = 0; s < 3; s++) add([x, y * (s + 0.5) / 3, z], [0.003, y * 0.18, 0.003], [0.2, 0.42, 0.15], 1, stemQ);
	const tilt = rnd() * Math.PI;
	for (let p = 0; p < 10; p++) {
		const a = tilt + (p / 10) * Math.PI * 2;
		const px = Math.cos(a), pz = Math.sin(a);
		add([x + px * 0.014, y, z + pz * 0.014], [0.0045, 0.0015, 0.0045], jitter(PETAL, 0.02), 1);
		add([x + px * 0.024, y - 0.001, z + pz * 0.024], [0.004, 0.0015, 0.004], jitter(PETAL, 0.02), 1);
	}
	add([x, y + 0.002, z], [0.009, 0.004, 0.009], MIDDLE, 1);
}

// Robotklipper: avrundet kropp, oransje stripe (samme som blinklyset), mørke hjul
const BODY = [0.9, 0.89, 0.85], ORANGE = [1.0, 0.64, 0.1], WHEEL = [0.08, 0.08, 0.09];
// Avrundet boks som signert avstandsfelt; punkter samples jevnt i et tynt skall
function roundBox(x, y, z, bx, by, bz, r) {
	const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
	return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
const [BX, BY, BZ] = [0.165, 0.048, 0.125];
let placed = 0;
while (placed < 26000) {
	const px = (rnd() * 2 - 1) * BX, py = (rnd() * 2 - 1) * BY, pz = (rnd() * 2 - 1) * BZ;
	const d = roundBox(px, py, pz, BX, BY, BZ, 0.045);
	if (d > 0 || d < -0.008 || py < -0.03) continue;
	placed++;
	let c = BODY;
	if (Math.abs(py + 0.005) < 0.007) c = ORANGE;
	if (py > 0.035 && Math.hypot((px + 0.02) / 0.075, pz / 0.06) < 1) c = [0.16, 0.18, 0.2];
	if (py > 0.035 && Math.hypot((px - 0.1) / 0.012, pz / 0.012) < 1) c = [1, 0.3, 0.2];
	add([MX + px, MY + py, MZ + pz], [0.0045, 0.0045, 0.0045], jitter(c, 0.012), 1);
}
for (const [wx, wz] of [[-0.11, -0.13], [0.11, -0.13], [-0.11, 0.13], [0.11, 0.13]]) {
	for (let i = 0; i < 700; i++) {
		const a = rnd() * Math.PI * 2, r = 0.035 * Math.sqrt(rnd());
		add([MX + wx + Math.cos(a) * r, MY - 0.035 + Math.sin(a) * r, MZ + wz + (wz > 0 ? 0.004 : -0.004)], [0.004, 0.004, 0.003], jitter(WHEEL, 0.02), 1);
	}
}

// Skriv .splat
const buf = Buffer.alloc(splats.length * 32);
splats.forEach((s, i) => {
	const o = i * 32;
	buf.writeFloatLE(s.pos[0], o); buf.writeFloatLE(s.pos[1], o + 4); buf.writeFloatLE(s.pos[2], o + 8);
	buf.writeFloatLE(s.scale[0], o + 12); buf.writeFloatLE(s.scale[1], o + 16); buf.writeFloatLE(s.scale[2], o + 20);
	s.rgb.forEach((v, k) => buf.writeUInt8(Math.round(clamp(v, 0, 1) * 255), o + 24 + k));
	buf.writeUInt8(Math.round(clamp(s.alpha, 0, 1) * 255), o + 27);
	const ql = Math.hypot(...s.q);
	s.q.forEach((v, k) => buf.writeUInt8(Math.round(clamp((v / ql) * 128 + 128, 0, 255)), o + 28 + k));
});
fs.mkdirSync('splat', { recursive: true });
fs.writeFileSync('splat/plen.splat', buf);
console.log('splat/plen.splat', splats.length, 'splats,', Math.round(buf.length / 1024 / 1024 * 10) / 10, 'MB');
