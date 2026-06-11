const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function textToVoice({ sock, msg, from, text }) {
    const mp3Path = path.join('./downloads', `voice_${Date.now()}.mp3`);
    const oggPath = mp3Path.replace('.mp3', '.ogg');

    try {
        // Step 1: Generate mp3
        await new Promise((resolve, reject) => {
            const gtts = new gTTS(text, 'en');
            gtts.save(mp3Path, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Step 2: Convert to ogg opus (WhatsApp voice format)
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i ${mp3Path} -c:a libopus -b:a 24k ${oggPath} -y`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Step 3: Send as voice note
        await sock.sendMessage(from, {
            audio: fs.readFileSync(oggPath),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: msg });

    } catch (err) {
        console.error('Voice error:', err.message);
    } finally {
        // Cleanup
        try { fs.unlinkSync(mp3Path); } catch (_) {}
        try { fs.unlinkSync(oggPath); } catch (_) {}
    }
}

module.exports = { textToVoice };
