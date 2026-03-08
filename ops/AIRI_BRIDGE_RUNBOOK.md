# AIRI Bridge 接続診断 Runbook

最終更新: 2026-03-09 JST

対象: `ops/bridge/openclaw-openai-bridge.js`

## 0. 事前準備

```bash
cp ops/bridge/.env.example ops/bridge/.env
# 必要なら .env 編集
```

## 1. 起動

```bash
node ops/bridge/openclaw-openai-bridge.js
```

`bridge.server.started` が出ること。

## 2. 基本診断

```bash
bash ops/bridge/bridge_diag.sh
```

期待結果:
- `/health` が `ok: true`
- `/v1/models` が model list を返す
- non-stream completion が JSON で返る
- stream completion に `data: [DONE]` が含まれる

## 3. 失敗時の切り分け

### A. 401 invalid_api_key
- AIRI 側 API Key と `BRIDGE_API_KEY` を一致させる
- 一時的に `BRIDGE_API_KEY=` で認証無効化して疎通確認

### B. 501 not_configured
- `BRIDGE_MODE=passthrough` なら `BRIDGE_PASSTHROUGH_BASE_URL` 必須
- `BRIDGE_MODE=openclaw` なら `BRIDGE_OPENCLAW_ENDPOINT` or `BRIDGE_OPENCLAW_WEBHOOK_URL` 必須

### C. 502 upstream_unreachable
- upstream URL / DNS / ポートを確認
- ログ `bridge.upstream.fetch_error` の `code` を確認

### D. 504 upstream_timeout
- upstream 応答速度を確認
- `BRIDGE_UPSTREAM_TIMEOUT_MS` を延長
- 必要なら `BRIDGE_UPSTREAM_MAX_RETRIES` を一時増加

### E. stream が途中で切れる
- `bridge_diag.sh` の stream check を再実行
- upstream が本当に SSE を返しているか確認（`content-type: text/event-stream`）
- 非SSE JSONなら bridge 側で擬似SSE化されるため、DONE 終端の有無を確認

## 4. 安定化の推奨初期値

```env
BRIDGE_UPSTREAM_TIMEOUT_MS=60000
BRIDGE_UPSTREAM_MAX_RETRIES=2
BRIDGE_UPSTREAM_RETRY_BASE_DELAY_MS=300
BRIDGE_UPSTREAM_RETRY_MAX_DELAY_MS=5000
```

高遅延環境なら `TIMEOUT_MS` を 90-120s へ。
429/5xx が多発する環境なら `MAX_RETRIES=3` までを推奨上限。

## 5. 監視観点（ログ）

追うべきイベント:
- `bridge.request.in/out`
- `bridge.upstream.response`
- `bridge.upstream.retry_scheduled`
- `bridge.upstream.fetch_error`

`x-request-id` をクライアントから送ると、bridge→upstream へ伝播し追跡しやすい。
