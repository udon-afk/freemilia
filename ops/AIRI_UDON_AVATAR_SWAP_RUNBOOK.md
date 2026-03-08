# AIRI Udon Avatar Swap Runbook (VRM / Live2D)

最終更新: 2026-03-09 JST

## 目的
Udon キャラの見た目を、AIRI UIから安全に VRM / Live2D へ切り替える。

## 想定パス（ローカル開発）
- VRM キャッシュ: `products/airi/.cache/vrm/models/`
- Live2D キャッシュ: `products/airi/.cache/live2d/models/`

> 注: 本番運用ではストレージ実装により保存先が変わる可能性あり。まずはローカルの上記パスを基準に確認。

## 事前準備
1. AIRI起動
   - `bash ops/airi_ctl.sh start`
2. 設定画面にアクセス
   - 通常は `http://127.0.0.1:5173/`（環境により差分あり）
3. Udon対象チャラ/キャラを選択

## A. VRM へ差し替え
1. **Settings → Models → VRM** を開く
2. 次のどちらかでモデルを指定
   - URL入力（`from-url`）
   - ローカルインポート（UIの import / upload）
3. モデル読み込み後、必要に応じて初期位置（position/scale/rotation）調整
4. 保存（Save / Apply）
5. チャット画面へ戻り、口パク・表情が反映されることを確認

### VRM確認ポイント
- 画面にモデルが表示される
- 音声再生時に口パクが動く
- フレーム落ちや姿勢崩れがない

## B. Live2D へ差し替え
1. **Settings → Models → Live2D** を開く
2. 次のどちらかでモデルを指定
   - URL入力（`from-url`）
   - ローカルインポート（model3.json / textures 含む一式）
3. 表示確認（瞬き、待機アニメ）
4. 保存（Save / Apply）
5. チャット画面に戻り、口パク/視線追従を確認

### Live2D確認ポイント
- テクスチャ欠けがない
- 口形状が音声に追随
- 表情切替が破綻しない

## C. VRM / Live2D 切替のUI導線
- Models 設定内のタブ・切替リンク（`VRM` / `Live2D`）を使用
- 既存モデル削除時は「Remove imported models」系操作を使う

## トラブルシュート
- 表示されない
  - ブラウザ再読み込み
  - モデルURLのCORS/404確認
  - `.cache/vrm/models` / `.cache/live2d/models` に実体があるか確認
- 口パクが動かない
  - TTS/音声出力が有効か
  - 対応ランタイム（VRM/Live2D）の設定差分を再確認
- 重い / カクつく
  - モデル軽量版を使用
  - 影/ポストエフェクトを最小化

## ロールバック
- 直前のモデルに戻す（Models履歴 or 再インポート）
- どうしても戻らない場合は対象モデルを削除して再適用
