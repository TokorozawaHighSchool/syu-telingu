
// 新しい縦スクロールシューティングゲーム
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const PLAYER_SIZE = 20;
const PLAYER_SPEED = 5;
const BULLET_SIZE = 6;
const BULLET_SPEED = 10;
const ENEMY_SIZE = 28;
const ENEMY_SPEED = 2.5;

let player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height - 60,
    size: PLAYER_SIZE,
    shootCooldown: 0
};
let bullets = [];
let enemies = [];
let keys = {};
let score = 0;
let gameOver = false;

function drawBackground() {
    // 紫→青のグラデーション
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#8e24aa');
    grad.addColorStop(1, '#1976d2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 60; i++) {
        ctx.save();
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillStyle = 'white';
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawPlayer() {
    ctx.save();
    ctx.fillStyle = 'deepskyblue';
    ctx.beginPath();
    ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawBullets() {
    ctx.save();
    ctx.fillStyle = 'white';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x + BULLET_SIZE / 2, bullet.y + BULLET_SIZE / 2, BULLET_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawEnemies() {
    ctx.save();
    ctx.fillStyle = 'crimson';
    enemies.forEach(enemy => {
        ctx.beginPath();
        ctx.arc(enemy.x + ENEMY_SIZE / 2, enemy.y + ENEMY_SIZE / 2, ENEMY_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.font = '20px Meiryo, Arial';
    ctx.fillStyle = 'gold';
    ctx.fillText('Score: ' + score, 16, 32);
    ctx.restore();
}

function drawGameOver() {
    ctx.save();
    ctx.font = '40px Meiryo, Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
    ctx.restore();
}

    if (keys['arrowleft'] && player.x > 0) player.x -= PLAYER_SPEED;
    if (keys['arrowright'] && player.x < canvas.width - player.size) player.x += PLAYER_SPEED;
    if (keys['arrowup'] && player.y > 0) player.y -= PLAYER_SPEED;
    if (keys['arrowdown'] && player.y < canvas.height - player.size) player.y += PLAYER_SPEED;
}

function shootBullet() {
    if (keys['z']) {
        if (player.shootCooldown <= 0) {
            bullets.push({ x: player.x + player.size / 2 - BULLET_SIZE / 2, y: player.y, size: BULLET_SIZE });
            player.shootCooldown = 8;
        }
    }
    if (player.shootCooldown > 0) player.shootCooldown--;
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= BULLET_SPEED;
        if (bullets[i].y < -BULLET_SIZE) bullets.splice(i, 1);
    }
}

function spawnEnemy() {
    const x = Math.random() * (canvas.width - ENEMY_SIZE);
    enemies.push({ x, y: -ENEMY_SIZE, size: ENEMY_SIZE });
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += ENEMY_SPEED;
        if (enemies[i].y > canvas.height) enemies.splice(i, 1);
    }
}

function checkCollisions() {
    // プレイヤーと敵
    enemies.forEach(enemy => {
        const dx = (player.x + player.size / 2) - (enemy.x + ENEMY_SIZE / 2);
        const dy = (player.y + player.size / 2) - (enemy.y + ENEMY_SIZE / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.size / 2 + ENEMY_SIZE / 2) {
            gameOver = true;
        }
    });
    // プレイヤー弾と敵
    for (let i = enemies.length - 1; i >= 0; i--) {
        for (let j = bullets.length - 1; j >= 0; j--) {
            const dx = (enemies[i].x + ENEMY_SIZE / 2) - (bullets[j].x + BULLET_SIZE / 2);
            const dy = (enemies[i].y + ENEMY_SIZE / 2) - (bullets[j].y + BULLET_SIZE / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < ENEMY_SIZE / 2 + BULLET_SIZE / 2) {
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                score += 100;
                break;
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (gameOver && e.key === ' ') {
        resetGame();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function resetGame() {
    player.x = canvas.width / 2 - PLAYER_SIZE / 2;
    player.y = canvas.height - 60;
    player.shootCooldown = 0;
    bullets = [];
    enemies = [];
    score = 0;
    gameOver = false;
}

let enemySpawnTimer = 0;
function gameLoop() {
    drawBackground();
    updatePlayer();
    shootBullet();
    updateBullets();
    updateEnemies();
    checkCollisions();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawScore();
    if (gameOver) {
        drawGameOver();
        return;
    }
    enemySpawnTimer--;
    if (enemySpawnTimer <= 0) {
        spawnEnemy();
        enemySpawnTimer = 60 + Math.random() * 40;
    }
    requestAnimationFrame(gameLoop);
}

window.onload = () => {
    resetGame();
    gameLoop();
};
// ...不要な残骸コードを完全削除...

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