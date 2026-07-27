import { GRID_W, GRID_H, CELL_SIZE, ENEMY_SCALE, PROJECTILE_SIZE_RATIO, BUILD_VERSION } from '../config/constants.js';
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

// 회색 포획 범위 - 검은색 배경 위에 은은한 반투명 원형 그라데이션으로 표기해
// 공격(포획) 가능 범위를 보여준다. 경계가 딱 잘리지 않고 부드럽게 사라지도록
// 사각형 영역 안에 원형 그라데이션을 그린다.
function captureZoneLayer(ctx, world) {
  for (const enemy of world.enemyManager.enemies) {
    if (!enemy.typeDef.captureZone) continue;
    const zone = getCaptureZoneBounds(enemy, ENEMY_SCALE);
    const left = toPixel(zone.left);
    const top = toPixel(zone.top);
    const width = toPixel(zone.right - zone.left + 1);
    const height = toPixel(zone.bottom - zone.top + 1);
    const cx = left + width / 2;
    const cy = top + height / 2;
    const radius = Math.min(width, height) / 2;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(140, 140, 140, 0.32)');
    gradient.addColorStop(1, 'rgba(140, 140, 140, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(left, top, width, height);
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

// 지금 화면이 실제로 최신 코드를 불러온 게 맞는지 눈으로 바로 확인할 수 있도록,
// 우측 하단에 작게 빌드 표시를 띄운다.
function versionLayer(ctx) {
  const cw = GRID_W * CELL_SIZE;
  const ch = GRID_H * CELL_SIZE;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(BUILD_VERSION, cw - 4, ch - 3);
}

export const layers = [backgroundLayer, captureZoneLayer, itemLayer, snakeLayer, projectileLayer, enemyLayer, versionLayer];
