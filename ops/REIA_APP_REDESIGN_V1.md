# REIA APP REDESIGN V1（AIRI外部依存ゼロ設計）

作成日: 2026-03-12  
対象: freemilia専用 REIA限定アプリ  
方針: **外部AIRI依存を完全排除**し、REIAアプリ単体で成立する構成へ再設計

---

## 1. 目的

1. REIA限定アプリを、外部AIRIサービス/API/認証基盤に依存せず運用可能にする。  
2. 認証・認可・コンテンツ配信・通知・監査をREIAドメイン内で完結させる。  
3. Windowsでの開発/運用をワンコマンドで開始できる。  
4. スマホ（iOS/Android）を第一級クライアントとして成立させる。

## 2. 非目的

- AIRI互換レイヤ維持（既存AIRI APIとの互換は持たない）
- 初期段階での多テナント化
- 複雑課金・SNS機能（DM/コメントスレッド等）
- 実装着手（本書は設計のみ）

---

## 3. 要件

### 3.1 機能要件

- REIA会員のログイン/ログアウト
- REIA会員限定コンテンツ一覧/詳細表示
- プロフィール表示・最低限編集
- 運営向け管理画面（コンテンツ/通知/会員ステータス）
- Push通知（運営→会員）
- 監査ログ（ログイン、権限変更、配信操作）

### 3.2 非機能要件

- 可用性: 単一障害点を可視化し、再起動で自己回復可能
- セキュリティ: サーバ側認可を必須化（クライアント判定禁止）
- 監査性: 重要操作は誰が/いつ/何を記録
- 拡張性: モジュール境界を守り、将来分割しやすい構造
- 開発効率: Monorepo + 共通型 + 共通lint/test

### 3.3 依存排除要件（最重要）

- 禁止: AIRI API呼び出し
- 禁止: AIRIトークン検証/会員照会
- 禁止: AIRI SDK・AIRI向けAdapter
- 代替: REIA Identity + REIA Membershipを内部実装

---

## 4. 全体アーキテクチャ

**採用: モジュラモノリス + BFF/API + Mobile App + Admin Web**

- `apps/reia-mobile` : React Native（iOS/Android）
- `apps/reia-admin` : 管理Web（Next.js）
- `apps/reia-api` : Node.js API（Fastify/Nest想定）
- `packages/reia-domain-*` : ドメインモジュール
- `packages/reia-shared` : 型/設定/ロガー/エラー定義

初期は単一デプロイ（API）で速度優先。モジュール境界は厳格に維持し、将来分離可能にする。

---

## 5. モジュール境界

### 5.1 ドメインモジュール

1. **Identity**
   - 認証（メール+OTPまたはパスワード）
   - トークン発行/更新/失効
2. **Membership**
   - REIA会員状態（active/suspended/expired）
   - Entitlement判定（REIA限定アクセス）
3. **Content**
   - コンテンツCRUD
   - 公開状態/公開予約
4. **Notification**
   - デバイストークン管理
   - 配信ジョブ管理
5. **Admin**
   - 管理権限（Editor/Operator/Admin）
   - 承認フロー
6. **AuditLog**
   - 重要イベント永続化
7. **Analytics（最小）**
   - DAU/閲覧完了率など最小イベント

### 5.2 依存ルール

- `api` → 各ドメインモジュール（許可）
- ドメイン間直接参照は**明示I/F経由のみ**
- UIからDB直アクセス禁止
- AIRI関連モジュール参照は全禁止（CIでgrep検知）

---

## 6. データフロー

### 6.1 ログイン

1. Mobile/Adminが `/auth/login` 呼び出し
2. Identityが資格情報検証
3. Membershipへ会員状態照会
4. activeならaccess/refresh token発行
5. AuditLog記録

### 6.2 コンテンツ閲覧

1. Mobileが `/contents` 呼び出し
2. APIでtoken検証 + Membership entitlement再確認
3. Contentから取得
4. 必要に応じて署名URL発行
5. Analyticsイベント記録

### 6.3 通知配信

1. Adminで通知作成
2. Admin権限+承認チェック
3. Notificationが対象会員抽出（REIA activeのみ）
4. FCM/APNsへ配信
5. 結果をAuditLogへ記録

---

## 7. OpenClaw接続方式

### 7.1 目的

- 運用補助・監視・定型オペレーションをOpenClawから実行可能にする。

### 7.2 接続方式（推奨）

- OpenClawは**REIA APIの管理エンドポイント**に対して接続
- 直接DB操作は原則禁止（緊急時のみ）
- 実行単位はRunbook化した安全コマンドに限定

### 7.3 具体

- `/admin/health` : 稼働確認
- `/admin/jobs/retry` : 通知失敗再実行
- `/admin/membership/sync` : 会員状態再計算（内部ソースのみ）
- `/admin/audit/export` : 監査エクスポート

### 7.4 セキュリティ

- OpenClaw専用サービスアカウント
- IP/トークン制限
- 実行ログを必ずAuditLogへ二重記録

---

## 8. エラー / 再接続方針

### 8.1 エラー分類

- `AUTH_*` : 認証失敗
- `MEMBERSHIP_*` : 会員状態不一致
- `CONTENT_*` : コンテンツ取得不可
- `NOTIFY_*` : 通知配信失敗
- `INFRA_*` : DB/ネットワーク障害

### 8.2 クライアント再試行

- 4xx: 再試行しない（UIで再ログインや権限不足表示）
- 5xx/ネットワーク: 指数バックオフ（1s/2s/4s/8s、最大5回）
- refresh token失敗: セッション破棄して再ログイン

### 8.3 サーバ再処理

- 通知ジョブはidempotency key必須
- 失敗ジョブはDLQ相当テーブルへ退避
- OpenClaw経由で安全再実行

---

## 9. Windowsワンコマンド起動方針

### 9.1 方針

- 開発者はPowerShellで**1コマンド起動**
- 依存サービス（DB/Redis/API/Admin）をまとめて起動

### 9.2 例

- `./ops/windows/reia-up.ps1`
  - `.env.local`検証
  - Docker Desktop確認
  - `docker compose up -d`
  - `pnpm dev`（or Turborepo task）

### 9.3 補助

- `reia-down.ps1` : 停止
- `reia-reset.ps1` : ローカルデータ初期化（要確認プロンプト）
- 起動後ヘルスチェックURLを自動表示

---

## 10. スマホ対応方針

### 10.1 クライアント

- React Native（Expo or bare、要件に応じて選択）
- iOS/Android共通コンポーネント

### 10.2 認証とセッション

- Secure Storageにrefresh token保存
- access tokenは短TTLでメモリ保持
- バックグラウンド復帰時にsilent refresh

### 10.3 通知

- APNs/FCMをNotificationモジュール経由で統一
- 通知タップ時Deep Linkで対象画面へ遷移

### 10.4 オフライン

- 初期は読み取りキャッシュ限定
- 書き込み系はオンライン必須

---

## 11. 設計上の決定（ADRサマリ）

1. AIRI外部依存はゼロにする（互換層を持たない）
2. 初期はモジュラモノリス、境界厳格化で将来分離可能にする
3. OpenClawは管理API経由で接続し、直接DB操作を避ける
4. Windowsワンコマンド起動を標準化する
5. スマホを主戦場として設計する

