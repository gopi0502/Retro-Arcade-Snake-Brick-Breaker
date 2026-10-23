# 🕹️ Retro Arcade: Cyber Snake & Neon Brick Breaker

An authentic 1980s retro arcade cabinet experience built with **HTML5 Canvas**, **Vanilla JavaScript**, and procedural **Web Audio API 8-bit sound synthesis**.

Zero external frameworks, zero build steps, and zero asset loading dependencies — runs instantly and seamlessly in any modern web browser!

---

## 🚀 Quick Start / How to Run

1. Open `index.html` directly in your favorite web browser (double-click the file or drag it into Chrome/Edge/Firefox/Safari).
2. Or serve it via any local web server:
   ```bash
   # Python
   python -m http.server 8000

   # Node.js
   npx serve .
   ```
3. Click or press any key to power up the audio synthesizer, then select your game!

---

## 🎮 Included Games

### 1. 🐍 Cyber Snake
- **Retro Grid**: Smooth 60fps movement on a neon coordinate grid.
- **Dynamic Food Types**:
  - 🍎 **Red Apple**: +10 pts, increases snake length.
  - ⭐ **Golden Star**: +50 pts, timed bonus item.
  - ⚡ **Cyan Speed Orb**: +25 pts, activates a temporary **2X Score Multiplier**!
- **Speed Scaling**: Game speeds up as the snake grows.
- **Controls**:
  - `Arrow Keys` or `W`, `A`, `S`, `D`: Steer snake.
  - Mobile: On-screen virtual D-Pad.
  - `P`: Pause / Resume.

### 2. 🧱 Neon Brick Breaker
- **5 Multi-Tier Stages**:
  - Stage 1: Classic Neon Rainbow
  - Stage 2: Space Invader Formation
  - Stage 3: The Bunker & Fortress (Reinforced 2-Hit bricks)
  - Stage 4: Diamond Cascade (TNT Explosive cores)
  - Stage 5: Procedural Infinity Wave
- **Exciting Brick Types**:
  - Standard Bricks (1-hit neon color tiers)
  - Reinforced Bricks (2-hits, displays physical damage cracks)
  - 💣 **TNT Explosive Bricks**: Detonates adjacent 3x3 bricks in a chain-reaction fireball!
- **Falling Power-Up Capsules**:
  - `M` — **Multi-Ball**: Spawns 2 additional balls simultaneously!
  - `W` — **Wide Paddle**: Expands paddle width by 50% for 12 seconds.
  - `F` — **Fireball**: Comet ball punches right through bricks without bouncing.
  - `L` — **Twin Laser Cannon**: Paddle mounts dual lasers fired with `Spacebar` / `Click`!
  - `S` — **Energy Shield**: Bottom barrier prevents ball loss.
  - `+` — **Extra Life**: Adds a bonus heart.
- **Controls**:
  - `◀` `▶` or `A` / `D` or `Mouse Movement` / `Touch Drag`: Move paddle.
  - `Spacebar` or `Mouse Click` or `Virtual Button A`: Launch ball / Fire lasers.
  - `P` or `Virtual Button B`: Pause / Resume.

---

## ✨ Arcade Cabinet Features

- **📺 CRT Screen Simulation**: Authentic barrel curvature, scanlines, phosphor glow, and glass glare (toggleable with `CRT: ON/OFF`).
- **🔊 Procedural 8-Bit Chiptune Synthesizer**: Uses the Web Audio API to procedurally generate all retro sounds (no external mp3/wav files required):
  - Insert Coin ding (B5 -> E6 dual chime)
  - Snake apple eat chirps and fanfare arpeggios
  - Paddle bounce & brick crunch tones
  - Explosions (filtered white-noise decay)
  - Laser blaster sweeps
  - Game Over & Level Complete fanfares
  - Mute/Unmute toggle saved in browser storage.
- **🏆 Hall of Fame Leaderboard**:
  - Classic 3-letter arcade initials entry screen (`AAA`, `ACE`, `NEO`).
  - Persistent high scores stored in `localStorage`.
- **🪙 Interactive Coin Slot**: Press the "INSERT COIN" 25¢ slot for an authentic arcade ding.
- **📱 Mobile Responsive**: Includes full on-screen tactile D-Pad, coin slot, and retro arcade A/B buttons for phones and tablets.

---

## 📁 Project Structure

```
retro-arcade/
├── index.html            # Main HTML5 Arcade Cabinet shell & views
├── styles.css            # Retro synthwave CSS, CRT scanline shaders & cabinet UI
├── README.md             # Documentation & Guide
└── js/
    ├── audio.js          # Procedural Web Audio API sound effect synthesizer
    ├── leaderboard.js    # Persistent localStorage high scores & initials manager
    ├── snake.js          # Complete Cyber Snake engine with particle physics
    ├── brickbreaker.js   # Neon Brick Breaker engine, multi-stage levels & power-ups
    └── main.js           # Game controller, state machine, input hub & attractor loop
```
