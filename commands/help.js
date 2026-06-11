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
┃ _Send image with /caption_
┃ */read* • */translate* • */food*
┃ */plant* • */math* • */code* • */meme*

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
🛠️ *ᴜᴛɪʟɪᴛɪᴇꜱ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ */translate* • */calc* • */define*
┃ */summarize* • */code* • */fixcode*
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
👥 *ɢʀᴏᴜᴘ ᴄᴏᴍᴍᴀɴᴅꜱ*
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
┃ */kick @user* — Kick member
┃ */add <number>* — Add member
┃ */promote @user* — Make admin
┃ */demote @user* — Remove admin
┃ */mute* — Only admins can talk
┃ */unmute* — Everyone can talk
┃ */delete* — Reply to delete msg
┃ */tagall* — Mention everyone
┃ */groupinfo* — Show group info

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
