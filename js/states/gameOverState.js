import { Actions } from '../input/actions.js';
import { render as renderScene } from '../render/renderer.js';
import { renderGameOverOverlay } from '../render/overlays.js';

export function createGameOverState({ world, ctx, hud, onRestart }) {
  let survivalMs = 0;

  return {
    enter(payload) {
      survivalMs = payload?.survivalMs ?? 0;
      Actions.bind('Enter', onRestart);
    },
    exit() {
      Actions.unbind('Enter');
    },

    onFrame() {},
    onTick() {},

    render() {
      renderScene(ctx, world);
      renderGameOverOverlay(ctx);
      hud.update({
        size: world.snake.segments.length,
        attack: world.stats.attackDamage,
        snakeSpeed: world.stats.tickMs,
        survivalSeconds: survivalMs / 1000,
      });
    },
  };
}
