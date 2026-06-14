const Groq = require('groq-sdk');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const chatHistory = new Map();
const chatTimestamps = new Map();
const groupContext = new Map();

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

// Clear group context every 6 hours
setInterval(() => {
    for (const [key, ctx] of groupContext.entries()) {
        ctx.recentMsgs = ctx.recentMsgs.slice(-10);
    }
}, 6 * 60 * 60 * 1000);

async function updateGroupContext(sock, groupId, newMsg) {
    try {
        if (!groupContext.has(groupId)) {
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

function getUserKey(msg, from) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    // In groups: use groupID + senderID so history is separate per group
    return from.endsWith('@g.us') ? `${from}:${senderId}` : from;
}

function getHistory(userKey) {
    if (!chatHistory.has(userKey)) chatHistory.set(userKey, []);
    chatTimestamps.set(userKey, Date.now());
    return chatHistory.get(userKey);
}

function getSystemPrompt(pushName, groupInfo) {
    return `You are Mia — a friendly, helpful and funny WhatsApp AI bot. Follow these rules:

1. LANGUAGE: ALWAYS reply in the EXACT same language the user writes in. Swahili → Swahili. Arabic → Arabic. English → English. Mixed → Mixed.
2. LENGTH: Short question = short reply. Detailed question = detailed reply.
3. PERSONALITY: Warm, friendly and funny. Simple humor everyone understands.
4. MEMORY: Remember everything in this conversation — text, images, voice messages. Use context naturally.
5. You are MIA — created by El-espirito. NEVER mention Claude/Groq/Meta/AI. If asked who made you, say El-espirito made you.
6. The user's name is ${pushName}.
${groupInfo ? '7. GROUP CONTEXT: ' + groupInfo : ''}

YOUR COMMANDS (teach users when they ask):
💬 AI CHAT: Just type !anything to chat with me
📥 DOWNLOAD: Send !<video link> — supports YouTube, TikTok, Instagram, Twitter
🖼️ IMAGE: Send image with !caption (e.g. !food, !read, !translate, !meme)
🎙️ VOICE: Reply to voice message with !reply
🎵 APK: !apk spotify, !apk netflix, !apk youtube etc
🎉 FUN: !joke !fact !quote !roast !story !poem !rap !dare !truth !trivia
🛠️ UTILS: !translate !calc !define !summarize !code !explain !recipe !workout
👥 GROUPS (admin only): !kick !add !promote !demote !mute !unmute !tagall !groupinfo
📋 MENU: !menu or !help`;
}

async function processText({ sock, msg, from, query, pushName }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return;

    await sock.sendPresenceUpdate('composing', from);
    await sock.sendMessage(from, { react: { text: '🤔', key: msg.key } });

    try {
        const groq = new Groq({ apiKey });
        const userKey = getUserKey(msg, from);
        const history = getHistory(userKey);

        let groupInfo = '';
        if (from.endsWith('@g.us') && groupContext.has(from)) {
            const ctx = groupContext.get(from);
            groupInfo = `Group: ${ctx.name}. Desc: ${ctx.desc}. Recent: ${ctx.recentMsgs.slice(-3).join(' | ')}`;
        }

        const messages = [
            { role: 'system', content: getSystemPrompt(pushName, groupInfo) },
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

async function processImage({ sock, msg, from, caption, pushName }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return;

    await sock.sendMessage(from, { react: { text: '👀', key: msg.key } });
    await sock.sendPresenceUpdate('composing', from);

    try {
        const imageBuffer = await downloadMediaMessage(msg, 'buffer', {});
        const base64Image = imageBuffer.toString('base64');
        const mimeType = msg.message?.imageMessage?.mimetype || 'image/jpeg';

        const groq = new Groq({ apiKey });
        const userKey = getUserKey(msg, from);
        const history = getHistory(userKey);

        const prompt = caption ?
            `The user sent an image with this caption: "${caption}". Analyze the image and respond to their caption.` :
            'Analyze this image in detail. Describe what you see naturally like a friend would.';

        const response = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                { role: 'system', content: getSystemPrompt(pushName, '') },
                ...history,
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

        // Save to history as text description
        history.push({ role: 'user', content: `[User sent an image${caption ? ` with caption: "${caption}"` : ''}]` });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) history.splice(0, 2);
        chatHistory.set(userKey, history);

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(from, { text: reply }, { quoted: msg });

    } catch (err) {
        console.error('Image error:', err.message);
        await sock.sendMessage(from, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('available', from);
}

async function processVoice({ sock, msg, from, pushName }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return;

    const { transcribeVoice, textToVoice } = require('./voice');

    await sock.sendMessage(from, { react: { text: '🎙️', key: msg.key } });
    await sock.sendPresenceUpdate('composing', from);

    try {
        const audioBuffer = await downloadMediaMessage(msg, 'buffer', {});
        const transcribed = await transcribeVoice(audioBuffer);

        if (!transcribed) {
            await sock.sendMessage(from, { text: '❌ Could not understand the voice message.' }, { quoted: msg });
            return;
        }

        const userKey = getUserKey(msg, from);
        const history = getHistory(userKey);

        let groupInfo = '';
        if (from.endsWith('@g.us') && groupContext.has(from)) {
            const ctx = groupContext.get(from);
            groupInfo = `Group: ${ctx.name}. Desc: ${ctx.desc}.`;
        }

        const groq = new Groq({ apiKey });
        const messages = [
            { role: 'system', content: getSystemPrompt(pushName, groupInfo) },
            ...history,
            { role: 'user', content: transcribed }
        ];

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages,
            max_tokens: 200,
        });

        const reply = response.choices[0].message.content;

        history.push({ role: 'user', content: `[Voice message]: ${transcribed}` });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) history.splice(0, 2);
        chatHistory.set(userKey, history);

        const sent = await textToVoice({ sock, msg, from, text: reply });
        if (!sent) {
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        }

    } catch (err) {
        console.error('Voice error:', err.message);
        await sock.sendMessage(from, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('available', from);
}

// Keep aiChat for backward compatibility with router.js
async function aiChat({ sock, msg, from, query, pushName }) {
    await processText({ sock, msg, from, query, pushName });
}

module.exports = { aiChat, processText, processImage, processVoice, updateGroupContext };
