// ── Firebase setup ─────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyHS3kZ1miGQ5u4kVj_0XPN3AQkv_Da0A",
  authDomain: "beer-counter-f7b23.firebaseapp.com",
  databaseURL: "https://beer-counter-f7b23-default-rtdb.firebaseio.com",
  projectId: "beer-counter-f7b23",
  storageBucket: "beer-counter-f7b23.firebasestorage.app",
  messagingSenderId: "242962169788",
  appId: "1:242962169788:web:3e78bec079f9fda23875b9"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ── User identity ──────────────────────────────────────────────────────
function getMyCode() { return localStorage.getItem('friendCode'); }
function getMyName() { return localStorage.getItem('userName'); }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Onboarding ─────────────────────────────────────────────────────────
function checkOnboarding() {
  if (!getMyName() || !getMyCode()) {
    document.getElementById('onboarding').classList.remove('hidden');
  } else {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
  }
}

window.finishOnboarding = function() {
  const name = document.getElementById('ob-name').value.trim();
  if (!name) {
    document.getElementById('ob-name').placeholder = 'Please enter a name!';
    return;
  }
  const code = generateCode();
  localStorage.setItem('userName', name);
  localStorage.setItem('friendCode', code);
  set(ref(db, `users/${code}`), { name, code, beers: {} });
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
};

// ── Night key logic ────────────────────────────────────────────────────
function getNightKey(date) {
  const d = date || new Date();
  if (d.getHours() < 8) {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    return formatKey(prev);
  }
  return formatKey(d);
}

function formatKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(key) {
  const [y, m, d] = key.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Local storage + Firebase sync ─────────────────────────────────────
function getData() {
  try { return JSON.parse(localStorage.getItem('beerData') || '{}'); }
  catch { return {}; }
}

function saveData(data) {
  localStorage.setItem('beerData', JSON.stringify(data));
  const code = getMyCode();
  if (code) set(ref(db, `users/${code}/beers`), data);
}

function getCount(key) {
  const data = getData();
  return data[key] !== undefined ? data[key] : 0;
}

// ── Beer counter ───────────────────────────────────────────────────────
window.addBeer = function(delta) {
  const key = getNightKey();
  const data = getData();
  data[key] = Math.max(0, (data[key] || 0) + delta);
  saveData(data);
  renderCounter(delta);
};

function renderCounter(delta) {
  const key = getNightKey();
  const count = getCount(key);
  const el = document.getElementById('beer-count');
  el.textContent = count;
  el.classList.remove('bump', 'debump');
  void el.offsetWidth;
  el.classList.add(delta > 0 ? 'bump' : delta < 0 ? 'debump' : '');
  setTimeout(() => el.classList.remove('bump', 'debump'), 200);
  document.getElementById('display-date').textContent = formatDisplay(key);
}

// ── Tabs — initialized immediately on load ─────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'counter') renderCounter(0);
      if (tab.dataset.tab === 'calendar') renderCalendar();
      if (tab.dataset.tab === 'leaderboard') renderLeaderboard();
    });
  });
}

// ── Calendar ───────────────────────────────────────────────────────────
let selectedDayKey = null;
let calendarDate = new Date();

window.selectDay = function(key, cellEl) {
  selectedDayKey = key;
  document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
  cellEl.classList.add('selected');
  const data = getData();
  const count = data[key] || 0;
  const [y, m, d] = key.split('-');
  const date = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
  const label = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }).toUpperCase();
  document.getElementById('cal-edit-date').textContent = label;
  document.getElementById('cal-edit-count').textContent = count;
  document.getElementById('cal-edit').style.display = 'block';
};

window.editDay = function(delta) {
  if (!selectedDayKey) return;
  const data = getData();
  const next = Math.max(0, (data[selectedDayKey] || 0) + delta);
  if (next === 0) delete data[selectedDayKey];
  else data[selectedDayKey] = next;
  saveData(data);
  document.getElementById('cal-edit-count').textContent = next;
  // If editing tonight's date, keep the counter tab in sync
  if (selectedDayKey === getNightKey()) renderCounter(0);
  renderCalendar();
  document.querySelectorAll('.cal-cell[data-key]').forEach(c => {
    if (c.dataset.key === selectedDayKey) c.classList.add('selected');
  });
};

window.changeMonth = function(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta);
  renderCalendar();
};

function renderCalendar() {
  const data = getData();
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  document.getElementById('cal-month-label').textContent =
    calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  const grid = document.getElementById('cal-grid');
  const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
  grid.innerHTML = '';
  headers.forEach(h => grid.appendChild(h));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getNightKey();
  let monthTotal = 0;

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-cell empty';
    grid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count = data[key] || 0;
    monthTotal += count;

    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.key = key;
    if (key === todayKey) cell.classList.add('today');
    if (count > 0) cell.classList.add('has-drinks');
    if (key === selectedDayKey) cell.classList.add('selected');
    cell.addEventListener('click', () => window.selectDay(key, cell));

    const dayNum = document.createElement('div');
    dayNum.className = 'cal-day-num';
    dayNum.textContent = d;
    cell.appendChild(dayNum);

    if (count > 0) {
      const countEl = document.createElement('div');
      countEl.className = 'cal-me-count';
      countEl.textContent = count;
      cell.appendChild(countEl);
    }
    grid.appendChild(cell);
  }

  document.getElementById('month-total').textContent = monthTotal;
  const allTime = Object.values(data).reduce((s, v) => s + (v || 0), 0);
  document.getElementById('alltime-total').textContent = allTime;
}

// ── Leaderboard ────────────────────────────────────────────────────────
let lbPeriod = 'tonight';

window.setLbPeriod = function(period) {
  lbPeriod = period;
  document.querySelectorAll('.lb-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.period === period)
  );
  renderLeaderboard();
};

function getScore(beers, period) {
  if (!beers) return 0;
  if (period === 'tonight') return beers[getNightKey()] || 0;
  if (period === 'alltime') return Object.values(beers).reduce((s, v) => s + (v || 0), 0);
  if (period === 'month') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return Object.entries(beers)
      .filter(([k]) => k.startsWith(`${y}-${m}`))
      .reduce((s, [, v]) => s + (v || 0), 0);
  }
  return 0;
}

function renderLeaderboard() {
  const myCode = getMyCode();
  if (!myCode) return;
  const friends = getFriends();
  const allCodes = [myCode, ...friends];
  const list = document.getElementById('lb-list');
  list.innerHTML = '<div class="lb-loading">Loading...</div>';

  Promise.all(allCodes.map(code =>
    get(ref(db, `users/${code}`)).then(snap => snap.val())
  )).then(users => {
    const valid = users.filter(Boolean);
    valid.sort((a, b) => getScore(b.beers, lbPeriod) - getScore(a.beers, lbPeriod));
    list.innerHTML = '';
    if (valid.length === 0) {
      list.innerHTML = '<div class="lb-empty">No friends yet — share your code!</div>';
      return;
    }
    valid.forEach((user, i) => {
      const score = getScore(user.beers, lbPeriod);
      const isMe = user.code === myCode;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      const row = document.createElement('div');
      row.className = 'lb-row' + (isMe ? ' lb-me' : '');
      row.innerHTML = `
        <div class="lb-rank">${medal}</div>
        <div class="lb-name">${user.name}${isMe ? ' (you)' : ''}</div>
        <div class="lb-score">${score} 🍺</div>
      `;
      list.appendChild(row);
    });
  }).catch(() => {
    list.innerHTML = '<div class="lb-empty">Could not load leaderboard.</div>';
  });
}

// ── Friends ────────────────────────────────────────────────────────────
function getFriends() {
  try { return JSON.parse(localStorage.getItem('friends') || '[]'); }
  catch { return []; }
}

function saveFriends(f) { localStorage.setItem('friends', JSON.stringify(f)); }

window.addFriend = async function() {
  const input = document.getElementById('af-input');
  const code = input.value.trim().toUpperCase();
  const err = document.getElementById('af-error');
  err.textContent = '';
  if (code.length < 6) { err.textContent = 'Codes are 6 characters.'; return; }
  if (code === getMyCode()) { err.textContent = "That's your own code!"; return; }
  if (getFriends().includes(code)) { err.textContent = 'Already added!'; return; }
  const snap = await get(ref(db, `users/${code}`));
  if (!snap.exists()) { err.textContent = 'Code not found. Check with your friend.'; return; }
  const friends = getFriends();
  friends.push(code);
  saveFriends(friends);
  input.value = '';
  closeModal('af-modal');
  renderLeaderboard();
};

// ── Modals ─────────────────────────────────────────────────────────────
window.showModal = function(id) {
  if (id === 'fc-modal') document.getElementById('modal-code').textContent = getMyCode();
  document.getElementById(id).classList.remove('hidden');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
};

window.copyCode = function() {
  navigator.clipboard.writeText(getMyCode()).then(() => {
    const btn = document.querySelector('#fc-modal .modal-btn');
    btn.textContent = 'COPIED!';
    setTimeout(() => btn.textContent = 'COPY CODE', 2000);
  });
};

// ── Init ───────────────────────────────────────────────────────────────
function initApp() {
  document.getElementById('lb-username').textContent = getMyName();
  renderCounter(0);
}

// Tabs always init at page load regardless of onboarding state
initTabs();
checkOnboarding();
