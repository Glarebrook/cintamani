import { Actions } from '../input/actions.js';
import { renderLeaderboardViewBackground } from '../render/overlays.js';
import { fetchLeaderboard } from '../services/leaderboardApi.js';
import { setTouchActionButtons } from '../input/touchControls.js';

// 타이틀 화면에서 L로 진입하는, 플레이 없이 순위표만 보는 화면. gameOverState의 결과
// 단계와 시각적으로 동일해서(폼 숨김 + 목록 + "ENTER - 타이틀로") panel.showResultPhase를
// 그대로 재사용한다 - mineIndex는 없으므로 항상 -1.
export function createLeaderboardViewState({ ctx, statusPanel, panel, onBack }) {
  // gameOverState와 같은 이유의 세대 가드 - enter 도중(GET 응답 전) exit되면
  // 뒤늦은 응답이 이미 떠난 화면을 건드리면 안 된다.
  let generation = 0;

  return {
    async enter() {
      generation++;
      const myGeneration = generation;
      // titleState와 같은 이유 - 게임 캔버스와 상태창 캔버스를 하나의 화면처럼 보이게 한다.
      statusPanel.setMerged(true);
      panel.show();
      Actions.bind('Enter', onBack);
      // 모바일 터치 오버레이 - 순위표 열람 화면에선 ENTER(타이틀로 복귀)만 의미가 있다.
      setTouchActionButtons(['touch-enter']);

      const result = await fetchLeaderboard();
      if (myGeneration !== generation) return;
      panel.showResultPhase(result.ok ? result.entries : [], -1);
    },
    exit() {
      generation++;
      Actions.unbind('Enter');
      panel.hide();
    },

    onFrame() {},
    onTick() {},

    render() {
      renderLeaderboardViewBackground(ctx);
      statusPanel.renderBlank();
    },
  };
}
