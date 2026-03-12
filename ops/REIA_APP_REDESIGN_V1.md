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


---

## 12. V1レビューでの改善反映（2026-03-12 18:12 JST）

### 12.1 問題点（V1の不足）
- V1は「会員限定コンテンツアプリ」寄りで、直近要件（REIAの会話+アバター操作）よりスコープが広すぎる。
- MVPとして必要な「OpenClaw会話往復」「アバターイベント反映」の優先度が低く見える。
- 実装開始時の最小成果（DoD）が曖昧。

### 12.2 修正方針（スコープ再固定）
- まず作る対象を **REIA Companion App (MVP)** に固定する。
- MVP必須機能は以下4つのみ:
  1) テキスト送信
  2) OpenClaw経由の応答受信
  3) avatar command eventの反映（mood / expression / motion）
  4) Windowsワンコマンド起動
- 会員課金/高度通知/管理画面拡張はMVP後へ延期。

### 12.3 MVPアーキテクチャ（再定義）
- `apps/reia-shell` : 端末UI（Web/PWA, スマホ対応）
- `apps/reia-gateway` : OpenClaw接続API（/health, /api/chat, /api/avatar/events）
- `packages/reia-events` : avatar command schema（共有）
- 永続化は最初は最小（ローカル/軽量DB）で可。

### 12.4 MVP完了条件（DoD）
- 同一LANのスマホから `reia-shell` へアクセス可能。
- `POST /api/chat` でOpenClaw往復成功（mockでなくrealを1経路）。
- 受信応答に応じてavatar stateが更新される。
- Windowsで起動コマンド1本（PowerShell）で開発開始できる。

### 12.5 非MVP（延期）
- 多ロール管理画面
- 高度な会員ライフサイクル
- 課金/配布ストア連携
- 本格分析基盤

---

## 13. 追加改善案（18:30版 / 個人利用前提で絞り込み）

> 目的: 「一人で毎日使える」ことを最短で担保するため、MVP直後〜直近で効く改善だけに限定。

1. **P0: 単一セッション安定化（接続状態を常時可視化）**  
   - UIヘッダに `Connected / Reconnecting / Offline` を明示。  
   - 再接続時は最後の送信内容を保持し、重複送信を防ぐ。  
   - 個人利用では「使える/使えない」の判断速度が最優先。

2. **P0: avatar event 最小仕様固定（3種 + unknown耐性）**  
   - `mood / expression / motion` の3イベントを正式固定。  
   - 未知イベントは無視せず `unknown` としてログ化しUIは安全に継続。  
   - 仕様揺れでUIが止まる事故を防ぐ。

3. **P1: 会話ログのローカル永続化（直近100件）**  
   - DB前提を外し、端末ローカル（軽量）保存を先行。  
   - アプリ再起動後も直近文脈を復元。  
   - 個人利用での「毎回リセット感」を解消する。

4. **P1: 失敗時UXの統一（1画面で復帰可能）**  
   - API失敗/タイムアウト時に「再試行」「接続診断」「ログ表示」を同一導線に統合。  
   - トラブル時に画面遷移せず自己復旧できることを優先。

5. **P1: Windows起動スクリプトに自己診断を内蔵**  
   - `.env` / port競合 / Docker状態 / Node version を起動前チェック。  
   - 失敗時は次アクションを1行で表示（例: `docker desktopを起動してください`）。

6. **P2: 個人運用向け最小監査（JSONL）**  
   - chat request/response, avatar event, error を時系列で1ファイル出力。  
   - 大規模監査基盤は不要、まずは「原因追跡できる」状態を確保。

7. **P2: 設定プリセット1本化（dev-personal）**  
   - 開発用設定を1プリセットに集約し、環境差分を削減。  
   - フラグ乱立を避け、再現性を上げる。

### 13.1 18:30時点の優先実行順（設計更新のみ）
- **最優先（今日）**: P0-1, P0-2
- **次点（MVP完了直後）**: P1-3, P1-4, P1-5
- **安定化枠**: P2-6, P2-7
