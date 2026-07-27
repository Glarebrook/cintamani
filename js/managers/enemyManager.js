import { GRID_W, GRID_H, CELL_SIZE, ENEMY_SCALE, ENEMY_SPAWN_MIN_MS, ENEMY_SPAWN_MAX_MS, ENEMY_MAX_COUNT } from '../config/constants.js';
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

    const eligibleTypes = EnemyTypes.all().filter(def => !def.spawnEligible || def.spawnEligible({ snake }));
    if (eligibleTypes.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const typeDef = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
    this.enemies.push(this._createEnemy(typeDef, chosen.x, chosen.y));
  }

  checkHeadCollision(head) {
    return this.enemies.some(enemy => enemy.typeDef.collidesWithHead && enemy.x === head.x && enemy.y === head.y);
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
