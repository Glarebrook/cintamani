export const CELL_SIZE = 8;      // 격자 1칸 = 8픽셀 (정사각형 보장)
export const GRID_W   = 100;     // 필드 가로 격자 수
export const GRID_H   = 40;      // 필드 세로 격자 수
export const TICK_MS  = 120;     // 뱀 이동 간격 (ms)
export const FOOD_INTERVAL_MS = 2000; // 먹이 등장 간격 (ms)
export const FOOD_MAX_COUNT = 10; // 화면 최대 먹이 수
export const FOOD_BASE_GROWTH = 1; // 기본(초록) 먹이 1개당 성장 칸 수 — 다른 먹이의 배율 계산 기준
export const FOOD_SPEED_DELTA_MS = 5; // 노랑/갈색 먹이가 뱀 이동 간격(ms)을 바꾸는 양
export const MIN_TICK_MS = 40; // 속도 먹이를 아무리 먹어도 이동 간격이 이 아래로는 안 내려감
export const MAX_TICK_MS = 200; // 속도 먹이를 아무리 먹어도 이동 간격이 이 위로는 안 올라감
export const ATTACK_UP_DELTA = 1; // 주황 먹이 1개당 투사체 공격력 증가량
export const ENEMY_SPAWN_MIN_MS = 3000; // 적 최소 생성 간격 (ms)
export const ENEMY_SPAWN_MAX_MS = 7000; // 적 최대 생성 간격 (ms)
export const PROJECTILE_SPEED = 48; // 투사체 이동 속도 (칸/초) - 원래 60에서 20% 감소
export const PROJECTILE_DAMAGE = 1; // 투사체 공격력
export const PROJECTILE_SIZE_RATIO = 0.4; // 뱀 도트 대비 투사체 크기 비율
export const ENEMY_BASE_HP = 5; // 적 기본 체력
export const ENEMY_SCALE = 3; // 적 보이는 크기와 피격 판정의 공통 배율
export const ENEMY_CAPTURE_ZONE_SCALE = 5; // 파란색 적의 포획 범위(회색 배경) 배율 - 적 외곽선 기준

export const CHASER_HP = 10; // 3번적(추격형) 기본 체력
export const CHASER_BASE_MOVE_MS = 120; // 3번적 평상시 이동 간격(ms) - 뱀의 TICK_MS와는 별개로 고정값
export const CHASER_AGGRO_ZONE_SCALE = 5; // 3번적이 플레이어를 감지하는 범위 배율 - 적 외곽선 기준
export const CHASER_KILL_STACK_THRESHOLD = 5; // 3번적을 이 수만큼 처치할 때마다 보라 먹이 1개 생성

export const TURRET_FIRE_COOLDOWN_MS = 1200; // 4번적(고정 포탑형) 발사 쿨다운(ms) - 이 주기마다 정렬 상태를 체크해서 쏨
export const TURRET_PROJECTILE_SPEED = PROJECTILE_SPEED * 2; // 4번적 투사체 속도 - 플레이어 투사체의 2배
export const TURRET_PROJECTILE_SHRINK = FOOD_BASE_GROWTH * 2; // 4번적 투사체가 뱀 몸에 맞았을 때 줄어드는 길이 - 기본 성장량의 2배
export const TURRET_ITEM_DROP_CHANCE = 0.1; // 4번적을 포획으로 처치했을 때 주황 먹이가 나올 확률

// 화면 우측 하단에 표시되는 빌드 표시 — index.html의 캐시 무효화 ?v= 값과 항상 같이 올린다.
// 코드를 바꿀 때마다 갱신해서, 새로고침한 화면이 실제로 최신 코드인지 눈으로 바로 확인할 수 있게 한다.
export const BUILD_VERSION = '20260729-9';
