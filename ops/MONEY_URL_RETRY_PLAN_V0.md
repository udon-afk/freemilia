# MONEY_URL_RETRY_PLAN_V0

最終更新: 2026-03-11 13:51 JST

目的: URL回収が未完了のまま続く場合の再試行手順を固定する。

## 再試行手順
1. `MONEY_LINK_REQUEST_TEMPLATE_V0.md` を送信
2. 返信なしなら `MONEY_BLOCKER_ESCALATION_NOTE_V0.md` を送信
3. それでも未返信なら「URL2点だけ返信依頼」の1行再送

## 記録
- 各送信の日時と結果を `MONEY_LINK_COLLECTION_LOG_V0.md` に記録
