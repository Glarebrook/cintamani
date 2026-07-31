import { Actions } from '../input/actions.js';
import { render as renderScene } from '../render/renderer.js';
import { renderGameOverOverlay } from '../render/overlays.js';
import { fetchLeaderboard, submitScore } from '../services/leaderboardApi.js';
import { getTotalScore } from '../core/score.js';
import { setTouchActionButtons } from '../input/touchControls.js';

export function createGameOverState({ world, ctx, hud, statusPanel, panel, onRestart }) {
  let survivalMs = 0;
  let scoreBreakdown = null;
  let lastEntries = [];
  // enter()/exit()마다 증가시켜, 늦게 도착한 이전 회차의 fetch/submit 응답이
  // 이미 새로 시작된 회차의 패널 상태를 덮어쓰지 않도록 막는다.
  let generation = 0;
  // 'entry'(이름 입력 중) -> 'result'(등록/건너뛰기 완료, ENTER로 타이틀 복귀 가능).
  // fetch/submit 응답이 늦게 와서 이미 넘어간 phase를 되돌리지 않도록 아래 두 await 이후에서 확인한다 -
  // 예: 사용자가 응답을 기다리지 않고 바로 '건너뛰기'를 눌렀는데, 그 후에야 로딩이 끝나서
  // 입력 화면으로 되돌아가 버리는 것을 방지.
  let phase = 'entry';

  function finish(entries, mineIndex) {
    phase = 'result';
    panel.showResultPhase(entries, mineIndex);
    Actions.bind('Enter', onRestart);
  }

  function handleSkip() {
    if (phase !== 'entry') return;
    finish(lastEntries, -1);
  }

  // 이름 없이(빈 칸인 채로) ENTER/등록을 누르면 '익명'으로 대신 제출하는 게 아니라,
  // 건너뛰기와 완전히 동일하게 아예 제출 자체를 하지 않는다.
  async function handleSubmit(rawName) {
    if (!rawName) {
      handleSkip();
      return;
    }
    const myGeneration = generation;
    const score = scoreBreakdown?.total ?? 0;
    const result = await submitScore(rawName, survivalMs, score);
    if (myGeneration !== generation || phase !== 'entry') return;
    if (result.ok) {
      const mineIndex = result.entries.findIndex(e => e.name === rawName && e.score === score);
      finish(result.entries, mineIndex);
    } else {
      finish(lastEntries, -1);
    }
  }

  panel.setHandlers({ onSubmit: handleSubmit, onSkip: handleSkip });

  return {
    async enter(payload) {
      generation++;
      const myGeneration = generation;
      phase = 'entry';
      survivalMs = payload?.survivalMs ?? 0;
      scoreBreakdown = payload?.scoreBreakdown ?? null;
      // gameOver는 항상 playing 다음에만 오므로(title -> playing -> gameOver -> title) 이미
      // false겠지만, 다른 상태에 이 값이 뭔지 의존하지 않고 각 상태가 스스로 보장하게 한다.
      statusPanel.setMerged(false);
      // 모바일 터치 오버레이 - 게임오버 화면에선 ENTER(재시작/등록 후 복귀)만 의미가 있다.
      setTouchActionButtons(['touch-enter']);

      // 테스트 모드(타이틀의 T)로 진행한 판은 공유 리더보드에 올리지 않는다 - 길이/속도를
      // 인위적으로 올려 시작한 판이라 정상 플레이 기록과 섞이면 순위표 의미가 없어진다.
      // 이름 입력 패널을 아예 띄우지 않고, 예전처럼 곧바로 ENTER로 타이틀 복귀만 가능하게 한다.
      if (world.testMode) {
        panel.hide();
        Actions.bind('Enter', onRestart);
        return;
      }

      panel.show();
      const result = await fetchLeaderboard();
      if (myGeneration !== generation || phase !== 'entry') return;
      lastEntries = result.ok ? result.entries : [];
      panel.showEntryPhase(lastEntries, survivalMs, scoreBreakdown);
    },
    exit() {
      generation++;
      Actions.unbind('Enter');
      panel.hide();
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
        score: getTotalScore(world),
      });
      statusPanel.render(world);
    },
  };
}
