import './style.css';
import { STORAGE_KEY, createQuest, defaultState, difficultyXP, levelFromXP, resetDailies, safeParseState } from './model.js';

const app = document.querySelector('#app');
let state = resetDailies(safeParseState(localStorage.getItem(STORAGE_KEY)) || defaultState());
let filter = 'all';
let editingId = null;
let toastTimer;

const icons = {
  VTuber: '✦', 創作: '✎', 音声: '◉', イラスト: '◇', 生活: '⌂'
};
const categoryClass = { VTuber: 'cyan', 創作: 'violet', 音声: 'pink', イラスト: 'blue', 生活: 'green' };

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function visibleQuests() {
  if (filter === 'daily') return state.quests.filter((q) => q.daily);
  if (filter === 'main') return state.quests.filter((q) => q.type === 'main');
  if (filter === 'sub') return state.quests.filter((q) => q.type === 'sub');
  return state.quests;
}

function render() {
  const level = levelFromXP(state.totalXP);
  const quests = visibleQuests();
  const open = state.quests.filter((q) => !q.completed).length;
  const doneToday = state.quests.filter((q) => q.completed && q.completedAt?.startsWith(new Date().toISOString().slice(0, 10))).length;
  app.innerHTML = `
    <div class="aurora aurora-one"></div><div class="aurora aurora-two"></div>
    <header class="topbar">
      <a class="brand" href="#"><span class="brand-gem">✦</span><span>LIFE QUEST<small>ADVENTURER'S BOARD</small></span></a>
      <div class="header-actions">
        <button class="icon-button" id="exportBtn" title="バックアップを書き出す" aria-label="バックアップを書き出す">↓</button>
        <button class="icon-button" id="importBtn" title="バックアップを復元" aria-label="バックアップを復元">↑</button>
        <input type="file" id="fileInput" accept="application/json" hidden>
        <div class="profile"><span class="avatar">P</span><span><b>${escapeHTML(state.playerName)}</b><small>冒険者</small></span></div>
      </div>
    </header>
    <main>
      <section class="hero">
        <div class="eyebrow"><span></span> MY ADVENTURE LOG <span></span></div>
        <h1>さあ、今日の<br><em>冒険を始めよう。</em></h1>
        <p>小さな一歩も、すべて経験値になる。</p>
      </section>
      <section class="status-card glass">
        <div class="level-orb"><span>LEVEL</span><strong>${level.level}</strong></div>
        <div class="level-info"><div class="level-row"><span><b>${escapeHTML(state.playerName)}</b> のステータス</span><span>${level.current} / ${level.needed} XP</span></div><div class="xp-track"><i style="width:${level.current / level.needed * 100}%"></i></div><p>次のレベルまで <b>${level.needed - level.current} XP</b></p></div>
        <div class="status-stats"><div><strong>${open}</strong><span>進行中</span></div><div><strong>${doneToday}</strong><span>本日完了</span></div><div><strong>${state.totalXP}</strong><span>総 XP</span></div></div>
      </section>
      <section class="board-head">
        <div><span class="section-kicker">QUEST BOARD</span><h2>今日のクエスト</h2><p>いまの自分にできる冒険を選ぼう</p></div>
        <button class="primary" id="addBtn"><span>＋</span> クエストを追加</button>
      </section>
      <nav class="filters" aria-label="クエストの絞り込み">
        ${[['all','すべて'],['main','メイン'],['sub','サブ'],['daily','デイリー']].map(([key,label]) => `<button data-filter="${key}" class="${filter===key?'active':''}">${label}<span>${key==='all'?state.quests.length:key==='daily'?state.quests.filter(q=>q.daily).length:state.quests.filter(q=>q.type===key).length}</span></button>`).join('')}
      </nav>
      <section class="quest-list" aria-live="polite">
        ${quests.length ? quests.map(questCard).join('') : `<div class="empty glass"><span>✧</span><h3>クエストはありません</h3><p>新しい冒険を追加してみましょう。</p></div>`}
      </section>
      <footer><span>✦</span> 今日も、自分のペースで。 <span>✦</span></footer>
    </main>
    <dialog id="questDialog">${questForm()}</dialog>
    <div class="toast" id="toast" role="status"></div>
    <div class="celebration" id="celebration" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}<strong>QUEST CLEAR!<small>経験値を獲得しました</small></strong></div>
  `;
  bindEvents();
}

function questCard(q) {
  const deadline = q.deadline ? new Date(`${q.deadline}T00:00:00`).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '期限なし';
  const priority = { high: '最優先', medium: '優先', low: 'ゆっくり' }[q.priority];
  return `<article class="quest-card glass ${q.completed ? 'completed' : ''}" data-id="${q.id}">
    <button class="check" data-action="toggle" aria-label="${q.completed?'未完了に戻す':'完了にする'}">${q.completed?'✓':''}</button>
    <div class="quest-icon ${categoryClass[q.category] || 'violet'}">${icons[q.category] || '✦'}</div>
    <div class="quest-body">
      <div class="tags"><span class="type-tag ${q.type}">${q.type === 'main' ? '◆ MAIN QUEST' : q.daily ? '↻ DAILY' : 'SUB QUEST'}</span><span>${escapeHTML(q.category)}</span><span class="difficulty ${q.difficulty.toLowerCase()}">${q.difficulty}</span></div>
      <h3>${escapeHTML(q.title)}</h3>
      <div class="meta"><span>◷ ${q.duration}分</span><span>⌁ ${deadline}</span><span class="priority ${q.priority}">● ${priority}</span></div>
      ${q.mini ? `<button class="mini" data-action="mini"><b>⚡ 5分だけやる</b><span>${escapeHTML(q.mini)}</span><i>→</i></button>` : ''}
    </div>
    <div class="quest-reward"><span>REWARD</span><b>+${q.xp} XP</b><div><button data-action="edit" aria-label="編集">✎</button><button data-action="delete" aria-label="削除">×</button></div></div>
  </article>`;
}

function questForm() {
  const q = editingId ? state.quests.find((item) => item.id === editingId) : null;
  return `<form method="dialog" id="questForm"><div class="dialog-head"><div><span class="section-kicker">NEW ADVENTURE</span><h2>${q ? 'クエストを編集' : 'クエストを追加'}</h2></div><button value="cancel" class="close" aria-label="閉じる">×</button></div>
    <label>クエスト名<input name="title" required maxlength="80" placeholder="何を達成する？" value="${escapeHTML(q?.title || '')}"></label>
    <div class="form-grid"><label>カテゴリー<select name="category">${['VTuber','創作','音声','イラスト','生活'].map(v=>`<option ${q?.category===v?'selected':''}>${v}</option>`).join('')}</select></label><label>種類<select name="type"><option value="main" ${q?.type==='main'?'selected':''}>メイン</option><option value="sub" ${!q||q.type==='sub'?'selected':''}>サブ</option></select></label></div>
    <div class="form-grid"><label>難易度<select name="difficulty" id="difficulty">${Object.keys(difficultyXP).map(v=>`<option ${q?.difficulty===v?'selected':''}>${v}</option>`).join('')}</select></label><label>獲得 XP<input name="xp" id="xp" type="number" min="1" max="999" value="${q?.xp || 40}"></label></div>
    <div class="form-grid"><label>優先度<select name="priority"><option value="high" ${q?.priority==='high'?'selected':''}>最優先</option><option value="medium" ${!q||q.priority==='medium'?'selected':''}>優先</option><option value="low" ${q?.priority==='low'?'selected':''}>ゆっくり</option></select></label><label>所要時間（分）<input name="duration" type="number" min="1" max="999" value="${q?.duration || 15}"></label></div>
    <label>締切<input name="deadline" type="date" value="${q?.deadline || ''}"></label>
    <label>「5分だけやる」最小版<input name="mini" maxlength="80" placeholder="最初の小さな一歩" value="${escapeHTML(q?.mini || '')}"></label>
    <label class="checkbox"><input name="daily" type="checkbox" ${q?.daily?'checked':''}><span></span> 毎日リセットするデイリークエスト</label>
    <div class="dialog-actions"><button value="cancel" class="secondary">キャンセル</button><button value="default" class="primary">${q?'変更を保存':'クエストを作成'}</button></div>
  </form>`;
}

function bindEvents() {
  document.querySelectorAll('[data-filter]').forEach((btn) => btn.addEventListener('click', () => { filter = btn.dataset.filter; render(); }));
  document.querySelector('#addBtn').addEventListener('click', () => openDialog());
  document.querySelectorAll('.quest-card button[data-action]').forEach((btn) => btn.addEventListener('click', () => handleQuestAction(btn.closest('.quest-card').dataset.id, btn.dataset.action)));
  document.querySelector('#exportBtn').addEventListener('click', exportJSON);
  document.querySelector('#importBtn').addEventListener('click', () => document.querySelector('#fileInput').click());
  document.querySelector('#fileInput').addEventListener('change', importJSON);
}

function openDialog(id = null) {
  editingId = id;
  const old = document.querySelector('#questDialog');
  old.innerHTML = questForm();
  const form = old.querySelector('form');
  form.querySelector('#difficulty').addEventListener('change', (e) => { form.querySelector('#xp').value = difficultyXP[e.target.value]; });
  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.daily = form.elements.daily.checked;
    if (editingId) state.quests = state.quests.map((q) => q.id === editingId ? createQuest({ ...q, ...data }) : q);
    else state.quests.unshift(createQuest(data));
    save(); old.close(); render(); showToast(editingId ? 'クエストを更新しました' : '新しいクエストが届きました');
  });
  old.showModal();
  setTimeout(() => form.elements.title.focus(), 50);
}

function handleQuestAction(id, action) {
  const quest = state.quests.find((q) => q.id === id);
  if (action === 'edit') return openDialog(id);
  if (action === 'delete') {
    if (confirm(`「${quest.title}」を削除しますか？`)) { state.quests = state.quests.filter((q) => q.id !== id); save(); render(); showToast('クエストを削除しました'); }
    return;
  }
  if (action === 'mini') return showToast(`⚡ まずはこれだけ：${quest.mini}`);
  if (action === 'toggle') {
    quest.completed = !quest.completed;
    quest.completedAt = quest.completed ? new Date().toISOString() : null;
    state.totalXP = Math.max(0, state.totalXP + (quest.completed ? quest.xp : -quest.xp));
    save(); render();
    if (quest.completed) celebrate(quest.xp);
  }
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function celebrate(xp) {
  const el = document.querySelector('#celebration');
  el.querySelector('small').textContent = `+${xp} XP を獲得しました`;
  el.classList.add('play'); setTimeout(() => el.classList.remove('play'), 1800);
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `life-quest-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('バックアップを書き出しました');
}

async function importJSON(event) {
  const file = event.target.files[0]; if (!file) return;
  const imported = safeParseState(await file.text());
  if (!imported) return showToast('このファイルは復元できません');
  state = resetDailies(imported); save(); render(); showToast('バックアップを復元しました');
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
}

save(); render();
