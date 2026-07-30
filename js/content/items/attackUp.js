import { ATTACK_UP_DELTA, ATTACK_UP_SCALE_WAVE_DELTA } from '../../config/constants.js';

// 주황 먹이: 길이/속도는 그대로, 공격력만 영구 증가 - 독침(attackDamage)과 비늘파동
// (scaleWaveDamage) 둘 다 오르되, 증가량은 무기별로 다르다(ATTACK_UP_DELTA vs
// ATTACK_UP_SCALE_WAVE_DELTA).
// spawnEligible이 항상 false라 무작위 스폰 풀에는 절대 안 나온다 — 4번적(turret.js)을
// 포획으로 처치했을 때 일정 확률로만 itemManager.spawnSpecific()을 통해 등장한다.
export const attackUpFood = {
  id: 'attackUp',
  color: '#ff8c1a',
  spawnEligible: () => false,
  onPickup(world) {
    world.stats.attackDamage += ATTACK_UP_DELTA;
    world.stats.scaleWaveDamage += ATTACK_UP_SCALE_WAVE_DELTA;
  },
};
