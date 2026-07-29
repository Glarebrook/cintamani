import { FOOD_BASE_GROWTH } from '../../config/constants.js';

// 보라 먹이: 기본 먹이의 3배만큼 성장. overlayText는 itemManager.render()가
// 아이콘 위에 작은 글씨로 겹쳐 그리는 공용 훅(적의 displayText와 같은 역할).
// spawnEligible이 항상 false라 무작위 스폰 풀에는 절대 안 나온다 — 3번적(chaser.js) 처치
// 스택 보상으로 itemManager.spawnSpecific()을 통해서만 등장한다.
export const tripleGrowthFood = {
  id: 'tripleGrowth',
  color: '#a855f7',
  overlayText: 'x3',
  spawnEligible: () => false,
  onPickup(world, item) {
    for (let i = 0; i < FOOD_BASE_GROWTH * 3; i++) world.snake.scheduleGrowth(item);
  },
};
