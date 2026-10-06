const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const cells = Array.from(document.querySelectorAll('.cell'));
const statusText = document.getElementById('statusText');
const modeLabel = document.getElementById('modeLabel');
const menuBtn = document.getElementById('menuBtn');
const restartBtn = document.getElementById('restartBtn');
const newRoundBtn = document.getElementById('newRoundBtn');
const resetScoresBtn = document.getElementById('resetScoresBtn');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreDrawEl = document.getElementById('scoreDraw');
const matchStatusEl = document.getElementById('matchStatus');
const modeButtons = document.querySelectorAll('[data-mode]');
const difficultyButtons = document.querySelectorAll('[data-difficulty]');
const bestOfButtons = document.querySelectorAll('[data-bestof]');
const themeButtons = document.querySelectorAll('[data-theme]');
const toastContainer = document.getElementById('toastContainer');

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const state = {
  board: Array(9).fill(''),
  currentPlayer: 'X',
  gameMode: 'bot',
  difficulty: 'easy',
  bestOf: 3,
  theme: 'dark',
  gameOver: false,
  roundWinner: null,
  scores: { X: 0, O: 0, draw: 0 },
  goal: 2,
};

let audioCtx;

function initAudio() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) {
      audioCtx = new AudioCtor();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function beep(frequency, duration = 0.11, type = 'sine', volume = 0.04) {
  if (!audioCtx) {
    return;
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  oscillator.stop(audioCtx.currentTime + duration);
}

function playMoveSound() {
  beep(440, 0.08, 'triangle', 0.04);
}

function playWinSound() {
  beep(660, 0.14, 'square', 0.05);
  setTimeout(() => beep(880, 0.18, 'triangle', 0.04), 80);
}

function playDrawSound() {
  beep(260, 0.12, 'sawtooth', 0.04);
  setTimeout(() => beep(220, 0.12, 'sawtooth', 0.04), 120);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2200);
}

function updateScoreboard() {
  scoreXEl.textContent = state.scores.X;
  scoreOEl.textContent = state.scores.O;
  scoreDrawEl.textContent = state.scores.draw;

  const bestLabel = state.bestOf === 3 ? 'Best of 3' : 'Best of 5';
  const leader = state.scores.X >= state.goal || state.scores.O >= state.goal
    ? `${state.scores.X >= state.scores.O ? 'X' : 'O'} leads`
    : bestLabel;

  matchStatusEl.textContent = leader;
}

function setTheme(themeName) {
  state.theme = themeName;
  document.body.classList.remove('theme-dark', 'theme-neon', 'theme-retro');
  document.body.classList.add(`theme-${themeName}`);

  themeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === themeName);
  });
}

function showScreen(screen) {
  menuScreen.classList.toggle('active', screen === 'menu');
  gameScreen.classList.toggle('active', screen === 'game');
}

function setGameMode(mode) {
  state.gameMode = mode;
  updateModeLabel();
}

function updateModeLabel() {
  if (state.gameMode === 'bot') {
    modeLabel.textContent = 'Mode: Bot';
  } else if (state.gameMode === 'bot-first') {
    modeLabel.textContent = 'Mode: Bot Starts';
  } else {
    modeLabel.textContent = 'Mode: 2 Players';
  }
}

function getAvailableMoves(boardState) {
  return boardState
    .map((value, index) => (value === '' ? index : null))
    .filter((value) => value !== null);
}

function checkWinner(boardState) {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
      return boardState[a];
    }
  }

  return null;
}

function isBoardFull(boardState) {
  return boardState.every(Boolean);
}

function renderBoard() {
  cells.forEach((cell) => {
    const index = Number(cell.dataset.index);
    const mark = state.board[index];
    const isWinnerCell = state.roundWinner && state.roundWinner.cells.includes(index);

    cell.textContent = mark;
    cell.classList.remove('x', 'o', 'win');

    if (mark) {
      cell.classList.add(mark.toLowerCase());
    }

    if (isWinnerCell) {
      cell.classList.add('win');
    }

    cell.disabled = Boolean(mark) || state.gameOver;
  });
}

function setStatus(message) {
  statusText.textContent = message;
}

function resetBoard({ preserveScores = true } = {}) {
  state.board = Array(9).fill('');
  state.currentPlayer = 'X';
  state.gameOver = false;
  state.roundWinner = null;

  if (!preserveScores) {
    state.scores = { X: 0, O: 0, draw: 0 };
  }

  updateScoreboard();
  renderBoard();
  setStatus("Player X's turn");

  if (state.gameMode === 'bot-first' && state.currentPlayer === 'X' && !state.gameOver) {
    setStatus("Bot starts!");
    setTimeout(() => {
      if (!state.gameOver) {
        botTurn();
      }
    }, 450);
  }
}

function startGame(mode) {
  setGameMode(mode);
  state.goal = Math.ceil(state.bestOf / 2);
  resetBoard({ preserveScores: true });
  showScreen('game');
}

function getLabel(player) {
  if (player === 'X') return 'Player X';
  if (player === 'O') {
    return state.gameMode === 'bot' || state.gameMode === 'bot-first' ? 'Bot' : 'Player O';
  }
  return 'Draw';
}

function showRoundResult(winner, winningCells = []) {
  state.gameOver = true;
  state.roundWinner = winner ? { player: winner, cells: winningCells } : null;
  renderBoard();

  if (winner) {
    state.scores[winner] += 1;
    setStatus(`${getLabel(winner)} wins!`);
    playWinSound();
    if (state.gameMode === 'bot' && winner === 'O') {
      showToast('Bot wins this round!');
    }
    if (state.gameMode === 'bot' && winner === 'X') {
      showToast('Bot destroyed!');
    }
    if (winningCells.includes(4) && winningCells.length === 3) {
      showToast('Lucky 5!');
    }
    updateScoreboard();
  } else {
    state.scores.draw += 1;
    setStatus("It's a draw!");
    playDrawSound();
    showToast('Draw game');
    updateScoreboard();
  }

  if (winner === 'X' && state.gameMode === 'bot' && state.scores.X >= 1) {
    showToast('Perfect win!');
  }

  const matchWinner = state.scores.X >= state.goal ? 'X' : state.scores.O >= state.goal ? 'O' : null;
  if (matchWinner) {
    setStatus(`${matchWinner === 'X' ? 'Player X' : state.gameMode === 'bot' ? 'Bot' : 'Player O'} wins the match!`);
    showToast(`${matchWinner === 'X' ? 'Player X' : state.gameMode === 'bot' ? 'Bot' : 'Player O'} wins the match!`);
  }
}

function finalizeMove(index, player) {
  if (state.board[index] || state.gameOver) {
    return false;
  }

  state.board[index] = player;
  playMoveSound();
  renderBoard();

  const winner = checkWinner(state.board);
  if (winner) {
    const winningLine = WINNING_COMBINATIONS.find(([a, b, c]) => {
      return state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c];
    }) || [];

    showRoundResult(winner, winningLine);
    return true;
  }

  if (isBoardFull(state.board)) {
    showRoundResult(null, []);
    return true;
  }

  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  const nextPlayerLabel = state.currentPlayer === 'X' ? 'Player X' : state.gameMode === 'bot' || state.gameMode === 'bot-first' ? 'Bot' : 'Player O';
  setStatus(`${nextPlayerLabel}'s turn`);
  return true;
}

function evaluateBoard(boardState, aiPlayer, humanPlayer) {
  const winner = checkWinner(boardState);
  if (winner === aiPlayer) return 10;
  if (winner === humanPlayer) return -10;
  if (isBoardFull(boardState)) return 0;
  return null;
}

function minimax(boardState, depth, isMax, aiPlayer, humanPlayer) {
  const evaluation = evaluateBoard(boardState, aiPlayer, humanPlayer);
  if (evaluation !== null) {
    return evaluation - depth * (isMax ? 1 : -1);
  }

  if (isMax) {
    let bestScore = -Infinity;
    for (const move of getAvailableMoves(boardState)) {
      boardState[move] = aiPlayer;
      const score = minimax(boardState, depth + 1, false, aiPlayer, humanPlayer);
      boardState[move] = '';
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (const move of getAvailableMoves(boardState)) {
    boardState[move] = humanPlayer;
    const score = minimax(boardState, depth + 1, true, aiPlayer, humanPlayer);
    boardState[move] = '';
    bestScore = Math.min(bestScore, score);
  }
  return bestScore;
}

function getHardBotMove() {
  const aiPlayer = 'O';
  const humanPlayer = 'X';
  let bestScore = -Infinity;
  let bestMove = null;

  for (const move of getAvailableMoves(state.board)) {
    state.board[move] = aiPlayer;
    const score = minimax(state.board, 0, false, aiPlayer, humanPlayer);
    state.board[move] = '';

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function getBestBotMove() {
  const availableMoves = getAvailableMoves(state.board);
  if (availableMoves.length === 0) return null;

  if (state.difficulty === 'hard') {
    return getHardBotMove();
  }

  if (state.difficulty === 'medium') {
    for (const move of availableMoves) {
      const nextBoard = [...state.board];
      nextBoard[move] = 'O';
      if (checkWinner(nextBoard) === 'O') return move;
    }

    for (const move of availableMoves) {
      const nextBoard = [...state.board];
      nextBoard[move] = 'X';
      if (checkWinner(nextBoard) === 'X') return move;
    }

    if (state.board[4] === '') return 4;

    const corners = [0, 2, 6, 8].filter((index) => state.board[index] === '');
    if (corners.length) {
      return corners[Math.floor(Math.random() * corners.length)];
    }
  }

  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

function botTurn() {
  if (state.gameOver) return;
  if ((state.gameMode !== 'bot' && state.gameMode !== 'bot-first') || state.currentPlayer !== 'O') {
    return;
  }

  const nextMove = getBestBotMove();
  if (nextMove === null || nextMove === undefined) return;

  setTimeout(() => {
    if (!state.gameOver) {
      finalizeMove(nextMove, 'O');
    }
  }, 350);
}

function handleCellClick(event) {
  initAudio();
  const index = Number(event.target.dataset.index);

  if (state.gameOver || state.board[index] || state.currentPlayer === 'O' && (state.gameMode === 'bot' || state.gameMode === 'bot-first')) {
    return;
  }

  finalizeMove(index, state.currentPlayer);

  if (!state.gameOver && (state.gameMode === 'bot' || state.gameMode === 'bot-first') && state.currentPlayer === 'O') {
    botTurn();
  }
}

cells.forEach((cell) => cell.addEventListener('click', handleCellClick));

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedMode = button.dataset.mode;
    startGame(selectedMode);
  });
});

difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.difficulty = button.dataset.difficulty;
    difficultyButtons.forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });
  });
});

bestOfButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.bestOf = Number(button.dataset.bestof);
    state.goal = Math.ceil(state.bestOf / 2);
    bestOfButtons.forEach((btn) => {
      btn.classList.toggle('active', btn === button);
    });
    matchStatusEl.textContent = `Best of ${state.bestOf}`;
  });
});

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setTheme(button.dataset.theme);
  });
});

menuBtn.addEventListener('click', () => {
  initAudio();
  showScreen('menu');
});

restartBtn.addEventListener('click', () => {
  initAudio();
  resetBoard({ preserveScores: true });
  if (state.gameMode === 'bot-first' && state.currentPlayer === 'X') {
    setStatus('Bot starts!');
    setTimeout(() => botTurn(), 350);
  }
});

newRoundBtn.addEventListener('click', () => {
  initAudio();
  if (state.scores.X >= state.goal || state.scores.O >= state.goal) {
    state.scores = { X: 0, O: 0, draw: 0 };
  }
  resetBoard({ preserveScores: true });
  if (state.gameMode === 'bot-first' && state.currentPlayer === 'X') {
    setStatus('Bot starts!');
    setTimeout(() => botTurn(), 350);
  }
});

resetScoresBtn.addEventListener('click', () => {
  initAudio();
  state.scores = { X: 0, O: 0, draw: 0 };
  updateScoreboard();
  resetBoard({ preserveScores: false });
});

setTheme('dark');
updateScoreboard();
updateModeLabel();
showScreen('menu');
