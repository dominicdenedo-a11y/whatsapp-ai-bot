require("dotenv").config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');
const { handleCommand } = require('./commands/router');

if (!fs.existsSync('./downloads')) fs.mkdirSync('./downloads');
if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');

async function getInput(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
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
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.windows('Chrome'),
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 20000,
        msgRetryCounterCache: new (require('node-cache'))(),
        retryRequestDelayMs: 250,
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
            console.log('\n✅ Bot ONLINE! Send / in WhatsApp!\n');
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

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== "notify") return;
        for (const msg of messages) {
            
            if (!msg.message || msg.key.fromMe) continue;
            const from = msg.key.remoteJid;
            const pushName = msg.pushName || 'User';
            const text =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption || '';
            if (!text.startsWith('/') && !msg.message?.imageMessage && !msg.message?.viewOnceMessage && !msg.message?.viewOnceMessageV2 && !msg.message?.viewOnceMessageV2Extension) continue;
            try {
                await handleCommand({ sock, msg, from, text, pushName });
            } catch (err) {
                await sock.sendMessage(from, { text: '❌ Error!' }, { quoted: msg });
            }
        }
    });
}

startBot();
