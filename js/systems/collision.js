// 벽/자기충돌(+포획 예외)/적충돌/먹이 판정 — 순서가 정답에 영향을 주는 핵심 로직이므로
// 레지스트리로 흩어놓지 않고 명시적인 함수 순서로 유지한다. 실제 호출 순서는
// states/playingState.js의 onTick()에 있다.
import { Mechanics } from '../content/mechanics/index.js';
import { ENEMY_SCALE } from '../config/constants.js';

export function checkWallCollision(world) {
  return world.snake.isWallCollision();
}

// 자기충돌 여부만 미리(메커니즘 틱보다 먼저) 확인하는 raw 판정 - encirclement.js가
// world.stats.captureRequiresCollision 모드에서 "지금 이 틱이 충돌 중인가"를 포획 조건에
// 넣으려면, 메커니즘을 돌리기 전에 이 값이 먼저 필요하다.
export function isSelfCollision(world) {
  return world.snake.isSelfCollision();
}

// 등록된 모든 메커니즘(현재는 encirclement 하나)을 한 번씩 틱 처리한다. selfCollided는 이번
// 틱에 자기충돌이 발생했는지(위 isSelfCollision) - 메커니즘이 필요하면 참고한다.
export function runMechanicsTick(world, selfCollided) {
  const results = {};
  for (const mechanic of Mechanics.all()) {
    results[mechanic.id] = mechanic.tick(world, ENEMY_SCALE, selfCollided);
  }
  return results;
}

// 자기충돌이 났더라도, 바로 이 틱에 어떤 포획 메커니즘이 성공적으로 닫혔다면 눈감아준다(통과).
// selfCollided는 isSelfCollision(world)로 이미 계산해둔 값을 그대로 받는다(중복 계산 방지).
export function checkSelfCollision(world, mechanicResults, selfCollided) {
  if (!selfCollided) return { collided: false, forgiven: false };

  const forgiven = Mechanics.all().some(
    mechanic => mechanic.suppressesSelfCollision && mechanicResults[mechanic.id]?.capturedIds?.length
  );
  return { collided: true, forgiven };
}

export function checkEnemyHeadCollision(world) {
  return world.enemyManager.checkHeadCollision(world.snake.head);
}

export function checkFoodPickup(world) {
  return world.itemManager.checkHeadCollision(world.snake);
}
