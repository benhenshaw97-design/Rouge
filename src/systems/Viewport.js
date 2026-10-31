/**
 * Screen sizing and layout for phones, tablets and desktops.
 *
 * The canvas is rendered at the device's pixel density (capped for performance) so text and
 * art stay sharp on phones. Layout is worked out in CSS pixels; the UI scene draws in CSS
 * pixels with its camera zoomed by the pixel ratio, and the world camera fits the 1280×720
 * design stage into whatever area the layout gives it.
 */

const MAX_DPR = 2;
const MAX_CANVAS_PIXELS = 4_200_000;

export function measure(parent) {
  const rect = parent.getBoundingClientRect();
  const cssW = Math.max(280, Math.round(rect.width || window.innerWidth));
  const cssH = Math.max(280, Math.round(rect.height || window.innerHeight));
  let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  if (cssW * cssH * dpr * dpr > MAX_CANVAS_PIXELS) dpr = Math.sqrt(MAX_CANVAS_PIXELS / (cssW * cssH));
  return { cssW, cssH, width: Math.round(cssW * dpr), height: Math.round(cssH * dpr) };
}

/** Keeps the game canvas matched to its parent element, at device pixel density. */
export function installResponsiveScale(game, parent) {
  const apply = () => {
    const m = measure(parent);
    game.registry.set('uiScale', m.width / m.cssW);
    game.scale.setZoom(m.cssW / m.width);
    if (game.scale.width !== m.width || game.scale.height !== m.height) game.scale.resize(m.width, m.height);
  };
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(apply);
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', () => setTimeout(schedule, 200));
  window.visualViewport?.addEventListener('resize', schedule);
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(parent);
  apply();
}

/** Pixel ratio between the canvas and CSS pixels (the UI camera's zoom). */
export function uiScale(scene) {
  return scene.registry.get('uiScale') || 1;
}

/** The game's size in CSS pixels. */
export function cssSize(scene) {
  const u = uiScale(scene);
  return { w: scene.scale.width / u, h: scene.scale.height / u };
}

export function isTouch(scene) {
  return !!scene.sys.game.device.input.touch;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// HUD sizes, shared with ui/Hud.js so the layout knows how tall the HUD is.
export const HUD_METRICS = { padX: 14, padY: 10, gaugeRow: 24, counterRow: 26, panelGaugeRow: 28, panelCounterRow: 30 };

export function hudHeight(hud) {
  const m = HUD_METRICS;
  if (hud.style === 'panel') return m.padY * 2 + 4 * m.panelGaugeRow + 10 + 2 * m.panelCounterRow + 26;
  const gaugeRows = Math.ceil(4 / hud.gaugeCols);
  const counterRows = Math.ceil(4 / hud.counterCols);
  return m.padY * 2 + gaugeRows * m.gaugeRow + 6 + counterRows * m.counterRow;
}

/**
 * Works out where everything goes for a screen of cssW × cssH.
 *
 *  hud:     the gauges and counters
 *  world:   the area the train scene is drawn in; frontX is where the locomotive's nose sits
 *           and focusW how much room there is behind it (the rest of the train may run off-screen)
 *  side:    where junction signposts and stop menus appear
 *  notice:  centre-top point for warnings and messages
 *  controls: where the sound / fullscreen buttons go
 */
export function computeLayout(cssW, cssH) {
  const portrait = cssH > cssW * 1.05;
  const compact = !portrait && cssH < 540;
  const small = Math.min(cssW, cssH) < 520;
  const pad = small ? 10 : 16;
  const L = { cssW, cssH, portrait, compact, small, pad };

  if (portrait) {
    // Phone held upright: HUD on top, the line in a band across the middle, menus below.
    const gaugeCols = cssW >= 560 ? 4 : 2;
    L.hud = { x: pad, y: pad, w: cssW - pad * 2, style: 'strip', gaugeCols, counterCols: cssW >= 330 ? 4 : 2 };
    L.hud.h = hudHeight(L.hud);
    const bandY = L.hud.y + L.hud.h + 8;
    const bandH = Math.round(clamp(cssW * 0.78, 190, cssH * 0.4));
    L.world = { x: 0, y: bandY, w: cssW, h: bandH, frontX: cssW * 0.93, focusW: cssW * 0.9, fitHeight: false };
    const areaY = bandY + bandH + 10;
    L.side = { x: pad, y: areaY, w: cssW - pad * 2, h: cssH - areaY - pad };
    L.notice = { x: cssW / 2, y: bandY + 18, maxW: cssW - pad * 2 };
    L.controls = { x: cssW - pad - 18, y: bandY + bandH - 22, dir: -1 };
  } else {
    // Landscape: the line fills the screen; menus in a column on the right.
    const sideW = compact ? clamp(cssW * 0.46, 270, 420) : clamp(cssW * 0.36, 360, 480);
    L.side = { x: cssW - pad - sideW, y: pad, w: sideW, h: cssH - pad * 2 };
    const leftW = L.side.x - pad;
    if (compact) {
      const w = Math.min(leftW - pad, 560);
      L.hud = { x: pad, y: pad, w, style: 'strip', gaugeCols: w >= 520 ? 4 : 2, counterCols: 4 };
    } else {
      L.hud = { x: pad, y: pad, w: 340, style: 'panel' };
    }
    L.hud.h = hudHeight(L.hud);
    L.world = { x: 0, y: 0, w: cssW, h: cssH, frontX: L.side.x - pad, focusW: L.side.x - pad * 2, fitHeight: true };
    const hudRight = L.hud.x + L.hud.w;
    const roomBesideHud = L.side.x - hudRight - pad * 2;
    L.notice =
      roomBesideHud >= 300
        ? { x: (hudRight + L.side.x) / 2, y: pad + 20, maxW: roomBesideHud }
        : { x: L.side.x / 2, y: L.hud.y + L.hud.h + 22, maxW: leftW - pad };
    L.controls = { x: pad + 18, y: cssH - pad - 18, dir: 1 };
  }

  // Signposts use the top of the side area; stop menus can use all of it.
  L.picker = { ...L.side, h: Math.min(L.side.h, portrait ? 300 : compact ? L.side.h : 270) };
  L.panel = { ...L.side };
  // Upright phones have room under the line for a 'next stop' card while travelling.
  L.status = portrait ? { ...L.side, h: Math.min(L.side.h, 190) } : null;
  return L;
}
