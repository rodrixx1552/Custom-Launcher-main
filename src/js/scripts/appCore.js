/**
 * NEW APP CORE (Visual Layer) 2.0
 * Frappe Inspiration for LosPapus Launcher
 */

console.log('UI: appCore.js initializing Dashboard Design...');

// Initialize the Engine
if (typeof initEngine === 'function') {
    initEngine();
}

// Global UI State
window.currentTab = 'play';

// --- MAIN ROUTING ---
window.renderTab = (tabName) => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    window.currentTab = tabName;
    window.playClick();
    
    // Update Sidebar State
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
    });

    if (tabName === 'play') renderPlayTab(mainContent);
    else if (tabName === 'accounts') renderAccountsTab(mainContent);
    else if (tabName === 'mods') renderModsTab(mainContent);
    else if (tabName === 'skins') renderSkinsTab(mainContent);
    else if (tabName === 'settings') renderSettingsTab(mainContent);
    else if (tabName === 'market') renderMarketTab(mainContent);
    else renderPlaceholderTab(mainContent, tabName);

    // Dynamic Header Check
    updateUserHeader();
    updateMarketHeader();
};

function updateUserHeader() {
    const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
    const ribbonText = document.getElementById('premium-ribbon-text');
    const ribbonIcon = document.getElementById('premium-ribbon-icon');
    
    if (!ribbonText || !ribbonIcon) return;
    
    if (acc && acc.type === 'offline') {
        ribbonText.innerText = 'PERFIL OFFLINE';
        ribbonIcon.style.color = '#a1a1aa'; // Muted color
        ribbonIcon.className = 'fas fa-user-circle'; // Different icon
    } else {
        ribbonText.innerText = 'PERFIL PREMIUM';
        ribbonIcon.style.color = 'var(--primary)';
        ribbonIcon.className = 'fas fa-star';
    }
}

// --- PLAY TAB (INICIO) ---
function renderPlayTab(container) {
    const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
    const version = localStorage.getItem('selectedVersion') || '1.20.1';
    
    container.innerHTML = `
        <!-- HERO SECTION -->
        <section class="hero-card">
            <div class="hero-img" style="background-image: url('../assets/los_papus/hero_bg.png'); position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.6; filter: blur(2px);"></div>
            <div class="hero-overlay"></div>
            
            <div class="hero-content">
                <div style="background: rgba(74, 222, 128, 0.1); color: var(--accent); display: inline-block; padding: 4px 12px; border-radius: 50px; font-size: 10px; font-weight: 900; margin-bottom: 20px; border: 1px solid rgba(74, 222, 128, 0.2);">MODPACK PERSONALIZADO</div>
                <h1 class="hero-title">Minecraft ${version}</h1>
                <p class="hero-desc">La actualización Minecraft Trails & Tales, anteriormente conocida como la versión 1.20, fue introducida originalmente durante el Minecraft Live 2022, donde los fans votaron por el nuevo mob y los desarrolladores dieron adelantos de las próximas funciones.</p>
                
                <div class="launch-btn-group">
                    <button class="launch-btn" id="play-btn" onclick="window.tryLaunch()">
                        INICIAR ${version}
                        <div style="font-size: 9px; opacity: 0.6; font-weight: 700; margin-top: 2px;">¡LISTO PARA JUGAR!</div>
                    </button>
                    <button class="sync-btn" onclick="window.trySync()" title="Sincronizar Modpacks">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <div id="play-status" style="font-size: 11px; font-weight: 900; color: var(--accent); margin-left: 10px;"></div>
                </div>
            </div>
        </section>

        <!-- USER CARD -->
        <section class="user-card">
            <div class="avatar-preview" id="skin-container">
                <!-- Skinview3d Canvas will be here -->
            </div>
            
            <h2 class="user-name">${acc ? acc.name : 'INVITADO'}</h2>
            <div class="user-role">${acc ? acc.type.toUpperCase() + ' PROTOCOLO' : 'PILOTO INVITADO'}</div>
            
            <div class="user-actions">
                <button class="user-btn primary" onclick="window.renderTab('accounts')">Gestionar Cuenta</button>
                <button class="user-btn" onclick="window.showFriendsModal()">Mis Amigos</button>
                <button class="user-btn" onclick="window.logout()" style="color: var(--danger); opacity: 0.6; border: none; background: transparent; font-size: 11px;">Cerrar sesión...</button>
            </div>
        </section>

        <!-- NEWS GRID -->
        <section class="news-area" id="news-grid">
            <div style="grid-column: 1 / span 3; text-align:center; padding: 50px; opacity: 0.5;">
                <i class="fas fa-satellite-dish fa-spin"></i> SINCRONIZANDO NOTICIAS...
            </div>
        </section>
    `;
    
    // Render News & Skin
    loadNews();
    
    // Render Skin Static
    if (acc) {
        setTimeout(() => initSkinViewer(acc.name), 100);
    }
}
async function loadNews() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    try {
        // We try to fetch from GitHub first, otherwise use local from src/news.json (via electronAPI if exposed, or just simple fetch)
        const newsUrl = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/news.json';
        const response = await fetch(newsUrl + '?t=' + Date.now());
        const news = await response.json();

        grid.innerHTML = news.map(item => `
            <div class="news-card">
                <div class="news-img" style="background-image: url('${item.image}');"></div>
                <div class="news-overlay">
                    <span class="news-tag">${item.tag}</span>
                    <h3 class="news-title">${item.title}</h3>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.warn("UI: Could not load remote news, using local fallback.", e);
        // Fallback to local file if fetch fails
        fetch('../news.json')
            .then(res => res.json())
            .then(news => {
                grid.innerHTML = news.map(item => `
                    <div class="news-card">
                        <div class="news-img" style="background-image: url('${item.image}');"></div>
                        <div class="news-overlay">
                            <span class="news-tag">${item.tag}</span>
                            <h3 class="news-title">${item.title}</h3>
                        </div>
                    </div>
                `).join('');
            })
            .catch(err => {
                grid.innerHTML = '<p style="grid-column: 1/span 3; color: var(--text-muted); text-align: center;">No se pudieron cargar las noticias.</p>';
            });
    }
}

// --- ACCOUNTS TAB ---
function renderAccountsTab(container) {
    container.innerHTML = `
        <div style="grid-column: 1 / span 2; animation: fadeIn 0.4s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                <div>
                    <h1 style="font-weight: 950; letter-spacing: -1.5px; margin: 0; font-size: 32px;">Gestión de Cuentas</h1>
                    <p style="color: var(--text-dim); font-size: 13px; margin-top: 5px;">Administra tus identidades de Minecraft</p>
                </div>
                
                <div style="display: flex; gap: 12px; z-index: 10;">
                    <button id="btn-login-ms" class="launch-btn" style="padding: 12px 25px; font-size: 13px; position: relative;">
                        <i class="fab fa-microsoft" style="margin-right: 8px;"></i> MICROSOFT
                    </button>
                    <button id="btn-login-off" class="user-btn" style="width: auto; padding: 0 25px; position: relative; border: 1px solid var(--accent);">
                        <i class="fas fa-user-secret" style="margin-right: 8px;"></i> OFFLINE
                    </button>
                </div>
            </div>
            
            <div id="accounts-list-ui" class="accounts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                <!-- Se inyectarán aquí -->
            </div>
        </div>
    `;
    
    // Bind buttons after render
    setTimeout(() => {
        document.getElementById('btn-login-ms')?.addEventListener('click', () => { 
            console.log('UI: Microsoft Login Requested');
            window.playClick(); 
            window.electronAPI.loginMicrosoft(); 
        });
        document.getElementById('btn-login-off')?.addEventListener('click', () => { 
            console.log('UI: Offline Login UI Triggered');
            window.tryOfflineLogin(); 
        });
    }, 50);

    window.loadAccounts();
}

// --- SKINS TAB ---
function renderSkinsTab(container) {
    const acc = JSON.parse(localStorage.getItem('activeAccount') || '{"name":"Steve"}');
    
    container.innerHTML = `
        <div style="grid-column: 1 / span 2; animation: fadeIn 0.4s ease; height: 100%;">
            <div style="margin-bottom: 30px;">
                <h1 style="font-weight: 950; letter-spacing: -1.5px; margin: 0; font-size: 32px;">Skin Vault</h1>
                <p style="color: var(--text-dim); font-size: 13px; margin-top: 5px;">Personaliza tu identidad visual en el juego</p>
            </div>
            
            <div class="skins-layout">
                <div class="viewer-section">
                    <canvas id="skin-vault-canvas"></canvas>
                    <div style="position: absolute; bottom: 20px; left: 20px; background: rgba(0,0,0,0.5); padding: 8px 15px; border-radius: 50px; font-size: 10px; color: var(--accent); font-weight: 900;">
                        <i class="fas fa-mouse"></i> ARRASTRA PARA GIRAR
                    </div>
                </div>
                
                <div class="skin-controls">
                    <div class="search-card">
                        <span style="font-size: 12px; font-weight: 950; color: var(--text-dim);">BUSCAR SKIN</span>
                        <input type="text" id="skin-search-input" class="skin-input" placeholder="Nombre de usuario...">
                        <button class="skin-btn" onclick="window.loadSkinFromSearch()">CARGAR SKIN</button>
                    </div>
                    
                    <div class="search-card">
                        <span style="font-size: 12px; font-weight: 950; color: var(--text-dim);">ARCHIVO LOCAL</span>
                        <button class="skin-btn secondary" onclick="window.electronAPI.selectFile()">SELECCIONAR .PNG</button>
                    </div>

                    <div class="info-card">
                        <i class="fas fa-info-circle"></i>
                        Las skins de alta resolución (HD) son compatibles. Si eres usuario Premium, puedes aplicar la skin a tu cuenta oficial.
                    </div>
                    
                    <button class="skin-btn accent" onclick="window.applySkinToMojang()" style="margin-top: auto;">APLICAR A MI CUENTA</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const viewer = new skinview3d.SkinViewer({
            canvas: document.getElementById("skin-vault-canvas"),
            width: 500,
            height: 480,
            skin: `https://mc-heads.net/skin/${acc.name}`
        });

        viewer.autoRotate = false;
        viewer.controls.enableZoom = true;
        
        window.vaultViewer = viewer;
    }, 100);
}

window.loadSkinFromSearch = () => {
    const input = document.getElementById('skin-search-input');
    const name = input.value.trim();
    if (!name) return;
    
    window.playClick();
    const skinUrl = `https://mc-heads.net/skin/${name}`;
    window.vaultViewer.loadSkin(skinUrl);
};

window.applySkinToMojang = () => {
    const acc = JSON.parse(localStorage.getItem('activeAccount') || '{}');
    if (acc.type !== 'microsoft') {
        alert("Lo siento, esta función solo está disponible para cuentas Premium (Microsoft).");
        return;
    }
    
    // Logic to get current canvas as base64 or similar
    // For now, let's just show feedback
    alert("Iniciando subida a Mojang para: " + acc.name);
};

function renderPlaceholderTab(container, name) {
    container.innerHTML = `
        <div style="grid-column: 1 / span 2; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.3;">
            <i class="fas fa-tools" style="font-size: 60px; margin-bottom: 20px;"></i>
            <h1 style="font-weight: 900; letter-spacing: 5px;">RE-DISEÑO DE ${name.toUpperCase()} EN PROGRESO</h1>
        </div>
    `;
}

// --- SETTINGS TAB ---
function renderSettingsTab(container) {
    const ram = localStorage.getItem('maxRam') || '4';
    const width = localStorage.getItem('windowWidth') || '1280';
    const height = localStorage.getItem('windowHeight') || '720';
    const version = localStorage.getItem('selectedVersion') || '1.20.1';

    container.innerHTML = `
        <div style="grid-column: 1 / span 2; animation: fadeIn 0.4s ease;">
            <div style="margin-bottom: 35px;">
                <h1 style="font-weight: 950; letter-spacing: -1.5px; margin: 0; font-size: 32px;">Configuración Avanzada</h1>
                <p style="color: var(--text-dim); font-size: 13px; margin-top: 5px;">Ajusta el rendimiento y visuales de tu instancia</p>
            </div>
            
            <div class="settings-layout">
                <!-- PERFORMANCE GROUP -->
                <div class="settings-group">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 25px;">
                        <i class="fas fa-microchip" style="color: var(--accent);"></i>
                        <span style="font-weight: 900; font-size: 13px; letter-spacing: 1px; color: var(--text-dim);">RENDIMIENTO</span>
                    </div>

                    <div class="settings-item">
                        <div class="settings-label">
                            <span class="settings-title">Memoria RAM Asignada</span>
                            <span class="settings-subtitle">Más RAM permite cargar más mods y chunks, pero no excedas el límite de tu PC.</span>
                        </div>
                        <div class="slider-container">
                            <input type="range" min="2" max="16" step="1" value="${ram}" class="modern-slider" oninput="window.updateRam(this.value)">
                            <span id="ram-value-display" class="slider-value">${ram} GB</span>
                        </div>
                    </div>
                </div>

                <!-- VIDEO GROUP -->
                <div class="settings-group">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 25px;">
                        <i class="fas fa-desktop" style="color: var(--primary);"></i>
                        <span style="font-weight: 900; font-size: 13px; letter-spacing: 1px; color: var(--text-dim);">VIDEO Y PANTALLA</span>
                    </div>

                    <div class="settings-item">
                        <div class="settings-label">
                            <span class="settings-title">Resolución del Juego</span>
                            <span class="settings-subtitle">Define el tamaño de la ventana al iniciar el juego.</span>
                        </div>
                        <div class="res-inputs">
                            <input type="number" value="${width}" class="res-field" onchange="window.updateRes('windowWidth', this.value)">
                            <span style="color: var(--text-muted); font-weight: 900;">X</span>
                            <input type="number" value="${height}" class="res-field" onchange="window.updateRes('windowHeight', this.value)">
                        </div>
                    </div>
                </div>

                <!-- VERSION GROUP -->
                <div class="settings-group">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 25px;">
                        <i class="fas fa-code-branch" style="color: #60a5fa;"></i>
                        <span style="font-weight: 900; font-size: 13px; letter-spacing: 1px; color: var(--text-dim);">VERSIÓN DEL JUEGO</span>
                    </div>

                    <div class="settings-item">
                        <div class="settings-label">
                            <span class="settings-title">Versión Seleccionada</span>
                            <span class="settings-subtitle">Cambia la versión base de Minecraft. Requiere reinicio.</span>
                        </div>
                        <select class="res-field" style="width: 150px; text-align: left;" onchange="window.updateSetting('selectedVersion', this.value)">
                            <option value="1.20.1" ${version === '1.20.1' ? 'selected' : ''}>1.20.1 (Latest)</option>
                            <option value="1.19.4" ${version === '1.19.4' ? 'selected' : ''}>1.19.4</option>
                            <option value="1.18.2" ${version === '1.18.2' ? 'selected' : ''}>1.18.2</option>
                            <option value="1.16.5" ${version === '1.16.5' ? 'selected' : ''}>1.16.5</option>
                            <option value="1.12.2" ${version === '1.12.2' ? 'selected' : ''}>1.12.2</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.updateRam = (val) => {
    localStorage.setItem('maxRam', val);
    const display = document.getElementById('ram-value-display');
    if (display) display.innerText = val + ' GB';
};

window.updateRes = (key, val) => {
    localStorage.setItem(key, val);
};

window.updateSetting = (key, val) => {
    localStorage.setItem(key, val);
};

// --- LOGIC HELPERS ---
function initSkinViewer(name) {
    const container = document.getElementById('skin-container');
    if (!container) return;
    
    try {
        const viewer = new skinview3d.SkinViewer({
            canvas: document.createElement('canvas'),
            width: 140,
            height: 200,
            skin: `https://mc-heads.net/skin/${name}`
        });
        container.appendChild(viewer.canvas);
        
        // Static pose like the image
        viewer.loadSkin(`https://mc-heads.net/skin/${name}`);
        viewer.zoom = 0.8;
        viewer.autoRotate = false; // Static as requested
        
        // Apply a cool pose
        viewer.animations.add(skinview3d.WalkingAnimation);
        viewer.animations.paused = true; // Still static
    } catch(e) { console.error('UI: Skin viewer fail', e); }
}

window.tryLaunch = () => {
    const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
    if (!acc) return alert('No account selected. Por favor inicia sesión.');
    
    const btn = document.getElementById('play-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            PREPARANDO...
            <div style="font-size: 9px; opacity: 0.6; font-weight: 700; margin-top: 2px;">INICIANDO MOTOR NEURAL</div>
        `;
        btn.style.filter = "grayscale(0.5) contrast(0.8)";
    }

    const version = localStorage.getItem('selectedVersion') || '1.20.1';
    window.electronAPI.launchGame({
        nick: acc.name,
        version: version,
        maxRam: localStorage.getItem('maxRam') || '6',
        width: localStorage.getItem('windowWidth') || '1280',
        height: localStorage.getItem('windowHeight') || '720',
        account: acc,
        forgeVersion: version === '1.20.1' ? '47.4.17' : null
    });
};

window.trySync = () => {
    window.electronAPI.syncModpacks();
};

window.tryOfflineLogin = () => {
    window.playClick();
    const list = document.getElementById('accounts-list-ui');
    if (!list) return;

    // Check if form already exists to avoid duplicates
    if (document.getElementById('offline-login-form')) {
        document.getElementById('offline-name-input')?.focus();
        return;
    }

    // Injected a card-style form at the beginning
    const formCard = document.createElement('div');
    formCard.id = 'offline-login-form';
    formCard.className = 'account-card-new';
    formCard.style.borderColor = 'var(--accent)';
    formCard.style.animation = 'fadeIn 0.3s ease';
    formCard.innerHTML = `
        <div style="font-size: 10px; font-weight: 900; color: var(--accent); margin-bottom: 10px; letter-spacing: 1px;">NUEVA CUENTA OFFLINE</div>
        <input type="text" id="offline-name-input" placeholder="Nombre de usuario..." 
            style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--accent); border-radius: 8px; color: white; outline: none; font-size: 14px; font-family: inherit;">
        
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="user-btn primary" id="confirm-offline-btn" style="flex: 1; padding: 10px;">VINCULAR</button>
            <button class="user-btn" style="flex: 1; padding: 10px; opacity: 0.5;" onclick="window.renderTab('accounts')">CANCELAR</button>
        </div>
    `;

    list.prepend(formCard);
    
    const input = document.getElementById('offline-name-input');
    input.focus();

    const doLogin = () => {
        const name = input.value.trim();
        if (name.length > 0) {
            window.playClick();
            window.electronAPI.addOfflineAccount(name);
        } else {
            input.style.borderColor = 'var(--danger)';
            setTimeout(() => input.style.borderColor = 'var(--accent)', 1000);
        }
    };

    document.getElementById('confirm-offline-btn').addEventListener('click', doLogin);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doLogin();
    });
};

window.logout = () => {
    window.playClick();
    localStorage.removeItem('activeAccount');
    window.renderTab('play');
    if (typeof window.speak === 'function') window.speak("Sesión cerrada. Sistemas en modo espera.");
};

window.setActive = (uuid) => {
    window.playClick();
    window.electronAPI.onAccountsListOnce((accounts) => {
        const found = accounts.find(a => a.uuid === uuid);
        if (found) {
            localStorage.setItem('activeAccount', JSON.stringify(found));
            window.renderTab(window.currentTab);
            if (typeof window.speak === 'function') window.speak(`Perfil ${found.name} activado.`);
        }
    });
    window.electronAPI.getAccounts();
};

window.loadAccounts = () => {
    window.electronAPI.getAccounts();
};

// --- MODS TAB ---
function renderModsTab(container) {
    container.innerHTML = `
        <div style="grid-column: 1 / span 2; animation: fadeIn 0.4s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h1 style="font-weight: 950; letter-spacing: -1.5px; margin: 0; font-size: 32px;">Gestión de Mods</h1>
                    <p style="color: var(--text-dim); font-size: 13px; margin-top: 5px;">Controla los módulos activos de tu instalación</p>
                </div>
                
                <div class="search-container">
                    <i class="fas fa-search" style="position: absolute; left: 15px; top: 14px; color: var(--text-muted);"></i>
                    <input type="text" id="mod-search" placeholder="Filtrar mods..." class="search-input" oninput="window.filterMods(this.value)">
                </div>
            </div>
            
            <div id="mods-grid-ui" class="mods-grid">
                <div style="grid-column: 1 / span 3; text-align:center; padding: 100px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: var(--primary);"></i>
                    <p style="margin-top: 15px; font-weight: 900; color: var(--text-dim);">BUSCANDO MODS LOCALES...</p>
                </div>
            </div>
        </div>
    `;
    window.electronAPI.getModsList();
}

window.filterMods = (query) => {
    const cards = document.querySelectorAll('.mod-card-new');
    const q = query.toLowerCase();
    cards.forEach(card => {
        const name = card.querySelector('.mod-name').innerText.toLowerCase();
        card.style.display = name.includes(q) ? 'flex' : 'none';
    });
};

// --- THEME MARKET ---
const NEW_THEMES = {
    'cyberpink': { name: 'Cyber-Pink (Default)', colors: { '--primary': '#7c3aed', '--accent': '#4ade80' }, price: 0 },
    'midnight': { name: 'Midnight Void', colors: { '--primary': '#1e40af', '--accent': '#f472b6' }, price: 500 },
    'solar': { name: 'Solar Flare', colors: { '--primary': '#ea580c', '--accent': '#fbbf24' }, price: 500 },
    'arctic': { name: 'Arctic Frost', colors: { '--primary': '#e2e8f0', '--accent': '#38bdf8' }, price: 500 },
    'toxic': { name: 'Forest Phantom', colors: { '--primary': '#166534', '--accent': '#bef264' }, price: 500 }
};

function renderMarketTab(container) {
    const coins = parseInt(localStorage.getItem('papuCoins') || '1000');
    const owned = JSON.parse(localStorage.getItem('ownedThemes') || '["cyberpink"]');
    const active = localStorage.getItem('activeTheme') || 'cyberpink';

    // Ensure initial balance
    if (!localStorage.getItem('papuCoins')) localStorage.setItem('papuCoins', '1000');

    container.innerHTML = `
        <div style="grid-column: 1 / span 2; animation: fadeIn 0.4s ease;">
            <div class="currency-header">
                <div>
                    <h1 style="font-weight: 950; letter-spacing: -1.5px; margin: 0; font-size: 32px;">Mercado de Temas</h1>
                    <p style="color: var(--text-dim); font-size: 13px; margin-top: 5px;">Personaliza la estética de tu protocolo LosPapus</p>
                </div>
                <div style="display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.2); padding: 10px 25px; border-radius: 50px;">
                    <i class="fas fa-coins" style="color: gold;"></i>
                    <span style="font-weight: 950; font-size: 18px;">${coins}</span>
                </div>
            </div>

            <div class="market-grid">
                ${Object.entries(NEW_THEMES).map(([id, theme]) => {
                    const isOwned = owned.includes(id);
                    const isActive = active === id;
                    return `
                        <div class="theme-card ${isActive ? 'active' : ''}">
                            <div class="theme-preview" style="background: linear-gradient(135deg, #0f0f11, #1c1c1f);">
                                <div class="theme-dot" style="background: ${theme.colors['--primary']}; box-shadow: 0 0 25px ${theme.colors['--primary']}88;"></div>
                                <div class="theme-dot" style="background: ${theme.colors['--accent']}; position: absolute; right: 30%; top: 40%; width: 30px; height: 30px; box-shadow: 0 0 20px ${theme.colors['--accent']}88;"></div>
                            </div>
                            <div class="theme-info">
                                <span class="theme-name">${theme.name}</span>
                                ${isOwned ? '' : `<span class="theme-price"><i class="fas fa-coins"></i> ${theme.price}</span>`}
                            </div>
                            ${isOwned 
                                ? `<button class="skin-btn ${isActive ? 'secondary' : 'accent'}" onclick="window.equipTheme('${id}')" ${isActive ? 'disabled' : ''}>${isActive ? 'EQUIPADO' : 'EQUIPAR'}</button>`
                                : `<button class="skin-btn" onclick="window.buyTheme('${id}', ${theme.price})">COMPRAR</button>`
                            }
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

window.buyTheme = (id, price) => {
    let coins = parseInt(localStorage.getItem('papuCoins') || '0');
    if (coins < price) return alert("¡No tienes suficientes Papu-Coins!");
    
    window.playClick();
    coins -= price;
    localStorage.setItem('papuCoins', coins);
    
    let owned = JSON.parse(localStorage.getItem('ownedThemes') || '["cyberpink"]');
    owned.push(id);
    localStorage.setItem('ownedThemes', JSON.stringify(owned));
    
    renderTab('market');
    updateMarketHeader();
};

window.equipTheme = (id) => {
    window.playClick();
    localStorage.setItem('activeTheme', id);
    applyTheme(id);
    renderTab('market');
};

function applyTheme(id) {
    const theme = NEW_THEMES[id] || NEW_THEMES['cyberpink'];
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([variable, value]) => {
        root.style.setProperty(variable, value);
    });
}

function updateMarketHeader() {
    const coins = localStorage.getItem('papuCoins') || '1000';
    const display = document.getElementById('coins-count');
    if (display) display.innerText = coins;
}

// --- HEADER & SOCIAL FUNCTIONS ---
const SOCIAL_LINKS = {
    discord: 'https://discord.gg/lospapus',
    twitter: 'https://twitter.com/LosPapusLover',
    youtube: 'https://youtube.com/@LosPapusMinecraft',
    instagram: 'https://instagram.com/lospapus',
    tiktok: 'https://tiktok.com/@lospapus',
    telegram: 'https://t.me/lospapus'
};

window.openSocial = (platform) => {
    const url = SOCIAL_LINKS[platform];
    if (url) window.electronAPI.openExternal(url);
};

window.showFriendsModal = async () => {
    window.playClick();
    const overlay = document.getElementById('overlay-container');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div class="pulse-dot-radar" style="width: 60px; height: 60px; margin: 0 auto 30px;"></div>
            <h2 style="font-weight: 950; font-size: 22px; color: white; letter-spacing: 2px;">ESCANEO DE RADAR SOCIAL</h2>
            <p style="color: var(--text-dim); font-size: 13px; margin-top: 10px;">Interceptando señales de los papus en el servidor...</p>
        </div>
    `;
    overlay.classList.add('show');

    // Ping Server IP from config
    const config = await window.electronAPI.getServerIp();
    window.electronAPI.pingServer(config);
};

// Listen for Ping Results
window.electronAPI.onPingResult((data) => {
    const content = document.getElementById('modal-content');
    if (!content) return;
    
    if (!data.online) {
        content.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                    <i class="fas fa-ghost" style="font-size: 40px; color: var(--danger);"></i>
                </div>
                <h2 style="font-weight: 950; color: white; font-size: 24px;">RADAR CAÍDO</h2>
                <p style="color: var(--text-dim); margin: 15px 0 30px; font-size: 14px; line-height: 1.5;">El servidor de Los Papus no responde. <br>Es posible que esté en mantenimiento o apagado.</p>
                <button class="user-btn primary" style="max-width: 200px; margin: 0 auto;" onclick="window.closeModals()">ENTENDIDO</button>
            </div>
        `;
        return;
    }

    const players = data.players?.list || [];
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div>
                <h2 style="font-weight: 950; color: white; margin: 0; font-size: 20px; letter-spacing: 1px;">RADAR SOCIAL</h2>
                <div style="font-size: 10px; color: var(--accent); font-weight: 900; margin-top: 4px; text-transform: uppercase;">Protocolo LosPapus v0.5.0</div>
            </div>
            <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); color: var(--accent); padding: 8px 15px; border-radius: 12px; font-weight: 950; font-size: 12px; display: flex; align-items: center; gap: 8px;">
                <div class="pulse-dot" style="width: 8px; height: 8px; background: var(--accent); margin:0;"></div>
                ${data.players.online} / ${data.players.max} ONLINE
            </div>
        </div>
        
        <div class="friend-list">
            ${players.length > 0 
                ? players.map(p => `
                    <div class="friend-item">
                        <div class="friend-head-wrapper">
                            <img src="https://mc-heads.net/avatar/${p.name}" class="friend-head">
                        </div>
                        <div class="friend-info">
                            <span class="friend-name">${p.name}</span>
                            <span class="friend-meta">Explorando el Mundo</span>
                        </div>
                        <div style="flex: 1"></div>
                        <div class="pulse-dot-radar" style="width: 8px; height: 8px; box-shadow: 0 0 5px var(--accent);"></div>
                    </div>
                `).join('') 
                : `
                <div style="text-align:center; padding: 40px 20px; opacity: 0.6;">
                    <i class="fas fa-satellite" style="font-size: 30px; margin-bottom: 15px; color: var(--text-muted);"></i>
                    <p style="font-size: 13px; color: var(--text-muted); font-weight: 700;">No se detectan papus en el sector...</p>
                </div>
                `
            }
        </div>
        
        <div style="margin-top: 25px; display: flex; gap: 10px;">
            <button class="user-btn primary" style="flex: 1;" onclick="window.closeModals()">CERRAR RADAR</button>
            <button class="user-btn" style="width: 50px;" onclick="window.showFriendsModal()"><i class="fas fa-sync-alt"></i></button>
        </div>
    `;
});

window.closeModals = () => {
    document.getElementById('overlay-container').classList.remove('show');
    document.getElementById('jarvis-dropdown').classList.remove('show');
};

window.toggleJarvis = () => {
    window.playClick();
    document.getElementById('jarvis-dropdown').classList.toggle('show');
};

window.toggleNotifs = () => {
    window.playClick();
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = 'none';
    alert("¡Novedades del Launcher: La versión 0.4.1 traerá más animaciones 3D!");
};

window.toggleSoundscape = (enabled) => {
    if (window.Soundscape) {
        if (enabled) window.Soundscape.startAmbient();
        else window.Soundscape.stopAmbient();
    }
};

window.updateVolume = (val) => {
    const volume = val / 100;
    localStorage.setItem('sysVolume', volume);
    
    // Update active audio elements
    const clickAudio = document.getElementById('clickAudio');
    if (clickAudio) clickAudio.volume = volume;
};

// --- ENGINE LISTENERS ---
window.addEventListener('engine-launch-progress', (e) => {
    const btn = document.getElementById('play-btn');
    if (btn) {
        const subtext = btn.querySelector('div');
        if (subtext) subtext.innerText = (e.detail.step || e.detail.type || 'Iniciando...').toUpperCase();
    }
    const status = document.getElementById('play-status');
    if (status) status.innerText = `${e.detail.step || e.detail.type || '...'}`.toUpperCase();
});

window.addEventListener('engine-launch-error', (e) => {
    const btn = document.getElementById('play-btn');
    if (btn) {
        btn.disabled = false;
        btn.style.filter = "";
        btn.innerHTML = `
            REINTENTAR
            <div style="font-size: 9px; opacity: 0.6; font-weight: 700; margin-top: 2px;">FALLÓ EL ÚLTIMO INTENTO</div>
        `;
    }
    alert("CRITICAL LAUNCH ERROR: " + e.detail);
});

window.addEventListener('engine-sync-progress', (e) => {
    const status = document.getElementById('play-status');
    if (status) status.innerText = `SYNCING: ${e.detail.progress}%`.toUpperCase();
});

window.addEventListener('engine-launch-finished', () => {
    const btn = document.getElementById('play-btn');
    if (btn) {
        btn.disabled = false;
        btn.style.filter = "";
        btn.innerHTML = `
            INICIAR
            <div style="font-size: 9px; opacity: 0.6; font-weight: 700; margin-top: 2px;">¡LISTO PARA JUGAR!</div>
        `;
    }
});

// --- API LISTENERS ---
if (window.electronAPI) {
    window.electronAPI.onAccountsList((accounts) => {
        const list = document.getElementById('accounts-list-ui');
        if (!list) return;
        
        const activeAcc = JSON.parse(localStorage.getItem('activeAccount') || '{}');
        
        let html = accounts.map(acc => `
            <div class="account-card-new ${activeAcc.uuid === acc.uuid ? 'active' : ''}">
                ${activeAcc.uuid === acc.uuid ? '<div class="account-badge">ACTIVA</div>' : ''}
                <img src="https://mc-heads.net/avatar/${acc.name}/64" class="account-avatar">
                
                <div class="account-info">
                    <h3 class="account-name">${acc.name}</h3>
                    <span class="account-type">${acc.type} protocol</span>
                </div>
                
                <div class="user-actions" style="margin-top: auto;">
                    ${activeAcc.uuid !== acc.uuid ? `<button class="user-btn primary" onclick="window.setActive('${acc.uuid}')">SELECCIONAR</button>` : '<button class="user-btn" disabled style="opacity: 0.5; border: 1px solid var(--accent); color: var(--accent);">ACTUAL</button>'}
                    <button class="user-btn" style="color: var(--danger);" onclick="window.electronAPI.removeAccount('${acc.uuid}')">
                        <i class="fas fa-trash-alt"></i> ELIMINAR
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add "Add Account" cards
        html += `
            <div class="account-card-new add-account-card ms-card" onclick="window.playClick(); window.electronAPI.loginMicrosoft()">
                <i class="fab fa-microsoft"></i>
                <span style="font-weight: 700; font-size: 12px;">Microsoft</span>
            </div>
            <div class="account-card-new add-account-card off-card" onclick="window.tryOfflineLogin()" style="border-color: var(--accent);">
                <i class="fas fa-user-plus"></i>
                <span style="font-weight: 700; font-size: 12px;">Offline</span>
            </div>
        `;
        
        list.innerHTML = html;
    });
    
    // Window controls
    document.getElementById('frameBtn_close')?.addEventListener('click', () => window.electronAPI.closeWindow());
    document.getElementById('frameBtn_minimize')?.addEventListener('click', () => window.electronAPI.minimizeWindow());

    // Login Success / Refresh UI
    window.electronAPI.onLoginSuccess((account) => {
        console.log('UI: Login success confirmed, refreshing...');
        localStorage.setItem('activeAccount', JSON.stringify(account));
        
        // Refresh Current Tab
        window.renderTab(window.currentTab);
        updateUserHeader();
        
        if (window.currentTab === 'accounts') {
            window.loadAccounts();
        }
    });

    window.electronAPI.onLoginError((err) => {
        alert("Error de Login: " + err);
    });

    // Mods Listener
    window.electronAPI.onModsList((mods) => {
        const grid = document.getElementById('mods-grid-ui');
        if (!grid) return;
        
        if (mods.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / span 3; text-align:center; padding: 100px; color: var(--text-dim);">No se detectaron mods en la carpeta.</div>`;
            return;
        }

        grid.innerHTML = mods.map(mod => `
            <div class="mod-card-new ${mod.enabled ? '' : 'disabled'}">
                <div class="mod-icon-wrapper">
                    <img src="${mod.icon_url || 'https://img.icons8.com/isometric/512/puzzle.png'}" class="mod-icon">
                </div>
                
                <div class="mod-main">
                    <h3 class="mod-name">${mod.name}</h3>
                    <p class="mod-author">por ${mod.author}</p>
                    <p class="mod-desc">${mod.description?.substring(0, 70) || 'Sin descripción disponible'}...</p>
                </div>
                
                <div class="mod-control">
                    <label class="neon-switch">
                        <input type="checkbox" ${mod.enabled ? 'checked' : ''} onchange="window.handleModToggle('${mod.filename}', this)">
                        <span class="neon-slider"></span>
                    </label>
                    <span class="mod-size">${mod.size}</span>
                </div>
            </div>
        `).join('');
    });

    window.handleModToggle = (filename, checkbox) => {
        window.playClick();
        window.electronAPI.toggleMod(filename);
        const card = checkbox.closest('.mod-card-new');
        card.classList.toggle('disabled', !checkbox.checked);
    };
}

// Side-bar routing hook
document.addEventListener('DOMContentLoaded', () => {
    // PRELOADER DISMISSAL
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
                
                // --- JARVIS PERSONALIZED GREETING ---
                if (typeof window.speak === 'function') {
                    const hour = new Date().getHours();
                    let timeGreet = "Buenas noches";
                    if (hour >= 5 && hour < 12) timeGreet = "Buenos días";
                    else if (hour >= 12 && hour < 20) timeGreet = "Buenas tardes";

                    const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
                    const userName = acc ? acc.name : "Piloto";
                    const isNew = !localStorage.getItem('hasSeenJarvis');
                    
                    let message = isNew 
                        ? `Bienvenido, ${userName}. Iniciando protocolo LosPapus por primera vez. Todos los sistemas en línea.`
                        : `${timeGreet}, ${userName}. Bienvenido de vuelta al launcher.`;
                    
                    window.speak(message);
                    localStorage.setItem('hasSeenJarvis', 'true');
                }
            }, 800); // Wait for transition
        }, 2800); // Cinematic duration
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            window.renderTab(tab);
        });
    });
    
    window.renderTab('play');
    
    // Initial Theme Load
    const activeTheme = localStorage.getItem('activeTheme') || 'cyberpink';
    applyTheme(activeTheme);
    updateMarketHeader();
    
    // Real-time Player Status Hook
    window.startRealTimeStatus = async () => {
        const countEl = document.getElementById('player-count');
        if (!countEl) return;
        
        const updateStatus = async () => {
            const ip = await window.electronAPI.getServerIp();
            window.electronAPI.pingServer(ip);
        };

        // Listen for results specifically for the header (and other places)
        window.electronAPI.onPingResult((data) => {
            if (data.online) {
                countEl.innerText = `${data.players.online} / ${data.players.max} JUGADORES EN LÍNEA`;
                countEl.style.color = 'var(--accent)';
            } else {
                countEl.innerText = 'SERVIDOR FUERA DE LÍNEA';
                countEl.style.color = 'var(--danger)';
            }
        });

        updateStatus();
        setInterval(updateStatus, 30000); // Pulse every 30s
    };

    window.startRealTimeStatus();
});
