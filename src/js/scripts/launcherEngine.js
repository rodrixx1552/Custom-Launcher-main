/**
 * LAUNCHER CORE ENGINE
 * Extracted logic for LosPapus Launcher
 * Handles: Audio, Economy, Auth, JARVIS, IPC Listeners
 */

console.log('ENGINE: launcherEngine.js initializing...');

// =====================================================================
// AUDIO SYSTEM — Navigation SFX, Notifications, Seasonal Music
// =====================================================================

// Tab SFX: each tab gets a unique musical tone (Web Audio API — no files needed)
const TAB_TONES = {
    play:     { freq: 523, type: 'sine',     ms: 120 }, // C5
    accounts: { freq: 659, type: 'sine',     ms: 100 }, // E5
    mods:     { freq: 784, type: 'triangle', ms: 110 }, // G5
    skins:    { freq: 880, type: 'sine',     ms: 100 }, // A5
    market:   { freq: 1047,type: 'sine',     ms: 120 }, // C6
    settings: { freq: 392, type: 'triangle', ms: 130 }, // G4
};

window.playTabSFX = (tabName) => {
    try {
        const sfxVol = parseFloat(localStorage.getItem('sfxVolume') ?? '0.5');
        if (sfxVol === 0) return;
        const tone = TAB_TONES[tabName];
        if (!tone) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.freq, ctx.currentTime);
        gain.gain.setValueAtTime(sfxVol * 0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tone.ms / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + tone.ms / 1000);
    } catch(e) {}
};

// Notification SFX — double-ping suave
window.playNotifSFX = () => {
    try {
        const sfxVol = parseFloat(localStorage.getItem('sfxVolume') ?? '0.5');
        if (sfxVol === 0) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [880, 1100].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startAt = ctx.currentTime + i * 0.12;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startAt);
            gain.gain.setValueAtTime(sfxVol * 0.2, startAt);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startAt);
            osc.stop(startAt + 0.15);
        });
    } catch(e) {}
};

// Clean UI Click/Tick (replaces old click.mp3)
window.playClick = () => {
    try {
        const sfxVol = parseFloat(localStorage.getItem('sfxVolume') ?? '0.5');
        if (sfxVol === 0) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05); // Snap pitch down for click sound
        gain.gain.setValueAtTime(sfxVol * 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
};

// =====================================================================
// SEASONAL MUSIC PLAYER — Playlist & Shuffle (Spotify-like)
// =====================================================================
let _seasonalAudio = null;
let _playlist = [];
let _currentIndex = -1;

window.loadSeasonalMusic = async () => {
    try {
        const newsUrl = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/news.json';
        const res = await fetch(newsUrl + '?t=' + Date.now());
        const data = await res.json();

        // Handle both formats: [...] (legacy) or { news: [], playlist: [] } (new)
        if (processPlaylistData(data)) {
            return; // Successfully loaded from remote
        }
        
        // --- LOCAL FALLBACK (if remote has no music yet) ---
        console.log('[SeasonalMusic] Remote has no music data. Checking local fallback...');
        const localRes = await fetch('../news.json');
        const localData = await localRes.json();
        processPlaylistData(localData);

    } catch(e) {
        console.warn('[SeasonalMusic] Could not load playlist:', e.message);
        // Fallback for full fetch failure
        try {
            const localRes = await fetch('../news.json');
            const localData = await localRes.json();
            processPlaylistData(localData);
        } catch(ee) {}
    }
};

/**
 * Helper to parse news/playlist data from JSON
 */
function processPlaylistData(data) {
    if (data.playlist && Array.isArray(data.playlist)) {
        _playlist = data.playlist;
    } else if (data.music_url) {
        _playlist = [{ name: 'Default Seasonal Music', url: data.music_url }];
    } else {
        return false;
    }

    if (_playlist.length > 0) {
        window.playRandomTrack();
        return true;
    }
    return false;
}

window.playRandomTrack = () => {
    if (!_playlist.length) return;

    // Pick a random track that isn't the current one (if possible)
    let nextIndex;
    if (_playlist.length > 1) {
        do {
            nextIndex = Math.floor(Math.random() * _playlist.length);
        } while (nextIndex === _currentIndex);
    } else {
        nextIndex = 0;
    }

    _currentIndex = nextIndex;
    const track = _playlist[_currentIndex];
    
    console.log('[SeasonalMusic] Now playing:', track.name);
    
    if (_seasonalAudio) {
        // Fade out
        const audioToClear = _seasonalAudio;
        let fadeOut = audioToClear.volume;
        const interval = setInterval(() => {
            fadeOut -= 0.05;
            if (fadeOut <= 0) {
                fadeOut = 0;
                audioToClear.pause();
                clearInterval(interval);
            }
            audioToClear.volume = fadeOut;
        }, 50);
    }

    const musicVol = parseFloat(localStorage.getItem('musicVolume') ?? '0.3');
    _seasonalAudio = new Audio(track.url);
    _seasonalAudio.volume = 0;
    _seasonalAudio.play().catch(e => console.warn("Music play blocked:", e.message));

    // Fade in
    let fadeIn = 0;
    const intervalIn = setInterval(() => {
        fadeIn += 0.02;
        if (fadeIn >= musicVol) {
            fadeIn = musicVol;
            clearInterval(intervalIn);
        }
        if (_seasonalAudio) _seasonalAudio.volume = fadeIn;
    }, 100);

    // Auto-play next track
    _seasonalAudio.onended = () => window.playRandomTrack();

    // Dispatch event for UI
    window.dispatchEvent(new CustomEvent('music-updated', { 
        detail: { name: track.name, index: _currentIndex, total: _playlist.length } 
    }));
};

window.skipTrack = () => {
    console.log('[SeasonalMusic] User skipped track.');
    window.playRandomTrack();
};

window.toggleMusic = () => {
    if (!_seasonalAudio) return false;
    
    if (_seasonalAudio.paused) {
        _seasonalAudio.play().catch(() => {});
        // Fade in
        const musicVol = parseFloat(localStorage.getItem('musicVolume') ?? '0.3');
        let fadeIn = 0;
        const intervalIn = setInterval(() => {
            fadeIn += 0.05;
            if (fadeIn >= musicVol) { fadeIn = musicVol; clearInterval(intervalIn); }
            _seasonalAudio.volume = fadeIn;
        }, 50);
        return true; 
    } else {
        // Fade out then pause
        let fadeOut = _seasonalAudio.volume;
        const intervalOut = setInterval(() => {
            fadeOut -= 0.05;
            if (fadeOut <= 0) {
                fadeOut = 0;
                _seasonalAudio.pause();
                clearInterval(intervalOut);
            }
            _seasonalAudio.volume = fadeOut;
        }, 50);
        return false;
    }
};

window.updateMusicVolume = (val) => {
    const v = parseFloat(val);
    localStorage.setItem('musicVolume', v);
    if (_seasonalAudio) _seasonalAudio.volume = v;
};

window.updateSfxVolume = (val) => {
    const v = parseFloat(val);
    localStorage.setItem('sfxVolume', v);
    // [REPLACED] old clickAudio volume logic — sfxVolume is now used in synthetic sounds
};

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
            // Fail silently if the audio file doesn't exist (intro.mp3 is optional)
            this.introAudio.onerror = () => {
                console.warn('Soundscape: intro.mp3 not found — skipping intro audio.');
                this.introAudio = null;
            };
            const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8') * 0.4;
            this.introAudio.play().catch(e => console.warn('Audio Intro blocked or missing:', e));
            
            let v = 0;
            const fadeIn = setInterval(() => {
                if (!this.introAudio) { clearInterval(fadeIn); return; }
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

        // [FIX 1] Offline Coin Accumulation (Anti-Farm: max 1 hour cap)
        const COINS_PER_5MIN = 10;
        const MAX_OFFLINE_MINUTES = 60; // Máximo 1 hora de coins offline
        const lastSeen = parseInt(localStorage.getItem('lastSeenTimestamp') || '0');
        const now = Date.now();
        if (lastSeen > 0) {
            const minutesElapsed = Math.floor((now - lastSeen) / (1000 * 60));
            const intervals = Math.min(Math.floor(minutesElapsed / 5), MAX_OFFLINE_MINUTES / 5);
            if (intervals > 0) {
                const earned = intervals * COINS_PER_5MIN;
                console.log(`[PapuStore] Offline bonus: +${earned} coins (${intervals * 5} min elapsed)`);
                this.addCoins(earned);
            }
        }
        localStorage.setItem('lastSeenTimestamp', now);

        // Ganar coins mientras el launcher esté abierto (cada 5 minutos)
        setInterval(() => {
            this.addCoins(COINS_PER_5MIN);
            localStorage.setItem('lastSeenTimestamp', Date.now());
        }, 5 * 60 * 1000);
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

// Expose themes globally so appCore.js (Theme Market) can reference them.
// This is the single source of truth for all available themes.
window.LAUNCHER_THEMES = window.PapuStore.themes;

// --- JARVIS PROTOCOLO ---
window.speak = (text) => {
    return new Promise(async (resolve) => {
        try {
            const sysVol = parseFloat(localStorage.getItem('sysVolume') || '0.8');
            const jarvisVoice = localStorage.getItem('jarvisVoice') || 'female';
            
            console.log('🤖 JARVIS (Requesting Neural AI):', text);

            // --- MAPPING DE VOCES (TikTok Meme Edition) ---
            const voiceProfiles = {
                'female':    { neural: 'tk_es_female_f6',     local: 'Google español' },
                'male':      { neural: 'tk_es_mx_002',        local: 'Google español de Estados Unidos' },
                'ghostface': { neural: 'tk_en_us_ghostface',  local: 'Microsoft Zira Desktop' },
                'epic':      { neural: 'tk_en_us_006',        local: 'Google español' },
                'robotic':   { neural: 'tk_en_us_006',        local: 'Microsoft Zira Desktop' }
            };
            const selectedNeural = voiceProfiles[jarvisVoice]?.neural || voiceProfiles.female.neural;

            // Step 1: Try Premium Neural AI (requires internet)
            if (window.electronAPI && window.electronAPI.generateSpeech) {
                try {
                    const base64Audio = await window.electronAPI.generateSpeech(text, selectedNeural);
                    if (base64Audio) {
                        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
                        audio.volume = sysVol;
                        audio.onended = resolve;
                        audio.play().catch(e => {
                            console.warn('TTS: DataURI playback failed, falling back...', e);
                            fallbackToOSVoice(text, resolve);
                        });
                        // Safety timeout if audio fails to end
                        setTimeout(resolve, 8000);
                        return;
                    }
                } catch (err) {
                    console.warn('TTS: Neural AI failed, falling back to OS...', err);
                }
            }

            // Step 2: Fallback to Local OS Voices (Offline/Error)
            fallbackToOSVoice(text, resolve);

        } catch (e) { 
            console.error('TTS: Critical failure', e);
            resolve(); 
        }
    });
};

/**
 * Fallback to local OS-installed voices (Robotic)
 */
function fallbackToOSVoice(text, resolve) {
    const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8');
    const speakWhenReady = (voices) => {
        const voiceId = localStorage.getItem('jarvisVoice') || 'female';
        const msg = new SpeechSynthesisUtterance(text);
        
        const PROFILES = {
            female:  { pitch: 1.1, rate: 1.1 },
            male:    { pitch: 0.1, rate: 0.9 },
            robotic: { pitch: 0.5, rate: 1.3 }
        };
        
        msg.pitch = PROFILES[voiceId].pitch;
        msg.rate = PROFILES[voiceId].rate;
        msg.volume = volume;
        msg.onend  = resolve;
        msg.onerror = () => resolve(); 
        window.speechSynthesis.cancel();

        let selectedVoice = null;
        const esVoices = voices.filter(v => v.lang.startsWith('es'));
        const enVoices = voices.filter(v => v.lang.startsWith('en'));

        if (voiceId === 'male') {
            selectedVoice = esVoices.find(v => v.name.includes('Pablo') || v.name.toLowerCase().includes('male'))
                         || esVoices[0];
        } else if (voiceId === 'robotic') {
            selectedVoice = enVoices.find(v => v.name.includes('Zira')) || enVoices[0];
        } else {
            selectedVoice = esVoices.find(v => v.name.includes('Sabina') || v.name.includes('Helena')) 
                         || esVoices[0];
        }

        if (selectedVoice) msg.voice = selectedVoice;
        window.speechSynthesis.speak(msg);
        setTimeout(resolve, 6000);
    };

    let voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
        speakWhenReady(voices);
    } else {
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            speakWhenReady(voices);
            window.speechSynthesis.onvoiceschanged = null;
        };
        setTimeout(resolve, 2000);
    }
}



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

// Note: window.setActive is defined in appCore.js with the full implementation.
// window.switchAccount is available as an alias for legacy calls.


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
