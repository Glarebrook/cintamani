extends Control
## 게임오버 화면: 왜 죽었는지, 길이 기록, 다시 하기 / 타이틀로.
## 보여 줄 내용은 스테이지가 GameState.last_run 에 넣어 둡니다.

const UI := preload("res://scenes/ui/ui_kit.gd")


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color("#1a0d0d")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var run := GameState.last_run
	var stage_id: String = run.get("stage_id", "")
	var best := int(GameState.data["best_length"].get(stage_id, 0))

	var box := UI.centered_panel(self, 260)
	UI.label(box, "게임 오버", 24, Color("#ff6b6b"))
	UI.label(box, str(run.get("reason_text", "")), 14)
	UI.label(box, "길이 %d  (이번 최고 %d / 기록 %d)" % [
		int(run.get("length", 0)), int(run.get("max_length", 0)), best], 12)
	UI.label(box, "먹은 먹이 %d개" % int(run.get("food_eaten", 0)), 12)
	var retry := UI.button(box, "다시 하기", SceneManager.goto_current_stage)
	UI.button(box, "타이틀로", SceneManager.goto_title)
	retry.grab_focus()
