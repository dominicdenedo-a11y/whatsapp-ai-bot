const { aiChat } = require('./ai');
const { downloadVideo } = require('./download');
const { analyzeImage } = require('./image');
const { handleFun } = require('./fun');
const { handleGroup } = require('./group');
const { handleApk } = require('./apk');
const { textToVoice } = require('./voice');
const { showMenu } = require('./help');

const URL_REGEX = /https?:\/\/[^\s]*/i;

async function handleCommand({ sock, msg, from, text, pushName, isVoice = false, quotedText = '' }) {
    // Helper to get clean name from JID
    const getMentionName = (jid) => {
        const num = jid?.split('@')[0] || jid;
        return num.length > 10 ? num.slice(-6) : num;
    };
    const rawText = text.trim();

    if (msg.message?.imageMessage) {
        if (!rawText || !rawText.startsWith('!')) return;
        await analyzeImage({ sock, msg, from, text: rawText, pushName });
        return;
    }

    if (!rawText.startsWith('!')) return;

    const input = rawText.slice(1).trim();
    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    if (!cmd || cmd === 'help' || cmd === 'menu') {
        await showMenu({ sock, msg, from, pushName });
        return;
    }

    // Only download if the command IS a URL (no other command before it)
    const urlMatch = rawText.match(URL_REGEX);
    const isDownloadCmd = ['dl', 'download', 'video'].includes(cmd);
    if (urlMatch && !isDownloadCmd && cmd === urlMatch[0].replace('https://', '').replace('http://', '').split('/')[0]) {
        await downloadVideo({ sock, msg, from, url: urlMatch[0], pushName });
        return;
    }
    if (urlMatch && (rawText.slice(1).trim() === urlMatch[0] || rawText.slice(1).trim().startsWith(urlMatch[0])) && !isDownloadCmd && !['ai','ask','chat','translate','calc','define','summarize','code','fix','explain','recipe','workout'].includes(cmd)) {
        await downloadVideo({ sock, msg, from, url: urlMatch[0], pushName });
        return;
    }

    switch (cmd) {
        case 'ai':
        case 'ask':
        case 'chat':
            await aiChat({ sock, msg, from, query: args || 'Hello!', pushName });
            break;

        case 'dl':
        case 'download':
        case 'video': {
            const url = args.match(URL_REGEX)?.[0] || args;
            if (!url) {
                await sock.sendMessage(from, { text: '❌ Usage: /dl <video URL>' }, { quoted: msg });
            } else {
                await downloadVideo({ sock, msg, from, url, pushName });
            }
            break;
        }

        case 'apk':
            await handleApk({ sock, msg, from, args, pushName });
            break;

        case 'kick':
        case 'add':
        case 'promote':
        case 'demote':
        case 'mute':
        case 'unmute':
        case 'delete':
        case 'tagall':
        case 'groupinfo':
            await handleGroup({ sock, msg, from, cmd, args, pushName });
            break;

        case 'joke':
        case 'fact':
        case 'quote':
        case 'roast':
        case 'compliment':
        case 'riddle':
        case 'story':
        case 'poem':
        case 'rap':
        case 'meme':
        case 'horoscope':
        case 'trivia':
        case 'dare':
        case 'truth':
            await handleFun({ sock, msg, from, cmd, args, pushName });
            break;

        case 'translate':
            await aiChat({ sock, msg, from, pushName, query: `Translate this text. Detect language and translate to English (if already English translate to Arabic): "${args}"` });
            break;
        case 'calc':
            await aiChat({ sock, msg, from, pushName, query: `Calculate and explain step by step: ${args}` });
            break;
        case 'define':
            await aiChat({ sock, msg, from, pushName, query: `Define "${args}" with examples and fun facts.` });
            break;
        case 'summarize':
            await aiChat({ sock, msg, from, pushName, query: `Summarize in 3-5 bullet points:\n${args}` });
            break;
        case 'code':
            await aiChat({ sock, msg, from, pushName, query: `Write clean commented code for: ${args}` });
            break;
        case 'fix':
        case 'fixcode':
            await aiChat({ sock, msg, from, pushName, query: `Fix bugs and explain this code:\n${args}` });
            break;
        case 'explain':
            await aiChat({ sock, msg, from, pushName, query: `Explain simply like I'm 12: ${args}` });
            break;
        case 'recipe':
            await aiChat({ sock, msg, from, pushName, query: `Give a detailed recipe for: ${args}` });
            break;
        case 'workout':
            await aiChat({ sock, msg, from, pushName, query: `Create a workout plan for: ${args}` });
            break;

        default: {
            const fullQuery = quotedText ? `Context (quoted message): "${quotedText}"

User says: ${input}` : input;
            await aiChat({ sock, msg, from, query: fullQuery, pushName });
            if (isVoice) await textToVoice({ sock, msg, from, text: input });
            break;
        }
    }
}

module.exports = { handleCommand };
