async function showMenu({ sock, msg, from, pushName }) {
    const menu = `╔══════════════════════╗
║  🤖 *WhatsApp AI Bot*  ║
╚══════════════════════╝

Hey ${pushName}! 👋

━━━━━━━━━━━━━━━━━━━━
🧠 *AI CHAT*
━━━━━━━━━━━━━━━━━━━━
*/ai <question>* — Chat with AI
*/ask <anything>* — Ask anything

━━━━━━━━━━━━━━━━━━━━
📥 *VIDEO DOWNLOAD*
━━━━━━━━━━━━━━━━━━━━
*/ <video URL>* — Paste link after /
*/dl <URL>* — Download video
_YouTube, TikTok, Instagram, Twitter_

━━━━━━━━━━━━━━━━━━━━
🖼️ *IMAGE ANALYSIS*
━━━━━━━━━━━━━━━━━━━━
_Just send any image!_
Add caption: read text, translate,
food, plant, math, code, meme

━━━━━━━━━━━━━━━━━━━━
🛠️ *UTILITIES*
━━━━━━━━━━━━━━━━━━━━
*/translate <text>*
*/calc <expression>*
*/define <word>*
*/summarize <text>*
*/code <task>*
*/fix <code>*
*/explain <topic>*
*/recipe <dish>*
*/workout <goal>*

━━━━━━━━━━━━━━━━━━━━
🎉 *FUN*
━━━━━━━━━━━━━━━━━━━━
*/joke* */fact* */quote*
*/roast <name>* */compliment <name>*
*/riddle* */story* */poem*
*/rap* */meme* */dare* */truth*
*/horoscope <sign>* */trivia*

━━━━━━━━━━━━━━━━━━━━
_Powered by Gemini AI_ 🤖`;

    await sock.sendMessage(from, { text: menu }, { quoted: msg });
}

module.exports = { showMenu };
