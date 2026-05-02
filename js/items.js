class ItemManager {
  constructor() {
    this.food = null;        // 현재 필드의 먹이 (최대 1개)
    this.foodTimer = 0;      // 마지막 스폰 시도로부터 경과 시간 (ms)
  }

  // dt: 프레임 경과 시간 (ms)
  update(dt, snake) {
    this.foodTimer += dt;
    if (this.foodTimer >= FOOD_INTERVAL_MS) {
      this.foodTimer = 0;
      this._trySpawnFood(snake);
    }
  }

  _trySpawnFood(snake) {
    if (this.food) return; // 이미 먹이 존재 시 생성 안 함
    let x, y;
    do {
      x = Math.floor(Math.random() * GRID_W);
      y = Math.floor(Math.random() * GRID_H);
    } while (snake.occupies(x, y));
    this.food = { x, y };
  }

  // 뱀-머리가 먹이에 닿았는지 확인 — 닿으면 먹이 제거 후 반환
  checkHeadCollision(snake) {
    if (!this.food) return null;
    const h = snake.head;
    if (h.x === this.food.x && h.y === this.food.y) {
      const eaten = this.food;
      this.food = null;
      return eaten;
    }
    return null;
  }
}
