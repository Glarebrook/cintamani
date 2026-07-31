// 필드 전체를 작게 축소해서 보여주는 미니맵 - render/layers.js가 쓰는 카메라 기준 변환
// (core/gridMath.js의 toScreenX/Y)과는 완전히 별개다. 미니맵은 카메라가 어디를 보고 있든
// 항상 필드 전체를 고정 비율로 보여주고, 그 위에 지금 카메라가 보여주는 범위를 사각형으로
// 얹어서 알려준다. render/statusPanel.js가 하단 상태창 정중앙에 그린다.
import {
  GRID_W, GRID_H, VIEWPORT_COLS, VIEWPORT_ROWS, MINIMAP_WIDTH_PX, MINIMAP_HEIGHT_PX, MINIMAP_DOT_SIZE,
  PLAYABLE_MIN_X, PLAYABLE_MIN_Y, PLAYABLE_MAX_X, PLAYABLE_MAX_Y,
} from '../config/constants.js';

// 벽(이동 불가) 영역은 밝은 회색, 실제 이동 가능한 안쪽 영역은 기존처럼 어둡게 - 메인 화면의
// "회색 벽 / 검은 필드" 색 구분(render/layers.js의 fieldBorderLayer)과 같은 언어를 미니맵에도
// 그대로 적용해서, 미니맵만 보고도 어느 쪽이 못 가는 곳인지 바로 알 수 있게 한다(패치2).
const WALL_BG_COLOR = 'rgba(120, 120, 120, 0.55)';
const BG_COLOR = 'rgba(0, 0, 0, 0.35)';
const SNAKE_COLOR = '#ffffff';
const ENEMY_COLOR = '#ff3b3b';
const ITEM_COLOR = '#3bff5e';
const VIEWPORT_COLOR = 'rgba(255, 255, 255, 0.6)';

function mapX(gridX) {
  return (gridX / GRID_W) * MINIMAP_WIDTH_PX;
}

function mapY(gridY) {
  return (gridY / GRID_H) * MINIMAP_HEIGHT_PX;
}

// originX/originY - 상태창 캔버스 안에서 미니맵을 그리기 시작할 좌상단 좌표(statusPanel.js가
// 열 배치에 맞춰 계산해서 넘겨준다). 미니맵 자체 좌표계는 항상 (0,0)~(MINIMAP_WIDTH_PX,
// MINIMAP_HEIGHT_PX)이고, 이 함수 안에서 translate로 옮겨서 그 좌표계를 그대로 쓴다.
export function renderMinimap(ctx, world, originX, originY) {
  ctx.save();
  ctx.translate(originX, originY);

  // 벽(밝은 회색)을 전체에 먼저 깐 다음, 그 위에 실제 플레이 가능 영역(어두운 색)만 좁혀서
  // 덮어 그린다 - render/layers.js의 fieldBorderLayer가 4개 띠로 나눠 그리는 것과 달리,
  // 미니맵은 안쪽 사각형 하나만 그리면 되므로(바깥은 이미 벽 색으로 채워져 있음) 더 간단하다.
  ctx.fillStyle = WALL_BG_COLOR;
  ctx.fillRect(0, 0, MINIMAP_WIDTH_PX, MINIMAP_HEIGHT_PX);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(
    mapX(PLAYABLE_MIN_X), mapY(PLAYABLE_MIN_Y),
    mapX(PLAYABLE_MAX_X) - mapX(PLAYABLE_MIN_X), mapY(PLAYABLE_MAX_Y) - mapY(PLAYABLE_MIN_Y)
  );

  // 적 = 빨강 점, 아이템 = 초록 점 - 종류 구분 없이 단순하게. 위치만 알려주면 충분하다는
  // 피드백으로 아이콘/색상 구분 없이 통일했다.
  ctx.fillStyle = ENEMY_COLOR;
  for (const enemy of world.enemyManager.enemies) {
    ctx.fillRect(mapX(enemy.x), mapY(enemy.y), MINIMAP_DOT_SIZE, MINIMAP_DOT_SIZE);
  }

  ctx.fillStyle = ITEM_COLOR;
  for (const food of world.itemManager.foods) {
    ctx.fillRect(mapX(food.x), mapY(food.y), MINIMAP_DOT_SIZE, MINIMAP_DOT_SIZE);
  }

  ctx.fillStyle = SNAKE_COLOR;
  for (const seg of world.snake.segments) {
    ctx.fillRect(mapX(seg.x), mapY(seg.y), MINIMAP_DOT_SIZE, MINIMAP_DOT_SIZE);
  }

  // 지금 카메라(메인 화면)가 실제로 보여주고 있는 범위 - VIEWPORT_COLS/ROWS는 위치가 아니라
  // "폭/높이"값이지만, mapX/mapY가 원점 기준 선형 축소라 그대로 넣어도 폭 변환으로 맞게 나온다.
  ctx.strokeStyle = VIEWPORT_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mapX(world.camera.x) + 0.5, mapY(world.camera.y) + 0.5,
    mapX(VIEWPORT_COLS), mapY(VIEWPORT_ROWS)
  );

  ctx.restore();
}
