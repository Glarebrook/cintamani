export const CELL_SIZE = 8;      // 격자 1칸 = 8픽셀 (정사각형 보장)
export const GRID_W   = 100;     // 필드 가로 격자 수
export const GRID_H   = 40;      // 필드 세로 격자 수
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
export const ATTACK_UP_DELTA = 1; // 주황 먹이 1개당 투사체 공격력 증가량
export const ENEMY_SPAWN_MIN_MS = 3000; // 적 최소 생성 간격 (ms)
export const ENEMY_SPAWN_MAX_MS = 7000; // 적 최대 생성 간격 (ms)
export const ENEMY_MAX_COUNT = 3; // 화면에 동시에 존재할 수 있는 적의 최대 수
export const ENEMY_MIN_SPAWN_DISTANCE_FROM_HEAD = 8; // 적이 뱀 머리로부터 이 칸(체비셰프 거리) 이상 떨어진 곳에만 생성됨 - 너무 가까이 생성돼 반응할 틈 없이 죽는 것 방지
export const PROJECTILE_SPEED = 48; // 투사체 이동 속도 (칸/초) - 원래 60에서 20% 감소
export const PROJECTILE_DAMAGE = 1; // 투사체 공격력
export const PROJECTILE_SIZE_RATIO = 0.4; // 뱀 도트 대비 투사체 크기 비율
export const ENEMY_BASE_HP = 5; // 적 기본 체력
export const ENEMY_SCALE = 3; // 적 보이는 크기와 피격 판정의 공통 배율
export const ENEMY_CAPTURE_ZONE_SCALE = 5; // 파란색 적의 포획 범위(회색 배경) 배율 - 적 외곽선 기준
export const LONG_SNAKE_UNLOCK_LENGTH = 20; // 뱀 길이가 이 이상이어야 스폰 가능한 적들의 공통 기준 (2번/4번적)

// 처치/포획 보상으로 나오는 먹이 조건 — 어떤 적 번호가 이 보상을 트리거하는지는 종종 재배정되므로
// (예: 원래 3번적이 갖던 보라 먹이 스택 보상이 1번적으로 옮겨감), 이름을 트리거 적이 아니라
// 보상 자체 기준으로 짓는다.
export const PURPLE_FOOD_KILL_STACK_THRESHOLD = 5; // 처치 스택이 이 수에 도달할 때마다 보라 먹이 1개 생성
export const ORANGE_FOOD_DROP_CHANCE = 0.1; // 포획 처치 시 이 확률로 주황 먹이 생성

export const CHASER_HP = 10; // 3번적(추격형) 기본 체력
export const CHASER_BASE_MOVE_MS = 120; // 3번적 평상시 이동 간격(ms) - 뱀의 TICK_MS와는 별개로 고정값
export const CHASER_AGGRO_ZONE_SCALE = 5; // 3번적이 플레이어를 감지하는 범위 배율 - 적 외곽선 기준

export const TURRET_FIRE_COOLDOWN_MS = 1200; // 4번적(고정 포탑형) 발사 쿨다운(ms) - 이 주기마다 정렬 상태를 체크해서 쏨
export const TURRET_PROJECTILE_SPEED = PROJECTILE_SPEED * 2; // 4번적 투사체 속도 - 플레이어 투사체의 2배
export const TURRET_PROJECTILE_SHRINK = FOOD_BASE_GROWTH * 2; // 4번적 투사체가 뱀 몸에 맞았을 때 줄어드는 길이 - 기본 성장량의 2배
export const TURRET_CAPTURE_FOOD_CHANCE = 0.6; // 4번적 포획 처치 시 그 자리에 초록 먹이가 나올 확률
export const TURRET_CAPTURE_DOUBLE_CHANCE = 0.3; // 노랑+주황을 나란히 한 쌍으로 스폰할 확률 (나머지 10%는 갈색)

export const HUNTER_HP = 20; // 5번적(추적 사격형) 기본 체력
export const HUNTER_UNLOCK_TICK_MS = 80; // 뱀 이동 간격이 이 값보다 작아야(=이보다 빨라야) 5번적이 스폰 가능
export const HUNTER_MOVE_MS = 120; // 5번적 이동 간격(ms) - 뱀의 실시간 속도와는 별개로 고정값(뱀 기본 속도와 같은 값)
export const HUNTER_PROJECTILE_SPEED = PROJECTILE_SPEED * 2; // 5번적 투사체 속도 - 플레이어 투사체의 2배
export const HUNTER_BURST_COUNT = 3; // 정렬 진입 시 한 번에 쏘는 발수
export const HUNTER_BURST_WINDOW_MS = 1000; // 버스트 전체(첫 발~마지막 발)가 걸치는 시간(ms)
export const HUNTER_BURST_SHOT_INTERVAL_MS = HUNTER_BURST_WINDOW_MS / (HUNTER_BURST_COUNT - 1); // 발사 간 간격 - 0/500/1000ms에 3발

// 리더보드 API - api/leaderboard.php와 항상 짝을 맞춘다. 상대경로라서 NAS 배포 경로가 어디든 동작.
export const LEADERBOARD_API_URL = 'api/leaderboard.php';
export const LEADERBOARD_MAX_ENTRIES = 20; // 서버가 유지하는 상위 기록 수와 동일하게 맞춘다
export const LEADERBOARD_NAME_MAX_LENGTH = 200; // 서버 쪽 mb_substr 제한과 동일하게 맞춘다

// 화면 우측 하단에 표시되는 빌드 표시 — index.html의 캐시 무효화 ?v= 값과 항상 같이 올린다.
// 코드를 바꿀 때마다 갱신해서, 새로고침한 화면이 실제로 최신 코드인지 눈으로 바로 확인할 수 있게 한다.
export const BUILD_VERSION = '20260729-19';
