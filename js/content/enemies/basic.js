import { ENEMY_BASE_HP } from '../../config/constants.js';

// type 1 — 빨간 적: 투사체로 데미지를 입혀 처치하는 기본형
export const basicEnemy = {
  id: 1,
  color: '#d9483d',
  hp: ENEMY_BASE_HP,
  canBeDamagedByProjectile: true,
  displayText: enemy => String(enemy.hp),
  collidesWithHead: true,
};
