const Groq = require('groq-sdk');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function analyzeImage({ sock, msg, from, text, pushName }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        await sock.sendMessage(from, { text: 'Add GROQ_API_KEY to .env!' }, { quoted: msg });
        return;
    }
    await sock.sendMessage(from, { react: { text: '👀', key: msg.key } });
    await sock.sendPresenceUpdate('composing', from);
    try {
        const imageBuffer = await downloadMediaMessage(msg, 'buffer', {});
        const base64Image = imageBuffer.toString('base64');
        const mimeType = msg.message?.imageMessage?.mimetype || 'image/jpeg';
        const prompt = buildPrompt(text);

        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 1000,
        });

        const reply = response.choices[0].message.content;
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(from, { text: '🖼️ *Image Analysis*\n\n' + reply }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }
    await sock.sendPresenceUpdate('available', from);
}

function buildPrompt(caption) {
    const cap = (caption || '').toLowerCase().replace(/^\/\s*/, '');
    if (!cap || cap === 'analyze') return 'Analyze this image in detail. Describe everything you see.';
    if (cap.includes('text') || cap.includes('read')) return 'Extract all text from this image clearly.';
    if (cap.includes('translate')) return 'Extract all text and translate it to English.';
    if (cap.includes('food')) return 'Identify the food, estimate calories, and give the recipe.';
    if (cap.includes('plant')) return 'Identify this plant with its name and care tips.';
    if (cap.includes('math') || cap.includes('solve')) return 'Solve the math problem shown. Show all steps.';
    if (cap.includes('code') || cap.includes('fix')) return 'Read the code and fix any bugs. Explain what it does.';
    if (cap.includes('meme')) return 'Describe this meme and explain the humor.';
    return 'Look at this image and answer: ' + cap;
}

module.exports = { analyzeImage };
