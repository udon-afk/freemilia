# Repo Management Plan (for udon team)

## Goal
Manage deliverables, planning, and memory notes in git so progress is transparent and recoverable.

## Tracked in git
- `memory/*.md` daily notes
- `MEMORY.md` long-term memory
- `ops/` planning and monetization docs
- project source files and docs

## Not tracked in git
- `.openclaw/` runtime internals (tokens/session data)
- large rendered videos in `out/*.mp4` (keep source/plans instead)
- logs, caches, dependencies

## Suggested update workflow
1. Work on task
2. Update related docs:
   - `ops/monetization-candidate-backlog.md`
   - `memory/YYYY-MM-DD.md`
3. Commit with clear message
4. Push to private remote

## Commit message examples
- `feat(monetization): add CTA AB test plan for note template funnel`
- `docs(memory): update 2026-03-03 progress and decisions`
- `chore(ops): tune heartbeat digest cadence to 3h`

## Security note
Use a **private repo**. Never commit API keys/tokens/secrets.
