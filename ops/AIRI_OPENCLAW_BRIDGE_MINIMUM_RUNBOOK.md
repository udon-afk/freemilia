# OpenClaw ↔ AIRI 最小疎通手順（Bridge含む）

最終更新: 2026-03-09 JST

## 目的
- 常駐化せず、必要時のみ bridge + `products/airi` を起動して疎通確認する。
- 最低限の確認範囲は **Bridge起動 → AIRI起動 → OpenAI互換API応答確認 → 停止**。

## 前提
- 作業ディレクトリ: `/root/.openclaw/workspace`
- Bridge: `ops/bridge/openclaw-openai-bridge.js`
- AIRI本体: `products/airi`
- AIRI制御スクリプト: `ops/airi_ctl.sh`

## 必要env
### Bridge側 (`ops/bridge/.env`)
- 最小:
  - `BRIDGE_MODE=mock`
  - `BRIDGE_API_KEY=dev-openclaw-key`
- モード別:
  - passthrough: `BRIDGE_PASSTHROUGH_BASE_URL`（+必要ならAPIキー）
  - openclaw: `BRIDGE_OPENCLAW_ENDPOINT` または `BRIDGE_OPENCLAW_WEBHOOK_URL`

### AIRI側
最小確認では外部APIキー不要（AIRI起動とHTTP到達のみ）。

## 実行順
1. Bridge env 準備（初回）
   - `cp ops/bridge/.env.example ops/bridge/.env`
2. Bridge 起動
   - `node ops/bridge/openclaw-openai-bridge.js`
3. Bridge 疎通確認
   - `bash ops/bridge/test-bridge-curl.sh`
4. AIRI 起動
   - `bash ops/airi_ctl.sh start`
5. AIRI 状態確認
   - `bash ops/airi_ctl.sh status`
6. AIRI HTTP確認
   - `bash ops/airi_ctl.sh check`
7. 停止
   - AIRI: `bash ops/airi_ctl.sh stop`
   - Bridge: 起動した端末で `Ctrl+C`

## 成功判定
- Bridge
  - `/health` が `{"ok":true,...}` を返す
  - `/v1/models` が `object=list` を返す
  - `/v1/chat/completions` が non-stream / stream とも成功
- AIRI
  - `start` で `AIRI started (pid=...)` が表示
  - `status` で `RUNNING`
  - `check` で `HTTP check: OK`
  - `stop` 後に `STOPPED`

## 失敗時ログ採取
### Bridge
- 直接起動ログを確認
- `curl -i http://127.0.0.1:8787/health`
- 認証エラー時は `Authorization: Bearer <BRIDGE_API_KEY>` を再確認

### AIRI
1. 直近ログ確認
   - `bash ops/airi_ctl.sh logs`
2. 生ログ確認
   - `tail -n 200 ops/.airi-dev.log`
3. プロセス残骸確認
   - `bash ops/airi_ctl.sh status`
   - 必要なら `ps -ef | grep -i "vite\|airi" | grep -v grep`

## OpenClaw連携時の要点
- AIRIからは OpenAI互換設定（Base URL=`http://127.0.0.1:8787/v1`）で接続。
- openclaw / passthrough モード時の上流失敗は OpenAI互換 `error` 形式で返る。
