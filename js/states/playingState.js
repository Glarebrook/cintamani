import { Input } from '../input/input.js';
import { Actions } from '../input/actions.js';
import { render as renderScene } from '../render/renderer.js';
import { renderPauseOverlay, renderTutorialPopup, renderChargeGauge } from '../render/overlays.js';
import { getWeaponIcon } from '../render/statusIcons.js';
import {
  checkWallCollision,
  runMechanicsTick,
  checkSelfCollision,
  checkEnemyHeadCollision,
  checkFoodPickup,
} from '../systems/collision.js';
import { ItemTypes } from '../content/items/index.js';
import { createProjectile } from '../entities/projectile.js';
import { chaserEnemy } from '../content/enemies/chaser.js';
import { CintamaniTypes } from '../content/cintamani/index.js';
import { matchesPattern } from '../algorithms/patternMatch.js';
import { setTouchActionButtons } from '../input/touchControls.js';
import {
  PROJECTILE_SPEED, PARTICLE_BURST_COUNT, PARTICLE_SPEED, PARTICLE_LIFE_MS, ENEMY_SCALE,
  SCORE_PER_SECOND, SCORE_PER_ITEM, SCORE_PER_KILL_CAPTURE, SCORE_PER_KILL_PROJECTILE,
  VENOM_UNLOCK_LENGTH, SCALE_WAVE_UNLOCK_CHASER_KILLS, SCALE_WAVE_CHARGE_MS, SCALE_WAVE_RANGE,
  SCALE_WAVE_FLASH_MS,
} from '../config/constants.js';
import { getSpeedLevel } from '../core/speedLevel.js';
import { getTotalScore, getScoreBreakdown } from '../core/score.js';

// 여의주(cintamani) 해금/보상/패턴 발동 - 매 틱 onTick()이 호출한다. world만 있으면 되고
// playingState의 다른 지역 상태(paused 등)는 필요 없어서 모듈 최상위 함수로 뺐다(테스트에서
// 직접 import해서 확인할 수 있도록 export도 함).
// 적 처치 지점마다 훅을 거는 대신, 이번 틱의 killsByType를 매번 다시 비교하는 폴링 방식이다 -
// 이렇게 하면 어떤 킬 경로(투사체/포획/여의주 스킬 자체로 죽인 것 포함)든 다음 틱에 자동으로
// 반영되고, content/cintamani/의 각 def 파일이 killsByType 갱신 시점을 직접 알 필요가 없다
// (순환 참조 방지 - red.js/blue.js는 이 레지스트리를 다시 import하지 않는다).
export function updateCintamani(world) {
  for (const def of CintamaniTypes.all()) {
    if (!world.stats.cintamaniUnlocked[def.id]) {
      const unlocked = Object.entries(def.requiredKills).every(
        ([enemyId, need]) => (world.stats.killsByType[enemyId] || 0) >= need
      );
      if (unlocked) {
        world.stats.cintamaniUnlocked[def.id] = true;
        // 해금된 바로 그 킬은 보상 카운트에 포함하지 않는다 - 해금 시점의 킬수를
        // 기준점으로 저장해두고, 이후 킬만 다음 보상으로 센다.
        world.stats.cintamaniRewardBaseline[def.id] = world.stats.killsByType[def.rewardEnemyId] || 0;
      }
    } else {
      const currentKills = world.stats.killsByType[def.rewardEnemyId] || 0;
      const progress = currentKills - world.stats.cintamaniRewardBaseline[def.id];
      if (progress >= def.rewardInterval) {
        const granted = Math.floor(progress / def.rewardInterval);
        world.stats.cintamani[def.id] += granted;
        world.stats.cintamaniRewardBaseline[def.id] += granted * def.rewardInterval;
      }
    }

    // 몸으로 패턴을 만든 "전환 순간"에만 1회 발동 - 계속 같은 모양을 유지하고 있어도
    // 매 틱 다시 발동하지 않는다(content/mechanics/encirclement.js의 "막 닫히는 순간에만
    // 포획 인정"과 같은 이유 - 우연히 계속 맞아있는 상태가 아니라 방금 만들어졌을 때만).
    const matched = world.stats.cintamaniUnlocked[def.id] && matchesPattern(
      def.pattern, world.snake.head.x, world.snake.head.y, world.snake.dir,
      (x, y) => world.snake.occupies(x, y)
    );
    const wasMatched = world.stats.cintamaniPatternMatched[def.id];
    world.stats.cintamaniPatternMatched[def.id] = matched;
    if (matched && !wasMatched && world.stats.cintamani[def.id] > 0) {
      world.stats.cintamani[def.id]--;
      def.activate(world);
    }
  }
}

// 이동 → 벽 → 포획 메커니즘 → 자기충돌(포획 시 눈감아줌) → 적충돌 → 먹이 → 성장 → 적 스폰 타이머,
// V1의 Game._tick() 순서를 그대로 유지한다. 순서를 바꾸면 포획 시 통과 동작이 깨진다.
export function createPlayingState({ world, hud, ctx, statusPanel }) {
  let pendingDirection = null;
  // 포획이 일어난 틱에 뱀 머리가 항상 몸과 정확히 겹치는 건 아니다 — 빈 칸으로 이동하며
  // 고리가 자연스럽게 닫히는 경우도 많다. 그래서 "봐주기"를 그 순간 한 틱으로 한정하지 않고,
  // 포획 이후 뱀이 자기 몸에서 완전히 벗어날 때까지(자기충돌이 안 나는 틱이 나올 때까지) 유지한다.
  let passThroughGrace = false;
  let paused = false;
  let pauseStartedAt = 0;
  // 잠금 해제 튜토리얼 팝업 - null이면 안 보이는 상태. { iconKey, iconColor, title, lines }면
  // render()가 renderTutorialPopup으로 그리고, 게임은 일시정지된다(아래 showTutorial 참고).
  // iconKey는 render() 시점마다 getWeaponIcon(iconKey)로 새로 조회한다(다른 아이콘들과 같은
  // "이미지는 로딩 완료 여부를 매번 다시 확인" 관례) - 튜토리얼이 뜬 순간 이미지가 아직 안
  // 실렸어도, 뜨는 동안 로딩이 끝나면 다음 프레임부터 바로 반영된다.
  let activeTutorial = null;
  // 비늘파동 충전 시작 시각(performance.now()) - null이면 충전 중이 아님.
  let chargeStartAt = null;

  // P 또는 ESC로 토글. 재개 시 멈춰있던 시간만큼 world.startTime을 뒤로 밀어서, 생존시간/점수
  // 계산(performance.now() - world.startTime 형태로 쓰는 die()의 survivalMs, render()의
  // survivalSeconds 등 모든 곳)이 일시정지 구간을 자동으로 빼고 계산되게 한다 - 한 곳만 고치면
  // 되고, 파생되는 모든 곳을 따로 손볼 필요가 없다.
  function togglePause() {
    if (activeTutorial) return; // 튜토리얼 팝업이 떠 있는 동안은 P/ESC로 별도 토글 안 함(팝업이 우선)
    if (paused) {
      world.startTime += performance.now() - pauseStartedAt;
      paused = false;
    } else {
      pauseStartedAt = performance.now();
      paused = true;
    }
  }

  // 잠금 해제 순간(길이 8 최초 도달, 3번적 처치 5스택) 게임을 멈추고 작은 팝업을 띄운다.
  // 예전엔 "아무 키나 눌러 닫기"(Actions.bindAny)였는데, 방향키를 눌렀다가 본인도 모르게
  // 팝업이 닫히고 넘어가버리는 문제가 있어서 Enter 키 전용으로 바꿨다 - 다른 키 입력(방향키
  // 등)은 이제 튜토리얼이 떠 있는 동안 아무 효과도 없다(paused가 true라 onTick/onFrame이
  // 그대로 멈춰있고, Enter만 dismissTutorial에 바인딩돼 있음).
  function showTutorial({ iconKey, iconColor, title, lines }) {
    activeTutorial = { iconKey, iconColor, title, lines };
    pauseStartedAt = performance.now();
    paused = true;
    Actions.bind('Enter', dismissTutorial);
  }

  function dismissTutorial() {
    activeTutorial = null;
    world.startTime += performance.now() - pauseStartedAt;
    paused = false;
    Actions.unbind('Enter');
  }

  // 적 하나를 처치 처리할 때 항상 같이 붙는 보상들(파티클/점수/팝업/타입별 킬 스택 증가) -
  // 포획(onCaptured)과 비늘파동(onDefeated, "피해로 죽인" 갈래) 두 곳에서 공통으로 쓴다.
  // 투사체 처치는 managers/projectileManager.js에 이미 자기 모듈로 따로 있어 안 건드린다.
  function grantKillReward(enemy, scoreAmount) {
    world.particleManager.spawnBurst({
      x: enemy.x, y: enemy.y, color: enemy.typeDef.color,
      count: PARTICLE_BURST_COUNT, speed: PARTICLE_SPEED, life: PARTICLE_LIFE_MS,
    });
    world.stats.killScore += scoreAmount;
    world.scorePopupManager.spawn(enemy.x, enemy.y, scoreAmount);
    const typeId = enemy.typeDef.id;
    world.stats.killsByType[typeId] = (world.stats.killsByType[typeId] || 0) + 1;
  }

  function fire() {
    if (paused || !world.stats.venomUnlocked) return;
    const head = world.snake.head;
    const dir = pendingDirection || world.snake.dir || { x: 1, y: 0 };
    world.projectileManager.spawn(createProjectile({
      x: head.x,
      y: head.y,
      dir,
      speed: PROJECTILE_SPEED,
      damage: world.stats.attackDamage,
      color: '#f5d742',
    }));
  }

  // 뱀 몸 각 칸을 기준으로 상/하/좌/우 SCALE_WAVE_RANGE칸까지(십자 모양) 하얗게 번쩍이며,
  // 그 범위와 겹치는 적에게 즉시 world.stats.scaleWaveDamage만큼 피해를 준다 - attackUp.js가
  // 이 값을 영구 증가시키므로(독침의 world.stats.attackDamage와 같은 방식), 상수
  // SCALE_WAVE_DAMAGE를 직접 쓰지 않고 world.stats를 거친다(world.stats.scaleWaveDamage의
  // 초기값은 game.js의 world.reset()이 SCALE_WAVE_DAMAGE로 세팅).
  function fireScaleWave() {
    const cellsSet = new Set();
    const cells = [];
    function addCell(x, y) {
      const key = `${x},${y}`;
      if (cellsSet.has(key)) return;
      cellsSet.add(key);
      cells.push({ x, y });
    }
    for (const seg of world.snake.segments) {
      for (let d = -SCALE_WAVE_RANGE; d <= SCALE_WAVE_RANGE; d++) {
        addCell(seg.x + d, seg.y);
        addCell(seg.x, seg.y + d);
      }
    }

    // 적이 그려지는 전체 박스(ENEMY_SCALE x ENEMY_SCALE)가 범위와 하나라도 겹치면 맞은 것으로
    // 친다 - managers/enemyManager.js의 checkHeadCollision과 같은 원칙(그려지는 것보다 작은
    // 판정 범위는 "가끔 안 맞는 것처럼" 느껴진다).
    const half = Math.floor((ENEMY_SCALE - 1) / 2);
    const hitEnemies = world.enemyManager.enemies.filter(enemy => {
      for (let ex = enemy.x - half; ex <= enemy.x + half; ex++) {
        for (let ey = enemy.y - half; ey <= enemy.y + half; ey++) {
          if (cellsSet.has(`${ex},${ey}`)) return true;
        }
      }
      return false;
    });

    for (const enemy of hitEnemies) {
      const shouldRemove = world.enemyManager.applyProjectileHit(enemy, world.stats.scaleWaveDamage);
      if (!shouldRemove) continue;
      world.enemyManager.enemies.splice(world.enemyManager.enemies.indexOf(enemy), 1);
      enemy.typeDef.onDefeated?.(world, enemy);
      grantKillReward(enemy, SCORE_PER_KILL_PROJECTILE);
    }

    world.scaleWaveEffect = { cells, expiresAt: performance.now() + SCALE_WAVE_FLASH_MS };
  }

  // 독침이 아직 안 풀렸으면 스페이스바는 아무것도 안 한다. 풀렸는데 비늘파동은 아직이면
  // 눌렀다 떼는 즉시 발사(예전과 동일). 비늘파동까지 풀렸으면 누르는 순간부터 충전을 시작하고,
  // 실제 발사(비늘파동 vs 독침)는 뗄 때 충전 시간을 보고 결정한다(onSpaceUp).
  function onSpaceDown(e) {
    if (e.key !== ' ' && e.code !== 'Space') return;
    e.preventDefault();
    if (paused || !world.stats.venomUnlocked) return;
    if (!world.stats.scaleWaveUnlocked) {
      // 키를 누르고 있으면 OS가 keydown을 계속 자동반복해서 보낸다(e.repeat: true) - 여기서
      // 걸러내지 않으면 스페이스바를 누르고 있는 동안 독침이 연사돼버린다(실제 신고된 문제).
      // 처음 눌린 순간(e.repeat이 false/undefined)에만 한 발 나가고, 다시 쏘려면 떼었다 눌러야 한다.
      if (e.repeat) return;
      fire();
      return;
    }
    if (chargeStartAt !== null) return; // 키보드 자동반복 keydown - 이미 충전 중이면 무시
    chargeStartAt = performance.now();
  }

  function onSpaceUp(e) {
    if (e.key !== ' ' && e.code !== 'Space') return;
    e.preventDefault();
    if (chargeStartAt === null) return;
    const heldMs = performance.now() - chargeStartAt;
    chargeStartAt = null;
    if (paused) return; // 충전 중 일시정지/튜토리얼이 끼어들었으면 발사 취소
    if (heldMs >= SCALE_WAVE_CHARGE_MS) {
      fireScaleWave();
    } else {
      fire(); // 완전 충전 전에 뗐으면 평소처럼 독침 한 발
    }
  }

  // 테스트 모드 전용 디버그 단축키(1/2/3) - 몸으로 패턴을 직접 만들지 않아도 즉시 해당 여의주
  // 스킬을 발동해서 빠르게 확인해볼 수 있게 한다. 정상 발동 경로(updateCintamani)와 달리
  // 재고 소비나 cintamaniPatternMatched 갱신을 건드리지 않는다 - 순수 디버그 트리거라 정상
  // 발동 로직의 상태와 섞이면 안 된다. green처럼 아직 등록 안 된 색상은 조용히 무시한다.
  function triggerCintamaniDebug(colorId) {
    if (paused) return;
    const def = CintamaniTypes.get(colorId);
    if (!def) return;
    def.activate(world);
  }

  function die() {
    // scoreBreakdown은 죽는 바로 그 순간의 스냅샷 - survivalMs와 같은 이유로 payload에 담아
    // 넘긴다(가짜 리더보드 이름 입력 화면이 나중에 world.stats를 다시 읽어서 계산하면, 이미
    // gameOver로 넘어간 뒤 world.reset()이 다시 불렸을 때 엉뚱한 값을 보여줄 수 있다).
    world.eventBus.emit('playerDied', {
      survivalMs: performance.now() - world.startTime,
      scoreBreakdown: getScoreBreakdown(world),
    });
  }

  return {
    enter() {
      // Input은 world와 무관한 싱글턴이라 world.reset()으로 안 지워진다 - 이전 판(게임오버
      // 화면 등)에서 무심코 눌러둔 방향키가 새 판 시작과 동시에 그대로 적용되는 걸 막는다.
      Input.reset();
      pendingDirection = null;
      passThroughGrace = false;
      paused = false;
      activeTutorial = null;
      chargeStartAt = null;
      // 타이틀/리더보드 열람 화면에서 합쳐 보였던 게임 캔버스/상태창을 실제 플레이 중엔
      // 다시 구분해서 보여준다(render/statusPanel.js의 setMerged 참고).
      statusPanel.setMerged(false);
      // Space는 Actions.bind가 아니라 여기서 직접 keydown/keyup을 둘 다 받는다 - 비늘파동의
      // "누르고 있는 시간" 충전 판정에는 keyup(뗀 시점)이 꼭 필요한데, Actions는 keydown 한 번만
      // 다루는 단순 바인딩이라 이 용도에 안 맞는다(다른 키들은 여전히 Actions로 충분함).
      window.addEventListener('keydown', onSpaceDown);
      window.addEventListener('keyup', onSpaceUp);
      Actions.bind('p', togglePause);
      Actions.bind('Escape', togglePause);
      // 1/2/3 여의주 디버그 단축키 - 테스트 모드에서만 활성화(실제 플레이에서 스킬을
      // 공짜로 즉시 발동시킬 수 있으면 안 되므로).
      if (world.testMode) {
        Actions.bind('1', () => triggerCintamaniDebug('red'));
        Actions.bind('2', () => triggerCintamaniDebug('blue'));
        Actions.bind('3', () => triggerCintamaniDebug('green'));
      }
      // 모바일 터치 오버레이 - 플레이 중엔 T/L이 필요 없어지고 대신 ENTER(튜토리얼 팝업
      // 닫기)/SPACE(무기)/P(일시정지)가 필요해진다.
      setTouchActionButtons(['touch-enter', 'touch-space', 'touch-p']);
    },
    exit() {
      window.removeEventListener('keydown', onSpaceDown);
      window.removeEventListener('keyup', onSpaceUp);
      Actions.unbind('p');
      Actions.unbind('Escape');
      Actions.unbind('Enter'); // 튜토리얼이 떠 있는 채로 상태를 벗어나는 경우를 대비한 방어적 정리
      Actions.unbind('1');
      Actions.unbind('2');
      Actions.unbind('3');
    },

    onFrame(dt) {
      if (paused) return; // 발사체 이동/타이머/충돌 판정 등 프레임 단위 로직을 전부 멈춘다
      // 생존 점수는 매 프레임 dt만큼씩 조금씩 더해서, 화면에 부드럽게 계속 올라가는 것처럼 보이게 한다.
      world.stats.survivalScore += SCORE_PER_SECOND * (dt / 1000);
      world.itemManager.ensureFood(world.snake, world.enemyManager);
      world.itemManager.update(dt, world.snake, world.enemyManager);
      const { headHit } = world.projectileManager.update(dt, world);
      world.particleManager.update(dt);
      world.scorePopupManager.update(dt);
      world.snake.updateFlash(dt);
      world.enemyManager.updateMovement(dt, world);
      world.enemyManager.updateAbilities(dt, world);
      // 여의주 스킬 중 지속형 효과(blue의 10초짜리 비 등) 갱신 - tickEffect가 없는 def(red 등,
      // 즉발형)는 그냥 건너뛴다. enemyManager의 ability 훅과 같은 "옵션 훅, 있으면 매 프레임 호출"
      // 패턴.
      for (const def of CintamaniTypes.all()) {
        def.tickEffect?.(world, dt);
      }
      // 적 발사체에 머리를 맞는 건 onTick의 충돌 순서와 무관하게 어느 프레임에서든 일어날 수
      // 있는 별개의 사건이라, onTick을 기다리지 않고 여기서 바로 die() 처리한다.
      if (headHit) return die();
      // 스스로 움직이는 적(chaser/hunter)은 위치가 매 프레임 바뀌는데, 충돌 판정은 원래
      // onTick에서만(뱀 틱마다 한 번) 확인했다 — 적의 이동 간격이 뱀의 틱 간격보다 짧으면
      // (예: chaser 추격 중 60ms), 적이 머리 칸을 지나가는 순간이 두 틱 판정 사이에 끼어서
      // 화면상으론 겹쳤는데도 게임오버가 안 되는 것처럼 보일 수 있다. 그래서 이동 갱신
      // 직후 여기서도 같은 판정을 한 번 더 돌린다 — onTick의 판정(머리가 적 쪽으로 움직여
      // 들어가는 경우)과 서로 다른 경우를 잡아내는 상호 보완 관계라 중복이 아니다.
      if (checkEnemyHeadCollision(world)) return die();
    },

    onTick() {
      if (paused) return; // 이동/충돌/스폰 타이머 등 틱 단위 로직을 전부 멈춘다
      const dir = Input.consume();
      if (dir) pendingDirection = dir;

      const moveDir = pendingDirection || { x: 1, y: 0 };
      world.snake.step(moveDir);

      if (checkWallCollision(world)) return die();

      const mechanicResults = runMechanicsTick(world);
      const capturedIds = Object.values(mechanicResults).flatMap(result => result.capturedIds || []);
      const capturedThisTick = capturedIds.length > 0;

      const self = checkSelfCollision(world, mechanicResults);
      if (self.collided) {
        if (!self.forgiven && !passThroughGrace) return die();
        passThroughGrace = true; // 아직 몸 안에 있을 수 있으니 다음 틱에도 통과 허용 유지
      } else {
        passThroughGrace = capturedThisTick; // 방금 막 포획됐다면(충돌 없이) 다음 틱까지는 통과 여지를 남겨둠
      }

      if (capturedIds.length) {
        const removed = world.enemyManager.removeByIds(capturedIds);
        for (const enemy of removed) {
          enemy.typeDef.onCaptured?.(world, enemy);
          grantKillReward(enemy, SCORE_PER_KILL_CAPTURE);
        }
      }

      if (checkEnemyHeadCollision(world)) return die();

      const eaten = checkFoodPickup(world);
      if (eaten) {
        const def = ItemTypes.get(eaten.type);
        def.onPickup(world, eaten);
        world.snake.startFlash(def.color);
        world.stats.itemScore += SCORE_PER_ITEM;
        world.scorePopupManager.spawn(eaten.x, eaten.y, SCORE_PER_ITEM);
      }

      world.snake.checkGrowth();
      world.stats.maxLength = Math.max(world.stats.maxLength, world.snake.segments.length);
      world.stats.maxSpeedLevel = Math.max(world.stats.maxSpeedLevel, getSpeedLevel(world.stats.tickMs));
      world.enemyManager.update(world.stats.tickMs, world);

      // 무기 잠금 해제 확인 - 이번 판에서 처음 조건을 만족한 순간에만 한 번 튜토리얼을 띄운다.
      // else if로 묶어서 한 틱에 팝업이 두 개 겹쳐 뜨는 일은 없게 한다(다음 틱에 이어서 뜸).
      // 테스트 모드(world.testMode)는 시작 길이가 이미 임계값(40 >= 8)을 넘어있어서, 튜토리얼을
      // 그대로 띄우면 시작하자마자 멈춰버린다 - 리더보드를 건너뛰는 것과 같은 이유로 잠금 해제
      // 자체는 그대로 되게 하되(테스트 목적이니 무기는 써봐야 함) 팝업/일시정지만 생략한다.
      if (!world.stats.venomUnlocked && world.snake.segments.length >= VENOM_UNLOCK_LENGTH) {
        world.stats.venomUnlocked = true;
        if (!world.testMode) {
          showTutorial({
            iconKey: 'venom',
            iconColor: '#f5d742',
            title: '이무기가 독침발사를 배웠다!',
            lines: ['Space Bar를 한 번 눌러', '독침을 발사할 수 있습니다'],
          });
        }
      } else if (
        !world.stats.scaleWaveUnlocked && world.stats.venomUnlocked
        && (world.stats.killsByType[chaserEnemy.id] || 0) >= SCALE_WAVE_UNLOCK_CHASER_KILLS
      ) {
        world.stats.scaleWaveUnlocked = true;
        if (!world.testMode) {
          showTutorial({
            iconKey: 'scaleWave',
            iconColor: '#ffffff',
            title: '이무기가 비늘파동을 배웠다!',
            lines: [
              'Space Bar를 누르고 있으면 게이지를 충전할 수 있고,',
              '게이지 충전 후 손을 떼면 비늘파동을 발사할 수 있습니다',
            ],
          });
        }
      }

      updateCintamani(world);
    },

    render() {
      renderScene(ctx, world);
      // 일시정지/튜토리얼 중엔 pauseStartedAt(멈춘 시점)을 기준으로 고정해서, 화면에 보이는
      // 생존시간이 실제 시간 따라 계속 올라가지 않게 한다 - 재개하면 startTime이 그만큼
      // 밀리면서(togglePause/dismissTutorial 참고) 자연스럽게 이어진다.
      const nowRef = paused ? pauseStartedAt : performance.now();
      hud.update({
        size: world.snake.segments.length,
        attack: world.stats.attackDamage,
        snakeSpeed: world.stats.tickMs,
        survivalSeconds: (nowRef - world.startTime) / 1000,
        score: getTotalScore(world),
      });
      statusPanel.render(world);

      if (chargeStartAt !== null) {
        const ratio = (performance.now() - chargeStartAt) / SCALE_WAVE_CHARGE_MS;
        renderChargeGauge(ctx, world.snake.head.x, world.snake.head.y, ratio, ratio >= 1);
      }

      if (activeTutorial) {
        renderTutorialPopup(ctx, {
          icon: activeTutorial.iconKey ? getWeaponIcon(activeTutorial.iconKey) : null,
          iconColor: activeTutorial.iconColor,
          title: activeTutorial.title,
          lines: activeTutorial.lines,
        });
        statusPanel.renderDimOverlay();
      } else if (paused) {
        renderPauseOverlay(ctx);
        statusPanel.renderDimOverlay();
      }
    },
  };
}
