# ClawHub Flow Builder UI 提案（n8nライク）

日付: 2026-03-29

## 狙い
- 「ボタンで単発実行」から脱却し、
  OpenClawワークフローを可視化・編集・実行できるUIへ進化させる。

## MVP（Phase 1）
1. ノード一覧（Trigger / Action / Guard / Output）
2. 接続線（上から下のシンプル直列）
3. 保存先: `memory-repo/operations/workflows/*.yaml`
4. 実行ボタン（dry-run / run）
5. 実行履歴表示（最新10件）

## ノード定義（初期）
- Trigger: heartbeat / schedule / manual
- Action: run-workflow / update-file / generate-draft
- Guard: approval-required / dedupe-window / rate-limit
- Output: tasks-log / github-commit-link / chat-summary

## 成功条件
- Flow Builderから1本作成し、`heartbeat-always-run.yaml`相当を生成できる
- 生成後に実行履歴が `tasks/` へ残る
- 既存のRegistrarと競合しない

## 次アクション
1. hubにFlow Builderタブを追加
2. ノードJSONスキーマ定義
3. YAML変換関数の実装
