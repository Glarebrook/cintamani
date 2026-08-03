import { Actions } from '../input/actions.js';
import { renderTestBuildSelectScreen } from '../render/overlays.js';
import { setTouchActionButtons } from '../input/touchControls.js';
import { TEST_BUILDS } from '../config/testBuilds.js';

// 타이틀에서 T를 누르면 곧바로 테스트 모드로 들어가는 대신 거치는 중간 화면 - 밸런스 실험용
// "빌드"(config/testBuilds.js) 중 하나를 숫자키(1, 2, 3...)로 골라 테스트 모드를 시작하거나,
// Esc로 타이틀로 되돌아간다. onSelect(build)가 실제 world.reset({testMode:true, buildId})와
// playing 전환까지 담당한다(game.js) - 이 상태는 화면 표시와 키 바인딩만 맡는다.
export function createTestBuildSelectState({ ctx, statusPanel, onSelect, onBack }) {
  return {
    enter() {
      // titleState와 같은 이유 - 게임 캔버스와 상태창 캔버스를 하나의 화면처럼 보이게 한다.
      statusPanel.setMerged(true);
      TEST_BUILDS.forEach((build, i) => {
        Actions.bind(String(i + 1), () => onSelect(build));
      });
      Actions.bind('Escape', onBack);
      // touch-1/2/3은 이미 존재하는 버튼(원래 인게임 여의주 디버그용)을 그대로 재사용한다 -
      // 이 화면에선 빌드 선택 숫자키로 의미가 바뀐다. 지금 TEST_BUILDS가 3개뿐이라 딱 맞는다.
      setTouchActionButtons(['touch-1', 'touch-2', 'touch-3']);
    },
    exit() {
      TEST_BUILDS.forEach((_, i) => Actions.unbind(String(i + 1)));
      Actions.unbind('Escape');
    },

    onFrame() {},
    onTick() {},

    render() {
      renderTestBuildSelectScreen(ctx, TEST_BUILDS);
      statusPanel.renderBlank();
    },
  };
}
