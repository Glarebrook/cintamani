import { GRID_W, GRID_H, FOOD_INTERVAL_MS, FOOD_MAX_COUNT, CELL_SIZE } from '../config/constants.js';
import { ItemTypes } from '../content/items/index.js';

export class ItemManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.foods = [];         // 현재 필드의 먹이들 (최대 FOOD_MAX_COUNT개)
    this.foodTimer = 0;      // 마지막 스폰 시도로부터 경과 시간 (ms)
  }

  // dt: 프레임 경과 시간 (ms)
  update(dt, snake, enemyManager = null) {
    this.foodTimer += dt;
    if (this.foods.length < FOOD_MAX_COUNT && this.foodTimer >= FOOD_INTERVAL_MS) {
      this.foodTimer = 0;
      this.spawnFood(snake, enemyManager);
    }
  }

  ensureFood(snake, enemyManager = null) {
    if (this.foods.length > 0) return true;
    this.spawnFood(snake, enemyManager);
    return this.foods.length > 0;
  }

  spawnFood(snake, enemyManager = null) {
    if (this.foods.length >= FOOD_MAX_COUNT) return;

    const occupied = new Set();
    for (const segment of snake.segments) {
      occupied.add(`${segment.x},${segment.y}`);
    }
    for (const food of this.foods) {
      occupied.add(`${food.x},${food.y}`);
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
        this.foods.push({ x, y, type: 'food' });
        return;
      }
    }
  }

  // 뱀-머리가 먹이 중 하나에 닿았는지 확인 — 닿으면 그 먹이를 제거 후 반환
  checkHeadCollision(snake) {
    const h = snake.head;
    const index = this.foods.findIndex(food => food.x === h.x && food.y === h.y);
    if (index === -1) return null;
    const [eaten] = this.foods.splice(index, 1);
    return eaten;
  }

  render(ctx) {
    for (const food of this.foods) {
      const def = ItemTypes.get(food.type);
      ctx.fillStyle = def.color;
      ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}
