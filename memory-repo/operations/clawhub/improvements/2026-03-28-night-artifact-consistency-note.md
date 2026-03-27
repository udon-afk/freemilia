# Night Artifact Consistency Note

## Rule
深夜帯の always-run 実行では、改善ノート名と task記録名の時刻を揃える（JST基準）。

## Check
- 改善ノート: `YYYY-MM-DD-*.md`
- 実行記録: `WF-HEARTBEAT-ALWAYS-RUN--YYYY-MM-DDTHHMM+0900.yaml`
- commit に両方含める
