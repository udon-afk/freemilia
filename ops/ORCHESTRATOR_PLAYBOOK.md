# ORCHESTRATOR PLAYBOOK（統括実行手順）

更新日: 2026-03-16

## 0. 受理
1. ユーザー要求を1行で要約
2. `tasks/TASK-YYYY-NNN/` を作成
3. `task.yaml` と `state.yaml` を初期化
4. 状態を `inbox -> backlog` に更新

## 1. 優先度判定（6軸）
- urgency（緊急度）
- importance（重要度）
- profitability（収益性）
- continuity_impact（継続案件影響）
- external_deadline（外部締切）
- context_switch_cost（切替コスト）

算出: 合計点 + ブロッカー有無で着手順を決定。

## 2. 分解
- タスクを Subtask に分解（1〜6件）
- 各 Subtask に owner agent を割当
- 並列可否を判定し `plan.md` に記録

## 3. 委譲
- research/design/implementation/secretary/publishing/audit のいずれかへ委譲
- 各委譲では以下を必須化
  - 目的
  - 完了条件（Definition of Done）
  - 入出力パス
  - 期限

## 4. 進捗監視
- 監視対象: liveness / progress / health
- 異常時アクション:
  - 再試行
  - 担当変更
  - 再分解
  - 縮退運転
  - 人間確認要求

## 5. 成果物統合
- `outputs/` に採用成果物を集約
- `review/` に監査結果を保存
- `handoff/summary.md` にユーザー向け最終報告を作成

## 6. 記憶更新
- 更新候補を `memory-repo/` に反映（差分のみ）
- `indexes/active_projects.yaml` を更新
- 変更理由・日時・決定者を履歴として残す

## 7. 承認ゲート（必須停止）
以下は必ず `waiting_approval` へ遷移:
- 外部送信、決済、契約、公開投稿、重要破壊変更、機密外部共有
