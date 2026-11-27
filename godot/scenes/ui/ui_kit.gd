extends RefCounted
## 화면을 코드로 만들 때 자주 쓰는 작은 도우미 모음.
## 사용법: const UI := preload("res://scenes/ui/ui_kit.gd") 후 UI.button(...)

const COLOR_BG := Color("#10161c")
const COLOR_PANEL := Color("#2a1f17")
const COLOR_TEXT := Color("#f1e6cf")
const COLOR_ACCENT := Color("#e8d36a")


## 화면 전체를 덮는 반투명 검은 막.
static func dim(parent: Node, alpha := 0.6) -> ColorRect:
	var rect := ColorRect.new()
	rect.color = Color(0, 0, 0, alpha)
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_STOP
	parent.add_child(rect)
	return rect


## 화면 가운데에 패널을 놓고, 그 안에 세로로 쌓는 상자(VBox)를 돌려줍니다.
static func centered_panel(parent: Node, min_width := 220) -> VBoxContainer:
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	parent.add_child(center)
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_PANEL
	style.border_color = COLOR_ACCENT
	style.set_border_width_all(1)
	style.set_content_margin_all(12)
	panel.add_theme_stylebox_override("panel", style)
	panel.custom_minimum_size = Vector2(min_width, 0)
	center.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)
	return box


static func label(parent: Node, text: String, font_size := 16, color := COLOR_TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	parent.add_child(l)
	return l


static func button(parent: Node, text: String, on_pressed: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", 14)
	b.pressed.connect(func():
		AudioManager.play_sfx("ui_select")
		on_pressed.call())
	parent.add_child(b)
	return b
