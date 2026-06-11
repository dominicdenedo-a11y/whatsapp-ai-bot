const Groq = require('groq-sdk');

const chatHistory = new Map();
const chatTimestamps = new Map();

// Clear old chats every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, time] of chatTimestamps.entries()) {
        if (now - time > 24 * 60 * 60 * 1000) {
            chatHistory.delete(key);
            chatTimestamps.delete(key);
        }
    }
}, 60 * 60 * 1000);

async function aiChat({ sock, msg, from, query, pushName }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        await sock.sendMessage(from, { text: '⚠️ Add GROQ_API_KEY to .env file!' }, { quoted: msg });
        return;
    }

    await sock.sendPresenceUpdate('composing', from);
    await sock.sendMessage(from, { react: { text: '🤔', key: msg.key } });

    try {
        const groq = new Groq({ apiKey });

        const userKey = from;
        if (!chatHistory.has(userKey)) chatHistory.set(userKey, []);
        chatTimestamps.set(userKey, Date.now());
        const history = chatHistory.get(userKey);

        const messages = [
            { role: 'system', content: `You are a helpful, witty Espirito. Keep responses concise and conversational. Use emojis naturally. The user's name is ${pushName}.` },
            ...history,
            { role: 'user', content: query }
        ];

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages,
            max_tokens: 1000,
        });

        const reply = response.choices[0].message.content;

        history.push({ role: 'user', content: query });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) history.splice(0, 2);
        chatHistory.set(userKey, history);

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(from, { text: reply }, { quoted: msg });

    } catch (err) {
        console.error('AI error:', err.message);
        await sock.sendMessage(from, { text: `❌ AI error: ${err.message}` }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('available', from);
}

module.exports = { aiChat };
