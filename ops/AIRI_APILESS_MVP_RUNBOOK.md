# AIRI APIなし/無料代用 MVP手順（udon向け）

最終更新: 2026-03-09 07:56 JST

## clone -> one command

- macOS/Linux:
  - `git clone git@github.com:udon-afk/freemilia.git && cd freemilia && bash ops/airi_bootstrap_run.sh`
- Windows PowerShell:
  - `git clone git@github.com:udon-afk/freemilia.git; cd freemilia; powershell -ExecutionPolicy Bypass -File .\\ops\\windows\\airi_windows_bootstrap_run.ps1`

## 目的
- AIRIを**APIキー未投入**で、udonが目視で進捗確認できる段階まで進める。
- 前提: AIRIはリア（OpenClaw）の表現レイヤーとして扱い、独立運用しない。

---

## 0) 最短導線（モック返答 → AIRI表示/発話に寄せる）

### A. 起動確認（最短）
```bash
bash ops/airi_ctl.sh start
bash ops/airi_ctl.sh check
```
成功条件:
- `RUNNING` かつ `HTTP check: OK`

### B. モック返答導線（APIなし）
- ページ: `http://127.0.0.1:5173/devtools/markdown-stress`
- 画面操作:
  1. `Mode: Mock` に切替（Mock表示にする）
  2. `Preview` で擬似payload生成
  3. `Replay` 実行（モックストリーム再生）
  4. `Live traces` にイベントが流れることを確認

> これで「LLM外部APIなしで、返答ストリーム相当」を再現可能。

### C. 表現レイヤー表示（モデル）
- ページ: `http://127.0.0.1:5173/devtools/performance-playground`
- 目視確認:
  - VRMモデルが描画される（オンボーディングダイアログの背面でも可）

### D. 発話トリガ（現段階）
- `performance-playground` は送信UIがあるが、**音声provider設定なしでは実音声再生まで到達しない**。
- 現段階の代替確認:
  - モック返答（B）でストリーム動作確認
  - 表示（C）でモデル描画確認

---

## 1) アバター操作の最低確認項目（チェックリスト）

### 1-1 起動
- [ ] `bash ops/airi_ctl.sh start` で起動
- [ ] `bash ops/airi_ctl.sh check` がOK

### 1-2 モデル表示
- [ ] `/devtools/performance-playground` でVRM表示確認
- [ ] `/devtools/model-driver-mediapipe` でモデル表示確認

### 1-3 簡易モーション/表情切替（無料）
- [ ] `/devtools/model-driver-mediapipe` で `Running` ON/OFF 切替
- [ ] Pose/Hands/Face のトグルで追従挙動変化を確認（カメラ許可時）

### 1-4 発話トリガ
- [ ] （現段階）モック返答イベントの再生確認（`markdown-stress`）
- [ ] （未達）実音声再生（APIレス構成では未確立）

---

## 2) 実機再現テスト手順（スクリプト化済み）

```bash
bash ops/airi_apiless_smoketest.sh
```

出力先:
- `ops/evidence/airi-apiless/01-home.png`
- `ops/evidence/airi-apiless/02-markdown-stress.png`
- `ops/evidence/airi-apiless/03-model-driver-mediapipe.png`
- `ops/evidence/airi-apiless/04-performance-playground.png`

判定:
- 成功: HTTP疎通 + 4画面キャプチャ取得
- 未達: 音声実再生の証跡は未取得

---

## 3) API投入後に残す差分（最小）

1. Chat providerを実APIに設定
2. Speech providerを実APIまたはローカルTTSに設定
3. `performance-playground` で送信→音声再生ログ（`播放開始`）を実証
4. OpenClaw Adapter v0スキーマに接続

※ 既存のモック導線・起動導線はそのまま維持し、API有無で切替できる形にする。

---

## 4) Adapter v0 実接続チェック手順（request_id付き）

前提:
- AIRIが起動済み（`bash ops/airi_ctl.sh start && bash ops/airi_ctl.sh check`）
- Adapter受け口が `AIRI_ADAPTER_SCHEMA_V0.json` 準拠で起動済み

### 4-0. Adapter候補URLプローブ（先に実行）

```bash
bash ops/airi_adapter_probe.sh
```

- 到達可能URLが見つかれば標準出力に表示
- ログは `ops/evidence/airi-apiless/adapter-probe-*.log` に保存
- 見つかったURLを `AIRI_ADAPTER_URL` に設定して 4-1 以降を実行

### 4-0b. 実Adapter precheck（`/api/tts` の受け口確認）

```bash
AIRI_REAL_ADAPTER_URL=http://127.0.0.1:5173/api/tts \
  bash ops/airi_real_adapter_precheck.sh
```

- 目的: 実URLが `POST` を受け付けるかを先に判定
- ログ: `ops/evidence/airi-apiless/real-adapter-precheck-*.log`
- body: `ops/evidence/airi-apiless/real-adapter-precheck-body-*.json`
- `http_status=404` の場合は schema v0 handler 未実装として 4-1〜4-4 を保留

### 4-0c. 実Adapter一括smokeflow（precheck→3ケース→判定）

```bash
AIRI_REAL_ADAPTER_URL=http://127.0.0.1:5173/api/tts \
  bash ops/airi_real_adapter_smokeflow.sh hb-YYYYMMDD-HHMM
```

- `precheck` が 404 の場合は自動で3ケースをスキップ
- 404以外なら `ops/airi_run_adapter_cases.sh` と判定生成まで連続実行
- ログ: `ops/evidence/airi-apiless/real-adapter-smokeflow-*.log`

### 4-1. request_id付き最小リクエスト（success想定）

```bash
curl -sS -X POST "${AIRI_ADAPTER_URL:-http://127.0.0.1:8787/tts}" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id":"hb-20260309-0454-success-001",
    "text":"AIRI adapter v0 success test",
    "speaker":"default",
    "style":"normal",
    "priority":"normal"
  }' | tee /tmp/airi_adapter_success.json
```

確認ポイント:
- `ok: true`
- `request_id` が送信値と一致
- `audio_url` または `audio_path` のどちらかが返る
- `duration_ms` / `trace_id` が返る

### 4-2. timeout系テスト（retryable=true想定）

```bash
curl -sS -X POST "${AIRI_ADAPTER_URL:-http://127.0.0.1:8787/tts}" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id":"hb-20260309-0454-timeout-001",
    "text":"AIRI adapter timeout simulation",
    "speaker":"default",
    "style":"normal",
    "priority":"high"
  }' | tee /tmp/airi_adapter_timeout.json
```

確認ポイント（失敗時）:
- `ok: false`
- `error_code: "NETWORK_TIMEOUT"`（またはtimeout相当）
- `retryable: true`

### 4-3. auth失敗テスト（retryable=false想定）

```bash
curl -sS -X POST "${AIRI_ADAPTER_URL:-http://127.0.0.1:8787/tts}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer INVALID_TOKEN_FOR_TEST" \
  -d '{
    "request_id":"hb-20260309-0454-auth-001",
    "text":"AIRI adapter auth failure simulation",
    "priority":"normal"
  }' | tee /tmp/airi_adapter_auth.json
```

確認ポイント（失敗時）:
- `ok: false`
- `error_code: "AUTH_FAILED"`
- `retryable: false`

### 4-4. メトリクスCSVへの最小記録

以下3ケース（success/timeout/auth）を1行ずつ追記:
- `ops/AIRI_METRICS_LOG_TEMPLATE_V0.csv`

必須カラム:
- `request_id, result, error_code, retry_count, latency_ms, fallback_used`

手動実行の代替（自動化）:

```bash
AIRI_ADAPTER_URL=http://127.0.0.1:8787/tts \
  bash ops/airi_run_adapter_cases.sh hb-YYYYMMDD-HHMM
```

- 3ケース実行 + evidence保存 + CSV追記を一括実行
- summaryは `ops/evidence/airi-apiless/adapter-cases-summary-*.log` に出力

その後の集計:

```bash
python3 ops/airi_generate_gonogo_report.py \
  ops/AIRI_METRICS_LOG_TEMPLATE_V0.csv \
  --severity-policy-file ops/AIRI_ERROR_SEVERITY_POLICY_V0.json \
  --out ops/AIRI_GO_NOGO_REPORT_GENERATED_V0.md
```

判定確認:
- `総合判定`（Green/Yellow/Red）
- `MVP合否`（PASS/FAIL）
- `しきい値比較（根拠）`
