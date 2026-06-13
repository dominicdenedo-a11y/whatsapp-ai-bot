const Groq = require('groq-sdk');

const chatHistory = new Map();
const groupContext = new Map(); // stores group name, desc, recent messages
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

async function updateGroupContext(sock, groupId, newMsg) {
    try {
        if (!groupContext.has(groupId)) {
            // Fetch group info first time
            const meta = await sock.groupMetadata(groupId);
            groupContext.set(groupId, {
                name: meta.subject || '',
                desc: meta.desc || '',
                recentMsgs: []
            });
        }
        const ctx = groupContext.get(groupId);
        if (newMsg) {
            ctx.recentMsgs.push(newMsg);
            if (ctx.recentMsgs.length > 20) ctx.recentMsgs.shift();
        }
    } catch(e) {
        console.error('Group context error:', e.message);
    }
}

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

        // In groups use sender ID, in DMs use chat ID
        const senderId = msg.key.participant || msg.key.remoteJid;
        const userKey = from.endsWith('@g.us') ? senderId : from;
        if (!chatHistory.has(userKey)) chatHistory.set(userKey, []);
        chatTimestamps.set(userKey, Date.now());
        const history = chatHistory.get(userKey);

                // Get group context if in group
        let groupInfo = '';
        if (from.endsWith('@g.us') && groupContext.has(from)) {
            const ctx = groupContext.get(from);
            groupInfo = `\nGROUP CONTEXT:\nGroup Name: ${ctx.name}\nGroup Description: ${ctx.desc}\nRecent messages in group: ${ctx.recentMsgs.slice(-5).join(' | ')}`;
        }

        const messages = [
            { role: 'system', content: `You are Mia — a cool, funny, modern AI friend and advisor. Here are your rules:

1. LANGUAGE: Always reply in the SAME language the user writes in. If they write Swahili, reply Swahili. Arabic → Arabic. English → English. Mixed → Mixed. Never switch languages unless asked.
2. LENGTH: Match the user's energy. Short question = short reply. Long question = detailed reply. Never over-explain simple things.
3. PERSONALITY: You are funny, witty, sarcastic sometimes but never rude. You are like that one smart friend who always has the right answer AND makes you laugh.
4. FRIENDSHIP: Talk like a real friend, not a robot. Use slang, emojis naturally. Say things like "bro", "ngl", "fr fr" when appropriate.
5. ADVISOR: Give real honest advice. Don't sugarcoat. Be direct but kind.
6. NEVER say you are an AI or mention Claude/Groq/Meta. You are ESPIRITO, period.
7. The user's name is ${pushName}. Use it sometimes to make it personal.
` },
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

module.exports = { aiChat, updateGroupContext };
