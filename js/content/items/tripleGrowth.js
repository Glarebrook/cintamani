import { PURPLE_FOOD_GROWTH_AMOUNT } from '../../config/constants.js';

// 보라 먹이: 먹는 순간 뱀의 길이를 PURPLE_FOOD_GROWTH_AMOUNT(10)칸 고정으로 늘려준다.
// 예전엔 "현재 길이의 3배" 비례 성장(후반부일수록 보상이 커지는 잭팟형)이었는데, 고정
// +10으로 바뀌었다 - id/파일명(tripleGrowth)은 basic.js의 스폰 트리거 등에서 문자열로
// 참조되고 있어 그대로 남겨뒀다. overlayText는 itemManager.render()가 아이콘 위에 작은
// 글씨로 겹쳐 그리는 공용 훅(적의 displayText와 같은 역할) - 이제 고정량이므로 "+10"으로 표기.
// spawnEligible이 항상 false라 무작위 스폰 풀에는 절대 안 나온다 — 3번적(chaser.js) 처치
// 스택 보상으로 itemManager.spawnSpecific()을 통해서만 등장한다.
export const tripleGrowthFood = {
  id: 'tripleGrowth',
  color: '#a855f7',
  overlayText: `+${PURPLE_FOOD_GROWTH_AMOUNT}`,
  spawnEligible: () => false,
  onPickup(world, item) {
    for (let i = 0; i < PURPLE_FOOD_GROWTH_AMOUNT; i++) world.snake.scheduleGrowth(item);
  },
};
