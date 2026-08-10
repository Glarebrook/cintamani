// 테스트 모드 "빌드 선택" 화면(states/testBuildSelectState.js)에서 고를 수 있는 실험 후보
// 목록 - patchNotes.js와 같은 정신으로, 새 실험을 추가하려면 이 배열에 항목 하나만 추가하면
// 된다. 테스트 모드의 공통 기본값(시작 길이 TEST_MODE_INITIAL_LENGTH, 속도
// TEST_MODE_TICK_MS, 1/2/3 여의주 디버그 키 등)은 모든 빌드에서 그대로 유지되고, 여기 적은
// overrides만 그 위에 한 번 더 덮어써진다(game.js의 world.reset 참고) - "baseline"처럼
// overrides가 비어 있으면 순수 테스트 모드 기본값 그대로 플레이하게 된다.
//
// - statsOverrides: world.stats의 필드를 덮어쓴다(예: 몹 생성 간격) - 키 이름이
//   world.stats의 실제 필드 이름과 정확히 일치해야 한다.
// - viewportOverrides: 화면 배율/시야(core/viewportConfig.js가 관리)를 덮어쓴다. 캔버스
//   실제 픽셀 크기(main.js가 페이지 로딩 시 한 번 고정하는 값, 현재 768x576)는 안 바뀌므로,
//   여기 넣는 값은 항상 viewportCols*8*cameraZoom === 768, viewportRows*8*cameraZoom === 576이
//   되도록 맞춰야 한다(core/viewportConfig.js 참고) - 안 맞으면 캔버스 크기와 그려지는 필드
//   범위가 어긋나 보인다.
export const TEST_BUILDS = [
  {
    id: 'baseline',
    version: '기본값',
    description: '실험 없이 테스트 모드 기본값 그대로',
    statsOverrides: {},
    viewportOverrides: {},
  },
  {
    id: 'capture-on-collision',
    version: '실험: 충돌해야 포획',
    description: '몸으로 감싸기만 해서는 적이 안 사라짐. 감싼 상태를 유지한 채 머리가 실제로 몸통에 부딪히는 순간에만 적이 사라지고 무적이 시작됨(그 조건이 아니면 그대로 게임오버) - 포획 순간부터 3틱 동안은 고리 안 어디를 밟든 무적 유지',
    statsOverrides: {
      captureRequiresCollision: true,
      passThroughGraceTicks: 3,
    },
    viewportOverrides: {},
  },
];
