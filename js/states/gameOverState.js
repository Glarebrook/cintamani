import { Actions } from '../input/actions.js';
import { render as renderScene } from '../render/renderer.js';
import { renderGameOverOverlay } from '../render/overlays.js';
import { TICK_MS, PROJECTILE_DAMAGE } from '../config/constants.js';

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
        speed: TICK_MS,
        attack: PROJECTILE_DAMAGE,
        snakeSpeed: TICK_MS,
        survivalSeconds: survivalMs / 1000,
      });
    },
  };
}
