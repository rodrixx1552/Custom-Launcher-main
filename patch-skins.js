const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'js', 'scripts', 'appCore.js');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// Find the bounds of renderSkinsTab
let startLine = -1, endLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("window.renderSkinsTab = () => {")) {
        startLine = i;
    }
    if (startLine !== -1 && endLine === -1 && i > startLine && lines[i].trim() === '};') {
        endLine = i;
        break;
    }
}

console.log(`Found renderSkinsTab from line ${startLine+1} to ${endLine+1}`);

const newCode = `    window.renderSkinsTab = () => {
        mainContent.innerHTML = \`
            <div style="padding: 40px; animation: slideUpFade 0.6s ease; height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <div>
                        <h1 style="font-weight: 900; letter-spacing: 5px; color: #ffb7c5; margin:0;">SKIN WORKSHOP</h1>
                        <span style="opacity:0.5; font-size:11px; font-weight:900;">YOUR PERSONAL SKIN LIBRARY</span>
                    </div>
                    <button id="uploadSkin" class="btn-play-custom btn-outline" style="padding: 10px 25px; font-size: 12px;"><i class="fas fa-plus-circle"></i> UPLOAD SKIN</button>
                </div>
                <div style="flex: 1; display: grid; grid-template-columns: 260px 1fr 260px; gap: 25px; min-height: 0;">
                    <div class="glass premium-scroll" style="padding: 20px; border-radius: 20px; border: 1px solid rgba(255,183,197,0.1); overflow-y: auto; display:flex; flex-direction:column; gap:8px;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 12px; letter-spacing: 2px; flex-shrink:0;">SKIN LIBRARY</h3>
                        <div id="skins-grid" style="display: flex; flex-direction: column; gap: 10px; flex:1;"></div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div id="skin-viewer-canvas" style="width: 260px; height: 340px; cursor: grab; filter: drop-shadow(0 0 25px rgba(255,183,197,0.3));"><div style="opacity:0.3; padding-top:120px; text-align:center; font-size:10px;">LOADING...</div></div>
                        <div style="width: 160px; height: 8px; background: radial-gradient(circle, #ffb7c5 0%, transparent 70%); opacity: 0.3; filter: blur(4px); margin-top:-4px;"></div>
                        <div id="skin-active-label" style="font-size:10px; opacity:0.5; margin-top:12px; letter-spacing:2px; font-weight:900; text-align:center;"></div>
                        <div style="display:flex; gap: 10px; margin-top: 15px;">
                            <button class="btn-play-custom btn-secondary" id="previewSkinBtn" style="padding: 10px 20px; font-size: 12px;"><i class="fas fa-eye"></i> PREVIEW</button>
                            <button class="btn-play-custom" id="applySkinLocal" style="padding: 10px 25px; font-size: 12px;"><i class="fas fa-sync"></i> APPLY SKIN</button>
                        </div>
                    </div>
                    <div class="glass premium-scroll" style="padding: 20px; border-radius: 20px; border: 1px solid rgba(255,183,197,0.1); overflow-y: auto;">
                        <h3 style="font-size: 11px; font-weight: 900; opacity: 0.5; margin-bottom: 20px; letter-spacing: 2px;">HOW TO USE</h3>
                        <div style="font-size: 12px; line-height: 1.9; opacity: 0.7;">
                            <p style="margin-bottom:12px;"><i class="fas fa-plus-circle" style="color:#ffb7c5; margin-right:6px;"></i><b>Upload Skin</b> — Import a PNG from your device into your library.</p>
                            <p style="margin-bottom:12px;"><i class="fas fa-hand-pointer" style="color:#ffb7c5; margin-right:6px;"></i><b>Select</b> — Click a skin from your library to select it.</p>
                            <p style="margin-bottom:12px;"><i class="fas fa-eye" style="color:#ffb7c5; margin-right:6px;"></i><b>Preview</b> — Preview it on the 3D viewer.</p>
                            <p style="margin-bottom:12px;"><i class="fas fa-sync" style="color:#ffb7c5; margin-right:6px;"></i><b>Apply Skin</b> — Apply it! Microsoft accounts sync to Mojang servers. Offline accounts use it locally.</p>
                            <p><i class="fas fa-trash" style="color:#e84118; margin-right:6px;"></i><b>Delete</b> — Remove a skin from your library.</p>
                            <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
                            <p style="font-size:11px; opacity:0.6;">Skins are saved locally in your launcher.</p>
                        </div>
                    </div>
                </div>
            </div>
        \`;
        
        let currentSkinData = null;
        let selectedSkinName = null;
        let skinViewer = null;

        const getSkinLibrary = () => { try { return JSON.parse(localStorage.getItem('skinLibrary') || '[]'); } catch { return []; } };
        const saveSkinLibrary = (lib) => localStorage.setItem('skinLibrary', JSON.stringify(lib));

        const renderLibrary = () => {
            const lib = getSkinLibrary();
            const grid = document.getElementById('skins-grid');
            if (!grid) return;
            const activeSkin = localStorage.getItem('activeSkinName') || '';
            if (lib.length === 0) {
                grid.innerHTML = \`<div style="font-size:11px; opacity:0.4; text-align:center; padding:20px 10px;">Your library is empty.<br><br>Upload a skin PNG to get started.</div>\`;
                return;
            }
            grid.innerHTML = lib.map((s, i) => \`
                <div class="v-opt \${s.name === activeSkin ? 'active' : ''}" id="skin-item-\${i}" style="display:flex; align-items:center; gap:10px; padding:10px 12px; cursor:pointer; border-radius:12px;">
                    <img src="\${s.data}" style="width:28px;height:28px; image-rendering:pixelated; border-radius:5px; border:1px solid rgba(255,183,197,0.2);" onerror="this.style.display='none'">
                    <span style="flex:1; font-size:11px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="\${s.name}">\${s.name}</span>
                    <button onclick="event.stopPropagation(); window.deleteSkin(\${i})" style="background:none; border:none; color:rgba(255,100,100,0.7); cursor:pointer; font-size:12px; padding:2px 5px;"><i class="fas fa-trash"></i></button>
                </div>
            \`).join('');
            lib.forEach((s, i) => {
                document.getElementById(\`skin-item-\${i}\`)?.addEventListener('click', () => {
                    selectedSkinName = s.name;
                    currentSkinData = s.data;
                    const label = document.getElementById('skin-active-label');
                    if (label) label.innerText = \`SELECTED: \${s.name.toUpperCase()}\`;
                    document.querySelectorAll('[id^="skin-item-"]').forEach(el => el.classList.remove('active'));
                    document.getElementById(\`skin-item-\${i}\`)?.classList.add('active');
                });
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
        const defaultSkinSource = activeSkinData || (acc ? \`https://mc-heads.net/skin/\${acc.name}\` : 'https://mc-heads.net/skin/Steve');
        
        const initViewer = (skinSource) => {
            try {
                if (typeof skinview3d === 'undefined') throw new Error('skinview3d not loaded');
                const container = document.getElementById('skin-viewer-canvas');
                if (!container) return;
                container.innerHTML = '';
                const canvas = document.createElement('canvas');
                skinViewer = new skinview3d.SkinViewer({ canvas, width: 260, height: 340, skin: skinSource });
                container.appendChild(canvas);
                skinViewer.autoRotate = true;
                skinViewer.animation = new skinview3d.WalkingAnimation();
            } catch(e) {
                const c = document.getElementById('skin-viewer-canvas');
                if(c) c.innerHTML = \`<div style="opacity:0.3; padding-top:120px; text-align:center; font-size:10px;">SKIN ENGINE OFFLINE<br>\${e.message}</div>\`;
            }
        };
        initViewer(defaultSkinSource);
        renderLibrary();

        document.getElementById('uploadSkin')?.addEventListener('click', () => {
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
        });

        document.getElementById('previewSkinBtn')?.addEventListener('click', () => {
            if (!currentSkinData) { alert('Select a skin from your library first!'); return; }
            if (skinViewer) skinViewer.loadSkin(currentSkinData);
        });

        document.getElementById('applySkinLocal')?.addEventListener('click', () => {
            if (!currentSkinData) { alert('Select a skin from your library first!'); return; }
            localStorage.setItem('activeSkinName', selectedSkinName || '');
            localStorage.setItem('activeSkinData', currentSkinData);
            renderLibrary();
            if (skinViewer) skinViewer.loadSkin(currentSkinData);
            if (acc && acc.type === 'microsoft') {
                const btn = document.getElementById('applySkinLocal');
                if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...';
                window.electronAPI.uploadSkin({ accessToken: acc.access_token, base64Image: currentSkinData });
            } else {
                alert('SKIN APPLIED! (Offline accounts use skins locally in the launcher.)');
            }
        });

        window.electronAPI.onSkinUploadSuccess(() => {
            const btn = document.getElementById('applySkinLocal');
            if (btn) btn.innerHTML = '<i class="fas fa-sync"></i> APPLY SKIN';
            alert('SKIN SYNC: Texture uploaded to Mojang!');
        });
        window.electronAPI.onSkinUploadError((err) => {
            const btn = document.getElementById('applySkinLocal');
            if (btn) btn.innerHTML = '<i class="fas fa-sync"></i> APPLY SKIN';
            alert('SKIN ERROR: ' + err);
        });
    };`;

lines.splice(startLine, endLine - startLine + 1, ...newCode.split('\n'));
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done! renderSkinsTab updated successfully.');
