import { FOOD_BASE_GROWTH, FOOD_SPEED_DELTA_MS, MIN_TICK_MS } from '../../config/constants.js';

// 노란 먹이: 기본 먹이와 같은 만큼 성장 + 뱀이 실제로 더 빨라짐(이동 간격 ms 감소)
export const speedUpFood = {
  id: 'speedUp',
  color: '#e6c619',
  onPickup(world, item) {
    for (let i = 0; i < FOOD_BASE_GROWTH; i++) world.snake.scheduleGrowth(item);
    world.stats.tickMs = Math.max(MIN_TICK_MS, world.stats.tickMs - FOOD_SPEED_DELTA_MS);
  },
};
