import {
  ENEMY_SCALE, CHASER_HP, CHASER_BASE_MOVE_MS, CHASER_AGGRO_ZONE_SCALE, CHASER_KILL_STACK_THRESHOLD,
} from '../../config/constants.js';

const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

// 뱀 머리가 이 적의 (외곽선 크기 × CHASER_AGGRO_ZONE_SCALE) 정사각형 감지 범위 안에 있는 동안만 추격한다.
function isPlayerInRange(enemy, snake) {
  const zoneSide = ENEMY_SCALE * CHASER_AGGRO_ZONE_SCALE;
  const half = Math.floor((zoneSide - 1) / 2);
  const head = snake.head;
  return Math.abs(head.x - enemy.x) <= half && Math.abs(head.y - enemy.y) <= half;
}

// type 3 — 빨간 추격형 적: 평소엔 상하좌우로 무작위 배회하다가, 플레이어가 감지 범위에 들어오면
// 머리 쪽으로 방향을 틀고 이동 속도도 2배가 된다. 투사체로 처치 가능.
// move/moveIntervalMs는 적이 스스로 움직이는 최초의 훅 — managers/enemyManager.js가
// 타입 구분 없이 이 두 필드가 있으면 호출해준다(다른 적 타입도 같은 방식으로 이동을 가질 수 있음).
export const chaserEnemy = {
  id: 3,
  color: '#e0403a',
  hp: CHASER_HP,
  canBeDamagedByProjectile: true,
  displayText: enemy => String(enemy.hp),
  collidesWithHead: true,

  moveIntervalMs(enemy, { snake }) {
    return isPlayerInRange(enemy, snake) ? CHASER_BASE_MOVE_MS / 2 : CHASER_BASE_MOVE_MS;
  },

  move(enemy, { snake }) {
    if (isPlayerInRange(enemy, snake)) {
      const head = snake.head;
      const dx = head.x - enemy.x;
      const dy = head.y - enemy.y;
      if (dx === 0 && dy === 0) return null;
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
    }
    return DIRS[Math.floor(Math.random() * DIRS.length)];
  },

  // 투사체로 처치됐을 때만 호출된다(포획류 제거와는 다른 경로) — 타입별 처치 스택을 쌓다가
  // 임계치에 도달하면 보라 먹이를 하나 직접 스폰한다. 보라 먹이는 이 트리거로만 등장하도록
  // content/items/tripleGrowth.js 쪽에서 일반 무작위 스폰 후보에서 제외해뒀다.
  onDefeated(world, enemy) {
    const stacks = world.stats.enemyKillStacks;
    const count = (stacks[enemy.typeDef.id] || 0) + 1;
    stacks[enemy.typeDef.id] = count;
    if (count % CHASER_KILL_STACK_THRESHOLD === 0) {
      world.itemManager.spawnSpecific('tripleGrowth', world.snake, world.enemyManager);
    }
  },
};
