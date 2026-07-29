import { GRID_W, GRID_H, CELL_SIZE, ENEMY_SCALE, ENEMY_SPAWN_MIN_MS, ENEMY_SPAWN_MAX_MS } from '../config/constants.js';
import { EnemyTypes } from '../content/enemies/index.js';

export class EnemyManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this._randomSpawnDelay();
    this.nextEnemyId = 1;
  }

  // 스폰 타이머 전용 — 간격(3000~7000ms)이 매우 커서 틱 단위(world.stats.tickMs)로
  // 누적해도 오차가 무시할 만하다. 실시간에 더 민감한 이동은 updateMovement()가 따로 맡는다.
  update(dt, snake) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnDelay) {
      this.spawnTimer = 0;
      this.nextSpawnDelay = this._randomSpawnDelay();
      this._trySpawn(snake);
    }
  }

  // move/moveIntervalMs를 가진 타입만 대상 — 정적인 적(기본/파란)은 그냥 지나친다.
  // 각 적은 자기 typeDef가 알려주는 간격(moveIntervalMs)마다 자기 typeDef가 알려주는
  // 방향(move)으로 한 칸씩 이동한다. 특정 타입을 여기서 하드코딩하지 않는다.
  // 게임 틱(onTick, 뱀 이동 간격)이 아니라 매 프레임(onFrame)의 실제 dt로 호출해야 한다 —
  // 추격 상태의 이동 간격(예: 60ms)이 현재 뱀 틱 간격(예: 120ms)보다 짧을 수 있어서,
  // 틱당 한 번만 갱신하면 "틱마다 최대 1칸"이라는 상한에 묶여 속도 차이가 드러나지 않는다.
  updateMovement(dt, snake) {
    for (const enemy of this.enemies) {
      if (!enemy.typeDef.move) continue;

      enemy.moveTimer = (enemy.moveTimer || 0) + dt;
      const interval = enemy.typeDef.moveIntervalMs(enemy, { snake });
      if (enemy.moveTimer < interval) continue;
      enemy.moveTimer = 0;

      const dir = enemy.typeDef.move(enemy, { snake });
      if (!dir) continue;

      const nx = enemy.x + dir.x;
      const ny = enemy.y + dir.y;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      enemy.x = nx;
      enemy.y = ny;
    }
  }

  // ability/abilityCooldownMs를 가진 타입만 대상 — 이동과 같은 패턴이지만 위치를 바꾸는 대신
  // 임의의 부수효과(예: 투사체 발사)를 실행한다. world 전체가 필요해서(투사체 매니저 등)
  // updateMovement(snake만 필요)와는 별도 메서드로 분리했다.
  // 쿨다운은 "발사 자체"에만 걸린다 — 조건(예: 정렬 여부) 판정은 쿨다운이 다 찬 뒤로는 매 프레임
  // 계속 재시도한다. 예전엔 쿨다운 시점에 딱 한 번만 조건을 체크했는데, 그러면 그 정확한 순간에
  // 우연히 조건을 만족하지 않는 한 몇 초씩 그냥 넘어가버려서 "거의 안 쏜다"처럼 보였다.
  // ability()가 실제로 발동했으면 true를 반환해야 타이머가 리셋된다 — 조건 미충족으로 false를
  // 반환하면 타이머는 그대로 두고 다음 프레임에 바로 다시 시도한다.
  updateAbilities(dt, world) {
    for (const enemy of this.enemies) {
      if (!enemy.typeDef.ability) continue;

      const cooldown = enemy.typeDef.abilityCooldownMs(enemy, world);
      if (enemy.abilityTimer === undefined) enemy.abilityTimer = cooldown; // 스폰 직후부터 발사 가능
      enemy.abilityTimer += dt;
      if (enemy.abilityTimer < cooldown) continue;

      const fired = enemy.typeDef.ability(enemy, world);
      if (fired) enemy.abilityTimer = 0;
    }
  }

  _randomSpawnDelay() {
    return ENEMY_SPAWN_MIN_MS + Math.floor(Math.random() * (ENEMY_SPAWN_MAX_MS - ENEMY_SPAWN_MIN_MS + 1));
  }

  _createEnemy(typeDef, x, y) {
    return {
      id: this.nextEnemyId++,
      typeDef,
      x,
      y,
      hp: typeDef.hp,
    };
  }

  applyProjectileHit(enemy, damage) {
    if (!enemy.typeDef.canBeDamagedByProjectile) return false;
    enemy.hp -= damage;
    return enemy.hp <= 0;
  }

  // 제거된 적 객체들을 반환한다 — 호출부(playingState.js)가 그 타입의 onCaptured 같은
  // 후크를 world와 함께 호출해줄 수 있도록.
  removeByIds(ids) {
    if (!ids.length) return [];
    const idSet = new Set(ids);
    const removed = this.enemies.filter(enemy => idSet.has(enemy.id));
    this.enemies = this.enemies.filter(enemy => !idSet.has(enemy.id));
    return removed;
  }

  _trySpawn(snake) {
    const candidates = [];
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 0; y < GRID_H; y++) {
        const occupiedBySnake = snake.occupies(x, y);
        const occupiedByEnemy = this.enemies.some(enemy => enemy.x === x && enemy.y === y);
        if (!occupiedBySnake && !occupiedByEnemy) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length === 0) return;

    const eligibleTypes = EnemyTypes.all().filter(def => !def.spawnEligible || def.spawnEligible({ snake }));
    if (eligibleTypes.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const typeDef = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
    this.enemies.push(this._createEnemy(typeDef, chosen.x, chosen.y));
  }

  // 적은 화면에 ENEMY_SCALE x ENEMY_SCALE 크기의 정사각형으로 그려지므로(render() 참고),
  // 충돌 판정도 정중앙 1칸이 아니라 그 정사각형 전체를 기준으로 해야 시각적으로 닿았을 때
  // 항상 충돌로 잡힌다.
  checkHeadCollision(head) {
    const offset = Math.floor((ENEMY_SCALE - 1) / 2);
    return this.enemies.some(enemy => {
      if (!enemy.typeDef.collidesWithHead) return false;
      return Math.abs(head.x - enemy.x) <= offset && Math.abs(head.y - enemy.y) <= offset;
    });
  }

  render(ctx) {
    const C = CELL_SIZE;
    const size = C * ENEMY_SCALE;
    for (const enemy of this.enemies) {
      const x = enemy.x * C - (size - C) / 2;
      const y = enemy.y * C - (size - C) / 2;

      ctx.fillStyle = enemy.typeDef.color;
      ctx.fillRect(x, y, size, size);

      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(10, Math.floor(size * 0.5))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(enemy.typeDef.displayText(enemy), x + size / 2, y + size / 2);
    }
  }
}
