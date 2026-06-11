async function showMenu({ sock, msg, from, pushName }) {
    const menu = `
╔╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╗
║░░░░░░░░░░░░░░░░░░░░░░░║
║  🤖 *ᴇꜱᴘɪʀɪᴛᴏ ʙᴏᴛ*  ║
║░░░░░░░░░░░░░░░░░░░░░░░║
╚╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╝

🌟 *ʜᴇʏ ${pushName}!* ᴡᴇʟᴄᴏᴍᴇ ʙᴀᴄᴋ 👋

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
🧠 *ᴀɪ ᴄʜᴀᴛ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ */ai <question>* — Chat with AI
┃ */ask <anything>* — Ask anything

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
📥 *ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ */ <video URL>* — Paste link after /
┃ */dl <URL>* — Download video
┃ _YouTube • TikTok • Instagram • Twitter_

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
🖼️ *ɪᴍᴀɢᴇ ᴀɴᴀʟʏꜱɪꜱ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ _Just send any image!_
┃ read • translate • food
┃ plant • math • code • meme

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
🛠️ *ᴜᴛɪʟɪᴛɪᴇꜱ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ */translate* • */calc* • */define*
┃ */summarize* • */code* • */fix*
┃ */explain* • */recipe* • */workout*

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
🎉 *ꜰᴜɴ & ɢᴀᴍᴇꜱ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ */joke* • */fact* • */quote*
┃ */roast* • */compliment* • */riddle*
┃ */story* • */poem* • */rap* • */meme*
┃ */dare* • */truth* • */trivia*
┃ */horoscope <sign>*

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
📲 *ꜱᴏᴄɪᴀʟ ᴍᴇᴅɪᴀ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ 📧 dominicdenedo@gmail.com

╔╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╗
║  ⚡ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ*     ║
║  🤖 ᴇꜱᴘɪʀɪᴛᴏ ʙᴏᴛ    ║
╚╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╩╝`;

    await sock.sendMessage(from, { text: menu }, { quoted: msg });
}

module.exports = { showMenu };
