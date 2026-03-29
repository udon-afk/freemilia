# HEARTBEAT.md

## 目的
1時間に1回、統括エージェントとして以下を実行する。

1. ユーザーに必要なタスクがないか確認
2. `memory-repo/` を参照して定期タスクを確認
3. 指定時刻を過ぎて未実行のタスクがあれば実行

## 実行手順（毎回固定）
1. `memory-repo/indexes/active_projects.yaml` と `memory-repo/operations/workflows/` を確認
2. 定期タスク候補を抽出（期限・頻度・優先度）
3. `memory-repo/operations/workflows/heartbeat-always-run.yaml` を参照し、毎回実行レーンを先に処理
   - dedupe_window内の重複実行は禁止
   - 1heartbeatあたり最大3タスク
   - `clawhub-improvement` は毎tickで優先実行（必須レーン）
   - 実行したら必ず成果物（commit/file）を残す
4. 未実行/期限超過タスクを `tasks/` に起票 or 更新
5. 実行可能なものは即実行
6. 承認必須タスクは `waiting_approval` にして要確認化
7. 自走運用タスク（cronではなくheartbeatで運用）を処理
   - 07:15 目標3つを設定（Today Plan）
   - 13:00 進捗見直し（必要なら目標差し替え）
   - 22:30 日次締め（Done / Pending / Next）
8. 7で更新した内容は ClawHub に反映
   - Today Plan
   - Today Report

## 判定ルール
- 期限超過 = 「指定時間を過ぎて、done記録がない」
- 同一タスクの重複実行は禁止（task idで排他）
- 外部影響操作（送信/課金/公開/破壊変更）は必ず承認待ち

## 出力
- 進展なし: `HEARTBEAT_OK`
- 進展あり: 以下を短く出力
  - 実行したタスク
  - 未実行で繰り越したタスク
  - 承認待ち

## 省コスト方針
- フルログを読まない（差分のみ）
- 必要ファイルのみ読む
- 監視は軽量で実施
