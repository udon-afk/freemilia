# MONEY_HOLD_TO_GO_CRITERIA_V0

最終更新: 2026-03-11 10:21 JST

目的: HOLD状態からGOへ移るための最短条件を固定する。

## HOLD→GO 必須条件
1. `SAMPLE_LINK` 実値確定
2. `PRODUCT_LINK` 実値確定
3. 承認依頼送信済み
4. 承認返信 = OK
5. 送信ログ更新済み

## 実行順（固定）
- Step1: URL2点確定
- Step2: 承認依頼送信
- Step3: 返信確認
- Step4: send log更新
- Step5: Launch Gate再判定
