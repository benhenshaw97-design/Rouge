import { DEPTH, FONT, POI_BUILDING_MAX, RAIL_Y } from '../config/display.js';

/**
 * A building beside the line with a name board above it (used for POIs and the start station).
 * Returns a Container whose x is the building's centre; WorldLayer moves it.
 */
export function createStop(scene, { buildingKey, title, subtitle }) {
  const c = scene.add.container(0, 0).setDepth(DEPTH.buildings);
  const groundY = RAIL_Y + 6;

  const img = scene.add.image(0, groundY, buildingKey).setOrigin(0.5, 1);
  const fit = Math.min(POI_BUILDING_MAX.width / img.width, POI_BUILDING_MAX.height / img.height, 1);
  img.setScale(fit);
  c.add(img);

  const boardY = groundY - img.displayHeight - 30;
  const titleText = scene.add
    .text(0, boardY - (subtitle ? 8 : 0), title, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#2b1d12' })
    .setOrigin(0.5);
  const parts = [titleText];
  let height = 34;
  if (subtitle) {
    parts.push(
      scene.add.text(0, boardY + 12, subtitle, { fontFamily: FONT, fontSize: '13px', color: '#5a3b24' }).setOrigin(0.5),
    );
    height = 50;
  }
  const width = Math.max(...parts.map((t) => t.width)) + 28;
  const board = scene.add.graphics();
  board.fillStyle(0x5a3b24, 1).fillRect(-3, boardY + height / 2, 6, 24);
  board.fillStyle(0xe9d6a8, 1).fillRoundedRect(-width / 2, boardY - height / 2, width, height, 8);
  board.lineStyle(3, 0x5a3b24, 1).strokeRoundedRect(-width / 2, boardY - height / 2, width, height, 8);
  c.add([board, ...parts]);
  return c;
}

/** The junction: a branch line peeling off towards the horizon, plus the points lever. */
export function createJunction(scene) {
  const c = scene.add.container(0, 0).setDepth(DEPTH.branchLine);
  c.add(scene.add.image(0, RAIL_Y + 10, 'branch-line').setOrigin(0, 1));
  c.add(scene.add.image(-26, RAIL_Y + 2, 'points-lever').setOrigin(0.5, 1));
  return c;
}
