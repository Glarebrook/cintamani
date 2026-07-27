// "회색 범위(캡처존)를 뱀 몸통으로 완전히 감싸면 처치" 메커니즘.
// captureZone을 가진 적 타입이면 무엇이든 이 메커니즘의 대상이 된다 (특정 type id에 종속되지 않음).
import { floodFillReachableFromBorder } from '../../algorithms/floodFill.js';
import { GRID_W, GRID_H } from '../../config/constants.js';

// 적 외곽선 크기(outlineCells) 기준으로 captureZone.scale배 되는 정사각형을,
// 적 중심에 정렬해 격자 좌표로 반환한다.
export function getCaptureZoneBounds(enemy, outlineCells) {
  const zoneSideCells = outlineCells * enemy.typeDef.captureZone.scale;
  const offset = Math.floor((zoneSideCells - 1) / 2);
  const left = enemy.x - offset;
  const top = enemy.y - offset;
  return { left, top, right: left + zoneSideCells - 1, bottom: top + zoneSideCells - 1 };
}

export const encirclementMechanic = {
  id: 'encirclement',
  suppressesSelfCollision: true,

  // world: { snake, enemyManager, ... }, outlineCells: 적 외곽선 크기(격자 칸)
  tick(world, outlineCells) {
    const candidates = world.enemyManager.enemies.filter(enemy => enemy.typeDef.captureZone);
    if (candidates.length === 0) return { capturedIds: [] };

    const reachable = floodFillReachableFromBorder(
      GRID_W,
      GRID_H,
      (x, y) => world.snake.occupies(x, y)
    );

    const capturedIds = [];
    for (const enemy of candidates) {
      const zone = getCaptureZoneBounds(enemy, outlineCells);
      let enclosed = true;
      for (let y = Math.max(0, zone.top); enclosed && y <= Math.min(GRID_H - 1, zone.bottom); y++) {
        for (let x = Math.max(0, zone.left); x <= Math.min(GRID_W - 1, zone.right); x++) {
          if (reachable[y * GRID_W + x]) {
            enclosed = false;
            break;
          }
        }
      }
      if (enclosed) capturedIds.push(enemy.id);
    }

    return { capturedIds };
  },
};
