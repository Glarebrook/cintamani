import { createScorePopup, updateScorePopup } from '../entities/scorePopup.js';
import { SCORE_POPUP_LIFE_MS, SCORE_POPUP_RISE_SPEED } from '../config/constants.js';

// managers/particleManager.js와 같은 모양의 매니저 - render()는 여기 없고 render/layers.js의
// scorePopupLayer가 world.scorePopupManager.popups를 직접 읽어서 그린다(파티클과 같은 관례).
export function createScorePopupManager() {
  let popups = [];

  return {
    get popups() { return popups; },

    // 아이템 섭취/적 처치 지점에서 호출 - "+20"처럼 얻은 점수를 그 위치에 잠깐 띄운다.
    spawn(x, y, amount) {
      popups.push(createScorePopup({
        x, y, text: `+${amount}`, life: SCORE_POPUP_LIFE_MS, riseSpeed: SCORE_POPUP_RISE_SPEED,
      }));
    },

    update(dt) {
      const dtSeconds = dt / 1000;
      for (const popup of popups) {
        updateScorePopup(popup, dtSeconds);
      }
      popups = popups.filter(popup => popup.life > 0);
    },
  };
}
