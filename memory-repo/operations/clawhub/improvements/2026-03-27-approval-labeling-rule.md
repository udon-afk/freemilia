# ClawHub Approval Labeling Rule

## Rule
外部影響操作が pending の場合、Today Plan / Today Report の末尾に必ず
`Status: waiting_approval` を1行追加する。

## Why
- 承認待ちの見落としを防ぐ
- 反映後の運用状態を一目で判断できる

## Apply scope
- heartbeat運用で作成する日次Plan/Report
