extends Node
## [GameState] 지금 진행 중인 게임의 "모든 진행 상황"을 한 덩어리(data)로 들고 있는 곳.
##
## 저장하기 = 이 data 를 통째로 파일에 쓰기, 불러오기 = 파일을 읽어 data 에 다시 넣기.
## 그래서 앞으로 저장해야 할 것(선택지 결과, 퀘스트 진행 등)이 생기면
## new_game() 안의 기본값에 한 줄만 추가하면 저장/불러오기가 자동으로 따라옵니다.

const SAVE_VERSION := 1

var data: Dictionary = {}

## 방금 끝난 판의 결과 (게임오버 화면용). 저장하지 않는 임시 값입니다.
var last_run: Dictionary = {}


func _ready() -> void:
	new_game()


## 새 게임을 시작할 때의 기본 상태.
func new_game() -> void:
	data = {
		"version": SAVE_VERSION,
		"character": "gangcheori",        # characters.json 의 id
		"current_stage": "pond",          # stages.json 의 id
		"unlocked_stages": ["pond"],
		"cintamani": {"fire": 0, "water": 0, "earth": 0, "wood": 0},  # 여의주 보유 수
		"karma": 0,                        # 선행(+)/악행(-) 누적. 결말 분기용 (아직 사용 안 함)
		"flags": {},                       # "거북을 만났다" 같은 이야기 진행 표시
		"best_length": {},                 # 스테이지별 최고 길이
	}
	last_run = {}


func to_dict() -> Dictionary:
	return data.duplicate(true)


## 저장 파일에서 읽은 내용을 넣습니다.
## 기본값 위에 덮어쓰기 때문에, 예전 세이브에 없던 새 항목은 기본값으로 채워집니다.
func from_dict(saved: Dictionary) -> void:
	new_game()
	for key in saved:
		data[key] = saved[key]
	data["version"] = SAVE_VERSION


func unlock_stage(stage_id: String) -> void:
	var unlocked: Array = data["unlocked_stages"]
	if not unlocked.has(stage_id):
		unlocked.append(stage_id)


func set_flag(flag: String, value = true) -> void:
	data["flags"][flag] = value


func get_flag(flag: String, default_value = false):
	return data["flags"].get(flag, default_value)
