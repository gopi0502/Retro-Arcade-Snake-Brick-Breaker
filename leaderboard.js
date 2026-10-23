// Leaderboard manager for Snake and Brick Breaker
// Saves high scores to localStorage with authentic 3-letter initials.

class ArcadeLeaderboard {
    constructor() {
        this.STORAGE_KEY_PREFIX = 'retro_arcade_scores_';
        this.MAX_SCORES = 5;

        this.defaultScores = {
            snake: [
                { name: 'ACE', score: 350, date: '1984-06-12' },
                { name: 'NEO', score: 280, date: '1984-07-04' },
                { name: 'PIX', score: 200, date: '1984-08-19' },
                { name: 'FOX', score: 140, date: '1984-09-21' },
                { name: 'MAX', score: 90,  date: '1984-10-15' }
            ],
            brick: [
                { name: 'HAL', score: 2400, date: '1986-04-20' },
                { name: 'ARC', score: 1950, date: '1986-05-18' },
                { name: 'WIZ', score: 1500, date: '1986-06-30' },
                { name: 'CYB', score: 1100, date: '1986-08-14' },
                { name: 'RAD', score: 750,  date: '1986-09-02' }
            ]
        };

        this.initStorage();
    }

    initStorage() {
        ['snake', 'brick'].forEach(game => {
            const key = this.STORAGE_KEY_PREFIX + game;
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(this.defaultScores[game]));
            }
        });
    }

    getScores(game) {
        try {
            const key = this.STORAGE_KEY_PREFIX + game;
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.sort((a, b) => b.score - a.score);
                }
            }
        } catch (e) {
            console.error('Failed to load scores:', e);
        }
        return [...this.defaultScores[game]];
    }

    getHighScore(game) {
        const scores = this.getScores(game);
        return scores.length > 0 ? scores[0].score : 0;
    }

    isHighScore(game, score) {
        if (score <= 0) return false;
        const scores = this.getScores(game);
        if (scores.length < this.MAX_SCORES) return true;
        return score > scores[scores.length - 1].score;
    }

    addScore(game, name, score) {
        const scores = this.getScores(game);
        const cleanName = (name || 'AAA').toUpperCase().slice(0, 3).padEnd(3, '_');
        const entry = {
            name: cleanName,
            score: Math.floor(score),
            date: new Date().toISOString().split('T')[0]
        };

        scores.push(entry);
        scores.sort((a, b) => b.score - a.score);
        const trimmed = scores.slice(0, this.MAX_SCORES);

        try {
            localStorage.setItem(this.STORAGE_KEY_PREFIX + game, JSON.stringify(trimmed));
        } catch (e) {
            console.error('Failed to save score:', e);
        }

        return trimmed.findIndex(s => s === entry) + 1; // 1-based rank
    }

    resetScores(game) {
        if (game) {
            localStorage.setItem(this.STORAGE_KEY_PREFIX + game, JSON.stringify(this.defaultScores[game]));
        } else {
            this.initStorage();
        }
    }
}

window.arcadeLeaderboard = new ArcadeLeaderboard();
