const STORAGE_KEY = 'torneo_viernes_v1';

function load() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : { players: [], matches: [] };
  } catch (e) { return { players: [], matches: [] }; }
}
function save(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

let state = load();
if (!state.players) state.players = [];
if (!state.matches) state.matches = [];

let selA = new Set();
let selB = new Set();

/* ─── NAVIGATION ─── */
function showView(v, btn) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  if (btn) btn.classList.add('active');
  if (v === 'tabla')     renderTable();
  if (v === 'cargar')    renderChips();
  if (v === 'historial') renderHistorial();
  if (v === 'jugadores') renderRoster();
}

/* ─── STATS ─── */
function computeStats() {
  const stats = {};
  state.players.forEach(p => {
    stats[p] = { pj: 0, pg: 0, pe: 0, pp: 0, pts: 0, gf: 0, gc: 0 };
  });
  state.matches.forEach(m => {
    const ga = parseInt(m.goalsA) || 0;
    const gb = parseInt(m.goalsB) || 0;
    const teamA = m.teamA || [];
    const teamB = m.teamB || [];
    [...teamA, ...teamB].forEach(p => {
      if (!stats[p]) stats[p] = { pj: 0, pg: 0, pe: 0, pp: 0, pts: 0, gf: 0, gc: 0 };
    });
    teamA.forEach(p => {
      stats[p].pj++;
      stats[p].gf += ga; stats[p].gc += gb;
      if (ga > gb) { stats[p].pg++; stats[p].pts += 3; }
      else if (ga === gb) { stats[p].pe++; stats[p].pts += 1; }
      else { stats[p].pp++; }
    });
    teamB.forEach(p => {
      stats[p].pj++;
      stats[p].gf += gb; stats[p].gc += ga;
      if (gb > ga) { stats[p].pg++; stats[p].pts += 3; }
      else if (ga === gb) { stats[p].pe++; stats[p].pts += 1; }
      else { stats[p].pp++; }
    });
  });
  return stats;
}

function getSortedRows(stats) {
  return Object.entries(stats)
    .filter(([, s]) => s.pj > 0)
    .sort((a, b) => {
      if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
      const da = a[1].gf - a[1].gc;
      const db = b[1].gf - b[1].gc;
      if (db !== da) return db - da;
      return a[0].localeCompare(b[0], 'es');
    });
}

/* ─── TABLE ─── */
function renderTable() {
  const stats = computeStats();
  const rows = getSortedRows(stats);
  const tbody = document.getElementById('ranking-body');
  const empty = document.getElementById('tabla-empty');

  if (rows.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = rows.map(([name, s], i) => {
    const eff = s.pj > 0 ? (s.pts / (s.pj * 3)) * 100 : 0;
    const dg = s.gf - s.gc;
    const dgClass = dg > 0 ? 'dg-pos' : dg < 0 ? 'dg-neg' : 'dg-zero';
    const dgStr = dg > 0 ? '+' + dg : String(dg);
    const effClass = eff >= 66 ? 'eff-high' : eff >= 40 ? 'eff-mid' : 'eff-low';
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    return `<tr class="${rankClass}">
      <td class="rank-num">${i + 1}</td>
      <td class="td-left player-name">${name}</td>
      <td class="pts-cell">${s.pts}</td>
      <td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td>
      <td>${s.gf}</td><td>${s.gc}</td>
      <td class="${dgClass}">${dgStr}</td>
      <td><span class="eff-cell ${effClass}">${eff.toFixed(1)}%</span></td>
    </tr>`;
  }).join('');
}

/* ─── DOWNLOAD IMAGE ─── */
function downloadImage() {
  const exportable = document.getElementById('tabla-exportable');
  const exportHeader = document.getElementById('export-header');
  const exportDateText = document.getElementById('export-date-text');

  const now = new Date();
  exportDateText.textContent = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  exportHeader.style.display = 'flex';

  html2canvas(exportable, {
    backgroundColor: '#111111',
    scale: 2,
    useCORS: true,
    logging: false
  }).then(canvas => {
    exportHeader.style.display = 'none';
    const link = document.createElement('a');
    link.download = 'torneo-viernes-' + now.toISOString().slice(0, 10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(() => {
    exportHeader.style.display = 'none';
    showMsg('error', 'No se pudo generar la imagen. Intentá de nuevo.');
  });
}

/* ─── SHARE WHATSAPP ─── */
function shareWhatsapp() {
  const now = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const text = `⚽ *Torneo Viernes* — Tabla actualizada al ${now}\nhttps://julisalome.github.io/pachanga/`;
  const url = 'https://wa.me/?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}

/* ─── FORM ─── */
function changeGoal(team, delta) {
  const input = document.getElementById('goals-' + team);
  const display = document.getElementById('goals-' + team + '-display');
  let val = parseInt(input.value) + delta;
  if (val < 0) val = 0;
  input.value = val;
  display.textContent = val;
}

function renderChips() {
  selA = new Set();
  selB = new Set();
  document.getElementById('goals-a').value = 0;
  document.getElementById('goals-b').value = 0;
  document.getElementById('goals-a-display').textContent = '0';
  document.getElementById('goals-b-display').textContent = '0';

  ['a', 'b'].forEach(t => {
    const container = document.getElementById('chips-' + t);
    if (state.players.length === 0) {
      container.innerHTML = '<span style="font-size:12px;color:#555">No hay jugadores. Agregalos en "Jugadores".</span>';
      return;
    }
    container.innerHTML = state.players.map(p =>
      `<div class="player-chip" id="chip-${t}-${safeId(p)}" onclick="togglePlayer('${escapeName(p)}','${t}')">${p}</div>`
    ).join('');
  });
}

function safeId(name) { return name.replace(/[^a-zA-Z0-9]/g, '_'); }
function escapeName(name) { return name.replace(/'/g, "\\'"); }

function togglePlayer(name, team) {
  const other = team === 'a' ? 'b' : 'a';
  const otherSet = team === 'a' ? selB : selA;
  const thisSet  = team === 'a' ? selA : selB;
  if (otherSet.has(name)) { showMsg('error', `${name} ya está en el Equipo ${other.toUpperCase()}.`); return; }
  const chip = document.getElementById('chip-' + team + '-' + safeId(name));
  if (thisSet.has(name)) { thisSet.delete(name); chip.className = 'player-chip'; }
  else { thisSet.add(name); chip.className = 'player-chip selected-' + team; }
}

function showMsg(type, txt) {
  const el = document.getElementById('form-msg');
  el.className = 'msg ' + (type === 'ok' ? 'ok' : 'err');
  el.textContent = txt;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

function submitMatch() {
  const date = document.getElementById('match-date').value.trim();
  const ga = parseInt(document.getElementById('goals-a').value) || 0;
  const gb = parseInt(document.getElementById('goals-b').value) || 0;
  if (!date) { showMsg('error', 'Ingresá la fecha del partido.'); return; }
  if (selA.size === 0 || selB.size === 0) { showMsg('error', 'Seleccioná al menos un jugador por equipo.'); return; }
  const match = { date, teamA: [...selA], teamB: [...selB], goalsA: ga, goalsB: gb, id: Date.now() };
  state.matches.unshift(match);
  save(state);
  showMsg('ok', '¡Partido registrado correctamente!');
  document.getElementById('match-date').value = '';
  renderChips();
}

/* ─── HISTORIAL ─── */
function renderHistorial() {
  const el = document.getElementById('historial-list');
  if (state.matches.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Sin partidos todavía.</p></div>';
    return;
  }
  el.innerHTML = state.matches.map(m => {
    const ga = parseInt(m.goalsA), gb = parseInt(m.goalsB);
    const markerA = ga > gb ? '🟢' : ga === gb ? '🟡' : '🔴';
    const markerB = gb > ga ? '🟢' : ga === gb ? '🟡' : '🔴';
    return `<div class="history-item">
      <div class="history-match">
        <div class="history-date">${m.date}</div>
        <div style="font-size:13px;line-height:1.7">
          <span style="color:#9ed99e">${markerA} ${m.teamA.join(', ')}</span><br>
          <span style="color:#9bbede">${markerB} ${m.teamB.join(', ')}</span>
        </div>
      </div>
      <div class="score-badge">${m.goalsA} – ${m.goalsB}</div>
      <button class="btn-danger" onclick="deleteMatch(${m.id})">✕</button>
    </div>`;
  }).join('');
}

function deleteMatch(id) {
  if (!confirm('¿Borrar este partido?')) return;
  state.matches = state.matches.filter(m => m.id !== id);
  save(state);
  renderHistorial();
}

/* ─── JUGADORES ─── */
function renderRoster() {
  const el = document.getElementById('roster-list-wrap');
  if (state.players.length === 0) {
    el.innerHTML = '<span style="font-size:12px;color:#555">Sin jugadores cargados todavía.</span>';
    return;
  }
  el.innerHTML = state.players.map(p =>
    `<div class="roster-chip">${p}<button onclick="removePlayer('${escapeName(p)}')" title="Eliminar">×</button></div>`
  ).join('');
}

function addPlayer() {
  const inp = document.getElementById('new-player-name');
  const name = inp.value.trim();
  if (!name) return;
  if (state.players.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
    alert('Ese jugador ya existe.'); return;
  }
  state.players.push(name);
  save(state);
  inp.value = '';
  renderRoster();
}

function removePlayer(name) {
  if (!confirm(`¿Eliminar a ${name} del plantel?`)) return;
  state.players = state.players.filter(p => p !== name);
  save(state);
  renderRoster();
}

function resetAll() {
  if (!confirm('¿Seguro? Esto borra TODOS los partidos y jugadores. No se puede deshacer.')) return;
  state = { players: [], matches: [] };
  save(state);
  renderTable();
  renderRoster();
}

/* ─── INIT ─── */
renderTable();
