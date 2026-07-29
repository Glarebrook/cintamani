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
      this.spawnItem(snake, enemyManager);
    }
  }

  ensureFood(snake, enemyManager = null) {
    if (this.foods.length > 0) return true;
    this.spawnItem(snake, enemyManager);
    return this.foods.length > 0;
  }

  // 등록된 아이템 타입(ItemTypes) 중 spawnEligible을 통과한 것들 가운데 하나를 무작위로 골라
  // 스폰한다 — 특정 타입을 하드코딩하지 않는다. 타입마다 spawnEligible(world)을 두면(적 타입의
  // spawnEligible과 동일한 패턴) 그 타입만의 등장 조건도 개별적으로 걸 수 있다. 보라 먹이처럼
  // spawnEligible이 항상 false인 타입은 이 무작위 경로로는 절대 안 나오고, spawnSpecific으로만
  // (예: content/enemies/chaser.js의 처치 스택 보상) 등장한다.
  spawnItem(snake, enemyManager = null) {
    if (this.foods.length >= FOOD_MAX_COUNT) return;

    const eligibleTypes = ItemTypes.all().filter(def => !def.spawnEligible || def.spawnEligible({ snake, enemyManager }));
    if (eligibleTypes.length === 0) return;

    const pos = this._findFreeCell(snake, enemyManager);
    if (!pos) return;

    const typeDef = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
    this.foods.push({ ...pos, type: typeDef.id });
  }

  // spawnEligible 판정 없이 지정한 타입 하나를 즉시 스폰한다 — 무작위 등장 풀 밖에서
  // (적 처치 보상 등) 직접 트리거되는 아이템용.
  spawnSpecific(typeId, snake, enemyManager = null) {
    if (this.foods.length >= FOOD_MAX_COUNT) return;

    const pos = this._findFreeCell(snake, enemyManager);
    if (!pos) return;

    this.foods.push({ ...pos, type: typeId });
  }

  _findFreeCell(snake, enemyManager) {
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

      if (!occupied.has(key)) return { x, y };
    }
    return null;
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

      if (def.overlayText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(4, Math.floor(CELL_SIZE * 0.9))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.overlayText, food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2);
      }
    }
  }
}
