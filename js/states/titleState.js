import { Actions } from '../input/actions.js';
import { renderTitleScreen } from '../render/overlays.js';

// world가 아직 시작 전인 화면 — Enter(기본 모드)/T(테스트 모드)로 시작하거나, L로 플레이 없이
// 순위표만 열람할 수 있다. onStart({ testMode })를 호출해 game.js가 어떤 모드로
// world.reset()할지 알려주고, onViewLeaderboard()는 별도로 leaderboardView 상태로 보낸다.
export function createTitleState({ ctx, statusPanel, onStart, onViewLeaderboard }) {
  return {
    enter() {
      // 게임 캔버스와 상태창 캔버스 사이 경계를 없애 하나의 화면처럼 보이게 한다 -
      // playingState/gameOverState의 enter()가 실제 플레이 중엔 다시 false로 되돌린다.
      statusPanel.setMerged(true);
      Actions.bind('Enter', () => onStart({ testMode: false }));
      Actions.bind('t', () => onStart({ testMode: true }));
      Actions.bind('l', onViewLeaderboard);
    },
    exit() {
      Actions.unbind('Enter');
      Actions.unbind('t');
      Actions.unbind('l');
    },

    onFrame() {},
    onTick() {},

    render() {
      renderTitleScreen(ctx);
      statusPanel.renderBlank();
    },
  };
}
