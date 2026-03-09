# freemilia workspace

Monorepo for management, memory, planning, and monetization deliverables.

## AIRI clone → one-command run

- macOS/Linux:
  - `git clone git@github.com:udon-afk/freemilia.git && cd freemilia && bash ops/airi_bootstrap_run.sh`
- Windows (PowerShell):
  - `git clone git@github.com:udon-afk/freemilia.git; cd freemilia; powershell -ExecutionPolicy Bypass -File .\ops\windows\airi_windows_bootstrap_run.ps1`

## Structure
- `management/memory/` daily + long-term memory
- `management/planning/` execution plans and priorities
- `management/ops/` operational playbooks and runbooks
- `management/reports/` periodic digests and status reports
- `products/` revenue-oriented product work
- `docs/` shared documentation
