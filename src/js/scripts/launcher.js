// Logic for launching Minecraft
const settings = window.electronAPI.getSettings();

const btnLaunch = document.getElementById('btnLaunch');

btnLaunch?.addEventListener('click', (e) => { 
    let nick = document.getElementById('user-name-text')?.innerText || "Player";
    let version = settings.client.default_version;

    // Regex for nickname (only alphanumeric and underscores, 3-16 chars)
    const nickRegex = /^[a-zA-Z0-9_]{3,16}$/;
    if (!nickRegex.test(nick)) {
        console.error('Invalid Nickname');
        // We could show a toast or alert here
        return;
    }

    btnLaunch.classList.add('disabled');
    btnLaunch.innerHTML = 'Launching...';

    window.electronAPI.launchGame({ nick, version });
});

// Listen for progress if needed
// window.electronAPI.onLaunchProgress((progress) => { ... });