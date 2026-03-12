# REIA APP IMPLEMENTATION PLAN V1（設計フェーズ計画）

作成日: 2026-03-12  
前提: 本計画は**実装開始前の設計完了計画**。AIRI依存ゼロを前提。

---

## フェーズ分割

## Phase 0: スコープ凍結・依存排除定義

### 実施内容
- AIRI依存棚卸し（コード・ドキュメント・運用）
- 禁止依存ルール策定（CIチェック含む）
- REIAドメイン用語集確定

### 完了条件
- 「AIRI依存禁止リスト」確定
- CIに依存検知ルール定義済み
- 本設計ドキュメント承認

### リスクと回避
- リスク: AIRI参照の見落とし
- 回避: `grep + import graph` の二重検査

---

## Phase 1: アーキテクチャ確定

### 実施内容
- モジュール境界（Identity/Membership/Content/Notification/Admin/Audit）固定
- API境界（公開API/管理API）固定
- データモデル草案（ERD）作成

### 完了条件
- 境界図と依存方向がレビュー承認済み
- API一覧（最低エンドポイント）凍結
- ERD初版確定

### リスクと回避
- リスク: モジュール責務の重複
- 回避: 各モジュールに「持つ責務/持たない責務」を明記

---

## Phase 2: 認証・認可設計確定

### 実施内容
- Identityフロー（login/refresh/logout/revoke）
- Membership状態遷移（active/suspended/expired）
- 認可ポリシー（API単位）

### 完了条件
- シーケンス図が揃っている
- 失効反映方針（TTL・再検証）が明文化済み
- 認可失敗ケースのテスト観点一覧あり

### リスクと回避
- リスク: 会員失効反映遅延
- 回避: 重要APIでサーバ側再検証を必須化

---

## Phase 3: 運用接続（OpenClaw）と障害方針

### 実施内容
- OpenClaw接続点を管理APIに限定
- 障害分類と再実行ポリシー定義
- 監査ログ項目定義

### 完了条件
- OpenClaw Runbook初版完成
- エラーコード体系確定
- 再試行/再接続ポリシー確定

### リスクと回避
- リスク: 運用で直接DB更新が常態化
- 回避: 原則API経由、DB直操作は緊急手順書必須

---

## Phase 4: クライアント方針確定（Windows + Mobile）

### 実施内容
- Windowsワンコマンド起動仕様（up/down/reset）
- モバイル認証・通知・キャッシュ方針確定
- 管理画面運用フロー定義

### 完了条件
- `reia-up.ps1` 仕様書完成
- モバイルセッション管理仕様書完成
- 管理者操作フロー（通知配信・承認）確定

### リスクと回避
- リスク: 開発環境差異で起動失敗
- 回避: 事前チェック（Docker/.env/Port）を起動スクリプトで検証

---

## Phase 5: 実装開始ゲート判定（Design Exit）

### 実施内容
- 全設計成果物レビュー
- 未決事項のOwner/Due設定
- MVPスコープ再確認

### 完了条件
- 「実装開始可」のGo判定
- 未決事項ゼロまたは期限付き管理
- スコープ外を明示したバックログ作成済み

### リスクと回避
- リスク: 設計未完のまま着手
- 回避: Go条件未達時は実装禁止ルール

---

## 全体リスク一覧（横断）

1. AIRI依存の残骸混入  
   - 回避: CI禁止ルール + PRチェック
2. 認証/認可の責務混線  
   - 回避: IdentityとMembership境界を固定
3. 通知配信の再実行事故  
   - 回避: idempotency key + DLQ方針
4. 運用手順の属人化  
   - 回避: OpenClaw Runbook + 監査ログ
5. 開発環境立ち上げコスト過大  
   - 回避: Windows one-command 標準化

---

## マイルストーン（設計のみ）

- M1: 依存排除ルール確定（Phase 0）
- M2: アーキ/API/ERD確定（Phase 1-2）
- M3: OpenClaw運用設計確定（Phase 3）
- M4: Windows/Mobile方針確定（Phase 4）
- M5: Design Exit（Phase 5）


---

## V1レビュー反映（2026-03-12 18:12 JST）

実装順をMVP優先へ再配列する。

### Phase M0: Companion MVPスコープ固定（新規）
- 実施内容:
  - 機能を chat + avatar event + one-command起動 に限定
  - 非MVPをバックログへ退避
- 完了条件:
  - MVP要件4項目の合意
  - 非MVPリスト確定

### Phase M1: 最小実装（chat往復 + avatar反映）
- 実施内容:
  - `reia-shell` と `reia-gateway` 最小接続
  - OpenClaw実接続1経路
  - `reia-events` schemaでUI更新
- 完了条件:
  - real chat往復1経路成功
  - avatar state更新確認

### Phase M2: 起動安定化（Windows/スマホ確認）
- 実施内容:
  - PowerShellワンコマンド起動
  - LANスマホ確認手順
- 完了条件:
  - Windowsで1コマンド起動
  - スマホ接続確認

### Phase M3: その後の拡張
- 管理画面/会員管理/通知拡張はMVP後に段階実装
