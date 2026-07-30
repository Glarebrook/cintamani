<?php
// 리더보드 API — GET: 상위 기록 조회, POST: 기록 제출.
// 정적 파일만 서빙하던 사이트에 처음 추가되는 서버 코드. 캐주얼한 홈 NAS 게임이라
// 본격적인 부정행위 방지는 하지 않는다 — 클라이언트가 보낸 값을 그대로 신뢰하되,
// 형식이 말이 안 되는 값(음수, 상한 초과 등)만 걸러낸다.
// 정렬/순위 기준은 score(js/core/score.js의 getTotalScore) — survivalMs(생존시간)는 참고용으로
// 같이 저장만 하고 순위에는 안 쓴다.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DATA_FILE = __DIR__ . '/data/leaderboard.json';
const MAX_ENTRIES = 20;
const MAX_NAME_LENGTH = 200;
const MAX_SURVIVAL_MS = 24 * 60 * 60 * 1000; // 24시간 - 이보다 크면 값이 이상한 것으로 간주
const MAX_SCORE = 10_000_000; // 넉넉한 상한 - 이보다 크면 값이 이상한 것으로 간주
// js/config/constants.js의 SCORE_PER_SECOND와 반드시 값을 맞춰야 함(자동 동기화 안 됨) -
// score 필드가 없는 예전 기록(생존시간 기준 순위였던 시절)을 "생존 점수만 있고 가산점은
// 0"으로 간주해 점수로 환산하는 용도로만 쓰인다.
const LEGACY_SCORE_PER_SECOND = 10;

function read_entries(): array {
    if (!file_exists(DATA_FILE)) {
        return [];
    }
    $raw = file_get_contents(DATA_FILE);
    $data = json_decode($raw, true);
    $entries = is_array($data) ? $data : [];
    // score 없는 예전 기록을 생존시간 기준으로 환산해서 채워 넣는다 - 다음 POST 때 파일에
    // 그대로 저장되므로(write_entries가 전체 배열을 다시 씀) 한 번만 지나면 영구히 채워진다.
    foreach ($entries as &$entry) {
        if (!isset($entry['score'])) {
            $entry['score'] = (int) round(($entry['survivalMs'] ?? 0) / 1000 * LEGACY_SCORE_PER_SECOND);
        }
    }
    unset($entry);
    return $entries;
}

// $entries는 이미 정렬/제한된 상태로 넘어온다고 가정 - 파일 쓰기만 담당.
function write_entries(array $entries): void {
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $fp = fopen(DATA_FILE, 'c+');
    if ($fp === false) {
        throw new RuntimeException('leaderboard data file open failed');
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($entries, JSON_UNESCAPED_UNICODE));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function respond(array $entries): void {
    echo json_encode(['entries' => $entries], JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    respond(read_entries());
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        fail(400, 'invalid request body');
    }

    $name = isset($body['name']) ? trim((string) $body['name']) : '';
    if ($name === '') {
        $name = '익명';
    }
    $name = mb_substr($name, 0, MAX_NAME_LENGTH);

    $survivalMs = isset($body['survivalMs']) ? (float) $body['survivalMs'] : NAN;
    if (!is_finite($survivalMs) || $survivalMs <= 0 || $survivalMs > MAX_SURVIVAL_MS) {
        fail(400, 'invalid survivalMs');
    }

    $score = isset($body['score']) ? (float) $body['score'] : NAN;
    if (!is_finite($score) || $score < 0 || $score > MAX_SCORE) {
        fail(400, 'invalid score');
    }

    $entries = read_entries();
    $entries[] = ['name' => $name, 'survivalMs' => $survivalMs, 'score' => $score, 'ts' => time()];
    usort($entries, fn($a, $b) => $b['score'] <=> $a['score']);
    $entries = array_slice($entries, 0, MAX_ENTRIES);
    write_entries($entries);

    respond($entries);
}

fail(405, 'method not allowed');
