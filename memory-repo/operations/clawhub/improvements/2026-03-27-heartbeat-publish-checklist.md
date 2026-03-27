# ClawHub Publish Checklist (Heartbeat版)

## 目的
Heartbeat運用で Today Plan / Today Report を ClawHub へ反映する前の最終チェックを30秒で終える。

## Checklist
- [ ] Today Plan に「時間・成果物・承認ゲート」が記載されている
- [ ] Today Report に Done / Pending / Next がある
- [ ] 外部公開・課金・送信が含まれる場合は waiting_approval になっている
- [ ] 反映後のリンク（または反映先ID）を tasks ログへ残した

## Fail-fast
- 上記1つでも欠けたら反映を止める
- 先に tasks 側を修正してから再実行する
