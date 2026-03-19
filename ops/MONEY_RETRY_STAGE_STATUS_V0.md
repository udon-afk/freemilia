# MONEY_RETRY_STAGE_STATUS_V0

最終更新: 2026-03-11 16:51 JST

目的: URL回収リトライの現在段階を明示する。

## 現在段階
- Stage 1: 実施済み
- Stage 2: エスカレーション（未実施）
- Stage 3: 1行再送（未実施）

## 判定ルール
- まずStage 1を実施
- 返信なしの場合のみ次段階へ

## 次アクション
- Stage 1（`MONEY_LINK_REQUEST_TEMPLATE_V0.md`）を送信
