import { GRID_W, GRID_H, CELL_SIZE, ENEMY_SCALE, PROJECTILE_SIZE_RATIO } from '../config/constants.js';
import { toPixel } from '../core/gridMath.js';
import { getCaptureZoneBounds } from '../content/mechanics/encirclement.js';

const COLOR = {
  bg:   '#111111',
  head: '#dd3322',
  body: '#ffffff',
};

function backgroundLayer(ctx) {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, GRID_W * CELL_SIZE, GRID_H * CELL_SIZE);
}

// 회색 포획 범위 - 검은색 배경 대신 회색으로 표기해 공격(포획) 가능 범위를 보여준다
function captureZoneLayer(ctx, world) {
  for (const enemy of world.enemyManager.enemies) {
    if (!enemy.typeDef.captureZone) continue;
    const zone = getCaptureZoneBounds(enemy, ENEMY_SCALE);
    ctx.fillStyle = '#4d4d4d';
    ctx.fillRect(
      toPixel(zone.left),
      toPixel(zone.top),
      toPixel(zone.right - zone.left + 1),
      toPixel(zone.bottom - zone.top + 1)
    );
  }
}

function itemLayer(ctx, world) {
  world.itemManager.render(ctx);
}

// 꼬리부터 그려서 머리가 위에 오도록
function snakeLayer(ctx, world) {
  const C = CELL_SIZE;
  ctx.fillStyle = COLOR.body;
  const segments = world.snake.segments;
  for (let i = segments.length - 1; i >= 1; i--) {
    const s = segments[i];
    ctx.fillRect(s.x * C, s.y * C, C, C);
  }

  ctx.fillStyle = COLOR.head;
  ctx.fillRect(world.snake.head.x * C, world.snake.head.y * C, C, C);
}

function projectileLayer(ctx, world) {
  const C = CELL_SIZE;
  const size = Math.max(1, Math.floor(C * PROJECTILE_SIZE_RATIO));
  for (const projectile of world.projectileManager.projectiles) {
    const px = projectile.x * C;
    const py = projectile.y * C;
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function enemyLayer(ctx, world) {
  world.enemyManager.render(ctx);
}

export const layers = [backgroundLayer, captureZoneLayer, itemLayer, snakeLayer, projectileLayer, enemyLayer];
