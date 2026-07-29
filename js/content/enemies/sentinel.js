import { ENEMY_CAPTURE_ZONE_SCALE, ORANGE_FOOD_DROP_CHANCE, LONG_SNAKE_UNLOCK_LENGTH } from '../../config/constants.js';

// type 2 — 파란 적: 투사체에 면역이며, 회색 포획 범위(captureZone)를 뱀으로
// 완전히 감싸야만 제거할 수 있다. captureZone은 이 적만의 고유 필드가 아니라,
// 다른 어떤 적 타입이든 opt-in 할 수 있는 공용 메커니즘 훅이다.
export const sentinelEnemy = {
  id: 2,
  color: '#3b82f6',
  hp: 999,
  canBeDamagedByProjectile: false,
  displayText: () => 'X',
  collidesWithHead: true,
  captureZone: { scale: ENEMY_CAPTURE_ZONE_SCALE },
  spawnEligible: ({ snake }) => snake.segments.length >= LONG_SNAKE_UNLOCK_LENGTH,

  // 포획으로 처치됐을 때만(투사체로는 애초에 못 죽이므로) 일정 확률로 맵 임의의 지점에
  // 주황 먹이를 스폰한다. 주황 먹이는 무작위 스폰 풀에서 제외돼 있어서
  // (content/items/attackUp.js의 spawnEligible:false) 이 트리거로만 등장한다.
  onCaptured(world) {
    if (Math.random() < ORANGE_FOOD_DROP_CHANCE) {
      world.itemManager.spawnSpecific('attackUp', world.snake, world.enemyManager);
    }
  },
};
