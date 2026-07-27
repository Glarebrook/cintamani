// "뱀 몸통으로 만든 고리가 적을 완전히 감싸면 처치" 메커니즘.
// 고리의 크기/모양 자체는 상관없다(정사각형/직사각형/타이트/느슨 전부 허용) — 다만
// 그 고리를 실제로 이루는 뱀 몸통 칸들은 전부 회색 캡처존 사각형 안에 있어야 하고,
// 뱀 머리가 "막 닫히는 바로 그 순간" 그 적의 회색 영역 안에 있어야 한다.
// 포획은 "막혀있지 않다가 → 막힌" 전이(엣지) 시점에만 시도한다 — 매 틱 "지금 막혀있나"만
// 계속 확인하면, 훨씬 전에(플레이어가 신경 쓰지 않는 사이) 우연히 막혀버린 구역을 나중에
// 머리가 그냥 지나가기만 해도 포획되어버리는 문제가 생긴다. wasEnclosed는 적 객체별로
// 직전 틱의 봉쇄 여부를 기억한다(WeakMap이라 재시작 시 옛 적 객체가 그냥 버려지면서 자동으로
// 정리된다).
// 고리와 무관한 나머지 몸통이 캡처존 밖에 있는 것은 상관없다.
// captureZone을 가진 적 타입이면 무엇이든 이 메커니즘의 대상이 된다 (특정 type id에 종속되지 않음).
import { floodFillReachableFromBorder } from '../../algorithms/floodFill.js';
import { GRID_W, GRID_H } from '../../config/constants.js';

// 회색 캡처존 사각형 — 적 외곽선 크기(outlineCells) 기준으로 captureZone.scale배 되는
// 정사각형을 적 중심에 정렬해 격자 좌표로 반환한다. 렌더링과 포획 판정 양쪽에서 쓰인다.
export function getCaptureZoneBounds(enemy, outlineCells) {
  const zoneSideCells = outlineCells * enemy.typeDef.captureZone.scale;
  const offset = Math.floor((zoneSideCells - 1) / 2);
  const left = enemy.x - offset;
  const top = enemy.y - offset;
  return { left, top, right: left + zoneSideCells - 1, bottom: top + zoneSideCells - 1 };
}

// 적이 있는 칸에서 시작해, 뱀 몸통이 아니면서 바깥과 연결되지 않은(reachable=0) 칸들만 타고
// 번지는 BFS. 이 과정에서 마주치는 뱀 몸통 칸들이 곧 "적을 실제로 봉쇄하는 고리"다.
function findEnclosingRing(enemy, snake, reachable) {
  const startIdx = enemy.y * GRID_W + enemy.x;
  if (reachable[startIdx]) return null; // 적 자신이 바깥과 연결됨 -> 애초에 감싸이지 않음

  const visitedInterior = new Set([startIdx]);
  const ring = new Set();
  const queue = [startIdx];
  let qi = 0;

  while (qi < queue.length) {
    const idx = queue[qi++];
    const x = idx % GRID_W;
    const y = Math.floor(idx / GRID_W);
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      const nIdx = ny * GRID_W + nx;
      if (snake.occupies(nx, ny)) {
        ring.add(nIdx);
        continue;
      }
      if (reachable[nIdx] || visitedInterior.has(nIdx)) continue;
      visitedInterior.add(nIdx);
      queue.push(nIdx);
    }
  }

  return ring;
}

const wasEnclosed = new WeakMap(); // enemy 객체 -> 직전 틱에 봉쇄되어 있었는지

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

    const head = world.snake.head;
    const capturedIds = [];

    for (const enemy of candidates) {
      const ring = findEnclosingRing(enemy, world.snake, reachable);
      const isEnclosedNow = ring !== null;
      const wasEnclosedBefore = wasEnclosed.get(enemy) || false;

      if (isEnclosedNow && !wasEnclosedBefore) {
        const zone = getCaptureZoneBounds(enemy, outlineCells);
        const headInZone = head.x >= zone.left && head.x <= zone.right && head.y >= zone.top && head.y <= zone.bottom;
        const ringWithinZone = [...ring].every(idx => {
          const x = idx % GRID_W;
          const y = Math.floor(idx / GRID_W);
          return x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom;
        });

        if (headInZone && ringWithinZone) capturedIds.push(enemy.id);
      }

      wasEnclosed.set(enemy, isEnclosedNow);
    }

    return { capturedIds };
  },
};
