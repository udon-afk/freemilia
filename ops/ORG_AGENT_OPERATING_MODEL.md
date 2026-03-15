# 統括エージェント運用モデル（v1）

更新日: 2026-03-16

## 目的
ユーザーは統括エージェント1体と会話し、統括が以下を自律実行する。
- タスク受理
- 優先度判定
- 分解
- 特化エージェント委譲
- 進捗監視
- 成果物統合
- 記憶更新
- 例外対応

## 組織構造
- ユーザー: オーナー、最終方針のみ
- 統括エージェント: CEO/COO/PMO
- 特化エージェント:
  1. 調査（research）
  2. 設計（design）
  3. 実装（implementation）
  4. 記録・秘書（secretary）
  5. 発信・営業（publishing）
  6. 監査・レビュー（audit）

## ワークスペース3層
- agent workspace: `/agents/<role>/`
- task workspace: `/tasks/<TASK-ID>/`
- shared workspace: `/shared/{policies,templates,context}/`

## タスク状態機械
`inbox -> backlog -> in_progress -> blocked -> waiting_approval -> done -> archived`

## 統括の権限
- 受理/分解/委譲/並列化/優先度変更/再試行/統合/中断継続判断

## 人間承認が必要な操作
- 外部送信
- 金銭決済
- 契約
- アカウント発行/削除
- 公開投稿
- 破壊的変更
- GitHub main への重要反映
- 個人情報/機密の外部共有

## 記憶設計
永続記憶は `memory-repo/` に集約:
- profile/
- projects/
- operations/
- publishing/
- relations/
- indexes/

メモ形式は `YAML frontmatter + Markdown` を標準採用。

## heartbeat設計（再開時の方針）
監視対象: liveness / progress / health
異常検知:
- 更新なし
- 成果物更新なし
- 同一エラー連続
- ループ作業
- API失敗率上昇
- コンテキスト肥大
- 参照不足停止

## コスト最適化方針
- フルログ投入禁止
- 差分投入
- 要約と原文を分離
- 監視は軽量モデル
- 重推論のみ高性能モデル
- 共通文書を固定コンテキスト化
