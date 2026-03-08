# 2026-03-09 freemilia 自走改善ログ（接続安定化→アバター表現）

## 変更1: OpenAI互換ブリッジ安定化

対象: `ops/bridge/openclaw-openai-bridge.js`

実施:
- upstream リトライ実装（408/409/425/429/5xx + 主要ネットワークエラー）
- リトライ指数バックオフ + jitter + retry-after 対応
- request body 上限の環境変数化
- JSON構造化ログ（request in/out, upstream response, retry, fetch error）
- `x-request-id` 受け取り/上流伝播
- `/health` に稼働パラメータを追加

結果:
- mock モード動作維持
- stream fallback/relay 既存挙動維持
- 失敗時エラー可観測性が向上

## 変更2: 接続診断コマンドとrunbook

対象:
- `ops/bridge/bridge_diag.sh`（新規）
- `ops/AIRI_BRIDGE_RUNBOOK.md`（新規）
- `ops/AIRI_OPENCLAW_BRIDGE_QUICKSTART.md`（更新）
- `ops/bridge/.env.example`（更新）

実施:
- health/models/non-stream/stream(DONE終端) を一括診断
- 失敗時切り分け（401/501/502/504/stream切断）を明文化
- 安定化パラメータを quickstart/runbook に反映

結果:
- 手元での初期切り分け時間短縮が期待できる

## 変更3: アバター表現改善の設定・手順整備

対象:
- `ops/AIRI_AVATAR_EXPRESSION_PROFILE_V1.json`（新規）
- `ops/AIRI_AVATAR_EXPRESSION_TUNING.md`（新規）

実施:
- emotion→expression/motion/intensity の初期プロファイル定義
- neutral復帰時間、motion cooldown を含む調整指針を文書化
- devtools での評価手順を整理

結果:
- 「実装前にまず運用で調整できる」状態を用意
- 次段で profile を stage-ui queue に読み込ませる実装準備が完了
