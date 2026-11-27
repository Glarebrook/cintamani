extends Node
## [Settings] 설정(창 크기, 전체 화면, 소리 크기)을 보관하고 적용하는 곳.
##
## 설정은 세이브 파일과 따로 user://settings.cfg 에 저장됩니다.
## (user:// 는 Godot가 정해 주는 "내 문서" 같은 개인 저장 폴더입니다.)

signal changed

const PATH := "user://settings.cfg"
## 게임 화면의 기본 해상도. 모든 그림은 이 크기 기준으로 그리고, 창 크기는 이 배수로 키웁니다.
const BASE_SIZE := Vector2i(640, 360)

var window_scale := 2      # 1, 2, 3 배
var fullscreen := false
var bgm_volume := 0.8      # 0.0 ~ 1.0
var sfx_volume := 0.8


func _ready() -> void:
	load_settings()
	apply()


func load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return  # 처음 실행이면 기본값 사용
	window_scale = clampi(int(cfg.get_value("display", "window_scale", window_scale)), 1, 3)
	fullscreen = bool(cfg.get_value("display", "fullscreen", fullscreen))
	bgm_volume = float(cfg.get_value("audio", "bgm_volume", bgm_volume))
	sfx_volume = float(cfg.get_value("audio", "sfx_volume", sfx_volume))


func save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("display", "window_scale", window_scale)
	cfg.set_value("display", "fullscreen", fullscreen)
	cfg.set_value("audio", "bgm_volume", bgm_volume)
	cfg.set_value("audio", "sfx_volume", sfx_volume)
	cfg.save(PATH)


## 현재 값을 실제 창/소리에 반영합니다.
func apply() -> void:
	changed.emit()
	if DisplayServer.get_name() == "headless":
		return  # 화면 없는 테스트 실행에서는 창 조작을 건너뜀
	if fullscreen:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		return
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	var size := BASE_SIZE * window_scale
	DisplayServer.window_set_size(size)
	var screen := DisplayServer.window_get_current_screen()
	var usable := DisplayServer.screen_get_usable_rect(screen)
	DisplayServer.window_set_position(usable.position + (usable.size - size) / 2)


func apply_and_save() -> void:
	apply()
	save_settings()
