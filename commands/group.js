async function handleGroup({ sock, msg, from, cmd, args, pushName }) {
    const isGroup = from.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(from, { text: '❌ This command only works in groups!' }, { quoted: msg });
        return;
    }

    const groupMetadata = await sock.groupMetadata(from);
    const botId = sock.user.id.replace(/:.*@/, '@');
    const senderId = msg.key.participant || msg.key.remoteJid;
    const botAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin;
    const senderAdmin = groupMetadata.participants.find(p => p.id === senderId)?.admin;

    if (!senderAdmin) {
        await sock.sendMessage(from, { text: '❌ You must be an admin to use this command!' }, { quoted: msg });
        return;
    }

    if (!botAdmin) {
        await sock.sendMessage(from, { text: '❌ Make me an admin first!' }, { quoted: msg });
        return;
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                      msg.message?.extendedTextMessage?.contextInfo?.participant;

    switch (cmd) {
        case 'kick': {
            if (!mentioned) {
                await sock.sendMessage(from, { text: '❌ Tag someone to kick! Example: /kick @user' }, { quoted: msg });
                return;
            }
            await sock.groupParticipantsUpdate(from, [mentioned], 'remove');
            await sock.sendMessage(from, { text: `✅ *${mentioned.split('@')[0]}* has been kicked!` }, { quoted: msg });
            break;
        }

        case 'add': {
            const number = args.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!args) {
                await sock.sendMessage(from, { text: '❌ Provide a number! Example: /add 255xxxxxxxxx' }, { quoted: msg });
                return;
            }
            await sock.groupParticipantsUpdate(from, [number], 'add');
            await sock.sendMessage(from, { text: `✅ Added *${args}* to the group!` }, { quoted: msg });
            break;
        }

        case 'promote': {
            if (!mentioned) {
                await sock.sendMessage(from, { text: '❌ Tag someone to promote! Example: /promote @user' }, { quoted: msg });
                return;
            }
            await sock.groupParticipantsUpdate(from, [mentioned], 'promote');
            await sock.sendMessage(from, { text: `⬆️ *${mentioned.split('@')[0]}* is now an admin!` }, { quoted: msg });
            break;
        }

        case 'demote': {
            if (!mentioned) {
                await sock.sendMessage(from, { text: '❌ Tag someone to demote! Example: /demote @user' }, { quoted: msg });
                return;
            }
            await sock.groupParticipantsUpdate(from, [mentioned], 'demote');
            await sock.sendMessage(from, { text: `⬇️ *${mentioned.split('@')[0]}* is no longer an admin!` }, { quoted: msg });
            break;
        }

        case 'mute': {
            await sock.groupSettingUpdate(from, 'announcement');
            await sock.sendMessage(from, { text: '🔇 Group muted! Only admins can send messages.' }, { quoted: msg });
            break;
        }

        case 'unmute': {
            await sock.groupSettingUpdate(from, 'not_announcement');
            await sock.sendMessage(from, { text: '🔊 Group unmuted! Everyone can send messages.' }, { quoted: msg });
            break;
        }

        case 'delete': {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            const participant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (!quoted) {
                await sock.sendMessage(from, { text: '❌ Reply to a message to delete it!' }, { quoted: msg });
                return;
            }
            await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: quoted, participant } });
            break;
        }

        case 'tagall': {
            const participants = groupMetadata.participants;
            const mentions = participants.map(p => p.id);
            const text = `📢 *Tag All*\n\n` + participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
            await sock.sendMessage(from, { text, mentions }, { quoted: msg });
            break;
        }

        case 'groupinfo': {
            const text = `📊 *Group Info*\n\n` +
                `*Name:* ${groupMetadata.subject}\n` +
                `*Members:* ${groupMetadata.participants.length}\n` +
                `*Admins:* ${groupMetadata.participants.filter(p => p.admin).length}\n` +
                `*Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}`;
            await sock.sendMessage(from, { text }, { quoted: msg });
            break;
        }

        default:
            break;
    }
}

module.exports = { handleGroup };
