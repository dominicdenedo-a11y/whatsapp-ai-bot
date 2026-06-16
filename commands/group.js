function getName(jid, nameCache) {
    const num = jid?.split('@')[0] || '';
    return (nameCache && nameCache.get(num)) || num.slice(-8);
}

async function handleGroup({ sock, msg, from, cmd, args, pushName, nameCache = new Map() }) {
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
        await sock.sendMessage(from, { text: '❌ You must be an admin to use this command!' }, { quoted: msg });
        return;
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                      msg.message?.extendedTextMessage?.contextInfo?.participant;

    switch (cmd) {
        case 'kick': {
            if (!mentioned) {
                await sock.sendMessage(from, { text: '❌ Tag someone to kick! Example: !kick @user' }, { quoted: msg });
                return;
            }
            try {
                await sock.groupParticipantsUpdate(from, [mentioned], 'remove');
                await sock.sendMessage(from, { text: `✅ *${getName(mentioned, nameCache)}* has been kicked!` }, { quoted: msg });
            } catch(e) {
                await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
            }
            break;
        }

        case 'add': {
            if (!args) {
                await sock.sendMessage(from, { text: '❌ Provide a number! Example: !add 255xxxxxxxxx' }, { quoted: msg });
                return;
            }
            const number = args.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            try {
                const res = await sock.groupParticipantsUpdate(from, [number], 'add');
                const status = res?.[0]?.status;
                if (status === '200' || status === 200) {
                    await sock.sendMessage(from, { text: `✅ Added *${args}* successfully!` }, { quoted: msg });
                } else if (status === '403') {
                    await sock.sendMessage(from, { text: `❌ Their privacy settings block group adds.` }, { quoted: msg });
                } else if (status === '408') {
                    await sock.sendMessage(from, { text: `❌ Number not on WhatsApp.` }, { quoted: msg });
                } else if (status === '409') {
                    await sock.sendMessage(from, { text: `❌ Already in the group.` }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: `❌ Failed. Status: ${status}` }, { quoted: msg });
                }
            } catch(e) {
                await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
            }
            break;
        }

        case 'promote': {
            if (!mentioned) {
                await sock.sendMessage(from, { text: '❌ Tag someone to promote!' }, { quoted: msg });
                return;
            }
            try {
                await sock.groupParticipantsUpdate(from, [mentioned], 'promote');
                await sock.sendMessage(from, { text: `⬆️ *${getName(mentioned, nameCache)}* is now an admin!` }, { quoted: msg });
            } catch(e) {
                await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
            }
            break;
        }

        case 'demote': {
            if (!mentioned) {
                await sock.sendMessage(from, { text: '❌ Tag someone to demote!' }, { quoted: msg });
                return;
            }
            try {
                await sock.groupParticipantsUpdate(from, [mentioned], 'demote');
                await sock.sendMessage(from, { text: `⬇️ *${getName(mentioned, nameCache)}* is no longer an admin!` }, { quoted: msg });
            } catch(e) {
                await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
            }
            break;
        }

        case 'mute': {
            try {
                await sock.groupSettingUpdate(from, 'announcement');
                await sock.sendMessage(from, { text: '🔇 Group muted!' }, { quoted: msg });
            } catch(e) {
                await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
            }
            break;
        }

        case 'unmute': {
            try {
                await sock.groupSettingUpdate(from, 'not_announcement');
                await sock.sendMessage(from, { text: '🔊 Group unmuted!' }, { quoted: msg });
            } catch(e) {
                await sock.sendMessage(from, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
            }
            break;
        }

        case 'delete': {
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quotedId = contextInfo?.stanzaId;
            const quotedParticipant = contextInfo?.participant;
            if (!quotedId) {
                await sock.sendMessage(from, { text: '❌ Reply to a message to delete it!' }, { quoted: msg });
                return;
            }
            try {
                const botPhone = sock.user.id.split(':')[0].split('@')[0];
                await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: quotedParticipant?.includes(botPhone) || false, id: quotedId, participant: quotedParticipant } });
                await sock.sendMessage(from, { text: '🗑️ Message deleted!' }, { quoted: msg });
            } catch(e) {
                await sock.sendMessage(from, { text: '❌ Could not delete: ' + e.message }, { quoted: msg });
            }
            break;
        }

        case 'tagall': {
            const participants = groupMetadata.participants;
            const mentions = participants.map(p => p.id);
            const text = `📢 *Tag All* (${participants.length} members)\n\n` + participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
            await sock.sendMessage(from, { text, mentions }, { quoted: msg });
            break;
        }

        case 'groupinfo': {
            const text = `📊 *Group Info*\n\n*Name:* ${groupMetadata.subject}\n*Members:* ${groupMetadata.participants.length}\n*Admins:* ${groupMetadata.participants.filter(p => p.admin).length}\n*Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}`;
            await sock.sendMessage(from, { text }, { quoted: msg });
            break;
        }

        default:
            break;
    }
}

module.exports = { handleGroup };
