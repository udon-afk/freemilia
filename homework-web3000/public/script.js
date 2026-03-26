// --- navigation ---
const navButtons = document.querySelectorAll('.nav');
const views = document.querySelectorAll('.view');

function showView(name){
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.view===name));
  views.forEach(v => v.classList.toggle('show', v.id === `view-${name}`));
}

navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));

// --- quick actions / monitor / summary ---
const actionLogEl = document.getElementById('actionLog');
const monitorListEl = document.getElementById('monitorList');
const summaryListEl = document.getElementById('summaryList');
const todaySyncLogEl = document.getElementById('todaySyncLog');
const wfResultEl = document.getElementById('wfResult');

async function runAction(kind){
  actionLogEl.textContent = `実行中: ${kind} ...`;
  try{
    const r = await fetch(`/api/actions/run/${kind}`, { method: 'POST' });
    const j = await r.json();
    actionLogEl.textContent = `実行: ${kind}\n` + (j.stdout || '') + '\n' + (j.stderr || '');
  }catch(e){
    actionLogEl.textContent = `実行失敗: ${kind}`;
  }
}

async function loadMonitor(){
  monitorListEl.innerHTML = '<li>読み込み中...</li>';
  try{
    const r = await fetch('/api/monitor');
    const j = await r.json();
    const openclawOk = !!(j.openclaw && j.openclaw.ok);
    monitorListEl.innerHTML = `
      <li>ops-console: <strong>${j.opsConsole ? '🟢 active' : '🔴 down'}</strong></li>
      <li>openclaw status: <strong>${openclawOk ? '🟢 ok' : '🔴 error'}</strong></li>
    `;
  }catch(e){
    monitorListEl.innerHTML = '<li>監視取得失敗</li>';
  }
}

async function loadSummary(){
  summaryListEl.innerHTML = '<li>読み込み中...</li>';
  try{
    const r = await fetch('/api/summary/today');
    const j = await r.json();
    summaryListEl.innerHTML = `
      <li>日付: ${j.date}</li>
      <li>money task: ${j.moneyExists ? '✅ あり' : '⚠️ なし'}<br><span class="muted">${j.moneyTask}</span></li>
      <li>news file: ${j.newsExists ? '✅ あり' : '⚠️ なし'}<br><span class="muted">${j.newsFile}</span></li>
    `;
  }catch(e){
    summaryListEl.innerHTML = '<li>サマリー取得失敗</li>';
  }
}

async function loadTodaySync(){
  if(!todaySyncLogEl) return;
  todaySyncLogEl.textContent='読み込み中...';
  try{
    const r = await fetch('/api/today/sync');
    const j = await r.json();
    todaySyncLogEl.textContent = JSON.stringify(j, null, 2);
  }catch(e){
    todaySyncLogEl.textContent = 'Today同期取得失敗';
  }
}

async function registerWorkflow(){
  if(!wfResultEl) return;
  const payload = {
    title: document.getElementById('wfTitle')?.value || '',
    due: document.getElementById('wfDue')?.value || '',
    summary: document.getElementById('wfSummary')?.value || '',
    destination: document.getElementById('wfDst')?.value || 'channel:1472610044687290439'
  };
  wfResultEl.textContent='登録中...';
  try{
    const r = await fetch('/api/workflows/register', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload)});
    const j = await r.json();
    wfResultEl.textContent = JSON.stringify(j, null, 2);
  }catch(e){
    wfResultEl.textContent='登録失敗';
  }
}

document.getElementById('runNews')?.addEventListener('click', () => runAction('news'));
document.getElementById('runMoney')?.addEventListener('click', () => runAction('money'));
document.getElementById('runHeartbeat')?.addEventListener('click', () => runAction('heartbeat'));
document.getElementById('refreshMonitor')?.addEventListener('click', async () => { await loadMonitor(); await loadSummary(); });
document.getElementById('refreshTodaySync')?.addEventListener('click', loadTodaySync);
document.getElementById('wfRegister')?.addEventListener('click', registerWorkflow);

// --- focus tools ---
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodo');
const todoListEl = document.getElementById('todoList');
const memoEl = document.getElementById('memo');

const TODO_KEY = 'focusdesk_todos';
const MEMO_KEY = 'focusdesk_memo';

let todos = JSON.parse(localStorage.getItem(TODO_KEY) || '[]');
let memo = localStorage.getItem(MEMO_KEY) || '';

function saveTodos(){ localStorage.setItem(TODO_KEY, JSON.stringify(todos)); }

function renderTodos(){
  todoListEl.innerHTML = '';
  todos.forEach((t, i) => {
    const li = document.createElement('li');
    if (t.done) li.classList.add('done');

    const text = document.createElement('span');
    text.textContent = t.text;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const toggle = document.createElement('button');
    toggle.textContent = t.done ? '戻す' : '完了';
    toggle.onclick = () => { todos[i].done = !todos[i].done; saveTodos(); renderTodos(); };

    const del = document.createElement('button');
    del.textContent = '削除';
    del.onclick = () => { todos.splice(i, 1); saveTodos(); renderTodos(); };

    actions.append(toggle, del);
    li.append(text, actions);
    todoListEl.append(li);
  });
}

addTodoBtn.onclick = () => {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.push({ text, done: false });
  todoInput.value = '';
  saveTodos();
  renderTodos();
};

memoEl.value = memo;
memoEl.addEventListener('input', () => localStorage.setItem(MEMO_KEY, memoEl.value));

const mascotFrames = {
  idle: ['/static/mascot/idle_1.png','/static/mascot/idle_2.png','/static/mascot/idle_3.png','/static/mascot/idle_4.png'],
  running: ['/static/mascot/running_1.png','/static/mascot/running_2.png','/static/mascot/running_3.png','/static/mascot/running_4.png'],
  success: ['/static/mascot/success_1.png','/static/mascot/success_2.png','/static/mascot/success_3.png','/static/mascot/success_4.png'],
  failed: ['/static/mascot/failed_1.png','/static/mascot/failed_2.png','/static/mascot/failed_3.png','/static/mascot/failed_4.png'],
};
let mascotState='idle';
let mascotIdx=0;
setInterval(()=>{
  const list = mascotFrames[mascotState] || mascotFrames.idle;
  mascotIdx = (mascotIdx+1)%list.length;
  const img = document.getElementById('mascotImg');
  if(img) img.src = list[mascotIdx];
},320);

async function refreshMascot(){
  try{
    const r = await fetch('/api/mascot/status');
    const j = await r.json();
    mascotState = j.state || 'idle';
    const msg = document.getElementById('mascotMsg');
    if(msg) msg.textContent = `${mascotState} | ${j.message || ''}`;
  }catch(e){
    mascotState='failed';
  }
}

renderTodos();
loadMonitor();
loadSummary();
loadTodaySync();
refreshMascot();
setInterval(refreshMascot, 10000);
