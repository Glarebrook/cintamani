import { Actions } from '../input/actions.js';
import { renderTitleScreen } from '../render/overlays.js';

// world가 아직 시작 전인 화면 — 아무 키나 누르면 onStart로 플레이를 시작한다.
export function createTitleState({ ctx, onStart }) {
  return {
    enter() {
      Actions.bindAny(onStart);
    },
    exit() {
      Actions.unbindAny();
    },

    onFrame() {},
    onTick() {},

    render() {
      renderTitleScreen(ctx);
    },
  };
}
