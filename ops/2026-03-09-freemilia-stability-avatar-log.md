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

## 変更4: profile直読み込み + bridge/output適用 + one-command起動

対象:
- `products/airi/packages/stage-ui/src/composables/avatar-expression-profile.ts`（新規）
- `products/airi/packages/stage-ui/src/components/scenes/Stage.vue`（更新）
- `products/airi/apps/stage-web/src/pages/devtools/performance-playground.vue`（更新）
- `products/airi/apps/stage-pocket/src/pages/devtools/performance-playground.vue`（更新）
- `ops/airi_sync_avatar_profile.mjs`（新規）
- `ops/airi_bootstrap_run.sh`（新規）
- `ops/windows/airi_windows_bootstrap_run.ps1`（新規）
- docs更新（`README.md`, `ops/AIRI_WINDOWS_QUICKSTART.md`, `ops/AIRI_APILESS_MVP_RUNBOOK.md`, `ops/AIRI_AVATAR_EXPRESSION_TUNING.md`）

実施:
- `ops/AIRI_AVATAR_EXPRESSION_PROFILE_V1.json` を `apps/stage-web/public/bridge/output/avatar-expression-profile.json` に同期する導線を追加。
- Stage / playground で profile を読み込み、emotion適用時に以下を直接反映:
  - intensity clamp（min/max）
  - motion cooldown（連続切替抑制）
  - neutralAfterMs（自動neutral復帰）
- clone直後ワンコマンドでセットアップ+起動可能にした。

ローカル検証（mock相当・手元）:
- `node ops/airi_sync_avatar_profile.mjs` 実行成功
- `bash ops/airi_ctl.sh restart` 後、`http://127.0.0.1:5173/` が `200` 応答
- `http://127.0.0.1:5173/bridge/output/avatar-expression-profile.json` が配信されることを確認
