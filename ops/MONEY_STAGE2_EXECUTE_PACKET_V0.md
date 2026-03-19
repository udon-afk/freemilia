# MONEY_STAGE2_EXECUTE_PACKET_V0

最終更新: 2026-03-12 05:29 JST

## 目的
watchdogが `STAGE2_DUE` のとき、エスカレーション送信とログ更新を最短で実行する。

## 実行条件
- `ops/evidence-money-watchdog-*.log` の `watchdog_status=STAGE2_DUE`

## 送信文参照
- `ops/MONEY_BLOCKER_ESCALATION_NOTE_V0.md`

## 実行後の更新先
1. `ops/MONEY_LINK_COLLECTION_LOG_V0.md` に送信日時を記録
2. `ops/MONEY_RETRY_STAGE_STATUS_V0.md` を Stage2 に更新
3. `ops/MONEY_STAGE1_EXECUTION_LOG_V0.md` に遷移記録を追記

## 注意
- 対外投稿（X/note/Discord）は承認前に行わない
- 本パケットはURL回収再依頼の内部運用のみ
