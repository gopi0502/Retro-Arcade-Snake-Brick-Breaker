// Retro Cyber Snake Game Engine

class SnakeGame {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 24; // 24x24 tiles
        this.tileSize = canvas.width / this.gridSize; // 600 / 24 = 25px

        this.onScoreUpdate = options.onScoreUpdate || (() => {});
        this.onGameOver = options.onGameOver || (() => {});

        this.wallMode = options.wallMode !== undefined ? options.wallMode : true; // true: solid walls, false: wrap-around
        this.difficulty = options.difficulty || 'normal'; // easy, normal, hard

        this.reset();
    }

    reset() {
        const center = Math.floor(this.gridSize / 2);
        this.snake = [
            { x: center, y: center },
            { x: center - 1, y: center },
            { x: center - 2, y: center }
        ];

        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.inputQueue = [];

        this.score = 0;
        this.applesEaten = 0;
        this.multiplier = 1;
        this.multiplierTimer = 0;

        this.food = null;
        this.bonusItem = null;
        this.bonusTimer = 0;
        this.bonusMaxTime = 400; // ~6.6s at 60fps

        this.particles = [];
        this.floatingTexts = [];

        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;

        this.moveInterval = this.getBaseInterval(); // ms per grid tick
        this.lastTickTime = 0;

        this.spawnFood();
        this.onScoreUpdate(this.score, this.snake.length, this.multiplier);
    }

    getBaseInterval() {
        switch (this.difficulty) {
            case 'easy': return 140;
            case 'hard': return 75;
            case 'normal':
            default: return 105;
        }
    }

    getCurrentInterval() {
        // Accelerates slightly as snake grows
        const speedup = Math.min(this.snake.length * 1.5, 40);
        return Math.max(45, this.moveInterval - speedup);
    }

    setDirection(newDir) {
        if (this.isPaused || this.isGameOver) return;

        const currentOrLast = this.inputQueue.length > 0
            ? this.inputQueue[this.inputQueue.length - 1]
            : this.dir;

        // Prevent 180° immediate reversal
        if (newDir.x !== -currentOrLast.x || newDir.y !== -currentOrLast.y) {
            if (this.inputQueue.length < 3) {
                this.inputQueue.push(newDir);
            }
        }
    }

    spawnFood() {
        let attempts = 0;
        while (attempts < 500) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);

            const collidesWithSnake = this.snake.some(seg => seg.x === x && seg.y === y);
            const collidesWithBonus = this.bonusItem && this.bonusItem.x === x && this.bonusItem.y === y;

            if (!collidesWithSnake && !collidesWithBonus) {
                this.food = { x, y, type: 'apple' };
                return;
            }
            attempts++;
        }
    }

    spawnBonusItem() {
        if (this.bonusItem) return;

        let attempts = 0;
        while (attempts < 500) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);

            const collidesWithSnake = this.snake.some(seg => seg.x === x && seg.y === y);
            const collidesWithFood = this.food && this.food.x === x && this.food.y === y;

            if (!collidesWithSnake && !collidesWithFood) {
                const types = ['star', 'multiplier'];
                const selectedType = types[Math.floor(Math.random() * types.length)];
                this.bonusItem = { x, y, type: selectedType };
                this.bonusTimer = this.bonusMaxTime;
                return;
            }
            attempts++;
        }
    }

    addParticles(gridX, gridY, color, count = 15) {
        const px = (gridX + 0.5) * this.tileSize;
        const py = (gridY + 0.5) * this.tileSize;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            this.particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 2 + Math.random() * 3,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    addFloatingText(gridX, gridY, text, color = '#00ffcc') {
        const px = (gridX + 0.5) * this.tileSize;
        const py = (gridY + 0.5) * this.tileSize;

        this.floatingTexts.push({
            x: px,
            y: py,
            text: text,
            color: color,
            alpha: 1.0,
            vy: -1.2
        });
    }

    start() {
        this.reset();
        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.lastTickTime = performance.now();
        window.arcadeAudio.playStart();
    }

    pause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    update(currentTime) {
        if (!this.isRunning || this.isPaused || this.isGameOver) {
            this.updateEffectsOnly();
            return;
        }

        // Handle Timers (Multiplier, Bonus)
        if (this.multiplierTimer > 0) {
            this.multiplierTimer--;
            if (this.multiplierTimer <= 0) {
                this.multiplier = 1;
                this.onScoreUpdate(this.score, this.snake.length, this.multiplier);
            }
        }

        if (this.bonusItem) {
            this.bonusTimer--;
            if (this.bonusTimer <= 0) {
                this.bonusItem = null;
            }
        }

        // Snake grid tick based on time interval
        if (currentTime - this.lastTickTime >= this.getCurrentInterval()) {
            this.tick();
            this.lastTickTime = currentTime;
        }

        this.updateEffectsOnly();
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

    tick() {
        if (this.inputQueue.length > 0) {
            this.dir = this.inputQueue.shift();
        }

        const head = this.snake[0];
        let newX = head.x + this.dir.x;
        let newY = head.y + this.dir.y;

        // Boundary collision check
        if (this.wallMode) {
            if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
                this.triggerGameOver();
                return;
            }
        } else {
            // Wrap-around portal
            if (newX < 0) newX = this.gridSize - 1;
            else if (newX >= this.gridSize) newX = 0;
            if (newY < 0) newY = this.gridSize - 1;
            else if (newY >= this.gridSize) newY = 0;
        }

        // Self-collision check
        const hitSelf = this.snake.some((seg, idx) => {
            // Exclude the very tip of the tail since it will move unless growing
            if (idx === this.snake.length - 1) return false;
            return seg.x === newX && seg.y === newY;
        });

        if (hitSelf) {
            this.triggerGameOver();
            return;
        }

        const newHead = { x: newX, y: newY };
        this.snake.unshift(newHead);

        // Check Food Eaten
        let grew = false;
        if (this.food && newX === this.food.x && newY === this.food.y) {
            grew = true;
            const pts = 10 * this.multiplier;
            this.score += pts;
            this.applesEaten++;

            window.arcadeAudio.playEat();
            this.addParticles(newX, newY, '#ff2255', 18);
            this.addFloatingText(newX, newY, `+${pts}`, '#ff3366');

            this.spawnFood();

            // Spawn bonus every 4 apples
            if (this.applesEaten % 4 === 0) {
                this.spawnBonusItem();
            }

            this.onScoreUpdate(this.score, this.snake.length, this.multiplier);
        }

        // Check Bonus Item Eaten
        if (this.bonusItem && newX === this.bonusItem.x && newY === this.bonusItem.y) {
            window.arcadeAudio.playBonus();

            if (this.bonusItem.type === 'star') {
                const pts = 50 * this.multiplier;
                this.score += pts;
                this.addParticles(newX, newY, '#ffea00', 25);
                this.addFloatingText(newX, newY, `+${pts} STAR!`, '#ffea00');
            } else if (this.bonusItem.type === 'multiplier') {
                this.multiplier = 2;
                this.multiplierTimer = 600; // ~10 seconds
                const pts = 25;
                this.score += pts;
                this.addParticles(newX, newY, '#00e5ff', 25);
                this.addFloatingText(newX, newY, `2X BOOST!`, '#00e5ff');
            }

            this.bonusItem = null;
            this.onScoreUpdate(this.score, this.snake.length, this.multiplier);
        }

        if (!grew) {
            this.snake.pop();
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.isRunning = false;
        window.arcadeAudio.playExplosion();
        setTimeout(() => window.arcadeAudio.playGameOver(), 200);

        const head = this.snake[0];
        if (head) {
            this.addParticles(head.x, head.y, '#ff0055', 40);
        }

        this.onGameOver(this.score);
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Arcade Grid Background
        this.renderGrid(ctx);

        // 2. Draw Food & Items
        this.renderItems(ctx);

        // 3. Draw Snake
        this.renderSnake(ctx);

        // 4. Draw Particles
        this.renderParticles(ctx);

        // 5. Draw Floating Texts
        this.renderFloatingTexts(ctx);

        // 6. Draw HUD overlays (multiplier bar, bonus timer)
        this.renderHud(ctx);
    }

    renderGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= this.gridSize; i++) {
            const pos = i * this.tileSize;
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, this.canvas.height);
            ctx.stroke();

            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(this.canvas.width, pos);
            ctx.stroke();
        }

        // Draw glowing border if Solid Wall mode is ON
        if (this.wallMode) {
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
        } else {
            // Portal dashes
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    renderItems(ctx) {
        const time = performance.now() * 0.005;

        // Normal Food (Apple)
        if (this.food) {
            const cx = (this.food.x + 0.5) * this.tileSize;
            const cy = (this.food.y + 0.5) * this.tileSize;
            const radius = (this.tileSize * 0.38) + Math.sin(time * 3) * 1.5;

            ctx.save();
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 12;

            // Apple body
            ctx.fillStyle = '#ff2255';
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Little stem / leaf
            ctx.fillStyle = '#00ff66';
            ctx.fillRect(cx - 1, cy - radius - 3, 2, 4);
            ctx.restore();
        }

        // Bonus Item
        if (this.bonusItem) {
            const cx = (this.bonusItem.x + 0.5) * this.tileSize;
            const cy = (this.bonusItem.y + 0.5) * this.tileSize;

            ctx.save();
            if (this.bonusItem.type === 'star') {
                ctx.shadowColor = '#ffea00';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#fff033';
                this.drawStar(ctx, cx, cy, 5, this.tileSize * 0.45, this.tileSize * 0.22);
            } else if (this.bonusItem.type === 'multiplier') {
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#00e5ff';
                ctx.beginPath();
                ctx.arc(cx, cy, this.tileSize * 0.4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('2X', cx, cy);
            }
            ctx.restore();
        }
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = (Math.PI / 2) * 3;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            let x = cx + Math.cos(rot) * outerRadius;
            let y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    renderSnake(ctx) {
        if (this.snake.length === 0) return;

        ctx.save();
        const head = this.snake[0];

        // Body segments
        for (let i = this.snake.length - 1; i >= 1; i--) {
            const seg = this.snake[i];
            const px = seg.x * this.tileSize;
            const py = seg.y * this.tileSize;
            const pad = 2;

            // Electric cyan to emerald gradient
            const progress = i / this.snake.length;
            const r = Math.floor(0);
            const g = Math.floor(255 - progress * 50);
            const b = Math.floor(180 + progress * 75);

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.shadowColor = 'rgba(0, 255, 204, 0.4)';
            ctx.shadowBlur = 6;

            // Rounded segment
            this.roundRect(ctx, px + pad, py + pad, this.tileSize - pad * 2, this.tileSize - pad * 2, 4);
            ctx.fill();
        }

        // Head
        const hx = head.x * this.tileSize;
        const hy = head.y * this.tileSize;
        const pad = 1;

        ctx.fillStyle = '#00ffcc';
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 14;
        this.roundRect(ctx, hx + pad, hy + pad, this.tileSize - pad * 2, this.tileSize - pad * 2, 6);
        ctx.fill();

        // Pixel Eyes
        ctx.fillStyle = '#050a14';
        const eyeOffset = 6;
        const eyeSize = 3;
        let eye1X, eye1Y, eye2X, eye2Y;

        if (this.dir.x === 1) { // Right
            eye1X = hx + this.tileSize - eyeOffset; eye1Y = hy + eyeOffset - 1;
            eye2X = hx + this.tileSize - eyeOffset; eye2Y = hy + this.tileSize - eyeOffset;
        } else if (this.dir.x === -1) { // Left
            eye1X = hx + eyeOffset - eyeSize; eye1Y = hy + eyeOffset - 1;
            eye2X = hx + eyeOffset - eyeSize; eye2Y = hy + this.tileSize - eyeOffset;
        } else if (this.dir.y === -1) { // Up
            eye1X = hx + eyeOffset - 1; eye1Y = hy + eyeOffset - eyeSize;
            eye2X = hx + this.tileSize - eyeOffset; eye2Y = hy + eyeOffset - eyeSize;
        } else { // Down
            eye1X = hx + eyeOffset - 1; eye1Y = hy + this.tileSize - eyeOffset;
            eye2X = hx + this.tileSize - eyeOffset; eye2Y = hy + this.tileSize - eyeOffset;
        }

        ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
        ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);

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

    renderParticles(ctx) {
        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
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
            ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.restore();
    }

    renderHud(ctx) {
        // Multiplier Active Indicator
        if (this.multiplier > 1 && this.multiplierTimer > 0) {
            ctx.save();
            const barWidth = 140;
            const barHeight = 8;
            const x = this.canvas.width / 2 - barWidth / 2;
            const y = 14;

            const pct = this.multiplierTimer / 600;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 8;
            ctx.fillRect(x, y, barWidth * pct, barHeight);

            ctx.font = '9px "Press Start 2P", monospace';
            ctx.fillStyle = '#00e5ff';
            ctx.textAlign = 'center';
            ctx.fillText('2X BOOST', this.canvas.width / 2, y + 20);
            ctx.restore();
        }

        // Bonus Item Countdown
        if (this.bonusItem && this.bonusTimer > 0) {
            ctx.save();
            const pct = this.bonusTimer / this.bonusMaxTime;
            const cx = (this.bonusItem.x + 0.5) * this.tileSize;
            const cy = (this.bonusItem.y + 0.5) * this.tileSize;

            ctx.strokeStyle = this.bonusItem.type === 'star' ? '#ffea00' : '#00e5ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, this.tileSize * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            ctx.stroke();
            ctx.restore();
        }
    }
}

window.SnakeGame = SnakeGame;
