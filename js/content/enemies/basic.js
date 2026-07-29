import { ENEMY_BASE_HP, PURPLE_FOOD_KILL_STACK_THRESHOLD } from '../../config/constants.js';

// type 1 — 빨간 적: 투사체로 데미지를 입혀 처치하는 기본형
export const basicEnemy = {
  id: 1,
  color: '#d9483d',
  hp: ENEMY_BASE_HP,
  canBeDamagedByProjectile: true,
  displayText: enemy => String(enemy.hp),
  collidesWithHead: true,

  // 처치 스택이 임계치에 도달할 때마다 맵 임의의 지점에 보라 먹이를 하나 보상으로 스폰한다.
  // 보라 먹이는 무작위 스폰 풀에서 제외돼 있어서(content/items/tripleGrowth.js의
  // spawnEligible:false) 이 트리거로만 등장한다.
  onDefeated(world, enemy) {
    const stacks = world.stats.enemyKillStacks;
    const count = (stacks[enemy.typeDef.id] || 0) + 1;
    stacks[enemy.typeDef.id] = count;
    if (count % PURPLE_FOOD_KILL_STACK_THRESHOLD === 0) {
      world.itemManager.spawnSpecific('tripleGrowth', world.snake, world.enemyManager);
    }
  },
};
