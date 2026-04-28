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
  renderTop5();
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
    if (id === 'tabla')     { renderTable(); renderTop5(); }
    if (id === 'cargar')    renderChips();
    if (id === 'historial') renderHistorial();
    if (id === 'jugadores') renderRoster();
    if (id === 'stats') renderTournamentStats();
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
  if (v === 'tabla')     { renderTable(); renderTop5(); }
  if (v === 'cargar')    renderChips();
  if (v === 'historial') renderHistorial();
  if (v === 'jugadores') renderRoster();
  if (v === 'stats') renderTournamentStats();
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

  // Temporarily override table styles for full capture
  const tableWrap = exportable.querySelector('.table-wrap') || exportable;
  const origOverflow = tableWrap.style.overflow;
  const origMaxH = tableWrap.style.maxHeight;
  tableWrap.style.overflow = 'visible';
  tableWrap.style.maxHeight = 'none';

  // Also make sure the exportable container shows full height
  const origExpOverflow = exportable.style.overflow;
  exportable.style.overflow = 'visible';

  try {
    // Get full scroll height
    const fullHeight = exportable.scrollHeight;
    const fullWidth = exportable.scrollWidth;

    const canvas = await html2canvas(exportable, {
      backgroundColor: '#111111',
      scale: 2,
      useCORS: true,
      logging: false,
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
      scrollX: 0,
      scrollY: 0,
    });
    exportHeader.style.display = 'none';
    tableWrap.style.overflow = origOverflow;
    tableWrap.style.maxHeight = origMaxH;
    exportable.style.overflow = origExpOverflow;

    const link = document.createElement('a');
    link.download = 'pachanga-' + now.toISOString().slice(0, 10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch(e) {
    exportHeader.style.display = 'none';
    tableWrap.style.overflow = origOverflow;
    tableWrap.style.maxHeight = origMaxH;
    exportable.style.overflow = origExpOverflow;
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
  const vid = getVisitorId();
  el.innerHTML = state.matches.map(m => {
    const ga = parseInt(m.goalsA), gb = parseInt(m.goalsB);
    const markerA = ga > gb ? '🟢' : ga === gb ? '🟡' : '🔴';
    const markerB = gb > ga ? '🟢' : ga === gb ? '🟡' : '🔴';

    // Reactions
    const reacts = m.reactions || {};
    const reactEmojis = ['🔥','💪','😅','🤣','👏'];
    const reactHTML = reactEmojis.map(e => {
      const count = (reacts[e] || []).length;
      const active = (reacts[e] || []).includes(vid);
      return `<button class="react-btn ${active ? 'react-active' : ''}" onclick="toggleReaction(${m.id},'${e}')">${e}${count > 0 ? `<span class="react-count">${count}</span>` : ''}</button>`;
    }).join('');

    // Comments
    const comments = m.comments || [];
    const commentsHTML = comments.map(c =>
      `<div class="comment-item"><span class="comment-author">${c.author}</span><span class="comment-text">${c.text}</span></div>`
    ).join('');

    return `<div class="history-item-wrap">
      <div class="history-item">
        <div class="history-match" style="flex:1">
          <div class="history-date">${m.date}</div>
          <div style="font-size:13px;line-height:1.7">
            <span style="color:#9ed99e">${markerA} ${m.teamA.join(', ')}</span><br>
            <span style="color:#9bbede">${markerB} ${m.teamB.join(', ')}</span>
          </div>
          <div class="react-strip">${reactHTML}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <div class="score-badge">${m.goalsA} – ${m.goalsB}</div>
          <button class="comment-toggle-btn" onclick="toggleComments(${m.id})">💬${comments.length > 0 ? ' ' + comments.length : ''}</button>
          <div class="hist-actions admin-action" style="display:none">
            <button class="btn-edit" onclick="editMatch(${m.id})">✏️</button>
            <button class="btn-danger" onclick="deleteMatch(${m.id})">✕</button>
          </div>
        </div>
      </div>
      <div id="comments-${m.id}" class="comments-section" style="display:none">
        <div class="comments-list">${commentsHTML || '<span class="comment-empty">Sin comentarios todavía.</span>'}</div>
        <div class="comment-input-row">
          <input type="text" id="comment-name-${m.id}" placeholder="Tu nombre" style="width:90px;flex-shrink:0">
          <input type="text" id="comment-input-${m.id}" placeholder="Escribí un comentario..." onkeydown="if(event.key==='Enter')postComment(${m.id})">
          <button class="btn-outline" style="padding:6px 10px;font-size:12px;flex-shrink:0" onclick="postComment(${m.id})">→</button>
        </div>
      </div>
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



// ─── TOURNAMENT STATS ──────────────────────────────────────────────────────
function renderTournamentStats() {
  const el = document.getElementById('view-stats');
  if (!el) return;
  const matches = state.matches || [];
  const playerStats = computeStats();
  const rows = getSortedRows(playerStats);

  if (matches.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Sin partidos todavía.</p></div>';
    return;
  }

  // Most goals in a match
  const mostGoals = matches.reduce((best, m) => {
    const total = (parseInt(m.goalsA)||0) + (parseInt(m.goalsB)||0);
    return total > (best ? (parseInt(best.goalsA)||0)+(parseInt(best.goalsB)||0) : 0) ? m : best;
  }, null);

  // Biggest win
  const biggestWin = matches.reduce((best, m) => {
    const diff = Math.abs((parseInt(m.goalsA)||0) - (parseInt(m.goalsB)||0));
    const bestDiff = best ? Math.abs((parseInt(best.goalsA)||0)-(parseInt(best.goalsB)||0)) : 0;
    return diff > bestDiff ? m : best;
  }, null);

  // Eligible players (min 3 games)
  const eligible = rows.filter(([,s]) => s.pj >= 3);

  // Helper: get all tied leaders for a stat
  function leaders(arr, fn, higher = true) {
    if (!arr.length) return [];
    const best = arr.reduce((b, r) => {
      const v = fn(r); const bv = fn(b);
      return higher ? (v > bv ? r : b) : (v < bv ? r : b);
    });
    const bestVal = fn(best);
    return arr.filter(r => fn(r) === bestVal);
  }

  const mostPlayed  = leaders(rows, r => r[1].pj);
  const mostWins    = leaders(rows, r => r[1].pg);
  const bestAttack  = leaders(rows, r => r[1].gf);
  const mostEff     = leaders(eligible, r => r[1].pj > 0 ? r[1].pts/(r[1].pj*3) : 0);
  const leastEff    = leaders(eligible, r => r[1].pj > 0 ? r[1].pts/(r[1].pj*3) : 1, false);
  const bestDefense = leaders(eligible, r => r[1].pj > 0 ? r[1].gc/r[1].pj : 999, false);

  // Total goals in tournament
  const totalGoals = matches.reduce((s,m) => s + (parseInt(m.goalsA)||0) + (parseInt(m.goalsB)||0), 0);
  const avgGoals = (totalGoals / matches.length).toFixed(1);

  function statCard(icon, label, value, sub) {
    return `<div class="stats-card">
      <div class="stats-card-icon">${icon}</div>
      <div class="stats-card-body">
        <div class="stats-card-label">${label}</div>
        <div class="stats-card-value">${value}</div>
        ${sub ? `<div class="stats-card-sub">${sub}</div>` : ''}
      </div>
    </div>`;
  }

  const gaA = parseInt(mostGoals?.goalsA)||0, gaB = parseInt(mostGoals?.goalsB)||0;
  const bwA = parseInt(biggestWin?.goalsA)||0, bwB = parseInt(biggestWin?.goalsB)||0;
  const bwWinner = bwA > bwB ? biggestWin?.teamA : biggestWin?.teamB;

  el.innerHTML = `
    <div style="padding:20px">
      <p class="section-title">Estadísticas del torneo</p>

      <div class="stats-section-title">General</div>
      <div class="stats-grid">
        ${statCard('⚽', 'Partidos jugados', matches.length, '')}
        ${statCard('🥅', 'Goles totales', totalGoals, `${avgGoals} por partido`)}
        ${mostGoals ? statCard('🔥', 'Partido con más goles', `${gaA} – ${gaB}`, `${mostGoals.date} · ${gaA+gaB} goles`) : ''}
        ${biggestWin ? statCard('💥', 'Mayor goleada', `${bwA} – ${bwB}`, `${biggestWin.date}`) : ''}
      </div>

      <div class="stats-section-title">Jugadores</div>
      <div class="stats-grid">
        ${mostPlayed.length ? statCard('🏃', 'Más partidos', mostPlayed.map(r=>r[0]).join(', '), `${mostPlayed[0][1].pj} partidos`) : ''}
        ${mostWins.length ? statCard('🏆', 'Más victorias', mostWins.map(r=>r[0]).join(', '), `${mostWins[0][1].pg} victorias`) : ''}
        ${mostEff.length ? statCard('⚡', 'Más efectivo', mostEff.map(r=>r[0]).join(', '), `${((mostEff[0][1].pts/(mostEff[0][1].pj*3))*100).toFixed(1)}% (mín. 3 PJ)`) : ''}
        ${leastEff.length && JSON.stringify(leastEff) !== JSON.stringify(mostEff) ? statCard('📉', 'Menos efectivo', leastEff.map(r=>r[0]).join(', '), `${((leastEff[0][1].pts/(leastEff[0][1].pj*3))*100).toFixed(1)}% (mín. 3 PJ)`) : ''}
        ${bestAttack.length ? statCard('⚔️', 'Más goles a favor', bestAttack.map(r=>r[0]).join(', '), `${bestAttack[0][1].gf} GF`) : ''}
        ${bestDefense.length ? statCard('🛡️', 'Menos goles en contra', bestDefense.map(r=>r[0]).join(', '), `${(bestDefense[0][1].gc/bestDefense[0][1].pj).toFixed(1)} GC/partido`) : ''}
      </div>
    </div>
  `;
}
window.renderTournamentStats = renderTournamentStats;

// ─── PLAYER PROFILE ────────────────────────────────────────────────────────

// ─── BADGES ────────────────────────────────────────────────────────────────
function computeBadges(name, matches, stats) {
  const badges = [];
  const s = stats[name] || {};
  const pj = s.pj || 0, pg = s.pg || 0, pp = s.pp || 0;
  const eff = pj > 0 ? (s.pts / (pj * 3)) * 100 : 0;
  let streak = 0, streakType = '';
  for (const m of matches) {
    if (!streakType) { streakType = m.result; streak = 1; }
    else if (m.result === streakType) streak++;
    else break;
  }
  if (streakType === 'W' && streak >= 3) badges.push({ icon: '🔥', label: `Racha de ${streak}W` });
  if (streakType === 'L' && streak >= 3) badges.push({ icon: '❄️', label: `Racha de ${streak}D` });
  if (pg >= 10) badges.push({ icon: '💎', label: '10 victorias' });
  else if (pg >= 5) badges.push({ icon: '⭐', label: '5 victorias' });
  if (pj >= 10) badges.push({ icon: '🏃', label: 'Veterano' });
  if (eff === 100 && pj >= 3) badges.push({ icon: '🏆', label: 'Invicto' });
  if (eff >= 75 && pj >= 5) badges.push({ icon: '⚡', label: 'Letal' });
  if (pp >= 5 && eff < 30) badges.push({ icon: '💪', label: 'Guerrero' });
  if (pp === 0 && pj >= 3) badges.push({ icon: '🛡️', label: 'Sin derrotas' });
  const titles = HISTORICAL_TITLES[name] || 0;
  if (titles >= 1) badges.push({ icon: '🥇', label: `Campeón x${titles}` });
  return badges;
}

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

  // Racha
  const last10 = matches.slice(0, 10);
  const rachaHTML = last10.map(m => {
    const cls = m.result === 'W' ? 'badge-w' : m.result === 'E' ? 'badge-e' : 'badge-l';
    return `<span class="racha-badge ${cls}">${m.result}</span>`;
  }).join('');
  let rachaActual = 0, rachaType = '';
  for (const m of matches) {
    if (!rachaType) { rachaType = m.result; rachaActual = 1; }
    else if (m.result === rachaType) rachaActual++;
    else break;
  }
  const rachaLabel = rachaActual > 1
    ? `${rachaActual} ${rachaType === 'W' ? 'victorias' : rachaType === 'E' ? 'empates' : 'derrotas'} seguidas`
    : '';

  // Match history HTML
  const histHTML = matches.length === 0
    ? '<p class="profile-no-matches">Sin partidos registrados.</p>'
    : matches.map(m => {
        const resCls = m.result === 'W' ? 'badge-w' : m.result === 'E' ? 'badge-e' : 'badge-l';
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

  // Evolution chart
  const evoHTML = (() => {
    if (matches.length < 2) return '';
    const sorted = [...matches].reverse();
    let cum = 0;
    const points = sorted.map(m => { if (m.result==='W') cum+=3; else if(m.result==='E') cum+=1; return cum; });
    const maxPts = Math.max(...points, 1);
    const W = 280, H = 70, PAD = 8;
    const xStep = (W - PAD*2) / (points.length - 1 || 1);
    const toY = v => H - PAD - ((v / maxPts) * (H - PAD*2));
    const toX = i => PAD + i * xStep;
    const polyline = points.map((v,i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    const areaPath = `M${toX(0).toFixed(1)},${H} ` + points.map((v,i) => `L${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ') + ` L${toX(points.length-1).toFixed(1)},${H} Z`;
    const dots = points.map((v,i) => {
      const col = sorted[i].result==='W'?'#5cb85c':sorted[i].result==='E'?'#c8b85c':'#e05252';
      return `<circle cx="${toX(i).toFixed(1)}" cy="${toY(v).toFixed(1)}" r="4" fill="${col}" stroke="#111" stroke-width="1.5"/>`;
    }).join('');
    return `<div class="profile-section">
      <div class="profile-section-title">Evolución de puntos</div>
      <div class="evo-chart-wrap">
        <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
          <defs><linearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5cb85c" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#5cb85c" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${areaPath}" fill="url(#evoGrad)"/>
          <polyline points="${polyline}" fill="none" stroke="#5cb85c" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          ${dots}
        </svg>
        <div class="evo-labels">
          <span>${sorted[0]?.date||''}</span>
          <span style="color:var(--green-accent);font-weight:600">${points[points.length-1]} pts</span>
          <span>${sorted[sorted.length-1]?.date||''}</span>
        </div>
      </div>
    </div>`;
  })();

  // Badges
  const allStats = computeStats();
  const playerBadges = computeBadges(name, matches, allStats);
  const badgesHTML = playerBadges.length === 0 ? '' : `
    <div class="profile-section">
      <div class="profile-section-title">Logros</div>
      <div class="badges-grid">
        ${playerBadges.map(b => `<div class="badge-chip"><span class="badge-icon">${b.icon}</span><span class="badge-label">${b.label}</span></div>`).join('')}
      </div>
    </div>`;

  // Companions & rivals
  const companions = {}, rivals = {};
  matches.forEach(m => {
    m.teammates.forEach(t => { if(!companions[t]) companions[t]={w:0,total:0}; companions[t].total++; if(m.result==='W') companions[t].w++; });
    m.rivals.forEach(r => { if(!rivals[r]) rivals[r]={w:0,l:0,total:0}; rivals[r].total++; if(m.result==='W') rivals[r].w++; else if(m.result==='L') rivals[r].l++; });
  });
  const compSorted = Object.entries(companions).filter(([,v])=>v.total>=1).sort((a,b)=>(b[1].w/b[1].total)-(a[1].w/a[1].total)).slice(0,5);
  const rivalsSorted = Object.entries(rivals).filter(([,v])=>v.total>=1).sort((a,b)=>b[1].total-a[1].total).slice(0,5);
  const compHTML = compSorted.length===0?'':`<div class="profile-section"><div class="profile-section-title">Mejores compañeros</div>${compSorted.map(([p,v])=>{const pct=Math.round((v.w/v.total)*100);const bc=pct>=66?'bar-green':pct>=40?'bar-yellow':'bar-red';return `<div class="rival-row"><span class="rival-name">${p}</span><div class="rival-bar-wrap"><div class="rival-bar ${bc}" style="width:${pct}%"></div></div><span class="rival-pct">${pct}%</span><span class="rival-sub">${v.w}G/${v.total}P</span></div>`;}).join('')}</div>`;
  const rivalsHTML = rivalsSorted.length===0?'':`<div class="profile-section"><div class="profile-section-title">Rivales frecuentes</div>${rivalsSorted.map(([p,v])=>{const pct=Math.round((v.w/v.total)*100);const bc=pct>=66?'bar-green':pct>=40?'bar-yellow':'bar-red';return `<div class="rival-row"><span class="rival-name">${p}</span><div class="rival-bar-wrap"><div class="rival-bar ${bc}" style="width:${pct}%"></div></div><span class="rival-pct">${pct}%</span><span class="rival-sub">${v.w}G ${v.l}D/${v.total}P</span></div>`;}).join('')}</div>`;

  // Titles
  const customTitles = (state.customTitles && state.customTitles[name]) || 0;
  const playerTitles = (HISTORICAL_TITLES[name] || 0) + customTitles;
  const titlesHTML = playerTitles > 0
    ? `<div class="profile-titles-row">${Array(playerTitles).fill('🏆').join('')} <span class="profile-titles-label">${playerTitles} título${playerTitles>1?'s':''}</span></div>`
    : '';

  // Historical tournaments detail
  const playerTournaments = HISTORICAL_TOURNAMENTS.filter(t => t.standings[name]);
  const histTournamentHTML = playerTournaments.map(t => {
    const s = t.standings[name];
    const isChamp = t.champions.includes(name);
    const teff = s.pj>0?((s.pts/(s.pj*3))*100).toFixed(1):'0.0';
    const teffClass = parseFloat(teff)>=66?'eff-high':parseFloat(teff)>=40?'eff-mid':'eff-low';
    return `<div class="profile-hist-tournament">
      <div class="profile-hist-tournament-name">${isChamp?'🏆 ':''}${t.name}</div>
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

  // All-time totals
  const hasHistory = playerTournaments.length > 0;
  let tpj=pj, tpg=pg, tpe=pe, tpp=pp, tpts=pts;
  playerTournaments.forEach(t => { const s=t.standings[name]; if(s){tpj+=s.pj;tpg+=s.pg;tpe+=s.pe;tpp+=s.pp;tpts+=s.pts;} });
  const teff = tpj>0?((tpts/(tpj*3))*100).toFixed(1):'0.0';
  const teffClass = parseFloat(teff)>=66?'eff-high':parseFloat(teff)>=40?'eff-mid':'eff-low';

  document.getElementById('profile-panel').innerHTML = `
    <div class="profile-inner">
      <div class="profile-topbar">
        <button class="profile-back" onclick="closeProfile()">← Volver</button>
        <button class="btn btn-outline" style="margin-left:auto;font-size:11px;padding:5px 10px" onclick="openCompare('${name}')">⚡ Comparar</button>
      </div>
      <div class="profile-hero">
        ${avatarHTML(name, 56)}
        <div>
          <div class="profile-name">${name}</div>
          ${titlesHTML}
          ${rachaLabel ? `<div class="profile-racha-label">${rachaLabel}</div>` : ''}
        </div>
      </div>

      ${hasHistory ? `
      <div class="profile-section-header" style="background:#1a1600;color:#c8a830;border-color:#3a3000">Historial total</div>
      <div class="profile-stats-grid" style="background:#2a2400">
        <div class="profile-stat" style="background:#1c1600"><span class="profile-stat-val" style="color:var(--gold)">${tpts}</span><span class="profile-stat-key">Pts</span></div>
        <div class="profile-stat" style="background:#1c1600"><span class="profile-stat-val">${tpj}</span><span class="profile-stat-key">PJ</span></div>
        <div class="profile-stat" style="background:#1c1600"><span class="profile-stat-val" style="color:#5cb85c">${tpg}</span><span class="profile-stat-key">PG</span></div>
        <div class="profile-stat" style="background:#1c1600"><span class="profile-stat-val" style="color:#c8b85c">${tpe}</span><span class="profile-stat-key">PE</span></div>
        <div class="profile-stat" style="background:#1c1600"><span class="profile-stat-val" style="color:#e05252">${tpp}</span><span class="profile-stat-key">PP</span></div>
        <div class="profile-stat" style="background:#1c1600"><span class="eff-cell ${teffClass}" style="font-size:13px">${teff}%</span><span class="profile-stat-key">Ef.%</span></div>
      </div>` : ''}

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

      ${last10.length > 0 ? `<div class="profile-section"><div class="profile-section-title">Racha reciente</div><div class="profile-racha-strip">${rachaHTML}</div></div>` : ''}

      ${evoHTML}
      ${badgesHTML}

      <div class="profile-section">
        <div class="profile-section-title">Partidos del torneo actual</div>
        <div class="profile-matches">${histHTML}</div>
      </div>

      ${hasHistory ? `<div class="profile-section"><div class="profile-section-title">Torneos anteriores</div>${histTournamentHTML}</div>` : ''}

      ${compHTML}
      ${rivalsHTML}
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



// ─── REACTIONS ─────────────────────────────────────────────────────────────
function getVisitorId() {
  let id = localStorage.getItem('pachanga_visitor_id');
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('pachanga_visitor_id', id); }
  return id;
}

async function toggleReaction(matchId, emoji) {
  const match = state.matches.find(m => m.id === matchId);
  if (!match) return;
  if (!match.reactions) match.reactions = {};
  if (!match.reactions[emoji]) match.reactions[emoji] = [];
  const vid = getVisitorId();
  const idx = match.reactions[emoji].indexOf(vid);
  if (idx >= 0) match.reactions[emoji].splice(idx, 1);
  else match.reactions[emoji].push(vid);
  await saveToFirestore();
}
window.toggleReaction = toggleReaction;


// ─── COMMENTS ──────────────────────────────────────────────────────────────
function toggleComments(matchId) {
  const el = document.getElementById('comments-' + matchId);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
window.toggleComments = toggleComments;

async function postComment(matchId) {
  const input = document.getElementById('comment-input-' + matchId);
  const nameInput = document.getElementById('comment-name-' + matchId);
  const text = input.value.trim();
  const author = nameInput.value.trim() || 'Anónimo';
  if (!text) return;
  const match = state.matches.find(m => m.id === matchId);
  if (!match) return;
  if (!match.comments) match.comments = [];
  match.comments.push({ author, text, ts: Date.now() });
  await saveToFirestore();
  input.value = '';
}
window.postComment = postComment;

// ─── EDIT MATCH ────────────────────────────────────────────────────────────
let editingMatchId = null;
let editSelA = new Set();
let editSelB = new Set();

function editMatch(id) {
  const match = state.matches.find(m => m.id === id);
  if (!match) return;
  editingMatchId = id;
  editSelA = new Set(match.teamA || []);
  editSelB = new Set(match.teamB || []);

  document.getElementById('edit-match-date').value = match.date || '';
  document.getElementById('edit-goals-a').value = match.goalsA || 0;
  document.getElementById('edit-goals-b').value = match.goalsB || 0;
  document.getElementById('edit-goals-a-display').textContent = match.goalsA || 0;
  document.getElementById('edit-goals-b-display').textContent = match.goalsB || 0;

  // Render chips
  ['a','b'].forEach(t => {
    const container = document.getElementById('edit-chips-' + t);
    const sel = t === 'a' ? editSelA : editSelB;
    container.innerHTML = state.players.map(p => {
      const cls = sel.has(p) ? 'player-chip selected-' + t : 'player-chip';
      return `<div class="${cls}" id="edit-chip-${t}-${safeId(p)}" onclick="toggleEditPlayer('${escapeName(p)}','${t}')">${p}</div>`;
    }).join('');
  });

  document.getElementById('edit-match-modal').style.display = 'flex';
}
window.editMatch = editMatch;

function closeEditMatchModal(e) {
  if (e.target.id === 'edit-match-modal') {
    document.getElementById('edit-match-modal').style.display = 'none';
    editingMatchId = null;
  }
}
window.closeEditMatchModal = closeEditMatchModal;

function toggleEditPlayer(name, team) {
  const other = team === 'a' ? 'b' : 'a';
  const otherSet = team === 'a' ? editSelB : editSelA;
  const thisSet  = team === 'a' ? editSelA : editSelB;
  if (otherSet.has(name)) return;
  const chip = document.getElementById('edit-chip-' + team + '-' + safeId(name));
  if (thisSet.has(name)) { thisSet.delete(name); chip.className = 'player-chip'; }
  else { thisSet.add(name); chip.className = 'player-chip selected-' + team; }
}
window.toggleEditPlayer = toggleEditPlayer;

function changeEditGoal(team, delta) {
  const input = document.getElementById('edit-goals-' + team);
  const display = document.getElementById('edit-goals-' + team + '-display');
  let val = parseInt(input.value) + delta;
  if (val < 0) val = 0;
  input.value = val;
  display.textContent = val;
}
window.changeEditGoal = changeEditGoal;

async function saveEditMatch() {
  if (!editingMatchId) return;
  const date = document.getElementById('edit-match-date').value.trim();
  const ga = parseInt(document.getElementById('edit-goals-a').value) || 0;
  const gb = parseInt(document.getElementById('edit-goals-b').value) || 0;
  if (!date || editSelA.size === 0 || editSelB.size === 0) return;

  state.matches = state.matches.map(m => {
    if (m.id !== editingMatchId) return m;
    return { ...m, date, teamA: [...editSelA], teamB: [...editSelB], goalsA: ga, goalsB: gb };
  });

  await saveToFirestore();
  document.getElementById('edit-match-modal').style.display = 'none';
  editingMatchId = null;
}
window.saveEditMatch = saveEditMatch;




// ─── TOP 5 EFECTIVIDAD ─────────────────────────────────────────────────────
function renderTop5() {
  const el = document.getElementById('top5-section');
  if (!el) return;
  const stats = computeStats();
  const rows = getSortedRows(stats).filter(([,s]) => s.pj >= 1);
  if (rows.length === 0) { el.style.display = 'none'; return; }

  // Sort by efectividad
  const top5 = [...rows]
    .sort((a,b) => {
      const ea = a[1].pj > 0 ? a[1].pts/(a[1].pj*3) : 0;
      const eb = b[1].pj > 0 ? b[1].pts/(b[1].pj*3) : 0;
      return eb - ea;
    })
    .slice(0, 5);

  const maxEff = top5.length > 0
    ? (top5[0][1].pj > 0 ? (top5[0][1].pts/(top5[0][1].pj*3))*100 : 0)
    : 100;

  el.style.display = 'block';
  el.innerHTML = `
    <div class="top5-header">
      <span class="top5-title">⚡ Top 5 Efectividad</span>
      <span class="top5-sub">Torneo actual</span>
    </div>
    <div class="top5-list">
      ${top5.map(([name, s], i) => {
        const eff = s.pj > 0 ? (s.pts/(s.pj*3))*100 : 0;
        const barW = maxEff > 0 ? (eff/maxEff)*100 : 0;
        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        return `<div class="top5-row" onclick="openProfile('${escapeName(name)}')">
          <span class="top5-medal">${medals[i]}</span>
          ${avatarHTML(name, 30)}
          <span class="top5-name">${getPlayerDisplayName(name)}</span>
          <div class="top5-bar-wrap">
            <div class="top5-bar" style="width:${barW.toFixed(1)}%"></div>
          </div>
          <span class="top5-eff">${eff.toFixed(1)}%</span>
          <span class="top5-pj">${s.pj}PJ</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ─── COMPARE / HEAD TO HEAD ────────────────────────────────────────────────
function openCompare(nameA) {
  // Populate player B selector
  const sel = document.getElementById('compare-player-b');
  sel.innerHTML = '<option value="">Elegí un jugador...</option>' +
    state.players.filter(p => p !== nameA).map(p =>
      `<option value="${p}">${getPlayerDisplayName(p)}</option>`
    ).join('');
  document.getElementById('compare-name-a').textContent = getPlayerDisplayName(nameA);
  document.getElementById('compare-name-a-full').textContent = nameA;
  document.getElementById('compare-body').innerHTML = '';
  document.getElementById('compare-panel').classList.add('open');
}
window.openCompare = openCompare;

function closeCompare() {
  document.getElementById('compare-panel').classList.remove('open');
}
window.closeCompare = closeCompare;

function runCompare() {
  const nameA = document.getElementById('compare-name-a-full').textContent;
  const nameB = document.getElementById('compare-player-b').value;
  if (!nameB) return;

  const stats = computeStats();
  const sA = stats[nameA] || { pts:0, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0 };
  const sB = stats[nameB] || { pts:0, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0 };

  const effA = sA.pj > 0 ? ((sA.pts/(sA.pj*3))*100).toFixed(1) : '0.0';
  const effB = sB.pj > 0 ? ((sB.pts/(sB.pj*3))*100).toFixed(1) : '0.0';

  // Head to head
  let h2h = { togetherW:0, togetherL:0, togetherE:0, togetherPJ:0, vsW:0, vsL:0, vsE:0, vsPJ:0 };
  state.matches.forEach(m => {
    const inAinA = (m.teamA||[]).includes(nameA);
    const inBinA = (m.teamA||[]).includes(nameB);
    const inAinB = (m.teamB||[]).includes(nameA);
    const inBinB = (m.teamB||[]).includes(nameB);
    const ga = parseInt(m.goalsA)||0, gb = parseInt(m.goalsB)||0;

    // Both on same team
    if ((inAinA && inBinA) || (inAinB && inBinB)) {
      h2h.togetherPJ++;
      const aWon = (inAinA && ga>gb) || (inAinB && gb>ga);
      const draw = ga===gb;
      if (draw) h2h.togetherE++;
      else if (aWon) h2h.togetherW++;
      else h2h.togetherL++;
    }
    // Facing each other
    if ((inAinA && inBinB) || (inAinB && inBinA)) {
      h2h.vsPJ++;
      const aWon = (inAinA && ga>gb) || (inAinB && gb>ga);
      const draw = ga===gb;
      if (draw) h2h.vsE++;
      else if (aWon) h2h.vsW++;
      else h2h.vsL++;
    }
  });

  function bar(valA, valB, label) {
    const total = (parseFloat(valA)||0) + (parseFloat(valB)||0);
    const pctA = total > 0 ? Math.round((parseFloat(valA)/total)*100) : 50;
    const pctB = 100 - pctA;
    return `<div class="cmp-row">
      <span class="cmp-val-a">${valA}</span>
      <div class="cmp-bar-wrap">
        <div class="cmp-bar-a" style="width:${pctA}%"></div>
        <div class="cmp-bar-b" style="width:${pctB}%"></div>
      </div>
      <span class="cmp-val-b">${valB}</span>
      <span class="cmp-label">${label}</span>
    </div>`;
  }

  const dnA = getPlayerDisplayName(nameA), dnB = getPlayerDisplayName(nameB);

  // Historical totals
  function histTotal(name, curr) {
    let tpts = curr.pts, tpj = curr.pj, tpg = curr.pg, tpe = curr.pe, tpp = curr.pp;
    HISTORICAL_TOURNAMENTS.forEach(t => {
      const s = t.standings[name];
      if (s) { tpts += s.pts; tpj += s.pj; tpg += s.pg; tpe += s.pe; tpp += s.pp; }
    });
    if (state.archivedTournaments) {
      state.archivedTournaments.forEach(t => {
        const s = t.standings && t.standings[name];
        if (s) { tpts += s.pts; tpj += s.pj; tpg += s.pg; tpe += s.pe; tpp += s.pp; }
      });
    }
    const teff = tpj > 0 ? ((tpts/(tpj*3))*100).toFixed(1) : '0.0';
    return { tpts, tpj, tpg, tpe, tpp, teff };
  }

  const hA = histTotal(nameA, sA);
  const hB = histTotal(nameB, sB);
  const hasHist = hA.tpj > sA.pj || hB.tpj > sB.pj;

  document.getElementById('compare-body').innerHTML = `
    <div class="cmp-header">
      <div class="cmp-player-a">${avatarHTML(nameA,40)}<span>${dnA}</span></div>
      <div class="cmp-vs">VS</div>
      <div class="cmp-player-b">${avatarHTML(nameB,40)}<span>${dnB}</span></div>
    </div>

    <div class="cmp-section-title">Torneo actual</div>
    ${bar(sA.pts, sB.pts, 'Pts')}
    ${bar(sA.pj, sB.pj, 'PJ')}
    ${bar(sA.pg, sB.pg, 'PG')}
    ${bar(sA.pp, sB.pp, 'PP')}
    ${bar(effA, effB, 'Ef.%')}
    ${bar(sA.gf - sA.gc, sB.gf - sB.gc, 'DG')}

    ${hasHist ? `
    <div class="cmp-section-title" style="color:#c8a830">Historial total</div>
    ${bar(hA.tpts, hB.tpts, 'Pts totales')}
    ${bar(hA.tpj, hB.tpj, 'PJ totales')}
    ${bar(hA.tpg, hB.tpg, 'PG totales')}
    ${bar(hA.tpp, hB.tpp, 'PP totales')}
    ${bar(hA.teff, hB.teff, 'Ef.% histórica')}
    ` : ''}

    ${h2h.togetherPJ > 0 ? `
    <div class="cmp-section-title">Juntos (${h2h.togetherPJ} partidos)</div>
    <div class="cmp-h2h-row">
      <span class="cmp-h2h-w">${h2h.togetherW} victorias</span>
      <span class="cmp-h2h-e">${h2h.togetherE} empates</span>
      <span class="cmp-h2h-l">${h2h.togetherL} derrotas</span>
    </div>` : ''}

    ${h2h.vsPJ > 0 ? `
    <div class="cmp-section-title">Cara a cara (${h2h.vsPJ} partidos)</div>
    <div class="cmp-h2h-row">
      <span style="font-size:13px;font-weight:600;color:var(--text)">${dnA}</span>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="cmp-h2h-w">${h2h.vsW}G</span>
        <span class="cmp-h2h-e">${h2h.vsE}E</span>
        <span class="cmp-h2h-l">${h2h.vsL}D</span>
      </div>
    </div>` : `<div class="cmp-section-title" style="color:#555">Nunca se enfrentaron</div>`}
  `;
}
window.runCompare = runCompare;

// ─── PULL TO REFRESH ───────────────────────────────────────────────────────
(function() {
  let startY = 0, pulling = false;
  const THRESHOLD = 80;

  const indicator = document.createElement('div');
  indicator.id = 'ptr-indicator';
  indicator.innerHTML = '<span id="ptr-arrow">↓</span> <span id="ptr-text">Tirá para actualizar</span>';
  indicator.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:490;background:var(--green-dim);color:var(--green-accent);font-family:"Barlow",sans-serif;font-size:13px;font-weight:600;letter-spacing:.4px;text-align:center;padding:10px;transform:translateY(-100%);transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:8px';
  document.body.appendChild(indicator);

  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) { startY = e.touches[0].clientY; pulling = true; }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 10) {
      const pct = Math.min(dy / THRESHOLD, 1);
      indicator.style.transform = `translateY(${(pct - 1) * 100}%)`;
      document.getElementById('ptr-arrow').style.transform = `rotate(${pct * 180}deg)`;
      document.getElementById('ptr-text').textContent = dy >= THRESHOLD ? '¡Soltá para actualizar!' : 'Tirá para actualizar';
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!pulling) return;
    pulling = false;
    const dy = e.changedTouches[0].clientY - startY;
    indicator.style.transform = 'translateY(-100%)';
    if (dy >= THRESHOLD) {
      document.getElementById('ptr-text').textContent = 'Actualizando...';
      indicator.style.transform = 'translateY(0)';
      // Force re-fetch from Firestore
      setTimeout(() => { indicator.style.transform = 'translateY(-100%)'; }, 1200);
      // Re-render active view
      const activeView = document.querySelector('.view.active');
      if (activeView) {
        const id = activeView.id.replace('view-', '');
        if (id === 'tabla') { renderTable(); renderPalmares(); }
        if (id === 'historial') renderHistorial();
        if (id === 'stats') renderTournamentStats();
      }
    }
  }, { passive: true });
})();


// ─── CLOSE TOURNAMENT ──────────────────────────────────────────────────────
function openCloseTournament() {
  document.getElementById('close-tournament-modal').style.display = 'flex';
}
window.openCloseTournament = openCloseTournament;

function closeCloseTournamentModal(e) {
  if (!e || e.target.id === 'close-tournament-modal') {
    document.getElementById('close-tournament-modal').style.display = 'none';
  }
}
window.closeCloseTournamentModal = closeCloseTournamentModal;

async function confirmCloseTournament() {
  const nameInput = document.getElementById('new-tournament-name').value.trim();
  const championsInput = document.getElementById('tournament-champions').value.trim();
  if (!nameInput) { alert('Ingresá el nombre del torneo.'); return; }

  const stats = computeStats();
  const rows = getSortedRows(stats);

  // Build standings for archive
  const standings = {};
  rows.forEach(([name, s]) => { standings[name] = { pts: s.pts, pj: s.pj, pg: s.pg, pe: s.pe, pp: s.pp }; });

  // Champions: use input or auto-detect (tied leaders)
  let champions = [];
  if (championsInput) {
    champions = championsInput.split(',').map(s => s.trim()).filter(Boolean);
  } else if (rows.length > 0) {
    const maxPts = rows[0][1].pts;
    champions = rows.filter(([,s]) => s.pts === maxPts).map(([n]) => n);
  }

  // Build new tournament entry
  const newTournament = { name: nameInput, champion: true, champions, standings };

  // Save to Firestore: archive current, reset matches/players, keep playerData
  if (!state.archivedTournaments) state.archivedTournaments = [];
  state.archivedTournaments.push(newTournament);

  // Update titles
  if (!state.customTitles) state.customTitles = {};
  champions.forEach(p => {
    state.customTitles[p] = (state.customTitles[p] || 0) + 1;
  });

  // Reset current tournament
  state.matches = [];
  state.migrationV1 = true; // don't re-run migration

  await saveToFirestore();
  document.getElementById('close-tournament-modal').style.display = 'none';
  alert(`¡Torneo "${nameInput}" archivado! El torneo actual quedó limpio.`);
  renderTable();
  renderHistorial();
  renderPalmares();
}
window.confirmCloseTournament = confirmCloseTournament;

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
  // Add custom titles from archived tournaments
  if (state.customTitles) {
    Object.entries(state.customTitles).forEach(([p, n]) => {
      titles[p] = (titles[p] || 0) + n;
    });
  }

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
