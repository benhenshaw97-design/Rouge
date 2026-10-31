import { DEPTH, FONT, POI_BUILDING_HEIGHT, POINTS, RAIL_Y, TUNNEL } from '../config/display.js';

/**
 * A stop beside the line: building, optional station platform and a name board.
 * Returns a Container whose x is the building's centre; WorldLayer moves it.
 */
export function createStop(scene, { buildingKey, title, subtitle, platform }) {
  const c = scene.add.container(0, 0).setDepth(DEPTH.buildings);
  const groundY = RAIL_Y + 14;

  const img = scene.add.image(0, groundY, buildingKey).setOrigin(0.5, 1);
  img.setScale(POI_BUILDING_HEIGHT / img.height);
  c.add(img);

  if (platform) {
    const p = scene.add.image(0, RAIL_Y + 6, typeof platform === 'string' ? platform : 'platform').setOrigin(0.5, 1);
    p.setScale(Math.max(1.4, (img.displayWidth + 140) / p.width));
    c.add(p);
  }

  const boardY = groundY - img.displayHeight - 28;
  const res = 2;
  const titleText = scene.add
    .text(0, boardY - (subtitle ? 8 : 0), title, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#2b1d12', resolution: res })
    .setOrigin(0.5);
  const parts = [titleText];
  let height = 32;
  if (subtitle) {
    parts.push(
      scene.add.text(0, boardY + 11, subtitle, { fontFamily: FONT, fontSize: '13px', color: '#5a3b24', resolution: res }).setOrigin(0.5),
    );
    height = 48;
  }
  const width = Math.max(...parts.map((t) => t.width)) + 28;
  const board = scene.add.graphics();
  board.fillStyle(0x4a3220, 1).fillRect(-4, boardY + height / 2, 8, 22);
  board.fillStyle(0xe9d6a8, 1).fillRoundedRect(-width / 2, boardY - height / 2, width, height, 6);
  board.lineStyle(3, 0x4a3220, 1).strokeRoundedRect(-width / 2, boardY - height / 2, width, height, 6);
  c.add([board, ...parts]);
  return c;
}

/** The junction: a set of points on the main line, and a fingerpost beside it. */
export function createJunction(scene) {
  const c = scene.add.container(0, 0).setDepth(DEPTH.track + 0.1);
  c.add(
    scene.add
      .image(-POINTS.width * 0.25, RAIL_Y - POINTS.railTop, 'points')
      .setOrigin(0, 0)
      .setDisplaySize(POINTS.width, POINTS.height),
  );
  // The fingerpost stands just behind the rails, before the points.
  const post = scene.add.image(-70, RAIL_Y - 6, 'junction-signpost').setOrigin(0.5, 1);
  post.setScale(150 / post.height);
  c.add(post);
  return c;
}

/**
 * A towering peak the line tunnels through, with a mouth at each foot. Returns
 * { back, front, enterX, exitX }:
 *  back:  foothills either side and the full tunnel mouths, behind the train (it runs past the
 *         foothills and in front of the dark openings)
 *  front: the peak, its rocky base, a dark tunnel interior and the far half of each mouth, in
 *         front of the train, so it disappears into the entrance and comes out of the exit
 *  enterX / exitX: where the train vanishes / reappears, in design px from the entrance's left edge
 * Both containers are positioned by WorldLayer at the same spot (the entrance's left edge).
 */
export function createTunnel(scene) {
  const back = scene.add.container(0, 0).setDepth(DEPTH.trainBack - 0.5);
  const front = scene.add.container(0, 0).setDepth(DEPTH.tunnel);
  const T = TUNNEL;
  const img = (x, y, key, height) => {
    const o = scene.add.image(x, y, key).setOrigin(0, 1);
    return o.setScale(height / o.height);
  };

  const src = scene.textures.get('tunnel-portal').getSourceImage();
  const k = T.portalHeight / src.height;
  const pw = src.width * k;
  const portalY = RAIL_Y + 12;

  // The peak, starting halfway across the entrance mouth.
  const peakLeft = pw * 0.5;
  const peak = img(peakLeft, T.bottom, 'mountain-peak', T.peakHeight);
  const peakW = peak.displayWidth;
  const exitLeft = peakLeft + peakW - pw * 0.5;
  const enterX = pw * T.opening.left;
  const exitX = exitLeft + pw * (1 - T.opening.left);

  // Foothills either side, tucked partly behind the peak.
  const left = img(0, T.bottom, 'mountain-foothill', T.foothillHeight);
  left.x = peakLeft + left.displayWidth * T.foothillOverlap - left.displayWidth;
  const right = img(peakLeft + peakW - 0, T.bottom, 'mountain-foothill', T.foothillHeight).setFlipX(true);
  right.x = peakLeft + peakW - right.displayWidth * T.foothillOverlap;
  // A long low ridge behind both foothills, so the range runs on beyond them.
  const band = img(0, T.bottom - 4, 'mountain-rock-band', T.rockBandHeight);
  band.x = peakLeft + peakW / 2 - band.displayWidth / 2;
  back.add([band, left, right]);

  // Grassy rocks along the peak's foot (two copies, the second mirrored).
  const bases = [];
  for (let x = peakLeft, i = 0; x < peakLeft + peakW; i++) {
    const b = img(x, T.bottom + 22, 'mountain-base', T.baseHeight).setFlipX(i % 2 === 1);
    bases.push(b);
    x += b.displayWidth - 30;
  }

  // Dark tunnel interior between the mouths, so the train is hidden all the way through.
  const top = portalY - T.portalHeight * (1 - T.opening.top);
  const interior = scene.add.rectangle(enterX, top, exitX - enterX, portalY - top + 4, 0x120d0a).setOrigin(0, 0);

  // Entrance: whole mouth behind the train; its right half (from the middle of the opening) in front.
  back.add(scene.add.image(0, portalY, 'tunnel-portal').setOrigin(0, 1).setScale(k));
  const enterFront = scene.add.image(0, portalY, 'tunnel-portal').setOrigin(0, 1).setScale(k);
  enterFront.setCrop(src.width * T.opening.left, 0, src.width * (1 - T.opening.left), src.height);

  // Exit: the mouth mirrored; its left half (up to the middle of the opening) in front.
  back.add(scene.add.image(exitLeft, portalY, 'tunnel-portal-exit').setOrigin(0, 1).setScale(k));
  const exitFront = scene.add.image(exitLeft, portalY, 'tunnel-portal-exit').setOrigin(0, 1).setScale(k);
  exitFront.setCrop(0, 0, src.width * (1 - T.opening.left), src.height);

  // Rock bank across the whole bottom of the screen, in front of the train and the mouths'
  // bases, so the train runs into the mountain through a rocky cutting with no ground showing.
  const bank = scene.add.container(0, 0).setDepth(DEPTH.foreground + 1);
  const bankFrom = left.x - T.bankMargin;
  const bankTo = right.x + right.displayWidth + T.bankMargin;
  const bankSrc = scene.textures.get('tunnel-rock-bank').getSourceImage();
  // Two staggered rows: a back row standing a little higher fills the dips between the front
  // row's humps, so no track, wheels or grass show through anywhere.
  for (const row of [
    { top: T.bankTop - 28, shift: 0.41, flip: 1 },
    { top: T.bankTop, shift: 0, flip: 0 },
  ]) {
    const h = 762 - row.top;
    const w = bankSrc.width * (h / bankSrc.height);
    for (let x = bankFrom - w * row.shift, i = 0; x < bankTo; i++) {
      bank.add(scene.add.image(x, 762, 'tunnel-rock-bank').setOrigin(0, 1).setDisplaySize(w, h).setFlipX((i + row.flip) % 2 === 1));
      x += w * 0.82;
    }
  }

  front.add([interior, peak, ...bases, enterFront, exitFront]);
  return { back, front, bank, enterX, exitX, bankFrom, bankTo };
}
