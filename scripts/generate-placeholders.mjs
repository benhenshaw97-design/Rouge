// Generates placeholder art (SVG) and sound (WAV) files in /assets, but only for paths that
// src/config/assets.js still points at. Anything you've replaced with real art is skipped.
//
//   npm run placeholders            -> only creates files that are missing
//   npm run placeholders -- --force -> overwrites placeholders (never touches PNG art)
//
// The game never runs this script; the generated files are committed like any other asset.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO, IMAGES } from '../src/config/assets.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const FORCE = process.argv.includes('--force');
let written = 0;
let skipped = 0;

const USED = new Set([...Object.values(IMAGES), ...Object.values(AUDIO)]);

function out(relPath, data) {
  if (!USED.has(relPath)) return; // replaced by real art (or no longer used)
  const file = join(ROOT, relPath);
  if (existsSync(file) && !FORCE) {
    skipped++;
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  written++;
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}\n</svg>\n`;

// Deterministic RNG so regenerating gives the same pictures.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A ridge made of sine waves with whole numbers of cycles across the width,
// so the left and right edges line up and the image tiles seamlessly.
function ridgeY(x, w, base, waves) {
  let y = base;
  for (const [cycles, amp, phase] of waves) y += Math.sin((x / w) * Math.PI * 2 * cycles + phase) * amp;
  return y;
}
function ridgePath(w, h, base, waves, step = 8) {
  const pts = [];
  for (let x = 0; x <= w; x += step) pts.push(`${x},${ridgeY(x, w, base, waves).toFixed(1)}`);
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
}

// ---------------------------------------------------------------------------------------------
// Backgrounds (parallax layers). Heights match the layer heights in src/config/display.js.
// ---------------------------------------------------------------------------------------------

out(
  'backgrounds/sky.svg',
  svg(
    1280,
    720,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#5fa3d6"/><stop offset="0.6" stop-color="#b9dcf0"/><stop offset="1" stop-color="#f4e2c0"/>
</linearGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/>
<circle cx="1040" cy="150" r="70" fill="#fff6d5" opacity="0.35"/>
<circle cx="1040" cy="150" r="50" fill="#fff3c4"/>`,
  ),
);

{
  const r = rng(7);
  let clouds = '';
  for (const cx of [120, 380, 640, 880]) {
    const cy = 50 + r() * 120;
    const puffs = [];
    for (let i = 0; i < 5; i++) {
      const px = cx - 60 + i * 30;
      const rad = 20 + r() * 16;
      puffs.push(`<circle cx="${px.toFixed(0)}" cy="${(cy - r() * 18).toFixed(0)}" r="${rad.toFixed(0)}"/>`);
    }
    clouds += `<g fill="#ffffff" opacity="0.85">${puffs.join('')}<rect x="${cx - 70}" y="${cy.toFixed(0)}" width="140" height="18" rx="9"/></g>\n`;
  }
  out('backgrounds/clouds.svg', svg(1024, 240, clouds));
}

out(
  'backgrounds/hills-far.svg',
  svg(
    1024,
    260,
    `<path d="${ridgePath(1024, 260, 120, [[1, 34, 0.4], [3, 18, 1.3], [7, 6, 2.1]])}" fill="#93a9c9"/>
<path d="${ridgePath(1024, 260, 170, [[2, 20, 2.2], [5, 9, 0.6]])}" fill="#7f97ba"/>`,
  ),
);

{
  const W = 1024;
  const H = 240;
  const waves = [[2, 16, 0.5], [5, 7, 1.7]];
  const base = 150;
  const r = rng(11);
  let deco = '';
  // Trees, kept away from the edges so nothing gets cut at the tiling seam.
  for (let i = 0; i < 26; i++) {
    const x = 30 + r() * (W - 60);
    const y = ridgeY(x, W, base, waves) + 6;
    const size = 14 + r() * 12;
    const shade = r() > 0.5 ? '#3d7038' : '#477f40';
    deco += `<rect x="${(x - 2).toFixed(0)}" y="${(y - size * 0.8).toFixed(0)}" width="4" height="${(size * 0.9).toFixed(0)}" fill="#4a3424"/>`;
    deco += `<circle cx="${x.toFixed(0)}" cy="${(y - size * 1.3).toFixed(0)}" r="${size.toFixed(0)}" fill="${shade}"/>\n`;
  }
  // A few cottages.
  for (const x of [200, 560, 790]) {
    const y = ridgeY(x, W, base, waves) + 8;
    deco += `<rect x="${x - 18}" y="${(y - 26).toFixed(0)}" width="36" height="26" fill="#d9c7a3"/>`;
    deco += `<polygon points="${x - 22},${(y - 26).toFixed(0)} ${x},${(y - 44).toFixed(0)} ${x + 22},${(y - 26).toFixed(0)}" fill="#8c3b34"/>`;
    deco += `<rect x="${x - 6}" y="${(y - 16).toFixed(0)}" width="10" height="10" fill="#f2dc8f"/>\n`;
  }
  out('backgrounds/hills-mid.svg', svg(W, H, `<path d="${ridgePath(W, H, base, waves)}" fill="#5e9450"/>\n${deco}`));
}

{
  const r = rng(3);
  let stones = '';
  for (let i = 0; i < 40; i++) {
    const x = 8 + r() * 496;
    const y = 30 + r() * 120;
    stones += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(3 + r() * 5).toFixed(0)}" ry="${(2 + r() * 3).toFixed(0)}" fill="#76593a"/>`;
  }
  out(
    'backgrounds/ground.svg',
    svg(
      512,
      152,
      `<rect width="512" height="152" fill="#8a6a45"/>
<rect width="512" height="16" fill="#6f9a43"/>
<rect y="16" width="512" height="6" fill="#5d7f37"/>
<rect y="70" width="512" height="4" fill="#7d5f3d"/>
<rect y="118" width="512" height="5" fill="#7d5f3d"/>
${stones}`,
    ),
  );
}

{
  // Side-on track: rail on top, sleeper ends, then ballast. The rail's top edge is at y = 8.
  let sleepers = '';
  for (let i = 0; i < 8; i++) sleepers += `<rect x="${5 + i * 32}" y="13" width="22" height="10" fill="#5a3b24"/>`;
  const r = rng(5);
  let ballast = '';
  for (let i = 0; i < 30; i++)
    ballast += `<circle cx="${(4 + r() * 248).toFixed(0)}" cy="${(24 + r() * 14).toFixed(0)}" r="${(1.5 + r() * 2).toFixed(1)}" fill="#6f685e"/>`;
  out(
    'backgrounds/track.svg',
    svg(
      256,
      40,
      `<rect y="20" width="256" height="20" fill="#8d8478"/>
${ballast}
${sleepers}
<rect y="8" width="256" height="4" fill="#d4d8db"/>
<rect y="12" width="256" height="3" fill="#6c7378"/>`,
    ),
  );
}

{
  const r = rng(21);
  let deco = '<rect y="62" width="1024" height="28" fill="#3f6a2d"/>';
  for (let i = 0; i < 14; i++) {
    const x = 40 + r() * 944;
    const w = 26 + r() * 30;
    deco += `<ellipse cx="${x.toFixed(0)}" cy="66" rx="${w.toFixed(0)}" ry="${(14 + r() * 10).toFixed(0)}" fill="${r() > 0.5 ? '#355d27' : '#4a7a35'}"/>`;
  }
  for (let i = 0; i < 40; i++) {
    const x = 10 + r() * 1004;
    const h = 10 + r() * 16;
    deco += `<polygon points="${(x - 5).toFixed(0)},70 ${x.toFixed(0)},${(70 - h).toFixed(0)} ${(x + 5).toFixed(0)},70" fill="#5b8c3e"/>`;
  }
  out('backgrounds/foreground.svg', svg(1024, 90, deco));
}

// ---------------------------------------------------------------------------------------------
// Train sprites. All face right (direction of travel). Wheels are separate sprites.
// ---------------------------------------------------------------------------------------------

const RED = '#a8323a';
const DARK = '#2a2a2e';
const BRASS = '#d6a84a';

out(
  'sprites/locomotive.svg',
  svg(
    220,
    140,
    `<rect x="12" y="112" width="200" height="18" fill="${DARK}"/>
<rect x="10" y="104" width="206" height="10" fill="${DARK}"/>
<rect x="72" y="56" width="122" height="50" rx="8" fill="${RED}"/>
<rect x="100" y="56" width="5" height="50" fill="${BRASS}"/>
<rect x="138" y="56" width="5" height="50" fill="${BRASS}"/>
<rect x="172" y="56" width="5" height="50" fill="${BRASS}"/>
<rect x="186" y="52" width="16" height="54" rx="3" fill="${DARK}"/>
<circle cx="203" cy="64" r="6" fill="#ffe08a" stroke="${DARK}" stroke-width="2"/>
<rect x="168" y="24" width="18" height="34" fill="${DARK}"/>
<rect x="163" y="18" width="28" height="9" rx="2" fill="${DARK}"/>
<path d="M118,58 Q131,36 144,58 Z" fill="${BRASS}"/>
<rect x="10" y="30" width="64" height="76" fill="${RED}"/>
<rect x="4" y="22" width="76" height="10" rx="3" fill="${DARK}"/>
<rect x="22" y="42" width="36" height="26" rx="3" fill="#f1d38a"/>
<rect x="22" y="42" width="36" height="26" rx="3" fill="none" stroke="${BRASS}" stroke-width="3"/>
<rect x="150" y="86" width="40" height="18" rx="4" fill="#7c252c"/>
<rect x="204" y="98" width="12" height="16" fill="${RED}"/>
<polygon points="196,114 216,114 220,136 192,136" fill="${DARK}"/>`,
  ),
);

out(
  'sprites/tender.svg',
  svg(
    110,
    80,
    `<polygon points="14,18 30,6 60,2 92,8 100,18" fill="#1d1d1f"/>
<rect x="4" y="16" width="102" height="48" rx="4" fill="${RED}"/>
<rect x="4" y="24" width="102" height="4" fill="${BRASS}"/>
<rect x="4" y="54" width="102" height="4" fill="${BRASS}"/>
<rect x="2" y="62" width="106" height="12" fill="${DARK}"/>`,
  ),
);

out(
  'sprites/carriage.svg',
  svg(
    170,
    90,
    `<rect x="4" y="8" width="162" height="14" rx="7" fill="#3a2a2a"/>
<rect x="4" y="18" width="162" height="54" rx="3" fill="#8e2d36"/>
<rect x="4" y="22" width="162" height="4" fill="${BRASS}"/>
<rect x="16" y="32" width="22" height="20" rx="3" fill="#f3e2b5"/>
<rect x="46" y="32" width="22" height="20" rx="3" fill="#f3e2b5"/>
<rect x="76" y="32" width="18" height="34" rx="2" fill="#5e1d24"/>
<rect x="102" y="32" width="22" height="20" rx="3" fill="#f3e2b5"/>
<rect x="132" y="32" width="22" height="20" rx="3" fill="#f3e2b5"/>
<rect x="2" y="70" width="166" height="12" fill="${DARK}"/>`,
  ),
);

out(
  'sprites/wagon.svg',
  svg(
    120,
    60,
    `<rect x="4" y="18" width="112" height="30" fill="#6d4a2b"/>
<rect x="4" y="18" width="112" height="4" fill="#8b6239"/>
<rect x="4" y="30" width="112" height="2" fill="#57391f"/>
<rect x="4" y="40" width="112" height="2" fill="#57391f"/>
<rect x="30" y="18" width="4" height="30" fill="#57391f"/>
<rect x="86" y="18" width="4" height="30" fill="#57391f"/>
<rect x="2" y="46" width="116" height="10" fill="${DARK}"/>`,
  ),
);

out(
  'sprites/cargo-load.svg',
  svg(
    104,
    26,
    `<path d="M0,26 Q10,8 26,10 Q38,0 54,6 Q70,0 82,10 Q98,8 104,26 Z" fill="#6e6259"/>
<circle cx="30" cy="16" r="4" fill="#8a7c70"/><circle cx="60" cy="12" r="5" fill="#8a7c70"/><circle cx="80" cy="18" r="3" fill="#b08a4a"/>`,
  ),
);

{
  let spokes = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spokes += `<line x1="32" y1="32" x2="${(32 + Math.cos(a) * 25).toFixed(1)}" y2="${(32 + Math.sin(a) * 25).toFixed(1)}" stroke="#8a8f94" stroke-width="3"/>`;
  }
  out(
    'sprites/wheel.svg',
    svg(
      64,
      64,
      `<circle cx="32" cy="32" r="31" fill="#1f1f22"/>
<circle cx="32" cy="32" r="26" fill="#3a3b3f"/>
${spokes}
<path d="M14,40 A20,20 0 0 0 50,40 Z" fill="#2a2b2e"/>
<circle cx="32" cy="32" r="6" fill="${RED}"/>`,
    ),
  );
}

out(
  'sprites/smoke.svg',
  svg(
    64,
    64,
    `<defs><radialGradient id="s"><stop offset="0" stop-color="#f2f2f2" stop-opacity="1"/><stop offset="0.6" stop-color="#d0d0d0" stop-opacity="0.7"/><stop offset="1" stop-color="#bbbbbb" stop-opacity="0"/></radialGradient></defs>
<circle cx="32" cy="32" r="32" fill="url(#s)"/>`,
  ),
);

{
  // A branch line peeling away from the main line towards the horizon. Bottom-left = junction.
  let sleepers = '';
  for (let t = 0.08; t < 1; t += 0.07) {
    const x = 420 * t;
    const y = 104 - 90 * t * t;
    sleepers += `<rect x="${(x - 7).toFixed(0)}" y="${(y - 2).toFixed(0)}" width="14" height="${(6 - t * 3).toFixed(1)}" fill="#5a3b24" opacity="${(1 - t * 0.6).toFixed(2)}"/>`;
  }
  out(
    'sprites/branch-line.svg',
    svg(
      420,
      110,
      `<defs><linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="#d4d8db"/><stop offset="1" stop-color="#d4d8db" stop-opacity="0.15"/></linearGradient></defs>
${sleepers}
<path d="M0,104 Q210,104 420,14" fill="none" stroke="url(#f)" stroke-width="4"/>
<path d="M0,98 Q210,98 420,10" fill="none" stroke="url(#f)" stroke-width="2"/>`,
    ),
  );
}

out(
  'sprites/points-lever.svg',
  svg(
    40,
    60,
    `<rect x="4" y="40" width="32" height="18" rx="2" fill="#5a3b24"/>
<line x1="20" y1="46" x2="32" y2="6" stroke="#2a2a2e" stroke-width="4"/>
<circle cx="32" cy="6" r="5" fill="#d64040"/>`,
  ),
);

// ---------------------------------------------------------------------------------------------
// Points of interest (buildings). Bottom edge sits on the embankment behind the track.
// ---------------------------------------------------------------------------------------------

out(
  'pois/coal-depot.svg',
  svg(
    320,
    280,
    `<rect x="30" y="120" width="190" height="160" fill="#3b3633"/>
<polygon points="20,124 125,70 230,124" fill="#252220"/>
<rect x="50" y="160" width="40" height="40" fill="#e3973a" opacity="0.8"/>
<rect x="150" y="160" width="40" height="40" fill="#e3973a" opacity="0.8"/>
<rect x="232" y="30" width="62" height="160" fill="#4a4440"/>
<polygon points="232,190 294,190 263,230" fill="#4a4440"/>
<rect x="257" y="228" width="12" height="52" fill="#4a4440"/>
<polygon points="236,60 290,60 290,40 236,40" fill="#e3973a"/>
<polygon points="0,280 30,230 70,214 110,240 130,280" fill="#141414"/>
<polygon points="263,226 300,250 296,256 259,232" fill="#2b2826"/>`,
  ),
);

out(
  'pois/town.svg',
  svg(
    320,
    280,
    `<rect x="20" y="150" width="60" height="130" fill="#c7a77a"/>
<polygon points="14,150 50,112 86,150" fill="#7a3a30"/>
<rect x="250" y="160" width="60" height="120" fill="#c7a77a"/>
<polygon points="244,160 280,120 316,160" fill="#7a3a30"/>
<rect x="70" y="120" width="180" height="160" fill="#b5653f"/>
<polygon points="60,124 160,60 260,124" fill="#6d2f2a"/>
<rect x="140" y="12" width="40" height="80" fill="#b5653f"/>
<polygon points="134,14 160,-6 186,14" fill="#6d2f2a"/>
<circle cx="160" cy="44" r="14" fill="#f7efd8" stroke="#3a2a22" stroke-width="3"/>
<line x1="160" y1="44" x2="160" y2="34" stroke="#3a2a22" stroke-width="2"/>
<line x1="160" y1="44" x2="167" y2="44" stroke="#3a2a22" stroke-width="2"/>
<rect x="90" y="160" width="26" height="40" rx="12" fill="#f2dc8f"/>
<rect x="147" y="200" width="26" height="80" rx="12" fill="#5a2a22"/>
<rect x="204" y="160" width="26" height="40" rx="12" fill="#f2dc8f"/>
<rect x="40" y="246" width="250" height="10" fill="#7d6b57"/>`,
  ),
);

out(
  'pois/mine.svg',
  svg(
    320,
    280,
    `<rect x="20" y="150" width="120" height="130" fill="#8a4b35"/>
<polygon points="12,152 80,110 148,152" fill="#4b2d24"/>
<rect x="30" y="40" width="22" height="114" fill="#6e3a2a"/>
<rect x="60" y="190" width="28" height="40" fill="#f2c56b"/>
<g stroke="#3f3a36" stroke-width="7" fill="none">
  <line x1="170" y1="280" x2="215" y2="40"/>
  <line x1="290" y1="280" x2="215" y2="40"/>
  <line x1="185" y1="200" x2="275" y2="200"/>
  <line x1="198" y1="120" x2="245" y2="120"/>
  <line x1="185" y1="200" x2="245" y2="120"/>
</g>
<circle cx="215" cy="40" r="26" fill="none" stroke="#2c2826" stroke-width="7"/>
<circle cx="215" cy="40" r="5" fill="#2c2826"/>
<polygon points="140,280 170,248 210,240 250,256 280,280" fill="#6e6259"/>`,
  ),
);

out(
  'pois/workshop.svg',
  svg(
    320,
    280,
    `<rect x="16" y="110" width="288" height="170" fill="#6e7b86"/>
<polygon points="16,110 70,70 70,110" fill="#4c5761"/>
<polygon points="70,110 124,70 124,110" fill="#4c5761"/>
<polygon points="124,110 178,70 178,110" fill="#4c5761"/>
<polygon points="178,110 232,70 232,110" fill="#4c5761"/>
<polygon points="232,110 286,70 286,110" fill="#4c5761"/>
<rect x="16" y="104" width="288" height="10" fill="#3e4750"/>
<path d="M110,280 L110,190 A50,50 0 0 1 210,190 L210,280 Z" fill="#2b3036"/>
<rect x="34" y="150" width="50" height="34" fill="#a9c7d9"/>
<rect x="236" y="150" width="50" height="34" fill="#a9c7d9"/>
<circle cx="160" cy="146" r="22" fill="#d6a84a"/>
<path d="M150,156 L168,138 M164,134 a8,8 0 1 0 8,8" stroke="#2b3036" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  ),
);

out(
  'pois/water-tower.svg',
  svg(
    320,
    280,
    `<rect x="16" y="200" width="70" height="80" fill="#9a7b5a"/>
<polygon points="10,202 51,176 92,202" fill="#5f4a37"/>
<g stroke="#4a3b2e" stroke-width="8">
  <line x1="110" y1="140" x2="100" y2="280"/>
  <line x1="230" y1="140" x2="240" y2="280"/>
  <line x1="150" y1="140" x2="148" y2="280"/>
  <line x1="190" y1="140" x2="192" y2="280"/>
</g>
<g stroke="#4a3b2e" stroke-width="4"><line x1="104" y1="210" x2="236" y2="210"/><line x1="102" y1="250" x2="238" y2="250"/></g>
<rect x="90" y="40" width="160" height="104" rx="10" fill="#3d6f9e"/>
<rect x="90" y="62" width="160" height="5" fill="#2c5378"/>
<rect x="90" y="96" width="160" height="5" fill="#2c5378"/>
<rect x="90" y="128" width="160" height="5" fill="#2c5378"/>
<rect x="84" y="32" width="172" height="12" rx="4" fill="#2c5378"/>
<rect x="250" y="110" width="56" height="10" fill="#4a3b2e"/>
<rect x="298" y="118" width="10" height="70" fill="#2a2a2e"/>`,
  ),
);

// ---------------------------------------------------------------------------------------------
// UI: signposts and HUD icons.
// ---------------------------------------------------------------------------------------------

out(
  'ui/signpost.svg',
  svg(
    240,
    250,
    `<rect x="108" y="100" width="24" height="150" fill="#6b4a2c"/>
<rect x="108" y="100" width="6" height="150" fill="#83603c"/>
<polygon points="8,8 196,8 234,58 196,108 8,108" fill="#e9d6a8" stroke="#5a3b24" stroke-width="6" stroke-linejoin="round"/>`,
  ),
);

const icon = (body) => svg(48, 48, body);
out('ui/icon-fuel.svg', icon(`<g stroke="#a9a29a" stroke-width="2" stroke-linejoin="round"><polygon points="6,40 12,22 24,16 30,26 24,40" fill="#2b2b2b"/><polygon points="22,40 28,24 40,20 44,34 38,42" fill="#3a3a3a"/></g><polygon points="14,22 20,18 22,24" fill="#8a8a8a"/><polygon points="30,24 38,22 36,28" fill="#8a8a8a"/><polygon points="16,40 22,32 28,40" fill="#e3973a"/>`));
out('ui/icon-water.svg', icon(`<path d="M24,4 C24,4 8,24 8,32 A16,16 0 0 0 40,32 C40,24 24,4 24,4 Z" fill="#3f8fd8"/><path d="M16,32 A8,8 0 0 0 22,40" stroke="#bfe0ff" stroke-width="3" fill="none"/>`));
out('ui/icon-heat.svg', icon(`<path d="M24,4 C30,14 38,20 38,30 A14,14 0 0 1 10,30 C10,22 16,18 18,12 C20,18 22,20 24,20 C26,14 24,8 24,4 Z" fill="#e0552d"/><path d="M24,24 C28,30 30,32 30,36 A6,6 0 0 1 18,36 C18,32 22,30 24,24 Z" fill="#ffd25a"/>`));
out('ui/icon-money.svg', icon(`<circle cx="24" cy="24" r="19" fill="#e8b93c" stroke="#a87a1a" stroke-width="3"/><circle cx="24" cy="24" r="12" fill="none" stroke="#a87a1a" stroke-width="2"/>`));
out('ui/icon-passengers.svg', icon(`<circle cx="24" cy="13" r="8" fill="#f0d7b0"/><path d="M10,44 C10,30 16,24 24,24 C32,24 38,30 38,44 Z" fill="#4b7bc4"/>`));
out('ui/icon-cargo.svg', icon(`<rect x="6" y="10" width="36" height="32" fill="#b07a42" stroke="#6d4a2b" stroke-width="3"/><line x1="6" y1="10" x2="42" y2="42" stroke="#6d4a2b" stroke-width="3"/><line x1="42" y1="10" x2="6" y2="42" stroke="#6d4a2b" stroke-width="3"/>`));
out('ui/icon-condition.svg', icon(`<path d="M10,40 L28,22" stroke="#b9c0c6" stroke-width="7" stroke-linecap="round"/><path d="M26,14 A10,10 0 1 0 36,24 L30,24 L26,20 Z" fill="#b9c0c6"/>`));
out('ui/icon-distance.svg', icon(`<path d="M12,44 L12,18 A12,12 0 0 1 36,18 L36,44 Z" fill="#9c9a94" stroke="#6b6964" stroke-width="3"/><text x="24" y="34" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#3a3936">km</text>`));

// ---------------------------------------------------------------------------------------------
// Audio: tiny synthesised WAVs (16-bit mono). Replace with your own .wav/.mp3/.ogg files.
// ---------------------------------------------------------------------------------------------

const RATE = 22050;

function wav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

const buffer = (seconds) => new Float32Array(Math.round(seconds * RATE));
const noise = rng(99);
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

// Steam chuff: low-passed noise burst.
{
  const s = buffer(0.18);
  let lp = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 22);
    lp += 0.25 * (noise() * 2 - 1 - lp);
    s[i] = lp * env * 1.6;
  }
  out('audio/chuff.wav', wav(s));
}

// Whistle: two detuned tones with a breathy edge.
{
  const s = buffer(1.2);
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.08) * Math.min(1, (1.2 - t) / 0.25);
    const vib = 1 + Math.sin(t * 30) * 0.004;
    const tone = Math.sin(2 * Math.PI * 523 * vib * t) * 0.5 + Math.sin(2 * Math.PI * 659 * vib * t) * 0.4;
    s[i] = (tone + (noise() * 2 - 1) * 0.08) * env * 0.55;
  }
  out('audio/whistle.wav', wav(s));
}

// Brake: hiss plus a faint squeal.
{
  const s = buffer(1.0);
  let prev = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.05) * Math.exp(-t * 2.6);
    const n = noise() * 2 - 1;
    const hp = n - prev;
    prev = n;
    s[i] = (hp * 0.35 + Math.sin(2 * Math.PI * 1760 * t) * 0.06) * env;
  }
  out('audio/brake.wav', wav(s));
}

// Coins: two bright pings.
{
  const s = buffer(0.45);
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    let v = Math.sin(2 * Math.PI * 1318 * t) * Math.exp(-t * 18);
    if (t > 0.09) v += Math.sin(2 * Math.PI * 1760 * (t - 0.09)) * Math.exp(-(t - 0.09) * 12);
    s[i] = v * 0.4;
  }
  out('audio/coins.wav', wav(s));
}

// Click: short UI blip.
{
  const s = buffer(0.05);
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    s[i] = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 90) * 0.5;
  }
  out('audio/click.wav', wav(s));
}

// Warning: two beeps.
{
  const s = buffer(0.42);
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const on = t < 0.14 || (t > 0.24 && t < 0.38);
    s[i] = on ? Math.sign(Math.sin(2 * Math.PI * 880 * t)) * 0.18 : 0;
  }
  out('audio/warning.wav', wav(s));
}

// Music loop: 16 beats at 120 bpm (exactly 8 s) so it loops cleanly. C - Am - F - G.
{
  const s = buffer(8);
  const beat = 0.5;
  const chords = [
    { bass: 48, arp: [60, 64, 67, 72] },
    { bass: 45, arp: [57, 60, 64, 69] },
    { bass: 41, arp: [53, 57, 60, 65] },
    { bass: 43, arp: [55, 59, 62, 67] },
  ];
  const pattern = [0, 1, 2, 3, 2, 1, 2, 1];
  const note = (start, dur, freq, vol, shape) => {
    const a = Math.round(start * RATE);
    const b = Math.min(s.length, Math.round((start + dur) * RATE));
    for (let i = a; i < b; i++) {
      const t = (i - a) / RATE;
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 4) * Math.min(1, (dur - t) / 0.02);
      const ph = (freq * t) % 1;
      const w = shape === 'tri' ? 1 - 4 * Math.abs(ph - 0.5) : ph < 0.5 ? 0.6 : -0.6;
      s[i] += w * env * vol;
    }
  };
  chords.forEach((c, ci) => {
    const t0 = ci * 4 * beat;
    for (let k = 0; k < 4; k++) note(t0 + k * beat, beat * 0.9, midi(k % 2 ? c.bass + 7 : c.bass), 0.32, 'tri');
    pattern.forEach((p, k) => note(t0 + k * (beat / 2), beat / 2 - 0.02, midi(c.arp[p]), 0.07, 'sq'));
  });
  for (let k = 0; k < 32; k++) {
    const a = Math.round(k * (beat / 2) * RATE);
    for (let i = 0; i < 600; i++) s[a + i] += (noise() * 2 - 1) * Math.exp(-i / 120) * (k % 2 ? 0.05 : 0.09);
  }
  out('audio/music-loop.wav', wav(s));
}

console.log(`Placeholders: ${written} written, ${skipped} already existed${FORCE ? '' : ' (use --force to overwrite)'}.`);
