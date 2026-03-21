console.log('UI: appCore.js loading...');

// 1. GLOBAL UI CORE
window.onerror = function(m, s, l, c, e) {
    const txt = `UI ERROR: ${m} at ${s}:${l}:${c}`;
    console.error(txt);
    if (window.electronAPI && window.electronAPI.logError) window.electronAPI.logError(txt);
};

// AUDIO
var CLICK_SOUND_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/assets/click.mp3';
var clickAudio = new Audio(CLICK_SOUND_URL);
window.playClick = () => {
    const vol = parseFloat(localStorage.getItem('sysVolume') || '0.8');
    clickAudio.currentTime = 0; clickAudio.volume = vol;
    clickAudio.play().catch(e => console.warn('[AUDIO] Blocked:', e.message));
};
document.addEventListener('mousedown', (e) => { if (e.target.closest('button, .nav-item, .v-opt, .premium-card')) window.playClick(); }, true);

// 2. MAIN INITIALIZATION WRAPPER
var initCore = () => {
    console.log('UI: Core Initializing...');
    
    if (!window.electronAPI) {
        alert('CRITICAL ERROR: window.electronAPI is undefined.');
        return;
    }

    // A. DATA LAYER
    let settings, translations;
    try {
        settings = window.electronAPI.getSettings();
        translations = window.electronAPI.getTranslations();
    } catch (e) { console.error('UI: Config load failed:', e); }

    const mainContent = document.getElementById('main-content');
    let currentLang = localStorage.getItem('lang') || 'es';

    window.t = (key) => {
        if (!translations || !translations[currentLang]) return key;
        return translations[currentLang][key] || key;
    };

    // B. COMPONENT CONTROLLERS
    const toggleLaunchUI = (active) => {
        let overlay = document.getElementById('launch-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'launch-overlay';
            overlay.innerHTML = `<div class="launch-logo-box"><img src="../assets/los_papus/logo.png" class="launch-logo-img" style="width: 480px; filter: drop-shadow(0 0 30px rgba(255, 183, 197, 0.3));"></div><div class="launch-status-text" id="launch-status" style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin-top: 20px; text-transform: uppercase;">INICIALIZANDO...</div><div style="width: 400px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-top: 25px; overflow: hidden;"><div id="launch-bar-inner-new" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ffb7c5, #ff8c4a); transition: width 0.4s ease;"></div></div>`;
            overlay.style.cssText = "position: fixed; inset: 0; z-index: 100000; background: radial-gradient(circle at center, #1a0b16 0%, #000 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 1s ease;";
            document.body.appendChild(overlay);
        }
        const root = document.getElementById('root');
        if (active) { overlay.classList.add('active'); overlay.style.opacity = '1'; overlay.style.visibility = 'visible'; if (root) root.style.opacity = '0'; }
        else { overlay.classList.remove('active'); overlay.style.opacity = '0'; overlay.style.visibility = 'hidden'; if (root) root.style.opacity = '1'; }
    };

    window.updateGlobalUI = () => {
        const uText = document.getElementById('user-name-text');
        const uAv = document.getElementById('user-avatar');
        const vText = document.getElementById('selected-version-text');
        const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
        const defVer = (settings && settings.client) ? settings.client.default_version : '1.20.1';
        const v = localStorage.getItem('selectedVersion') || defVer;

        if (uText) uText.innerText = acc ? acc.name.toUpperCase() : t('pilot_offline');
        if (uAv) { uAv.src = acc ? `https://mc-heads.net/avatar/${acc.name}/35` : '../assets/user.png'; uAv.onerror = () => uAv.src = '../assets/user.png'; }
        if (vText) vText.innerText = `Minecraft ${v}`;
        window.applyBackground();
    };

    window.applyBackground = () => {
        const fx = localStorage.getItem('bgFX') || 'matrix';
        const el = document.getElementById('bg-anim');
        if (!el) return;
        el.className = 'background-animation';
        el.style.cssText = "opacity: 1; transition: opacity 1s ease;";
        const imgs = { bg1: '../assets/backgrounds/background1.png', bg2: '../assets/backgrounds/background2.png', bg3: '../assets/backgrounds/background3.png', bg4: '../assets/backgrounds/background4.png' };
        if (imgs[fx]) { el.style.backgroundImage = `url('${imgs[fx]}')`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
        else if (fx === 'weather') { el.style.background = 'linear-gradient(180deg, #09203f 0%, #537895 100%)'; }
        else { el.classList.add(`bg-${fx}`); }
    };

    window.setLang = (l) => {
        localStorage.setItem('lang', l); currentLang = l;
        renderSettingsTab(); window.updateGlobalUI();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => {
            const s = i.querySelector('span');
            if (s) {
                const txt = s.innerText.toLowerCase();
                const m = { 'play': t('play'), 'accounts': t('accounts'), 'skins': t('skins'), 'settings': t('settings'), 'community': t('community') };
                if (m[txt]) s.innerText = m[txt];
            }
        });
    };

    // C. TAB RENDERERS
    window.renderPlayTab = () => {
        const defVer = (settings && settings.client) ? settings.client.default_version : '1.20.1';
        let ver = localStorage.getItem('selectedVersion') || defVer;
        const forge = (localStorage.getItem('forgeEnabled') !== 'false' && ver === '1.20.1');

        mainContent.innerHTML = `
            <div id="mainContainer" style="animation: scaleIn 0.8s ease-out; width: 100%; height: 100%; display: flex;">
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
                    <div style="margin-bottom: 30px;"><img src="../assets/los_papus/logo.png" style="width: 320px; filter: drop-shadow(0 0 20px rgba(0,0,0,0.4));"></div>
                    <div class="version-card glass" id="version-selector-card" style="text-align: center; padding: 40px 50px; min-width: 400px; border-radius: 30px; position: relative; border: 1px solid rgba(255,183,197,0.2);">
                        ${forge ? `<div style="position: absolute; top: 15px; right: 20px; background: #ffb7c5; color: #000; padding: 4px 12px; border-radius: 8px; font-size: 9px; font-weight: 900;">FORGE ACTIVE</div>` : ''}
                        <h2 style="font-weight: 900; letter-spacing: 6px; color: #ffb7c5; margin-bottom: 10px;">JAVA EDITION</h2>
                        <div style="font-size: 28px; font-weight: 900; margin-bottom: 30px;">Minecraft ${ver}</div>
                        <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); padding: 8px 18px; border-radius: 50px;">
                            <div id="server-dot" style="width: 8px; height: 8px; background: #ff8c4a; border-radius: 50%;"></div>
                            <span id="server-ping-text" style="font-size: 11px; font-weight: 900; opacity: 0.8;">${t('scanning_core')}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 20px; margin-top: 40px;">
                        <button class="btn-play-custom" id="play-btn" style="padding: 22px 70px; font-size: 32px; border-radius: 20px;">${t('play')}</button>
                        <button class="btn-play-custom btn-outline" id="sync-mods-btn" style="padding: 18px 30px; font-size: 14px; border-radius: 20px; text-align: center;">UPDATE MODS<br><small id="sync-mod-status" style="font-size: 9px; opacity: 0.7;">CHECK</small></button>
                    </div>
                    <div id="inline-sync-progress" style="display: none; width: 400px; margin-top: 20px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                        <div id="inline-sync-bar" style="width: 0%; height: 100%; background: #ffb7c5; box-shadow: 0 0 10px #ffb7c5;"></div>
                    </div>
                </div>
                <div class="glass" style="width: 260px; border-left: 1px solid rgba(255,183,197,0.1); display: flex; flex-direction: column;">
                    <div style="padding: 15px; border-bottom: 1px solid rgba(255,183,197,0.1); font-size: 10px; font-weight: 950; color: #ffb7c5; letter-spacing: 2px;">📡 NEWS BROADCAST</div>
                    <div id="news-feed" style="flex: 1; overflow-y: auto; padding: 15px;"></div>
                </div>
            </div>
        `;
        initPlayListeners(); window.updateGlobalUI();
        window.electronAPI.pingServer('sprat.aternos.host:44481');
        window.electronAPI.fetchNews();
    };

    const initPlayListeners = () => {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            const a = JSON.parse(localStorage.getItem('activeAccount') || 'null');
            if (!a) return alert(t('access_denied'));
            const v = localStorage.getItem('selectedVersion') || '1.20.1';
            const f = (localStorage.getItem('forgeEnabled') !== 'false' && v === '1.20.1');
            window.electronAPI.launchGame({ nick: a.name, version: v, maxRam: localStorage.getItem('maxRam')||'3', account: a, forgeVersion: f?'47.4.17':null });
        });
        document.getElementById('sync-mods-btn')?.addEventListener('click', () => {
            document.getElementById('inline-sync-progress').style.display = 'block';
            window.electronAPI.syncModpacks();
        });
    };

    window.renderAccountsTab = () => {
        mainContent.innerHTML = `<div style="padding: 40px; height: 100%; display: flex; flex-direction: column;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;"><div><h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5;">${t('elite_hub')}</h1></div><div style="display: flex; gap: 15px;"><button onclick="window.startMicrosoftLogin()" class="btn-play-custom btn-outline" style="font-size: 11px; padding: 12px 25px;">${t('microsoft_login')}</button><button onclick="window.startOfflineLogin()" class="btn-play-custom btn-secondary" style="font-size: 11px; padding: 12px 25px;">${t('offline_login')}</button></div></div><div id="accounts-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; overflow-y: auto;"></div></div>`;
        window.electronAPI.getAccounts();
    };

    window.renderSkinsTab = () => {
        mainContent.innerHTML = `<div style="padding: 40px; height: 100%; background: rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center;"><div style="text-align: center; color: #ffb7c5;"><i class="fas fa-cube fa-spin" style="font-size: 50px; margin-bottom: 20px;"></i><h2 style="font-weight: 900; letter-spacing: 4px;">SYSTEM CORE SCANNING</h2><p style="opacity: 0.5;">The 3D Neural Link for Pilot Skins is being synchronized...</p></div></div>`;
    };

    window.renderModsTab = () => {
        mainContent.innerHTML = `<div style="padding: 40px; height: 100%;"><h1 style="color: #ffb7c5; margin-bottom: 30px;">THE FORGE: MODS</h1><div id="mods-list" style="display: grid; gap: 10px;"></div></div>`;
        window.electronAPI.getModsList().then(mods => {
            const list = document.getElementById('mods-list');
            if (!list) return;
            if (mods.length === 0) { list.innerHTML = '<div style="opacity: 0.3; text-align: center; padding-top: 50px;">NO MODS DETECTED IN STORAGE.</div>'; return; }
            list.innerHTML = mods.map(m => `<div class="glass" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px;"><div><div style="font-weight: 900; font-size: 13px;">${m.name.toUpperCase()}</div><small style="opacity: 0.5;">v${m.version || '1.0.0'}</small></div><i class="fas ${m.enabled?'fa-check-circle':'fa-times-circle'}" style="color: ${m.enabled?'#4cd137':'#e84118'}"></i></div>`).join('');
        });
    };

    window.renderSettingsTab = () => {
        const r = localStorage.getItem('maxRam') || '3';
        const v = Math.round((localStorage.getItem('sysVolume') || '0.8') * 100);
        const l = localStorage.getItem('lang') || 'es';
        const f = localStorage.getItem('forgeEnabled') !== 'false';
        mainContent.innerHTML = `<div style="padding: 40px; height: 100%; overflow-y: auto;"><h1 style="color: #ffb7c5; margin-bottom: 35px; letter-spacing: 4px;">${t('command_center')}</h1><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;"><div class="glass" style="padding: 25px;"><h3>MEMORY: <span id="rVal">${r} GB</span></h3><input type="range" min="1" max="16" value="${r}" oninput="document.getElementById('rVal').innerText=this.value+' GB';localStorage.setItem('maxRam',this.value)" style="width: 100%;"></div><div class="glass" style="padding: 25px;"><h3>AUDIO: <span id="vVal">${v}%</span></h3><input type="range" min="0" max="100" value="${v}" oninput="document.getElementById('vVal').innerText=this.value+'%';localStorage.setItem('sysVolume',this.value/100);window.playClick()" style="width: 100%;"></div><div class="glass" style="padding: 25px;"><h3>LANGUAGE</h3><div style="display: flex; gap: 10px;"><button class="v-opt ${l==='es'?'active':''}" onclick="setLang('es')">ESPAÑOL</button><button class="v-opt ${l==='en'?'active':''}" onclick="setLang('en')">ENGLISH</button></div></div><div class="glass" style="padding: 25px;"><h3>FORGE</h3><button class="v-opt ${f?'active':''}" onclick="localStorage.setItem('forgeEnabled', '${!f}'); renderSettingsTab()">${f?'ENABLED':'DISABLED'}</button></div></div></div>`;
    };

    // D. IPC REGISTRY (RUN ONCE)
    window.electronAPI.onNewsLoaded((d) => { const f = document.getElementById('news-feed'); if (f && d.posts) f.innerHTML = d.posts.map(p => `<div style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,183,197,0.1); padding-bottom: 8px;"><div style="font-size: 8px; font-weight: 900; color: #ffb7c5;">${p.tag}</div><p style="font-size: 11px; margin: 4px 0;">${p.text}</p></div>`).join(''); });
    window.electronAPI.onAccountsList((al) => {
        const l = document.getElementById('accounts-list'); if (!l) return;
        const cur = JSON.parse(localStorage.getItem('activeAccount') || '{}');
        l.innerHTML = al.map(a => `<div class="glass" style="display: flex; align-items: center; padding: 20px; border-radius: 15px; border: 1px solid ${cur.uuid===a.uuid?'#ffb7c5':'transparent'}"><img src="https://mc-heads.net/avatar/${a.name}/40" style="margin-right: 15px; border-radius: 8px;"><div style="flex: 1;"><div style="font-weight: 900;">${a.name.toUpperCase()}</div><small style="opacity: 0.5;">${a.type}</small></div>${cur.uuid!==a.uuid?`<button onclick="setActive('${a.uuid}')" class="v-opt" style="font-size: 10px; padding: 8px 15px;">SELECT</button>`:`<span style="color: #ffb7c5; font-size: 10px; font-weight: 900;">ACTIVE</span>`}<button onclick="window.electronAPI.removeAccount('${a.uuid}')" style="margin-left: 12px; background: none; border: none; color: #ff4444; opacity: 0.5;"><i class="fas fa-trash"></i></button></div>`).join('');
    });
    window.electronAPI.onPingResult((d) => { const st = document.getElementById('server-ping-text'); const dot = document.getElementById('server-dot'); if (st && dot) { st.innerText = d.online ? `ONLINE | ${d.players.online}/${d.players.max}` : 'OFFLINE'; dot.style.background = d.online ? '#4cd137' : '#e84118'; } });
    window.electronAPI.onSyncProgress((d) => { const b = document.getElementById('inline-sync-bar'); const s = document.getElementById('sync-mod-status'); if (b) b.style.width = `${d.progress}%`; if (s) s.innerText = d.step.toUpperCase(); });
    window.electronAPI.onSyncFinished(() => { alert('MODS SYNCHRONIZED!'); renderPlayTab(); });
    window.electronAPI.onSyncError((e) => alert('SYNC ERROR: ' + e));
    window.electronAPI.onLaunchProgress((d) => { toggleLaunchUI(true); const st = document.getElementById('launch-status'); const b = document.getElementById('launch-bar-inner-new'); if (st) st.innerText = (d.step || d.task || 'LOADING...').toUpperCase(); if (b) b.style.width = (d.downloaded && d.total) ? Math.floor((d.downloaded/d.total)*100)+'%' : '15%'; });
    window.electronAPI.onGameStarted(() => { const st = document.getElementById('launch-status'); if (st) st.innerText = 'GAME STARTED! ENJOY PAPU'; setTimeout(() => window.electronAPI.closeWindow(), 3000); });
    window.electronAPI.onLaunchError((e) => { toggleLaunchUI(false); alert('LAUNCH ERROR: ' + e); });
    window.electronAPI.onLoginSuccess((a) => { localStorage.setItem('activeAccount', JSON.stringify(a)); location.reload(); });
    window.electronAPI.onLoginError((e) => alert('AUTH FAIL: ' + e));

    // E. NAVIGATION
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => {
        i.onclick = () => {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active')); i.classList.add('active');
            const tab = i.getAttribute('data-tab') || i.querySelector('span')?.innerText.toLowerCase();
            if (tab === 'play') renderPlayTab();
            else if (tab === 'accounts') renderAccountsTab();
            else if (tab === 'mods') renderModsTab();
            else if (tab === 'skins') renderSkinsTab();
            else if (tab === 'settings') renderSettingsTab();
        };
    });

    // F. BOOTSTRAP SEQUENCE
    if (!window.CORE_INITIALIZED) {
        window.CORE_INITIALIZED = true;
        const pre = document.getElementById('preloader');
        if (pre) { setTimeout(() => { pre.style.opacity = '0'; setTimeout(() => pre.remove(), 800); }, 500); }
    }
    renderPlayTab();
};

// 3. AUTO-BOOT
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCore); else initCore();

// 4. EXTERNAL INTERFACE
window.startMicrosoftLogin = () => window.electronAPI.loginMicrosoft();
window.startOfflineLogin = () => { const n = prompt('ENTER PILOT NAME'); if (n) window.electronAPI.addOfflineAccount(n.trim()); };
window.setActive = (u) => { window.electronAPI.onAccountsListOnce((l) => { const a = l.find(ac => ac.uuid === u); if (a) { localStorage.setItem('activeAccount', JSON.stringify(a)); location.reload(); } }); window.electronAPI.getAccounts(); };
window.showModal = (t, c, cb, i) => { if (i) alert(`${t}\n${c}`); else { const v = prompt(c); if (cb) cb(v); } };
