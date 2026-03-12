# REIA App (S1 Core MVP)

Personal-use MVP scaffold (inside `freemilia` workspace) with **no external AIRI runtime dependency**.

## Scope (S1)
- Monorepo scaffold:
  - `apps/reia-shell` (web/PWA minimal UI)
  - `apps/reia-gateway` (Node API)
  - `packages/reia-events` (shared schema/types)
- API endpoints:
  - `GET /health`
  - `POST /api/chat` (mock response behind OpenClaw adapter interface seam)
- Avatar mood mapping: `neutral | happy | thinking`
- Windows one-command startup: `scripts/dev.ps1` (PowerShell, no bash)

---

## Quick Start (macOS/Linux)
```bash
git clone <your-repo-url>
cd freemilia/products/reia-app
pnpm install
pnpm dev
```

- Shell UI: http://localhost:5173
- Gateway API: http://localhost:8787

Health check:
```bash
curl http://localhost:8787/health
```

Chat check:
```bash
curl -X POST http://localhost:8787/api/chat \
  -H 'content-type: application/json' \
  -d '{"message":"hello reia"}'
```

## Quick Start (Windows PowerShell)
```powershell
git clone <your-repo-url>
cd freemilia\products\reia-app
.\scripts\dev.ps1
```

## Notes
- `OpenClawRuntimeAdapter` exists as S1 interface seam and currently falls back to mock behavior.
- Unknown avatar event kinds are normalized to `unknown` for UI safety via `@reia/events`.
