// ================================================================
// IMPOSTER — script.js
// Full multiplayer game logic using Firebase Realtime Database
// All game data stored under imposter/ path
// ================================================================

/* ─── State ─── */
const state = {
  playerId:    null,   // This client's unique ID
  roomCode:    null,   // Current room code
  nickname:    null,   // This player's nickname
  isHost:      false,  // Is this player the host?
  roomRef:     null,   // Firebase ref to room
  listeners:   [],     // Active Firebase listeners to detach on leave
  timerSecs:   120,    // Configurable timer
  localTimer:  null,   // setInterval handle
  voted:       false,  // Has this player voted this round?
  roleRevealed:false,  // Has player flipped the card?
  confirmedRole: false,// Has player confirmed they saw the role?
  currentWord: null,   // Set only for this player's session (never stored globally)
};

/* ─── Avatar color palette ─── */
const AV_COLORS = ['av-0','av-1','av-2','av-3','av-4','av-5','av-6','av-7','av-8','av-9'];

/* ═══════════════════════════════════════════════════════
   UTILITY
═══════════════════════════════════════════════════════ */

function randId(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function showToast(msg) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 1300);
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function avatarClass(index) {
  return AV_COLORS[index % AV_COLORS.length];
}

function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

/* ─── Screen navigation ─── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + id);
  if (target) target.classList.add('active');
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

/* ─── Timer utilities ─── */
function stopLocalTimer() {
  if (state.localTimer) { clearInterval(state.localTimer); state.localTimer = null; }
}

/* ═══════════════════════════════════════════════════════
   TABS & HOME UI
═══════════════════════════════════════════════════════ */

function switchTab(tab) {
  document.getElementById('tab-create').classList.toggle('active', tab === 'create');
  document.getElementById('tab-join').classList.toggle('active', tab === 'join');
  document.getElementById('panel-create').classList.toggle('active', tab === 'create');
  document.getElementById('panel-join').classList.toggle('active', tab === 'join');
}

/* ═══════════════════════════════════════════════════════
   ROOM CREATION
═══════════════════════════════════════════════════════ */

async function createRoom() {
  clearError('home-error');
  const nick = document.getElementById('home-nickname').value.trim();
  if (!nick) { setError('home-error', 'Please enter a nickname.'); return; }
  if (nick.length < 2) { setError('home-error', 'Nickname must be at least 2 characters.'); return; }

  const code = genRoomCode();
  const playerId = randId(10);
  state.playerId = playerId;
  state.nickname = nick;
  state.roomCode = code;
  state.isHost   = true;

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
    const roomRef = database.ref(`imposter/rooms/${code}`);
    await roomRef.set(roomData);

    // On disconnect: mark player offline
    roomRef.child(`players/${playerId}/online`).onDisconnect().set(false);

    state.roomRef = roomRef;
    enterLobby();
  } catch (err) {
    console.error(err);
    setError('home-error', 'Failed to create room. Try again.');
  }
}

/* ═══════════════════════════════════════════════════════
   ROOM JOINING
═══════════════════════════════════════════════════════ */

async function joinRoom() {
  clearError('home-error');
  const nick = document.getElementById('home-nickname').value.trim();
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (!nick) { setError('home-error', 'Please enter a nickname.'); return; }
  if (!code || code.length !== 6) { setError('home-error', 'Please enter a valid 6-character room code.'); return; }

  try {
    const roomRef = database.ref(`imposter/rooms/${code}`);
    const snap = await roomRef.once('value');
    if (!snap.exists()) { setError('home-error', 'Room not found. Check the code.'); return; }

    const room = snap.val();
    if (room.phase !== 'lobby') { setError('home-error', 'Game already started in this room.'); return; }

    const players = room.players || {};
    const playerCount = Object.keys(players).length;
    if (playerCount >= 10) { setError('home-error', 'Room is full (max 10 players).'); return; }

    // Check duplicate nickname
    const nameTaken = Object.values(players).some(p => p.nickname.toLowerCase() === nick.toLowerCase());
    if (nameTaken) { setError('home-error', 'That nickname is taken in this room.'); return; }

    const playerId = randId(10);
    state.playerId = playerId;
    state.nickname = nick;
    state.roomCode = code;
    state.isHost   = false;
    state.timerSecs = room.timerSecs || 120;
    state.roomRef  = roomRef;

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

    roomRef.child(`players/${playerId}/online`).onDisconnect().set(false);
    enterLobby();
  } catch (err) {
    console.error(err);
    setError('home-error', 'Failed to join room. Try again.');
  }
}

/* ═══════════════════════════════════════════════════════
   LOBBY
═══════════════════════════════════════════════════════ */

function enterLobby() {
  showScreen('lobby');
  document.getElementById('lobby-code').textContent = state.roomCode;
  if (state.isHost) {
    document.getElementById('host-settings').classList.add('visible');
  }
  updateTimerDisplay();
  listenLobby();
}

function listenLobby() {
  const roomRef = state.roomRef;

  // Watch players
  onRef(roomRef.child('players'), 'value', snap => {
    const players = snap.val() || {};
    renderPlayerList(players);
    updateLobbyActions(players);
  });

  // Watch phase changes (host started game)
  onRef(roomRef.child('phase'), 'value', snap => {
    const phase = snap.val();
    if (phase === 'reveal') {
      detachAll();
      fetchRoleAndReveal();
    }
  });

  // Watch host changes
  onRef(roomRef.child('host'), 'value', snap => {
    state.isHost = snap.val() === state.playerId;
    updateLobbyHostUI();
  });

  // Watch timerSecs
  onRef(roomRef.child('timerSecs'), 'value', snap => {
    if (snap.val()) {
      state.timerSecs = snap.val();
      updateTimerDisplay();
    }
  });
}

function renderPlayerList(players) {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  const arr = Object.values(players).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  arr.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'player-list-item';
    const isYou = p.id === state.playerId;
    const avClass = avatarClass(p.avIndex !== undefined ? p.avIndex : i);
    const badges = [];
    if (p.isHost) badges.push('<span class="player-badge badge-host">HOST</span>');
    if (isYou)   badges.push('<span class="player-badge badge-you">YOU</span>');
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
  const arr = Object.values(players);
  const total = arr.length;
  const readyCount = arr.filter(p => p.ready || p.isHost).length;
  const allReady = total >= 2 && readyCount === total;

  const me = players[state.playerId];
  const btnReady = document.getElementById('btn-ready');
  const btnStart = document.getElementById('btn-start');

  if (me) {
    if (me.isHost) {
      btnReady.classList.add('hidden');
    } else {
      btnReady.classList.remove('hidden');
      if (me.ready) {
        btnReady.textContent = '✓ Ready (click to unready)';
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
      document.getElementById('lobby-waiting').classList.add('hidden');
    } else {
      btnStart.classList.add('hidden');
      document.getElementById('lobby-waiting').classList.remove('hidden');
      document.getElementById('lobby-waiting').textContent =
        `Waiting for ${total - readyCount} more player(s) to get ready…`;
    }
  } else {
    btnStart.classList.add('hidden');
    if (allReady) {
      document.getElementById('lobby-waiting').textContent = 'All ready! Waiting for host to start…';
    }
  }
}

function updateLobbyHostUI() {
  if (state.isHost) {
    document.getElementById('host-settings').classList.add('visible');
  }
}

async function toggleReady() {
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

  const snap = await state.roomRef.child('players').once('value');
  const players = snap.val() || {};
  const playerIds = Object.keys(players);

  if (playerIds.length < 2) {
    showToast('Need at least 2 players!');
    return;
  }

  // Pick random word
  const wordObj = WORDS[Math.floor(Math.random() * WORDS.length)];

  // Pick random imposter
  const imposterId = playerIds[Math.floor(Math.random() * playerIds.length)];

  // Store game state in Firebase
  // IMPORTANT: We store the word here so non-imposters can read it.
  // The imposter's ID is stored so we know who NOT to show the word to.
  // Firebase rules restrict reading word/imposter info.
  await state.roomRef.update({
    phase:      'reveal',
    word:       wordObj.word,
    wordImage:  wordObj.image,
    category:   wordObj.category,
    imposter:   imposterId,
    startedAt:  firebase.database.ServerValue.TIMESTAMP,
    votes:      null,
    roleConfirmed: null,
    finalGuess: null,
  });
}

/* ═══════════════════════════════════════════════════════
   ROLE REVEAL
═══════════════════════════════════════════════════════ */

async function fetchRoleAndReveal() {
  const snap = await state.roomRef.once('value');
  const room = snap.val();

  const isImposter = room.imposter === state.playerId;
  const word       = room.word;
  const wordImage  = room.wordImage;

  state.currentWord = word;
  state.roleRevealed  = false;
  state.confirmedRole = false;
  state.voted = false;

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
      <img class="role-image" src="${escapeHtml(wordImage)}" alt="${escapeHtml(word)}" />
      <p class="imposter-sub" style="font-size:.78rem;margin-top:4px;">Do not show anyone!</p>
    `;
  }

  showScreen('reveal');

  // Tap-to-flip
  document.getElementById('reveal-card').onclick = () => {
    if (!state.roleRevealed) {
      document.getElementById('reveal-card-inner').classList.add('flipped');
      state.roleRevealed = true;
      setTimeout(() => {
        document.getElementById('btn-saw-word').classList.remove('hidden');
      }, 700);
    }
  };

  // Listen for all confirmed → move to discussion
  listenRoleConfirm();
}

function listenRoleConfirm() {
  onRef(state.roomRef.child('roleConfirmed'), 'value', snap => {
    const confirmed = snap.val() || {};
    // Check if all players confirmed
    state.roomRef.child('players').once('value', psnap => {
      const players = psnap.val() || {};
      const total = Object.keys(players).length;
      const doneCount = Object.keys(confirmed).length;
      if (doneCount >= total) {
        detachAll();
        startDiscussion();
      }
    });
  });

  // Also watch phase in case host force-moves
  onRef(state.roomRef.child('phase'), 'value', snap => {
    const phase = snap.val();
    if (phase === 'discussion') { detachAll(); startDiscussion(); }
    if (phase === 'voting')     { detachAll(); enterVoting(); }
  });
}

async function confirmSawRole() {
  document.getElementById('btn-saw-word').classList.add('hidden');
  document.getElementById('reveal-waiting').classList.remove('hidden');
  state.confirmedRole = true;

  await state.roomRef.child(`roleConfirmed/${state.playerId}`).set(true);

  // Also trigger host to check if all confirmed
  if (state.isHost) {
    const [confirmSnap, playerSnap] = await Promise.all([
      state.roomRef.child('roleConfirmed').once('value'),
      state.roomRef.child('players').once('value'),
    ]);
    const confirmed = confirmSnap.val() || {};
    const players   = playerSnap.val() || {};
    if (Object.keys(confirmed).length >= Object.keys(players).length) {
      await state.roomRef.child('phase').set('discussion');
    }
  }
}

/* ═══════════════════════════════════════════════════════
   DISCUSSION
═══════════════════════════════════════════════════════ */

async function startDiscussion() {
  const snap = await state.roomRef.once('value');
  const room  = snap.val();

  await state.roomRef.update({
    phase:       'discussion',
    timerStart:  firebase.database.ServerValue.TIMESTAMP,
    timerSecs:   room.timerSecs || state.timerSecs,
  });

  enterDiscussion(room);
}

async function enterDiscussion(room) {
  if (!room) {
    const snap = await state.roomRef.once('value');
    room = snap.val();
  }
  showScreen('discussion');
  state.timerSecs = room.timerSecs || 120;

  // Render player list
  const players = room.players || {};
  const pList = document.getElementById('discussion-player-list');
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

  // Only show skip button to host
  const btnSkip = document.getElementById('btn-skip-timer');
  if (state.isHost) {
    btnSkip.classList.remove('hidden');
  } else {
    btnSkip.classList.add('hidden');
  }

  // Get server timerStart
  const timerStartSnap = await state.roomRef.child('timerStart').once('value');
  const timerStart = timerStartSnap.val() || Date.now();

  runDiscussionTimer(timerStart, state.timerSecs);

  // Listen for phase change
  onRef(state.roomRef.child('phase'), 'value', snap => {
    if (snap.val() === 'voting') {
      stopLocalTimer();
      detachAll();
      enterVoting();
    }
  });
}

function runDiscussionTimer(timerStart, totalSecs) {
  const circumference = 2 * Math.PI * 54; // r=54
  const ring = document.getElementById('timer-ring-fg');
  const numEl = document.getElementById('timer-seconds');

  stopLocalTimer();
  state.localTimer = setInterval(async () => {
    const elapsed = (Date.now() - timerStart) / 1000;
    const remaining = Math.max(0, totalSecs - elapsed);
    const secs = Math.ceil(remaining);

    numEl.textContent = secs;

    const frac = remaining / totalSecs;
    ring.style.strokeDashoffset = circumference * (1 - frac);

    // Color shift as time runs low
    if (secs <= 30)       ring.style.stroke = 'var(--coral)';
    else if (secs <= 60)  ring.style.stroke = 'var(--gold)';
    else                  ring.style.stroke = 'var(--violet)';

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

/* ═══════════════════════════════════════════════════════
   VOTING
═══════════════════════════════════════════════════════ */

async function enterVoting() {
  showScreen('voting');
  state.voted = false;

  document.getElementById('vote-cast-msg').classList.add('hidden');
  document.getElementById('voting-waiting').classList.add('hidden');

  const snap = await state.roomRef.once('value');
  const room = snap.val();
  const players = room.players || {};

  renderVotingList(players);
  listenVotes(players);
}

function renderVotingList(players) {
  const list = document.getElementById('voting-list');
  list.innerHTML = '';

  Object.values(players).forEach((p, i) => {
    if (p.id === state.playerId) return; // Can't vote for yourself
    const li = document.createElement('li');
    li.className = 'voting-item';
    li.id = `vote-item-${p.id}`;
    li.innerHTML = `
      <div class="player-avatar ${avatarClass(p.avIndex !== undefined ? p.avIndex : i)}">${initials(p.nickname)}</div>
      <span class="vote-name">${escapeHtml(p.nickname)}</span>
      <span class="vote-arrow">→</span>
    `;
    li.onclick = () => castVote(p.id, li);
    list.appendChild(li);
  });
}

async function castVote(targetId, li) {
  if (state.voted) return;
  state.voted = true;

  // Visual feedback
  document.querySelectorAll('.voting-item').forEach(el => {
    el.onclick = null;
    el.classList.remove('voted');
    el.querySelector('.vote-arrow').style.display = 'none';
  });
  li.classList.add('voted');
  li.innerHTML = li.innerHTML.replace(
    '<span class="vote-arrow">→</span>',
    '<span class="vote-check">✓</span>'
  );

  document.getElementById('vote-cast-msg').classList.remove('hidden');
  document.getElementById('voting-waiting').classList.remove('hidden');

  await state.roomRef.child(`votes/${state.playerId}`).set(targetId);
}

function listenVotes(players) {
  onRef(state.roomRef.child('votes'), 'value', async snap => {
    const votes = snap.val() || {};
    const voteCount = Object.keys(votes).length;
    const totalVoters = Object.keys(players).length; // everyone votes

    if (voteCount >= totalVoters) {
      detachAll();
      stopLocalTimer();
      if (state.isHost) {
        await state.roomRef.child('phase').set('results');
      }
      processResults(players, votes);
    }
  });

  onRef(state.roomRef.child('phase'), 'value', snap => {
    const phase = snap.val();
    if (phase === 'finalguess' || phase === 'results') {
      detachAll();
    }
  });
}

/* ═══════════════════════════════════════════════════════
   RESULTS + FINAL GUESS
═══════════════════════════════════════════════════════ */

async function processResults(players, votes) {
  // Count votes
  const tally = {};
  Object.values(votes).forEach(targetId => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  // Find most voted
  let maxVotes = 0;
  let votedOutId = null;
  Object.entries(tally).forEach(([id, count]) => {
    if (count > maxVotes) { maxVotes = count; votedOutId = id; }
  });

  const snap = await state.roomRef.once('value');
  const room  = snap.val();
  const imposterId = room.imposter;

  if (votedOutId === imposterId) {
    // Imposter was caught — give final guess
    if (state.isHost) {
      await state.roomRef.child('phase').set('finalguess');
    }
    enterFinalGuess(imposterId, room, tally, players);
  } else {
    // Imposter safe — imposter wins
    showResults(room, tally, players, false, null);
  }
}

function enterFinalGuess(imposterId, room, tally, players) {
  showScreen('final-guess');
  const isImposter = state.playerId === imposterId;

  if (isImposter) {
    document.getElementById('final-guess-input').classList.remove('hidden');
    document.querySelector('.final-guess-content .btn').classList.remove('hidden');
    document.getElementById('final-guess-waiting').classList.add('hidden');
  } else {
    document.getElementById('final-guess-input').classList.add('hidden');
    document.querySelector('.final-guess-content .btn').classList.add('hidden');
    document.getElementById('final-guess-waiting').classList.remove('hidden');
    document.getElementById('final-guess-waiting').textContent = 'Waiting for imposter\'s guess…';
  }

  // Listen for final guess result
  onRef(state.roomRef.child('finalGuess'), 'value', snap => {
    const guess = snap.val();
    if (guess !== null && guess !== undefined) {
      detachAll();
      const correct = guess.toLowerCase().trim() === room.word.toLowerCase().trim();
      showResults(room, tally, players, correct ? 'imposter' : 'players', guess);
    }
  });

  // Timeout for final guess (30s)
  if (state.isHost) {
    setTimeout(async () => {
      const gSnap = await state.roomRef.child('finalGuess').once('value');
      if (gSnap.val() === null || gSnap.val() === undefined) {
        await state.roomRef.child('finalGuess').set('__timeout__');
      }
    }, 30000);
  }
}

async function submitFinalGuess() {
  const guess = document.getElementById('final-guess-input').value.trim();
  if (!guess) { showToast('Type your guess!'); return; }
  await state.roomRef.child('finalGuess').set(guess);
}

function showResults(room, tally, players, winner, finalGuess) {
  showScreen('results');

  // Banner
  const banner = document.getElementById('result-banner');
  const headline = document.getElementById('result-headline');
  const resultSub = document.getElementById('result-sub');
  const emoji = document.getElementById('result-emoji');

  let winnerText;
  if (winner === 'imposter') {
    banner.className = 'result-banner imposter-wins';
    emoji.textContent = '🎭';
    headline.textContent = 'Imposter Wins!';
    headline.style.color = 'var(--coral)';
    resultSub.textContent = `Correct guess: "${finalGuess}"`;
    winnerText = 'imposter';
  } else if (winner === 'players') {
    banner.className = 'result-banner players-win';
    emoji.textContent = '🎉';
    headline.textContent = 'Players Win!';
    headline.style.color = 'var(--violet-lite)';
    if (finalGuess === '__timeout__') {
      resultSub.textContent = 'Imposter ran out of time to guess!';
    } else if (finalGuess) {
      resultSub.textContent = `Imposter guessed "${finalGuess}" — wrong!`;
    } else {
      resultSub.textContent = 'The imposter was caught!';
    }
    winnerText = 'players';
  } else {
    // Imposter not voted out
    banner.className = 'result-banner imposter-wins';
    emoji.textContent = '🎭';
    headline.textContent = 'Imposter Escapes!';
    headline.style.color = 'var(--coral)';
    resultSub.textContent = 'The wrong person was voted out.';
    winnerText = 'imposter';
  }

  // Word reveal
  document.getElementById('result-word').textContent = room.word || '';
  const imgEl = document.getElementById('result-image');
  imgEl.src = room.wordImage || '';
  imgEl.alt = room.word || '';

  // Imposter name
  const imposterPlayer = players[room.imposter];
  document.getElementById('result-imposter-name').textContent =
    imposterPlayer ? escapeHtml(imposterPlayer.nickname) : 'Unknown';

  // Votes breakdown
  const votesList = document.getElementById('result-votes-list');
  votesList.innerHTML = '';
  const playerArr = Object.values(players).sort((a, b) => {
    return (tally[b.id] || 0) - (tally[a.id] || 0);
  });
  const maxV = Math.max(...playerArr.map(p => tally[p.id] || 0), 1);

  playerArr.forEach((p, i) => {
    const vCount = tally[p.id] || 0;
    const isImposter = p.id === room.imposter;
    const li = document.createElement('li');
    li.className = `votes-list-item${isImposter ? ' was-imposter' : ''}`;
    li.innerHTML = `
      <div class="player-avatar ${avatarClass(p.avIndex !== undefined ? p.avIndex : i)}" style="width:28px;height:28px;font-size:.75rem;">${initials(p.nickname)}</div>
      <span style="font-size:.9rem;font-weight:600;min-width:80px">${escapeHtml(p.nickname)}${isImposter ? ' 🎭' : ''}</span>
      <div class="votes-bar-wrap">
        <div class="votes-bar${isImposter ? ' imposter-bar' : ''}" style="width:${(vCount/maxV)*100}%"></div>
      </div>
      <span class="votes-count">${vCount}</span>
    `;
    votesList.appendChild(li);
  });
}

/* ═══════════════════════════════════════════════════════
   PLAY AGAIN / LEAVE
═══════════════════════════════════════════════════════ */

async function playAgain() {
  if (!state.isHost) { showToast('Only the host can start a new round!'); return; }

  // Reset game state but keep players
  const snap = await state.roomRef.child('players').once('value');
  const players = snap.val() || {};

  // Reset ready status
  const updates = {};
  Object.keys(players).forEach(pid => {
    updates[`players/${pid}/ready`] = false;
  });
  updates.phase       = 'lobby';
  updates.word        = null;
  updates.wordImage   = null;
  updates.category    = null;
  updates.imposter    = null;
  updates.votes       = null;
  updates.roleConfirmed = null;
  updates.finalGuess  = null;
  updates.timerStart  = null;

  await state.roomRef.update(updates);

  state.voted = false;
  state.roleRevealed = false;
  state.confirmedRole = false;
  state.currentWord = null;
  stopLocalTimer();

  enterLobby();
}

async function leaveRoom() {
  detachAll();
  stopLocalTimer();

  if (state.roomRef && state.playerId) {
    try {
      // Transfer host if needed
      if (state.isHost) {
        const snap = await state.roomRef.child('players').once('value');
        const players = snap.val() || {};
        const otherIds = Object.keys(players).filter(id => id !== state.playerId);
        if (otherIds.length > 0) {
          const newHostId = otherIds[0];
          await state.roomRef.update({
            host: newHostId,
            [`players/${newHostId}/isHost`]: true,
          });
        } else {
          // No one left, delete room
          await state.roomRef.remove();
        }
      }
      await state.roomRef.child(`players/${state.playerId}`).remove();
    } catch (e) {
      // Best effort
    }
  }

  state.playerId = null;
  state.roomCode = null;
  state.nickname = null;
  state.isHost   = false;
  state.roomRef  = null;
  state.currentWord = null;
  state.voted = false;

  showScreen('home');
}

/* ═══════════════════════════════════════════════════════
   COPY ROOM CODE
═══════════════════════════════════════════════════════ */

function copyRoomCode() {
  if (!state.roomCode) return;
  navigator.clipboard.writeText(state.roomCode).then(() => {
    document.getElementById('copy-icon').textContent = '✓';
    showToast('Room code copied!');
    setTimeout(() => {
      const el = document.getElementById('copy-icon');
      if (el) el.textContent = '⧉';
    }, 2000);
  }).catch(() => {
    showToast(state.roomCode);
  });
}

/* ═══════════════════════════════════════════════════════
   SECURITY HELPER
═══════════════════════════════════════════════════════ */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ═══════════════════════════════════════════════════════
   INPUT HELPERS
═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Auto-uppercase join code
  const joinCode = document.getElementById('join-code');
  if (joinCode) {
    joinCode.addEventListener('input', () => {
      joinCode.value = joinCode.value.toUpperCase();
    });
    joinCode.addEventListener('keydown', e => {
      if (e.key === 'Enter') joinRoom();
    });
  }

  const nickInput = document.getElementById('home-nickname');
  if (nickInput) {
    nickInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const tab = document.getElementById('tab-join').classList.contains('active');
        tab ? joinRoom() : createRoom();
      }
    });
  }

  const guessInput = document.getElementById('final-guess-input');
  if (guessInput) {
    guessInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitFinalGuess();
    });
  }

  // Hide loading screen, show home
  setTimeout(() => {
    showScreen('home');
  }, 1200);
});

/* ─── Reconnection: if player returns and room exists, try to re-enter ─── */
window.addEventListener('focus', async () => {
  if (state.roomRef && state.playerId) {
    try {
      await state.roomRef.child(`players/${state.playerId}/online`).set(true);
    } catch (e) { /* ignore */ }
  }
});
