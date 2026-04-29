// ── "What night is it?" logic ──────────────────────────────────────────
// Midnight–3:59 AM still counts as the previous night
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

// ── Storage ────────────────────────────────────────────────────────────
function getData() {
  try { return JSON.parse(localStorage.getItem('beerData') || '{}'); }
  catch { return {}; }
}

function saveData(data) {
  localStorage.setItem('beerData', JSON.stringify(data));
}

function getCount(key) {
  const data = getData();
  return (data[key] !== undefined) ? data[key] : 0;
}

function setCount(key, val) {
  const data = getData();
  data[key] = Math.max(0, val);
  saveData(data);
}

// ── Add / subtract ─────────────────────────────────────────────────────
function addBeer(delta) {
  const key = getNightKey();
  const next = Math.max(0, getCount(key) + delta);
  setCount(key, next);
  renderCounter(delta);
}

function resetTonight() {
  const key = getNightKey();
  const data = getData();
  delete data[key];
  saveData(data);
  renderCounter(0);
}

// ── Render counter ─────────────────────────────────────────────────────
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

// ── Tab switching ──────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'calendar') renderCalendar();
  });
});

// ── Calendar ───────────────────────────────────────────────────────────
let selectedDayKey = null;

function selectDay(key, cellEl) {
  selectedDayKey = key;

  // Highlight selected cell
  document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
  cellEl.classList.add('selected');

  // Show edit panel
  const data = getData();
  const count = data[key] || 0;
  const [y, m, d] = key.split('-');
  const date = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  document.getElementById('cal-edit-date').textContent = label;
  document.getElementById('cal-edit-count').textContent = count;
  document.getElementById('cal-edit').style.display = 'block';
}

function editDay(delta) {
  if (!selectedDayKey) return;
  const data = getData();
  const current = data[selectedDayKey] || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) {
    delete data[selectedDayKey];
  } else {
    data[selectedDayKey] = next;
  }
  saveData(data);
  document.getElementById('cal-edit-count').textContent = next;
  renderCalendar();

  // Re-select the cell after re-render
  const cells = document.querySelectorAll('.cal-cell[data-key]');
  cells.forEach(c => {
    if (c.dataset.key === selectedDayKey) c.classList.add('selected');
  });
}

function changeMonth(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta);
  renderCalendar();
}

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

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-cell empty';
    grid.appendChild(blank);
  }

  let monthTotal = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = data[key] || 0;
    monthTotal += count;

    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.key = key;
    if (key === todayKey) cell.classList.add('today');
    if (count > 0) cell.classList.add('has-drinks');
    if (key === selectedDayKey) cell.classList.add('selected');
    cell.addEventListener('click', () => selectDay(key, cell));

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

  // All-time total across every day ever recorded
  const allTime = Object.values(data).reduce((sum, val) => sum + (val || 0), 0);
  document.getElementById('alltime-total').textContent = allTime;
}

// ── Init ───────────────────────────────────────────────────────────────
renderCounter(0);
