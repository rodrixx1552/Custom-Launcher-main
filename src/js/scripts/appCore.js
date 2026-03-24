console.log('UI: appCore.js loading...');

// GLOBAL ERROR REPORTING
window.onerror = function(message, source, lineno, colno, error) {
    const err = `UI ERROR: ${message} at ${source}:${lineno}:${colno}`;
    console.error(err);
    if (window.electronAPI && window.electronAPI.logError) {
        window.electronAPI.logError(err);
    }
};

window.onunhandledrejection = function(event) {
    const err = `UI PROMISE REJECTION: ${event.reason}`;
    console.error(err);
    if (window.electronAPI && window.electronAPI.logError) {
        window.electronAPI.logError(err);
    }
};

// --- MÓDULO NEURAL SOUNDSCAPE 🌌🔊 ---
class NeuralSoundscape {
    constructor() {
        this.ctx = null;
        this.ambientOsc = null;
        this.ambientGain = null;
        this.lfo = null;
        this.introAudio = null; // Para música real
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
            
            // Fade in gradual
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
        // Fade out suave
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

        const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8') * 0.15; // Muy sutil
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 4);
        this.ambientGain.connect(this.ctx.destination);

        // Filtro paso bajo para el viento espacial
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, this.ctx.currentTime);
        filter.Q.setValueAtTime(5, this.ctx.currentTime);
        filter.connect(this.ambientGain);

        // Oscilador base (Drone)
        this.ambientOsc = this.ctx.createOscillator();
        this.ambientOsc.type = 'sawtooth';
        this.ambientOsc.frequency.setValueAtTime(40, this.ctx.currentTime); // Frecuencia muy baja
        this.ambientOsc.connect(filter);
        this.ambientOsc.start();

        // LFO para el efecto de "respiración" del viento
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
        
        // Efecto de ruido blanco (Steam/Engine)
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

window.Soundscape = new NeuralSoundscape();

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
        this.updateHUD();
        this.applyTheme(this.activeTheme);
        
        setInterval(() => {
            this.addCoins(10);
        }, 5 * 60 * 1000);
    }

    addCoins(amount) {
        this.coins += amount;
        localStorage.setItem('papuCoins', this.coins);
        this.updateHUD();
    }

    updateHUD() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        let hud = document.getElementById('papu-hud');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'papu-hud';
            hud.style.cssText = 'margin-top: auto; padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%; transition: 0.3s;';
            sidebar.appendChild(hud);
        }
        hud.innerHTML = `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255,183,197,0.1); border: 1px solid var(--primary-glow); display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
                <i class="fas fa-gem" style="font-size: 12px; color: var(--primary); filter: drop-shadow(0 0 5px var(--primary));"></i>
            </div>
            <span style="font-size: 10px; font-weight: 950; color: #fff; letter-spacing: 1px;">${this.coins.toLocaleString()}</span>
            <span style="font-size: 7px; font-weight: 900; opacity: 0.4; letter-spacing: 2px; text-transform: uppercase;">PAPU-COINS</span>
        `;
    }

    applyTheme(id) {
        const theme = this.themes[id];
        if (!theme) return;
        this.activeTheme = id;
        localStorage.setItem('activeTheme', id);
        Object.keys(theme.colors).forEach(key => document.documentElement.style.setProperty(key, theme.colors[key]));
        this.updateHUD();
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

window.PapuStore = new PapuEconomy();
document.addEventListener('DOMContentLoaded', () => window.PapuStore.init());

// --- PROTOCOLO PAPU-JARVIS (SISTEMA DE VOZ) ---
window.speak = (text) => {
    return new Promise((resolve) => {
        try {
            const volume = parseFloat(localStorage.getItem('sysVolume') || '0.8');
            console.log('🤖 JARVIS (INICIANDO):', text);

            const playNeuralVoice = (txt) => {
                return new Promise((res, rej) => {
                    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(txt)}&tl=es&client=tw-ob`;
                    const audio = new Audio(url);
                    audio.volume = volume;
                    audio.onended = res;
                    audio.onerror = rej;
                    audio.play().catch(rej);
                    // Seguridad: si tarda más de 6 segundos, resolver
                    setTimeout(res, 6000);
                });
            };

            const playSystemVoice = (txt) => {
                return new Promise((res) => {
                    if (!window.speechSynthesis) return res();
                    window.speechSynthesis.cancel();
                    const msg = new SpeechSynthesisUtterance(txt);
                    const voices = window.speechSynthesis.getVoices();
                    const preferredVoice = voices.find(v => v.lang.includes('es') && v.name.includes('Natural')) || voices.find(v => v.lang.includes('es') && v.name.includes('Google')) || voices.find(v => v.lang.includes('es'));
                    
                    if (preferredVoice) msg.voice = preferredVoice;
                    msg.pitch = 0.9;
                    msg.rate = 1.05;
                    msg.volume = volume;
                    msg.onend = res;
                    window.speechSynthesis.speak(msg);
                    // Seguridad: resolver si no dispara onend
                    setTimeout(res, 5000);
                });
            };

            playNeuralVoice(text)
                .then(resolve)
                .catch(() => {
                    playSystemVoice(text).then(resolve);
                });

        } catch (e) { 
            console.error('JARVIS ERROR:', e); 
            resolve();
        }
    });
};

// DEFINE GLOBAL HANDLERS EARLY TO PREVENT "UNDEFINED" ERRORS
window.startMicrosoftLogin = () => {
    console.log('UI: Starting MS Login');
    const btn = document.getElementById('microsoftLogin');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> AUTHENTICATING...';
        btn.disabled = true;
    }
    if (window.electronAPI && window.electronAPI.loginMicrosoft) {
        window.electronAPI.loginMicrosoft();
    } else {
        alert('CRITICAL: loginMicrosoft not available in electronAPI');
    }
};

window.startOfflineLogin = () => {
    console.log('UI: Starting Offline Login');
    if (typeof window.showModal === 'function') {
        window.showModal(window.t ? window.t('offline_login') : 'OFFLINE LOGIN', 'ENTER PILOT NAME', (name) => {
            if (name && name.trim().length > 0) {
                window.electronAPI.addOfflineAccount(name.trim());
            }
        });
    } else {
        const name = prompt('ENTER PILOT NAME:');
         if (name && name.trim().length > 0) {
            window.electronAPI.addOfflineAccount(name.trim());
        }
    }
};

window.setActive = (uuid) => {
    if (!window.electronAPI) return;
    window.electronAPI.onAccountsListOnce((accounts) => {
        const acc = accounts.find(a => a.uuid === uuid);
        if (acc) {
            localStorage.setItem('activeAccount', JSON.stringify(acc));
            window.speak(`Cambiando perfil a ${acc.name}. Preparando cabina.`).then(() => {
                location.reload();
            });
        }
    });
    window.electronAPI.getAccounts();
};

window.playClick = () => {
    try {
        const audio = document.getElementById('clickAudio');
        if (audio) {
            const savedVol = localStorage.getItem('sysVolume') || '0.8';
            audio.volume = parseFloat(savedVol);
            audio.currentTime = 0;
            audio.play().catch(e => {});
        }
    } catch(e) {}
};

console.log('--- 🔊 SYSTEM AUDIO ENGINE INITIALIZING... ---');

    var initCore = () => {
        try {
            console.log('UI: Core Initializing...');
        
        if (!window.electronAPI) {
            console.error('CRITICAL: electronAPI not found!');
            if (window.showModal) window.showModal('SYSTEM ERROR', 'window.electronAPI is undefined. Preload script failed.', null, true);
            else alert('SYSTEM ERROR: window.electronAPI is undefined. Preload script failed.');
            return;
        }

        // LOAD DATA REGARDLESS OF RELOAD STATUS
        let settings, translations, modTranslations;
        try {
            settings = window.electronAPI.getSettings();
            translations = window.electronAPI.getTranslations();
            const currentLang = localStorage.getItem('lang') || 'es';
            window.t = (key) => {
                if (!translations || !translations[currentLang]) return key;
                return translations[currentLang][key] || key;
            };

            // Fetch mod translations asynchronously
            window.electronAPI.getModTranslations().then(res => {
                window.modTranslations = res;
                console.log('UI: Mod translations loaded');
            });

            console.log('UI: Core data loaded');
            // Apply Global Sound Settings
            const audio = document.getElementById('clickAudio');
            if (audio) {
                const savedVol = localStorage.getItem('sysVolume') || '0.8';
                audio.volume = parseFloat(savedVol);
            }
        } catch (e) {
            console.error('UI: Failed to load core data:', e);
        }

        if (!window.CORE_INITIALIZED) {
            window.CORE_INITIALIZED = true;
            
            // INICIAR SONIDO CINEMÁTICO DE INTRO (Efecto Riser/Swell)
            window.Soundscape.playIntro('https://cdn.pixabay.com/audio/2021/08/09/audio_823190f84a.mp3'); // Cinematic Logo Impact

            // ONE-TIME INITIALIZATION (SPLASH, HUD, ETC)
            const preloader = document.getElementById('preloader');
            const root = document.getElementById('root');
            const userHub = document.getElementById('user-hub');
            const bgAnim = document.getElementById('bg-anim');
            
            if (root) root.style.opacity = '0';
            if (userHub) userHub.style.opacity = '0';
            if (bgAnim) bgAnim.style.opacity = '0';

            if (preloader) {
                setTimeout(() => {
                    preloader.style.opacity = '0';
                    preloader.style.transform = 'scale(1.05)';
                    if (root) { root.style.transition = 'opacity 1.2s ease'; root.style.opacity = '1'; }
                    if (bgAnim) { bgAnim.style.transition = 'opacity 1.2s ease'; bgAnim.style.opacity = '1'; }
                    if (userHub) { userHub.style.transition = 'opacity 1.2s ease'; userHub.style.opacity = '1'; }
                    setTimeout(() => { 
                        preloader.style.visibility = 'hidden'; 
                        preloader.remove(); 
                        
                        // PARAR INTRO Y COMENZAR JARVIS
                        window.Soundscape.stopIntro();
                        
                        setTimeout(() => {
                            // INICIAR PROTOCOLO JARVIS
                            const greeted = sessionStorage.getItem('jarvis_greeted');
                            if (!greeted) {
                                const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
                                const name = acc ? acc.name : 'Piloto';
                                
                                // Detección de primera vez y horario (Global)
                                const firstTime = !localStorage.getItem('jarvis_has_entered');
                                const hour = new Date().getHours();
                                let timeGreeting = 'Buenos días';
                                if (hour >= 12 && hour < 19) timeGreeting = 'Buenas tardes';
                                else if (hour >= 19 || hour < 5) timeGreeting = 'Buenas noches';

                                let msg = firstTime ? `Bienvenido, ${name}` : `${timeGreeting}, ${name}. Bienvenido de vuelta.`;
                                
                                window.speak(msg);
                                
                                sessionStorage.setItem('jarvis_greeted', 'true');
                                localStorage.setItem('jarvis_has_entered', 'true');
                            }
                        }, 800); 
                    }, 1200);
                }, 3500); 
            }
        } else {
            console.log('UI: HOT UPDATE DETECTED - Re-linking core logic...');
            // In case of hot update, we might want to refresh the current view
            setTimeout(() => {
                const activeTab = document.querySelector('.sidebar-nav .nav-item.active');
                if (activeTab) {
                    const spanLabel = activeTab.querySelector('span')?.innerText.toLowerCase();
                    const dataTab = activeTab.getAttribute('data-tab');
                    const tab = dataTab || spanLabel;
                    if (tab === 'play' || tab === 'jugar') window.renderPlayTab();
                    else if (tab === 'accounts' || tab === 'cuentas') window.renderAccountsTab();
                    else if (tab === 'skins') window.renderSkinsTab();
                    else if (tab === 'settings' || tab === 'configuración') window.renderSettingsTab();
                    else if (tab === 'mods') window.renderModsTab();
                    else if (tab === 'community') window.renderCommunityTab();
                } else {
                    window.renderPlayTab();
                }
            }, 100);
        }

        const mainContent = document.getElementById('main-content');
        let currentLang = localStorage.getItem('lang') || 'es';

    window.t = (key) => {
        if (!translations || !translations[currentLang]) return key;
        return translations[currentLang][key] || key;
    };

    // INITIALIZATION
    const savedVersion = '1.20.1';
    const activeAcc = JSON.parse(localStorage.getItem('activeAccount') || 'null');

    // Global UI Sync (Pilot Status HUD)
    window.updateGlobalUI = () => {
        const userText = document.getElementById('user-name-text');
        const userAvatar = document.getElementById('user-avatar');
        const verText = document.getElementById('selected-version-text');
        const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
        
        // Fix: Use localized version defaults if settings object fails 
        const defaultVer = (settings && settings.client) ? settings.client.default_version : '1.20.1';
        const ver = localStorage.getItem('selectedVersion') || defaultVer;

        if (userText) userText.innerText = acc ? acc.name.toUpperCase() : t('pilot_offline');
        if (userAvatar) {
            userAvatar.src = acc ? `https://mc-heads.net/avatar/${acc.name}/35` : '../assets/user.png';
            userAvatar.onerror = () => userAvatar.src = '../assets/user.png';
        }
        if (verText) verText.innerText = `Minecraft ${ver}`;
        
        window.applyBackground();
    };

    window.applyBackground = async () => {
        let bgFX = localStorage.getItem('bgFX') || 'matrix';
        if (bgFX === 'lobby3d') {
            bgFX = 'matrix';
            localStorage.setItem('bgFX', 'matrix');
        }
        const bgElem = document.getElementById('bg-anim');
        if (!bgElem) return;

        // Cleanup
        bgElem.className = 'background-animation'; // Reset classes
        bgElem.style.backgroundImage = '';
        bgElem.style.background = '';
        
        const particles = bgElem.querySelector('.particles');
        const clouds = bgElem.querySelector('.clouds');
        if (particles) particles.innerHTML = '';
        if (clouds) clouds.innerHTML = '';

        const imgBGs = { bg1: '../assets/backgrounds/background1.png', bg2: '../assets/backgrounds/background2.png', bg3: '../assets/backgrounds/background3.png', bg4: '../assets/backgrounds/background4.png' };
        
        if (imgBGs[bgFX]) {
            bgElem.style.backgroundImage = `url('${imgBGs[bgFX]}')`;
            bgElem.style.backgroundSize = 'cover';
            bgElem.style.backgroundPosition = 'center';
            return;
        }

        if (bgFX === 'weather') {
            bgElem.classList.add('bg-weather');
            try {
                // 1. Get Location
                const geoReq = await fetch('https://get.geojs.io/v1/ip/geo.json');
                const geo = await geoReq.json();
                
                // 2. Get Weather
                const weatherReq = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current_weather=true`);
                const weather = await weatherReq.json();
                
                const code = weather.current_weather.weathercode;
                const isDay = weather.current_weather.is_day === 1;
                
                // Set background based on day/night and conditions
                if (isDay) {
                    bgElem.style.background = 'linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)';
                } else {
                    bgElem.style.background = 'linear-gradient(180deg, #09203f 0%, #537895 100%)';
                }

                // Add effects with random distribution
                if (code >= 51 && code <= 67) { // Rain
                    bgElem.classList.add('weather-rain');
                    if (particles) particles.innerHTML = Array(60).fill(0).map(() => `<div class="rain-drop" style="left: ${Math.random()*100}%; animation-delay: ${Math.random()*2}s; opacity: ${0.2+Math.random()*0.8}"></div>`).join('');
                } else if (code >= 71 && code <= 86) { // Snow
                    bgElem.classList.add('weather-snow');
                    if (particles) particles.innerHTML = Array(40).fill(0).map(() => `<div class="snow-flake" style="left: ${Math.random()*100}%; animation-delay: ${Math.random()*5}s; opacity: ${0.4+Math.random()*0.6}; width: ${3+Math.random()*5}px; height: ${3+Math.random()*5}px;"></div>`).join('');
                } else if (code > 0 && code <= 3) { // Cloudy
                    if (clouds) clouds.innerHTML = Array(6).fill(0).map(() => `<div class="cloud" style="top: ${Math.random()*45}%; left: ${-Math.random()*400}px; animation-duration: ${30+Math.random()*30}s; opacity: ${0.4+Math.random()*0.6}; transform: scale(${0.5 + Math.random()})"></div>`).join('');
                }

                console.log(`[WEATHER] Data applied for ${geo.city}: Code ${code}, Day: ${isDay}`);
            } catch (e) {
                console.error('[WEATHER] Failed to sync weather:', e);
                bgElem.style.background = 'radial-gradient(circle, #1a080a, #000)';
            }
        } else if (bgFX !== 'matrix') {
            bgElem.classList.add(`bg-${bgFX}`);
        }
    };

    // TAB RENDERING FUNCTIONS
    window.renderStoreTab = () => {
        const store = window.PapuStore;
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        // Themes Split (Featured + Other)
        const themeKeys = Object.keys(store.themes);
        const featured = themeKeys.slice(6, 10); // Nether, End, Godly, Cyberpunk
        const others = themeKeys.filter(k => !featured.includes(k));

        mainContent.innerHTML = `
            <div class="store-container premium-scroll" style="padding: 50px 80px; height: 100%; overflow-y: auto; background: linear-gradient(180deg, rgba(255,183,197,0.03) 0%, transparent 100%); animation: fadeIn 0.6s ease-out;">
                <header style="margin-bottom: 60px;">
                    <span style="font-size: 10px; font-weight: 900; color: var(--primary); letter-spacing: 4px; text-transform: uppercase; opacity: 0.8;">Premium Marketplace</span>
                    <h1 style="font-size: 56px; font-weight: 900; letter-spacing: -2px; color: #fff; margin-top: 5px;">Store</h1>
                </header>

                <!-- FEATURED HERO -->
                <section style="margin-bottom: 70px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h2 style="font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -0.5px;">Destacados de la Semana</h2>
                        <span style="font-size: 12px; font-weight: 700; color: var(--primary); cursor: pointer; opacity: 0.8;">Ver todo</span>
                    </div>
                    
                    <div style="display: flex; gap: 25px; overflow-x: auto; padding-bottom: 30px; scroll-snap-type: x mandatory;" class="no-scrollbar">
                        ${featured.map(id => {
                            const theme = store.themes[id];
                            const isOwned = store.ownedThemes.includes(id);
                            const isActive = store.activeTheme === id;
                            return `
                                <div class="glass market-card" style="min-width: 480px; height: 280px; border-radius: 40px; flex-shrink: 0; scroll-snap-align: start; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: 0.5s;" onclick="window.handleThemeAction('${id}')">
                                    <div style="position: absolute; inset: 0; background: linear-gradient(145deg, ${theme.colors['--primary']}33, ${theme.colors['--secondary']}11);"></div>
                                    <div style="position: absolute; top: -50px; right: -50px; width: 250px; height: 250px; background: ${theme.colors['--primary']}; opacity: 0.1; filter: blur(80px); border-radius: 50%;"></div>
                                    
                                    <div style="position: absolute; bottom: 35px; left: 40px; right: 40px; display: flex; align-items: center; gap: 25px; z-index: 2;">
                                        <div style="width: 80px; height: 80px; border-radius: 22px; background: linear-gradient(135deg, ${theme.colors['--primary']}, ${theme.colors['--secondary']}); border: 2px solid rgba(255,255,255,0.15); box-shadow: 0 15px 45px rgba(0,0,0,0.6); position: relative;">
                                             <div style="position: absolute; inset: 0; border-radius: 20px; box-shadow: inset 0 0 15px rgba(255,255,255,0.2);"></div>
                                        </div>
                                        <div style="flex: 1;">
                                            <h3 style="font-size: 24px; font-weight: 950; color: #fff; margin-bottom: 4px; letter-spacing: -0.5px;">${theme.name.toUpperCase()}</h3>
                                            <p style="font-size: 12px; opacity: 0.5; font-weight: 700;">SISTEMA OPERATIVO PAPU v2.0</p>
                                        </div>
                                        <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                                            <button class="btn-app-store" style="min-width: 100px; padding: 12px 25px; border-radius: 50px; border: none; background: ${isActive ? 'transparent' : 'rgba(255,255,255,0.12)'}; color: ${isActive ? 'var(--primary)' : '#fff'}; font-weight: 900; font-size: 13px; cursor: pointer; border: 1.5px solid ${isActive ? 'var(--primary)' : 'transparent'}; backdrop-filter: blur(10px);">
                                                ${isActive ? 'OPEN' : (isOwned ? 'GET' : theme.price + ' CP')}
                                            </button>
                                            ${!isOwned ? `<span style="font-size: 8px; opacity: 0.3; font-weight: 900; letter-spacing: 1px;">COMPRA ÚNICA</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </section>

                <!-- GRID SECTION -->
                <section>
                    <h2 style="font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 35px; letter-spacing: -0.5px;">Colección Completa</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 40px;">
                        ${others.map(id => {
                            const theme = store.themes[id];
                            const isOwned = store.ownedThemes.includes(id);
                            const isActive = store.activeTheme === id;
                            return `
                                <div style="display: flex; align-items: center; gap: 20px; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.08); transition: 0.3s; cursor: pointer;" onclick="window.handleThemeAction('${id}')" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                                    <div style="width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, ${theme.colors['--primary']}, ${theme.colors['--secondary']}); border: 1.5px solid rgba(255,255,255,0.1); box-shadow: 0 8px 20px rgba(0,0,0,0.3);"></div>
                                    <div style="flex: 1;">
                                        <h3 style="font-size: 17px; font-weight: 950; color: #fff; margin-bottom: 3px;">${theme.name}</h3>
                                        <p style="font-size: 11px; opacity: 0.4; font-weight: 700;">${isOwned ? 'EDICIÓN ESTÁNDAR' : 'DESBLOQUEAR POR ' + theme.price + ' CP'}</p>
                                    </div>
                                    <button class="btn-app-store" style="min-width: 80px; height: 34px; border-radius: 50px; border: none; background: rgba(255,255,255,0.08); color: var(--primary); font-weight: 950; font-size: 11px; cursor: pointer; text-transform: uppercase;">
                                        ${isActive ? '✓' : (isOwned ? 'GET' : 'BUY')}
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </section>
            </div>
        `;
    };

    window.handleThemeAction = (id) => {
        const store = window.PapuStore;
        const theme = store.themes[id];
        if (store.ownedThemes.includes(id)) {
            store.applyTheme(id);
            window.renderStoreTab();
            const hud = document.getElementById('papu-hud');
            if (hud) { hud.style.transform = 'scale(1.2)'; setTimeout(() => hud.style.transform = 'scale(1)', 300); }
        } else if (store.coins >= theme.price) {
            if (store.buyTheme(id)) {
                window.speak(`Felicidades, Piloto. Has desbloqueado el tema ${theme.name}.`);
                window.renderStoreTab();
            }
        } else {
            window.speak("Fondos insuficientes. Siga pilotando para ganar más monedas.");
            const hud = document.getElementById('papu-hud');
            if (hud) {
                hud.style.color = '#ff4444';
                hud.style.borderColor = '#ff4444';
                setTimeout(() => { hud.style.color = 'var(--primary)'; hud.style.borderColor = 'var(--primary-glow)'; }, 1000);
            }
        }
    };

    window.renderPlayTab = () => {
        let selectedVersion = localStorage.getItem('selectedVersion') || settings.client.default_version;
        if (selectedVersion === '1.19.2' || selectedVersion === '1.19.4') {
            selectedVersion = '1.20.1';
            localStorage.setItem('selectedVersion', '1.20.1');
        }
        
        const forgeEnabled = localStorage.getItem('forgeEnabled') !== 'false';
        const forgeBadge = (forgeEnabled && selectedVersion === '1.20.1') ? 
            `<div style="position: absolute; top: 20px; right: 20px; background: #ffb7c5; color: #000; padding: 5px 15px; border-radius: 8px; font-size: 9px; font-weight: 900; box-shadow: 0 0 15px rgba(255,183,197,0.4); animation: pulse 2s infinite;">${t('forge_active')}</div>` : '';

        mainContent.innerHTML = `
            <div id="mainContainer" style="animation: scaleIn 0.8s ease-out; width: 100%; height: 100%; display: flex; flex-direction: column;">
                <div style="flex: 1; display: flex; gap: 0; min-height: 0;">
                    <!-- LEFT: PLAY AREA -->
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
                        <div class="top-section" style="margin-bottom: 30px;">
                            <div class="logo-wrapper">
                                <img src="../assets/los_papus/logo.png" alt="LosPapus Lover" class="main-logo">
                            </div>
                        </div>

                        <div class="middle-section" style="margin-bottom: 40px;">
                            <div class="version-card glass" id="version-selector-card" style="text-align: center; padding: 40px 50px; min-width: 400px; border-radius: 30px; position: relative; cursor: pointer;">
                                ${forgeBadge}
                                <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #ffb7c5; color: #000; padding: 5px 20px; border-radius: 10px; font-size: 10px; font-weight: 900; letter-spacing: 2px;">${t('active_deployment')}</div>
                                <h2 style="font-weight: 900; letter-spacing: 8px; color: #ffb7c5; margin-bottom: 10px; text-shadow: 0 0 20px rgba(255,183,197,0.3);">JAVA EDITION</h2>
                                <div id="selected-version-text" style="font-size: 28px; font-weight: 900; opacity: 0.9; margin-bottom: 30px; letter-spacing: 1px;">Minecraft ${selectedVersion}</div>
                                <div class="server-status-pill" style="display: inline-flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.4); padding: 10px 20px; border-radius: 50px; border: 1px solid rgba(255,183,197,0.3);">
                                    <div class="pulse-dot" id="server-dot" style="width: 10px; height: 10px; background: #ff8c4a; border-radius: 50%; box-shadow: 0 0 15px #ff8c4a;"></div>
                                    <span id="server-ping-text" style="font-size: 13px; font-weight: 900; color: #ddd;">${t('scanning_core')}</span>
                                </div>

                                <!-- NEW: START SERVER BUTTON (Aternos) -->
                                <div id="start-server-wrap" style="display: block; margin-top: 15px; animation: slideUpFade 0.4s ease;">
                                    <button id="start-server-btn" class="btn-play-custom btn-secondary" style="padding: 10px 20px; font-size: 10px; border-radius: 12px; letter-spacing: 2px;">
                                        <i class="fas fa-rocket" style="margin-right: 8px;"></i>${localStorage.getItem('lang') === 'es' ? 'INICIAR SERVIDOR' : 'START SERVER'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="bottom-section" style="flex-direction: column; margin-top: 0px;">
                            <div style="display: flex; gap: 25px; align-items: center; justify-content: center; width: 100%;">
                                <div class="play-area" style="z-index: 10;">
                                    <button class="btn-play-custom" id="play-btn" style="padding: 25px 80px; font-size: 38px; border-radius: 25px; letter-spacing: 6px;">${t('play')}</button>
                                </div>
                                <div class="play-area" style="z-index: 10;">
                                    <button class="btn-play-custom btn-outline" id="sync-mods-btn" style="padding: 20px 40px; font-size: 18px; border-radius: 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;">
                                        <span><i class="fas fa-download"></i> UPDATE MODS</span>
                                        <span style="font-size: 11px; opacity: 0.8; letter-spacing: 1px;" id="sync-mod-status">CHECK</span>
                                    </button>
                                </div>
                            </div>
                            <div id="inline-sync-progress" style="display: none; width: 100%; max-width: 500px; margin-top: 20px;">
                                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                                    <div id="inline-sync-bar" style="width: 0%; height: 100%; background: #ffb7c5; box-shadow: 0 0 15px #ffb7c5; transition: 0.3s;"></div>
                                </div>
                            </div>
                            <!-- FEATURE 4: Launch Progress Bar -->
                            <div id="launch-progress-wrap" style="display: none; width: 100%; max-width: 500px; margin-top: 15px; text-align: center;">
                                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; margin-bottom: 6px;">
                                    <div id="launch-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ffb7c5, #ff8c4a); box-shadow: 0 0 10px #ffb7c5; transition: width 0.4s ease;"></div>
                                </div>
                                <span id="launch-progress-label" style="font-size: 10px; font-weight: 900; opacity: 0.5; letter-spacing: 2px;">INITIALIZING...</span>
                            </div>
                            <div style="margin-top: 30px; opacity: 0.4; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-align: center;">
                                CORE v2.0.0-PROTOTYPE | STABLE BUILD: 031824
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT: NEWS PANEL (Feature 3) -->
                    <div class="glass" style="width: 280px; flex-shrink: 0; border-radius: 0; border-left: 1px solid rgba(255,183,197,0.1); display: flex; flex-direction: column; overflow: hidden;">
                        <div style="padding: 20px 20px 12px; border-bottom: 1px solid rgba(255,183,197,0.1); flex-shrink: 0;">
                            <div style="font-size: 10px; font-weight: 900; letter-spacing: 3px; color: #ffb7c5;">📡 STAFF BROADCAST</div>
                            <div style="font-size: 9px; opacity: 0.5; margin-top: 3px; letter-spacing: 1px;">LIVE FROM THE CLOUD</div>
                        </div>
                        <div id="news-feed" class="premium-scroll" style="flex: 1; overflow-y: auto; padding: 15px;">
                            <div style="text-align: center; opacity: 0.3; padding-top: 40px; font-size: 10px;">
                                <i class="fas fa-satellite-dish fa-spin" style="font-size: 20px; margin-bottom: 10px;"></i><br>CONNECTING...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        initPlayListeners();
        window.updateGlobalUI();
        if (typeof window.electronAPI.getServerIp === 'function') {
            window.electronAPI.getServerIp().then((ip) => {
                window.electronAPI.pingServer(ip);
            }).catch(() => {
                window.electronAPI.pingServer('sprat.aternos.host:44481');
            });
        } else {
            window.electronAPI.pingServer('sprat.aternos.host:44481');
        }
        // Fetch news for the panel
        window.electronAPI.fetchNews();
        
        // --- NEW: Mod Update Detection ---
        window.electronAPI.checkModsStatus().then(hasUpdate => {
            if (hasUpdate) {
                const btn = document.getElementById('sync-mods-btn');
                if (btn) {
                    btn.classList.add('pulse-green-border');
                    const status = document.getElementById('sync-mod-status');
                    if (status) status.innerText = 'UPDATE READY!';
                }
            }
        });
    };

    window.renderAccountsTab = () => {
        console.log('UI: Rendering Accounts Tab');
        mainContent.innerHTML = `
            <div style="padding: 40px; color: white; animation: slideUpFade 0.6s ease; height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                    <div>
                        <h1 style="font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin: 0; color: #ffb7c5;">${t('elite_hub')}</h1>
                        <span style="opacity: 0.5; font-size: 11px; font-weight: 900;">${t('auth_services')}</span>
                    </div>
                    <div style="display: flex; gap: 15px;">
                        <button id="microsoftLogin" onclick="window.startMicrosoftLogin()" class="btn-play-custom btn-outline" style="font-size: 12px; padding: 12px 25px;">${t('microsoft_login')}</button>
                        <button id="addOffline" onclick="window.startOfflineLogin()" class="btn-play-custom btn-secondary" style="font-size: 12px; padding: 12px 25px;">${t('offline_login')}</button>
                    </div>
                </div>
                <div id="accounts-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; overflow-y: auto;" class="premium-scroll"></div>
            </div>
        `;
        window.electronAPI.getAccounts();
    };

    window.renderSkinsTab = () => {
        mainContent.innerHTML = `
            <div style="padding: 35px; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1); height: 100%; display: flex; flex-direction: column; overflow: hidden; background: radial-gradient(circle at top right, rgba(255, 183, 197, 0.05) 0%, transparent 60%);">
                <!-- HEADER AREA -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; flex-shrink: 0;">
                    <div>
                        <h1 style="font-weight: 950; letter-spacing: 7px; color: #ffb7c5; margin:0; font-size: 28px; text-shadow: 0 0 20px rgba(255, 183, 197, 0.3);">SKIN SYSTEM</h1>
                        <div style="height: 3px; width: 60px; background: #ffb7c5; margin: 8px 0; border-radius: 2px; box-shadow: 0 0 10px #ffb7c5;"></div>
                        <span style="opacity:0.4; font-size:10px; font-weight:900; letter-spacing: 2px;">AUTHORING PILOT APPEARANCE ASSETS</span>
                    </div>
                    
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <div class="glass" style="display: flex; align-items: center; padding: 4px 20px; border-radius: 50px; border: 1px solid rgba(255,183,197,0.15); background: rgba(255,255,255,0.03); backdrop-filter: blur(10px); transition: all 0.3s ease;" id="searchBoxWrap">
                            <i class="fas fa-search" style="color: #ffb7c5; font-size: 13px; margin-right: 12px; opacity: 0.7;"></i>
                            <input type="text" id="skinSearchInput" placeholder="NICKNAME SEARCH..." style="background:none; border:none; color:#fff; font-size:12px; font-weight:800; outline:none; width: 200px; padding: 10px 0; letter-spacing: 1px;">
                        </div>
                        <button id="uploadSkin" class="v-opt" style="padding: 12px 25px; font-size: 11px; border-radius: 50px; border: 1px solid #ffb7c5; background: none; color: #ffb7c5; font-weight: 900; cursor: pointer; transition: all 0.3s ease;"><i class="fas fa-file-export" style="margin-right:8px;"></i> IMPORT PNG</button>
                    </div>
                </div>

                <div style="flex: 1; display: grid; grid-template-columns: 290px 1fr 340px; gap: 30px; min-height: 0;">
                    <!-- LEFT PANEL: PERSONAL VAULT -->
                    <div style="display: flex; flex-direction: column; gap: 20px; min-height: 0;">
                        <div class="glass" style="flex: 1; padding: 25px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; overflow: hidden; background: rgba(10,10,10,0.4);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0;">
                                <h3 style="font-size: 11px; font-weight: 900; opacity: 0.6; letter-spacing: 3px;"><i class="fas fa-box-open" style="margin-right: 10px; color: #ffb7c5;"></i>PERSONAL VAULT</h3>
                                <span id="skin-lib-count" style="font-size: 9px; font-weight: 900; background: rgba(255,183,197,0.1); color: #ffb7c5; padding: 2px 8px; border-radius: 50px;">0</span>
                            </div>
                            <div id="skins-grid" class="premium-scroll" style="flex:1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;"></div>
                        </div>
                    </div>

                    <!-- CENTER PANEL: 3D CORE -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                        <div id="skin-viewer-canvas" style="width: 320px; height: 420px; cursor: grab; filter: drop-shadow(0 15px 45px rgba(0,0,0,0.5)); transition: transform 0.3s ease;"><div style="opacity:0.2; padding-top:180px; text-align:center; font-size:10px; letter-spacing:5px;">NEURAL LINK ESTABLISHED...</div></div>
                        <div style="width: 220px; height: 12px; background: radial-gradient(circle, rgba(255, 183, 197, 0.45) 0%, transparent 75%); filter: blur(8px); margin-top:-10px; opacity: 0.4;"></div>
                        
                        <div id="skin-active-label" style="font-size:11px; font-weight:900; margin-top:30px; letter-spacing:4px; text-align:center; color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3); background: rgba(255,255,255,0.03); padding: 8px 25px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.05);">UNLINKED</div>
                        
                        <div style="display:flex; gap: 15px; margin-top: 25px; z-index: 10;">
                            <button class="btn-play-custom btn-secondary" id="previewSkinBtn" style="padding: 15px 35px; border-radius: 15px; font-size: 12px; font-weight: 900;"><i class="fas fa-atom"></i> PREVIEW</button>
                            <button class="btn-play-custom" id="applySkinLocal" style="padding: 15px 45px; border-radius: 15px; font-size: 12px; font-weight: 950; box-shadow: 0 10px 30px rgba(255,183,197,0.3);"><i class="fas fa-link"></i> DEPLOY SKIN</button>
                        </div>
                        
                        <div id="skin-save-searched-wrap" style="margin-top: 20px; display: none; animation: slideUpFade 0.4s ease;">
                            <button class="v-opt" id="saveSearchedSkin" style="padding: 12px 30px; font-size: 11px; border-radius: 50px; border: 1px solid #4cd137; background: rgba(76,209,51,0.1); color: #4cd137; font-weight: 950; cursor: pointer; box-shadow: 0 0 20px rgba(76,209,51,0.2);"><i class="fas fa-download" style="margin-right:8px;"></i> ARCHIVE TO VAULT</button>
                        </div>
                    </div>

                    <!-- RIGHT PANEL: GLOBAL SKIN STREAM (Isometric Body Renders) -->
                    <div class="glass" style="padding: 25px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; overflow: hidden; background: rgba(10,10,10,0.4);">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.6; margin-bottom: 25px; letter-spacing: 3px;"><i class="fas fa-satellite-dish" style="margin-right: 10px; color: #ffb7c5;"></i>GLOBAL STREAM</h3>
                        <div id="trending-skins" class="premium-scroll" style="flex:1; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding-right: 5px;">
                            ${['Dream', 'Technoblade', 'GeorgeNotFound', 'Sapnap', 'Philza', 'TommyInnit', 'WilburSoot', 'Ranboo', 'Tubbo', 'Nihachu'].map(name => `
                                <div class="trending-item premium-card" data-name="${name}" style="padding: 15px 5px; border-radius: 20px; text-align: center; cursor: pointer; border: 1px solid rgba(255,255,255,0.03); background: rgba(0,0,0,0.2); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                                    <div style="position: relative; margin-bottom: 15px; height: 110px; display: flex; justify-content: center; align-items: center;">
                                        <img src="https://mc-heads.net/body/${name}/right" style="height: 100px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.4)); opacity: 0.9;">
                                        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 50px; height: 4px; background: rgba(255,255,255,0.05); filter: blur(4px); border-radius: 50%;"></div>
                                    </div>
                                    <div style="font-size: 8px; font-weight: 950; letter-spacing: 1px; color: rgba(255,183,197,0.7);">${name.toUpperCase()}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .premium-card:hover {
                    background: rgba(255,183,197,0.08) !important;
                    border-color: rgba(255,183,197,0.2) !important;
                    transform: translateY(-8px) scale(1.02);
                }
                .premium-card:hover img {
                    transform: scale(1.1);
                    opacity: 1 !important;
                }
                .premium-card.active {
                    background: rgba(255,183,197,0.12) !important;
                    border-color: #ffb7c5 !important;
                    box-shadow: 0 0 25px rgba(255,183,197,0.15);
                }
                .premium-card img {
                    transition: all 0.4s ease;
                }
                #searchBoxWrap:focus-within {
                    border-color: #ffb7c5 !important;
                    background: rgba(0,0,0,0.6) !important;
                    box-shadow: 0 0 20px rgba(255,183,197,0.1);
                }
                .vault-item {
                    transition: all 0.3s ease;
                    border: 1px solid transparent;
                }
                .vault-item:hover {
                    background: rgba(255,255,255,0.05) !important;
                    transform: translateX(5px);
                }
                .vault-item.active {
                    background: rgba(255,183,197,0.1) !important;
                    border-color: rgba(255,183,197,0.2) !important;
                }
            </style>
        `;
        
        let currentSkinData = null;
        let selectedSkinName = null;
        let skinViewer = null;
        let lastSearchedName = null;

        const getSkinLibrary = () => { try { return JSON.parse(localStorage.getItem('skinLibrary') || '[]'); } catch { return []; } };
        const saveSkinLibrary = (lib) => localStorage.setItem('skinLibrary', JSON.stringify(lib));

        const renderLibrary = () => {
            const lib = getSkinLibrary();
            const countEl = document.getElementById('skin-lib-count');
            if (countEl) countEl.innerText = lib.length;
            const grid = document.getElementById('skins-grid');
            if (!grid) return;
            const activeSkin = localStorage.getItem('activeSkinName') || '';
            if (lib.length === 0) { 
                grid.innerHTML = `<div style="font-size:10px; opacity:0.25; text-align:center; padding:60px 20px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 20px; margin-top:20px;">VAULT EMPTY.<br><br>SEARCH FOR A NICKNAME TO BEGIN.</div>`; 
                return; 
            }
            grid.innerHTML = lib.map((s, i) => `
                <div class="vault-item ${s.name === activeSkin ? 'active' : ''}" id="skin-item-${i}" style="display:flex; align-items:center; gap:12px; padding:12px 15px; cursor:pointer; border-radius:15px; background: rgba(255,255,255,0.02);">
                    <div style="width: 34px; height: 34px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        <img src="${s.data}" style="width:100%; height:100%; image-rendering:pixelated;" onerror="this.src='../assets/user.png'">
                    </div>
                    <span style="flex:1; font-size:11px; font-weight:900; letter-spacing:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: rgba(255,255,255,0.8);" title="${s.name}">${s.name.toUpperCase()}</span>
                    <button onclick="event.stopPropagation(); window.deleteSkin(${i})" style="background:none; border:none; color:rgba(255,255,255,0.2); cursor:pointer; font-size:11px; transition: color 0.3s;"><i class="fas fa-times-circle"></i></button>
                </div>
            `).join('');
            lib.forEach((s, i) => {
                document.getElementById(`skin-item-${i}`)?.addEventListener('click', () => {
                    selectedSkinName = s.name;
                    currentSkinData = s.data;
                    document.getElementById('skin-save-searched-wrap').style.display = 'none';
                    document.getElementById('skin-active-label').innerText = `VAULT: ${s.name.toUpperCase()}`;
                    document.querySelectorAll('.vault-item').forEach(el => el.classList.remove('active'));
                    document.querySelectorAll('.trending-item').forEach(el => el.classList.remove('active'));
                    document.getElementById(`skin-item-${i}`)?.classList.add('active');
                    if (skinViewer) skinViewer.loadSkin(s.data);
                });
            });
        };

        const attachDiscoveryEvents = () => {
            document.querySelectorAll('.trending-item').forEach(item => {
                const name = item.getAttribute('data-name');
                item.onclick = () => {
                    lastSearchedName = name;
                    selectedSkinName = name;
                    document.querySelectorAll('.trending-item').forEach(el => el.classList.remove('active'));
                    document.querySelectorAll('.vault-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    document.getElementById('skin-active-label').innerText = `DISCOVERY: ${name.toUpperCase()}`;
                    const skinUrl = `https://mc-heads.net/skin/${name}`;
                    if (skinViewer) skinViewer.loadSkin(skinUrl);
                    document.getElementById('skin-save-searched-wrap').style.display = 'block';
                    fetch(skinUrl).then(r => r.blob()).then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => { currentSkinData = reader.result; };
                        reader.readAsDataURL(blob);
                    });
                };
            });
        };

        window.deleteSkin = (idx) => {
            const lib = getSkinLibrary();
            lib.splice(idx, 1);
            saveSkinLibrary(lib);
            renderLibrary();
        };

        const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
        const activeSkinData = localStorage.getItem('activeSkinData');
        const defaultSkinSource = activeSkinData || (acc ? `https://mc-heads.net/skin/${acc.name}` : 'https://mc-heads.net/skin/Steve');
        
        const initViewer = (skinSource) => {
            try {
                if (typeof skinview3d === 'undefined') throw new Error('skinview3d not loaded');
                const container = document.getElementById('skin-viewer-canvas');
                if (!container) return;
                container.innerHTML = '';
                const canvas = document.createElement('canvas');
                skinViewer = new skinview3d.SkinViewer({ canvas, width: 320, height: 420, skin: skinSource });
                container.appendChild(canvas);
                skinViewer.autoRotate = true;
                skinViewer.animation = new skinview3d.WalkingAnimation();
            } catch(e) {
                const c = document.getElementById('skin-viewer-canvas');
                if(c) c.innerHTML = `<div style="opacity:0.3; padding-top:200px; text-align:center; font-size:10px; letter-spacing:3px;">VIEWER ERROR</div>`;
            }
        };

        initViewer(defaultSkinSource);
        renderLibrary();
        attachDiscoveryEvents();

        const searchInput = document.getElementById('skinSearchInput');
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const name = searchInput.value.trim();
                if (!name) return;
                lastSearchedName = name;
                document.getElementById('skin-active-label').innerText = `SCANNING: ${name.toUpperCase()}...`;
                const skinUrl = `https://mc-heads.net/skin/${name}`;
                if (skinViewer) skinViewer.loadSkin(skinUrl);
                document.getElementById('skin-save-searched-wrap').style.display = 'block';
                
                // Add to Discovery Feed at the top
                const discoveryGrid = document.getElementById('trending-skins');
                if (discoveryGrid) {
                    const existing = discoveryGrid.querySelector(`[data-name="${name}"]`);
                    if (existing) existing.remove();
                    const newCard = document.createElement('div');
                    newCard.className = 'trending-item premium-card active';
                    newCard.setAttribute('data-name', name);
                    newCard.style = 'padding: 15px 5px; border-radius: 20px; text-align: center; cursor: pointer; border: 1px solid #ffb7c5; background: rgba(255,183,197,0.12); animation: scaleIn 0.4s ease;';
                    newCard.innerHTML = `
                        <div style="position: relative; margin-bottom: 15px; height: 110px; display: flex; justify-content: center; align-items: center;">
                            <img src="https://mc-heads.net/body/${name}/right" style="height: 100px; filter: drop-shadow(0 0 10px rgba(255,183,197,0.3));">
                            <div style="position: absolute; top: -5px; right: 5px; background: #ffb7c5; color: #000; font-size: 7px; font-weight: 900; padding: 2px 6px; border-radius: 5px; letter-spacing: 1px;">MATCH</div>
                        </div>
                        <div style="font-size: 8px; font-weight: 950; letter-spacing: 1px; color: #fff;">${name.toUpperCase()}</div>
                    `;
                    discoveryGrid.prepend(newCard);
                    attachDiscoveryEvents();
                }

                fetch(skinUrl).then(r => r.blob()).then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => { currentSkinData = reader.result; };
                    reader.readAsDataURL(blob);
                });
            }
        });

        document.getElementById('saveSearchedSkin')?.addEventListener('click', () => {
            if (!currentSkinData || !lastSearchedName) return;
            const lib = getSkinLibrary();
            if (lib.find(s => s.name === lastSearchedName)) { alert('Skin already in vault!'); return; }
            lib.push({ name: lastSearchedName, data: currentSkinData });
            saveSkinLibrary(lib);
            renderLibrary();
            document.getElementById('skin-save-searched-wrap').style.display = 'none';
        });

        document.getElementById('uploadSkin')?.addEventListener('click', () => {
            window.electronAPI.selectFile();
            const handler = (data) => {
                window.showModal('ARCHIVE IDENTIFIER', 'Name for these assets...', (name) => {
                    if (!name || !name.trim()) return;
                    const lib = getSkinLibrary();
                    lib.push({ name: name.trim(), data });
                    saveSkinLibrary(lib);
                    selectedSkinName = name.trim();
                    currentSkinData = data;
                    renderLibrary();
                    if (skinViewer) skinViewer.loadSkin(data);
                });
            };
            window.electronAPI.onFileSelected(handler);
        });

        document.getElementById('applySkinLocal')?.addEventListener('click', () => {
            if (!currentSkinData) { alert('Select skin first!'); return; }
            localStorage.setItem('activeSkinName', selectedSkinName || lastSearchedName || 'Custom');
            localStorage.setItem('activeSkinData', currentSkinData);
            renderLibrary();
            if (acc && acc.type === 'microsoft') {
                const btn = document.getElementById('applySkinLocal');
                if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...';
                window.electronAPI.uploadSkin({ accessToken: acc.access_token, base64Image: currentSkinData });
            } else {
                alert('SKIN DEPLOYED SUCCESSFULLY!');
            }
        });

        window.electronAPI.onSkinUploadSuccess(() => {
            const btn = document.getElementById('applySkinLocal');
            if (btn) btn.innerHTML = '<i class="fas fa-link"></i> DEPLOY SKIN';
            alert('SKIN SYNC: Remote texture updated!');
        });
    };

    // Modpacks tab merged into Play tab

    window.renderSettingsTab = () => {
        const ram = localStorage.getItem('maxRam') || '3';
        const vol = localStorage.getItem('sysVolume') || '0.8';
        const lang = localStorage.getItem('lang') || 'es';
        const bgFX = localStorage.getItem('bgFX') || 'matrix';
        const selectedVersion = localStorage.getItem('selectedVersion') || '1.20.1';
        const forgeEnabled = localStorage.getItem('forgeEnabled') !== 'false';

        const backgrounds = [
            { id: 'matrix', label: 'Dynamic Nebula', desc: 'Animated galaxy particles' },
            { id: 'void', label: 'Void Black', desc: 'Clean, minimal dark mode' },
            { id: 'emerald', label: 'Emerald Grid', desc: 'Matrix-style green grid' },
            { id: 'bg1', label: 'Custom BG 1', desc: 'Background image 1', img: '../assets/backgrounds/background1.png' },
            { id: 'bg2', label: 'Custom BG 2', desc: 'Background image 2', img: '../assets/backgrounds/background2.png' },
            { id: 'bg3', label: t('lang')==='es'?'Fondo 3':'Custom BG 3', desc: 'Background image 3', img: '../assets/backgrounds/background3.png' },
            { id: 'bg4', label: t('lang')==='es'?'Fondo 4':'Custom BG 4', desc: 'Background image 4', img: '../assets/backgrounds/background4.png' },
            { id: 'weather', label: t('lang')==='es'?'CLIMA REAL':'LIVE WEATHER', desc: t('lang')==='es'?'Sincronizado con tu ciudad':'Real-time weather sync', icon: 'fa-cloud-sun-rain' }
        ];

        mainContent.innerHTML = `
            <div style="padding: 40px; animation: slideUpFade 0.6s ease; height: 100%; overflow-y: auto;" class="premium-scroll">
                <h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin-bottom: 35px;">${t('command_center')}</h1>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; max-width: 900px;">
                    <!-- RAM SETTINGS -->
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-memory" style="margin-right:8px; color:#ffb7c5;"></i>RAM ALLOCATION</h3>
                        <label style="font-weight: 900; color: #ffb7c5; font-size: 28px; margin-bottom: 12px; display: block;"><span id="ramVal">${ram} GB</span></label>
                        <input type="range" id="ramRange" min="1" max="16" value="${ram}" style="width: 100%; accent-color: #ffb7c5;" oninput="document.getElementById('ramVal').innerText = this.value + ' GB'">
                        <div style="display:flex; justify-content:space-between; font-size:10px; opacity:0.4; margin-top:5px;"><span>1 GB</span><span>16 GB</span></div>
                    </div>

                    <!-- VOLUME SETTINGS -->
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-volume-up" style="margin-right:8px; color:#ffb7c5;"></i>${t('lang')==='es'?'VOLUMEN SISTEMA':'SYSTEM VOLUME'}</h3>
                        <label style="font-weight: 900; color: #ffb7c5; font-size: 28px; margin-bottom: 12px; display: block;"><span id="volVal">${Math.round(vol * 100)}%</span></label>
                        <input type="range" id="volRange" min="0" max="100" value="${Math.round(vol * 100)}" style="width: 100%; accent-color: #ffb7c5; cursor: pointer;" oninput="document.getElementById('volVal').innerText = this.value + '%'; clickAudio.volume = this.value/100; clickAudio.currentTime=0; clickAudio.play().catch(()=>{})">
                        <div style="display:flex; justify-content:space-between; font-size:10px; opacity:0.4; margin-top:5px;"><span>0%</span><span>100%</span></div>
                    </div>

                    <!-- LANGUAGE -->   
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-globe" style="margin-right:8px; color:#ffb7c5;"></i>LANGUAGE</h3>
                        <div style="display: flex; gap: 12px;">
                            <button class="v-opt ${lang==='es'?'active':''}" onclick="setLang('es')" style="flex: 1; font-size: 12px; margin: 0; padding: 12px;">🇪🇸 ESPAÑOL</button>
                            <button class="v-opt ${lang==='en'?'active':''}" onclick="setLang('en')" style="flex: 1; font-size: 12px; margin: 0; padding: 12px;">🇺🇸 ENGLISH</button>
                        </div>
                    </div>

                    <!-- FORGE ENGINE -->
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-fire" style="margin-right:8px; color:#ff8c4a;"></i>FORGE ENGINE</h3>
                        <button id="toggleForge" class="v-opt ${forgeEnabled?'active':''}" onclick="toggleForge()" style="width:100%; font-size: 12px; margin: 0; padding: 13px;">
                            <i class="fas ${forgeEnabled ? 'fa-check-circle' : 'fa-times-circle'}" style="margin-right:8px;"></i>
                            ${forgeEnabled ? 'FORGE ACTIVE (47.4.17)' : 'FORGE DISABLED'}
                        </button>
                        <p style="font-size:10px; opacity:0.5; margin-top:10px; line-height:1.6;">Required for modded Minecraft 1.20.1. Disable only for vanilla gameplay.</p>
                    </div>

                    <!-- JAVA PATH -->
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fab fa-java" style="margin-right:8px; color:#ffb7c5;"></i>JAVA PATH</h3>
                        <input type="text" id="javaPath" value="${localStorage.getItem('javaPath') || ''}" placeholder="Leave empty for auto-detect" class="v-opt" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:11px; font-weight:900; letter-spacing:1px; border-radius:10px;">
                        <p style="font-size:10px; opacity:0.5; margin-top:8px;">e.g. C:/Program Files/Java/jre8/bin/java.exe</p>
                    </div>
                </div>

                <!-- BACKGROUND PICKER -->
                <div class="glass" style="padding: 25px; border-radius: 20px; margin-top: 25px; max-width: 900px;">
                    <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-image" style="margin-right:8px; color:#ffb7c5;"></i>BACKGROUND THEME</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px;">
                        ${backgrounds.map(bg => `
                            <div class="bg-option ${bgFX === bg.id ? 'bg-active' : ''}" onclick="selectBG('${bg.id}')" style="cursor:pointer; border-radius:12px; overflow:hidden; border: 2px solid ${bgFX === bg.id ? '#ffb7c5' : 'rgba(255,255,255,0.05)'}; transition: all 0.3s; position:relative;">
                                ${bg.img ? `<img src="${bg.img}" style="width:100%; height:70px; object-fit:cover; display:block;">` : `<div style="width:100%; height:70px; background: ${bg.id==='matrix' ? 'radial-gradient(circle, #1a080a, #000)' : bg.id==='void' ? '#000' : bg.id==='weather' ? 'linear-gradient(180deg, #1a1e21, #000)' : 'radial-gradient(circle, #081a0e, #000)'}; display:flex; align-items:center; justify-content:center;"><i class="fas ${bg.icon || 'fa-star'}" style="color:rgba(255,183,197,0.3); font-size:20px;"></i></div>`}
                                <div style="padding: 8px 8px 10px; background: rgba(0,0,0,0.7);">
                                    <div style="font-size:10px; font-weight:900; color:${bgFX === bg.id ? '#ffb7c5' : '#fff'};">${bg.label}</div>
                                    <div style="font-size:9px; opacity:0.5; margin-top:2px;">${bg.desc}</div>
                                </div>
                                ${bgFX === bg.id ? '<div style="position:absolute; top:5px; right:5px; background:#ffb7c5; border-radius:50%; width:12px; height:12px; display:flex; align-items:center; justify-content:center;"><i class="fas fa-check" style="font-size:7px; color:#000;"></i></div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- SAVE BUTTON -->
                <div style="margin-top: 25px; max-width: 900px;">
                    <button id="saveGlobal" class="btn-play-custom" style="padding: 18px 40px; width: 100%; font-size: 14px; letter-spacing: 3px;"><i class="fas fa-save" style="margin-right:10px;"></i>${t('commit_changes')}</button>
                </div>
            </div>
        `;

        window.selectBG = (id) => {
            localStorage.setItem('bgFX', id);
            renderSettingsTab();
            window.updateGlobalUI();
        };

        document.getElementById('saveGlobal')?.addEventListener('click', () => {
            const ramVal = document.getElementById('ramRange').value;
            const volVal = document.getElementById('volRange').value / 100;
            const javaVal = document.getElementById('javaPath').value;
            localStorage.setItem('maxRam', ramVal);
            localStorage.setItem('sysVolume', volVal);
            if (javaVal.trim()) localStorage.setItem('javaPath', javaVal.trim());
            else localStorage.removeItem('javaPath');
            
            window.speak("Protocolo de configuración actualizado. Reiniciando sistemas.").then(() => {
                location.reload();
            });
        });
    };

    window.setLang = (l) => {
        localStorage.setItem('lang', l);
        currentLang = l;
        renderSettingsTab();
        window.updateGlobalUI();
        // Update Sidebar items
        const menuItems = {
            'play': t('play'),
            'accounts': t('accounts'),
            'skins': t('skins'),
            'settings': t('settings'),
            'community': t('community')
        };
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            const span = item.querySelector('span');
            if (span) {
                const text = span.innerText.toLowerCase();
                if (menuItems[text]) span.innerText = menuItems[text];
            }
        });
    };

    window.toggleForge = () => {
        const current = localStorage.getItem('forgeEnabled') !== 'false';
        localStorage.setItem('forgeEnabled', (!current).toString());
        renderSettingsTab();
    };

    // LISTENERS
    function initPlayListeners() {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
            if (!acc) return alert(t('access_denied'));
            
            let selectedVersion = localStorage.getItem('selectedVersion') || '1.20.1';
            let ram = localStorage.getItem('maxRam') || '3';
            const forgeEnabled = localStorage.getItem('forgeEnabled') !== 'false';

            // Boost RAM for Modded Gameplay if not manually increased
            if (forgeEnabled && selectedVersion === '1.20.1' && parseInt(ram) < 4) {
                console.log('[DEBUG] Boosting RAM for Forge Stability...');
                ram = '4'; 
            }

            let forgeVersion = null;
            if (forgeEnabled && selectedVersion === '1.20.1') {
                forgeVersion = '47.4.17';
            }

            const btn = document.getElementById('play-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> INITIALIZING...';
                btn.style.opacity = '0.5';
            }

            window.electronAPI.launchGame({
                    nick: acc.name,
                    version: selectedVersion,
                    maxRam: ram,
                    account: acc,
                    forgeVersion: forgeVersion,
                    javaPath: localStorage.getItem('javaPath')
                });
            });
        document.getElementById('sync-mods-btn')?.addEventListener('click', () => {
            const btn = document.getElementById('sync-mods-btn');
            const playBtn = document.getElementById('play-btn');
            const prog = document.getElementById('inline-sync-progress');
            if (btn && playBtn) {
                btn.disabled = true;
                playBtn.disabled = true;
                document.getElementById('sync-mod-status').innerText = 'INITIALIZING...';
            }
            if (prog) prog.style.display = 'block';
            
            window.electronAPI.syncModpacks();
        });

        document.getElementById('version-selector-card')?.addEventListener('click', () => {
            const data = window.lastPingData;
            if (!data || !data.online) return;

            const players = data.players.list || [];
            
            let content;
            if (players.length === 0) {
                content = `
                    <div style="padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 20px;">
                        <i class="fas fa-user-secret" style="font-size: 40px; color: #ffb7c5; opacity: 0.5;"></i>
                        <div style="font-size: 13px; opacity: 0.8; font-weight: 700;">${data.players.online} Papus jugando ahora</div>
                        <div style="font-size: 10px; opacity: 0.4; font-weight: 900; letter-spacing: 1px; line-height: 1.5;">LA LISTA DE NOMBRES ES PRIVADA<br>O EL SERVIDOR ESTÁ LLENO</div>
                    </div>
                `;
            } else {
                content = `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; max-height: 350px; overflow-y: auto; padding: 15px;" class="premium-scroll">
                        ${players.map(p => `
                            <div class="premium-card" style="display: flex; flex-direction: column; align-items: center; gap: 10px; background: rgba(255,183,197,0.08); padding: 15px; border-radius: 20px; border: 1px solid rgba(255,183,197,0.1); transition: all 0.3s ease;">
                                <img src="https://mc-heads.net/avatar/${p.name}/45" style="border-radius: 12px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.3));">
                                <span style="font-size: 10px; font-weight: 950; overflow: hidden; text-overflow: ellipsis; width: 100%; white-space: nowrap; color: #ffb7c5; letter-spacing: 1px;">${p.name.toUpperCase()}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            window.showModal('PAPUS ACTIVOS', content, null, true);
        });
    }

    window.setVersion = (v) => {
        localStorage.setItem('selectedVersion', v);
        window.updateGlobalUI();
        document.querySelector('.glass-overlay')?.remove();
    };

    window.renderModsTab = () => {
        mainContent.innerHTML = `
            <div style="padding: 40px; animation: slideUpFade 0.6s ease; height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <div>
                        <h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin: 0;">MOD LISTING</h1>
                        <span style="opacity: 0.5; font-size: 11px; font-weight: 900; text-transform: uppercase;">CLICK THE SWITCH TO ENABLE / DISABLE A MOD</span>
                    </div>
                    <button id="refreshMods" class="btn-play-custom btn-outline" style="padding: 10px 20px; font-size: 11px;">
                        <i class="fas fa-sync"></i> REFRESH
                    </button>
                </div>
                
                <div id="mods-grid" class="premium-scroll" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; overflow-y: auto; padding-right: 15px; padding-bottom: 20px;">
                    <div style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 50px; opacity: 0.5;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 30px; margin-bottom: 15px;"></i>
                        <div>SCANNING FILE SYSTEM...</div>
                    </div>
                </div>
            </div>
        `;

        const loadMods = () => window.electronAPI.getModsList();
        loadMods();

        document.getElementById('refreshMods')?.addEventListener('click', loadMods);
    };

    // MOVE IPC MOD HANDLERS OUT TO PREVENT MEMORY LEAKS
    window.electronAPI.onModsList((mods) => {
        const grid = document.getElementById('mods-grid');
        if (!grid) return;

        if (!mods || mods.length === 0) {
            grid.innerHTML = `
                <div class="glass" style="grid-column: 1 / -1; padding: 50px; text-align: center; border-radius: 20px;">
                    <i class="fas fa-box-open" style="font-size: 40px; color: rgba(255,255,255,0.2); margin-bottom: 15px;"></i>
                    <h3 style="font-weight: 900; color: #ffb7c5;">NO MODS DETECTED</h3>
                    <p style="opacity: 0.5; font-size: 13px;">Click 'UPDATE MODS' on the Play tab to download the server modpack.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = mods.map(m => `
            <div class="glass version-card" style="padding: 15px 18px; border-radius: 16px; text-align: left; display: flex; align-items: center; gap: 12px; transition: opacity 0.3s; ${!m.enabled ? 'opacity: 0.45;' : ''}" id="mod-card-${CSS.escape(m.filename)}">
                <div style="width: 36px; height: 36px; background: rgba(255,183,197,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,183,197,0.${m.enabled ? '2' : '05'}); flex-shrink:0;">
                    <i class="fas fa-puzzle-piece" style="color: ${m.enabled ? '#ffb7c5' : 'rgba(255,255,255,0.2)'}; font-size: 15px;"></i>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-weight: 900; font-size: 12px; color: ${m.enabled ? '#fff' : 'rgba(255,255,255,0.4)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.filename}">${m.name}</div>
                    <div style="font-size: 9px; opacity: 0.5; margin-top: 2px; font-weight: 900; color: #ff8c4a;">${m.size}</div>
                </div>
                <div>
                    <!-- Toggle Switch -->
                    <label style="position: relative; display: inline-block; width: 38px; height: 20px; cursor: pointer;">
                        <input type="checkbox" ${m.enabled ? 'checked' : ''} id="toggle-${CSS.escape(m.filename)}" style="opacity:0; width:0; height:0;">
                        <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: ${m.enabled ? '#ffb7c5' : 'rgba(255,255,255,0.1)'}; border-radius: 20px; transition: 0.3s;">
                            <span style="position: absolute; height: 14px; width: 14px; left: ${m.enabled ? '21px' : '3px'}; bottom: 3px; background: ${m.enabled ? '#000' : 'rgba(255,255,255,0.5)'}; border-radius: 50%; transition: 0.3s;"></span>
                        </span>
                    </label>
                </div>
            </div>
        `).join('');

        mods.forEach(m => {
            const card = document.getElementById(`mod-card-${CSS.escape(m.filename)}`);
            const chk = document.getElementById(`toggle-${CSS.escape(m.filename)}`);
            
            if (card) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => {
                    // Don't trigger if click was on the toggle switch itself
                    if (e.target.closest('label')) return;
                    window.showModDetailModal(m);
                });
            }

            if (chk) {
                chk.addEventListener('change', () => {
                    chk.disabled = true;
                    window.electronAPI.toggleMod(m.filename);
                });
            }
        });
    });

    window.electronAPI.onModToggled((data) => {
        if (data.success) {
            window.electronAPI.getModsList();
        } else {
            alert('MOD ERROR: ' + data.error);
        }
    });

    window.showModDetailModal = (mod) => {
        const lang = localStorage.getItem('lang') || 'es';
        let displayDesc = mod.description;

        // Apply Spanish Translation if active and available
        if (lang === 'es' && window.modTranslations && window.modTranslations[mod.name]) {
            displayDesc = window.modTranslations[mod.name].description || displayDesc;
        }

        const overlay = document.createElement('div');
        overlay.className = 'glass-overlay';
        overlay.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
            display: flex; align-items: center; justify-content: center;
            z-index: 11000; animation: fadeIn 0.4s ease;
        `;
        
        overlay.innerHTML = `
            <div class="glass" style="padding: 0; border-radius: 35px; width: 500px; border: 1px solid rgba(255,183,197,0.3); background: rgba(15,15,15,0.95); overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.8); animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
                <!-- Header with Icon & Name -->
                <div style="padding: 40px; background: linear-gradient(180deg, rgba(255,183,197,0.1) 0%, transparent 100%); display: flex; flex-direction: column; align-items: center; text-align: center; position: relative;">
                    <button id="closeDetail" style="position: absolute; top: 20px; right: 25px; background: none; border: none; color: #ffb7c5; cursor: pointer; font-size: 18px; opacity: 0.6;"><i class="fas fa-times"></i></button>
                    
                    <div style="width: 80px; height: 80px; background: rgba(255,183,197,0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,183,197,0.2); margin-bottom: 20px;">
                        <i class="fas fa-puzzle-piece" style="font-size: 35px; color: #ffb7c5;"></i>
                    </div>
                    
                    <h2 style="font-weight: 950; letter-spacing: 2px; color: #fff; margin-bottom: 10px; font-size: 24px; text-transform: uppercase;">${mod.name}</h2>
                    <div style="display: flex; gap: 15px; font-size: 10px; font-weight: 900; letter-spacing: 1px;">
                        <span style="color: #ff8c4a; background: rgba(255,140,74,0.1); padding: 4px 12px; border-radius: 50px;">VERSION: ${mod.version}</span>
                        <span style="color: #ffb7c5; background: rgba(255,183,197,0.1); padding: 4px 12px; border-radius: 50px;">AUTHOR: ${mod.author}</span>
                    </div>
                </div>

                <!-- Description Area -->
                <div style="padding: 0 40px 40px;">
                    <div style="font-size: 10px; font-weight: 900; color: #ffb7c5; opacity: 0.5; letter-spacing: 3px; margin-bottom: 15px;">${lang === 'es' ? 'DOCUMENTACIÓN' : 'DOCUMENTATION'}</div>
                    <div class="premium-scroll" style="max-height: 200px; overflow-y: auto; text-align: left; line-height: 1.8; font-size: 13px; color: rgba(255,255,255,0.7); font-weight: 400; padding-right: 15px;">
                        ${displayDesc.replace(/\n/g, '<br>')}
                    </div>
                    
                    <div style="margin-top: 35px; display: flex; justify-content: space-between; align-items: center; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.05);">
                        <div style="font-size: 9px; font-weight: 900; opacity: 0.4; letter-spacing: 1px;">${mod.filename} | ${mod.size}</div>
                        <button id="closeDetailBottom" class="btn-play-custom" style="padding: 12px 30px; font-size: 10px; border-radius: 12px;">${lang === 'es' ? 'ENTENDIDO' : 'GOT IT'}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('closeDetail').onclick = () => overlay.remove();
        document.getElementById('closeDetailBottom').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
    };


    window.renderCommunityTab = () => {
        mainContent.innerHTML = `
            <div style="padding: 40px; animation: slideUpFade 0.6s ease; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin-bottom: 50px;">ELITE NETWORK</h1>
                <div style="display: grid; grid-template-columns: repeat(3, 200px); gap: 30px;">
                    <div class="glass version-card" onclick="window.electronAPI.openExternal('https://discord.gg/kMvmrT3M')" style="padding: 30px; text-align: center; cursor: pointer; border-radius: 20px;">
                        <i class="fab fa-discord" style="font-size: 40px; color: #7289da; margin-bottom: 15px;"></i>
                        <div style="font-weight: 900; font-size: 12px;">DISCORD</div>
                    </div>
                    <div class="glass version-card" onclick="window.electronAPI.openExternal('https://twitter.com/')" style="padding: 30px; text-align: center; cursor: pointer; border-radius: 20px;">
                        <i class="fab fa-twitter" style="font-size: 40px; color: #1da1f2; margin-bottom: 15px;"></i>
                        <div style="font-weight: 900; font-size: 12px;">TWITTER</div>
                    </div>
                    <div class="glass version-card" onclick="window.electronAPI.openExternal('https://rodrixx1552.github.io/Custom-Launcher-main')" style="padding: 30px; text-align: center; cursor: pointer; border-radius: 20px;">
                        <i class="fas fa-globe" style="font-size: 40px; color: #ffb7c5; margin-bottom: 15px;"></i>
                        <div style="font-weight: 900; font-size: 12px;">WEB</div>
                    </div>
                </div>
            </div>
        `;
    };

    // SIDEBAR NAVIGATION & WINDOW CONTROLS (Run once)
    if (!window.NAV_INITIALIZED) {
        window.NAV_INITIALIZED = true;
        const navItems = document.querySelectorAll('.sidebar .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                if (typeof window.playClick === 'function') window.playClick();
                
                const spanText = item.querySelector('span')?.innerText.toLowerCase();
                const dataTab = item.getAttribute('data-tab');
                const tab = dataTab || spanText;

                if (tab === 'play' || tab === t('play').toLowerCase()) renderPlayTab();
                else if (tab === 'accounts' || tab === t('accounts').toLowerCase()) renderAccountsTab();
                else if (tab === 'skins' || tab === t('skins').toLowerCase()) renderSkinsTab();
                else if (tab === 'settings' || tab === t('settings').toLowerCase()) renderSettingsTab();
                else if (tab === 'store' || tab === 'tienda') window.renderStoreTab();
                else if (tab === 'installations' || tab === 'mods' || tab === 'modpack') renderModsTab();
                else if (tab === 'community' || tab === t('community').toLowerCase()) renderCommunityTab();
            });
        });

        // WINDOW CONTROLS
        document.getElementById('frameBar')?.addEventListener('dblclick', (e) => {
            if (!e.target.closest('.frame-actions')) window.electronAPI.maximizeWindow();
        });
        document.getElementById('frameBtn_close')?.addEventListener('click', () => window.electronAPI.closeWindow());
        document.getElementById('frameBtn_minimize')?.addEventListener('click', () => window.electronAPI.minimizeWindow());
        document.getElementById('frameBtn_maximize')?.addEventListener('click', () => window.electronAPI.maximizeWindow());
    }

    // PING HANDLER
    window.electronAPI.onPingResult((data) => {
        window.lastPingData = data;
        const pingText = document.getElementById('server-ping-text');
        const dot = document.getElementById('server-dot');
        const pill = document.querySelector('.server-status-pill');
        
        if (pill) {
            // Pill is inside the card
        }

        if (pingText && dot) {
            const startWrap = document.getElementById('start-server-wrap');
            const startBtn = document.getElementById('start-server-btn');
            
            if (startWrap) startWrap.style.display = 'block';
            if (startBtn) {
                startBtn.onclick = () => window.electronAPI.autoStartServer();
            }

            if (data.online) {
                pingText.innerText = `ONLINE | ${data.players.online}/${data.players.max}`;
                dot.style.background = '#4cd137';
                dot.style.boxShadow = '0 0 15px #4cd137';
            } else {
                pingText.innerText = 'OFFLINE';
                dot.style.background = '#e84118';
                dot.style.boxShadow = '0 0 15px #e84118';
            }
        }
    });

    // STARTUP
    setLang(currentLang); 
    window.applyBackground();
    
    // --- IPC LISTENERS & GLOBAL EVENTS (MUST BE BEFORE renderPlayTab) ---
    
    // News Feed Renderer
    window.electronAPI.onNewsLoaded((data) => {
        const feed = document.getElementById('news-feed');
        if (!feed || !data || !data.posts) return;
        
        const tagColors = { 'UPDATE': '#ff8c4a', 'EVENT': '#ffb7c5', 'WELCOME': '#4cd137', 'WARN': '#e84118', 'INFO': '#7289da' };
        
        if (data.posts.length === 0) {
            feed.innerHTML = '<div style="text-align: center; opacity: 0.3; padding-top: 40px; font-size: 10px;">NO NEWS AVAILABLE</div>';
            return;
        }

        feed.innerHTML = data.posts.map((post, idx) => {
            const color = tagColors[post.tag?.toUpperCase()] || '#ffb7c5';
            return `
                <div class="news-item-premium" style="margin-bottom: 20px; padding: 15px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); animation: slideUpFade 0.4s ease forwards; animation-delay: ${idx * 0.1}s; opacity: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 7px; font-weight: 950; letter-spacing: 2px; background: ${color}; color: #000; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${post.tag || 'NEWS'}</span>
                        <span style="font-size: 9px; opacity: 0.4; font-weight: 900; font-family: 'monospace';">${post.date || ''}</span>
                    </div>
                    <p style="font-size: 11px; line-height: 1.6; opacity: 0.85; margin: 0; font-weight: 500; letter-spacing: 0.3px;">${post.text}</p>
                </div>`;
        }).join('');
    });

    window.electronAPI.onAccountsList((accounts) => {
        const list = document.getElementById('accounts-list');
        if (!list) return;
        if (accounts.length === 0) {
            list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; opacity: 0.5;">NO BIOMETRIC DATA DETECTED.</p>';
            return;
        }
        const activeAcc = JSON.parse(localStorage.getItem('activeAccount') || '{}');
        if (accounts.length === 1 && (!activeAcc || !activeAcc.uuid) && !document.getElementById('custom-modal-overlay')) {
            localStorage.setItem('activeAccount', JSON.stringify(accounts[0]));
            location.reload();
            return;
        }
        list.innerHTML = accounts.map(acc => `
            <div class="account-card-premium ${activeAcc.uuid === acc.uuid ? 'active' : ''}" style="display: flex; align-items: center; gap: 15px; padding: 25px; border-radius: 20px; background: rgba(0,0,0,0.3); border: 1px solid ${activeAcc.uuid === acc.uuid ? '#ffb7c5' : 'rgba(255,255,255,0.05)'};">
                <img src="https://mc-heads.net/avatar/${acc.name}/50" style="border-radius: 10px; border: 1px solid rgba(255,183,197,0.2);">
                <div style="flex: 1;">
                    <div style="font-weight: 900; color: #fff; letter-spacing: 1px;">${acc.name.toUpperCase()}</div>
                    <div style="font-size: 10px; opacity: 0.6; font-weight: 900;">${acc.type.toUpperCase()} PROTOCOL</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    ${activeAcc.uuid !== acc.uuid ? `<button onclick="setActive('${acc.uuid}')" class="btn-play-custom btn-outline" style="padding: 10px 20px; font-size: 10px;">${t('deploy').toUpperCase()}</button>` : '<span style="color: #4cd137; font-weight: 900; font-size: 12px; letter-spacing: 2px;">ACTIVE</span>'}
                    <button onclick="window.electronAPI.removeAccount('${acc.uuid}')" style="background: rgba(232,65,24,0.1); border: 1px solid rgba(232,65,24,0.3); color: #e84118; width: 40px; height: 40px; border-radius: 12px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    });

    window.electronAPI.onLoginSuccess((acc) => {
        localStorage.setItem('activeAccount', JSON.stringify(acc));
        window.speak(`Enlace neuronal establecido con ${acc.name}. Reiniciando interfaz.`);
        setTimeout(() => location.reload(), 2000);
    });

    window.electronAPI.onLoginError((msg) => {
        alert('LOGIN ERROR: ' + msg);
        const btn = document.getElementById('microsoftLogin');
        if (btn) { btn.innerHTML = t('microsoft_login'); btn.disabled = false; }
    });

    renderPlayTab();

    // --- FEATURE: DRAG & DROP MOD INSTALLATION ---
    document.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.body.style.boxShadow = "inset 0 0 50px rgba(76, 209, 51, 0.5)";
    });
    
    document.addEventListener('dragleave', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.body.style.boxShadow = "none";
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.body.style.boxShadow = "none";
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            let processed = false;
            for (const file of e.dataTransfer.files) {
                if (file.name.endsWith('.jar')) {
                    if (window.electronAPI && window.electronAPI.installMod) {
                        window.electronAPI.installMod(file.path);
                        processed = true;
                    }
                }
            }
            if (processed) {
                const audio = document.getElementById('clickAudio');
                if (audio) { audio.currentTime = 0; audio.play().catch(e=>{}); }
            }
        }
    });

    if (window.electronAPI) {
        window.electronAPI.onModInstalledSuccess((fileName) => {
            if (typeof window.showModal === 'function') {
                window.showModal('MOD INSTALADO', `El mod <strong style="color:#ffb7c5">${fileName}</strong> fue instalado correctamente. \n¡Recuerda activar Forjar/Fabric para usarlo!`, null, true);
            } else {
                alert('MOD INSTALADO EXITOSAMENTE: ' + fileName);
            }
            if (document.getElementById('mods-grid')) {
                window.electronAPI.getModsList();
            }
        });
        window.electronAPI.onModInstalledError((err) => {
            alert('ERROR AL INSTALAR EL MOD: ' + err);
        });
    }

    // --- FEATURE: QUICK ACCOUNT SWITCHER ---
    const userHub = document.getElementById('user-hub');
    if (userHub) {
        userHub.style.cursor = 'pointer';
        userHub.title = 'Clic para cambiar de cuenta rápidamente';
        userHub.addEventListener('mouseenter', () => userHub.style.transform = 'scale(1.02)');
        userHub.addEventListener('mouseleave', () => userHub.style.transform = 'scale(1)');
        
        userHub.addEventListener('click', () => {
            // Animación de carga rápida
            const originalIcon = userHub.querySelector('img').outerHTML;
            userHub.querySelector('img').style.opacity = '0.3';
            
            window.electronAPI.getAccounts();
            window.electronAPI.onAccountsListOnce((accountsList) => {
                userHub.querySelector('img').style.opacity = '1';

                if (!accountsList || accountsList.length === 0) {
                    if (typeof window.showModal === 'function') {
                        window.showModal('SIN CUENTAS', 'No hay cuentas guardadas en el disco. Ve a la pestaña de Accounts para loguearte.', null, true);
                    } else {
                        alert('No hay cuentas guardadas. Ve a la pestaña Accounts para añadir una.');
                    }
                    return;
                }
                
                let html = '<div class="account-switcher-list" style="display:flex; flex-direction:column; gap:10px; max-height:300px; overflow-y:auto; padding-right:5px;">';
                accountsList.forEach(acc => {
                    const isCurrent = JSON.parse(localStorage.getItem('activeAccount') || '{}').uuid === acc.uuid;
                    html += `
                        <div class="acc-switch-item" style="display:flex; align-items:center; gap:15px; padding:15px; background:${isCurrent ? 'rgba(255,183,197,0.2)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isCurrent ? '#ffb7c5' : 'transparent'}; border-radius:15px; cursor:pointer; transition:all 0.3s;" 
                             onmouseover="this.style.background='rgba(255,183,197,0.15)'; this.style.transform='translateX(5px)'" 
                             onmouseout="this.style.background='${isCurrent ? 'rgba(255,183,197,0.2)' : 'rgba(255,255,255,0.03)'}'; this.style.transform='translateX(0)'"
                             onclick="window.switchAccount('${acc.uuid}')">
                            <img src="https://mc-heads.net/avatar/${acc.name}/40" style="border-radius:8px; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="display:flex; flex-direction:column; text-align:left;">
                                <span style="font-family:'Outfit',sans-serif; font-weight:700; color:#fff; font-size:13px;">${acc.name}</span>
                                <span style="font-size:9px; opacity:0.5; text-transform:uppercase; letter-spacing:1px;">${acc.type || 'OFFLINE'}</span>
                            </div>
                            ${acc.type === 'microsoft' ? '<i class="fab fa-microsoft ms-icon" style="margin-left:auto; color:#4cd137; font-size:12px;"></i>' : '<i class="fas fa-user-secret" style="margin-left:auto; color:#ffb7c5; opacity:0.5; font-size:12px;"></i>'}
                        </div>
                    `;
                });
                html += '</div>';
                
                if (typeof window.showModal === 'function') {
                    window.showModal('CAMBIAR CUENTA', html, null, true);
                }
            });
        });
    }

    window.switchAccount = (uuid) => {
        window.electronAPI.getAccounts();
        window.electronAPI.onAccountsListOnce((accountsList) => {
            const acc = accountsList.find(a => a.uuid === uuid);
            if (acc) {
            localStorage.setItem('activeAccount', JSON.stringify(acc));
            if (window.updateGlobalUI) window.updateGlobalUI();
            
            // Close modal if exists
            const modal = document.querySelector('.custom-modal-overlay');
            if (modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 300);
            }
            
            const audio = document.getElementById('clickAudio');
            if (audio) { audio.currentTime = 0; audio.play().catch(e=>{}); }
        }
    });
};

    // Helper for manual testing via DevTools console
    window.testUpdateBanner = () => {
        window.electronAPI.onUpdateAvailable((data) => {
            console.log('TEST BANNER TRIGGERED:', data);
        });
        const evt = new CustomEvent('manual-update', { detail: { version: '1.0.0', url: 'https://github.com' } });
        // Simular llegada
        window.dispatchEvent(evt);
    };

    // SYNC MODS EVENTS
    window.electronAPI.onSyncProgress((data) => {
        const bar = document.getElementById('inline-sync-bar');
        const status = document.getElementById('sync-mod-status');
        if (bar) bar.style.width = `${data.progress}%`;
        if (status) status.innerText = data.step.toUpperCase();
    });

    window.electronAPI.onSyncFinished(() => {
        const status = document.getElementById('sync-mod-status');
        const prog = document.getElementById('inline-sync-progress');
        const btn = document.getElementById('sync-mods-btn');
        const playBtn = document.getElementById('play-btn');
        if (status) status.innerText = 'UPDATED & READY';
        if (prog) setTimeout(() => prog.style.display = 'none', 1500);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('pulse-green-border');
        }
        if (playBtn) playBtn.disabled = false;
    });

    window.electronAPI.onSyncError((err) => {
        const status = document.getElementById('sync-mod-status');
        const prog = document.getElementById('inline-sync-progress');
        const btn = document.getElementById('sync-mods-btn');
        const playBtn = document.getElementById('play-btn');
        if (status) status.innerText = 'SYNC FAILED';
        if (prog) prog.style.display = 'none';
        if (btn) btn.disabled = false;
        if (playBtn) playBtn.disabled = false;
        alert('UPDATE ERROR: ' + err);
    });
    // GAME LAUNCH EVENTS: CINEMATIC SEQUENCE
    const injectLaunchStyles = () => {
        if (document.getElementById('launch-sequence-styles')) return;
        const style = document.createElement('style');
        style.id = 'launch-sequence-styles';
        style.innerText = `
            #launch-overlay {
                position: fixed; inset: 0; z-index: 100000;
                background: radial-gradient(circle at center, #1a0b16 0%, #000 100%);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                opacity: 0; visibility: hidden; transition: all 1s ease;
            }
            #launch-overlay.active { opacity: 1; visibility: visible; }
            .launch-logo-box { position: relative; margin-bottom: 50px; }
            .launch-logo-img {
                width: 480px; max-width: 80vw;
                filter: drop-shadow(0 0 30px rgba(255, 183, 197, 0.3));
                animation: launchLogoFloat 4s infinite ease-in-out;
            }
            .launch-sequence-active .launch-logo-img {
                animation: launchLogoPulse 1.5s infinite alternate ease-in-out, launchLogoShake 0.1s infinite alternate;
                filter: drop-shadow(0 0 60px rgba(255, 183, 197, 0.6));
            }
            @keyframes launchLogoPulse {
                from { transform: scale(1); filter: drop-shadow(0 0 30px rgba(255, 183, 197, 0.4)); }
                to { transform: scale(1.05); filter: drop-shadow(0 0 100px rgba(255, 183, 197, 0.8)); }
            }
            @keyframes launchLogoShake {
                0% { transform: translate(1px, 1px) scale(1.05); }
                50% { transform: translate(-1px, -1px) scale(1.05); }
                100% { transform: translate(1px, -1px) scale(1.05); }
            }
            .launch-status-text {
                font-family: 'Outfit', sans-serif; font-weight: 900; letter-spacing: 5px;
                color: #ffb7c5; margin-top: 20px; text-transform: uppercase;
                text-shadow: 0 0 15px rgba(255, 183, 197, 0.5); font-size: 14px;
            }
            .launch-progress-wrap-new {
                width: 400px; height: 4px; background: rgba(255,255,255,0.05);
                border-radius: 10px; margin-top: 25px; overflow: hidden;
            }
            .launch-progress-bar-new {
                width: 0%; height: 100%; background: linear-gradient(90deg, #ffb7c5, #ff8c4a);
                box-shadow: 0 0 15px #ffb7c5; transition: width 0.4s ease;
            }
            .ui-fade-out { opacity: 0 !important; pointer-events: none !important; transition: opacity 1s ease !important; }
        `;
        document.head.appendChild(style);
    };

    const toggleLaunchUI = (active) => {
        injectLaunchStyles();
        let overlay = document.getElementById('launch-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'launch-overlay';
            overlay.innerHTML = `
                <div class="launch-logo-box">
                    <img src="../assets/los_papus/logo.png" class="launch-logo-img">
                </div>
                <div class="launch-status-text" id="launch-status">INICIALIZANDO...</div>
                <div class="launch-progress-wrap-new">
                    <div class="launch-progress-bar-new" id="launch-bar-inner-new"></div>
                </div>
                <div id="toggle-log-btn" style="margin-top:20px; color:rgba(255,183,197,0.7); font-size:11px; cursor:pointer; font-family:'Outfit'; font-weight:700; padding:5px 15px; border:1px solid rgba(255,183,197,0.3); border-radius:15px; transition:0.3s;" 
                     onmouseover="this.style.background='rgba(255,183,197,0.1)'; this.style.color='#fff';" 
                     onmouseout="this.style.background='transparent'; this.style.color='rgba(255,183,197,0.7)';"
                     onclick="const b=document.getElementById('launch-log-box'); b.style.display=b.style.display==='none'?'block':'none'">
                    MOSTRAR CONSOLA LOGS
                </div>
                <div id="launch-log-box" style="display:none; width:80%; max-width:800px; height:180px; margin-top:15px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,183,197,0.2); border-radius:10px; color:#cfcfcf; font-family:Consolas, monospace; font-size:10px; padding:10px; overflow-y:auto; overflow-x:hidden; text-align:left; scroll-behavior:smooth;"></div>
            `;
            document.body.appendChild(overlay);
        }

        const root = document.getElementById('root');
        const userHub = document.getElementById('user-hub');
        
        if (active) {
            overlay.classList.add('active');
            document.body.classList.add('launch-sequence-active');
            if (root) root.classList.add('ui-fade-out');
            if (userHub) userHub.classList.add('ui-fade-out');
        } else {
            overlay.classList.remove('active');
            document.body.classList.remove('launch-sequence-active');
            if (root) root.classList.remove('ui-fade-out');
            if (userHub) userHub.classList.remove('ui-fade-out');
        }
    };

    window.electronAPI.onLaunchProgress((data) => {
        // TRIGGER JARVIS ON START
        if (!window.JARVIS_LAUNCHING) {
             window.speak("Iniciando secuencia de lanzamiento. Buen viaje, Piloto.");
             // window.Soundscape.playLaunchSequence(); // Desactivado por ahora a petición
             window.Soundscape.stopAmbient(); // DETENER AMBIENTE
             window.JARVIS_LAUNCHING = true;
        }
        toggleLaunchUI(true);
        const status = document.getElementById('launch-status');
        const bar = document.getElementById('launch-bar-inner-new');
        
        if (status) {
            let msg = data.step || data.type || 'CARGANDO...';
            if (msg.includes('forge')) msg = 'PREPARANDO FORGE';
            if (data.task) msg = `${data.task} ${data.total ? Math.floor((data.downloaded / data.total) * 100) + '%' : ''}`;
            status.innerText = msg.toUpperCase();
        }

        if (bar) {
            let pct = 10;
            if (data.downloaded && data.total) pct = Math.min(95, Math.floor((data.downloaded / data.total) * 100));
            else if (data.step && data.step.includes('FORGE')) pct = 60;
            else if (data.step && data.step.includes('PREPARING')) pct = 30;
            bar.style.width = pct + '%';
        }
    });

    if (window.electronAPI.onLaunchLog) {
        window.electronAPI.onLaunchLog((logStr) => {
            const logBox = document.getElementById('launch-log-box');
            if (logBox) {
                const span = document.createElement('div');
                span.innerText = `[INFO] ${logStr}`;
                span.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                span.style.padding = '2px 0';
                logBox.appendChild(span);
                if (logBox.children.length > 150) logBox.removeChild(logBox.firstChild);
                logBox.scrollTop = logBox.scrollHeight;
            }
        });
    }

    window.electronAPI.onGameStarted(() => {
        const status = document.getElementById('launch-status');
        const bar = document.getElementById('launch-bar-inner-new');
        if (status) status.innerText = '¡JUEGO INICIADO! DISFRUTA PAPU';
        if (bar) bar.style.width = '100%';
        
        console.log('UI: Game started. Preparing to close launcher...');
        setTimeout(() => {
            window.electronAPI.closeWindow(); // This calls win.close() in main.js
        }, 3500); 
    });

    window.electronAPI.onLaunchFinished(() => {
        toggleLaunchUI(false);
        const btn = document.getElementById('play-btn');
        if (btn) {
            btn.innerText = t('play');
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        console.log('UI: Game Launched.');
    });

    // UPDATE NOTIFICATIONS (Banner)
    window.electronAPI.onUpdateAvailable((data) => {
        console.log('UI: Update Available Received:', data);
        const root = document.getElementById('root');
        if (!root) return;

        if (document.getElementById('ota-update-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'ota-update-banner';
        banner.className = 'glass';
        banner.style.cssText = `
            position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
            z-index: 9999; padding: 15px 30px; display: flex; align-items: center;
            gap: 20px; border-radius: 15px; border: 1px solid #ffb7c5;
            box-shadow: 0 0 30px rgba(255,183,197,0.3); animation: slideDown 0.5s ease-out;
        `;

        banner.innerHTML = `
            <div id="ota-status-wrap">
                <div style="font-size: 11px; font-weight: 900; letter-spacing: 2px;">
                    <span style="color: #ffb7c5;">ACTUALIZACIÓN DETECTADA:</span> v${data.version}
                </div>
                <div style="font-size: 9px; opacity: 0.6; margin-top: 3px;">INSTALADA: ${data.current || 'v0.2.0'}</div>
            </div>
            <button class="btn-play-custom" id="ota-start-update" style="padding: 8px 20px; font-size: 10px; border-radius: 8px;">ACTUALIZAR AHORA</button>
            <i class="fas fa-times" id="ota-close-banner" style="cursor: pointer; opacity: 0.5; font-size: 12px;"></i>
        `;

        root.appendChild(banner);

        const btn = document.getElementById('ota-start-update');
        const statusWrap = document.getElementById('ota-status-wrap');

        btn.onclick = () => {
             if (btn.disabled) return;
             btn.disabled = true;
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PREPARANDO...';
             window.electronAPI.startAutoUpdate(data.url);
        };

        window.electronAPI.onAutoUpdateProgress((info) => {
            btn.innerHTML = `<i class="fas fa-cog fa-spin"></i> ${info.progress}%`;
            statusWrap.innerHTML = `<div style="font-size: 11px; font-weight: 900; letter-spacing: 1px; color: #ffb7c5;">${info.step.toUpperCase()}</div>`;
        });

        window.electronAPI.onAutoUpdateError((err) => {
            btn.disabled = false;
            btn.style.background = '#ff4444';
            btn.innerHTML = 'REINTENTAR';
            statusWrap.innerHTML = `<div style="font-size: 10px; color: #ff4444;">ERROR: ${err}</div>`;
        });

        document.getElementById('ota-close-banner').onclick = () => {
             banner.style.animation = 'slideUp 0.5s ease-in forwards';
             setTimeout(() => banner.remove(), 500);
        };
    });

    window.electronAPI.onLaunchError((err) => {
        toggleLaunchUI(false);
        const btn = document.getElementById('play-btn');
        if (btn) {
            btn.innerText = t('play');
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        alert('LAUNCH ERROR: ' + err);
    });

    // ... (News and Login listeners moved up)


    // CUSTOM MODAL SYSTEM - PREMIUM REDESIGN 💎
    window.showModal = (title, content, callback, isAlert = false) => {
        // Remove existing modals before opening a new one
        const existing = document.getElementById('custom-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'glass-overlay';
        overlay.id = 'custom-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; animation: fadeIn 0.4s ease;
        `;
        
        const contentHtml = isAlert 
            ? `<div style="font-size: 14px; opacity: 0.9; margin-bottom: 35px; line-height: 1.6; color: #fff; font-weight: 700;">${content}</div>` 
            : `<input type="text" id="modalInput" placeholder="${content}" class="v-opt" style="width: 100%; padding: 18px; margin-bottom: 35px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,183,197,0.3); color: #fff; font-weight: 950; letter-spacing: 2px; border-radius: 15px; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">`;

        const buttonsHtml = isAlert 
            ? `<button id="modalConfirm" class="btn-play-custom" style="width: 100%; padding: 15px; font-size: 12px; letter-spacing: 4px; box-shadow: 0 10px 20px rgba(255,183,197,0.2);">ENTENDIDO</button>`
            : `<div style="display: flex; gap: 20px; width: 100%;">
                 <button id="modalConfirm" class="btn-play-custom" style="flex: 1; padding: 13px; font-size: 11px; letter-spacing: 3px;">CONFIRMAR</button>
                 <button id="modalCancel" class="btn-play-custom btn-secondary" style="flex: 1; padding: 13px; font-size: 11px; letter-spacing: 3px;">CANCELAR</button>
               </div>`;

        overlay.innerHTML = `
            <div class="glass" style="padding: 45px; border-radius: 35px; width: 420px; text-align: center; border: 1px solid rgba(255,183,197,0.4); background: linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(10,10,10,0.98) 100%); box-shadow: 0 25px 50px rgba(0,0,0,0.6); animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width: 50px; height: 4px; background: #ffb7c5; border-radius: 10px; margin: 0 auto 25px; box-shadow: 0 0 15px #ffb7c5;"></div>
                <h2 style="font-weight: 950; letter-spacing: 6px; color: #ffb7c5; margin-bottom: 30px; font-size: 20px; text-shadow: 0 0 15px rgba(255,183,197,0.4); text-transform: uppercase;">${title}</h2>
                ${contentHtml}
                ${buttonsHtml}
            </div>
        `;
        document.body.appendChild(overlay);
        
        const input = document.getElementById('modalInput');
        if (input) input.focus();

        document.getElementById('modalConfirm').onclick = () => {
            const val = input ? input.value : null;
            overlay.remove();
            if (callback) callback(val);
        };
        
        const cancelBtn = document.getElementById('modalCancel');
        if (cancelBtn) {
            cancelBtn.onclick = () => overlay.remove();
        }
        
        if (input) {
            input.onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('modalConfirm').click(); };
        }
    };

    } catch (e) {
        console.error('CRITICAL UI INIT ERROR:', e);
        if (window.electronAPI) window.electronAPI.logError('UI INIT CRASH: ' + e.message);
    }

    // DRAG AND DROP MOD INSTALLATION
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.name.toLowerCase().endsWith('.jar')) {
                    console.log('UI: Requesting mod installation for:', file.path);
                    window.electronAPI.installMod(file.path);
                }
            }
        }
    });

    window.electronAPI.onModInstalledSuccess((fileName) => {
        if (typeof window.showModal === 'function') {
            window.showModal('MOD INSTALADO', `El mod <b>${fileName}</b> se ha instalado correctamente. Reinicia el juego para aplicarlo.`, null, true);
        } else {
            alert(`MOD INSTALADO: ${fileName}`);
        }
        // Force refresh mods list if we are in the mods tab
        if (window.electronAPI.getModsList) window.electronAPI.getModsList();
    });

    window.electronAPI.onTriggerModsRefresh(() => {
        console.log('UI: Refreshing mods list due to backend trigger...');
        if (window.electronAPI.getModsList) window.electronAPI.getModsList();
    });

    window.electronAPI.onModInstalledError((err) => {
        if (typeof window.showModal === 'function') {
            window.showModal('ERROR DE MOD', `No se pudo instalar el mod: ${err}`, null, true);
        } else {
            alert('ERROR: ' + err);
        }
    });
};

// AUTO-INIT CHECK
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCore);
} else {
    initCore();
}
