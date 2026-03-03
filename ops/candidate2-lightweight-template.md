# candidate2-lightweight-template

## 実行前チェック
- 対象ジョブID/投稿先/モデルを確認
- 直近runsを1回確認
- 停止条件（同種エラー2連続など）を確認

## 実行
- 指定タスクのみ実施
- 外部送信は指定先のみ

## 実行後チェック
- status / delivery先 / nextRunAt を確認

## 短文報告フォーマット
- 実行: 成功 or 失敗
- 失敗分類: Fatal / Recoverable / Noise
- 次アクション: 1行
- 証拠: コマンド結果 or 対象ファイルパス

## 停止条件
- 同一エラー連続
- 必須入力不足
- 宛先不明で誤送信リスクあり
