// ================================================================
// IMPOSTER — script.js  (fully rewritten, all bugs fixed)
// ================================================================
// FIXES APPLIED:
//  1. Room code is now a 4-digit number (1000–9999)
//  2. Page refresh / back button removes player from lobby (beforeunload + onDisconnect)
//  3. Final-guess screen is REMOVED — imposter caught = players win immediately
//  4. "I Saw My Role" hides the image right away for that player
//  5. Play Again returns EVERYONE to the lobby (phase listener on every client)
//  6. Host badge in lobby is kept up-to-date after host transfer
// ================================================================

/* ─── Global state ─── */
const state = {
  playerId:     null,
  roomCode:     null,
  nickname:     null,
  isHost:       false,
  roomRef:      null,
  listeners:    [],
  timerSecs:    120,
  localTimer:   null,
  voted:        false,
  roleRevealed: false,
  confirmedRole:false,
};

const AV_COLORS = ['av-0','av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8','av-9'];

/* ════════════════════════════════════════
   UTILITIES
════════════════════════════════════════ */

function randId(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

// 4-digit numeric PIN (1000–9999)
function genRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function showToast(msg) {
  let box = document.getElementById('toast-container');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-container';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}
function avatarClass(idx) { return AV_COLORS[idx % AV_COLORS.length]; }
function initials(name)   { return name.slice(0,2).toUpperCase(); }

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* ─── Screen navigation ─── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const t = document.getElementById('screen-' + id);
  if (t) t.classList.add('active');
}

/* ─── Firebase listener helpers ─── */
function onRef(ref, event, cb) {
  ref.on(event, cb);
  state.listeners.push({ ref, event, cb });
}
function detachAll() {
  state.listeners.forEach(({ ref, event, cb }) => ref.off(event, cb));
  state.listeners = [];
}

/* ─── Timer helpers ─── */
function stopLocalTimer() {
  if (state.localTimer) { clearInterval(state.localTimer); state.localTimer = null; }
}

/* ════════════════════════════════════════
   HOME — TABS
════════════════════════════════════════ */

function switchTab(tab) {
  document.getElementById('tab-create').classList.toggle('active', tab === 'create');
  document.getElementById('tab-join').classList.toggle('active',   tab === 'join');
  document.getElementById('panel-create').classList.toggle('active', tab === 'create');
  document.getElementById('panel-join').classList.toggle('active',   tab === 'join');
}

/* ════════════════════════════════════════
   CREATE ROOM
════════════════════════════════════════ */

async function createRoom() {
  clearError('home-error');
  const nick = document.getElementById('home-nickname').value.trim();
  if (!nick)         { setError('home-error','Please enter a nickname.'); return; }
  if (nick.length<2) { setError('home-error','Nickname must be at least 2 characters.'); return; }

  const code     = genRoomCode();
  const playerId = randId(10);
  state.playerId = playerId;
  state.nickname = nick;
  state.roomCode = code;
  state.isHost   = true;

  const roomRef = database.ref(`imposter/rooms/${code}`);

  const roomData = {
    code,
    host:      playerId,
    phase:     'lobby',
    timerSecs: state.timerSecs,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    players: {
      [playerId]: {
        id:       playerId,
        nickname: nick,
        ready:    false,
        isHost:   true,
        avIndex:  0,
        online:   true,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
      }
    }
  };

  try {
    await roomRef.set(roomData);

    // FIX: remove player from Firebase when they disconnect (refresh/close/back)
    roomRef.child(`players/${playerId}`).onDisconnect().remove();
    // Also handle host transfer on disconnect
    roomRef.child(`players/${playerId}/online`).onDisconnect().set(false);

    state.roomRef = roomRef;
    enterLobby();
  } catch(err) {
    console.error(err);
    setError('home-error','Failed to create room. Try again.');
  }
}

/* ════════════════════════════════════════
   JOIN ROOM
════════════════════════════════════════ */

async function joinRoom() {
  clearError('home-error');
  const nick = document.getElementById('home-nickname').value.trim();
  const raw  = document.getElementById('join-code').value.trim();
  const code = raw.replace(/\D/g,''); // digits only

  if (!nick)            { setError('home-error','Please enter a nickname.'); return; }
  if (code.length !== 4){ setError('home-error','Please enter a valid 4-digit room code.'); return; }

  try {
    const roomRef = database.ref(`imposter/rooms/${code}`);
    const snap    = await roomRef.once('value');
    if (!snap.exists()) { setError('home-error','Room not found. Check the code.'); return; }

    const room    = snap.val();
    if (room.phase !== 'lobby') { setError('home-error','Game already started in this room.'); return; }

    const players     = room.players || {};
    const playerCount = Object.keys(players).length;
    if (playerCount >= 10) { setError('home-error','Room is full (max 10 players).'); return; }

    const nameTaken = Object.values(players).some(
      p => p.nickname.toLowerCase() === nick.toLowerCase()
    );
    if (nameTaken) { setError('home-error','That nickname is already taken in this room.'); return; }

    const playerId = randId(10);
    state.playerId = playerId;
    state.nickname = nick;
    state.roomCode = code;
    state.isHost   = false;
    state.timerSecs = room.timerSecs || 120;
    state.roomRef   = roomRef;

    const avIndex = playerCount % AV_COLORS.length;
    await roomRef.child(`players/${playerId}`).set({
      id:       playerId,
      nickname: nick,
      ready:    false,
      isHost:   false,
      avIndex,
      online:   true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
    });

    // FIX: remove player entry on disconnect so lobby stays clean
    roomRef.child(`players/${playerId}`).onDisconnect().remove();
    roomRef.child(`players/${playerId}/online`).onDisconnect().set(false);

    enterLobby();
  } catch(err) {
    console.error(err);
    setError('home-error','Failed to join room. Try again.');
  }
}

/* ════════════════════════════════════════
   LOBBY
════════════════════════════════════════ */

function enterLobby() {
  // Reset per-round flags
  state.voted        = false;
  state.roleRevealed = false;
  state.confirmedRole = false;
  stopLocalTimer();

  showScreen('lobby');
  document.getElementById('lobby-code').textContent = state.roomCode;

  // Only show settings panel to host
  const settingsEl = document.getElementById('host-settings');
  if (state.isHost) settingsEl.classList.add('visible');
  else              settingsEl.classList.remove('visible');

  updateTimerDisplay();
  listenLobby();
}

function listenLobby() {
  detachAll(); // clear any stale listeners first
  const roomRef = state.roomRef;

  // Watch players list
  onRef(roomRef.child('players'), 'value', snap => {
    const players = snap.val() || {};
    renderPlayerList(players);
    updateLobbyActions(players);
  });

  // Watch host field — update isHost flag and UI when host changes
  onRef(roomRef.child('host'), 'value', snap => {
    const hostId = snap.val();
    state.isHost = (hostId === state.playerId);
    const settingsEl = document.getElementById('host-settings');
    if (state.isHost) settingsEl.classList.add('visible');
    else              settingsEl.classList.remove('visible');
  });

  // Watch timerSecs
  onRef(roomRef.child('timerSecs'), 'value', snap => {
    if (snap.val()) { state.timerSecs = snap.val(); updateTimerDisplay(); }
  });

  // Watch phase — transition when host starts game OR play-again resets to lobby
  onRef(roomRef.child('phase'), 'value', snap => {
    const phase = snap.val();
    if (phase === 'reveal') {
      detachAll();
      fetchRoleAndReveal();
    }
    // 'lobby' phase is handled by this same screen already
  });
}

function renderPlayerList(players) {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  const arr = Object.values(players).sort((a,b) => (a.joinedAt||0) - (b.joinedAt||0));
  arr.forEach((p, i) => {
    const li  = document.createElement('li');
    li.className = 'player-list-item';
    const isYou   = p.id === state.playerId;
    const avClass = avatarClass(p.avIndex !== undefined ? p.avIndex : i);
    const badges  = [];
    if (p.isHost) badges.push('<span class="player-badge badge-host">HOST</span>');
    if (isYou)    badges.push('<span class="player-badge badge-you">YOU</span>');
    if (p.ready)  badges.push('<span class="player-badge badge-ready">✓ Ready</span>');
    else if (!p.isHost) badges.push('<span class="player-badge badge-waiting">Waiting</span>');

    li.innerHTML = `
      <div class="player-avatar ${avClass}">${initials(p.nickname)}</div>
      <span class="player-name">${escapeHtml(p.nickname)}</span>
      ${badges.join('')}
    `;
    list.appendChild(li);
  });
  document.getElementById('player-count').textContent = `${arr.length} / 10`;
}

function updateLobbyActions(players) {
  const arr        = Object.values(players);
  const total      = arr.length;
  const readyCount = arr.filter(p => p.ready || p.isHost).length;
  const allReady   = total >= 2 && readyCount === total;

  const me       = players[state.playerId];
  const btnReady = document.getElementById('btn-ready');
  const btnStart = document.getElementById('btn-start');
  const waitMsg  = document.getElementById('lobby-waiting');

  if (me) {
    if (me.isHost) {
      btnReady.classList.add('hidden');
    } else {
      btnReady.classList.remove('hidden');
      if (me.ready) {
        btnReady.textContent = '✓ Ready (tap to unready)';
        btnReady.classList.add('ready-active');
      } else {
        btnReady.textContent = '✓ I\'m Ready';
        btnReady.classList.remove('ready-active');
      }
    }
  }

  if (state.isHost) {
    if (allReady) {
      btnStart.classList.remove('hidden');
      waitMsg.classList.add('hidden');
    } else {
      btnStart.classList.add('hidden');
      waitMsg.classList.remove('hidden');
      const need = total - readyCount;
      waitMsg.textContent = need > 0
        ? `Waiting for ${need} more player(s) to get ready…`
        : 'Waiting for players…';
    }
  } else {
    btnStart.classList.add('hidden');
    waitMsg.classList.remove('hidden');
    waitMsg.textContent = allReady
      ? 'All ready! Waiting for host to start…'
      : `Waiting for players to get ready…`;
  }
}

async function toggleReady() {
  if (!state.roomRef || !state.playerId) return;
  const snap = await state.roomRef.child(`players/${state.playerId}/ready`).once('value');
  await state.roomRef.child(`players/${state.playerId}/ready`).set(!snap.val());
}

function adjustTimer(delta) {
  if (!state.isHost) return;
  const newVal = Math.max(30, Math.min(300, state.timerSecs + delta));
  state.timerSecs = newVal;
  state.roomRef.child('timerSecs').set(newVal);
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (el) el.textContent = state.timerSecs + 's';
}

async function startGame() {
  if (!state.isHost) return;
  const snap    = await state.roomRef.child('players').once('value');
  const players = snap.val() || {};
  const ids     = Object.keys(players);
  if (ids.length < 2) { showToast('Need at least 2 players!'); return; }

  const wordObj     = WORDS[Math.floor(Math.random() * WORDS.length)];
  const imposterId  = ids[Math.floor(Math.random() * ids.length)];

  await state.roomRef.update({
    phase:         'reveal',
    word:          wordObj.word,
    wordImage:     wordObj.image,
    category:      wordObj.category,
    imposter:      imposterId,
    startedAt:     firebase.database.ServerValue.TIMESTAMP,
    votes:         null,
    roleConfirmed: null,
    timerStart:    null,
  });
}

/* ════════════════════════════════════════
   ROLE REVEAL
════════════════════════════════════════ */

async function fetchRoleAndReveal() {
  const snap = await state.roomRef.once('value');
  const room = snap.val();

  const isImposter = room.imposter === state.playerId;
  const word       = room.word;
  const wordImage  = room.wordImage;

  state.roleRevealed  = false;
  state.confirmedRole = false;

  // Reset card flip state
  const cardInner = document.getElementById('reveal-card-inner');
  cardInner.classList.remove('flipped');
  document.getElementById('btn-saw-word').classList.add('hidden');
  document.getElementById('reveal-waiting').classList.add('hidden');

  // Build back face
  const backEl = document.getElementById('role-card-back');
  if (isImposter) {
    backEl.className = 'role-card-back role-imposter';
    backEl.innerHTML = `
      <div class="imposter-icon">🎭</div>
      <div class="imposter-title">YOU ARE THE<br>IMPOSTER</div>
      <p class="imposter-sub">Listen carefully to the discussion.<br>Figure out the secret word.</p>
    `;
  } else {
    backEl.className = 'role-card-back role-normal';
    backEl.innerHTML = `
      <div class="role-label">The Secret Word</div>
      <div class="role-word">${escapeHtml(word)}</div>
      <img class="role-image" id="role-reveal-img" src="${escapeHtml(wordImage)}" alt="${escapeHtml(word)}" />
      <p class="imposter-sub" style="font-size:.78rem;margin-top:4px;">Do not show anyone!</p>
    `;
  }

  showScreen('reveal');

  // Tap to flip
  const card = document.getElementById('reveal-card');
  card.onclick = () => {
    if (!state.roleRevealed) {
      cardInner.classList.add('flipped');
      state.roleRevealed = true;
      setTimeout(() => {
        document.getElementById('btn-saw-word').classList.remove('hidden');
      }, 700);
    }
  };

  listenRoleConfirm();
}

function listenRoleConfirm() {
  // Watch roleConfirmed — if all players confirmed, host moves to discussion
  onRef(state.roomRef.child('roleConfirmed'), 'value', snap => {
    const confirmed = snap.val() || {};
    state.roomRef.child('players').once('value', psnap => {
      const players = psnap.val() || {};
      const total   = Object.keys(players).length;
      if (Object.keys(confirmed).length >= total) {
        detachAll();
        startDiscussion();
      }
    });
  });

  // Watch phase for host-driven transitions
  onRef(state.roomRef.child('phase'), 'value', snap => {
    const phase = snap.val();
    if (phase === 'discussion') { detachAll(); enterDiscussionFromDB(); }
    if (phase === 'voting')     { detachAll(); enterVoting(); }
    if (phase === 'lobby')      { detachAll(); enterLobby(); }
  });
}

async function confirmSawRole() {
  // FIX: hide the image immediately for this player after they confirm
  const img = document.getElementById('role-reveal-img');
  if (img) img.style.display = 'none';

  document.getElementById('btn-saw-word').classList.add('hidden');
  document.getElementById('reveal-waiting').classList.remove('hidden');
  state.confirmedRole = true;

  await state.roomRef.child(`roleConfirmed/${state.playerId}`).set(true);

  // Host checks if everyone confirmed
  if (state.isHost) {
    const [cSnap, pSnap] = await Promise.all([
      state.roomRef.child('roleConfirmed').once('value'),
      state.roomRef.child('players').once('value'),
    ]);
    const confirmed = cSnap.val() || {};
    const players   = pSnap.val() || {};
    if (Object.keys(confirmed).length >= Object.keys(players).length) {
      await state.roomRef.child('phase').set('discussion');
    }
  }
}

/* ════════════════════════════════════════
   DISCUSSION
════════════════════════════════════════ */

async function startDiscussion() {
  // Only host writes the timerStart to DB
  if (state.isHost) {
    const snap = await state.roomRef.once('value');
    const room = snap.val();
    await state.roomRef.update({
      phase:      'discussion',
      timerStart: firebase.database.ServerValue.TIMESTAMP,
      timerSecs:  room.timerSecs || state.timerSecs,
    });
  }
  enterDiscussionFromDB();
}

async function enterDiscussionFromDB() {
  const snap = await state.roomRef.once('value');
  const room = snap.val();
  if (!room) return;

  state.timerSecs = room.timerSecs || 120;
  showScreen('discussion');

  // Player list
  const players = room.players || {};
  const pList   = document.getElementById('discussion-player-list');
  pList.innerHTML = '';
  Object.values(players).forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'player-list-item';
    li.innerHTML = `
      <div class="player-avatar ${avatarClass(p.avIndex !== undefined ? p.avIndex : i)}">${initials(p.nickname)}</div>
      <span class="player-name">${escapeHtml(p.nickname)}</span>
      ${p.id === state.playerId ? '<span class="player-badge badge-you">YOU</span>' : ''}
    `;
    pList.appendChild(li);
  });

  // Skip button only for host
  document.getElementById('btn-skip-timer').classList.toggle('hidden', !state.isHost);

  // Timer — wait for timerStart from DB
  const timerStart = room.timerStart || Date.now();
  runDiscussionTimer(timerStart, state.timerSecs);

  // Phase listener
  onRef(state.roomRef.child('phase'), 'value', snap => {
    const phase = snap.val();
    if (phase === 'voting') { stopLocalTimer(); detachAll(); enterVoting(); }
    if (phase === 'lobby')  { stopLocalTimer(); detachAll(); enterLobby(); }
  });
}

function runDiscussionTimer(timerStart, totalSecs) {
  const circumference = 2 * Math.PI * 54;
  const ring  = document.getElementById('timer-ring-fg');
  const numEl = document.getElementById('timer-seconds');

  stopLocalTimer();
  state.localTimer = setInterval(async () => {
    const elapsed   = (Date.now() - timerStart) / 1000;
    const remaining = Math.max(0, totalSecs - elapsed);
    const secs      = Math.ceil(remaining);

    if (numEl) numEl.textContent = secs;
    if (ring) {
      ring.style.strokeDashoffset = circumference * (1 - remaining / totalSecs);
      if (secs <= 30)      ring.style.stroke = 'var(--coral)';
      else if (secs <= 60) ring.style.stroke = 'var(--gold)';
      else                 ring.style.stroke = 'var(--violet)';
    }

    if (remaining <= 0) {
      stopLocalTimer();
      if (state.isHost) {
        await state.roomRef.child('phase').set('voting');
      }
    }
  }, 500);
}

async function skipToVoting() {
  if (!state.isHost) return;
  stopLocalTimer();
  await state.roomRef.child('phase').set('voting');
}

/* ════════════════════════════════════════
   VOTING
════════════════════════════════════════ */

async function enterVoting() {
  showScreen('voting');
  state.voted = false;

  document.getElementById('vote-cast-msg').classList.add('hidden');
  document.getElementById('voting-waiting').classList.add('hidden');

  const snap    = await state.roomRef.once('value');
  const room    = snap.val();
  const players = room.players || {};

  renderVotingList(players);
  listenVotes(players);
}

function renderVotingList(players) {
  const list = document.getElementById('voting-list');
  list.innerHTML = '';
  Object.values(players).forEach((p, i) => {
    if (p.id === state.playerId) return;
    const li = document.createElement('li');
    li.className = 'voting-item';
    li.id = `vote-item-${p.id}`;
    li.innerHTML = `
      <div class="player-avatar ${avatarClass(p.avIndex !== undefined ? p.avIndex : i)}">${initials(p.nickname)}</div>
      <span class="vote-name">${escapeHtml(p.nickname)}</span>
      <span class="vote-arrow">→</span>
    `;
    li.onclick = () => castVote(p.id, p.nickname);
    list.appendChild(li);
  });
}

async function castVote(targetId, targetName) {
  if (state.voted) return;
  state.voted = true;

  // Visual: mark the voted item, disable all
  document.querySelectorAll('.voting-item').forEach(el => {
    el.onclick = null;
    const arrow = el.querySelector('.vote-arrow');
    if (arrow) arrow.style.display = 'none';
  });
  const votedEl = document.getElementById(`vote-item-${targetId}`);
  if (votedEl) {
    votedEl.classList.add('voted');
    votedEl.innerHTML += '<span class="vote-check">✓</span>';
  }

  document.getElementById('vote-cast-msg').classList.remove('hidden');
  document.getElementById('voting-waiting').classList.remove('hidden');

  await state.roomRef.child(`votes/${state.playerId}`).set(targetId);
}

function listenVotes(players) {
  const totalVoters = Object.keys(players).length;

  onRef(state.roomRef.child('votes'), 'value', async snap => {
    const votes      = snap.val() || {};
    const voteCount  = Object.keys(votes).length;
    if (voteCount >= totalVoters) {
      detachAll();
      stopLocalTimer();
      await processResults(players, votes);
    }
  });

  // Also listen for phase jumps from host
  onRef(state.roomRef.child('phase'), 'value', snap => {
    const phase = snap.val();
    if (phase === 'finalguess') { detachAll(); enterFinalGuess(); }
    if (phase === 'results')    { detachAll(); }
    if (phase === 'lobby')      { detachAll(); enterLobby(); }
  });
}

/* ════════════════════════════════════════
   RESULTS PROCESSING
════════════════════════════════════════ */

async function processResults(players, votes) {
  // Tally votes
  const tally = {};
  Object.values(votes).forEach(targetId => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  // Find who got most votes
  let maxVotes   = 0;
  let votedOutId = null;
  Object.entries(tally).forEach(([id, count]) => {
    if (count > maxVotes) { maxVotes = count; votedOutId = id; }
  });

  const snap       = await state.roomRef.once('value');
  const room       = snap.val();
  const imposterId = room.imposter;

  if (votedOutId === imposterId) {
    // Imposter caught → show final-guess screen for ALL players
    // (imposter can type, others wait — but no word guessing needed, players win)
    // FIX: go straight to final-guess display screen (NO word guessing logic)
    if (state.isHost) {
      await state.roomRef.child('phase').set('finalguess');
    }
    enterFinalGuess(imposterId, room, tally, players);
  } else {
    // Imposter not caught → imposter wins
    if (state.isHost) {
      await state.roomRef.update({ phase: 'results', resultWinner: 'imposter' });
    }
    showResults(room, tally, players, 'imposter-escape');
  }
}

/* ════════════════════════════════════════
   FINAL GUESS SCREEN
   (shown to all — imposter caught, players win)
   NO word-guessing mechanic, just a reveal screen
════════════════════════════════════════ */

function enterFinalGuess(imposterId, room, tally, players) {
  showScreen('final-guess');

  const isImposter = state.playerId === imposterId;
  const inputCard  = document.getElementById('final-guess-input-card');
  const waitMsg    = document.getElementById('final-guess-waiting');
  const descEl     = document.getElementById('final-guess-desc');

  if (isImposter) {
    // Imposter sees the screen but there's nothing to submit — they were caught
    descEl.textContent   = 'You were caught! The players found you.';
    inputCard.classList.add('hidden');
    waitMsg.classList.add('hidden');
  } else {
    // Non-imposters see the caught message
    descEl.textContent   = 'The imposter has been caught!';
    inputCard.classList.add('hidden');
    waitMsg.classList.add('hidden');
  }

  // Auto-advance to results after 3 seconds
  setTimeout(async () => {
    if (state.isHost) {
      await state.roomRef.update({ phase: 'results', resultWinner: 'players' });
    }
    showResults(room, tally, players, 'players-win');
  }, 3000);

  // Listen in case host already advanced
  onRef(state.roomRef.child('phase'), 'value', snap => {
    if (snap.val() === 'results') {
      detachAll();
      showResults(room, tally, players, 'players-win');
    }
    if (snap.val() === 'lobby') { detachAll(); enterLobby(); }
  });
}

/* ════════════════════════════════════════
   RESULTS
════════════════════════════════════════ */

function showResults(room, tally, players, outcome) {
  showScreen('results');

  const banner   = document.getElementById('result-banner');
  const headline = document.getElementById('result-headline');
  const resultSub= document.getElementById('result-sub');
  const emoji    = document.getElementById('result-emoji');

  if (outcome === 'players-win') {
    banner.className         = 'result-banner players-win';
    emoji.textContent        = '🎉';
    headline.textContent     = 'Players Win!';
    headline.style.color     = 'var(--violet-lite)';
    resultSub.textContent    = 'The imposter was caught!';
  } else {
    // imposter-escape
    banner.className         = 'result-banner imposter-wins';
    emoji.textContent        = '🎭';
    headline.textContent     = 'Imposter Escapes!';
    headline.style.color     = 'var(--coral)';
    resultSub.textContent    = 'The wrong person was voted out.';
  }

  // Word
  document.getElementById('result-word').textContent = room.word || '';
  const imgEl = document.getElementById('result-image');
  imgEl.src   = room.wordImage || '';
  imgEl.alt   = room.word || '';

  // Imposter name
  const imposterPlayer = players[room.imposter];
  document.getElementById('result-imposter-name').textContent =
    imposterPlayer ? escapeHtml(imposterPlayer.nickname) : 'Unknown';

  // Votes breakdown
  const votesList = document.getElementById('result-votes-list');
  votesList.innerHTML = '';
  const playerArr = Object.values(players).sort((a,b) => (tally[b.id]||0) - (tally[a.id]||0));
  const maxV      = Math.max(...playerArr.map(p => tally[p.id]||0), 1);

  playerArr.forEach((p, i) => {
    const vCount     = tally[p.id] || 0;
    const isImposter = p.id === room.imposter;
    const li = document.createElement('li');
    li.className = `votes-list-item${isImposter ? ' was-imposter' : ''}`;
    li.innerHTML = `
      <div class="player-avatar ${avatarClass(p.avIndex !== undefined ? p.avIndex : i)}"
           style="width:28px;height:28px;font-size:.75rem;">${initials(p.nickname)}</div>
      <span style="font-size:.9rem;font-weight:600;min-width:80px">${escapeHtml(p.nickname)}${isImposter ? ' 🎭' : ''}</span>
      <div class="votes-bar-wrap">
        <div class="votes-bar${isImposter ? ' imposter-bar':''}" style="width:${(vCount/maxV)*100}%"></div>
      </div>
      <span class="votes-count">${vCount}</span>
    `;
    votesList.appendChild(li);
  });

  // Listen for play-again reset
  onRef(state.roomRef.child('phase'), 'value', snap => {
    if (snap.val() === 'lobby') { detachAll(); enterLobby(); }
  });
}

/* ════════════════════════════════════════
   PLAY AGAIN
   FIX: resets phase to 'lobby' — ALL clients pick it up via phase listener
════════════════════════════════════════ */

async function playAgain() {
  if (!state.isHost) {
    showToast('Only the host can start a new round!');
    return;
  }

  const snap    = await state.roomRef.child('players').once('value');
  const players = snap.val() || {};

  // Build atomic update: reset all players' ready status + clear game data
  const updates = {};
  Object.keys(players).forEach(pid => {
    updates[`players/${pid}/ready`] = false;
  });
  updates.phase          = 'lobby';
  updates.word           = null;
  updates.wordImage      = null;
  updates.category       = null;
  updates.imposter       = null;
  updates.votes          = null;
  updates.roleConfirmed  = null;
  updates.timerStart     = null;
  updates.resultWinner   = null;

  await state.roomRef.update(updates);
  // The phase listener on every client will call enterLobby() automatically
}

/* ════════════════════════════════════════
   LEAVE ROOM
════════════════════════════════════════ */

async function leaveRoom() {
  detachAll();
  stopLocalTimer();

  if (state.roomRef && state.playerId) {
    try {
      if (state.isHost) {
        // Transfer host to next player
        const snap     = await state.roomRef.child('players').once('value');
        const players  = snap.val() || {};
        const otherIds = Object.keys(players).filter(id => id !== state.playerId);
        if (otherIds.length > 0) {
          const newHostId = otherIds[0];
          await state.roomRef.update({
            host: newHostId,
            [`players/${newHostId}/isHost`]: true,
          });
        } else {
          await state.roomRef.remove();
        }
      }
      // Cancel the onDisconnect so it doesn't fire again
      await state.roomRef.child(`players/${state.playerId}`).onDisconnect().cancel();
      await state.roomRef.child(`players/${state.playerId}`).remove();
    } catch(e) { /* best effort */ }
  }

  // Reset all state
  state.playerId     = null;
  state.roomCode     = null;
  state.nickname     = null;
  state.isHost       = false;
  state.roomRef      = null;
  state.voted        = false;
  state.roleRevealed = false;
  state.confirmedRole= false;

  showScreen('home');
}

/* ════════════════════════════════════════
   COPY ROOM CODE
════════════════════════════════════════ */

function copyRoomCode() {
  if (!state.roomCode) return;
  navigator.clipboard.writeText(state.roomCode).then(() => {
    document.getElementById('copy-icon').textContent = '✓';
    showToast('Room code copied!');
    setTimeout(() => {
      const el = document.getElementById('copy-icon');
      if (el) el.textContent = '⧉';
    }, 2000);
  }).catch(() => showToast(state.roomCode));
}

/* ════════════════════════════════════════
   DOMContentLoaded — input wiring
════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Join code: digits only, max 4
  const joinCode = document.getElementById('join-code');
  if (joinCode) {
    joinCode.addEventListener('input', () => {
      joinCode.value = joinCode.value.replace(/\D/g,'').slice(0,4);
    });
    joinCode.addEventListener('keydown', e => {
      if (e.key === 'Enter') joinRoom();
    });
  }

  // Nickname enter key
  const nickInput = document.getElementById('home-nickname');
  if (nickInput) {
    nickInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const isJoin = document.getElementById('tab-join').classList.contains('active');
        isJoin ? joinRoom() : createRoom();
      }
    });
  }

  // Show home after loading animation
  setTimeout(() => showScreen('home'), 1200);
});

/* ════════════════════════════════════════
   BROWSER BACK / REFRESH → leave room
   FIX: beforeunload removes player from Firebase
════════════════════════════════════════ */

window.addEventListener('beforeunload', () => {
  // The onDisconnect().remove() we set on join/create handles this in Firebase.
  // We also try a synchronous removal (best-effort, may not complete).
  if (state.roomRef && state.playerId) {
    try {
      state.roomRef.child(`players/${state.playerId}`).remove();
    } catch(e) { /* ignore */ }
  }
});

/* ─── Re-mark online when tab regains focus ─── */
window.addEventListener('focus', () => {
  if (state.roomRef && state.playerId) {
    state.roomRef.child(`players/${state.playerId}/online`).set(true).catch(() => {});
  }
});
