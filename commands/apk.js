const axios = require('axios');
const cheerio = require('cheerio');

const APK_LIST = {
    spotify: { name: '🎵 Spotify Premium', url: 'https://liteapks.com/spotify-2.html' },
    netflix: { name: '🎬 Netflix Premium', url: 'https://liteapks.com/netflix.html' },
    youtube: { name: '▶️ YouTube ReVanced', url: 'https://liteapks.com/youtube-revanced.html' },
    canva: { name: '🎨 Canva Pro', url: 'https://liteapks.com/canva.html' },
    capcut: { name: '🎥 CapCut Pro', url: 'https://liteapks.com/capcut.html' },
    picsart: { name: '🖼️ PicsArt Gold', url: 'https://liteapks.com/picsart.html' },
    instagram: { name: '📸 Instagram++', url: 'https://liteapks.com/instagram-plus.html' },
    whatsapp: { name: '💬 WhatsApp Plus', url: 'https://liteapks.com/whatsapp-plus.html' },
    tiktok: { name: '🎵 TikTok++', url: 'https://liteapks.com/tiktok.html' },
    vpn: { name: '🔒 NordVPN Premium', url: 'https://liteapks.com/nordvpn.html' }
};

async function fetchApkInfo(url) {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        const $ = cheerio.load(res.data);

        // Extract version and download link
        const version = $('span:contains("Version")').next().text().trim() ||
                       $('td:contains("Version")').next().text().trim() ||
                       $('[class*="version"]').first().text().trim() ||
                       'Latest';

        const downloadLink = $('a[href*="download"]').first().attr('href') ||
                            $('a.download-btn').first().attr('href') ||
                            url;

        const size = $('span:contains("Size")').next().text().trim() ||
                    $('td:contains("Size")').next().text().trim() ||
                    'Unknown';

        return { version, size, downloadLink: downloadLink.startsWith('http') ? downloadLink : url };
    } catch (e) {
        console.error('Fetch error:', e.message);
        return { version: 'Latest', size: 'Unknown', downloadLink: url };
    }
}

async function handleApk({ sock, msg, from, args, pushName }) {
    const query = args?.toLowerCase().trim();

    if (!query) {
        const menu = `╔══════════════════════╗
║  📦 *PREMIUM APKs*   ║
╚══════════════════════╝

_Type !apk <name> to get link_

🎵 *!apk spotify* — Spotify Premium
🎬 *!apk netflix* — Netflix Premium
▶️ *!apk youtube* — YouTube ReVanced
🎨 *!apk canva* — Canva Pro
🎥 *!apk capcut* — CapCut Pro
🖼️ *!apk picsart* — PicsArt Gold
📸 *!apk instagram* — Instagram++
💬 *!apk whatsapp* — WhatsApp Plus
🎵 *!apk tiktok* — TikTok++
🔒 *!apk vpn* — NordVPN Premium

_All APKs from LiteAPKs.com_ ✅`;
        await sock.sendMessage(from, { text: menu }, { quoted: msg });
        return;
    }

    const apk = APK_LIST[query];
    if (!apk) {
        await sock.sendMessage(from, {
            text: `❌ APK not found!\n\nType *!apk* to see the full list.`
        }, { quoted: msg });
        return;
    }

    await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });

    const info = await fetchApkInfo(apk.url);

    const text = `📦 *${apk.name}*

📌 *Version:* ${info.version}
💾 *Size:* ${info.size}

🔗 *Download:*
${info.downloadLink}

_From LiteAPKs.com_ 🔒`;

    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
    await sock.sendMessage(from, { text }, { quoted: msg });
}

module.exports = { handleApk };
