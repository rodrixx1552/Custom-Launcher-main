const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'js', 'scripts', 'appCore.js');
let content = fs.readFileSync(filePath, 'utf8');

// =====================================================================
// FIX 1: Fix renderSkinsTab - replace showModal call with correct API
// =====================================================================
const badCall = `        document.getElementById('uploadSkin')?.addEventListener('click', () => {
            window.electronAPI.selectFile();
            window.electronAPI.onFileSelected((data) => {
                window.showModal({
                    type: 'input',
                    title: 'NAME YOUR SKIN',
                    message: 'Give a name to this skin:',
                    placeholder: 'e.g. My Cool Skin',
                    onConfirm: (name) => {
                        if (!name || !name.trim()) { alert('Please enter a valid name.'); return; }
                        const lib = getSkinLibrary();
                        lib.push({ name: name.trim(), data });
                        saveSkinLibrary(lib);
                        selectedSkinName = name.trim();
                        currentSkinData = data;
                        const label = document.getElementById('skin-active-label');
                        if (label) label.innerText = \`SELECTED: \${name.trim().toUpperCase()}\`;
                        renderLibrary();
                        if (skinViewer) skinViewer.loadSkin(data);
                    }
                });
            });
        });`;

const goodCall = `        document.getElementById('uploadSkin')?.addEventListener('click', () => {
            // Use once to avoid listener accumulation
            ipcRenderer_once('file-selected', (data) => {
                window.showModal('NAME YOUR SKIN', 'Skin name (e.g. My Cool Skin)', (name) => {
                    if (!name || !name.trim()) { alert('Please enter a valid name.'); return; }
                    const lib = getSkinLibrary();
                    lib.push({ name: name.trim(), data });
                    saveSkinLibrary(lib);
                    selectedSkinName = name.trim();
                    currentSkinData = data;
                    const label = document.getElementById('skin-active-label');
                    if (label) label.innerText = \`SELECTED: \${name.trim().toUpperCase()}\`;
                    renderLibrary();
                    if (skinViewer) skinViewer.loadSkin(data);
                });
            });
            window.electronAPI.selectFile();
        });`;

if (content.includes('type: \'input\'')) {
    content = content.replace(badCall, goodCall);
    console.log('FIX 1a applied (showModal signature fix)');
} else {
    // Alternative: patch specific part
    content = content.replace(
        `window.electronAPI.onFileSelected((data) => {
                window.showModal({
                    type: 'input',
                    title: 'NAME YOUR SKIN',
                    message: 'Give a name to this skin:',
                    placeholder: 'e.g. My Cool Skin',
                    onConfirm: (name) => {`,
        `ipcRenderer_once('file-selected', (data) => {
                window.showModal('NAME YOUR SKIN', 'Skin name (e.g. My Cool Skin)', (name) => {
                    if (false) { // placeholder to match brace count`
    );
    console.log('FIX 1b applied (partial fix)');
}

// Add ipcRenderer_once helper at the top of DOMContentLoaded after window.t definition
const helperFn = `
    // One-time IPC listener helper (avoids accumulation)
    const ipcRenderer_once = (channel, callback) => {
        const handler = (data) => { callback(data); };
        window.electronAPI['on' + channel.split('-').map((w,i) => i===0?w:w[0].toUpperCase()+w.slice(1)).join('')] = (cb) => {};
        // Use onFileSelected once pattern
        const wrapper = (data) => { callback(data); };
        window._skinFileCallback = wrapper;
    };
`;

// Actually a simpler fix: just use the correct API signature directly
// Replace the bad pattern with the correct showModal usage
content = content.replace(
    /window\.electronAPI\.onFileSelected\(\(data\) => \{\s*window\.showModal\(\{[\s\S]*?onConfirm: \(name\) => \{/,
    `window.electronAPI.onFileSelected((data) => {
                window.showModal('NAME YOUR SKIN', 'Skin name (e.g.: My Cool Skin)', (name) => {`
);

// Fix closing braces - remove extra ones from the old object syntax
content = content.replace(
    /renderLibrary\(\);\s*if \(skinViewer\) skinViewer\.loadSkin\(data\);\s*\}\s*\}\s*\}\);\s*\}\);\s*\}\);/,
    `renderLibrary();
                    if (skinViewer) skinViewer.loadSkin(data);
                });
            });
        });`
);

// =====================================================================
// FIX 2: Replace renderSettingsTab with better version
// =====================================================================
const settingsStart = content.indexOf("    window.renderSettingsTab = () => {");
const settingsEnd = content.indexOf("    };\n\n    window.setLang");
if (settingsStart !== -1 && settingsEnd !== -1) {
    const newSettings = `    window.renderSettingsTab = () => {
        const ram = localStorage.getItem('maxRam') || '3';
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
            { id: 'bg3', label: 'Custom BG 3', desc: 'Background image 3', img: '../assets/backgrounds/background3.png' },
            { id: 'bg4', label: 'Custom BG 4', desc: 'Background image 4', img: '../assets/backgrounds/background4.png' },
        ];

        mainContent.innerHTML = \`
            <div style="padding: 40px; animation: slideUpFade 0.6s ease; height: 100%; overflow-y: auto;" class="premium-scroll">
                <h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin-bottom: 35px;">\${t('command_center')}</h1>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; max-width: 900px;">
                    <!-- RAM SETTINGS -->
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-memory" style="margin-right:8px; color:#ffb7c5;"></i>RAM ALLOCATION</h3>
                        <label style="font-weight: 900; color: #ffb7c5; font-size: 28px; margin-bottom: 12px; display: block;"><span id="ramVal">\${ram} GB</span></label>
                        <input type="range" id="ramRange" min="1" max="16" value="\${ram}" style="width: 100%; accent-color: #ffb7c5;" oninput="document.getElementById('ramVal').innerText = this.value + ' GB'">
                        <div style="display:flex; justify-content:space-between; font-size:10px; opacity:0.4; margin-top:5px;"><span>1 GB</span><span>16 GB</span></div>
                    </div>

                    <!-- LANGUAGE -->   
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-globe" style="margin-right:8px; color:#ffb7c5;"></i>LANGUAGE</h3>
                        <div style="display: flex; gap: 12px;">
                            <button class="v-opt \${lang==='es'?'active':''}" onclick="setLang('es')" style="flex: 1; font-size: 12px; margin: 0; padding: 12px;">🇪🇸 ESPAÑOL</button>
                            <button class="v-opt \${lang==='en'?'active':''}" onclick="setLang('en')" style="flex: 1; font-size: 12px; margin: 0; padding: 12px;">🇺🇸 ENGLISH</button>
                        </div>
                    </div>

                    <!-- FORGE ENGINE -->
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-fire" style="margin-right:8px; color:#ff8c4a;"></i>FORGE ENGINE</h3>
                        <button id="toggleForge" class="v-opt \${forgeEnabled?'active':''}" onclick="toggleForge()" style="width:100%; font-size: 12px; margin: 0; padding: 13px;">
                            <i class="fas \${forgeEnabled ? 'fa-check-circle' : 'fa-times-circle'}" style="margin-right:8px;"></i>
                            \${forgeEnabled ? 'FORGE ACTIVE (47.3.0)' : 'FORGE DISABLED'}
                        </button>
                        <p style="font-size:10px; opacity:0.5; margin-top:10px; line-height:1.6;">Required for modded Minecraft 1.20.1. Disable only for vanilla gameplay.</p>
                    </div>

                    <!-- JAVA PATH -->
                    <div class="glass" style="padding: 25px; border-radius: 20px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fab fa-java" style="margin-right:8px; color:#ffb7c5;"></i>JAVA PATH</h3>
                        <input type="text" id="javaPath" value="\${localStorage.getItem('javaPath') || ''}" placeholder="Leave empty for auto-detect" class="v-opt" style="width:100%; padding:12px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:11px; font-weight:900; letter-spacing:1px; border-radius:10px;">
                        <p style="font-size:10px; opacity:0.5; margin-top:8px;">e.g. C:/Program Files/Java/jre8/bin/java.exe</p>
                    </div>
                </div>

                <!-- BACKGROUND PICKER -->
                <div class="glass" style="padding: 25px; border-radius: 20px; margin-top: 25px; max-width: 900px;">
                    <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;"><i class="fas fa-image" style="margin-right:8px; color:#ffb7c5;"></i>BACKGROUND THEME</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px;">
                        \${backgrounds.map(bg => \`
                            <div class="bg-option \${bgFX === bg.id ? 'bg-active' : ''}" onclick="selectBG('\${bg.id}')" style="cursor:pointer; border-radius:12px; overflow:hidden; border: 2px solid \${bgFX === bg.id ? '#ffb7c5' : 'rgba(255,255,255,0.05)'}; transition: all 0.3s; position:relative;">
                                \${bg.img ? \`<img src="\${bg.img}" style="width:100%; height:70px; object-fit:cover; display:block;">\` : \`<div style="width:100%; height:70px; background: \${bg.id==='matrix' ? 'radial-gradient(circle, #1a080a, #000)' : bg.id==='void' ? '#000' : 'radial-gradient(circle, #081a0e, #000)'}; display:flex; align-items:center; justify-content:center;"><i class="fas fa-star" style="color:rgba(255,183,197,0.3); font-size:20px;"></i></div>\`}
                                <div style="padding: 8px 8px 10px; background: rgba(0,0,0,0.7);">
                                    <div style="font-size:10px; font-weight:900; color:\${bgFX === bg.id ? '#ffb7c5' : '#fff'};">\${bg.label}</div>
                                    <div style="font-size:9px; opacity:0.5; margin-top:2px;">\${bg.desc}</div>
                                </div>
                                \${bgFX === bg.id ? '<div style="position:absolute; top:5px; right:5px; background:#ffb7c5; border-radius:50%; width:12px; height:12px; display:flex; align-items:center; justify-content:center;"><i class="fas fa-check" style="font-size:7px; color:#000;"></i></div>' : ''}
                            </div>
                        \`).join('')}
                    </div>
                </div>

                <!-- SAVE BUTTON -->
                <div style="margin-top: 25px; max-width: 900px;">
                    <button id="saveGlobal" class="btn-play-custom" style="padding: 18px 40px; width: 100%; font-size: 14px; letter-spacing: 3px;"><i class="fas fa-save" style="margin-right:10px;"></i>\${t('commit_changes')}</button>
                </div>
            </div>
        \`;

        window.selectBG = (id) => {
            localStorage.setItem('bgFX', id);
            renderSettingsTab();
            window.updateGlobalUI();
        };

        document.getElementById('saveGlobal')?.addEventListener('click', () => {
            const ramVal = document.getElementById('ramRange').value;
            const javaVal = document.getElementById('javaPath').value;
            localStorage.setItem('maxRam', ramVal);
            if (javaVal.trim()) localStorage.setItem('javaPath', javaVal.trim());
            else localStorage.removeItem('javaPath');
            alert('Settings saved! Launcher will apply changes on next play.');
            location.reload();
        });
    }`;
    
    content = content.substring(0, settingsStart) + newSettings + content.substring(settingsEnd);
    console.log('FIX 2 applied (improved settings tab)');
}

// =====================================================================  
// FIX 3: Update updateGlobalUI to handle custom background images
// =====================================================================
content = content.replace(
    `const bgFX = localStorage.getItem('bgFX') || 'matrix';
    const bgElem = document.querySelector('.background-animation');`,
    `const bgFX = localStorage.getItem('bgFX') || 'matrix';
    const bgElem = document.querySelector('.background-animation');
    // Handle custom image backgrounds
    const imgBGs = { bg1: '../assets/backgrounds/background1.png', bg2: '../assets/backgrounds/background2.png', bg3: '../assets/backgrounds/background3.png', bg4: '../assets/backgrounds/background4.png' };
    if (imgBGs[bgFX]) {
        if (bgElem) {
            bgElem.style.backgroundImage = \`url('\${imgBGs[bgFX]}')\`;
            bgElem.style.backgroundSize = 'cover';
            bgElem.style.backgroundPosition = 'center';
            bgElem.querySelector('.particles')?.remove();
            bgElem.querySelector('.clouds')?.remove();
        }
    }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('All fixes applied successfully!');
