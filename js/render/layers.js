import {
  ENEMY_SCALE, PROJECTILE_SIZE_RATIO, BUILD_VERSION, ITEM_FLASH_ALPHA, CAMERA_ZOOM,
  GRID_W, GRID_H, PLAYABLE_MIN_X, PLAYABLE_MIN_Y, PLAYABLE_MAX_X, PLAYABLE_MAX_Y, FIELD_WALL_COLOR,
  FIELD_WALL_BORDER_COLOR, FIELD_WALL_BORDER_WIDTH,
} from '../config/constants.js';
import { toScreenX, toScreenY, screenCellSize, getViewportPixelSize } from '../core/gridMath.js';
import { getCaptureZoneBounds } from '../content/mechanics/encirclement.js';

const COLOR = {
  bg:   '#111111',
  head: '#dd3322',
  body: '#ffffff',
};

// 게임 화면(뷰포트)에 그리는 모든 레이어는 world.camera를 거쳐 화면 좌표를 구한다
// (core/gridMath.js의 toScreenX/Y/screenCellSize 참고) - 카메라가 움직이면 이 레이어들에
// 그려지는 모든 것이 함께 따라 움직인다. 뷰포트 자체의 픽셀 크기(배경/오버레이용)는
// getViewportPixelSize()로 구한다 - 필드 전체 크기(GRID_W*CELL_SIZE)와는 이제 다른 값이다.

function backgroundLayer(ctx) {
  const { width, height } = getViewportPixelSize();
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, width, height);
}

// 필드 가장자리의 "벽" - 실제로 뱀이 갈 수 있는 범위(PLAYABLE_MIN/MAX_X/Y) 바깥, 필드
// 전체(0~GRID_W/H) 안쪽 영역을 검은 배경 대신 짙은 회색으로 칠해서 눈에 띄게 한다
// (entities/snake.js의 isWallCollision이 쓰는 경계와 정확히 같다). 위/아래/좌/우 4개 띠로
// 나눠 그리면 겹침 없이 테두리 전체를 채울 수 있다. 카메라가 이동해 이 영역이 화면 밖으로
// 나가도 캔버스가 자동으로 잘라내므로 별도의 뷰포트 교차 계산이 필요 없다.
function fieldBorderLayer(ctx, world) {
  const camera = world.camera;
  const C = screenCellSize();
  ctx.fillStyle = FIELD_WALL_COLOR;
  // 위쪽 띠
  ctx.fillRect(toScreenX(0, camera), toScreenY(0, camera), GRID_W * C, PLAYABLE_MIN_Y * C);
  // 아래쪽 띠
  ctx.fillRect(toScreenX(0, camera), toScreenY(PLAYABLE_MAX_Y, camera), GRID_W * C, (GRID_H - PLAYABLE_MAX_Y) * C);
  // 왼쪽 띠 (위/아래 띠와 겹치지 않도록 세로 범위를 PLAYABLE_MIN_Y~PLAYABLE_MAX_Y로 제한)
  ctx.fillRect(toScreenX(0, camera), toScreenY(PLAYABLE_MIN_Y, camera), PLAYABLE_MIN_X * C, (PLAYABLE_MAX_Y - PLAYABLE_MIN_Y) * C);
  // 오른쪽 띠
  ctx.fillRect(toScreenX(PLAYABLE_MAX_X, camera), toScreenY(PLAYABLE_MIN_Y, camera), (GRID_W - PLAYABLE_MAX_X) * C, (PLAYABLE_MAX_Y - PLAYABLE_MIN_Y) * C);

  // 회색 벽과 검은 필드 사이 경계선(패치1) - 배경색 차이만으로는 경계가 잘 안 보인다는
  // 피드백으로, 플레이 가능 영역 테두리를 따라 밝은 회색 선을 덧그린다. 사각형이 뷰포트보다
  // 훨씬 커도(필드 전체 기준) 캔버스가 화면 밖 부분은 알아서 잘라내므로 그대로 그린다.
  ctx.strokeStyle = FIELD_WALL_BORDER_COLOR;
  ctx.lineWidth = FIELD_WALL_BORDER_WIDTH;
  ctx.strokeRect(
    toScreenX(PLAYABLE_MIN_X, camera), toScreenY(PLAYABLE_MIN_Y, camera),
    (PLAYABLE_MAX_X - PLAYABLE_MIN_X) * C, (PLAYABLE_MAX_Y - PLAYABLE_MIN_Y) * C
  );
}

// 회색 포획 범위 - 검은색 배경 위에 은은한 반투명 원형 그라데이션으로 표기해
// 공격(포획) 가능 범위를 보여준다. 경계가 딱 잘리지 않고 부드럽게 사라지도록
// 사각형 영역 안에 원형 그라데이션을 그린다.
function captureZoneLayer(ctx, world) {
  const camera = world.camera;
  const C = screenCellSize();
  for (const enemy of world.enemyManager.enemies) {
    if (!enemy.typeDef.captureZone) continue;
    const zone = getCaptureZoneBounds(enemy, ENEMY_SCALE);
    const left = toScreenX(zone.left, camera);
    const top = toScreenY(zone.top, camera);
    const width = (zone.right - zone.left + 1) * C;
    const height = (zone.bottom - zone.top + 1) * C;
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
  world.itemManager.render(ctx, world.camera);
}

// 이번 틱 동안의 진행률(world.tickProgress, 0~1)만큼 prevSegments[i]에서 segments[i]로
// 선형보간한 좌표를 반환한다 - 패치2(뱀이 한 칸씩 "뚝뚝" 끊겨 보이던 문제)의 핵심.
// 뱀은 항상 정확히 한 축으로만 한 칸 움직이므로(대각선 이동 없음), 칸별로 독립 보간해도
// 각 칸은 항상 자신의 이전/다음 칸을 잇는 직선 위를 움직인다 - 꼬여 보일 걱정이 없다.
// prevSegments에 해당 인덱스가 없으면(방금 성장으로 늘어난 칸 등) 그냥 현재 위치를 쓴다.
function interpolatedSegment(snake, i, t) {
  const cur = snake.segments[i];
  const prev = snake.prevSegments[i];
  if (!prev || t >= 1) return cur;
  return { x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t };
}

// 꼬리부터 그려서 머리가 위에 오도록. 평소 색을 먼저 다 그린 뒤, 아이템 섭취 직후 머리에서
// 꼬리 쪽으로 흘러가는 반짝임 웨이브 중인 칸에만 그 아이템 색을 낮은 불투명도(ITEM_FLASH_ALPHA)로
// 덧씌운다 - 색을 통째로 바꿔치기하지 않고 은은하게 틴트만 얹는 방식(Snake.isFlashingAt 참고).
function snakeLayer(ctx, world) {
  const camera = world.camera;
  const C = screenCellSize();
  const snake = world.snake;
  const segments = snake.segments;
  const t = world.tickProgress ?? 1;

  ctx.fillStyle = COLOR.body;
  for (let i = segments.length - 1; i >= 1; i--) {
    const s = interpolatedSegment(snake, i, t);
    ctx.fillRect(toScreenX(s.x, camera), toScreenY(s.y, camera), C, C);
  }

  // 몸이 스스로 겹치거나 촘촘하게 감기면 흰 사각형들이 붙어서 하나의 덩어리처럼 보여
  // 구불구불한 형태가 안 보이는 문제가 실제로 신고됐다 - 칸마다 테두리를 두르는 대신,
  // 머리부터 꼬리까지 각 칸의 중앙점을 순서대로 이어주는 회색 선(척추선) 하나를 그린다.
  // segments 배열은 항상 머리(0번)→꼬리 순이고, 배열상 이웃한 두 칸은 뱀이 움직이는 방식상
  // 실제 격자에서도 항상 붙어있다 - 그래서 그냥 중앙점을 순서대로 쭉 이으면, 몸이 어떻게
  // 접혀있든 자동으로 꺾이는 선이 그려져서 지나온 경로 순서가 드러난다.
  if (segments.length >= 2) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const head0 = interpolatedSegment(snake, 0, t);
    ctx.moveTo(toScreenX(head0.x, camera) + C / 2, toScreenY(head0.y, camera) + C / 2);
    for (let i = 1; i < segments.length; i++) {
      const s = interpolatedSegment(snake, i, t);
      ctx.lineTo(toScreenX(s.x, camera) + C / 2, toScreenY(s.y, camera) + C / 2);
    }
    ctx.stroke();
  }

  // 척추선의 시작점(머리 칸 중앙)까지 이어져 그려지므로, 머리를 이 뒤에 칠해야 그 부분이
  // 빨간 머리에 자연스럽게 가려져서 선이 머리에서부터 뻗어나오는 것처럼 보인다.
  const head = interpolatedSegment(snake, 0, t);
  ctx.fillStyle = COLOR.head;
  ctx.fillRect(toScreenX(head.x, camera), toScreenY(head.y, camera), C, C);

  if (snake.flashColor) {
    ctx.globalAlpha = ITEM_FLASH_ALPHA;
    ctx.fillStyle = snake.flashColor;
    for (let i = 0; i < segments.length; i++) {
      if (!snake.isFlashingAt(i)) continue;
      const s = interpolatedSegment(snake, i, t);
      ctx.fillRect(toScreenX(s.x, camera), toScreenY(s.y, camera), C, C);
    }
    ctx.globalAlpha = 1;
  }
}

function projectileLayer(ctx, world) {
  const camera = world.camera;
  const C = screenCellSize();
  const size = Math.max(1, Math.floor(C * PROJECTILE_SIZE_RATIO));
  for (const projectile of world.projectileManager.projectiles) {
    const px = toScreenX(projectile.x, camera);
    const py = toScreenY(projectile.y, camera);
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    // 원의 중심을 칸의 정중앙(px + C/2)에 맞춘다 - size(칸보다 작은 투사체 자체 지름)의 절반만
    // 더하면 원이 칸의 좌상단 쪽으로 치우쳐 보인다(칸이 size보다 크므로).
    ctx.arc(px + C / 2, py + C / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function enemyLayer(ctx, world) {
  world.enemyManager.render(ctx, world.camera);
}

// 적 처치/포획 지점에서 managers/particleManager.js가 만든 파티클을 그린다 - 투사체처럼
// 원으로 그리되, 남은 수명 비율(life/maxLife)만큼 알파를 줄여서 사라지는 느낌을 낸다.
// 모든 것 위에(적 위에도) 보여야 눈에 띄므로 enemyLayer 다음, versionLayer 앞에 둔다.
function particleLayer(ctx, world) {
  const camera = world.camera;
  const C = screenCellSize();
  const size = Math.max(1, Math.floor(C * PROJECTILE_SIZE_RATIO));
  for (const particle of world.particleManager.particles) {
    const px = toScreenX(particle.x, camera) + size / 2;
    const py = toScreenY(particle.y, camera) + size / 2;
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    if (particle.shape === 'line') {
      // blue 여의주의 빗방울 - 점 대신 진행 방향으로 짧은 선을 그려서 "실선이 대각선으로
      // 흩뿌려지는" 느낌을 낸다(entities/particle.js 참고). 속도 벡터를 정규화해서 길이를
      // 칸 크기 비례로 고정 - 파티클마다 speed가 달라도 선 길이는 항상 일정하게 보인다.
      const norm = Math.hypot(particle.vx, particle.vy) || 1;
      const len = C * 0.8;
      const dx = (particle.vx / norm) * len;
      const dy = (particle.vy / norm) * len;
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - dx, py - dy);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// 아이템 섭취/적 처치 지점에서 managers/scorePopupManager.js가 만든 "+20" 팝업을 그린다 -
// 남은 수명 비율(life/maxLife)만큼 알파를 줄여서 위로 떠오르며 사라지는 느낌을 낸다.
function scorePopupLayer(ctx, world) {
  const camera = world.camera;
  const C = screenCellSize();
  ctx.font = `bold ${Math.floor(12 * CAMERA_ZOOM)}px CintamaniFont, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const popup of world.scorePopupManager.popups) {
    ctx.globalAlpha = Math.max(0, popup.life / popup.maxLife);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(popup.text, toScreenX(popup.x, camera) + C / 2, toScreenY(popup.y, camera));
  }
  ctx.globalAlpha = 1;
}

// 비늘파동(states/playingState.js의 fireScaleWave) 발사 순간 범위를 하얗게 번쩍인다.
// world.scaleWaveEffect가 없거나 만료됐으면 그냥 아무것도 안 그린다 - 별도로 지워줄 필요 없이
// 시간이 지나면 자연히 안 그려진다.
// 칸 하나하나를 따로 그리면(원이든 사각형이든) 몸 각 칸에서 개별적으로 번쩍이는 것처럼
// 보인다 - 대신 영향받는 모든 칸의 사각형을 하나의 path에 모아 한 번에 fill()하고,
// 그 위에 blur 필터를 씌워서 칸 사이 경계를 뭉갠다. 뱀 몸 전체를 감싸는 십자 범위들이
// 서로 겹치므로, 블러를 거치면 뱀 형태를 따라 이어진 하나의 부드러운 덩어리로 보인다.
// 뱀/적을 가리면 안 되므로 snakeLayer/enemyLayer보다 먼저 그려지도록 layers 배열
// 순서를 그 앞으로 옮겨뒀다.
function scaleWaveLayer(ctx, world) {
  const effect = world.scaleWaveEffect;
  if (!effect || performance.now() >= effect.expiresAt) return;
  const camera = world.camera;
  const C = screenCellSize();
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.filter = `blur(${C}px)`;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (const { x, y } of effect.cells) {
    ctx.rect(toScreenX(x, camera), toScreenY(y, camera), C, C);
  }
  ctx.fill();
  ctx.restore();
}

// red 여의주(content/cintamani/red.js) 발동 순간 빔 경로에 뜨는 불기둥 - 그냥 단색 반투명
// 사각형이면 불처럼 안 보인다는 피드백으로 두 가지를 바꿨다: (1) 진행 방향에 수직인 폭
// 방향으로 빨강(가장자리)->노랑(중심)->빨강 그라데이션을 줘서 불꽃 단면처럼 보이게 하고,
// (2) 즉시 사라지는 하드 컷 대신 duration에 걸쳐 알파를 1->0으로 선형 감쇠시켜 서서히
// 꺼지는 것처럼 보이게 한다(실제 불티 파티클은 particleLayer가 따로 그림 - activate()의
// spawnBurst 참고).
function redBeamLayer(ctx, world) {
  const effect = world.redBeamEffect;
  if (!effect) return;
  const elapsed = performance.now() - effect.startedAt;
  if (elapsed >= effect.duration) return;
  const camera = world.camera;
  const C = screenCellSize();
  const fade = 1 - elapsed / effect.duration;

  const { headCell, dir } = effect;
  let gradient;
  if (dir.x !== 0) {
    gradient = ctx.createLinearGradient(0, toScreenY(headCell.y - 1, camera), 0, toScreenY(headCell.y + 2, camera));
  } else {
    gradient = ctx.createLinearGradient(toScreenX(headCell.x - 1, camera), 0, toScreenX(headCell.x + 2, camera), 0);
  }
  gradient.addColorStop(0, '#ff3300');
  gradient.addColorStop(0.5, '#ffe066');
  gradient.addColorStop(1, '#ff3300');

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (const { x, y } of effect.cells) {
    ctx.rect(toScreenX(x, camera), toScreenY(y, camera), C, C);
  }
  ctx.fill();
  ctx.restore();
}

// blue 여의주(content/cintamani/blue.js) 발동 중인 10초짜리 비 지대 - 은은한 푸른 원형
// 영역으로 표시한다. 실제 빗방울(대각선 파티클)은 particleLayer가 particleManager의
// particles를 통해 그린다(blue.js의 tickEffect가 주기적으로 spawnRain).
function blueRainLayer(ctx, world) {
  const effect = world.blueRainEffect;
  if (!effect || performance.now() >= effect.expiresAt) return;
  const camera = world.camera;
  const C = screenCellSize();
  const cx = toScreenX(effect.x, camera) + C / 2;
  const cy = toScreenY(effect.y, camera) + C / 2;
  const r = effect.radius * C;
  ctx.save();
  ctx.globalAlpha = 0.22; // 기존 0.16이 너무 흐려서 실제 크기(반지름 5칸)보다 작아 보인다는
  // 피드백으로 채우기를 살짝 진하게, 테두리 선을 추가해 경계가 뚜렷이 보이게 했다.
  ctx.fillStyle = '#3fa7ff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#7fd4ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// 지금 화면이 실제로 최신 코드를 불러온 게 맞는지 눈으로 바로 확인할 수 있도록,
// 우측 하단에 작게 빌드 표시를 띄운다. export하는 이유: 원래는 이 레이어 목록(실제 플레이/
// 게임오버 화면)에서만 쓰였지만, 타이틀/리더보드 열람 화면(overlays.js, 이 레이어 목록을
// 안 쓰고 독자적으로 그림)에도 버전을 노출하고 싶어서 - 그리는 내용이 완전히 같으므로
// 복사하지 않고 그대로 재사용한다. 뷰포트 픽셀 크기 기준(카메라와 무관 - 화면 우측 하단
// 고정 위치라 필드 크기가 뷰포트보다 커져도 항상 화면 안에 있어야 한다).
export function versionLayer(ctx) {
  const { width, height } = getViewportPixelSize();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '10px CintamaniFont, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(BUILD_VERSION, width - 4, height - 3);
}

export const layers = [
  backgroundLayer, fieldBorderLayer, captureZoneLayer, blueRainLayer, itemLayer, scaleWaveLayer, redBeamLayer,
  snakeLayer, projectileLayer, enemyLayer, particleLayer, scorePopupLayer, versionLayer,
];
