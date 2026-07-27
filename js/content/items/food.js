// food 아이템: 먹으면 뱀이 그 자리를 완전히 지난 후 한 칸 성장한다 (Snake.scheduleGrowth).
export const foodItem = {
  id: 'food',
  color: '#44dd44',
  onPickup(world, item) {
    world.snake.scheduleGrowth(item);
  },
};
