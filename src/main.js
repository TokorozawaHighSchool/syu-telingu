
// ぷよぷよ新規実装
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('startButton');

const COLS = 6;
const ROWS = 12;
const PUYO_SIZE = 40;
const COLORS = ['red', 'blue', 'green', 'yellow'];
let board = [];
let currentPuyo = null;
let nextPuyo = null;
let score = 0;
let chainCount = 0;
let gameInterval = null;
let isGameOver = false;

function resetBoard() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawPuyo(c, r, board[r][c]);
            }
        }
    }
}

function drawPuyo(x, y, color) {
    ctx.beginPath();
    ctx.arc(x * PUYO_SIZE + PUYO_SIZE/2, y * PUYO_SIZE + PUYO_SIZE/2, PUYO_SIZE/2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.stroke();
}

function drawCurrentPuyo() {
    if (!currentPuyo) return;
    for (let i = 0; i < 2; i++) {
        drawPuyo(currentPuyo.x + (i === 1 ? currentPuyo.dx : 0), currentPuyo.y + (i === 1 ? currentPuyo.dy : 0), currentPuyo.colors[i]);
    }
}

function randomPuyo() {
    return {
        x: Math.floor(COLS / 2),
        y: 0,
        dx: 0,
        dy: 1,
        colors: [COLORS[Math.floor(Math.random()*COLORS.length)], COLORS[Math.floor(Math.random()*COLORS.length)]],
    };
}

function collide(puyo, dx = 0, dy = 0) {
    for (let i = 0; i < 2; i++) {
        let nx = puyo.x + (i === 1 ? puyo.dx : 0) + dx;
        let ny = puyo.y + (i === 1 ? puyo.dy : 0) + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
    }
    return false;
}

function mergePuyo(puyo) {
    for (let i = 0; i < 2; i++) {
        let nx = puyo.x + (i === 1 ? puyo.dx : 0);
        let ny = puyo.y + (i === 1 ? puyo.dy : 0);
        if (ny >= 0) board[ny][nx] = puyo.colors[i];
    }
}

function dropPuyo() {
    if (!currentPuyo || isGameOver) return;
    if (!collide(currentPuyo, 0, 1)) {
        currentPuyo.y++;
    } else {
        mergePuyo(currentPuyo);
        chainCount = 0;
        let totalErased = 0;
        let chainBonus = 1;
        let erased;
        do {
            erased = erasePuyos();
            if (erased > 0) {
                chainCount++;
                totalErased += erased;
                score += erased * 100 * chainBonus;
                chainBonus *= 2;
                scoreElement.textContent = `スコア: ${score}　連鎖: ${chainCount}`;
                fallPuyos();
                showChainEffect(chainCount);
            }
        } while (erased > 0);
        if (chainCount === 0) scoreElement.textContent = `スコア: ${score}`;
        currentPuyo = nextPuyo;
        nextPuyo = randomPuyo();
        if (collide(currentPuyo)) {
            isGameOver = true;
            clearInterval(gameInterval);
            alert('ゲームオーバー!');
        }
    }
    render();
}
function showChainEffect(chain) {
    if (chain < 2) return;
    const effect = document.createElement('div');
    effect.textContent = `${chain}連鎖!`;
    effect.style.position = 'absolute';
    effect.style.left = canvas.offsetLeft + canvas.width/2 - 40 + 'px';
    effect.style.top = canvas.offsetTop + 40 + 'px';
    effect.style.fontSize = '2em';
    effect.style.color = 'gold';
    effect.style.fontWeight = 'bold';
    effect.style.textShadow = '2px 2px 8px #333';
    effect.style.pointerEvents = 'none';
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 700);
}

function erasePuyos() {
    let erased = 0;
    let visited = Array.from({length: ROWS}, () => Array(COLS).fill(false));
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] && !visited[r][c]) {
                let group = [];
                dfs(r, c, board[r][c], visited, group);
                if (group.length >= 4) {
                    group.forEach(([y, x]) => { board[y][x] = null; erased++; });
                }
            }
        }
    }
    return erased;
}

function dfs(r, c, color, visited, group) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (visited[r][c] || board[r][c] !== color) return;
    visited[r][c] = true;
    group.push([r, c]);
    dfs(r+1, c, color, visited, group);
    dfs(r-1, c, color, visited, group);
    dfs(r, c+1, color, visited, group);
    dfs(r, c-1, color, visited, group);
}

function fallPuyos() {
    for (let c = 0; c < COLS; c++) {
        for (let r = ROWS-1; r >= 0; r--) {
            if (!board[r][c]) {
                for (let k = r-1; k >= 0; k--) {
                    if (board[k][c]) {
                        board[r][c] = board[k][c];
                        board[k][c] = null;
                        break;
                    }
                }
            }
        }
    }
}

function render() {
    drawBoard();
    drawCurrentPuyo();
}

function movePuyo(dx) {
    let test = {...currentPuyo, x: currentPuyo.x + dx};
    if (!collide(test)) {
        currentPuyo.x += dx;
        render();
    }
}

function rotatePuyo() {
    // 90度回転（縦→横、横→縦）
    let newDx = currentPuyo.dy;
    let newDy = -currentPuyo.dx;
    let test = {...currentPuyo, dx: newDx, dy: newDy};
    if (!collide(test)) {
        currentPuyo.dx = newDx;
        currentPuyo.dy = newDy;
        render();
    }
}

function startGame() {
    resetBoard();
    score = 0;
    scoreElement.textContent = 'スコア: 0';
    isGameOver = false;
    currentPuyo = randomPuyo();
    nextPuyo = randomPuyo();
    render();
    clearInterval(gameInterval);
    gameInterval = setInterval(dropPuyo, 500);
}

window.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    switch (e.key) {
        case 'ArrowLeft':
            movePuyo(-1);
            break;
        case 'ArrowRight':
            movePuyo(1);
            break;
        case 'ArrowDown':
            dropPuyo();
            break;
        case 'ArrowUp':
            rotatePuyo();
            break;
    }
});

startButton.addEventListener('click', startGame);