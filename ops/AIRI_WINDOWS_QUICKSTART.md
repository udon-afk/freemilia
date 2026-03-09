# AIRI Windows Quickstart（udon環境向け）

目的: AIRI本家をそのまま触るのではなく、`freemilia` リポジトリ内の `products/airi` を使って、
ローカルPC上で「リアの表現レイヤー」として起動する。

## 前提
- Windows 10/11
- Git インストール済み
- Node.js 24系（`node -v` で確認）

## 1) リポジトリ取得
```powershell
git clone git@github.com:udon-afk/freemilia.git
cd freemilia
```

## 2) ワンコマンド起動（clone直後）
```powershell
powershell -ExecutionPolicy Bypass -File .\ops\windows\airi_windows_bootstrap_run.ps1
```

- `products/airi` が無い場合は自動取得
- 依存関係インストールを自動実行
- `ops/AIRI_AVATAR_EXPRESSION_PROFILE_V1.json` を `apps/stage-web/public/bridge/output/avatar-expression-profile.json` へ同期
- そのまま web 起動（`http://localhost:5173/`）

### Desktop（必要時）
```powershell
powershell -ExecutionPolicy Bypass -File .\ops\windows\airi_windows_bootstrap_run.ps1 -Mode tamagotchi
```

## 4) APIなし確認（先にここ）
- `ops/AIRI_APILESS_MVP_RUNBOOK.md` のチェック項目で確認
- まずは「起動・表示・モック挙動」までを合格ラインにする

## 5) API投入は後段
- ElevenLabs などの実APIは、表示/モック確認後に投入
- 目的は「リアの表現拡張」なので、AIRI独立運用は行わない
