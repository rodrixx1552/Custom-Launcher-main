const DiscordRPC = require('discord-rpc');

let rpcConnected = false;
let rpcStartTimestamp = new Date();
const clientId = '1484949908518600824'; // LosPapusLover App ID
let rpc = null;
let reconnectInterval = null;

function createClient() {
    return new DiscordRPC.Client({ transport: 'ipc' });
}

async function setActivity(details, state) {
    if (!rpcConnected || !rpc) return;
    rpc.setActivity({
        details: details || '🏠 En el Menú Principal',
        state: state || 'LosPapusLover Launcher',
        startTimestamp: rpcStartTimestamp,
        largeImageKey: 'logo',
        largeImageText: 'LosPapusLover Launcher',
        instance: false,
    }).catch(err => console.error('Discord RPC Activity Error:', err));
}

async function tryConnect() {
    try {
        rpc = createClient();

        rpc.on('ready', () => {
            console.log('Discord RPC Ready - LosPapusLover');
            rpcConnected = true;
            rpcStartTimestamp = new Date();
            setActivity('🏠 En el Menú Principal', 'LosPapusLover Launcher');
            // Stop retrying once connected
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
        });

        rpc.on('disconnected', () => {
            rpcConnected = false;
            console.log('Discord RPC Disconnected — scheduling reconnect...');
            scheduleReconnect();
        });

        await rpc.login({ clientId });
    } catch (err) {
        console.log('Discord not detected or connection failed:', err.message);
        rpcConnected = false;
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectInterval) return; // Already scheduled
    console.log('Discord RPC: Will retry connection every 60s...');
    reconnectInterval = setInterval(async () => {
        if (rpcConnected) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            return;
        }
        console.log('Discord RPC: Retrying connection...');
        await tryConnect();
    }, 60000);
}

function init() {
    tryConnect();
}

module.exports = { init, setActivity };
