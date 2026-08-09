import {
  PLAYABLE_MIN_X, PLAYABLE_MIN_Y, PLAYABLE_MAX_X, PLAYABLE_MAX_Y,
  FOOD_SPAWN_MIN_MS, FOOD_SPAWN_MAX_MS, FOOD_MAX_COUNT,
} from '../config/constants.js';
import { toScreenX, toScreenY, screenCellSize } from '../core/gridMath.js';
import { ItemTypes } from '../content/items/index.js';
// def.icon을 가진 타입(예: 기본 먹이)의 애니메이션 아이콘을 구하는 범용 로더 - 특정 아이템 id를
// 여기서 하드코딩하지 않는다. drawIcon은 managers/enemyManager.js와 같은 이유로 재사용한다.
import { getItemIcon } from '../render/itemSprites.js';
import { drawIcon } from '../render/statusIcons.js';

export class ItemManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.foods = [];         // 현재 필드의 먹이들
    this.foodTimer = 0;      // 마지막 스폰 시도로부터 경과 시간 (ms)
    this.nextFoodDelay = this._randomFoodDelay();
  }

  // dt: 프레임 경과 시간 (ms). 무작위 타이머 스폰만 FOOD_MAX_COUNT 상한을 지킨다 —
  // 처치/포획 보상 스폰(spawnAt/spawnSpecific)은 이 상한과 무관하게 항상 나온다.
  update(dt, snake, enemyManager = null) {
    this.foodTimer += dt;
    if (this.foods.length < FOOD_MAX_COUNT && this.foodTimer >= this.nextFoodDelay) {
      this.foodTimer = 0;
      this.nextFoodDelay = this._randomFoodDelay();
      this.spawnItem(snake, enemyManager);
    }
  }

  _randomFoodDelay() {
    return FOOD_SPAWN_MIN_MS + Math.floor(Math.random() * (FOOD_SPAWN_MAX_MS - FOOD_SPAWN_MIN_MS + 1));
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

  // spawnEligible 판정과 FOOD_MAX_COUNT 상한 없이, 맵의 무작위 빈 칸에 지정한 타입 하나를
  // 즉시 스폰한다 — 적 처치/포획 보상처럼 "반드시 나와야 하는" 이벤트용. 상한을 지키면
  // 필드가 이미 꽉 찼을 때 애써 얻은 보상이 조용히 사라져버리므로 일부러 무시한다.
  spawnSpecific(typeId, snake, enemyManager = null) {
    const pos = this._findFreeCell(snake, enemyManager);
    if (!pos) return;

    this.foods.push({ ...pos, type: typeId });
  }

  // spawnSpecific과 같지만 무작위 빈 칸이 아니라 정확히 지정한 좌표(x, y)에 스폰한다 —
  // "적이 처치된 바로 그 자리에 즉시 나타난다"는 요구를 그대로 구현한 것. 이 좌표는 보통
  // 방금 제거된 적이 있던 칸이라 항상 비어 있다고 가정한다.
  spawnAt(typeId, x, y) {
    this.foods.push({ x, y, type: typeId });
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
      const x = PLAYABLE_MIN_X + Math.floor(Math.random() * (PLAYABLE_MAX_X - PLAYABLE_MIN_X));
      const y = PLAYABLE_MIN_Y + Math.floor(Math.random() * (PLAYABLE_MAX_Y - PLAYABLE_MIN_Y));
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

  render(ctx, camera) {
    const C = screenCellSize();
    for (const food of this.foods) {
      const def = ItemTypes.get(food.type);
      const x = toScreenX(food.x, camera);
      const y = toScreenY(food.y, camera);

      // def.icon이 있고 프레임이 다 로딩됐으면 그걸 그리고, 아니면 기존 색깔 사각형으로 대체한다
      // (적 렌더링과 같은 폴백 규칙).
      const icon = getItemIcon(def);
      if (icon) {
        drawIcon(ctx, icon, x, y, C, C);
      } else {
        ctx.fillStyle = def.color;
        ctx.fillRect(x, y, C, C);
      }

      if (def.overlayText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(4, Math.floor(C * 0.9))}px CintamaniFont, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.overlayText, x + C / 2, y + C / 2);
      }
    }
  }
}
