console.log('--- 🚀 STABLE BUILD v3.0 (Full Features) ---');

// 1. GLOBAL SYSTEMS
window.onerror = (m, s, l, c, e) => { console.error(`[UI-FAIL] ${m} at ${l}:${c}`); if (window.electronAPI) window.electronAPI.logError(m); };
window.alert = (m) => window.showModal('MESSAGE', m, null, true);

// AUDIO
var clickAudio = new Audio('https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/assets/click.mp3');
window.playClick = () => { const v = parseFloat(localStorage.getItem('sysVolume') || '0.8'); clickAudio.currentTime = 0; clickAudio.volume = v; clickAudio.play().catch(()=>{}); };
document.addEventListener('mousedown', (e) => { if (e.target.closest('button, .nav-item, .v-opt')) window.playClick(); }, true);

// 2. MAIN CORE
var initCore = () => {
    console.log('UI: Core Initializing...');
    const API = window.electronAPI;
    const settings = API.getSettings();
    const translations = API.getTranslations();
    const mainContent = document.getElementById('main-content');
    let currentLang = localStorage.getItem('lang') || 'es';

    window.t = (k) => (translations && translations[currentLang] && translations[currentLang][k]) ? translations[currentLang][k] : k;

    // UI RECOVERY
    const unblockUI = () => {
        const pre = document.getElementById('preloader');
        if (pre) { pre.style.opacity = '0'; setTimeout(() => pre.remove(), 800); }
        document.getElementById('root').style.opacity = '1';
        document.getElementById('user-hub').style.opacity = '1';
        document.getElementById('bg-anim').style.opacity = '1';
    };

    window.updateGlobalUI = () => {
        const uText = document.getElementById('user-name-text');
        const uAv = document.getElementById('user-avatar');
        const vText = document.getElementById('selected-version-text');
        const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
        const v = localStorage.getItem('selectedVersion') || (settings.client?.default_version || '1.20.1');

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
        const imgs = { bg1: '../assets/backgrounds/background1.png', bg2: '../assets/backgrounds/background2.png', bg3: '../assets/backgrounds/background3.png', bg4: '../assets/backgrounds/background4.png' };
        if (imgs[fx]) { el.style.backgroundImage = `url('${imgs[fx]}')`; el.style.backgroundSize = 'cover'; }
        else if (fx === 'weather') el.style.background = 'linear-gradient(180deg, #09203f 0%, #537895 100%)';
        else el.classList.add(`bg-${fx}`);
    };

    window.setLang = (l) => {
        localStorage.setItem('lang', l); currentLang = l; renderSettingsTab(); window.updateGlobalUI();
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => {
            const s = i.querySelector('span');
            if (s) { const txt = s.innerText.toLowerCase(); const m = { 'play': t('play'), 'accounts': t('accounts'), 'skins': t('skins'), 'settings': t('settings'), 'community': t('community') }; if (m[txt]) s.innerText = m[txt]; }
        });
    };

    // TAB RENDERERS
    window.renderPlayTab = () => {
        const v = localStorage.getItem('selectedVersion') || '1.20.1';
        mainContent.innerHTML = `
            <div id="mainContainer" style="width:100%; height:100%; display:flex; animation: fadeIn 0.5s ease;">
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px;">
                    <div style="margin-bottom:20px; text-align:center;"><img src="../assets/los_papus/logo.png" style="width:280px; filter: drop-shadow(0 0 15px rgba(0,0,0,0.5));"></div>
                    <div class="version-card glass" style="text-align:center; padding:35px 50px; min-width:380px; border-radius:30px; border:1px solid rgba(255,183,197,0.1);">
                        <h2 style="font-weight:950; letter-spacing:8px; color:#ffb7c5; margin-bottom:5px;">JAVA EDITION</h2>
                        <div style="font-size:26px; font-weight:900; margin-bottom:25px;">Minecraft ${v}</div>
                        <div style="display:inline-flex; align-items:center; gap:10px; background:rgba(0,0,0,0.4); padding:8px 18px; border-radius:50px;">
                            <div id="server-dot" style="width:8px; height:8px; background:#ff8c4a; border-radius:50%;"></div>
                            <span id="server-ping-text" style="font-size:11px; font-weight:900;">${t('scanning_core')}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:20px; margin-top:35px;">
                        <button class="btn-play-custom" id="play-btn" style="padding:22px 70px; font-size:32px; border-radius:20px;">${t('play')}</button>
                        <button class="btn-play-custom btn-outline" id="sync-mods-btn" style="padding:18px 30px; font-size:14px; border-radius:20px; text-align:center;">UPDATE MODS<br><small id="sync-mod-status" style="font-size:9px; opacity:0.6;">CHECK</small></button>
                    </div>
                </div>
                <div class="glass" style="width:260px; border-left:1px solid rgba(255,183,197,0.1); display:flex; flex-direction:column; overflow:hidden;">
                    <div style="padding:15px; border-bottom:1px solid rgba(255,183,197,0.1); font-size:9px; font-weight:950; color:#ffb7c5; letter-spacing:2px;">📡 NEWS BROADCAST</div>
                    <div id="news-feed" style="flex:1; overflow-y:auto; padding:15px;" class="premium-scroll"></div>
                </div>
            </div>`;
        initPlayListeners(); window.updateGlobalUI(); API.pingServer('sprat.aternos.host:44481'); API.fetchNews();
    };

    const initPlayListeners = () => {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
            if (!acc) return alert(t('access_denied'));
            const btn = document.getElementById('play-btn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> STARTING...'; }
            API.launchGame({ nick: acc.name, version: localStorage.getItem('selectedVersion')||'1.20.1', maxRam: localStorage.getItem('maxRam')||'3', account: acc });
        });
        document.getElementById('sync-mods-btn')?.addEventListener('click', () => {
            const s = document.getElementById('sync-mod-status'); if (s) s.innerText = 'SYNCING...';
            API.syncModpacks();
        });
    };

    window.renderAccountsTab = () => {
        mainContent.innerHTML = `
            <div style="padding: 40px; height: 100%; display: flex; flex-direction: column; animation: slideUpFade 0.6s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                    <div><h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin:0;">${t('elite_hub').toUpperCase()}</h1><p style="opacity: 0.5; font-size: 10px; font-weight: 900; margin: 0;">PILOT AUTHENTICATION TERMINAL</p></div>
                    <div style="display: flex; gap: 15px;">
                        <button id="microsoftLogin" onclick="window.startMicrosoftLogin()" class="btn-play-custom btn-outline" style="font-size: 11px; padding: 12px 25px;">${t('microsoft_login')}</button>
                        <button id="addOffline" onclick="window.startOfflineLogin()" class="btn-play-custom btn-secondary" style="font-size: 11px; padding: 12px 25px;">${t('offline_login')}</button>
                    </div>
                </div>
                <div id="accounts-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; overflow-y: auto;" class="premium-scroll"></div>
            </div>`;
        API.getAccounts();
    };

    window.renderSkinsTab = () => {
        mainContent.innerHTML = `<div style="padding: 40px; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center;"><div class="glass" style="padding: 50px; border-radius: 30px;"><i class="fas fa-cube fa-spin" style="font-size: 40px; color: #ffb7c5; margin-bottom: 20px;"></i><h2 style="font-weight: 900; letter-spacing: 4px;">SYSTEM INITIALIZING</h2><p style="opacity: 0.5; font-size: 11px;">The Skin Link Interface is being calibrated for your pilot...</p></div></div>`;
    };

    window.renderModsTab = () => {
        mainContent.innerHTML = `<div style="padding: 40px; height: 100%;"><h1 style="color: #ffb7c5; margin-bottom: 30px;">FORGE MODS</h1><div id="mods-list" style="display: grid; gap: 10px;"></div></div>`;
        API.getModsList().then(mods => {
            const list = document.getElementById('mods-list'); if (!list) return;
            if (!mods || mods.length === 0) { list.innerHTML = '<div style="opacity: 0.3; text-align: center; padding-top: 50px;">NO MODS DETECTED.</div>'; return; }
            list.innerHTML = mods.map(m => `<div class="glass" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px;"><div><div style="font-weight: 900;">${m.name.toUpperCase()}</div><small style="opacity: 0.5;">v${m.version||'1.0.0'}</small></div><i class="fas ${m.enabled?'fa-check-circle':'fa-times-circle'}" style="color: ${m.enabled?'#4cd137':'#e84118'}"></i></div>`).join('');
        });
    };

    window.renderSettingsTab = () => {
        const r = localStorage.getItem('maxRam') || '3';
        const v = Math.round((localStorage.getItem('sysVolume') || '0.8') * 100);
        mainContent.innerHTML = `<div style="padding: 40px; overflow-y: auto; height: 100%;"><h1 style="color: #ffb7c5; margin-bottom: 35px;">${t('command_center')}</h1><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;"><div class="glass" style="padding: 25px;"><h3>MEMORY: <span id="rVal">${r} GB</span></h3><input type="range" min="1" max="16" value="${r}" oninput="document.getElementById('rVal').innerText=this.value+' GB';localStorage.setItem('maxRam',this.value)" style="width: 100%; accent-color: #ffb7c5;"></div><div class="glass" style="padding: 25px;"><h3>VOLUME: <span id="vVal">${v}%</span></h3><input type="range" min="0" max="100" value="${v}" oninput="document.getElementById('vVal').innerText=this.value+'%';localStorage.setItem('sysVolume',this.value/100);window.playClick()" style="width: 100%; accent-color: #ffb7c5;"></div><div class="glass" style="padding: 25px;"><h3>LANGUAGE</h3><div style="display: flex; gap: 10px;"><button class="v-opt" onclick="setLang('es')">ESPAÑOL</button><button class="v-opt" onclick="setLang('en')">ENGLISH</button></div></div></div></div>`;
    };

    // IPC REGISTRY
    API.onNewsLoaded((d) => { const f = document.getElementById('news-feed'); if (f && d.posts) f.innerHTML = d.posts.map(p => `<div style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,183,197,0.1); padding-bottom: 8px;"><div style="font-size: 8px; font-weight: 900; color: #ffb7c5;">${p.tag}</div><p style="font-size: 11px; margin: 4px 0;">${p.text}</p></div>`).join(''); });
    API.onAccountsList((al) => {
        const l = document.getElementById('accounts-list'); if (!l) return;
        const cur = JSON.parse(localStorage.getItem('activeAccount') || '{}');
        l.innerHTML = al.map(a => `<div class="glass" style="display: flex; align-items: center; padding: 20px; border-radius: 15px; border: 1px solid ${cur.uuid===a.uuid?'#ffb7c5':'transparent'}"><img src="https://mc-heads.net/avatar/${a.name}/40" style="margin-right: 15px;"><div style="flex: 1;"><div style="font-weight: 900;">${a.name.toUpperCase()}</div><small style="opacity: 0.5;">${a.type}</small></div>${cur.uuid!==a.uuid?`<button onclick="setActive('${a.uuid}')" class="v-opt" style="font-size: 10px; padding: 8px 15px;">SELECT</button>`:`<span style="color: #ffb7c5; font-size: 10px; font-weight: 900;">ACTIVE</span>`}<button onclick="API.removeAccount('${a.uuid}')" style="margin-left: 10px; background: none; border: none; color: #ff4444; opacity: 0.4;"><i class="fas fa-trash"></i></button></div>`).join('');
    });
    API.onPingResult((d) => { const st = document.getElementById('server-ping-text'); const dot = document.getElementById('server-dot'); if (st && dot) { st.innerText = d.online ? `ONLINE | ${d.players.online}/${d.players.max}` : 'OFFLINE'; dot.style.background = d.online ? '#4cd137' : '#e84118'; } });
    API.onSyncProgress((d) => { const s = document.getElementById('sync-mod-status'); if (s) s.innerText = (d.step || 'SYNCING').toUpperCase(); });
    API.onSyncFinished(() => { alert('MODS READY!'); renderPlayTab(); });
    API.onLaunchProgress((d) => { const b = document.getElementById('play-btn'); if (b) b.innerText = (d.step || 'CARGANDO...').toUpperCase(); });
    API.onGameStarted(() => { alert('GAME STARTED!'); setTimeout(() => API.closeWindow(), 3000); });
    API.onLaunchError((e) => { alert('LAUNCH FAIL: ' + e); renderPlayTab(); });
    API.onLoginSuccess((a) => { localStorage.setItem('activeAccount', JSON.stringify(a)); location.reload(); });
    API.onLoginError((e) => alert('AUTH ERROR: ' + e));

    // NAVIGATION
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => {
        i.onclick = () => {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active')); i.classList.add('active');
            const tab = i.getAttribute('data-tab') || i.querySelector('span')?.innerText.toLowerCase();
            if (tab === 'play') renderPlayTab(); else if (tab === 'accounts') renderAccountsTab(); else if (tab === 'mods') renderModsTab(); else if (tab === 'skins') renderSkinsTab(); else if (tab === 'settings') renderSettingsTab();
        };
    });

    unblockUI();
    renderPlayTab();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCore); else initCore();

// EXTERNAL ACTIONS
window.startMicrosoftLogin = () => {
    const btn = document.getElementById('microsoftLogin');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> MS AUTH...'; }
    window.electronAPI.loginMicrosoft();
};
window.startOfflineLogin = () => { const n = prompt('PILOT NAME?'); if (n) window.electronAPI.addOfflineAccount(n.trim()); };
window.setActive = (u) => { window.electronAPI.onAccountsListOnce((l) => { const a = l.find(ac => ac.uuid === u); if (a) { localStorage.setItem('activeAccount', JSON.stringify(a)); location.reload(); } }); window.electronAPI.getAccounts(); };
window.showModal = (t, c, cb, i) => { if (i) { console.log('ALERT:', c); if (typeof alert !== 'undefined') alert(c); } else { const v = prompt(c); if (cb) cb(v); } };
