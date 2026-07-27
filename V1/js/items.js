class ItemManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.food = null;        // 현재 필드의 먹이 (최대 1개)
    this.foodTimer = 0;      // 마지막 스폰 시도로부터 경과 시간 (ms)
  }

  // dt: 프레임 경과 시간 (ms)
  update(dt, snake, enemyManager = null) {
    this.foodTimer += dt;
    if (!this.food) {
      if (this.foodTimer >= FOOD_INTERVAL_MS) {
        this.foodTimer = 0;
        this.spawnFood(snake, enemyManager);
      }
    } else {
      this.foodTimer = 0;
    }
  }

  ensureFood(snake, enemyManager = null) {
    if (this.food) return true;
    this.spawnFood(snake, enemyManager);
    return !!this.food;
  }

  spawnFood(snake, enemyManager = null) {
    if (this.food) return;

    const occupied = new Set();
    for (const segment of snake.segments) {
      occupied.add(`${segment.x},${segment.y}`);
    }

    if (enemyManager) {
      for (const enemy of enemyManager.enemies) {
        occupied.add(`${enemy.x},${enemy.y}`);
      }
    }

    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * GRID_W);
      const y = Math.floor(Math.random() * GRID_H);
      const key = `${x},${y}`;

      if (!occupied.has(key)) {
        this.food = { x, y };
        return;
      }
    }
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
