const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Groq = require('groq-sdk');

async function transcribeVoice(audioBuffer) {
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const tmpPath = path.join('./downloads', `transcribe_${Date.now()}.ogg`);
        fs.writeFileSync(tmpPath, audioBuffer);
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tmpPath),
            model: 'whisper-large-v3-turbo',
        });
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        return transcription.text;
    } catch (err) {
        console.error('Transcribe error:', err.message);
        return null;
    }
}

async function textToVoice({ sock, msg, from, text }) {
    const timestamp = Date.now();
    const mp3Path = path.join('./downloads', `voice_${timestamp}.mp3`);
    const oggPath = path.join('./downloads', `voice_${timestamp}.ogg`);

    try {
        // Step 1: Generate mp3 with 10 second timeout
        await Promise.race([
            new Promise((resolve, reject) => {
                const gtts = new gTTS(text, 'en');
                gtts.save(mp3Path, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TTS timeout')), 10000))
        ]);

        // Step 2: Convert to ogg
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -i "${mp3Path}" -c:a libopus -b:a 24k "${oggPath}" -y`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Step 3: Send
        await sock.sendMessage(from, {
            audio: fs.readFileSync(oggPath),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: msg });

        return true;

    } catch (err) {
        console.error('Voice error:', err.message);
        return false;
    } finally {
        try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch (_) {}
        try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch (_) {}
    }
}

module.exports = { textToVoice, transcribeVoice };
