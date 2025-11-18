
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

// 星（ビーム用の弾数）
let stars = 3;
const MAX_STARS = 3;
// ビーム配列（プレイヤーから出す光線）
let beams = [];
// Jキーの前回押下状態（ホールドで連続発射しないため）
let lastJPressed = false;
// ステージごとの弱敵キル数
let weakKillsThisStage = 0;
// 敵の一意 ID 生成器
let enemyIdCounter = 1;

// ビーム DPS 設定
const BEAM_DPS = 10; // 1秒あたりのダメージ

function drawBackground() {
    // 単色の黒背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
    // プレイヤーを飛行機で描画する（上向き）
    const cx = player.x + player.size / 2;
    const cy = player.y + player.size / 2;
    // ロケットシャトルで描画
    drawRocket(ctx, cx, cy, player.size * 2.2, '#dfeffb');
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
    // 敵は飛行機で描画（ボスは大きめ・色付き、弱敵は小さめ）
    enemies.forEach(enemy => {
        const ex = enemy.x + (enemy.size || ENEMY_SIZE) / 2;
        const ey = enemy.y + (enemy.size || ENEMY_SIZE) / 2;
        // 色を決定
        let color = enemy.colorOuter || '#ff5555';
        if (enemy.type === 'boss') {
            color = enemy.colorInner || '#ff88aa';
        }
    // 敵は怪獣で描画（ボスは大きめ）
    drawKaiju(ctx, ex, ey, (enemy.size || ENEMY_SIZE) * (enemy.type === 'boss' ? 1.1 : 0.7), color, enemy.type === 'boss');
    });
}

// 飛行機を描くユーティリティ
function drawPlane(ctx, x, y, size = 12, color = 'white', flipped = false) {
    ctx.save();
    ctx.translate(x, y);
    if (flipped) ctx.rotate(Math.PI);
    const s = size / 24; // 若干大きめの基準でディテールを増やす
    ctx.scale(s, s);

    // シャドウ
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 10 / s, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 機体のメイン（グラデーションで光沢を表現）
    const grad = ctx.createLinearGradient(-16, -6, 16, 6);
    grad.addColorStop(0, '#444');
    grad.addColorStop(0.4, color);
    grad.addColorStop(0.8, lightenColor(color, 0.25));
    grad.addColorStop(1, '#222');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.quadraticCurveTo(-6, -8, 10, -3);
    ctx.quadraticCurveTo(20, 0, 10, 3);
    ctx.quadraticCurveTo(-6, 8, -18, 0);
    ctx.closePath();
    ctx.fill();

    // 翼（立体感）
    ctx.fillStyle = shadeColor(color, -0.15);
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-16, -14);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-16, 14);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();

    // 尾翼
    ctx.fillStyle = shadeColor(color, -0.05);
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-22, -12);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.fill();

    // コックピット（ガラス）
    const glassGrad = ctx.createLinearGradient(2, -3, 6, 3);
    glassGrad.addColorStop(0, 'rgba(180,220,255,0.95)');
    glassGrad.addColorStop(1, 'rgba(120,160,200,0.6)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.ellipse(6, 0, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, -2, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 細いラインやマーキング
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(8, -2);
    ctx.stroke();

    ctx.restore();
}

// ロケットシャトルを描画（プレイヤー）
function drawRocket(ctx, x, y, size = 24, color = '#fff') {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 48;
    ctx.scale(s, s);

    // 本体（円筒）
    const bodyGrad = ctx.createLinearGradient(-6, -18, 6, 18);
    bodyGrad.addColorStop(0, shadeColor(color, -0.1));
    bodyGrad.addColorStop(0.5, color);
    bodyGrad.addColorStop(1, shadeColor(color, -0.2));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(10, -12, 10, 0);
    ctx.quadraticCurveTo(10, 12, 0, 22);
    ctx.quadraticCurveTo(-10, 12, -10, 0);
    ctx.quadraticCurveTo(-10, -12, 0, -22);
    ctx.closePath();
    ctx.fill();

    // 窓
    ctx.fillStyle = 'rgba(120,200,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // フィン左右
    ctx.fillStyle = shadeColor(color, -0.25);
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.lineTo(-16, 12);
    ctx.lineTo(-6, 12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 6);
    ctx.lineTo(16, 12);
    ctx.lineTo(6, 12);
    ctx.closePath();
    ctx.fill();

    // 排気炎（アニメーション）
    const t = (Date.now() / 80) % 1000;
    const flameH = 10 + Math.sin(Date.now() / 120) * 4;
    const fg = ctx.createLinearGradient(0, 14, 0, 30 + flameH);
    fg.addColorStop(0, 'rgba(255,220,120,0.95)');
    fg.addColorStop(0.6, 'rgba(255,120,40,0.9)');
    fg.addColorStop(1, 'rgba(180,40,20,0.0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(0, 24 + flameH/2, 6, flameH, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 怪獣（kaiju）を描画（敵）
function drawKaiju(ctx, x, y, size = 20, color = '#aaff66', isBoss = false) {
    ctx.save();
    ctx.translate(x, y);
    const s = (size / 40);
    ctx.scale(s, s);

    // 体の色
    const bodyColor = color;
    const dark = shadeColor(bodyColor, -0.25);

    // 体（楕円）
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 4, 18 * (isBoss ? 1.6 : 1), 14 * (isBoss ? 1.3 : 1), 0, 0, Math.PI * 2);
    ctx.fill();

    // 背ビレ（トゲ）
    const spikes = isBoss ? 8 : 5;
    for (let i = 0; i < spikes; i++) {
        const ang = -Math.PI / 1.6 + (i / (spikes - 1)) * (Math.PI / 1.2);
        const sx = Math.cos(ang) * 14;
        const sy = Math.sin(ang) * -8 - 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 6 * Math.cos(ang - 0.3), sy + 6 * Math.sin(ang - 0.3));
        ctx.lineTo(sx + 6 * Math.cos(ang + 0.3), sy + 6 * Math.sin(ang + 0.3));
        ctx.closePath();
        ctx.fillStyle = shadeColor(bodyColor, -0.15);
        ctx.fill();
    }

    // 目
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-6, -2, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -2, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-6, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 口
    ctx.fillStyle = shadeColor(bodyColor, -0.35);
    ctx.beginPath();
    ctx.ellipse(0, 8, 8, 3, 0, 0, Math.PI);
    ctx.fill();

    // 手（小さめ）
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(-14, 6, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, 6, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ボスなら模様を追加
    if (isBoss) {
        ctx.strokeStyle = shadeColor(bodyColor, -0.45);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-10, 2);
        ctx.quadraticCurveTo(0, -6, 10, 2);
        ctx.stroke();
    }

    ctx.restore();
}

// ボスのHPバーを描画
function drawBossHP() {
    const boss = enemies.find(e => e.type === 'boss');
    if (!boss) return;
    const w = canvas.width * 0.6;
    const h = 12;
    const x = (canvas.width - w) / 2;
    const y = 20;
    const ratio = Math.max(0, Math.min(1, (boss.hp || 0) / (boss.maxHp || 1)));
    // 背景
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    // バー背景
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, h);
    // 中央グラデーション
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, '#ff6666');
    g.addColorStop(0.5, '#ffcc66');
    g.addColorStop(1, '#66ff88');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * ratio, h);
    // テキスト
    ctx.fillStyle = 'white';
    ctx.font = '12px Meiryo, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`BOSS HP: ${Math.floor(boss.hp)} / ${Math.floor(boss.maxHp)}`, x + w / 2, y + h - 2);
    ctx.restore();
}

// 色操作ヘルパー
function lightenColor(col, amt) {
    try {
        const c = parseCSSColor(col);
        c.r = Math.min(255, Math.floor(c.r + 255 * amt));
        c.g = Math.min(255, Math.floor(c.g + 255 * amt));
        c.b = Math.min(255, Math.floor(c.b + 255 * amt));
        return `rgb(${c.r},${c.g},${c.b})`;
    } catch (e) {
        return col;
    }
}
function shadeColor(col, amt) {
    try {
        const c = parseCSSColor(col);
        c.r = Math.max(0, Math.floor(c.r * (1 + amt)));
        c.g = Math.max(0, Math.floor(c.g * (1 + amt)));
        c.b = Math.max(0, Math.floor(c.b * (1 + amt)));
        return `rgb(${c.r},${c.g},${c.b})`;
    } catch (e) {
        return col;
    }
}
// 簡易 CSS 色パーサ（ #rrggbb or rgb(...) or basic hex ）
function parseCSSColor(col) {
    if (col.startsWith('#')) {
        const hex = col.replace('#', '');
        const r = parseInt(hex.substring(0,2),16);
        const g = parseInt(hex.substring(2,4),16);
        const b = parseInt(hex.substring(4,6),16);
        return { r, g, b };
    }
    const m = col.match(/rgba?\(([^)]+)\)/);
    if (m) {
        const parts = m[1].split(',').map(s => parseFloat(s.trim()));
        return { r: parts[0], g: parts[1], b: parts[2] };
    }
    // fallback
    return { r: 200, g: 200, b: 200 };
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
        if (b.type === 'beam') {
            // ビーム描画：長い線を描く
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.angle);
            const len = canvas.height * 1.2;
            const bw = b.width || 6;
            const lg = ctx.createLinearGradient(0, -bw/2, len, bw/2);
            lg.addColorStop(0, 'rgba(255,200,120,0.95)');
            lg.addColorStop(0.5, 'rgba(255,120,60,0.9)');
            lg.addColorStop(1, 'rgba(255,120,60,0.0)');
            ctx.fillStyle = lg;
            ctx.fillRect(0, -bw/2, len, bw);
            ctx.restore();
        } else {
            const bx = b.x + ENEMY_BULLET_SIZE / 2;
            const by = b.y + ENEMY_BULLET_SIZE / 2;
            let g = ctx.createRadialGradient(bx, by, 0, bx, by, ENEMY_BULLET_SIZE);
            g.addColorStop(0, 'rgba(255,140,140,0.95)');
            g.addColorStop(1, 'rgba(255,140,140,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(bx, by, ENEMY_BULLET_SIZE, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// --- ビーム関連 ---
function spawnBeam() {
    if (stars <= 0) return;
    // 放射状ビームパラメータ
    const beamsCount = 41; // 放射の本数（密度を大幅に上げる）
    const spread = Math.PI * 0.9; // 開く角度（ラジアン）
    const length = Math.max(canvas.width, canvas.height) * 1.2;
    const life = 120; // 約2秒（60FPS想定）
    const cx = player.x + player.size / 2;
    const cy = player.y + player.size / 2;
    const baseAngle = -Math.PI / 2; // 上方向を中心に放射（プレイヤーは下寄りなので上向き）
    for (let i = 0; i < beamsCount; i++) {
        const t = beamsCount === 1 ? 0.5 : i / (beamsCount - 1);
        const ang = baseAngle - spread / 2 + t * spread;
        beams.push({ cx, cy, ang, length, life, width: 10 });
    }
    stars = Math.max(0, stars - 1);
}

function updateBeams() {
    for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i];
        b.life--;
        if (b.life <= 0) {
            beams.splice(i, 1);
            continue;
        }

        // ビームは線分 (cx,cy) -> (cx+cos(ang)*length, cy+sin(ang)*length)
        const x0 = b.cx;
        const y0 = b.cy;
        const x1 = b.cx + Math.cos(b.ang) * b.length;
        const y1 = b.cy + Math.sin(b.ang) * b.length;
        const bw = b.width;

    // 敵弾との当たり判定: 点と線分の距離を計算して一定幅内なら消す
        for (let j = enemyBullets.length - 1; j >= 0; j--) {
            const eb = enemyBullets[j];
            const ex = eb.x + ENEMY_BULLET_SIZE / 2;
            const ey = eb.y + ENEMY_BULLET_SIZE / 2;
            if (pointToSegmentDistance(ex, ey, x0, y0, x1, y1) <= bw + ENEMY_BULLET_SIZE / 2) {
                enemyBullets.splice(j, 1);
            }
        }

        // 敵との当たり判定
        for (let k = enemies.length - 1; k >= 0; k--) {
            const en = enemies[k];
            const ex = en.x + (en.size || ENEMY_SIZE) / 2;
            const ey = en.y + (en.size || ENEMY_SIZE) / 2;
            const er = (en.size || ENEMY_SIZE) / 2;
            if (pointToSegmentDistance(ex, ey, x0, y0, x1, y1) <= bw + er) {
                if (en.type === 'boss') {
                    // ボスへは持続ダメージ（DPS）を与える。ビーム1本あたりの総ダメージは maxHp/4 を上限とする。
                    b.hitMap = b.hitMap || {};
                    const id = en.id;
                    const prev = b.hitMap[id] || 0;
                    const perFrame = BEAM_DPS / 60; // 1フレームあたりのダメージ
                    const cap = Math.floor((en.maxHp || 1) / 4);
                    const canDeal = Math.max(0, cap - prev);
                    const deal = Math.min(canDeal, perFrame);
                    if (deal > 0) {
                        en.hp = Math.max(1, en.hp - deal);
                        b.hitMap[id] = prev + deal;
                    }
                } else {
                    // 弱敵は即死
                    enemies.splice(k, 1);
                    score += 100;
                    killCount += 1;
                    weakKillsThisStage += 1;
                    if (killCount % 30 === 0 && stars < MAX_STARS) stars = Math.min(MAX_STARS, stars + 1);
                }
            }
        }
    }
}

function drawBeams() {
    beams.forEach(b => {
        const x0 = b.cx;
        const y0 = b.cy;
        const x1 = b.cx + Math.cos(b.ang) * b.length;
        const y1 = b.cy + Math.sin(b.ang) * b.length;
        const alpha = Math.max(0.15, b.life / 14);
        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0, `rgba(180,255,255,${0.9 * alpha})`);
        grad.addColorStop(0.6, `rgba(120,220,255,${0.6 * alpha})`);
        grad.addColorStop(1, `rgba(120,220,255,0)`);
        ctx.save();
        ctx.lineWidth = b.width;
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
    });
}

// ユーティリティ: 点と線分の最短距離
function pointToSegmentDistance(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x0, py - y0);
    let t = ((px - x0) * dx + (py - y0) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const projx = x0 + t * dx;
    const projy = y0 + t * dy;
    return Math.hypot(px - projx, py - projy);
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        if (b.type === 'beam') {
            b.life = (b.life || b.maxLife) - 1;
            if (b.life <= 0) {
                enemyBullets.splice(i, 1);
                continue;
            }
            // ビームは当たり判定をプレイヤーに対して矩形的に行う
            // 判定は下で行う
        } else {
            // ホーミング弾は徐々にプレイヤー方向へ向ける
            if (b.homing) {
                const px = player.x + player.size / 2;
                const py = player.y + player.size / 2;
                const ang = Math.atan2(py - b.y, px - b.x);
                // current velocity angle
                const cur = Math.atan2(b.vy, b.vx);
                // 補間で向きを変える
                const na = cur + (ang - cur) * 0.08;
                const sp = b.speed || Math.hypot(b.vx, b.vy) || ENEMY_BULLET_SPEED;
                b.vx = Math.cos(na) * sp;
                b.vy = Math.sin(na) * sp;
            }
            b.x += b.vx;
            b.y += b.vy;
            if (b.y > canvas.height + ENEMY_BULLET_SIZE || b.y < -ENEMY_BULLET_SIZE || b.x < -ENEMY_BULLET_SIZE || b.x > canvas.width + ENEMY_BULLET_SIZE) {
                enemyBullets.splice(i, 1);
                continue;
            }
        }
        // 当たり判定
        if (b.type === 'beam') {
            // ビームは直線矩形当たり判定
            const bx = b.x;
            const by = b.y;
            const len = canvas.height * 1.2;
            // プレイヤー座標
            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;
            // プレイヤーをビーム座標系に変換
            const dx = px - bx;
            const dy = py - by;
            const ca = Math.cos(-b.angle);
            const sa = Math.sin(-b.angle);
            const rx = dx * ca - dy * sa;
            const ry = dx * sa + dy * ca;
            if (rx > 0 && rx < len && Math.abs(ry) < (b.width || 6)) {
                if (invincibleTimer <= 0) {
                    hearts -= 1;
                    invincibleTimer = 180;
                    if (hearts <= 0) {
                        gameOver = true;
                        return;
                    }
                }
            }
        } else {
            const dx = (player.x + player.size / 2) - (b.x + ENEMY_BULLET_SIZE / 2);
            const dy = (player.y + player.size / 2) - (b.y + ENEMY_BULLET_SIZE / 2);
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
}

// ステージ関連
function spawnWeakEnemy(x, y, stageLevel) {
    // 弱い敵は小さく早めに消えるが弾を撃つ
    const size = Math.max(14, ENEMY_SIZE - stageLevel * 1.5);
    const speed = ENEMY_SPEED + stageLevel * 0.35;
    // ステージが上がるごとに射撃密度を高める（数値を下げるほど頻度増）
    const shootRate = Math.max(40 - stageLevel * 3, 8);
    // HP はステージに応じて上昇
    const maxHp = Math.max(1, Math.floor(1 + stageLevel * 0.6));
    const hp = maxHp;
    const palette = [
        { inner: 'rgba(255,200,220,0.95)', outer: 'rgba(220,120,200,0.9)' },
        { inner: 'rgba(200,230,255,0.95)', outer: 'rgba(120,180,255,0.9)' }
    ];
    const pick = palette[Math.floor(Math.random() * palette.length)];
    enemies.push({ id: enemyIdCounter++, x, y, size, type: 'weak', speed, shootCooldown: Math.floor(Math.random() * shootRate), shootRate, angle: 0, rotationSpeed: (Math.random() * 0.04 - 0.02), colorInner: pick.inner, colorOuter: pick.outer, hp, maxHp });
}

function spawnBoss(stageLevel) {
    // 強い敵（ボス）
    const size = ENEMY_SIZE * (1.6 + stageLevel * 0.15);
    const x = canvas.width / 2 - size / 2;
    const y = -size;
    // 体力をかなり増やす（ステージごとに大幅に増加）
    // ボスの体力をステージに応じて増やす
    const maxHp = 60 + Math.max(0, (stageLevel - 1) * 20);
    const hp = maxHp;
    const pick = { inner: 'rgba(255,160,200,0.98)', outer: 'rgba(200,60,140,0.95)' };
    // attackType をステージに応じて決めつつ、内部的に持たせる密度スケールを追加
    // attackType を拡張してより多くのパターンを使えるようにする
    const attackType = Math.min(stageLevel, 7);
    const densityScale = 1 + (stageLevel - 1) * 0.6; // ステージが上がるごとに密度をより大きく増やす
    // ステージごとのデザインプリセット
    const bossDesigns = [
        { color: '#ff88aa', belly: '#ffd8e8', spikes: 6, horns: 2, eyeColor: '#111' },
        { color: '#66ccff', belly: '#dff4ff', spikes: 7, horns: 3, eyeColor: '#001f5b' },
        { color: '#aaff66', belly: '#f0ffd8', spikes: 8, horns: 4, eyeColor: '#133300' },
        { color: '#ffcc66', belly: '#fff0d6', spikes: 9, horns: 4, eyeColor: '#332200' },
        { color: '#d18bff', belly: '#f4e8ff', spikes: 10, horns: 5, eyeColor: '#2a0033' },
        { color: '#ff6666', belly: '#ffd6d6', spikes: 12, horns: 6, eyeColor: '#2b0000' }
    ];
    const design = bossDesigns[Math.max(0, Math.min(bossDesigns.length - 1, stageLevel - 1))];
    // ボスの射撃頻度もステージで強くする
    const bossShootRate = Math.max(10, 36 - stageLevel * 4);
    enemies.push({ id: enemyIdCounter++, x, y, size, type: 'boss', hp, maxHp: maxHp, speed: ENEMY_SPEED * 0.4, shootCooldown: 0, shootRate: bossShootRate, angle: 0, rotationSpeed: 0.01, colorInner: pick.inner, colorOuter: pick.outer, attackType: attackType, spiralAngle: 0, densityScale, targetY: Math.max(80, size), design });
    bossAlive = true;
}

function spawnStage(stageLevel) {
    stageActive = true;
    bossAlive = false;
    weakKillsThisStage = 0;
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
    // 出現パターン：ステージ内で弱敵を50体倒したらボス出現
    const weakExists = enemies.some(e => e.type === 'weak');
    const bossExists = enemies.some(e => e.type === 'boss');
    if (weakKillsThisStage >= 50 && stageActive && !bossExists && !bossAlive) {
        spawnBoss(stage);
        // 発生後はカウントをリセット
        weakKillsThisStage = 0;
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
            weakKillsThisStage += 1;
            removed++;
            if (killCount % 20 === 0 && hearts < MAX_HEARTS) hearts += 1;
            if (killCount % 30 === 0 && stars < MAX_STARS) stars = Math.min(MAX_STARS, stars + 1);
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
    enemies.push({ id: enemyIdCounter++, x, y: -ENEMY_SIZE, size: ENEMY_SIZE, angle: 0, rotationSpeed: (Math.random() * 0.04 - 0.02), colorInner: pick.inner, colorOuter: pick.outer, ox: Math.random() * 40 - 20 });
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        // 移動はタイプや個別の speed を優先
        // ボスは targetY に到達するまで降下し、それ以降はホバリングさせる
        if (e.type === 'boss') {
            // ゆっくり降下 until targetY
            const ty = e.targetY || 80;
            if (e.y < ty) {
                e.y += Math.max((e.speed || ENEMY_SPEED) * 0.6, 0.6);
            } else {
                // ホバリング（上下微動）
                e.y += Math.sin(Date.now() / 600 + i) * 0.3;
            }
        } else {
            e.y += (e.speed || ENEMY_SPEED);
        }
        // 横揺れ
        e.x += Math.sin((Date.now() / 500) + i) * 0.6 + (e.ox || 0) * 0.002;
        // 回転更新
        e.angle = (e.angle || 0) + (e.rotationSpeed || 0);
    // 通常敵は画面外で削除するが、ボスは削除しない（時間で消えない）
    if (e.type !== 'boss' && e.y > canvas.height + e.size) enemies.splice(i, 1);

        // 敵の射撃処理
        e.shootCooldown = (e.shootCooldown || 0) - 1;
        if (e.shootCooldown <= 0) {
            const ex = e.x + (e.size || ENEMY_SIZE) / 2;
            const ey = e.y + (e.size || ENEMY_SIZE) / 2;
            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;

            if (e.type === 'boss') {
                // ボスのHPが半分以下になったら攻撃を変化させる（1回だけ）
                if (!e.enraged && e.hp <= (e.maxHp || 1) / 2) {
                    e.enraged = true;
                    // 切替後のパターンを強化
                    e.attackType = Math.min(7, (e.attackType || 1) + 2);
                    e.densityScale = (e.densityScale || 1) * 1.6;
                    e.shootRate = Math.max(8, (e.shootRate || 40) - 8);
                }
                // ボスの攻撃バリエーション（stageに応じて）
                const t = e.attackType || 1;
                // ボス攻撃は densityScale によって弾数を増やす
                const density = e.densityScale || 1;
                switch (t) {
                    case 1:
                        // 扇形に複数弾（中距離）
                        for (let k = -Math.floor(2 * density); k <= Math.floor(2 * density); k++) {
                            const angle = Math.atan2(py - ey, px - ex) + k * (0.18 / Math.sqrt(density));
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED + 0.5), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED + 0.5) });
                        }
                        break;
                    case 2:
                        // スパイラル（連続的に角度を増やす）
                        e.spiralAngle = (e.spiralAngle || 0) + 0.3;
                        // 基本の6方向に密度を掛ける
                        const baseSpiral = 6 * Math.ceil(density);
                        for (let k = 0; k < baseSpiral; k++) {
                            const angle = e.spiralAngle + k * (Math.PI * 2 / baseSpiral);
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED) });
                        }
                        break;
                    case 3:
                        // 同心円の小弾（ゆっくり）
                        const rings = Math.ceil(density);
                        const perRing = 12 * Math.ceil(density);
                        for (let r = 0; r < rings; r++) {
                            for (let k = 0; k < perRing; k++) {
                                const angle = k * (Math.PI * 2 / perRing);
                                enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED * 0.6), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED * 0.6) });
                            }
                        }
                        break;
                    case 4:
                        // プレイヤー狙いの速い単発扇
                        for (let k = -Math.floor(1 * density); k <= Math.floor(1 * density); k++) {
                            const angle = Math.atan2(py - ey, px - ex) + k * (0.12 / Math.sqrt(density));
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED + 2), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED + 2) });
                        }
                        break;
                    case 5:
                        // 渦巻き＋プレイヤー方向
                        e.spiralAngle = (e.spiralAngle || 0) + 0.2;
                        const swirlCount = 8 * Math.ceil(density);
                        for (let k = 0; k < swirlCount; k++) {
                            const angle = e.spiralAngle + k * (0.8 / Math.sqrt(density));
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * (ENEMY_BULLET_SPEED * 0.9), vy: Math.sin(angle) * (ENEMY_BULLET_SPEED * 0.9) });
                        }
                        break;
                    case 6:
                        // ホーミング球：プレイヤーを追尾する小弾を複数発射
                        const homeCount = 4 * Math.ceil(density);
                        for (let k = 0; k < homeCount; k++) {
                            const angle = Math.atan2(py - ey, px - ex) + (Math.random() - 0.5) * 0.6;
                            const speed = ENEMY_BULLET_SPEED * (0.9 + Math.random() * 0.8);
                            enemyBullets.push({ x: ex - ENEMY_BULLET_SIZE / 2, y: ey - ENEMY_BULLET_SIZE / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, homing: true, speed: speed, life: 300 });
                        }
                        break;
                    case 7:
                        // ビーム攻撃：ターゲット方向に一定フレーム持続するレーザーを発射
                        // 発射はやや間隔を置いて行い、密度で幅を増やす
                        const beamWidth = 6 * Math.max(1, Math.round(density));
                        const beamLife = 40 + Math.floor(10 * (density - 1));
                        const beamAngle = Math.atan2(py - ey, px - ex);
                        enemyBullets.push({ type: 'beam', x: ex, y: ey, angle: beamAngle, width: beamWidth, life: beamLife, maxLife: beamLife });
                        break;
                    default:
                        // dense spread
                        for (let k = -Math.floor(3 * density); k <= Math.floor(3 * density); k++) {
                            const angle = Math.atan2(py - ey, px - ex) + k * (0.14 / Math.sqrt(density));
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
                    // 弱敵はHPを持つので触れた時はダメージを与える（ここでは1ダメージ）
                    enemy.hp = (enemy.hp || enemy.maxHp || 1) - 1;
                    if (enemy.hp <= 0) {
                        enemies.splice(k, 1);
                        score += 100;
                        killCount += 1;
                        weakKillsThisStage += 1;
                        if (killCount % 20 === 0 && hearts < MAX_HEARTS) hearts += 1;
                        if (killCount % 30 === 0 && stars < MAX_STARS) stars = Math.min(MAX_STARS, stars + 1);
                    }
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
                        if (killCount % 30 === 0 && stars < MAX_STARS) stars = Math.min(MAX_STARS, stars + 1);
                    }
                } else {
                    // 弱い敵はHPを持つのでダメージを与える
                    enemy.hp = (enemy.hp || enemy.maxHp || 1) - 1;
                    if (enemy.hp <= 0) {
                        enemies.splice(i, 1);
                        score += 100;
                        killCount += 1;
                        weakKillsThisStage += 1;
                        if (killCount % 20 === 0 && hearts < MAX_HEARTS) {
                            hearts += 1;
                        }
                        if (killCount % 30 === 0 && stars < MAX_STARS) stars = Math.min(MAX_STARS, stars + 1);
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
    // Jキーでビームを発射（ホールドで連射しない）
    if (e.key.toLowerCase() === 'j') {
        if (!lastJPressed) {
            // 押した瞬間に発射
            spawnBeam();
            lastJPressed = true;
        }
    }
    if (gameOver && e.key === ' ') {
    resetGame();
    if (!gameRunning) requestAnimationFrame(gameLoop);
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key.toLowerCase() === 'j') lastJPressed = false;
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
    stars = MAX_STARS;
    weakKillsThisStage = 0;
    spawnStage(stage);
}

let enemySpawnTimer = 0;
let gameRunning = false;
function gameLoop() {
    gameRunning = true;
    drawBackground();
    updatePlayer();
    shootBullet();
    updateBullets();
    updateEnemies();
    updateEnemyBullets();
    updateBeams();
    checkCollisions();
    drawPlayer();
    drawBullets();
    drawEnemyBullets();
    drawBeams();
    drawEnemies();
    // ボスのHPバー
    if (bossAlive) drawBossHP();
    drawScore();
    drawHearts();
    if (gameOver) {
        drawGameOver();
    gameRunning = false;
    return;
    }
    // 無敵タイマー更新
    if (invincibleTimer > 0) invincibleTimer--;
    // ステージ進行チェック
    tryAdvanceStage();
    enemySpawnTimer--;
    if (!bossAlive) {
        enemySpawnTimer--;
        if (enemySpawnTimer <= 0) {
            spawnEnemy();
            enemySpawnTimer = 60 + Math.random() * 40;
        }
    } else {
        // ボスが生存中は通常敵を出さない。タイマーはリセットしておく
        enemySpawnTimer = 60;
    }
    requestAnimationFrame(gameLoop);
}

window.onload = () => {
    // ボタンの取得
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        restartBtn.style.display = 'inline-block';
        resetGame();
    if (!gameRunning) requestAnimationFrame(gameLoop);
    });

    restartBtn.addEventListener('click', () => {
    // Reset state and ensure the main loop is running
    resetGame();
    // 増加ボーナス: リスタートでハートと星を+3（上限あり）
    hearts = Math.min(MAX_HEARTS, hearts + 3);
    stars = Math.min(MAX_STARS, stars + 3);
    if (!gameRunning) requestAnimationFrame(gameLoop);
    });
};
// end of game script