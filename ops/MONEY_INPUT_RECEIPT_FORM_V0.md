# MONEY Input Receipt Form v0

目的: 外部入力（SAMPLE_LINK / PRODUCT_LINK / 承認状態）を1回で受領し、Stage3最終再送へ即時遷移する。

## 入力テンプレ
- SAMPLE_LINK: 
- PRODUCT_LINK: 
- 承認状態: OK / 修正 / 保留
- メモ（任意）: 

## 受領チェック
- [ ] SAMPLE_LINK が http(s) で始まる
- [ ] PRODUCT_LINK が http(s) で始まる
- [ ] 承認状態が3択のいずれか

## 受領後アクション（固定順）
1. Stage3最終再送を1回実施
2. `ops/MONEY_LINK_COLLECTION_LOG_V0.md` 更新
3. `ops/MONEY_STAGE2_DISPATCH_LOG_V0.md` / retry系ステータス更新
4. `ops/MONEY_ENGINE_PLAN.md` heartbeatログ追記
