/**
 * LAUNCHER CORE ENGINE
 * Extracted logic for LosPapus Launcher
 * Handles: Audio, Economy, Auth, JARVIS, IPC Listeners
 */

console.log('ENGINE: launcherEngine.js initializing...');

// --- MÓDULO NEURAL SOUNDSCAPE 🌌🔊 ---
class NeuralSoundscape {
    constructor() {
        this.ctx = null;
        this.ambientOsc = null;
        this.ambientGain = null;
        this.lfo = null;
        this.introAudio = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playIntro(url = '../assets/intro.mp3') {
        try {
            this.introAudio = new Audio(url);
            this.introAudio.volume = 0;
            this.introAudio.loop = true;
            const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8') * 0.4;
            this.introAudio.play().catch(e => console.warn('Audio Intro blocked or missing:', e));
            
            let v = 0;
            const fadeIn = setInterval(() => {
                v += 0.05;
                if (v >= volume) { v = volume; clearInterval(fadeIn); }
                this.introAudio.volume = v;
            }, 100);
        } catch(e) {}
    }

    stopIntro() {
        if (!this.introAudio) return;
        let v = this.introAudio.volume;
        const fadeOut = setInterval(() => {
            v -= 0.05;
            if (v <= 0) {
                v = 0;
                clearInterval(fadeOut);
                this.introAudio.pause();
                this.introAudio = null;
            } else {
                this.introAudio.volume = v;
            }
        }, 100);
    }

    startAmbient() {
        this.init();
        if (this.ambientOsc) return;

        const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8') * 0.15;
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 4);
        this.ambientGain.connect(this.ctx.destination);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, this.ctx.currentTime);
        filter.Q.setValueAtTime(5, this.ctx.currentTime);
        filter.connect(this.ambientGain);

        this.ambientOsc = this.ctx.createOscillator();
        this.ambientOsc.type = 'sawtooth';
        this.ambientOsc.frequency.setValueAtTime(40, this.ctx.currentTime);
        this.ambientOsc.connect(filter);
        this.ambientOsc.start();

        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(80, this.ctx.currentTime);
        this.lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        this.lfo.start();
    }

    stopAmbient() {
        if (!this.ambientGain) return;
        this.ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
        setTimeout(() => {
            if (this.ambientOsc) { this.ambientOsc.stop(); this.ambientOsc = null; }
            if (this.lfo) { this.lfo.stop(); this.lfo = null; }
        }, 2000);
    }

    playLaunchSequence() {
        this.init();
        const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8') * 0.5;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.5);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 6);
        g.connect(this.ctx.destination);

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 4);
        osc.connect(g);
        osc.start();
        osc.stop(this.ctx.currentTime + 6);
        
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 4);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(volume * 0.3, this.ctx.currentTime + 1);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 5);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start();
    }
}

// --- MÓDULO ECONOMÍA Y TEMAS (PAPU-COINS) 💎🎨 ---
class PapuEconomy {
    constructor() {
        this.coins = parseInt(localStorage.getItem('papuCoins') || '0');
        this.ownedThemes = JSON.parse(localStorage.getItem('ownedThemes') || '["original"]');
        this.activeTheme = localStorage.getItem('activeTheme') || 'original';
        this.themes = {
            original: { name: 'Original Neon', price: 0, colors: { '--primary': '#ffb7c5', '--secondary': '#ff8c4a', '--primary-glow': 'rgba(255, 183, 197, 0.5)' } },
            toxic: { name: 'Toxic Slime', price: 50, colors: { '--primary': '#a2ff00', '--secondary': '#00ff88', '--primary-glow': 'rgba(162, 255, 0, 0.5)' } },
            obsidian: { name: 'Obsidian Stealth', price: 100, colors: { '--primary': '#7d5fff', '--secondary': '#3d3d3d', '--primary-glow': 'rgba(125, 95, 255, 0.5)' } },
            emerald: { name: 'Emerald Flex', price: 120, colors: { '--primary': '#2ecc71', '--secondary': '#f1c40f', '--primary-glow': 'rgba(46, 204, 113, 0.5)' } },
            glacier: { name: 'Frozen Glacier', price: 150, colors: { '--primary': '#3ae3ff', '--secondary': '#ffffff', '--primary-glow': 'rgba(58, 227, 255, 0.5)' } },
            solar: { name: 'Solar Flare', price: 150, colors: { '--primary': '#ff4d4d', '--secondary': '#ffcc00', '--primary-glow': 'rgba(255, 77, 77, 0.5)' } },
            cyberpunk: { name: 'Cyberpunk Night', price: 200, colors: { '--primary': '#ff00ff', '--secondary': '#00ffff', '--primary-glow': 'rgba(255, 0, 255, 0.5)' } },
            nether: { name: 'Nether Wastes', price: 250, colors: { '--primary': '#9b0000', '--secondary': '#ff6b6b', '--primary-glow': 'rgba(155, 0, 0, 0.5)' } },
            end: { name: 'End Dimension', price: 300, colors: { '--primary': '#bf00ff', '--secondary': '#000000', '--primary-glow': 'rgba(191, 0, 255, 0.5)' } },
            godly: { name: 'Golden Apple', price: 500, colors: { '--primary': '#f1c40f', '--secondary': '#ffffff', '--primary-glow': 'rgba(241, 196, 15, 0.5)' } }
        };
    }

    init() {
        this.applyTheme(this.activeTheme);
        setInterval(() => { this.addCoins(10); }, 5 * 60 * 1000);
    }

    addCoins(amount) {
        this.coins += amount;
        localStorage.setItem('papuCoins', this.coins);
        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('economy-updated', { detail: { coins: this.coins } }));
    }

    applyTheme(id) {
        const theme = this.themes[id];
        if (!theme) return;
        this.activeTheme = id;
        localStorage.setItem('activeTheme', id);
        Object.keys(theme.colors).forEach(key => document.documentElement.style.setProperty(key, theme.colors[key]));
    }

    buyTheme(id) {
        const theme = this.themes[id];
        if (this.ownedThemes.includes(id)) { this.applyTheme(id); return true; }
        if (this.coins >= theme.price) {
            this.coins -= theme.price;
            this.ownedThemes.push(id);
            localStorage.setItem('papuCoins', this.coins);
            localStorage.setItem('ownedThemes', JSON.stringify(this.ownedThemes));
            this.applyTheme(id);
            return true;
        }
        return false;
    }
}

// Initialize Global Engine Objects
window.Soundscape = new NeuralSoundscape();
window.PapuStore = new PapuEconomy();

// --- JARVIS PROTOCOLO ---
window.speak = (text) => {
    return new Promise((resolve) => {
        try {
            const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8');
            console.log('🤖 JARVIS:', text);

            const playNeuralVoice = (txt) => {
                return new Promise((res, rej) => {
                    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(txt)}&tl=es&client=tw-ob`;
                    const audio = new Audio(url);
                    audio.volume = volume;
                    audio.onended = res;
                    audio.onerror = rej;
                    audio.play().catch(rej);
                    setTimeout(res, 6000);
                });
            };

            const playSystemVoice = (txt) => {
                return new Promise((res) => {
                    if (!window.speechSynthesis) return res();
                    window.speechSynthesis.cancel();
                    const msg = new SpeechSynthesisUtterance(txt);
                    msg.pitch = 0.9; msg.rate = 1.05; msg.volume = volume;
                    msg.onend = res;
                    window.speechSynthesis.speak(msg);
                    setTimeout(res, 5000);
                });
            };

            playNeuralVoice(text).then(resolve).catch(() => playSystemVoice(text).then(resolve));
        } catch (e) { resolve(); }
    });
};

// --- AUDIO & UI UTILS ---
window.playClick = () => {
    try {
        const audio = document.getElementById('clickAudio');
        if (audio) {
            audio.currentTime = 0;
            audio.volume = parseFloat(localStorage.getItem('sysVolume') || '0.8');
            audio.play().catch(e => console.warn("Audio play blocked:", e.message));
        }
    } catch (e) { /* Silent fail for audio */ }
};

// --- AUTH UTILS --- (Logic handled in appCore.js, adding bridge functions here if needed)
window.switchAccount = (uuid) => {
    window.electronAPI.getAccounts();
    window.electronAPI.onAccountsListOnce((accounts) => {
        const acc = accounts.find(a => a.uuid === uuid);
        if (acc) {
            localStorage.setItem('activeAccount', JSON.stringify(acc));
            location.reload();
        }
    });
};

window.setActive = window.switchAccount;

window.playClick = () => {
    try {
        const audio = document.getElementById('clickAudio');
        if (audio) {
            audio.volume = parseFloat(localStorage.getItem('sysVolume') || '0.8');
            audio.currentTime = 0; audio.play().catch(e => {});
        }
    } catch(e) {}
};

// --- CORE INITIALIZATION ---
window.initEngine = () => {
    console.log('ENGINE: Core systems initializing...');
    
    // Load Settings & Translations
    try {
        window.settings = window.electronAPI.getSettings();
        window.translations = window.electronAPI.getTranslations();
        const currentLang = localStorage.getItem('lang') || 'es';
        window.t = (key) => {
            if (!window.translations || !window.translations[currentLang]) return key;
            return window.translations[currentLang][key] || key;
        };
        // Mod Translations removed as they are no longer used
    } catch (e) { console.error('ENGINE: Data load fail', e); }

    window.PapuStore.init();
};

// IPC Result Listeners (Functional Part)
if (window.electronAPI) {
    window.electronAPI.onLaunchProgress((data) => {
        window.dispatchEvent(new CustomEvent('engine-launch-progress', { detail: data }));
        if (!window.ENGINE_LAUNCHING) {
            const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
            window.speak(`Desconectando sistemas. Buen viaje, ${acc ? acc.name : 'Piloto'}.`);
            window.Soundscape.stopAmbient();
            window.ENGINE_LAUNCHING = true;
        }
    });

    window.electronAPI.onLaunchFinished(() => {
        window.ENGINE_LAUNCHING = false;
        window.dispatchEvent(new CustomEvent('engine-launch-finished'));
    });

    window.electronAPI.onLaunchError((err) => {
        window.ENGINE_LAUNCHING = false;
        window.dispatchEvent(new CustomEvent('engine-launch-error', { detail: err }));
    });

    window.electronAPI.onGameStarted(() => {
        window.dispatchEvent(new CustomEvent('engine-game-started'));
        setTimeout(() => window.electronAPI.closeWindow(), 3500);
    });

    window.electronAPI.onSyncProgress((data) => {
        window.dispatchEvent(new CustomEvent('engine-sync-progress', { detail: data }));
    });

    window.electronAPI.onSyncFinished(() => {
        window.dispatchEvent(new CustomEvent('engine-sync-finished'));
    });

    window.electronAPI.onSyncError((err) => {
        window.dispatchEvent(new CustomEvent('engine-sync-error', { detail: err }));
    });

    window.electronAPI.onUpdateAvailable((data) => {
        window.dispatchEvent(new CustomEvent('engine-update-available', { detail: data }));
    });
}
