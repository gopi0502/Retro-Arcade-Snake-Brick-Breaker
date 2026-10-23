// Retro Arcade Main Controller & State Machine

class RetroArcadeApp {
    constructor() {
        this.canvas = document.getElementById('arcade-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = 'MENU'; // MENU, PLAYING_SNAKE, PLAYING_BRICK, PAUSED, GAME_OVER, VICTORY
        this.activeGameType = null; // 'snake' or 'brick'
        this.activeGame = null;

        // Settings
        this.crtEnabled = true;
        this.crtCurve = true;

        // High Score Entry State
        this.initials = ['A', 'A', 'A'];
        this.initialIndex = 0;
        this.currentPendingScore = 0;

        this.init();
    }

    init() {
        // Setup games
        this.snakeGame = new SnakeGame(this.canvas, {
            onScoreUpdate: (score, length, multiplier) => this.onSnakeScore(score, length, multiplier),
            onGameOver: (finalScore) => this.onGameEnd(finalScore, false)
        });

        this.brickGame = new BrickBreakerGame(this.canvas, {
            onScoreUpdate: (score, combo) => this.onBrickScore(score, combo),
            onLivesUpdate: (lives) => this.onBrickLives(lives),
            onLevelUpdate: (level) => this.onBrickLevel(level),
            onGameOver: (finalScore) => this.onGameEnd(finalScore, false),
            onVictory: (finalScore) => this.onGameEnd(finalScore, true)
        });

        this.bindEvents();
        this.loadSettings();
        this.updateAudioButtonState();
        this.showScreen('menu');

        // Start animation loop
        requestAnimationFrame((t) => this.loop(t));
    }

    loadSettings() {
        const savedCrt = localStorage.getItem('retro_arcade_crt');
        if (savedCrt !== null) {
            this.crtEnabled = savedCrt === 'true';
        }
        this.applyCrtSetting();
    }

    applyCrtSetting() {
        const crtScreen = document.getElementById('crt-screen');
        if (crtScreen) {
            crtScreen.classList.toggle('crt-active', this.crtEnabled);
        }
        const crtBtn = document.getElementById('btn-crt-toggle');
        if (crtBtn) {
            crtBtn.classList.toggle('active', this.crtEnabled);
            crtBtn.textContent = this.crtEnabled ? 'CRT: ON' : 'CRT: OFF';
        }
    }

    toggleCrt() {
        this.crtEnabled = !this.crtEnabled;
        localStorage.setItem('retro_arcade_crt', this.crtEnabled);
        this.applyCrtSetting();
        window.arcadeAudio.playSelect();
    }

    toggleAudio() {
        const isMuted = window.arcadeAudio.toggleMute();
        this.updateAudioButtonState();
        if (!isMuted) window.arcadeAudio.playCoin();
    }

    updateAudioButtonState() {
        const btn = document.getElementById('btn-audio-toggle');
        if (btn) {
            btn.classList.toggle('active', !window.arcadeAudio.muted);
            btn.innerHTML = window.arcadeAudio.muted ? '🔊 SOUND: OFF' : '🔊 SOUND: ON';
        }
    }

    bindEvents() {
        // Keyboard inputs
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse / Pointer on Canvas for Brick Breaker paddle
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state === 'PLAYING_BRICK' && this.activeGame) {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const canvasX = (e.clientX - rect.left) * scaleX;
                this.activeGame.setPaddleTarget(canvasX);
            }
        });

        this.canvas.addEventListener('click', () => {
            window.arcadeAudio.init();
            if (this.state === 'PLAYING_BRICK' && this.activeGame) {
                if (this.activeGame.ballStuckToPaddle) {
                    this.activeGame.launchBall();
                } else if (this.activeGame.paddle.hasLaser) {
                    this.activeGame.fireLasers();
                }
            }
        });

        // Touch handling on canvas for Brick Breaker
        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0 && this.state === 'PLAYING_BRICK' && this.activeGame) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const touchX = (e.touches[0].clientX - rect.left) * scaleX;
                this.activeGame.setPaddleTarget(touchX);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchstart', (e) => {
            window.arcadeAudio.init();
            if (this.state === 'PLAYING_BRICK' && this.activeGame) {
                if (this.activeGame.ballStuckToPaddle) {
                    this.activeGame.launchBall();
                } else if (this.activeGame.paddle.hasLaser) {
                    this.activeGame.fireLasers();
                }
            }
        });

        // Menu Buttons
        document.getElementById('btn-play-snake')?.addEventListener('click', () => this.startGame('snake'));
        document.getElementById('btn-play-brick')?.addEventListener('click', () => this.startGame('brick'));
        document.getElementById('btn-view-leaderboard')?.addEventListener('click', () => this.showLeaderboard());
        document.getElementById('btn-help')?.addEventListener('click', () => this.showHelp());

        // Header and Utility buttons
        document.getElementById('btn-audio-toggle')?.addEventListener('click', () => this.toggleAudio());
        document.getElementById('btn-crt-toggle')?.addEventListener('click', () => this.toggleCrt());
        document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('btn-coin')?.addEventListener('click', () => {
            window.arcadeAudio.playCoin();
            const coinBtn = document.getElementById('btn-coin');
            coinBtn.classList.add('coin-pressed');
            setTimeout(() => coinBtn.classList.remove('coin-pressed'), 300);
        });

        // In-game HUD buttons
        document.getElementById('btn-pause')?.addEventListener('click', () => this.togglePause());
        document.getElementById('btn-back-menu')?.addEventListener('click', () => this.returnToMenu());

        // Pause Modal buttons
        document.getElementById('btn-resume')?.addEventListener('click', () => this.togglePause());
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restartGame());
        document.getElementById('btn-exit-pause')?.addEventListener('click', () => this.returnToMenu());

        // Leaderboard modal buttons
        document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => this.showScreen('menu'));
        document.getElementById('tab-snake')?.addEventListener('click', () => this.renderLeaderboardTab('snake'));
        document.getElementById('tab-brick')?.addEventListener('click', () => this.renderLeaderboardTab('brick'));

        // Help modal button
        document.getElementById('btn-close-help')?.addEventListener('click', () => this.showScreen('menu'));

        // Game Over initials buttons
        document.getElementById('btn-init-up')?.addEventListener('click', () => this.cycleInitial(1));
        document.getElementById('btn-init-down')?.addEventListener('click', () => this.cycleInitial(-1));
        document.getElementById('btn-init-next')?.addEventListener('click', () => this.nextInitial());
        document.getElementById('btn-submit-score')?.addEventListener('click', () => this.submitScore());
        document.getElementById('btn-play-again')?.addEventListener('click', () => this.restartGame());
        document.getElementById('btn-gameover-menu')?.addEventListener('click', () => this.returnToMenu());

        // Mobile On-Screen D-Pad & Controls
        this.bindTouchControls();
    }

    bindTouchControls() {
        const dpadUp = document.getElementById('dpad-up');
        const dpadDown = document.getElementById('dpad-down');
        const dpadLeft = document.getElementById('dpad-left');
        const dpadRight = document.getElementById('dpad-right');

        const actionA = document.getElementById('btn-touch-a');
        const actionB = document.getElementById('btn-touch-b');

        const addPressEvent = (el, onDown, onUp) => {
            if (!el) return;
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                window.arcadeAudio.init();
                el.classList.add('pressed');
                if (onDown) onDown();
            });
            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                el.classList.remove('pressed');
                if (onUp) onUp();
            });
            el.addEventListener('mousedown', () => {
                window.arcadeAudio.init();
                el.classList.add('pressed');
                if (onDown) onDown();
            });
            el.addEventListener('mouseup', () => {
                el.classList.remove('pressed');
                if (onUp) onUp();
            });
        };

        // Up
        addPressEvent(dpadUp, () => {
            if (this.state === 'PLAYING_SNAKE') this.snakeGame.setDirection({ x: 0, y: -1 });
            else if (this.state === 'GAME_OVER') this.cycleInitial(1);
        });

        // Down
        addPressEvent(dpadDown, () => {
            if (this.state === 'PLAYING_SNAKE') this.snakeGame.setDirection({ x: 0, y: 1 });
            else if (this.state === 'GAME_OVER') this.cycleInitial(-1);
        });

        // Left
        addPressEvent(dpadLeft, () => {
            if (this.state === 'PLAYING_SNAKE') this.snakeGame.setDirection({ x: -1, y: 0 });
            else if (this.state === 'PLAYING_BRICK') this.brickGame.keys.left = true;
        }, () => {
            if (this.state === 'PLAYING_BRICK') this.brickGame.keys.left = false;
        });

        // Right
        addPressEvent(dpadRight, () => {
            if (this.state === 'PLAYING_SNAKE') this.snakeGame.setDirection({ x: 1, y: 0 });
            else if (this.state === 'PLAYING_BRICK') this.brickGame.keys.right = true;
        }, () => {
            if (this.state === 'PLAYING_BRICK') this.brickGame.keys.right = false;
        });

        // Button A (Launch / Action / Fire)
        addPressEvent(actionA, () => {
            if (this.state === 'PLAYING_BRICK') {
                if (this.brickGame.ballStuckToPaddle) this.brickGame.launchBall();
                else if (this.brickGame.paddle.hasLaser) this.brickGame.fireLasers();
            } else if (this.state === 'GAME_OVER') {
                this.nextInitial();
            }
        });

        // Button B (Pause / Menu)
        addPressEvent(actionB, () => {
            this.togglePause();
        });
    }

    handleKeyDown(e) {
        window.arcadeAudio.init();

        // Global shortcuts
        if (e.key === 'p' || e.key === 'P') {
            if (this.state === 'PLAYING_SNAKE' || this.state === 'PLAYING_BRICK' || this.state === 'PAUSED') {
                e.preventDefault();
                this.togglePause();
                return;
            }
        }

        if (e.key === 'Escape') {
            if (this.state === 'PAUSED') {
                this.togglePause();
            } else if (this.state === 'PLAYING_SNAKE' || this.state === 'PLAYING_BRICK') {
                this.togglePause();
            } else if (this.state === 'LEADERBOARDS' || this.state === 'HELP') {
                this.showScreen('menu');
            }
            return;
        }

        // Snake controls
        if (this.state === 'PLAYING_SNAKE') {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.snakeGame.setDirection({ x: 0, y: -1 });
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.snakeGame.setDirection({ x: 0, y: 1 });
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.snakeGame.setDirection({ x: -1, y: 0 });
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.snakeGame.setDirection({ x: 1, y: 0 });
                    break;
            }
        }

        // Brick Breaker controls
        if (this.state === 'PLAYING_BRICK') {
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.brickGame.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.brickGame.keys.right = true;
                    break;
                case ' ':
                    e.preventDefault();
                    if (this.brickGame.ballStuckToPaddle) {
                        this.brickGame.launchBall();
                    } else if (this.brickGame.paddle.hasLaser) {
                        this.brickGame.fireLasers();
                    }
                    break;
            }
        }

        // Game Over initials entry via typing or arrows
        if (this.state === 'GAME_OVER') {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.cycleInitial(1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.cycleInitial(-1);
            } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
                e.preventDefault();
                this.nextInitial();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.submitScore();
            } else if (/^[a-zA-Z0-9]$/.test(e.key)) {
                this.initials[this.initialIndex] = e.key.toUpperCase();
                this.updateInitialsDisplay();
                window.arcadeAudio.playSelect();
                this.nextInitial();
            }
        }
    }

    handleKeyUp(e) {
        if (this.state === 'PLAYING_BRICK') {
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.brickGame.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.brickGame.keys.right = false;
                    break;
            }
        }
    }

    startGame(type) {
        this.activeGameType = type;
        this.showScreen('game');

        const hudTitle = document.getElementById('hud-game-title');
        const hudExtraLabel = document.getElementById('hud-extra-label');
        const hudLevelWrap = document.getElementById('hud-level-wrap');
        const hudComboWrap = document.getElementById('hud-combo-wrap');

        const highScore = window.arcadeLeaderboard.getHighScore(type);
        document.getElementById('hud-high-score').textContent = highScore;

        if (type === 'snake') {
            hudTitle.textContent = '🐍 CYBER SNAKE';
            hudExtraLabel.textContent = 'LEN';
            hudLevelWrap.style.display = 'none';
            hudComboWrap.style.display = 'none';

            this.activeGame = this.snakeGame;
            this.state = 'PLAYING_SNAKE';
            this.snakeGame.start();
        } else {
            hudTitle.textContent = '🧱 NEON BRICK';
            hudExtraLabel.textContent = 'LIVES';
            hudLevelWrap.style.display = 'inline-block';
            hudComboWrap.style.display = 'inline-block';

            this.activeGame = this.brickGame;
            this.state = 'PLAYING_BRICK';
            this.brickGame.start();
        }
    }

    restartGame() {
        if (this.activeGameType) {
            this.startGame(this.activeGameType);
        }
    }

    togglePause() {
        if (this.state !== 'PLAYING_SNAKE' && this.state !== 'PLAYING_BRICK' && this.state !== 'PAUSED') return;

        window.arcadeAudio.playSelect();

        if (this.state === 'PAUSED') {
            this.state = this.activeGameType === 'snake' ? 'PLAYING_SNAKE' : 'PLAYING_BRICK';
            this.activeGame.isPaused = false;
            document.getElementById('pause-modal').classList.remove('active');
        } else {
            this.state = 'PAUSED';
            this.activeGame.isPaused = true;
            document.getElementById('pause-modal').classList.add('active');
        }
    }

    returnToMenu() {
        if (this.activeGame) {
            this.activeGame.isRunning = false;
            this.activeGame.isPaused = false;
        }
        document.getElementById('pause-modal').classList.remove('active');
        document.getElementById('gameover-modal').classList.remove('active');
        this.state = 'MENU';
        this.showScreen('menu');
        window.arcadeAudio.playSelect();
    }

    onSnakeScore(score, length, multiplier) {
        document.getElementById('hud-score').textContent = score;
        document.getElementById('hud-extra-val').textContent = length;
    }

    onBrickScore(score, combo) {
        document.getElementById('hud-score').textContent = score;
        document.getElementById('hud-combo').textContent = combo > 1 ? `x${combo}` : '--';
    }

    onBrickLives(lives) {
        document.getElementById('hud-extra-val').textContent = '❤️'.repeat(Math.max(0, lives));
    }

    onBrickLevel(level) {
        document.getElementById('hud-level').textContent = level;
    }

    onGameEnd(finalScore, isVictory = false) {
        this.state = 'GAME_OVER';
        this.currentPendingScore = finalScore;

        const isHigh = window.arcadeLeaderboard.isHighScore(this.activeGameType, finalScore);
        const modal = document.getElementById('gameover-modal');
        const titleEl = document.getElementById('gameover-title');
        const scoreEl = document.getElementById('gameover-score');
        const highscoreAlert = document.getElementById('gameover-new-highscore');
        const initialsSection = document.getElementById('initials-entry-section');

        titleEl.textContent = isVictory ? '🏆 VICTORY CLEAR!' : '💀 GAME OVER';
        scoreEl.textContent = finalScore;

        if (isHigh) {
            highscoreAlert.style.display = 'block';
            initialsSection.style.display = 'flex';
            this.initials = ['A', 'A', 'A'];
            this.initialIndex = 0;
            this.updateInitialsDisplay();
        } else {
            highscoreAlert.style.display = 'none';
            initialsSection.style.display = 'none';
        }

        modal.classList.add('active');
    }

    cycleInitial(delta) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!*?';
        let cur = chars.indexOf(this.initials[this.initialIndex]);
        if (cur === -1) cur = 0;

        let next = (cur + delta + chars.length) % chars.length;
        this.initials[this.initialIndex] = chars[next];
        this.updateInitialsDisplay();
        window.arcadeAudio.playSelect();
    }

    nextInitial() {
        this.initialIndex = (this.initialIndex + 1) % 3;
        this.updateInitialsDisplay();
        window.arcadeAudio.playSelect();
    }

    updateInitialsDisplay() {
        for (let i = 0; i < 3; i++) {
            const letterEl = document.getElementById(`initial-char-${i}`);
            if (letterEl) {
                letterEl.textContent = this.initials[i];
                letterEl.classList.toggle('selected', i === this.initialIndex);
            }
        }
    }

    submitScore() {
        const name = this.initials.join('');
        window.arcadeLeaderboard.addScore(this.activeGameType, name, this.currentPendingScore);
        window.arcadeAudio.playVictory();

        document.getElementById('initials-entry-section').style.display = 'none';
        document.getElementById('gameover-new-highscore').textContent = 'SCORE RECORDED!';

        setTimeout(() => {
            this.showLeaderboard(this.activeGameType);
        }, 800);
    }

    showLeaderboard(defaultTab = 'snake') {
        this.state = 'LEADERBOARDS';
        this.showScreen('leaderboard');
        this.renderLeaderboardTab(defaultTab);
        window.arcadeAudio.playSelect();
    }

    renderLeaderboardTab(game) {
        const tabSnake = document.getElementById('tab-snake');
        const tabBrick = document.getElementById('tab-brick');
        const listEl = document.getElementById('leaderboard-list');

        if (tabSnake) tabSnake.classList.toggle('active', game === 'snake');
        if (tabBrick) tabBrick.classList.toggle('active', game === 'brick');

        const scores = window.arcadeLeaderboard.getScores(game);
        listEl.innerHTML = '';

        scores.forEach((entry, idx) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.innerHTML = `
                <span class="rank">#${idx + 1}</span>
                <span class="name">${entry.name}</span>
                <span class="score">${entry.score}</span>
            `;
            listEl.appendChild(row);
        });

        window.arcadeAudio.playSelect();
    }

    showHelp() {
        this.state = 'HELP';
        this.showScreen('help');
        window.arcadeAudio.playSelect();
    }

    showScreen(screenName) {
        const screens = {
            menu: document.getElementById('menu-screen'),
            game: document.getElementById('game-screen'),
            leaderboard: document.getElementById('leaderboard-modal'),
            help: document.getElementById('help-modal')
        };

        Object.keys(screens).forEach(key => {
            if (screens[key]) {
                screens[key].classList.toggle('active', key === screenName);
            }
        });

        // Hide overlay modals if transitioning away from game over or pause
        if (screenName === 'menu') {
            document.getElementById('gameover-modal')?.classList.remove('active');
            document.getElementById('pause-modal')?.classList.remove('active');
        }
    }

    toggleFullscreen() {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            elem.requestFullscreen?.().catch(err => console.warn(err));
        } else {
            document.exitFullscreen?.();
        }
        window.arcadeAudio.playSelect();
    }

    loop(currentTime) {
        if (this.state === 'PLAYING_SNAKE' && this.snakeGame) {
            this.snakeGame.update(currentTime);
            this.snakeGame.render();
        } else if (this.state === 'PLAYING_BRICK' && this.brickGame) {
            this.brickGame.update(currentTime);
            this.brickGame.render();
        } else if (this.state === 'MENU') {
            // Draw animated arcade attractor screen background
            this.renderMenuAttractor(currentTime);
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    renderMenuAttractor(currentTime) {
        const ctx = this.ctx;
        ctx.fillStyle = '#050a14';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Perspective grid lines (synthwave grid)
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.lineWidth = 1;

        const horizon = this.canvas.height * 0.55;
        const speed = (currentTime * 0.05) % 30;

        // Horizontal scrolling lines
        for (let y = horizon; y < this.canvas.height; y += 15) {
            const p = (y - horizon) / (this.canvas.height - horizon);
            const lineY = horizon + Math.pow(p, 1.8) * (this.canvas.height - horizon);
            ctx.beginPath();
            ctx.moveTo(0, lineY);
            ctx.lineTo(this.canvas.width, lineY);
            ctx.stroke();
        }

        // Perspective lines radiating from vanishing point
        const vpX = this.canvas.width / 2;
        for (let x = -200; x <= this.canvas.width + 200; x += 50) {
            ctx.beginPath();
            ctx.moveTo(vpX, horizon);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        // Floating neon arcade logo & starfield
        const starTime = currentTime * 0.001;
        for (let i = 0; i < 30; i++) {
            const sx = (Math.sin(i * 123.45 + starTime) * 0.5 + 0.5) * this.canvas.width;
            const sy = (Math.cos(i * 678.90 + starTime) * 0.5 + 0.5) * horizon;
            ctx.fillStyle = i % 2 === 0 ? '#00e5ff' : '#ff0077';
            ctx.fillRect(sx, sy, 2, 2);
        }

        ctx.restore();
    }
}

// Start app once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.retroArcadeApp = new RetroArcadeApp();
});
