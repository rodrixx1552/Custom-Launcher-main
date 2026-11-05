(() => {
  'use strict';

  const OWNER = 'rodrixx1552';
  const REPO = 'Custom-Launcher-main';
  const BRANCH = 'main';
  const API = 'https://api.github.com';
  let token = '';
  let currentUser = null;
  let currentProfile = null;
  let launcherConfig = null;
  let packageJson = null;
  let packageLock = null;
  let mods = [];
  const pendingFiles = new Map();

  const $ = selector => document.querySelector(selector);
  const loginPanel = $('#login-panel');
  const adminPanel = $('#admin-panel');
  const notice = $('#notice');
  const publishPackButton = $('#publish-pack');
  const publishLauncherButton = $('#publish-launcher');

  function setNotice(message, kind = 'success') {
    notice.textContent = message;
    notice.className = `notice ${kind}`;
    notice.classList.remove('hidden');
  }

  function clearNotice() {
    notice.classList.add('hidden');
    notice.textContent = '';
  }

  function setBusy(button, busy, text) {
    button.disabled = busy;
    button.classList.toggle('toast', busy);
    if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
    button.textContent = busy ? text : button.dataset.idleLabel;
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { message: text }; }
    if (!response.ok) {
      const suffix = response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0' ? ' Se agotó el límite temporal de GitHub.' : '';
      throw new Error((data.message || `GitHub respondió ${response.status}.`) + suffix);
    }
    return data;
  }

  function decodeBase64(value) {
    const binary = atob(value.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return btoa(binary);
  }

  async function readFile(path) {
    try {
      const file = await api(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
      return { json: JSON.parse(decodeBase64(file.content)), sha: file.sha };
    } catch (error) {
      if (/Not Found/i.test(error.message)) return { json: null, sha: null };
      throw error;
    }
  }

  function parseVersion(value) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value || '');
    return match ? match.slice(1).map(Number) : null;
  }

  function isNewer(value, current) {
    const next = parseVersion(value);
    const previous = parseVersion(current);
    if (!next) return false;
    if (!previous) return true;
    for (let index = 0; index < 3; index++) {
      if (next[index] > previous[index]) return true;
      if (next[index] < previous[index]) return false;
    }
    return false;
  }

  async function commitFiles(files, message) {
    const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    const commit = await api(`/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);
    const tree = await api(`/repos/${OWNER}/${REPO}/git/trees`, {
      method: 'POST',
      body: {
        base_tree: commit.tree.sha,
        tree: Object.entries(files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content }))
      }
    });
    const nextCommit = await api(`/repos/${OWNER}/${REPO}/git/commits`, {
      method: 'POST',
      body: { message, tree: tree.sha, parents: [ref.object.sha] }
    });
    await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: { sha: nextCommit.sha, force: false }
    });
  }

  async function connect() {
    const input = $('#github-token');
    const error = $('#login-error');
    const button = $('#login-button');
    token = input.value.trim();
    error.textContent = '';
    if (!token) { error.textContent = 'Pega el token de acceso de GitHub.'; return; }
    setBusy(button, true, 'COMPROBANDO CUENTA…');
    try {
      const [user, repository] = await Promise.all([api('/user'), api(`/repos/${OWNER}/${REPO}`)]);
      if (user.login.toLowerCase() !== OWNER.toLowerCase()) throw new Error(`La cuenta conectada es @${user.login}; solo @${OWNER} puede usar este panel.`);
      if (!repository.permissions?.push) throw new Error('Esta cuenta no tiene permiso para publicar en el repositorio. Revisa el acceso del token.');
      currentUser = user;
      input.value = '';
      await loadDashboard();
      loginPanel.classList.add('hidden');
      adminPanel.classList.remove('hidden');
      $('#auth-status').classList.add('on');
      $('#auth-label').textContent = `@${user.login}`;
      $('#logout-button').classList.remove('hidden');
    } catch (caught) {
      token = '';
      error.textContent = caught.message;
    } finally {
      setBusy(button, false);
    }
  }

  async function loadDashboard() {
    clearNotice();
    setNotice('Leyendo el perfil activo y la configuración de publicación…', 'busy');
    const [profile, config, pkg, lock] = await Promise.all([
      readFile('src/modpack.json'), readFile('src/launcher-config.json'), readFile('package.json'), readFile('package-lock.json')
    ]);
      currentProfile = profile.json || { schemaVersion: 1, version: '0.0.0', minecraftVersion: '1.21.1', loader: 'neoforge', loaderVersion: '21.1.265', javaVersion: 21, mods: [] };
    launcherConfig = config.json || {};
    packageJson = pkg.json || {};
    packageLock = lock.json || {};
    mods = (currentProfile.mods || []).map(mod => ({ ...mod, pendingFile: null }));
    $('#current-pack').textContent = `Actual ${currentProfile.version} · MC ${currentProfile.minecraftVersion} · NeoForge ${currentProfile.loaderVersion}`;
    $('#pack-version').value = nextPatch(currentProfile.version);
    $('#minecraft-version').value = currentProfile.minecraftVersion;
    $('#loader-version').value = currentProfile.loaderVersion;
    $('#java-version').value = String(currentProfile.javaVersion || 21);
    $('#current-launcher').textContent = `Actual ${launcherConfig.latest_launcher_version || packageJson.version || 'desconocida'}`;
    $('#launcher-version').value = nextPatch(launcherConfig.latest_launcher_version || packageJson.version || '0.0.0');
    pendingFiles.clear();
    renderMods();
    clearNotice();
  }

  function nextPatch(value) {
    const parsed = parseVersion(value);
    return parsed ? `${parsed[0]}.${parsed[1]}.${parsed[2] + 1}` : '1.0.0';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function renderMods() {
    const body = $('#mod-list');
    body.replaceChildren();
    if (!mods.length) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="4" class="empty">Todavía no hay mods en este perfil.</td>';
      body.append(row);
    }
    for (const mod of mods) {
      const row = document.createElement('tr');
      const fileSize = mod.pendingFile ? `${(mod.pendingFile.size / 1048576).toFixed(1)} MB · pendiente` : mod.size ? `${(mod.size / 1048576).toFixed(1)} MB` : '—';
      const hash = mod.pendingFile ? 'Se calculará al subir' : (mod.sha256 || '—').slice(0, 16);
      row.innerHTML = `<td>${escapeHtml(mod.filename)}</td><td class="hash">${escapeHtml(hash)}</td><td>${escapeHtml(fileSize)}</td><td><button class="remove" type="button" data-remove="${escapeHtml(mod.filename)}">Quitar</button></td>`;
      body.append(row);
    }
    $('#pack-summary').textContent = `${mods.length} mod${mods.length === 1 ? '' : 's'} · ${pendingFiles.size} archivo${pendingFiles.size === 1 ? '' : 's'} nuevo${pendingFiles.size === 1 ? '' : 's'}`;
    publishPackButton.disabled = false;
  }

  $('#mod-list').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const key = button.dataset.remove.toLowerCase();
    mods = mods.filter(mod => mod.filename.toLowerCase() !== key);
    pendingFiles.delete(key);
    renderMods();
  });

  $('#mod-files').addEventListener('change', event => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      if (!/^[\w .()+-]+\.jar$/i.test(file.name)) { setNotice(`El nombre "${file.name}" no se puede usar como archivo de mod.`, 'error'); continue; }
      if (file.size < 4 || file.size > 2 * 1024 * 1024 * 1024) { setNotice(`${file.name} debe pesar entre 4 bytes y 2 GB.`, 'error'); continue; }
      const key = file.name.toLowerCase();
      pendingFiles.set(key, file);
      const existingIndex = mods.findIndex(mod => mod.filename.toLowerCase() === key);
      const entry = { filename: file.name, sha256: '', size: file.size, url: '', pendingFile: file };
      if (existingIndex >= 0) mods[existingIndex] = entry;
      else mods.push(entry);
    }
    event.target.value = '';
    renderMods();
  });

  async function createOrReuseDraft(tag, title, body) {
    let release;
    try { release = await api(`/repos/${OWNER}/${REPO}/releases/tags/${encodeURIComponent(tag)}`); }
    catch (error) {
      if (!/Not Found/i.test(error.message)) throw error;
      release = await api(`/repos/${OWNER}/${REPO}/releases`, {
        method: 'POST',
        body: { tag_name: tag, target_commitish: BRANCH, name: title, body, draft: true, prerelease: false }
      });
    }
    if (!release.draft || release.author?.login?.toLowerCase() !== OWNER.toLowerCase()) throw new Error(`El tag ${tag} ya existe y no es un borrador propio. Elige otra versión o revisa Releases en GitHub.`);
    return release;
  }

  async function uploadAsset(release, file, progressLabel) {
    const existing = await api(`/repos/${OWNER}/${REPO}/releases/${release.id}/assets`);
    const prior = existing.find(asset => asset.name === file.name);
    if (prior) await api(`/repos/${OWNER}/${REPO}/releases/assets/${prior.id}`, { method: 'DELETE' });
    const uploadUrl = release.upload_url.replace(/\{\?.*$/, '');
    const separator = uploadUrl.includes('?') ? '&' : '?';
    const response = await fetch(`${uploadUrl}${separator}name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });
    const text = await response.text();
    let asset;
    try { asset = text ? JSON.parse(text) : {}; } catch (_) { asset = { message: text }; }
    if (!response.ok) throw new Error(asset.message || `${progressLabel}: GitHub rechazó el archivo (${response.status}).`);
    if (!/^sha256:[a-f0-9]{64}$/i.test(asset.digest || '')) throw new Error(`GitHub no devolvió el hash SHA-256 de ${file.name}; no se publicará un perfil sin verificación.`);
    return asset;
  }

  async function publishRelease(release) {
    return api(`/repos/${OWNER}/${REPO}/releases/${release.id}`, { method: 'PATCH', body: { draft: false, make_latest: 'true' } });
  }

  async function publishPack() {
    const version = $('#pack-version').value.trim();
    const minecraftVersion = $('#minecraft-version').value.trim();
    const loaderVersion = $('#loader-version').value.trim();
    const javaVersion = Number($('#java-version').value);
    if (!isNewer(version, currentProfile.version)) throw new Error('La versión del modpack debe ser semántica y superior a la versión actual.');
    if (!/^\d+\.\d+(?:\.\d+)?$/.test(minecraftVersion)) throw new Error('Escribe una versión válida de Minecraft, por ejemplo 1.21.1.');
    if (!/^\d+\.\d+\.\d+$/.test(loaderVersion)) throw new Error('Escribe una versión válida de NeoForge, por ejemplo 21.1.265.');
    if (mods.some(mod => !mod.pendingFile && !/^https:\/\/github\.com\//.test(mod.url || ''))) throw new Error('Hay un mod sin URL válida; quítalo y vuelve a añadir su JAR.');

    publishPackButton.dataset.idleLabel = publishPackButton.textContent;
    setBusy(publishPackButton, true, 'CREANDO RELEASE…');
    clearNotice();
    try {
      const tag = `modpack-v${version}`;
      const release = await createOrReuseDraft(tag, `Modpack ${version}`, `Minecraft ${minecraftVersion}\nNeoForge ${loaderVersion}\nJava ${javaVersion}`);
      const nextMods = [];
      let uploadIndex = 0;
      const uploadCount = mods.filter(mod => mod.pendingFile).length;
      for (const mod of mods) {
        if (!mod.pendingFile) { nextMods.push({ filename: mod.filename, sha256: mod.sha256, url: mod.url, size: mod.size }); continue; }
        uploadIndex++;
        publishPackButton.textContent = `SUBIENDO ${uploadIndex}/${uploadCount}…`;
        setNotice(`Subiendo ${mod.filename} (${uploadIndex} de ${uploadCount})…`, 'busy');
        const asset = await uploadAsset(release, mod.pendingFile, mod.filename);
        nextMods.push({ filename: mod.filename, sha256: asset.digest.slice('sha256:'.length), url: asset.browser_download_url, size: asset.size });
      }

      setNotice('Publicando los archivos del modpack…', 'busy');
      await publishRelease(release);
      const profile = {
        schemaVersion: 1,
        version,
        minecraftVersion,
        loader: 'neoforge',
        loaderVersion,
        javaVersion,
        releaseTag: tag,
        publishedAt: new Date().toISOString(),
        mods: nextMods
      };
      setNotice('Actualizando el perfil que consultan los launchers…', 'busy');
      await commitFiles({ 'src/modpack.json': JSON.stringify(profile, null, 2) + '\n' }, `release: modpack ${version}`);
      currentProfile = profile;
      pendingFiles.clear();
      mods = profile.mods.map(mod => ({ ...mod, pendingFile: null }));
      $('#current-pack').textContent = `Actual ${version} · MC ${minecraftVersion} · NeoForge ${loaderVersion}`;
      $('#pack-version').value = nextPatch(version);
      renderMods();
      setNotice(`Publicado. Los usuarios recibirán Minecraft ${minecraftVersion}, NeoForge ${loaderVersion} y ${nextMods.length} mods la próxima vez que pulsen Jugar.`, 'success');
    } finally {
      setBusy(publishPackButton, false);
    }
  }

  async function publishLauncher() {
    const version = $('#launcher-version').value.trim();
    if (!isNewer(version, launcherConfig.latest_launcher_version || packageJson.version)) throw new Error('La versión del launcher debe ser semántica y superior a la actual.');
    setBusy(publishLauncherButton, true, 'INICIANDO BUILD…');
    clearNotice();
    try {
      const dispatchedAt = Date.now();
      setNotice(`Solicitando a GitHub que compile y publique ${version}…`, 'busy');
      await api(`/repos/${OWNER}/${REPO}/actions/workflows/publish-launcher.yml/dispatches`, {
        method: 'POST', body: { ref: BRANCH, inputs: { version } }
      });
      setNotice(`Build iniciado para ${version}. Buscando la ejecución…`, 'busy');

      let run = null;
      for (let attempt = 0; attempt < 24 && !run; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const result = await api(`/repos/${OWNER}/${REPO}/actions/workflows/publish-launcher.yml/runs?branch=${BRANCH}&event=workflow_dispatch&per_page=5`);
        run = (result.workflow_runs || []).find(item => new Date(item.created_at).getTime() >= dispatchedAt - 15000) || null;
      }
      const actionsUrl = 'https://github.com/rodrixx1552/Custom-Launcher-main/actions/workflows/publish-launcher.yml';
      setNotice(run
        ? `GitHub ya está compilando ${version} (${run.status}). Sigue la ejecución en la pestaña de Actions; al terminar, el launcher actualizará el canal automáticamente.`
        : `El build ${version} fue enviado. GitHub todavía no muestra una ejecución; revisa la pestaña de Actions.`, 'success');
      $('#actions-link').href = run?.html_url || actionsUrl;
      $('#launcher-version').value = nextPatch(version);
    } finally {
      setBusy(publishLauncherButton, false);
    }
  }

  $('#login-button').addEventListener('click', connect);
  $('#github-token').addEventListener('keydown', event => { if (event.key === 'Enter') connect(); });
  $('#logout-button').addEventListener('click', () => {
    token = '';
    currentUser = null;
    loginPanel.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    $('#auth-status').classList.remove('on');
    $('#auth-label').textContent = 'Sesión cerrada';
    $('#logout-button').classList.add('hidden');
    clearNotice();
  });
  $('#mod-files').addEventListener('input', () => { publishPackButton.disabled = false; });
  publishPackButton.addEventListener('click', async () => {
    try { await publishPack(); }
    catch (error) { setNotice(error.message, 'error'); }
  });
  publishLauncherButton.addEventListener('click', async () => {
    try { await publishLauncher(); }
    catch (error) { setNotice(error.message, 'error'); }
  });
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
    $('#pack-panel').classList.toggle('hidden', button.dataset.tab !== 'pack');
    $('#launcher-panel').classList.toggle('hidden', button.dataset.tab !== 'launcher');
  }));
})();
