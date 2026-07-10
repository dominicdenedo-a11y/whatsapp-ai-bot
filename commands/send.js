async function handleSend({ sock, msg, from, args, pushName }) {
    try {
        const parts = args.trim().split(/\s+to\s+/i);
        if (parts.length < 2) {
            await sock.sendMessage(from, { 
                text: '❌ Usage: !send <message> to <phone_number> <times>\n\nExample: !send I love you to 255659401193 10' 
            }, { quoted: msg });
            return;
        }

        const message = parts[0].trim();
        const remaining = parts[1].trim().split(/\s+/);
        const phoneNumber = remaining[0];
        const times = parseInt(remaining[1]) || 1;

        if (!message) {
            await sock.sendMessage(from, { text: '❌ Message cannot be empty!' }, { quoted: msg });
            return;
        }

        if (!phoneNumber || phoneNumber.length < 9) {
            await sock.sendMessage(from, { text: '❌ Invalid phone number!' }, { quoted: msg });
            return;
        }

        if (isNaN(times) || times < 1 || times > 100) {
            await sock.sendMessage(from, { text: '❌ Times must be 1-100!' }, { quoted: msg });
            return;
        }

        const result = await sock.onWhatsApp(phoneNumber);
        if (!result || !result[0]?.exists) {
            await sock.sendMessage(from, { text: '❌ Number not found on WhatsApp' }, { quoted: msg });
            return;
        }
        const jid = result[0].jid;

        await sock.sendMessage(from, { react: { text: '📤', key: msg.key } });

        let successCount = 0;
        for (let i = 0; i < times; i++) {
            try {
                await sock.sendMessage(jid, { text: message });
                successCount++;
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error(`Failed message ${i + 1}:`, e.message);
            }
        }

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(from, { text: `✅ Sent "${message}" ${successCount}/${times} times to ${phoneNumber}` }, { quoted: msg });

    } catch (err) {
        console.error('Send error:', err.message);
        await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
}

module.exports = { handleSend };