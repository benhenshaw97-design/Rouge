import { DEPTH, FONT, LANDMARK, POI_BUILDING_HEIGHT, POINTS, RAIL_Y, TUNNEL } from '../config/display.js';

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
    const p = scene.add.image(0, RAIL_Y + 6, 'platform').setOrigin(0.5, 1);
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
 * A tunnel into the next area: a rock hill with the tunnel mouth at its left end. It's drawn in
 * front of the train, so the train disappears into it. The container's x is the tunnel mouth.
 */
export function createTunnel(scene) {
  const c = scene.add.container(0, 0).setDepth(DEPTH.tunnel);
  const portal = scene.add.image(0, RAIL_Y + 14, 'tunnel-portal').setOrigin(0, 1);
  portal.setScale(TUNNEL.portalHeight / portal.height);
  const hill = scene.add.image(portal.displayWidth * 0.45, RAIL_Y + 40, 'rock-hill').setOrigin(0, 1);
  hill.setScale(TUNNEL.hillHeight / hill.height);
  c.add([hill, portal]);
  return c;
}

/** A big set piece in the distance (e.g. the waterfall mountain). */
export function createLandmark(scene, key) {
  const img = scene.add.image(0, LANDMARK.bottom, key).setOrigin(0.5, 1).setDepth(DEPTH.landmarks);
  img.setScale(LANDMARK.height / img.height);
  img.isLandmark = true;
  return img;
}
