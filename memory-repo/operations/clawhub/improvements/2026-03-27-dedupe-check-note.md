# Heartbeat Dedupe Check Note

## Rule of thumb
- `heartbeat-always-run` の実行前に `last_run_at` を確認
- 経過が `dedupe_window_min` 未満ならスキップ
- 実行時は task記録ファイルを必ず同時作成

## 목적
重複実行を防ぎつつ、実行証跡を常に残す。
