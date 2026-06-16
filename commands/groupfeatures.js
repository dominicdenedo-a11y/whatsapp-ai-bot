const groupSettings = new Map();
const settingsFile = './downloads/groupsettings.json';

// Load saved settings
try {
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    for (const [key, value] of Object.entries(saved)) {
        groupSettings.set(key, value);
    }
    console.log('Group settings loaded!');
} catch(_) {}

// Save settings every 5 minutes
setInterval(() => {
    try {
        const obj = {};
        for (const [key, value] of groupSettings.entries()) {
            obj[key] = value;
        }
        fs.writeFileSync(settingsFile, JSON.stringify(obj));
    } catch(_) {}
}, 5 * 60 * 1000);

function saveSettings() {
    try {
        const obj = {};
        for (const [key, value] of groupSettings.entries()) {
            obj[key] = value;
        }
        fs.writeFileSync(settingsFile, JSON.stringify(obj));
    } catch(_) {}
}

function getSettings(groupId) {
    if (!groupSettings.has(groupId)) {
        groupSettings.set(groupId, {
            antilink: false,
            welcome: false,
            welcomeMsg: '👋 Welcome to the group, @user! 🎉'
        });
    }
    return groupSettings.get(groupId);
}

async function handleWelcome(sock, groupId, participants) {
    const settings = getSettings(groupId);
    if (!settings.welcome) return;

    try {
        for (const p of participants) {
            let jid = '';
            if (typeof p === 'string') {
                jid = p;
            } else if (p.phoneNumber) {
                jid = p.phoneNumber;
            } else if (p.id) {
                jid = p.id;
            }
            if (!jid) continue;
            const num = jid.split('@')[0];
            const mentions = [jid];
            const msgText = settings.welcomeMsg.replace('@user', `@${num}`);
            await sock.sendMessage(groupId, { text: msgText, mentions });
        }
    } catch(e) {
        console.error('Welcome error:', e.message);
    }
}

async function handleAntiLink(sock, msg, from, text, senderAdmin, botAdmin) {
    const settings = getSettings(from);
    if (!settings.antilink) return false;
    if (senderAdmin) return false;
    if (!botAdmin) return false;

    const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/i;
    console.log('ANTILINK FN:', { antilink: settings.antilink, senderAdmin, botAdmin, hasUrl: urlRegex.test(text) });
    if (!urlRegex.test(text)) return false;

    try {
        await sock.sendMessage(from, {
            delete: {
                remoteJid: from,
                fromMe: false,
                id: msg.key.id,
                participant: msg.key.participant
            }
        });
        await sock.sendMessage(from, {
            text: `⚠️ @${(msg.key.participant || '').split('@')[0]} Links are not allowed!`,
            mentions: [msg.key.participant || msg.key.remoteJid]
        });
        return true;
    } catch(e) {
        console.error('Anti-link error:', e.message);
        return false;
    }
}

async function handleGroupFeatures({ sock, msg, from, cmd, args, pushName }) {
    const isGroup = from.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(from, { text: '❌ This command only works in groups!' }, { quoted: msg });
        return;
    }

    const groupMetadata = await sock.groupMetadata(from);
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderParticipant = groupMetadata.participants.find(p => p.id === senderId);
    const senderAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';

    if (!senderAdmin) {
        await sock.sendMessage(from, { text: '❌ Only admins can use this command!' }, { quoted: msg });
        return;
    }

    const settings = getSettings(from);

    switch(cmd) {
        case 'antilink': {
            if (args === 'on') {
                settings.antilink = true;
                saveSettings();
                await sock.sendMessage(from, { text: '🔒 Anti-link is now ON!' }, { quoted: msg });
            } else if (args === 'off') {
                settings.antilink = false;
                saveSettings();
                await sock.sendMessage(from, { text: '🔓 Anti-link is now OFF!' }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text: `Anti-link: *${settings.antilink ? 'ON' : 'OFF'}*` }, { quoted: msg });
            }
            break;
        }

        case 'welcome': {
            if (args === 'on') {
                settings.welcome = true;
                saveSettings();
                await sock.sendMessage(from, { text: '👋 Welcome messages ON!' }, { quoted: msg });
            } else if (args === 'off') {
                settings.welcome = false;
                saveSettings();
                await sock.sendMessage(from, { text: '👋 Welcome messages OFF!' }, { quoted: msg });
            } else if (args.startsWith('set ')) {
                settings.welcomeMsg = args.slice(4);
                await sock.sendMessage(from, { text: `✅ Welcome message updated!` }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text: `Welcome: *${settings.welcome ? 'ON' : 'OFF'}*\nMessage: ${settings.welcomeMsg}\n\n!welcome on/off\n!welcome set Your message @user` }, { quoted: msg });
            }
            break;
        }

        case 'poll': {
            if (!args) {
                await sock.sendMessage(from, { text: '❌ Usage: !poll Question, Option1, Option2' }, { quoted: msg });
                return;
            }
            const parts = args.split(',').map(p => p.trim());
            if (parts.length < 3) {
                await sock.sendMessage(from, { text: '❌ Need at least 2 options!\n!poll Question, A, B, C' }, { quoted: msg });
                return;
            }
            const question = parts[0];
            const options = parts.slice(1);
            const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
            const pollText = `📊 *POLL*\n\n*${question}*\n\n` +
                options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n') +
                '\n\n_React with the number to vote!_';
            await sock.sendMessage(from, { text: pollText }, { quoted: msg });
            break;
        }
    }
}

module.exports = { handleGroupFeatures, handleWelcome, handleAntiLink, getSettings };
