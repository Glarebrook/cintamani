import { FOOD_BASE_GROWTH, FOOD_SPEED_DELTA_MS, MAX_TICK_MS } from '../../config/constants.js';

// 갈색 먹이: 기본 먹이만큼 길이가 줄고, 뱀이 실제로 더 느려짐(이동 간격 ms 증가)
export const speedDownFood = {
  id: 'speedDown',
  color: '#8b5a2b',
  onPickup(world) {
    world.snake.shrink(FOOD_BASE_GROWTH);
    world.stats.tickMs = Math.min(MAX_TICK_MS, world.stats.tickMs + FOOD_SPEED_DELTA_MS);
  },
};
