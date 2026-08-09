// food 아이템: 먹으면 뱀이 그 자리를 완전히 지난 후 한 칸 성장한다 (Snake.scheduleGrowth).
export const foodItem = {
  id: 'food',
  color: '#44dd44',
  // 0.3초 간격으로 두 프레임이 번갈아 그려지는 애니메이션 - assets/items/README.md 참고.
  icon: {
    framePaths: ['assets/items/item1_a.png', 'assets/items/item1_b.png'],
  },
  onPickup(world, item) {
    world.snake.scheduleGrowth(item);
  },
};
