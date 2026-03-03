# 商品同梱ファイル構成（提案）

openclaw-template-pack/
- README.md
- 01_quickstart.md
- 02_customization_guide.md
- 03_troubleshooting.md
- templates/
  - heartbeat_prompt_template.txt
  - cron_agentturn_template.txt
  - cron_systemevent_template.txt
  - digest_report_template.txt
  - note_post_template.txt
  - booth_description_template.txt
- examples/
  - sample_config_sanitized.json
  - sample_schedule_plan.md
  - sample_kpi_sheet.md
- legal/
  - notice.txt

## 設計方針
- 個人情報・トークンは一切同梱しない
- すべてダミー値で配布
- 置換箇所を `{{...}}` で統一
