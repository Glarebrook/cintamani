import { Actions } from '../input/actions.js';
import { renderTitleScreen } from '../render/overlays.js';

// world가 아직 시작 전인 화면 — Enter(기본 모드) 또는 T(테스트 모드) 중 하나로 시작한다.
// onStart({ testMode })를 호출해 game.js가 어떤 모드로 world.reset()할지 알려준다.
export function createTitleState({ ctx, onStart }) {
  return {
    enter() {
      Actions.bind('Enter', () => onStart({ testMode: false }));
      Actions.bind('t', () => onStart({ testMode: true }));
    },
    exit() {
      Actions.unbind('Enter');
      Actions.unbind('t');
    },

    onFrame() {},
    onTick() {},

    render() {
      renderTitleScreen(ctx);
    },
  };
}
