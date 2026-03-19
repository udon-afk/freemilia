# MONEY_APPROVAL_SEND_PACKET_V1

最終更新: 2026-03-11 07:51 JST

目的: 承認送信時に参照するファイルを1つに集約する。

## 送信本文
- ベース文面: `ops/MONEY_APPROVAL_WITH_ORDER_NOTE_V0.md`
- 差し込み確認: `ops/MONEY_APPROVAL_MESSAGE_FINALIZE_CHECKLIST_V0.md`

## 事前確認（最短）
1. SAMPLE/PRODUCTリンクを実値へ置換
2. 投稿順を `X → note → Discord` で維持確認
3. 価格表記 `1,480円` を確認

## 送信後
- 承認結果（OK/修正依頼）を `ops/MONEY_ENGINE_PLAN.md` 次ログへ反映
