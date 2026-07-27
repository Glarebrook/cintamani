class Game {
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this._elSize  = document.getElementById('stat-size');
    this._elSpeed = document.getElementById('stat-speed');
    this._elAttack = document.getElementById('stat-attack');
    this._elSnakeSpeed = document.getElementById('stat-snake-speed');
    this._elTime  = document.getElementById('stat-time');
    this.projectiles = [];
    this._reset();
    this._bindRestart();
    this._bindFire();
  }

  _reset() {
    this.snake        = new Snake();
    this.enemyManager = new EnemyManager();
    this.itemManager  = new ItemManager();
    this.gameOver     = false;
    this.lastTick     = performance.now();
    this.lastFrame    = null;
    this.startTime    = performance.now();
    this.survivalMs   = 0;
    this._pendingDirection = null;
    this.projectiles = [];
    this.itemManager.reset();
    this.enemyManager.reset();
    this.itemManager.ensureFood(this.snake, this.enemyManager);
  }

  _bindRestart() {
    window.addEventListener('keydown', e => {
      if (e.key === 'Enter' && this.gameOver) {
        this._reset();
      }
    });
  }

  _bindFire() {
    window.addEventListener('keydown', e => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if (this.gameOver) return;
      e.preventDefault();
      this._fireProjectile();
    });
  }

  _fireProjectile() {
    const head = this.snake.head;
    const dir = this._pendingDirection || this.snake.dir || { x: 1, y: 0 };
    const projectile = {
      x: head.x,
      y: head.y,
      vx: dir.x * PROJECTILE_SPEED,
      vy: dir.y * PROJECTILE_SPEED,
      dir,
      damage: PROJECTILE_DAMAGE,
      color: '#f5d742'
    };

    this.projectiles.push(projectile);
  }

  start() {
    requestAnimationFrame(t => this._loop(t));
  }

  _loop(timestamp) {
    const dt = this.lastFrame ? timestamp - this.lastFrame : 0;
    this.lastFrame = timestamp;

    if (!this.gameOver) {
      this.itemManager.ensureFood(this.snake, this.enemyManager);
      this.itemManager.update(dt, this.snake, this.enemyManager);
      this._updateProjectiles(dt);

      if (timestamp - this.lastTick >= TICK_MS) {
        this.lastTick += TICK_MS;
        this._tick();
      }
    }

    if (this.gameOver) {
      Renderer.render(this.ctx, this.snake, this.itemManager, this.enemyManager, this);
      Renderer.renderGameOver(this.ctx);
    } else {
      Renderer.render(this.ctx, this.snake, this.itemManager, this.enemyManager, this);
    }

    this._updateStats(timestamp);
    requestAnimationFrame(t => this._loop(t));
  }

  _updateStats(timestamp) {
    const elapsed = this.gameOver
      ? this.survivalMs
      : (timestamp - this.startTime);
    this._elSize.textContent  = this.snake.segments.length;
    this._elSpeed.textContent = TICK_MS;
    this._elAttack.textContent = PROJECTILE_DAMAGE;
    this._elSnakeSpeed.textContent = TICK_MS;
    this._elTime.textContent  = (elapsed / 1000).toFixed(1);
  }

  _tick() {
    const dir = Input.consume();
    if (dir) {
      this._pendingDirection = dir;
    }

    const moveDir = this._pendingDirection || { x: 1, y: 0 };
    this.snake.step(moveDir);

    if (this.snake.isWallCollision()) {
      this.survivalMs = performance.now() - this.startTime;
      this.gameOver = true;
      return;
    }

    // 회색 포획 범위를 뱀 몸통이 완전히 감쌌는지 확인 - 감쌌다면 머리가 몸통과 만나도 통과시키고 적을 제거
    const capturedEnemyIds = this.enemyManager.getEnclosedType2EnemyIds(this.snake);
    if (this.snake.isSelfCollision() && capturedEnemyIds.length === 0) {
      this.survivalMs = performance.now() - this.startTime;
      this.gameOver = true;
      return;
    }
    this.enemyManager.removeByIds(capturedEnemyIds);

    if (this.enemyManager.checkHeadCollision(this.snake.head)) {
      this.survivalMs = performance.now() - this.startTime;
      this.gameOver = true;
      return;
    }

    const eaten = this.itemManager.checkHeadCollision(this.snake);
    if (eaten) {
      this.snake.scheduleGrowth(eaten);
      this.itemManager.food = null;
      this.itemManager.foodTimer = 0;
      this.itemManager.spawnFood(this.snake, this.enemyManager);
    }

    this.snake.checkGrowth();
    this.enemyManager.update(TICK_MS, this.snake);
  }

  _updateProjectiles(dt) {
    const dtSeconds = dt / 1000;

    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dtSeconds;
      projectile.y += projectile.vy * dtSeconds;
    }

    this.projectiles = this.projectiles.filter(projectile => {
      const inside = projectile.x >= 0 && projectile.x < GRID_W && projectile.y >= 0 && projectile.y < GRID_H;
      if (!inside) return false;

      const px = projectile.x;
      const py = projectile.y;
      const hitEnemyIndex = this.enemyManager.enemies.findIndex(enemy => {
        const dx = enemy.x - px;
        const dy = enemy.y - py;
        const hitRadius = ENEMY_SCALE * 0.5;
        return dx * dx + dy * dy <= hitRadius * hitRadius;
      });

      if (hitEnemyIndex >= 0) {
        const hitEnemy = this.enemyManager.enemies[hitEnemyIndex];
        const shouldRemove = this.enemyManager.applyProjectileHit(hitEnemy, projectile.damage);
        if (shouldRemove) {
          this.enemyManager.enemies.splice(hitEnemyIndex, 1);
        }
        return false;
      }

      return true;
    });
  }
}
