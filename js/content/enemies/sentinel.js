import { ENEMY_CAPTURE_ZONE_SCALE } from '../../config/constants.js';

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
  spawnEligible: ({ snake }) => snake.segments.length >= 20,
};
