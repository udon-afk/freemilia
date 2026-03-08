# AIRI アバター表現改善メモ（freemilia）

最終更新: 2026-03-09 JST

目的: 表情/モーション連携を「過剰反応しない・無反応すぎない」バランスへ寄せる。

## 1) 追加した設定プロファイル
- `ops/AIRI_AVATAR_EXPRESSION_PROFILE_V1.json`

このファイルは運用時のチューニング基準値として使う（コードへの直接ハード依存はまだしない）。

## 2) 運用手順

1. AIRI を起動
2. devtools の performance playground を開く
3. 感情トークン入力で反応確認（happy/sad/angry/think/surprised/awkward/question/curious/neutral）
4. 以下観点で profile 値を更新
   - intensity が強すぎないか
   - motion の切替が頻繁すぎないか
   - neutral 復帰が遅すぎないか

## 3) 推奨チューニング方針

- `neutralAfterMs` を短め(1200-1800ms)にして顔固定化を防ぐ
- `motionCooldownMs` を 700-1200ms で設定し、ガチャガチャ感を抑制
- `think/curious/question` は intensity を控えめに（0.4-0.55）
- `surprised/happy` は短時間だけ強めに（0.75-0.85）

## 4) 実装反映の次アクション（安全な範囲）

- stage-ui の emotion queue 側で、上記 profile を読み込んで intensity clamp / cooldown を適用
- 反映前に A/B 比較（現行 vs profile）を screenshot + 簡易主観評価で記録

## 5) 注意

- モデル固有で最適値が変わるため、VRM差し替え時は再調整する
- 表情名が存在しないモデルでは `expression: null` を利用して motion 優先で破綻回避
