// ─── FIREBASE CONFIG ───────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8cTy6t32F-KiZloUF2SxCN3nf3Q0wTSs",
  authDomain: "pachanga-a17d4.firebaseapp.com",
  projectId: "pachanga-a17d4",
  storageBucket: "pachanga-a17d4.firebasestorage.app",
  messagingSenderId: "114380385622",
  appId: "1:114380385622:web:1c652f5ab192fc11e13af7"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const DOC_REF = doc(db, "torneo", "data");

// ─── STATE ─────────────────────────────────────────────────────────────────
let state = { players: [], matches: [] };
let selA = new Set();
let selB = new Set();

// ─── FIRESTORE ─────────────────────────────────────────────────────────────
function showLoadingOverlay(show) {
  document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

async function saveToFirestore() {
  try {
    await setDoc(DOC_REF, state);
  } catch (e) {
    alert("Error al guardar. Verificá tu conexión a internet.");
  }
}

onSnapshot(DOC_REF, (snapshot) => {
  showLoadingOverlay(false);
  if (snapshot.exists()) {
    state = snapshot.data();
    if (!state.players) state.players = [];
    if (!state.matches) state.matches = [];
  } else {
    state = { players: [], matches: [] };
  }
  renderPalmares();
  // Re-render profile if open
  const panel = document.getElementById('profile-panel');
  if (panel && panel.classList.contains('open')) {
    const nameEl = panel.querySelector('.profile-name');
    if (nameEl) renderProfile(nameEl.textContent);
  }
  const activeView = document.querySelector('.view.active');
  if (activeView) {
    const id = activeView.id.replace('view-', '');
    if (id === 'tabla')     renderTable();
    if (id === 'cargar')    renderChips();
    if (id === 'historial') renderHistorial();
    if (id === 'jugadores') renderRoster();
  }
}, () => {
  showLoadingOverlay(false);
});

// ─── NAVIGATION ────────────────────────────────────────────────────────────
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
window.showView = showView;

// ─── STATS ─────────────────────────────────────────────────────────────────
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
      if (ga > gb)      { stats[p].pg++; stats[p].pts += 3; }
      else if (ga===gb) { stats[p].pe++; stats[p].pts += 1; }
      else              { stats[p].pp++; }
    });
    teamB.forEach(p => {
      stats[p].pj++;
      stats[p].gf += gb; stats[p].gc += ga;
      if (gb > ga)      { stats[p].pg++; stats[p].pts += 3; }
      else if (ga===gb) { stats[p].pe++; stats[p].pts += 1; }
      else              { stats[p].pp++; }
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

// ─── TABLE ─────────────────────────────────────────────────────────────────
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
      <td class="td-left player-name player-link" onclick="openProfile('${escapeName(name)}')">${name}</td>
      <td class="pts-cell">${s.pts}</td>
      <td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td>
      <td>${s.gf}</td><td>${s.gc}</td>
      <td class="${dgClass}">${dgStr}</td>
      <td><span class="eff-cell ${effClass}">${eff.toFixed(1)}%</span></td>
    </tr>`;
  }).join('');
}

// ─── DOWNLOAD IMAGE ────────────────────────────────────────────────────────
async function downloadImage() {
  const exportable = document.getElementById('tabla-exportable');
  const exportHeader = document.getElementById('export-header');
  const exportDateText = document.getElementById('export-date-text');
  const now = new Date();
  exportDateText.textContent = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  exportHeader.style.display = 'flex';
  try {
    const canvas = await html2canvas(exportable, { backgroundColor: '#111111', scale: 2, useCORS: true, logging: false });
    exportHeader.style.display = 'none';
    const link = document.createElement('a');
    link.download = 'pachanga-' + now.toISOString().slice(0, 10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    exportHeader.style.display = 'none';
  }
}
window.downloadImage = downloadImage;

// ─── SHARE WHATSAPP ────────────────────────────────────────────────────────
function shareWhatsapp() {
  const now = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const text = `⚽ *Torneo Viernes* — Tabla actualizada al ${now}\nhttps://julisalome.github.io/pachanga/`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}
window.shareWhatsapp = shareWhatsapp;

// ─── FORM ──────────────────────────────────────────────────────────────────
function changeGoal(team, delta) {
  const input = document.getElementById('goals-' + team);
  const display = document.getElementById('goals-' + team + '-display');
  let val = parseInt(input.value) + delta;
  if (val < 0) val = 0;
  input.value = val;
  display.textContent = val;
}
window.changeGoal = changeGoal;

function renderChips() {
  selA = new Set(); selB = new Set();
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

function safeId(name)    { return name.replace(/[^a-zA-Z0-9]/g, '_'); }
function escapeName(name){ return name.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

function togglePlayer(name, team) {
  const other = team === 'a' ? 'b' : 'a';
  const otherSet = team === 'a' ? selB : selA;
  const thisSet  = team === 'a' ? selA : selB;
  if (otherSet.has(name)) { showMsg('error', `${name} ya está en el Equipo ${other.toUpperCase()}.`); return; }
  const chip = document.getElementById('chip-' + team + '-' + safeId(name));
  if (thisSet.has(name)) { thisSet.delete(name); chip.className = 'player-chip'; }
  else { thisSet.add(name); chip.className = 'player-chip selected-' + team; }
}
window.togglePlayer = togglePlayer;

function showMsg(type, txt) {
  const el = document.getElementById('form-msg');
  el.className = 'msg ' + (type === 'ok' ? 'ok' : 'err');
  el.textContent = txt;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

async function submitMatch() {
  const date = document.getElementById('match-date').value.trim();
  const ga = parseInt(document.getElementById('goals-a').value) || 0;
  const gb = parseInt(document.getElementById('goals-b').value) || 0;
  if (!date) { showMsg('error', 'Ingresá la fecha del partido.'); return; }
  if (selA.size === 0 || selB.size === 0) { showMsg('error', 'Seleccioná al menos un jugador por equipo.'); return; }
  const match = { date, teamA: [...selA], teamB: [...selB], goalsA: ga, goalsB: gb, id: Date.now() };
  state.matches.unshift(match);
  await saveToFirestore();
  showMsg('ok', '¡Partido registrado!');
  document.getElementById('match-date').value = '';
  renderChips();
}
window.submitMatch = submitMatch;

// ─── HISTORIAL ─────────────────────────────────────────────────────────────
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

async function deleteMatch(id) {
  if (!confirm('¿Borrar este partido?')) return;
  state.matches = state.matches.filter(m => m.id !== id);
  await saveToFirestore();
}
window.deleteMatch = deleteMatch;

// ─── JUGADORES ─────────────────────────────────────────────────────────────
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

async function addPlayer() {
  const inp = document.getElementById('new-player-name');
  const name = inp.value.trim();
  if (!name) return;
  if (state.players.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
    alert('Ese jugador ya existe.'); return;
  }
  state.players.push(name);
  await saveToFirestore();
  inp.value = '';
}
window.addPlayer = addPlayer;

async function removePlayer(name) {
  if (!confirm(`¿Eliminar a ${name} del plantel?`)) return;
  state.players = state.players.filter(p => p !== name);
  await saveToFirestore();
}
window.removePlayer = removePlayer;

async function resetAll() {
  if (!confirm('¿Seguro? Esto borra TODOS los partidos y jugadores. No se puede deshacer.')) return;
  state = { players: [], matches: [] };
  await saveToFirestore();
}
window.resetAll = resetAll;


// ─── PLAYER PROFILE ────────────────────────────────────────────────────────
function openProfile(name) {
  renderProfile(name);
  const panel = document.getElementById('profile-panel');
  panel.classList.add('open');
}
window.openProfile = openProfile;

function closeProfile() {
  document.getElementById('profile-panel').classList.remove('open');
}
window.closeProfile = closeProfile;

function getPlayerMatches(name) {
  return state.matches
    .filter(m => (m.teamA || []).includes(name) || (m.teamB || []).includes(name))
    .map(m => {
      const inA = (m.teamA || []).includes(name);
      const myTeam = inA ? m.teamA : m.teamB;
      const rivals = inA ? m.teamB : m.teamA;
      const gf = parseInt(inA ? m.goalsA : m.goalsB) || 0;
      const gc = parseInt(inA ? m.goalsB : m.goalsA) || 0;
      let result;
      if (gf > gc) result = 'W';
      else if (gf === gc) result = 'E';
      else result = 'L';
      return { date: m.date, result, gf, gc, teammates: myTeam.filter(p => p !== name), rivals };
    });
}

function renderProfile(name) {
  const matches = getPlayerMatches(name);
  const pj = matches.length;
  const pg = matches.filter(m => m.result === 'W').length;
  const pe = matches.filter(m => m.result === 'E').length;
  const pp = matches.filter(m => m.result === 'L').length;
  const pts = pg * 3 + pe;
  const gf = matches.reduce((s, m) => s + m.gf, 0);
  const gc = matches.reduce((s, m) => s + m.gc, 0);
  const dg = gf - gc;
  const eff = pj > 0 ? ((pts / (pj * 3)) * 100).toFixed(1) : '0.0';
  const effClass = parseFloat(eff) >= 66 ? 'eff-high' : parseFloat(eff) >= 40 ? 'eff-mid' : 'eff-low';
  const dgClass = dg > 0 ? 'dg-pos' : dg < 0 ? 'dg-neg' : 'dg-zero';
  const dgStr = dg > 0 ? '+' + dg : String(dg);

  // Racha — últimos 10 partidos
  const last10 = matches.slice(0, 10);
  const rachaHTML = last10.map(m => {
    const cls = m.result === 'W' ? 'badge-w' : m.result === 'E' ? 'badge-e' : 'badge-l';
    return `<span class="racha-badge ${cls}">${m.result}</span>`;
  }).join('');

  // Racha actual consecutiva
  let rachaActual = 0;
  let rachaType = '';
  for (const m of matches) {
    if (rachaActual === 0) { rachaType = m.result; rachaActual = 1; }
    else if (m.result === rachaType) rachaActual++;
    else break;
  }
  const rachaLabel = rachaActual > 1
    ? `${rachaActual} ${rachaType === 'W' ? 'victorias' : rachaType === 'E' ? 'empates' : 'derrotas'} seguidas`
    : '';

  // Historial
  const histHTML = matches.length === 0
    ? '<p class="profile-no-matches">Sin partidos registrados.</p>'
    : matches.map(m => {
        const resCls = m.result === 'W' ? 'badge-w' : m.result === 'E' ? 'badge-e' : 'badge-l';
        const resLabel = m.result === 'W' ? 'Victoria' : m.result === 'E' ? 'Empate' : 'Derrota';
        return `<div class="profile-match-item">
          <div class="profile-match-left">
            <span class="racha-badge ${resCls}" style="font-size:11px;padding:3px 8px">${m.result}</span>
            <div class="profile-match-info">
              <span class="profile-match-date">${m.date}</span>
              <span class="profile-match-teams">Con: ${m.teammates.join(', ') || '—'}</span>
              <span class="profile-match-teams" style="color:#666">vs ${m.rivals.join(', ') || '—'}</span>
            </div>
          </div>
          <div class="profile-match-score">${m.gf} – ${m.gc}</div>
        </div>`;
      }).join('');

  document.getElementById('profile-panel').innerHTML = `
    <div class="profile-inner">
      <div class="profile-topbar">
        <button class="profile-back" onclick="closeProfile()">← Volver</button>
      </div>
      <div class="profile-hero">
        <div class="profile-avatar">${name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="profile-name">${name}</div>
          ${rachaLabel ? `<div class="profile-racha-label">${rachaLabel}</div>` : ''}
        </div>
      </div>

      <div class="profile-stats-grid">
        <div class="profile-stat"><span class="profile-stat-val profile-pts">${pts}</span><span class="profile-stat-key">Pts</span></div>
        <div class="profile-stat"><span class="profile-stat-val">${pj}</span><span class="profile-stat-key">PJ</span></div>
        <div class="profile-stat"><span class="profile-stat-val" style="color:#5cb85c">${pg}</span><span class="profile-stat-key">PG</span></div>
        <div class="profile-stat"><span class="profile-stat-val" style="color:#c8b85c">${pe}</span><span class="profile-stat-key">PE</span></div>
        <div class="profile-stat"><span class="profile-stat-val" style="color:#e05252">${pp}</span><span class="profile-stat-key">PP</span></div>
        <div class="profile-stat"><span class="profile-stat-val ${dgClass}">${dgStr}</span><span class="profile-stat-key">DG</span></div>
        <div class="profile-stat"><span class="eff-cell ${effClass}" style="font-size:14px">${eff}%</span><span class="profile-stat-key">Ef.%</span></div>
      </div>

      ${last10.length > 0 ? `
      <div class="profile-section">
        <div class="profile-section-title">Últimos partidos</div>
        <div class="profile-racha-strip">${rachaHTML}</div>
      </div>` : ''}

      <div class="profile-section">
        <div class="profile-section-title">Historial</div>
        <div class="profile-matches">${histHTML}</div>
      </div>
    </div>
  `;
}
window.renderProfile = renderProfile;
// ─── INIT ──────────────────────────────────────────────────────────────────
showLoadingOverlay(true);

// ─── PALMARÉS ──────────────────────────────────────────────────────────────
const HISTORICAL_TITLES = {
  'Franco DM': 1,
  'Ian':       1,
  'Juli M':    1,
  'Lucas':     1,
  'Roman':     1,
  'Toti':      1,
};

function renderPalmares() {
  const el = document.getElementById('palmares-list');
  if (!el) return;

  const titles = { ...HISTORICAL_TITLES };

  const sorted = Object.entries(titles)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));

  const maxTitles = sorted.length > 0 ? sorted[0][1] : 0;
  el.innerHTML = sorted.map(([name, count], i) => {
    const isTop = count === maxTitles;
    const trophies = '🏆'.repeat(Math.min(count, 5));
    return `<div class="palmares-row${isTop ? ' palmares-top' : ''}">
      <span class="palmares-rank-num">${i + 1}</span>
      <span class="palmares-player">${name}</span>
      <div class="palmares-right">
        <span class="palmares-trophy-icon">${trophies}</span>
        <span class="palmares-count">${count}</span>
        <span class="palmares-label">${count === 1 ? 'título' : 'títulos'}</span>
      </div>
    </div>`;
  }).join('');
}
