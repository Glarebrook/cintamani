extends Control
## 설정 창: 창 크기 / 전체 화면 / 배경음 / 효과음.
## 타이틀 화면과 일시정지 메뉴가 같이 씁니다. 값은 Settings 에 저장됩니다.

signal closed

const UI := preload("res://scenes/ui/ui_kit.gd")

var _first_control: Control


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_preset(Control.PRESET_FULL_RECT)
	UI.dim(self, 0.7)
	var box := UI.centered_panel(self, 260)
	UI.label(box, "설정", 20, UI.COLOR_ACCENT)

	var scale_option := OptionButton.new()
	for i in range(1, 4):
		var size := Settings.BASE_SIZE * i
		scale_option.add_item("%d배 (%dx%d)" % [i, size.x, size.y])
	scale_option.selected = Settings.window_scale - 1
	scale_option.item_selected.connect(func(index: int):
		Settings.window_scale = index + 1
		Settings.apply_and_save())
	_row(box, "창 크기", scale_option)
	_first_control = scale_option

	var fullscreen_check := CheckBox.new()
	fullscreen_check.button_pressed = Settings.fullscreen
	fullscreen_check.toggled.connect(func(on: bool):
		Settings.fullscreen = on
		Settings.apply_and_save())
	_row(box, "전체 화면", fullscreen_check)

	_row(box, "배경음", _volume_slider(Settings.bgm_volume, func(v: float):
		Settings.bgm_volume = v
		Settings.apply_and_save()))
	_row(box, "효과음", _volume_slider(Settings.sfx_volume, func(v: float):
		Settings.sfx_volume = v
		Settings.apply_and_save()))

	UI.button(box, "닫기", close)


func open() -> void:
	show()
	_first_control.grab_focus()


func close() -> void:
	hide()
	closed.emit()


func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		close()


func _row(parent: Node, title: String, control: Control) -> void:
	var row := HBoxContainer.new()
	var l := Label.new()
	l.text = title
	l.custom_minimum_size = Vector2(80, 0)
	l.add_theme_font_size_override("font_size", 14)
	row.add_child(l)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(control)
	parent.add_child(row)


func _volume_slider(value: float, on_change: Callable) -> HSlider:
	var slider := HSlider.new()
	slider.min_value = 0.0
	slider.max_value = 1.0
	slider.step = 0.05
	slider.value = value
	slider.custom_minimum_size = Vector2(120, 16)
	slider.value_changed.connect(on_change)
	return slider
