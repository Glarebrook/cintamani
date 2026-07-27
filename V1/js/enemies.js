class EnemyManager {
  constructor() {
    this.reset();
    this.nextEnemyId = 1;
    this.enemyTypes = {
      1: {
        id: 1,
        color: '#d9483d',
        hp: ENEMY_BASE_HP,
        canBeDamagedByProjectile: true,
        displayText: enemy => String(enemy.hp),
        collidesWithHead: true
      },
      2: {
        id: 2,
        color: '#3b82f6',
        hp: 999,
        canBeDamagedByProjectile: false,
        displayText: () => 'X',
        collidesWithHead: true
      }
    };
  }

  reset() {
    this.enemies = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this._randomSpawnDelay();
    this.nextEnemyId = 1;
  }

  update(dt, snake) {
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.nextSpawnDelay) {
      this.spawnTimer = 0;
      this.nextSpawnDelay = this._randomSpawnDelay();
      this._trySpawn(snake);
    }
  }

  _randomSpawnDelay() {
    return ENEMY_SPAWN_MIN_MS + Math.floor(Math.random() * (ENEMY_SPAWN_MAX_MS - ENEMY_SPAWN_MIN_MS + 1));
  }

  _getEnemyTypeConfig(type) {
    return this.enemyTypes[type] || this.enemyTypes[1];
  }

  _createEnemy(type, x, y) {
    const config = this._getEnemyTypeConfig(type);
    return {
      id: this.nextEnemyId++,
      type,
      x,
      y,
      color: config.color,
      hp: config.hp
    };
  }

  // 파란색 적(type 2)의 포획 범위(회색 배경)를 격자 좌표로 반환 - 적 외곽선 기준 ENEMY_CAPTURE_ZONE_SCALE배, 적 중심에 정렬
  getCaptureZoneBounds(enemy) {
    const outlineCells = ENEMY_SCALE;
    const zoneSideCells = outlineCells * ENEMY_CAPTURE_ZONE_SCALE;
    const offset = Math.floor((zoneSideCells - 1) / 2);
    const left = enemy.x - offset;
    const top = enemy.y - offset;
    return { left, top, right: left + zoneSideCells - 1, bottom: top + zoneSideCells - 1 };
  }

  applyProjectileHit(enemy, damage) {
    const config = this._getEnemyTypeConfig(enemy.type);
    if (!config.canBeDamagedByProjectile) return false;

    enemy.hp -= damage;
    return enemy.hp <= 0;
  }

  // 뱀 몸통이 만든 벽으로 막혀 바깥과 연결되지 않는(=완전히 감싸진) 칸들을 flood fill로 계산
  _computeUnreachableFromOutside(snake) {
    const occupied = new Uint8Array(GRID_W * GRID_H);
    for (const seg of snake.segments) {
      if (seg.x >= 0 && seg.x < GRID_W && seg.y >= 0 && seg.y < GRID_H) {
        occupied[seg.y * GRID_W + seg.x] = 1;
      }
    }

    const reachable = new Uint8Array(GRID_W * GRID_H);
    const queue = [];
    const seed = (x, y) => {
      const idx = y * GRID_W + x;
      if (occupied[idx] || reachable[idx]) return;
      reachable[idx] = 1;
      queue.push(idx);
    };

    for (let x = 0; x < GRID_W; x++) {
      seed(x, 0);
      seed(x, GRID_H - 1);
    }
    for (let y = 0; y < GRID_H; y++) {
      seed(0, y);
      seed(GRID_W - 1, y);
    }

    let qi = 0;
    while (qi < queue.length) {
      const idx = queue[qi++];
      const x = idx % GRID_W;
      const y = Math.floor(idx / GRID_W);
      const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
        const nIdx = ny * GRID_W + nx;
        if (occupied[nIdx] || reachable[nIdx]) continue;
        reachable[nIdx] = 1;
        queue.push(nIdx);
      }
    }

    return reachable; // 1이면 바깥에서 도달 가능(=포획 안 됨)
  }

  // 회색 범위 전체가 뱀 몸통에 의해 바깥과 완전히 단절된 파란색 적들의 id 목록
  getEnclosedType2EnemyIds(snake) {
    const type2Enemies = this.enemies.filter(enemy => enemy.type === 2);
    if (type2Enemies.length === 0) return [];

    const reachable = this._computeUnreachableFromOutside(snake);
    const enclosedIds = [];

    for (const enemy of type2Enemies) {
      const zone = this.getCaptureZoneBounds(enemy);
      let enclosed = true;
      for (let y = Math.max(0, zone.top); enclosed && y <= Math.min(GRID_H - 1, zone.bottom); y++) {
        for (let x = Math.max(0, zone.left); x <= Math.min(GRID_W - 1, zone.right); x++) {
          if (reachable[y * GRID_W + x]) {
            enclosed = false;
            break;
          }
        }
      }
      if (enclosed) enclosedIds.push(enemy.id);
    }

    return enclosedIds;
  }

  removeByIds(ids) {
    if (!ids.length) return;
    const idSet = new Set(ids);
    this.enemies = this.enemies.filter(enemy => !idSet.has(enemy.id));
  }

  _trySpawn(snake) {
    if (this.enemies.length >= ENEMY_MAX_COUNT) return;

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

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const availableTypes = [1];
    if (snake.segments.length >= 20) {
      availableTypes.push(2);
    }
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    this.enemies.push(this._createEnemy(type, chosen.x, chosen.y));
  }

  checkHeadCollision(head) {
    return this.enemies.some(enemy => {
      const config = this._getEnemyTypeConfig(enemy.type);
      return config.collidesWithHead && enemy.x === head.x && enemy.y === head.y;
    });
  }

  render(ctx) {
    const C = CELL_SIZE;
    const size = C * ENEMY_SCALE;
    for (const enemy of this.enemies) {
      const x = enemy.x * C - (size - C) / 2;
      const y = enemy.y * C - (size - C) / 2;

      const config = this._getEnemyTypeConfig(enemy.type);
      ctx.fillStyle = config.color;
      ctx.fillRect(x, y, size, size);

      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(10, Math.floor(size * 0.5))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayHp = config.displayText(enemy);
      ctx.fillText(displayHp, x + size / 2, y + size / 2);
    }
  }
}
