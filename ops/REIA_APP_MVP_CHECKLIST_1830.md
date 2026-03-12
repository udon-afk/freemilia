# REIA APP MVPチェックリスト（18:30版）

作成日: 2026-03-12 18:30 JST  
対象: 個人利用前提 REIA Companion App

## A. Core MVP（Phase S1 / P0）
- [ ] OpenClaw実経路で `POST /api/chat` 往復成功（mock不可）
- [ ] avatar event 3種（mood/expression/motion）をUI反映
- [ ] unknown event受信時もUIが停止しない
- [ ] 接続状態（Connected/Reconnecting/Offline）を常時表示
- [ ] 再接続時に重複送信が発生しない

## B. 単独運用成立（Phase S2 / P1）
- [ ] 会話ログをローカル保存（直近100件）
- [ ] アプリ再起動後に会話履歴を復元
- [ ] 失敗時UXを1導線化（再試行/診断/ログ表示）
- [ ] Windows one-command起動（PowerShell）で開発開始可能
- [ ] 起動前自己診断（.env/port/Docker/Node）で不足を案内

## C. 安定化（Phase S3 / P2）
- [ ] chat/avatar/error をJSONLへ時系列出力
- [ ] `dev-personal` 設定プリセットでローカル再現可能
- [ ] 非MVP項目の優先順位バックログが更新済み

## DoD（18:30）
- [ ] Aが全項目完了
- [ ] Bが全項目完了
- [ ] Cは最低1項目以上完了（推奨: JSONL）
- [ ] 非MVP延期項目が明記され、混入リスクが管理されている
