import {
  GRID_W, GRID_H, CELL_SIZE, ENEMY_SCALE, PROJECTILE_SIZE_RATIO, BUILD_VERSION, ITEM_FLASH_ALPHA,
} from '../config/constants.js';
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

// 꼬리부터 그려서 머리가 위에 오도록. 평소 색을 먼저 다 그린 뒤, 아이템 섭취 직후 머리에서
// 꼬리 쪽으로 흘러가는 반짝임 웨이브 중인 칸에만 그 아이템 색을 낮은 불투명도(ITEM_FLASH_ALPHA)로
// 덧씌운다 - 색을 통째로 바꿔치기하지 않고 은은하게 틴트만 얹는 방식(Snake.isFlashingAt 참고).
function snakeLayer(ctx, world) {
  const C = CELL_SIZE;
  const snake = world.snake;
  const segments = snake.segments;

  ctx.fillStyle = COLOR.body;
  for (let i = segments.length - 1; i >= 1; i--) {
    const s = segments[i];
    ctx.fillRect(s.x * C, s.y * C, C, C);
  }

  const head = snake.head;
  ctx.fillStyle = COLOR.head;
  ctx.fillRect(head.x * C, head.y * C, C, C);

  if (snake.flashColor) {
    ctx.globalAlpha = ITEM_FLASH_ALPHA;
    ctx.fillStyle = snake.flashColor;
    for (let i = 0; i < segments.length; i++) {
      if (!snake.isFlashingAt(i)) continue;
      const s = segments[i];
      ctx.fillRect(s.x * C, s.y * C, C, C);
    }
    ctx.globalAlpha = 1;
  }
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

// 적 처치/포획 지점에서 managers/particleManager.js가 만든 파티클을 그린다 - 투사체처럼
// 원으로 그리되, 남은 수명 비율(life/maxLife)만큼 알파를 줄여서 사라지는 느낌을 낸다.
// 모든 것 위에(적 위에도) 보여야 눈에 띄므로 enemyLayer 다음, versionLayer 앞에 둔다.
function particleLayer(ctx, world) {
  const C = CELL_SIZE;
  const size = Math.max(1, Math.floor(C * PROJECTILE_SIZE_RATIO));
  for (const particle of world.particleManager.particles) {
    const px = particle.x * C;
    const py = particle.y * C;
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 아이템 섭취/적 처치 지점에서 managers/scorePopupManager.js가 만든 "+20" 팝업을 그린다 -
// 남은 수명 비율(life/maxLife)만큼 알파를 줄여서 위로 떠오르며 사라지는 느낌을 낸다.
function scorePopupLayer(ctx, world) {
  const C = CELL_SIZE;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const popup of world.scorePopupManager.popups) {
    ctx.globalAlpha = Math.max(0, popup.life / popup.maxLife);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(popup.text, popup.x * C + C / 2, popup.y * C);
  }
  ctx.globalAlpha = 1;
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

export const layers = [
  backgroundLayer, captureZoneLayer, itemLayer, snakeLayer, projectileLayer, enemyLayer, particleLayer,
  scorePopupLayer, versionLayer,
];
