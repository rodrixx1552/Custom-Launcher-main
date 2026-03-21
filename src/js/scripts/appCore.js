console.log('UI: appCore.js - SUPER STABLE VERSION (No Cinematic)');

// GLOBAL SYSTEMS
window.onerror = (m, s, l, c, e) => {
    const t = `CRITICAL ERROR: ${m} at ${s}:${l}:${c}`;
    console.error(t);
    if (window.electronAPI && window.electronAPI.logError) window.electronAPI.logError(t);
};

// AUDIO
var CLICK_SOUND_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/assets/click.mp3';
var clickAudio = new Audio(CLICK_SOUND_URL);
window.playClick = () => {
    const v = parseFloat(localStorage.getItem('sysVolume') || '0.8');
    clickAudio.currentTime = 0; clickAudio.volume = v;
    clickAudio.play().catch(() => {});
};
document.addEventListener('mousedown', (e) => { if (e.target.closest('button, .nav-item, .v-opt')) window.playClick(); }, true);

// CORE ENGINE
var initCore = () => {
    console.log('UI: Starting Clean Engine...');
    
    // 1. DATA
    let settings = window.electronAPI.getSettings();
    let translations = window.electronAPI.getTranslations();
    let currentLang = localStorage.getItem('lang') || 'es';
    const mainContent = document.getElementById('main-content');

    window.t = (key) => {
        if (!translations || !translations[currentLang]) return key;
        return translations[currentLang][key] || key;
    };

    // 2. UI UTILS
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
        el.style.opacity = '1';
        el.className = 'background-animation';
        const imgs = { bg1: '../assets/backgrounds/background1.png', bg2: '../assets/backgrounds/background2.png', bg3: '../assets/backgrounds/background3.png', bg4: '../assets/backgrounds/background4.png' };
        if (imgs[fx]) { el.style.backgroundImage = `url('${imgs[fx]}')`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
        else if (fx === 'weather') el.style.background = 'linear-gradient(180deg, #09203f 0%, #537895 100%)';
        else el.classList.add(`bg-${fx}`);
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

    // 3. RENDERERS
    window.renderPlayTab = () => {
        const v = localStorage.getItem('selectedVersion') || '1.20.1';
        mainContent.innerHTML = `
            <div id="mainContainer" style="width: 100%; height: 100%; display: flex;">
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
                    <div style="margin-bottom: 25px;"><img src="../assets/los_papus/logo.png" style="width: 250px;"></div>
                    <div class="version-card glass" style="text-align: center; padding: 40px; min-width: 350px; border-radius: 20px;">
                        <h2 style="font-weight: 900; color: #ffb7c5; margin-bottom: 8px;">JAVA EDITION</h2>
                        <div style="font-size: 24px; font-weight: 900; margin-bottom: 25px;">Minecraft ${v}</div>
                        <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.4); padding: 8px 18px; border-radius: 50px; justify-content: center;">
                            <div id="server-dot" style="width: 8px; height: 8px; background: #ff8c4a; border-radius: 50%;"></div>
                            <span id="server-ping-text" style="font-size: 11px; font-weight: 900;">${t('scanning_core')}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 20px; margin-top: 35px;">
                        <button class="btn-play-custom" id="play-btn" style="padding: 18px 50px; font-size: 28px; border-radius: 15px;">${t('play')}</button>
                        <button class="btn-play-custom btn-outline" id="sync-mods-btn" style="padding: 15px 25px; font-size: 13px; border-radius: 15px;">SYNC MODS<br><small id="sync-mod-status">CHECK</small></button>
                    </div>
                </div>
                <div class="glass" style="width: 240px; border-left: 1px solid rgba(255,183,197,0.1); display: flex; flex-direction: column; overflow: hidden;">
                    <div style="padding: 15px; border-bottom: 1px solid rgba(255,183,197,0.1); font-size: 10px; font-weight: 900; color: #ffb7c5;">NEWS FEED</div>
                    <div id="news-feed" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
                </div>
            </div>`;
        initPlayListeners(); window.updateGlobalUI();
        window.electronAPI.pingServer('sprat.aternos.host:44481');
        window.electronAPI.fetchNews();
    };

    const initPlayListeners = () => {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            const a = JSON.parse(localStorage.getItem('activeAccount') || 'null');
            if (!a) return alert(t('access_denied'));
            const b = document.getElementById('play-btn');
            if (b) { b.disabled = true; b.innerText = "STARTING..."; }
            window.electronAPI.launchGame({ nick: a.name, version: localStorage.getItem('selectedVersion')||'1.20.1', maxRam: localStorage.getItem('maxRam')||'3', account: a });
        });
        document.getElementById('sync-mods-btn')?.addEventListener('click', () => {
            const s = document.getElementById('sync-mod-status');
            if (s) s.innerText = 'SYNCING...';
            window.electronAPI.syncModpacks();
        });
    };

    window.renderAccountsTab = () => {
        mainContent.innerHTML = `<div style="padding: 40px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;"><h1>${t('elite_hub')}</h1><div style="display: flex; gap: 10px;"><button onclick="window.startMicrosoftLogin()" class="btn-play-custom btn-outline">Microsoft</button><button onclick="window.startOfflineLogin()" class="btn-play-custom btn-secondary">Offline</button></div></div><div id="accounts-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;"></div></div>`;
        window.electronAPI.getAccounts();
    };

    window.renderSettingsTab = () => {
        const r = localStorage.getItem('maxRam') || '3';
        mainContent.innerHTML = `<div style="padding: 40px;"><h1>${t('command_center')}</h1><div class="glass" style="padding: 20px; width: 300px;"><h3>RAM: <span id="rVal">${r}GB</span></h3><input type="range" min="1" max="16" value="${r}" oninput="document.getElementById('rVal').innerText=this.value+'GB';localStorage.setItem('maxRam',this.value)" style="width: 100%;"></div></div>`;
    };

    // 4. IPC REGISTRY
    window.electronAPI.onNewsLoaded((d) => { const f = document.getElementById('news-feed'); if (f && d.posts) f.innerHTML = d.posts.map(p => `<div style="margin-bottom: 10px; border-bottom: 1px solid rgba(255,183,197,0.05); padding-bottom: 5px;"><small style="color: #ffb7c5; font-size: 8px;">${p.tag}</small><div style="font-size: 10px;">${p.text}</div></div>`).join(''); });
    window.electronAPI.onAccountsList((al) => {
        const l = document.getElementById('accounts-list'); if (!l) return;
        const cur = JSON.parse(localStorage.getItem('activeAccount') || '{}');
        l.innerHTML = al.map(a => `<div class="glass" style="padding: 15px; border-radius: 12px; border: 1px solid ${cur.uuid===a.uuid?'#ffb7c5':'transparent'}"><div style="display:flex; align-items:center; gap:10px;"><img src="https://mc-heads.net/avatar/${a.name}/30"><strong>${a.name}</strong></div>${cur.uuid!==a.uuid?`<button onclick="setActive('${a.uuid}')" class="v-opt" style="margin-top:10px;">SELECT</button>`:`<div style="color:#ffb7c5; font-size:10px; margin-top:10px;">ACTIVE</div>`}</div>`).join('');
    });
    window.electronAPI.onPingResult((d) => { const st = document.getElementById('server-ping-text'); const dot = document.getElementById('server-dot'); if (st && dot) { st.innerText = d.online ? `ONLINE | ${d.players.online}/${d.players.max}` : 'OFFLINE'; dot.style.background = d.online ? '#4cd137' : '#e84118'; } });
    window.electronAPI.onSyncProgress((d) => { const s = document.getElementById('sync-mod-status'); if (s) s.innerText = d.step.toUpperCase(); });
    window.electronAPI.onSyncFinished(() => alert('SYNC DONE'));
    window.electronAPI.onLaunchProgress((d) => { const b = document.getElementById('play-btn'); if (b) b.innerText = (d.step || 'LOADING...').toUpperCase(); });
    window.electronAPI.onGameStarted(() => { alert('GAME STARTED!'); setTimeout(() => window.electronAPI.closeWindow(), 3000); });
    window.electronAPI.onLaunchError((e) => { alert('FAILED: ' + e); renderPlayTab(); });
    window.electronAPI.onLoginSuccess((a) => { localStorage.setItem('activeAccount', JSON.stringify(a)); location.reload(); });
    window.electronAPI.onLoginError((e) => alert('LOGIN FAIL: ' + e));

    // 5. BOOTSTRAP
    const pre = document.getElementById('preloader');
    const root = document.getElementById('root');
    const userHub = document.getElementById('user-hub');
    
    if (root) root.style.opacity = '1';
    if (userHub) userHub.style.opacity = '1';

    if (pre) {
        setTimeout(() => {
            pre.style.opacity = '0';
            setTimeout(() => pre.remove(), 600);
        }, 300);
    }
    renderPlayTab();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCore); else initCore();

// EXTERNALS
window.startMicrosoftLogin = () => window.electronAPI.loginMicrosoft();
window.startOfflineLogin = () => { const n = prompt('PLAYER NAME?'); if (n) window.electronAPI.addOfflineAccount(n.trim()); };
window.setActive = (u) => { window.electronAPI.onAccountsListOnce((l) => { const a = l.find(ac => ac.uuid === u); if (a) { localStorage.setItem('activeAccount', JSON.stringify(a)); location.reload(); } }); window.electronAPI.getAccounts(); };
