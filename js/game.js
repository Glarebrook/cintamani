class Game {
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this._elSize  = document.getElementById('stat-size');
    this._elSpeed = document.getElementById('stat-speed');
    this._elTime  = document.getElementById('stat-time');
    this._reset();
    this._bindRestart();
  }

  _reset() {
    this.snake        = new Snake();
    this.itemManager  = new ItemManager();
    this.enemyManager = new EnemyManager();
    this.gameOver     = false;
    this.lastTick     = performance.now();
    this.lastFrame    = null;
    this.startTime    = performance.now();
    this.survivalMs   = 0;
  }

  _bindRestart() {
    window.addEventListener('keydown', e => {
      if (e.key === 'Enter' && this.gameOver) {
        this._reset();
      }
    });
  }

  start() {
    requestAnimationFrame(t => this._loop(t));
  }

  _loop(timestamp) {
    const dt = this.lastFrame ? timestamp - this.lastFrame : 0;
    this.lastFrame = timestamp;

    if (!this.gameOver) {
      this.itemManager.update(dt, this.snake);

      if (timestamp - this.lastTick >= TICK_MS) {
        this.lastTick += TICK_MS;
        this._tick();
      }
    }

    if (this.gameOver) {
      Renderer.render(this.ctx, this.snake, this.itemManager, this.enemyManager);
      Renderer.renderGameOver(this.ctx);
    } else {
      Renderer.render(this.ctx, this.snake, this.itemManager, this.enemyManager);
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
    this._elTime.textContent  = (elapsed / 1000).toFixed(1);
  }

  _tick() {
    const dir = Input.consume();
    this.snake.step(dir);

    if (this.snake.isWallCollision() || this.snake.isSelfCollision()) {
      this.survivalMs = performance.now() - this.startTime;
      this.gameOver = true;
      return;
    }

    const eaten = this.itemManager.checkHeadCollision(this.snake);
    if (eaten) {
      this.snake.scheduleGrowth(eaten);
    }

    this.snake.checkGrowth();
    this.enemyManager.update(TICK_MS);
  }
}
