# Day Rollover Check

## Purpose
日付切替直後のheartbeatで、前日ログ参照に引きずられず当日タスクを開始できる状態を保証する。

## Checklist
- 当日用 `AUTONOMOUS-HEARTBEAT-YYYY-MM-DD.md` の新規作成可否を確認
- `heartbeat-always-run` の `last_run_at` を更新
- 出力は当日分の進捗のみ記載（前日ログを再掲しない）
