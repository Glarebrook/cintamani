import { FOOD_BASE_GROWTH, FOOD_SPEED_DELTA_MS, MAX_TICK_MS } from '../../config/constants.js';

// 갈색 먹이: 기본 먹이만큼 길이가 줄고, 뱀이 실제로 더 느려짐(이동 간격 ms 증가).
// spawnEligible이 항상 false라 무작위 스폰 풀에는 안 나온다 — 4번적(turret.js) 포획 처치의
// 확률 보상으로만 등장한다.
export const speedDownFood = {
  id: 'speedDown',
  color: '#8b5a2b',
  spawnEligible: () => false,
  onPickup(world) {
    world.snake.shrink(FOOD_BASE_GROWTH);
    world.stats.tickMs = Math.min(MAX_TICK_MS, world.stats.tickMs + FOOD_SPEED_DELTA_MS);
  },
};
