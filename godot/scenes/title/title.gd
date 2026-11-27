extends Control
## 타이틀 화면: 새로 시작 / 불러오기 / 설정 / 종료.

const UI := preload("res://scenes/ui/ui_kit.gd")
const SettingsMenuScene := preload("res://scenes/ui/settings_menu.tscn")

var _settings_menu: Control
var _first_button: Button


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = UI.COLOR_BG
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	box.custom_minimum_size = Vector2(180, 0)
	center.add_child(box)

	UI.label(box, "이무기", 32, UI.COLOR_ACCENT)
	UI.label(box, "뱀이 용이 되어 가는 이야기 (가제)", 12)
	var gap := Control.new()
	gap.custom_minimum_size = Vector2(0, 16)
	box.add_child(gap)

	_first_button = UI.button(box, "새로 시작", _on_new_game)
	var load_button := UI.button(box, "불러오기", _on_load)
	load_button.disabled = not SaveManager.has_save()
	UI.button(box, "설정", _on_settings)
	UI.button(box, "종료", func(): get_tree().quit())

	_settings_menu = SettingsMenuScene.instantiate()
	add_child(_settings_menu)
	_settings_menu.hide()
	_settings_menu.closed.connect(func(): _first_button.grab_focus())

	_first_button.grab_focus()
	AudioManager.play_bgm("title")


func _on_new_game() -> void:
	GameState.new_game()
	SceneManager.goto_current_stage()


func _on_load() -> void:
	if SaveManager.load_game():
		SceneManager.goto_current_stage()


func _on_settings() -> void:
	_settings_menu.open()
