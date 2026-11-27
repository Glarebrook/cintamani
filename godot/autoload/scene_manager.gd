extends Node
## [SceneManager] 화면(씬) 사이를 이동시키는 곳.
##
## "씬(scene)"은 Godot에서 화면 하나 또는 부품 하나를 뜻합니다. (타이틀 화면, 연못 스테이지 등)
## 스테이지는 stages.json 의 "type" 값(snake / rpg)에 따라 알맞은 씬이 열립니다.
## 새 종류의 스테이지를 만들면 STAGE_SCENES 에 한 줄 추가하면 됩니다.

const TITLE_SCENE := "res://scenes/title/title.tscn"
const GAME_OVER_SCENE := "res://scenes/game_over/game_over.tscn"
const STAGE_SCENES := {
	"snake": "res://scenes/stage_snake/snake_stage.tscn",
	"rpg": "res://scenes/stage_rpg/rpg_stage.tscn",
}


func goto_title() -> void:
	_change(TITLE_SCENE)


func goto_game_over() -> void:
	_change(GAME_OVER_SCENE)


## GameState.data["current_stage"] 에 적힌 스테이지로 이동합니다.
func goto_current_stage() -> void:
	goto_stage(GameState.data.get("current_stage", "pond"))


func goto_stage(stage_id: String) -> void:
	var stage := Data.stage(stage_id)
	var scene_path: String = STAGE_SCENES.get(stage.get("type", ""), "")
	if scene_path == "":
		push_error("알 수 없는 스테이지이거나 type 이 없습니다: %s" % stage_id)
		goto_title()
		return
	GameState.data["current_stage"] = stage_id
	_change(scene_path)


func _change(path: String) -> void:
	get_tree().paused = false
	get_tree().change_scene_to_file(path)
