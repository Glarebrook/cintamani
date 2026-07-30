// 보라 먹이: 먹는 순간 뱀의 "현재" 길이의 3배만큼 성장(고정 +3이 아니라 뱀이 길수록
// 더 크게 성장 - 후반부일수록 보상이 커지는 잭팟형 아이템). overlayText는
// itemManager.render()가 아이콘 위에 작은 글씨로 겹쳐 그리는 공용 훅(적의 displayText와
// 같은 역할) - 성장량이 길이에 비례해 매번 달라져도, 표기는 "x3"(몇 배인지) 그대로 고정.
// spawnEligible이 항상 false라 무작위 스폰 풀에는 절대 안 나온다 — 3번적(chaser.js) 처치
// 스택 보상으로 itemManager.spawnSpecific()을 통해서만 등장한다.
export const tripleGrowthFood = {
  id: 'tripleGrowth',
  color: '#a855f7',
  overlayText: 'x3',
  spawnEligible: () => false,
  onPickup(world, item) {
    const growth = world.snake.segments.length * 3;
    for (let i = 0; i < growth; i++) world.snake.scheduleGrowth(item);
  },
};
