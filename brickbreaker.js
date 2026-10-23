// Retro Neon Brick Breaker Game Engine

class BrickBreakerGame {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.onScoreUpdate = options.onScoreUpdate || (() => {});
        this.onLivesUpdate = options.onLivesUpdate || (() => {});
        this.onLevelUpdate = options.onLevelUpdate || (() => {});
        this.onGameOver = options.onGameOver || (() => {});
        this.onVictory = options.onVictory || (() => {});

        this.resetGame();
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.maxLevels = 5;

        this.combo = 0;
        this.maxCombo = 0;

        this.paddle = {
            baseWidth: 90,
            width: 90,
            height: 14,
            x: this.canvas.width / 2 - 45,
            y: this.canvas.height - 35,
            speed: 8,
            targetX: this.canvas.width / 2 - 45,
            hasLaser: false,
            laserTimer: 0
        };

        this.balls = [];
        this.lasers = [];
        this.powerups = [];
        this.particles = [];
        this.floatingTexts = [];
        this.shieldActive = false;

        this.powerupTimers = {
            widePaddle: 0,
            fireball: 0,
            laser: 0
        };

        this.keys = { left: false, right: false, fire: false };
        this.ballStuckToPaddle = true;

        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;

        this.loadLevel(this.level);
    }

    start() {
        this.resetGame();
        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        window.arcadeAudio.playStart();
        this.updateHUD();
    }

    pause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    updateHUD() {
        this.onScoreUpdate(this.score, this.combo);
        this.onLivesUpdate(this.lives);
        this.onLevelUpdate(this.level);
    }

    resetBallOnPaddle() {
        this.paddle.x = this.canvas.width / 2 - this.paddle.width / 2;
        this.paddle.targetX = this.paddle.x;

        this.balls = [{
            x: this.paddle.x + this.paddle.width / 2,
            y: this.paddle.y - 8,
            vx: 0,
            vy: 0,
            radius: 6,
            isFireball: false,
            trail: []
        }];

        this.ballStuckToPaddle = true;
    }

    launchBall() {
        if (!this.ballStuckToPaddle || this.balls.length === 0) return;

        const ball = this.balls[0];
        const baseSpeed = 5.5 + (this.level - 1) * 0.4;
        const angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2); // Mostly upward with slight tilt

        ball.vx = Math.cos(angle) * baseSpeed;
        ball.vy = Math.sin(angle) * baseSpeed;
        this.ballStuckToPaddle = false;

        window.arcadeAudio.playPaddleHit();
    }

    loadLevel(lvl) {
        this.bricks = [];
        this.powerups = [];
        this.lasers = [];
        this.combo = 0;
        this.resetBallOnPaddle();

        const rows = 6;
        const cols = 10;
        const brickPadding = 6;
        const offsetTop = 50;
        const offsetLeft = 25;
        const brickWidth = (this.canvas.width - offsetLeft * 2 - (cols - 1) * brickPadding) / cols;
        const brickHeight = 18;

        const colorMap = [
            '#ff0055', // Red neon
            '#ff7700', // Orange
            '#ffea00', // Yellow
            '#00ff66', // Emerald
            '#00e5ff', // Cyan
            '#b000ff'  // Purple
        ];

        if (lvl === 1) {
            // Classic 5 rows
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < cols; c++) {
                    const bx = offsetLeft + c * (brickWidth + brickPadding);
                    const by = offsetTop + r * (brickHeight + brickPadding);
                    this.bricks.push({
                        x: bx, y: by, w: brickWidth, h: brickHeight,
                        hp: 1, maxHp: 1,
                        color: colorMap[r % colorMap.length],
                        points: (5 - r) * 20,
                        type: (r === 2 && (c === 2 || c === 7)) ? 'explosive' : 'normal'
                    });
                }
            }
        } else if (lvl === 2) {
            // Space Invader Pattern with reinforced bricks
            const pattern = [
                "  XX  XX  ",
                " XXXXXXXXX",
                "XXXXXXXXXXX",
                "XXX XXX XXX",
                "XXXXXXXXXXX",
                " X   X   X "
            ];
            for (let r = 0; r < pattern.length; r++) {
                const line = pattern[r];
                for (let c = 0; c < line.length && c < cols; c++) {
                    if (line[c] === 'X') {
                        const bx = offsetLeft + c * (brickWidth + brickPadding);
                        const by = offsetTop + r * (brickHeight + brickPadding);
                        const isHard = (r === 1 || r === 2);
                        this.bricks.push({
                            x: bx, y: by, w: brickWidth, h: brickHeight,
                            hp: isHard ? 2 : 1, maxHp: isHard ? 2 : 1,
                            color: isHard ? '#ff0055' : '#00e5ff',
                            points: isHard ? 60 : 30,
                            type: (c === 4 && r === 2) ? 'explosive' : (isHard ? 'reinforced' : 'normal')
                        });
                    }
                }
            }
        } else if (lvl === 3) {
            // The Fortress (Armored rows defending high value core)
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < cols; c++) {
                    const bx = offsetLeft + c * (brickWidth + brickPadding);
                    const by = offsetTop + r * (brickHeight + brickPadding);

                    let type = 'normal';
                    let hp = 1;
                    let color = colorMap[r];

                    if (r === 0 || r === 5 || c === 0 || c === cols - 1) {
                        type = 'reinforced';
                        hp = 2;
                        color = '#ffaa00';
                    } else if (r === 2 && (c === 4 || c === 5)) {
                        type = 'explosive';
                        hp = 1;
                        color = '#ff0055';
                    }

                    this.bricks.push({
                        x: bx, y: by, w: brickWidth, h: brickHeight,
                        hp: hp, maxHp: hp,
                        color: color,
                        points: hp * 30,
                        type: type
                    });
                }
            }
        } else if (lvl === 4) {
            // Diamond layout
            const centerC = Math.floor(cols / 2);
            for (let r = 0; r < 7; r++) {
                const spread = r < 4 ? r + 1 : 7 - r;
                for (let c = 0; c < cols; c++) {
                    if (Math.abs(c - centerC + 0.5) <= spread) {
                        const bx = offsetLeft + c * (brickWidth + brickPadding);
                        const by = offsetTop + r * (brickHeight + brickPadding);
                        const isCenter = Math.abs(c - centerC + 0.5) < 1;
                        this.bricks.push({
                            x: bx, y: by, w: brickWidth, h: brickHeight,
                            hp: isCenter ? 2 : 1, maxHp: isCenter ? 2 : 1,
                            color: isCenter ? '#ff0077' : '#00ffcc',
                            points: isCenter ? 80 : 40,
                            type: isCenter ? 'explosive' : 'normal'
                        });
                    }
                }
            }
        } else {
            // Level 5+: Procedural Arcade Infinity
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < cols; c++) {
                    if (Math.random() > 0.15) {
                        const bx = offsetLeft + c * (brickWidth + brickPadding);
                        const by = offsetTop + r * (brickHeight + brickPadding);
                        const hp = Math.random() > 0.6 ? 2 : 1;
                        const isExplosive = Math.random() < 0.08;

                        this.bricks.push({
                            x: bx, y: by, w: brickWidth, h: brickHeight,
                            hp: hp, maxHp: hp,
                            color: colorMap[r % colorMap.length],
                            points: hp * 40,
                            type: isExplosive ? 'explosive' : (hp > 1 ? 'reinforced' : 'normal')
                        });
                    }
                }
            }
        }
    }

    setPaddleTarget(x) {
        // Direct tracking for mouse / touch
        this.paddle.targetX = Math.max(0, Math.min(this.canvas.width - this.paddle.width, x - this.paddle.width / 2));
    }

    fireLasers() {
        if (!this.paddle.hasLaser || this.isPaused || !this.isRunning) return;

        const leftX = this.paddle.x + 8;
        const rightX = this.paddle.x + this.paddle.width - 8;
        const y = this.paddle.y - 4;

        this.lasers.push({ x: leftX, y: y, vy: -9, w: 4, h: 12 });
        this.lasers.push({ x: rightX, y: y, vy: -9, w: 4, h: 12 });

        window.arcadeAudio.playLaser();
    }

    update(currentTime) {
        if (!this.isRunning || this.isPaused || this.isGameOver) {
            this.updateEffectsOnly();
            return;
        }

        // 1. Paddle Movement
        if (this.keys.left) {
            this.paddle.x -= this.paddle.speed;
            this.paddle.targetX = this.paddle.x;
        } else if (this.keys.right) {
            this.paddle.x += this.paddle.speed;
            this.paddle.targetX = this.paddle.x;
        } else {
            // Smooth lerp to mouse/touch target
            this.paddle.x += (this.paddle.targetX - this.paddle.x) * 0.35;
        }

        // Clamp paddle
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.paddle.x));

        // 2. Power-up Timers
        if (this.powerupTimers.widePaddle > 0) {
            this.powerupTimers.widePaddle--;
            if (this.powerupTimers.widePaddle <= 0) {
                this.paddle.width = this.paddle.baseWidth;
            }
        }

        if (this.powerupTimers.fireball > 0) {
            this.powerupTimers.fireball--;
            if (this.powerupTimers.fireball <= 0) {
                this.balls.forEach(b => b.isFireball = false);
            }
        }

        if (this.powerupTimers.laser > 0) {
            this.powerupTimers.laser--;
            if (this.powerupTimers.laser <= 0) {
                this.paddle.hasLaser = false;
            }
        }

        // 3. Ball Attached or Moving
        if (this.ballStuckToPaddle && this.balls.length > 0) {
            const ball = this.balls[0];
            ball.x = this.paddle.x + this.paddle.width / 2;
            ball.y = this.paddle.y - ball.radius;
        } else {
            this.updateBalls();
        }

        // 4. Update Lasers
        this.updateLasers();

        // 5. Update Falling Power-ups
        this.updatePowerups();

        // 6. Effects
        this.updateEffectsOnly();

        // 7. Check Level Complete
        const destructibleBricks = this.bricks.filter(b => b.hp > 0);
        if (destructibleBricks.length === 0) {
            this.handleLevelComplete();
        }
    }

    updateBalls() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];

            // Record trail
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 6) ball.trail.shift();

            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall Collisions
            if (ball.x - ball.radius <= 0) {
                ball.x = ball.radius;
                ball.vx = Math.abs(ball.vx);
                window.arcadeAudio.playTone(400, 0.03, 'square', 0.15);
            } else if (ball.x + ball.radius >= this.canvas.width) {
                ball.x = this.canvas.width - ball.radius;
                ball.vx = -Math.abs(ball.vx);
                window.arcadeAudio.playTone(400, 0.03, 'square', 0.15);
            }

            if (ball.y - ball.radius <= 0) {
                ball.y = ball.radius;
                ball.vy = Math.abs(ball.vy);
                window.arcadeAudio.playTone(400, 0.03, 'square', 0.15);
            }

            // Paddle Collision
            if (ball.vy > 0 &&
                ball.y + ball.radius >= this.paddle.y &&
                ball.y - ball.radius <= this.paddle.y + this.paddle.height &&
                ball.x >= this.paddle.x - ball.radius &&
                ball.x <= this.paddle.x + this.paddle.width + ball.radius) {

                // Reset combo when hitting paddle
                this.combo = 0;
                this.onScoreUpdate(this.score, this.combo);

                // Calculate deflection angle based on distance from paddle center
                const hitPoint = (ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
                const clampedHit = Math.max(-0.95, Math.min(0.95, hitPoint));
                const maxBounceAngle = (75 * Math.PI) / 180; // 75 degrees max
                const bounceAngle = clampedHit * maxBounceAngle;

                const speed = Math.hypot(ball.vx, ball.vy);
                const newSpeed = Math.min(speed + 0.08, 10); // Slight speed up on bounce

                ball.vx = Math.sin(bounceAngle) * newSpeed;
                ball.vy = -Math.cos(bounceAngle) * newSpeed;
                ball.y = this.paddle.y - ball.radius;

                window.arcadeAudio.playPaddleHit();
                this.addPaddleSparks(ball.x, this.paddle.y);
            }

            // Shield Collision at bottom
            if (this.shieldActive && ball.y + ball.radius >= this.canvas.height - 8) {
                ball.vy = -Math.abs(ball.vy);
                this.shieldActive = false;
                window.arcadeAudio.playTone(600, 0.1, 'square', 0.3);
                this.addFloatingText(this.canvas.width / 2, this.canvas.height - 30, 'SHIELD BROKEN!', '#00e5ff');
            }

            // Ball Fell off Bottom
            if (ball.y - ball.radius > this.canvas.height) {
                this.balls.splice(i, 1);
                continue;
            }

            // Brick Collisions
            this.checkBallBrickCollisions(ball);
        }

        // If all balls lost
        if (this.balls.length === 0) {
            this.handleBallLost();
        }
    }

    checkBallBrickCollisions(ball) {
        for (let i = 0; i < this.bricks.length; i++) {
            const brick = this.bricks[i];
            if (brick.hp <= 0) continue;

            // Simple Axis-Aligned Bounding Box (AABB) with circle
            const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
            const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
            const distX = ball.x - closestX;
            const distY = ball.y - closestY;
            const distSquared = (distX * distX) + (distY * distY);

            if (distSquared <= (ball.radius * ball.radius)) {
                // Hit detected!
                this.hitBrick(brick, ball.isFireball);

                if (!ball.isFireball) {
                    // Deflect ball
                    const prevX = ball.x - ball.vx;
                    const prevY = ball.y - ball.vy;

                    if (prevX + ball.radius <= brick.x || prevX - ball.radius >= brick.x + brick.w) {
                        ball.vx = -ball.vx;
                    } else {
                        ball.vy = -ball.vy;
                    }
                    break; // Hit one non-piercing brick per frame
                }
            }
        }
    }

    hitBrick(brick, isInstantKill = false) {
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        const damage = isInstantKill ? brick.hp : 1;
        brick.hp -= damage;

        if (brick.hp <= 0) {
            // Destroyed
            const comboMultiplier = Math.min(this.combo, 10);
            const earnedPoints = brick.points * comboMultiplier;
            this.score += earnedPoints;

            window.arcadeAudio.playBrickHit(this.combo);
            this.addBrickParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);

            if (this.combo >= 3) {
                this.addFloatingText(brick.x + brick.w / 2, brick.y, `COMBO x${this.combo}!`, '#ffea00');
            } else {
                this.addFloatingText(brick.x + brick.w / 2, brick.y, `+${earnedPoints}`, brick.color);
            }

            // Check if Explosive
            if (brick.type === 'explosive') {
                this.detonateExplosiveBrick(brick);
            }

            // Chance to drop power-up (22% chance)
            if (Math.random() < 0.22) {
                this.spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
            }
        } else {
            // Damaged but alive
            window.arcadeAudio.playTone(320, 0.05, 'square', 0.25);
            this.addBrickParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#ffffff', 5);
        }

        this.updateHUD();
    }

    detonateExplosiveBrick(centerBrick) {
        window.arcadeAudio.playExplosion();
        this.addExplosionParticles(centerBrick.x + centerBrick.w / 2, centerBrick.y + centerBrick.h / 2);

        const radius = centerBrick.w * 2.2;
        const cx = centerBrick.x + centerBrick.w / 2;
        const cy = centerBrick.y + centerBrick.h / 2;

        this.bricks.forEach(b => {
            if (b !== centerBrick && b.hp > 0) {
                const bx = b.x + b.w / 2;
                const by = b.y + b.h / 2;
                const dist = Math.hypot(bx - cx, by - cy);
                if (dist <= radius) {
                    this.hitBrick(b, true);
                }
            }
        });
    }

    spawnPowerup(x, y) {
        const types = [
            { type: 'multiball', label: 'M', color: '#00e5ff' },
            { type: 'wide',      label: 'W', color: '#ffea00' },
            { type: 'fireball',  label: 'F', color: '#ff3300' },
            { type: 'laser',     label: 'L', color: '#ff0055' },
            { type: 'shield',    label: 'S', color: '#00ff66' },
            { type: 'life',      label: '+', color: '#ff00aa' }
        ];

        const p = types[Math.floor(Math.random() * types.length)];
        this.powerups.push({
            x: x,
            y: y,
            vy: 2.2,
            type: p.type,
            label: p.label,
            color: p.color,
            size: 18
        });
    }

    updatePowerups() {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.y += p.vy;

            // Catch by paddle
            if (p.y + p.size / 2 >= this.paddle.y &&
                p.y - p.size / 2 <= this.paddle.y + this.paddle.height &&
                p.x >= this.paddle.x &&
                p.x <= this.paddle.x + this.paddle.width) {

                this.activatePowerup(p);
                this.powerups.splice(i, 1);
                continue;
            }

            // Fallen off screen
            if (p.y - p.size > this.canvas.height) {
                this.powerups.splice(i, 1);
            }
        }
    }

    activatePowerup(p) {
        window.arcadeAudio.playPowerup();

        switch (p.type) {
            case 'multiball':
                if (this.balls.length > 0) {
                    const src = this.balls[0];
                    for (let angleOffset of [-0.4, 0.4]) {
                        const speed = Math.hypot(src.vx, src.vy) || 6;
                        const angle = Math.atan2(src.vy, src.vx) + angleOffset;
                        this.balls.push({
                            x: src.x,
                            y: src.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            radius: 6,
                            isFireball: src.isFireball,
                            trail: []
                        });
                    }
                }
                this.addFloatingText(p.x, p.y, 'MULTI-BALL!', p.color);
                break;

            case 'wide':
                this.paddle.width = this.paddle.baseWidth * 1.5;
                this.powerupTimers.widePaddle = 720; // 12 seconds
                this.addFloatingText(p.x, p.y, 'WIDE PADDLE!', p.color);
                break;

            case 'fireball':
                this.powerupTimers.fireball = 480; // 8 seconds
                this.balls.forEach(b => b.isFireball = true);
                this.addFloatingText(p.x, p.y, 'FIREBALL!', p.color);
                break;

            case 'laser':
                this.paddle.hasLaser = true;
                this.powerupTimers.laser = 600; // 10 seconds
                this.addFloatingText(p.x, p.y, 'LASER CANNON!', p.color);
                break;

            case 'shield':
                this.shieldActive = true;
                this.addFloatingText(p.x, p.y, 'ENERGY SHIELD!', p.color);
                break;

            case 'life':
                this.lives = Math.min(this.lives + 1, 5);
                this.updateHUD();
                this.addFloatingText(p.x, p.y, '+1 EXTRA LIFE!', p.color);
                break;
        }
    }

    updateLasers() {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.y += l.vy;

            // Check collision with bricks
            let hit = false;
            for (let b of this.bricks) {
                if (b.hp > 0 &&
                    l.x >= b.x && l.x <= b.x + b.w &&
                    l.y >= b.y && l.y <= b.y + b.h) {
                    this.hitBrick(b, false);
                    hit = true;
                    break;
                }
            }

            if (hit || l.y < 0) {
                this.lasers.splice(i, 1);
            }
        }
    }

    handleBallLost() {
        this.lives--;
        this.updateHUD();
        window.arcadeAudio.playLifeLost();

        if (this.lives <= 0) {
            this.isGameOver = true;
            this.isRunning = false;
            setTimeout(() => window.arcadeAudio.playGameOver(), 300);
            this.onGameOver(this.score);
        } else {
            this.resetBallOnPaddle();
        }
    }

    handleLevelComplete() {
        window.arcadeAudio.playVictory();
        this.addFloatingText(this.canvas.width / 2, this.canvas.height / 2, 'LEVEL CLEAR!', '#00ff66');

        if (this.level >= this.maxLevels) {
            // Ultimate victory
            this.isRunning = false;
            this.onVictory(this.score);
        } else {
            this.level++;
            this.updateHUD();
            setTimeout(() => {
                this.loadLevel(this.level);
            }, 1200);
        }
    }

    addBrickParticles(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 2 + Math.random() * 3,
                life: 1.0,
                decay: 0.03 + Math.random() * 0.03
            });
        }
    }

    addPaddleSparks(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = -Math.PI / 2 + (Math.random() * 1.2 - 0.6);
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#00ffcc',
                size: 2,
                life: 0.8,
                decay: 0.05
            });
        }
    }

    addExplosionParticles(x, y) {
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: Math.random() > 0.5 ? '#ff0055' : '#ffea00',
                size: 3 + Math.random() * 4,
                life: 1.0,
                decay: 0.025
            });
        }
    }

    addFloatingText(x, y, text, color = '#00ffcc') {
        this.floatingTexts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            alpha: 1.0,
            vy: -1.2
        });
    }

    updateEffectsOnly() {
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.025;
            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Background grid
        this.renderBackground(ctx);

        // 2. Shield if active
        if (this.shieldActive) {
            ctx.save();
            ctx.strokeStyle = '#00ff66';
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, this.canvas.height - 4);
            ctx.lineTo(this.canvas.width, this.canvas.height - 4);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Bricks
        this.renderBricks(ctx);

        // 4. Power-ups falling
        this.renderPowerups(ctx);

        // 5. Lasers
        this.renderLasers(ctx);

        // 6. Paddle
        this.renderPaddle(ctx);

        // 7. Balls
        this.renderBalls(ctx);

        // 8. Particles & Floating Texts
        this.renderParticles(ctx);
        this.renderFloatingTexts(ctx);

        // 9. Launch Prompt if ball stuck
        if (this.ballStuckToPaddle && this.isRunning && !this.isGameOver) {
            ctx.save();
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 8;
            ctx.textAlign = 'center';
            const blink = Math.sin(performance.now() * 0.008) > 0;
            if (blink) {
                ctx.fillText('PRESS SPACEBAR / TAP TO LAUNCH', this.canvas.width / 2, this.paddle.y - 25);
            }
            ctx.restore();
        }
    }

    renderBackground(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
        ctx.lineWidth = 1;
        const step = 30;

        for (let x = 0; x < this.canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderBricks(ctx) {
        ctx.save();
        for (const b of this.bricks) {
            if (b.hp <= 0) continue;

            ctx.shadowColor = b.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = b.color;

            // Rounded brick
            this.roundRect(ctx, b.x, b.y, b.w, b.h, 3);
            ctx.fill();

            // Inner gloss highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 3);

            // Special Brick Badges
            if (b.type === 'explosive') {
                ctx.fillStyle = '#ffea00';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TNT', b.x + b.w / 2, b.y + b.h / 2 + 1);
            } else if (b.type === 'reinforced' && b.hp === 1) {
                // Cracked look
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(b.x + 4, b.y + b.h / 2);
                ctx.lineTo(b.x + b.w / 2, b.y + 4);
                ctx.lineTo(b.x + b.w - 4, b.y + b.h - 4);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    renderPaddle(ctx) {
        ctx.save();
        const p = this.paddle;

        ctx.shadowColor = p.hasLaser ? '#ff0055' : '#00ffcc';
        ctx.shadowBlur = 12;

        // Paddle base
        ctx.fillStyle = p.hasLaser ? '#ff0055' : '#00ffcc';
        this.roundRect(ctx, p.x, p.y, p.width, p.height, 4);
        ctx.fill();

        // Metallic center stripe
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x + p.width * 0.35, p.y + 2, p.width * 0.3, p.height - 4);

        // Laser blasters on ends if active
        if (p.hasLaser) {
            ctx.fillStyle = '#ffea00';
            ctx.fillRect(p.x + 4, p.y - 4, 5, 4);
            ctx.fillRect(p.x + p.width - 9, p.y - 4, 5, 4);
        }
        ctx.restore();
    }

    renderBalls(ctx) {
        ctx.save();
        for (const ball of this.balls) {
            // Trail
            for (let i = 0; i < ball.trail.length; i++) {
                const t = ball.trail[i];
                const alpha = (i + 1) / ball.trail.length * 0.3;
                ctx.fillStyle = ball.isFireball ? `rgba(255, 68, 0, ${alpha})` : `rgba(0, 229, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, ball.radius * (0.5 + 0.5 * (i / ball.trail.length)), 0, Math.PI * 2);
                ctx.fill();
            }

            // Ball body
            ctx.shadowColor = ball.isFireball ? '#ff3300' : '#00e5ff';
            ctx.shadowBlur = ball.isFireball ? 16 : 10;
            ctx.fillStyle = ball.isFireball ? '#ffcc00' : '#ffffff';

            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderPowerups(ctx) {
        ctx.save();
        for (const p of this.powerups) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = p.color;

            // Pill/Capsule shape
            this.roundRect(ctx, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, 5);
            ctx.fill();

            // Icon label
            ctx.fillStyle = '#050a14';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.label, p.x, p.y + 1);
        }
        ctx.restore();
    }

    renderLasers(ctx) {
        ctx.save();
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ff3366';
        for (const l of this.lasers) {
            ctx.fillRect(l.x, l.y, l.w, l.h);
        }
        ctx.restore();
    }

    renderParticles(ctx) {
        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
    }

    renderFloatingTexts(ctx) {
        ctx.save();
        for (const ft of this.floatingTexts) {
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

window.BrickBreakerGame = BrickBreakerGame;
