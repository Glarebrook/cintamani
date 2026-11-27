extends Node
## [SaveManager] GameState.data 를 파일로 저장하고 불러옵니다.
##
## 파일은 사람이 읽을 수 있는 JSON 형식이라, 문제가 생기면 메모장으로 열어 확인할 수 있습니다.
## 위치: user://save_1.json
##   (Windows 기준 %APPDATA%\Godot\app_userdata\이무기 (가제)\save_1.json)
##
## 지금은 슬롯 1개. 나중에 슬롯을 늘리려면 slot 번호만 인자로 받게 바꾸면 됩니다.

const SAVE_PATH := "user://save_1.json"


func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


func save_game() -> bool:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		push_error("저장 실패: %s" % FileAccess.get_open_error())
		return false
	file.store_string(JSON.stringify(GameState.to_dict(), "\t"))
	return true


func load_game() -> bool:
	if not has_save():
		return false
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("세이브 파일이 손상되었습니다: %s" % SAVE_PATH)
		return false
	GameState.from_dict(parsed)
	return true


func delete_save() -> void:
	if has_save():
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))
