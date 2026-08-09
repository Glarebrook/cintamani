import {
  ENEMY_SCALE, PROJECTILE_SIZE_RATIO, BUILD_VERSION, ITEM_FLASH_ALPHA,
  GRID_W, GRID_H, PLAYABLE_MIN_X, PLAYABLE_MIN_Y, PLAYABLE_MAX_X, PLAYABLE_MAX_Y, FIELD_WALL_COLOR,
  FIELD_WALL_BORDER_COLOR, FIELD_WALL_BORDER_WIDTH,
  PASS_THROUGH_GRACE_TINT_COLOR, PASS_THROUGH_GRACE_TINT_ALPHA,
} from '../config/constants.js';
import { toScreenX, toScreenY, screenCellSize, getViewportPixelSize } from '../core/gridMath.js';
// CAMERA_ZOOM은 테스트 빌드가 런타임에 덮어쓸 수 있어서(core/viewportConfig.js)
// constants.js에서 직접 import하지 않고 매번 getViewportConfig()로 읽는다.
import { getViewportConfig } from '../core/viewportConfig.js';
import { getCaptureZoneBounds } from '../content/mechanics/encirclement.js';
import { getSnakeSpriteSheet, getHeadRect, getTailRect, getBodyRect, dirFromDelta } from './snakeSprites.js';

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

// assets/snake/snake_spritesheet.png가 아직 로딩 전이거나 없을 때 쓰는 기존 렌더링 -
// 색깔 사각형 + 척추선(뱀 몸이 스스로 겹칠 때 흰 덩어리로 보이던 문제의 해결책). 스프라이트를
// 쓸 수 있게 되면 이 함수 대신 아래 spriteSnakeLayer가 그린다(다른 아이콘들과 같은 "이미지
// 없으면 폴백" 패턴 - render/snakeSprites.js 참고).
// 뱀 자체는 이제 부드럽게 보간하지 않고 틱마다 한 칸씩 딱딱 이동한다(예전 방식으로 되돌림 -
// 스프라이트 도입 후 회전 방향이 다른 두 스프라이트 사이를 보간할 방법이 없어서 꺾을 때
// 머리가 몸통에서 떨어져 보이는 문제가 있었다). 화면이 부드럽게 느껴지는 건 카메라
// 자체가 매 프레임 목표 지점을 향해 부드럽게 따라가기 때문(core/camera.js) - 뱀이 미끄러지는
// 게 아니라 카메라가 미끄러진다.
function fallbackSnakeLayer(ctx, world, camera, C, snake, segments) {
  ctx.fillStyle = COLOR.body;
  for (let i = segments.length - 1; i >= 1; i--) {
    const s = segments[i];
    ctx.fillRect(toScreenX(s.x, camera), toScreenY(s.y, camera), C, C);
  }

  if (segments.length >= 2) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const head0 = segments[0];
    ctx.moveTo(toScreenX(head0.x, camera) + C / 2, toScreenY(head0.y, camera) + C / 2);
    for (let i = 1; i < segments.length; i++) {
      const s = segments[i];
      ctx.lineTo(toScreenX(s.x, camera) + C / 2, toScreenY(s.y, camera) + C / 2);
    }
    ctx.stroke();
  }

  const head = segments[0];
  ctx.fillStyle = COLOR.head;
  ctx.fillRect(toScreenX(head.x, camera), toScreenY(head.y, camera), C, C);

  if (snake.flashColor) {
    ctx.globalAlpha = ITEM_FLASH_ALPHA;
    ctx.fillStyle = snake.flashColor;
    for (let i = 0; i < segments.length; i++) {
      if (!snake.isFlashingAt(i)) continue;
      const s = segments[i];
      ctx.fillRect(toScreenX(s.x, camera), toScreenY(s.y, camera), C, C);
    }
    ctx.globalAlpha = 1;
  }

  // 포획 후 무적 유예(실험, world.passThroughGraceTicksLeft - states/playingState.js 참고) -
  // 위 아이템 반짝임과 달리 머리→꼬리로 흘러가는 웨이브가 아니라, 활성 상태인 동안 몸 전체를
  // 계속 같은 색으로 덮어서 "지금은 몸에 부딪혀도 안 죽는다"는 상태 자체를 보여준다.
  if (world.passThroughGraceTicksLeft > 0) {
    ctx.globalAlpha = PASS_THROUGH_GRACE_TINT_ALPHA;
    ctx.fillStyle = PASS_THROUGH_GRACE_TINT_COLOR;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      ctx.fillRect(toScreenX(s.x, camera), toScreenY(s.y, camera), C, C);
    }
    ctx.globalAlpha = 1;
  }
}

// segments[i]에 그릴 스프라이트 소스 사각형을 정한다 - 머리(0번)는 진행 방향(snake.dir),
// 꼬리(마지막 번)는 그 앞 칸에서 온 방향, 중간 칸은 양옆 이웃 방향으로 직선/코너를 고른다.
// 길이가 1이면(머리=꼬리) 그냥 머리로 취급한다. 뱀이 틱마다 한 칸씩 딱딱 이동하고 화면상
// 위치도 보간 없이 그 즉시 바뀌므로, 머리 방향도 snake.dir을 그대로 쓰면 된다 - 위치와
// 방향이 항상 같은 프레임에 같이 바뀌어서 어긋날 일이 없다.
function resolveSpriteRect(snake, i) {
  const segments = snake.segments;
  const n = segments.length;
  const cur = segments[i];

  if (i === 0) {
    return getHeadRect(dirFromDelta(snake.dir.x, snake.dir.y) ?? 'E');
  }
  if (i === n - 1) {
    // snakeSprites.js 모듈 설명 참고 - "진행 방향"은 꼬리에서 그 앞 칸(머리쪽 이웃)으로
    // 가는 방향이지, 그 앞 칸에서 꼬리로 온 방향이 아니다(순서 반대로 하면 남/북이 뒤집힘).
    const prev = segments[i - 1];
    return getTailRect(dirFromDelta(prev.x - cur.x, prev.y - cur.y) ?? 'E');
  }
  const prev = segments[i - 1];
  const next = segments[i + 1];
  const dirToPrev = dirFromDelta(prev.x - cur.x, prev.y - cur.y);
  const dirToNext = dirFromDelta(next.x - cur.x, next.y - cur.y);
  return getBodyRect(dirToPrev, dirToNext);
}

// 아이템 섭취 반짝임을 스프라이트의 실제 그려진 모양에만 입히기 위한 1칸짜리 오프스크린
// 캔버스 - 메인 캔버스에 곧바로 source-atop을 걸면, 배경 레이어가 뷰포트 전체를 이미
// 불투명하게 채워둔 상태라 "투명한 곳"이 하나도 없어서 source-atop이 스프라이트 모양대로
// 걸러주는 효과가 없다(사각형 전체가 그대로 틴트됨). 그래서 원래 완전히 투명한 상태로
// 시작하는 별도 캔버스에 스프라이트만 먼저 그리고, 거기서 틴트를 건 다음 그 결과를
// 메인 캔버스로 옮겨 그린다.
let tintCanvas = null;
let tintCtx = null;
function tintSprite(sheet, rect, size, color, alpha) {
  if (typeof document === 'undefined') return null; // 헤드리스(jsc) 테스트 등 방어
  const px = Math.ceil(size);
  if (!tintCanvas) {
    tintCanvas = document.createElement('canvas');
    tintCtx = tintCanvas.getContext('2d');
  }
  if (tintCanvas.width !== px || tintCanvas.height !== px) {
    tintCanvas.width = px;
    tintCanvas.height = px;
  } else {
    tintCtx.clearRect(0, 0, px, px);
  }
  tintCtx.drawImage(sheet, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, px, px);
  tintCtx.globalCompositeOperation = 'source-atop';
  tintCtx.globalAlpha = alpha;
  tintCtx.fillStyle = color;
  tintCtx.fillRect(0, 0, px, px);
  tintCtx.globalCompositeOperation = 'source-over';
  tintCtx.globalAlpha = 1;
  return tintCanvas;
}

// assets/snake/snake_spritesheet.png가 로딩되면 색깔 사각형 대신 이어진 뱀 모양으로 그린다
// (render/snakeSprites.js 참고) - 꼬리부터 그려서 머리가 위에 오도록 하는 건 기존과 동일.
// 스프라이트 자체가 이미 이어진 모양이라 척추선(fallbackSnakeLayer 참고)은 더 이상
// 필요 없다 - 오히려 그려진 뱀 위에 선이 하나 더 그어지는 게 어색해서 여기서는 안 그린다.
function spriteSnakeLayer(ctx, world, sheet, camera, C, snake, segments) {
  // 무적 유예(위 fallbackSnakeLayer 참고)는 아이템 반짝임과 동시에 활성 상태일 수도 있어서
  // (드물지만 가능) 두 틴트를 서로 배타적으로 처리하지 않고, 기본 스프라이트 위에 필요한
  // 만큼 순서대로 겹쳐 그린다 - tintSprite는 매번 원본 스프라이트를 다시 그려서 틴트를
  // 입히므로, 그 결과 위에 또 다른 틴트를 겹쳐 그려도 시각적으로는 두 색이 함께 보인다.
  const graceActive = world.passThroughGraceTicksLeft > 0;
  for (let i = segments.length - 1; i >= 0; i--) {
    const rect = resolveSpriteRect(snake, i);
    const s = segments[i];
    const dx = toScreenX(s.x, camera);
    const dy = toScreenY(s.y, camera);

    ctx.drawImage(sheet, rect.sx, rect.sy, rect.sw, rect.sh, dx, dy, C, C);

    if (snake.flashColor && snake.isFlashingAt(i)) {
      const tinted = tintSprite(sheet, rect, C, snake.flashColor, ITEM_FLASH_ALPHA);
      if (tinted) ctx.drawImage(tinted, dx, dy);
    }
    if (graceActive) {
      const tinted = tintSprite(sheet, rect, C, PASS_THROUGH_GRACE_TINT_COLOR, PASS_THROUGH_GRACE_TINT_ALPHA);
      if (tinted) ctx.drawImage(tinted, dx, dy);
    }
  }
}

function snakeLayer(ctx, world) {
  const camera = world.camera;
  const C = screenCellSize();
  const snake = world.snake;
  const segments = snake.segments;

  const sheet = getSnakeSpriteSheet();
  if (sheet) {
    spriteSnakeLayer(ctx, world, sheet, camera, C, snake, segments);
  } else {
    fallbackSnakeLayer(ctx, world, camera, C, snake, segments);
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
  ctx.font = `bold ${Math.floor(12 * getViewportConfig().cameraZoom)}px CintamaniFont, monospace`;
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
