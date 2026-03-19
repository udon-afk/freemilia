# MONEY_REPLY_WAIT_WATCHDOG_V0

最終更新: 2026-03-12 04:29 JST

## 目的
Stage1（URL回収依頼）送信後の「返信待ち」を放置せず、heartbeat時に次手を自動判定する。

## 入力
- Stage1送信時刻（例: 2026-03-11 16:51 JST）
- 現在時刻（heartbeat受信時刻）
- 返信有無（yes/no）

## 判定ルール
1. 返信あり
   - 状態: RESOLVED
   - 実施: URLプレースホルダ反映へ進む
2. 返信なし かつ 経過 < 12h
   - 状態: HOLD_WAIT
   - 実施: 待機継続（再送しない）
3. 返信なし かつ 12h <= 経過 < 24h
   - 状態: STAGE2_DUE
   - 実施: エスカレーション文（Stage2）を送信
4. 返信なし かつ 経過 >= 24h
   - 状態: STAGE3_DUE
   - 実施: 1行再送（最終）を送信し、次回は保留理由を明記

## 更新先
- `ops/MONEY_LINK_COLLECTION_LOG_V0.md`
- `ops/MONEY_RETRY_STAGE_STATUS_V0.md`

## 備考
- 対外アクション（投稿/公開）は承認取得まで実施しない
- 本watchdogは「再送判定」のみを扱う
