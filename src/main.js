
// 新しい縦スクロールシューティングゲーム
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const PLAYER_SIZE = 10;
const PLAYER_SPEED = 5;
const BULLET_SIZE = 6;
const BULLET_SPEED = 10;
const ENEMY_SIZE = 28;
const ENEMY_SPEED = 2.5;
const ENEMY_BULLET_SIZE = 6;
const ENEMY_BULLET_SPEED = 4;

let player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height - 45,
    size: PLAYER_SIZE,
    shootCooldown: 0
};
let bullets = [];
let enemies = [];
let enemyBullets = [];
let keys = {};
let score = 0;
let gameOver = false;
let stage = 1;
const MAX_STAGES = 6;
let stageActive = false;
let bossAlive = false;
let hearts = 3;
const MAX_HEARTS = 5;
let killCount = 0;
let invincibleTimer = 0; // 被弾後の無敵時間（フレーム数）

function drawBackground() {
    // 単色の黒背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
    // 東方っぽい弾幕プレイヤー：中心の光と外側の小さな羽
    const cx = player.x + player.size / 2;
    const cy = player.y + player.size / 2;
    // 中心の光
    let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, player.size);
    g.addColorStop(0, 'rgba(255,200,230,0.95)');
    g.addColorStop(0.5, 'rgba(220,180,255,0.8)');
    g.addColorStop(1, 'rgba(120,160,255,0.0)');
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, player.size, 0, Math.PI * 2);
    ctx.fill();
    // 小さな羽（放射状）
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const a = (Date.now() / 300 + i * (Math.PI * 2 / 6));
        const x = cx + Math.cos(a) * (player.size * 1.3);
        const y = cy + Math.sin(a) * (player.size * 1.3);
        ctx.arc(x, y, player.size * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,220,240,0.7)';
        ctx.fill();
    }
    ctx.restore();
}

function drawBullets() {
    // 発光する真珠のような弾
    bullets.forEach(bullet => {
        const bx = bullet.x + BULLET_SIZE / 2;
        const by = bullet.y + BULLET_SIZE / 2;
        let bg = ctx.createRadialGradient(bx, by, 0, bx, by, BULLET_SIZE);
        bg.addColorStop(0, 'rgba(255,255,200,0.95)');
        bg.addColorStop(0.5, 'rgba(255,200,255,0.8)');
        bg.addColorStop(1, 'rgba(255,200,255,0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawEnemies() {
    // 敵は回転する装飾的な形で描画
    enemies.forEach(enemy => {
        ctx.save();
        const ex = enemy.x + enemy.size / 2;
        const ey = enemy.y + enemy.size / 2;
        ctx.translate(ex, ey);
        ctx.rotate(enemy.angle || 0);
        // グラデーション中心
        let eg = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.size);
        eg.addColorStop(0, enemy.colorInner || 'rgba(255,180,180,0.95)');
        eg.addColorStop(0.6, enemy.colorOuter || 'rgba(200,80,160,0.9)');
        eg.addColorStop(1, 'rgba(0,0,0,0)');
        // 装飾的な花びら（6つ）
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const a = i * (Math.PI * 2 / 6);
            const rx = Math.cos(a) * enemy.size * 0.55;
            const ry = Math.sin(a) * enemy.size * 0.55;
            ctx.ellipse(rx, ry, enemy.size * 0.45, enemy.size * 0.2, a, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,200,230,0.12)';
            ctx.fill();
        }
        // 中心
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawScore() {
    ctx.save();
    ctx.font = '20px Meiryo, Arial';
    ctx.fillStyle = 'gold';
    ctx.fillText('Score: ' + score, 16, 32);
    ctx.fillText('Stage: ' + stage + (stage > MAX_STAGES ? ' (CLEAR)' : ''), 16, 56);
    ctx.restore();
}

function drawHearts() {
    const size = 18;
    for (let i = 0; i < hearts; i++) {
        const x = canvas.width - (i + 1) * (size + 6) - 16;
        const y = 16;
        ctx.save();
        ctx.fillStyle = 'crimson';
        ctx.beginPath();
        // 簡易ハート形
        ctx.moveTo(x + size/2, y + size/4);
        ctx.bezierCurveTo(x + size/2, y, x, y, x, y + size/4);
        ctx.bezierCurveTo(x, y + size/1.25, x + size/2, y + size*0.9, x + size/2, y + size);
        ctx.bezierCurveTo(x + size/2, y + size*0.9, x + size, y + size/1.25, x + size, y + size/4);
        ctx.bezierCurveTo(x + size, y, x + size/2, y, x + size/2, y + size/4);
        ctx.fill();
        ctx.restore();
    }
}

function drawEnemyBullets() {
    enemyBullets.forEach(b => {
        const bx = b.x + ENEMY_BULLET_SIZE / 2;
        const by = b.y + ENEMY_BULLET_SIZE / 2;
        let g = ctx.createRadialGradient(bx, by, 0, bx, by, ENEMY_BULLET_SIZE);
        g.addColorStop(0, 'rgba(255,140,140,0.95)');
        g.addColorStop(1, 'rgba(255,140,140,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, ENEMY_BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].x += enemyBullets[i].vx;
        enemyBullets[i].y += enemyBullets[i].vy;
        if (enemyBullets[i].y > canvas.height + ENEMY_BULLET_SIZE || enemyBullets[i].y < -ENEMY_BULLET_SIZE || enemyBullets[i].x < -ENEMY_BULLET_SIZE || enemyBullets[i].x > canvas.width + ENEMY_BULLET_SIZE) {
            enemyBullets.splice(i, 1);
            continue;
        }
        // プレイヤーへの命中判定
        const dx = (player.x + player.size / 2) - (enemyBullets[i].x + ENEMY_BULLET_SIZE / 2);
        const dy = (player.y + player.size / 2) - (enemyBullets[i].y + ENEMY_BULLET_SIZE / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.size / 2 + ENEMY_BULLET_SIZE / 2) {
            // 被弾時は無敵時間を考慮してハートを減らす
            if (invincibleTimer <= 0) {
                hearts -= 1;
                invincibleTimer = 180; // 約3秒の無敵（60FPS想定）
                // 弾を消す
                enemyBullets.splice(i, 1);
                if (hearts <= 0) {
                    gameOver = true;
                    return;
                }
            }
        }
    }
}

// ステージ関連
function spawnWeakEnemy(x, y, stageLevel) {
    // 弱い敵は小さく早めに消えるが弾を撃つ
    const size = Math.max(16, ENEMY_SIZE - stageLevel * 2);
    const speed = ENEMY_SPEED + stageLevel * 0.3;
    const shootRate = Math.max(60 - stageLevel * 4, 30);
    const palette = [
        { inner: 'rgba(255,200,220,0.95)', outer: 'rgba(220,120,200,0.9)' },
        { inner: 'rgba(200,230,255,0.95)', outer: 'rgba(120,180,255,0.9)' }
    ];
    const pick = palette[Math.floor(Math.random() * palette.length)];
    enemies.push({ x, y, size, type: 'weak', speed, shootCooldown: Math.floor(Math.random() * shootRate), shootRate, angle: 0, rotationSpeed: (Math.random() * 0.04 - 0.02), colorInner: pick.inner, colorOuter: pick.outer });
}

function spawnBoss(stageLevel) {
    // 強い敵（ボス）
    const size = ENEMY_SIZE * (1.6 + stageLevel * 0.15);
    const x = canvas.width / 2 - size / 2;
    const y = -size;
    const hp = 5 + stageLevel * 3;
    const pick = { inner: 'rgba(255,160,200,0.98)', outer: 'rgba(200,60,140,0.95)' };
    enemies.push({ x, y, size, type: 'boss', hp, speed: ENEMY_SPEED * 0.4, shootCooldown: 0, shootRate: Math.max(20, 40 - stageLevel * 3), angle: 0, rotationSpeed: 0.01, colorInner: pick.inner, colorOuter: pick.outer, attackType: stageLevel, spiralAngle: 0 });
    bossAlive = true;
}

function spawnStage(stageLevel) {
    stageActive = true;
    bossAlive = false;
    enemies = enemies.filter(e => e.type !== 'boss');
    // spawn a wave of weak enemies proportional to stage
    const count = 3 + stageLevel * 2;
    for (let i = 0; i < count; i++) {
        const x = Math.random() * (canvas.width - ENEMY_SIZE);
        const y = -Math.random() * 200 - i * 40;
        spawnWeakEnemy(x, y, stageLevel);
    }
}

function tryAdvanceStage() {
    // ステージの敵が全滅したらボスを出す、ボス倒したら次のステージへ
    const weakExists = enemies.some(e => e.type === 'weak');
    const bossExists = enemies.some(e => e.type === 'boss');
    if (!weakExists && !bossExists && stageActive && !bossAlive) {
        // 出現パターン：弱敵全滅でボス出現
        spawnBoss(stage);
        return;
    }
    if (!weakExists && !bossExists && stageActive && stage > MAX_STAGES) {
        // クリア
        stageActive = false;
        return;
    }
}

// Jキー: 画面内のボス以外の敵を全て倒す（スコア・killCountを増やし、20体ごとの回復を適用）
function nukeWeakEnemies() {
    let removed = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].type !== 'boss') {
            enemies.splice(i, 1);
            score += 100;
            killCount += 1;
            removed++;
            if (killCount % 20 === 0 && hearts < MAX_HEARTS) hearts += 1;
        }
    }
    // 弱敵が全滅したらボス出現のトリガーを試す
    tryAdvanceStage();
    return removed;
}

function drawGameOver() {
    ctx.save();
    ctx.font = '40px Meiryo, Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
    ctx.restore();
}

function updatePlayer() {
    // プレイヤー移動処理（キーは小文字で保存される）
    // Space を押している間は移動速度を半分にする
    const speed = keys[' '] ? PLAYER_SPEED / 2 : PLAYER_SPEED;
    if (keys['arrowleft'] && player.x > 0) player.x -= speed;
    if (keys['arrowright'] && player.x < canvas.width - player.size) player.x += speed;
    if (keys['arrowup'] && player.y > 0) player.y -= speed;
    if (keys['arrowdown'] && player.y < canvas.height - player.size) player.y += speed;
}

function shootBullet() {
    // 射撃は F キーに割り当て
    if (keys['f']) {
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
    const palette = [
        { inner: 'rgba(255,180,180,0.98)', outer: 'rgba(220,80,160,0.95)' },
        { inner: 'rgba(200,230,255,0.98)', outer: 'rgba(120,180,255,0.95)' },
        { inner: 'rgba(255,240,180,0.98)', outer: 'rgba(255,180,60,0.95)' }
    ];
    const pick = palette[Math.floor(Math.random() * palette.length)];
    enemies.push({ x, y: -ENEMY_SIZE, size: ENEMY_SIZE, angle: 0, rotationSpeed: (Math.random() * 0.04 - 0.02), colorInner: pick.inner, colorOuter: pick.outer, ox: Math.random() * 40 - 20 });
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        // 移動はタイプや個別の speed を優先
        e.y += (e.speed || ENEMY_SPEED);
        // 横揺れ
        e.x += Math.sin((Date.now() / 500) + i) * 0.6 + (e.ox || 0) * 0.002;
        // 回転更新
        e.angle = (e.angle || 0) + (e.rotationSpeed || 0);
        if (e.y > canvas.height + e.size) enemies.splice(i, 1);

        // 敵の射撃処理
        e.shootCooldown = (e.shootCooldown || 0) - 1;
        if (e.shootCooldown <= 0) {
            const ex = e.x + (e.size || ENEMY_SIZE) / 2;
            const ey = e.y + (e.size || ENEMY_SIZE) / 2;
            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;

            if (e.type === 'boss') {
                // ボスの攻撃バリエーション（stageに応じて）
                const t = e.attackType || 1;
                switch (t) {
                    case 1:
                        // 扇形に複数弾（中距離）
                        for (let k = -2; k <= 2; k++) {
                            const angle = Math.atan2(py - ey, px - ex) + k * 0.18;
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED + 0.5), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED + 0.5) });
                        }
                        break;
                    case 2:
                        // スパイラル（連続的に角度を増やす）
                        e.spiralAngle = (e.spiralAngle || 0) + 0.3;
                        for (let k = 0; k < 6; k++) {
                            const angle = e.spiralAngle + k * (Math.PI * 2 / 6);
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED) });
                        }
                        break;
                    case 3:
                        // 同心円の小弾（ゆっくり）
                        for (let k = 0; k < 12; k++) {
                            const angle = k * (Math.PI * 2 / 12);
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED * 0.6), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED * 0.6) });
                        }
                        break;
                    case 4:
                        // プレイヤー狙いの速い単発扇
                        for (let k = -1; k <= 1; k++) {
                            const angle = Math.atan2(py - ey, px - ex) + k * 0.12;
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED + 2), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED + 2) });
                        }
                        break;
                    case 5:
                        // 渦巻き＋プレイヤー方向
                        e.spiralAngle = (e.spiralAngle || 0) + 0.2;
                        for (let k = 0; k < 8; k++) {
                            const angle = e.spiralAngle + k * 0.8;
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED * 0.9), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED * 0.9) });
                        }
                        break;
                    default:
                        // dense spread
                        for (let k = -3; k <= 3; k++) {
                            const angle = Math.atan2(py - ey, px - ex) + k * 0.14;
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED + 0.5), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED + 0.5) });
                        }
                        break;
                }
            } else {
                // 通常の弱敵はプレイヤー狙いの単発
                const angle = Math.atan2(py - ey, px - ex);
                enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED });
            }

            e.shootCooldown = e.shootRate || 80;
        }
    }
}

function checkCollisions() {
    // プレイヤーと敵の当たり判定（敵のサイズを参照）
    // 被弾は即ゲームオーバーにせず、ハートを減らす。無敵時間を考慮。
    for (let k = enemies.length - 1; k >= 0; k--) {
        const enemy = enemies[k];
        const ex = enemy.x + (enemy.size || ENEMY_SIZE) / 2;
        const ey = enemy.y + (enemy.size || ENEMY_SIZE) / 2;
        const dx = (player.x + player.size / 2) - ex;
        const dy = (player.y + player.size / 2) - ey;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const enemyRadius = (enemy.size || ENEMY_SIZE) / 2;
        if (dist < player.size / 2 + enemyRadius) {
            if (invincibleTimer <= 0) {
                // 被弾処理
                hearts -= 1;
                invincibleTimer = 180; // 無敵時間（約3秒）
                if (hearts <= 0) {
                    gameOver = true;
                    return;
                }
                // 弱敵に触れた場合は消滅させる（ボスは消さない）
                if (enemy.type !== 'boss') {
                    enemies.splice(k, 1);
                    score += 100;
                    killCount += 1;
                    if (killCount % 20 === 0 && hearts < MAX_HEARTS) hearts += 1;
                }
            }
        }
    }

    // プレイヤー弾と敵（ボスはHPを減らす）
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const er = (enemy.size || ENEMY_SIZE) / 2;
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bx = bullets[j].x + BULLET_SIZE / 2;
            const by = bullets[j].y + BULLET_SIZE / 2;
            const ex = enemy.x + (enemy.size || ENEMY_SIZE) / 2;
            const ey = enemy.y + (enemy.size || ENEMY_SIZE) / 2;
            const dx = ex - bx;
            const dy = ey - by;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < er + BULLET_SIZE / 2) {
                // 命中
                bullets.splice(j, 1);
                if (enemy.type === 'boss') {
                    enemy.hp -= 1;
                    if (enemy.hp <= 0) {
                        enemies.splice(i, 1);
                        bossAlive = false;
                        stageActive = false;
                        score += 1000;
                        // 次のステージへ
                        stage++;
                        if (stage <= MAX_STAGES) {
                            spawnStage(stage);
                        }
                        // boss を倒した分もカウントに含める
                        killCount += 1;
                        if (killCount % 20 === 0 && hearts < MAX_HEARTS) {
                            hearts += 1;
                        }
                    }
                } else {
                    // 弱い敵は即死
                    enemies.splice(i, 1);
                    score += 100;
                    killCount += 1;
                    if (killCount % 20 === 0 && hearts < MAX_HEARTS) {
                        hearts += 1;
                    }
                }
                break;
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    // 矢印キーやスペースでページがスクロールしないようにする
    if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    // Jキーで弱い敵を全滅
    if (e.key.toLowerCase() === 'j') {
        nukeWeakEnemies();
    }
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
    enemyBullets = [];
    score = 0;
    gameOver = false;
    stage = 1;
    stageActive = false;
    bossAlive = false;
    spawnStage(stage);
}

let enemySpawnTimer = 0;
function gameLoop() {
    drawBackground();
    updatePlayer();
    shootBullet();
    updateBullets();
    updateEnemies();
    updateEnemyBullets();
    checkCollisions();
    drawPlayer();
    drawBullets();
    drawEnemyBullets();
    drawEnemies();
    drawScore();
    drawHearts();
    if (gameOver) {
        drawGameOver();
        return;
    }
    // 無敵タイマー更新
    if (invincibleTimer > 0) invincibleTimer--;
    // ステージ進行チェック
    tryAdvanceStage();
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
// end of game script