import { PARTICLE_BURST_COUNT, PARTICLE_SPEED, PARTICLE_LIFE_MS } from '../../config/constants.js';

// 여의주 스킬(red/blue, 향후 green 등)의 activate()/tickEffect()가 공통으로 쓰는 처치 처리
// 묶음 - 배열에서 실제로 제거 + onDefeated 훅 + 파티클 버스트 + 점수/팝업 + killsByType 증가까지
// 한 번에 처리한다. states/playingState.js의 grantKillReward, managers/projectileManager.js의
// killEnemyViaProjectile과 사실상 같은 번들이지만, 이 셋은 서로 다른 모듈 소속이라 공유하지
// 않고 각자 갖는다 - projectileManager.js가 이미 같은 이유로 독립적인 사본을 유지하고 있다
// (CLAUDE.md 참고, 모듈 경계를 넘어 공유하는 것보다 각자 갖는 게 낫다고 판단한 전례).
export function killEnemyForCintamani(world, enemy, scoreAmount) {
  const idx = world.enemyManager.enemies.indexOf(enemy);
  if (idx === -1) return; // 이미 다른 경로로 제거된 경우(같은 틱에 두 번 맞는 등) 방어
  world.enemyManager.enemies.splice(idx, 1);
  enemy.typeDef.onDefeated?.(world, enemy);
  world.particleManager.spawnBurst({
    x: enemy.x, y: enemy.y, color: enemy.typeDef.color,
    count: PARTICLE_BURST_COUNT, speed: PARTICLE_SPEED, life: PARTICLE_LIFE_MS,
  });
  world.stats.killScore += scoreAmount;
  world.scorePopupManager.spawn(enemy.x, enemy.y, scoreAmount);
  const typeId = enemy.typeDef.id;
  world.stats.killsByType[typeId] = (world.stats.killsByType[typeId] || 0) + 1;
}
