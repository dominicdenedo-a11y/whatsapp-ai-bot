require("dotenv").config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');
const Groq = require('groq-sdk');
const { handleCommand } = require('./commands/router');
const { updateGroupContext } = require('./commands/ai');
const { transcribeVoice, textToVoice } = require('./commands/voice');

if (!fs.existsSync('./downloads')) fs.mkdirSync('./downloads');
if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');

async function getInput(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

async function processMessage(sock, msg) {
    if (!msg.message || msg.key.fromMe) return;
    if (msg.key.remoteJid === "status@broadcast") return;

    const from = msg.key.remoteJid;
    const pushName = msg.pushName || 'User';
    const isVoice = !!msg.message?.audioMessage;
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isReplyToVoice = !!quotedMsg?.audioMessage;

    const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption || '';

    // Silently collect group messages for context
    if (from.endsWith('@g.us')) {
        const msgText = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption || '';
        if (msgText && !msgText.startsWith('!')) {
            updateGroupContext(sock, from, `${pushName}: ${msgText}`).catch(() => {});
        }
    }

    // Show typing for ALL messages
    await sock.sendPresenceUpdate('composing', from);

    // Plain voice message -> 30sec typing then ignore
    if (isVoice) {
        await new Promise(r => setTimeout(r, 30000));
        await sock.sendPresenceUpdate('available', from);
        return;
    }

    // Reply to voice with /reply -> transcribe and reply with voice
    if (isReplyToVoice && text.toLowerCase().trim() === '/reply') {
        try {
            await sock.sendMessage(from, { react: { text: '🎙️', key: msg.key } });
            const contextInfo = msg.message.extendedTextMessage.contextInfo;
            const quotedKey = {
                key: {
                    remoteJid: from,
                    fromMe: contextInfo.participant === sock.user.id.replace(/:.*@/, '@'),
                    id: contextInfo.stanzaId,
                    participant: contextInfo.participant || from
                },
                message: quotedMsg
            };
            const audioBuffer = await downloadMediaMessage(quotedKey, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
            const transcribed = await transcribeVoice(audioBuffer);
            if (transcribed) {
                const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
                const response = await groq.chat.completions.create({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: `You are Espirito, a helpful witty assistant. Keep responses short. User's name is ${pushName}.` },
                        { role: 'user', content: transcribed }
                    ],
                    max_tokens: 200,
                });
                const reply = response.choices[0].message.content;
                const sent = await textToVoice({ sock, msg, from, text: reply });
                if (!sent) {
                    await sock.sendMessage(from, { text: reply }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, { text: '❌ Could not transcribe the voice message.' }, { quoted: msg });
            }
        } catch(e) {
            console.error('Voice reply error:', e.message);
            await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
        }
        await sock.sendPresenceUpdate('available', from);
        return;
    }

    // Normal text with no command and no image -> 30sec typing then ignore
    if (!text.startsWith('!') && !msg.message?.imageMessage) {
        await new Promise(r => setTimeout(r, 30000));
        await sock.sendPresenceUpdate('available', from);
        return;
    }

    try {
        await handleCommand({ sock, msg, from, text, pushName, isVoice, quotedText });
    } catch (err) {
        await sock.sendMessage(from, { text: '❌ Error!' }, { quoted: msg });
    }
    await sock.sendPresenceUpdate('available', from);
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join('.')}, latest: ${isLatest}`);

    let phone = null;
    if (!state.creds.registered) {
        phone = await getInput('\nEnter number with country code (e.g. 2519xxxxxxxx):\n');
        console.log('Connecting to WhatsApp...');
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.windows('Chrome'),
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 20000,
        msgRetryCounterCache: new (require('node-cache'))(),
        retryRequestDelayMs: 250,
        shouldSyncHistoryMessage: () => false,
    });

    sock.ev.on('creds.update', saveCreds);

    let codeDone = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        console.log('Status:', connection);

        if (connection === 'connecting' && phone && !codeDone) {
            codeDone = true;
            await new Promise(r => setTimeout(r, 1000));
            try {
                const code = await sock.requestPairingCode(phone);
                const fmt = code.match(/.{1,4}/g).join('-');
                console.log(`\n🔑 CODE: ${fmt}`);
                console.log('WhatsApp > 3 dots > Linked Devices > Link a Device > Link with phone number');
                console.log(`Enter: ${fmt}\n`);
            } catch (e) {
                console.log('❌ Code error:', e.message);
                process.exit(1);
            }
        }

        if (connection === 'open') {
            console.log('\n✅ Bot ONLINE! Send ! in WhatsApp!\n');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log('Close reason:', statusCode, lastDisconnect?.error?.message);
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('Logged out! Delete auth_info and restart.');
            } else if (state.creds.registered) {
                console.log('Reconnecting...');
                setTimeout(startBot, 3000);
            } else {
                console.log('Run npm start to try again.');
                process.exit(0);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages: allMsgs, type }) => {
        // Auto view status
        for (const s of allMsgs) {
            if (s.key.remoteJid === 'status@broadcast') {
                await new Promise(r => setTimeout(r, 1000));
                await sock.readMessages([s.key]);
            }
        }

        if (type !== "notify") return;

        // Process each message independently - non blocking
        for (const msg of allMsgs) {
            console.log("MSG RECEIVED:", msg.key.remoteJid); processMessage(sock, msg).catch(e => console.error('Msg error:', e.message));
        }
    });
}

startBot();
