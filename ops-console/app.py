from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote_plus
import yaml
import re

app = FastAPI(title="OpenClaw Ops Console")
templates = Jinja2Templates(directory="/root/.openclaw/workspace/ops-console/templates")

CRON_IDS = {
    "news": "cc2190ef-86e7-44dd-b3f7-fcb589179ad1",
    "money": "eca8da38-13e9-411d-bb45-ac7f6d10fb0b",
    "heartbeat": "d2d7688a-f6e7-4b78-841f-fda69db1883d",
}
app.mount(
    "/tools/focus-desk",
    StaticFiles(directory="/root/.openclaw/workspace/homework-web3000/public", html=True),
    name="focus-desk",
)


@app.get("/tools/focus-desk/chat")
def focus_desk_chat_redirect():
    return RedirectResponse(url="/tools/focus-desk", status_code=307)


def run_cmd(cmd: str):
    wrapped = f"export PATH=/root/.nvm/versions/node/v24.13.1/bin:$PATH; {cmd}"
    p = subprocess.run(wrapped, shell=True, capture_output=True, text=True, executable="/bin/bash")
    return {"ok": p.returncode == 0, "code": p.returncode, "stdout": p.stdout[-4000:], "stderr": p.stderr[-2000:]}


def jst_today_str() -> str:
    jst = timezone(timedelta(hours=9))
    return datetime.now(jst).strftime("%Y-%m-%d")


def load_today_news():
    date_str = jst_today_str()
    path = Path(f"/root/.openclaw/workspace/tasks/WF-AI-NEWS-DAILY-0700--{date_str}.yaml")
    if not path.exists():
        return {"ok": False, "date": date_str, "items": [], "error": "today file not found"}

    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    items = []
    next_actions = data.get("next_actions", []) or []

    # schema A: report[]
    if isinstance(data.get("report"), list):
        for r in data.get("report", []):
            items.append({
                "source": r.get("source", ""),
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "note": r.get("note", ""),
                "published_at": r.get("published_at", ""),
            })

    # schema B: items[]
    if not items and isinstance(data.get("items"), list):
        for r in data.get("items", []):
            items.append({
                "source": r.get("source", ""),
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "note": r.get("summary", r.get("note", "")),
                "published_at": r.get("published_at", r.get("published_at_utc", "")),
            })

    for item in items:
        if not item.get("url"):
            q = quote_plus(f"{item.get('source','')} {item.get('title','')}")
            item["url"] = f"https://www.google.com/search?q={q}"

    return {"ok": True, "date": date_str, "items": items, "next_actions": next_actions, "sourcePath": str(path)}


def service_active(name: str) -> bool:
    p = subprocess.run(f"systemctl is-active {name}", shell=True, capture_output=True, text=True)
    return p.returncode == 0 and p.stdout.strip() == "active"


def build_daily_summary():
    date_str = jst_today_str()
    tasks_root = Path("/root/.openclaw/workspace/tasks")
    money_dir = tasks_root / f"TASK-MONEY-{date_str}"
    news_file = tasks_root / f"WF-AI-NEWS-DAILY-0700--{date_str}.yaml"
    return {
        "date": date_str,
        "moneyTask": str(money_dir),
        "moneyExists": money_dir.exists(),
        "newsFile": str(news_file),
        "newsExists": news_file.exists(),
    }


@app.get("/api/monitor")
def api_monitor():
    return {
        "ok": True,
        "opsConsole": service_active("ops-console.service"),
        "openclaw": run_cmd("openclaw status"),
    }


@app.post("/api/actions/run/{kind}")
def api_run_action(kind: str):
    if kind not in CRON_IDS:
        return JSONResponse({"ok": False, "error": "invalid action"}, status_code=400)
    return run_cmd(f"openclaw cron run {CRON_IDS[kind]}")


@app.get("/api/summary/today")
def api_summary_today():
    return {"ok": True, **build_daily_summary()}


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    status = run_cmd("openclaw status")
    cron = run_cmd("openclaw cron list")
    return templates.TemplateResponse("index.html", {"request": request, "status": status, "cron": cron})


@app.post("/api/heartbeat/{action}")
def heartbeat(action: str):
    if action not in {"enable", "disable"}:
        return JSONResponse({"ok": False, "error": "invalid action"}, status_code=400)
    return run_cmd(f"openclaw system heartbeat {action}")


@app.post("/api/cron/{action}")
def cron(action: str):
    if action not in {"list"}:
        return JSONResponse({"ok": False, "error": "invalid action"}, status_code=400)
    return run_cmd("openclaw cron list")


@app.post("/api/status")
def status():
    return run_cmd("openclaw status")


@app.get("/api/news/today")
def api_news_today():
    return load_today_news()


@app.get("/hub", response_class=HTMLResponse)
def hub(request: Request):
    status = run_cmd("openclaw status")
    cron = run_cmd("openclaw cron list")
    return templates.TemplateResponse("hub.html", {"request": request, "status": status, "cron": cron})


@app.get("/hub/chat", response_class=HTMLResponse)
def hub_chat(request: Request):
    status = run_cmd("openclaw status")
    cron = run_cmd("openclaw cron list")
    return templates.TemplateResponse("hub.html", {"request": request, "status": status, "cron": cron})


@app.get("/news/today-ja", response_class=HTMLResponse)
def news_today_ja(request: Request):
    data = load_today_news()
    return templates.TemplateResponse("news_today_ja.html", {"request": request, "news": data})


@app.get("/api/user/profile")
def api_user_profile_get():
    path = Path("/root/.openclaw/workspace/USER.md")
    if not path.exists():
        return {"ok": False, "error": "USER.md not found", "content": ""}
    return {"ok": True, "content": path.read_text(encoding="utf-8")}


@app.post("/api/user/profile")
async def api_user_profile_save(request: Request):
    body = await request.json()
    content = body.get("content", "")
    path = Path("/root/.openclaw/workspace/USER.md")
    path.write_text(content, encoding="utf-8")
    return {"ok": True, "saved": True, "bytes": len(content.encode('utf-8'))}


def _slug(s: str) -> str:
    x = re.sub(r"[^a-zA-Z0-9]+", "-", (s or "task").strip()).strip("-").lower()
    return x or "task"


def _upsert_active_project_ref(ref_path: str):
    idx = Path("/root/.openclaw/workspace/memory-repo/indexes/active_projects.yaml")
    data = {"projects": [], "updated_at": jst_today_str()}
    if idx.exists():
        data = yaml.safe_load(idx.read_text(encoding="utf-8")) or data
    projects = data.get("projects") or []
    target = None
    for p in projects:
        if p.get("id") == "PRJ-HEARTBEAT-ORCHESTRATION":
            target = p
            break
    if target is None:
        target = {
            "id": "PRJ-HEARTBEAT-ORCHESTRATION",
            "name": "Heartbeat Orchestration Core",
            "status": "active",
            "priority": "high",
            "refs": [],
        }
        projects.append(target)
    refs = target.get("refs") or []
    if ref_path not in refs:
        refs.append(ref_path)
    target["refs"] = refs
    data["projects"] = projects
    data["updated_at"] = jst_today_str()
    idx.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


@app.post("/api/workflows/register")
async def api_workflow_register(request: Request):
    body = await request.json()
    title = (body.get("title") or "One-shot Task").strip()
    summary = (body.get("summary") or "").strip()
    destination = (body.get("destination") or "channel:1472610044687290439").strip()
    due = (body.get("due") or "").strip()
    if not due:
        return JSONResponse({"ok": False, "error": "due is required"}, status_code=400)

    date_str = jst_today_str()
    wf_id = f"WF-ONESHOT-{_slug(title).upper()}-{date_str}"
    filename = f"{_slug(title)}-oneshot-{date_str}.yaml"
    rel = f"memory-repo/operations/workflows/{filename}"
    wf_path = Path("/root/.openclaw/workspace") / rel

    payload = {
        "id": wf_id,
        "name": title,
        "status": "active",
        "owner": "orchestrator",
        "schedule": {"type": "one_shot", "due": due, "timezone": "Asia/Tokyo"},
        "trigger": {"source": "heartbeat", "condition": "now <= due and no done record"},
        "task": {"type": "research_report", "summary": summary or title, "steps": [summary or title]},
        "output": {"destination": destination, "format": "short_bullets"},
        "state": {"last_run_at": None, "last_status": "pending", "dedupe_key": _slug(title) + "-" + date_str},
        "cleanup": {"after_done": True, "action": "set status=done and remove workflow file"},
        "approval": {"required": False},
    }

    wf_path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")
    _upsert_active_project_ref(rel)
    return {"ok": True, "id": wf_id, "workflow": rel}


@app.get("/profile/user", response_class=HTMLResponse)
def profile_user_page(request: Request):
    return templates.TemplateResponse("user_profile_editor.html", {"request": request})


@app.get("/strategy/money", response_class=HTMLResponse)
def strategy_money_page(request: Request):
    return templates.TemplateResponse("money_strategy.html", {"request": request})
