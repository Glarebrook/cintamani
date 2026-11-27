extends Node
## [Data] 게임 데이터(JSON 파일)를 읽어 두는 곳.
##
## 스테이지, 대사, 장애물, 아이템 같은 "내용"은 코드에 직접 쓰지 않고
## res://data/ 폴더의 JSON 파일에 적어 둡니다. 이 스크립트가 게임 시작 때 전부 읽어 오고,
## 다른 코드는 Data.stage("pond") 처럼 꺼내 쓰기만 합니다.
## → 숫자나 대사를 바꾸고 싶으면 코드 대신 JSON 파일만 고치면 됩니다.

const DATA_DIR := "res://data/"

var stages: Dictionary = {}
var obstacles: Dictionary = {}
var items: Dictionary = {}
var dialogues: Dictionary = {}
var characters: Dictionary = {}
var texts: Dictionary = {}
var audio: Dictionary = {}


func _ready() -> void:
	reload()


## 모든 JSON 파일을 다시 읽습니다.
func reload() -> void:
	stages = _load_json("stages.json")
	obstacles = _load_json("obstacles.json")
	items = _load_json("items.json")
	dialogues = _load_json("dialogues.json")
	characters = _load_json("characters.json")
	texts = _load_json("texts.json")
	audio = _load_json("audio.json")


func stage(id: String) -> Dictionary:
	return stages.get(id, {})


func character(id: String) -> Dictionary:
	return characters.get(id, {})


## 대사 묶음 하나(여러 줄)를 돌려줍니다. 없으면 빈 배열.
func dialogue(id: String) -> Array:
	return dialogues.get(id, [])


## 화면에 쓰는 짧은 문구. 없으면 키 이름을 그대로 보여 줘서 빠진 걸 바로 알 수 있게 합니다.
func text(key: String) -> String:
	return str(texts.get(key, key))


func _load_json(file_name: String) -> Dictionary:
	var path := DATA_DIR + file_name
	if not FileAccess.file_exists(path):
		push_error("데이터 파일이 없습니다: %s" % path)
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("JSON 형식이 잘못되었습니다 (쉼표/따옴표 확인): %s" % path)
		return {}
	return parsed
