# AIRI ↔ OpenClaw OpenAI-Bridge Quickstart (Windows)

最終更新: 2026-03-09 JST

目的: AIRI 側は `provider=openai` 系設定のまま、ローカルの最小ブリッジへ接続する。
（現時点は mock 応答。後で OpenClaw/リア ルーティングへ差し替え予定）

## 1) Bridge ファイル準備
リポジトリルート（`freemilia`）で:

```powershell
Copy-Item .\ops\bridge\.env.example .\ops\bridge\.env
```

必要なら `ops/bridge/.env` を編集（最低限はそのままでOK）。

## 2) Bridge 起動

```powershell
node .\ops\bridge\openclaw-openai-bridge.js
```

成功時ログ例:

```text
[openclaw-openai-bridge] listening on http://127.0.0.1:8787 (mode=mock)
```

## 3) 動作確認（任意）

```powershell
curl http://127.0.0.1:8787/v1/models
```

## 4) AIRI 側の provider 設定
AIRI の Provider 設定画面（OpenAI / OpenAI-compatible）で以下を設定:

- API Key: `.env` の `BRIDGE_API_KEY`（例: `dev-openclaw-key`）
- Base URL: `http://127.0.0.1:8787/v1`
- Model: `.env` の `BRIDGE_MODEL`（例: `openclaw-reia-mock`）

> ポイント: AIRI から見れば OpenAI 互換API。実際のバックエンドはローカル bridge。

## 5) mock → passthrough への切替（プレースホルダ）
`ops/bridge/.env` で:

```env
BRIDGE_MODE=passthrough
BRIDGE_PASSTHROUGH_BASE_URL=https://api.openai.com
BRIDGE_PASSTHROUGH_API_KEY=<your-key>
```

再起動すると `/v1/chat/completions` を上流へ転送。

## 6) 既知の範囲（最小実装）
- 実装済み:
  - `GET /v1/models`
  - `POST /v1/chat/completions`（mock + passthrough placeholder）
- 未実装:
  - streaming (`stream: true`) の逐次SSE
  - `/v1/embeddings` など他エンドポイント

必要最小でローカル疎通できることを優先。
