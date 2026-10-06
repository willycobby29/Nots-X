const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const boardEl = document.getElementById('board');
const cells = Array.from(document.querySelectorAll('.cell'));
const statusText = document.getElementById('statusText');
const modeLabel = document.getElementById('modeLabel');
const menuBtn = document.getElementById('menuBtn');
const restartBtn = document.getElementById('restartBtn');
const modeButtons = document.querySelectorAll('[data-mode]');
const difficultyButtons = document.querySelectorAll('[data-difficulty]');

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

let board = Array(9).fill('');
let currentPlayer = 'X';
let gameMode = 'bot';
let difficulty = 'easy';
let gameOver = false;
let botMark = 'O';

function showScreen(screen) {
  menuScreen.classList.toggle('active', screen === 'menu');
  gameScreen.classList.toggle('active', screen === 'game');
}

function updateModeLabel() {
  modeLabel.textContent = gameMode === 'bot' ? 'Mode: Bot' : 'Mode: 2 Players';
}

function resetBoard() {
  board = Array(9).fill('');
  currentPlayer = 'X';
  gameOver = false;

  cells.forEach((cell) => {
    cell.textContent = '';
    cell.classList.remove('x', 'o');
    cell.disabled = false;
  });

  statusText.textContent = "Player X's turn";
}

function startGame(mode) {
  gameMode = mode;
  updateModeLabel();
  resetBoard();
  showScreen('game');
}

function getAvailableMoves() {
  return board
    .map((value, index) => (value === '' ? index : null))
    .filter((value) => value !== null);
}

function checkWinner(boardState) {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (
      boardState[a] &&
      boardState[a] === boardState[b] &&
      boardState[a] === boardState[c]
    ) {
      return boardState[a];
    }
  }

  return null;
}

function isDraw(boardState) {
  return boardState.every(Boolean);
}

function finishGame(winner) {
  gameOver = true;

  if (winner) {
    statusText.textContent = winner === 'X' ? 'Player X wins!' : winner === 'O' ? 'Player O wins!' : 'Bot wins!';
    return;
  }

  statusText.textContent = "It's a draw!";
}

function takeMove(index, player) {
  if (board[index] || gameOver) {
    return false;
  }

  board[index] = player;
  const cell = cells[index];
  cell.textContent = player;
  cell.classList.add(player.toLowerCase());
  cell.disabled = true;

  const winner = checkWinner(board);
  if (winner) {
    finishGame(winner);
    return true;
  }

  if (isDraw(board)) {
    finishGame(null);
    return true;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  statusText.textContent = currentPlayer === 'X' ? "Player X's turn" : gameMode === 'bot' ? "Bot's turn" : "Player O's turn";
  return true;
}

function getBestMove() {
  const availableMoves = getAvailableMoves();

  if (availableMoves.length === 0) {
    return null;
  }

  // Medium difficulty: win/block/center/corner strategy
  if (difficulty === 'medium') {
    for (const move of availableMoves) {
      const nextBoard = [...board];
      nextBoard[move] = 'O';
      if (checkWinner(nextBoard) === 'O') {
        return move;
      }
    }

    for (const move of availableMoves) {
      const nextBoard = [...board];
      nextBoard[move] = 'X';
      if (checkWinner(nextBoard) === 'X') {
        return move;
      }
    }

    if (board[4] === '') {
      return 4;
    }

    const corners = [0, 2, 6, 8].filter((index) => board[index] === '');
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }
  }

  // Easy difficulty: random legal move
  const randomIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
  return randomIndex;
}

function botTurn() {
  if (gameMode !== 'bot' || currentPlayer !== 'O' || gameOver) {
    return;
  }

  const moveIndex = getBestMove();
  if (moveIndex === null || moveIndex === undefined) {
    return;
  }

  setTimeout(() => {
    takeMove(moveIndex, 'O');
  }, 350);
}

function handleCellClick(event) {
  if (gameOver) {
    return;
  }

  const index = Number(event.target.dataset.index);

  if (gameMode === 'bot' && currentPlayer === 'O') {
    return;
  }

  if (!takeMove(index, currentPlayer)) {
    return;
  }

  if (!gameOver && gameMode === 'bot' && currentPlayer === 'O') {
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
    difficulty = button.dataset.difficulty;

    difficultyButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
  });
});

menuBtn.addEventListener('click', () => {
  showScreen('menu');
});

restartBtn.addEventListener('click', () => {
  resetBoard();
  if (gameMode === 'bot' && currentPlayer === 'O') {
    botTurn();
  }
});

showScreen('menu');
updateModeLabel();
