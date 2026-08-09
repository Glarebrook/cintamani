import {
  ENEMY_SCALE, CHASER_HP, CHASER_BASE_MOVE_MS, CHASER_AGGRO_ZONE_SCALE,
  CHASER_WANDER_STEP_MIN, CHASER_WANDER_STEP_MAX, CHASER_WANDER_JITTER_CHANCE,
} from '../../config/constants.js';

const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

// 뱀 머리가 이 적의 (외곽선 크기 × CHASER_AGGRO_ZONE_SCALE) 정사각형 감지 범위 안에 있는 동안만 추격한다.
function isPlayerInRange(enemy, snake) {
  const zoneSide = ENEMY_SCALE * CHASER_AGGRO_ZONE_SCALE;
  const half = Math.floor((zoneSide - 1) / 2);
  const head = snake.head;
  return Math.abs(head.x - enemy.x) <= half && Math.abs(head.y - enemy.y) <= half;
}

// type 3 — 빨간 추격형 적: 평소엔 한 방향(_wanderDir)을 CHASER_WANDER_STEP_MIN~MAX 걸음 동안
// 유지하며 배회하다가(완전 무작위 꿈틀거림이 아니라 "오른쪽으로 좀 가다가 아래로 좀 가다가" 하는
// 방향성 있는 흐름을 주기 위함), 그 사이사이 CHASER_WANDER_JITTER_CHANCE 확률로 이번 한 걸음만
// 무작위 방향으로 튀는 지터를 섞는다 - 지터는 반환값만 바꿀 뿐 유지 중인 방향/남은 걸음 수는
// 그대로 진행된다(지터 때문에 스트릭이 끊기거나 다시 시작하지 않음).
// 플레이어가 감지 범위에 들어오면 머리 쪽으로 방향을 틀고 이동 속도도 2배가 된다. 투사체로 처치 가능.
// move/moveIntervalMs는 적이 스스로 움직이는 최초의 훅 — managers/enemyManager.js가
// 타입 구분 없이 이 두 필드가 있으면 호출해준다(다른 적 타입도 같은 방식으로 이동을 가질 수 있음).
export const chaserEnemy = {
  id: 3,
  color: '#e0403a',
  hp: CHASER_HP,
  canBeDamagedByProjectile: true,
  displayText: enemy => String(enemy.hp),
  collidesWithHead: true,

  // 상/하/좌/우 이동 애니메이션 - assets/enemies/enemy3_sprite.png(4행×2열, 행별 방향 배치는
  // assets/enemies/README.md 참고). enemy.facing은 managers/enemyManager.js의 updateMovement가
  // 실제로 이동이 일어날 때마다 갱신해준다(directionalSprite가 없는 다른 이동형 적에도 똑같이
  // facing이 기록되지만, 그 타입들은 이 필드가 없어서 그냥 안 쓰일 뿐이다).
  directionalSprite: {
    path: 'assets/enemies/enemy3_sprite.png',
    rows: { N: 0, S: 1, W: 2, E: 3 },
    rowCount: 4,
    cols: 2,
  },

  moveIntervalMs(enemy, world) {
    return isPlayerInRange(enemy, world.snake) ? CHASER_BASE_MOVE_MS / 2 : CHASER_BASE_MOVE_MS;
  },

  move(enemy, world) {
    const snake = world.snake;
    if (isPlayerInRange(enemy, snake)) {
      const head = snake.head;
      const dx = head.x - enemy.x;
      const dy = head.y - enemy.y;
      if (dx === 0 && dy === 0) return null;
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
    }

    if (!enemy._wanderStepsLeft) {
      enemy._wanderDir = DIRS[Math.floor(Math.random() * DIRS.length)];
      enemy._wanderStepsLeft = CHASER_WANDER_STEP_MIN
        + Math.floor(Math.random() * (CHASER_WANDER_STEP_MAX - CHASER_WANDER_STEP_MIN + 1));
    }
    enemy._wanderStepsLeft--;

    if (Math.random() < CHASER_WANDER_JITTER_CHANCE) {
      return DIRS[Math.floor(Math.random() * DIRS.length)];
    }
    return enemy._wanderDir;
  },

  // 투사체로 처치될 때마다(스택 없이, 매번) 처치된 바로 그 자리에 노란 먹이를 즉시 스폰한다.
  // 노란 먹이는 무작위 스폰 풀에서 제외돼 있어서(content/items/speedUp.js의 spawnEligible:false)
  // 이 트리거로만 등장한다.
  onDefeated(world, enemy) {
    world.itemManager.spawnAt('speedUp', enemy.x, enemy.y);
  },
};
