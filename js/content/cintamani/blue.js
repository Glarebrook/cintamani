import {
  SCORE_PER_KILL_PROJECTILE, CINTAMANI_UNLOCK_KILLS, CINTAMANI_REWARD_KILL_INTERVAL,
  BLUE_CINTAMANI_RAIN_RADIUS, BLUE_CINTAMANI_RAIN_DURATION_MS, BLUE_CINTAMANI_RAIN_DPS_INTERVAL_MS,
  BLUE_CINTAMANI_RAIN_DAMAGE, BLUE_CINTAMANI_RAIN_PARTICLE_INTERVAL_MS, BLUE_CINTAMANI_RAIN_PARTICLE_COUNT,
  BLUE_CINTAMANI_RAIN_PARTICLE_SPEED, BLUE_CINTAMANI_RAIN_PARTICLE_LIFE_MS,
} from '../../config/constants.js';
import { parsePattern } from '../../algorithms/patternMatch.js';
import { killEnemyForCintamani } from './shared.js';

// 머리가 오른쪽을 볼 때 기준 - algorithms/patternMatch.js가 머리 방향에 맞춰 회전시켜 대조한다.
const PATTERN_TEXT = `
◼◼◼◼◼
◼◻◻◻◼
◼◻◼◼◼
◼◻◼◻◻
◼◻◼◼►
`;

// 비 효과에 영향받는 적 - 3번(추격형)/5번(추적사격형)만, 나머지는 완전히 무관.
const AFFECTED_ENEMY_IDS = new Set([3, 5]);

// 발동 시점 뱀 "중앙 마디" - 예: 길이 40이면 20번째 칸(머리를 1번으로 셀 때). 0-index 배열에서
// 정확히 이 자리를 가리키는 공식이 Math.floor((length-1)/2)다(길이 40 -> index 19 = 20번째 칸).
function getSnakeCenterSegment(snake) {
  const idx = Math.floor((snake.segments.length - 1) / 2);
  return snake.segments[idx];
}

export const blueCintamani = {
  id: 'blue',
  requiredKills: { 2: CINTAMANI_UNLOCK_KILLS, 4: CINTAMANI_UNLOCK_KILLS },
  rewardEnemyId: 4,
  rewardInterval: CINTAMANI_REWARD_KILL_INTERVAL,
  pattern: parsePattern(PATTERN_TEXT),

  // 발동 순간의 뱀 중앙 마디 위치에 고정된 원형 범위를 만든다 - 뱀이 그 뒤로 움직여도 범위는
  // 그 자리에 그대로 남는다(뱀을 따라다니는 오라가 아니라 필드에 설치하는 함정에 가깝다).
  activate(world) {
    const center = getSnakeCenterSegment(world.snake);
    const now = performance.now();
    world.blueRainEffect = {
      x: center.x,
      y: center.y,
      radius: BLUE_CINTAMANI_RAIN_RADIUS,
      expiresAt: now + BLUE_CINTAMANI_RAIN_DURATION_MS,
      nextDamageAt: now,
      particleTimer: 0,
    };
  },

  // states/playingState.js의 onFrame에서 매 프레임 호출된다(dt 필요 - 파티클 생성 타이머용).
  // 데미지는 실시간 시계(performance.now()) 기준으로 정확히 1초 간격 유지 - nextDamageAt을
  // "다시 지금 시각 + 1초"가 아니라 "+= 간격"으로 미루는 이유는, 프레임 타이밍이 조금씩
  // 밀려도(디버깅용 브레이크 등 제외) 누적 오차 없이 원래 스케줄을 유지하기 위함.
  tickEffect(world, dt) {
    const effect = world.blueRainEffect;
    if (!effect) return;
    const now = performance.now();
    if (now >= effect.expiresAt) {
      world.blueRainEffect = null;
      return;
    }

    effect.particleTimer += dt;
    if (effect.particleTimer >= BLUE_CINTAMANI_RAIN_PARTICLE_INTERVAL_MS) {
      effect.particleTimer = 0;
      world.particleManager.spawnRain({
        x: effect.x, y: effect.y, radius: effect.radius,
        color: '#5fc9ff', count: BLUE_CINTAMANI_RAIN_PARTICLE_COUNT,
        dir: { x: 1, y: 1 }, speed: BLUE_CINTAMANI_RAIN_PARTICLE_SPEED,
        life: BLUE_CINTAMANI_RAIN_PARTICLE_LIFE_MS, shape: 'line',
      });
    }

    if (now < effect.nextDamageAt) return;
    effect.nextDamageAt += BLUE_CINTAMANI_RAIN_DPS_INTERVAL_MS;
    for (const enemy of [...world.enemyManager.enemies]) {
      if (!AFFECTED_ENEMY_IDS.has(enemy.typeDef.id)) continue;
      const dist = Math.hypot(enemy.x - effect.x, enemy.y - effect.y);
      if (dist > effect.radius) continue;
      const dead = world.enemyManager.applyProjectileHit(enemy, BLUE_CINTAMANI_RAIN_DAMAGE);
      if (dead) killEnemyForCintamani(world, enemy, SCORE_PER_KILL_PROJECTILE);
    }
  },
};
