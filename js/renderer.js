const Renderer = (() => {
  const COLOR = {
    bg:   '#111111',
    head: '#dd3322',
    body: '#ffffff',
    food: '#44dd44',
  };

  function render(ctx, snake, itemManager, enemyManager) {
    const C = CELL_SIZE;

    // 배경
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, GRID_W * C, GRID_H * C);

    // 먹이
    if (itemManager.food) {
      ctx.fillStyle = COLOR.food;
      ctx.fillRect(itemManager.food.x * C, itemManager.food.y * C, C, C);
    }

    // 뱀-몸 (꼬리부터 그려서 머리가 위에 오도록)
    ctx.fillStyle = COLOR.body;
    for (let i = snake.segments.length - 1; i >= 1; i--) {
      const s = snake.segments[i];
      ctx.fillRect(s.x * C, s.y * C, C, C);
    }

    // 뱀-머리
    ctx.fillStyle = COLOR.head;
    ctx.fillRect(snake.head.x * C, snake.head.y * C, C, C);

    // 적
    enemyManager.render(ctx);
  }

  function renderGameOver(ctx) {
    const cw = GRID_W * CELL_SIZE;
    const ch = GRID_H * CELL_SIZE;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(ch * 0.06)}px monospace`;
    ctx.fillText('GAME OVER', cw / 2, ch / 2 - ch * 0.05);
    ctx.font = `${Math.floor(ch * 0.03)}px monospace`;
    ctx.fillText('Press Enter to restart', cw / 2, ch / 2 + ch * 0.05);
  }

  return { render, renderGameOver };
})();
