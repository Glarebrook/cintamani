import {
  PLAYABLE_MIN_X, PLAYABLE_MIN_Y, PLAYABLE_MAX_X, PLAYABLE_MAX_Y,
  ENEMY_SCALE, ENEMY_SPAWN_MIN_MS, ENEMY_SPAWN_MAX_MS,
  ENEMY_SPAWN_SLOWDOWN_THRESHOLD, ENEMY_SPAWN_SLOWDOWN_FACTOR,
  ENEMY_MIN_SPAWN_DISTANCE_FROM_HEAD, CAPTURE_ZONE_MIN_SPAWN_DISTANCE,
} from '../config/constants.js';
import { toScreenX, toScreenY, screenCellSize } from '../core/gridMath.js';
import { EnemyTypes } from '../content/enemies/index.js';
// 하단 상태창(render/statusPanel.js)의 적 킬 스택 아이콘과 같은 이미지/폴백 규칙을 필드에
// 스폰되는 적 렌더링에도 그대로 쓴다 - assets/enemies/enemy{id}.png를 여기서도 재사용.
// drawIcon은 이미지 원본의 투명 여백을 잘라내고 그려서, 그림에 여백이 있어도 색깔 사각형
// 폴백과 항상 같은 크기로 보이게 한다(직접 ctx.drawImage를 쓰지 않는 이유).
import { getEnemyIcon, drawIcon } from '../render/statusIcons.js';
// directionalSprite를 가진 타입(예: 3번적)의 이동 방향별 스프라이트 조각을 구하는 범용 로더 -
// 특정 id를 여기서 하드코딩하지 않는다(getEnemyIcon 폴백 규칙 위에 한 단계 더 얹는 형태).
import { getDirectionalSpriteRect } from '../render/enemySpriteSheets.js';
import { dirFromDelta } from '../render/snakeSprites.js';

export class EnemyManager {
  constructor() {
    this.reset();
  }

  // world가 없을 때(생성자에서의 최초 reset() - world.stats가 아직 만들어지기 전이라
  // game.js의 world.reset() 순서상 이 시점엔 넘겨줄 world가 없다) 최초 스폰 타이머 하나만
  // 기본 상수값을 쓴다 - 이후 update()가 매번 world를 넘기므로 실제 게임플레이 중 스폰
  // 간격은 항상 world.stats(테스트 빌드 오버레이 포함)를 따른다.
  reset() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this._randomSpawnDelay();
    this.nextEnemyId = 1;
  }

  // 스폰 타이머 전용 — 간격(3000~7000ms)이 매우 커서 틱 단위(world.stats.tickMs)로
  // 누적해도 오차가 무시할 만하다. 실시간에 더 민감한 이동은 updateMovement()가 따로 맡는다.
  // world 전체를 받는 이유: hunter.js처럼 spawnEligible이 world.stats.tickMs(뱀의 현재 속도)를
  // 봐야 하는 타입이 있어서 — snake만으로는 그런 조건을 표현할 수 없다.
  update(dt, world) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnDelay) {
      this.spawnTimer = 0;
      this._trySpawn(world);
      // _trySpawn 이후에 계산해야 방금 스폰(또는 스폰 실패)이 반영된 최신 마리 수 기준으로
      // 다음 간격의 지수 배율(_randomSpawnDelay 참고)이 정해진다.
      this.nextSpawnDelay = this._randomSpawnDelay(world);
    }
  }

  // move/moveIntervalMs를 가진 타입만 대상 — 정적인 적(기본/파란)은 그냥 지나친다.
  // 각 적은 자기 typeDef가 알려주는 간격(moveIntervalMs)마다 자기 typeDef가 알려주는
  // 방향(move)으로 한 칸씩 이동한다. 특정 타입을 여기서 하드코딩하지 않는다.
  // 게임 틱(onTick, 뱀 이동 간격)이 아니라 매 프레임(onFrame)의 실제 dt로 호출해야 한다 —
  // 추격 상태의 이동 간격(예: 60ms)이 현재 뱀 틱 간격(예: 120ms)보다 짧을 수 있어서,
  // 틱당 한 번만 갱신하면 "틱마다 최대 1칸"이라는 상한에 묶여 속도 차이가 드러나지 않는다.
  // world 전체를 넘기는 이유: hunter.js처럼 "플레이어와 같은 속도"로 움직이려면
  // moveIntervalMs가 world.stats.tickMs(뱀의 현재 속도)를 읽어야 한다.
  updateMovement(dt, world) {
    for (const enemy of this.enemies) {
      if (!enemy.typeDef.move) continue;

      enemy.moveTimer = (enemy.moveTimer || 0) + dt;
      const interval = enemy.typeDef.moveIntervalMs(enemy, world);
      if (enemy.moveTimer < interval) continue;
      enemy.moveTimer = 0;

      const dir = enemy.typeDef.move(enemy, world);
      if (!dir) continue;

      const nx = enemy.x + dir.x;
      const ny = enemy.y + dir.y;
      // 필드 절대 경계가 아니라 벽 안쪽(뱀이 갈 수 있는 범위)까지만 - 그렇지 않으면 이동형
      // 적(추격형/추적사격형)이 회색 벽 구역으로 들어가버려 영구히 손댈 수 없게 된다.
      if (nx < PLAYABLE_MIN_X || nx >= PLAYABLE_MAX_X || ny < PLAYABLE_MIN_Y || ny >= PLAYABLE_MAX_Y) continue;
      enemy.x = nx;
      enemy.y = ny;
      // 이동형 적 전체에 공통으로 마지막 이동 방향을 기록해둔다 - render()가 이걸로 방향별
      // 스프라이트를 고른다(directionalSprite가 없는 타입엔 그냥 안 쓰이는 값일 뿐이라
      // 여기서 타입을 가려낼 필요가 없다).
      enemy.facing = dirFromDelta(dir.x, dir.y) || enemy.facing;
    }
  }

  // ability/abilityCooldownMs를 가진 타입만 대상 — 이동과 같은 패턴이지만 위치를 바꾸는 대신
  // 임의의 부수효과(예: 투사체 발사)를 실행한다. world 전체가 필요해서(투사체 매니저 등)
  // updateMovement와는 별도 메서드로 분리했다.
  // 쿨다운은 "발사 자체"에만 걸린다 — 조건(예: 정렬 여부) 판정은 쿨다운이 다 찬 뒤로는 매 프레임
  // 계속 재시도한다. 예전엔 쿨다운 시점에 딱 한 번만 조건을 체크했는데, 그러면 그 정확한 순간에
  // 우연히 조건을 만족하지 않는 한 몇 초씩 그냥 넘어가버려서 "거의 안 쏜다"처럼 보였다.
  // ability()가 실제로 발동했으면 true를 반환해야 타이머가 리셋된다 — 조건 미충족으로 false를
  // 반환하면 타이머는 그대로 두고 다음 프레임에 바로 다시 시도한다. dt도 함께 넘겨서
  // (hunter.js처럼) 쿨다운 게이트 자체를 사실상 끄고(0으로 두고) 스스로 내부 타이밍을
  // 관리하는 타입도 만들 수 있게 한다.
  updateAbilities(dt, world) {
    for (const enemy of this.enemies) {
      if (!enemy.typeDef.ability) continue;

      const cooldown = enemy.typeDef.abilityCooldownMs(enemy, world);
      if (enemy.abilityTimer === undefined) enemy.abilityTimer = cooldown; // 스폰 직후부터 발사 가능
      enemy.abilityTimer += dt;
      if (enemy.abilityTimer < cooldown) continue;

      const fired = enemy.typeDef.ability(enemy, world, dt);
      if (fired) enemy.abilityTimer = 0;
    }
  }

  // 필드에 ENEMY_SPAWN_SLOWDOWN_THRESHOLD(3)마리를 초과해 있으면, 초과한 마리 수만큼
  // ENEMY_SPAWN_SLOWDOWN_FACTOR(2)를 거듭제곱해 기본 간격을 늘린다 - 4마리째부터 매 한 마리씩
  // 늘어날 때마다 다음 생성까지 갈수록 오래 걸리지만, 생성 자체가 완전히 멈추지는 않는다
  // (예전엔 이 수를 넘으면 생성이 아예 멈추는 하드 캡이었음 - _trySpawn 참고).
  // 최소/최대 간격은 world.stats.enemySpawnMinMs/MaxMs를 우선 쓴다(테스트 빌드가 "몹 생성
  // 속도" 실험을 위해 덮어쓸 수 있는 값 - config/testBuilds.js, game.js의 world.reset 참고).
  // world가 없거나(생성자 최초 reset) 아직 world.stats가 없으면 기본 상수로 대체한다.
  _randomSpawnDelay(world) {
    const min = world?.stats?.enemySpawnMinMs ?? ENEMY_SPAWN_MIN_MS;
    const max = world?.stats?.enemySpawnMaxMs ?? ENEMY_SPAWN_MAX_MS;
    const base = min + Math.floor(Math.random() * (max - min + 1));
    const over = Math.max(0, this.enemies.length - ENEMY_SPAWN_SLOWDOWN_THRESHOLD);
    return base * (ENEMY_SPAWN_SLOWDOWN_FACTOR ** over);
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

  // 타입을 먼저 고르고 나서 그 타입에 맞는 후보 칸을 찾는다(예전엔 반대 순서였다) —
  // captureZone을 가진 타입은 가장자리 여백이 필요해서, 어떤 타입이 나올지 미리 알아야
  // 후보 칸 범위를 좁힐 수 있다.
  _trySpawn(world) {
    // 마리 수로 스폰 자체를 막는 하드 캡은 없다 - 대신 마리 수가 많을수록 다음 스폰까지의
    // 간격이 지수적으로 늘어난다(_randomSpawnDelay 참고), 그래서 무제한으로 계속 나오되
    // 점점 드물어진다.
    const eligibleTypes = EnemyTypes.all().filter(def => !def.spawnEligible || def.spawnEligible(world));
    if (eligibleTypes.length === 0) return;
    const typeDef = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];

    // captureZone(감싸서 처치하는 타입, 예: 2번/4번적)은 회색 포획 범위 전체가 격자 안에
    // 온전히 들어와야 한다 — 가장자리에 바짝 붙어서 생성되면 그 범위가 격자 밖으로 잘려나가고,
    // 특히 딱 가장자리 칸(x=0 등)에 생성되면 flood fill이 그 칸 자체를 "바깥"으로 취급해서
    // 원천적으로 포획이 불가능해진다. getCaptureZoneBounds(content/mechanics/encirclement.js)와
    // 정확히 같은 공식으로 여백을 계산한다.
    const margin = typeDef.captureZone
      ? Math.floor((ENEMY_SCALE * typeDef.captureZone.scale - 1) / 2)
      : 0;

    // captureZone 타입끼리 너무 붙어서 나오면(예: 4번적 둘이 딱 붙음), 한쪽만 따로 감싸는 게
    // 불가능해지는 문제가 실제로 보고됐다 - 이미 존재하는 다른 captureZone 적들의 위치를
    // 미리 뽑아둔다(이번에 뽑힌 typeDef가 captureZone일 때만 의미가 있음).
    const captureZoneNeighbors = typeDef.captureZone
      ? this.enemies.filter(enemy => enemy.typeDef.captureZone)
      : [];

    const snake = world.snake;
    const head = snake.head;
    const candidates = [];
    // 버그픽스1: margin은 "벽 안쪽(뱀이 실제로 갈 수 있는 범위, PLAYABLE_MIN/MAX)" 경계를
    // 기준으로 안쪽으로 들여야 한다 - 필드 벽 패치 이전엔 GRID_W/GRID_H가 곧 실제 이동 가능
    // 경계였어서 그 기준으로 계산해도 맞았지만, 벽이 생긴 뒤로는 GRID_W/H가 벽 바깥의 절대
    // 필드 크기라 PLAYABLE_MAX_X(190) < GRID_W - margin(193)처럼 margin 제약이 사실상
    // 무력화돼 있었다(항상 더 느슨한 PLAYABLE 쪽 경계만 적용됨) - 그 결과 2/4번적(captureZone)이
    // 벽에 바짝 붙어 스폰돼 감쌀 공간이 없어지는 문제가 실제로 나타났다. PLAYABLE_MIN/MAX
    // 기준으로 margin만큼 들여쓰면 항상 "벽 안쪽 + 여백"이 보장된다.
    const minX = PLAYABLE_MIN_X + margin;
    const maxX = PLAYABLE_MAX_X - margin;
    const minY = PLAYABLE_MIN_Y + margin;
    const maxY = PLAYABLE_MAX_Y - margin;
    for (let x = minX; x < maxX; x++) {
      for (let y = minY; y < maxY; y++) {
        const occupiedBySnake = snake.occupies(x, y);
        const occupiedByEnemy = this.enemies.some(enemy => enemy.x === x && enemy.y === y);
        // 뱀 머리와 너무 가까운 칸은 후보에서 제외 - 반응할 틈도 없이 바로 충돌해 죽는 것 방지.
        // 다른 정사각형 범위 판정(포획존, 추격 감지범위 등)과 같은 체비셰프 거리 방식.
        const tooCloseToHead = Math.max(Math.abs(x - head.x), Math.abs(y - head.y)) < ENEMY_MIN_SPAWN_DISTANCE_FROM_HEAD;
        const tooCloseToOtherCaptureZone = captureZoneNeighbors.some(
          other => Math.max(Math.abs(x - other.x), Math.abs(y - other.y)) < CAPTURE_ZONE_MIN_SPAWN_DISTANCE
        );
        if (!occupiedBySnake && !occupiedByEnemy && !tooCloseToHead && !tooCloseToOtherCaptureZone) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
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

  render(ctx, camera) {
    const C = screenCellSize();
    const size = C * ENEMY_SCALE;
    for (const enemy of this.enemies) {
      const x = toScreenX(enemy.x, camera) - (size - C) / 2;
      const y = toScreenY(enemy.y, camera) - (size - C) / 2;

      // directionalSprite가 있는 타입(예: 3번적)은 이동 방향별 스프라이트시트 조각을 먼저
      // 시도한다. 없거나(다른 타입) 아직 시트가 로딩 전이면 기존 정지 아이콘/색깔 폴백으로
      // 넘어간다 - assets/enemies/enemy{id}.png가 있으면 그걸 그리고, 없으면 typeDef.color
      // 색깔 네모로 대체한다(상태창 아이콘과 같은 폴백 규칙, getEnemyIcon).
      const dirRect = getDirectionalSpriteRect(enemy.typeDef, enemy);
      if (dirRect) {
        ctx.drawImage(dirRect.img, dirRect.sx, dirRect.sy, dirRect.sw, dirRect.sh, x, y, size, size);
      } else {
        const icon = getEnemyIcon(enemy.typeDef.id);
        if (icon) {
          drawIcon(ctx, icon, x, y, size, size);
        } else {
          ctx.fillStyle = enemy.typeDef.color;
          ctx.fillRect(x, y, size, size);
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(10, Math.floor(size * 0.5))}px CintamaniFont, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(enemy.typeDef.displayText(enemy), x + size / 2, y + size / 2);
    }
  }
}
