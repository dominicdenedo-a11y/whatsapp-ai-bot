require("dotenv").config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');
const Groq = require('groq-sdk');
const { handleCommand } = require('./commands/router');
const nameCache = new Map(); // stores JID -> name
const { updateGroupContext, processImage, processVoice } = require('./commands/ai');
const { handleWelcome, handleAntiLink, getSettings } = require('./commands/groupfeatures');
const { transcribeVoice, textToVoice } = require('./commands/voice');


if (!fs.existsSync('./downloads')) fs.mkdirSync('./downloads');
if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');

async function getInput(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

async function processMessage(sock, msg) {
    console.log('PROCESS MSG:', msg.key.remoteJid, Object.keys(msg.message || {}));
    if (!msg.message || msg.key.fromMe) return;
    if (msg.key.remoteJid === "status@broadcast") return;

    const from = msg.key.remoteJid;
    // Save sender name to cache
    const senderId = msg.key.participant || msg.key.remoteJid;
    if (msg.pushName) nameCache.set(senderId.split('@')[0], msg.pushName);
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
        try {
            const msgText = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text || '';
            if (msgText && !msgText.startsWith('!')) {
                updateGroupContext(sock, from, `${pushName}: ${msgText}`).catch(() => {});
            }
        } catch(_) {}
    }

    // Show typing for ALL messages
    await sock.sendPresenceUpdate('composing', from);

    // Plain voice message -> 30sec typing then ignore
    if (isVoice) {
        await new Promise(r => setTimeout(r, 30000));
        await sock.sendPresenceUpdate('available', from);
        return;
    }

    // Reply to voice with !reply -> use unified brain
    if (isReplyToVoice && text.toLowerCase().trim() === '!reply') {
        try {
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
            // Create a fake msg with the quoted audio for processVoice
            const voiceMsg = { ...msg, message: quotedMsg, key: { ...msg.key, id: contextInfo.stanzaId } };
            await processVoice({ sock, msg: voiceMsg, from, pushName });
        } catch(e) {
            console.error('Voice reply error:', e.message);
            await sock.sendMessage(from, { text: '❌ Error: ' + e.message }, { quoted: msg });
        }
        await sock.sendPresenceUpdate('available', from);
        return;
    }

    console.log('TEXT EXTRACTED:', text);
    // Anti-link check FIRST before 30sec typing
    if (from.endsWith('@g.us') && text && !text.startsWith('!')) {
        try {
            const groupMeta = await sock.groupMetadata(from);
            const senderId = msg.key.participant || msg.key.remoteJid;
            const senderParticipant = groupMeta.participants.find(p => p.id === senderId);
            const senderAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';
            const botPhone = sock.user.id.split(':')[0].split('@')[0];
            // Try both phone number and LID format
            const botParticipant = groupMeta.participants.find(p => 
                p.id.includes(botPhone) || 
                p.phoneNumber?.includes(botPhone) ||
                p.id === sock.user.id.replace(/:.*@/, '@')
            );
            const botAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
            console.log('ANTILINK:', { senderAdmin, botAdmin, botPhone, botParticipant: botParticipant?.id });
            const deleted = await handleAntiLink(sock, msg, from, text, senderAdmin, botAdmin);
            if (deleted) return;
        } catch(_) {}
    }

    // Normal text with no command and no image -> 30sec typing then ignore
    if (!text.startsWith('!') && !msg.message?.imageMessage) {
        await new Promise(r => setTimeout(r, 30000));
        await sock.sendPresenceUpdate('available', from);
        return;
    }

    // Get mentioned person's name from context
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const mentionedNames = {};
    for (const jid of mentionedJids) {
        const num = jid.split('@')[0];
        mentionedNames[num] = pushName; // fallback to sender name
    }

    const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';



    try {
        await handleCommand({ sock, msg, from, text, pushName, isVoice, quotedText });
    } catch (err) {
        console.error('COMMAND ERROR:', err.message, err.stack);
        await sock.sendMessage(from, { text: '❌ Error: ' + err.message }, { quoted: msg });
    }
    await sock.sendPresenceUpdate('available', from);
}

let reconnectCount = 0;

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
            reconnectCount = 0;
            console.log('\n✅ Bot ONLINE! Send ! in WhatsApp!\n');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log('Close reason:', statusCode, lastDisconnect?.error?.message);
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('Logged out! Delete auth_info and restart.');
            } else if (state.creds.registered) {
                console.log('Reconnecting...');
                // Exponential backoff - wait longer each time
                const delay = Math.min(3000 * Math.pow(1.5, reconnectCount), 60000);
                reconnectCount++;
                console.log(`Waiting ${delay}ms before reconnect...`);
                setTimeout(startBot, delay);
            } else {
                console.log('Run npm start to try again.');
                process.exit(0);
            }
        }
    });

    // Auto welcome new members
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        console.log('GROUP EVENT:', action, participants);
        if (action === 'add') {
            await handleWelcome(sock, id, participants);
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
            processMessage(sock, msg).catch(e => console.error('Msg error:', e.message));
        }
    });
}

startBot();
