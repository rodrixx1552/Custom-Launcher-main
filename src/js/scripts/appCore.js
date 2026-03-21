console.log('UI: appCore.js loading...');

// 1. GLOBAL ERROR & SYSTEM PROTECTION
window.onerror = function(message, source, lineno, colno, error) {
    const err = `UI ERROR: ${message} at ${source}:${lineno}:${colno}`;
    console.error(err);
    if (window.electronAPI && window.electronAPI.logError) window.electronAPI.logError(err);
};

window.onunhandledrejection = function(event) {
    const err = `UI PROMISE REJECTION: ${event.reason}`;
    console.error(err);
    if (window.electronAPI && window.electronAPI.logError) window.electronAPI.logError(err);
};

// AUDIO SYSTEM
var CLICK_SOUND_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/assets/click.mp3';
var clickAudio = new Audio(CLICK_SOUND_URL);
clickAudio.preload = 'auto';
window.playClick = () => {
    const sysVol = parseFloat(localStorage.getItem('sysVolume') || '0.8');
    clickAudio.currentTime = 0;
    clickAudio.volume = sysVol;
    clickAudio.play().catch(e => console.warn('[AUDIO] Blocked:', e.message));
};

document.addEventListener('mousedown', (e) => {
    const el = e.target.closest('button, .nav-item, .v-opt, .premium-card');
    if (el) window.playClick();
}, true);

// 2. CORE INITIALIZATION ENGINE
var initCore = () => {
    console.log('UI: Core Initializing...');
    
    if (!window.electronAPI) {
        console.error('CRITICAL: electronAPI not found!');
        alert('SYSTEM ERROR: window.electronAPI is undefined.');
        return;
    }

    // A. DATA & LOCALIZATION
    let settings, translations;
    try {
        settings = window.electronAPI.getSettings();
        translations = window.electronAPI.getTranslations();
    } catch (e) {
        console.error('UI: Data load failed:', e);
    }

    const mainContent = document.getElementById('main-content');
    let currentLang = localStorage.getItem('lang') || 'es';

    window.t = (key) => {
        if (!translations || !translations[currentLang]) return key;
        return translations[currentLang][key] || key;
    };

    // B. GLOBAL HELPER COMPONENTS
    const injectLaunchStyles = () => {
        if (document.getElementById('launch-sequence-styles')) return;
        const style = document.createElement('style');
        style.id = 'launch-sequence-styles';
        style.innerText = `
            #launch-overlay { position: fixed; inset: 0; z-index: 100000; background: radial-gradient(circle at center, #1a0b16 0%, #000 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 1s ease; }
            #launch-overlay.active { opacity: 1; visibility: visible; }
            .launch-logo-img { width: 480px; filter: drop-shadow(0 0 30px rgba(255, 183, 197, 0.3)); animation: launchLogoFloat 4s infinite ease-in-out; }
            .launch-status-text { font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin-top: 20px; text-transform: uppercase; font-size: 14px; }
            .launch-progress-wrap-new { width: 400px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-top: 25px; overflow: hidden; }
            .launch-progress-bar-new { width: 0%; height: 100%; background: linear-gradient(90deg, #ffb7c5, #ff8c4a); box-shadow: 0 0 15px #ffb7c5; transition: width 0.4s ease; }
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
            overlay.innerHTML = `<div class="launch-logo-box"><img src="../assets/los_papus/logo.png" class="launch-logo-img"></div><div class="launch-status-text" id="launch-status">INICIALIZANDO...</div><div class="launch-progress-wrap-new"><div class="launch-progress-bar-new" id="launch-bar-inner-new"></div></div>`;
            document.body.appendChild(overlay);
        }
        const root = document.getElementById('root');
        const userHub = document.getElementById('user-hub');
        if (active) {
            overlay.classList.add('active');
            if (root) root.classList.add('ui-fade-out');
            if (userHub) userHub.classList.add('ui-fade-out');
        } else {
            overlay.classList.remove('active');
            if (root) root.classList.remove('ui-fade-out');
            if (userHub) userHub.classList.remove('ui-fade-out');
        }
    };

    window.updateGlobalUI = () => {
        const userText = document.getElementById('user-name-text');
        const userAvatar = document.getElementById('user-avatar');
        const verText = document.getElementById('selected-version-text');
        const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
        const defVer = (settings && settings.client) ? settings.client.default_version : '1.20.1';
        const ver = localStorage.getItem('selectedVersion') || defVer;

        if (userText) userText.innerText = acc ? acc.name.toUpperCase() : t('pilot_offline');
        if (userAvatar) {
            userAvatar.src = acc ? `https://mc-heads.net/avatar/${acc.name}/35` : '../assets/user.png';
            userAvatar.onerror = () => userAvatar.src = '../assets/user.png';
        }
        if (verText) verText.innerText = `Minecraft ${ver}`;
        window.applyBackground();
    };

    window.setLang = (l) => {
        localStorage.setItem('lang', l);
        currentLang = l;
        renderSettingsTab();
        window.updateGlobalUI();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            const span = item.querySelector('span');
            if (span) {
                const text = span.innerText.toLowerCase();
                const menuItems = { 'play': t('play'), 'accounts': t('accounts'), 'skins': t('skins'), 'settings': t('settings'), 'community': t('community') };
                if (menuItems[text]) span.innerText = menuItems[text];
            }
        });
    };

    window.applyBackground = async () => {
        const bgFX = localStorage.getItem('bgFX') || 'matrix';
        const bgElem = document.getElementById('bg-anim');
        if (!bgElem) return;
        bgElem.className = 'background-animation';
        bgElem.style.cssText = '';
        const imgBGs = { bg1: '../assets/backgrounds/background1.png', bg2: '../assets/backgrounds/background2.png', bg3: '../assets/backgrounds/background3.png', bg4: '../assets/backgrounds/background4.png' };
        if (imgBGs[bgFX]) {
            bgElem.style.backgroundImage = `url('${imgBGs[bgFX]}')`;
            bgElem.style.backgroundSize = 'cover';
            bgElem.style.backgroundPosition = 'center';
        } else if (bgFX === 'weather') {
            bgElem.style.background = 'linear-gradient(180deg, #09203f 0%, #537895 100%)';
        } else {
            bgElem.classList.add(`bg-${bgFX}`);
        }
    };

    // C. TAB RENDERERS
    window.renderPlayTab = () => {
        const defVer = (settings && settings.client) ? settings.client.default_version : '1.20.1';
        let ver = localStorage.getItem('selectedVersion') || defVer;
        const forgeEnabled = localStorage.getItem('forgeEnabled') !== 'false';
        const forgeBadge = (forgeEnabled && ver === '1.20.1') ? `<div style="position: absolute; top: 20px; right: 20px; background: #ffb7c5; color: #000; padding: 5px 15px; border-radius: 8px; font-size: 9px; font-weight: 900;">${t('forge_active')}</div>` : '';

        mainContent.innerHTML = `
            <div id="mainContainer" style="animation: scaleIn 0.8s ease-out; width: 100%; height: 100%; display: flex;">
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
                    <div class="logo-wrapper" style="margin-bottom: 30px;"><img src="../assets/los_papus/logo.png" class="main-logo"></div>
                    <div class="version-card glass" id="version-selector-card" style="text-align: center; padding: 40px 50px; min-width: 400px; border-radius: 30px; position: relative;">
                        ${forgeBadge}
                        <h2 style="font-weight: 900; letter-spacing: 8px; color: #ffb7c5; margin-bottom: 10px;">JAVA EDITION</h2>
                        <div id="selected-version-text" style="font-size: 28px; font-weight: 900; margin-bottom: 30px;">Minecraft ${ver}</div>
                        <div class="server-status-pill" style="display: inline-flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.4); padding: 10px 20px; border-radius: 50px;">
                            <div class="pulse-dot" id="server-dot" style="width: 10px; height: 10px; background: #ff8c4a; border-radius: 50%;"></div>
                            <span id="server-ping-text" style="font-size: 13px; font-weight: 900;">${t('scanning_core')}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 25px; margin-top: 40px;">
                        <button class="btn-play-custom" id="play-btn" style="padding: 25px 80px; font-size: 38px; border-radius: 25px;">${t('play')}</button>
                        <button class="btn-play-custom btn-outline" id="sync-mods-btn" style="padding: 20px 40px; font-size: 18px; border-radius: 25px;">UPDATE MODS<br><small id="sync-mod-status">CHECK</small></button>
                    </div>
                    <div id="inline-sync-progress" style="display: none; width: 100%; max-width: 500px; margin-top: 20px;">
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;"><div id="inline-sync-bar" style="width: 0%; height: 100%; background: #ffb7c5;"></div></div>
                    </div>
                </div>
                <div class="glass" style="width: 280px; border-left: 1px solid rgba(255,183,197,0.1); display: flex; flex-direction: column;">
                    <div style="padding: 20px; border-bottom: 1px solid rgba(255,183,197,0.1); font-size: 10px; font-weight: 900; color: #ffb7c5;">📡 STAFF BROADCAST</div>
                    <div id="news-feed" style="flex: 1; overflow-y: auto; padding: 15px;"></div>
                </div>
            </div>
        `;
        initPlayListeners();
        window.updateGlobalUI();
        window.electronAPI.pingServer('sprat.aternos.host:44481');
        window.electronAPI.fetchNews();
    };

    const initPlayListeners = () => {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
            if (!acc) return alert(t('access_denied'));
            const ver = localStorage.getItem('selectedVersion') || '1.20.1';
            const ram = localStorage.getItem('maxRam') || '3';
            const forge = localStorage.getItem('forgeEnabled') !== 'false';
            window.electronAPI.launchGame({ nick: acc.name, version: ver, maxRam: ram, account: acc, forgeVersion: forge ? '47.4.17' : null });
        });
        document.getElementById('sync-mods-btn')?.addEventListener('click', () => {
            document.getElementById('inline-sync-progress').style.display = 'block';
            window.electronAPI.syncModpacks();
        });
    };

    window.renderAccountsTab = () => {
        mainContent.innerHTML = `<div style="padding: 40px; height: 100%; display: flex; flex-direction: column;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;"><div><h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5;">${t('elite_hub')}</h1></div><div style="display: flex; gap: 15px;"><button onclick="window.startMicrosoftLogin()" class="btn-play-custom btn-outline">${t('microsoft_login')}</button><button onclick="window.startOfflineLogin()" class="btn-play-custom btn-secondary">${t('offline_login')}</button></div></div><div id="accounts-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;"></div></div>`;
        window.electronAPI.getAccounts();
    };

    window.renderSettingsTab = () => {
        const ram = localStorage.getItem('maxRam') || '3';
        const vol = Math.round((localStorage.getItem('sysVolume') || '0.8') * 100);
        const lang = localStorage.getItem('lang') || 'es';
        const forge = localStorage.getItem('forgeEnabled') !== 'false';
        mainContent.innerHTML = `
            <div style="padding: 40px; height: 100%; overflow-y: auto;">
                <h1 style="color: #ffb7c5; margin-bottom: 35px;">${t('command_center')}</h1>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                    <div class="glass" style="padding: 20px;"><h3>RAM: <span id="ramVal">${ram} GB</span></h3><input type="range" id="ramRange" min="1" max="16" value="${ram}" oninput="document.getElementById('ramVal').innerText = this.value + ' GB'; localStorage.setItem('maxRam', this.value)"></div>
                    <div class="glass" style="padding: 20px;"><h3>VOL: <span id="volVal">${vol}%</span></h3><input type="range" min="0" max="100" value="${vol}" oninput="document.getElementById('volVal').innerText = this.value + '%'; localStorage.setItem('sysVolume', this.value/100); window.playClick()"></div>
                    <div class="glass" style="padding: 20px;"><h3>LANGUAGE</h3><button class="v-opt" onclick="setLang('es')">ESPAÑOL</button><button class="v-opt" onclick="setLang('en')">ENGLISH</button></div>
                    <div class="glass" style="padding: 20px;"><h3>FORGE</h3><button class="v-opt ${forge?'active':''}" onclick="localStorage.setItem('forgeEnabled', '${!forge}'); renderSettingsTab()">${forge?'ACTIVE':'DISABLED'}</button></div>
                </div>
            </div>`;
    };

    // D. IPC LISTENERS (REGISTER ONCE)
    window.electronAPI.onNewsLoaded((data) => {
        const feed = document.getElementById('news-feed');
        if (!feed || !data.posts) return;
        feed.innerHTML = data.posts.map(p => `<div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,183,197,0.1); padding-bottom: 10px;"><div style="font-size: 8px; color: #ffb7c5;">${p.tag} | ${p.date}</div><p style="font-size: 11px; margin: 5px 0;">${p.text}</p></div>`).join('');
    });

    window.electronAPI.onAccountsList((accounts) => {
        const list = document.getElementById('accounts-list');
        if (!list) return;
        const activeAcc = JSON.parse(localStorage.getItem('activeAccount') || '{}');
        list.innerHTML = accounts.map(acc => `
            <div class="account-card-premium ${activeAcc.uuid === acc.uuid ? 'active' : ''}" style="display: flex; align-items: center; padding: 20px; background: rgba(0,0,0,0.3); border-radius: 15px;">
                <img src="https://mc-heads.net/avatar/${acc.name}/40" style="margin-right: 15px;">
                <div style="flex: 1;"><div>${acc.name.toUpperCase()}</div><small>${acc.type}</small></div>
                ${activeAcc.uuid !== acc.uuid ? `<button onclick="setActive('${acc.uuid}')" class="v-opt">SELECT</button>` : '<span>ACTIVE</span>'}
                <button onclick="window.electronAPI.removeAccount('${acc.uuid}')" style="margin-left: 10px;">X</button>
            </div>`).join('');
    });

    window.electronAPI.onPingResult((data) => {
        const pingText = document.getElementById('server-ping-text');
        const dot = document.getElementById('server-dot');
        if (pingText && dot) {
            pingText.innerText = data.online ? `ONLINE | ${data.players.online}/${data.players.max}` : 'OFFLINE';
            dot.style.background = data.online ? '#4cd137' : '#e84118';
        }
    });

    window.electronAPI.onSyncProgress((data) => {
        const bar = document.getElementById('inline-sync-bar');
        const status = document.getElementById('sync-mod-status');
        if (bar) bar.style.width = `${data.progress}%`;
        if (status) status.innerText = data.step.toUpperCase();
    });

    window.electronAPI.onSyncFinished(() => { alert('MODS UPDATED!'); renderPlayTab(); });
    window.electronAPI.onSyncError((err) => alert('SYNC ERROR: ' + err));

    window.electronAPI.onLaunchProgress((data) => {
        toggleLaunchUI(true);
        const st = document.getElementById('launch-status');
        const bar = document.getElementById('launch-bar-inner-new');
        if (st) st.innerText = (data.step || 'LOADING...').toUpperCase();
        if (bar) bar.style.width = (data.downloaded ? Math.floor((data.downloaded/data.total)*100) : 10) + '%';
    });

    window.electronAPI.onGameStarted(() => {
        const st = document.getElementById('launch-status');
        if (st) st.innerText = 'GAME STARTED!';
        setTimeout(() => window.electronAPI.closeWindow(), 3000);
    });

    window.electronAPI.onLaunchError((err) => { toggleLaunchUI(false); alert('LAUNCH ERROR: ' + err); });

    window.electronAPI.onLoginSuccess((acc) => { localStorage.setItem('activeAccount', JSON.stringify(acc)); location.reload(); });
    window.electronAPI.onLoginError((err) => alert('LOGIN FAIL: ' + err));

    // E. SIDEBAR ENGINE
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const tab = item.getAttribute('data-tab');
            if (tab === 'play') renderPlayTab();
            else if (tab === 'accounts') renderAccountsTab();
            else if (tab === 'settings') renderSettingsTab();
            else alert('Tab Not Ready');
        };
    });

    // F. FINAL STARTUP
    if (!window.CORE_INITIALIZED) {
        window.CORE_INITIALIZED = true;
        const preloader = document.getElementById('preloader');
        if (preloader) {
            setTimeout(() => {
                preloader.style.opacity = '0';
                setTimeout(() => preloader.remove(), 1000);
            }, 3000);
        }
    }
    renderPlayTab();
};

// 3. BOOTSTRAP
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCore);
else initCore();

// 4. GLOBAL HELPERS
window.startMicrosoftLogin = () => window.electronAPI.loginMicrosoft();
window.startOfflineLogin = () => {
    const name = prompt('ENTER PILOT NAME');
    if (name) window.electronAPI.addOfflineAccount(name.trim());
};
window.setActive = (uuid) => {
    window.electronAPI.onAccountsListOnce((list) => {
        const acc = list.find(a => a.uuid === uuid);
        if (acc) { localStorage.setItem('activeAccount', JSON.stringify(acc)); location.reload(); }
    });
    window.electronAPI.getAccounts();
};

// CUSTOM MODAL SYSTEM (Legacy support)
window.showModal = (title, content, cb, isAlert) => {
    if (isAlert) alert(`${title}\n${content}`);
    else { const val = prompt(content); if (cb) cb(val); }
};
