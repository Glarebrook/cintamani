import {
  ENEMY_SCALE, GRID_W, GRID_H, SCORE_PER_KILL_PROJECTILE,
  CINTAMANI_UNLOCK_KILLS, CINTAMANI_REWARD_KILL_INTERVAL,
  RED_CINTAMANI_BEAM_DAMAGE, RED_CINTAMANI_BEAM_FLASH_MS,
  RED_CINTAMANI_BEAM_EMBER_COUNT, RED_CINTAMANI_BEAM_EMBER_SPEED,
  RED_CINTAMANI_BEAM_EMBER_LIFE_MS, RED_CINTAMANI_BEAM_EMBER_STEP,
} from '../../config/constants.js';
import { parsePattern } from '../../algorithms/patternMatch.js';
import { killEnemyForCintamani } from './shared.js';

// 머리가 오른쪽을 볼 때 기준 - states/playingState.js가 머리 방향에 맞춰 회전시켜 대조한다
// (algorithms/patternMatch.js 참고).
const PATTERN_TEXT = `
◻◻◻◻◻
◻◻◼◼◻
◼◼◼◼►
◻◼◼◻◻
◻◻◻◻◻
`;

// 머리부터, 머리가 보는 방향의 벽 끝까지 3칸 두께(머리를 중심으로 좌우/상하 1칸씩)로 뻗는
// 직선 범위 - 그 사이에 뭐가 있든(자기 몸 등) 뚫고 지나간다.
function computeBeamCells(world) {
  const head = world.snake.head;
  const dir = world.snake.dir;
  const cells = [];
  if (dir.x !== 0) {
    const from = dir.x > 0 ? head.x : 0;
    const to = dir.x > 0 ? GRID_W - 1 : head.x;
    for (let x = from; x <= to; x++) {
      for (let y = head.y - 1; y <= head.y + 1; y++) {
        if (y >= 0 && y < GRID_H) cells.push({ x, y });
      }
    }
  } else {
    const from = dir.y > 0 ? head.y : 0;
    const to = dir.y > 0 ? GRID_H - 1 : head.y;
    for (let y = from; y <= to; y++) {
      for (let x = head.x - 1; x <= head.x + 1; x++) {
        if (x >= 0 && x < GRID_W) cells.push({ x, y });
      }
    }
  }
  return cells;
}

// 불티 파티클을 뿌릴 중심선(폭 3칸 중 가운데 줄) 좌표들 - computeBeamCells와 같은 범위 규칙이지만
// 폭 방향으로는 딱 한 줄만 필요하다.
function computeCenterline(head, dir) {
  const line = [];
  if (dir.x !== 0) {
    const from = dir.x > 0 ? head.x : 0;
    const to = dir.x > 0 ? GRID_W - 1 : head.x;
    for (let x = from; x <= to; x++) line.push({ x, y: head.y });
  } else {
    const from = dir.y > 0 ? head.y : 0;
    const to = dir.y > 0 ? GRID_H - 1 : head.y;
    for (let y = from; y <= to; y++) line.push({ x: head.x, y });
  }
  return line;
}

export const redCintamani = {
  id: 'red',
  requiredKills: { 1: CINTAMANI_UNLOCK_KILLS, 3: CINTAMANI_UNLOCK_KILLS },
  rewardEnemyId: 3,
  rewardInterval: CINTAMANI_REWARD_KILL_INTERVAL,
  pattern: parsePattern(PATTERN_TEXT),

  activate(world) {
    const head = world.snake.head;
    const dir = world.snake.dir;
    const cells = computeBeamCells(world);
    const cellSet = new Set(cells.map(c => `${c.x},${c.y}`));

    // 적이 그려지는 전체 박스(ENEMY_SCALE x ENEMY_SCALE)가 범위와 하나라도 겹치면 맞은 것으로
    // 친다 - fireScaleWave()/checkHeadCollision과 같은 원칙(그려지는 것보다 작은 판정 범위는
    // "가끔 안 맞는 것처럼" 느껴진다).
    const half = Math.floor((ENEMY_SCALE - 1) / 2);
    const hitEnemies = world.enemyManager.enemies.filter(enemy => {
      for (let ex = enemy.x - half; ex <= enemy.x + half; ex++) {
        for (let ey = enemy.y - half; ey <= enemy.y + half; ey++) {
          if (cellSet.has(`${ex},${ey}`)) return true;
        }
      }
      return false;
    });

    for (const enemy of hitEnemies) {
      // 적2/4는 원래 투사체/비늘파동에 면역(canBeDamagedByProjectile:false)이지만, 이 빔은
      // 그 면역을 무시하고 강제로 파괴한다 - 데미지를 아예 거치지 않고 바로 제거.
      const forced = !enemy.typeDef.canBeDamagedByProjectile;
      const shouldRemove = forced || world.enemyManager.applyProjectileHit(enemy, RED_CINTAMANI_BEAM_DAMAGE);
      if (shouldRemove) killEnemyForCintamani(world, enemy, SCORE_PER_KILL_PROJECTILE);
    }

    // 시각효과 - render/layers.js의 redBeamLayer가 world.redBeamEffect를 읽어서 그린다.
    // headCell/dir을 발동 시점 값으로 따로 저장해두는 이유: 뱀은 발동 후에도 계속 움직이므로,
    // world.snake.head/dir을 렌더링 시점에 다시 읽으면 안 되고(폭 그라데이션 기준이 흔들림)
    // 발동 당시의 스냅샷이어야 한다.
    const startedAt = performance.now();
    world.redBeamEffect = {
      cells, headCell: { x: head.x, y: head.y }, dir: { x: dir.x, y: dir.y },
      startedAt, duration: RED_CINTAMANI_BEAM_FLASH_MS,
    };

    // 불티 파티클 - 중심선을 따라 일정 간격으로 따뜻한 색 파티클을 튀겨서 "불기둥"처럼 보이게
    // 한다. 기존 particleManager.spawnBurst(한 점에서 사방으로)를 그대로 재사용 - 새 매니저
    // 메서드가 필요 없다.
    const centerline = computeCenterline(head, dir);
    for (let i = 0; i < centerline.length; i += RED_CINTAMANI_BEAM_EMBER_STEP) {
      const { x, y } = centerline[i];
      world.particleManager.spawnBurst({
        x, y, color: i % (RED_CINTAMANI_BEAM_EMBER_STEP * 2) === 0 ? '#ffdd55' : '#ff8800',
        count: RED_CINTAMANI_BEAM_EMBER_COUNT, speed: RED_CINTAMANI_BEAM_EMBER_SPEED,
        life: RED_CINTAMANI_BEAM_EMBER_LIFE_MS,
      });
    }
  },
};
