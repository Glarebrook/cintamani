extends CanvasLayer
## ESC 일시정지 메뉴: 계속하기 / 저장 / 불러오기 / 설정 / 타이틀로.
## 스테이지 씬에 이 씬을 하나 넣어 두기만 하면 ESC 로 열립니다.

const UI := preload("res://scenes/ui/ui_kit.gd")
const SettingsMenuScene := preload("res://scenes/ui/settings_menu.tscn")

var _root: Control
var _message: Label
var _first_button: Button
var _settings: Control
var _open := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 20
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_root)
	UI.dim(_root)
	var box := UI.centered_panel(_root)
	UI.label(box, "일시정지", 20, UI.COLOR_ACCENT)
	_first_button = UI.button(box, "계속하기", close)
	UI.button(box, "저장하기", _on_save)
	UI.button(box, "불러오기", _on_load)
	UI.button(box, "설정", _on_settings)
	UI.button(box, "타이틀로", SceneManager.goto_title)
	_message = UI.label(box, "", 10)
	_root.hide()

	_settings = SettingsMenuScene.instantiate()
	add_child(_settings)
	_settings.hide()
	_settings.closed.connect(func(): _first_button.grab_focus())


func _unhandled_input(event: InputEvent) -> void:
	if not event.is_action_pressed("pause"):
		return
	if _open:
		close()
	elif not get_tree().paused:  # 대화 중(이미 멈춤)에는 열지 않음
		open()
	else:
		return
	get_viewport().set_input_as_handled()


func open() -> void:
	_open = true
	get_tree().paused = true
	_message.text = ""
	_root.show()
	_first_button.grab_focus()


func close() -> void:
	_open = false
	_settings.hide()
	_root.hide()
	get_tree().paused = false


func _on_save() -> void:
	# 지금 구조에서는 "어느 스테이지까지 왔는지 + 진행 상황"을 저장합니다.
	# 불러오면 그 스테이지를 처음부터 다시 시작합니다.
	if SaveManager.save_game():
		_message.text = "저장했습니다."
	else:
		_message.text = "저장에 실패했습니다."


func _on_load() -> void:
	if not SaveManager.load_game():
		_message.text = "저장된 데이터가 없습니다."
		return
	SceneManager.goto_current_stage()


func _on_settings() -> void:
	_settings.open()
