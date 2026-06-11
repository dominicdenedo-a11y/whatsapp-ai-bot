const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function textToVoice({ sock, msg, from, text }) {
    const timestamp = Date.now();
    const mp3Path = path.join('./downloads', `voice_${timestamp}.mp3`);
    const oggPath = path.join('./downloads', `voice_${timestamp}.ogg`);

    try {
        // Step 1: Generate mp3
        await new Promise((resolve, reject) => {
            const gtts = new gTTS(text, 'en');
            gtts.save(mp3Path, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Step 2: Convert to ogg opus with quoted paths
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i "${mp3Path}" -c:a libopus -b:a 24k "${oggPath}" -y`, (err, stdout, stderr) => {
                if (err) {
                    console.error('ffmpeg error:', stderr);
                    reject(err);
                } else resolve();
            });
        });

        // Step 3: Send as voice note
        await sock.sendMessage(from, {
            audio: fs.readFileSync(oggPath),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: msg });

        console.log('Voice sent!');

    } catch (err) {
        console.error('Voice error:', err.message);
    } finally {
        try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch (_) {}
        try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch (_) {}
    }
}

module.exports = { textToVoice };
