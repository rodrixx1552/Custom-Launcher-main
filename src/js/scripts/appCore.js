/**
 * NEW APP CORE (Visual Layer) 2.0
 * Frappe Inspiration for LosPapus Launcher
 */

console.log('UI: appCore.js initializing Dashboard Design...');

// =====================================================================
// SISTEMA DE TOASTS PREMIUM (reemplaza alert() nativo)
// =====================================================================
const TOAST_ICONS = {
    success: 'fa-check-circle',
    error:   'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info:    'fa-info-circle'
};
const TOAST_TITLES = {
    success: 'ÉXITO',
    error:   'ERROR',
    warning: 'ADVERTENCIA',
    info:    'INFO'
};

window.showToast = (message, type = 'info', duration = 5000) => {
    const container = document.getElementById('toast-container');
    if (!container) { console.log('[Toast]', type, message); return; }

    // Limitar a 5 toasts simultáneos
    const existing = container.querySelectorAll('.toast');
    if (existing.length >= 5) existing[0].remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${TOAST_ICONS[type] || TOAST_ICONS.info} toast-icon"></i>
        <div class="toast-body">
            <div class="toast-title">${TOAST_TITLES[type] || type.toUpperCase()}</div>
            <div class="toast-msg">${message.replace(/\n/g, '<br>')}</div>
        </div>
        <button class="toast-close" onclick="window._dismissToast(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);
    window.playClick?.();

    const timer = setTimeout(() => window._dismissToast(toast), duration);
    toast._timer = timer;
};

window._dismissToast = (toast) => {
    if (!toast || toast.classList.contains('removing')) return;
    clearTimeout(toast._timer);
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
};

// Añadir tooltips al sidebar
const addSidebarTooltips = () => {
    const labels = { play: 'Jugar', accounts: 'Cuentas', mods: 'Mods', skins: 'Skin Vault', market: 'Mercado', settings: 'Configuración' };
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        const tab = item.getAttribute('data-tab');
        if (labels[tab] && !item.querySelector('.nav-tooltip')) {
            const tip = document.createElement('span');
            tip.className = 'nav-tooltip';
            tip.textContent = labels[tab];
            tip.style.cssText = 'position:absolute;left:65px;background:rgba(22,22,26,0.97);color:white;padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.2s;border:1px solid rgba(255,255,255,0.08);z-index:9999;';
            item.appendChild(tip);
            item.addEventListener('mouseenter', () => tip.style.opacity = '1');
            item.addEventListener('mouseleave', () => tip.style.opacity = '0');
        }
    });
};

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

    // [FIXED] Only one navigation sound — tabSFX tone replaces the old playClick
    if (typeof window.playTabSFX === 'function') {
        window.playTabSFX(tabName);
    } else {
        window.playClick?.();
    }
    
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

// =====================================================================
// SISTEMA DE DIAGNÓSTICO Y CONSOLA (Pro Layer)
// =====================================================================
window.gameLogs = [];
const MAX_LOG_LINES = 500;

window.addLogToConsole = (text) => {
    window.gameLogs.push(text);
    if (window.gameLogs.length > MAX_LOG_LINES) window.gameLogs.shift();
    
    const body = document.getElementById('console-body-content');
    if (body) {
        const line = document.createElement('div');
        line.className = 'console-line';
        if (text.includes('[DEBUG]')) line.classList.add('debug');
        if (text.includes('[DATA]')) line.classList.add('data');
        if (text.includes('[ERROR]') || text.toLowerCase().includes('failed') || text.toLowerCase().includes('error')) line.classList.add('error');
        line.innerText = text;
        body.appendChild(line);
        body.scrollTop = body.scrollHeight;
    }
};

window.toggleConsole = (show = true) => {
    const overlay = document.getElementById('console-overlay-ui');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
    if (show) {
        // Refrescar contenido actual si se abre tarde
        const body = document.getElementById('console-body-content');
        if (body) {
            body.innerHTML = window.gameLogs.map(l => `<div class="console-line">${l}</div>`).join('');
            body.scrollTop = body.scrollHeight;
        }
    }
};

// Initialize Console HTML
document.addEventListener('DOMContentLoaded', () => {
    const consoleDiv = document.createElement('div');
    consoleDiv.id = 'console-overlay-ui';
    consoleDiv.className = 'console-overlay';
    consoleDiv.innerHTML = `
        <div class="console-header">
            <div class="console-title">
                <i class="fas fa-terminal"></i> CONSOLA DE DIAGNÓSTICO LOSPAPUS
            </div>
            <button class="update-btn-close" onclick="window.toggleConsole(false)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div id="console-body-content" class="console-body"></div>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="user-btn primary" onclick="window.copyLogs()">COPIAR LOGS</button>
            <button class="user-btn" onclick="document.getElementById('console-body-content').innerHTML = ''; window.gameLogs = [];">LIMPIAR</button>
        </div>
    `;
    document.body.appendChild(consoleDiv);

    if (window.electronAPI && window.electronAPI.onLaunchLog) {
        window.electronAPI.onLaunchLog((data) => {
            window.addLogToConsole(data);
        });
    }
});

window.copyLogs = () => {
    const text = window.gameLogs.join('\n');
    navigator.clipboard.writeText(text);
    window.showToast('Logs copiados al portapapeles', 'success');
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
        const data = await response.json();
        
        // Handle new object format { news: [], playlist: [] } or legacy array [...]
        const news = Array.isArray(data) ? data : (data.news || []);

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
            .then(data => {
                const news = Array.isArray(data) ? data : (data.news || []);
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

                    <div id="skin-load-status" style="font-size: 11px; font-weight: 700; color: var(--accent); min-height: 18px; text-align: center; padding: 4px 0; letter-spacing: 1px;"></div>

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
        window._currentSkinB64 = null; // Reset al entrar

        // Escuchar cuando el usuario selecciona un archivo PNG local
        window.electronAPI.onFileSelected((base64Data) => {
            window._currentSkinB64 = base64Data;
            if (window.vaultViewer) window.vaultViewer.loadSkin(base64Data);
            const statusEl = document.getElementById('skin-load-status');
            if (statusEl) { statusEl.innerText = 'Skin local cargada ✓'; statusEl.style.color = 'var(--accent)'; }
        });
    }, 100);
}

window.loadSkinFromSearch = async () => {
    const input = document.getElementById('skin-search-input');
    const name = input.value.trim();
    if (!name) return;
    
    window.playClick();
    const skinUrl = `https://mc-heads.net/skin/${name}`;
    if (window.vaultViewer) window.vaultViewer.loadSkin(skinUrl);

    // Guardar como base64 para poder subirlo a Mojang despues
    try {
        const res = await fetch(skinUrl);
        const blob = await res.blob();
        await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => { window._currentSkinB64 = reader.result; resolve(); };
            reader.readAsDataURL(blob);
        });
        const statusEl = document.getElementById('skin-load-status');
        if (statusEl) { statusEl.innerText = `Skin de "${name}" cargada ✓`; statusEl.style.color = 'var(--accent)'; }
    } catch(e) {
        console.warn('UI: No se pudo obtener skin como base64:', e);
    }
};

window.applySkinToMojang = () => {
    const acc = JSON.parse(localStorage.getItem('activeAccount') || '{}');
    if (acc.type !== 'microsoft') {
        alert('Solo disponible para cuentas Premium (Microsoft).\nCrea una cuenta Microsoft en la pestaña de Cuentas.');
        return;
    }
    if (!window._currentSkinB64) {
        window.showToast('Primero carga una skin: busca por nombre o selecciona un archivo .PNG local', 'warning');
        return;
    }
    if (!acc.access_token) {
        window.showToast('Token de acceso no encontrado. Vuelve a iniciar sesión con Microsoft.', 'error');
        return;
    }

    window.playClick();
    const applyBtn = document.querySelector('.skin-btn.accent');
    if (applyBtn) { applyBtn.disabled = true; applyBtn.innerText = 'SUBIENDO...'; }

    const statusEl = document.getElementById('skin-load-status');
    if (statusEl) { statusEl.innerText = 'Subiendo a Mojang...'; statusEl.style.color = 'var(--text-dim)'; }

    window.electronAPI.uploadSkin({ accessToken: acc.access_token, base64Image: window._currentSkinB64 });
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
    const ram = localStorage.getItem('maxRam') || '6';
    const width = localStorage.getItem('windowWidth') || '1280';
    const height = localStorage.getItem('windowHeight') || '720';
    const version = localStorage.getItem('selectedVersion') || '1.20.1';
    const sfxVol = parseFloat(localStorage.getItem('sfxVolume') ?? '0.5');
    const musicVol = parseFloat(localStorage.getItem('musicVolume') ?? '0.3');
    const jarvisVoice = localStorage.getItem('jarvisVoice') || 'female';

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

                <!-- AUDIO GROUP 🎵 [NEW] -->
                <div class="settings-group" style="grid-column: 1 / span 2;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 25px;">
                        <i class="fas fa-volume-up" style="color: #a78bfa;"></i>
                        <span style="font-weight: 900; font-size: 13px; letter-spacing: 1px; color: var(--text-dim);">AUDIO Y JARVIS</span>
                    </div>

                    <div class="settings-item">
                        <div class="settings-label">
                            <span class="settings-title">Volumen SFX (Interfaz)</span>
                            <span class="settings-subtitle">Controla los sonidos de navegación, clicks y notificaciones.</span>
                        </div>
                        <div class="slider-container">
                            <input type="range" min="0" max="1" step="0.05" value="${sfxVol}" class="modern-slider"
                                oninput="window.updateSfxVolume(this.value); this.nextElementSibling.innerText = Math.round(this.value * 100) + '%'">
                            <span class="slider-value">${Math.round(sfxVol * 100)}%</span>
                        </div>
                    </div>

                    <div class="settings-item" style="margin-top: 15px;">
                        <div class="settings-label">
                            <span class="settings-title">Volumen Música de Temporada</span>
                            <span class="settings-subtitle">Música ambiental cargada desde las noticias del servidor.</span>
                        </div>
                        <div class="slider-container">
                            <input type="range" min="0" max="1" step="0.05" value="${musicVol}" class="modern-slider"
                                oninput="window.updateMusicVolume(this.value); this.nextElementSibling.innerText = Math.round(this.value * 100) + '%'">
                            <span class="slider-value">${Math.round(musicVol * 100)}%</span>
                        </div>
                    </div>

                    <div class="settings-item" style="margin-top: 15px;">
                        <div class="settings-label">
                            <span class="settings-title">Voz de JARVIS (TikTok Meme Edition)</span>
                            <span class="settings-subtitle">El asistente usará las famosas voces de Jessie y el Narrador de TikTok.</span>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            ${[
                                { id: 'female',    label: '👩 Jessie (TikTok)',  lang: 'es-MX' },
                                { id: 'male',      label: '👨 Narrador (Meme)', lang: 'es-MX' },
                                { id: 'ghostface', label: '🔪 Ghostface',        lang: 'es-MX' },
                                { id: 'epic',      label: '🎬 Narrador Épico',  lang: 'es-MX' }
                            ].map(v => `
                                <button class="user-btn ${jarvisVoice === v.id ? 'primary' : ''}" 
                                    id="voice-btn-${v.id}"
                                    onclick="window.setJarvisVoice('${v.id}', '${v.lang}', this)">
                                    ${v.label}
                                </button>
                            `).join('')}
                        </div>
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

// [NEW] JARVIS Voice Selector
window.setJarvisVoice = (voiceId, lang, btn) => {
    window.playClick();
    localStorage.setItem('jarvisVoice', voiceId);
    localStorage.setItem('jarvisLang', lang);
    // Update button styles
    document.querySelectorAll('[id^="voice-btn-"]').forEach(b => b.classList.remove('primary'));
    if (btn) btn.classList.add('primary');
    // Demo the selected voice
    if (typeof window.speak === 'function') {
        window.speak('Voz de JARVIS activada. Sistema listo.');
    }
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

window.tryLaunch = async () => {
    const acc = JSON.parse(localStorage.getItem('activeAccount') || 'null');
    if (!acc) return window.showToast('No hay cuenta seleccionada. Por favor inicia sesión.', 'warning');

    // [FIX 3] Check mod sync status before launching — avoid crashes from missing mods
    try {
        const needsSync = await window.electronAPI.checkModsStatus();
        if (needsSync) {
            const confirmed = await new Promise((resolve) => {
                const overlay = document.getElementById('overlay-container');
                const content = document.getElementById('modal-content');
                content.innerHTML = `
                    <div style="text-align: center; padding: 30px 20px;">
                        <div style="font-size: 50px; margin-bottom: 20px;">⚠️</div>
                        <h2 style="font-weight: 950; color: white; font-size: 20px; margin-bottom: 10px;">MODS DESACTUALIZADOS</h2>
                        <p style="color: var(--text-dim); font-size: 13px; line-height: 1.6; margin-bottom: 25px;">
                            Tu carpeta de mods no está sincronizada con el servidor.<br>
                            <b style="color: var(--accent)">Iniciar sin sincronizar puede causar crashes.</b>
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button class="user-btn primary" id="warn-sync-btn" style="flex: 1; max-width: 160px;">SINCRONIZAR</button>
                            <button class="user-btn" id="warn-launch-btn" style="flex: 1; max-width: 160px; opacity: 0.7;">JUGAR DE TODAS FORMAS</button>
                        </div>
                    </div>
                `;
                overlay.classList.add('show');
                document.getElementById('warn-sync-btn').onclick = () => {
                    overlay.classList.remove('show');
                    window.trySync();
                    resolve(false); // Don't launch
                };
                document.getElementById('warn-launch-btn').onclick = () => {
                    overlay.classList.remove('show');
                    resolve(true); // Launch anyway
                };
            });
            if (!confirmed) return;
        }
    } catch(e) {
        console.warn('UI: Could not check mods before launch:', e);
    }

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

    // Obtener forge_version desde el config remoto/local (ya no hardcodeado)
    let forgeVersion = null;
    try {
        const config = await window.electronAPI.getLauncherConfig();
        if (config && config.forge_version) {
            forgeVersion = config.forge_version;
            console.log('UI: Forge version from config:', forgeVersion);
        }
    } catch(e) {
        console.warn('UI: No se pudo obtener forge_version del config. Usando fallback.', e);
        if (version === '1.20.1') forgeVersion = '47.4.17';
    }

    window.electronAPI.launchGame({
        nick: acc.name,
        version: version,
        maxRam: localStorage.getItem('maxRam') || '6',
        width: localStorage.getItem('windowWidth') || '1280',
        height: localStorage.getItem('windowHeight') || '720',
        account: acc,
        forgeVersion
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
// NEW_THEMES apunta al objeto global definido en launcherEngine.js
// Esto garantiza que el Mercado y PapuEconomy siempre usen los mismos temas
const NEW_THEMES = window.LAUNCHER_THEMES;

function renderMarketTab(container) {
    const coins = parseInt(localStorage.getItem('papuCoins') || '1000');
    const owned = JSON.parse(localStorage.getItem('ownedThemes') || '["original"]');
    const active = localStorage.getItem('activeTheme') || 'original';

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
    if (coins < price) return window.showToast('¡No tienes suficientes Papu-Coins!', 'warning');
    
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
                <div style="font-size: 10px; color: var(--accent); font-weight: 900; margin-top: 4px; text-transform: uppercase;">Protocolo LosPapus v0.5.4</div>
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
    window.showToast('LosPapus Launcher v0.5.4 — Mods sincronizados desde GitHub. ¡Próxima actualización con más contenido!', 'info', 7000);
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

// --- MUSIC PLAYER SYNC ---
window.handleMusicToggle = () => {
    const isPlaying = window.toggleMusic();
    const btnIcon = document.querySelector('#music-toggle-btn i');
    if (btnIcon) {
        btnIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
    window.playClick();
};

window.addEventListener('music-updated', (e) => {
    const playerUI = document.getElementById('music-player-ui');
    const songNameText = document.getElementById('current-song-name');
    const btnIcon = document.querySelector('#music-toggle-btn i');
    
    if (playerUI && songNameText) {
        playerUI.style.display = 'flex';
        songNameText.innerText = e.detail.name.toUpperCase();
        if (btnIcon) btnIcon.className = 'fas fa-pause'; // Reset to pause icon on new track
        
        // Add a small animation effect when track changes
        songNameText.style.opacity = '0';
        setTimeout(() => {
            songNameText.style.opacity = '1';
        }, 300);
    }
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
    window.showToast('CRITICAL LAUNCH ERROR: ' + e.detail, 'error', 10000);
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
        window.showToast('Error de Login: ' + err, 'error');
    });

    // --- SKIN UPLOAD LISTENERS ---
    window.electronAPI.onSkinUploadSuccess(() => {
        const applyBtn = document.querySelector('.skin-btn.accent');
        if (applyBtn) { applyBtn.disabled = false; applyBtn.innerText = 'APLICAR A MI CUENTA'; }
        const statusEl = document.getElementById('skin-load-status');
        if (statusEl) { statusEl.innerText = '✅ ¡Skin aplicada a tu cuenta de Mojang!'; statusEl.style.color = 'var(--accent)'; }
        window.showToast('¡Skin aplicada correctamente a tu cuenta de Mojang!', 'success');
    });

    window.electronAPI.onSkinUploadError((err) => {
        const applyBtn = document.querySelector('.skin-btn.accent');
        if (applyBtn) { applyBtn.disabled = false; applyBtn.innerText = 'APLICAR A MI CUENTA'; }
        const statusEl = document.getElementById('skin-load-status');
        if (statusEl) { statusEl.innerText = '❌ Error al subir skin'; statusEl.style.color = 'var(--danger)'; }
        window.showToast('Error al subir skin: ' + err, 'error');
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
    const activeTheme = localStorage.getItem('activeTheme') || 'original';
    applyTheme(activeTheme);
    updateMarketHeader();

    // Activar tooltips del sidebar
    addSidebarTooltips();
    
    // Real-time Player Status Hook
    // [FIX 2] Track the interval ID so we can clear it and avoid memory leaks
    let statusIntervalId = null;
    window.startRealTimeStatus = async () => {
        const countEl = document.getElementById('player-count');
        if (!countEl) return;

        // Clear any previous interval before creating a new one
        if (statusIntervalId) {
            clearInterval(statusIntervalId);
            statusIntervalId = null;
        }
        
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
        statusIntervalId = setInterval(updateStatus, 30000); // Pulse every 30s
    };

    // --- OTA UPDATE LISTENER ---
    // [NEW] AUTO-UPDATE SYSTEM (ONE-CLICK)
    window.triggerAutoUpdate = (url) => {
        const actions = document.querySelector('.update-actions');
        const text = document.querySelector('.update-text');
        
        if (!actions || !text) return;

        // Limpiar botones y mostrar estado de carga
        actions.innerHTML = '';
        text.innerHTML = `
            <span class="update-title">APLICANDO ACTUALIZACIÓN...</span>
            <div class="update-status-container">
                <span id="update-status-text" class="update-status-text">Iniciando motor de descarga...</span>
                <div class="update-progress-bg">
                    <div id="update-progress-fill" class="update-progress-fill"></div>
                </div>
            </div>
        `;

        // Llamar a la API de Electron
        window.electronAPI.startAutoUpdate(url);
    };

    window.electronAPI.onAutoUpdateProgress((data) => {
        const textElem = document.getElementById('update-status-text');
        const barElem = document.getElementById('update-progress-fill');
        
        if (textElem) textElem.innerText = data.step;
        if (barElem) barElem.style.width = `${data.progress}%`;
    });

    window.electronAPI.onAutoUpdateError((err) => {
        window.showToast(`Error al actualizar: ${err}`, 'error', 5000);
        // Recargar el banner si falla o dejar que el usuario lo intente de nuevo
        const banner = document.getElementById('ota-update-banner');
        if (banner) banner.remove();
    });

    window.electronAPI.onUpdateAvailable((data) => {
        console.log(`📡 [OTA] Nueva versión detectada: ${data.version}`);
        
        // [NEW] Play notification SFX on update
        if (typeof window.playNotifSFX === 'function') window.playNotifSFX();

        // Evitar duplicados
        if (document.getElementById('ota-update-banner')) return;

        const mainArea = document.querySelector('.main-area');
        const banner = document.createElement('div');
        banner.id = 'ota-update-banner';
        banner.className = 'update-banner';
        banner.innerHTML = `
            <div class="update-banner-content">
                <div class="update-icon"><i class="fas fa-rocket"></i></div>
                <div class="update-text">
                    <span class="update-title">¡ACTUALIZACIÓN DISPONIBLE! (v${data.version})</span>
                    <span class="update-subtitle">Hay mejoras de red y diseño listas para ti.</span>
                </div>
                <div class="update-actions">
                    <button class="update-btn-action" onclick="window.triggerAutoUpdate('${data.url}')">DESCARGAR AHORA</button>
                    <button class="update-btn-close" onclick="this.parentElement.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
        
        if (mainArea) {
            mainArea.prepend(banner);
        }

        // [NEW] Activate red dot on notification bell
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'block';
    });

    window.startRealTimeStatus();

    // [NEW] Load seasonal background music if configured in news.json
    if (typeof window.loadSeasonalMusic === 'function') {
        setTimeout(() => window.loadSeasonalMusic(), 500);
    }

    // --- MODS STATUS CHECK ON STARTUP ---
    // Runs after 5s to let the UI settle. Shows a warning if local mods are out of sync.
    setTimeout(async () => {
        try {
            const needsSync = await window.electronAPI.checkModsStatus();
            if (needsSync) {
                window.showToast(
                    '⚠️ Tus mods están desactualizados. Presiona el botón <b>⟳</b> para sincronizar.',
                    'warning',
                    10000
                );
                // Also pulse the sync button if we're on the play tab
                const syncBtn = document.querySelector('.sync-btn');
                if (syncBtn) {
                    syncBtn.style.animation = 'spin 1s linear infinite';
                    setTimeout(() => { if (syncBtn) syncBtn.style.animation = ''; }, 4000);
                }
            }
        } catch (e) {
            console.warn('UI: Could not check mods status on startup:', e);
        }
    }, 5000);
});
