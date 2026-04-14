const { EdgeTTS } = require('@travisvn/edge-tts');
const { ipcMain } = require('electron');
const axios = require('axios');

/**
 * TTS MANAGER (Multi-Provider: Edge + TikTok)
 */
class TTSManager {
    constructor() {
        this.tts = new EdgeTTS();
    }

    init() {
        console.log('TTS: Neural Engine (Edge + TikTok) ready.');
        
        // Handle requests from the UI
        ipcMain.handle('tts:generate', async (event, { text, voice }) => {
            try {
                if (!text) return null;
                
                const selectedVoice = voice || 'es-ES-ElviraNeural';
                console.log(`TTS: Generating [${selectedVoice}]: "${text.substring(0, 30)}..."`);
                
                // --- TIKTOK PROVIDER ---
                if (selectedVoice.startsWith('tk_')) {
                    const tkId = selectedVoice.replace('tk_', '');
                    const response = await axios.post('https://tiktok-tts.weilnet.workers.dev/api/generation', {
                        text,
                        voice: tkId
                    });
                    
                    const result = response.data;
                    if (result.success && result.data) {
                        return result.data; // TikTok API already returns base64
                    } else {
                        throw new Error(result.error || 'TikTok TTS failed');
                    }
                }

                // --- EDGE PROVIDER ---
                const tts = new EdgeTTS(text, selectedVoice, {
                    rate: '+0%',
                    pitch: '+0Hz',
                    volume: '+0%'
                });

                const result = await tts.synthesize();
                const arrayBuffer = await result.audio.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return buffer.toString('base64');
            } catch (error) {
                console.error('TTS Error:', error.message);
                return null;
            }
        });
    }
}

module.exports = new TTSManager();
