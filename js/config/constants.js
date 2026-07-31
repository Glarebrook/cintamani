export const CELL_SIZE = 8;      // 격자 1칸 = 8픽셀 (정사각형 보장)
export const GRID_W   = 100;     // 필드 가로 격자 수
export const GRID_H   = 40;      // 필드 세로 격자 수
export const STATUS_PANEL_HEIGHT = 80; // 하단 상태창 캔버스 높이(px) - 너비는 게임 캔버스와 동일(GRID_W*CELL_SIZE). 아이콘을 가로로 한 줄 배치로 바꾸면서 세로 여백이 남아 100에서 축소
export const TICK_MS  = 120;     // 뱀 이동 간격 (ms)
export const SNAKE_INITIAL_LENGTH = 3; // 기본 모드 시작 길이
export const TEST_MODE_INITIAL_LENGTH = 40; // 테스트 모드 시작 길이
export const TEST_MODE_TICK_MS = 70; // 테스트 모드 시작 이동 간격 (ms)
export const FOOD_SPAWN_MIN_MS = 3000; // 무작위 먹이 등장 최소 간격(ms) - 매번 재추첨
export const FOOD_SPAWN_MAX_MS = 7000; // 무작위 먹이 등장 최대 간격(ms)
export const FOOD_MAX_COUNT = 5; // 무작위 타이머로 유지되는 화면 최대 먹이 수 - 처치/포획 보상 스폰은 이 상한과 무관
export const FOOD_BASE_GROWTH = 1; // 기본(초록) 먹이 1개당 성장 칸 수 — 다른 먹이의 배율 계산 기준
export const FOOD_SPEED_DELTA_MS = 5; // 노랑/갈색 먹이가 뱀 이동 간격(ms)을 바꾸는 양
export const MIN_TICK_MS = 40; // 속도 먹이를 아무리 먹어도 이동 간격이 이 아래로는 안 내려감
export const MAX_TICK_MS = 200; // 속도 먹이를 아무리 먹어도 이동 간격이 이 위로는 안 올라감
export const ATTACK_UP_DELTA = 1; // 주황 먹이 1개당 독침(투사체) 공격력 증가량
export const ATTACK_UP_SCALE_WAVE_DELTA = 3; // 주황 먹이 1개당 비늘파동 공격력 증가량 - 독침(ATTACK_UP_DELTA)과 별도 수치
export const ENEMY_SPAWN_MIN_MS = 3000; // 적 최소 생성 간격 (ms)
export const ENEMY_SPAWN_MAX_MS = 7000; // 적 최대 생성 간격 (ms)
// 필드에 이 수 이하로 있을 때는 생성 속도에 영향 없음 - 이 수를 "초과"하는 순간부터(4마리째부터)
// 매 초과 마리당 생성 간격이 ENEMY_SPAWN_SLOWDOWN_FACTOR배씩 지수적으로 늘어난다. 예전에는
// 이 수에 도달하면 생성 자체가 완전히 멈추는 하드 캡이었지만, 그러면 오래 버틴 판이 "적 없는
// 무한 안전지대"가 돼버려서 - 생성을 막지 않고 대신 점점 드물어지게만 바꿨다(enemyManager.js
// _randomSpawnDelay 참고).
export const ENEMY_SPAWN_SLOWDOWN_THRESHOLD = 3;
export const ENEMY_SPAWN_SLOWDOWN_FACTOR = 2; // 임계치 초과 1마리당 생성 간격 배율
export const ENEMY_MIN_SPAWN_DISTANCE_FROM_HEAD = 8; // 적이 뱀 머리로부터 이 칸(체비셰프 거리) 이상 떨어진 곳에만 생성됨 - 너무 가까이 생성돼 반응할 틈 없이 죽는 것 방지
export const PROJECTILE_SPEED = 48; // 투사체 이동 속도 (칸/초) - 원래 60에서 20% 감소
export const PROJECTILE_DAMAGE = 1; // 투사체 공격력
export const PROJECTILE_SIZE_RATIO = 0.4; // 뱀 도트 대비 투사체 크기 비율
// owner:'enemy' 발사체(터렛/헌터)가 뱀이 아니라 다른 적(투사체 데미지가 통하는 1/3/5번 등)에
// 닿았을 때 입히는 고정 데미지 - 쏜 적 타입과 무관하게 항상 이 값. 터렛/헌터가 서로 다른
// damage(둘 다 0 - 뱀에게는 shrink 등 별도 효과로 작용)를 쓰는 것과는 별개 수치라 따로 뺐다.
export const ENEMY_PROJECTILE_FRIENDLY_FIRE_DAMAGE = 1;

// 독침(투사체) 잠금 해제 + 비늘파동(충전형 광역 공격) - states/playingState.js 참고.
export const VENOM_UNLOCK_LENGTH = 8; // 뱀 길이가 이번 판에서 처음 이 값에 도달하면 독침 발사 가능
// 3번적(추격형) 처치 스택이 이 값에 도달하면 비늘파동 사용 가능 - 독침이 먼저 풀려있어야
// 실제로 켜진다(스페이스바 동작 자체가 독침 위에 확장되는 형태라서).
export const SCALE_WAVE_UNLOCK_CHASER_KILLS = 5;
export const SCALE_WAVE_CHARGE_MS = 1000; // 스페이스바를 이만큼 누르고 있어야 완전 충전(게이지 색 변경)
export const SCALE_WAVE_RANGE = 3; // 뱀 각 칸 기준 상/하/좌/우로 이 칸 수만큼 비늘파동이 닿음
export const SCALE_WAVE_DAMAGE = 3; // 비늘파동 한 번에 범위 내 적에게 주는 데미지
export const SCALE_WAVE_FLASH_MS = 150; // 비늘파동 발사 시 범위가 하얗게 번쩍이는 지속 시간(ms)
export const ENEMY_BASE_HP = 5; // 적 기본 체력
export const ENEMY_SCALE = 3; // 적 보이는 크기와 피격 판정의 공통 배율
export const ENEMY_CAPTURE_ZONE_SCALE = 5; // 파란색 적의 포획 범위(회색 배경) 배율 - 적 외곽선 기준
// captureZone을 가진 적(2번 sentinel/4번 turret) 두 마리가 서로 이 거리(체비셰프) 미만으로
// 붙어서 스폰되는 걸 막는다 - 포획존 정사각형의 한 변 길이(ENEMY_SCALE * ENEMY_CAPTURE_ZONE_SCALE)와
// 같게 잡아서, 두 적의 포획존이 서로 닿거나 겹치지 않게 한다. 실제로 4번적끼리 딱 붙어서 나오면
// 어느 한쪽만 따로 감싸는 게 위상적으로 불가능해지는 문제가 보고돼서 추가됨.
export const CAPTURE_ZONE_MIN_SPAWN_DISTANCE = ENEMY_SCALE * ENEMY_CAPTURE_ZONE_SCALE;
export const LONG_SNAKE_UNLOCK_LENGTH = 20; // 뱀 길이가 이 이상이어야 스폰 가능한 적들의 공통 기준 (2번/4번적)

// 처치/포획 보상으로 나오는 먹이 조건 — 어떤 적 번호가 이 보상을 트리거하는지는 종종 재배정되므로
// (예: 원래 3번적이 갖던 보라 먹이 스택 보상이 1번적으로 옮겨감), 이름을 트리거 적이 아니라
// 보상 자체 기준으로 짓는다.
export const PURPLE_FOOD_KILL_STACK_THRESHOLD = 5; // 처치 스택이 이 수에 도달할 때마다 보라 먹이 1개 생성
export const ORANGE_FOOD_DROP_CHANCE = 0.1; // 포획 처치 시 이 확률로 주황 먹이 생성

export const CHASER_HP = 10; // 3번적(추격형) 기본 체력
export const CHASER_BASE_MOVE_MS = 150; // 3번적 평상시 이동 간격(ms) - 뱀의 TICK_MS와는 별개로 고정값
export const CHASER_AGGRO_ZONE_SCALE = 5; // 3번적이 플레이어를 감지하는 범위 배율 - 적 외곽선 기준
export const CHASER_WANDER_STEP_MIN = 3; // 평상시 배회 중 한 방향을 유지하는 최소 이동 횟수
export const CHASER_WANDER_STEP_MAX = 8; // 평상시 배회 중 한 방향을 유지하는 최대 이동 횟수
export const CHASER_WANDER_JITTER_CHANCE = 0.15; // 배회 중 이번 한 걸음만 무작위 방향으로 튈 확률 - 유지 중인 방향/걸음 수는 그대로 진행됨

export const TURRET_FIRE_COOLDOWN_MS = 1200; // 4번적(고정 포탑형) 발사 쿨다운(ms) - 이 주기마다 정렬 상태를 체크해서 쏨
export const TURRET_PROJECTILE_SPEED = PROJECTILE_SPEED / 4; // 4번적 투사체 속도 - 기존(플레이어의 2배)의 1/8로 감소
export const TURRET_PROJECTILE_SHRINK = FOOD_BASE_GROWTH * 2; // 4번적 투사체가 뱀 몸에 맞았을 때 줄어드는 길이 - 기본 성장량의 2배
export const TURRET_CAPTURE_FOOD_CHANCE = 0.6; // 4번적 포획 처치 시 그 자리에 초록 먹이가 나올 확률
export const TURRET_CAPTURE_DOUBLE_CHANCE = 0.3; // 노랑+주황을 나란히 한 쌍으로 스폰할 확률 (나머지 10%는 갈색)

export const HUNTER_HP = 7; // 5번적(추적 사격형) 기본 체력
export const HUNTER_UNLOCK_TICK_MS = 80; // 뱀 이동 간격이 이 값보다 작아야(=이보다 빨라야) 5번적이 스폰 가능
export const HUNTER_MOVE_MS = 150; // 5번적 이동 간격(ms) - 뱀의 실시간 속도와는 별개로 고정값
export const HUNTER_PROJECTILE_SPEED = PROJECTILE_SPEED / 4; // 5번적 투사체 속도 - 기존(플레이어의 2배)의 1/8로 감소
export const HUNTER_BURST_COUNT = 3; // 정렬 진입 시 한 번에 쏘는 발수
export const HUNTER_BURST_WINDOW_MS = 1000; // 버스트 전체(첫 발~마지막 발)가 걸치는 시간(ms)
export const HUNTER_BURST_SHOT_INTERVAL_MS = HUNTER_BURST_WINDOW_MS / (HUNTER_BURST_COUNT - 1); // 발사 간 간격 - 0/500/1000ms에 3발

export const PARTICLE_BURST_COUNT = 8; // 적 처치/포획 시 한 번에 튀는 파티클 개수
export const PARTICLE_SPEED = 12; // 파티클 이동 속도 (칸/초)
export const PARTICLE_LIFE_MS = 300; // 파티클이 튄 뒤 사라지기까지 걸리는 시간(ms)
export const ITEM_FLASH_DURATION_MS = 60; // 아이템 섭취 시 몸 각 칸이 그 아이템 색으로 반짝이는 시간(ms) - 칸 하나 기준
export const ITEM_FLASH_STAGGER_MS = 8; // 반짝임이 머리에서 꼬리 쪽으로 한 칸씩 넘어가는 데 걸리는 지연(ms)
export const ITEM_FLASH_ALPHA = 0.45; // 반짝임 색을 평소 색 위에 덧씌우는 불투명도 - 완전 교체가 아니라 은은한 틴트

// 실시간 점수 - 생존시간/아이템/처치는 매 순간 발생하는 대로 world.stats.survivalScore/
// itemScore/killScore에 각각 누적되고, 길이·속도 가산점은 이번 판 최대 길이/최고 속도 기준으로
// 매 프레임 새로 계산돼 더해진다(core/score.js 참고). 상단 스탯 바(#stat-score)에 매 프레임
// 다시 반영해서 부드럽게 계속 올라가는 것처럼 보이게 한다.
export const SCORE_PER_SECOND = 10; // 생존 1초당 기본 점수 - onFrame마다 dt만큼 조금씩 누적
export const SCORE_PER_ITEM = 20; // 아이템 1개 섭취당 기본 점수
// 처치 점수는 방식에 따라 다르다 - 포획(고리를 만들어 가두는 것)이 투사체로 쏘는 것보다
// 훨씬 어려운데도 예전엔 둘 다 같은 점수였다. 시뮬레이션(200판, 안전우선+먹이추구 봇)에서
// 포획 처치가 사실상 한 번도 안 나온 걸 근거로 4배 차등을 뒀다.
export const SCORE_PER_KILL_PROJECTILE = 50; // 투사체로 적 처치 시
export const SCORE_PER_KILL_CAPTURE = 200; // 포획(encirclement)으로 적 처치 시
export const SCORE_PER_LENGTH_SEGMENT = 15; // 시작 길이보다 늘어난 칸 하나당 가산점(도달한 최대 길이 기준 - 이후 줄어들어도 깎이지 않음)
// 속도 가산점 - 시뮬레이션에서 전체 점수의 0.1%에 불과할 만큼 사실상 무의미했던 걸 근거로
// 20 -> 100으로 5배 올림. 속도 먹이는 처치 보상으로만 드물게 나오고, 얻은 뒤에도 계속 위험을
// 감수해야 하는데 예전 가중치는 그 난이도를 전혀 반영하지 못했다.
export const SCORE_PER_SPEED_LEVEL = 100; // 시작 속도 단계보다 올라간 단계 하나당 가산점 - 길이 가산점과 같은 방식(도달한 최고 속도 기준, 이후 느려져도 안 깎임)
export const SCORE_POPUP_LIFE_MS = 700; // 아이템/처치 시 "+20" 팝업이 뜬 뒤 사라지기까지 걸리는 시간(ms)
export const SCORE_POPUP_RISE_SPEED = 2; // 팝업이 위로 떠오르는 속도 (칸/초)

// 화면에 보여지는 뱀속도 시작값을 16→20으로 맞추기 위한 표시 전용 보정치 - 점수 계산에는 안 쓰고
// hud.js가 화면에 그릴 때만 더한다 (내부 속도 단계 자체가 바뀌는 건 아님)
export const SPEED_LEVEL_DISPLAY_OFFSET = 4;

// 리더보드 API - api/leaderboard.php와 항상 짝을 맞춘다. 상대경로라서 NAS 배포 경로가 어디든 동작.
export const LEADERBOARD_API_URL = 'api/leaderboard.php';
export const LEADERBOARD_MAX_ENTRIES = 20; // 서버가 유지하는 상위 기록 수와 동일하게 맞춘다
export const LEADERBOARD_NAME_MAX_LENGTH = 200; // 서버 쪽 mb_substr 제한과 동일하게 맞춘다

// 화면 우측 하단에 표시되는 빌드 표시 — index.html의 캐시 무효화 ?v= 값과 항상 같이 올린다.
// 코드를 바꿀 때마다 갱신해서, 새로고침한 화면이 실제로 최신 코드인지 눈으로 바로 확인할 수 있게 한다.
export const BUILD_VERSION = '20260731-5';

// core/updateCheck.js가 대기(타이틀) 화면에서 이 간격마다 index.html을 다시 받아와 서버의
// 최신 버전과 비교한다 - NAS에 새 파일을 올려도 이미 열려 있는 탭은 스스로 알 방법이 없어서
// (플레이 중에는 절대 새로고침하지 않도록 titleState의 enter/exit에서만 켜고 끈다).
export const UPDATE_CHECK_INTERVAL_MS = 60000;
