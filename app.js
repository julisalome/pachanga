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
let state = { players: [], matches: [], playerData: {} };
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

onSnapshot(DOC_REF, async (snapshot) => {
  showLoadingOverlay(false);
  if (snapshot.exists()) {
    state = snapshot.data();
    if (!state.players) state.players = [];
    if (!state.matches) state.matches = [];
    if (!state.playerData) state.playerData = {};
  } else {
    state = { players: [], matches: [], playerData: {} };
  }
  await runMigrationIfNeeded();
  renderPalmares();
  applyAdminUI();
  // Re-render profile if open
  const panel = document.getElementById('profile-panel');
  if (panel && panel.classList.contains('open')) {
    const nameEl = panel.querySelector('.profile-name');
    if (nameEl) renderProfile(nameEl.textContent);
  }
  // Re-render player edit if open
  const editPanel = document.getElementById('player-edit-panel');
  if (editPanel && editPanel.classList.contains('open') && editingPlayer) {
    // just refresh title
    document.getElementById('player-edit-title').textContent = getPlayerDisplayName(editingPlayer);
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


// ─── ADMIN / PIN ───────────────────────────────────────────────────────────
const ADMIN_PIN = '4815162342';
let isAdmin = false;
let pinBuffer = '';

function toggleAdmin() {
  if (isAdmin) {
    // Lock
    isAdmin = false;
    applyAdminUI();
  } else {
    pinBuffer = '';
    updatePinDots();
    document.getElementById('pin-error').style.display = 'none';
    document.getElementById('pin-modal').style.display = 'flex';
  }
}
window.toggleAdmin = toggleAdmin;

function closePinModal(e) {
  if (e.target.id === 'pin-modal') {
    document.getElementById('pin-modal').style.display = 'none';
    pinBuffer = '';
  }
}
window.closePinModal = closePinModal;

function pinPress(digit) {
  if (pinBuffer.length >= ADMIN_PIN.length) return;
  pinBuffer += digit;
  updatePinDots();
  if (pinBuffer.length === ADMIN_PIN.length) {
    setTimeout(() => {
      if (pinBuffer === ADMIN_PIN) {
        isAdmin = true;
        document.getElementById('pin-modal').style.display = 'none';
        applyAdminUI();
      } else {
        document.getElementById('pin-error').style.display = 'block';
        pinBuffer = '';
        updatePinDots();
      }
    }, 120);
  }
}
window.pinPress = pinPress;

function pinDel() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
}
window.pinDel = pinDel;

function pinClear() {
  pinBuffer = '';
  updatePinDots();
}
window.pinClear = pinClear;

function updatePinDots() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('filled', i < pinBuffer.length);
  });
}

function applyAdminUI() {
  const btn = document.getElementById('admin-lock-btn');
  const icon = document.getElementById('admin-lock-icon');
  const adminItems = document.querySelectorAll('.admin-only');
  const adminActions = document.querySelectorAll('.admin-action');

  if (isAdmin) {
    btn.classList.add('admin-active');
    icon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 5-5"/>';
    adminItems.forEach(el => el.style.display = '');
    adminActions.forEach(el => el.style.display = '');
  } else {
    btn.classList.remove('admin-active');
    icon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
    adminItems.forEach(el => el.style.display = 'none');
    adminActions.forEach(el => el.style.display = 'none');
    // If on an admin-only view, go back to tabla
    const active = document.querySelector('.view.active');
    if (active && (active.id === 'view-cargar' || active.id === 'view-jugadores')) {
      showView('tabla', document.querySelector('.nav-btn[data-view="tabla"]'));
    }
  }
}


// ─── PLAYER DATA HELPERS ───────────────────────────────────────────────────
function getPlayerPhoto(name) {
  return state.playerData[name] && state.playerData[name].photo
    ? state.playerData[name].photo : null;
}
function getPlayerDisplayName(name) {
  return (state.playerData[name] && state.playerData[name].displayName)
    ? state.playerData[name].displayName : name;
}
function avatarHTML(name, size = 44) {
  const photo = getPlayerPhoto(name);
  const initials = name.charAt(0).toUpperCase();
  if (photo) {
    return `<img src="${photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="${name}">`;
  }
  const fs = Math.round(size * 0.4);
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--green-accent);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:${fs}px;font-weight:700;color:#fff;flex-shrink:0">${initials}</div>`;
}

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
  const maxPts = rows.length > 0 ? rows[0][1].pts : 0;
  tbody.innerHTML = rows.map(([name, s], i) => {
    const eff = s.pj > 0 ? (s.pts / (s.pj * 3)) * 100 : 0;
    const dg = s.gf - s.gc;
    const dgClass = dg > 0 ? 'dg-pos' : dg < 0 ? 'dg-neg' : 'dg-zero';
    const dgStr = dg > 0 ? '+' + dg : String(dg);
    const effClass = eff >= 66 ? 'eff-high' : eff >= 40 ? 'eff-mid' : 'eff-low';
    const rankClass = s.pts === maxPts ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    return `<tr class="${rankClass}">
      <td class="rank-num">${i + 1}</td>
      <td class="td-left player-name player-link" onclick="openProfile('${escapeName(name)}')">
        <div style="display:flex;align-items:center;gap:8px">
          ${avatarHTML(name, 26)}
          <span>${getPlayerDisplayName(name)}</span>
        </div>
      </td>
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
      <button class="btn-danger admin-action" style="display:none" onclick="deleteMatch(${m.id})">✕</button>
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
  const el = document.getElementById('players-grid');
  if (!el) return;
  if (state.players.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:#555;padding:8px 20px">Sin jugadores. Agregalos abajo.</p>';
    return;
  }
  const stats = computeStats();
  el.innerHTML = state.players.map(p => {
    const s = stats[p] || { pts: 0, pj: 0 };
    const dn = getPlayerDisplayName(p);
    return `<div class="player-card" onclick="openPlayerEdit('${escapeName(p)}')">
      <div class="player-card-avatar">${avatarHTML(p, 52)}</div>
      <div class="player-card-info">
        <div class="player-card-name">${dn}</div>
        <div class="player-card-stats">${s.pts} pts · ${s.pj} PJ</div>
      </div>
      <div class="player-card-arrow">›</div>
    </div>`;
  }).join('');
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

  // Titles & historical tournaments
  const playerTitles = HISTORICAL_TITLES[name] || 0;
  const playerTournaments = HISTORICAL_TOURNAMENTS.filter(t => t.standings[name]);

  const titlesHTML = playerTitles > 0
    ? `<div class="profile-titles-row">${Array(playerTitles).fill('🏆').join('')} <span class="profile-titles-label">${playerTitles} título${playerTitles > 1 ? 's' : ''}</span></div>`
    : '';

  // Historical tournament stats blocks
  const histTournamentHTML = playerTournaments.map(t => {
    const s = t.standings[name];
    const isChamp = t.champions.includes(name);
    const teff = s.pj > 0 ? ((s.pts / (s.pj * 3)) * 100).toFixed(1) : '0.0';
    const teffClass = parseFloat(teff) >= 66 ? 'eff-high' : parseFloat(teff) >= 40 ? 'eff-mid' : 'eff-low';
    return `<div class="profile-hist-tournament">
      <div class="profile-hist-tournament-name">
        ${isChamp ? '🏆 ' : ''}${t.name}
      </div>
      <div class="profile-hist-stats">
        <div class="profile-hist-stat"><span class="profile-hist-val" style="color:var(--gold)">${s.pts}</span><span class="profile-stat-key">Pts</span></div>
        <div class="profile-hist-stat"><span class="profile-hist-val">${s.pj}</span><span class="profile-stat-key">PJ</span></div>
        <div class="profile-hist-stat"><span class="profile-hist-val" style="color:#5cb85c">${s.pg}</span><span class="profile-stat-key">PG</span></div>
        <div class="profile-hist-stat"><span class="profile-hist-val" style="color:#c8b85c">${s.pe}</span><span class="profile-stat-key">PE</span></div>
        <div class="profile-hist-stat"><span class="profile-hist-val" style="color:#e05252">${s.pp}</span><span class="profile-stat-key">PP</span></div>
        <div class="profile-hist-stat"><span class="eff-cell ${teffClass}" style="font-size:12px">${teff}%</span><span class="profile-stat-key">Ef.%</span></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('profile-panel').innerHTML = `
    <div class="profile-inner">
      <div class="profile-topbar">
        <button class="profile-back" onclick="closeProfile()">← Volver</button>
      </div>
      <div class="profile-hero">
        ${avatarHTML(name, 56)}
        <div>
          <div class="profile-name">${name}</div>
          ${titlesHTML}
          ${rachaLabel ? `<div class="profile-racha-label">${rachaLabel}</div>` : ''}
        </div>
      </div>

      <div class="profile-section-header">Torneo en curso</div>
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
        <div class="profile-section-title">Racha reciente</div>
        <div class="profile-racha-strip">${rachaHTML}</div>
      </div>` : ''}

      <div class="profile-section">
        <div class="profile-section-title">Partidos del torneo actual</div>
        <div class="profile-matches">${histHTML}</div>
      </div>

      ${histTournamentHTML ? `
      <div class="profile-section" style="margin-top:8px">
        <div class="profile-section-title">Historial de torneos</div>
        ${histTournamentHTML}
      </div>` : ''}
    </div>
  `;
}
window.renderProfile = renderProfile;

// ─── PLAYER EDIT ───────────────────────────────────────────────────────────
let editingPlayer = null;
let editingPhotoData = null;

function openPlayerEdit(name) {
  editingPlayer = name;
  editingPhotoData = null;
  const panel = document.getElementById('player-edit-panel');
  const nameInput = document.getElementById('edit-player-name');
  const titleEl = document.getElementById('player-edit-title');
  const preview = document.getElementById('edit-avatar-preview');
  const msg = document.getElementById('edit-msg');

  nameInput.value = getPlayerDisplayName(name);
  titleEl.textContent = getPlayerDisplayName(name);
  msg.style.display = 'none';

  // Show current photo or avatar
  const photo = getPlayerPhoto(name);
  if (photo) {
    preview.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    preview.innerHTML = `<div style="width:100%;height:100%;border-radius:50%;background:var(--green-accent);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:700;color:#fff">${name.charAt(0).toUpperCase()}</div>`;
  }

  panel.classList.add('open');
}
window.openPlayerEdit = openPlayerEdit;

function closePlayerEdit() {
  document.getElementById('player-edit-panel').classList.remove('open');
  editingPlayer = null;
  editingPhotoData = null;
}
window.closePlayerEdit = closePlayerEdit;

function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    // Compress image using canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 200;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
      else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      editingPhotoData = canvas.toDataURL('image/jpeg', 0.75);
      // Update preview
      document.getElementById('edit-avatar-preview').innerHTML =
        `<img src="${editingPhotoData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
window.handlePhotoSelect = handlePhotoSelect;

async function savePlayerEdit() {
  if (!editingPlayer) return;
  const newName = document.getElementById('edit-player-name').value.trim();
  if (!newName) { showEditMsg('error', 'El nombre no puede estar vacío.'); return; }

  // Check name conflict (only if name changed)
  const oldDisplayName = getPlayerDisplayName(editingPlayer);
  if (newName !== oldDisplayName) {
    const conflict = state.players.some(p =>
      p !== editingPlayer && getPlayerDisplayName(p).toLowerCase() === newName.toLowerCase()
    );
    if (conflict) { showEditMsg('error', 'Ya existe un jugador con ese nombre.'); return; }
  }

  if (!state.playerData) state.playerData = {};
  if (!state.playerData[editingPlayer]) state.playerData[editingPlayer] = {};

  state.playerData[editingPlayer].displayName = newName;
  if (editingPhotoData) state.playerData[editingPlayer].photo = editingPhotoData;

  await saveToFirestore();
  showEditMsg('ok', '¡Guardado!');
  document.getElementById('player-edit-title').textContent = newName;
  renderRoster();
  renderTable();
}
window.savePlayerEdit = savePlayerEdit;

async function deletePlayerFromEdit() {
  if (!editingPlayer) return;
  if (!confirm(`¿Eliminar a ${getPlayerDisplayName(editingPlayer)} del plantel?`)) return;
  state.players = state.players.filter(p => p !== editingPlayer);
  if (state.playerData) delete state.playerData[editingPlayer];
  await saveToFirestore();
  closePlayerEdit();
}
window.deletePlayerFromEdit = deletePlayerFromEdit;

function showEditMsg(type, txt) {
  const el = document.getElementById('edit-msg');
  el.className = 'msg ' + (type === 'ok' ? 'ok' : 'err');
  el.textContent = txt;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3000);
}


// ─── ONE-TIME MIGRATION: rename players in Firebase ────────────────────────
const NAME_MIGRATION = {
  'Fdm':    'Franco DM',
  'Juli':   'Juli M',
  'Roma':   'Roman',
  'Tincho': 'Martin',
  'Manu':   'Manu H',
};

async function runMigrationIfNeeded() {
  // Check if migration already ran
  if (state.migrationV1) return;

  let changed = false;

  // Migrate players array
  state.players = state.players.map(p => {
    if (NAME_MIGRATION[p]) { changed = true; return NAME_MIGRATION[p]; }
    return p;
  });

  // Migrate matches
  state.matches = state.matches.map(m => {
    const newA = (m.teamA || []).map(p => NAME_MIGRATION[p] || p);
    const newB = (m.teamB || []).map(p => NAME_MIGRATION[p] || p);
    if (JSON.stringify(newA) !== JSON.stringify(m.teamA) ||
        JSON.stringify(newB) !== JSON.stringify(m.teamB)) changed = true;
    return { ...m, teamA: newA, teamB: newB };
  });

  // Migrate playerData keys
  if (state.playerData) {
    const newPlayerData = {};
    for (const [k, v] of Object.entries(state.playerData)) {
      const newKey = NAME_MIGRATION[k] || k;
      newPlayerData[newKey] = v;
      if (newKey !== k) changed = true;
    }
    state.playerData = newPlayerData;
  }

  if (changed || !state.migrationV1) {
    state.migrationV1 = true;
    await saveToFirestore();
    console.log('Migration v1 complete');
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────
showLoadingOverlay(true);
document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');


// ─── HISTORICAL DATA (Torneo Inicial 2025) ─────────────────────────────────
const HISTORICAL_TOURNAMENTS = [
  {
    name: 'Torneo Inicial 2025',
    champion: true,
    champions: ['Franco DM', 'Ian', 'Juli M', 'Lucas', 'Roman', 'Toti'],
    standings: {
      'Franco DM':    { pts: 18, pj: 10, pg: 6, pe: 0, pp: 4 },
      'Ian':    { pts: 18, pj: 10, pg: 6, pe: 0, pp: 4 },
      'Juli M':   { pts: 18, pj: 10, pg: 6, pe: 0, pp: 4 },
      'Roman':   { pts: 18, pj: 10, pg: 6, pe: 0, pp: 4 },
      'Toti':   { pts: 18, pj: 10, pg: 6, pe: 0, pp: 4 },
      'Lucas':  { pts: 18, pj:  8, pg: 6, pe: 0, pp: 2 },
      'Renga':  { pts: 15, pj:  6, pg: 5, pe: 0, pp: 1 },
      'Pocho':  { pts: 15, pj:  9, pg: 5, pe: 0, pp: 4 },
      'Martin': { pts: 15, pj: 10, pg: 5, pe: 0, pp: 5 },
      'Gonzi':  { pts: 12, pj: 10, pg: 4, pe: 0, pp: 6 },
      'Felo':   { pts:  9, pj:  6, pg: 3, pe: 0, pp: 3 },
      'Lolo':   { pts:  6, pj:  6, pg: 2, pe: 0, pp: 4 },
      'Licho':  { pts:  6, pj:  8, pg: 2, pe: 0, pp: 6 },
      'Manu H':   { pts:  6, pj:  8, pg: 2, pe: 0, pp: 6 },
      'Mati':   { pts:  3, pj:  2, pg: 1, pe: 0, pp: 1 },
      'Jano':   { pts:  0, pj:  2, pg: 0, pe: 0, pp: 2 },
    }
  }
];
// ─── PALMARÉS ──────────────────────────────────────────────────────────────
const HISTORICAL_TITLES = {
  'Franco DM':   1,
  'Ian':   1,
  'Juli M':  1,
  'Lucas': 1,
  'Roman': 1,
  'Toti':  1,
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
