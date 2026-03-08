# AIRI ↔ OpenClaw OpenAI-Bridge Quickstart (Windows)

最終更新: 2026-03-09 JST

目的: AIRI 側は `provider=openai` 系設定のまま、ローカル bridge へ接続する。

## 1) Bridge ファイル準備
リポジトリルート（`freemilia`）で:

```powershell
Copy-Item .\ops\bridge\.env.example .\ops\bridge\.env
```

必要に応じて `ops/bridge/.env` を編集。

## 2) Bridge 起動

```powershell
node .\ops\bridge\openclaw-openai-bridge.js
```

成功時ログ例:

```text
[openclaw-openai-bridge] listening on http://127.0.0.1:8787 (mode=mock)
```

## 3) 動作確認（curl）

```powershell
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/v1/models -H "Authorization: Bearer dev-openclaw-key"
```

Linux / WSL なら簡易スクリプトも利用可能:

```bash
bash ops/bridge/test-bridge-curl.sh
```

## 4) AIRI 側の provider 設定
AIRI の Provider 設定画面（OpenAI / OpenAI-compatible）で以下を設定:

- API Key: `.env` の `BRIDGE_API_KEY`（例: `dev-openclaw-key`）
- Base URL: `http://127.0.0.1:8787/v1`
- Model: `.env` の `BRIDGE_MODEL`（例: `openclaw-reia-mock`）

## 5) モード切替

### mock（既定）
```env
BRIDGE_MODE=mock
```
- `stream=true` もSSEで動作（擬似トークン分割）

### passthrough（上流 OpenAI互換へ中継）
```env
BRIDGE_MODE=passthrough
BRIDGE_PASSTHROUGH_BASE_URL=https://api.openai.com
BRIDGE_PASSTHROUGH_API_KEY=<your-key>
```
- `stream=true` 時: 上流がSSEを返す場合はそのまま中継
- 上流が非SSE JSONの場合は bridge 側でSSE形式へ変換して返却

### openclaw（OpenClaw/任意Webhookへ中継）
```env
BRIDGE_MODE=openclaw
BRIDGE_OPENCLAW_ENDPOINT=http://127.0.0.1:8080/v1/chat/completions
# もしくは BRIDGE_OPENCLAW_WEBHOOK_URL を指定
BRIDGE_OPENCLAW_API_KEY=<optional>
```
- 失敗時は OpenAI 互換の `error` 形式へマッピングして返却

## 6) 実装済み範囲（現時点）
- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions`
  - mock
  - passthrough
  - openclaw
  - `stream: true`（mock / passthrough）

未実装:
- `/v1/embeddings` 等の他エンドポイント
