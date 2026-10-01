const KEY = 'studydeck.v1';
const board = document.getElementById('board');
let subjects = load();

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(subjects)); } catch (e) {} }
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const elapsed = s => s.time + (s.start ? (Date.now() - s.start) / 1000 : 0);
function fmt(t) { t = Math.floor(t); return pad(Math.floor(t / 3600)) + ':' + pad(Math.floor(t % 3600 / 60)) + ':' + pad(t % 60); }

function card(s, i) {
  const n = s.topics.length, done = s.topics.filter(t => t.done).length, pct = n ? Math.round(done / n * 100) : 0;
  return `<article class="card ${s.start ? 'running' : ''}" style="--c:${s.color}" data-id="${s.id}">
    <div class="head"><span class="ord" title="Study order">${i + 1}</span>
      <input class="name" value="${esc(s.name)}" data-act="rename" aria-label="Subject name" maxlength="40">
      <input type="color" value="${s.color}" data-act="color" aria-label="Subject color">
      <div class="mv">
        <button data-act="up" ${i === 0 ? 'disabled' : ''} title="Move up" aria-label="Move up">&#9650;</button>
        <button data-act="down" ${i === subjects.length - 1 ? 'disabled' : ''} title="Move down" aria-label="Move down">&#9660;</button>
        <button data-act="del" title="Delete subject" aria-label="Delete subject">&#10005;</button>
      </div></div>
    <div class="timer"><span class="clock" data-clock>${fmt(elapsed(s))}</span>
      <button class="go" data-act="toggle">${s.start ? 'Pause' : 'Start'}</button>
      <button data-act="reset">Reset</button></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <p class="meta">${done} of ${n} topics done</p>
    <ul>${s.topics.map(t => `<li class="${t.done ? 'done' : ''}" data-tid="${t.id}">
      <label><input type="checkbox" data-act="check" ${t.done ? 'checked' : ''}><span>${esc(t.text)}</span></label>
      <button data-act="deltopic" aria-label="Delete topic">&#10005;</button></li>`).join('')}</ul>
    <form data-act="addtopic"><input placeholder="Add a topic" required maxlength="80" aria-label="New topic"><button class="go">Add</button></form>
  </article>`;
}

function totals() {
  const time = subjects.reduce((a, s) => a + elapsed(s), 0);
  const n = subjects.reduce((a, s) => a + s.topics.length, 0);
  const d = subjects.reduce((a, s) => a + s.topics.filter(t => t.done).length, 0);
  document.getElementById('totals').innerHTML =
    `<div><b>${fmt(time)}</b><span>Total study time</span></div><div><b>${d}/${n}</b><span>Topics done</span></div>`;
}

function render() {
  board.innerHTML = subjects.length ? subjects.map(card).join('')
    : '<p class="empty">No subjects yet. Add your first subject above, then add the topics you need to cover.</p>';
  totals();
}

function pause(s) { if (s.start) { s.time += (Date.now() - s.start) / 1000; s.start = null; } }
function find(e) { const c = e.target.closest('.card'); return c && subjects.find(s => s.id === c.dataset.id); }

document.getElementById('subjectForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('subjectName');
  subjects.push({ id: uid(), name: name.value.trim(), color: document.getElementById('subjectColor').value, topics: [], time: 0, start: null });
  name.value = ''; save(); render();
});

board.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]'); const s = find(e); if (!b || !s) return;
  const i = subjects.indexOf(s), act = b.dataset.act;
  if (act === 'up' && i > 0) [subjects[i - 1], subjects[i]] = [subjects[i], subjects[i - 1]];
  else if (act === 'down' && i < subjects.length - 1) [subjects[i + 1], subjects[i]] = [subjects[i], subjects[i + 1]];
  else if (act === 'del') { if (!confirm('Delete "' + s.name + '" and all its topics?')) return; subjects.splice(i, 1); }
  else if (act === 'toggle') { if (s.start) pause(s); else { subjects.forEach(pause); s.start = Date.now(); } }
  else if (act === 'reset') { if (!confirm('Reset the timer for "' + s.name + '"?')) return; s.time = 0; if (s.start) s.start = Date.now(); }
  else if (act === 'deltopic') { const id = b.closest('li').dataset.tid; s.topics = s.topics.filter(t => t.id !== id); }
  else return;
  save(); render();
});

board.addEventListener('change', e => {
  const s = find(e), act = e.target.dataset.act; if (!s) return;
  if (act === 'rename') { s.name = e.target.value.trim() || s.name; e.target.value = s.name; save(); return; }
  if (act === 'color') s.color = e.target.value;
  else if (act === 'check') { const t = s.topics.find(t => t.id === e.target.closest('li').dataset.tid); t.done = e.target.checked; }
  else return;
  save(); render();
});

board.addEventListener('submit', e => {
  e.preventDefault(); const s = find(e); if (!s) return;
  const input = e.target.querySelector('input');
  s.topics.push({ id: uid(), text: input.value.trim(), done: false });
  save(); render();
});

setInterval(() => {
  document.querySelectorAll('.card').forEach(c => {
    const s = subjects.find(x => x.id === c.dataset.id);
    if (s) c.querySelector('[data-clock]').textContent = fmt(elapsed(s));
  });
  totals();
}, 1000);

render();
